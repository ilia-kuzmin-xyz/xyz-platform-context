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

## Reading live frontend state on prod, without a build (2026-08-27)

The fastest way to end an argument about what the frontend actually holds. It cracked PLT-3084 and
PLT-3091 in one paste each after days of inference.

`enableGlobalWebViewerAPI` exposes `window.projectService`
(`project-x/project-provider.tsx:91-95`). It defaults `false`, but feature flags are read from a
**`feature-flags` cookie**, not from the bundle (`helpers/getFeatureFlagValue/getFeatureFlagValue.ts:5-15`),
so it can be switched on against a deployed prod build with no deploy and no code change.

⚠️ **Append to the cookie, never replace it.** `getFeatureFlagValue` reads the whole list from the
cookie and only falls back to `config/constants.ts` defaults **per missing name**. Overwriting the
cookie with a single-entry array silently reverts every other flag to its default — including the
one the customer is using. On PLT-3091 that would have switched off `Editor-Progress`, the feature
under test.

```js
const cur = (document.cookie.match(/(?:^|;\s*)feature-flags=([^;]*)/) || [])[1]
const flags = cur ? JSON.parse(decodeURIComponent(cur)) : []
document.cookie = 'feature-flags=' + encodeURIComponent(JSON.stringify(
  [...flags.filter(f => f.name !== 'enableGlobalWebViewerAPI'),
   { name: 'enableGlobalWebViewerAPI', value: true }])) + ';path=/'
```

Terser is configured without property mangling (`webpack/webpack.prod.js:65-90`), so private fields
read cleanly on the production bundle: `projectService.historyService._history`,
`linkingService.undoStack`, `activeSchedule.activities`, and so on. Reads are safe — no network, no
mutation. `constructor.toString()` on any service tells you **which build is actually deployed**,
which is how PLT-3084 was finally settled.

## What prints on a prod build, and what does not (2026-08-27)

Three independent gates, and getting them wrong wastes a round trip:

- **`console.log` is replaced with a no-op on prod** unless the URL carries `?logging=true`
  (`ViewerPage/hooks/use-logging.tsx:18-28`). `console.warn` and `console.error` are untouched.
- **`logger.info` / `logger.debug` never reach the prod console** —
  `CONSOLE_VERBOSE = process.env.NODE_ENV !== 'production'` (`services/logService/logger.ts:15-19`).
  `warn` and `error` always do. **Write diagnostics at `warn`, not `info`,** or they are invisible
  in the only environment that matters.
- **The build strips nothing.** No `drop_console`, no `pure_funcs` (`webpack/webpack.prod.js:65-90`).

Every line that passes `minLevel` is also written to an OPFS session log regardless of the console
(`logger.ts:99-108`), uploaded periodically and on error by `log-auto-upload.ts`, and retrievable by
the user via **Help → Sync logs**, which copies a session id to their clipboard
(`shared/layout/appbar/components/HelpMenu/SyncLogModal.tsx`). That is where the
`platform-web-…` session ids on incident tickets come from. It is a working diagnostic channel that
we have mostly not been putting anything useful into.

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

**2026-08-07 — this is now Pattern 5's leading real-world case (PLT-3024, ML9):** a model with
real linked elements, confirmed visible in the Web Viewer, absent from the Dashboard. Leading
hypothesis: the model simply isn't inside the folder named "federated". Unconfirmed against ML9's
actual model tree — see `incidents/recurring-defect-patterns.md` Pattern 5 and
`incidents/live-incident-board-tickets/PLT-3024-groupA-viewer-and-model/context.md`.

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

## "Is linked" must not be inferred from schedule-date presence

`buildInstallationStatusCaseSql` (`dashboard-progress/utils/installation-status-sql.ts:63`) reaches
Planned via `WHEN startDate IS NOT NULL OR endDate IS NOT NULL` — it has no linkage input, so date
presence stands in for "linked to an activity". That proxy breaks for a linked element whose
activity carries no dates: it falls to `ELSE NULL` = **Not Planned** (grey) instead of Planned
(yellow), and drops out of a Planned status filter.

The case is reachable, not theoretical. `schedule-service.tsx` `syncActivityDates()` ends with
`.filter(row => row.startDate || row.endDate)`, so a dateless activity never gets a row in
`schedule_activity_dates`, and the `linked` CTE LEFT JOINs it to NULL.

