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

## 2026-07-24 (later) — A3 + A4 executed: dead-link list PRODUCED, editor step obsolete

**A3 matched A2 exactly:** `no_geometry_row` = 34 / 3 / 114 / 1 / 41 per activity,
`row_but_null_objectid` = 0 everywhere. So for ELN03's containment models, `element_base_data`
membership is a **reliable geometry-existence oracle** (the models are on the svf2-object-id-map
path), and "not installed" ≡ "no geometry" for these five activities — the customer really did
claim everything claimable.

**A4 returned exactly 193 rows** (`userItemId, activityId, modelElementId`) — the complete
deletable dead-link list, produced entirely from the dashboard's DuckDB. **No editor
`__linkDiagnose` run needed** (its earlier failure — wrong active schedule, no models loaded — is
moot). Activity UUIDs confirmed in the output, e.g. JUPSA21030 = `a9dfadf0-c52c-4a1f-8675-dd43ec1d1b6d`,
KUPSD21420 = `2f7b16e8-813c-41d4-bafd-8801d0f1a929`, JSCOR1060 = `a29ba508-6654-4cdf-8475-48ea46e0e4e1`.

**Audit record:** operator to export A4 as CSV (explorer's CSV button) and attach to the Jira
ticket before any deletion — same discipline as PLT-2882's 418-row CSV.

### Method note for future runs (new, generalizes)

`activity_links LEFT JOIN element_base_data … WHERE ebd.modelElementId IS NULL` is a **pure
dashboard-side dead-link detector** — no branch, no editor session, no harvest scripts — valid on
any project whose models produce svf2-object-id-map artefacts (Navisworks path; NOT Revit-mapped
models, where element_base_data lacks rows for everything and this over-counts). Validate per
project the way A3 did here: cross-check counts against `installed` on activities the customer
claims are fully done, and expect `row_but_null_objectid = 0`.

### Expected post-remediation state

After the 193 links are soft-deleted and the Progress Outputs parquet regenerates:
KUPSB21200 88/88, JUPSC21480 110/110, JUPSA21030 111/111, JSCOR1060 53/53, KUPSD21420 111/111 —
all 100% → **Containment package 100%**, variance clears.

## 2026-07-24 — audit CSVs validated (both tickets), ready to attach

Operator exported both detail files; validated programmatically:

| File | Rows | Per-activity | Activity UUIDs | Dupes | Format |
|---|---|---|---|---|---|
| PLT-2931 (ELN03) | **193** ✅ | JSCOR1060 1, JUPSA21030 114, JUPSC21480 3, KUPSB21200 34, KUPSD21420 41 — **matches A2/A3 exactly** | one UUID per activity, no bleed | 0 | ASCII, LF, no BOM |
| PLT-2882 (FAR01) | **418** ✅ | FAR01UGD1220 418, activityId `7c4f2509-3bce-4005-971d-46e82610b1a4` — matches the investigation log | 0 | ASCII, LF, no BOM |

Also checked: every `modelElementId` is a well-formed UUID; distinct-ID count equals row count in
both files (193 / 418 — no repeats); zero cross-file overlap (different projects, as expected);
all rows exactly 3 fields (`userItemId,activityId,modelElementId`) so they parse directly into the
`{modelElementId, activityId}` payload with no cleanup.

Both files are attachment-ready and deletion-ready. Each fits one ≤500 batch.

Status: list ready + verified. Remaining: CSV export (operator) → deletion approval
(Pietro/Mostafa, drafted in recommended-action.md) → one soft-delete batch (193 ≤ 500/batch,
`POST /api/v2/projects/{pid}/elements/activity-links/delete`, needs ELEMENT_EDIT+DELETE) →
verify dashboard after next parquet regeneration → ELN03-wide cohort query (below) → BE trigger
question stays with the PLT-2882/2909 thread.
