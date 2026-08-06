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

## Regression testing

PRG has a hermetic golden-master test suite that catches silent numerical regressions before they reach production. See `docs/dashboard/progress-regression-testing-plan.md` for full details.

- Fixtures: parquet snapshot from the dev reference project, stored in GitHub release `test-fixtures-dev-v1`
- Run locally: `npm run fixtures:download` then `npm run jest:regression`
- CI: runs on every PR (`pr-check.yaml`) and daily (`regression-check.yaml`)
- Re-baseline after intentional changes: `UPDATE_BASELINE=1 npm run jest:regression`

---

## 2026-08-06 — User (manually entered) progress and how PRG treats it

Answering "does the dashboard consider user progress, and is it in the parquet files?" Verified in
code on `origin/master`, not inferred from docs.

### What "user progress" is

Manually typed **Actual % Complete** on a Gantt activity in the editor — not derived from element
statuses.

- Write path: `useActualProgressMutation` → `Activity.updateActualProgress()` →
  `POST /projects/{id}/activities/progress` → platform-api `saveActivitiesProgress()` →
  `CALL xyz."usp_InsertActivitiesProgress"($1,$2,$3,$4)`, stamped with `calendarDate` and
  `getLoggedInUsername()`.
- **Only allowed on activities with NO linked elements.** `isActivityEditableForProgress`
  (`ViewerPage/services/progress/use-actual-progress-mutation.tsx`) requires: not `WBS`,
  `activity.elements === 0`, and `activityItem.progressValid === true`. The Gantt's
  "show user progress only" filter mirrors it: `isUserProgress === true && elements === 0`
  (`gantt-x/bar/hooks/useShowUserProgressOnly.ts`).
- `progressValid` is the API's `ValidForProgressCalculations`; `isUserProgress` is derived BE-side
  from `IsUserDefinedProgress` (`platform-api schedules.service.ts:379-404`). The API also returns
  `actualProgress`.

**Invariant worth remembering: user progress and linked-element progress are mutually exclusive per
activity.** An activity is either element-driven or hand-entered, never both.

### How PRG treats it — depends on the mode, and it is NOT uniform

| Mode | Element-less activity (i.e. any user progress) | Where |
|---|---|---|
| **project / package** (default overview) | Category rows are filtered by `AND ${weightColumn} > 0` — zero-weight rows dropped | `progress-queries-v2-api.ts:218,235` |
| **activity** (activities selected in SCH) | **Included** — `GREATEST(weight, 1)` so activities with 0 linked elements / 0 labour hours "still participate with equal weight (1)… matches Gantt behavior" | `progress-queries-v2-api.ts:675-677` |

So under **Model element count** weighting a hand-progressed activity carries no element weight,
whereas under **Budgeted labour units** it carries weight whenever it has planned labour units.
Note the project/package weight filter applies to the **category** row, not the activity — a category
mixing element-linked and element-less activities still has `TotalLinkedElements > 0` and is kept, so
how the individual element-less activity is weighted *inside* that pre-aggregated category value is
the pipeline's business, not the FE's.

### XYZ Tracked excludes user progress entirely

`XYZ Tracked = the activity has ≥1 linked 3D element (BE definition)` — the activity-mode query
restricts to `linkedElementCount > 0` (`progress-queries-v2-api.ts:665-672`). Since user progress only
exists where `elements === 0`, **turning XYZ Tracked on removes all of it.** This is consistent with
the toggle's purpose: physically surveyed vs self-reported.

### The dashboard cannot distinguish it

- **Zero references to `isUserProgress` anywhere in `services/dashboard-progress/`.** PRG consumes
  whatever the pipeline already aggregated.
- The parquet schemas carry only aggregated actual columns — `AvgActualProgress`,
  `LaborWeightedActualProgress`, `LinkedElementCountWeightedActualProgress` — and **no
  user/manual/self-reported flag** (`docs/dashboard/duckdb-tables/progress-schemas.md`). So the
  dashboard cannot split hand-entered from element-derived progress even if asked to.

### ⚠️ The one genuinely open question — needs the data team

**Whether the parquet-building job folds `ActivityProgress` rows into those `*ActualProgress`
columns cannot be answered from these four repos.** `GET /:projectId/progress-outputs` is gated on
`DATA_PIPELINE_ROLE` and only serves URLs for **pre-computed** artefacts
(`platform-api projects.routes.ts:1328`); the job that computes them lives outside hc-frontend,
platform-api, hc-iam and this notes repo.

Circumstantial evidence that it **is** included: the `ActivityProgress` table is keyed by
`calendarDate` exactly like the daily progress snapshots, and edits are gated on the BE's own
`ValidForProgressCalculations` flag — which would be pointless if the value never reached a
calculation. **Confirm with Sergey / the data-pipeline owner before quoting this as certain.**
