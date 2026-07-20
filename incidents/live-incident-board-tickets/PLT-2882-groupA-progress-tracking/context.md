# PLT-2882 — "We can't filter retired activity - FAR01" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2882
- **Issue type:** Live Incident ("To track live incidents on site.") · Software / Web Viewer
- **Status:** **In Analysis** (category: In Progress / yellow). ⚠️ The triage brief said "Open" — it is **not**; it is already In Analysis and actively being worked. Freshdesk #7379, last set "Waiting on 3rd line" (2026-07-09) — i.e. back on us.
- **Priority:** Major
- **Project (site):** APLD — FAR01
- **Reporter:** Yash Patel (coordinator/support) · **Assignee:** Darminder Atker (fullstack lead)
- **Created:** 2026-07-09 · **Last updated:** 2026-07-13
- **Components / Labels:** none
- **Attachments:** 2 × `.mp4` screen recordings + 2 inline blob images in comment 1 (all unreadable here — see NEEDS HUMAN)
- **Domain slug chosen:** `progress-tracking` (deviates from the default `filter-system` — justified below)
- **Session IDs given:** customer `platform-web-1d4edbe3-...`; Yash's repro `platform-web-1a50c359-...`
- **Model in question:** `PC-APLD-FAR01-UND-AKS_REV1-V23`

---

## One-line symptom

In the **web viewer (ViewerPage)** the user cannot **select or isolate the 3D elements linked to one specific schedule activity** — *"Nw - Underground Electrical - Deep - Ug Elec Deep - Summary (Retired)"*, activity ID **`FAR01UGD1220`** — in model `PC-APLD-FAR01-UND-AKS_REV1-V23`. **Selecting/isolating linked elements works for other activities in the same model.** Reproduced internally by Yash Patel.

**This is NOT the dashboard filter panel and NOT a "missing retired filter".** The title's "filter retired activity" is the customer's colloquial wording; the actual operation is the viewer context-menu action **"Select linked elements" / "Isolate linked elements"** on a Gantt activity.

---

## Playbook questions applied

**1. What exactly is observed?** Not "the filter option is missing" and not "it filters the wrong set". The action produces **no selection / no isolation** for this one activity. It is present but *non-functional for FAR01UGD1220 specifically*. (Whether the menu item is greyed-out vs. clickable-but-no-effect is not textually stated — the videos would disambiguate. See NEEDS HUMAN, and Mechanism for why both are possible.)

**2. Expected behaviour, on whose authority?** Expected = the same "Select/Isolate linked elements" that demonstrably works for **other activities in the same model** (Yash, comment 1: *"when I tried to select elements from other activity from same model, it worked"*). That is a **broken-vs-working pair within one model, same day** — the strongest reference the playbook asks for, and it is evidence-backed, not folklore. No "it worked before this date" claim is made anywhere, so there is no dated-regression assertion to verify.

**3. Smallest broken-vs-working pair:** already handed to us — `FAR01UGD1220` (broken) vs any other activity in `PC-APLD-FAR01-UND-AKS_REV1-V23` (works). The diff to run is data-level (below).

**4. Mechanism — what decides it?** See next section. In short: the linked-element **count** shown on the Gantt is computed from the *raw* `activity_links` bridge, but **select/isolate resolves those IDs against the loaded project element registry and the loaded viewer models, silently dropping any that don't resolve.** An activity whose linked elements are orphaned (their model deleted/superseded, or not loaded) therefore selects/isolates nothing.

**5. Why now? (trigger)** Not established. The model name carries `REV1 / V23` (version 23). A plausible, **unconfirmed** trigger is a model re-upload / version change / model deletion on FAR01 that left `activity_links` rows pointing at elements no longer in the current project registry. This must be asked explicitly (see recommended-action).

**6. Cohort:** if the cause is orphaned links, the affected set is *every activity whose linked elements were orphaned by the same model change* — most naturally the **"(Retired)" activities**, which are exactly the schedule items most likely to reference superseded model content. Not yet enumerated.

---

## Mechanism (code-verified) — how "Select/Isolate linked elements" resolves

Path: Gantt activity context menu → `useLinkedElementActions` → `LinkingService` → viewer. All refs in `hc-frontend/src/main/webapp/app/pages/organisation/ViewerPage/`:

