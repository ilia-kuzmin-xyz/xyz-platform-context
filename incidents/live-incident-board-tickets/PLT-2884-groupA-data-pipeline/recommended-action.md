# PLT-2884 — Recommended action

## RE-CHECK 07-28: escalation is now due, not optional

**Re-verified via Jira on 07-28 — nothing has changed since the 07-22 triage.**
Same 10 comments, same "With Customer" status, last activity of any kind was
07-20 (a content-free Freshdesk flip). No re-upload, no reply, no visible
follow-up on the 07-22-drafted nudge below. **This is now 15 days since the
customer was asked to re-upload, 18 days since root cause was diagnosed, and 8
days since the ticket had any activity at all — on a Critical-priority live
incident.**

**Revised recommendation: move status to (c) With Technical Support now.** The
07-22 draft posed this as a question ("should we move it?"); a second
consecutive silent check confirms the answer is yes. Waiting for a third check
before acting would mean ~3 weeks of a Critical ticket sitting with no owner
actively chasing it. Post the nudge comment below **and** perform the status
transition (`With Customer` → `With Technical Support`, Jira transition id
`16`, confirmed available/unconditional) rather than just asking about it.

---

## Chosen: (c) With Technical Support — status move + explanatory comment

Root cause is **already known and agreed** (bad/incomplete source XER, product-
diagnosed by Mostafa on 07-10, corroborated by the customer's own Power BI
finding). The fix is **customer-side** (re-export a complete XER in P6 and
re-upload). The ticket has sat **15 days** (since Ilia's 07-13 nudge) in "With
Customer" with **no customer response** — Freshdesk was even flipped Closed →
Waiting-on-customer on 07-20 with no new information, and **nothing at all has
happened in the 8 days since**. Passively waiting in "With Customer" has now
been tried across two triage cycles and produced nothing; the concrete move is
to transition to **With Technical Support** so someone actively chases the
client rather than the ticket waiting in silence.

**Owner:** **Yash Patel** (assignee / support coordinator; owns the client
channel). One question, routed, answerable with a status — plus the status
transition itself.

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
- **Not staying in "With Customer" for a third check.** This was a live option on
  07-22 ("consider" moving); after a second consecutive re-check (07-28) shows
  zero movement, staying put is no longer a neutral choice — it's letting a
  Critical ticket coast on inertia. Escalating now is the change from last time.

---

### Draft status-check comment (for Yash / coordinator to post — do NOT auto-post)

> @Yash — PLT-2884 has been "With Customer" since 10 Jul with the fix already
> identified (incomplete source XER — activities missing from the customer's own
> schedule export; Mostafa diagnosed this and the customer's Power BI check found
> the same). It's now **15 days** with no re-upload and no response, and the
> ticket has had **zero activity of any kind for 8 days**. This is Critical
> priority — I'm moving it to **With Technical Support** now rather than
> checking in again in another week.
>
> One quick thing so we can close this out fast once it moves:
> 1. **Has the customer re-exported and re-uploaded a corrected XER yet?** If
>    yes, let's verify the new numbers reconcile and close. If no, can you
>    actively chase (call/Loom showing the P6 re-export step) rather than
>    waiting for them to come back on their own — two asks over 15 days
>    haven't produced a response.
>
> For the record — this is expected to be data-side, not a platform bug: the old
> (Power BI) dashboard reads from a pipeline that keeps activities from earlier
> schedule revisions, so it reads *higher* (27.37%); the new (Platform) dashboard
> reflects only the current, incomplete schedule, so it reads *lower* (23.85%).
> A complete XER should bring them back in line.

*(Closed, routed to one owner, answerable with a status. States the transition
as already decided rather than asking permission — two silent checks in a row
on a Critical ticket is enough evidence.)*

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
