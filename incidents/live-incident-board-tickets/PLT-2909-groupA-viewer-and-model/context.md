# PLT-2909 — "Models/Elements linked to an activity appear wrong" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2909
- **Issue type:** Live Incident ("To track live incidents on site.") · Software / Web Viewer
- **Status:** **In Analysis** (statusCategory In Progress / yellow). Created 2026-07-16, last updated 2026-07-17 11:09.
- **Priority:** Medium
- **Project (site):** reported on **ATL08** (project id `69b165fc380af76aed90ef0f`); customer says it affects **all ATL05–ATL08** projects.
- **Reporter/Creator:** Yash Patel (support coordinator) · **Assignee:** Ilia Kuzmin
- **Freshdesk:** #7428 ("Waiting on 3rd line" — i.e. back on us)
- **Components / Labels:** none
- **Attachments:** 2 × PNG in Yash's comment (`image-20260716-112218.png` = the linked-models panel; `image-20260716-112527.png` = the "generate session id" error). ⚠️ Both unreadable here — see NEEDS HUMAN.
- **Customer:** Kyriakos (via Freshdesk)
- **Concrete repro handed to us:** activity **`CY-5200`**, schedule **`29475-16-RL3`**, project **ATL08**. Model that *does* contain the linked elements: `PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2-V1`.
- **Domain slug chosen:** `viewer-and-model` (justified at bottom).
- **Group tag:** `groupA` (In Analysis).

---

## One-line symptom

In the **ViewerPage** linked-elements panel, selecting a Gantt activity shows **too
many models** as "linked": the one model that actually contains the activity's linked
elements (`PC-EXCEL_SWITCH_ATL8_ELEC_...Bld2-V1`) appears, **plus several other models
that contain none of the activity's linked elements**. Reproduced internally by Yash
Patel for `CY-5200` / `29475-16-RL3` / ATL08.

**Symptom shape = OVER-inclusion (too many models).** This is the *opposite* shape to
PLT-2882 (select/isolate returns *nothing* — under-inclusion). See "Relationship to
PLT-2882" — this distinction is the whole point of this triage.

---

## Live comment thread (verified live 2026-07-20; nothing new after 07-17 11:09)

1. **07-16 12:25 Yash Patel** — relays the report and adds his own repro: for `CY-5200`
   on `29475-16-RL3` / ATL08, the model containing the linked elements is
   `PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2-V1`, "but also shows other models
   that doesn't contain elements linked to activity CY-5200". Says affects various
   activities on ATL05–ATL08. Also: *"when I tried to generate session id it gave me an
   error"* (secondary glitch, screenshot attached — see SIDE-SIGNAL).
2. **07-16 12:27 Yash** — Freshdesk #7428 → "Waiting on 3rd line".
3. **07-17 05:03 Ilia Kuzmin** — *"I assume this issue is very similar to* **PLT-2882**,
   *where elements no longer exist in the current model version after a re-upload. I'm
   currently investigating 2882, and hopefully the solution can be applied here too."*
4. **07-17 11:09 Yash Patel** — *"I am not too sure about both these tickets having same
   root cause, but I hope its same."* (mild pushback — correctly flagged.)

---

## Playbook questions applied

**1. What exactly is observed?** Not "nothing is linked" and not "wrong elements
highlighted" — the panel lists **more model nodes than it should**. At least one extra
model shown contains no element linked to the activity. (Whether the extra model nodes
are *bare* (no element children) or carry phantom children is the key data question —
the screenshot would disambiguate; see NEEDS HUMAN + the diagnostic in
recommended-action.)

**2. Expected behaviour, on whose authority?** Expected = only models that actually
contain elements linked to the activity appear. Reference is the customer's own domain
knowledge ("the elements exist only in one model") corroborated by Yash's repro naming
the single correct model. No dated "worked before" claim is made — there is **no
regression assertion**, so no "why now" trigger is asserted (contrast 2882, which is
also trigger-less, and 2385, which is a re-version event).

**3. Smallest broken-vs-working pair:** handed to us — `CY-5200` shows the correct
model **plus extras**. The diff to run is data-level: enumerate the models the panel
computes for `CY-5200` and classify each (real geometry vs bare node). See
recommended-action.

