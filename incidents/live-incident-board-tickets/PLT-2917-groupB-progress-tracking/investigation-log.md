# PLT-2917 — investigation log

Owner: Ilia Kuzmin (assignee) + Claude (this log). Continues `context.md` §5a
(Mostafa reframe: PMILE5030 absent from the activity parquet; surface = PowerBI
portfolio dashboard).

## 2026-07-22 — ownership taken; parquet schema + endpoints pinned from code

### What the "activity parquet" is (FE-side, code-verified)

- Produced by the **V2 progress-outputs pipeline**; FE fetches
  `GET /api/v2/projects/<projectId>/progress-outputs`, picks the output with
  `outputType='planned-and-actual'` + `outputHierarchyLevel='activity'`, and loads its
  `cloudStoragePath` parquet (`activity-progress-v2-loader.ts:83-110`).
- **Real column set** (loader doc `:60-66` + test harness
  `test-duckdb-harness.ts:152-157`):
  `ActivityId (uuid = api itemId), CalendarDate, PlannedProgress (0-1, pre-calculated),
  ActualProgress (0-1, pre-calculated), PlannedLaborUnits, LinkedElements,
  ScheduleRevisionId` (revision filtered out of the FE view).
- So the parquet has **two weight bases** (labor units AND linked elements) and
  **pre-calculated** progress — the absence question is about the **backend job's row
  emission**, not an FE-side weight formula. A milestone with 0 elements and 0 labor
  units plausibly gets no rows; whether the job also *keys* row emission on elements is
  a backend question (Sachin/Ali own api-v2 progress-outputs).
- The **new** dashboard merges this parquet with `api_activities`
  (`itemId, userItemId, itemType, activityStatus, actualStartDate, actualFinishDate,
  linkedElementCount, plannedLaborUnits…` — harness `:161-170`), which is where the
  editor's manual 100% lives. A PBI surface reading only the parquet never sees it.

### "Portfolio PBI dashboard" — surface still not pinned exactly

- `ProgressDashboardPage` (route `progress-dashboard`, no id) is only a **card list**
  of per-project PBI reports (`getReports()` → `ProgressReportWidget` per project,
  `ProgressDashboardPage.tsx`). Each card links to the per-project PBI embed.
- So a *portfolio-level* PBI dashboard is NOT in the FE repo at all — it's a PBI report
  living in PowerBI space. Which report exactly, and what dataset it binds
  (progress-outputs parquets? reporting DB views?), must come from Hussein.

### The one-query cohort test (ready to run, no code changes)

On the **new dashboard** for ELN03 (`/projects/<eln03-id>/dashboard`), open the Dev
Panel (**Ctrl+Shift+D**, DuckDB inspector per `dashboard/README.md`) and run:

```sql
-- 1) Where does the editor's 100% live for PMILE5030 + get its uuid
SELECT itemId, userItemId, itemName, itemType, activityStatus,
       actualStartDate, actualFinishDate, linkedElementCount, plannedLaborUnits
FROM api_activities WHERE userItemId = 'PMILE5030';

-- 2) Is it absent from the parquet, or present with zero progress? (paste itemId from #1)
SELECT COUNT(*) AS rows, MIN(CalendarDate), MAX(CalendarDate),
       SUM(ActualProgress), MAX(PlannedLaborUnits), MAX(LinkedElements)
FROM activity_progress WHERE ActivityId = '<itemId-from-query-1>';

-- 3) THE cohort answer to "is it because it's a milestone?": per itemType,
--    how many activities exist vs how many have any parquet rows
SELECT a.itemType,
       COUNT(DISTINCT a.itemId)                          AS activities,
       COUNT(DISTINCT p.ActivityId)                      AS with_parquet_rows
FROM api_activities a
LEFT JOIN activity_progress p ON p.ActivityId = a.itemId
GROUP BY a.itemType ORDER BY activities DESC;
```

Expected if the milestone-absence hypothesis holds: query 2 → `rows = 0`; query 3 →
milestone-ish `itemType`s (P6 `TT_Mile`/`TT_FinMile` or similar) with
`with_parquet_rows = 0` while `TT_Task` etc. are ≈ fully covered. Query 1 shows whether
the editor's 100% landed in `activityStatus`/`actualFinishDate` (which the parquet
ignores). Same three queries on FAR01/ELN04 give the cross-project picture.

## ASK LIST (information / debugging needed from humans)

