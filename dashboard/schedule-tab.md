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

## 2026-09-03 — Baseline vs Active: which schedule supplies the dates (asked on ML9, via Yash)

**The question:** a customer uploaded a biweekly update with "Set as active" ticked and "Baseline"
**unticked**, and found element dates had moved to the new schedule's dates (an element whose baseline
dates were March now reads 09/01/26–09/21/26, badge "Late Start"). Bug, or by design?

**By design.** The `isBaseline` flag has **no influence on any element-level date or status**. The two
flags feed two completely separate paths:

| flag | set by | what it actually drives |
|---|---|---|
| `isCurrent` | "Set as active" | **everything element-level**: activity dates, element colouring, Planned % |
| `isBaseline` | "Baseline" | **only** the aggregate Baseline series on the progress curve |

Chain for element dates, all verified in code:

1. `dashboard-schedule/loaders/api-activities-loader.ts:63` —
   `const currentSchedule = schedules.find(s => s.isCurrent)`. Activities are fetched for the
   **active** revision only; no other revision is ever requested.
2. `dashboard-progress-service.ts:2581-2594` — `element_base_data.startDate/endDate` =
   `MIN(act.startDate)` / `MAX(act.finishDate)` over those activities.
3. `dashboard-panels/viewer/services/dashboard-element-tooltip-service.ts:427-428` — the tooltip's
   PLANNED START / PLANNED END are `aa.startDate` / `aa.finishDate` from that same table.
4. The element status label and colour (Planned / Late Start / Late) come from
   `buildInstallationStatusCaseSql('CURRENT_DATE', …)` over the same `startDate`/`endDate`.

`isBaseline` is read in exactly **one** place in the whole dashboard data path:
`dashboard-provider/shared-data-loader.ts:60`, `hasBaselineSchedule` — i.e. only "does a baseline
exist at all". The baseline numbers themselves are a **backend artefact**,
`v2_baseline_progress.parquet` (`Baseline %` / `BaselineCumulative`, `dashboard-progress/types.ts:37-48`),
separate from `v2_planned_progress` (`Programme %`) which is the Planned series.

**Consequence, and the real limitation to state to customers:** element lateness is always measured
against the **active** schedule, so uploading an update re-dates every element and previously-late
elements go green/on-time. There is currently **no way** to keep element dates or status referenced to
the baseline while a newer schedule is active. That is a missing capability, not a defect — any ask for
it is a product decision (Mostafa/Pietro), not a live-incident fix.

### Two adjacent things found while answering this, both worth their own tickets

1. **The Baseline checkbox default is inverted on new uploads.**
   `gantt-x/edit-schedule/blocks/use-schedule-form.tsx:48,55`:
   ```ts
   const isFirstBaseline = projectService.scheduleService.getBaselineSchedule() === null
   reset({ …, isBaseline: !isFirstBaseline, isCurrent: true, … })
   ```
   So a project that **already has** a baseline gets "Baseline" pre-**ticked** on every subsequent
   upload, while a project with **no** baseline gets it pre-**unticked** — backwards on both counts,
   and it means routine biweekly updates arrive primed to silently re-baseline the project. (Not the
   cause of the ML9 report — that screenshot shows the box unticked, and `handleUpload` at `:116-123`
   does transmit `isBaseline: false` correctly.) The `confirm-baseline` interstitial at `:188-193` is
   the only thing standing between this default and an accidental re-baseline.
2. **The tooltip copy invites exactly this misreading.** `edit-form.tsx:333-336`: Baseline = *"The
   dashboard will use it as the reference point for measuring progress"*, active = *"the basis for
   dashboard reporting"*. Both true, but a planner reads the first as "dates will be compared against
   this". Saying "reference for the baseline progress curve" would remove the whole class of ticket.

**Not verified from this session:** that the backend baseline parquet is itself generated from the
`isBaseline`-flagged revision (that pipeline is outside hc-frontend / platform-api), and ML9's live
schedule flags (no prod data access this session). If a customer ever reports the **Baseline curve
itself** moving after an update, that is a different and genuinely backend-side bug.
