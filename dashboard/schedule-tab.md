# SCH — Schedule

Project schedule visualization with activity filtering that propagates to the Progress tab.

## What the user sees

- **DHTMLX Gantt chart** showing schedule bars (planned start → planned finish).
- **Layout toggle:** All / Gantt / Schedule views.
- **Activity filtering** with multi-select — selected activities drive Progress tab filtering.
- **Dynamic category columns** (discipline, package, phase, etc.) discovered at runtime.
- **Dashboard bar** showing query status and selected activity count.

## Data sources

| Source | What it provides | Loaded when |
|--------|-----------------|-------------|
| SharedDataLoader | Schedule metadata, API activities, categories | Page load (shared with Progress) |
| V2 activities progress parquet | Per-activity cumulative progress (50-200 MB) | Lazy — prefetched to OPFS in background |
| Activity Categories API | Category columns (discipline, package, phase) | Page load |

## Loading strategy

The activities progress parquet is large (50-200 MB). To avoid blocking the initial page load:

1. `LOAD_ON_PAGE_INIT = false` (default): the parquet is prefetched to OPFS cache in the background as soon as the page loads, but not loaded into DuckDB.
2. When the user opens the Schedule tab, DuckDB loads it from OPFS (~1-3s instead of ~15s download).
3. If `LOAD_ON_PAGE_INIT = true`: loaded eagerly on page init (used for testing or when schedule is the primary tab).

## Filter propagation

When the user selects activities in the Gantt chart, the Schedule service emits `categoryFilteredActivityIds$`. The Progress service subscribes to this and recalculates metrics for only the selected activities. This creates a two-way filtering loop:

```
User selects activities in Gantt
  → Schedule emits categoryFilteredActivityIds$
  → Progress subscribes, filters to those activities
  → Progress recalculates and re-renders
```

`availableCategoryValues$` emits distinct values per category column, powering dynamic filter panel sections.

## Star Schema pattern

No pre-materialized merged tables. Queries JOIN base tables dynamically (like Power BI). Base tables: `schedule_metadata`, `api_activities`, `activity_categories_flat`, `activities_progress`.

## Key service: `DashboardScheduleService`

Located in `services/dashboard-schedule/`. Uses `@xyzreality/dhtmlx-gantt` package. Instantiated before Progress service because Progress subscribes to its filter output.
