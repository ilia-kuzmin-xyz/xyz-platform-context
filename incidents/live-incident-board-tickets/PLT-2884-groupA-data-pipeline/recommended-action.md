# PLT-2884 — Recommended action

*Drafted 2026-07-22 · **updated 2026-07-30** (escalation posture raised — see
"Change on 07-30" below). Diagnosis unchanged.*

## Chosen: (c-style) Coordinator status-check → Yash, **and now a recommended status move** (was: proposed)

Root cause is **already known and agreed** (bad/incomplete source XER, product-
diagnosed by Mostafa on 07-10, corroborated by the customer's own Power BI
finding). The fix is **customer-side** (re-export a complete XER in P6 and
re-upload). The ticket has now sat **17 days** since the last substantive update
(Yash, 07-13 10:56) and **20 days** since the fix was handed to the customer
(07-10), in "With Customer" with **no customer response** — the only on-ticket
event since is a bare Freshdesk Closed → Waiting-on-customer flip-flop on 07-20
carrying no information. So the one useful move is a **coordinator nudge to
Yash**: has the customer re-uploaded? And — no longer as an open question but as
a recommendation — **move this off "With Customer" to "With Technical Support"**
so someone actively chases the client instead of waiting in silence.

### Change on 07-30 (why the posture moved)

The 07-22 draft asked Yash to *consider* the status move. Nine further days of
total silence on a **Critical** incident settle that question:

- **"With Customer" is now misreporting the ticket.** It implies an active
  client-side workstream. Nothing has come back in 17 days; there is no evidence
  anyone is working it. The board reads this as parked when it is stalled.
- **Nobody currently owns the next action.** The customer owes a re-upload but
  has not been chased since 07-13. A status with no owner and no timer is how a
  Critical quietly ages out.
- **Playbook Phase 6 applies to the *stall*, not just to closure.** The
  incident's remaining unknown ("did the corrected XER fix it?") is answerable in
  one step and has simply not been driven.
- **Do not close it instead.** The 07-20 Freshdesk Closed toggle (reversed a
  minute later) hints at closure pressure. Closing on "we told them what to do"
  is remission, not resolution — the reconciliation was never verified.

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

*(Revised 07-30: durations updated; Q2 is now a recommendation rather than a
question.)*

> @Yash — PLT-2884 has been "With Customer" since 10 Jul with the fix already
> identified (incomplete source XER — activities missing from the customer's own
> schedule export; Mostafa diagnosed this and the customer's Power BI check found
> the same). It's now **20 days** since we handed the fix over and **17 days**
> since the last substantive update on the ticket, with no re-upload and no
> response.
>
> Two things:
> 1. **Has the customer re-exported and re-uploaded a corrected XER yet?** If yes,
>    we can verify the new numbers reconcile and close. If no —
> 2. **I'd suggest we move this to With Technical Support and actively chase the
>    client.** It's Critical priority; 17 days of silence in "With Customer" isn't
>    "parked", it's stalled, and the status currently implies work is happening
>    client-side when nothing has come back. A direct follow-up (or a short Loom
>    showing them the P6 re-export step) should unstick it. Happy to be overruled
>    if you know the client is actively on it.
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
  `context.md §8`. The XER on-ticket is `EQIX_AT10x-A11x_Rev_02_updated20260427.xer`;
  a genuine corrected re-upload should be a **later revision than Rev 02** — a
  cheap first check that the customer actually re-exported rather than re-sent.
- **Board-scope consequence if the move happens (07-30):** `With Technical
  Support` is on this routine's **exclusion** list (board `README.md` § Scope
  rules). If PLT-2884 transitions, it **leaves this triage routine's scope** — so
  the next run should re-tag the folder (`groupA` → `relocated`) and record the
  reason, rather than silently dropping the ticket. Flagging deliberately: the
  escalation is still the right call, but it must not become the mechanism by
  which a Critical stops being watched.

**Confidence in diagnosis: 8/10** (unchanged 07-30 — not re-derived; nothing new
arrived to test it against). **Confidence in this being the right next step:
9/10** — cause is settled; the only lever left is chasing the customer, and the
status decision (With Customer → With Technical Support) is the concrete call to
force. The residual 1/10 is purely that Yash may have off-ticket knowledge that
the client is actively working the re-export, which would justify leaving it be.
