# PLT-2909 — "Models/Elements linked to an activity appear wrong" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2909
- **Issue type:** Live Incident ("To track live incidents on site.") · Software / **Web Viewer**
- **Status:** **Open** (statusCategory `To Do` / blue-gray) — genuinely new, created today.
- **Priority:** Medium
- **Project (site):** `69b165fc380af76aed90ef0f` = **ATL08** (client says it affects **all ATL05–08 projects**)
- **Reporter:** Yash Patel (coordinator/support) · **Assignee:** Ilia Kuzmin
- **Created:** 2026-07-16 · **Last updated:** 2026-07-16 · **Freshdesk #7428** ("Waiting on 3rd line" — ball is on us)
- **Original customer contact:** "Kyriakos" (client engineer)
- **Attachments:** 2 × `.png` on the issue + 2 inline blob images in comment 1 (all unreadable here — see NEEDS HUMAN)
- **Domain slug chosen:** `data-pipeline` (root cause is link-lifecycle / `activity_links` data integrity — clusters with PLT-2385; justified below)

**Concrete coordinates given (strong — a currently-reproducible instance, playbook Q1):**
- Activity **`CY-5200`**, schedule **`29475-16-RL3`**, project **ATL08**.
- Model that *does* contain the linked elements: **`PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2-V1`**.
- Reproduced internally by **Yash Patel** ("I tried it on my end … also shows other models that doesn't contain elements linked to activity CY-5200").

---

## One-line symptom

In the **ViewerPage activity-linking panel** (the "linked elements" tree shown on the right when a schedule activity is selected), selecting activity **CY-5200** shows **several models** as linked, but the linked elements physically exist in **only one** model (`PC-EXCEL_…Bld2-V1`). The extra models are spurious/empty. Present across **ATL05–08**.

**Secondary signal (SPLIT OFF — not this incident):** Yash also hit an **error when "generating a session id"** (screenshot in comment 1). That is the support diagnostic session-id feature (`app/helpers/session/session.tsx`, surfaced via HelpMenu `SyncLogModal.tsx`), unrelated to the linking panel. Track separately; do not let it contaminate this diagnosis.

---

## Playbook questions applied

**1. What exactly is observed — can we observe it now?** Yes. Yash reproduced it internally today on ATL08 / CY-5200 / schedule 29475-16-RL3. The panel lists **more models than it should**; only `PC-EXCEL_…Bld2-V1` genuinely holds the activity's linked elements. (This is a "too many", not the PLT-2882 "too few / nothing" symptom.)

**2. Expected, on whose authority?** Expected = only the model(s) that actually contain elements linked to the activity should appear. Reference is the client's own model knowledge ("the elements exist only in one model") corroborated by Yash's repro. No "it worked before" claim is made — no dated regression asserted (so "why now" is unestablished, see Q5).

**3. Smallest broken-vs-working pair:** not yet isolated as a working activity. The natural diff is **data-level**: for CY-5200, how many distinct `modelId`s do its `activity_links` rows resolve to, vs a "clean" activity that shows one model. (See NEEDS HUMAN.)

**4. Mechanism — what decides it?** See next section. In short: the panel renders **one model per distinct owning-model of the activity's linked elements**, read straight from `project_element_list`. Because `modelElementId` is a unique Postgres PK (one element → exactly one model), **multiple models can only appear if `activity_links` itself references elements spread across multiple models.** The FE faithfully reflects the data; the data has cross-model links.

**5. Why now? (trigger)** Not established. No deploy/data-change correlation yet. The stale-link family (Q4) accumulates over model re-versioning (`…-V1` lineage) and cross-discipline uploads; the "why did it surface now / across ATL05–08" needs an owner. Ask explicitly.

**6. Cohort:** the client already scoped it: **"all ATL05–08 projects."** Once confirmed, enumerate every activity whose `activity_links` resolve to >1 model — remediate in bulk, don't wait for the next ticket.

---

## Mechanism (code-verified) — how the "models linked to an activity" panel is built

Surface: ViewerPage → select activity → **`ActivityLinkingList`** renders a tree grouped by model → elements. All refs under `src/main/webapp/app/pages/organisation/ViewerPage/`:

1. **Panel + tree source.** `components/viewer-x/components/blocks/activity-linking-list/activity-linking-list.tsx:32` consumes `useLinkedElementsTreeData()`.

