# PRG — Progress Tracking

Tracks construction progress against plan using schedule-derived parquet data.

## What the user sees

- **Overview metrics:** Actual %, Planned %, Variance %, SPI (Schedule Performance Index).
- **Trend chart:** Cumulative planned vs actual over the selected date range (line chart), with daily increments shown as bars.
- **Baseline line:** Optional third series when baseline data exists.
- **Discipline/package list:** Per-category actual vs planned with variance badges. Clickable for filtering (Shift/Alt/Ctrl-click for multi-select).
- **`calculatedOn` timestamp:** Shows when the backend last recomputed the parquets.

All numbers are progress **deltas within the selected date range** — not cumulative totals from project start. Actual 5% means 5% of work completed *within that window*, not 5% overall.

## Data flow

```
V2 Progress Outputs API
  → downloads category_groups.parquet + project_progress.parquet
  → loads into DuckDB (cached in OPFS)

Progress Weighting API  →  weighting config (labor hours or element count)
SharedDataLoader        →  api_activities + activity_categories_flat

DashboardProgressService
  ├─ subscribes to filters$
  ├─ runs DuckDB queries on filter change
  ├─ emits: maxActualProgress$, categorySummary$, progressTrendData$
  └─ emits: elementVisibility$ (triggers QLT and CAP re-queries)
```

## Calculation modes

PRG has three query modes. The service auto-selects in `mix` mode:

| Mode | Triggered by | DuckDB table | Description |
|------|-------------|-------------|-------------|
| **project** | No discipline/package filters active | `project_progress` | One row per calendar date at project level. Fast, pre-aggregated. |
| **package** | Discipline or package filter active | `category_groups` | One row per (package, calendar date). Aggregated on the fly with weighting. |
| **activity** | Gantt activities selected in SCH | `activity_progress` + `api_activities` | Per-activity snapshots aggregated by activity weight. Used when a specific set of Gantt tasks is highlighted. |

All modes calculate a **delta**: progress at the end date minus progress at the start date. This means the trend chart shows progress earned *within* the chosen range, not lifetime cumulative progress.

## Progress weighting

Two weighting strategies, chosen via the Progress Weighting API:

| Method | Weight column | Meaning |
|--------|--------------|---------|
| **Labor Hours** (default) | `TotalPlannedLaborUnits` | Each package weighted by its planned labour hours. Heavy packages count more. |
| **Element Count** | `TotalLinkedElements` | Each package weighted by its linked 3D element count. |

Formula: `SUM(weight × progress_delta) / SUM(weight) × 100`

If a package has 0 weight (no hours or elements), it's excluded from the denominator so it doesn't dilute the aggregate.

## XYZ-tracked toggle

When the user enables the "XYZ Tracked" filter, PRG swaps from `category_groups` → `category_groups_xyz` and `project_progress` → `project_progress_xyz`. These tables contain only elements that XYZ Reality physically surveyed. This lets project managers see progress as measured by the XYZ system rather than self-reported data.

## Filter → recalculation flow

```
User changes date range / discipline / category filter
  → DashboardFilterService emits filters$
  → DashboardProgressService._queryAllData() runs
      ├─ Queries project_progress or category_groups (per mode)
      ├─ Materializes _visible_elements temp table (filtered element IDs)
      └─ Emits: maxActualProgress$, categorySummary$, progressTrendData$
  → DashboardColorService checks if color-relevant change → re-colours 3D model
  → elementVisibility$ fires → QLT and CAP re-query against _visible_elements
```

`_visible_elements` is a DuckDB temp table shared across all services. It contains the modelElementIds that pass the current filter state. QLT JOINs against it to show only issues linked to visible elements.

## Category filtering from SCH (activity-level mode)

When the user selects activities in the Gantt chart, SCH emits `categoryFilteredActivityIds$` — the list of selected activity IDs. PRG subscribes and switches to activity-level mode, running `activity_progress` queries scoped to those IDs. Deselecting all activities returns to `mix` mode.

## Project type: quality-only projects

Projects with `progressProject = false` have no PRG tab. The PRG service is never initialized, no parquets are downloaded, and `_visible_elements` is never materialized. QLT and CAP use a separate filter path keyed off the issue's own `activityCategories` tags instead.

## Key service

`DashboardProgressService` in `services/dashboard-progress/`. Owns `ArtefactLoader` (Pipeline B artefacts), `ProgressOutputsV2Loader` (Pipeline A parquets), and all DuckDB queries.
