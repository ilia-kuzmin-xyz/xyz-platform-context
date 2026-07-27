# PLT-2931 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — internal **approval chase** to Pietro + Mostafa, with the one pre-flight check attached

**This ticket does not need another diagnostic.** That is what separates it from its two siblings: PLT-2882's action was "run the evidence step", PLT-2909's was "reuse PLT-2882's diagnostic on ATL08". PLT-2931's mechanism is already confirmed against project data by the assignee, arithmetically self-consistent across five independent activities (`context.md` § Ilia's data), and corroborated by a code read that finds no frontend participation in the number at all. **The only thing standing between this ticket and resolution is a decision by two named people that was requested on 2026-07-24 20:12 and has had no reply for ~3 days.**

So the action is a **status nudge / approval chase** — the shape the board README calls action type (c) in spirit but authored by the assignee rather than the coordinator, because the ask is a technical approval, not a client-comms hand-off.

Two things ride along with the nudge, and they are what make it more than "any update?":

1. **The pre-flight check that de-risks the approval** (see below) — approvers say yes faster to a change whose end-state is verified rather than predicted.
2. **The reframe that probably explains the silence**: Ilia's request reads *"same endpoint and audit trail as PLT-2882"*, which invites the reading "we've done this before, just repeating it." Per `context.md` § "PLT-2882's fix is NOT in the codebase", that is **not** the situation — PLT-2882's own log ends at *"deletion pending peer alignment"* and its 418 links appear never to have been deleted. **Pietro and Mostafa are being asked to approve the family's first production deletion of link data.** If they read it as a routine repeat, they'd deprioritise it; if they read it as a first-of-kind, they'd want the reversibility and audit story spelled out. Either way the current wording is the likeliest cause of the stall, and the fix is one sentence.

### The one pre-flight check to run before/alongside the nudge (owner: Ilia; ~10 min, same query shape as the CSV)

> **Are all *other* Containment activities on ELN03 already at 100%?**

Ilia's stated outcome is *"Containment clears to 100%"*. The five activities reaching 100% is a direct consequence of the mechanism and is safe to predict. The **package** reaching 100% is not: it is a weighted mean over **every** activity in the package on the latest `CalendarDate` — `SUM(weight × LaborWeightedActualProgress) / SUM(weight) × 100`, `progress-queries-v2-api.ts:565-570`, weight `TotalPlannedLaborUnits` by default (`types/progress-weighting-types.ts:20-22`). One unrelated activity sitting at 80% keeps Containment below 100% after a perfectly successful fix.

Run the existing query with the package filter widened from the five named activities to **all Containment activities**, and report two numbers: how many are below 100%, and what the package % computes to if the 193 dead links are removed. Also read ELN03's **Progress Weighting** setting (labour hours vs element count) while there — if it is element count, the deletion changes the weights as well as the progress, and the before/after should be described accordingly (`context.md` caveat 2).

**Why this belongs with the nudge and not after the approval:** the worst outcome available on this ticket is "approved, executed, and Containment still isn't 100%" — that burns the approvers' trust on the *next* project's request, and there will be a next one.

---

## Draft internal reply (author: Ilia Kuzmin; @ Pietro Desiato, @ Mostafa Kamel Hussien, cc Yash Patel) — playbook style, DRAFT ONLY

