# PHS — Pipeline Phases

## Overview

```
[0a] Project Resolver   ~0.5 s   deterministic fuzzy match → project_id
[0b] Profiler           ~2–3 s   parallel MCP probes → counts + samples per domain
[0b½] Viewer Intent     ~0 s     pure keyword classify → NONE / DISPLAY / INTERACTIVE
[0c] Clarifier          ~2 s     optional survey for FRESH turns (stream pauses for user)
[0c½] Rooms Readiness   ~60 s    Room Readiness template only: room↔element rollup → `rooms` domain
[0d] Viewer Mapper      ~30–60 s INTERACTIVE only: parquet JOIN → viewer_mapping + viewer_config
      ↓ phases 1 + 2 run IN PARALLEL via asyncio.Queue
[1]  Artifact Composer  ~30–55 s Claude streams TSX → artifact_skeleton SSE event
[2]  Hydrators          ~30–50 s parallel domain fetches → artifact_data_partial × N SSE events
```

Wall time ≈ Phase 0a + 0b + 0c + max(1, 2) ≈ 35–60 s for a cold request.

For `mode:'hydrate'` (session restore): skips 0c + 1. Wall time ≈ 0a + 0b + 2 ≈ 5–15 s.

---

## Phase 0a — Project Resolver (`project_resolver.py`)

Deterministic fuzzy match against the user's project list (5-min in-memory cache from `xyz_get_projects_user_projects`).

**Short-circuit**: if the request carries `project_id` (set by the frontend for URL-locked `/canvas/:mongoProjectId` sessions), the resolver is skipped entirely. Sticky thread fallback also bypassed.

Output: `project_id` (postgres UUID), `project_name`, `candidates`, `resolve_source` (`"explicit"|"fuzzy"|"sticky"`).

---

## Phase 0b — Profiler (`profiler.py`)

Parallel MCP probes — one lightweight `size=1` call per domain. Reads `total` count + one sample row. No full data fetched here.

```python
asyncio.gather(
  probe_project(),    # metadata
  probe_progress(),   # actual/planned percentages
  probe_issues(),     # total count + sample issue
  probe_schedule(),   # revision count
  probe_media(),      # photo + capture counts
)
```

Output: `data_profile` — availability map with `{available, count, scale, sample}` per domain. Emitted as the `data_profile` SSE event (frontend uses it to pre-populate stubs). Cached in T1 (90 s).

---

## Phase 0b½ — Viewer Intent (`viewer_intent_classifier.py`)

Pure function, no LLM. Classifies the message into:

| Intent | Meaning |
|--------|---------|
| `NONE` | no viewer at all |
| `DISPLAY` | show the 3D model, no data overlay |
| `INTERACTIVE` | colour / filter / isolate by project data → runs Phase 0d |

Keyword-driven (`"installed"`, `"colour by"`, `"which elements"`, …), conservative — ambiguous cases default to `DISPLAY`. Emits an `intent_step` SSE event with the decision + reason.

**Broad prompts are the weak spot**: "Monday-morning status briefing" contains no viewer keywords, so it never classifies INTERACTIVE. That's why the clarifier offers a **"3D viewer"** option (Phase 0c) — ticking it makes `server.py` override the decision to INTERACTIVE.

---

## Phase 0c — Clarifier (`clarifier.py`)

Optional. Fires on `FRESH` turns when the composer would benefit from more context (ambiguous question, multiple candidate projects, etc.).

Emits `clarifier_questions` SSE event with `{questions, original_message}`. **Stream ends here** — the `done` event carries `reason: "awaiting_clarifications"`. The frontend shows the questions; the user answers; the frontend re-sends the original message with `clarifier_answers` in the body. The next request skips the clarifier (`skip_clarifier=true`).

---

## Phase 0c½ — Rooms Readiness (`rooms_readiness.py`, `room_types.py`, `room_packages.py`)

Runs **only** when `active_template == "room_readiness"` (see
[report-templates.md](report-templates.md)) — it downloads ~60MB of parquet, so
it must never run speculatively. T2-cached for 2h.

Joins room↔element↔status↔activity into a per-room rollup: readiness %, planned
%, variance, 360 capture age, per-package breakdown. Emits
`artifact_data_partial(domain="rooms")`.

**It runs BEFORE Phase 0d on purpose.** Its room→element index is traded for
dbIds while the viewer wire format is built, which is what lets clicking a room
isolate it in the model. Both phases are sequential and pre-compose, so the
order costs nothing.

Failure downgrades the template (`active_template = None`) rather than failing
the request.

## Phase 0d — Viewer Mapper (`viewer_mapper.py` + `viewer_config_builder.py`)

Runs **only** when Phase 0b½ said `INTERACTIVE` **and** `profile.capabilities.viewer` is true. Otherwise skipped entirely (it's the most expensive non-LLM step).

1. Fetch model artefacts → download `svf2-object-id-map`, `element-status`, `activity-links` parquets in parallel (+ schedule activities).
2. pandas JOIN → per element `{dbId (=objectId), modelElementId, installationStatus, activityId}`. Status is computed with the ViewerPage rules (Installed Early / Installed / Late / Late Start / Planned / Not Planned).
3. Cached in T2 (`VIEWER_MAPPING`, 2 h) — idempotent per model version.
4. `to_wire_format()` → grouped payload (~8 MB, not the ~140 MB flat form) → SSE `viewer_mapping`.
5. `build_viewer_config()` (deterministic, no LLM) → SSE `viewer_config` (colour field + palette).

Both events are emitted **before** `artifact_skeleton`, so the frontend's Sandpack mount already has the data (see canvas pitfall 9 — Sandpack won't re-read a static JSON import later).

On failure (no parquets / download error) it downgrades to `DISPLAY` rather than erroring the request.

Full contract: [data-contracts.md](data-contracts.md) § 3D Viewer colour mapping.

---

## Phase 1 — Artifact Composer (`artifact_composer.py`)

Single streaming Claude call. Inputs:
- Static data contract (field names + schemas, stable → prompt-cacheable)
- Availability map from Phase 0b
- User question (+ prior artifact for EDIT, sketch shapes for SKETCH)

Streams TSX tokens as `artifact_token` SSE events. When the full TSX is ready, emits `artifact_skeleton` with `{ title, summary, domainsRead, tsx }`.

The component must match:
```typescript
function App(props: { data: ProjectData; theme?: 'light' | 'dark' }): React.ReactElement
```

Must handle any domain being `undefined` — data arrives after TSX mounts.

---

## Phase 2 — Hydrators (`hydrators.py`)

Parallel fetchers — one per domain in `artifact.domainsRead` (or all domains if not filtered).

```python
asyncio.gather(
  hydrate_issues(),
  hydrate_progress(),
  hydrate_schedule(),
  hydrate_media(),
)
```

Each domain yields as it completes:
```
SSE: artifact_data_partial  { domain, payload }    (one per domain, order not guaranteed)
SSE: artifact_data_complete { domains, failed }    (when all done)
```

Fetches go through `DataAccessor` → T3 → T2 → MCP. See [caching.md](caching.md).

---

## Phase 2 only — `mode:'hydrate'` (session restore)

Used when restoring a saved session. Skips phases 0c and 1 (no clarifier, no composer — TSX already exists in the saved session).

Request body: `{ mode:'hydrate', project_id, thread_id, domains?: string[] }` (no `message`).

Runs: 0a resolve → 0b profile → 2 hydrators (filtered to `domains` if provided).

Emits the same `data_profile`, `artifact_data_partial`, `artifact_data_complete`, `done` events → same frontend handlers fill `props.data`.
