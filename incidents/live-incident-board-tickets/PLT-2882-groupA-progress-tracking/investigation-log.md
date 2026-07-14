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

## 2026-07-14 — ROOT CAUSE CONFIRMED (diagnostic run, twice, incl. cold cache)

`__linkDiagnose()` on activity `7c4f2509-3bce-4005-971d-46e82610b1a4` ("Retired", 418 links).
Run twice: normally, then again after wiping OPFS (`duckdb-cache`). **Byte-identical output** —
so this is **not** a stale client cache.

**Where the 418 die — every layer passes until one:**

| Layer | Result |
|---|---|
| `activity_links` bridge | 418 |
| → `projectService.elements` registry | **418** resolved, 0 unresolved |
| → `sourceFileElementId` present | **418** |
| → model membership | both models, both `isLoaded: true` |
| → active filters | **0** (filters are innocent) |
| → viewer `elementId2DbId` (87,854 entries) | **`dbIdHitCount: 0`** ← the cliff |
| → `parquetVsGeometryByMongoModelId` | `inParquet: 418`, `inGeometry: 0`, **`inParquetNotInGeometry: 418`** — on **both** models |

**Verdict: the element-metadata parquet and the SVF geometry disagree, for the same model
version.** `model.elementId2dbId` is the INTERSECTION of the loaded geometry's externalIds and
the model's `client-element-metas` parquet (`model-mapping-service.ts:372-384`). All 418 are in
the parquet; **none** are in the geometry. The links are valid, the registry is valid, the
metadata is valid — the geometry simply has no such elements.

**The 4 source files behind the 418 (`<sourceFileGuid>-<handle>` externalIds):**

| Source file GUID | Linked | Present in loaded geometry |
|---|---|---|
| `bb85941b-…` | 141 | **18,908** elements — file fully loaded, yet **0 of the 141 handles exist** |
| `908dd088-…` | 180 | 25 — all but gone |
| `3bb78c12-…` | 96 | **0** — absent |
| `72715ba4-…` | 1 | **0** — absent |

`bb85941b` is decisive and kills the simple "a source file was deleted" story: that file is
**present and large** in the geometry, but the *specific element handles* the links point at are
gone. So the links reference a **superseded generation of model content** — source files since
removed (`3bb78c12`, `72715ba4`), shrunk (`908dd088`), or **re-exported with new handles**
(`bb85941b`) — consistent with the `REV1-V23` / `V35` re-versioning.

This **confirms the assignee-team hypothesis** (Ilia, 2026-07-13) with one correction: it is
**not** that a *project model* was deleted (both models are present and loaded). It is that
content *inside* the federated models was re-versioned, and both `activity_links` **and the
element-metadata parquet** still carry the dead generation.

### Two tracks, both now precisely scoped

**1. Data / pipeline (root cause — BE).** One question, answerable with a query:
> For model `PC-APLD-FAR01-UND-AKS_REV1-V23` (`210b8255-20b7-4549-b44c-c23f88ecd3e5`), why does
> its `client-element-metas` parquet contain 418 elements whose `sourceFileElementId`s are absent
> from the same model version's SVF / `svf2-object-id-map`? Were those source files removed or
> re-exported, and is the element-meta artefact regenerated on re-version?

Then: clean/re-link the stale `activity_links`, and enumerate the cohort (all activities whose
links resolve to 0 — likely most "(Retired)" ones).

**2. FE robustness (ours, real regardless).** The panel's "418" comes from parquet-resolved
`ElementEntity`s; selection needs geometry, which has 0 — and `setAggregateSelection([])` fails
**silently**. We show a count the user can never act on, then do nothing. Fix: surface
"N of M linked elements are not in the loaded model(s)" (toast or panel note), and reflect it in
the count/menu-enablement. Owner: Darminder / FE.

Confidence: **root cause 9/10** (mechanism read from source, confirmed by data, cache excluded,
reproduced twice). Remaining unknown is purely *why* the pipeline left the metadata behind — a
BE question, not an FE one.

Status: diagnostic complete. Branch `PLT-linked-selection-diagnostics` (rebased on master,
`console.log` only — **not for merge**). Awaiting BE answer + FE robustness ticket.
