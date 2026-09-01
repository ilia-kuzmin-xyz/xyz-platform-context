# PLT-3061 — "CAT2 Rework cost not auto populating" — triage context

## 2026-09-01 — confirmed unchanged, delta-checked against live Jira

Status still **Open**, assignee Darminder. Last comment still 110427 (Yash, 08-26, "will talk to
him [Josh] directly and get this sorted when he is back" — Josh, the cost manager who owns the
reference-table values, was on leave per Mostafa's 110425). No update since; this is now waiting
on Josh's return, which is an external dependency Yash is tracking directly, not something this
run can move. Root cause (missing `CSA-TCB`/`CSA-KGE` discipline rows in `rework_reference.json`,
Pattern 6 in `recurring-defect-patterns.md`) remains confirmed and unchanged.

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3061
- **Status:** Open · **Priority:** Medium
- **Reporter/relay:** Yash Patel · **Assignee:** Darminder Atker
- **Created:** 2026-08-17 16:04 · **Project:** ML9 · **Domain slug:** `quality-management`
- **Related ticket, same subsystem:** `PLT-2815-groupA-quality-management/` (read first — this is the
  same rework-cost-by-category lookup, different failure shape)

New folder this run — first investigation of this ticket.

## 1. The report (verbatim description, relayed by Yash)

> "I am writing to report an ongoing issue regarding the calculation of rework costs for CAT2 issues:
> Currently, the rework cost is never calculated automatically, so we have to request manual updates
> to Joshua Rees for each CAT2 issue to ensure the values are accurate and reflect the actual scope of
> the work, and this is very uncomfortable for both parties. ... We usually need updated rework cost
> data on a weekly basis, specifically by Friday mornings, to finalize our QA reports for the client."

## 2. Comments (3, chronological)

1. **Yash Patel, 08-17 16:06** — relays the report, asks Darminder to investigate, notes "have asked
   for a video."
2. **Darminder Atker, 08-17 16:58** — asks Yash what **Package** and **Discipline** the affected
   issue(s) use; states he personally tested and "it works with category 2" (screenshot attached, not
   opened this run); tags **Mostafa** and **Pietro** as a heads-up: "it might be values that we don't
   have set in the reference table to give a cost." **Already the correct working hypothesis, stated
   before any code was read.**
3. **Yash Patel, 08-18 10:16** — posts the customer's reproduction video for **CAT2 issue #1125 on
   ML9**: the auto rework-cost calculation didn't run, and "an error message indicates that mapping
   data is missing." Asks if planner intervention is needed.

**Who's waiting on whom:** Darminder's 08-17 16:58 question (exact Package/Discipline on the affected
issue) is the actual blocker on diagnosis and has not been explicitly answered in text — the 08-18
video is a repro, not the field values themselves. Mostafa/Pietro were pinged informationally, not yet
asked a specific question.

## 3. Verified findings — same code, same file as PLT-2815

- `use-rework-cost-calculation.ts` — same static shipped JSON lookup (`../rework_reference.json`,
  `:5`), matched by Category+Discipline+Package with a two-step fallback ladder, then FX-converted
  (`GBP_CONVERSION_FACTORS`, `:18-23`).
- **Rule 1** (`:94-121`): exact Category+Discipline+Package match.
- **Rule 2** (`:123-144`): fallback to Category+Discipline, `Package === ''`.
- **Rule 3** (`:146-154`): no match on either → `cost: null`.
- **The exact error text is in the code:** `getEstimatedReworkCostHelperText` (`:171-204`), line
  `:203`: `'Model is missing mapping data needed to auto-generate a rework cost. Please set a
  value.'` — fires only when `hasCategory && hasDiscipline` are both true but no cost was found, i.e.
  only reachable via **Rule 3**. Near-verbatim match to Yash's "mapping data is missing" description —
  confirms the UI behaves exactly as coded (a designed empty state, not a crash) and confirms this is
  a **Rule 3 total miss**, not a Rule 2 wrong-fallback (which is what PLT-2815 was).
- **CAT2 is NOT globally absent from the table.** 13 `"Category 2"` rows exist, including generic
  (blank-package) fallback rows for all three disciplines present: `Category 2 | CSA | "" | 7871.72`
  (`:81`), `Category 2 | Electrical | "" | 5073.65` (`:85`), `Category 2 | Mechanical | "" | 5053.01`
  (`:89`). Darminder's "it works with category 2" is consistent with a manual test using one of these
  three disciplines.
- **The reference table covers exactly three Discipline strings, full stop: `CSA`, `Electrical`,
  `Mechanical`** (every row read, `:2-91`). No fourth discipline exists at any category.
- Discipline/Package values are per-project, dynamic, plain `===` string match with no normalization
  (`use-category-mapping.ts:39-40`, `CategoryMappingService`; `:101-104`/`:126-128` in the calc file)
  — whatever Discipline/Package name ML9's own schedule data uses, matched literally against the
  three hard-coded names.

## 4. Hypothesis — falsifiable, not yet confirmed against issue #1125's actual data

**Prediction:** issue #1125 carries a Discipline value that is not literally `CSA`, `Electrical` or
`Mechanical` — a different trade name, different casing, or an ML9-specific taxonomy string — so no
row matches at any Category, Rule 2's generic fallback also misses, and the code correctly falls
through to Rule 3 (`null`). If true, this would fail identically for CAT1/3/4 on the same Discipline,
not just CAT2 — the customer just happens to need CAT2 issues, so that's the surface they see.

**One-step falsification:** pull the exact Discipline (and Package) string stored on issue #1125 and
check it against `rework_reference.json`. Zero rows at any Category → hypothesis confirmed, pure
reference-table coverage gap. Discipline matches but Package doesn't → narrower, closer to a
PLT-2815-style single-cell gap. Neither confirmed this run — video/screenshot weren't
machine-readable in this pass.

## 5. Relationship to PLT-2815 — same subsystem, different failure mode

Both are "the calculation faithfully implements a fixed, product-owned lookup table with coverage
gaps," not code defects. **PLT-2815:** both categories resolved to *some* value via different rules,
producing an inverted-but-arithmetically-correct pair (a granularity gap — package-specific row exists
for one category, not the sibling). **PLT-3061:** no value at all — Rule 3, `null` — pending
confirmation, most likely a coarser gap (the Discipline itself missing from the table, not just one
cell). **Promoted to `recurring-defect-patterns.md` this run as a new pattern** (two confirmed
occurrences: PLT-2815 + PLT-3061) — see that file.

## 6. Flags

- **Joshua Rees** is not on the standard team-role list. Cross-referencing PLT-2815 (which names
  "Josh from customer success" as the reference-table escalation contact) strongly suggests this is
  the same internal Customer Success person, currently doing by hand what this automation should do —
  worth confirming, not treated as external.
- `dashboard/qlt-quality.md` / `dashboard/quality-tab.md` still document nothing about rework-cost
  calculation (same gap PLT-2815 already flagged).

## What remains UNVERIFIED

- Issue #1125's actual Discipline/Package strings (the one fact that settles the hypothesis).
- Whether the miss is Discipline-wide or Package-specific.
- Screenshot (`image-20260817-155738.png`) and video (`Video Project 2.mp4`) — not opened/transcribed
  this run (binary media).

## Recommended action

See `recommended-action.md`.

## 2026-08-20 — HYPOTHESIS CONFIRMED: the Discipline is `CSA-TCB`, which is not in the reference table

**Live fetch:** status `Open`, priority Medium, assignee Darminder, `updated = 2026-08-19T19:49:02+01:00`,
**4 comments (was 3)**. One new comment since the 08-19 run.

### The new comment — 109980, Darminder Atker, 08-19 19:48 (edited 19:49), to Mostafa + Pietro, cc Yash

Verbatim substance: *"could you advise what the cost should be for what the user has entered: Category 2,
Discipline: CSA-TCB, Package: Underground Services. This is not covered in the rework cost json so I think
we need to update the file with new combinations and cost? This is why the user is getting 0 returned."*
Screenshot of the current table attached (not opened — see below).

**Darminder independently did exactly what the 08-19 run's draft asked for** (pull the Discipline/Package
values off the issue record rather than wait on the customer's video), and posted the result. The 08-19
drafted comment to Darminder is therefore **superseded and must not be posted** — it would ask for
something already delivered. Pointer kept: see the 08-19 section of `recommended-action.md`.

### The 08-19 prediction was correct, and is now code-confirmed

§4 of this file predicted: *"issue #1125 carries a Discipline value that is not literally `CSA`,
`Electrical` or `Mechanical`... so no row matches at any Category... falls through to Rule 3 (`null`)...
this would fail identically for CAT1/3/4 on the same Discipline, not just CAT2."*

Verified against the current checkout this run:
- `rework_reference.json` contains **90 rows and exactly three Discipline strings** — `CSA`, `Electrical`,
  `Mechanical`. **Zero occurrences of the substring `TCB` anywhere in the file.** So `CSA-TCB` matches
  nothing at any Category and at any Package, including the blank-Package generic fallback rows.
- Therefore Rule 1 (`use-rework-cost-calculation.ts:93-121`) misses, Rule 2 (`:123-144`) misses, and
  execution reaches Rule 3 (`:146-154`).
- **Scope is Discipline-wide, not CAT2-specific — confirmed.** Nothing in the lookup is category-first;
  every rule filters on Discipline name too. Any issue on ML9 tagged `CSA-TCB` fails identically at
  Category 1, 2, 3 and 4. CAT2 is simply the category this customer needs weekly for their QA report.

### Correction to Darminder's comment: the code returns **null (blank field)**, not `0`

Worth getting right before product acts on it, because "0" and "blank" imply different fixes and
different reporting risk.

- Rule 3 returns `cost: null` (`use-rework-cost-calculation.ts:146-154`), not `0`.
- The only `cost: 0` paths are Category 5 (`:66`) and **discipline-not-found-as-a-project-category**
  (`:79-81`). The latter does not apply here: `CSA-TCB` *is* a valid project category on ML9 (the user
  selected it in the form), so `disciplineCategory` resolves and `disciplineName = 'CSA-TCB'` (`:91`).
- With `calculatedCost === null`, `issue-cost-field.tsx` **skips auto-population entirely** (the effect
  returns early on `calculatedCost === null`), so the field is left **empty**, and
  `getEstimatedReworkCostHelperText` falls to its last branch (`:203`): *"Model is missing mapping data
  needed to auto-generate a rework cost. Please set a value."*
- This matches the customer's reported symptom exactly ("an error message indicates that mapping data is
  missing") and **is the safer of the two behaviours** — a blank field cannot silently understate a QA
  report the way a spurious `0` would. No data-integrity incident on top of the coverage gap.

### New and materially important: ML9 has BOTH `CSA` and `CSA-TCB`, on the same Package

PLT-2815 (same project ML9, same Package `Underground Services`) resolved fine through Discipline `CSA` —
that is where the `Cat3 | CSA | Underground Services | £600.00` row (`rework_reference.json:67`) came from.
So ML9's category config carries **two** CSA-flavoured discipline names, one covered and one not. `CSA-TCB`
reads as a project-side naming variant or a subcontractor/work-package suffix rather than a genuinely new
trade.

**Consequence for the fix, and this is the part that changes the ask:** adding a single
`Category 2 | CSA-TCB | Underground Services` row would answer Darminder's literal question and still
leave CAT1/3/4 on that discipline broken, plus every other Package under `CSA-TCB`. The decision product
actually needs to take is at **Discipline level**, and there are two shapes:
1. **Add a full `CSA-TCB` block** to the reference table (a generic blank-Package row per Category at
   minimum, plus any package-specific rows they want) — pure data, no code change, but it recurs the next
   time any project invents a discipline name.
2. **Treat `CSA-TCB` as an alias of `CSA`** — cheaper conceptually and fixes all four categories at once,
   but requires a code change (the matcher is plain `===` with no normalization,
   `use-rework-cost-calculation.ts:101-104`, `:126-128`) plus a decision about where aliases live.

Option 1 is product-only and can ship today; option 2 is the structural fix for Pattern 6's standing risk.
They are not exclusive — 1 now, 2 as tech debt, is a defensible answer.

### Status of the ticket

Still `Open`, still Group A, but the blocker has moved: it is no longer "we don't know the values", it is
**"product must decide what CSA-TCB is worth"**. Owners are Mostafa and Pietro, already tagged by Darminder
in 109980. Nobody has replied to him yet (posted 19:48 the previous evening, so silence is not yet
meaningful — under 24 hours).

### Attachment gap this run

- ⚠️ Screenshot on comment 109980 (Darminder's view of "what we currently have", inline `blob:` media) —
  **not opened**, no tool to fetch authenticated Jira media. It would only show the reference table's
  current contents, which this run read directly from `rework_reference.json` in the repo, so nothing
  load-bearing is missing.
- ⚠️ Still unopened from prior runs: `image-20260817-155738.png` (Darminder's passing CAT2 test) and
  `Video Project 2.mp4` (customer repro). Both now moot — the field values they would have shown are
  stated in text in 109980.

**Confidence: 9/10** on the mechanism (both halves now verified in code against the actual reported
Discipline string; the residual 1 point is that I have not personally inspected ML9's category config to
confirm `CSA-TCB` is spelled exactly that way in the project data rather than in Darminder's typing).

## 2026-08-21 — customer independently confirms the mechanism; decision request now past 24h silent

**New comment since the 08-20 run: 110058 (2026-08-20 13:33), Yash relaying the customer.** The customer
discussed the issue with Dario, investigated with Joshua, and concluded: *"the missing automatic
calculation of the rework cost is due to how the 'CSA' discipline is currently set up in our project. This
discipline has always been a single entry, but it is now split into 'CSA - TCB' and 'CSA - KGE' (the two
main contractors). This split is not reflected in the table for the automatic rework cost calculation."*

This is the customer independently arriving at the same conclusion the 08-20 draft to Mostafa/Pietro
already stated (naming variant of an existing trade, not a new one) — it removes the residual doubt noted
above about whether `CSA-TCB` is spelled that way by project convention: it now is, confirmed from the
customer's own side, and a second variant (`CSA-KGE`) is now named that this run has not yet checked
against `rework_reference.json`. **Confidence raised to 9.5/10; the one remaining gap is `CSA-KGE`
coverage, not yet checked this run — same three-Discipline-string table, so it almost certainly misses the
same way, but not verified.**

**Silence status: Darminder's decision request (109980, tagging Mostafa and Pietro) was posted 2026-08-19
19:48. As of this run it has stood unanswered for approximately 36 hours** — past the 24-hour threshold the
08-20 run flagged as "not yet a stall." No comment from Mostafa or Pietro on this ticket. **The 08-20 draft
to Mostafa and Pietro (`recommended-action.md`, 2026-08-20 section) was never posted by this routine** —
still draft only, still accurate, and now stronger: the customer's own explanation can be added as
corroboration in the same message.

## 2026-08-24 — CSA-KGE confirmed to miss identically; diagnostic branch pushed

Requested pass over the ticket, not the scheduled sweep. Jira re-fetched: status `Open`, priority
Medium, assignee Darminder, **6 comments** (was 6 on 08-21), newest still 110058 (Yash relaying the
customer, 08-20 13:33). No reply from Mostafa or Pietro. **Darminder's decision request (109980,
08-19 19:48) has now stood unanswered for 5 days.**

### The one gap the 08-21 entry left open is now closed

That entry flagged `CSA-KGE` as named by the customer but unchecked. Checked this run against
`rework_reference.json` in the current checkout:

- 90 rows, exactly three Discipline strings — `CSA` (32 rows), `Electrical` (27), `Mechanical` (31).
- **Zero occurrences of `TCB`. Zero occurrences of `KGE`.**

So both halves of ML9's split miss at every category and every package, and the blast radius is
**8 combinations, not 1**: `CSA-TCB` and `CSA-KGE` × Categories 1-4. (Category 5 short-circuits to 0
before the lookup, `use-rework-cost-calculation.ts:64-73`, and the table prices only Categories 1-4.)
Confidence on the mechanism now 10/10 — nothing is inferred.

**This sharpens the ask to Mostafa and Pietro.** The 08-20 draft asks for a cost for one triple.
The right ask is eight, or a rule. Adding a single `Category 2 | CSA-TCB | Underground Services` row
answers Darminder's literal question and leaves seven holes.

### Verified about the table's structure, which bounds what "just add rows" costs

Every discipline currently has a blank-Package fallback row at every category it prices — no
exceptions, checked programmatically. That matters because Rule 2
(`use-rework-cost-calculation.ts:123-144`) depends on it: without a generic row, an unlisted package
falls straight through to Rule 3 and returns null. **So the minimum viable data fix is 8 rows** (two
disciplines × four categories, blank package), not 8 package-specific ones. That is small enough
that option 1 (pure data) is clearly the thing to do now, with the alias question (option 2) carried
as tech debt rather than blocking.

### Branch

`PLT-3061-rework-cost-discipline-coverage` (hc-frontend, off `origin/master`), **not raised as a
PR.** It does not touch the costs — that is product's. It does two things:

- Rule 3 now logs the exact triple it failed on and whether the discipline is absent from the table
  entirely. Establishing that ML9's value was `CSA-TCB` took two days through support; next time it
  is one line in the console. (`use-rework-cost-calculation.ts`, Rule 3.)
- A new `rework_reference.test.ts` pins the table's shape: the three disciplines, a blank-package
  fallback wherever a discipline is priced at a category, no duplicate combinations, every cost
  finite. Prices stay untested so product can edit freely; adding or dropping a discipline becomes
  deliberate. All four assertions hold against the file as it stands.

Package-name resolution was hoisted out of Rule 1 to make it available to the log. Kept as
`!== undefined` rather than a truthiness check so a category named with the empty string still
matches the generic rows exactly as before — behaviour-preserving.

**Not built or run.** `npm ci` fails on `@xyzreality/dhtmlx-gantt` (401).

### Category

**Stale, unresponded — needs a human to chase.** Not a code problem and not ambiguous: the
mechanism is settled to the row, the fix is 8 rows of product-owned data, and the only thing
missing is Mostafa or Pietro answering a question that has been open 5 days on a ticket where the
customer needs numbers every Friday morning.

## 2026-08-25 — no change

Live fetch: status `Open`, priority Medium, assignee Darminder Atker, 6 comments, newest still
110058 (2026-08-20 13:33, customer's unprompted CSA-TCB/CSA-KGE confirmation) — byte-identical to
the 08-21 run's snapshot. Darminder's tag of Mostafa and Pietro (109980, 08-19 19:48) is now
**~6 days** silent, well past the 24h stall threshold first flagged 08-21. The decision-request
draft in `recommended-action.md` is unchanged and still the right message. Nothing re-derived.

## 2026-08-26 — no change, 7 days silent

Live fetch: status `Open`, priority Medium, assignee Darminder Atker, 6 comments (109793, 109795,
109845, 109980, 110018, 110058), newest still 110058 (2026-08-20 13:33) — byte-identical to the
08-25 snapshot. Darminder's tag of Mostafa and Pietro (109980, 08-19 19:48) is now **7 days**
silent. Nothing re-derived.

## 2026-08-27 — the stall broke, but not into an answer: Josh is on leave, Yash is now chasing him directly

**3 new comments since the last pass, all same day (2026-08-26, after that morning's sweep already
ran):**

- **110424 (Yash, 09:29):** re-pinged Pietro, Mostafa and Darminder directly — "Any update so as to
  how we will resolve this? Its priority for Project delivery." This is the escalation this folder
  has been recommending since 08-20/08-24; Yash sent his own version of it independently, not the
  drafted message above (no mention of the 8-row ask or the inherit-from-CSA option — a plainer
  "any update" ping).
- **110425 (Mostafa, 09:29 — one minute later):** "Josh who is the cost manager is on leave." First
  reply this ticket has had from Mostafa/Pietro since 08-19's tag went in, but it is a scheduling
  fact, not the decision (8 values, or inherit CSA's numbers) the ticket actually needs.
- **110427 (Yash, 09:42):** "Thanks for help. Will talk to him directly and get this sorted when he
  is back." Yash closes the loop himself rather than pushing Mostafa for the data now — the decision
  routes through Josh directly, bypassing Mostafa/Pietro as intermediaries.

**What this changes:** the "7 days unposted decision request" framing this folder has carried since
08-20 is now stale in a different way — it's not that nobody answered, it's that the person who
would supply the 8 values (Josh, cost manager) is out of office, and Yash has taken ownership of the
follow-up once Josh is back rather than waiting on Mostafa/Pietro. This is **not** the "escalate to
whatever channel Mostafa reads" fallback firing (the 08-24/08-26 draft's own trigger condition) —
Yash got a reply within 13 minutes of asking, just not the substantive one. No new information on
Josh's return date. The underlying data gap (8 rows: CSA-TCB / CSA-KGE × 4 categories) is unchanged
and still unconfirmed — see 08-24 entry below.

**Confidence unchanged (~9.5/10 on mechanism — see 08-20 entry); this is a status/ownership update,
not a technical one.**

## 2026-08-28 — no change

Live fetch: status `Open`, priority Medium, assignee Darminder Atker, 9 comments (109793, 109795,
109845, 109980, 110018, 110058, 110424, 110425, 110427) — byte-identical to the 08-27 snapshot.
Nothing new since Yash took ownership of chasing Josh directly. Nothing re-derived.

## 2026-08-31 — no change; Josh's expected return is now ~2 days out

Live fetch (`getJiraIssue`, `fields:["comment","status","updated",...]`): status `Open`, priority
Medium, assignee Darminder Atker, resolution `null`, `updated = 2026-08-26T09:42:42+01:00`,
**9 comments** (109793, 109795, 109845, 109980, 110018, 110058, 110424, 110425, 110427) —
byte-identical to the 08-27 and 08-28 snapshots. Newest is still Yash's 110427 ("Will talk to him
directly and get this sorted when he is back").

Checked deliberately hard this run because 08-27/08-28 both put Josh's expected return at ~09-02 and
today is within two days of it. **Nothing has landed early.** No comment from Josh, Mostafa, Pietro
or the customer; no status change; no new attachment.

**Stall clocks as of 2026-08-31:** `updated` 5 days cold; Darminder's substantive tag of
Mostafa/Pietro (109980, 08-19 19:48) **12 days** without the decision it asked for; the underlying
data gap (8 rows — `CSA-TCB` and `CSA-KGE` × Categories 1-4) unchanged and still unconfirmed since
08-24. The customer's weekly Friday QA-report deadline has now passed twice since the decision
request went up (08-21 and 08-28).

**Nothing re-derived.** Mechanism confidence unchanged (~9.5/10, see 08-20 entry); this is a
status-only update. The 08-27 recommendation (no Jira comment; private check-in with Yash around
09-02) is still the right one and is now effectively due — see `recommended-action.md` 2026-08-31.
