# PLT-2931 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — draft a follow-up nudge comment to the two approvers, cc coordinator

The root cause is confirmed (8-9/10), the fix is drafted, and the only remaining step is a
yes/no decision from **Pietro Desiato** and **Mostafa Kamel Hussien**, requested on-ticket
4 days ago with zero reply. This is not a new investigation — it's a stalled approval. The
action is a short, closed, addressed nudge, not a re-analysis.

## Why this and not the others

- **Not (b) Ready For Development.** The fix itself (soft-delete 193 dead links via the
  existing `deleteActivityLinks` endpoint) is an **operational data action**, not development
  work — there's no code to write for ELN03 specifically. Moving it to Ready For Development
  would misroute it to a dev queue when what's needed is a one-line approval. (Separately, the
  *systemic* question — why re-uploads leave dead links across three projects now — may
  eventually warrant its own dev ticket, but that's a distinct, not-yet-scoped item; see
  Follow-through.)
- **Not (c) With Technical Support.** Nothing is needed from the client. Thomas's report is
  fully explained and the CSV evidence is already in hand. Bouncing this back to "with
  customer" would be a wrong-direction loop.
- **Not (d) Blocked.** Tempting, because the ticket genuinely can't move without someone else's
  yes/no — but "Blocked" as a status is a passive label with no chaser attached, and the
  playbook's clearest anti-pattern is exactly this: an evidence/decision request posted once
  with no follow-up sits idle all day (or, here, for days). PLT-2882's near-identical approval
  ask has been stuck 13+ days under this same silent-wait pattern. The active version of
  "blocked" is to nudge with a named ask and a deadline-shaped question, which is what (a) does.

## Draft — internal reply (author: Ilia Kuzmin; @ Pietro Desiato, @ Mostafa Kamel Hussien, cc Yash Patel)

Playbook style: reply-quote the open ask, one closed question per addressee, explicit scoping.

> @Pietro Desiato @Mostafa Kamel Hussien — following up on the approval ask from 24 Jul (four
> days ago) on PLT-2931 (ELN03, Containment package under 100%).
>
> Quick recap: 193 dead links (elements no longer in current model geometry) are inflating the
> `Linked` denominator on 5 Containment activities; every element that still has geometry is
> already installed. Same defect family as PLT-2882 (FAR01) and PLT-2909 (ATL08) — this is the
> third confirmed project. Proposed fix: soft-delete the 193 links via the same endpoint/audit
> trail as PLT-2882 (`deleteActivityLinks`, reversible, evidence parquets untouched). After the
> next refresh, Containment reads 100%.
>
> Can I get a yes/no on the soft-delete for ELN03 specifically? If it helps to decide once for
> all three: PLT-2882's identical request has been open since 15 Jul — happy to bring both to a
> quick sync if that's faster than three separate ticket approvals.
>
> @Yash Patel — looping you in for visibility on Freshdesk #7509; no client action needed, this
> is purely waiting on our own approval.

## Follow-through the human should own (not executed here)

- **If approved:** soft-delete the 193 ELN03 links, confirm the next data refresh, close the
  loop with Thomas via Yash.
- **Systemic fix decision (separate from this ticket's approval):** three projects now show
  the identical "re-upload leaves `activity_links`/`client-element-metas` pointing at dead
  generations" defect (FAR01, ATL08, ELN03) with no BE owner or pipeline fix yet assigned. Worth
  raising as its own ticket so it stops recurring per-project — flag to Pietro/Mostafa in the
  same nudge or as a fast follow-up.
- **Cohort sweep:** no one has checked whether projects beyond these three carry the same dead-link
  inflation silently (i.e., without a client noticing/reporting). Worth a proactive query once a
  BE owner is assigned to the systemic fix.
- **Watch PLT-2882's approval outcome** — whatever Pietro/Mostafa decide there (especially given
  the recorded "peer alignment" pushback) will likely set the precedent this ticket follows.
