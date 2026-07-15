# PLT-2649 — recommended action (DRAFT ONLY — execute nothing)

> **Revised 2026-07-15.** The previous draft (route the stalled ownership question to Pietro) is **obsolete** — Pietro replied on 2026-07-13, but pivoted to a product-feature idea and did not answer the re-upload-vs-remap question, and Jason (product design) opened a feature-direction fork. See `context.md` § "State as of 2026-07-15". The action below reflects the three-thread state. The prior draft is retained at the bottom under "Superseded".

## Chosen action: (a) — draft the next reply (internal), doing three things at once

The thread has forked; the reply must **hold the fork apart** rather than follow the interesting feature tangent. One message that:
1. **Answers Pietro's question directly** — no, we do not yet have a list of the affected pins; the query to produce one is already scoped (below) and short, so offer to run it.
2. **Re-asks the one data decision** that actually closes the incident (re-upload vs XYZ remap), now framed as separable from the feature idea.
3. **Splits the feature-direction fork (Jason's auto-detect vs manual-edit) to its own track** with an explicit scoping line, so PA12's existing bad pins are not held hostage to a roadmap decision.

This keeps playbook discipline: close the incident on cause + trigger + cohort; do not let a new feature idea reopen the scope.

## Why this and not the others

- **Not (b) Ready For Development.** There is **no frontend fix to make.** The pin transform is provably correct — Quality pins use the identical `transformPushPinsToViewer` path and render right on the same PA12 model (`context.md` § Mechanism). The symptom reproduces in legacy PowerBI, which shares none of this code. Sending it to Dev implies a code defect that the evidence rules out; it would bounce back. (The one code-adjacent nuance — non-deterministic `FIRST(zMeters)` in `dashboard-360-service.ts:541-543` — is an *amplifier* that only matters if XYZ later chooses to remediate on our side; it is not a fix for the root cause.)
- **Not (c) With Technical Support / client question.** The customer has **already answered** (2026-06-05: "same on the old one… problem with the room data in the Revit models") and effectively handed it back. Going to the client again *before* we have internally decided whether **we** remap the coordinates or **they** re-upload would just re-loop the ticket. A client ask becomes correct only *after* the internal decision below.
- **Not (d) Blocked.** It is stalled, but the blocker is an **internal question that was asked once and never owned** — not an external dependency we are legitimately waiting on. "Blocked" would entrench the stall; a routed, closed question is the move the playbook prescribes for exactly this ("assign the 'what changed / who owns' question an owner; do not let it drop").

## Draft — internal reply (⚠️ DRAFT — do NOT auto-post; a human reviews and posts)

Playbook style: answer the question asked, one closed decision question with one owner, side-fork explicitly scoped out. Kept to three short blocks so each has a clear addressee.

> @Pietro Desiato — on your question: **no, we don't have a list of those pins yet.** Nobody has enumerated them; the "~60/40" figure is an eyeball estimate off the screenshots, not measured. I can produce a real list quickly — it's one query: PA12 `captures_360.zMeters` vs the room/level elevation (`project-levels` / `project-rooms`) per `modelRoomId`, listing every capture whose Z deviates beyond a floor-height threshold. Want me to run it? That gives us exact count + which rooms.
>
> **The one decision that actually closes this ticket** (unchanged from before, still open): for PA12's already-misplaced captures, do we (a) ask the client to **re-upload** them against the current base point, or (b) **remap** them on our side? This is a data-remediation call — it does **not** depend on the editor idea below. Confirmed cause, for reference: capture-coordinate data, not a dashboard bug (same misplacement in PowerBI; Quality pins use the identical transform and are correct on the same model).
>
> @Jason Fingland — on in-editor pin editing: agreed this is worth exploring, but it's a **separate feature decision, not the fix for PA12**, so I'd suggest its own ticket so it doesn't hold up the remediation above. Two notes to ground it when we pick it up: (1) the 360 editor **already has the inline Edit pattern** you mention (the capture-details panel — Edit/Save, editable-field slot, multi-select mode), so surfacing X/Y/Z there is feasible on the FE; (2) but the current update API accepts only name/description, **not coordinates**, so manual X/Y/Z edit needs a backend payload change first. Your auto-detect-mismatch option needs no such change and doesn't risk drifting the model — worth weighing that in.
>
> Scoping: `[NEW DASHBOARD]` in the title is a red herring — the defect is upstream of both dashboards.

**Note on the third block:** if the reply should stay strictly one-owner-per-message per playbook, split the @Jason feature block into a separate comment (or a new ticket description) rather than mixing two owners in one post. The data decision (@Pietro) is the one that closes PLT-2649 and should not wait on the feature discussion either way.

## Prerequisite evidence — now the immediate next step (still unrun as of 2026-07-15)

This query was scoped in the 2026-07-13 draft and **never executed**. It is now doubly-motivated: it produces the exact list Pietro asked for (thread b) *and* moves the split estimate from eyeball to fact + confirms the trigger before the (a)/(b) decision — playbook Phase 6 (cause ✔ / **trigger** / **cohort**). Assign it one owner (Ilia is set up to run it); don't leave it ownerless as the July-case HAR-file ask was.

1. **Cohort:** query `captures_360.zMeters` for PA12 against `project-levels.elevation` / `project-rooms` per `modelRoomId`; list capture/room IDs whose Z deviates beyond a floor-height threshold. Gives the exact count and which rooms.
2. **Trigger:** correlate the bad captures' upload dates (`insertedOn`) against PA12's federated-model version / base-point change history — does "inherited the old pbp" hold, and dated when?

These make the client ask (if we land on option a) specific ("re-upload these N captures") instead of "re-upload everything".

## Follow-through the human should own (not executed here)

- **Do not let the feature idea reopen the incident scope.** Split Jason's editor-editing fork (thread c) to its own product ticket; PLT-2649 closes on the (a)/(b) data decision alone.
- After the (a)/(b) decision, reassign off **Masum Ahmed** (support, off-roster) to the named data owner or to product.
- If option (a): Yash relays a **specific** re-upload request to the client (which captures, why) via Freshdesk #6622 — not before.
- Post-close: add a `dashboard/pitfalls.md` entry (360 pin Z = capture source coordinate; stale-base-point captures mis-place; `FIRST(zMeters)` is non-deterministic per room) and fix the `360-tab.md:47-53` note (pins use the capture's own coords, not a room-elevation lookup).
- If thread (c) is picked up later: the reusable Edit pattern is `editor-capture-360-details-panel.tsx`; the backend gap is `I360CaptureUpdatePayload` (`capture-360-api-service.ts:7-10`) accepting only `xyzDisplayName`/`description` — coordinates need adding there and server-side. See `context.md` § "Ground-truth on Jason's Edit pattern claim".

## STILL A DRAFT — nothing here is posted

No comment above has been or should be auto-posted. A human reviews and posts. No ticket status change, no Jira write, no git commit is performed by this triage run.

---

## Superseded — prior draft (2026-07-13, before Pietro replied)

Retained for provenance. **Obsolete**: it routed the ownership question to Pietro as if unanswered; Pietro has since replied (pivoting to a feature idea). The confirmed-cause reasoning and the (a)-vs-others rationale below remain valid background.

> @Pietro Desiato — reviving PLT-2649 (PA12 360 pins too high). Analysis is settled on cause; we're stalled on one decision.
>
> **Confirmed:** this is a **capture-coordinate data problem, not a dashboard bug.** Same misplacement shows in PowerBI, and Quality pins (identical viewer transform) are correct on the same PA12 model — so no code change fixes it. A subset of captures carry a wrong elevation, consistent with your "old project base point" read.
>
> **One decision to unblock:** for the affected PA12 captures, do we (a) ask the client to **re-upload** them against the current model base point, or (b) **remap** the stale-base-point captures on our side? If (b), who owns that data task and can you point me to them?
>
> Scoping: `[NEW DASHBOARD]` in the title is a red herring — the defect is upstream of both dashboards.
