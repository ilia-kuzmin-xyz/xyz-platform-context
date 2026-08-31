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

---

## 2026-08-20 — the 08-19 draft is SUPERSEDED; do not post it. New draft below, to product.

**Why superseded.** The 08-19 draft asked Darminder to pull issue #1125's Discipline and Package values
directly instead of waiting on the customer's video. **He did exactly that, unprompted, on 08-19 at 19:48**
(comment 109980): Category 2, Discipline `CSA-TCB`, Package `Underground Services`. Posting the 08-19 draft
now would ask for work already delivered. It stays in this file above as the record of what was recommended
and why; it is simply no longer the action.

**What the answer turned out to be.** The 08-19 hypothesis was right: `CSA-TCB` appears nowhere in
`rework_reference.json`, which carries exactly three Discipline strings (`CSA`, `Electrical`, `Mechanical`)
across its 90 rows. Rule 3 total miss, `cost: null`, blank field plus the "mapping data is missing" helper
text. Full verification in `context.md` (2026-08-20 section).

## Chosen action: (a) resolve through communication — one supporting message to Mostafa and Pietro, then this becomes a product/data change, not a dev ticket

Darminder has already asked them the right question. He asked it about **one cell** though, and the answer
they give to that question will not fix the customer's problem. The single highest-value contribution left
is to widen the ask before they answer it, and to correct one factual detail in his comment so product
isn't reasoning from "we return 0".

**Why not (b) Ready For Development.** There is no code defect. The calculation faithfully implements the
documented ladder; the table has no row. The only code-shaped option (aliasing `CSA-TCB` to `CSA`) is
downstream of a product decision that hasn't been taken.

**Why not (c) With Technical Support.** Nothing further is needed from the customer. Everything required to
decide is now in the ticket.

**Why not (d) Blocked.** The owners are named, engaged and tagged as of last night. Under 24 hours of
silence is not a stall.

### Draft comment — addressed to Mostafa and Pietro, DRAFT ONLY, nothing posted by this run

> Mostafa, Pietro, one thing worth widening before you answer Darminder's question above. The combination
> he listed is not a one off gap. CSA-TCB does not appear anywhere in the rework reference table, which only
> has three disciplines in it, CSA, Electrical and Mechanical. So it is not just Category 2 on Underground
> Services that comes back empty, it is every category and every package on that discipline, and it has been
> failing that way for this client all along rather than starting recently.
>
> Small correction to the note above as well, since it changes how this reads. We do not return zero, we
> return nothing at all and leave the cost box empty with a message telling the user to set a value. That is
> the better outcome of the two, because a zero would have quietly understated their QA totals.
>
> The thing that makes this odd is that ML9 already uses plain CSA elsewhere, and that one does resolve.
> That is the same discipline and the same Underground Services package behind PLT-2815 back in June. So
> CSA-TCB looks like a second naming variant the project has introduced rather than a new trade.
>
> My take is to add a full set of CSA-TCB rows now, one per category at minimum, so the client is unblocked
> for Friday, and separately decide whether variants like this should map onto their parent discipline
> automatically. The matching today is an exact text comparison, so anything a project names slightly
> differently will keep landing here. Happy to be overruled if you would rather CSA-TCB carry its own
> distinct numbers.
>
> Is CSA-TCB meant to cost the same as CSA, or does it need its own figures?

One question at the end, one decision, two owners who share the table. Prose, no headings, no bullets, no
long dashes in the sent text, per the playbook's "decision requests to product" shape: context, cause in
plain language, the correction, a recommendation rather than an open question, and a line inviting
disagreement.

### If product answers "same as CSA"

That is the alias route and it needs a small dev ticket (`use-rework-cost-calculation.ts:101-104`, `:126-128`
are the plain `===` comparisons). Worth raising jointly with the standing normalization risk already logged
under Pattern 6.

### If product answers "its own figures"

Pure data change to `rework_reference.json` plus the Confluence source page (id 1630633988, owned by Pietro).
No dev work. Ask for a generic blank-Package row per Category as the floor, so the fallback ladder has
something to land on for packages nobody enumerates.

### Coordination note

Worth folding **PLT-2815's** long-standing open question into the same conversation while Mostafa and Pietro
are actually engaged on this table — see that ticket's `recommended-action.md` §3. Two questions about one
table, one thread, rather than a second thread nobody opens.

**No Jira action was taken by this run.**

## 2026-08-21 — draft above still unposted, now past 24h silent; strengthen with the customer's own words

**Nothing to change in substance.** The 2026-08-20 draft to Mostafa and Pietro is still correct and still
the right message. What changed is the evidence behind it: the customer independently told Yash (110058)
that their project split the "CSA" discipline into "CSA - TCB" and "CSA - KGE" for their two main
contractors — the exact naming-variant mechanism the draft already guesses at from the code side. Worth
adding one sentence to the draft citing this, since it turns "looks like a naming variant" into "the
customer confirms it is a naming variant," which makes the recommendation harder to argue with.

**Also worth adding to the question:** the customer's message names a second variant, `CSA-KGE`, not yet
checked against `rework_reference.json` this run. If it is Group A's second contractor entity, it almost
certainly has the identical gap (same three-Discipline-string table), so the decision request to product
should cover both `CSA-TCB` and `CSA-KGE` in one pass rather than requiring a third round when `CSA-KGE`
surfaces on its own ticket later.