> @Pietro Desiato @Mostafa Kamel Hussien — following up on my 24 Jul comment here (ELN03 Containment). Nothing new to diagnose; I'm just blocked on your go-ahead, so flagging it rather than letting it sit.
>
> **What's confirmed:** five Containment activities are capped below 100% by **193 links pointing at elements that no longer exist in the current model geometry**. In all five, `installed / linked` equals the dashboard % to two decimal places, and every element that still has geometry is already installed — so Thomas's claiming was correct and the links are dead. Query output attached as CSV.
>
> **What I'm asking to do:** soft-delete those 193 links via the existing unlink endpoint (`POST /projects/{id}/elements/activity-links/delete`), in batches of 500, exactly as the editor does when a user unlinks elements by hand. It's a soft delete — the link history is retained and the change is reversible; the evidence parquets aren't touched; the CSV is the audit record. After the next pipeline refresh the five activities read 100%.
>
> **One correction to my earlier wording, since it may be why this has sat:** I wrote "same endpoint and audit trail as PLT-2882", which reads as though we've already done this once. We haven't — **PLT-2882's 418 links are still in place, on hold pending peer alignment.** So this would be the first deletion in this family, not a repeat, and I'd rather you approve it as such. If you'd prefer, ELN03 is a good first one: 193 links, one package, a named client asking for it, and a verified list.
>
> **De-risking before I touch anything:** I'm checking whether the *rest* of the Containment activities are already at 100%. The five will clear either way, but the package number is a weighted average across all its activities — if something unrelated is sitting below 100%, Containment won't hit 100% even after a clean fix, and I don't want to report a failure that isn't one. I'll post that number before executing.
>
> **Scope, to be explicit:** this fixes ELN03's Containment only. **Why re-uploads leave dead links behind is not fixed by this** and stays with the PLT-2882 / PLT-2909 backend thread — ELN03 will re-accumulate dead links on its next re-upload until that lands. And these five are the activities Thomas happened to notice; I haven't swept the rest of ELN03 yet.
>
> **One decision that isn't mine, while I have you both:** ELN03 is the third confirmed project on this same defect (FAR01, ATL08, now ELN03 — and PLT-2385 on HITT DC10 is the same consequence). We've now approved-or-queued the same manual cleanup four times. Is it worth raising **one backend ticket** for the underlying cause — the dead-link cleanup decides what's dead from `project-element-list.parquet`, which is exactly the artefact that still lists elements the geometry has dropped — and keeping the incidents as per-project cleanups under it? Happy to write it up if you agree; @David Webb would be the owner.

---

## Why this and not the others

- **Not another diagnostic (the PLT-2882 / PLT-2909 action).** Those tickets drafted an evidence step because their mechanism was unconfirmed on the affected project. Here it *is* confirmed on the affected project, by the assignee, with data that reproduces the displayed percentage to two decimal places in five independent rows. Re-running a diagnostic would be forensics on a solved case — and per the playbook's own anti-pattern list, investigating what is already understood is how days get spent. The only unverified quantity is the *package* roll-up, and that is one query, folded into the nudge rather than made the headline.

- **Not (b) Ready For Development.** Tempting because the ticket looks "ready to progress", but it would be **wrong in kind**: there is **no code change to develop**. `context.md` § Mechanism 4 establishes that the per-activity % is a backend parquet value (`dashboard-schedule-service.ts:455-495`) with no frontend arithmetic anywhere on the path — no FE change makes these five activities read 100%. The remedy is a **data operation** plus, separately, a backend pipeline fix that isn't scoped yet. Moving to Ready For Development would put a data-cleanup approval into a dev queue where nobody can action it, and would make the board read "in the pipeline" while it is actually stalled on a PO decision. (The FE robustness item inherited from PLT-2882 — surface "N of M linked elements aren't in the loaded model" — is real, but it explains the shortfall rather than removing it, and it belongs on PLT-2882 where Darminder already owns it.)

- **Not (c) back to the client / With Customer.** We need nothing from Thomas. He gave us five activity IDs, a clear claim ("I claimed them at 100%"), and the claim has been verified as correct. Bouncing to the customer would re-loop a ticket whose next move is entirely internal, and would look like we're questioning a claim we've already confirmed. The client-facing message is worth sending *after* the deletion, not before — and it should come from Yash on Freshdesk #7509, not from this thread.

- **Not (d) Blocked.** Genuinely arguable, and the closest rival. It *is* externally blocked on two named approvers. But `Blocked` is out of this routine's scope per the board README, it removes the ticket from the coordinator's active view, and — decisively — **flipping to Blocked before chasing rewards the silence**. Chase once, visibly, with the reframe and the pre-flight number. If there is still no reply after that, *then* Blocked is honest, and the escalation note below applies.

