# PLT-2909 — "Models/Elements linked to an activity appear wrong" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2909
- **Issue type:** Live Incident · Software Area: **Web Viewer**
- **Status:** **In Analysis** · **Priority:** Medium
- **Project(s):** ATL05–ATL08 (reporter: "present for all ATL05-08 projects"). Repro cited on **ATL08**.
- **Reporter (Jira):** Yash Patel (support) · **Assignee:** Ilia Kuzmin · Original client reporter: Kyriakos · Freshdesk #7428.
- **Created:** 2026-07-16.
- **Attachments:** 2 images (⚠️ unreadable behind Atlassian auth — see NEEDS HUMAN).
- **Domain slug chosen:** `progress-tracking` (matches sibling PLT-2882 — justified below).
- **Concrete repro handed to us:** activity **`CY-5200`**, schedule **`29475-16-RL3`**, project **ATL08**. Model that *actually* contains the linked elements: **`PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2-V1`** — but "several models appear." *(Confirmed correct by the 07-23 diagnostic — see UPDATE below; the ghost turned out to be a **different, third** model.)*

---

## UPDATE 2026-07-23 — diagnostic RUN: ghost model **CONFIRMED**; trigger hypothesis **REVISED**

New Jira comment (2026-07-23 10:58, **Ilia Kuzmin**) — the `__linkDiagnose('CY-5200')` run this
folder had been waiting on since 07-17 is **done**. Verbatim substance:

> "The model **`DistributionBoardsPanels_Bld1-V1`** is a **ghost**: metadata claims the 6
> elements, **geometry and its cloud list have none of them**. **Bld2 and the federated model are
> real**, selection works fine, so it's purely a wrong model list. Same defect family as PLT-2882
> but here it's **PC-EXCEL imports, all 6 elements from one source file (`dd20b121`)**. Suspect the
> excel import wrote the same rows into several buildings' metadata. **@Ali Seyedof**: can you
> check why `client-element-metas` for that Bld1 model (`00156181-fca5-4a7c-acdf-a12ce924c252`)
> has elements it doesn't own? **FE fix (hide models not in geometry) will be tracked in PLT-2882.**"

**What this changes, in order of importance:**

1. **CONFIRMED (was 5/10 → now 9/10):** the extra model is a **ghost** — parquet-claims-membership,
   geometry-can't-back-it. This is exactly the "Expected if same-mechanism" prediction in
   `recommended-action.md` § step 3. The mechanism read from source (§ Mechanism below) is now
   backed by ATL08 data, not just by PLT-2882's FAR01 data. **PLT-2909 and PLT-2882 are the same
   defect family**, one surface apart, as this doc argued.
2. **The ghost is a THIRD model, not the one the client named.** Kyriakos flagged
   `PC-EXCEL_SWITCH_ATL8_…_EquipmentOthers_**Bld2**-V1` as "the one that should be real" — and it
   **is** real, along with the federated model. The bogus entry is
   **`DistributionBoardsPanels_**Bld1**-V1`** (`00156181-fca5-4a7c-acdf-a12ce924c252`), which
   nobody had named before this run. Anyone re-reading the original ticket text will look for the
   wrong model — **the Bld1/Bld2 distinction is load-bearing**.
