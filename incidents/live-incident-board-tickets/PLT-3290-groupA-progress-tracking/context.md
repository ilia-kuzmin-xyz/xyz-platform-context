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

---

## 2026-10-20 run — Ilia replied on 10-19; the 10-16 hypotheses are re-ordered (additive; nothing above is deleted)

Re-fetched live, 4 comments, newest `115958`.

- `115957` Ilia (10-19 17:27): **not a dashboard error.** The progress parquet with **actual** progress was not generated properly for ML5.4, so the dashboard has nothing to show; **only the planned file exists (calculated 14 Oct)**.
  Linking looks fine: **1,511 elements on 15 activities, 953 installed.** Asks **@Ali** why the planned-and-actual parquet files were not generated (project id `46f2f7f3-9904-421c-9029-d20f8ed677ca`).
- `115958` Yash thanks him and asks Ali whether it needs to move to PAPI.
- **Who waits on whom:** Ali owes an answer since 10-19 17:27 (under one working day). Nothing owed by the customer. Ticket stays In Analysis (Ilia).

**Superseded by this:** the 10-16 draft (question to Yash about the weighting setting) is **dead**; do not post it. H1 (Pattern 3, weighting gate) is effectively ruled out by Ilia's finding that the actual file is missing:
a Pattern 3 project has the files and shows 0.00%. **H2 is now the working hypothesis, from Ilia's read, which this session cannot repeat** (inferred, not measured here). H3 (DPL-1707) is the next question *after* Ali answers,
not alongside it: one question per message.

What the code predicts for H2, unchanged from 10-16: the blank panel (`use-progress-panel-data.tsx:33-38`). That fits "nothing at all" and does not fit 0.00%; the customer's screenshot (`66433`, still 403) would show which. It is now a cheap
confirmation rather than the deciding fork.

New unverified detail: "planned calculated 14 Oct" means the planned run succeeded on the day linking started, and the actual run did not. Why one succeeds and the other fails is the backend question; nothing frontend explains it.

**Action class: 1** (Ali owes). Chase on 10-21 only if silent. Draft, only after Ali says the run failed and the DPL-1707 fork is next (one closed question, 14 words):

> Ali, thanks. **Which error does the ML5.4 actual-progress run log show for 14 Oct?**

(Wording assumes Ali can read the run log, not verified. Compare the error with DPL-1707's year-crossing date failure yourself; do not put the DPL ticket in the message. Do not send before Ali's first answer.)

No Jira action was taken.

---

## 2026-10-22 run — Ali handed it to Sachin; ball is with api-v2 (additive)

Re-fetched live: 7 comments, newest `116063` (Yash, 10-21 11:39), still In Analysis, Ilia.
- `116058` Ali (10-21 11:22) hands the parquet question to **Sachin** ("could you please check this?"). `116059` Ali asks Yash to invite him and Sachin to the project; `116063` Yash: Ali is already in, **Sachin has been invited**.
- So the ML5.4 progress-file question has an owner (Sachin) and he has project access as of 10-21 11:39. Nothing owed by Ilia or the customer. Sachin owes since 10-21 11:22 (about one working day by tonight).
- Yash's "move to PAPI?" (`115958`) was not answered in words; Ali routing it to Sachin inside PLT reads as "no PAPI ticket yet". If Sachin finds a run failure, the PAPI ticket needs project id `46f2f7f3-9904-421c-9029-d20f8ed677ca` and the 14 Oct planned-file date.
- hc-frontend master moved (`cb87101e2`, 10-21): PLT-3338 (#2370, Weighted labour units offered at project creation) and PLT-3185 (#2352, quantity weighting in progress panel, behind the PackageQuantities flag) touch weighting but not the "no actual file" path. They do not change the hypothesis ordering. Not relevant unless ML5.4 was created with a non-default weighting (not checked).

Action class 1 (Sachin owes). Chase 10-23 only if silent: one line, same question, no new content. The DPL-1707 follow-up draft above still applies after Sachin's first answer. No Jira action taken.
