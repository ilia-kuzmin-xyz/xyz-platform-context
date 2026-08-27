# PLT-3034 — debug instructions (2026-08-27)

**Category: 🟡 Stale / needs a chase.** One unrun check has blocked two customer-facing tickets for 10 days.

**Branch:** `PLT-3034-fork-ab-linked-element-diagnostics` (identical branch pushed for PLT-3059)

## What I found
- `groupLinksByModel` buckets each element under **every** model it belongs to
  (`useGroupedLinks.ts:58-83`). So "appears under a QA model heading" does **not** mean "is a QA-only
  element" — a shared element id renders under both headings.
- That is the whole Fork A/B question, and it is decidable from data already in memory when the panel
  renders: **does the element belong to more than one model?**
  - >1 model → **Fork A**: one element, one link. "Unlink the QA element" would remove the production
    link too, and the element genuinely is not installed. The QA heading is a display artifact.
  - 1 model → **Fork B**: a real QA-only link exists; the customer's provenance question is fair.
- The unlink/mark-installed workaround was copied onto PLT-3059 **before** this ticket's own customer
  disputed its premise. Under Fork A both workarounds are wrong.

## What's on the branch
- Pure classifier over element→model membership, returning `fork-a-all-shared` /
  `fork-b-all-single-model` / `mixed` plus the deciding element ids.
- Logs one `[linking]` line whenever an activity's links span more than one model.

## What I need from you
- [ ] **Run the app on this branch, open Hutto2, select activity `DH2.29-30.1100`, open the
      linked-elements panel, and paste me the `[linking]` console line.** That single line settles
      Fork A vs Fork B for both tickets.
- [ ] Alternatively, no build needed: Darminder's 08-17 screenshots
      (`image-20260817-132030/132133/132204.png`) may already show whether the element id appears
      under more than one model heading.
