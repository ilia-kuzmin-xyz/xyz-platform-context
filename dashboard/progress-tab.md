# Progress Tab

The primary analytics panel — tracks construction progress over time.

## What the user sees

- **Overview metrics block:** Actual %, Planned %, Variance %, SPI (Schedule Performance Index).
- **Progress trend chart:** Planned vs actual over time (with optional baseline). Uses forward-fill logic to fill gaps.
- **Discipline/package list:** Per-category progress percentages. Clickable for filtering (Shift/Alt-click for multi-select).
- **`calculatedOn` timestamp:** Shows data freshness.

## Data sources

| Source | What it provides | Loaded when |
|--------|-----------------|-------------|
| V2 progress parquets (actual, planned, baseline) | Project-level cumulative progress by date | Page load (Pipeline A) |
| V2 discipline/packages parquet | Category-level progress by date | Page load (Pipeline A) |
| Element status artefact | Per-element installation status | Page load (Pipeline B) |
| Progress Weighting API | Weighting config | Page load (REST) |
| Activities API (via SharedDataLoader) | Activity details for date range | Page load (shared) |

## Progress weighting

Three weighting strategies, chosen via API config:

1. **Labor-weighted** — weights by `TotalPlannedLaborUnits` (if available)
2. **Element-count-weighted** — weights by `TotalLinkedElements`
3. **Simple average** — unweighted average across categories

The SQL uses `COALESCE` to fall through the priority chain.

## How filters work

- **Date range**: Filters trend chart and recalculates progress for the selected end date.
- **Discipline/package**: Switches from project-level to category-level aggregation using simple averages across selected categories.
- **Category filters from Schedule**: `categoryFilteredActivityIds$` emitted by Schedule service → Progress filters activities → recalculates.

When a discipline is clicked, child packages that don't belong to any selected discipline are auto-pruned.

## Loading sequence

1. V2 parquets downloaded (or loaded from OPFS cache).
2. `_queryDataDateRange()` runs — determines real end date (capped at today) instead of using the hardcoded default.
3. Waits for progress weighting API response.
4. `isLoadingFiles` set to `false` → spinner removed.
5. `_queryAllData()` runs with real dates → first visible data is correct.
6. If weighting loads late, a subscription re-triggers `_queryAllData()`.

The panel also tracks `hasReceivedData = maxActualProgress !== null` to keep the spinner visible during the gap between "files loaded" and "first query result".

## Key service: `DashboardProgressService`

Located in `services/dashboard-progress/`. Owns:
- `ArtefactLoader` (downloads and caches artefact parquets)
- All pipeline coordination (A + B + date range + weighting)
- DuckDB queries for overview, trend, category data
- `elementVisibility$` signal for downstream services (Quality, 360)

## Deep-dive

- Calculation modes: [`docs/dashboard/progress-calculation-modes.md`](../../docs/dashboard/progress-calculation-modes.md)
- Category filtering: [`docs/dashboard/progress-panel-category-filtering.md`](../../docs/dashboard/progress-panel-category-filtering.md)
