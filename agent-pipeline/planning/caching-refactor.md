# Caching & Data-Flow Refactor — Implementation Plan

> **Status: PLANNED / IN PROGRESS — stages 1–3 may be done; stages 4–6 pending.**
> Moved from `XYZ_AgentPipeline/docs/caching-and-data-flow-refactor-plan.md`.

## Goal

Make data access consistent, observable, and efficient — without changing user-visible behavior. Every MCP fetch flows through one pathway, every cache has a documented scope and TTL, every transition (project switch, mode switch, write-then-read) has a correctness contract.

## Problems driving this work

| Problem | Impact |
|---------|--------|
| Three independent `_call_tool` copies (`hydration.py`, `profiler.py`, `project_resolver.py`) | Drift risk on retry/timeout/header changes |
| `xyz_get_projects_project_id_schedules` fetched twice per request | -1 unnecessary MCP call/request |
| `mode=ask` hydrates all domains regardless of spec | Wasted hydration on narrow queries |
| ASK→DASHBOARD on same project re-runs full hydration | ~41 s wasted on follow-ups |
| No targeted invalidation API — only nuclear `/api/profile-cache/clear` | Frontend can't refresh after writes |

---

## Target architecture — three cache tiers

| Tier | Scope | Lifetime | Holds | File |
|------|-------|----------|-------|------|
| **T1 — Profile cache** | Per `project_id` | 15 min, LRU 64 | Compact profile JSON | `profile_cache.py` |
| **T2 — Project data cache** | Per `(project_id, ProjectDataKey)` | Per-key TTL (60–900 s) | Domain data | `project_data_cache.py` (new) |
| **T3 — Request cache** | Per `/api/chat` request | Request lifetime | Within-request dedup | `data_cache.py::DataSourceCache` |

### Key registry

```python
class ProjectDataKey(StrEnum):
    ISSUES          = "issues"        # 60 s
    PHOTOS          = "photos"        # 120 s
    CAPTURES_360    = "360captures"   # 120 s
    ACTIVITIES      = "activities"    # 120 s
    SCHEDULES       = "schedules"     # 120 s
    MODEL_ARTEFACTS = "model_artefacts" # 900 s
    ROOMS_JSON      = "rooms_json"    # 900 s
    LEVELS_JSON     = "levels_json"   # 900 s
    PARQUET_ROWS    = "parquet_rows"  # 900 s
```

### DataAccessor — single entry point

```python
class DataAccessor:
    async def issues(self) -> list[dict]: ...
    async def photos(self) -> list[dict]: ...
    # Lookup: T3 → T2 → MCP fetch → store in T2+T3
```

---

## Stages

| Stage | Depends on | Effort | Risk | Behavior change |
|-------|------------|--------|------|-----------------|
| 1. Consolidate `_call_tool` | — | ~30 min | Low | None |
| 2. Schedules-list cached within request | 1 | ~15 min | Low | -1 MCP call/request |
| 3. ASK domain selectivity | — | ~30 min | Low | Faster narrow ASKs |
| 4. T2 + DataAccessor | 1, 2 | ~3 h + 24 h shadow | Medium (flag-gated) | Major perf win on follow-ups |
| 5. Invalidation endpoint | 4 | ~30 min | Low | New API surface |
| 6. Cleanup | 4 | ~30 min | None | None |

### Stage 4 — feature flag + shadow mode

Flag `ENABLE_PROJECT_DATA_CACHE` ∈ `{off, shadow, on}`, default `off`.
- `shadow`: performs T2 lookup but always runs real MCP fetch. Compares divergence.
- `on`: T2 hits short-circuit MCP.

Shadow-mode flip criteria (≥ 24 h): `divergence_count == 0` for idempotent keys; `divergence_count/total < 0.5%` for mutable keys; `hit_rate > 30%`.

### Stage 5 — invalidation endpoint

`POST /api/cache/invalidate { project_id, keys? }` — already implemented (see [caching.md](../caching.md)).

---

## Definition of done

- One `call_tool` definition; one auth-context registry
- One `DataAccessor`; every fetch goes through it
- One `ProjectDataKey` enum; one TTL table; one invalidation endpoint
- ASK→DASHBOARD on same project: ≥ 80% deliver-phase reduction on second turn
- All tests green; zero regressions
