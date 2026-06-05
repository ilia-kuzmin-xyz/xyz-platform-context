# Hydration Data Persistence — Concept

> **Status: CONCEPT — needs design review before implementation.**
> Do NOT implement until concept is reviewed and approved.

## Problem

Every time a session is opened (or a dashboard's "View dashboard" is clicked), the frontend fires a `mode:'hydrate'` request to the pipeline, which calls MCP tools, waits for domain data, and streams it back. Even with the pipeline's T2 cache (60–900 s) and the frontend's PDC (5 min), reopening a session hours later always triggers full MCP re-fetches.

For sessions with many dashboards, this is the biggest perceived latency hit: user opens a session they worked on yesterday, waits 10–30 s before anything is populated.

---

## Current hydration path (baseline)

```
openSession()
  → rehydrateSession() → POST /api/chat { mode:'hydrate', domains }
  → Pipeline: resolve → profile → MCP fetches → artifact_data_partial × N
  → ~10–30 s cold, ~2–5 s warm (T2 cache hit within TTL)
```

Caches that help today:
- **Pipeline T2** (60–900 s): warms on the same pipeline process; wiped on restart
- **Frontend PDC** (5 min): warms within a browser session; wiped on reload

Neither survives a new browser session opened hours after the last save.

---

## Option A — Save hydration snapshots to server storage

**Concept**: after each hydration completes, save the full `ProjectData` payload as a separate file alongside the session file. On open: download snapshot first, populate immediately, skip the pipeline entirely (or use it only to refresh stale domains).

```
Files stored per session:
  canvas-session-{sessionId}.json        ← design (TSX, specs, messages) — existing
  canvas-hydration-{projectId}-{date}.json  ← domain data snapshot — NEW
```

Or alternatively, one shared snapshot per project (not per session — data belongs to the project):
```
  canvas-hydration-{projectId}.json       ← latest domain snapshot, newest-wins
```

### Pros
- Instant population on session open — no pipeline round-trip at all
- Works across browser restarts and days later
- Reduces pipeline load significantly for returning users

### Cons
- **Data staleness**: snapshot can be hours or days old. Issues/progress change daily. User sees stale numbers until a refresh triggers.
- **Storage cost**: each domain payload is 50–500 KB. A project hydration snapshot could be 1–3 MB. Every save creates a new file (append-only). This adds up fast.
- **Display complexity**: need to show clearly "loaded from snapshot (2h ago)" and offer a refresh
- **Write path**: when do we save the snapshot? On every hydration completion? Only on explicit save? Only if data is "fresh enough"?
- **Partial snapshots**: if only `issues` was hydrated (narrow dashboard), the snapshot is incomplete for other dashboards in the same session.

### Open questions
1. Should the snapshot be **per-project** (shared across sessions) or **per-session**?
   - Per-project is more natural (data belongs to the project, not the session) and deduplicated.
   - But the files API stores under the project, so both work.
2. What **TTL** is acceptable for the snapshot? 30 min? 2 h? 24 h?
   - Issues change every few hours; parquet progress is updated daily. Different domains have different freshness requirements.
3. Do we **skip the pipeline entirely** on snapshot hit, or still run a background refresh?
   - "Load instant from snapshot, silently refresh in background, replace when done" is the best UX but adds complexity.
4. How do we **handle partial snapshots** (some domains missing)?
   - Show available domains instantly; hydrate missing ones from pipeline.
5. Does saving domain data violate any **data residency / security** requirements?
   - Domain data (issues, schedules, photos) stored in project files is probably fine — same data is in the platform's own tables.

---

## Option B — Extend pipeline TTL / smarter cache warming

**Concept**: instead of persisting data client-side, extend the pipeline T2 cache TTL significantly (e.g. 2–4 h) and warm it proactively on session load. Combined with the frontend PDC, this covers same-session re-opens.

### Pros
- No data stored in files (no staleness visibility concern, no storage cost)
- Simpler — no new files, no new service code

### Cons
- Pipeline process must still be running — doesn't help across restarts or days later
- Doesn't solve the "open session tomorrow" case
- Increasing TTL increases staleness within the pipeline itself

---

## Option C — Lazy load with per-domain skeleton

**Concept**: don't change persistence. Instead, show the dashboard immediately with the profile stub data (counts, metadata — already available instantly from T1 cache), then fill in the real data progressively. The perceived latency drops because the user sees something useful immediately.

### Pros
- No new storage, no staleness
- Exploits data the pipeline already has instantly (T1 profile cache)

### Cons
- Profile stubs don't have row arrays — charts would show 0 bars until hydrated
- Could be confusing ("why is the chart empty?")
- Doesn't fix the actual wait time — just masks it

---

## Recommendation (refined 2026-06-05 — needs human review)

**Rolling per-project hydration pack** — Option A with merge-on-write semantics. The pack is never speculatively created; it is a byproduct of normal usage: every completed hydration updates it and it becomes the default data source on open.

### Pack shape — one file PER DOMAIN (decided over single-file, see below)

```
canvas-hydration-{projectId}-issues.json
canvas-hydration-{projectId}-progress.json
canvas-hydration-{projectId}-rooms.json
canvas-hydration-{projectId}-photos.json
```

```json
// each file (newest insertedOn wins, like sessions)
{
  "version": 1,
  "projectId": "...",
  "domain": "issues",
  "savedAt": 1730000000000,
  "payload": { ... }
}
```

**Why per-domain and not one combined pack file:**

| | One combined file | Per-domain files ✅ |
|---|---|---|
| Open | 1 GET | 1 list + N parallel GETs (~same wall time) |
| Write cost | full ~2 MB pack re-uploaded even if one domain changed | only the changed domain (50–500 KB) |
| Concurrency | read-merge-write race: two tabs/users merging different domains clobber each other (newest-wins) | no cross-domain clobbering; within a domain last-writer-wins is safe (both are valid fresh fetches) |
| Merge logic | explicit in-memory merge step required | implicit in file layout — no merge code |

### Format: JSON, not parquet (decided 2026-06-05)

Compared against the dashboard's parquet+DuckDB experience. Parquet earns its keep there because: (a) data is large (50–200 MB `activity_progress`), (b) the consumer is a SQL engine (DuckDB-WASM) that queries without materializing, (c) tables are flat/columnar, (d) a backend pipeline produces the files. **None of these hold for canvas hydration**: payloads are 50–500 KB nested JSON, fully materialized into `props.data` for the Sandpack artifact, and the writer would be the browser persisting what SSE already delivered as JSON. Round-tripping through parquet just reconstructs the same JSON with extra machinery; gzip on JSON captures most of the compression win at this size.

What we DO take from the dashboard: OPFS-style cache pattern, hash-based invalidation (`artefactHash` ≙ our hash-compare-before-save), lazy per-need loading (≙ per-dashboard `domainsRead` gate).

**Flip condition**: if canvas artifacts ever *query* data instead of receiving full `props.data` (DuckDB-WASM on the canvas page, pipeline returning data references — pipeline-v2 territory), switch to parquet — and at that point reuse the dashboard's existing OPFS parquet cache (`/duckdb-cache/{projectId}/`) for shared domains instead of persisting a second copy.

**Size invariant — "millions of entries" can't happen in JSON, but not because of the file format.** A hydration payload must stay *dashboard-renderable*: it travels as one SSE event, gets `JSON.parse`d on the main thread, and is materialized as React props. Millions of rows break that chain long before persistence (SSE event size → parse freeze → memory blowup). The dashboard handles millions of rows by never materializing them — blob → DuckDB → small query results. So:
- The invariant is enforced **at the hydrator** (aggregate/cap/paginate), not at the storage layer. ⚠️ **No list-delivering domain is capped today**: `issues` full list (`hydrators.py:132`), `schedule` ALL activities via the revision endpoint (`hydrators.py:208-326` — a 20k-activity project ships 20k rows), `media.photos` fully paginated (`hydrators.py:334`). Only `progress` is bounded, by per-date aggregation. Large projects can already produce multi-MB payloads — if that becomes a real problem, bound it in the hydrator.
- ⚠️ Stale docstring: `hydrators.py:12-15` claims "Schedule is intentionally count-only … never lists rows" — the hydrator below it delivers the full list. The "hard-capped at 1000 rows" there describes the activity-level *parquet* endpoint the pipeline deliberately does NOT use (it uses the schedule-revision endpoint to get everything). Do not cite that docstring; fix it.
- Persistence defends itself with a **size guard**: if a domain payload serializes above a threshold (e.g. 5 MB), skip saving that domain (fall back to pipeline hydration on open) and log it — never silently persist something that will freeze the reader.

### Write path

1. Hydration completes (`artifact_data_complete`) with domains D₁…Dₙ
2. For each domain: hash-compare payload vs last-loaded version; **save only changed domains** (one file each)
3. Untouched domains keep their existing files + savedAt — coverage converges toward complete as the user works

### Read path

1. On session open: list `canvas-hydration-{projectId}-*` → GET newest of each in parallel
2. **BARRIER — assemble before render.** Per-domain files are a storage layout, NOT a rendering trigger. Parallel GETs are awaited (`Promise.all`) and assembled into one `ProjectData` object; only then can any dashboard mount. The existing Sandpack mount-gate rule (mount ONCE with final data) is unchanged.
3. **Gate is per-dashboard, not "all files".** Each dashboard mounts when `domainsRead ⊆ assembled domains` — it does not wait for domains it never reads.
4. **Partial failure does not open the gate.** A failed GET or missing domain file → that dashboard's gate stays closed; fire `mode:'hydrate'` for just the missing domains (today's path). Never mount with holes — that is the profile-stub false-satisfaction pitfall in a new costume.
5. Show per-dashboard "Data from X ago" badge if any of its domains is older than threshold
6. Background `mode:'hydrate'` for stale domains → swap in → re-save changed domain files
7. Ask answers: persisted results load from the session file as today; any re-execution waits behind the same assembled-data barrier

