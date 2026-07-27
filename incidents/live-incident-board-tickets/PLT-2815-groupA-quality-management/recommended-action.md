# PLT-2815 — Recommended action (DRAFT ONLY — execute nothing)

## Chosen (updated 2026-07-27): **Close it — transition the Jira to Done/Closed** (resolution: working as intended / not-a-bug, product-owned reference data)

**Supersedes the 2026-07-13 recommendation** below (which was: keep "With Customer" and send a nudge).
That was the right call while the outcome was still open. It no longer is. As of today the ticket is
**functionally resolved** and the *only* outstanding item is **Jira board hygiene** — the issue is still
in **"With Customer"** while everything it was waiting on has concluded:

- **Engineering question: answered.** Not a bug; the calculation faithfully implements the product-owned
  reference-table fallback ladder (`context.md §2`, confidence 9/10, both figures reproduced to the cent).
- **Product question: answered.** Mostafa Kamel Hussien, relayed by Rishi **2026-06-23** (comment 105647):
  *"leave it as intended for now"* — **3+ weeks ago**, never revisited.
- **Customer-facing ticket: closed.** Freshdesk #7126 final state **Closed, 2026-07-06** — **3+ weeks ago**,
  **no comments since**. Paolo never came back and never took up the "ask Josh" route.

There is nothing left to evaluate, analyse, or develop. Closing the Jira just makes the board match reality.

### Why this and not the others

- **Not (b) Ready For Development.** There is no code defect to hand a dev. The only possible change is
  **data** in the product/UX-owned "Issue Rework Reference Table" (Confluence), and product has explicitly
  declined to change it for now. Routing to Dev would be a no-op.
- **Not (c) keep "With Customer" / send another nudge** *(the previous recommendation)*. "With Customer"
  asserts we are waiting on Paolo — we are not, in any meaningful sense. His support ticket has been closed
  for 3+ weeks and he has raised nothing. A nudge now would **re-open a settled conversation**, re-surface a
  number product has already decided not to change, and invite a dispute we have no approved answer to.
  Worst case it manufactures an escalation out of a resolved ticket. Silence after a delivered answer plus a
  closed support ticket is acceptance.
- **Not (a) another routed internal question.** Every party has already been asked and has answered: Rishi
  (BE — not a bug), Mostafa (product — as intended). Re-asking Mostafa or Pietro whether the £600 Cat3
  Underground Services figure is right would be **reversing a decision nobody has contested**, on our
  initiative rather than the customer's. If it is worth doing at all it is a standalone product/data
  backlog item — not a reason to hold a Live Incident open.
- **Not (d) Blocked.** Nothing blocks it. Blocked would entrench a resolved ticket on the incident board.

**Owner:** Yash Patel (assignee + client-comms owner) — his transition to make. **Not executed here.**

---

### Draft closing comment to attach when transitioning

> Closing as **working as intended** — not a defect. The Category 3 (€684.00) and Category 4 (€843.60)
> figures for CSA / Underground Services are produced correctly from the Issue Rework Reference Table:
> Cat 3 uses the package-specific rate, Cat 4 falls back to the general CSA rate as there is no
> package-specific Cat 4 row, which is why Cat 4 reads higher in this one package. Confirmed not a bug
> (Rishi, 2026-06-18) and product's decision was to leave the reference values as intended for now
> (Mostafa, 2026-06-23). The linked Freshdesk ticket #7126 was closed on 2026-07-06 with no further
> customer response. Any future questions on the reference figures should go to Josh (Customer Success),
> or be raised as a product/data change against the reference table.

---

### If it needs re-opening later (park, don't chase)

Should Paolo come back, the evidence is already pinned and does **not** need re-deriving — the inversion is
driven by **`Cat3 | CSA | Underground Services = £600`**, anomalously low (below both the generic Cat3 CSA
£2,003.33 and the generic Cat4 CSA £740.00), plus the **absent `Cat4 | CSA | Underground Services` row**
forcing the generic fallback (`rework_reference.json:65-67,83`; `context.md §2`). Route that as a one-line
product/data question to **Mostafa / Pietro** (Pietro authored the table) — *"Is the £600 figure correct, and
should a package-specific Cat 4 row be added?"* Still not dev work.

