# Pitfalls and Gotchas

Things that have broken before (or will break if you're not careful).

## Race conditions between Pipeline A and Pipeline B

**What happens:** Pipeline A (parquets) and Pipeline B (artefacts + API) load in parallel. If code queries a DuckDB table from Pipeline B before it's loaded, you get `table does not exist`.

**Rule:** Always check `information_schema.tables` before querying a table that comes from a different pipeline. Don't assume loading order.

**Example:** `_queryDataDateRange()` tries `api_activities` → `project_progress` → `category_groups` as fallbacks. Each checks existence first.

## Wrong artefact in multi-model projects

**What happens:** `getProjectModelArtefacts()` returns one `svf2-object-id-map` per model version. If you `.find()` without filtering by `modelId`, you'll grab the first artefact — often a tiny sub-model's map (9 KB, ~200 rows). The federated model's map (11 MB, 1.8M rows) gets ignored → zero UUID matches → entire model stays grey.

**Rule:** Always match artefacts by `models[].modelId`, then narrow by `models[].modelVersionId`. Never `.find()` on the raw artefact array.

## DuckDB init deduplication

**What happens:** Multiple services call `duckdb.initialize()` concurrently on page load. If init doesn't deduplicate, you get 3 DuckDB workers and 3 connections — the first two leak.

**Rule:** `initialize()` caches its promise. Concurrent callers share the same init work. On failure, the promise is cleared to allow retry.

## OPFS cache key collisions

**What happens:** If two artefacts share the same cache key (filename), each download evicts the other. On multi-model projects with per-model artefacts (like `client-element-metas`), this causes 400+ redundant blob fetches every page load.

**Rule:** Use unique cache keys. For per-model artefacts: `{modelArtefactId}.parquet`. For `svf2-object-id-map`: `models/{modelId}/svf2-object-id-map.parquet`.

## Backend reports fileSizeBytes: 0

**What happens:** Some artefacts (e.g. `activity-progress`) have `fileSizeBytes: 0` in the API response even though the actual file is 42 MB. If the cache uses this for validation, it sees `expected 0, got 42047491` → invalidates → re-downloads every load.

**Rule:** Store the actual `byteLength` after download, not the API-reported size. Skip size comparison when the stored size is 0.

## Fragment visibility duplication

**What happens:** If `applyColors()` is called twice (e.g. once from `OBJECT_TREE_CREATED` and once from the `combineLatest` subscription), you get a redundant 14M-fragment visibility scan.

**Rule:** Colors are applied exclusively from the `combineLatest(geometryLoaded$, elementDynamicStatusViewLoaded$)` subscription. `OBJECT_TREE_CREATED` only sets the model reference. The color service tracks `_lastFilters` and has a `_hasColorRelevantFilterChange()` guard to skip no-op re-colours.

## Listener accumulation

**What happens:** `DashboardStatisticsService.initialize()` re-attaches `MODEL_ROOT_LOADED` and `AGGREGATE_SELECTION_CHANGED` listeners every time `setModel()` is called. Old listeners are never removed → callbacks pile up over the session.

**Rule:** Always remove existing listeners before re-attaching in any `initialize()` or `setModel()` method.

## Progress panel 0% flash

**What happens:** Pipeline A finishes (fast, OPFS-cached) → `isLoadingFiles = false` → spinner removed → but `_queryAllData()` hasn't returned yet → `maxActualProgress` is null → panel renders "0.00%" for ~1 second before real data arrives.

**Rule:** The panel uses `hasReceivedData = maxActualProgress !== null` to keep the spinner visible until real data arrives. The service also runs `_queryDataDateRange()` before setting `isLoadingFiles = false`.

## Federated folder naming

**What happens:** Model init looks for a folder containing "federated" (case-insensitive). Projects that name their folder "03.FEDERATED" or "Federated Models" still match. Projects without any such folder get no model and no viewer.

**Rule:** This is a convention, not configurable. If a project doesn't follow it, the dashboard shows nothing. This is intentional — silent wrong-model loading is worse than a visible error.

## BehaviorSubject disposal

**What happens:** If `dispose()` doesn't `.complete()` all BehaviorSubjects, dangling subscriptions survive the component unmount and continue receiving stale emissions on the next project load.

**Rule:** Every BehaviorSubject created in a service must be `.complete()`d in `dispose()`. There were ~31 subjects; only 11 were completed before the fix.

## Linked-element count can exceed what geometry can back

An activity's linked-element **count** and its **model list** are built from the element metadata
parquet (`client-element-metas` / `project_element_list`), while **selection** needs the loaded
geometry. `model.elementId2dbId` is the intersection of the two
(`model-mapping-service.ts:372-384`), so when metadata retains elements the current model version's
geometry no longer has, the UI shows a count the user can never act on and select/isolate silently
resolves to nothing.

The same divergence inflates the denominator of backend-computed progress
(`InstalledElements / LinkedElements`), capping affected activities below 100% permanently.

Confirmed on three projects with two different triggers (model re-upload, and PC-EXCEL import
cross-writing buildings). Full recognition signature, diagnostic queries and remediation procedure:
`incidents/recurring-defect-patterns.md` § Pattern 1, and `incidents/data-remediation-runbook.md`.

Quick test: if a displayed percentage equals `installed / linked` exactly, the denominator is the
bug.

## svf2-object-id-map exists only for Navisworks-path models

`navisworks-model-mapper.ts:277` emits it; Revit models get their externalId to dbId mapping from
Forge's property DB at load time instead (`revit-model-mapper.ts:22`). Anything built on that
artefact, including `element_base_data` and therefore any dead-link detection that relies on it,
silently returns useless results on Revit-mapped projects rather than failing. Validate per project
before trusting such a query: on FAR01 only 22 of 101 models had the artefact, and a sweep based on
it produced 705k false positives.

## The dashboard element count is a geometry-object count, not an element count

`coloredDbIds` is assembled from `objectId`s to paint the viewer, then reused as a statistic and
displayed under the label "Elements" (`dashboard-color-service.ts:679-698`,
`dashboard-element-stats.tsx:41/49`). A federated file holds more objects than elements, because
the same element can sit in several sub-models and each copy is its own object. On FAR01 that is
737,093 objects against 668,978 distinct elements, **9.24% more**, which is the whole of PLT-2874.

Comparing that figure to the editor's "Linked" count is meaningless: `ModelDetailsPanel.tsx:222`
counts distinct `modelElementId`. Before diffing any two counts across these surfaces, run
`COUNT(*)` against `COUNT(DISTINCT <id>)` on each side.

`_visible_elements` carries `modelElementId`, so the honest number is available without a
pipeline change.

## Dashboard service logs never print

`dashboard-logger.ts:35` hardcodes `CURRENT_LEVEL = 'SILENT'` in every build, so every
`logger.info` / `logger.success` from the dashboard services is dropped, including
`[📊 DYNAMIC-STATUS]` and the artefact loaders. `window.dashboardLog` only edits the exclusion
list, not the level. The lines that do appear in prod are raw `console.log` / `console.table`.
Do not plan a diagnosis around reading a dashboard log line — query the page's DuckDB instead.

## The dashboard loads one federated model, chosen arbitrarily

`dashboard-project-service.ts:164-175` takes the first folder whose name contains "federated",
then `.find()`s the first model in the paginated response with that `parentModelFolderId`. No
`isFederated` flag, no version or recency rule, no ordering guarantee from the API. Every figure
on the page derives from that one file and the rest are invisible, with no UI indication. FAR01
has two near-twin models in that folder (667,614 and 665,074 elements) so the impact is 0.4%
there, but a project with two genuinely different federated models would show arbitrary numbers.

## The dashboard filter panel hides categories with zero weight (PLT-2941)

`getCategorySummaryV2API` builds the discipline/package **option list** from the `category_groups`
parquet and ends with `AND ${weightColumn} > 0` (`progress-queries-v2-api.ts:577`). `weightColumn`
follows the project's progress weighting, and the default is `PLANNED_LABOUR_HOURS`
(`app/types/progress-weighting-types.ts:17-23`). So by default **any discipline or package with no
budgeted labour units disappears from the filter panel**, however many elements are linked to it.

Selecting an activity switches the page to activity level (`dashboard-progress-service.ts:311-349`),
where the weight is floored at 1 (`progress-queries-v2-api.ts:970`,
`GREATEST(COALESCE(pw.Weight, a.<col>, 0), 1)`), so the same category reappears. Same data, same
weighting, opposite outcome.

Symptom to recognise: a category is missing from the left panel but shows up the moment you click
an activity that carries it. Check `TotalPlannedLaborUnits` in `category_groups` before suspecting
a stale parquet — on the staging repro the parquet was complete on all 1,489 dates.

Full analysis: `planning/PLT-2941-dashboard-filter-list-hides-zero-weight-categories.md`.

## The schedule Elements column counts links, not elements

`scheduler-columns.tsx:180` renders `calculatedElementsSum`, computed by
`_calculateElementsSumRecursive` (`schedule-entity.ts:786-810`) as a plain sum of per-activity
counts down the activity tree with **no deduplication**. An element linked to three activities is
counted three times, so the root row is closer to a link count than an element count.

This is the third distinct unit across the product, alongside the dashboard's geometry-object
count and the editor Model details panel's distinct-element count. On LVN1 (Freshdesk 7514) all
three appear at once: 61,303 distinct elements, 81,826 from this rollup, 71,965 objects on the
dashboard. The 20,523 gap between the two editor figures is elements linked to more than one
activity.

Same trap as PLT-2882, where the schedule showed 798,751 and the API 798,841 for identical data.
PLT-2874 did not fix this one.

## The ElementState rule infers "is linked" from date presence, and the parity test hides it

There are two implementations of the ElementState rule: `calculateInstallationStatus`
(TS, `installation-status-utils.ts`) and `buildInstallationStatusCaseSql`
(SQL, `dashboard-progress/utils/installation-status-sql.ts`). They disagree on one input.

The TS rule branches on `scheduleId` — "linked to an activity at all" — so a linked element with
no activity dates returns **Planned**. The SQL rule has no linked flag; its Planned branch is
`WHEN startDate IS NOT NULL OR endDate IS NOT NULL` (`installation-status-sql.ts:63`), so the same
element falls to `ELSE NULL` = **Not Planned**. Yellow vs grey, and it also drops out of a Planned
status filter.

This is reachable, not theoretical: `schedule-service.tsx` `syncActivityDates()` ends with
`.filter(row => row.startDate || row.endDate)`, so an activity carrying no dates never gets a row
in `schedule_activity_dates`, and `getElementStateCodes`'s `linked` CTE LEFT JOINs it to NULL.

`installation-status-rule-parity.test.ts` cannot catch this. It generates rows with
`scheduleId: startDate || endDate ? 'act1' : ''` and states the assumption in its scope note
("Links carry dates, so scheduleId presence ⇔ a date is present"). The axiom is baked into the
fixture, so the one divergent branch is unreachable by construction. It is also single-row, so it
does not cover multi-activity aggregation either — the SQL takes `MIN(startDate)`/`MAX(endDate)`
across *all* of an element's activities, where the old viewer used `activities[0]` only.

Raised on #2081 (PLT-2743). Before trusting that parity test as a drift guard, check whether the
case you care about is expressible in its fixture.
