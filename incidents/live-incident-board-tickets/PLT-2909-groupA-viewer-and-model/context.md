# PLT-2909 — "Models/Elements linked to an activity appear wrong" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2909
- **Issue type:** Live Incident ("To track live incidents on site.") · Software Area **Web Viewer**
- **Status:** **In Analysis** (statusCategory In Progress / yellow) — actively assigned, one analysis comment on-thread.
- **Priority:** **Medium** (`minor_new` icon) — lower than the PLT-2882 (Major) sibling.
- **Project (site):** **ATL08** — internal project id `69b165fc380af76aed90ef0f` (per the report form). Reported to affect **all ATL05–08 projects**.
- **Reporter (Jira):** Yash Patel (support/incident coordinator). **Customer reporter (in description):** *Kyriakos*.
- **Assignee:** **Ilia Kuzmin** (ilia.kuzmin@xyzreality.com — the operator; also assignee of the PLT-2882 sibling and of PLT-2531, the feature this bug sits on).
- **Created:** 2026-07-16 12:13 · **Last updated:** 2026-07-17 05:03 (+0100)
- **Components / Labels:** none
- **Freshdesk:** #7428, set to "Waiting on 3rd line" (i.e. back on us).
- **Domain slug chosen:** `viewer-and-model` (justified at the bottom; the underlying data condition also touches `data-pipeline` — flagged).

---

## One-line symptom

When a **schedule activity** is selected in the **web viewer**, the panel that lists the **models the activity's linked elements belong to** ("models on the right side") shows **several models**, even though the linked elements actually exist in **only one** model — the example given is `PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2-V1`. The **model-membership list over-reports**; the elements/links themselves are not the complaint, the *set of models attributed to them* is wrong.

This is the **model-membership display** face of the same `activity_links` + per-model element-metadata mechanism that PLT-2882 (select/isolate resolves to 0) and PLT-2385 (links counted across PC+QA models) already dug into.

---

## Description (verbatim, trimmed of empty form fields)

> Software Area: Web Viewer … Is The Device Still Usable?: Usable, Project: 69b165fc380af76aed90ef0f
>
> Description: Hello, It seems that for several activities the models appearing linked to a specific activity are not shown correctly. You can find attached an example where the elements exist only in one model (**PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2-V1**) however several models appear. Please let me know if you need further information to resolve this issue which is present for **all ATL05-08 projects**. Kyriakos
>
> Ticket attachments: 1. Screenshot 2026-07-16 104350.png 2. Screenshot 2026-07-16 104600.png (Freshdesk-hosted)

---

## Comment thread (chronological, all comment IDs cited)

1. **107527 — Yash Patel, 2026-07-16 12:25** — "@Ilia Kuzmin, User have reported that when activity ID **CY-5200** is selected from schedule **29475-16-RL3** on Project **ATL08** it shows models on the right side that **does not contain elements linked** to the activity CY-5200. This activity is just for example. According to user, this is an issue for **various activities on Projects ATL05 to ATL08**. I tried it on my end with activity CY-5200 on schedule 29475-16-RL3 on Project ATL08. model that contains the elements linked to this activity is **PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2-V1** but **also shows other models that doesn't contain elements** linked to activity CY-5200 [screenshot]. Also when I tried to generate session id it gave me an **error** [screenshot]. Can you please look into this."
   - **Reproduced internally by Yash** (playbook Q1 satisfied — we can see it ourselves). Two inline blob screenshots: (i) the models panel over-listing models, (ii) a session-id-generation error. Both blob URLs, unreadable here (see NEEDS HUMAN).
   - ⚠️ Secondary signal: "generate session id gave me an error" — a **separate** finding (session-log generation), must be split off, not conflated with the model-membership bug. See playbook Phase 2 / recommended-action.
2. **107528 — Yash Patel, 2026-07-16 12:27** — "Ticket ID: 7428 - Freshdesk ticket status changed to : Waiting on 3rd line."
3. **107578 — Ilia Kuzmin, 2026-07-17 05:03** — "@Yash Patel, I assume this issue is **very similar** to the one in this ticket: **PLT-2882**, where **elements no longer exist in the current model version after a re-upload**. I'm currently investigating PLT-2882, and hopefully the solution can be applied to this ticket as well."
   - The assignee's own working hypothesis = **same mechanism as PLT-2882** (stale links after re-versioning). This triage tests and refines that.

---

## Playbook six-question status

