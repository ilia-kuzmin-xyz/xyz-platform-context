# CCH — Caching

## Four layers (three in pipeline, one in frontend)

| Tier | Location | Scope | TTL | Holds |
|------|----------|-------|-----|-------|
| T1 — Profile cache | Pipeline process | Per `project_id` | 90 s | Phase 0b profile (counts + samples) |
| T2 — Project data cache | Pipeline process | Per `(project_id, domain)` | 60–900 s | Full domain data (issues, photos, parquet rows, …) |
| T3 — Request cache | Per `/api/chat` request | Request lifetime | Request | Within-request dedup (avoids double-fetching the same MCP tool in one turn) |
| PDC — Frontend cache | Browser (`useCanvas.ts`) | Per project, in-memory | 5 min | Domain payloads received over SSE |

---

## T1 — Profile cache (`profile_cache.py`)

Caches the Phase 0b availability map. A warm T1 hit lets the profiler skip all MCP probes, cutting ~2–3 s from every follow-up turn.

TTL: 90 s (conservative — profile counts change rarely within a session).

---

## T2 — Project data cache (`project_data_cache.py`)

Cross-request cache keyed by `(project_id, ProjectDataKey)`. Avoids full MCP re-fetches on follow-up turns or ASK→DASHBOARD sequence on the same project.

```python
class ProjectDataKey(StrEnum):
    ISSUES          = "issues"        # TTL 60 s  (mutates frequently)
    PHOTOS          = "photos"        # TTL 120 s
    CAPTURES_360    = "360captures"   # TTL 120 s
    ACTIVITIES      = "activities"    # TTL 120 s
    SCHEDULES       = "schedules"     # TTL 120 s
    MODEL_ARTEFACTS = "model_artefacts" # TTL 900 s (idempotent)
    ROOMS_JSON      = "rooms_json"    # TTL 900 s
    LEVELS_JSON     = "levels_json"   # TTL 900 s
    PARQUET_ROWS    = "parquet_rows"  # TTL 900 s (parquet immutable per URL)
```

All hydrators go through `DataAccessor` which composes T2 + T3. Callers never touch T2 directly.

---

## T3 — Request cache (`data_cache.py` — `DataSourceCache`)

Per-request. Prevents the same MCP tool from being called twice within one pipeline turn (e.g. `probe_schedule` and `fetch_activities` both need the schedule list).

Discarded after the request completes.

---

## PDC — Frontend project data cache (`useCanvas.ts`)

Primed by live SSE events. Serves instant hydration when switching sessions within a project inside the 5-min window.

`runHydrate` checks PDC first. Fresh cached domains are served synchronously; only missing/expired domains go to the pipeline (narrowed via `domains` filter on the `mode:'hydrate'` request).

Cleared on project switch. Not persisted across page reloads.

---

## Lookup chain

```
runHydrate / hydrators
  → PDC (frontend, 5 min)        ← served synchronously if hit
  → T3 (per-request)             ← dedup within one pipeline turn
  → T2 (project-level, 60–900 s) ← hit avoids MCP call
  → MCP fetch → stored in T2 + T3, PDC primed via SSE
```

---

## Invalidation

`POST /api/cache/invalidate { project_id, keys? }` — clears T1 + T2 for the project (or specific keys only). Use after write operations (issue created, etc.) so the next turn picks up fresh data.

---

## 2026-08-05 — measured slow path, disk tier added

Instrumented a live template request end to end against `mcp-dev.holosite.dev`
(`scripts/bench_phases.py` + an SSE timeline bench). Where the 10–20 minutes
actually went, and what changed:

| cost | measured | fix | after |
|---|---|---|---|
| Clarifier | 16.3s | was on the frontier model; `ANTHROPIC_CLARIFIER_MODEL=haiku` | 5.8s |
| Progress hydration | 67s | MCP downloaded the parquet and re-serialised rows as JSON; now read directly (httpx+pyarrow) + disk-cached | 0.9s |
| Schedule payload | 13.7MB | the flat `activities.all` duplicated the four buckets | 6.9MB |
| Activities fetch | 90–98s | ONE un-paginated MCP call (~25k rows); cannot parallelise client-side | disk-keyed by **revision id** — cold once per revision |
| Cold profile | 118s | probes are parallel (= slowest probe); per-probe timing added; profile spilled to disk (900s) | 0.2s on restart |
| First request after reload | +35.5s | startup awaited a 221-project pre-warm; now a background task | ~0s |
| Rooms parquets | ~60s single-stream | disk cache by URL path + 4-way ranged chunks | local read when warm |
| T2 TTLs | 60–120s | session-scale 300–600s (UI keeps its cache-off toggle) | — |

