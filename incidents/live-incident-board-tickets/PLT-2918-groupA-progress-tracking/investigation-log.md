# PLT-2918 — investigation log

## 2026-07-23 — root cause established, backend restore ruled out

Ilia's on-ticket analysis confirmed the deletions are real, not a display issue. ~10k mappings
checked on AUS01: 7,879 activities still hold a WBS Location, so it was not a blanket wipe.
Precast lost 19 of 21, Roof 37 of 40, Earthworks 52 of 196, Painting 34 of 410, plus holes in
Partitions and Level 1 commissioning. Discipline, Package and Phase intact everywhere.

Sequence of events: the Jul 12 schedule re-upload (`AUS01-260712-C_updated1`) left ~2,119
activities unmapped, someone then repaired them in the mapping panel, and the panel's Save
deleted category values it should not have. **The re-upload set the stage, the Save did the
deleting.**

**Sachin (api-v2), asked 07-23, answered same day:**
> 1. no we don't have history for mappings
> 2. deletion is hard for mappings

That **closes the backend-restore option**. There is nothing to un-delete. Recovery can only be a
re-apply from the client's export.

## 2026-07-28 — reference data gathered (AUS01)

Useful for any future run on this project, obtained from the editor console:

- **AUS01 postgres project id:** `fd0af178-a9a4-413a-ad77-537219715889`
- Mapping counts per category type (`GET /api/v2/projects/{id}/activities/mapping`, paginated):

| categoryTypeId | Mappings | Note |
|---|---|---|
| `87efaf29-5a39-4612-b3ce-e1b30c682aa3` | 10,133 | full coverage |
| `af96ca04-66a4-413e-9686-e25edbc6e7e5` | 10,133 | full coverage |
| `68ba1e59-4405-42b0-aee8-afe326706c63` | 9,950 | 183 short, unexplained, probably benign |
| `8f6483fc-c737-474e-bdd3-680584e04414` | **7,879** | **WBS Location**, matches Ilia's figure exactly |

So 2,254 activities currently have no WBS Location. **That is not the restore target.** Most of it
is the ~2,119 the Jul 12 re-upload left unmapped in the first place. Only Paddy's export can say
which of those previously held a value, so the export defines the restore set. Coverage of the
export has not been checked yet.

## 2026-07-28 — FE fix raised: PR #2078

Branch **`PLT-2918`**, https://github.com/XYZReality/hc-frontend/pull/2078
(commits `b75c059` fix, `fa32e86` test).

**What the bug was.** `saveDataMapping` (`category-mapping-service.ts:237-292`) treated the
in-memory `activityItem` as the complete source of truth: any category type with no value was
assumed cleared by the user and its persisted mapping deleted. Two amplifiers made it
subtree-wide — editing a parent type nulls all descendant types in memory
(`computeCategoryMapUpdates`, `:618-653`), and an edit propagates to every child activity
(`schedule-entity.ts:935-972`), so all of them land in `changedActivityIds`.

**What the fix does.** Absence in memory means "not hydrated", not "cleared". `mapping-service`
now records which category types were actually edited per activity, derived from the `category-*`
keys of the update payload in `_updateActivityData`, mirroring the existing `_localChangedIds` /
`_changedActivityIds` lifecycle. `saveDataMapping` takes that map and only deletes types in it.

Intentional clears still work because the cascade writes explicit nulls into the same payload via
`toCategoryFieldUpdates`, so those types count as edited. That chain was the load-bearing
assumption and was originally verified only by reading, so `fa32e86` extracted the key parsing
into `getEditedCategoryTypeIds` (`schedule-entity-category-utils.ts`) and covered it directly,
including a case built from the real cascade output. A refactor that filtered on value instead of
key presence would otherwise have silently reintroduced the data loss.

### Known limitations, flagged on the PR for the reviewer

Two edit paths do not write `category-*` keys, so they now record no edited types and never delete:

1. **Legacy V1 dropdown** (`mapping-service.ts:642-660`) passes `discipline` / `packageType`
   column names directly.
2. **Package predictor** (`package-predictor-service.ts:359`) calls
   `activeSchedule.updateActivityMapping` directly, bypassing `_updateActivityData`, then calls
   `addHistoryAction`, so the activity reaches `_localChangedIds` with no type information.

Both fail in the safe direction (under-delete). Worth noting these paths were *worse* before the
fix: an activity touched only by the predictor has no `category-*` fields at all, so the old code
treated every type as cleared and deleted all of them. The behaviour change to watch is that
**clearing a value through the legacy V1 dropdown will no longer persist**; if that path is still
reachable, it needs a follow-up mapping legacy column names onto their `categoryTypeId`.

### Verification status — nothing was run

`npm ci` fails with a 401 against `npm.pkg.github.com` for `@xyzreality/dhtmlx-gantt`, so
dependencies would not install in the working environment. **Neither the tests nor a typecheck
were executed.** CI is the first real validation of the branch. An earlier `tsc` run appeared
clean but was meaningless — it aborted on config errors before type-checking anything.

## Outstanding

1. **CI + manual test pass on PR #2078.** Five scenarios in the PR description; the decisive one
   is that `activities/mapping/delete` should not fire at all when only one column is edited.
