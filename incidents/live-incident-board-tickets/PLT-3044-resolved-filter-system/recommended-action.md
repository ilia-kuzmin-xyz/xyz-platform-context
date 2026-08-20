# PLT-3044 — recommended action (DRAFT ONLY — execute nothing)

**Nothing here has been sent, posted or executed. No Jira write action was taken.**

## 2026-08-14 — Recommended action: **move to Done. No further action.**

Not one of the usual four (resolved via communication / Ready for Dev / With Technical Support /
Blocked) — this one is already resolved. Product has given both the cause and the disposition, on the
ticket, the day it was raised:

> Mostafa Kamel Hussien, 2026-08-13: *"@Pietro already raised it with Hussein. Its about how they map
> the schedule. nothing from our side. I think we can close the ticket."*

Nobody has contradicted it, no code change is implied, and the remedial work sits with the client's
own schedule team. The only reason the ticket is still open is that nobody pressed the button.

**Owner of the transition: Yash** (he raised it and owns the client channel), or Pietro, who already
moved it across boards.

**Also worth doing at the same time:** it is currently **assigned to Darminder** and **Open**, which
reads as unstarted developer work. Unassign or reassign as part of closing it, so it does not show up
on a dev's queue for a thing that has no dev work in it.

## Draft closing comment — one line, for whoever executes it

> Closing this one — it's coming from how the schedule is mapped on the client's side rather than
> anything in the dashboard, and Mostafa has already raised it with Hussein's team. Nothing for us to
> change here, so shout if it comes back.

Plain, short, no jargon, and it leaves the door open without inviting a reply. Do **not** send
anything client-facing from our side — Mostafa's route through Hussein is already the live thread and
a second voice arriving in it is the thing the playbook warns about.

## Why not the alternatives

- **Not Ready for Dev.** There is nothing to build. The filter panel offers whatever distinct values
  the client's schedule mapping contains — there is no allow-list in that path
  (`dashboard-filter-utils.ts:238-306`, see `context.md`) — so "remove Procurement/Design/Milestone"
  is a change to their schedule data, not to our code. Sending it to dev would burn a sprint slot
  re-discovering what Mostafa already said.
- **Not With Technical Support.** We need nothing from the customer. The question has already been put
  to them by product, through the right person.
- **Not Blocked.** Nothing external blocks *us*; we have no action at all. Marking it Blocked would
  leave it sitting on the board indefinitely, which is how the PLT-2619 zombie happened.
- **Not "resolved via communication" either**, strictly — that framing implies we still owe a message
  that resolves it. We do not. The resolving message was already written by Mostafa. All that is left
  is the transition.

## If it comes back

The one thing to pin down first, which nobody has: whether these values sit under a **dynamic
category column** (Project Area) or under **Discipline** proper. The reporter's wording names both,
there is no screenshot on the ticket, and the two are different sections of the panel. Ask for a
screenshot of the open filter panel before anything else. Mechanism notes are in `context.md`.

Keep it separate from **PLT-3040** (same client, same screen, genuinely different mechanism — an
id→name join fallback, already fixed in `b700eb3`). Merging them would confuse a real defect with a
data-mapping question.
