# PLT-2917 — recommended action (DRAFT ONLY — execute nothing)

> **RE-CHECK 2026-07-29 — REVISED.** The ticket changed materially (scope reframe on 07-22, status
> round-trip, new 07-27 comment + xlsx). The revised action is immediately below; the 07-22 draft is
> retained further down, **partly superseded** — its Pietro question and its "no FE fix to build"
> reasoning still hold, but its evidence step targets the wrong surface.

---

# ✅ CURRENT ACTION (2026-07-29)

## Chosen action: (a) — internal reply that **splits the two signals**, answers Mostafa's actual
question (*"is that because it's a milestone?"*) with the schema evidence, and routes **two closed
questions internally** — because the client-facing questions we asked on 07-22 were bounced back to
us unanswered on 07-23 and must not simply be re-sent.

Owner of the investigation should return to **Ilia Kuzmin** — the ticket is currently assigned to
**Yash Patel** only because automation reassigned it when Ilia flipped it to With Technical Support
on 07-22; Yash flipped it back to Open on 07-23 without an answer, so the board now shows the
coordinator holding an engineering investigation. Flag that to Yash explicitly.

## What changed since 07-22, and why the action changes with it

1. **The ticket's subject was re-scoped and we missed it.** Yash (07-22 09:42): *"This ticket is
   raised for the issue user is having **as mentioned by Mostafa**"* — i.e. **`PMILE5030` in ELN03
   set to 100% in the editor but absent from the activity parquet**, on the **PowerBI portfolio
   dashboard**. The description's three-project complaint is the half Pietro already worked on.
   Two live signals, no split → playbook Phase 2.
2. **The surface question is closed.** `/progress-dashboard/:id` → `ProgressReportPage` →
   `PowerBIEmbed` (context §0.2). So the previous plan's decisive step — pulling
   `GET /portfolios/:id/milestones` — interrogates **our new Portfolio widget**, which is *not* the
   surface the client is looking at. Keep it for the description half; it is no longer step one.
3. **Our questions were dropped and the ticket bounced back.** With Technical Support (07-22 09:31)
   → Open (07-23 15:54) with **none of Ilia's three clarifications answered**. Re-asking the client
   the same three questions would repeat the playbook's "evidence request without an owner"
   anti-pattern for the second time on one ticket.
4. **A possibly-decisive artifact arrived unread.** `ELN03 Milestones Dashboard.xlsx` (07-27) may
   already contain the per-activity shown-vs-expected list we asked for. **Open it before asking the
   client anything.**
5. **Mostafa's question is now answerable** from the schema + parser (context §0.3) — and the answer
   ("probably yes, because a milestone has no progress basis") reframes the ticket from *bug* toward
   *product decision*, which changes who it should go to.

## Why (a) and not the other routings

- **Not Ready For Development.** Still no frontend fix to build — and now for a stronger reason: on
  the PowerBI surface the FE holds no milestone data at all (it fetches an embed URL + token), and on
  the platform surface there is **no `itemType` predicate** in the progress queries and only a
  `ScheduleRevisionId` filter on the parquet load, so a milestone row would be counted **if it
  existed**. The missing row is produced upstream.
- **Not back to the client / With Technical Support.** We already tried that on 07-22 and it returned
  unanswered in 24 h. Everything blocking us now is in-house: an unread xlsx, one parquet query, and
  two one-line answers from Mostafa/Pietro.
- **Not Blocked.** Nothing external blocks the next three steps.
- **Not a straight re-file to the PBD project — yet.** The *render* surface is PowerBI (precedent:
  PLT-2891 → PBD-2111), but the defect is upstream of PowerBI in the activity parquet, so moving the
  ticket now would move it away from the layer that has to change. Decide after step 1 below.

## Draft — internal reply (author: Ilia Kuzmin; @ Mostafa Kamel Hussien, @ Pietro Desiato, @ Yash Patel)

Playbook style: split the signals loudly, one closed question per owner, mechanism stated once.

