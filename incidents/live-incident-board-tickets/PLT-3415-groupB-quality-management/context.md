# PLT-3415 — "(AUS02) Web viewer not auto calculating rework cost" — triage context

First folder, 2026-11-03 scheduled run. **Dev In Progress**, assignee Rishi, reporter Yash, Major, created 11-02 15:32 UTC, project AUS02, Freshdesk 8506 (Waiting on 3rd line). Group B (ticket is not Ilia's and the last comment is Rishi asking Yash, not us), domain quality-management.

## Ticket (fetched live 11-03, 3 comments, newest `117352`)

- Description: rework cost estimator does nothing for QA issues; discipline Structural and package Foundations can be selected, then the helper text reads "Model is missing mapping data needed to auto-generate a rework cost". Project planner says the area is mapped. Two Freshdesk screenshots (support.xyzreality.com links, not Jira attachments, not openable here).
- `117338` Yash to Rishi, 11-02 15:35: issues #26 to #35, models `QA-v2025_10454569_S_AUS02.ifc_MainStructure-Steel-V14` and `PC-v2025_10454569_S_AUS02.ifc_MainStructure-Steel-V9`, first noticed 26 Oct 2026. Yash's guess: "superstructure" is not a Package in the rework cost file.
- `117352` Rishi, 11-02 17:27: asks Yash for an invite to the project. **Waiting on: Rishi on Yash, since 11-02 17:27.**

## Mechanism (verified in code, hc-frontend master `df10c33`, 11-03)

This is **Pattern 6** (`recurring-defect-patterns.md`), fifth firing after PLT-2815, 3061, 3275, 3300.
- The message is the final fallback of `getEstimatedReworkCostHelperText` (`use-rework-cost-calculation.ts:196-197`): shown when a Category and a Discipline are set and `calculatedCost` is null.
- `calculatedCost` is null only when neither rule hits (`:93-148`): rule 1 needs Category + Discipline + Package all equal to a row, rule 2 needs Category + Discipline with a blank Package. Both compare **strings** against `rework_reference.json`.
- Counted today with a script: the table has 90 rows, **exactly three Discipline strings (`CSA` 32, `Mechanical` 31, `Electrical` 27)**, Categories 1 to 4 only. **No row has Discipline `Structural`**, and no Package is `Foundations`. So a Discipline literally named `Structural` misses rule 1 and rule 2 whatever the package is. (`Structural` and `Piling` exist as *Package* values, under CSA.)
- So Yash's guess is not the first miss: the discipline would fail before the package is looked at. His guess may also hold, but cannot be the whole story.

## Hypotheses

- **H1 (leading, inferred):** AUS02's discipline category is named `Structural`, not `CSA`. Prediction: the issue form's Discipline reads exactly "Structural". Falsified if it reads `CSA`; then the package or category string is the miss (a Category 5 would show 0, not the message, `:64-73`).
- **H2:** the project's categories were renamed or re-imported around 26 Oct, when it was "first noticed". Prediction: issues before #26 auto-filled. Not known; one question to Yash.
- Not a calculation bug; the browser table is the only source (no backend table, see PLT-3275 context).

## Verified vs inferred

Verified: ticket text and comment order; the message's source line; the three discipline strings; no `Structural` discipline or `Foundations` package in the table.
Inferred: that AUS02's Discipline string is `Structural`; that nothing else (category, currency) is involved.

## Not verified / needs a human

- The exact Category, Discipline and Package strings on issue #26 (screenshots on Freshdesk, not openable).
- Whether earlier AUS02 issues auto-filled (separates H1 from H2).
- Product answer that would end the pattern: add rows per discipline (data, Joshua Rees) or a Category-level fallback for unknown disciplines (Pietro/Mostafa). Still not put as one question.
No Jira action was taken.
