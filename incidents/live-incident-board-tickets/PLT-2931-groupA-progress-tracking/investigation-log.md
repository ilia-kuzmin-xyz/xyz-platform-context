# PLT-2931 — investigation log

## 2026-07-24 — Confirmation runs A1 + A2 executed (DuckDB Explorer, ELN03 dashboard) — MECHANISM CONFIRMED

Operator ran both queries from `context.md` § Confirmation runs. Results, cross-checked:

| Activity | linked (A2) | installed (A2) | dead links (A2) | installed/linked | dashboard % (A1) | match |
|---|---|---|---|---|---|---|
| KUPSB21200 | 122 | 88 | **34** | 72.13% | 72.13 | ✅ exact |
| JUPSC21480 | 113 | 110 | **3** | 97.35% | 97.35 | ✅ exact |
| JUPSA21030 | 225 | 111 | **114** | 49.33% | 49.33 | ✅ exact |
| JSCOR1060 | 54 | 53 | **1** | 98.15% | 98.15 | ✅ exact |
| KUPSD21420 | 152 | 111 | **41** | 73.03% | 73.03 | ✅ exact |

- **All five dashboard percentages equal installed ÷ linked to two decimals.** The denominator
  inflation hypothesis is no longer a hypothesis.
- **Total dead links across the 5 activities: 193.**
- A1 also showed `linkedElementCount` (API) == `parquet_linked` (activity_progress) for all five —
  API and parquet agree on the inflated denominator; the defect is upstream of both (the links
  themselves), not a parquet-generation divergence.
- All five activities are `TK_Complete` in the schedule — corroborates that the un-installed
  remainder is dead links, not pending work.

## Editor diagnostic (`__linkDiagnose`) — first attempt FAILED; diagnosis of the failure

Run on the editor page returned `translatedFromUserItemId: "no activity matched 'KUPSB21200' by
userItemId or itemId (schedule has 8376 activities)"` with `selectedActivities: []`,
`loadedForgeModels: []`, `viewerMapTotalSize: 0`.

Three independent problems visible in that output:
1. **No models were loaded** (`loadedForgeModels: []`) — the parquet-vs-geometry comparison can't
   run without geometry; must load the containment models first.
2. **No activity selected** (`selectedActivities: []`) — the tool falls back to the name lookup.
3. **The name lookup searched a schedule that doesn't contain KUPSB21200** (8376 activities, no
   match by userItemId or itemId) — the session's *active schedule* is a different one/revision
   than the schedule visible in Yash's screenshot (dropdown: `101342_LIVE-2-25-26_For_new_
   dashboard_test_updated__1_ (3)`, "Baseline & Current"). The links map itself is keyed by
   activity UUID and is schedule-independent, so passing the internal UUID bypasses the lookup.

Fixes (any one suffices): select the correct schedule then click-select the activity and call
`window.__linkDiagnose()` bare; or pass the internal UUID (`api_activities.itemId`) directly.

## A3 (added this run) — dead-link identification WITHOUT the editor

`element_base_data` is materialized from element_status + activity_links + api_activities +
svf2_object_id_map — i.e. it already encodes "has geometry mapping". If the per-activity count of
linked elements with no `element_base_data` row (or NULL `objectId`) equals A2's dead-link counts
(34/3/114/1/41), the deletable modelElementId list can be exported from the dashboard's DuckDB
alone, and the editor step becomes optional corroboration. Queries in the thread / below.

Caveat: `svf2-object-id-map` is produced for Navisworks-path models only (PLT-2882 cohort-sweep
finding). If ELN03's containment models are Revit-mapped, `element_base_data` may lack geometry
mapping for ALL their elements and A3 will over-count — the mismatch itself would tell us the
model type and push confirmation back to the editor/`__linkDiagnose` route.

Status: awaiting A3 output (+ editor re-run if needed). After that: export ID list → deletion
approval (Pietro/Mostafa) → soft-delete batches (PLT-2882 endpoint pattern) → verify Containment
reaches 100% on next parquet regeneration.
