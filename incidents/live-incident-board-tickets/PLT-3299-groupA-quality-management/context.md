# PLT-3299 — "LVN BL1-2 - CAT 5 REWORK COST ERROR" — triage context

First folder for this ticket (2026-10-20 scheduled run). The 10-19 run saw it as *With Technical Support* (out of scope) and only named it in passing in
`recurring-defect-patterns.md` (2026-10-19 Pattern 6 amendment, point 3). It is now **With Customer**, so it is in scope. Group A, domain **quality-management**.
Related to Pattern 6 only on the surface (same screen); the cause here is different.

## Ticket (fetched live 2026-10-20, 6 comments, newest `115882`)

- Jira: https://xyzreality.atlassian.net/browse/PLT-3299. Live Incident, Major, created 10-16 14:27, assignee **Yash**, reporter Yash. Freshdesk 8325.
  Status moved to **With Customer** on 10-19 11:35 (Freshdesk *Waiting on customer*). Project LVN BL1-2.
- Customer: the CAT 5 group on the Dashboard shows **6.12k rework cost**, "I thought the rework cost should be 0 for all CAT 5's?"
- `115606` Yash to Darminder, adds a second symptom: the category list shows **0 open issues for CAT 5, while the QA list shows 3 open issues**.
- `115642` Darminder (10-16 17:58): the project has issues with rework cost applied to Category 5, which is where the total comes from; "the user may have added in themselves".
  Lists five issues by name (three `CAT5`, two `CAT 4` in the name) with screenshots.
- `115643` Darminder: the **3 open include 'Void' issues**; offers an update so they are not included "if that is required".
- `115880` Yash (10-19 11:33): thanks; "if an issue is void it technically shouldn't show it as void" (garbled), asks **@Mostafa** for his thoughts. Not answered.
- `115882` Freshdesk back to *Waiting on customer*.
- **Who waits on whom:** Mostafa owes a product answer since 10-19 11:33 (about one day). The customer may or may not have been told anything (Freshdesk text is not visible
  in Jira). The status "With Customer" is therefore only half true: the open item is internal.

## Unopenable media (403, not retried per the 09-08 rule)

- Jira attachments `66491` (customer's screenshot, Yash), `66504`, `66505`, `66506`, `66507`, `66508` (Darminder's five issue screenshots), plus the Freshdesk link
  `.../attachments/103357050614`. **They would settle:** which three issues the customer means by "3 open", their statuses (Void or not), and whether the 6.12k is those
  three issues or others. Nothing in this folder depends on them being read, but the identification of the three issues does.

## What the code does (hc-frontend `d69968e`, master + session branch, 2026-10-19 21:32)

Verified by reading; nothing measured on the project.

1. **The dashboard counts Void issues in totals and cost, and not as open.** `quality-sql-queries.ts:15-24` builds the base filter as `issueStatusCode != 'DRAFT'` and `typeName = 'Quality'`;
   nothing excludes `VOID`. The category row query (`:125-140`) returns `COUNT(*)` as `issueCount`, `openCount` as `issueStatusCode = 'OPEN'` only, and `totalCost` summed over **every** non-draft row.
   So a Void issue adds to the category's total and to its cost, and never to its open count. This is consistent with Darminder's reading that the three are Void and with "0 open" on the dashboard.
   The UI row reads `issueCount` as total and `openCount` as open (`quality-overview.tsx:98-100`); the headline cost is `totalCost` (`quality-overview.tsx:256`).
2. **The viewer's issue list is consistent with that.** The open count there is `status === 'OPEN'` (case-insensitive, `issues-panel.tsx:252`), so Void is not open there either.
   That means the customer's "QA list shows 3 open" is **not** reproduced by this code reading: either the three are listed (total, not open) or they are not Void. Inferred, not verified.
3. **Why CAT 5 can hold a cost at all.** The auto-suggestion returns **0** for `Category 5` (`use-rework-cost-calculation.ts:62-73`), so a value of 6.12k was not auto-suggested *as CAT 5*.
   Two ways it gets there: typed by hand (Darminder's guess), or **filled while the issue was another category and kept after re-categorising**. The auto-fill effect only writes when the cost field is empty
   (`issue-cost-field.tsx:55-62`: returns if `dirtyFields.cost` or a non-empty value), and the field is disabled only for `VOID`/`CLOSED` (`issue-form.tsx:96`). Two of the five issues Darminder listed carry
   `CAT 4` in their names, which fits the re-categorise route, but issue names are free text. **Not verified that this happened.**
4. **Void is editable-locked after the fact.** A Void issue cannot be edited (`issue-form.tsx:96`), so the cost on a voided issue is frozen at whatever it was when voided.

## Verified vs inferred

Verified: ticket text and comment order; the SQL predicate and aggregates; the CAT 5 zero rule; the auto-fill-only-when-empty behaviour; the disabled-for-void rule.
Inferred: that the three issues are Void; that the 6.12k is those three; whether stale auto-fill played a part; what the customer has been told.

## Killed / not applicable

- Not Pattern 6 (reference-table coverage): the table returns 0 for CAT 5 by rule, so the table is not the source.
- Not a calculation bug: the dashboard faithfully sums what the issues carry (Pattern 2).

## What remains unverified

- The statuses and costs of the three CAT 5 issues (screenshots 403). One person with the viewer can read them in a minute.
- Whether the customer's "3 open" is a total or an open count.
- Whether product wants Void in dashboard totals. This is the real decision and it is Mostafa's.
- What Yash told the customer on 10-19 (Freshdesk side).

No Jira action was taken.

---

## 2026-10-23 run: unchanged on Jira; one code note (additive)

Jira stamp unchanged, not re-fetched. hc-frontend #2372 (`c73f491`, 10-22, PLT-2561) removed the 2-decimal rounding inside `use-rework-cost-calculation.ts` (about :105-135) so the calculated cost is now unrounded (`600 x 1.14` is `683.9999999999999`). It is harmless to what users see: the auto-fill writes `calculatedCost.toFixed(2)` (`issue-cost-field.tsx:55-62`) and the "suggest" comparison now compares `toFixed(2)` strings (`:68`). Does not change this ticket's hypotheses. Not released yet (no tag). No Jira action was taken.
