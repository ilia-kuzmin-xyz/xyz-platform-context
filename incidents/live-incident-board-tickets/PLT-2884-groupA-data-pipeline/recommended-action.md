# PLT-2884 — Recommended action

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
