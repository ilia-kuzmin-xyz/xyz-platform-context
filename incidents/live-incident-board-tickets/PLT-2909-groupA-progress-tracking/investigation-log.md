# PLT-2909 — investigation log

Owner: Ilia Kuzmin (assignee) + Claude (this log). Continues `context.md` (mechanism:
model list built from parquet metadata, no geometry check; 3-way candidate split).

## 2026-07-22 — `__linkDiagnose` run on ATL08 / CY-5200: VERDICT

Setup notes (first run failed, lessons captured):
- Passing `'CY-5200'` as the argument found nothing — the schedule (6,797 activities)
  has no match on `userItemId`/`itemId` for that string, even though the panel displays
  "CY-5200". The tool's `selectedActivities` capture saved the day: the real activity
  UUID is **`a9904432-d797-4146-80b7-d9fa19756955`**. (Side curiosity for later: why
  does the panel show an ID the schedule lookup can't find — different field or
  formatting? Not load-bearing.)
- Second run also needed **models loaded first** (first run had `loadedForgeModels: []`).
  Final run loaded 3 of the 6 panel-listed models: `DistributionBoardsPanels_Bld1-V1`
  (suspected ghost), `EquipmentOthers_Bld2-V1` (the "real" one), `SWITCH - ATL8-260703`
  (federated model).

### Key output (activity `a9904432…`, 6 raw links, all resolving, all with externalIds)

All 6 externalIds share ONE source file guid: `dd20b121-577e-4a16-a6bc-ee97a388f5ee`,
sequential handles `…-00380472` → `…-00380476` (+1). That source file contributes 897
elements to the loaded viewer maps overall.

| Model | inParquet | inGeometry | inCloudList | directDbIdHits | Verdict |
|---|---|---|---|---|---|
| PC-EXCEL…DistributionBoardsPanels_**Bld1**-V1 (cloud list 219) | **6** | **0** | **0** | 0 | **GHOST** — metadata claims membership; geometry AND cloud list deny it |
| PC-EXCEL…EquipmentOthers_**Bld2**-V1 (cloud list 594) | 6 | 6 | 6 | 6 | REAL (the model Kyriakos named) |
| **SWITCH - ATL8-260703** (federated, cloud list 434,829) | 6 | 6 | 6 | 6 | REAL — legitimate federated membership |

Also: `modelMembership` shows all three claiming `elementCount: 6` (the panel's source);
`mapHitsByForgeModelId: {3: 6}` (viewer maps resolve the externalIds to the fed model);
`simulatedSelection` fed model = 6 before/after filter → **selection works**, so unlike
PLT-2882 this ticket is purely a wrong-model-LIST bug, not a selection failure.

### 3-way candidate split — RESOLVED

- **(a) Ghost metadata membership: CONFIRMED** for Bld1 (and by symmetry, presumably
  the other 3 unloaded panel models: DistributionBoardsPanels_Bld3, EquipmentOthers
  Bld1/Bld3 — optional confirmation: load them + rerun). Same defect class as
  PLT-2882: `client-element-metas` disagrees with geometry for the same model version.
  → **Same root-cause FAMILY as PLT-2882 confirmed with data** (Ilia's on-ticket
  hypothesis; Yash's caution honored and now answered).
- **(c) Federated membership: REAL and by-design** — the fed model legitimately
  contains the elements. One of the customer's "wrong" six is actually correct and
  just needs explaining/UX (should the panel list the fed wrapper?).
- **(b) Genuine multi-model metadata overlap:** the overlap exists ONLY in metadata,
  not in geometry/cloud lists → it is (a), not benign duplication.

### Nuance vs PLT-2882 — likely a DIFFERENT trigger, same defect class

PLT-2882 (FAR01): stale metadata left behind by model **re-versioning** (geometry
re-uploaded, metas not regenerated). Here, Bld1's cloud list has only 219 elements and
contains none of the 6 — these are per-building **PC-EXCEL imports** sharing source
file `dd20b121`. Most plausible origin: the **Excel import pipeline wrote overlapping
element rows into multiple per-building models' `client-element-metas`** at import
time (shared workbook → same rows emitted per building). Same symptom family, but the
fix lives in the Excel-import/metas-generation path, not the re-upload path.

### Routing

1. **BE/pipeline question (owner: David Webb / api-v2 Ali)** — the decisive ask:
   > For ATL08 model `PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_DistributionBoardsPanels_Bld1-V1`
   > (mongo `00156181-fca5-4a7c-acdf-a12ce924c252`): why does its `client-element-metas`
   > contain elements of source file `dd20b121…` (handles 00380472-6) that are in
   > neither its geometry nor its cloud element list (219 elements)? Does the PC-EXCEL
   > import write a shared element registry across the per-building models? If yes,
   > that's the root cause for PLT-2909 across ATL05-08, and the fix is in the import +
   > a metas regeneration for the affected models.
2. **FE robustness fix — SHARED with PLT-2882:** don't render models with
   `inGeometry = 0` in the linked-elements panel (or badge them "not in current
   model"); decide whether to show the fed wrapper. One fix covers both tickets'
   FE halves (owner: Darminder).
3. **Cohort:** customer says all ATL05-08 — once BE confirms the import behaviour,
   sweep = regenerate metas for all PC-EXCEL models on those projects rather than
   per-ticket fixes.
4. **Merge/link decision:** link PLT-2909 ↔ PLT-2882 as same defect class
   ("element-metadata parquet disagrees with geometry"), different triggers
   (re-versioning vs Excel import overlap). Do not close one as duplicate of the other.

## Status

Mechanism confirmed with live data: **9/10** for the ghost-membership finding on Bld1;
**7/10** that the Excel-import overlap is the origin (BE must confirm); the fed-model
listing is by-design. Remaining optional evidence: rerun with the other 3 panel models
loaded. Next hard step: the BE question above.