**4. Mechanism — what decides it?** Code-verified below. In short: the linked-elements
panel maps each linked `modelElementId` to **every model row** in `project_element_list`
that carries it, and renders a model node **even when the element's geometry does not
resolve in that model** (`getDbIdsWithChildren` returns `[]`) or the model is unloaded.
Because one `modelElementId` can legitimately belong to multiple models (shared Revit
unique IDs — a *known, handled* concept, per PLT-2385), the panel over-lists models.

**5. Why now? (trigger)** Not asserted by anyone. No deploy/data-change claim on the
ticket. "Present for all ATL05–08" reads as a **systemic/structural** pattern, not a
one-off data event — which itself is evidence against the 2882 re-upload theory (that
was localized to one FAR01 activity).

**6. Cohort:** customer says "various activities" across "all ATL05–08". If the cause
is the multi-model / bare-node over-listing, the cohort is *every activity whose linked
elements have IDs shared across ≥2 models, or whose linked elements are unloaded/unmapped
in some model* — i.e. potentially very broad and cross-project, consistent with the
"all ATL05–08" report. Not yet enumerated.

---

## Mechanism (code-verified) — how the "linked models" panel is computed

The right-side panel for a selected activity is the ViewerPage
**`activity-linking-list`** block. Its model list is built by
`useLinkedElementsTreeData` → `collectV2`. All refs under
`hc-frontend/src/main/webapp/app/pages/organisation/ViewerPage/`:

1. **Raw linked IDs (no model reference).** `collectV2` gathers the activity's linked
   element IDs via `linkingService.getElementIdsForActivity(activityId)` — the raw
   `activity_links` bridge set — `components/viewer-x/components/blocks/activity-linking-list/hooks/useLinkedElementsTreeData.ts:90-95`.
   Links are element↔activity and **carry no model** (`services/linking/linking-service.ts:106-118`, `:753-755`).

2. **One element → potentially many models.** It maps those IDs to models via
   `elementStore.getModelElementMappingsForElements(ids)` —
   `useLinkedElementsTreeData.ts:97-99`. That query is a plain
   `SELECT modelId, modelElementId, sourceFileElementId FROM project_element_list WHERE modelElementId IN (...)`
   — **no `DISTINCT`, no model filter** — `services/duckdb/duckdb-element-store.ts:68-80`.
   A single `modelElementId` can appear under **multiple `modelId`s** in
   `project_element_list`; this is a *known, handled* concept — `shared-asset-impact.ts`
   self-joins the same table on `modelElementId` where `modelId` differs
   (`HAVING COUNT(DISTINCT modelId) > 1`) to power the shared-asset warning
   (see PLT-2385 context, refs there). The sibling accessor
   `getModelsForElement()` (`duckdb-element-store.ts:86-95`) literally returns a **list**
   of models for one element ID. So step 2 legitimately fans one linked element out to
   several models.