> Picking PLT-2917 back up. First, **splitting the two things in this ticket**, because they have
> different surfaces and different owners:
>
> **(A) The description's complaint** — FAR01 / ELN04 / ELN03 milestone markers on the **new**
> Portfolio dashboard. This is the half @Pietro already worked on and the client says is still broken.
> Mechanism there is unchanged and code-verified: our widget renders `status` and `actualDate` straight
> out of `reporting.vw_KeyMilestone` with **no date-vs-today logic**, so whatever the view returns is
> what shows.
>
> **(B) What this ticket is actually raised for** (thanks @Yash for the correction) — **`PMILE5030`
> in ELN03: set to 100% in the editor, not present in the activity parquet**, seen on the **PowerBI**
> portfolio dashboard.
>
> **@Mostafa — answering your question directly: yes, very likely because it's a milestone, and
> arguably by design.** The activity progress parquet computes `ActualProgress` by one of two methods,
> weighted by `PlannedLaborUnits` or `LinkedElements`. A P6 milestone is zero-duration: 0 planned
> labour units and normally 0 linked elements — so **both methods have a zero basis and there is
> nothing for the generator to emit**. Our own schedule parser says the same in a comment ("0-hour
> activities — milestones, level-of-effort, hammocks — are allowed"), and `itemType` already
> distinguishes `Milestone` from `Task`. Worth stressing: **the frontend isn't filtering these out** —
> there's no `itemType` condition anywhere in the progress queries, so if the row existed we'd read it.
> The row isn't being generated.
>
> **Which means (A) and (B) are probably the same gap:** a milestone's completion isn't a *percentage*,
> it's an **Actual Finish Date**. That's exactly what Pietro reported on the other half ("the Actual End
> Date should have a value but it doesn't"). Asking for a milestone's "100%" is asking for a quantity
> that isn't defined for it in either progress method.
>
> **@Mostafa / @Pietro — one closed question:** *"he's done it to be 100% in the editor"* — what
> exactly was done? Linked elements marked Installed, an Actual Finish Date entered, or a P6-side edit
> re-uploaded? I can't find any manual percent-complete override in the product, so this decides
> whether a milestone can carry progress at all.
>
> **@Yash — two things.** (1) There's an `ELN03 Milestones Dashboard.xlsx` from 07-27 that nobody has
> opened; if it lists the milestones with expected-vs-shown, it answers most of what I asked Thomas on
> 07-22, and we shouldn't re-ask him. (2) The ticket is assigned to you but the open work is
> engineering/product — reassigning to me.
>
> Scoping: (B) is a **backend parquet-generation** question, not PowerBI's rendering and not the
> frontend. (A) is `vw_KeyMilestone` / Actual End Date. Neither is a UI bug.

## The evidence steps to run, in order (all in-house)

1. **Open the 07-27 xlsx** (owner: Yash or Ilia; 5 min, needs Jira attachment access — I get **HTTP
   403** here). It may already carry ELN03's per-milestone expected-vs-shown list. **Do this before
   any client contact.**
2. **Query the activity parquet for `PMILE5030`** (owner: Ilia + the parquet/dagster owner; ~15 min):
   does `actual_progress_combined_methods` hold **any** row for that `ActivityId`, and what are
   `ProgressMethod`, `PlannedLaborUnits`, `LinkedElements`? Then check `api_activities.itemType` for
   it. **Expected if §0.3 holds:** zero rows, `itemType = 'Milestone'`, `PlannedLaborUnits = 0`,
   `LinkedElements = 0`. That is the whole diagnosis in one query.
   *The repo's `dashboard-progress-comparison` skill ("Compare Platform Dashboard (DuckDB/parquet) vs
   Power BI Dashboard data") is built for exactly this comparison — use it rather than hand-rolling.*
3. **Then, and only then, the product decision** (owner: Mostafa/Pietro): should Key Milestones be
   reported complete from **Actual Finish Date** instead of a progress %? If yes, this stops being an
   incident and becomes a change in the parquet generator + `vw_KeyMilestone` — and it fixes both
   halves at once.
4. **The description half (A)** keeps the 07-22 step below (`GET /portfolios/<id>/milestones` for
   FAR01/ELN03/ELN04) — but run it *after* step 2, since the Actual-Finish-Date answer likely covers it.

## Follow-through the human should own

- **Pietro's undocumented fix** — still unanswered after 8 days, and now scoped: it was the (A) half.
  Ask what it touched (code vs data, which projects) so the recurrence is attributable.
- **"Why now" (playbook Q5):** for (A), the widget shipped 2026-07-10 — first contact with real data.
  For (B) there is **no dated trigger at all** yet: was `PMILE5030` ever in the parquet, or has this
  always been true? *"Has it ever worked?"* is the cheaper question and it hasn't been asked.
- **Cohort (playbook Q6):** if milestones are systematically absent from the activity parquet, the
  affected set is **every Key Milestone on every project** — a portfolio-wide gap, not an ELN03 one.
  Worth a count of `itemType = 'Milestone'` activities with no parquet row before anyone calls it fixed.
- **Ownership / re-file:** after step 2, decide whether the render-side complaint belongs in the
  **PBD** project (precedent PLT-2891 → PBD-2111) while the data fix stays with the parquet generator
  (David Webb / dagster, per the PLT-2385 precedent).
- **Doc gap:** add one line to `dashboard/pitfalls.md` that `/progress-dashboard/:id` is the **PowerBI
  embed** (`ProgressReportPage`) while `/progress-dashboard` is **our** Portfolio dashboard — the
  confusable pair that mis-aimed the 07-22 pass. (Not editing outside this folder per task constraints.)

**Confidence in the diagnosis: 6-7/10** (surface now settled at 9/10; the milestone/zero-weight
mechanism is a schema-backed inference at 6/10 — the generator is backend and unread).
**Confidence in this being the right next step: 8/10** — reading an attachment we already have and
running one parquet query costs almost nothing, answers the question Mostafa actually asked, and
avoids both re-asking a client who already ignored us and re-diagnosing the wrong surface.

---

# ⤵️ SUPERSEDED — 07-22 draft (retained; targets the description half / the new Portfolio widget)

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