1. **Observed / can we see it?** **Yes** — Yash reproduced it (activity `CY-5200`, schedule `29475-16-RL3`, ATL08). Concrete instance in hand; strong start, unlike the PLT-2892 rumor-stage.
2. **Expected / on whose authority?** Customer + Yash: the activity's linked elements live in **one** model (`PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2-V1`); the panel should list **that model only**. Reference is the customer's model knowledge, corroborated by Yash's repro — reasonable, not folklore, but not yet a data-verified "true" model set.
3. **Smallest broken-vs-working pair?** Available: activity `CY-5200` (over-lists models) vs any activity whose model list is correct, same project. The diff to run is data-level — per linked element, which models' `project_element_list` / `client-element-metas` contain its ID (see recommended-action).
4. **Mechanism?** See next section — model-membership resolution (`ElementEntity.getModels()`) attributes an element to **every** model whose element metadata contains its ID, with (per PLT-2385) no dedup / current-version / QA-vs-PC filter. [Code-refs confirmed via hc-frontend read — see "hc-frontend code" section.]
5. **Why now (trigger)?** Not established. Two candidate triggers, matching the two mechanism variants: (a) **re-upload / re-versioning** left stale element IDs in superseded-version metadata (PLT-2882 pattern), or (b) **shared Revit unique IDs** across co-existing federated models that were always there but only now noticed (PLT-2385 pattern — no dated trigger). Must be asked explicitly.
6. **Cohort?** Reporter says **all ATL05–08 projects, various activities** — broad from the outset. Not yet enumerated. If the cause is shared/stale IDs, the affected set is every activity whose linked elements' IDs appear in >1 model's metadata.

---

## Mechanism — how the "models linked to an activity" list is built (code-verified, hc-frontend `claude/vigilant-franklin-cs6txw`)

All paths under `src/main/webapp/app/pages/organisation/ViewerPage/`.

**The panel:** selecting an activity opens the right-side "Linked elements" panel — `components/viewer-x/components/blocks/activity-properties/activity-properties.tsx:102` renders `<ActivityLinkingList>`, which builds a **react-arborist tree grouped by MODEL** from `useLinkedElementsTreeData()` (`.../activity-linking-list/activity-linking-list.tsx:32,115-138`). **The model nodes on the right are that tree's roots.**

**How the model set is computed (the bug path)** — `.../activity-linking-list/hooks/useLinkedElementsTreeData.ts:82-119` (`collectV2`):
1. `linkingService.getElementIdsForActivity(activityId)` → the activity's linked `modelElementId`s.
2. `elementStore.getModelElementMappingsForElements(ids)` →
   `SELECT modelId, modelElementId, sourceFileElementId FROM project_element_list WHERE modelElementId IN (...)` — `services/duckdb/duckdb-element-store.ts:68-80`. **No `DISTINCT modelId`, no version filter, no QA/PC filter.** One row per (modelId, modelElementId) in the table.
3. For each returned row: if `!model.isLoaded` → **add model as a node** (so the user can load it); else `getDbIdsWithChildren(sourceFileElementId)` — if `dbIds > 0` add as an "allowed" node, **else (loaded but element resolves to 0 dbIds) → STILL add the model as a node** (`useLinkedElementsTreeData.ts` else-branch). Every matched row becomes a model node either way.

**Why `project_element_list` holds one `modelElementId` under several `modelId`s** — `duckdb-element-store.ts:123-136` (`syncElementMetadataForModel`, called from `model-entity.ts:284` when each model loads its `client-element-metas` parquet): it does `DELETE ... WHERE modelId = X` then INSERT — **scoped per `modelId` only, never de-duplicated by `modelElementId` across models.** So whenever two models' `client-element-metas` parquets carry the same `modelElementId` (superseded versions after re-upload, or federated models sharing Revit unique IDs), **both rows coexist and both models are returned → both shown.**

