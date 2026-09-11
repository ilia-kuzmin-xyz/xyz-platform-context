# PLT-2874 — investigation log

FAR01 (`b28712bb-0691-4db2-a626-85c2f1f5ead6`). Editor federated file reported ~628,000 linked
elements on 07-07; dashboard reported ~695,000 with the scrubber at the end. Yash linked LVN1
(Freshdesk 7514) on 07-27 as a second project with the same symptom.

## 2026-09-11 — scheduled sweep, confirmed unchanged; no new code re-verification warranted

Jira re-fetched fresh (full fields incl. `comment`, `attachment`): status **In Analysis**,
`updated = 2026-08-25T09:53:57+0100`, 6 comments, newest still Darminder's 08-17 14:01 (109779) —
byte-identical to every snapshot from 08-25 through 09-09. Full comment thread read end to end
(all 6), not just the newest, to rule out a missed reply; none found. GitHub re-checked
(`search_pull_requests query:"PLT-2874 in:title,body"`, `hc-frontend`): still exactly one result,
PR #2084, merged 2026-07-31.

Per this run's brief, code was **not** re-verified beyond that GitHub check, since nothing on the
ticket changed to warrant it: the 09-07 finding (de-dup fix already shipped at both
`dashboard-color-service.ts` call sites) and the 09-09 correction (the 08-27 prod measurement used
the wrong predicate for the tile's population, so its 851,409/−82,404 figures are not usable) both
stand as recorded, not re-run this pass.

**Day counts:** 25 days since the last human comment (Darminder, 08-17); **30 days** since
Gennaro's Staging-undercount finding (109457, 08-12) went unanswered — this is the one open item.
The 08-28 decision-request draft to Mostafa/Pietro stays retracted (§ 2026-09-09 below) and was
not reconsidered, since PR #2084's state has not changed since the retraction.

**Action class: 1 — stale, unresponded.** Confidence unchanged: 9/10 the 08-28 draft is unsafe to
send; 6/10 on the Staging undercount (five hypotheses, none excluded).

---

## 2026-09-07 — de-dup FE fix from the 08-28 recommended-action is already shipped; only the labelling decision is outstanding

Scheduled live-incident sweep. Jira re-fetched fresh (`getJiraIssue`, full fields): status **In
Analysis**, `updated = 2026-08-25T09:53:57+0100` — **byte-identical to every snapshot from 08-25
through 08-31**, still 6 comments, newest still Darminder's 08-17 14:01 "Fix still ongoing
following QA latest testing." GitHub re-checked directly (`search_pull_requests
query:"PLT-2874 in:title,body"` against `hc-frontend`): still exactly one result, PR #2084,
merged 2026-07-31. No PR anywhere named `PLT-2874-dashboard-element-count-diagnostics` either
(searched by head branch, zero results) — that branch, if it still exists, has still never been
raised as a PR. Nothing on the ticket or in GitHub has moved in **13 days**.

**New this run — checked the claim in `recommended-action.md` § 2026-08-28 ("The de-dup fix —
can ship without waiting on the answer above") against the actual code in `hc-frontend`, rather
than carrying it forward unverified for a fourth pass.** That entry (and its 08-31 restatement)
says a small independent PR is still needed at `dashboard-color-service.ts:643` and the
`reApplyColors` call site to de-duplicate `coloredDbIds` before it reaches the tile. **This is
already done, on both call sites, on current `master` (`hc-frontend` @ `56fd089`,
2026-09-07):**

```
src/main/webapp/app/pages/organisation/ViewerPage/components/dashboard-panels/viewer/dashboard-color-service.ts
  700  const elementCount = countDistinctElements(elementsWithStatus, this.coloredDbIds.length)  // initial paint
  703  this.statisticsService.setVisibleElements(elementCount)
  876  const elementCount = countDistinctElements(elementsWithStatus, this.coloredDbIds.length)  // reApplyColors
  879  this.statisticsService.setVisibleElements(elementCount)
```

`element-count.ts`'s header comment names PLT-2874 explicitly and `countDistinctElements` builds
a `Set` of `modelElementId` before falling back to the raw object count — this **is** the
distinct-by-source-element count the 08-28 entry asks for, on the exact call site it names. It
shipped as part of PR #2084 (merged 07-31); the 08-13 entry in this same file already said as
much ("both call sites are now covered") — the 08-28 recommended-action entry appears to have
lost track of that between the 08-24 "team discussion" reframe and the 08-28 rewrite, and 08-31
carried the stale claim forward again without re-checking code. Flagging rather than silently
fixing, per this repo's additive-writing rule: the 08-28/08-31 "ship the de-dup fix" action item
is **moot**, not merely unsent.

**What is actually still outstanding, and it is the same thing the 08-31 entry called "the sole
blocker": the decision-request comment to Mostafa and Pietro** (`recommended-action.md` §
2026-08-28, "Draft comment to Mostafa and Pietro") about the residual ~82,000-element population
gap (linked-but-no-status vs status-but-not-linked) and the tile labelling. That is a
communication action, not a code one, and nothing about today's code check changes its content —
the numbers in the draft (879,931 / 851,409) still stand, since they were measured on live prod
data on 08-27 and are independent of which repo commit is checked out.

**Stall clock:** 21 days since the last human comment on the ticket (08-17); 10 days since the
decision-request draft was written (08-28) and still not posted.

---

## 2026-07-30 — RESOLVED in diagnosis: the two surfaces count different units

**The editor counts elements. The dashboard counts geometry objects.** On this model there are
9.24% more objects than elements, and that accounts for the whole reported gap.

```
628,000 (editor, linked elements) × 1.0924 = 686,000     reported dashboard: 695,000
```

1.3% out over three weeks of edits. Nothing else measured comes close to this magnitude.

### Measured on prod, 2026-07-30

`element_base_data` (dashboard DuckDB):

| metric | value |
|---|---|
| rows | 737,093 |
| distinct `objectId` | 737,093 |
| distinct `modelElementId` | **668,978** |
| excess objects | **68,115 (9.24%)** |

`rows` equals `distinct_objects` exactly, so there is **no row duplication** — the LEFT JOIN on
`element_status` contributes nothing and the GROUP BY collapses nothing.

Objects-per-element distribution (sums to 68,115 and 668,978 exactly):

| objects/element | elements | excess |
|---|---|---|
| 1 | 611,920 | 0 |
| 2 | 50,395 | 50,395 |
| 3 | 6,022 | 12,044 |
| 4 | 334 | 1,002 |
| 5 | 20 | 80 |
| 6 | 135 | 675 |
| 7 | 24 | 144 |
| 12 | 3 | 33 |
| 16 | 2 | 30 |
| 21 | 102 | 2,040 |
| 47 | 6 | 276 |
| 54 | 14 | 742 |
| 655 | 1 | 654 |

91.5% singletons. Doubles are 74% of the excess, doubles plus triples 92%. The tail (641
elements at 4+) is 5,676 objects, and the exact repeated counts at 21 / 47 / 54 look like a
specific assembly placed many times rather than corruption.

### The two code paths

**Editor "Linked"** — `ModelDetailsPanel.tsx:220-224`:

```ts
linkedCount: new Set(forModelActiveSchedule.map(l => l.modelElementId)).size
```

Distinct `modelElementId`, filtered to the selected model (`getLinkedElementIdsInModel`,
`duckdb-element-store.ts:391`) and to the active schedule. Heading: "Elements linked to Latest
Program".

**Dashboard "Total"** — `dashboard-color-service.ts:679-698`:

```ts
this.coloredDbIds = Array.from(elementsByStatus.values()).flat()
this.statisticsService.setVisibleElements(this.coloredDbIds.length)
```

`coloredDbIds` holds `objectId`s. `dashboard-element-stats.tsx:41` then shows `stats.visible` in
preference to the geometry count, under the label **"Elements"**. Confirmed against prod: the
five status buckets summed to exactly the displayed total (94,425 + 105,202 + 340,064 + 30,737 +
104,719 = 675,147).

Colouring every object is correct — the viewer must paint all of them. **The defect is the
label.** `_visible_elements` (`dashboard-progress-service.ts:1999`) already carries
`modelElementId`, so the honest number is a `COUNT(DISTINCT modelElementId)` away with no
pipeline change.

### Proposed fix

In `_applyColorsToViewer`, keep `coloredDbIds` for painting and fragment visibility, but feed
`setElementsWithStatus` / `setVisibleElements` a distinct-element count. The status query already
selects `modelElementId`, so either count distinct in JS from `elementsWithStatus`, or read
`SELECT COUNT(DISTINCT modelElementId) FROM _visible_elements`.

Fixes FAR01 and LVN1 together. No backend or pipeline work.

## Hypotheses tested and killed — do not re-run these

1. **Duplicate rows per object** (multi-status, or map producing repeat rows). Dead:
   `rows == distinct_objects` in both `element_base_data` and `_visible_elements`.
2. **Pigeonhole against geometry count.** Proposed as decisive; it is not. 675,147 sits below the
   737,093 distinct objects, so the test never fires.
3. **PLT-2909 cross-write.** The shape does not match. ATL08 had 366,840 elements at 3+ claimants
   (53%) with a tail to 19. FAR01 is 91.5% singletons with 0.096% at 4+. **The two tickets are
   independent.**
4. **Links to activities from an older program.** Dead: `api_activities` loads only the current
   schedule revision (`api-activities-loader.ts:71-73`), so both surfaces are on the latest
   program.
5. **Dashboard reading the wrong federated model.** Real defect (see below) but not the cause
   here: the two federated models are `20cff6cf-…` at 667,614 elements and `992055de-…` at
   665,074, only 2,540 apart. Cannot produce a 67,000 gap.

## Spun out: dashboard picks an arbitrary model from the federated folder

`dashboard-project-service.ts:164-175`:

```ts
const federatedFolder = folders.find(f => f.folderName?.toLowerCase().includes('federated'))
const federatedModel = models.find(m => m.parentModelFolderId === federatedFolder.modelFolderId)
```

`.find()` — first match in the paginated models response. No `isFederated` flag, no version or
recency rule. Every number on the dashboard derives from that one file and the others are
invisible. FAR01 has two near-twin models so the impact is 0.4% today, but a project with two
genuinely different federated models would show arbitrary figures depending on API ordering.
Worth its own ticket.

## Also noted

- **Dashboard's element universe is `svf2-object-id-map`; the editor's is `project-element-list`.**
  668,978 against 667,614 for the larger candidate model, so the map carries 1,364 elements the
  element list does not. Consistent with the divergence already in `dashboard/pitfalls.md`, and it
  means element counts cannot identify which model the dashboard loaded.

## 2026-07-31 — chain closed from parquet to pixel, and the model identified

**The dashboard loads `20cff6cf-659f-4eb6-b0d5-ae181080afa1`**, the larger of FAR01's two
federated models. Read off the Network tab rather than inferred: `_initializeModel` calls
`getProjectModelDetail` for the chosen model only, which puts the id in the request path
(`model-api-service.ts:52`, `GET /api/v2/projects/{projectId}/models/{modelId}`). No console JS
needed, works on the current build.

That also quantifies the artefact divergence for a **single** model:

| source | distinct elements |
|---|---|
| `element_base_data` (from `svf2-object-id-map`) | 668,978 |
| `project_element_list` for `20cff6cf` | 667,614 |
| difference | **1,364** |

**Reconciled reading, same session, full date range:**

| | |
|---|---|
| On-screen Total | 669,978 |
| `SELECT COUNT(*) FROM _visible_elements` | **669,978** |
| `SELECT COUNT(DISTINCT modelElementId) FROM _visible_elements` | 609,643 |
| excess objects | 60,335, 9.0% |

Total equals the object count exactly, so nothing sits between the query and the pixel. 609,643
is what the panel will read once the fix lands. The 9.0% here against 9.24% on
`element_base_data` is two different subsets giving the same ratio, so the effect is a property
of the model, not of one query.

An earlier reading of 581,878 / 528,314 was taken with the scrubber short of the end. Ignore it.

## 2026-07-31 — how the editor counts, and the third unit

### The editor is metadata-driven, not geometry-driven

Got this backwards twice before checking. `applyMappings` takes the element set from the
model's metadata and resolves dbIds **for those elements** (`model-mapping-service.ts:44-50`), so
the editor starts from the element list and matches it against loaded geometry. Two halves,
joined on `sourceFileElementId`:

- **sourceFileElementId → dbId**, computed in the browser from the loaded model
  (`getExternalIdMappingWithCache`, `:226`). A `Map<externalId, dbId>`, so **one dbId per element
  by construction**.
- **sourceFileElementId → modelElementId**, from the per-model element metadata parquet
  (`model-entity.ts:279`).

Consequences: the editor never had the inflation, because it cannot physically hold more than one
dbId per element. It also means **the extra Navisworks dbIds are invisible to it** for selection,
isolation and colouring, which is a separate defect from this ticket. The editor never reads
`svf2-object-id-map`.

Verified 1:1 for this model, so the two pages key on equivalent ids:

```sql
SELECT COUNT(DISTINCT sourceFileElementId), COUNT(DISTINCT modelElementId)
FROM project_element_list WHERE modelId = '20cff6cf-…';
-- 667,614 / 667,614
```

### Cross-check against the editor

Loading `20cff6cf` alone in the editor and applying the **Linked** filter gives **606,524**,
against the dashboard's 609,643. **3,119 apart, 0.5%**, down from ~9%.

The residual is not fixable in the frontend and breaks down as:

| cause | size |
|---|---|
| `svf2-object-id-map` vs `project-element-list` for the same model version | 1,364 |
| editor skips elements with no loaded geometry, dashboard requires a dated activity in the current schedule | the rest |

Decision: not worth chasing. Raised with product as a "should both pages share one source"
question; recommendation was to log it as tech debt rather than do it now.

### A third unit: the schedule Elements column

LVN1 (Freshdesk 7514) reports **three** numbers, not two. The extra one is the schedule root row,
and it is a third unit again.

`scheduler-columns.tsx:180` renders `calculatedElementsSum`, which is
`_calculateElementsSumRecursive` (`schedule-entity.ts:786-810`): a plain sum of per-activity
counts down the tree, **no dedup**. An element linked to three activities is counted three times,
so this is closer to a link count than an element count.

| surface | LVN1 screenshot | unit |
|---|---|---|
| Editor, Model details | 61,303 | distinct elements, one model, active schedule |
| Editor, schedule root | 81,826 | sum of per-activity counts, elements repeated per link |
| Dashboard viewer | 71,965 | geometry objects |

The 20,523 between the two editor numbers is elements linked to more than one activity. Same
trap as PLT-2882, where the schedule showed 798,751 and the API 798,841 for identical data.

**PR #2084 does not fix this one.** A rollup that double-counts shared elements is arguably its
own defect and needs its own ticket.

## Fix: PR #2084

Branch `PLT-2874`, https://github.com/XYZReality/hc-frontend/pull/2084.

`getElementsWithDynamicStatus` returns `modelElementId` (already in `_visible_elements`, just not
read back), `countDistinctElements` + tests, and both colour paths report distinct elements while
`coloredDbIds` still drives painting and fragment visibility.

Two things worth knowing if you pick this up:

- The **filter-change path was missed in the first cut**. `reApplyColors` still reported
  `coloredDbIds.length`, so the total reverted to the object count after any scrub or filter.
  Both call sites are now covered; test step 3 on the PR exists for exactly this.
- The **runtime-mapping path** also dropped `modelElementId` on read-back, so the number's unit
  depended on the `USE_VIEWERPAGE_ID_MAPPING` flag. Fixed.

A `window.dashboardModelInfo()` debug handle was built and then **removed** before review. The
Network tab already answers which model is loaded (`GET /api/v2/projects/{id}/models/{modelId}`
is issued only for the chosen one), and it did not belong in a fix PR. It is in the branch
history if it is ever wanted as its own change.

### Previously-outstanding reading — now CLOSED (resolved 2026-08-04 branch-reconciliation pass)

A parallel copy of this log carried an **Outstanding** section that this 07-31 entry supersedes.
Recording it so the question is visibly answered rather than silently dropped:

> *Was:* `_visible_elements` measured 581,878 objects / 528,314 elements while the console showed
> `Total: 675,147`. Since 528,314 is below the 628,000 linked, that query had run with the scrubber
> short of the end or a filter applied. The re-run asked for was
> `SELECT COUNT(*) AS rows, COUNT(DISTINCT modelElementId) AS elements FROM _visible_elements;`
> with the scrubber hard right and filters cleared, and the caveat was: *don't quote exact figures
> in the ticket comment until it lands.*

**It landed.** The 07-31 measurement above (**669,978 objects / 609,643 distinct elements** on model
`20cff6cf`, full date range) is that reconciled reading, so the figure-quoting caveat is lifted and
the posted draft may use those numbers. The chain from parquet to pixel is closed.

## Tooling notes for the next person

- **Dashboard service logs are unreachable in every build.** `dashboard-logger.ts:35` hardcodes
  `CURRENT_LEVEL = 'SILENT'`, so every `logger.info` / `logger.success` is dropped, including
  `[📊 DYNAMIC-STATUS]`. `window.dashboardLog` only edits the exclusion list, not the level. The
  lines that do appear are raw `console.log` / `console.table`.
- **Query the page's DuckDB directly.** `element_base_data` is a normal table and survives;
  `_visible_elements` is TEMP, so it is only visible on the connection that created it.
  `svf2_object_id_map` is dropped after the view is built (`:2521`).
- **`GET /api/v2/projects/{id}/models/artefacts` returns a Spring page envelope**
  (`content` / `pageable` / …), but `model-api-service.ts:81` returns `data` straight through and
  callers run `.filter()` on it. Worth a look — either the app reaches a different origin
  (`api-instance.ts:49` builds the base from `SERVER_API_URL`) or that path is broken.
- Parquet URLs can be lifted from the Network tab, already SAS-signed, and read by DuckDB over
  `httpfs`. Reconstructing `element_base_data` from parquet needs only `svf2-object-id-map` and
  `element-status` — the activity joins cannot change the row count because the GROUP BY key
  holds no activity column.

---

## 2026-09-09 — ⚠️ CORRECTION: the 08-27 prod measurement reproduced the dashboard tile with the WRONG predicate. The 08-28 draft to product must not be sent.

Scheduled sweep. Jira re-fetched: status **In Analysis**, `updated = 2026-08-25T09:53:57+0100`,
6 comments, newest still Darminder's 08-17 14:01 — byte-identical to the 09-07 and 09-08
snapshots. GitHub re-checked (`search_pull_requests query:"PLT-2874 in:title,body"` against
`hc-frontend`): still exactly one result, PR #2084, merged 2026-07-31. **23 days with no movement.**

Nothing was re-derived from the Jira side. What follows came from checking the *only remaining
action item* — the decision-request comment to Mostafa and Pietro — against current code before
recommending a fourth run in a row that it be posted.

### The finding

`prod-measured-2026-08-27.md` § B reproduces the dashboard counter as
`federation's svf2 map ⋈ element_status`, and states at line 98 that its **851,409** dbId entries
are *"the number the overlay's Total shows"*, with **797,527** distinct elements behind them. Both
figures model the wrong thing, for two independent reasons.

**(1) The tile has not reported dbIds since 31 July.** PR #2084 shipped four weeks *before* that
measurement was taken. VERIFIED end to end on current `master`
(`hc-frontend` @ `00be0c1`, 2026-09-08):

```
dashboard-element-stats.tsx:41,49   Total: displayTotal = stats.visible  (from visibleElements$)
dashboard-color-service.ts:700,703  elementCount = countDistinctElements(elementsWithStatus, …)
dashboard-color-service.ts:876,879  same, on the reApplyColors path
element-count.ts:10-20              Set of modelElementId; objectCount only as fallback
```

`setVisibleElements` has no other non-zero caller anywhere in `app/` (grep: `:131 :421 :560 :703
:817 :879`, all either `0` or `elementCount`). `getColorStats()` at
`dashboard-color-service.ts:932` does still return `total: this.coloredDbIds.length`, but it has
**zero callers** — dead code, reaches no surface. So **851,409 is not, and cannot be, the on-screen
number.**

**(2) More importantly, 797,527 is not it either — "carrying an `element_status` row" is not the
tile's population.** The tile counts distinct `modelElementId` in `_visible_elements`, which is
built at `dashboard-progress-service.ts:2100-2125` as

```sql
SELECT DISTINCT objectId, modelElementId, status_code
FROM (SELECT DISTINCT …, <status CASE> AS status_code FROM element_base_data base …)
WHERE status_code IN (…) AND status_code IS NOT NULL
```

and `buildInstallationStatusCaseSql` (`utils/installation-status-sql.ts`) assigns a status code
**from the schedule dates, with no `element_status` row required**:

| branch | condition | needs a status row? |
|---|---|---|
| 1 Installed Early / 2 Installed | `installationStatus = 'INSTALLED_ACCURATELY'` | yes |
| 4 Late | `endDate < refDate` | **no** |
| 3 Late Start | `startDate < refDate` | **no** |
| 0 Planned | `startDate IS NOT NULL OR endDate IS NOT NULL` | **no** |
| NULL — excluded | neither date, not installed | — |

Its own comment on the ELSE branch says it: *"Not Planned: not linked to any schedule — excluded
from coloring."* `startDate`/`endDate` reach `element_base_data` from the LEFT JOIN through
`activity_links` → `api_activities` (`:2581`).

**So the tile's population is roughly (linked to a *dated* activity) ∪ (marked installed), not
(has an element_status row).** The 168,529 elements the 08-27 pass classified as "linked but NO
status" mostly land in buckets 0/3/4 and **are counted by the tile**; part of the 86,052 "status
but not linked" are counted too, via branch 2. The −82,404 "population difference" that is the
entire spine of the 08-28 draft is therefore an artefact of the join chosen for the reproduction,
not a property of the two surfaces.

### Two independent field readings already corroborated this, and were overlooked

Per the standing rule that a number acted on gets a second source — this correction has two, both
already in this folder, both taken *after* PR #2084 merged:

| when | source | editor | dashboard tile | gap |
|---|---|---|---|---|
| 07-31 | in-browser, FAR01 model `20cff6cf`, full range (this file, § 2026-07-31) | 606,524 | **609,643** | +0.5% |
| 08-12 | Gennaro, QA, **Prod** rewind (comment 109457) | 603,844 | ~604,000 | ~0.03% |

Both put the post-fix tile **at or slightly above** the editor's linked count. The 08-27 model puts
it 9.4% below. When an artefact reconstruction contradicts two independent live readings of the
same screen, the reconstruction is what is wrong.

### What this changes

- **The 08-28 decision request to Mostafa and Pietro is retracted, not merely unsent.** Its
  headline numbers are wrong for the deployed code, and its central claim — *"even after
  de-duplicating there's still an ~80,000 gap between them and it isn't going away"* — is
  contradicted by the app's own measured behaviour on Prod. Do not post it. See
  `recommended-action.md` § 2026-09-09.
- **The 08-24 "this needs a team discussion" reframe loses its premise too.** The labelling question
  was raised because a large residual was thought to survive de-duplication. On Prod it does not.
- **On Prod, the ticket's original symptom is fixed and the two surfaces agree to ~0.5%.** That was
  already true on 07-31 and confirmed by QA on 08-12.
- **The only genuinely open fault on this ticket is Gennaro's Staging undercount** (551,386 against
  an editor 603,844, 08-12) — never explained, never chased, now 28 days old. H1/H3/H4/H5/H6
  (`context.md` § "Reopened 2026-08-13" and § 2026-08-14) still stand untouched and still
  undiscriminated; nothing above bears on them.

### VERIFIED vs INFERRED

**VERIFIED** (code read this run, cited above): the tile reports distinct `modelElementId`;
`getColorStats` is dead; `_visible_elements` filters on a date-derived status CASE that does not
require an `element_status` row; the 07-31 and 08-12 readings are as recorded.

**INFERRED, not measured:** the tile's *actual* FAR01 figure as of 08-27. It is above 797,527 and
the 07-31/08-12 readings suggest it tracks the editor within ~1%, but the artefact query was not
re-run with the status CASE applied, so no corrected absolute number is offered here. Deliberately:
substituting a second guessed number for the first would repeat the error.

**Could not re-measure this session.** The 08-27 run reached prod through the MCP recipe in
`incidents/prod-mcp-access.md`, which needs credentials supplied per session; none are available
here, and no prod MCP tool is exposed to this routine. Re-running it is a human step.
