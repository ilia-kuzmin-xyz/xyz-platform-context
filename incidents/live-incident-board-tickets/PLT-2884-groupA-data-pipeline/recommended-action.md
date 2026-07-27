# PLT-2884 — Recommended action

*(Firmed up 2026-07-27 — same action as the 07-22 draft, escalated: silence is now
~14 days, not 9. The diagnosis is untouched; see `context.md` UPDATE 2026-07-27.)*

## Chosen: (c-style) Coordinator chase → Yash, **with a deadline**, and move to With Technical Support

Root cause is **already known and agreed** (bad/incomplete source XER, product-
diagnosed by Mostafa on 07-10, corroborated by the customer's own Power BI
finding). The fix is **customer-side** (re-export a complete XER in P6 and
re-upload). The ticket has now sat **~14 days** since the re-upload was requested
(07-13) with **no customer response** — the only movement was a Freshdesk
Closed → Waiting-on-customer flip-flop on 07-20 that carried no information.

The 07-22 run said *consider* the status move. At 14 days on a **Critical**, that
is no longer a "consider": passively parked past two weeks with a known fix is a
stalled ticket, not a waiting one. So the move is a **coordinator chase to Yash**
with (1) a concrete follow-up deadline and stated consequence, and (2) the
**With Customer → With Technical Support** transition so it is actively owned
rather than silently ageing on the board.

**Why nudge rather than keep waiting:** silence is not information — every extra
week makes the eventual re-upload harder to correlate with the reported numbers,
and a Critical that no one is chasing looks parked when it is actually stuck.
**Why not re-diagnose:** nothing new arrived to diagnose; the cause is settled and
re-running the analysis would burn effort on an answer we already have.

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
  not resolution (playbook Phase 6). The deadline framing above is deliberately
  *close as **unable to reproduce without corrected data***, reopenable on the
  file — not "resolved". Different thing; don't let it become a silent resolve.

---

### Draft chase-up comment (for Yash / coordinator to post — do NOT auto-post)

> @Yash — PLT-2884 has been "With Customer" since 10 Jul with the fix already
> identified (incomplete source XER — activities missing from the customer's own
> schedule export; Mostafa diagnosed this and the customer's Power BI check found
> the same). The corrected re-upload was asked for on **13 Jul — that's ~14 days
> ago with no reply**. The only movement since was the Freshdesk Closed →
> Waiting-on-customer flip on 20 Jul, which didn't add anything.
>
> Proposing we stop waiting passively:
> 1. **Can you chase the customer directly with a deadline?** Suggested framing:
>    *"We still need the corrected XER re-exported from P6 to verify. If we don't
>    hear back by [+5 working days], we'll close this as unable-to-reproduce
>    without corrected source data — happy to reopen immediately once the file
>    lands."* A short Loom of the P6 re-export step would remove the last excuse.
> 2. **Move this to With Technical Support.** It's Critical priority and has been
>    silent for two weeks — that isn't "parked with the customer", it's stalled,
>    and it needs an owner who is actively chasing.
>
> For the record — this is expected to be data-side, not a platform bug: the old
> (Power BI) dashboard reads from a pipeline that keeps activities from earlier
> schedule revisions, so it reads *higher* (27.37%); the new (Platform) dashboard
> reflects only the current, incomplete schedule, so it reads *lower* (23.85%).
> A complete XER should bring them back in line.

*(Closed, routed to one owner, answerable with a status. Q1 puts a deadline and a
stated consequence on the customer ask; Q2 makes the status transition a decision
rather than a suggestion. Note the deadline is a **proposal** — the actual date and
whether we're willing to close on it is Yash's/support's call, not the agent's.)*

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

**Confidence in diagnosis: 8/10** (unchanged — no new evidence either way).
**Confidence in this being the right next step: 9/10** — cause is settled; the only
lever left is chasing the customer, and at ~14 days on a Critical the status move
(With Customer → With Technical Support) is the concrete decision to force rather
than merely suggest.
