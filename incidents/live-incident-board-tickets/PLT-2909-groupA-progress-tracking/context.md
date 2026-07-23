# PLT-2909 — "Models/Elements linked to an activity appear wrong" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2909
- **Issue type:** Live Incident · Software Area: **Web Viewer**
- **Status:** **In Analysis** · **Priority:** Medium
- **Project(s):** ATL05–ATL08 (reporter: "present for all ATL05-08 projects"). Repro cited on **ATL08**.
- **Reporter (Jira):** Yash Patel (support) · **Assignee:** Ilia Kuzmin · Original client reporter: Kyriakos · Freshdesk #7428.
- **Created:** 2026-07-16.
- **Attachments:** 2 images (⚠️ unreadable behind Atlassian auth — see NEEDS HUMAN).
- **Domain slug chosen:** `progress-tracking` (matches sibling PLT-2882 — justified below).
- **Concrete repro handed to us:** activity **`CY-5200`**, schedule **`29475-16-RL3`**, project **ATL08**. Model that *actually* contains the linked elements: **`PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2-V1`** — but "several models appear."

> **Re-checked 2026-07-23 — no new comments since 07-17.** Status unchanged (In Analysis). The
> recommended diagnostic (run PLT-2882's `window.__linkDiagnose('CY-5200')` on ATL08) has not yet been
> reported as run. No change to the drafted action.

---

## One-line symptom

In the **web viewer (ViewerPage)**, the UI that lists **which models contain the elements linked to a schedule activity** shows **too many models** — models that do **not** contain any element linked to the activity. Kyriakos: *"the elements exist only in one model … however several models appear."* Yash reproduced it on ATL08 / `CY-5200`.

**This is NOT "0 elements selected" (that is PLT-2882's shape).** Here the linked-elements panel/tree resolves *something* and shows it — but the **set of models it groups those elements under is wrong** (inflated).

---

## Relationship to PLT-2882 (read that folder first)

Ilia's on-ticket hypothesis (2026-07-17): *"very similar to PLT-2882, where elements no longer exist in the current model version after a re-upload."* Yash pushed back: *"not too sure … but I hope it's same."* This write-up **independently tests that hypothesis in code** rather than assuming it.

PLT-2882 is **fully root-caused** (see sibling `PLT-2882-groupA-progress-tracking/investigation-log.md`, "ROOT CAUSE CONFIRMED"):
> The activity's linked elements resolve **418** in the `client-element-metas` **parquet metadata** but **0** in the loaded **SVF geometry** for the *same model version*. `model.elementId2dbId` is the *intersection* of loaded geometry externalIds and the parquet (`model-mapping-service.ts:372-384`). The models were **re-uploaded / re-versioned** (`…_REV1-V23`); the piece of work was removed/redrawn in the new version; **parquet + `activity_links` still carry the dead generation** while geometry does not. Diagnostic `window.__linkDiagnose()` on branch `PLT-linked-selection-diagnostics` confirmed it twice (cold-cache included): `inParquet: 418 / inGeometry: 0` on **both** models.

The load-bearing fact for PLT-2909: in PLT-2882's confirmed data, the stale parquet listed the dead elements as members of **both** models (`inParquetNotInGeometry: 418` on each). That is *exactly* the raw material for "several models appear."

---

## Mechanism — code-verified: the model list comes from parquet metadata, never from geometry

All refs under `hc-frontend/src/main/webapp/app/pages/organisation/ViewerPage/`.

**Where element→model membership is built (the stale source).**
`ElementEntity.models` is a `Set<string>` of modelIds populated **entirely from each model's `client-element-metas` parquet**:
- `components/project-x/entities/model-entity.ts:255-280` — loads the model's `client-element-metas` (or `legacy-element-meta`) parquet, iterates every row, and for each element either creates an `ElementEntity` tagged with this model's id or, if the element already exists, **`existing.models.add(this.id)`** (`:277`). So one element accrues membership in *every model whose parquet lists it*.
- `ElementEntity.getModels()` (`entities/element-entity.ts:39-43`) returns those modelIds, filtered only to models still present in `projectService.models` (deleted-model guard) — **no geometry check whatsoever**.

**Surface 1 — the "click the count → N models" panel** (this is the surface PLT-2882's log describes as "clicking the count lists 2 models"):
- `components/viewer-x/components/blocks/activity-linking-list/hooks/useGroupedLinks.ts:22-51` — takes `getElementsForActivity(activity)`, and for each element groups its links **by `element.getModels()`** (`:30`). Models with ≥1 link survive the `filter(model => model.links.length > 0)` (`:51`). **Membership is 100% parquet-derived; geometry/dbId presence is never consulted.**

**Surface 2 — the linked-elements isolation tree** (`activity-linking-list`):
- `activity-linking-list/hooks/useLinkedElementsTreeData.ts` `collectV2()` (`:82-119`) resolves models via `elementStore.getModelElementMappingsForElements()` (`:97`), which is a straight `SELECT … FROM project_element_list` (the **parquet element list**, `services/duckdb/duckdb-element-store.ts:68-80`). Crucially, a model whose geometry yields **no dbIds** (`getDbIdsWithChildren` returns `[]`) is **still added to `modelsToShowAsNodes`** (`:114-116`) and rendered as a node (`appendModelNodes`, `:122-146`). So even the tree surfaces "ghost" models with zero resolvable geometry.

**Conclusion:** both surfaces that answer "which models is this activity linked to?" derive the model set from the **`client-element-metas` / `project_element_list` parquet** — the *same* metadata PLT-2882 proved is stale after a re-upload. Neither surface intersects against loaded geometry before listing a model.

### "Ghost model membership" — the missing piece PLT-2882 didn't need to name

PLT-2882's symptom (select/isolate → 0) stopped at the geometry cliff (`dbIdHitCount: 0`), so its docs never had to explain *why the panel listed 2 models*. PLT-2909 is that same stale metadata read one step earlier in the pipeline: when models are re-uploaded/re-versioned, the parquet metadata of **multiple model versions/federated members still lists the superseded element as a member**, so `getModels()` returns several models — even ones whose current geometry contains none of the activity's elements. The panel faithfully renders that stale membership. **Same defect, one surface earlier.**

---

## "Same root cause?" — independent verdict

**Verdict: SAME root-cause family (stale `client-element-metas` parquet disagreeing with re-uploaded geometry), DIFFERENT manifestation — and it still needs its own data confirmation on ATL08 before being merged with PLT-2882.**

- **Where I agree with Ilia:** the mechanism the wrong-model-list *must* flow through is the parquet-derived membership (`getModels()` / `project_element_list`), which is precisely the artifact PLT-2882 caught being stale after re-upload. The code cannot produce "extra models" from geometry — only from metadata. So the shapes are two faces of one data defect.
- **Where Yash's skepticism is right (and I honor it):** this is **not yet confirmed on ATL08/`CY-5200`**. Three real gaps: (1) PLT-2882's confirmation is FAR01/APLD data, a *different* project family; (2) the model here is **`PC-EXCEL_…`** — an Excel/spreadsheet-derived import, plausibly a **Navisworks-path** model, whereas PLT-2882's confirmed models were **Revit** (different mapper: `revit-model-mapper.ts` vs `navisworks-model-mapper.ts`, and PLT-2882's cohort-sweep notes found only Navisworks models carry an `svf2-object-id-map` artefact) — the resolution path may differ; (3) an alternative benign-ish explanation is not yet excluded: the model list could be inflated simply because the element genuinely has membership rows in several *current* models' parquets (federated overlap), i.e. a metadata-correctness question rather than a stale-generation one. Only the diagnostic settles which.
- **Net:** *same family, different manifestation, needs its own data confirmation.* Do **not** close PLT-2909 on PLT-2882's evidence; do reuse PLT-2882's tooling to get PLT-2909's evidence cheaply (see `recommended-action.md`).

---

## Side-finding (SEPARATE track) — "when I tried to generate session id it gave me an error"

Yash, comment 1: *"when I tried to generate session id it gave me an error."* This is **almost certainly a different signal** and must not be folded into the linking diagnosis (playbook: "different error messages = different tracks, each with an owner; label side-findings loudly").

- The "session id" the client generates for support is the **Help menu → Sync session logs / Copy session ID** flow: `shared/layout/appbar/components/HelpMenu/SyncLogModal.tsx` ("*Sync your session logs and include the session ID in your support ticket*"), which calls `LogFileService.syncSessionLogs()` (`services/logService/log-file-service.ts:192-230`). The session id itself is a client-side UUID (`helpers/session/session.tsx:51-58`) — generating it can't really "error"; what errors is the **log upload** (`LogApiService.uploadLog` → `throw new Error(message)` at `log-file-service.ts:230`; OPFS-unavailable throw at `:247`).
- This is an **observability/support-tooling failure**, not the parquet/geometry linking path — it does not read `activity_links`, `project_element_list`, or geometry. No plausible shared cause with the wrong-model-list bug.
- **Flagged as its own track, needs its own owner.** It matters operationally: if session-log sync is failing on ATL08, TS can't collect the very logs this incident wants (echo of the July playbook's "observability gap"). Worth a one-line note to whoever owns log sync (BE/logging), separate from the linking investigation.

---

## Playbook six-questions status

1. **Observed:** wrong (inflated) set of models listed as linked to an activity. Repro in-house on ATL08/`CY-5200` by Yash — good (a currently-broken instance).
2. **Expected, on whose authority:** Kyriakos's domain knowledge — *"the elements exist only in one model (`PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2-V1`)."* Reference is the client's model-authoring intent; not yet cross-checked against the parquet, which is the whole question.
3. **Smallest broken-vs-working pair:** to be produced by the diagnostic — `CY-5200` (broken) vs a working activity in the same schedule/model; and per-model `inParquet` vs `inGeometry`.
4. **Mechanism:** parquet-derived model membership rendered without a geometry check (above) — **8/10, code-read**.
5. **Why now (trigger):** unconfirmed. Strongly suspected: an ATL08 model **re-upload/re-version** (the `…-V1` lineage) that left `client-element-metas` listing superseded/other-model membership. Must be asked (as PLT-2882 asks for FAR01).
6. **Cohort:** reporter already states it — "all ATL05-08 projects," "various activities." If confirmed as the PLT-2882 mechanism, the cohort is *every activity whose linked elements were re-versioned*, project-wide — a bulk sweep, not per-ticket.

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

- **Model list is built from parquet metadata (`getModels()` / `project_element_list`) with no geometry intersection, so stale/over-broad metadata → extra models:** **8/10** — read directly from source (`useGroupedLinks.ts:30`, `element-entity.ts:39-43`, `model-entity.ts:255-280`, `useLinkedElementsTreeData.ts:97-116`).
- **That this stale-parquet mechanism is what `CY-5200`/ATL08 actually hit:** **5/10** — fits the symptom and Kyriakos's "one model but several appear" precisely, matches PLT-2882's confirmed data shape, but is **unconfirmed on ATL08**, on a **different model type** (`PC-EXCEL`, likely Navisworks), and a benign metadata-overlap alternative isn't excluded.
- **Same root-cause *family* as PLT-2882:** **7/10**.
- **Session-id error is a separate track:** **8/10**.

**Overall triage confidence: ~6/10** — clear mechanism and a cheap confirmation path (reuse PLT-2882's diagnostic); final attribution needs one diagnostic run on ATL08.

---

## NEEDS HUMAN

- ⚠️ **2 image attachments on PLT-2909** (behind Atlassian auth — not viewable here). These are Kyriakos's screenshots of the wrong model list; they would confirm *which* surface (grouped-links count panel vs isolation tree) and how many extra models appear. **Do not guess contents.**
- ⚠️ **Data confirmation on ATL08** (needs a dev/editor session): run `window.__linkDiagnose('CY-5200')` per `recommended-action.md`; specifically compare `modelMembership` (parquet) against `parquetVsGeometryByMongoModelId` (`inParquet` vs `inGeometry`) for each listed model. Extra models with `inParquet > 0, inGeometry = 0` (or non-membership) = confirmed ghost membership = same mechanism as PLT-2882.
- ⚠️ **Model type of `PC-EXCEL_SWITCH_ATL8_…`** — Revit vs Navisworks decides the mapper path (`revit-model-mapper.ts` vs `navisworks-model-mapper.ts`) and whether an `svf2-object-id-map` artefact exists. Confirm before assuming PLT-2882's Revit findings transfer.
- ⚠️ **Trigger (BE/ops):** was an ATL08 model (esp. `PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2`) re-uploaded/re-versioned recently, and does its timing line up with when the model list went wrong?
- ⚠️ **Session-log-sync error** — separate track; owner = BE/logging. Needs the actual error text from Yash (see side-finding).

---

## Roster / ownership notes

- **Ilia Kuzmin** — assignee here *and* the operator who root-caused PLT-2882; owns the diagnostic branch. Correct owner to run the ATL08 diagnostic (mechanism interrogator).
- **Darminder Atker** — FE robustness half (PLT-2882 assignee); same FE fix likely covers both symptoms (surface geometry-vs-metadata disagreement; stop listing models with no resolvable geometry).
- **Yash Patel** — coordinator/client channel; rightly flagged the "same cause?" uncertainty — this write-up answers it as *same family, needs ATL08 data*.
- **BE/data (Sergey / Sachin+Ali / David Webb)** — if confirmed, the root-cause fix (why the parquet retains superseded/foreign model membership after re-upload) is theirs, as in PLT-2882.

---

## Doc / knowledge-base refs

- **Sibling `PLT-2882-groupA-progress-tracking/`** — `context.md` (mechanism, 3-narrowing-sets), `investigation-log.md` (CONFIRMED root cause, `__linkDiagnose` tool, parquet-vs-geometry data, Revit-vs-Navisworks mapper note, 418-list). **PLT-2909 builds directly on it.**
- `xyz-platform-context/dashboard/viewer-and-model.md` — confirms linking/selection is ViewerPage-only (Dashboard disables selection).
- `xyz-platform-context/incidents/live-incident-playbook.md` — six-questions frame; "split signals into separate tracks"; "close on cause+trigger+cohort, not on works-now".
</content>
</invoke>
