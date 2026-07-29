# PLT-2884 — Recommended action

> **Re-checked 2026-07-29 — situation unchanged, recommendation ESCALATED.** The
> 07-22 draft below stands on substance but is now understated: the silence has
> gone from 9 days to **16 days** (last substantive comment 07-13) and the ticket
> is **20 days old on Critical**. The status move that was posed as an option
> ("consider With Technical Support") should now be posed as the **default**, and
> there is a concrete check we can run **without** the customer. See
> **§ Escalated action (2026-07-29)** at the end — use that draft, not the 07-22 one.

---

## Chosen: (c-style) Coordinator status-check → Yash, plus a proposed status move

Root cause is **already known and agreed** (bad/incomplete source XER, product-
diagnosed by Mostafa on 07-10, corroborated by the customer's own Power BI
finding). The fix is **customer-side** (re-export a complete XER in P6 and
re-upload). The ticket has sat **9+ days** (since Ilia's 07-13 nudge) in "With
Customer" with **no customer response** — Freshdesk was even flipped Closed →
Waiting-on-customer on 07-20 with no new information. So the one useful move is a
**coordinator nudge to Yash**: has the customer re-uploaded? If not, should this
stop sitting passively in "With Customer" and move to **With Technical Support**
so someone actively chases the client rather than waiting in silence?

**Owner:** **Yash Patel** (assignee / support coordinator; owns the client
channel). One question, routed, answerable with a status.

**Why NOT the other options:**
- **Not Ready-For-Development.** There is **no confirmed FE/pipeline bug**. The
  progress gap is explained by a customer-side incomplete XER plus the documented
  Power-BI-vs-Platform sourcing difference (Old DB retains stale activities from
  prior schedule revisions; New DB honestly reflects the current schedule — see
  `context.md §3`). The only code-side finding (§6, weak "removed activities"
  warning on re-upload) is a **separate, unconfirmed product-hardening candidate**,
  not this ticket's root cause — do not conflate the two.
- **Not Blocked.** We are **not blocked** — nothing on our side is waiting on
  another workstream. We are *quietly waiting on the client*, which is a
  follow-up/chase situation, not an engineering blocker.
- **Not "close as resolved".** Cause + fix are known, but per the playbook an
  incident closes on **confirmation**, not on "we told them what to do." The
  corrected XER has not been re-uploaded/verified. Closing now would be remission,
  not resolution (playbook Phase 6).

---

### Draft status-check comment (for Yash / coordinator to post — do NOT auto-post)

> @Yash — PLT-2884 has been "With Customer" since 10 Jul with the fix already
> identified (incomplete source XER — activities missing from the customer's own
> schedule export; Mostafa diagnosed this and the customer's Power BI check found
> the same). It's now 9+ days with no re-upload and no response.
>
> Two quick things:
> 1. **Has the customer re-exported and re-uploaded a corrected XER yet?** If yes,
>    we can verify the new numbers reconcile and close. If no —
> 2. **Can we move this to With Technical Support and actively chase the client?**
>    It's Critical priority; sitting silently in "With Customer" for 9+ days on a
>    Critical isn't really "parked", it's stalled. A direct follow-up (or a short
>    Loom showing them the P6 re-export step) would unstick it.
>
> For the record — this is expected to be data-side, not a platform bug: the old
> (Power BI) dashboard reads from a pipeline that keeps activities from earlier
> schedule revisions, so it reads *higher* (27.37%); the new (Platform) dashboard
> reflects only the current, incomplete schedule, so it reads *lower* (23.85%).
> A complete XER should bring them back in line.

*(Closed, routed to one owner, answerable with a status. Q1 gets the outstanding
fact; Q2 proposes the status transition with a one-line justification.)*

---

## Notes for the coordinator

- **Verification on re-upload (when it happens):** confirm the corrected XER
  contains **EL1031000 (Install Temp Power)** and the other named activities, then
  re-check New DB Actual moves toward 27.37%. If a complete XER still leaves a gap,
  *then* the residual is a real Platform-vs-Power-BI question (revisit
  `context.md §3` — most likely Old-DB over-count from stale revisions, i.e. the
  New DB was right) and only then consider dev involvement.
- **Separate product-hardening candidate (log, don't attach here):** the weak
  "removed activities" warning on schedule re-upload (`context.md §6`) — a
  completeness/loss warning when removed activities carry links or progress. Same
  family as PLT-2882. Worth a standalone ticket to Mostafa/product; **not** part of
  PLT-2884's resolution.
- **Attachments remain NEEDS HUMAN** (screenshots, .xlsx, .xer) — see
  `context.md §8`.

**Confidence in diagnosis: 8/10.** **Confidence in this being the right next step:
9/10** — cause is settled; the only lever left is chasing the customer, and the
status question (With Customer vs With Technical Support) is the concrete decision
to force.

---
---

# Escalated action (2026-07-29) — use this draft

## What changed since 07-22: nothing on the ticket, everything about the wait

Verified via `getJiraIssue`: status still **With Customer**, priority still
**Critical**, `updated` still **2026-07-20 09:35**, **10 comments (none new)**,
**5 attachments (none new)**, no resolution, no remote links. No sibling ticket
picked the issue up (`context.md §9`). **The customer has not re-uploaded.**

Silence clocks to 2026-07-29 (`context.md §9`):

- **20 days** since the incident was raised (Critical).
- **19 days** since we told the customer what to fix.
- **16 days** since the last substantive comment (Yash, 07-13 — "still waiting").
- **9 days** since the last activity of any kind, and that was an **automated
  Freshdesk status echo**, not information.

Per the playbook, a Critical live incident that has produced **no new information
in 16 days** is not "parked with the customer" — it is **stalled with nobody
driving it**. That is the finding, and it is now the entire ticket.

## Two changes to the 07-22 recommendation

**1. The status move is no longer an option to consider — it is the recommendation.**
Move **With Customer → With Technical Support** and give the chase an owner. "With
Customer" is an accurate description of who owes the artifact, but it is a
misleading description of who owes the *action*: for 16 days nobody on our side has
been accountable for getting it. (Same failure mode the playbook logs as *"evidence
requests without owners"* — the HAR ask that "sat idle all day", and *"the trigger
question left unanswered"* — asked once, never owned.)

**2. There is now a check we can run WITHOUT the customer.** The XER attachment is
named `EQIX_AT10x-A11x_Rev_02_updated20260427.xer` — i.e. the schedule we were given
is labelled **Rev 02, data-dated 27 April 2026** (`context.md §9`; inference from the
filename, content still unreadable here). If Rev 02 is still what AT10x holds, then
a ~2.4-month-stale revision *by itself* explains missing May–June activities, and the
New DB is arguably reporting correctly. Also note it is a **combined AT10x-A11x
multi-project export** — a classic partial-export shape.

So the sharp question stops being "has the customer re-uploaded?" (which we have
asked twice and got silence) and becomes **"what revision is AT10x actually on, and
is there a newer one in P6?"** — answerable internally, in minutes, by a human with
file or DB access. This unsticks us from waiting on a non-responsive client, which
is the playbook's core move: *get the observation into our own hands*
(Phase 4 / "find an internal repro" — here, read our own stored revision).

---

### Draft escalation comment (for a human to post — do NOT auto-post)

> @Yash — PLT-2884 re-check. This is a **Critical** live incident that is **20 days
> old** and has had **no new information for 16 days** (your 13 Jul "still waiting
> for them to get back" is the last real update; the only thing since is the
> Freshdesk status bounce on 20 Jul). The customer has not re-uploaded — no new
> attachment, no comment.
>
> Proposing two things:
>
> 1. **Move it to With Technical Support and give the chase an owner.** The fix is
>    the customer's, but the *follow-up* is ours and for 16 days it hasn't been
>    anyone's. On a Critical, silence isn't "parked".
> 2. **One check we can do without them.** The XER we hold is
>    `EQIX_AT10x-A11x_Rev_02_updated20260427.xer` — **Rev 02, data-dated 27 Apr
>    2026**. Can someone confirm *which revision AT10x is currently running on*, and
>    whether the customer has issued a **Rev 03** in P6 since April? If AT10x is
>    still on an April Rev 02, that alone explains the missing activities (anything
>    progressed in May–June wouldn't be in it) — and it means the new dashboard is
>    reporting the current schedule *correctly*, which is a much better answer to
>    give the client than "please re-upload".
>
> Also worth noting it's a **combined AT10x-A11x** export — if the P6 export had only
> part of the project selected, that would produce exactly the gap Hussein saw in
> Power BI.
>
> Recap for anyone new: old dashboard (Power BI) reads from a pipeline that keeps
> activities from earlier schedule revisions, so it reads **higher** (27.37%); new
> dashboard (Platform) reflects only the current revision, so it reads **lower**
> (23.85%). Expected to be data-side, not a platform bug.

*(One owner, one status decision, one internally-answerable question — each with a
one-line justification. Nothing asserted beyond the evidence: the revision claim is
explicitly framed as read off the filename and put as a question.)*

---

### If the answer to the revision question is "AT10x is on Rev 02 / no Rev 03 exists"

Then this ticket can be **closed properly rather than chased indefinitely** — but
close it on the *cause*, not on the silence:

- State the root cause: current schedule revision is Rev 02 (27 Apr), incomplete
  relative to actual progress; Platform reports it faithfully.
- State the trigger: the Power BI → Platform migration exposed a pre-existing
  divergence (Power BI retained stale-revision activities and masked it).
- State the cohort — **this is the open item nobody has swept**: *any other project
  whose current schedule revision is materially older than its recorded progress*
  will show the same Old-vs-New gap. Worth one query before closing (playbook
  Phase 6: close on cause + trigger + cohort, never on "looks fine now").

### Escalate further if unanswered

If there is still no response by **~2026-08-01** (i.e. ~3 more days, ~19 days of
silence), loop in **Mostafa** (who made the original diagnosis) or **Pietro** —
they own the product-side call on whether a stale-revision project should be told
"working as intended" and closed, versus kept open awaiting a client re-upload that
may never come. That is a product decision, not a support-chase decision, and
16 days of silence is evidence it needs making.

---

## Confidence (2026-07-29)

- **Diagnosis: 8/10** — unchanged. The Rev-02/April date-stamp reinforces the
  existing hypothesis but is filename-level inference, so it does not raise the
  score; the two residual unknowns from `context.md §8` are untouched.
- **This being the right next step: 9/10** — the ticket state is verified
  unambiguously (no new comments/attachments), and the recommendation now includes a
  check that does not depend on the non-responsive customer, which strictly dominates
  the 07-22 "nudge and wait" version.
- **Attachments still NEEDS HUMAN** — 3 screenshots, the `.xlsx` activity-level diff,
  and the 4.35 MB `.xer` (`context.md §8`). The `.xer` is the single most decisive
  unread artifact: parsing it against the prior revision would confirm the missing
  activities directly. Filename metadata was readable; **contents were not, and were
  not guessed at.**