2. **Tree builder.** `activity-linking-list/hooks/useLinkedElementsTreeData.ts`:
   - `collectV2()` (`:82-120`) gathers the activity's linked element IDs via `linkingService.getElementIdsForActivity(activityId)` (`:92`), i.e. the in-memory `activityToElements` map built from the DuckDB **`activity_links`** table (`services/linking/linking-service.ts:255-272`, `:753-755`).
   - It then calls **`elementStore.getModelElementMappingsForElements(allElementIds)`** (`:97-99`) to find which model each linked element belongs to.
   - For each returned `{ modelId, sourceFileElementId }` (`:101`): if the model is **not loaded** → the model is added to `modelsToShowAsNodes` (`:105-107`); if loaded but `model.getDbIdsWithChildren(sourceFileElementId)` returns **0 dbIds** → also added to `modelsToShowAsNodes` (`:111-116`); otherwise its dbIds go into `allowed`.
   - `appendModelNodes()` (`:123-146`) then renders **one bare tree node per model in `modelsToShowAsNodes`** — these are the "extra models" the user sees (they appear even though they contribute no visible linked elements).

3. **The mapping query — the crux.** `services/duckdb/duckdb-element-store.ts:68-80`:
   ```sql
   SELECT modelId, modelElementId, sourceFileElementId
   FROM project_element_list
   WHERE modelElementId IN ( … )
   ```
   `project_element_list` is keyed by `modelElementId` = **Postgres primary key (UUID)**, one row per element per model (schema comment `duckdb-element-store.ts:30-36`). So each linked `modelElementId` resolves to **exactly one** `modelId`. **Therefore the set of models shown = the set of distinct models that own the activity's linked elements.** If N models appear, the activity's `activity_links` rows reference elements in N models.

4. **The dbId lookup is not cross-contaminating.** `entities/model-entity.ts:363-406` (`getDbIdForElement` / `getDbIdsWithChildren`) resolves `sourceFileElementId` against **each mapping's own model's** `elementId2dbId` — no cross-model leakage. And `pruneTree.ts:7-36` only keeps leaves whose dbId is in `allowed` for that model. So the FE cannot *invent* a model; every model shown is one that `activity_links` → `project_element_list` genuinely attributes a linked element to.

**Conclusion:** the extra models are **not** an FE rendering artefact. They are a faithful rendering of **stale / cross-model `activity_links` rows**: the activity is linked (in `activity_links`) to elements that live in models other than `PC-EXCEL_…Bld2-V1`.

### This is the PLT-2385 family
PLT-2385 (HITT/DC10, **Ready For Development**) diagnosed exactly this class:
- Activities retain links to **both PC and QA models** because the two models **share Revit unique IDs**; the QA-side element is a *distinct* `modelElementId` (distinct UUID) that got linked.
- Rishi Bhugobaun (PLT-2385, 2026-01-28): links **persist when a model or its elements are removed/re-versioned** ("links are not yet removed when a model or its elements are [removed]").
- David Webb (PLT-2385, 2026-04-15): in V2, dagster regenerates `project-element-list.parquet` on model delete and removes links to elements no longer in it, **but "QA/PC is not considered specifically"** — so cross-discipline shared-ID links survive.
- Follow-ups already exist: **PLT-2650** (handle links on model deletion) and **UX-1109** (delete-time warning-modal design).

PLT-2909 is very likely the **same mechanism on a different site** (EXCEL/SWITCH ATL05–08 vs HITT/DC10) surfaced through a **different UI** (viewer linking panel vs PowerBI count/selection). The `…-V1` version suffix and the "several models" (plausibly PC + QA + a superseded PC version) fit the shared-ID / persisted-link pattern.

---

## Bug vs feature-gap

**Primary = data integrity (not an FE bug).** `activity_links` holds cross-model / stale links for these activities; the fix is a **data cleanup** (unlink the spurious model's elements — Rishi's PLT-2385 interim remedy) plus the **link-lifecycle/product** work already tracked as PLT-2650 / UX-1109. FE-side the panel is behaving correctly given the data.

**Secondary = FE presentation gap (real, minor).** The panel shows a **bare model node for every referenced model even when it contributes zero visible elements** (`useLinkedElementsTreeData.ts:105-116` → `appendModelNodes`), with no "0 elements / not in loaded model / superseded" affordance. That is what makes the stale data *look like* a viewer bug. Worth a small FE hardening (badge or hide zero-contribution model nodes) once the data cause is confirmed — but it does not fix the user's actual complaint.

It is **not** a mis-filed feature request.

---

## Domain slug — why `data-pipeline`

Fixed-set options were `filter-system | viewer-and-model | quality-management | 360-captures | progress-tracking | data-pipeline | access-permissions | other`.

Chosen **`data-pipeline`** because the operative root cause is **`activity_links` link-lifecycle / integrity** — the same defect already filed under `data-pipeline` as **PLT-2385**, whose fix lives in the pipeline (dagster link regeneration) + product (PLT-2650/UX-1109), not the FE. Clustering PLT-2909 with PLT-2385 is the correct home.