1. **Raw bridge (what the Gantt count uses).** `LinkingService.loadLinks()` streams the DuckDB **`activity_links`** table (element↔activity bridge) into in-memory maps — `services/linking/linking-service.ts:106-118, 255-272`. The Gantt activity's displayed element count is `getElementIdsForActivity(activityId).size` — the **unresolved raw set** — `components/project-x/entities/schedule-entity.ts:726-731` and `:742-751`. **This count does not check whether the elements still exist in the project.**

2. **Resolution drops orphans (what select/isolate uses).** `getElementsForActivity()` maps each raw ID through `projectService.elements.get(elementId)` and **`.filter(Boolean)`** — `services/linking/linking-service.ts:757-761`. `projectService.elements` is the project-level element registry (`components/project-x/project-service.ts:150`). **Any linked ID not in that registry (orphaned — e.g. its model was deleted) is silently discarded here.**

3. **Selection narrows again to loaded viewer models.** `use-linked-element-actions.ts:16-22` (`resolveLinkedElementIds`) feeds `selectLinkedElements` (`:24-63`), which keeps only IDs whose `viewerService.elementId2ModelId` / `elementId2DbId` resolve to a **currently-loaded** model, and further intersects with active viewer filters (`filterService.allowedDbIdsByModel`, `getModelActiveFilterCount()`). If nothing survives, `setAggregateSelection([])` selects nothing — **with no toast/warning.** `isolateLinkedElements` (`:65-91`): if nothing survives it falls through to `viewer.showAll()` — i.e. isolation appears to "do nothing".

4. **Menu enablement** uses the *resolved* count: `getLinksForSelectedActivity().length === 0` disables both items — `gantt-x/scheduler/scheduler-context-menu/activity-context-menu.tsx:72-89`. So there are **three progressively narrower sets**:
   - raw links (Gantt count) → may be > 0,
   - resolved to project registry (menu enable) → may be 0 (⇒ item greyed out), 
   - resolved to loaded-model dbIds (actual selection) → may be 0 even when the menu is enabled (⇒ click has no visible effect).
   Both of the latter two match "we are not able to isolate or select".

5. **Isolation tree** (`activity-linking-list`) has the same blind spot: `useLinkedElementsTreeData.ts:101-117` (`collectV2`) skips any linked element whose `projectService.models.get(modelId)` is missing (deleted model) or not loaded → the linked-elements tree/isolation shows nothing for that activity.

**This is exactly consistent with the assignee-team hypothesis on the ticket.** Ilia Kuzmin, comment 2026-07-13: *"the elements might be linked to models that were deleted, while the linked elements remained and are now orphaned."* The code has precisely that failure mode: `activity_links` retains the rows; `getElementsForActivity` / the viewer maps drop the now-unresolvable elements.

### "Retired" is not a code concept
`grep -i retired` over the entire `hc-frontend` codebase returns **zero matches**. The platform tracks no "retired" activity status and applies no special handling to it. **"(Retired)" is simply part of the activity name imported from the client's schedule (P6-style).** So (a) this is *not* a request for a missing "retired filter", and (b) the correlation with retired activities is most likely because retired = superseded schedule items whose linked model content has since been replaced/removed — i.e. the population most prone to orphaned links (hypothesis, unconfirmed).

---

## Bug vs feature-gap

**This is a BUG, not a feature gap.** The "Select/Isolate linked elements" feature exists and is proven to work for other activities in the same model on the same day. Two distinct defects are in play, and they should not be conflated:

- **Likely data-integrity root cause (primary):** `activity_links` retains links to elements that are no longer in the current project/model registry (orphaned by a model delete/re-version). Fixing the *user's actual goal* (isolate those elements) requires the elements to exist — i.e. a **data fix** (re-link / clean up stale links / restore the model), not a frontend change. Owner is likely BE/data, not FE.
- **Frontend robustness gap (secondary, real regardless of the above):** the FE shows a linked-element **count > 0** (from the raw bridge) while select/isolate silently resolves to **0** and gives the user **no feedback**. Even the correct behaviour ("N of M linked elements are not in the loaded model(s)") is not surfaced. This is a legitimate FE bug worth its own fix once the data cause is confirmed.

It is **not** a mis-filed feature request.

---

## Domain slug — why `progress-tracking`, not `filter-system`

The default `filter-system` (FLT) is the **dashboard's** central filter state (`DashboardFilterService`, discipline/package/level/status dimensions). **None of that is involved here.** The failing surface is the **ViewerPage** activity↔element **linking** feature, whose code is the schedule/activity domain: `services/linking/linking-service.ts`, `gantt-x/scheduler/.../use-linked-element-actions.ts`, `schedule-entity.ts`, `activity-linking-list/`. The mechanism is fundamentally *activity → linked elements* (a progress/schedule concept), and the customer's word "filter" means "isolate to the model", not a dashboard filter dimension. `progress-tracking` is the closest documented home for where a fix would live.

