# PLT-2917 — recommended action (DRAFT ONLY — execute nothing)

## ⚠️ 2026-08-03 re-check — the 07-30 draft below is now SUPERSEDED; do not post it

Pietro and Rishi solved the load-bearing question in-thread on 07-31 without needing either of
the two routed asks below (David Webb on parquet zero-weight rows; Sachin/Ali on the
`api_activities` row) — see `context.md` §0.6. Pietro is already implementing a PBI-side join fix
and confirmed "ok we got it working." **Posting the comment drafted below now would ask two
people to re-derive something a third person already solved from a different angle** — don't.

### Revised recommended action: one clarifying comment, not a mechanism explainer

The mechanism no longer needs explaining — Pietro/Rishi got there first. What's left is genuinely
open and is ours to ask:

1. **To Pietro:** once the PBI update ships, can you confirm against the client's own
   `ELN03 Milestones Dashboard.xlsx` (07-27/07-31 attachments) that ELN03/PMILE5030 now shows
   correctly? That's the actual close-out check, not a code fix.
2. **To Mostafa:** what specifically is "the remaining task" you flagged (07-31 17:07) that
   Darminder already has designs for? Our own §0.5 finding (Gantt lets you edit % on milestones
   that can never move the dashboard, then shows a success toast) is a plausible match — but it's
   a guess. Ask directly rather than assume and build the wrong thing.
3. **To Pietro/Mostafa/Darminder:** the feature-flag question Pietro raised 07-31 (remove
   `Editor-Progress` gating since users are already using it) is still open — worth a direct
   answer so it doesn't silently drop.
4. **Status:** keep `Open`. Reassign Yash → Ilia is still the right call (per the 07-30 draft's
   reasoning) now that the remaining work is two product/design questions, not engineering
   investigation on our side.