2. **Reviewer decision on the two legacy paths** above.
3. **Data restore for AUS01, not started.** No backend history, so re-apply from Paddy's export via
   `POST /api/v2/projects/{id}/activities/mapping` with
   `{activityId, activityCategoryId, categoryTypeId}` (`activity-api-service.ts:161`). Needs:
   export coverage checked against the 2,254 activities missing a WBS Location; category UUIDs
   resolved from location names such as "Area G/H"; activity UUIDs resolved from codes such as
   A4300. One unknown to test on a single row first: whether the server generates
   `activityCategoryMappingId` on create or expects one.
4. **Sequencing.** Land the fix before the restore, otherwise anyone opening the mapping panel can
   wipe it again.
5. **Anchor for any lookup:** activity A4300, itemId `9d0fed9c-c79d-4c53-9446-454516ab3e11`, WBS
   Location was "Area G/H" until the incident.

Follow the procedure in `../../data-remediation-runbook.md` for the restore: snapshot first, exact
expected delta, verify with the same measurement.

## 2026-07-28 — reproduction attempts all FAILED; do not repeat them blind

Three routes were tried to reproduce the bug at runtime on a dev project. **None worked.** Recording
them so the next person does not burn the same hours.

### What the bug actually needs

`_mappings` (fetched from the API, keyed by `mapping.activityId`) must hold a mapping that
`activityItem` does not have. `activityItem` is hydrated **once at schedule build** from
`getCategoryMapForActivity(item.itemId)` (`components/scheduler-service/utils.ts:41`). Both
conditions are required — the delete branch reads `this._mappings.get(id)`, so if the client does
not know about the mapping there is nothing to delete, and if the value is hydrated it is an
update rather than a delete.

**In a healthy, fully-hydrated project the bug cannot fire.** Editing a column and seeing nothing
bad happen on `master` is expected and is NOT evidence the bug is absent.

### Route 1 — edit one column, expect another to vanish. FAILED

The first test steps written for the PR assumed this worked. It does not: every type has a
hydrated value, so Save issues updates, never deletes.

**Extra trap:** Discipline and Package are **parent and child**. Changing Discipline legitimately
clears Package (`computeCategoryMapUpdates` nulls all descendant types,
`category-mapping-service.ts:653-660`). That happens identically on master and on the fix branch,
so this pair can never demonstrate the bug. Any test needs two **unrelated** category types.

### Route 2 — two tabs racing. FAILED

Theory: Tab 1 builds its schedule with column B blank, Tab 2 sets B, Tab 1's react-query refetches
`_mappings` on window focus, producing the divergence. Tested on master: **no delete fired.**
Either the cache did not refetch, or it refetched and re-hydrated the schedule at the same time,
which closes the gap rather than opening it.

Operator did observe a **different real bug** while doing this: two tabs each saving their own
stale in-memory state, last write wins, ending with DisciplineA + PackageB where PackageB belongs
under DisciplineB. An inconsistent hierarchy written silently. **That is on the update path, is
not fixed by PR #2078, and deserves its own ticket.**

### Route 3 — schedule re-upload. UNVERIFIED, likely also fails

This is the real-world trigger on AUS01, but the mechanism does not obviously survive scrutiny:
uploading creates a **new `scheduleRevisionId`** (`schedule-upload-service.tsx:149-165`), and the
parser builds activities with every category field null (`mapToActivity`,
`schedule-parser.ts:327-345`). If the new revision's activities get **new** ids, `_mappings` holds
nothing for them and no delete can fire. Whether ids are reused across revisions, and whether the
backend carries mappings forward, is a **backend question that cannot be answered from this repo**.

### Recommendation

**Stop trying to manufacture the state.** The cheapest remaining route to a real repro is to ask
whoever performed the AUS01 mapping session around Jul 12 what they actually did — that person
triggered it once already. Yash can identify them.

Otherwise ship on: the destructive branch is plainly visible in the diff, the AUS01 damage pattern
(one type wiped across specific branches, others intact, 7,879 WBS Locations surviving so not a
blanket wipe) fits that code path and little else, the unit tests pin the decision logic, and the
change only ever **narrows** a destructive operation so its failure mode is under-deleting, never
new data loss.

### Honest caveat on the analysis in this folder

The mechanism was read from source, not observed at runtime. Three separate confident predictions
about how to trigger it were wrong. Treat the "how it gets into that state" part of the diagnosis
as unproven; the "what the code does once in that state" part is solid and test-covered.

## 2026-09-09 — fix re-verified intact; and the finding that reframes the whole ticket: **there is no record the AUS01 restore ever ran**

Two things checked this run. Nothing else was re-derived — the 07-28 reproduction routes stay
killed, do not retry them.

### 1. The shipped fix is still on the checkout, unchanged (VERIFIED)

Re-read from source, not from the earlier note:

- `services/categories/category-mapping-service.ts:246-251` — `saveDataMapping` now takes
  `editedTypeIdsByActivity: Map<string, Set<string>>`.
