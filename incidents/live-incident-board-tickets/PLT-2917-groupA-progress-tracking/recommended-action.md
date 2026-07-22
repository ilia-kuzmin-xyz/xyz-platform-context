# PLT-2917 — recommended action (DRAFT ONLY — execute nothing)

> **⚠️ Surface correction (2026-07-22, second pass — read context.md §2 first):** the customer's
> URL is the **old PowerBI progress dashboard** (`ProgressReportPage` = PowerBI embed), not the
> native Portfolio Milestone widget this draft originally assumed. The core routing conclusion is
> unchanged — the defect is in the schedule→reporting-DB data, not FE code — but the decisive
> evidence step shifts from the `/portfolios/:id/milestones` API to **querying the reporting DB
> view directly (`reporting.vw_KeyMilestone`, or whichever dataset the PBI milestone visual
> binds — confirm with Hussein/PowerBI)**, and a FAR01-specific check is added: compare the
> literal Discipline/Package labels (`Milestone` / `Key milestone`) across FAR01 vs ELN03/ELN04
> in the editor, since an exact-label filter in the view would silently drop a project whose
> package is named differently. The `/milestones` API dump remains useful only as a proxy if it
> reads the same view. The draft below is kept with this correction applied where it matters.

## CHOSEN ACTION (revised 2026-07-22 after operator review): client clarification FIRST, via Yash

The original draft (kept below for the record) argued "Not With Technical Support — we need
nothing from Thomas." **Operator review overturned that**: (a) the inline screenshots in the
description are broken for all three projects, so we have never seen what the customer sees;
(b) the ticket URL points at the **old PowerBI dashboard** while the new dashboard lives at
`/projects/<id>/dashboard`, so even the target surface is ambiguous; (c) no concrete example
exists for FAR01 at all. Per the playbook, we cannot build a broken-vs-working pair without a
concrete instance — so the next step IS a client round-trip after all.

### Draft reply (author: Ilia; @ Yash Patel, who relays to Thomas)

> Hi @Yash — before we take this on, three clarifications from Thomas please. The inline
> screenshots in the description are broken for all three projects, so right now we can't see
> what he sees.
>
> 1. **Which dashboard is this about?** The link in the ticket
>    (`cloud.xyzreality.com/progress-dashboard/…`) is the **old PowerBI dashboard**. Does he
>    expect the issue fixed there, on the **new dashboard** (`/projects/<project-id>/dashboard`),
>    or does it appear on both?
> 2. **Could he re-attach the screenshots** — one per project (FAR01, ELN04, ELN03), showing the
>    milestones as he currently sees them?
> 3. **What exactly is wrong, per project — one example each:** activity ID + what is shown vs
>    what he expects (format like his ELN03 example: "Dh4 Ready for Energization = 100% → not
>    showing 100%"). Specifically: is the problem (a) the milestone status/date display on the
>    dashboard, (b) the progress % values in the schedule panel, or (c) elements not highlighting
>    in the 3D viewer for those milestone activities?
>
> Scoping: on our side the schedule data looks right in the editor — Dh4 Ready for Energization
> is mapped Discipline=Milestone / Package=Key milestone and shows Actual 100% — so the
> disagreement is between the editor and *some* dashboard surface; we need to pin which one
> before routing this to the right team (PowerBI/reporting vs platform).

Playbook conformance: three closed questions, one relay owner (Yash), each answerable with a
value/artifact; scoping line states what is already verified so it isn't re-litigated. If Thomas
answers (c), the ticket may partially self-resolve — milestone activities carry **Elements = 0**
by design, so "no elements highlighted for a milestone" is expected behaviour, not a bug.

Optional 4th question (next round, once surface is pinned — trigger discipline): *"Did these
milestones ever display correctly on that dashboard — if yes, roughly when did it change?"*

**Status routing:** posting this ⇒ move ticket to **With Technical Support** (client
clarification owned by Yash) — per this board's convention that puts it out of triage scope
until the answers land.

**Still owed internally (separate message, separate owner — do not lose):** ask **Pietro** what
his earlier fix touched (code vs data action, which projects) — unchanged from the original
draft below. The stale-schedule-version hypothesis (schedule name `…updated__I_(3)`, PBI possibly
pinned to an older upload — see context.md) is the leading unifying candidate to test once the
surface is confirmed.

---

## ORIGINAL (superseded) chosen action — kept for the record

(a) — internal reply that (1) states the code-verified mechanism (the dashboard
layer renders reporting-DB milestone state; done/late/complete all come from
`vw_KeyMilestone`-family data / Actual End Date, with no FE date logic), (2) asks **Pietro** the
one closed question that unblocks everything — *what did your earlier fix touch?* — and (3) names
the single backend data step that confirms the cause per project.

Owner of the investigation stays **Ilia Kuzmin** (assignee). Two routed questions, one owner each:
**Pietro** (his prior fix) and a **backend/reporting engineer** (the `vw_KeyMilestone` /
PBI-dataset dump for the three projects).

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
- **Screenshot — resolved 2026-07-22:** turned out to be the Schedule tab's mapping screen (not the
  Portfolio widget), showing `DH4 Ready for Energization` at Planned=100%/Actual=100%/Elements=0.
  Confirms milestones' "Actual %" comes from the imported schedule's own percent-complete field, not
  installation roll-up — sharpens Pietro's hypothesis to "schedule import can set Actual %=100
  without stamping a real Actual Finish date." Does **not** by itself confirm `actualDate` is null —
  the payload read below is still the decisive step. Also surfaced a live "2530 un-mapped activities"
  banner on this exact schedule, worth cross-referencing against PLT-2918 (same mapping screen).
- **Doc gap:** after resolution, add to `dashboard/progress-tab.md` / `pitfalls.md` that milestone
  status is backend-supplied (`reporting.vw_KeyMilestone`), the FE renders it verbatim, and
  completion depends on the schedule activity's Actual End Date — not on the installation %.
  (Not editing outside this folder per task constraints — noting only.)

**Confidence in diagnosis: 6/10** (mechanism/layer verified in code; exact backend cause per project
needs the payload). **Confidence in this being the right next step: 8/10** — asking Pietro what he
changed + one internal data read is the lowest-cost move that both avoids re-diagnosing a recurrence
and pins the defect to a field, before any dev effort is spent on the wrong layer.
