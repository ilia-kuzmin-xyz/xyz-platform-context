# Startup Journey

What happens from "user navigates to `/projects/:id/dashboard`" to "data is visible on screen."

## Provider stack (React)

```
DashboardPage.tsx
  └─ DashboardProjectProvider
       reads projectResponse.progressProject → resolves isProgressProject
       blocks rendering until isProgressProject !== null
       └─ DashboardProvider
            creates DashboardProjectService (singleton per project)
            sets activeTab based on project type
            └─ DashboardSearchProvider
                 └─ DashboardBar  +  DashboardLayout (resizable panels)
```

The loading gate in `DashboardProjectProvider` is intentional: no child renders until the project type is known, so services are never created with the wrong assumption about which tabs exist.

## Service startup sequence

Everything below happens inside `DashboardProjectService` on construction. Steps in bold run in parallel; steps numbered must complete before the next.

```
1. DuckDBService.initialize()          single shared WASM worker (deduplicated)
2. DashboardFilterService              ready immediately; all services receive it
3. SharedDataLoader.start()            fetches api_activities + activity_categories_flat from REST
4. DashboardScheduleService            subscribes to SharedDataLoader output
5. DashboardProgressService            starts two pipelines in parallel:

   Pipeline A (parquets)               Pipeline B (artefacts)
   ├─ call Progress Outputs API        ├─ call Artefact API
   ├─ download category_groups.parquet ├─ download element-status.parquet
   ├─ download project_progress.parquet├─ download project-element-list.parquet
   └─ load both into DuckDB            ├─ download svf2-object-id-map.parquet
                                       └─ load all into DuckDB

   Also in parallel:
   └─ _initializeModel()               Folder API → find "federated" folder → model URN
                                       → load into Forge Viewer
```

Quality-only projects skip Pipeline A and B entirely. QLT and CAP services initialize eagerly instead.

## Loading timeline (progress projects)

```
t=0       Page renders, provider stack mounts, services start
t~0.5s    Pipeline A complete (OPFS cache hit) or t~3-8s (first download)
t~0.5s    Pipeline B complete (OPFS cache hit) or t~5-15s (first download)
t~1s      SharedDataLoader returns activities
t~?       _queryDataDateRange() runs → real date window known
          isLoadingFiles = false → PRG spinner begins to remove
t~?       Forge Viewer fires MODEL_ROOT_LOADED
t~?       Forge Viewer fires OBJECT_TREE_CREATED
t~?       element_dynamic_status VIEW built (joins element_status + svf2_object_id_map)
t~?       Forge Viewer fires GEOMETRY_LOADED_EVENT
t~?       Color service applies theming colors to all elements
          onColorsApplied → setModelLoaded(true) → loading bar fully dismissed
t~?       _queryAllData() emits first metrics → PRG panel renders real data
```

On repeat visits (OPFS cache warm, service worker cache warm), Pipeline A+B complete in under a second. First visits pay the full download cost.

## Lazy initialization (tab open)

| Tab opened | What initializes |
|-----------|-----------------|
| QLT (first time) | `DashboardQualityService.initialize()` — paginates all issues from REST, loads into DuckDB |
| CAP (first time) | `Dashboard360Service.initialize()` — paginates captures from REST, loads into DuckDB |
| SCH (first time) | `activity_progress` parquet loaded from OPFS into DuckDB (~1-3s from cache vs ~15s download) |

The `activity_progress` parquet is prefetched to OPFS in the background immediately on page load, so by the time the user opens SCH it's almost always already cached.

## Teardown

When the user navigates away, `DashboardProjectService.dispose()` is called. It:
- Completes all RxJS BehaviorSubjects (unsubscribes all dependent hooks)
- Removes all viewer event listeners
- Drops DuckDB tables created for this session
- Does NOT clear OPFS cache (intentional — survives for the next visit)
