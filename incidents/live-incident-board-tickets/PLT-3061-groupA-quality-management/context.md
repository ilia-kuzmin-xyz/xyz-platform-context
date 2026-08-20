# PLT-3061 — "CAT2 Rework cost not auto populating" — triage context

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
