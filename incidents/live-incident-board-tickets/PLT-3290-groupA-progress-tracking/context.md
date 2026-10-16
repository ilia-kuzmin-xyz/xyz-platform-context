# PLT-3290 — "Dashboard not showing actual and planned percentage" (ML5.4) — triage context

First folder for this ticket (2026-10-16 scheduled run). Group A (status **Open**, no dev reply yet), domain **progress-tracking** (dashboard
progress panel). Leading shapes: **Pattern 3** (settings before data) and the "no progress outputs yet" empty state. **Nothing measured: no
prod access from this session, and the screenshot is unopenable.**

## Ticket (fetched live 2026-10-16, 2 comments, newest `115476`)

- Jira: https://xyzreality.atlassian.net/browse/PLT-3290. Live Incident, Major, created 10-15 14:56, assignee **Darminder**, reporter Yash.
  Freshdesk 8308, *Waiting on 3rd line* at 15:02. Project **ML5.4**, area Dashboard.
- Customer: "We have just started to link elements to the ML5.4 project but the percentage is not visible on the Dashboard, as you can see from the
  snap below there are not data at all."
- `115474` Yash to Darminder: tried marking some elements as Installed, no change; with **no filters** and several elements installed the dashboard
  still shows no data. Asks why progress percentages and activity data are not displayed.
- Who waits on whom: customer on us since 10-15, no reply from dev. Nothing else owed.

## Unopenable media

- Jira attachment `66433` (`image-20261015-140012.png`, 168 KB, uploaded by Yash 10-15 15:00): content URL is 403 from this routine (confirmed rule from
  09-08; not retried). **It would settle:** whether the panel is fully empty (no overview, no Gantt rows) or shows 0.00%, which separates H2 from H1 below.

## What the code does with "no data" (hc-frontend master `049c25819`)

- **Empty state, outputs never produced.** `use-progress-panel-data.tsx:33-38`: `hasNoProgressData = !hasError && !isLoading && !allLoaded && !hasReceivedData`,
  commented "the project has no progress outputs yet (nothing calculated)". The panel then renders empty values (`progress-panel.tsx:175-197`).
  That is what a project looks like when the backend has not generated the progress files.
- **Weighting gate.** Every progress and category query ends in `AND ${weightColumn} > 0` (`progress-queries-v2-api.ts:232,249,437,459,589`) and the default
  weighting is **Budgeted labour units** (`progress-weighting-types.ts:23-28`). A schedule with no labour units therefore yields no rows; the overview
  aggregate comes back NULL and is coerced to 0 (`coalesce-overview-progress.ts:46`), so the panel shows **0.00%**, and the category list is empty
  (Pattern 3, PLT-2941). This is a *different picture* from the empty state above.
- Both paths are frontend rendering of what the backend produced (Pattern 2); no defect in the frontend is implied.

## Hypotheses, each as a prediction one check can falsify

- **H1 (Pattern 3): weighting is Budgeted labour units and the ML5.4 schedule has no labour units.** *Prediction:* project settings show Budgeted labour units;
  the panel reads 0.00% (not blank) and the discipline/package list is empty or short; switching to Model element count brings numbers back with no code change.
  *Falsified by:* weighting is already Model element count and the panel is still empty.
- **H2: progress outputs have not been generated yet for ML5.4** (new project, linking only just started, backend run not completed or failing).
  *Prediction:* panel is the empty state with no "Last updated" value; Gantt rows load. Settled by asking the owner of the progress calculation
  (api-v2, Sachin/Ali) whether a run exists for ML5.4.
- **H3: the backend labour-hours run fails for this project.** Jira DPL-1707 (calendar-year-crossing date ranges, 10-08 amendment in the patterns file)
  breaks the labour-hours asset; dated risk was all prod projects on 1 Jan 2027, a schedule already crossing a year could hit it now. *Prediction:*
  element installs never show, `Last updated` absent or stale. Candidate only; PLT-3133 never confirmed it.
- Ruled out by the ticket text: filters (Yash tried with none), and "elements not installed" (some were marked Installed).
- **Not checked, and cheap:** XYZ Tracked toggle (restricts to activities with at least one linked element, Pattern 3 table), date range / scrubber position, and
  whether a schedule is the *active/latest* one. The customer's own summary ("just started to link") makes a stale data cut-off plausible too: PLT-3133
  showed edits take hours to reach the dashboard, and `calculatedOn` caps the merge (`dashboard-progress-service.ts:677-700`).

## Related

- PLT-3133 (data-pipeline, Freshdesk-closed 10-13 with the symptom unexplained): slow refresh after changes. If ML5.4 only started linking today or
  yesterday, "not refreshed yet" is indistinguishable from "never calculated" until the project's last calculation time is known.
- PLT-2524 (PR #2251, merged, shows when figures were last calculated): **not in any release tag** (latest `v26.3.7`), so production users cannot see that date yet.
  It would answer H2 by eye once released.
- PLT-3010, PLT-2941: the Pattern 3 precedents (both resolved by a settings change).

## Verified vs inferred

Verified: ticket text; the empty-state and weighting code paths and the default; PLT-2524 is untagged.
Inferred: everything about ML5.4's actual settings and backend state.

## What remains unverified

- ML5.4's progress weighting setting, whether its schedule has labour units, and whether a progress run exists for it. None readable from here.
- What the screenshot shows (blank vs 0.00%).
- Whether the schedule on ML5.4 crosses a calendar year (H3).

No Jira action was taken.