| # | What | Owner | Why |
|---|---|---|---|
| 1 | Run the 3 dev-panel queries above on ELN03 (then FAR01, ELN04); paste outputs | Ilia (5 min, no deploy) | Decisive: absent-vs-zero, cohort by itemType, where the 100% lives |
| 2 | Which parquet did Pietro actually inspect (progress-outputs `planned-and-actual/activity`, or a BI-export artefact)? And what did his earlier fix touch? | Pietro | Confirms we're talking about the same file; recurrence attribution |
| 3 | Which exact "portfolio PBI dashboard" is it (URL/report name), and what its milestone visual binds (progress-outputs parquet vs reporting DB `vw_KeyMilestone` vs other) | Hussein (PowerBI) | Pins the last unknown in the data path |
| 4 | Does the progress-outputs job emit rows for zero-element/zero-labor activities at all — and if not, is that by design? | Sachin / Ali (api-v2) | The backend half of the mechanism |
| 5 | Mongo project ids for ELN03 / ELN04 / FAR01 (+ which project the ticket URL id `69a964b9…` belongs to) | Ilia/Yash | Needed for API calls & to decode the red-herring URL |
| 6 | One concrete ELN04 milestone example (activity ID + what it shows) | Yash → Thomas | Tests the planned-date-fallback theory for the inverted look |
| 7 | Re-attach the three broken description screenshots | Yash → Thomas | Still nobody on our side has seen the failing dashboard |
| 8 | FAR01's exact Discipline/Package label spellings for its milestone activities | Yash → Thomas or Ilia in editor | Tests the label-match candidate for "none showing" |

## 2026-07-22 (later) — DEV-PANEL RESULTS: milestone-absence hypothesis REFUTED

Ilia ran queries 2 & 3 on ELN03 (new dashboard, active schedule revision):

**Query 2 — PMILE5030 in `activity_progress`:**
| rows | first_date | last_date | total_actual | labor_units | linked_elements |
|---|---|---|---|---|---|
| **802** | 1727136000000 (= 2024-09-24, schedule start) | 1796342400000 (= 2026-12-04, project end) | **141** | 0 | 0 |

**Query 3 — cohort by itemType:**
| itemType | activities | with_parquet_rows |
|---|---|---|
| Activity | 7608 | 7595 |
| WBS | 768 | 0 |

**Findings:**
1. **PMILE5030 IS in the platform's activity parquet** — 802 daily rows over the full
   project span, `SUM(ActualProgress) = 141` (non-zero actual curve; it reached
   completion and held). NOT absent, NOT zero.
2. **Zero-weight is not an exclusion rule:** `PlannedLaborUnits = 0` and
   `LinkedElements = 0`, yet the backend job emitted rows with actual progress —
   presumably sourced from the editor's manual %. The progress-outputs pipeline is
   **not** the gap.
3. **There is no milestone itemType** — milestones are plain `Activity` in api-v2
   (7595/7608 covered). The 768 `WBS` rows with zero coverage are hierarchy summary
   nodes (expected). So "because it's a milestone" is **refuted** for this parquet:
   the platform treats PMILE5030 like any activity and has its progress.
4. (13 `Activity` rows lack parquet coverage — 7608−7595. Not the milestone, but worth
   a passing look later: `WHERE p.ActivityId IS NULL`.)

**Consequence — the contradiction with Pietro's claim is now the lead.** He says "not
coming up in the activity parquet"; the platform's `planned-and-actual/activity` parquet
for the active revision demonstrably has it. Reconciliations, in order of likelihood:
- **(a) Different file:** the portfolio PBI dashboard reads a separate BI-export
  artefact (not `v2_activities_progress`) and PMILE5030 is missing THERE → the defect
  is in that export pipeline. (Precedent: PLT-2538 "Web Viewer Mapping not reflected in
  BI Export".)
- **(b) Different schedule revision:** the Dev-Panel view filters to the ACTIVE
  revision; if Pietro inspected another revision's rows — or PBI reads one — the
  stale-revision hypothesis (context.md §5b) is un-demoted.

**Still missing:** Query 1 output (PMILE5030's `activityStatus` / `actualFinishDate` /
`itemId`) — needed to know whether the actual-date field family is populated too (the
native widget / vw_KeyMilestone path), and one pin-down query (below) for when actual
hit 1.0.

```sql
-- Pin when ActualProgress first reached 1.0 (expect ≈ the editor completion date)
SELECT MAX(ActualProgress) AS max_actual,
       MIN(CalendarDate) FILTER (WHERE ActualProgress >= 1.0) AS first_date_at_100
FROM activity_progress
WHERE ActivityId = '<itemId-from-query-1>';
```

## Status

Platform-side parquet: verified GOOD for PMILE5030 (9/10, data-confirmed twice-derived).
The defect is downstream/parallel: whatever the portfolio PBI dashboard actually reads.
Critical asks now: #2 (Pietro — exact file he checked) and #3 (Hussein — PBI binding);
plus Query 1 output from Ilia.
