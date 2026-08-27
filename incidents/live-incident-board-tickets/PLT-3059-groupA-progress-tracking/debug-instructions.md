# PLT-3059 — debug instructions (2026-08-27)

**Category: 🟡 Stale / needs a chase.** Blocked on the same unrun check as PLT-3034.

**Branch:** `PLT-3059-fork-ab-linked-element-diagnostics` (same commit as PLT-3034's branch)

## What I found
- Same mechanism as PLT-3034 — see that ticket's `debug-instructions.md` for the full Fork A/B write-up.
- **This ticket is the reason it matters twice.** Darminder pointed Yash at PLT-3034's
  unlink-or-mark-installed workaround on 08-18, **before** PLT-3034's own customer denied its premise
  on 08-19. So an unverified workaround was copied onto a second customer-facing ticket.
- Nine Electrical activities at 78–98% — the biggest single-ticket cohort of this shape on the board.

## What's on the branch
- Identical to PLT-3034's: the element→model membership classifier and its `[linking]` console line.

## What I need from you
- [ ] Same one action as PLT-3034 — run the discriminator **once** and apply the answer to both tickets.
      Do not run it twice; they share a mechanism.
- [ ] If Fork A holds, both tickets need the *same* corrected message to the customer, and the advice
      already given on this ticket needs retracting.