- **Not "just execute it".** Ilia asked for approval; approval hasn't come. Deleting 193 production link rows on a client project without the sign-off he himself requested would be exactly the playbook's anti-pattern #2 (unannounced prod change during an active incident) — the one that destroyed attribution in the July case. The soft-delete is reversible, which lowers the stakes but does not remove the need for the decision.

---

## Follow-through the human should own (not executed here)

- **Check for an out-of-band approval first.** Before sending anything, confirm Pietro/Mostafa haven't already replied on Slack/Teams/Freshdesk. Nudging a granted approval is the single way this action misfires. (`context.md` § NEEDS HUMAN.)
- **Escalation path if the nudge goes unanswered.** Note the pattern rather than nudging twice: **Mostafa is also the stalled decision-holder on PLT-2858** (9+ days as of the 07-22 board run). Two approvals stalled on the same person is a coordinator problem for Yash, not two independent reminders. If PLT-2931 is silent again after ~2 working days, raise both together.
- **Execution checklist, once approved** (all from PLT-2882's log, verified against code in `context.md`):
  - Derive the 193 `(activityId, modelElementId)` pairs from the CSV; if the CSV holds only summary counts, re-run to produce the pair list **before** touching anything.
  - `POST /projects/{projectId}/elements/activity-links/delete`, ≤500 per batch (`element-api-service.ts:39-41`; batching per `linking-service.ts:59,305-320`). Requires `ElementDelete` (`config/constants.ts:232`).
  - **Announce in-thread at action time**, not afterwards — playbook anti-pattern #2, and the reason PLT-2882's peer pushback was answerable at all.
  - Keep the CSV as the audit record and link it in the closing comment.
- **Verify with a cold cache.** Progress parquets sit in OPFS and only re-download when `artefactHash` changes (`dashboard/data-pipeline.md:26`). Verify after the pipeline refresh with `duckdb-cache` cleared / a hard refresh — otherwise a stale 72.13% will look like a failed fix. PLT-2882's diagnostic already learned this lesson the hard way.
- **Report the package number, not just the activity numbers**, when confirming to Thomas via Yash. "All five activities now 100%" is not the thing he asked for; "Containment reads 100%" is.
- **ELN03 cohort sweep** (playbook #6). The five activities are the ones Thomas noticed. Enumerate every ELN03 activity whose links resolve to absent geometry and remediate in bulk — PLT-2882's log concluded a **BE-side query** beats the console-harvest tooling for this. Do not wait for the next Freshdesk ticket from ELN03.
- **The cross-cutting backend ticket** (`context.md` § "Should these be one cross-cutting backend defect"). If Pietro/Mostafa agree, raise it against BE/data with **David Webb** as owner, link `causes` from PLT-2882 / PLT-2909 / PLT-2931, cross-reference **PLT-2385 / PLT-2650**, and state the defect as: *the dead-link cleanup and the element-metadata artefacts are both blind to geometry-side element removal on model re-upload.* Note PLT-2650 currently scopes **model deletion**, not **re-upload** — it needs widening, not reuse.
- **Pull PLT-2658** (Yash's cited precedent, not in this folder). It may be the family's earliest instance and may already carry a BE answer to the re-upload question — which would change what the backend ticket needs to ask.
- **Watch the attachments (NEEDS HUMAN).** The CSV matters most: it is both the deletion list and the audit record. The two screenshots are corroborative only — the numbers that carry this diagnosis are all in Ilia's comment text.
- **Post-close:** add a `dashboard/pitfalls.md` entry — *"Activity and package progress % come from backend parquets (`activity_progress`, `category_groups`); the denominator counts activity_link rows with no geometry check. Links to elements that survive in metadata but not in geometry cap an activity below 100% permanently, and no FE change can move the number."* This is the third ticket in a month where the FE turned out to be a faithful renderer of a wrong backend number (PLT-2874, PLT-2884, PLT-2917 already form that theme in the board README) — it has earned a named pitfall.