Optional, unrelated to this ticket: the **hard-coded FX factors** (`use-rework-cost-calculation.ts:18-23`,
EUR 1.14) are a latent maintenance risk worth its own tech-debt ticket (`context.md §6`). Do not attach it to
PLT-2815 or use it as a reason to hold this open.

**Confidence in diagnosis: 9/10. Confidence in this being the right next step: 9/10** — up from ~7/10 on
2026-07-13; the ambiguity then was "nudge vs close", and 3+ weeks of silence on both a closed Freshdesk
ticket and a settled product decision has resolved it.

---

<details>
<summary><strong>Superseded — original recommendation, 2026-07-13</strong> (kept for audit trail)</summary>

## Chosen: (c) Keep "With Customer" — draft the exact closing/unblock question for Yash to relay

**Why (c), not the others:**
- **Not (b) Ready For Development.** There is no code defect. The calculation faithfully implements the
  product-owned reference-table fallback rules (evidence in `context.md §2`); the only possible change
  is **data** in the "Issue Rework Reference Table" (Confluence, UX/Product-owned), and **Mostafa has
  already ruled "leave it as intended for now"** (comment 105647, 2026-06-23). Sending this to a dev
  would be a no-op.
- **Not (d) Blocked.** Nothing is technically blocking us; we are deliberately parked awaiting the
  client's response to the answer we already gave.
- **Not (a) fresh clarifying reply.** The clarification (it's as intended; questions → Josh) was
  already delivered. What is missing is a **close-the-loop confirmation from the customer**, plus the
  fact that it has been silent ~3 weeks and Freshdesk #7126 already closed (2026-07-06). The right move
  is a precise nudge that lets us close the Jira — that is exactly what (c) is for.

**Owner:** Yash Patel (assignee + client-comms owner) → relay via **Josh (customer success)** → to
**Paolo (ML9)**. One owner, one closed question, per the playbook.

### Draft nudge for Yash to relay to the customer (via Josh)

> Hi Paolo — following up on the estimated rework cost for CSA / Underground Services (ticket #7126 /
> PLT-2815). We checked the calculation: the two figures come from our standard Issue Rework Reference
> Table, and they're produced by different lookup rules — the **Category 3** value (€684.00) is the
> **package-specific** rate for Underground Services, while the **Category 4** value (€843.60) falls
> back to the **general CSA** rate because there is no package-specific Category 4 figure for
> Underground Services. That's why Cat 4 shows higher than Cat 3 in this one package. The reference
> figures themselves are maintained by our product team and are intended values.
>
> Could you confirm one thing so we can close this out: **are you happy to proceed with the values as
> they stand, or would you like our product team to review the specific Underground Services Category 3
> figure?** If any further questions on the numbers, Josh in Customer Success can pick those up.

*(Closed question, single decision for the customer: accept-as-is vs request a product review of the
one figure. Answerable in one line, so the Jira can then be closed or escalated.)*

### Notes for the coordinator (Yash)

- **Freshdesk/Jira status mismatch:** Freshdesk #7126 is **Closed** (2026-07-06) while this Jira is
  still **"With Customer."** A legitimate alternative to the nudge above is simply to **close PLT-2815**
  (resolution: not-a-bug / working-as-intended, product-owned data) to match the closed support ticket.
  That option falls outside the four actions I was asked to choose from, so it needs your call — but if
  you'd rather not re-open a settled conversation with the client, closing is the cleaner path given
  ~3 weeks of silence. *(2026-07-27: this alternative is now the primary recommendation — see above.)*
- Either way this stays **out of the dev queue** until product changes the reference data.

**Confidence in diagnosis: 9/10. Confidence in this being the right next step: ~7/10** (comms judgment;
depends on whether Yash prefers to nudge-then-close or close outright).

</details>
