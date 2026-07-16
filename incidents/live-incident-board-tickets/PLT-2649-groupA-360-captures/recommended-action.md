# PLT-2649 — recommended action (DRAFT ONLY — execute nothing)

## 2026-07-16 refresh — the routed question got answered; two deliverables now owed

The 06-30 "who can help" question this file recommended got a reply on 07-13:
**Pietro** engaged and **Jason Fingland** (product design) gave a substantive
response (`context.md` § "2026-07-16 update"). The ticket is no longer stalled on
ownership — it's now stalled on **producing the pin list Pietro asked for** (which
this file already scoped below, in "Prerequisite evidence to attach" — that
section is now the literal answer to his question, just needs running) and
**deciding between Jason's two proposed approaches**:
- **(i) detect-and-flag** — compare a capture's recorded floorplan/level against
  its apparent position, surface a mismatch warning (Jason's preference; avoids
  letting users move things and "mess with reality on site").
- **(ii) allow editing** — expose X/Y/Z in the details panel via the existing
  Editor edit-pattern, with multi-select (Jason's fallback if editing is wanted
  at all).

**Updated draft reply (owner: Ilia; @Pietro, @Jason, cc Mostafa):**

> @Pietro @Jason — following up: the pin list is the same data step this ticket
> already needed to confirm cohort/trigger (playbook). I'll run
> `captures_360.zMeters` vs `project-levels`/room elevation for PA12 and post the
> exact list of affected capture/room IDs + deviation.
>
> On the editing-vs-detect question — Jason's detect-and-flag ("captures taken on
> Level 3 now appear above Level 4") sounds like the safer default given the
> site-integrity concern. Do we want to greenlight that as the direction, or is
> editing (via the existing Editor X/Y/Z pattern) still on the table for this
> specific cohort? Happy to scope either once the list exists.

This **supersedes only the "who" framing** of the original draft below; the
"(a) re-upload vs (b) remap" decision and the evidence-gathering plan are still
exactly what's needed — Pietro and Jason's exchange has simply made producing the
list the concrete, immediate next action rather than a hypothetical.

---

## Chosen action: (a) — draft the next reply (internal, one owner)

Re-route the stalled ownership question to **Pietro Desiato** (product owner) with a crisp restatement of the confirmed root cause plus **one** closed, answerable decision question. This is the smallest move that unblocks a ticket that has sat unanswered since 2026-06-30.

## Why this and not the others

- **Not (b) Ready For Development.** There is **no frontend fix to make.** The pin transform is provably correct — Quality pins use the identical `transformPushPinsToViewer` path and render right on the same PA12 model (`context.md` § Mechanism). The symptom reproduces in legacy PowerBI, which shares none of this code. Sending it to Dev implies a code defect that the evidence rules out; it would bounce back. (The one code-adjacent nuance — non-deterministic `FIRST(zMeters)` in `dashboard-360-service.ts:541-543` — is an *amplifier* that only matters if XYZ later chooses to remediate on our side; it is not a fix for the root cause.)
- **Not (c) With Technical Support / client question.** The customer has **already answered** (2026-06-05: "same on the old one… problem with the room data in the Revit models") and effectively handed it back. Going to the client again *before* we have internally decided whether **we** remap the coordinates or **they** re-upload would just re-loop the ticket. A client ask becomes correct only *after* the internal decision below.
- **Not (d) Blocked.** It is stalled, but the blocker is an **internal question that was asked once and never owned** — not an external dependency we are legitimately waiting on. "Blocked" would entrench the stall; a routed, closed question is the move the playbook prescribes for exactly this ("assign the 'what changed / who owns' question an owner; do not let it drop").

## Draft — internal reply (owner: Pietro Desiato, product; cc Ilia Kuzmin)

Playbook style: root cause stated once, one owner, one closed decision question, explicit scoping.

> @Pietro Desiato — reviving PLT-2649 (PA12 360 pins too high). Analysis is settled on cause; we're stalled on one decision.
>
> **Confirmed:** this is a **capture-coordinate data problem, not a dashboard bug.** Same misplacement shows in PowerBI, and Quality pins (identical viewer transform) are correct on the same PA12 model — so no code change fixes it. A subset of captures carry a wrong elevation, consistent with your "old project base point" read.
>
> **One decision to unblock:** for the affected PA12 captures, do we (a) ask the client to **re-upload** them against the current model base point, or (b) **remap** the stale-base-point captures on our side? If (b), who owns that data task and can you point me to them?
>
> Scoping: `[NEW DASHBOARD]` in the title is a red herring — the defect is upstream of both dashboards.

## Prerequisite evidence to attach (whoever picks it up — small, do first)

To move the split estimate ("~60/40") from eyeball to fact and to confirm the trigger before choosing (a) vs (b) — playbook Phase 6 (cause ✔ / **trigger** / **cohort**):

1. **Cohort:** query `captures_360.zMeters` for PA12 against `project-levels.elevation` / `project-rooms` per `modelRoomId`; list capture/room IDs whose Z deviates beyond a floor-height threshold. Gives the exact count and which rooms.
2. **Trigger:** correlate the bad captures' upload dates (`insertedOn`) against PA12's federated-model version / base-point change history — does "inherited the old pbp" hold, and dated when?

These make the client ask (if we land on option a) specific ("re-upload these N captures") instead of "re-upload everything".

## Follow-through the human should own (not executed here)

- After the (a)/(b) decision, reassign off **Masum Ahmed** (support, off-roster) to the named data owner or to product.
- If option (a): Yash relays a **specific** re-upload request to the client (which captures, why) via Freshdesk #6622 — not before.
- Post-close: add a `dashboard/pitfalls.md` entry (360 pin Z = capture source coordinate; stale-base-point captures mis-place; `FIRST(zMeters)` is non-deterministic per room) and fix the `360-tab.md:47-53` note (pins use the capture's own coords, not a room-elevation lookup).
