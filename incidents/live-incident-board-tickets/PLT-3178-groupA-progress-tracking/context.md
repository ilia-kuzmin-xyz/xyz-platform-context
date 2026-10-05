# PLT-3178 — RGN-PA18: activity dates blank, Installed Elements 0, progress dropped after baseline updates

**First seen 2026-09-30 run** (created 09-29 09:52). Critical · reporter Yash Patel · assignee Yash · status
**With Customer** (set 09-29 12:22 by Freshdesk "Waiting on customer" echo, `113284`). Freshdesk 8094.
Project RGN-PA18, id `69cb9ec38c733c8ffc1bcbac`. Domain: `progress-tracking` (schedule upload / baseline →
dashboard progress). Domain doc read: `dashboard/progress-tab.md`.

## What the customer reported (description + comments 113266, 113271)
1. Some activities show blank Start/Finish. Example A23610: XYZ % 41.16%, Planned 413, Installed 0.
2. Progress for past weeks changed after they imported two baselines (new hours, then a new baseline, then
   back to the previous config).
3. Project start moved 06-Jan-2025 → 24-Oct-2024 after import; they reset it.
4. One "forced" activity sits in Archived Activities; does it matter?
5. Follow-up `113271`: A24360 says installed but XYZ % is 1.39%. Yash's own aside: **A12150 has elements
   linked in the web viewer but does not appear on the dashboard at all.**

## Answer already on the ticket — Rishi, `113276` (2026-09-29 11:43, edited 11:44)
Same-day, structured, point-by-point. His mechanism, as stated (NOT re-verified here, see below):
- Since 17-Sep 11:14 UTC the current schedule and baseline is `PA18.BL01ABWRE_pctfix.xer`, identical to the
  customer's `3.Come back to BL01-Actual.xer`. That file has fewer actuals than `2.New Hours.xer` (442 vs 831
  completed activities; 56,822 vs 105,332 actual hours). Dashboard recomputes every week, past weeks
  included, from the **current** schedule, so history dropped. Fix: upload a schedule with current actuals and
  set it as current (`2.New Hours.xer` is the fullest).
- Blank dates are Actual Start/Finish: 521 activities have actuals in file 2, none in file 3. A23610 is one.
- A23610 platform data is 170/413 = 41.16%; the customer's Power BI sheet says 160, so the export filters
  are the suspect for "Installed 0".
- Project start = earliest activity in any folder. `B18-DD-BS-7510` (WBS "Deleted Activities") is dated
  24-Oct-2024 in file 2; no hours, so progress is unaffected, only the start date.
- 23-Aug example: hours change moved it -0.14 pts, switching file on 17-Sep a further -2.20 pts.
- A24360: % comes from linked elements when any exist, from P6 hours only when none. 647 elements were
  linked 27-Sep 19:22-19:37 UTC, 9 installed → 9/647 = 1.39%.

## Who is waiting on whom
Ball is with the customer (upload a schedule with current actuals). Status correct. Nothing owed by them
before the next working day. **One thing is owed by us and unanswered in Jira: A12150** (linked in viewer,
absent from dashboard, Yash `113266`). Rishi's reply does not mention it. It may have been handled off-ticket.

## Verified vs inferred
- **Verified (from Jira):** status, dates, who said what, that A12150 is not addressed in `113276`.
- **Inferred / taken on trust from Rishi, not reproduced by this run:** every number above (2,594
  activities, 442/831, 170/413, 647/9), the "start = earliest activity in any folder" rule, and "recalculates
  past weeks from the current schedule". None is computed in hc-frontend (grep of `pages/DashboardPage` and
  `services` for project-start logic found nothing), so it lives in the backend pipeline and could not be
  checked from here. Consistent with `dashboard/progress-tab.md` (parquets are backend-computed).
- **Plausible but untested:** A12150 absent from dashboard because it is not in the current schedule
  (file 3 has the same 2,594 activities as the 09-17 upload, so if it was added after, it would be missing).

## Unopenable media (session-wide attachment 403, see run-instructions 2026-09-08)
`1.Previous.xer` 65391, `2.New Hours.xer` 65394, `3.Come back to BL01-Actual.xer` 65392,
`2026.09.20_RGN-PA18_Report data_analysis.xlsx` 65395, `A24360_example data.xlsx` 65398, screenshots
65390, 65393, 65396, 65397, plus inline images in `113266`/`113271`. Nothing is needed for the next step;
Rishi has already opened them. They would only settle whether A12150 is in file 3.