**Key correctness gap:** the else-branch (`dbIds.length === 0` on a *loaded* model → still shown) means a model whose current geometry does **not** contain the element is displayed as a linked model anyway. That is the exact mirror of PLT-2882: select/isolate *drops* elements not in loaded geometry (→ 0), while this panel *keeps* the model node (→ over-shows). Same data condition (metadata retains IDs the geometry doesn't), opposite handling.

**No dedup / current-version / QA-vs-PC filter exists anywhere on this path** — confirmed at `getModelElementMappingsForElements` (`duckdb-element-store.ts:68-80`), `collectV2` (`useLinkedElementsTreeData.ts:101-117`), and `syncElementMetadataForModel` (`duckdb-element-store.ts:130`). Matches the PLT-2385 finding (links keyed on `modelElementId` only; no model-type concept in the FE).

**Note — `getModels()` is NOT on this path.** `ElementEntity.getModels()` (`components/project-x/entities/element-entity.ts:39-43`, populated by `model-entity.ts:274-280` accumulating a `models` Set across every parquet containing the id) is used only by `useGroupedLinks.ts:30`, which is **dead code** (no `.tsx` imports it). It would exhibit the *same* over-accumulation if wired in, but the live over-report comes from the `project_element_list` query above, not `getModels()`.

### Data condition behind it (established by the two siblings)

The over-reporting is the display-side symptom of a **data + resolution** condition already proven twice on this platform:

- **PLT-2385 (data-pipeline):** activity↔element links are keyed on **`modelElementId` only** — the link carries **no model reference** (`linking-service.ts:106-118`). One `modelElementId` can legitimately exist in **multiple models** (shared Revit unique IDs — QA + PC, or multiple discipline models); `shared-asset-impact.ts:70-95,109-118` self-joins `project_element_list` on `modelElementId` where `modelId` differs — i.e. cross-model shared IDs are a **known, handled concept**. There is **no QA/PC or model-type field** anywhere in the FE (`dashboard-model-mapping-service.ts:28-29` = Revit/Navisworks *format* only). So membership resolution has nothing to dedup or filter on.
- **PLT-2882 (progress-tracking):** after a **re-version/re-upload**, the current version's **`client-element-metas` parquet still contains** element IDs whose geometry is gone (`inParquet: 418, inGeometry: 0`, confirmed by data twice). The metadata retains a **dead generation** of content. `model.elementId2dbId` is the *intersection* of loaded geometry externalIds and the `client-element-metas` parquet (`model-mapping-service.ts:372-384`). Metadata over-retains; geometry does not.

**Net:** if model membership is resolved by matching an element's ID against each model's `project_element_list` / `client-element-metas` (metadata), then **any** element whose ID appears in more than one model's metadata — whether via shared Revit IDs (2385) or stale superseded-version rows (2882) — is attributed to **all** of those models. That is exactly "elements exist in one model, however several models appear."

---

## Same mechanism as PLT-2882, or different?

**Same family, different surface.** Ilia's on-ticket hypothesis (same as PLT-2882) is directionally right: both stem from the element↔model membership carrying IDs that don't match current single-model reality. But there is an important refinement:

- **PLT-2882** surfaces on **Select/Isolate linked elements** → the failure is **under**-resolution (metadata says 418, geometry has 0 → selects nothing).
- **PLT-2909** surfaces on the **model-membership list** → the failure is **over**-resolution (one element's ID matches several models' metadata → lists too many models).

They are two outputs of the same "links keyed on `modelElementId`; metadata not scoped to current single-model content" condition. **But PLT-2909 may lean more toward the PLT-2385 shared-Revit-ID variant** (elements genuinely in one model's *geometry* but whose ID appears in other models' *metadata*) than the PLT-2882 deleted-generation variant — the screenshots (which extra models appear: QA models? other-discipline models? superseded versions?) would decide. Do **not** assume 2882's exact deleted-generation cause carries over untested.

---

## Related tickets (cluster — from JQL sweep `project = PLT AND text ~ linked/ATL05/ATL08`)

This is one of a **cluster of "linked-elements / model-membership appear wrong"** tickets:

| Ticket | Status | Relevance |
|---|---|---|
| **PLT-2882** | In Analysis | **Sibling** — same activity_links/metadata mechanism; select/isolate resolves to 0 after re-version. Ilia's linked precedent; root cause confirmed in its investigation-log. |
| **PLT-2385** | Ready For Dev | Links counted across **PC + QA** models via shared Revit IDs; no model-type/dedup. The over-count analog; spun off PLT-2650 (code) + UX-1109 (design). |
| **PLT-2864** | **Ready For Release** (fixVersion **26.3.2**) | "Webviewer not showing correct elements" — **same FAR01 model `PC-APLD-FAR01-UND-AKS_REV1-V23`**; property-panel total *"Elements linked to Latest Program"* wrong **when the model is not loaded**, correct once loaded. A **load-state-dependent** resolution fix already in flight — check whether it changes PLT-2909's behaviour. |
| **PLT-2874** | In Analysis | "differences between fed file linked elements and dashboard elements number" — the count-discrepancy sibling (viewer-and-model). |
| **PLT-2531** | **Dev In Progress** (assignee **Ilia**) | Feature: **"Element Details Panel — Show all models an element belongs to"** — *this is the very panel PLT-2909 is complaining about.* Its description: "Currently we only display one model for an element even if it belongs to multiple; we should display links to all in an accordion." So the multi-model membership display is **newly built / in progress** — PLT-2909 may be exposing a correctness gap in exactly this new feature (over-showing models). **Strongest lead for where the FE fix lives.** |
| PLT-2447 | Dev In Progress | "Select Activity - Panel details - UX - Multiple issues for Panel Details" — same panel, UX bucket. |

**Take:** PLT-2531 is the feature that renders the multi-model list; PLT-2864 (Ready for Release) touches load-state-dependent linked-element counts on the property panel. PLT-2909 should be triaged **against both** — it may already be partially addressed by 26.3.2, or it may be a correctness bug in the PLT-2531 feature that lists "all models an element belongs to" without scoping to current-version geometry.

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

- **FE mechanism — that the panel over-reports because `collectV2` turns every `project_element_list` row (matched on `modelElementId` with no `DISTINCT`/version/QA-PC filter) into a model node, including loaded models where the element resolves to 0 dbIds:** **9/10** — read directly from source with file:line across the whole path (panel → `useLinkedElementsTreeData` → `getModelElementMappingsForElements` → `syncElementMetadataForModel`).
- **That the operative cause for `CY-5200` on ATL08 specifically is this path fed by shared/stale IDs (same family as PLT-2385/2882):** **6/10** — the code path is definitively the over-reporter and the data condition is proven twice on-platform, but which extra models appear (and *why* — shared Revit IDs vs stale superseded-version metadata) is not yet confirmed for this instance (needs the screenshot or a one-query data diff).
- **That it is the PLT-2882 deleted-generation variant vs the PLT-2385 shared-ID variant:** **4/10** — genuinely undetermined; the models-panel screenshot / data diff decides it.
- **Overall triage confidence: ~7/10** — the FE defect is fully code-traced and sits on a named in-progress feature (PLT-2531); what remains is a single data/repro step to pin the variant and to confirm whether PLT-2864's 26.3.2 fix already shifts the behaviour. Higher than PLT-2882's initial 6/10 because the display code path here is completely resolved.

---

## NEEDS HUMAN (media / data I cannot access)

- ⚠️ **Screenshot 2026-07-16 104350.png** (Freshdesk `.../attachments/103332632415`) and **Screenshot 2026-07-16 104600.png** (`.../103332632416`) — the customer's screenshots. **Confirmed inaccessible:** WebFetch on the Freshdesk URL 302-redirects to `xyzreality.myfreshworks.com/oauth/authorize` (auth-gated).
- ⚠️ **Jira inline attachments** `image-20260716-112218.png` (id 60910, 237 KB) and `image-20260716-112527.png` (id 60911, 55 KB) — Yash's two inline images (the models panel, and the session-id error). Behind Atlassian auth; not readable here. The **models-panel** image is decisive: it shows **which** extra models appear (QA? other-discipline? superseded versions?) — that distinguishes the shared-ID vs deleted-generation variant and should be viewed before routing.
- ⚠️ **Data confirmation** (needs DuckDB/dev on ATL08): for a linked element of `CY-5200`, `SELECT modelId, COUNT(*) FROM project_element_list WHERE modelElementId = '<id>' GROUP BY modelId` — how many models' element lists contain it, and whether those extra models are QA/other-discipline (shared ID) or superseded versions (stale). Compare against a working activity.
- ⚠️ **Trigger** (needs BE/ops): were ATL05–08 models re-uploaded/re-versioned recently, or do these projects simply co-load QA + PC (and multi-discipline) models with shared Revit unique IDs?
- ⚠️ **Session-id-generation error** (comment 107527, 2nd screenshot) — a **separate** signal; its screenshot/repro is not readable here. Split it into its own track; do not let it contaminate the model-membership diagnosis.

---

## Doc / knowledge refs used

- `dashboard/viewer-and-model.md:99-118` — the three-ID mapping chain (`modelElementId → sourceFileElementId → Forge dbId`) via `project_element_list` / `client-element-metas`; confirms **no QA/PC/model-type dimension** in the mapping.
- `dashboard/data-pipeline.md:36-41` — `project-element-list` = `modelElementId → sourceFileElementId`; `svf2-object-id-map`; the artefacts membership resolution reads.
- `dashboard/caching.md:19,42-58` & `dashboard/pitfalls.md:26-29` — `client-element-metas` is **per-model / per-version**; per-model artefacts keyed `{modelArtefactId}.parquet` — i.e. the same element ID has a row in *each* model's metadata.
- `incidents/.../PLT-2882-.../investigation-log.md` — the confirmed metadata-vs-geometry mechanism (`inParquet:418, inGeometry:0`; `model-mapping-service.ts:372-384`); the `__linkDiagnose` methodology reusable here for a model-membership diff.
- `incidents/.../PLT-2385-.../context.md` — links keyed on `modelElementId` only; shared-ID cross-model membership is a known concept; no model-type field (`linking-service.ts:106-118`, `shared-asset-impact.ts:70-95`).
- `incidents/live-incident-playbook.md` — tone/pattern for the drafted reply.

## Roster / ownership

- **Ilia Kuzmin** — assignee; owns the investigation (and PLT-2531, the feature). Mechanism interrogator per the playbook.
- **Yash Patel** — reporter/coordinator; relaying Kyriakos; reproduced it.
- Likely hop, once the data diff is in: **BE/data (Sergey / Sachin+Ali / David Webb)** for link/metadata lifecycle if the cause is stale/shared IDs at the data layer; **Darminder / FE** if the fix is scoping the PLT-2531 model-membership resolution to current-version geometry.
