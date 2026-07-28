# PLT-2917 — recommended action (DRAFT ONLY — execute nothing)

**Re-checked 2026-07-28 (6 days after the 07-22 draft below was written). The situation moved
forward — see `context.md` DELTA §0 — so this action is refreshed, not just re-confirmed.**

## What changed since 07-22 (why the action changed)

- The 07-22 draft's plan was "ask Pietro exactly what he touched" + pull the `/milestones` payload
  blind. That comment was **never actually posted** — instead the real ticket owner (Ilia, assignee
  at the time) posted a **different**, broader set of clarifying questions to the client (which
  dashboard, re-attach screenshots, per-project example) on 07-22. Those remain **unanswered**, and
  the ticket has since been handed back to **Yash Patel** (assignee as of 07-28).
- Two same-day comments (Mostafa, Yash — 07-22) narrowed the ticket's real target to **PMILE5030 /
  ELN03 / the parquet-generator or Power BI Portfolio dashboard**, distinct from the original
  3-project description Pietro already looked at once.
- A 07-27 client update ("all milestones are not updated") arrived with a **decodable screenshot**
  (the xlsx attachment is still auth-blocked, but the inline Freshdesk image rendered) showing
  **four named ELN03 activity IDs — PMILE5030, PMILE5010, PMILE5040, PMILE5020** — all Key
  milestones, all past-due (planned finish Apr 6, 2026), all **Actual % Complete = 100%** in the
  schedule data, all shown **`Missed`** in the milestone widget.

That last point changes the next step from "go get a payload and see what's in it" to "go get the
payload **for these four specific IDs and confirm the exact field that disagrees**" — a much
cheaper, more targeted ask.

## Chosen action: (a) — internal reply that (1) states the confirmed mechanism with the four new
IDs, (2) asks the backend/data owner (Pietro, since he's the one who said "Actual End Date should
have a value but doesn't" and is the one referenced as the parquet-file source) to check those four
IDs specifically against `vw_KeyMilestone` / the parquet output, and (3) separately flags that
Ilia's three 07-22 clarifying questions to the client are still open and should be closed out (or
dropped, since Mostafa/Yash's 07-22 comments already answered "which dashboard" = Power BI Portfolio).

Owner stays with the ticket's current assignee, **Yash Patel** (support), to relay; the technical
question routes to **Pietro** (backend/data) as before, now with a concrete repro instead of a
generic ask.

## Why this and not the other routings

- **Not Ready For Development.** Still no FE fix to build — unchanged from 07-22 (context.md §3–§4).
  The new evidence, if anything, reinforces this: the mismatch (Actual %=100 vs status=Missed) lives
  entirely in the backend field, not in how the FE renders it.
- **Not With Technical Support / back to the client.** The client has now given us more than enough —
  four exact activity IDs, a planned-finish date, and a %. Asking Thomas for more would waste the
  goodwill of a client who already sent a spreadsheet. The open questions left over from 07-22
  (which dashboard, etc.) are largely answered by Mostafa/Yash's own comments and can be closed
  internally rather than re-asked.
- **Not Blocked.** Nothing external blocks the next step; it's an internal data/DB query against four
  named IDs.

## Draft — internal reply (author: Yash Patel or Ilia; @ Pietro Desiato)

> Update on PLT-2917 (ELN03 milestones showing "Missed" despite being complete).
>
> The client's 07-27 update gives us four concrete IDs to check — no more guessing needed:
> **PMILE5030, PMILE5010, PMILE5040, PMILE5020** (all ELN03, all Key milestones, planned finish
> Apr 6 2026). Per the client's own schedule export, all four are **Actual % Complete = 100%**, but
> the milestone widget shows all four as **Missed**.
>
> **@Pietro** — two asks, both scoped to these four IDs specifically:
> 1. What does `reporting.vw_KeyMilestone` (or the parquet output, whichever this widget reads —
>    need to confirm per Mostafa's 07-22 comment that this is the Power BI Portfolio dashboard) show
>    for `status` and `actualDate`/Actual Finish for PMILE5030/5010/5040/5020? If `actualDate` is
>    null while the activity is 100% complete, that confirms the Actual-Finish-never-stamped
>    mechanism you flagged on 07-21.
> 2. Separately — what did your **earlier fix** (the one that didn't hold, per the client's 07-21
>    reply) actually change? Still don't know if it was code, a Key-Milestone remap, or a manual
>    date stamp, or which projects it covered. Needed so we don't re-diagnose something you already
>    ruled out.
>
> Also closing the loop on the 07-22 clarifying questions to the client: which-dashboard is answered
> (Power BI Portfolio, per Mostafa) — no need to chase Thomas for that specific point again.

## The one evidence step to run (owner: Pietro / backend-data; ~10 min, needs DB/parquet access)

Narrower than the 07-22 version because we now have exact IDs:

1. Query `reporting.vw_KeyMilestone` (or the parquet/`activity_progress` equivalent per DELTA §0a)
   filtered to `PMILE5030, PMILE5010, PMILE5040, PMILE5020` — read `status`, `actualDate`,
   `plannedDate`, `projectId`.
2. Cross-check against the schedule source's Actual Finish Date / % Complete for the same four IDs
   (the client's own export already shows 100%, so this should be a fast confirm/deny).
3. Expected read if the hypothesis holds: `actualDate` is null (or `status != COMPLETE`) for all
   four despite Actual % Complete = 100% upstream — confirms the Actual-Finish-never-stamped /
   intangible-fallback mechanism (context.md §4 ELN03, DELTA §0c, and `dashboard-progress-comparison`
   skill Pattern A).

## Follow-through the human should own (not executed here)

- **FAR01 / ELN04** — no new evidence arrived for these two in the 07-22→07-28 window; the 07-22
  hypotheses (zero-rows/join-miss for FAR01, backend status/actualDate inversion for ELN04) stand
  unverified. Don't let the ELN03 evidence substitute for checking these two separately.
- **Attachment access** — both the `ELN03 Milestones Dashboard.xlsx` (Jira-native, 403'd) and, ideally,
  a working Jira session would let a human read the full spreadsheet rather than the one screenshot
  crop that rendered. Worth 2 minutes for whoever has a browser session open.
- **Cohort (playbook Q6):** once confirmed, check whether other Key-Milestone activities across the
  portfolio show the same `Actual %=100 / status=Missed` split — this is likely systemic to any
  intangible (no-linked-element) milestone activity, not just these four.
- **Doc gap:** after resolution, add to `dashboard/progress-tab.md` / `pitfalls.md` (per the 07-22
  note, still outstanding) that milestone completion depends on Actual Finish Date being stamped
  separately from progress %, and that this has a known failure mode for intangible/labour-based
  activities (cross-ref `dashboard-progress-comparison` skill Pattern A).

**Confidence in diagnosis: 7/10** (up from 6/10 — real activity IDs + a confirmed matching bug
pattern, still short of seeing the actual `vw_KeyMilestone`/parquet row). **Confidence in this being
the right next step: 8/10** — same logic as 07-22 (internal data pull, no dev spend on the wrong
layer) but now targeted at four named IDs instead of "the payload" in general, which is strictly
cheaper and faster to action.
