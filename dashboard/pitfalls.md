# Pitfalls and Gotchas

Things that have broken before (or will break if you're not careful).

## Race conditions between Pipeline A and Pipeline B

**What happens:** Pipeline A (parquets) and Pipeline B (artefacts + API) load in parallel. If code queries a DuckDB table from Pipeline B before it's loaded, you get `table does not exist`.

**Rule:** Always check `information_schema.tables` before querying a table that comes from a different pipeline. Don't assume loading order.

**Example:** `_queryDataDateRange()` tries `api_activities` → `project_progress` → `category_groups` as fallbacks. Each checks existence first.

## Wrong artefact in multi-model projects

**What happens:** `getProjectModelArtefacts()` returns one `svf2-object-id-map` per model version. If you `.find()` without filtering by `modelId`, you'll grab the first artefact — often a tiny sub-model's map (9 KB, ~200 rows). The federated model's map (11 MB, 1.8M rows) gets ignored → zero UUID matches → entire model stays grey.

**Rule:** Always match artefacts by `models[].modelId`, then narrow by `models[].modelVersionId`. Never `.find()` on the raw artefact array.

## DuckDB init deduplication

**What happens:** Multiple services call `duckdb.initialize()` concurrently on page load. If init doesn't deduplicate, you get 3 DuckDB workers and 3 connections — the first two leak.

**Rule:** `initialize()` caches its promise. Concurrent callers share the same init work. On failure, the promise is cleared to allow retry.

## OPFS cache key collisions

**What happens:** If two artefacts share the same cache key (filename), each download evicts the other. On multi-model projects with per-model artefacts (like `client-element-metas`), this causes 400+ redundant blob fetches every page load.

**Rule:** Use unique cache keys. For per-model artefacts: `{modelArtefactId}.parquet`. For `svf2-object-id-map`: `models/{modelId}/svf2-object-id-map.parquet`.

## Backend reports fileSizeBytes: 0

**What happens:** Some artefacts (e.g. `activity-progress`) have `fileSizeBytes: 0` in the API response even though the actual file is 42 MB. If the cache uses this for validation, it sees `expected 0, got 42047491` → invalidates → re-downloads every load.

**Rule:** Store the actual `byteLength` after download, not the API-reported size. Skip size comparison when the stored size is 0.

## Fragment visibility duplication

**What happens:** If `applyColors()` is called twice (e.g. once from `OBJECT_TREE_CREATED` and once from the `combineLatest` subscription), you get a redundant 14M-fragment visibility scan.

**Rule:** Colors are applied exclusively from the `combineLatest(geometryLoaded$, elementDynamicStatusViewLoaded$)` subscription. `OBJECT_TREE_CREATED` only sets the model reference. The color service tracks `_lastFilters` and has a `_hasColorRelevantFilterChange()` guard to skip no-op re-colours.

## Listener accumulation

**What happens:** `DashboardStatisticsService.initialize()` re-attaches `MODEL_ROOT_LOADED` and `AGGREGATE_SELECTION_CHANGED` listeners every time `setModel()` is called. Old listeners are never removed → callbacks pile up over the session.

**Rule:** Always remove existing listeners before re-attaching in any `initialize()` or `setModel()` method.

## Progress panel 0% flash

**What happens:** Pipeline A finishes (fast, OPFS-cached) → `isLoadingFiles = false` → spinner removed → but `_queryAllData()` hasn't returned yet → `maxActualProgress` is null → panel renders "0.00%" for ~1 second before real data arrives.

**Rule:** The panel uses `hasReceivedData = maxActualProgress !== null` to keep the spinner visible until real data arrives. The service also runs `_queryDataDateRange()` before setting `isLoadingFiles = false`.

## Federated folder naming

**What happens:** Model init looks for a folder containing "federated" (case-insensitive). Projects that name their folder "03.FEDERATED" or "Federated Models" still match. Projects without any such folder get no model and no viewer.

**Rule:** This is a convention, not configurable. If a project doesn't follow it, the dashboard shows nothing. This is intentional — silent wrong-model loading is worse than a visible error.

## BehaviorSubject disposal

**What happens:** If `dispose()` doesn't `.complete()` all BehaviorSubjects, dangling subscriptions survive the component unmount and continue receiving stale emissions on the next project load.

**Rule:** Every BehaviorSubject created in a service must be `.complete()`d in `dispose()`. There were ~31 subjects; only 11 were completed before the fix.
