# PLT-2946 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) one internal comment to the assignee, Rishi Bhugobaun

**Owner: Ilia Kuzmin. Addressee: Rishi Bhugobaun, cc Yash Patel. One message, no customer contact yet.**

Rationale, per `incidents/live-incident-playbook.md`:
- **Not to the customer.** We have neither facts nor theories yet (Phase 1). Every table needed to
  settle this is already loaded in the page's own DuckDB — Pietro's lesson ("repro-in-our-hands beats
  log archaeology") applies directly.
- **Not Ready For Development.** Mechanism 1a is a credible FE fix, but shipping it before confirming
  it's *this* customer's bug repeats the PLT-2874 anti-pattern (3 weeks under the wrong reflex).
- **Not Blocked.** Nothing external blocks this; it's one query away from an answer.
- **The screenshots are ours to open, not Rishi's to re-request** — he already asked for them and Yash
  supplied them. Asking a third time would be the "evidence request with no owner" anti-pattern.

## Draft comment (internal, on PLT-2946)

> @Rishi Bhugobaun — picking up the mechanism side of this. Before we look for a bug, three things
> about how that number is produced, because two of them can make correct data look wrong.
>
> **1. Which surface.** The only per-activity `Actual %` on the dashboard is the Schedule (Gantt) grid
> column (`scheduler-columns.tsx:77-91`). The Progress panel is category-level only. Can you confirm
> from the screenshots that's what Thiago is looking at?
>
> **2. That column is a date-range delta, not % complete.** It renders `MAX(ActualProgress) −
> MIN(ActualProgress)` over the rows inside the selected window
> (`dashboard-schedule-service.ts:455-465`), so any progress earned before the activity's first row in
> that window is subtracted off. One click on "Last 2 weeks" (`date-range.tsx:517-520`) makes a
> fully-installed activity read near 0%. **Closed question, and I think the screenshots answer it:
> what date range was selected?** They're 1901×907 and 1892×891, so the date bar should be in frame.
>
> **3. Some of these activities may not be element-driven at all.** Per the parquet spec — *"if there
> are linked elements, actual progress is calculated from the number of installed elements (tangible).
> Otherwise, reported/planned labour units is used (intangible)"* (`planned-and-actual-activity-schema.md:7`)
> — an activity with zero linked elements gets its % from reported labour, which is exactly how you get
> "25% actual while no items are installed". The editor marks this (tooltip "Values are driven via
> linked elements."); the dashboard Gantt doesn't, because `api_activities` drops `isUserProgress` at
> load (`api-activities-loader.ts:88-105`).
>
> **The check — one query, in the browser, no backend needed.** Open Hutto2's dashboard, DuckDB
> Explorer (Ctrl+Shift+D), paste this, post the raw rows (no trailing semicolon — the extension wraps
> the query and `;` breaks it):
>
> ```sql
> WITH act AS (
>   SELECT itemId, userItemId, itemName, activityStatus,
>          linkedElementCount, plannedLaborUnits, startDate, finishDate
>   FROM api_activities
>   WHERE itemName ILIKE '%Cable Tray%'
> ),
> prog AS (
>   SELECT ActivityId,
>          MIN(CalendarDate)                     AS first_row_date,
>          arg_min(ActualProgress, CalendarDate) AS actual_at_first_row,
>          MAX(ActualProgress)                   AS actual_max,
>          MAX(LinkedElements)                   AS parquet_linked,
>          MAX(PlannedLaborUnits)                AS parquet_labor_units
>   FROM activity_progress
>   GROUP BY ActivityId
> ),
> links AS (
>   SELECT al.activityId,
>          COUNT(*) AS links_now,
>          SUM(CASE WHEN es.installationStatus = 'INSTALLED_ACCURATELY' THEN 1 ELSE 0 END) AS installed_now,
>          SUM(CASE WHEN ebd.modelElementId IS NULL THEN 1 ELSE 0 END) AS no_geometry_row
>   FROM activity_links al
>   LEFT JOIN element_status    es  ON es.modelElementId  = al.modelElementId
>   LEFT JOIN element_base_data ebd ON ebd.modelElementId = al.modelElementId
>   GROUP BY al.activityId
> )
> SELECT a.userItemId, a.itemName, a.activityStatus,
>        a.linkedElementCount AS api_linked, p.parquet_linked,
>        l.links_now, l.installed_now, l.no_geometry_row,
>        ROUND(l.installed_now * 100.0 / NULLIF(l.links_now, 0), 2) AS installed_over_linked_pct,
>        ROUND(p.actual_max * 100, 2)                           AS cumulative_actual_pct,
>        ROUND((p.actual_max - p.actual_at_first_row) * 100, 2)  AS window_delta_pct,
>        p.first_row_date, p.parquet_labor_units
> FROM act a
> LEFT JOIN prog  p ON p.ActivityId = a.itemId
> LEFT JOIN links l ON l.activityId = a.itemId
> ORDER BY a.userItemId
> ```
>
> **How to read it:**
> - `parquet_linked = 0` → intangible; the % is reported labour, not installs. Explains the 25%.
>   Nothing wrong with the number; the dashboard just isn't telling anyone where it came from.
> - `installed_over_linked_pct ≈ cumulative_actual_pct` and site says complete → dead links inflating
>   the denominator — same family as PLT-2882 / PLT-2909 / PLT-2931, Hutto2 would be the 4th project.
> - `cumulative_actual_pct` high but `window_delta_pct` low, matching the screenshot → the date-window
>   delta is the defect, and it's ours. The fix pattern already exists on the aggregate path
>   (`progress-queries-v2-api.ts:706-716`); the Gantt column never got it.
> - `links_now` in single digits with `installed_now = 1` → a single stray claim, 25% is just 1/4.
>
> ⚠️ Caveat: `no_geometry_row` is derived from `element_base_data`, built from `svf2-object-id-map`,
> which is emitted for Navisworks-path models only — on a Revit-mapped project it flags everything and
> means nothing. Sanity-check against an activity the customer says is fully installed first.
>
> **Faster than the query:** open one of these activities in the editor's Schedule grid. If
> `Actual % Complete` is editable and doesn't carry the "driven via linked elements" tooltip, that
> activity has zero linked elements — answer for the 25% without any SQL.
>
> **Separate from this ticket, flagging so it doesn't get folded in:** (i) the Gantt's `Actual %` has
> no tooltip and no linked-element column, so the same label means "installed ratio" on some rows and
> "reported labour" on others — worth its own UX ticket regardless of this outcome; (ii) the
> `calculatedOn` freshness timestamp doesn't cover the activity-level parquet behind this column.
>
> @Yash Patel — nothing needed from Thiago yet; I'd rather answer this from our own data. One thing
> only you can settle if the screenshots don't show it: was a non-default date range selected when he
> took the snips?

## Follow-through a human should own (not executed here)

- **Open attachments 61703/61704** and record surface + date range + per-row values — highest-value
  five minutes available on this ticket, likely decides between mechanism 1a and everything else.
- **Confirm the platform project name for Hutto2 doesn't contain `v1`** — a "v1" name routes to the
  legacy PowerBI dashboard and invalidates this whole analysis.
- **If intangible (2a) is confirmed:** escalate David Webb's open question from PLT-2917 (does the
  activity parquet consume `isUserProgress` rows?) rather than leaving it open a second time.
- **If Pattern 1 (1b) is confirmed:** add Hutto2 as the 4th project in `recurring-defect-patterns.md`;
  use `deleteActivityLinks()` per `data-remediation-runbook.md` — note the identical soft-delete
  approval has been stalled on PLT-2882 since 15 Jul and PLT-2931 since 24 Jul; don't open a third
  parallel approval, consolidate.
- **If the window delta (1a) is confirmed:** one FE ticket to port `arg_max(… CalendarDate <=
  boundary)` from `progress-queries-v2-api.ts:706-716` into `dashboard-schedule-service.ts:455-465`,
  plus a tooltip pass on the column. Re-baseline the golden-master regression suite deliberately
  (`npm run jest:regression`) since the change is meant to move numbers.
- **"Why now" and cohort are both unowned** — nobody has asked what changed on Hutto2, and nobody has
  checked whether other packages/projects show the same shape silently.
- **Software Area field is empty on the intake** — set it to Dashboard so this ticket surfaces in
  board sweeps.
