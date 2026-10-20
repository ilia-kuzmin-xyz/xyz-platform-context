# PLT-3299 — recommended action (DRAFT ONLY, nothing posted) — 2026-10-20

**Action class: 1 with a class 4 half.** Mostafa owes one product answer (asked 10-19 11:33, one working day, so not yet chaseable; chase on 10-21 if silent). The decision itself is class 4:
today a Void issue counts toward the category total and its rework cost but not toward "open", which makes the two columns disagree. Stay **With Customer** only if Yash really told the customer
something on 10-19; if not, the honest status is **In Analysis** (Darminder, Yash) because the open item is internal. Not Ready for Dev (no decision yet), not Blocked.

**Assumption, one line:** that the three issues are Void and carry the cost. Screenshots are unopenable here, so this is Darminder's reading plus the code, not something seen.

## Draft 1: reply on PLT-3299, author Ilia, @Mostafa (42 words)

> Mostafa, Yash's question above needs a clearer ask. The dashboard currently adds Void quality issues into a category's total and rework cost, but not into its open count. **Should Void issues be left out of the dashboard's issue totals and rework cost?**

## Draft 2: reply, author Ilia, @Yash (29 words). The cheap falsifier; send before anything goes to the customer

> Yash, before we answer the customer I need to see the three Category 5 issues. **Can you tell me the status and cost each one shows in the viewer?**

Why this and not an explanation: the stale auto-fill route (context.md, point 3) is verified in code but not on this project, and a Void issue is locked, so telling the customer
"edit them to 0" could be wrong. Status plus cost per issue settles Void vs not, typed vs carried over, and whether Draft 1 is even the right question, in one reply.

## Not for the message

- Darminder already offered to change the Void handling; that change is small (one predicate in `quality-sql-queries.ts:15-24`) but is not worth building before Mostafa answers.
- Do not tell the customer Void will be excluded until product says so.
- If product says exclude Void: the same predicate also changes `issueCount`, `closedIssues` and trend counts, so the overview and trend need the same treatment; one change, one test.