- `:277` — the delete branch is `} else if (editedTypeIds?.has(categoryTypeId)) {`, with the
  comment *"Empty AND explicitly edited by the user -> an intentional clear."* The unconditional
  cross-type delete is gone.
- `:236-238` — the doc comment names PLT-2918 as the reason.
- `components/gantt-x/scheduler/scheduler-data-mapping/mapping-service.ts:77` `_editedTypeIds`,
  `:509`, `:1067-1070`, `:1090` — the per-activity edited-type map is accumulated and passed through.
- `components/project-x/entities/schedule-entity-category-utils.ts:76` `getEditedCategoryTypeIds`
  plus its spec `schedule-entity-category-utils.test.ts` (incl. the real-cascade case at `:45-61`).

**No regression.** Only one commit has touched these files since the fix (`b700eb3`, PLT-3040 /
#2139, Darminder, 2026-08-13) and it does not alter the guard. *Caveat on that last claim: this
checkout's history is squashed/rewritten (the commit shows these files as `new file`), so treat the
"only one commit" part as INFERRED from this checkout, not as GitHub ground truth. The presence and
shape of the guard in the working tree is VERIFIED.*

So hypothesis (a) — "residual code gap on the mapping-panel Save path" — stays where the 08-27
`debug-instructions.md` left it: the destructive cross-type delete is structurally impossible on
this path. The two known under-deleting escape hatches (legacy V1 dropdown, package predictor)
both fail *safe* and cannot delete a WBS Location.

### 2. The restore was never recorded as done — and that is probably the actual answer

Searched the whole context repo for any record of the AUS01 WBS-Location recovery being executed.
There is none. What exists:

- **07-23, comment 107993 (Ilia, on-ticket):** the three-tier plan — (1) BE restore via Sachin,
  (2) script re-apply from Paddy's export, (3) manual.
- **07-23, Sachin's answer (this log, § 2026-07-23):** *"no we don't have history for mappings"* /
  *"deletion is hard for mappings"*. **Tier 1 is dead.** There is nothing to un-delete.
- **07-28, this log, § Outstanding item 3:** *"**Data restore for AUS01, not started.**"* Tier 2 was
  Ilia's own job and had not begun.
- **Nothing after that.** No Jira comment, no folder entry, no note anywhere in
  `xyz-platform-context` records tier 2 or tier 3 running. `grep -r AUS01` returns only this ticket's
  own files plus unrelated tickets.

**Therefore (INFERRED, from absence across three independent places rather than one):** the ~2,254
AUS01 activities with no WBS Location as of the 07-28 census are, in all likelihood, *still* missing
it today. Stated as "no record it ran", not "it definitely never ran" — Ilia could have done it in
July without writing it down. **One person can falsify this in one sentence.**

**Why this reframes the ticket.** If the restore never ran, then Paddy's "this is still an issue
weekly for me" needs no new bug to explain it at all: every week he runs the AUS01 report, and every
week the same July holes are still there. Hypothesis (b) stops being one of three equals and becomes
the leading explanation, because it is the only one that (i) is consistent with a *shipped and
verified* code fix, (ii) requires no second undiscovered defect, and (iii) predicts exactly the
weekly cadence he describes — a report run on a schedule against unchanged bad data.

It also explains why the ticket keeps bouncing: we shipped a fix for the *mechanism* and told the
customer it was handled, but never repaired the *data* the mechanism destroyed. A code fix is
invisible to Paddy; his 19-of-21 missing Precast locations are not.

### The one measurement that decides it (cheap, and it is a three-way discriminator)

Get **one activity code that is wrong in this week's report** and check it against the API:

1. Its WBS Location mapping is **absent**, and the activity is in the known 07-28 missing set →
   **hypothesis (b)**, old hole, never restored. No new bug. Action is data remediation.
2. Its WBS Location mapping is **absent**, and the activity **had** one after 08-17 → **hypothesis
   (a)**, a live second defect. Action is a new investigation with a dated loss window.
3. Its WBS Location mapping is **present and correct** in the API → **hypothesis (c)**, Mostafa is
   right, the loss is on the Power BI export side and this is not a viewer/mapping ticket.

Anchors already in this folder for step 1: AUS01 postgres project id
`fd0af178-a9a4-413a-ad77-537219715889`; WBS Location categoryTypeId
`8f6483fc-c737-474e-bdd3-680584e04414` (7,879 mappings against 10,133 activities on 07-28);
`GET /api/v2/projects/{id}/activities/mapping`; anchor activity A4300, itemId
`9d0fed9c-c79d-4c53-9446-454516ab3e11`.

**Re-running the 07-28 census on its own is worth doing too** — if the count is still ~7,879 the
hole never moved; if it has grown, something is still deleting. That one number is independent of
anything the customer sends and nobody has to be chased for it. Recorded as the second-cheapest
next step; not run here (no API access from this routine).

### Still unverified after this run

- Whether the July restore ran. (Absence of record only.)
- What Paddy said on 09-08 — it is in Freshdesk #7461, invisible from Jira, nothing attached.
- Whether the current WBS Location mapping count on AUS01 still matches 7,879.
- Mostafa's Power BI theory — never substantiated with anything checkable, by anyone, since 08-25.