**Escalation note, not yet action:** Darminder's tag of Mostafa and Pietro (109980) is now ~36 hours
unanswered — past the 24h threshold this file used yesterday to say "not yet a stall." Not recommending a
Jira transition yet (a day and a half on a non-urgent-looking decision request is not unusual for this
team), but flagging it since the customer has a stated Friday-morning weekly deadline for this data.

**No Jira action was taken by this run.**

## 2026-08-24 — supersedes the 08-20 draft: ask for eight values, not one

The 08-20 draft to Mostafa and Pietro is **still unposted and now understates the ask.** It asks
for a cost for `Category 2 / CSA-TCB / Underground Services`. This run confirmed `CSA-KGE` misses
identically, so the real gap is both contractor variants at all four priced categories. Do not post
the 08-20 version; post this instead.

### Draft comment to Mostafa and Pietro (NOT posted)

> Mostafa, Pietro — following Darminder's question on the 19th, the gap is wider than the one
> combination. ML9 split its CSA discipline into CSA - TCB and CSA - KGE per contractor, and the
> rework reference table carries only CSA, Electrical and Mechanical. So neither variant returns a
> cost at any category or any package, not just Category 2. The field is left blank rather than
> showing zero, which is the safer of the two, but it means nothing auto-populates for either
> contractor.
>
> The smallest fix is eight rows: CSA - TCB and CSA - KGE, at Categories 1 to 4, with a blank
> package so they cover every package the way the existing disciplines do. Can you give me those
> eight values, or tell me they should simply inherit CSA's numbers?
>
> The customer needs this by Friday mornings for their QA report, and Joshua is filling it in by
> hand each week until it lands.

One question, one decision, one owner pair. If they say "inherit CSA", that is the alias option and
becomes a small code change instead of a data change — worth naming as tech debt either way, since
the next project to invent a discipline name hits this again.

### Action on the board

Leave in `Open`. This is not blocked in the Jira sense — it is waiting on a product answer that has
been asked for and not given. If there is still no reply by 08-26 (a week), it is worth raising in
whatever channel Mostafa reads rather than a fourth Jira comment.

## 2026-08-26 — the 08-26 threshold named on 08-24 has now arrived; still unposted, 7 days

The 08-24 draft above is unchanged and is the message to send. The "if no reply by 08-26" condition
that draft itself named has now been reached: Darminder's tag of Mostafa and Pietro (109980) is
**7 days** unanswered, and the customer's weekly Friday deadline has now passed at least once since
the decision request was posted. This is the point at which the 08-24 note's fallback ("raise it in
whatever channel Mostafa reads rather than a fourth Jira comment") becomes the live recommendation
rather than a contingency. No Jira action was taken by this run.

## 2026-08-27 — superseded: Yash escalated himself same-day; stand down on posting the 08-24/08-26 draft as-is

The above "escalate outside Jira" recommendation is overtaken by events (see `context.md` 08-27
entry): Yash pinged Pietro/Mostafa/Darminder on 08-26 09:29, got a same-morning reply from Mostafa
("Josh is on leave"), and took ownership of following up with Josh directly rather than waiting on
product. **Do not post the standing 8-row decision-request draft to Mostafa/Pietro right now** —
it would land on people who already said the actual decision-maker is unavailable, reads as not
having read the thread, and Yash has already claimed the follow-up.

**New recommended action:** nothing to post today. The one useful thing a human could do is a
light, dated check-in — not on Jira, since that reopens the same "any update?" loop that already
got a non-answer — but a private nudge to Yash in ~1 week (around 2026-09-02) asking whether Josh is
back and whether the 8 values (or the inherit-from-CSA answer) have surfaced, since Yash owns the
next step now and there is no visible timer on it otherwise. If Josh is back and still silent by
then, *that* is when the Mostafa/Pietro escalation draft becomes live again — keep it on file
unchanged, it does not need rewriting.

**Verdict: stay `Open`, no Jira comment this run.** The underlying data gap (8 rows: CSA-TCB /
CSA-KGE × Categories 1-4) is still open and still the actual blocker; only who is chasing it changed.

## 2026-08-31 — the 08-27 check-in window has arrived; still no Jira comment

The 08-27 entry above stands unchanged and is still the recommendation: **do not post the standing
8-row decision-request draft to Mostafa/Pietro.** They already answered that the decision-maker is
unavailable, and Yash has claimed the follow-up.

What is new is only timing. The 08-27 note put the check-in at "around 2026-09-02"; that is now two
days out and nothing has arrived early (`context.md` 2026-08-31 — Jira byte-identical since 08-26).
So the single useful human action is the private, off-Jira nudge to Yash, and it should be diarised
for 09-02 rather than left open-ended.

Suggested wording for that nudge — a direct message to Yash, **not** a Jira comment:

> Is Josh back yet? If he is, PLT-3061 needs eight rework-cost figures from him, not one — CSA-TCB
> and CSA-KGE across all four categories, otherwise we fix the one cell the customer named and leave
> the rest of the discipline broken. **Can you get all eight in one go?**

If Josh is back and this is still silent a few days later, *that* is when the 08-24 escalation draft
to Mostafa/Pietro becomes live again. Keep it on file unchanged; it does not need rewriting.

**No Jira action was taken by this run.** Ticket stays `Open`.
