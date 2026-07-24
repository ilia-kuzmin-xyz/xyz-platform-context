# PLT-2917 — recommended action (DRAFT ONLY — execute nothing)

## ⚠️ 2026-07-24 re-check — this action is superseded; a different reply was already posted

The draft below (from the 07-22 pass) was never posted verbatim. What actually went out on
2026-07-22 was **Ilia asking Thomas three clarifying questions directly** (which dashboard,
re-attach screenshots per project, one concrete example per project) — see `context.md` §Update.
Mostafa then flagged a related-but-distinct symptom in reply (activity `PMILE5030` missing from
the legacy PowerBI activity-parquet export), which this run's investigation ties back to the
**same** Actual-End-Date-not-stamped mechanism diagnosed below (`context.md` §Update — "raises
rather than lowers confidence").

**Current recommended action: none — wait.** The ticket is correctly in a customer-wait state
(Thomas hasn't answered Ilia's 07-22 questions yet). Nothing internal is gating progress right
now. **Re-check when Thomas replies**, and at that point the plan below (pull the `/milestones`
payload for FAR01/ELN03/ELN04) is still the right next internal step — it wasn't invalidated,
just not yet due.

---

## Action as originally drafted 2026-07-22 (kept for the record; resume from here once the customer replies)

### Chosen action: (a) — internal reply that (1) states the code-verified mechanism (FE is a
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
