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