### End-to-end experience (walkthrough, 2026-06-05)

**Visit 1 — cold (no hydration files yet)**
1. Open canvas → the `GET /files` call the SessionsPanel already makes also reveals hydration files (none yet) — no extra request
2. Generate dashboard → MCP path exactly as today → render
3. On `artifact_data_complete`: save each domain file — with three disciplines:
   - **Only `_hydrated: true` payloads** — never save profile stubs (pitfall #1 again: a stub in storage would poison every future warm open)
   - **Hash-compare before POST** — append-only makes needless saves permanent
   - **Fire-and-forget AFTER render** — a failed save must never degrade the dashboard

**Visit 2 — warm**
1. Same `GET /files` → newest record per domain (`insertedOn` = authoritative savedAt, free from the list — don't trust the JSON body's own timestamp)
2. Open session → **binary freshness decision per domain**: fresher than threshold → download (2 hops: file detail → signed blob URL, via `Storage.get` like sessions) → barrier → instant mount, source = `storage`. Staler → run the pipeline exactly as today (the slow path IS the current path — no new code).
3. ~~Background refresh + swap + stale badge~~ — **deferred to v2** (see scope cut below)

**Steady state**: new dashboards always run the pipeline anyway, so every generation refreshes storage through the equality-guarded save — the storage copy converges to "as fresh as the project's last activity" with no scheduled job. Ask answers piggyback on the same path.

### V1 scope — deliberate anti-over-engineering cut (2026-06-05)

V1 is: **a ~40-line file service (clone of `canvas-session-api-service.ts` with a `canvas-hydration-` prefix) + a save hook on `artifact_data_complete` + a load-before-hydrate branch in `openSession` + a read-only debug table.**

| Cut from v1 | Why | Revisit when |
|---|---|---|
| Background refresh + mid-session swap + stale badge | Binary fresh/stale at open covers the core value; swap choreography is the most complex part of the design | v1 shows the staleness window is annoying in practice |
| Per-domain staleness thresholds | One global constant (~30 min); per-domain tuning is speculative | observed need |
| Actual hashing | String equality vs last-saved serialization — 5 lines | never, probably |
| gzip/base64 packing | ~2 MB JSON over HTTP is fine | payloads measurably slow |
| Inspector action buttons (refresh/force-save) | Read-only table delivers the visibility | someone asks |
| `xyzDisplayName` rich metadata | Optional one-liner, nice-to-have | free to add anytime |

### Hydration Inspector (hotkey TBD — any free combo)

Read-only debug overlay alongside the existing dev overlay (`Ctrl+Shift+D`). Avoid plain `Ctrl+H` (browser history); otherwise the binding is a trivial detail.

One row per domain: status (not loaded / loading / hydrated), **source** (`mcp` live vs `storage` + file age), size, last save result (`saved` / `skipped_unchanged` / `oversize_skipped` / `failed`). Footer: total hydration file count + bytes in the project (append-only orphan accumulation made visible — this tells us empirically whether equality-skip suffices or a cleanup story is needed when DELETE lands).

Fed by a `hydrationProvenance` map in `useCanvas`:
```ts
{ domain, source: 'mcp' | 'storage',
  hydratedAt,
  storageMeta?: { fileReferenceId, insertedOn },
  saveStatus: 'saved' | 'skipped_unchanged' | 'oversize_skipped' | 'failed' | null,
  refreshing: boolean }
```

**Free metadata channels from the files API** (verified against `canvas-session-api-service.ts`):
- `insertedOn` on the list record — savedAt without downloading the file
- `xyzDisplayName` — set to e.g. `"issues • 1420 rows • 412 KB"` so the inspector shows row counts/sizes for files it never downloaded (same trick sessions use for the session name)

### Two remaining risks

**1. Write amplification (append-only storage).** No DELETE on files API — every domain save creates a new file. Per-domain layout already shrinks this (only changed domains, 50–500 KB each, not the 2 MB pack). Further mitigations (pick at review):
- Hash-compare before save; skip if unchanged (rehydrating an unchanged project is the common case)
- gzip+base64 the payload inside the file (~5–10× smaller for repetitive JSON) — benchmark whether the files API already compresses transfers first

**2. Pack assumes domain payloads are dashboard-agnostic.** Persisting per-domain is only correct if "issues data" is identical regardless of which dashboard requested it. True today (hydrators fetch per-domain, project-wide). **Invariant to pin**: if scoped hydration is ever added (e.g. issues filtered to a date range), scoped fetches must NOT write to hydration files (or the file name must include the scope).

**Still needs human review on:**
- Acceptable staleness threshold per domain (issues ~30 min? rooms/parquet ~6–24 h?)
- Write-amplification mitigation choice (hash-skip vs debounce vs both)
- Security: is it OK to store raw issues/progress data in project files?
- UX for the "stale data" indicator — how prominent? Dismiss-able?

---

## Not implementing until

- [ ] Domain-by-domain staleness thresholds agreed
- [ ] Security/data residency confirmed
- [ ] Write-amplification mitigation chosen (hash-skip / debounce / compression)
- [ ] "Stale data" UX reviewed
- [ ] Confirmed pack size is acceptable (benchmark a real project; check if files API compresses transfers)
- [ ] "Domain payloads are dashboard-agnostic" invariant documented in pipeline docs
