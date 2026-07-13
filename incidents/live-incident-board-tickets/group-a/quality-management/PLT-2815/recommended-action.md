# PLT-2815 — Recommended action

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

---

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

---

### Attach these facts to the ticket / have ready when the customer replies

If the customer pushes back (likely, since their premise is correct), hand product this precise
evidence — it materially sharpens the "as intended" decision, which was taken on 2026-06-23 **before**
this exact mechanism was pinned:

- The inversion is driven by **`Cat3 | CSA | Underground Services = £600`**, which is anomalously low:
  lower than the generic Cat3 CSA (£2,003.33) **and** the generic Cat4 CSA (£740.00), and a steep
  cliff within the package (Cat1 £54,560 → Cat2 £7,125.71 → Cat3 £600). `rework_reference.json:65-67,83`.
- There is **no `Cat4 | CSA | Underground Services` row**, so Cat4 uses the generic CSA fallback (£740).
- Route a product/data question to **Mostafa / Pietro** (Pietro authored the reference table): *"Is the
  £600 Cat3 Underground Services figure correct, and should a package-specific Cat4 row be added?"*
  This is a one-line, evidence-backed decision — not dev work.

---

## Notes for the coordinator (Yash)

- **Freshdesk/Jira status mismatch:** Freshdesk #7126 is **Closed** (2026-07-06) while this Jira is
  still **"With Customer."** A legitimate alternative to the nudge above is simply to **close PLT-2815**
  (resolution: not-a-bug / working-as-intended, product-owned data) to match the closed support ticket.
  That option falls outside the four actions I was asked to choose from, so it needs your call — but if
  you'd rather not re-open a settled conversation with the client, closing is the cleaner path given
  ~3 weeks of silence.
- Either way this stays **out of the dev queue** until product changes the reference data.

**Confidence in diagnosis: 9/10. Confidence in this being the right next step: ~7/10** (comms judgment;
depends on whether Yash prefers to nudge-then-close or close outright).
