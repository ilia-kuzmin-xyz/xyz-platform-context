# PLT-3061 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a)-adjacent — a clarification-to-self step for Darminder, not another customer round-trip

The single missing fact (issue #1125's exact Discipline/Package strings) is something Darminder can
most likely pull directly from the issue record rather than parsing a video or waiting on another
customer round-trip. Not yet ready for a straight dev fix — need to confirm the coverage-gap
hypothesis first — and not something that needs the customer again either.

**Why not (c) With Technical Support:** the missing fact is retrievable internally (the issue's own
Discipline/Package fields); no need to go back to the customer for it.

**Why not (b) Ready For Development yet:** if this is a reference-table coverage gap (matching
PLT-2815's shape), the fix is a Mostafa/Pietro product/data decision (which row(s) to add), not a
code change — premature to hand to dev before confirming which discipline is actually missing.

### Draft comment (addressed to Darminder Atker) — playbook style, DRAFT ONLY

> Before waiting on more video or customer replies, it would be faster to pull the exact Discipline
> and Package values stored against ML9 issue #1125 directly from the issue record and check those
> two strings against rework_reference.json. Reading through use-rework-cost-calculation.ts, the
> "mapping data missing" message only fires when Category and Discipline both resolve but nothing
> matches at Category and Discipline even at the generic blank-Package fallback, and the table only
> has rows for CSA, Electrical and Mechanical as Disciplines. Category 2 itself is fine and has a
> generic fallback row for all three of those, which lines up with your own test working, so the
> missing piece is very likely that whatever Discipline is tagged on issue 1125 isn't one of those
> three strings at all — which would mean it fails the same way for every category, not just CAT2. If
> that checks out this is the same reference-table coverage problem PLT-2815 hit, just landing on a
> total miss instead of a mismatched fallback, and it would need Mostafa and Pietro to decide what row
> to add rather than a code change on our side.

One step, one owner, answerable by pulling one record. No headings, no bullets, no long dashes in the
actual sent message.

### If the hypothesis confirms

Route to Mostafa/Pietro (same owners as PLT-2815's reference-table decisions) with the specific
missing Discipline named — a product/data addition to the Confluence-sourced reference table, not a
dev ticket. Consider handling both PLT-2815 and PLT-3061 in the same product conversation, since
they're the same table.
