# PLT-3300 — "ML9 - CSA Rework cost not correct" — triage context

First folder for this ticket (2026-10-19). Created 10-16 14:49 BST, **Open**, assignee Darminder, reporter Yash, Medium, Freshdesk 8222 (Waiting on 3rd line).
Group A, domain quality-management. **Pattern 6** (recurring-defect-patterns.md), fourth firing and the **first re-report of an already-answered ticket**.

## Ticket (fetched live 10-19, 2 comments, newest `115609`)

- Description (customer Paolo, project ML9): two CSA packages look wrong. (1) CSA / Precast: CAT2 issues suggest only €684.00.
  (2) CSA / Underground Services: logic "reversed", CAT4 at €843.60 while CAT3 is €684.00.
- `115608` Yash 10-16 to Darminder: investigate, "verify whether the source file used to retrieve rework costs contains the expected values for the
  affected Category and Package combinations", to tell source file from calculation logic.
- `115609` Freshdesk 8222 Waiting on 3rd line. No attachments. Nobody has replied since (Fri 15:05 to Mon, one working day).

Who is waiting on whom: Yash on Darminder (one working day). Nobody on us.

## This is PLT-2815 again (verified)

PLT-2815 (June 2026, same customer Paolo, same project ML9, same package) reported **exactly** CAT3 €684.00 and CAT4 €843.60 on CSA / Underground Services.
It was answered "not a bug" (Rishi `105268`) and "leave it as intended, questions to Josh in customer success" (Mostafa via Rishi `105647`, 06-23), then
went Done 09-22 on a Freshdesk closure. The customer has now come back with the same two numbers plus a second package. See
`../PLT-2815-resolved-quality-management/context.md` for the full arithmetic.

## Mechanism (verified, hc-frontend origin/master `2175673`, 2026-10-19)

Computed in the browser from a static table. `.../issue-properties/blocks/hooks/use-rework-cost-calculation.ts`:
`:5` imports `../rework_reference.json`; `:18-23` hard-coded GBP factors (`EUR: 1.14`); `:93-121` Rule 1 exact Category+Discipline+Package;
`:123-144` Rule 2 Category+Discipline with blank Package; `:146-154` Rule 3 `null`. Call site is live: `form-fields/issue-cost-field.tsx`
(auto-populate and "Suggested cost"); grep of `app/` finds it as the only importer of the hook (`:10-11`, `:33`).
`rework_reference.json` has not changed since its creation (`3b5989409`, 2025-10-29, PLT-437; `git log` on full history). The hook's last change is `1c3a02713`
(2026-06-22, PLT-2609), a one-line form-field rename (`severity` to `issueSeverityCategoryId`), no logic or table change. Contents re-read today (90 rows).

Reproduction of the customer's three numbers, each reproduced exactly before comparing:

| Customer says | Table row hit | Rule | Maths | Result |
|---|---|---|---|---|
| CSA / Precast CAT2 = €684.00 | `Category 2 / CSA / Precast = £600.00` | 1 (exact) | 600 x 1.14 | **€684.00** ✓ |
| CSA / Underground Services CAT3 = €684.00 | `Category 3 / CSA / Underground Services = £600.00` | 1 (exact) | 600 x 1.14 | **€684.00** ✓ |
| CSA / Underground Services CAT4 = €843.60 | no UGS Cat 4 row, so generic `Category 4 / CSA / "" = £740.00` | 2 (fallback) | 740 x 1.14 | **€843.60** ✓ |

So **the code is correct and the source table says what the customer sees**. This answers Yash's question: the source file contains these values.
The Confluence "Issue Rework Reference Table" (UX space, Pietro, last modified 2025-10-23) lists the same three rows and the same generic CSA Cat 4 = £740.

## What is new compared with PLT-2815 (and worth a product look)

- The two **£600 rows are the two cheapest CSA package rows in the whole table** and both undercut their own generic fallback by a large margin:
  Precast Cat 2 £600 vs generic CSA Cat 2 £7,871.72; Underground Services Cat 3 £600 vs generic CSA Cat 3 £2,003.33 (and vs generic Cat 4 £740).
  Next cheapest CSA package row is Piling Cat 3 £760. Only two rows in all 90 equal exactly 600. Counted by script from origin/master.
  Two independent customer complaints (Precast now, Underground Services in June and now) both landed on a £600 row, which looks like a
  placeholder or floor value rather than a measured average. **Inferred, not verified**: nobody on this thread knows how £600 was chosen.