**New: `agents/disk_cache.py`.** Blob bytes keyed by URL *path* (the SAS token
rotates in the query; the path identifies content — changes on re-translation).
JSON spill for profile / room rollup / activities-per-revision. Atomic writes,
fail-open. Lives in `.cache/` (gitignored); disable with `PIPELINE_DISK_CACHE=off`.

**What stays slow and why:** any truly cold heavyweight MCP fetch (activities,
captures, photos at scale) is bounded by the MCP server itself — single calls
measured 90s+ remotely for payloads that took 1–3s on a local server. That is
the "faster MCP schema" backlog item; everything client-side now avoids paying
it more than once.

**Bench gotcha that cost an hour:** `uvicorn --reload` watches the whole repo
tree — any `.py` edit kills in-flight SSE requests, so a bench dies silently
mid-run, and a dangling SSE client then pins the OLD worker so the reload
never completes (server appears hung; health 000). Kill benches before
editing, edit in batches, bench after.

---

## 2026-08-06 — media-family spills + composer imports the pattern library

Second optimisation pass, same live setup (mcp-dev). Two changes:

**1. The media family joins the disk tier.** `fetch_photos`,
`fetch_360captures` (600s TTL), and `fetch_rooms_json` / `fetch_levels_json`
(600s, keyed per project + URL-path hash — the artefact path is stable but its
content changes on model updates, so no TTL-less blob store) now spill like
issues/activities. Measured on a warm process: media hydration 102.5s → 1.9s;
a full 4-domain delivery (progress + 11.4MB issues + 6.9MB schedule + media)
lands in **under 2 seconds**, so a report's data is fully populated the moment
its TSX arrives.

**2. Generated artifacts import chrome instead of re-typing it.** The §7/§10
pattern library (18 components: HeroPanel, KpiCard, ChartPanel, IssueTable,
FloorplanSVG, …) ships pre-built in the Sandpack VFS as `/xyz-ui.tsx`
(hc-frontend `XyzUiStatic.ts`, injected unconditionally like ForgeViewer).
The composer prompt carries prop contracts only:

| metric | before | after |
|---|---|---|
| ARTIFACT_SYSTEM_PROMPT | 69,977 ch | 45,378 ch |
| bespoke TSX output | 24,352 ch | 16,413 ch |
| bespoke compose wall | 281.8s | 221.8s |
| helper variety used (same question) | 7 types | 10 types |

Quality gate (esbuild compile against the injected module + structural
checks: imports ./xyz-ui, no re-typed helpers, hover state, reads
props.data): all pass. Chrome is now byte-identical across reports instead
of model-copied. Old inline-helper artifacts still render (they never import
the module); EDIT mode is instructed to migrate them to imports.

Deliberately NOT touched: the composer's thinking phase (~155-180s
pre-stream on Fable) — decision is to cut MCP loading/arranging, not
Claude's report generation.

**Addendum (same day):** the schedule *revisions list* (1.4KB of metadata,
~12s per fresh process on mcp-dev) was the last uncached call on the
report-reload path — now spilled (600s). Measured `mode:'hydrate'` (report
reload, all four domains incl. 11.4MB issues): **1.7s end to end** warm;
a TTL-expired domain re-pays its single mcp-dev fetch and re-spills.

---

## 2026-08-10 — snapshot + delta sync replaces TTL refetches

The heavy list endpoints support `lastSyncDateTime` (rows modified since a
timestamp, deletions flagged `isDeleted`). The cache design is now inverted:
instead of re-downloading a domain whenever its TTL expires — and serving
stale data in between — the disk holds ONE deduplicated snapshot per domain
(`{"synced_at": epoch, "rows": [...]}`), and every read past T2 asks the
server "what changed since?", merging by id. Weekly full re-baseline as a
valve; failed deltas re-baseline immediately; issues add `simple: true`.

| domain | old cold fetch | new cold | warm delta | rows |
|---|---|---|---|---|
| issues | 92–128s / 60.3MB | **41.9s / 10.1MB** | **2.4s** | 7,534 |
| photos | ~20s / 6.2MB | 18.8s / 3.5MB | 1.8s | 2,475 |
| 360captures | 30–46s / 41.6MB | **29.0s / 9.7MB** | **2.5s** | 7,364 |

Disk for the three domains: 108MB → 23.3MB. Counts recorded by
`remember_count` are exact entity counts. Freshness *improved*: after any T2
miss the data is seconds behind the server, where the TTL design served up
to 5–10-minute-old data and then paid a full refetch.

Why the payloads shrank ~4x: see the 2026-08-10 pitfalls entry — the cursor
walk had been concatenating overlapping pages, so every fetched byte and
every count was ~4.3x inflated. The dedup fix is in `_call_tool_paginated`
itself; the snapshot layer keeps it that way.
