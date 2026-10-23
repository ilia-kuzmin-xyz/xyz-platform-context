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

## 2026-10-16 (scheduled) — unchanged
Fresh fetch with comments: 5 comments, newest `114970` (10-12 Freshdesk Pending), status Open, assignee Yash. Nothing from Joshua or Mostafa on the ticket; waiting on Joshua is now 7 days (asked 10-09). `rework_reference.json` on hc-frontend master `049c25819` still has its only commit PLT-437 (`3b5989409`), so the table is unchanged. The 10-13 draft stands. No Jira action was taken.

## 2026-10-19 (scheduled) — unchanged, plus a sibling
Last fetch stamp still 10-12 17:18 (newest comment `114970`), so not re-fetched. Joshua's values now owed 10 days (asked 10-09). The 10-13 draft stands.
New sibling **PLT-3300** (ML9, same table, a different symptom: wrong values, not a blank), see `../PLT-3300-groupA-quality-management/context.md`.
If product edits `rework_reference.json` for PLT-3300 it is the same edit-and-release as this ticket, so the two can ride one change.

---

## 2026-10-21 run — H1 confirmed by Ilia's read of the project; status With Customer (additive)

Re-fetched, 7 comments, newest `115971`. Status is now **With Customer** (was Open), still assignee Yash.
- `115966` Ilia, 10-20 10:03: the table only has CSA, Electrical and Mechanical; **SIN02 uses different disciplines (Civil, Structural, Architectural, Plumbing, Fire Protection, etc.), so 9 of its 11 disciplines have nothing to look up and the field stays blank; Electrical and Mechanical should still get a value.** Suggests adding SIN02's disciplines to the table and asking Joshua Rees. **This confirms H1** (Ilia's read of the project; not re-measured here). H2 stays dead.
- `115971` Yash, 10-20 10:22: has asked Joshua for an updated rework file; will provide it when it arrives.

**Supersedes the 10-13 draft to Yash** (asking for SIN02's exact discipline and package names): Ilia already has them. The 10-13 point about asking for the whole discipline, not one cell, is still the one open risk: Yash's ask to Joshua is "an updated rework file", which does not say it must cover every one of the 9 disciplines and their packages for Categories 1 to 4. If it comes back partial, the field stays blank for the rest (PLT-3061's lesson).
Ball: Joshua, via Yash, since 10-20 (11 days since the first ask on 10-09). After the file arrives, Darminder edits `rework_reference.json` and it ships with a release (not verified that a release is scheduled; 26.4.1 is unreleased).
Sibling PLT-3300 (ML9) waits on the same file. Class 1, parked. No Jira action was taken.

---

## 2026-10-23 run: unchanged on Jira; one code note (additive)

Jira stamp unchanged, not re-fetched. hc-frontend #2372 (`c73f491`, 10-22, PLT-2561) removed the 2-decimal rounding inside `use-rework-cost-calculation.ts` (about :105-135) so the calculated cost is now unrounded (`600 x 1.14` is `683.9999999999999`). It is harmless to what users see: the auto-fill writes `calculatedCost.toFixed(2)` (`issue-cost-field.tsx:55-62`) and the "suggest" comparison now compares `toFixed(2)` strings (`:68`). Does not change this ticket's hypotheses. Not released yet (no tag). No Jira action was taken.
