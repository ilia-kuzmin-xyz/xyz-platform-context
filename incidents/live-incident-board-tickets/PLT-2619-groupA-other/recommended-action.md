# PLT-2619 — recommended action (DRAFT ONLY — execute nothing)

**Revised 2026-07-30.** Supersedes the 07-13 draft ("nudge Pietro"). Pietro is no longer the right
hop: Yash's 27 Jul comment named **Ilia** as the actionee, and PLT-2935 suggests the work is already
done elsewhere.

## Chosen action: (a) one reply in-thread to Yash — one closed question + a proposed close-out

**Owner: Ilia Kuzmin. Addressee: Yash Patel. One message.**

> @Yash Patel — the non-PowerBI dashboard we were parked on in April is live, so that blocker's gone.
> One thing before I close this: on 27 Jul I picked up PLT-2935 to tweak the sales/demo project
> `69e232b2c222e55fa039eab2`, which is **already** running on the new dashboard. Is that the same
> "Mission Critical Dashboard" this ticket is about, or is there a separate demo still on PowerBI?
>
> - Same one → I'll close PLT-2619 and we track the remaining demo work on PLT-2935 (it needs an
>   answer to my 28 Jul questions there — what value to freeze planned % at).
> - Different one → give me the project name or id and I'll check whether it has progress data in the
>   new pipeline. Worth flagging: this isn't a link swap — the new dashboard reads its own parquet
>   data, so a demo project has to be set up on it, there's no PowerBI report id to repoint.
>
> Either way this isn't a live incident (no defect, no repro) — it's a demo/config request. Proposing
> we take it off the incident board and, if it's the same project, close Freshdesk #6492 too (still
> reads "Awaiting release" from 29 Apr).

## Why this and not the others

- **Not (c) hand-off to product / Pietro (the 07-13 draft)** — overtaken by events. Pietro's 27 Apr
  question is moot if PLT-2935 is the same asset; re-asking it burns another cycle and Yash, who just
  asked, gets no answer. Route to the person who spoke last.
- **Not (b) Ready For Development** — there is no dev work *on this ticket*. The only concrete FE work
  in this family (the planned-% freeze) already has its own properly-typed ticket, PLT-2935, sitting
  in Analysis In Progress. Sending PLT-2619 to Dev would duplicate it.
- **Not (d) Blocked** — nothing external blocks it. It is blocked on one fact only we can look up.
  Marking Blocked would entrench an 89-day-stale zombie.
- **Not a client-facing message** — the ticket says "With Customer" but has not been customer-blocked
  since 29 Apr. Pinging the client asks the wrong party. Client comms only after Yash confirms
  (see below).
- **(a) fits:** one closed, answerable question to one named owner, with both branches pre-decided so
  the reply immediately produces a transition. Playbook §"Questions — closed, answerable, routed".

## Expected outcome → target state

- **Same project (likely, ~75-80%)** → PLT-2619 **Done/Closed** as superseded; link to PLT-2935;
  Freshdesk #6492 closed by Yash. Group A goal met via clarification.
- **Different project** → reclassify off the live-incident board (Task, PLT or PBD per the
  PLT-2891→PBD-2111 precedent), reassign off Masum, then **Ready For Development** only once the
  target project is named and confirmed to have new-pipeline data.

## Follow-through the human should own (not executed here)

- Confirm what project `69e232b2c222e55fa039eab2` actually is — open it on the platform. This is the
  single fact the whole recommendation turns on.
- Transition PLT-2619 off `With Customer` regardless of branch — it has been factually wrong for
  3 months and hides the fact that the open action is on us.
- Reassign off **Masum Ahmed** (off-roster support agent) whichever way it goes.
- Chase the answer on **PLT-2935**'s three open questions (28 Jul) — that becomes the live blocker
  the moment this ticket closes into it. Owner: whoever requested the freeze, via Yash.
- Close **Freshdesk #6492** (last client-visible status: "Awaiting release", 29 Apr).