5. **Not yet closeable:** FAR01/ELN04 are untouched by Pietro's fix and still need Thomas's
   re-attached screenshots (§8a #4) — don't let this ticket close on the ELN03 win alone.

**Confidence this is the right next step: 8/10** — it replaces an overtaken mechanism-explainer
with the two questions that are actually still open, and flags the one thing (FAR01/ELN04) that
would otherwise get silently swept into a close-out it doesn't belong in.

---

## Prior drafts (HISTORICAL — do not post; superseded above)

### Draft as of 2026-07-30 (superseded 08-03 — Pietro/Rishi solved the routed questions below)

## RUN 2026-07-30 — chosen action: **(a) resolve through clarification**, then spawn the fix elsewhere

**Post one internal comment that answers Mostafa's question with the code-verified mechanism, and
route the two remaining checks to the two people who own them.** Keep PLT-2917 **Open**.

**Ball goes to: Ilia** (post the comment) → then **David Webb** (parquet) and **Sachin/Ali** (api-v2
row), with a product call for **Pietro/Mostafa**. Not the customer.

### Why this routing

- **Not Ready For Development.** There is no PLT/frontend fix that solves the customer's complaint.
  The FE renders milestone completion from `actualDate` (Actual End Date), and **nothing in the
  platform ever writes Actual End Date** — it only arrives from the uploaded P6/XER schedule
  (context §0.3). A dev picking this up on the PLT board would build on the wrong layer. The real
  fix is schedule-ingest / reporting (**DPL**) ± a product decision.
- **Not With Technical Support.** We already asked Thomas 3 questions on 07-22; they were never
  relayed and the ticket was flipped back to Open on 07-23. Asking again *before* we've stated what
  we now know would burn the client's patience on a ticket that has already recurred once. The one
  client-facing ask (re-attach the FAR01/ELN04 screenshots) rides along at the end of the comment,
  via Yash — it is **not** the primary move.
- **Not Blocked.** Nothing external blocks us; both open checks are in-house single-row lookups.

### Draft comment (author: Ilia; @ Mostafa, @ Pietro, @ Yash, @ David Webb, @ Sachin)

> @Mostafa — answering your question directly: **yes, it's because it's a milestone**, but the reason
> is a step earlier than the parquet.
>
> **Mechanism (verified in code):** a milestone has no linked elements, so the Gantt lets you type
> Actual % Complete by hand. That edit does exactly one thing — `POST /projects/{id}/activities/progress`
> with `calendarDate = today`. It **does not write Actual Finish Date**. There is no code path anywhere
> in the platform that writes `actualFinishDate` — it only ever comes in from the uploaded P6/XER
> schedule (`act_end_date`).
>
> Milestone completion is read from **Actual End Date** (`vw_KeyMilestone.actualDate`, non-null ⇒
> complete) — on the PowerBI portfolio dashboard and on the new milestone widget alike. So:
> **set a milestone to 100% in the editor → Actual End Date is still null → it stays "not done"
> everywhere.** That's the same thing Pietro saw from the other end ("the Actual End Date should have
> a value but it doesn't"). PMILE5030 and Thomas's "all ELN03 milestones should be done" are **one
> root cause, not two**.
>
> Separately, a milestone is zero-duration / zero labour units / zero linked elements, i.e. zero
> weight on every progress-weighting path — most likely why it's absent from the activity parquet
> altogether. Where it's absent, we render it as **0%**, not blank.
>
> **@David Webb — one question:** does the activity-progress parquet job drop zero-weight activities
> (0 labour units, 0 linked elements), and does it consume `isUserProgress` rows from
> `POST /activities/progress` at all? That's the difference between "PMILE5030's row is missing" and
> "it's there but ignored".
>
> **@Sachin — one row please:** `api_activities` for **PMILE5030 / ELN03** — `actualFinishDate`,
> `validForProgressCalculations`, `plannedLaborUnits`, `linkedElementCount`. If api-v2 derives an
> actualFinishDate from a 100% user-progress row, that kills my theory in one line.
>
> **@Pietro — still outstanding from 07-21:** what did your earlier fix change — code, or a data
> action (Key-Milestone re-mapping / stamping Actual End Dates), and on which projects? Nine days
> open; without it I can't tell whether the recurrence is "didn't cover FAR01/ELN04" or "reverted".
>
> **Product call for @Pietro / @Mostafa:** should a milestone be completable from inside the platform
> at all? Right now the Gantt *invites* it (the cell is editable precisely because there are no
> linked elements) and shows a green "Actual % Complete updated to 100%" toast — for an edit that
> cannot move any milestone view. Either we wire user progress through to a real Actual Finish, or we
> stop offering the edit on milestones. I'll raise the UX half separately.
>
> **@Yash — scoping, so this doesn't loop again:** this ticket is now **ELN03 / PMILE5030** per your
> 07-22 note. **FAR01 (none showing)** and **ELN04 (past late / future done)** from the original
> description are *not* covered — their screenshots are broken in the description and were never
> re-sent. When you next reply to Thomas, please ask for those two re-attached, one per project.
> Also: I've got `ELN03 Milestones Dashboard.xlsx` from 07-27 — if that export has Actual End Dates
> filled in on his side, that changes the diagnosis and I want to know before we go further.

### Status / assignee recommendation

- **Keep status `Open`.** It is genuinely on us. Don't re-flip to With Technical Support — that's what
  produced the 07-22→07-23 no-op loop.
- **Reassign Yash → Ilia.** Yash only holds it because Automation-for-Jira auto-reassigned on the
  07-22 With-Technical-Support flip. The open work is engineering's.
- **Spawn, don't retitle:** a **DPL** ticket for the ingest/parquet half once David answers, and a
  small **PLT** ticket for the UX half (don't offer an inline % edit that can't take effect / don't
  toast success). Neither belongs on this incident.

### Do this before posting (5 minutes, Ilia)

**Open `ELN03 Milestones Dashboard.xlsx`** (attachment 61396, 07-27). If the client's own export shows
Actual End Dates **populated** for those milestones, then P6 *does* have them and we dropped them on
ingest — which inverts the ask to David from "why is the row missing" to "why did we drop the date".
I could not open it (403 behind Atlassian auth — see context §8a). It is the one artifact that could
change the comment above.

**Confidence in the diagnosis: 8.5–9/10** (mechanism verified in code end-to-end; residual risk is a
server-side api-v2 rule I can't see). **Confidence this is the right next step: 9/10** — it answers the
question that was actually asked, unifies two threads into one root cause, puts one closed question on
each owner, and stops a backend/data defect being queued as frontend work.

---

## RUN 2026-07-22 — original draft (HISTORICAL — do not post; superseded above)

## Chosen action: (a) — internal reply that (1) states the code-verified mechanism (FE is a
renderer; done/late/complete all come from the backend `vw_KeyMilestone` / Actual End Date),
(2) asks **Pietro** the one closed question that unblocks everything — *what did your earlier fix
touch?* — and (3) names the single backend data step that confirms the cause per project.

Owner of the investigation stays **Ilia Kuzmin** (assignee). Two routed questions, one owner each:
**Pietro** (his prior fix) and a **backend/data engineer** (the `vw_KeyMilestone` payload dump).

## Why this and not the other routings

- **Not Ready For Development.** There is **no frontend fix to build.** The FE renders milestone
  status verbatim from the backend — colour = `status` from `vw_KeyMilestone`
  (`milestoneStatus.ts:14-30`, `MilestoneMarker.tsx:100/122`), completion = `actualDate`
  (`portfolioMilestonesData.ts:83/118`), with no date-vs-now logic that could cause the reported
  done/late inversion (context §3–§4). Sending this to FE dev would re-diagnose a backend/data
  defect on the wrong layer. (One *latent* FE robustness item exists — the silent
  `if (!project) continue` join-drop at `portfolioMilestonesData.ts:53` that would hide FAR01's rows
  with no warning — but that's a follow-up, not the customer's fix.)
- **Not With Technical Support / back to the client.** We need nothing from Thomas to progress — we
  have three project codes and the mechanism. The next artifact (the `/milestones` payload) is an
  internal pull. Bouncing to the client would just re-loop the ticket, which already recurred once.
- **Not Blocked.** Nothing external blocks us; pulling the milestone payload and asking Pietro one
  question are both in-house and immediate.

## The recurrence discipline (why Pietro's question comes first)

Pietro already "worked on" this and it came back **still broken**, with no ticket/PR/commit
recorded (context §6, §8). Per the playbook, an undocumented fix mid-incident destroys attribution:
we cannot tell whether his change was code or data, which projects it covered, or whether it
reverted. Asking *exactly what he touched* **before** re-diagnosing is the playbook's "why now"
discipline — it prevents us re-investigating something already ruled out and tells us whether the
recurrence is "fix didn't cover FAR01/ELN04" vs "data reverted".

## Draft — internal reply (author: Ilia Kuzmin; @ Pietro Desiato, @ Yash Patel)

Playbook style: mechanism stated once, verbatim field names, one closed question per owner, explicit
scoping.

> Update on PLT-2917 (milestones wrong on the Portfolio/Progress dashboard, FAR01 / ELN03 / ELN04).
>
> **Mechanism (confirmed in code):** the Milestone widget doesn't *compute* done / late / complete —
> it renders those states straight from the backend. The diamond colour comes only from the
> milestone's `status` field, and "complete" comes from `actualDate` (the Actual End Date). Both are
> passed through raw from `reporting.vw_KeyMilestone`; the frontend does no date-vs-today comparison.
> So whatever the view returns is what shows:
> - **ELN04 "past = late, future = done":** the view is returning `status`/`actualDate` values that
>   don't match the timeline (e.g. `actualDate` set on a not-yet-due milestone). Not a UI bug.
> - **ELN03 "should be done / 100% not showing":** matches your read, Pietro — if Actual End Date is
>   null in the view, the milestone is neither coloured Complete nor counted on-time. Note the widget
>   has no "%": the "100%" is the progress/installation figure, so the real issue is *installed 100%
>   but the schedule activity's Actual End Date was never stamped.*
> - **FAR01 "none showing":** either the view returns no Key-Milestone rows for FAR01, or its rows
>   carry a `projectId` that doesn't match the project id from `/dashboard` (the widget silently drops
>   milestones whose project id doesn't join).
>
> **@Pietro — one question before I re-dig:** what did your earlier fix change exactly — code, or a
> data action (re-mapping Key Milestones / stamping Actual End Dates), and for which projects? That
> tells us whether the recurrence is "didn't cover FAR01/ELN04" or "the data reverted", so I don't
> re-diagnose what you've already ruled out.
>
> **Next step (mine, internal):** pull `GET /portfolios/<id>/milestones` for FAR01/ELN03/ELN04 and
> read `status`, `actualDate`, `plannedDate`, `projectId` per milestone — that pins each symptom to
> the exact field (see below).
>
> Scoping: this is the Milestone Performance widget on the Portfolio dashboard, and the fix is
> backend/data (`vw_KeyMilestone` / Actual End Date), not the frontend.

## The one evidence step to run (owner: Ilia + backend/data; ~15 min, needs API/DB access)

The smallest broken-vs-working diff (playbook move #3) — dump what the FE actually receives and read
it per symptom:

1. `GET /api/v2/portfolios/<default-portfolio-id>/milestones` (or query `reporting.vw_KeyMilestone`
   directly) for **FAR01, ELN03, ELN04**. For each milestone read `projectId`, `status`,
   `actualDate`, `plannedDate`, `forecastDate`.
2. Cross-check each project's `projectId` against the `projectId` returned by
   `GET /portfolios/<id>/dashboard` (the join key at `portfolioMilestonesData.ts:51-57`).
3. **Expected reads if the backend/data hypothesis holds:**
   - **FAR01** = zero rows returned → mapping/inclusion gap; **or** rows returned but `projectId`
     ≠ the `/dashboard` id → join-miss (data-shape bug), silently dropped at
     `portfolioMilestonesData.ts:53`.
   - **ELN04** = future-dated milestones carry `status = COMPLETE` and/or a **future `actualDate`**;
     past ones carry `status = MISSED` → view is mis-classifying against the timeline.
   - **ELN03** = milestones the client says are done have `actualDate = null` (and `status` ≠
     `COMPLETE`) → Actual End Date not stamped, confirming Pietro's diagnosis.

Each outcome names the exact backend field to fix; none points at frontend code.

## Follow-through the human should own (not executed here)

- **After the payload read:** route the confirmed cause to backend/data (the `vw_KeyMilestone`
  owner) — Actual-End-Date population and/or the Key-Milestone → project-id mapping. Only *then*
  consider a ticket for the FE robustness follow-up (surface a warning instead of silently dropping
  milestones that don't join — `portfolioMilestonesData.ts:53`), which is cosmetic relative to the
  data fix.
- **"Why now" (playbook Q5):** the widget shipped 2026-07-10 (PR #2031 / PLT-2763), 11 days before
  the ticket — first exposure to real data. Confirm no schedule re-import or data action on
  FAR01/ELN03/ELN04 in that window (ties into Pietro's prior fix).
- **Cohort (playbook Q6):** once the field defect is known, query `vw_KeyMilestone` across the whole
  portfolio for the same shape (null `actualDate` on activities that are 100% installed;
  Key-Milestone rows whose `projectId` doesn't join) and remediate in bulk — don't wait for the next
  project to be reported.
- **Screenshot (NEEDS HUMAN):** confirm which surface Thomas is on and which ELN04 diamonds are
  miscoloured — corroborative only; the payload read is decisive.
- **Doc gap:** after resolution, add to `dashboard/progress-tab.md` / `pitfalls.md` that milestone
  status is backend-supplied (`reporting.vw_KeyMilestone`), the FE renders it verbatim, and
  completion depends on the schedule activity's Actual End Date — not on the installation %.
  (Not editing outside this folder per task constraints — noting only.)

**Confidence in diagnosis: 6/10** (mechanism/layer verified in code; exact backend cause per project
needs the payload). **Confidence in this being the right next step: 8/10** — asking Pietro what he
changed + one internal data read is the lowest-cost move that both avoids re-diagnosing a recurrence
and pins the defect to a field, before any dev effort is spent on the wrong layer.
