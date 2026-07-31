# PLT-2815 — Recommended action

> **Revised 2026-07-30** (was: "(c) keep With Customer — nudge the client"). Escalated from a soft
> nudge to a direct close-out. Rationale for the change is at the bottom (§ Why this changed).

## Chosen: **Close PLT-2815** — post the closing comment below, then transition to **Done**

Not another nudge. This ticket has been static for **24 days** (last update 2026-07-06), the
engineering question is settled at 9/10 confidence, the product decision was taken on 2026-06-23, and
the customer-facing **Freshdesk #7126 is already Closed**. There is nothing left to wait for — the Jira
is orphaned open behind a closed support ticket. Leaving it in `With Customer` misreports the board:
it implies a live client conversation that does not exist.

**Owner:** Yash Patel (assignee + coordinator). One action, executable solo, no client contact needed.

---

### 1. Closing comment to post on PLT-2815

> Closing this out. Summary of the outcome for the record:
>
> **Not a defect — working as specified.** The two figures the customer reported for CSA / Underground
> Services on ML9 reproduce exactly from the shipped Issue Rework Reference Table:
> - **Category 3 = €684.00** — base **£600.00** × EUR factor 1.14, matched by the **package-specific**
>   rule (exact Category + Discipline + Package).
> - **Category 4 = €843.60** — base **£740.00** × 1.14, matched by the **generic CSA fallback** rule,
>   because no `Category 4 | CSA | Underground Services` row exists.
>
> **Root cause of the apparent inversion is reference *data*, not code** — two compounding facts:
> (1) the two values are produced by *different* lookup rules, so a package-specific Cat 3 is being
> compared against a discipline-level fallback Cat 4; and (2) the `Cat3 | CSA | Underground Services =
> £600` figure is anomalously low — below the generic Cat 3 CSA (£2,003.33) *and* below the generic
> Cat 4 CSA (£740.00). The calculation code faithfully implements the documented fallback ladder in the
> [Issue Rework Reference Table](https://xyzreality.atlassian.net/wiki/spaces/UX/pages/1630633988/Issue+Rework+Reference+Table)
> (product/UX-owned, authored by Pietro Desiato). Not a regression — no deploy involved; latent data
> shape.
>
> **Product decision:** Mostafa Kamel Hussien, 2026-06-23 — *"leave it as intended for now; if they have
> any questions regarding the numbers, they can reach out to Josh from customer success."*
>
> **Customer side:** Freshdesk **#7126 is Closed** (2026-07-06). No further response from the customer
> since. Closing the Jira to match.
>
> Any future change to these figures is a **reference-table data update owned by product (Mostafa /
> Pietro)** — see the follow-up note below — not development work on this ticket.

### 2. Transition

- **`With Customer` → `Done`.**
- **Resolution:** the "as designed / not a bug / won't fix" value — pick whichever of those exists in
  the PLT scheme (I have not queried the transition screen; **do not** close with an empty resolution,
  the ticket currently has `resolution = null` and closing without one leaves it ambiguous).
- **Do not** route to Ready For Development — there is no code change. **Do not** route to Blocked —
  nothing is blocking. **Do not** re-contact the client to obtain permission to close; the support
  ticket they own is already closed.

### 3. Optional follow-up (separate from this closure — do not hold the close for it)

Raise a **one-line product/data question to Mostafa / Pietro**, as its own item or a Confluence comment
on the reference table — *not* as a reason to keep PLT-2815 open:

> *"Is `Cat3 | CSA | Underground Services = £600` correct? It is the lowest Cat 3 in the whole table,
> sits below both the generic Cat 3 CSA (£2,003.33) and the generic Cat 4 CSA (£740), and follows a
> steep cliff within the package (Cat1 £54,560 → Cat2 £7,125.71 → Cat3 £600). Should a package-specific
> Cat 4 row also be added so the two categories resolve by the same rule?"*
> (`rework_reference.json:65-67, 83`)

Also noted, unrelated to this closure: **hard-coded FX factors** in
`use-rework-cost-calculation.ts:18-23` (EUR 1.14) are a latent maintenance risk for all EUR/USD
projects — worth a tech-debt entry, not an incident.

---

## Why this changed from "(c) nudge" (07-13) to "close" (07-30)

The 07-13 draft chose a nudge because the ticket had been silent ~3 weeks and a one-line customer
confirmation would have let us close cleanly. That reasoning has expired:

- **The nudge was never sent.** There is no comment on PLT-2815 after 2026-07-06, so no client clock
  was ever restarted. Re-drafting the same nudge on every pass is the failure mode the routine exists
  to avoid.
- **The confirmation isn't needed.** The customer's own ticket (Freshdesk #7126) was closed on
  2026-07-06 — the customer-facing loop is shut. Asking Paolo to re-confirm re-opens a settled
  conversation to collect a signature on a decision that is product's to make, not his.
- **Nothing is under investigation.** Cause, trigger and cohort are all answered (`context.md §8`), so
  the playbook's "close on cause + trigger + cohort, never on 'looks fine now'" bar is *met* — this is
  a real close, not a remission close.
- The 07-13 file already flagged closure as the cleaner path in its coordinator notes; 24 further days
  of silence settle it.

**Confidence in diagnosis: 9/10** (unchanged — code path read end-to-end, both figures reproduced to
the cent). **Confidence that closing is now the right step: 8/10** — up from ~7/10 for the nudge; the
residual 2 points are Yash's call on whether he wants a courtesy line to Paolo via Josh before closing
(reasonable, but should not delay the transition).
