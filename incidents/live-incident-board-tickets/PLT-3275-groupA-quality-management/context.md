# PLT-3275 — "Estimated Rework Cost Not Calculated Automatically in QA Issues" — triage context

First folder for this ticket (2026-10-13). On 10-12 it sat in the "With Technical Support" bucket, so no run opened it; it is now
**Open** (Yash, Major, created 10-09, project SIN02, area Dashboard). Group A, domain quality-management.

## Ticket (fetched live, 5 comments, newest `114970`)

- Description: editing a QA issue, no Estimated Rework Cost is calculated after choosing Category, Discipline and Package; the field
  stays blank and the user types a value. Screenshot attached to the Freshdesk ticket (a `support.xyzreality.com` link, not a Jira
  attachment, so not openable from here).
- `114687` Yash 10-09: Mostafa concluded it is a **new project whose disciplines and packages changed**; needs Joshua Rees to supply
  updated cost values and "update the configuration file on the backend". Yash will contact Joshua.
- `114690` Darminder 10-09: once we have the values "we can update frontend side"; hopes to put it in the build for QA next week.
- `114692` Yash 10-09: has asked Joshua; Joshua may also contact Mostafa.
- `114969` / `114970` Yash 10-12: Freshdesk 8268 Open then Pending (noise, no human text).

Who is waiting on whom: Yash on Joshua (since 10-09, 4 days); Darminder on the values; nobody on us.

## Mechanism (verified in code, origin/master `221d571`, 2026-10-13)

This is **Pattern 6** in `incidents/recurring-defect-patterns.md`, third firing (PLT-2815, PLT-3061, now PLT-3275). Nothing new in kind.

- The suggested cost is computed **in the browser** from a static table, not by any backend:
  `.../issue-properties/blocks/hooks/use-rework-cost-calculation.ts` imports `../rework_reference.json` (line 5).
- Ladder: exact Category+Discipline+Package, then Category+Discipline with blank Package, else `cost: null`
  (blank field, helper text "Model is missing mapping data needed to auto-generate a rework cost. Please set a value.").
- `rework_reference.json` still has **90 rows and exactly three Discipline strings: `CSA`, `Electrical`, `Mechanical`**, Categories 1 to 4
  only. Counted today with a script, not by eye. So any project whose discipline is spelled differently, or is a different trade,
  gets `null` at every category at once.
- **Correction to the ticket text:** there is no backend configuration file for this. The platform-api repo has no rework cost table
  (grep of `src`, `test`, `docker` finds "Rework" only as an issue *outcome* label). api-v1 was not checked. The change is a
  frontend edit to the JSON plus a release, as Darminder said, not a backend change as Yash wrote.
- The table was **never extended after PLT-3061** (CSA-TCB / CSA-KGE x 4 categories): no discipline has been added since, and the
  JSON's only history on master is an unrelated commit.

## Hypotheses

- **H1 (most likely, from Mostafa's reading + the three-string table):** SIN02's discipline names are not `CSA`/`Electrical`/`Mechanical`.
  Prediction: the issue shows a Discipline string outside those three, and the helper text reads "Model is missing mapping data".
  Falsified by: Discipline is one of the three and Category is 1 to 4 (then a Package or Category value is the issue, or a real bug).
- **H2:** nothing was selected in the form (rule at line 52: nothing selected returns 0,
  which shows as 0, not blank). Unlikely: the reporter says all three were chosen.

## Verified vs inferred

Verified: the code path and the three-discipline table; no backend table in platform-api; Mostafa/Darminder/Yash comments as quoted.
Inferred: that SIN02 uses other discipline spellings (H1); that "Joshua Rees" is the cost manager "Josh" from PLT-3061 (same name, same
role as described there).

## Not verified / needs a human

- Which Category, Discipline and Package strings the failing issue carries. The screenshot is on Freshdesk. **One string comparison settles
  it** (recognition addition in Pattern 6).
- Whether the product answer is "add rows per discipline" (data, Joshua) or "fall back to a Category-level default when the discipline is
  unknown" (product decision, Pietro/Mostafa). The second would end this pattern; it is not proposed to anyone yet.
- Whether Joshua has replied (nothing on the ticket after 10-09).
