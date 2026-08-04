# PLT-2619 — recommended action (DRAFT ONLY — execute nothing)

> ## Revised 2026-08-04 — read this before using the 07-30 draft below
>
> **These are DRAFTS for human review. Nothing here has been sent, posted or executed, and no write
> action was taken against Jira.**
>
> The 07-30 draft is **partly superseded**, for two reasons found this run:
>
> 1. **Do NOT close Freshdesk #6492.** On 08-03 at 15:13 Yash moved it to **"Waiting on customer"** —
>    he has a live question out to the client. The 07-30 draft told us to close it. Closing it now
>    would cut off a client thread mid-conversation.
> 2. **Do NOT send the 07-30 message to Yash.** It asked him the project-identity question. He is
>    already mid-thread with the client on exactly this, and we cannot see what he asked. Asking him
>    now crosses his own conversation and risks him relaying our guess to the customer as fact.
>
> Also already done, by someone else: the 07-30 follow-through item *"reassign off Masum Ahmed"* —
> **Pietro did it on 08-03 at 14:55** (Masum → Yash). Don't re-raise it.
>
> ### Chosen action for 2026-08-04: ask Mostafa for the project name. One message, one question.
>
> **Owner: Ilia Kuzmin. Addressee: Mostafa. Post on PLT-2935, not on PLT-2619.**
>
> Mostafa is newly identified this run as the person who originally asked for the freeze — the first
> named person we know was looking at project `69e232b2c222e55fa039eab2` on screen. The question is
> answerable with a single value, it does not touch Yash's client thread, and it fills a gap
> PLT-2935's own description admits (*"project name is not known yet"*).
>
> > Mostafa — the planned-% freeze you asked for is on project `69e232b2c222e55fa039eab2`, which is
> > the id from the URL rather than a name. What is that project actually called? I need the name to
> > check whether it's the same dashboard as a separate client request we have open (PLT-2619,
> > "Mission Critical Dashboard"), so we don't end up doing the same demo twice.
>
> **Why this and not the alternatives:**
> - **Not asking Yash** — see (2) above. He needs nothing from us; he's waiting on the customer.
> - **Not messaging the client** — we would be a third party arriving in a thread Yash already owns.
> - **Not closing PLT-2619 yet** — it hangs on the identity question, still unproven (7/10, and
>   deliberately *lowered* from 07-30, see `context.md` § Confidence).
> - **Not off-boarding it this week** — the classification call is unchanged and correct (this is not
>   a live incident), but the bookkeeping should wait until the client replies on #6492. Reclassifying
>   a ticket that is genuinely mid-client-question is how threads get dropped.
>
> ### Second, separate message — different question, different owner, so not blended in
>
> **Owner: Ilia Kuzmin. Addressee: the four requested reviewers on PR #2080.**
>
> This is now the family's only real blocker: PR #2080 is **green on all checks** since 08-03 17:32
> (the repo-wide Trivy failure cleared when #2072 landed), `mergeable_state: blocked` on **missing
> human approval alone**, and after 5 days it has reviews from a bot and from its own author only.
>
> > PR #2080 (PLT-2935 planned-% freeze) has been green since Monday evening — the red Trivy build was
> > the repo-wide `brace-expansion` issue and #2072 cleared it. It's blocked only on an approval. Can
> > one of you take it? It's +306/−4 across 4 files, and the logic worth a second pair of eyes is the
> > date cap being `MIN(frozenDate, endDate)` rather than a replacement.
>
> ### What NOT to do this week
>
> - Do not close or reclassify Freshdesk #6492.
> - Do not close PLT-2619 until the project name is confirmed.
> - Do not take PLT-2619 off the incident board until the client replies — then do it.
>
> ### Cheap fixes nobody has done (safe to do at any point)
>
> - **Link PLT-2619 ↔ PLT-2935 in Jira.** They have been worked in tandem for 8 days and neither
>   shows the other (`issuelinks: []` on both). Every future sweep re-derives this by hand.
> - **Transition PLT-2619 out of, and deliberately back into, its real status.** It has never been
>   transitioned since 29 Apr (97 days). It is *accidentally* accurate right now, which makes it less
>   likely anyone notices it was never actually set.
> - **Rename this folder** `…-groupA-other` → `…-groupA-dashboard-migration` (or archive it, if the
>   ticket closes into PLT-2935). `other` is a placeholder and is now demonstrably wrong.
>
> ---
>
> The 07-30 draft is retained below for history. **Its message text is superseded; its "why not the
> others" reasoning still holds.**

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
