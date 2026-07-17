# PLT-2619 — recommended action (DRAFT ONLY — execute nothing)

> **2026-07-17 update — recommendation UNCHANGED, but now overdue.** This same
> action was drafted on 2026-07-13 and has **not been executed**: on re-pull the
> ticket is untouched (still `With Customer`, still `Live Incident`, same 4
> comments, still assigned to support). It is now **~79 days stale**. The action
> below still stands; what has changed is that "reclassify + hand off" has now
> gone a full triage cycle with no action, which makes this a **process flag for
> the human**, not just a ticket nudge — see the escalation note at the bottom.

## Chosen action: (c) — hand off to product + reclassify off the live-incident board

Within option (c), the selected branch is **"recommend hand-off to product / not-an-incident (mis-filed)"**, accompanied by the exact internal nudge to unblock. This is a single action: move ownership to product and get the two open internal questions answered; it does **not** stay a live incident.

## Why this and not the others

- **Not (b) Ready For Development** — there is no specified dev work. The ask is a config/relink of a demo asset plus a product decision (which dashboard); no acceptance criteria, no code defect. Sending it to Dev would stall.
- **Not (d) Blocked** — the nominal blocker ("awaiting release") may already be resolved (native Dashboard Page is documented Live). Marking Blocked would entrench a 75-day-stale ticket rather than test whether it can now proceed.
- **Not (a) client reply** — the ticket is labelled "With Customer" but is **not actually waiting on the customer**; the customer was already told "awaiting release" (29 Apr). The real blockers are internal (product decision + release confirmation). Pinging the client asks the wrong party.
- **(c) hand-off/reclassify fits:** it is a product-owned demo modernization mis-filed as a Live Incident, stale ~75 days, owned by a support agent (Masum, off-roster). Correct move: reassign to product (Pietro/Mostafa), drop it off the incident board, and resolve the two internal unknowns.

## Draft — internal nudge (owner: Pietro Desiato, product; cc Mostafa)

Playbook style: one owner, closed answerable questions, explicit scoping.

> @Pietro Desiato — reviving PLT-2619 ("Mission Critical Dashboard" demo relink), parked since 29 Apr. Two questions to unblock:
> 1. Which dashboard / target project should "Mission Critical Dashboard" be relinked to? (your 27 Apr question was never answered — do you have the project or dashboard id?)
> 2. The non-PowerBI dashboard we were "awaiting release" on now shows as Live — is it ready to host this demo, or is there still a blocker?
>
> Scoping note: this is a demo-dashboard relink request, not a live incident (no defect/repro). Proposing we move it off the live-incident board to a product/support task and reassign it to you. OK to reassign?

## Draft — client-facing holding line (optional, owner: Masum Ahmed via Freshdesk #6492)

Only if product confirms it is still awaiting release. Keeps the customer accurately informed without over-promising:

> Thanks for your patience. The updated "Mission Critical Dashboard" is being moved onto our new, faster native dashboard (replacing the current PowerBI version). We'll confirm a date once the target dashboard is finalised on our side; no action needed from you in the meantime.

## Follow-through the human should own (not executed here)

- Reassign from Masum Ahmed (support/off-roster) to Pietro or Mostafa (product).
- Reclassify from Live Incident → product/support task; move status off "With Customer" (it is internally parked, not customer-blocked).
- Confirm the native dashboard release status (KB says Dashboard Page is Live — the "awaiting release" blocker may be stale).

## ⚠️ Escalation to the human — this is now a process problem, not just a stale ticket

State it plainly: **the board is carrying a mis-filed item that nobody is working.** Concretely:
- PLT-2619 was assessed as **not a live incident** on 2026-07-13 and the recommendation was to reclassify + hand to product. That recommendation was **not acted on**.
- On 2026-07-17 the ticket is byte-for-byte the same: no new comments, no status change, no reassignment, still typed `Live Incident`. **~79 days untouched / ~85 days since report.**
- The cost of leaving it: (1) it **inflates the live-incident board** with a non-incident, diluting the signal the board exists to give; (2) it **buries a legitimate product task** (a demo relink Pietro can likely close in one decision) in a queue product doesn't own; (3) the client on Freshdesk #6492 has had no substantive update since 29 Apr.
- **Ask of the human:** pick one and do it, don't re-park — either (a) execute the hand-off/reclassify (the drafts above are ready to paste), or (b) if there is a reason it must stay an incident, record that reason on the ticket. A third silent triage cycle is the failure mode to avoid.
