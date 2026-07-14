# PLT-2882 — investigation log (execution of the evidence step)

Continues `recommended-action.md` § "The one evidence step to run". Owner: Ilia Kuzmin.

## 2026-07-14 — new e2e observation narrows the failure layer

Ilia walked the repro on the affected project:

- Activity property panel shows **"linked elements — 418"**.
- Clicking the count lists **2 models** the elements are assigned to.
- **Both models were loaded**, then context menu → **Select linked elements** → **0 selected**.

This kills one of the two candidate failure modes from `context.md` § Mechanism (menu
greyed-out vs clickable-no-effect):

- The panel's count and its **model list are built from resolved `ElementEntity`s**
  (`linking-service.ts:757-761` → `ElementEntity.getModels()`), so the 418 UUIDs **do
  resolve in `projectService.elements`** — the layer-2 drop (registry orphans) is NOT
  where these die.
- Both membership models are loaded, so "model not loaded" is out too.
- Remaining suspects, in order:
  1. **Viewer maps miss** — `viewerService.elementId2DbId` / `elementId2ModelId` are keyed
     by `sourceFileElementId` (externalId) and built from the **loaded geometry's**
     externalId→dbId table, intersected with the model's cloud element list
     (`model-mapping-service.ts:226-242`, `hasExternalIdInCloud` guard at `:227-230`).
     If the element records carry externalIds from a **superseded model version** (the
     `..._REV1-V23` lineage), the lookups miss and selection is empty. This is the
     orphaned-generation hypothesis, one layer deeper than the registry.
  2. **Filter intersection** — if any model filter is active,
     `use-linked-element-actions.ts:47-50` intersects with `allowedDbIdsByModel`; a model
     with **no entry** in that map drops **everything** silently.

## Zero-code differential test (10 s, decides filter vs maps)

Same context menu → **Isolate linked elements** (`use-linked-element-actions.ts:65-91`)
uses the *identical* map lookups but **skips the filter intersection**:

- **Isolate works, select doesn't** → filter path. Clear active filter chips, retry.
  (Also an FE bug on its own: an absent `allowedDbIdsByModel` entry nukes selection with
  no feedback.)
- **Isolate also does nothing** (its empty branch calls `showAll()`) → viewer-map miss →
  externalId generation mismatch between element records and loaded geometry.

## Diagnostic branch (implements the evidence step end-to-end)

Branch **`PLT-linked-selection-diagnostics`** (based on master, commit `6ed38b7f0`,
console.log only, NOT for merge). Adds `window.__linkDiagnose(activityId?)` in
`LinkingService` — with an activity selected (or an explicit id) it prints one JSON blob
walking every layer; the first count that drops from ~418 is the culprit:

| Field | Layer it tests |
|---|---|
| `rawLinkCount` | activity_links bridge (the Gantt/panel count) |
| `resolvedEntityCount` / `unresolvedUuidSample` | UUID → `projectService.elements` registry |
| `withExternalIdCount` | entity → `sourceFileElementId` present |
| `modelMembership` | claimed mongo models, loaded state, cloud-list size |
| `loadedForgeModels` | what the viewer actually has + mongo mapping |
| `dbIdHitCount` / `dbIdMissSample` | externalId → `elementId2DbId` (likely cliff) |
| `cloudCheckByMongoModelId` | externalId in cloud element list / direct `getDbIdForElement` |
| `activeFilterCount` / `allowedDbIdsByModel` | filter intersection state |
| `simulatedSelectionByForgeModelId` | exact before/after-filter dbId counts selection would produce |

Run steps: checkout branch → editor page on FAR01 → load both models → select
`FAR01UGD1220` → `__linkDiagnose()` → paste JSON back.

Run the same call for **one working activity** in the same model — the broken-vs-working
diff (playbook move #3) is the confirmation `recommended-action.md` asks for.

## Routing once JSON is in

- `dbIdHitCount ≈ 0`, `cloudCheckByMongoModelId` low → **orphaned externalId generation**
  → data fix (re-link / clean stale `activity_links`) → BE/data; FE keeps the secondary
  robustness fix (surface "N of M linked elements aren't in the loaded model").
- `dbIdHitCount ≈ 418` but `afterFilter = 0` → **filter path bug/state** → FE fix
  (don't drop to `[]` on a missing `allowedDbIdsByModel` entry; give feedback).

Status: diagnostic pushed, awaiting e2e run + JSON. Confidence unchanged from context.md
(mechanism 8/10; specific root cause pending the diff).