**Caveat:** neither dashboard doc is a perfect fit — the linking feature is ViewerPage-only (Dashboard disables selection, per `dashboard/viewer-and-model.md`), and there is a sibling `viewer-and-model` slug in this board. Given the instruction to choose between `filter-system` and `progress-tracking`, `progress-tracking` is the better of the two. Flagging so a human can re-file under a viewer/linking slug if the board prefers.

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

- **Mechanism identified in code** (Gantt count uses raw `activity_links`; select/isolate silently drops elements not in the loaded registry/model; no user feedback): **8/10** — read directly from source with file:line.
- **That orphaned links are the operative root cause for `FAR01UGD1220` specifically:** **5/10** — it fits the symptom, the working-vs-broken pair, and the assignee-team's own hypothesis, but is **not yet confirmed against data** (no `activity_links` query for this activity, no repro dissecting count vs selectable set). Environment-dependent; needs a human/data step.
- **That this is a bug, not a feature gap:** **8/10** — feature works for other activities; "retired" has no code footprint.

**Overall triage confidence: ~6/10.** Clear direction; final cause and FE-vs-data split need one data/repro step.

---

## NEEDS HUMAN (media I cannot read / data I cannot query)

- ⚠️ **`2026-07-09 .mp4`** (4.9 MB, Yash Patel, 2026-07-09) — customer-supplied screen recording of the failure. Not viewable here (binary behind Atlassian auth). Do not guess contents.
- ⚠️ **`Screen Recording 2026-07-09 184405.mp4`** (63 MB, Yash Patel, 2026-07-09) — second recording, likely Yash's own repro. Not viewable here.
- ⚠️ **Two inline blob images in comment 1** (`media.staging.atl-paas.net` blobs) — the two screenshots Yash embedded. Not resolvable here.
  - The videos/screenshots are the only way to confirm **which** failure mode the user hit: menu item *greyed out* (all elements orphaned) vs *clickable but no effect* (elements resolve but their model isn't loaded / filtered out). This distinction matters for the fix.
- ⚠️ **Data confirmation** (needs DuckDB console / dev access on FAR01, `platform-web-1a50c359-...`): `SELECT COUNT(*) FROM activity_links WHERE activityId='FAR01UGD1220'` vs how many of those `modelElementId`s exist in `projectService.elements` and map to a loaded model — compared against a *working* activity. This is the diff that turns the hypothesis into a confirmed cause.
- ⚠️ **Trigger** (needs BE/ops): was a FAR01 model deleted / re-versioned recently (the `REV1 / V23` lineage), and does its timing line up with when the links orphaned?

---

## Roster / ownership notes

- **Darminder Atker** (assignee, fullstack lead) — correct owner for the FE robustness half.
- **Ilia Kuzmin** (the operator, ilia.kuzmin@xyzreality.com) — already claimed the investigation on-ticket today ("I'm on it and investigating"); playbook "mechanism interrogator". His posted hypothesis matches the code.
- **Yash Patel** (reporter/coordinator) — relaying client comms; asked for a status update on 2026-07-13.
- If the confirmed cause is orphaned data, expect a hop to **BE/data** (Sergey / Sachin+Ali) for the link-integrity fix; the "why now / was a model deleted" question is theirs to answer.

## Doc / knowledge-base refs
- `xyz-platform-context/dashboard/viewer-and-model.md` — Dashboard disables selection (confirms the failing surface is ViewerPage, not Dashboard).
- `xyz-platform-context/dashboard/flt-filter-system.md` — the dashboard FLT system; confirmed *not* involved (no "retired"/activityType-status filter matches this symptom).
- `xyz-platform-context/planning/PLT-room-floor-progress-filter.md:168-196` & `PLT-2773-pr-description.md:16-44` — describe the `activity_links` bridge (element↔activity) and note projects can lack rows; useful background on the same table this bug reads.
- `xyz-platform-context/incidents/live-incident-playbook.md` — tone/pattern for the recommended reply.

---

## Update — 2026-07-20 (second capture; extends the 07-13 baseline above)

Live ticket re-pulled (11 comments, still **In Analysis**, assignee now **Ilia
Kuzmin**). No new activity after Ilia's 2026-07-15 10:53 rebuttal — the ticket
is **stuck on an unresolved technical disagreement with a pending
destructive-action approval** (Ilia's proposal to delete 418 links; Pietro
Desiato / Mostafa Kamel Hussien have neither approved nor rejected; David Webb
has not answered the rebuttal).

**New attachments since 07-13** (all behind Atlassian auth — NEEDS HUMAN to open,
but their existence is load-bearing):
- `activity-7c4f2509-orphaned-418.csv` (Ilia, 07-14 17:53, 31 KB) — the exact 418
  element↔activity links proposed for deletion. This is the destructive-action payload.
- `client-element-metas a3029b9f-3fe7-47c2-a8b6-1f8fc7827190.parquet` (David Webb,
  07-15, 1.19 MB) — current metadata for PC model version.
- `client-element-metas 55e72347-830f-4aa2-88a4-8b2bb0cae08c.parquet` (David Webb,
  07-15, 4.41 MB) — current metadata for QA model version.

### The investigation since 07-13 (verified against the live thread)
1. **07-14 17:09 (Ilia):** the 418 elements' models have **no object-id-map parquet**.
2. **07-14 17:12 (David Webb):** *"the object id map is generated for navis models only."*
3. **07-14 17:49 (Ilia):** both models (PC-…AKS_REV1-V23, QA-…Northwest-V35) were
   **re-uploaded**; the deep-underground-electrical scope was removed/redrawn; the
   418 links point at gone elements; **count still 418 because client-element-metas
   still lists them while geometry doesn't**. Proposes: **delete the 418 links.**
4. **07-15 10:15 (David Webb) — pushback:** disagrees with the root cause. States
   model drag-and-drop already has a final step that **unlinks elements not in
   current model versions**. Traces one example (activity `7c4f2509-…`, element
   `bcb3fc02-…`): the element **IS present in both current client-element-metas
   parquets** (versions `a3029b9f-…`, `55e72347-…`).
5. **07-15 10:53 (Ilia) — rebuttal (latest):** agrees the element is in current
   client-element-metas (all 418), **but** on the geometry side its
   `sourceFileElementId` is **not** in the current version's **forge property DB /
   externalId mapping**. Source file `bb85941b` has 18,908 elements in geometry but
   **zero of its 141 linked ones**; other activities in the same model select fine.
   Conclusion: metadata lists elements the current translation's geometry lacks —
   which is also why the drag-and-drop auto-unlink didn't catch them.

### Code adjudication — does the frontend support Ilia or David Webb?

The two artifacts each side is pointing at are **genuinely two independent
resolution layers** in the frontend, produced by different pipeline stages:

- **Layer 1 — metadata (`client-element-metas` parquet).** Loaded in
  `components/project-x/entities/model-entity.ts:237-296` (`loadElementMetadata`),
  keyed by `modelElementId`, storing each element's `sourceFileElementId`; it
  populates `projectService.elements` and syncs `project_element_list`. **This is
  the layer David Webb checked** ("element is in both parquets") and the layer the
  Gantt **count** and `getElementsForActivity` (`linking-service.ts:757-761`)
  resolve against — so David is correct that the element resolves *here*.
- **Layer 2 — translated geometry (forge externalId→dbId map).** Built at model
  load in `services/model-loaders/model-mapping-service.ts:337-450`
  (`_getDbIdsForElementIds`) via `getExternalIdMappingWithCache`; for Revit models
  that is `services/model-loaders/revit-model-mapper.ts:22-36`, which calls Forge's
  `model.getExternalIdMapping` — i.e. the **translated derivative / property DB**,
  exactly David's and Ilia's "forge property DB / externalId mapping." Stored as
  `model.elementId2dbId` (keyed by `sourceFileElementId`).

**Select/isolate resolves through Layer 2, not Layer 1.** `model-entity.ts:342-380`
(`getDbIdsForElements` / `getDbIdForElement`) look up
`element.metadata.sourceFileElementId` in `elementId2dbId`. The linked-elements
tree does the same: `useLinkedElementsTreeData.ts:82-119` (`collectV2`) pulls
`{modelId, sourceFileElementId}` from **metadata**, then calls
`model.getDbIdsWithChildren(sourceFileElementId)`; if that returns empty the model
is pushed to `modelsToShowAsNodes` and **no dbId is added to `allowed`** → nothing
selectable/isolable, no error. This is exactly the observed symptom.

**Verdict: Ilia's refined 10:53 claim is the one consistent with the code.**
An element can be present in Layer 1 (metadata) yet have its `sourceFileElementId`
absent from Layer 2 (forge translation) for the *same* model version — and
select/isolate depends entirely on Layer 2. **David's counter-check does not
actually refute Ilia:** he verified Layer 1 (metadata), but select/isolate fails
in Layer 2, which he did not check. So the two men are not contradicting each
other — they are describing two different layers, and the failing operation lives
in the one Ilia named.

**Is same-version metadata/geometry drift code-plausible? Yes.** `client-element-metas`
(pipeline/dagster artifact) and the forge/APS translation (geometry + property DB
with externalIds) are generated independently; nothing in the frontend guarantees
their element sets match for a given `modelVersionId`. Critically, David's own
"object-id-map is navis-only" comment cuts **for** Ilia here: these are **Revit**
models (they lack an object-id-map by design — so the missing object-id-map is a
**red herring**, correctly killed by David), and for Revit the metadata↔geometry
alignment relies **solely** on `sourceFileElementId` matching the forge externalId
set. There is no object-id-map safety-net artifact for Revit, so metadata/geometry
drift on a Revit model has nothing to catch it — including the drag-and-drop
auto-unlink if that step validates against metadata rather than the translated
geometry.

**Drag-and-drop auto-unlink: not in the frontend.** A repo-wide search of
`hc-frontend` finds **no** "unlink elements not in current model version" logic —
it is a **backend/dagster** step (David Webb's domain). If it keys off
`client-element-metas` / `project_element_list` (which still list the 418) rather
than the forge-translated externalIds, it would fail to catch exactly these — which
is Ilia's explanation. **This cannot be confirmed from the frontend; it needs the
backend owner (David) to say what that step compares against.** That is the single
question that both closes the disagreement and belongs to him.

### The destructive-action caution (why the delete must not be approved yet)
- The delete of 418 prod links is **irreversible** and is sitting on an
  **unresolved** disagreement with the **pipeline owner dissenting** — precisely the
  playbook's "no unannounced/unapproved destructive prod action" anti-pattern.
- Ilia's own two comments imply **different root causes with different correct
  fixes**: (17:49) "elements legitimately removed by re-versioning" → deleting dead
  links is reasonable cleanup; (10:53) "elements still in current metadata but
  missing from current geometry" → the defect is a **metadata/geometry sync failure
  on the current version**, whose correct fix is to **regenerate the metadata /
  re-translate the model**, not delete links. If the model is later re-translated
  correctly, deleted links do **not** come back — you would have destroyed valid
  progress linkages.
- The **one decisive check neither side has posted**: take the 418
  `sourceFileElementId`s and test membership in the **current translation's forge
  externalId set** for versions `a3029b9f-…` / `55e72347-…`. Ilia asserts absent
  (from one source file, `bb85941b`: 141 linked, 0 present); David has not verified
  Layer 2 at all. Confirming all 418 are metadata-present + geometry-absent settles
  it and also tells whether the fix is "delete links" vs "re-translate/regenerate
  metadata."

### Revised confidence
- **Mechanism — select/isolate resolves via the forge externalId layer (Layer 2),
  distinct from the metadata/count layer (Layer 1):** **8–9/10** (read from source,
  file:line above).
- **Ilia's refined root cause (metadata present, geometry externalId absent) is the
  operative one:** **7/10** — code-consistent and matches the working-vs-broken pair,
  up from 6/10; still short of confirmed because the metadata-present + geometry-absent
  property has been shown for one source file, not verified across all 418, and the
  pipeline owner disputes it.
- **That the 418-link delete is the correct remedy:** **4/10** — even if Ilia's cause
  holds, delete vs re-translate is undecided, and deletion is irreversible.
- **Overall: ~7/10 on cause direction, with an explicit HOLD on the destructive
  action** until the Layer-2 membership check is agreed between Ilia and David.

### NEEDS HUMAN (new, beyond the 07-13 list)
- Open `activity-7c4f2509-orphaned-418.csv` and the two `client-element-metas`
  parquets to run the Layer-2 membership check (418 `sourceFileElementId`s vs the
  current forge externalId map) — the single fact that settles Ilia vs David.
- Backend/dagster: what does the model drag-and-drop "unlink elements not in current
  model versions" step compare against — `client-element-metas`/`project_element_list`
  metadata, or the translated geometry externalIds? (David Webb owns this.)