3. **A model node is added even when NO geometry resolves.** For each mapping row
   (`useLinkedElementsTreeData.ts:101-117`):
   - model not loaded → `modelsToShowAsNodes.add(model.id)` (bare node, `:105-108`);
   - model loaded and `model.getDbIdsWithChildren(sourceFileElementId)` returns dbIds →
     real geometry added to `allowed` (`:110-113`);
   - **model loaded but `getDbIdsWithChildren` returns `[]`** (element's
     `sourceFileElementId` doesn't resolve to geometry in *that* model) →
     `modelsToShowAsNodes.add(model.id)` **anyway** (`:114-116`).
   `getDbIdsWithChildren` returns `[]` whenever `getDbIdForElement` finds no dbId
   (`model-entity.ts:389-406`). So a model with **zero** rendered linked elements still
   becomes a visible model node.

4. **Those nodes are appended to the tree.** `appendModelNodes` pushes a top-level model
   node for every id in `modelsToShowAsNodes` (`:122-146`), and the panel shows them
   (`activity-linking-list.tsx:79-86`; unloaded ones toggled by "show unloaded models",
   default **on** — `:28`, `:49`, `:79-81`).

**Net:** the panel lists a model node for *every* `project_element_list` row touching the
activity's linked IDs, **including models where the element's geometry doesn't resolve**.
Combined with one element ID mapping to several models, this produces exactly the reported
symptom: "the elements exist only in one model, however several models appear."

⚠️ **Not yet confirmed against ATL08 data**: whether the specific extra models on
`CY-5200` are (a) shared-ID membership across live models (→ PLT-2385 family), (b) stale
`project_element_list` rows from a superseded model version (→ overlaps 2882's re-upload
theme), or (c) purely the bare-node path (step 3, third bullet) firing on unloaded/unmapped
models. These are distinguishable with one query — see recommended-action.

---

## Relationship to PLT-2882 — independent verdict

**Verdict: NOT confidently the same root cause. Yash's skepticism is the correct call.**
They are neighbours in the same subsystem (both read the raw `activity_links` bridge via
`getElementIdsForActivity`), but the failures are opposite in shape and different in
mechanism:

| | PLT-2882 | PLT-2909 |
|---|---|---|
| Symptom shape | **Under**-inclusion — select/isolate returns **nothing** | **Over**-inclusion — panel shows **too many models** |
| Failing op | "Select/Isolate linked elements" resolves raw IDs and **drops** orphans (`.filter(Boolean)`, viewer-map narrowing) | "linked models" panel **adds a model node per mapping row**, even with 0 resolved dbIds |
| Element state | linked IDs **gone** from current registry/model (orphaned by re-upload) | linked IDs **present**, mapping to **several** models |
| Scope reported | one activity (`FAR01UGD1220`), one FAR01 model | "various activities", **all ATL05–08** (systemic) |
| Root-cause status | **disputed** (David Webb, BE) — not confirmed | multi-model over-listing is code-verified; ATL08 data not yet checked |

A fix for 2882 (cleaning orphaned links / metadata↔geometry re-sync) would remove links
that resolve to *nothing*; it would **not** stop the 2909 panel from listing *extra models
that still contain valid rows*. The mechanisms don't share a fix.

**2909 is thematically much closer to PLT-2385** ("DC10 activities retaining links to
both PC and QA models — shared Revit unique IDs"). Both are the **"too many" family**:
one `modelElementId` fanning out to multiple models via `project_element_list`. 2385's
own root cause (shared IDs across co-loaded models + links not pruned on re-version) is
the most likely upstream explanation for 2909's extra model nodes — and 2385 is already
Ready-For-Dev with follow-ups PLT-2650 / UX-1109. **Recommend cross-linking 2909 to 2385
rather than to 2882.**

**Honest caveat (steel-man of Ilia):** there *is* a thin overlap. If the extra models are
**stale `project_element_list` rows from a superseded model version** (re-upload left old
rows that still carry the linked `modelElementId`), then 2909 and 2882 share the
"re-upload leaves stale linking metadata" umbrella — and both partly trace to link
lifecycle on re-version (which is also exactly 2385's mechanism #6). But even then the
*symptom-producing code path* and the *user-facing fix* differ, and 2882's theory is
disputed — so conflating them doubles the risk. The single query in recommended-action
settles which family 2909 belongs to.

---

## Bug vs feature-gap

**BUG.** The panel is meant to show models that contain the activity's linked elements;
it demonstrably shows models that don't. Two candidate layers, not to be conflated:
- **FE display robustness (real regardless of data):** `collectV2` adds a model node even
  when `getDbIdsWithChildren` returns `[]` (`useLinkedElementsTreeData.ts:114-116`), and
  `getModelElementMappingsForElements` does no `DISTINCT`/model filter. A model contributing
  **zero** rendered linked elements should arguably not appear as a linked-model node.
- **Data/link-lifecycle (likely upstream, shared with 2385):** links persist for element
  IDs shared across models or left behind by a re-version; nothing prunes them. Owner is
  BE/data-pipeline (dagster / `project-element-list.parquet`), per 2385.

---

## SIDE-SIGNAL — "generate session id gave an error" (split off, do NOT conflate)

Yash's comment includes a **second, separate** report: *"when I tried to generate session
id it gave me an error"* with its own screenshot (`image-20260716-112527.png`). Per
playbook (split side-signals into their own track, label loudly):

- **Keep as its own one-line track.** It is *not* the linked-models symptom and nothing in
  the panel code above touches session-id generation. Session-id is the ViewerPage
  share/session flow, a different surface.
- **Worth a one-line note, not ignorable** — a session-id error can *block the very repro*
  needed for the main bug, so it has nuisance value even if unrelated. But it must **not**
  be folded into the main root-cause analysis.
- ⚠️ Screenshot unreadable here — cannot classify the error. NEEDS HUMAN (what does the
  error say / which endpoint). If it recurs, it deserves its own ticket, not a line in 2909.

---

## Domain slug — why `viewer-and-model`

The failing surface is the **ViewerPage `activity-linking-list` panel** and the bug lives
in its FE computation (`useLinkedElementsTreeData` / `collectV2` / `model-entity`). That is
squarely 3D-viewer/model territory. Contrast the two siblings: PLT-2882 chose
`progress-tracking` (with an explicit "viewer/linking would also fit" caveat) and PLT-2385
chose `data-pipeline` (because its symptom is export/count inflation). 2909's symptom is a
**viewer panel rendering the wrong model set**, so `viewer-and-model` is the most precise of
the available slugs. Flagging that the underlying *mechanism* (activity→element→model
linking) also touches progress-tracking and data-pipeline; re-file if the board prefers to
cluster it with 2385.

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

- **Mechanism identified in code** (panel maps linked IDs → all `project_element_list`
  model rows with no dedup/filter; adds a model node even when `getDbIdsWithChildren`
  returns `[]`; one `modelElementId` can span models): **8/10** — read directly from
  source with file:line, corroborated by PLT-2385's independent code findings.
- **That 2909 is NOT the same root cause as 2882:** **7/10** — the symptom is the opposite
  shape and the symptom-producing code paths and fixes differ; held below 8 only because
  the ATL08 data hasn't been queried and a thin stale-metadata overlap exists.
- **That 2909 belongs to the 2385 (shared-ID / cross-model) family:** **6/10** — strong
  code-level fit, but which of the three sub-causes drives `CY-5200` is unconfirmed
  (environment-dependent; one query settles it).

**Overall triage confidence: ~6–7/10.** Direction is clear and the un-conflation is
well-supported; the exact sub-cause needs one data/repro step on ATL08.

---

## NEEDS HUMAN (media I cannot read / data I cannot query)

- ⚠️ **`image-20260716-112218.png`** (Yash, 07-16) — the linked-models panel for `CY-5200`.
  The decisive artifact: are the extra model nodes **bare** (no element children) or do they
  carry phantom element children? Do not guess.
- ⚠️ **`image-20260716-112527.png`** (Yash, 07-16) — the "generate session id" error dialog.
  Cannot classify. SIDE-SIGNAL, separate track.
- ⚠️ **Data confirmation** (needs DuckDB console / dev access on ATL08, schedule
  `29475-16-RL3`): the diff in recommended-action — for `CY-5200`, list linked
  `modelElementId`s, expand each to its `project_element_list` model rows, and for every
  model shown classify real-geometry vs bare-node. This assigns 2909 to family (a/b/c) and
  confirms/refutes the 2882 link.
- ⚠️ **Trigger** (needs BE/ops): were any ATL05–08 models re-versioned/re-uploaded recently,
  and do stale `project-element-list.parquet` rows survive for superseded versions? (Only
  relevant if the query points to sub-cause (b).)

---

## Roster / ownership notes

- **Ilia Kuzmin** (assignee, mechanism interrogator) — posted the 2882 link hypothesis;
  this triage gives him the independent counter-analysis + the distinguishing test so he can
  decide whether to keep or split the link.
- **Yash Patel** (reporter/coordinator) — already correctly flagged doubt about the shared
  root cause; the recommended reply backs his instinct with a concrete test.
- **Likely hop to BE/data-pipeline** (dagster / `project-element-list.parquet` lifecycle) if
  the query points to shared-ID / stale-row causes — same owners as PLT-2385
  (Rishi Bhugobaun; David Webb on the BE side).

## Doc / knowledge-base refs
- `xyz-platform-context/dashboard/viewer-and-model.md` — three-ID mapping chain
  (`modelElementId → sourceFileElementId → Forge dbId`); confirms no QA/PC model-type field.
- `xyz-platform-context/dashboard/data-pipeline.md:38-39` — `project_element_list`
  (`modelElementId → sourceFileElementId`, carries `modelId`) — the table `collectV2` reads.
- `incidents/live-incident-board-tickets/PLT-2385-groupB-data-pipeline/context.md` — the
  shared-Revit-ID / cross-model linking mechanism (same table, same "one element → many
  models"); the closest sibling.
- `incidents/live-incident-board-tickets/PLT-2882-groupA-progress-tracking/context.md` — the
  under-inclusion sibling this ticket was linked to; disputed root cause.
- `incidents/live-incident-playbook.md` — tone/message-craft for the reply.