3. **TRIGGER HYPOTHESIS REVISED — this is a correction, not an addition.** The earlier guess in
   this file (§ Playbook #5, and the draft reply) was a generic **"model re-upload / re-version
   left stale metadata"** — i.e. PLT-2882's *temporal* mechanism (a dead generation retained).
   The data says otherwise: all 6 elements come from **one source file (`dd20b121`)** via a
   **PC-EXCEL / spreadsheet import**, and the suspicion is that the import **wrote the same source
   rows into several buildings' metadata**. That is a **spatial / import-time cross-contamination**
   bug (one model's rows landing in another model's `client-element-metas`), **not** a stale-
   generation-after-reupload bug. Same *symptom surface*, same *FE amplifier*, **different
   trigger** from PLT-2882. Treat the old "was ATL08 re-uploaded?" question as **superseded**.
4. **Ownership moved BE-side and is already assigned in-thread:** **Ali Seyedof** (api-v2) was
   tagged directly by Ilia — no routing action needed from us.
5. **FE fix is NOT a PLT-2909 deliverable.** "Hide models whose geometry doesn't back their claimed
   elements" is confirmed tracked under **PLT-2882**. PLT-2909's residual scope = BE answer + confirm
   the shared FE guard lands via PLT-2882.

**Code check run this session (07-23), relevant to the revision:** there is **no Excel model mapper
in the frontend at all**. `ModelMappingService` supports exactly two file types —
`isRevitModel` = `rvt` and `isNavisworksModel` = `nwd`/`nwc`
(`services/model-loaders/model-mapping-service.ts:312-324`); anything else is skipped with a warn
(`:213-217`) or throws `Unsupported or unknown model file type` (`:296`). So **`PC-EXCEL_` is a
naming-convention prefix on the model/import, not a viewer model type** — the Excel-ness lives
entirely in **how the metadata rows were authored BE-side**, and the FE consumes those rows
verbatim. This **retires the old open question** "is `PC-EXCEL_…` Revit or Navisworks, does the
mapper path differ?" — the mapper only ever touches the **geometry** side, and the defect is on the
**metadata** side, so the Revit-vs-Navisworks distinction is **moot for attribution here**.

**Why the FE turns a BE import bug into "several models appear" (unchanged, now load-bearing):**
`model-entity.ts:274-280` walks every row of each model's `client-element-metas` and, when the
element already exists, does `existing.models.add(this.id)` (`:277`) — **no ownership or geometry
check**. Duplicated import rows therefore *accumulate* membership across every model whose parquet
mentions them. `:284` then mirrors the same parquet into `project_element_list`
(`duckdb-element-store.ts` § `syncElementMetadataForModel`), so **both** rendering surfaces
(grouped-links panel and isolation tree) read the *same* contaminated source. One bad import row
→ one permanent ghost entry in the model list.

---

## One-line symptom

In the **web viewer (ViewerPage)**, the UI that lists **which models contain the elements linked to a schedule activity** shows **too many models** — models that do **not** contain any element linked to the activity. Kyriakos: *"the elements exist only in one model … however several models appear."* Yash reproduced it on ATL08 / `CY-5200`.

**This is NOT "0 elements selected" (that is PLT-2882's shape).** Here the linked-elements panel/tree resolves *something* and shows it — but the **set of models it groups those elements under is wrong** (inflated).

---

## Relationship to PLT-2882 (read that folder first)

Ilia's on-ticket hypothesis (2026-07-17): *"very similar to PLT-2882, where elements no longer exist in the current model version after a re-upload."* Yash pushed back: *"not too sure … but I hope it's same."* This write-up **independently tests that hypothesis in code** rather than assuming it.

> **07-23 resolution of that disagreement:** the diagnostic settled it — **same defect family
> confirmed** (ghost model: parquet claims membership, geometry can't back it), so Ilia's instinct
> was right on the *family*. But **Yash's caution was also earned**: the *trigger* is **not** the
> re-upload story he was being asked to accept — it is a **PC-EXCEL import writing one source
> file's rows into several buildings' metadata**. Both were partly right; neither had the data.

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

PLT-2882's symptom (select/isolate → 0) stopped at the geometry cliff (`dbIdHitCount: 0`), so its docs never had to explain *why the panel listed 2 models*. PLT-2909 is that same metadata read one step earlier in the pipeline: whenever a model's parquet lists an element that its geometry doesn't contain, `getModels()` returns that model anyway, and the panel faithfully renders the membership. **Same defect, one surface earlier.**

**How the parquet comes to over-claim — two confirmed routes, and PLT-2909 is the second one
(revised 07-23):**

| | PLT-2882 (FAR01) | PLT-2909 (ATL08) |
|---|---|---|
| Route | **Temporal** — re-upload/re-version; metadata retains a **dead generation** | **Spatial** — **PC-EXCEL import** writes one source file's rows into **several buildings'** metadata |
| Parquet lists | elements the model **used to** own | elements the model **never** owned |
| Confirmed by | `inParquet: 418 / inGeometry: 0` on both models | ghost `Bld1-V1`: metadata claims 6, geometry + cloud list have 0; `Bld2` + federated real |
| Symptom | "0 elements selected" | "several models appear" |

Both routes break the same invariant — **`client-element-metas` ⊅ loaded geometry** — and both are
amplified by the same unguarded FE accumulation (`model-entity.ts:277`). The original text of this
section assumed the *temporal* route for PLT-2909; **that assumption is now corrected.**

---

## "Same root cause?" — independent verdict

**Verdict (revised 2026-07-23, post-diagnostic): SAME root-cause family — CONFIRMED on ATL08 data, not inferred. DIFFERENT manifestation *and* a DIFFERENT trigger. Keep the tickets linked, not merged.**

- **Confirmed by the ATL08 run:** `DistributionBoardsPanels_Bld1-V1` is a **ghost** — its
  `client-element-metas` claims the 6 elements; its **geometry and cloud element list contain none**
  of them. `Bld2` and the federated model are **real** and select correctly. So the panel's model
  list is inflated by pure metadata, exactly as the code read predicted — *"the code cannot produce
  extra models from geometry, only from metadata"* now has data behind it.
- **The third alternative from the last run is EXCLUDED.** The "benign federated-overlap /
  genuine multi-model membership" explanation is dead: the ghost model's geometry **and** cloud list
  are empty of these elements, so its membership claim is not genuine overlap.
- **Where PLT-2909 now DIVERGES from PLT-2882 — the trigger.** PLT-2882 = *temporal*: models
  re-uploaded/re-versioned, metadata retained a **dead generation** of content that geometry had
  dropped. PLT-2909 = *spatial*: a **PC-EXCEL import cross-contaminated buildings' metadata**, so a
  model's parquet lists elements **it never owned** (source file `dd20b121`, all 6 elements, written
  into more than one building). Same broken invariant (**metadata ⊅ geometry**), reached by two
  different upstream routes. **Do not let the "same family" shorthand collapse them** — the BE fix
  for one will not fix the other.
- **Yash's caution, retrospectively:** justified, and for a better reason than the one available at
  the time. He was right that the causes weren't identical; the confirmed divergence is the trigger,
  not the mechanism.
- **Net:** link PLT-2909 ↔ PLT-2882 as one family + one shared FE fix (in PLT-2882); keep **two
  distinct BE root causes**. Do **not** close PLT-2909 when PLT-2882's BE fix lands.

---

## Side-finding (SEPARATE track) — "when I tried to generate session id it gave me an error"

Yash, comment 1: *"when I tried to generate session id it gave me an error."* This is **almost certainly a different signal** and must not be folded into the linking diagnosis (playbook: "different error messages = different tracks, each with an owner; label side-findings loudly").

- The "session id" the client generates for support is the **Help menu → Sync session logs / Copy session ID** flow: `shared/layout/appbar/components/HelpMenu/SyncLogModal.tsx` ("*Sync your session logs and include the session ID in your support ticket*"), which calls `LogFileService.syncSessionLogs()` (`services/logService/log-file-service.ts:192-230`). The session id itself is a client-side UUID (`helpers/session/session.tsx:51-58`) — generating it can't really "error"; what errors is the **log upload** (`LogApiService.uploadLog` → `throw new Error(message)` at `log-file-service.ts:230`; OPFS-unavailable throw at `:247`).
- This is an **observability/support-tooling failure**, not the parquet/geometry linking path — it does not read `activity_links`, `project_element_list`, or geometry. No plausible shared cause with the wrong-model-list bug.
- **Flagged as its own track, needs its own owner.** It matters operationally: if session-log sync is failing on ATL08, TS can't collect the very logs this incident wants (echo of the July playbook's "observability gap"). Worth a one-line note to whoever owns log sync (BE/logging), separate from the linking investigation.

---

## Playbook six-questions status

1. **Observed:** wrong (inflated) set of models listed as linked to an activity. Repro in-house on ATL08/`CY-5200` by Yash — good (a currently-broken instance).
2. **Expected, on whose authority:** Kyriakos's domain knowledge — *"the elements exist only in one model (`PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2-V1`)."* **✅ VINDICATED 07-23:** the diagnostic confirms Bld2 (plus the federated model) really does hold the elements. The client's authoring intent was correct; the platform's metadata was wrong.
3. **Smallest broken-vs-working pair:** **✅ PRODUCED 07-23, and it is unusually clean** — *within the same activity*: `Bld1-V1` (ghost: metadata yes, geometry + cloud list no) vs `Bld2-V1` and the federated model (real: selection works). No cross-activity comparison needed.
4. **Mechanism:** parquet-derived model membership rendered without a geometry check (above) — **9/10**: code-read **and** confirmed against ATL08 data.
5. **Why now (trigger):** ⚠️ **REVISED 07-23 — the earlier guess was wrong.** *Old (superseded):* "an ATL08 model re-upload/re-version left `client-element-metas` listing superseded membership," borrowed from PLT-2882. *Current:* a **PC-EXCEL / spreadsheet import wrote one source file's rows (`dd20b121`, all 6 elements) into several buildings' `client-element-metas`** — import-time **cross-contamination**, not a stale generation. The Bld1 model's parquet lists elements **it never owned**, rather than elements it *used to* own. Still to be pinned down BE-side (**Ali Seyedof**, api-v2): *which* import run, and whether it is one-off or systematic per-import. Note the trigger is now **timeless** — no re-upload event needs to have happened; the defect is baked in at import.
6. **Cohort:** ⚠️ **RESHAPED by the revised trigger.** The reporter's "all ATL05-08 projects / various activities" no longer implies "every re-versioned activity." The right cohort is now **every model whose metadata was populated by a PC-EXCEL / spreadsheet import** — sweep for **source-file ids appearing in more than one model's `client-element-metas`** (starting with `dd20b121`), across ATL05–08. That is a **BE-side query**, cheaper and far more targeted than the FE geometry-harvest sweep PLT-2882 needed. See `recommended-action.md` § parallel move.

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

*(Scores revised 2026-07-23 after the diagnostic; previous values in parentheses.)*

- **Model list is built from parquet metadata (`getModels()` / `project_element_list`) with no geometry intersection, so over-broad metadata → extra models:** **9/10** (was 8) — read directly from source (`useGroupedLinks.ts:30`, `element-entity.ts:39-43`, `model-entity.ts:255-280` esp. the unguarded `existing.models.add(this.id)` at `:277`, `useLinkedElementsTreeData.ts:97-116`) **and** now confirmed by the ATL08 run.
- **That this mechanism is what `CY-5200`/ATL08 actually hit:** **9/10** (was 5) — **confirmed by diagnostic**: `Bld1-V1` ghost (metadata yes / geometry + cloud list no), `Bld2-V1` + federated real. The benign federated-overlap alternative is excluded; the Revit-vs-Navisworks mapper doubt is moot (no Excel mapper exists — the defect is metadata-side).
- **Same root-cause *family* as PLT-2882 (metadata claims what geometry can't back):** **9/10** (was 7) — confirmed, with the explicit caveat that the **triggers differ**.
- **Trigger is a PC-EXCEL import cross-contaminating buildings' metadata (rather than re-upload staleness):** **6/10** — this is Ilia's stated suspicion plus a strong circumstantial fit (all 6 elements, one source file `dd20b121`, model claims elements it doesn't own). **Not yet proven**; only the BE (Ali Seyedof) can confirm *how* those rows got written. This is now the single biggest open unknown.
- **Cohort is "models populated by PC-EXCEL imports," sweepable by duplicated source-file id:** **5/10** — follows from the trigger hypothesis, so it inherits its uncertainty.
- **FE fix belongs to PLT-2882, not here:** **9/10** — stated explicitly by the assignee in-thread.
- **Session-id error is a separate track:** **8/10** (unchanged).

**Overall triage confidence: ~8/10** (was ~6) — symptom, mechanism, affected model and surface are all confirmed on real ATL08 data; FE ownership is settled. The residue is the **BE trigger** (why the import wrote foreign rows) and the **cohort size**, both squarely with Ali Seyedof.

---

## NEEDS HUMAN

### Open

- ⚠️ **BE root cause — OWNER: Ali Seyedof (api-v2), tagged in-thread 07-23. The one blocking item.**
  Why does `client-element-metas` for model **`DistributionBoardsPanels_Bld1-V1`**
  (`00156181-fca5-4a7c-acdf-a12ce924c252`) contain **6 elements it doesn't own**, all from source
  file **`dd20b121`**? Specifically: did the PC-EXCEL import write the same source rows into
  **multiple buildings'** metadata, and is that per-import systematic or a one-off?
- ⚠️ **Cohort size (BE query, follows from the above):** how many other models — across **ATL05–08**
  and beyond — have a **source-file id present in more than one model's `client-element-metas`**?
  This is the sweep that sizes the blast radius; cheap as SQL, expensive from the FE.
- ⚠️ **Remediation shape (BE, after the above):** deleting the contaminated rows vs re-running the
  import. Note PLT-2882's precedent — **do not bulk-delete before peer alignment** (that ticket's
  418-row deletion is still on hold for exactly this reason).
- ⚠️ **Confirm the shared FE guard lands via PLT-2882** ("hide models whose geometry doesn't back
  their claimed elements"). It is **not** PLT-2909 work, but PLT-2909's *user-visible* symptom
  doesn't go away until it ships — so PLT-2909 should not be closed on the BE fix alone.
- ⚠️ **2 image attachments on PLT-2909** (behind Atlassian auth — not viewable here). Kyriakos's
  screenshots of the wrong model list. Lower value now that the diagnostic has named the ghost, but
  still the only evidence of *which* surface (grouped-links count panel vs isolation tree) the client
  was looking at. **Do not guess contents.**
- ⚠️ **Session-log-sync error** — separate track; owner = BE/logging. Needs the actual error text
  from Yash (see side-finding). **Still unanswered since 07-16.**

### Closed / superseded (2026-07-23)

- ✅ **DONE — ATL08 diagnostic.** `__linkDiagnose('CY-5200')` was run; ghost model confirmed. See
  § UPDATE 2026-07-23.
- ✅ **RESOLVED — "Revit vs Navisworks model type of `PC-EXCEL_…`."** Moot: no Excel mapper exists,
  and the mapper only governs the **geometry** side (`model-mapping-service.ts:312-324`). The defect
  is metadata-side, so PLT-2882's Revit/`svf2-object-id-map` caveat does not gate this ticket.
- ❌ **SUPERSEDED — "was an ATL08 model re-uploaded/re-versioned recently?"** Wrong question: the
  trigger is import-time cross-contamination, not a stale generation. **Don't ask the client this** —
  it would send them looking for an event that isn't the cause.

---

## Roster / ownership notes

- **Ali Seyedof** (api-v2) — **⭐ current owner of the open question** (tagged by Ilia, 07-23): why
  `client-element-metas` for the Bld1 model carries elements it doesn't own. The ball is with him;
  PLT-2909 has no FE-side work pending.
- **Ilia Kuzmin** — assignee; ran the ATL08 diagnostic on 07-23 (as this folder recommended) and
  routed the BE question himself. Mechanism interrogator for both siblings.
- **Darminder Atker** — FE robustness half (PLT-2882 assignee). **Confirmed 07-23:** the shared FE
  guard (don't list models whose geometry can't back their claimed elements) is tracked in
  **PLT-2882** and covers both symptoms. Worth making sure his fix covers the **model-list** surface
  (`useGroupedLinks.ts` + `useLinkedElementsTreeData.ts`), not only PLT-2882's selection surface.
- **Yash Patel** — coordinator/client channel; his "same cause?" caution is now answered precisely:
  same family, **different trigger**. Worth telling him, since it changes what the client gets asked.
- **BE/data (Sergey / Sachin / David Webb)** — wider pipeline context; David Webb is the peer whose
  alignment gates PLT-2882's row deletion, so loop him in before any PLT-2909 data remediation too.

---

## Doc / knowledge-base refs

- **Sibling `PLT-2882-groupA-progress-tracking/`** — `context.md` (mechanism, 3-narrowing-sets), `investigation-log.md` (CONFIRMED root cause, `__linkDiagnose` tool, parquet-vs-geometry data, Revit-vs-Navisworks mapper note, 418-list). **PLT-2909 builds directly on it.**
- `xyz-platform-context/dashboard/viewer-and-model.md` — confirms linking/selection is ViewerPage-only (Dashboard disables selection).
- `xyz-platform-context/incidents/live-incident-playbook.md` — six-questions frame; "split signals into separate tracks"; "close on cause+trigger+cohort, not on works-now".
</content>
</invoke>
