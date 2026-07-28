# PLT-2619 — recommended action (DRAFT ONLY — execute nothing)

## RE-CHECK #3 (2026-07-28) — escalated from "hand off" to a decisive reclassify-or-close call

This is the **third** consecutive re-check (07-13 → 07-22 → 07-28) to find the same underlying
blockers unresolved (~90 days). One new comment landed on 07-27 (Yash Patel, "@Ilia Kuzmin can we
update this to new dashboard if not done already?") but it does not answer either open question —
it's a repeat nudge, not new information. Per the task brief: a ticket that's still mis-filed and
still stalled on its third check should not be re-confirmed a fourth time — it should be force-moved
now. Two concrete options below; either is acceptable, but **do one of them this cycle**, do not
draft another "let's ask Pietro" holding comment.

## Chosen action: force reclassify off the live-incident board — with a fallback to close if no answer within a short window

### Option 1 (preferred) — reclassify now, don't wait for Pietro to reply in-thread

- **Change issue type**: Live Incident → Task/Story (whatever the PLT project uses for
  product/config requests). This is an edit, not a workflow transition — a human with edit rights
  does it directly on the issue.
- **Reassign**: Masum Ahmed (support/Freshdesk agent, off-roster) → Pietro Desiato or Mostafa Kamel
  Hussien (product owners, on roster).
- **Transition status**: available transitions include `In Analysis` (id 321) — the closest fit for
  "reclassified, pending a product decision, not an incident." Do NOT leave it on `With Customer`;
  it is not customer-blocked (see 07-13 finding, reconfirmed twice since).
- Post one comment (see draft below) that states the reassignment plainly, rather than asking an
  open question that a third person can again fail to answer.

### Option 2 (fallback, time-boxed) — Won't Do / archive if Option 1 stalls too

If product ownership can't be established within, say, 5 business days of this recheck, the
transition **`Won't Do`** (id 251, → status `ARCHIVED (NOT RELEASED)`) is available directly from
`With Customer` today. A 90-day-stale, twice-reconfirmed, never-actioned demo-relink request that
nobody with authority has picked up is a legitimate candidate for archiving rather than a fourth
"still waiting" cycle. This is explicitly on the table now, not deferred again.

## Why this and not a repeat of the 07-13/07-22 "hand off" framing

- **Not another open question to Pietro.** That exact question was asked on 04-27 and went
  unanswered for 3 months across two people (Ilia → Pietro, then Yash → Ilia). A third restatement
  has a demonstrated ~0% hit rate. Force the reassignment instead of asking again.
- **Not (b) Ready For Development** — still no dev-actionable spec (which dashboard, which project).
  Sending to Dev would stall exactly as it has on the incident board.
- **Not (a) client reply** — confirmed twice now: this was never customer-blocked. The customer was
  told "awaiting release" on 04-29 and nothing since has required their input.
- **Not another indefinite (d) Blocked** — Blocked has effectively been the de facto state for 90
  days with no expiry. Replacing it with a genuine transition (`In Analysis` under new ownership, or
  `Won't Do` if ownership doesn't materialize) puts an actual decision point on the calendar instead
  of extending the parking.

## Draft — reassignment + scope comment (owner: whoever has edit rights; addressed to Pietro/Mostafa)

Playbook style: one owner, closed answerable questions, explicit scoping, states the action taken
rather than asking permission for it.

> @Pietro Desiato / @Mostafa Kamel Hussien — PLT-2619 ("Mission Critical Dashboard" demo relink) has
> been open ~90 days with the same two questions unanswered since 27 Apr (which dashboard to relink
> to; whether the non-PowerBI release is ready). Reassigning this to product and moving it to
> In Analysis — it's a demo-config request, not a live incident, and isn't customer-blocked (client
> was already told "awaiting release"). If we don't have an owner/answer within 5 business days,
> recommend archiving (Won't Do) rather than leaving it open indefinitely.

## Draft — client-facing holding line (optional, owner: Masum Ahmed via Freshdesk #6492)

Only if product confirms it's still awaiting release and wants the client kept warm:

> Thanks for your patience. The updated "Mission Critical Dashboard" is being moved onto our new,
> faster native dashboard (replacing the current PowerBI version). We'll confirm a date once the
> target dashboard is finalised on our side; no action needed from you in the meantime.

## Follow-through the human should own (not executed here)

- Reassign from Masum Ahmed (support/off-roster) to Pietro or Mostafa (product) — do this now,
  don't wait for an in-thread reply.
- Change issue type Live Incident → Task/Story; transition off `With Customer` to `In Analysis`.
- Set an explicit internal deadline (proposed: 5 business days from 2026-07-28); if unmet, transition
  to `Won't Do` (id 251) rather than let this reach a fourth recheck cycle.
- Confirm the native dashboard release status (KB says Dashboard Page is Live — the "awaiting
  release" blocker may already be moot).
