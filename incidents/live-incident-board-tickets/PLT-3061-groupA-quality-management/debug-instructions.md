# PLT-3061 — debug instructions (2026-08-27)

**Category: 🟡 Stale / needs a chase — but the chase now belongs to Yash, not us.**

**Branch:** `PLT-3061-rework-cost-discipline-coverage` (from the 08-24 pass; **refreshed onto current
master today**, merged clean)

## What I found
- The stall broke on 08-26, sideways: Yash re-pinged product, Mostafa replied within a minute that
  **Josh (cost manager) is on leave**, and Yash took the follow-up himself.
- **Do not post the standing 8-row decision-request to Mostafa/Pietro** — it would land on people who
  already said the decision-maker is away, and Yash has claimed the next step.
- Underlying gap unchanged: 8 rows needed (CSA-TCB / CSA-KGE × Categories 1–4), or an inherit-from-CSA rule.
- **Related, new from PLT-2815 this pass:** the reference table has 5 *specific-vs-fallback* cost
  inversions. Worth folding into the same product conversation rather than raising twice.

## What's on the branch
- Rule 3 now logs the exact discipline/package/category triple that failed and whether the discipline
  is absent from the table entirely. Establishing ML9's value was `CSA-TCB` took two days through
  support; next time it is one console line.
- `rework_reference.test.ts` pins the table's shape. Prices stay untested so product can edit freely.

## What I need from you
- [ ] **Nothing now.** Diarise a private nudge to Yash around **2026-09-02** — is Josh back, and did the
      8 values land? There is no timer on this otherwise.
- [ ] If Josh is back and it is still silent, *then* the Mostafa/Pietro escalation draft goes live
      unchanged. Keep it on file.