- The customer raised it a second time after being told "as intended". Fixing nothing is therefore no longer a quiet outcome for ML9.

## Hypotheses

- **H1 (matches all the evidence):** values are as authored in the table, the customer disputes the table not the code. Falsified if a screenshot
  shows a number outside {€684.00, €843.60} for these packages (none provided).
- **H2 (ruled out):** a code or FX regression. The arithmetic reproduces to the cent with the current factor 1.14, and the table is unchanged since June.

## Verified vs inferred

Verified: the three-row reproduction above; code and table unchanged; PLT-2815 history and comments quoted; Confluence rows match.
Inferred: project currency is EUR (684/600 = 1.14 exactly fits `EUR`, and PLT-2815 records ML9 as EUR); that £600 is a placeholder.

## Sibling ticket, out of scope today: PLT-3299 (With Technical Support)

LVN BL1-2, CAT 5 shows 6.12k rework cost on the dashboard. Darminder (`115642`, `115643`, 10-16 evening): the project has Category 5 issues with a **user-entered**
rework cost, which is where the total comes from, and the "3 open" CAT 5 issues in the QA list include **Void** issues which the dashboard category count
excludes. Consistent with the code: the auto-calculation returns 0 for Category 5 (`use-rework-cost-calculation.ts:63-73`) but only when the field is auto-filled, so a typed
value survives. Not our ticket; recorded because it is the same screen and the same "rework cost looks wrong" family, three tickets in 10 days (3275, 3299, 3300).

## Not verified / needs a human

- How £600 was chosen for Precast Cat 2 and Underground Services Cat 3 (only Pietro or Mostafa can say). This is the single fact the decision needs.
- Whether the customer entered those costs themselves (Darminder's PLT-3299 finding says manual entry is possible). The ticket has no screenshot, so which issue, which cost
  and whether the figure was auto-suggested or typed is unknown. The description says "suggested value", so auto-suggest is assumed.
- Media: none attached to this ticket. Nothing unopenable.

---

## 2026-10-20 run — left scope: moved to With Technical Support after Ilia's reply (additive)

Re-fetched, 3 comments, newest `115961` (Ilia, 10-19 19:27): costs come from the rework cost table and match it exactly; CSA / Precast / CAT2 is £600 (€684); **Underground Services has no CAT4 value so it falls
back to the general CSA CAT4 cost (£740, €843.60)**; suggestion: update the table with the right values, "can we ask Joshua Rees for them?". Status is now **With Technical Support** (out of scope).

**Supersedes the 10-19 draft to Mostafa** (the "review the two £600 values" question): Ilia took a different route, asking the customer's side (Joshua Rees) for the correct values instead of asking product. That is consistent with
PLT-3275 (Joshua owes values since 10-13). Not wrong, but note the 06-23 PLT-2815 close ("leave as intended") rested on a product answer, and a customer-supplied value still needs product ownership of the table
(`rework_reference.json` mirrors Pietro's Confluence page). Residual, one line, for the summary: **if Joshua's values arrive, who edits the table and ships it is undecided** (JSON edit plus release, same as PLT-3275).
No action today. No Jira action was taken.

---

## 2026-10-21 run — back in scope: status With Customer (additive)

Re-fetched, 5 comments, newest `115970` (Yash, 10-20 10:19): "Have asked Joshua for an updated rework file." Freshdesk 8222 Pending (`115969`). Jira status is now **With Customer** (was With Technical Support on 10-20), which is in scope. Ball: Joshua, via Yash, since 10-20.
Nothing new in kind. The residual from 10-20 stands: when Joshua's file arrives, who edits `rework_reference.json` and ships it is undecided (Darminder said on PLT-3275 he can update the frontend side). Same table, same edit as PLT-3275; see the combined-ask draft in `../PLT-3275-groupA-quality-management/recommended-action.md`. Class 1, parked. No Jira action was taken.