**Caveat (flag for a human re-file):** the *surface* is the ViewerPage linking panel, so `viewer-and-model` is defensible; and the sibling PLT-2882 (same `activity-linking`/`linking-service` subsystem, "too few" variant) was filed `progress-tracking`. If the board prefers to keep all activity-linking-panel tickets together, re-file under whichever of those PLT-2882 uses. I chose `data-pipeline` to match the *cause* and its parent PLT-2385, consistent with PLT-2882's "tag where the fix lives" reasoning.

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

- **Mechanism identified in code** (panel shows one model per distinct owning-model of the activity's linked elements; `modelElementId` UUID-PK ⇒ each element → one model ⇒ multiple models shown *only if* `activity_links` spans multiple models; extras render as bare nodes via `modelsToShowAsNodes`): **9/10** — read from source with file:line, and the UUID-PK invariant makes the deduction near-deterministic rather than speculative.
- **Root-cause attribution** (CY-5200's `activity_links` on ATL08 is stale/cross-model of the PLT-2385 QA/PC-shared-ID + persisted-on-reversion family): **6/10** — fits the symptom and matches an already-diagnosed identical mechanism, **but not yet confirmed** by an `activity_links` query for CY-5200. Environment/data-dependent.
- **Duplicate-of / same-family-as PLT-2385:** **6–7/10** — same mechanism class; different site and different surface, so a dev-lead should make the merge/link call.
- **Bug vs feature-gap** (data-integrity primary, FE presentation gap secondary): **8/10**.
- **Session-id error (secondary signal):** **2/10** — cannot classify without the screenshot.

**Overall triage confidence: ~7/10.** The mechanism is strong (≈9/10) and the direction is clear, but the operator's ~95% bar on *root cause* cannot be met until the one `activity_links` data query below is run for CY-5200. State that plainly rather than over-claim.

---

## NEEDS HUMAN (media I cannot read / data I cannot query)

- ⚠️ **`image-20260716-112218.png`** (Jira attachment 60910, 237 KB) — behind Atlassian auth, not viewable here. Likely the panel showing the several-models tree.
- ⚠️ **`image-20260716-112527.png`** (Jira attachment 60911, 55 KB) — not viewable here.
- ⚠️ **Two inline blob images in comment 1** (`media.staging.atl-paas.net` blobs) — (a) the linked-models panel for CY-5200, (b) the **"generate session id" error**. Not resolvable here. The second one is the only evidence for the secondary signal — get the exact error text/endpoint before treating it.
- ⚠️ **Data confirmation (decisive — needs DuckDB console / dev session on ATL08):** for activity `CY-5200`, `SELECT DISTINCT modelId FROM project_element_list WHERE modelElementId IN (<CY-5200's activity_links modelElementIds>)` — how many distinct models, and which ones besides `PC-EXCEL_…Bld2-V1`? Are the extras a **QA model / other PC model (shared Revit unique IDs)** or a **superseded version**? That diff turns 6/10 attribution into a confirmed cause and tells us if it is literally PLT-2385.
- ⚠️ **Trigger + cohort (needs BE/data + product):** was a model on ATL05–08 recently re-uploaded/re-versioned/deleted; and enumerate all activities across ATL05–08 whose links resolve to >1 model.

---

## Roster / ownership notes

- **Ilia Kuzmin** (assignee, "mechanism interrogator") — right owner to run the one confirming `activity_links`/`project_element_list` query and to make the "is this PLT-2385?" call.
- **Rishi Bhugobaun** (senior fullstack) — diagnosed PLT-2385; best placed to confirm same-family and whether the PLT-2385 / PLT-2650 fix covers ATL05–08.
- **Darminder** (fullstack lead) — owns the secondary FE presentation-gap hardening if pursued.
- **David Webb** (off-roster, BE/data/dagster) — owns the `project-element-list` regeneration + "QA/PC not considered" behaviour that produces the stale links; the trigger/cohort question is his.
- **Yash Patel** (reporter/coordinator) — has the screenshots; owns the split-off session-id signal and client comms.

## Doc / knowledge refs
- `incidents/live-incident-board-tickets/PLT-2385-groupB-data-pipeline/context.md` — the parent mechanism (PC/QA shared-ID stale links; PLT-2650 / UX-1109 follow-ups).
- `incidents/live-incident-board-tickets/PLT-2882-groupA-progress-tracking/context.md` — sibling activity-linking-panel ticket (same subsystem, "too few" variant).
- `dashboard/data-pipeline.md` — `project_element_list` (modelElementId → sourceFileElementId → modelId) and dagster regeneration.
- `dashboard/viewer-and-model.md` — the three-ID mapping chain (UUID → external ID → dbId) the panel walks.
- `incidents/live-incident-playbook.md` — tone/pattern for the reply.
</content>
</invoke>
