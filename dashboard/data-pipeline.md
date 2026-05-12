# Data Pipeline

How data gets from the backend into the browser and becomes queryable.

## Two pipelines

The dashboard loads data in two parallel pipelines. Both feed into the same shared DuckDB instance.

### Pipeline A — Parquet files (fast path)

```
V2 Progress Outputs API
  → returns Azure Blob Storage URLs (with SAS tokens)
  → browser downloads .parquet files
  → files cached in OPFS (keyed by artefactHash)
  → loaded into DuckDB as tables
```

Parquet files loaded:
| File | DuckDB table | Size (typical) | Purpose |
|------|-------------|----------------|---------|
| `v2_actual_progress.parquet` | `actual_progress` | ~1 MB | Cumulative actual progress by date |
| `v2_planned_progress.parquet` | `planned_progress` | ~1 MB | Cumulative planned/programme progress by date |
| `v2_baseline_progress.parquet` | `baseline_progress` | ~500 KB | Baseline progress by date |
| `v2_discipline_packages.parquet` | `category_groups` | 5-20 MB | Per-discipline/package progress by date |
| `v2_activities_progress.parquet` | `activities_progress` | 50-200 MB | Per-activity progress (lazy, schedule tab) |

### Pipeline B — REST API + artefacts (slower path)

```
Artefact API: getProjectModelArtefacts(projectId)
  → returns array of artefact metadata (outputContent, models[], fileSizeBytes, artefactHash)
  → browser downloads selected artefacts from blob storage
  → cached in OPFS under models/{modelId}/
  → loaded into DuckDB
```

Artefacts loaded:
| Artefact type | DuckDB table | Purpose |
|---------------|-------------|---------|
| `element-status` | `element_status` | modelElementId → installationStatus |
| `project-element-list` | `project_element_list` | modelElementId → sourceFileElementId (External ID) |
| `svf2-object-id-map` | `svf2_object_id_map` | Forge dbId → modelElementId (for coloring) |
| `client-element-metas` | _(not loaded upfront)_ | Element display names — queried remotely on hover |

REST APIs called:
| API | Data | Used by |
|-----|------|---------|
| Activities API | Schedule activities | Schedule tab, Progress tab (via SharedDataLoader) |
| Activity Categories API | Discipline/package/phase categories | Schedule columns, Progress filters |
| Progress Weighting API | Weighting config (labor vs element-count) | Progress calculations |
| Issues API | Quality issues | Quality tab |
| 360 Captures API | Panoramic captures | 360 tab |
| Folder API / Model API | Project folders and models | Model resolution (find federated model) |

## Artefact matching (multi-model projects)

A federated project has multiple sub-models (e.g. structure, MEP, architecture). The Artefact API returns one `svf2-object-id-map` per model per translation version. Picking the wrong one = zero colour matches = grey model.

**Matching logic (two levels):**
1. Filter artefacts where `models[].modelId` matches the activated federated model.
2. Narrow by `models[].modelVersionId` to pick the artefact from the correct translation run.
3. Fallback: if no version match, take the first model-matched artefact.

## SharedDataLoader

Activities and categories are needed by both Progress and Schedule services. `SharedDataLoader` fetches them once and shares the result. It also stores schedule metadata (schedule name, revision dates) for the dashboard bar.

## Loading order

```
1. DashboardProjectService constructor
   ├─ _initializeModel()        → resolves federated model URN (async, fire-and-forget)
   ├─ DashboardFilterService     → ready immediately
   ├─ SharedDataLoader           → starts fetching activities + categories
   ├─ DashboardScheduleService   → subscribes to SharedDataLoader
   └─ DashboardProgressService   → starts Pipeline A + B, subscribes to Schedule filters
       ├─ Pipeline A: V2 parquets downloaded → DuckDB tables created
       ├─ Pipeline B: Artefacts downloaded → DuckDB tables created
       ├─ _queryDataDateRange()  → determines real date range before spinner removal
       └─ isLoadingFiles = false → spinner removed, first data visible

2. User opens Quality tab → DashboardQualityService.initialize()
3. User opens 360 tab     → Dashboard360Service.initialize()
4. User opens Schedule tab → lazy parquet prefetched from OPFS background cache
```

## Deep-dive

- DuckDB table schemas: [`docs/dashboard/duckdb-tables/`](../../docs/dashboard/duckdb-tables/)
- API output mapping: [`docs/dashboard/api/`](../../docs/dashboard/api/)
- Progress calculation modes: [`docs/dashboard/progress-calculation-modes.md`](../../docs/dashboard/progress-calculation-modes.md)