## Open / unverified
- Whether the customer has uploaded a fuller schedule since.
- Whether A12150 is in the current schedule.
- Trigger ("why now") is answered: 17-Sep upload of a schedule with fewer actuals.
- Cohort: other projects whose current schedule was swapped to a file with fewer actuals: not asked.

---

## 2026-10-01 — what changed since 09-30 (14 comments, newest `113501`, 09-30 18:42)

Eight comments landed after `113284`, the last the 09-30 run recorded as "Waiting on customer".

- `113436`/`113438` (09-30 10:36-10:40): the customer **re-imported BL01 Rev 01 and progress now looks correct**,
  confirming Rishi's `113276` mechanism in practice (a fuller schedule as current restores history). Two
  activities still disagree: in the customer's **export** they appear completed with future plan dates and a
  negative hours variance, while the dashboard is right. They also ask what happened to the "last 2 weeks"
  figure and to cumulative progress.
- `113468` Rishi: where does the export come from? We do not maintain it (checked with Pietro), cannot infer
  its values. `113475`/`113476`/`113479`: Yash thinks Power BI and asked the customer to export via the XYZ
  MCP server instead; Rishi: if it is Power BI, differences are likely their filters or data sources.
- `113501` (18:42): Freshdesk status back to **Open**, meaning the customer has replied again. **The content of
  that reply is not in Jira.** Jira status moved With Customer to Open with it (automation), so the board now
  reads "ours" while the real ball is Yash relaying/reading it.

**What is settled:** trigger and mechanism (17-Sep schedule swap), blank dates, project start, A24360 arithmetic.
All from Rishi, not re-verified here.
**Same shape as PLT-3109:** a customer-side Power BI export disagreeing with the dashboard while the dashboard
is right (see `PLT-3109-groupA-progress-tracking/`). Two independent customers, same conclusion so far: ask for
the MCP export first, do not debug the Power BI model.
**Their "last 2 weeks / cumulative" question** is answered by `113276` point 5 (history is recomputed from the
current schedule); it was asked after reading that reply, so it likely needs the answer restated plainly.
**Still unanswered in Jira:** A12150 (linked in viewer, absent from dashboard), 2 days.

**Unverified:** content of the 18:42 reply; whether the two export mismatches survive an MCP export; A12150.
**Unopenable media:** nothing new needed. XERs `65391/65392/65394`, xlsx `65395/65398` would only settle A12150
and the two export rows.

## 2026-10-02 (scheduled) — customer answered; ball is back with the customer (status now With Customer)

Fresh fetch, 20 comments, newest `113551` (Rishi, 10-01 10:18). New since the folder's last entry (`113501`):

- `113542` (Yash, 10-01 08:56): customer says the MCP export is correct ("I cross-checked with MCP", a colleague ran it for her). So the **export-vs-dashboard disagreement is closed on the export side**. She still wants the "last 2 weeks / cumulative" fluctuation explained.
- `113546` (Rishi): that reply is contradictory and does not say what the `rev02` xlsx came from. Restates the A24360 mechanism (no linked elements until 27-Sep 19:22 so 100% from P6 hours; 647 linked in 15 min, 9 installed, so 9/647 = 1.39%). Asks Yash to have the customer say **what they saw that is wrong, where, and what they expected**.
- `113547` (Yash): explains the colleague, will go back to the customer. `113551` (Rishi): "gotcha".
- Freshdesk echoes: `113543` Waiting on 3rd line, `113549` **Waiting on customer** (10-01 09:58). Status is With Customer, so this one is parked.

**Supersedes** the 10-01 draft to Yash ("relay Rishi's point 5"): Rishi has since answered the same question again and asked for a reframe instead. Do not send it.
New attachments `65492` (png) and `65493` (`2026.09.30_RGN-PA18_Report data_analysis_rev02.xlsx`) from 09-30: unopenable from this routine (403, confirmed 09-08). The xlsx is the one Rishi says he cannot trace; knowing who produced it and from what filter would settle whether any dashboard discrepancy remains.
Still unanswered: A12150 (linked in viewer, missing on dashboard).
Nothing verified by this run beyond the comment text; Rishi's numbers are his own measurement.

## 2026-10-05 (scheduled) — unchanged
Fresh fetch with comments: 20 comments, newest `113551` (Rishi, 10-01), With Customer. Customer owes the reframed question (what she saw, what she expected) via Yash; about 4 days. A12150 still unanswered. Attachments `65492` and `65493` (png, xlsx) remain 403 from this routine. Class 1, parked. No Jira action was taken.