**Viewer: fixed** (#2081, PLT-2743). `getElementStateCodes` now writes its CASE inline and derives
Planned from `linked.modelElementId IS NOT NULL` off the FULL OUTER JOIN, so linkage is read
directly. It no longer uses the shared builder — the builder's four-column-expression interface is
exactly what put linkage out of reach.

**Dashboard: still on the old proxy, and this is a confirmed bug against spec.** It keeps using
`buildInstallationStatusCaseSql`. Two authoritative sources say linkage is the discriminator:

- *Element Status Definition* (XKB1 `1794080772`, Darminder, Jun 2026) — "**Not Planned/No linked
  activity** (Grey)".
- *Dashboard — Progress Tab Explained* (XSHW `2276556802`) §2 — step 5 "Not installed, but it **is
  linked to the schedule**? → Planned"; step 6 "**Not linked to any schedule activity at all** → no
  colour".

The builder's own docstring also says `ELSE NULL` means "not linked to any schedule", so linkage was
always the intent — date presence is an implementation shortcut that silently diverges from it.

Dashboard blast radius (`progress-queries.ts:762`): `element_with_schedule` takes
`MIN(ac.StartDate)`/`MAX(ac.FinishDate)` over `activity_links → activity_calendar`, so dates go NULL
both when the activity is undated **and** when it is absent from `activity_calendar` (e.g. links to a
superseded schedule revision) — the second is likely the more common trigger. `status_counts` then
filters `WHERE dynamicStatusCode IS NOT NULL`, and the status-filter query
(`dashboard-progress-service.ts:1981`) filters `AND status_code IS NOT NULL`, so affected elements are
uncoloured, absent from status counts, and unselectable by a status filter.

**2026-08-07 — candidate live occurrence (PLT-3024, unconfirmed on the actual project data):** a
customer on ML9 reported models with real linked elements missing entirely from the Dashboard
(fine in the Web Viewer). The superseded-schedule-revision trigger above is one of the ranked
hypotheses — a model's activities linking to a revision that's no longer `isCurrent` in
`api_activities` would produce exactly this per-model blank. Not confirmed against ML9's actual
schedule-revision history; see
`incidents/live-incident-board-tickets/PLT-3024-groupA-viewer-and-model/context.md` §H2a for the
falsifiable check.

**Not affected:** Actual%/Planned%/Variance/SPI come from pre-computed progress parquets, not from
these status codes (same page §4, §7). This bug does not skew the percentages.

Note the two surfaces read different date sources — the viewer projects `schedule_activity_dates` from
the loaded schedule, the dashboard reads the `activity_calendar` parquet — which is why #2081 fixed
only the viewer and deferred unification.

### The parity test that missed it (deleted, and why)

`installation-status-rule-parity.test.ts` compared the TS rule against the SQL rule and passed
throughout. It generated rows with `scheduleId: startDate || endDate ? 'act1' : ''` and stated the
assumption in its scope note ("Links carry dates, so scheduleId presence ⇔ a date is present"),
so the one divergent input was excluded by construction. It was also single-row, so multi-activity
aggregation was uncovered.

Both it and `calculateInstallationStatus` are now deleted, replaced by
`duckdb-element-store.element-state-table.test.ts` — an exhaustive branch table run through the real
`getElementStateCodes`, asserting literal expected states. General lesson: **two implementations
compared against each other cannot catch a misreading they share.** Assert against expected values,
not against a sibling implementation.

Related behaviour worth knowing: before the schedule projection exists, linked elements now derive
**Planned**, not Not Planned — so a transient yellow on load, correcting once the schedule lands.
And the derive takes `MIN(startDate)`/`MAX(endDate)` across *all* of an element's links (widest
window, matching the dashboard aggregate); the pre-#2081 viewer used `activities[0]` off an
unordered map.

### The fix independently re-verified (2026-08-04), and the one thing to check if it ever regresses

The #2081 rule was re-run outside the repo's test suite — the same 60-row branch table replayed
against a standalone DuckDB, 60/60 matching the documented rule. Worth knowing *how* it can break,
because the fix rests on one non-obvious SQL detail:

```sql
FROM status FULL OUTER JOIN linked USING (modelElementId)
...
WHEN linked.modelElementId IS NOT NULL THEN 0   -- Planned
```

`USING` merges the join column, so the **unqualified** `modelElementId` is the coalesced value —
non-null on every row. Linkage is read only because the **qualified** `linked.modelElementId` still
resolves to the right-hand side's own value, which stays NULL for an unmatched (unlinked) row.
Verified directly: 6 qualified-NULL rows for exactly the 6 unlinked fixtures.

If a future edit drops the `linked.` qualifier, or swaps `USING` for an `ON` + `COALESCE` of the two
ids, **every element carrying a status row derives Planned** — the whole model paints yellow. The
branch table catches it (the 4 unlinked-and-not-installed rows fail), so that test is load-bearing,
not decorative. Do not "simplify" it away.

## Two "Select all"s in the activity-linking-list panel do different things (found on PLT-3084, 2026-09-04)

`activity-linking-list/hooks/useActivityMenu.ts:126-129` (the panel's `...` menu) and
`hooks/useContextMenu.ts:78-81` (a row's right-click menu, backed by `useElementSelection.ts:55-62`)
are both labelled **"Select all"** but do different things: the menu version calls react-arborist's
own `treeRef.current?.selectAll()`, which only checks tree rows — it never touches the 3D viewer.
The row-menu version resolves visible nodes to dbIds (`collectSelectableDbIds.ts`) and calls
`viewer.setAggregateSelection(...)`, which does. Reaching the 3D view from the panel menu needs a
second, separate click on **"Show selected in 3D view"** (`useActivityMenu.ts:136-140`). A user
who clicks only "Select all" expecting the model to highlight sees nothing happen and reasonably
reports it as broken — this is the leading (unconfirmed — video unopenable) hypothesis for PLT-3084's
09-03 reopen. If this class of report recurs, check which "Select all" was used before assuming a
regression.
