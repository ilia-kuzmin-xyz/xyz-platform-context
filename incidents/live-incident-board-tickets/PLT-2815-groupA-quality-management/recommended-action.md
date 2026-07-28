# PLT-2815 — Recommended action

## Update (2026-07-28, third re-check): move to Done — nothing left to verify

Superseding the 07-13 draft below. **This ticket should be closed, not nudged again.**

Live Jira check today shows **zero delta** across three consecutive re-checks (07-13, 07-22, 07-28):
comment count unchanged (13, last id 106553), issue `updated` timestamp still 2026-07-06T10:18 (22 days
untouched), status still "With Customer," `resolution: null`. `getTransitionsForJiraIssue` confirms a
direct **"Done"** transition (id 7) is available from the current status.

**Why this is a close, not another nudge:**
- Root cause was pinned 07-13 at 9/10 confidence: not a bug, a reference-data artifact (package-specific
  Cat3 £600 undercutting a generic-fallback Cat4 £740 for CSA/Underground Services). Code is correct.
- Product (Mostafa, via Rishi, comment 105647, 2026-06-23) already ruled **"leave it as intended for
  now."** That decision hasn't been revisited and nothing new has surfaced to reopen it.
- The customer-facing channel is already closed: **Freshdesk #7126 was set to Closed on 2026-07-06**
  by Yash Patel — the customer side of this conversation is done.
- 22 days of silence since Freshdesk closed, with no reply, no question, no pushback from Paolo. There
  is no pending answer to wait for. The "With Customer" status is not describing an active state —
  it's a stale label nobody updated after the Freshdesk ticket closed.

**Owner:** Yash Patel (assignee) — the only action needed from him is the board move itself, not a
customer follow-up.

---

### Drafted board action (not executed)

> Transition PLT-2815 → **Done**.
> Resolution note: *Not a bug — reference-data artifact in the Issue Rework Reference Table (CSA /
> Underground Services Cat3 vs Cat4 fallback ordering). Root cause and reproduction in PLT-2815 comment
> history / this ticket's context.md. Product (Mostafa) ruled leave-as-intended 2026-06-23. Customer's
> Freshdesk ticket #7126 already closed 2026-07-06 with no follow-up in 22 days. Closing to match the
> resolved customer-facing ticket.*

If Yash prefers a paper trail before closing, a one-line comment before the transition is enough —
this is now a formality, not a fresh clarifying question:

> Closing this out — Freshdesk #7126 has been closed since 07-06 with no further questions from the
> customer, and product already confirmed the values are as intended (06-23). Nothing left to verify
> on our side.

---

### Reference — evidence bundle if product ever revisits the £600 figure

Kept for continuity, not for immediate action (product already declined to change it 06-23):
- `Cat3 | CSA | Underground Services = £600` is anomalously low: below the generic Cat3 CSA (£2,003.33)
  *and* the generic Cat4 CSA (£740.00) — `rework_reference.json:65-67,83`.
- No package-specific `Cat4 | CSA | Underground Services` row exists, so Cat4 uses the generic CSA
  fallback (£740).
- If this resurfaces, route to **Mostafa / Pietro** (Pietro authored the reference table) as a data
  question, not a dev ticket.

---

## Notes for the coordinator (Yash)

- This is the **third consecutive re-check with no change** (07-13 → 07-22 → 07-28). The ticket has been
  sitting resolved-but-open for 3+ weeks. Recommend closing today rather than scheduling a fourth check.
- Stays out of the dev queue either way — no code change is warranted.

**Confidence in diagnosis: 9/10. Confidence in this being the right next step: 9/10** (up from 7/10 on
07-13 — the remaining uncertainty back then was "nudge vs close"; three weeks of confirmed silence plus
Freshdesk already closed resolves that in favour of closing).
