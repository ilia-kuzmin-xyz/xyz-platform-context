# PLT-2906 — "Section box misaligned from model" — triage context

- **Domain slug:** `viewer-and-model` (justified in §Domain slug)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2906
- **Type:** Live Incident · **Priority:** Major · **Status:** **Open**
- **Assignee:** Yash Patel (support) — **investigation lead is Ilia Kuzmin** per comments · **Reporter (Jira):** Yash Patel
- **Project:** FAR01 (also affects FAR02 per follow-up; customer says "some other projects as well") · **Software Area (metadata):** Dashboard — but this is a **3D-viewer / ViewerPage** feature, not the dashboard.
- **Created:** 2026-07-15 · **Last updated:** 2026-07-20
- **Attachments:** `section_box.png` (description); 2 × True-North screenshots in comment 6 (2026-07-20) — **all unviewable here, see NEEDS HUMAN**
- **Triage date:** 2026-07-22

> ⚠️ **This ticket is not fresh and it is not parked on the client.** It is mid-investigation and **the ball is on OUR side.** The customer answered Ilia's True-North question on **2026-07-20**; as of 2026-07-22 that answer sits **unanalysed** and no one has replied. It has been **~2 days stalled on Ilia's own follow-through**, not on the customer. (See §NEEDS HUMAN and `recommended-action.md`.)
>
> **Re-checked 2026-07-23 — still no reply, no new comments.** Status unchanged (Open). It is now **3
> days** since the customer's True-North screenshots (07-20) with no analysis posted — the stall is
> aging, not resolving. Same recommended action as 07-22: Ilia analyses the screenshots and runs the
> orientation diagnostic on FAR01/FAR02 before anything goes back to the client.

---

## Description (verbatim)

> Hi there, when the Section Box is turned on, it no longer aligns the way it used to. The new style isn't very useful because it doesn't display the rectangular box, which makes it difficult to adjust and section the model. Is it possible to change the Section Box back to how it was before? Thank you for advance!
> (attachment: section_box.png)

## Comment timeline (verbatim, chronological) — the ticket is mid-flow

1. **Yash (07-15 14:05):** asked user for more info, offered to get the model file.
2. **Yash (07-15 14:54):** relayed user's answers — *"Yes, this issue appears across all models in the project, including both FAR01 and FAR02… also appears to be affecting some other projects as well. Date/Time First Noticed: July 14, 2026, around 8:00 AM Central Time. The issue started recently. No, the model was not updated prior to noticing the difference."*
3. **Ilia (07-15 15:49):** "yes, please" (agreeing to obtain the model file).
4. **Yash (07-16 08:46):** posted a SharePoint link to the model file.
5. **Ilia (07-17 14:42):** *"…follow-up on the section box. I suspect this is tied to the models' True North angle, so as a first step could you ask the delivery/BIM team to check the True North angle in Revit for the FAR01/FAR02 models and report the actual value(s), and whether it's the same across all exported files?"*
6. **Yash (07-20 08:58):** *"@Ilia Kuzmin User got back with this when asked to look for True North angle in Revit… 'I have attached screenshot for both FAR01 and FAR02 True North info.' [2 screenshots attached]."* — **the customer's answer to Ilia's question. NOT yet analysed or replied to.**

No comments after 07-20.

---

## One-line symptom

In the **web viewer (ViewerPage)**, activating **Section Box** produces a box that is **rotated / not axis-aligned the way it used to be** ("the new style… doesn't display the rectangular box"), across **all models on FAR01 and FAR02** (and reportedly some other projects), **starting suddenly ~2026-07-14 08:00 CT**, with **no model update**. The user wants the previous (axis-aligned) box back.

---

## The six playbook questions applied

**1. What exactly is observed — and can we observe it?**
"When the Section Box is turned on, it no longer aligns the way it used to… doesn't display the rectangular box." The most consistent reading (see §Mechanism) is that the box is now **rotated to the building's geometric orientation** (a diagonal/tilted box) instead of the old **world-axis-aligned** box — so it no longer reads as a clean rectangle and its drag-handles are awkward. **We can observe it ourselves:** the model file was shared 07-16 (SharePoint), and the code ships a DevTools debug snippet (`section-tool-orientation.md`) that reports exactly the decisive numbers. This has **not** been run yet. The `section_box.png` and the two True-North screenshots would confirm the exact visual and the angle values but are unviewable here (NEEDS HUMAN).

**2. What did we expect — and on whose authority?**
Expected = the section box **"how it was before"** — i.e. the world-axis-aligned Forge default box the customer used prior to 07-14. The reference here is *the customer's own prior experience*, and unusually it is **corroborated by our own code history**: the codebase contains a deliberately-added `SectionToolOrientation` service whose entire job is to **replace** Forge's axis-aligned default box with a **rotated, footprint-fitted** box. So "it used to be a plain rectangle" is a credible, mechanism-backed reference, not folklore. (Contrast PLT-2874, where "the two numbers should match" was never a valid reference.)

**3. Smallest broken-vs-working pair.**
Two pairs are available and both are in our hands:
- **Temporal:** section box before 07-14 (axis-aligned, "worked") vs after 07-14 (rotated, "broken"). The diff is *what reached FAR01/FAR02 prod around 07-14* (deploy — see Q5).
- **Cross-project:** a project where the box still looks right vs FAR01/FAR02. The diff is **whether the orientation patch fires** — read directly by the debug snippet (`existingRotZ`, `tightness`, `angleDeg`) per model.

**4. What decides the behavior? (mechanism)** — code-verified, see §Mechanism. In one line: the section box orientation is taken from Forge's `refPointTransform`, and our `SectionToolOrientation` service **overrides it with a rotated, min-area-rectangle-fitted box** whenever `refPointTransform` carries ~no rotation *and* the building footprint is meaningfully diagonal.

**5. Why now? (trigger)** — **The single most diagnostic customer fact:** *"the model was not updated"* + *"started July 14 ~08:00 CT"* + *"all models, both projects, some other projects too."* A sudden, broad, model-independent change across multiple projects is the signature of a **platform deploy**, not per-model data. The prime suspect is the **release that rolled the `SectionToolOrientation` feature (or a change to it) out to FAR01/FAR02 production around 07-14.** ⚠️ **I cannot date this from the repo** — the checkout is a **shallow clone** (50 commits, 2026-06-24 → 07-21) and the orientation feature **already existed at the shallow base (2026-06-24) and was not modified anywhere in the visible window.** So the *merge* predates what I can see; the *deploy/rollout to FAR prod* around 07-14 is the correlation to confirm (NEEDS HUMAN — release/ops).

**6. Who else? (cohort)** — Already broad by the customer's own report: **all models on FAR01 + FAR02, plus "some other projects."** If the cause is the orientation patch firing, the affected cohort is *every project whose federated model has (a) a `refPointTransform` with ~no baked rotation and (b) a diagonal footprint* — i.e. buildings whose Revit True-North rotation was baked into geometry rather than into shared coordinates. That cohort should be enumerated once the mechanism is confirmed, not chased one ticket at a time.

---

## Mechanism (code-verified, with file:line)

All paths under `hc-frontend/src/main/webapp/app/pages/organisation/ViewerPage/`.

### The section box orientation pipeline
1. **Button → toggle → activate.** `components/viewer-bar/tools/section-tool-button.tsx:45-48` (`activateSectionBox` → `sectionToolService.toggleSectionTool()`); wired on the viewer via `viewer-x/components/services/viewer-service.ts:13,113,184` (`new SectionToolService(...)`, `.initialize()`).
2. **Activate box.** `components/section-tool/section-tool-service.ts:241-266` `_activateBoxSectionTool()` — on first activation it **`await this._orientation.patchIfNeeded()`** (`:246`), then sets the box to `defaultBBox || this._orientation.calculateFittedBoundingBox() || this._calculateTotalBoundingBox()` (`:249-254`). So the **oriented/fitted box takes precedence** over the plain world-AABB fallback (`_calculateTotalBoundingBox`, `:290-301`).
3. **Forge's own default.** Forge's `Autodesk.Section` reads `model.getData().refPointTransform` **once at construction** (`getDefaultTransform()`), decomposing only its rotation. If `applyRefPoint` is off or `refPointTransform` has no rotation, SectionTool's `_transform` is **identity → world-axis-aligned box** (this is "how it was before"). Documented in `components/section-tool/section-tool-orientation/section-tool-orientation.md` (§"Why this exists").
4. **Our override — `SectionToolOrientation`** (`section-tool-orientation/section-tool-orientation.ts`):
   - `_doPatch()` (`:88-129`): decompose `refPointTransform` → `existingRotZ` (`:98-102`); collect visible-fragment XY corners → `minAreaRect(footprint)` (`:104-106`); `tightness = rect.area / worldAabbArea` (`:108-109`).
   - **Fires only if `shouldApplyOrientationPatch({existingRotZ, tightness})`** (`:110`) — i.e. `|existingRotZ folded to nearest axis| < 5°` **AND** `tightness < 0.9` (`section-tool-orientation-math.ts:141-152`, thresholds `:7,12`).
   - When it fires: `refPointTransform.makeRotationZ(rect.angle)` (`:115`, **mutates Forge-internal data**), then **unload + await reload** of `Autodesk.Section` (`:117-123`) so SectionTool re-reads the mutated transform, and `calculateFittedBoundingBox()` (`:73-86`) returns a **rotated, per-fragment-fitted** box carrying `.transform = makeRotationZ(theta)`.
   - Net effect: on a qualifying model the box is **rotated to the building's footprint orientation** — the "new style" the customer is describing. On a non-qualifying model the patch returns early and Forge's axis-aligned default stands.

### Where Ilia's "True North" hypothesis is right, and where the code differs
Ilia's instinct — *the misalignment is tied to the model's rotation / True North* — is **directionally correct**: the whole feature exists to compensate for building rotation, and the doc's own explanation is *"the Revit author baked the building's rotation into geometry instead of into the project base point / shared coordinates."* **But the section tool does NOT read our DB True-North field.** Two distinct rotation quantities:

- **Forge `refPointTransform`** — the only rotation the section tool consumes (via `getDefaultTransform` + our patch). Confirmed wired: `dashboard/viewer-and-model.md:67` ("The section tool reads this transform to orient cutting planes").
- **DB `angleToTrueNorth`** (project survey / V2 `basePoint.trueNorthAngle`) — a real field, but it feeds **only the ViewerPage coordinate helpers**, never the section tool: `services/coordinate/utils/unified-coordinate-transforms.ts:45-47,118-120`, `get-original-position.ts:21,48`, `get-transformed-position.ts:23,33`, `utils/ProjectBasePointCache.ts:49`, `utils/helpers.ts:139-242`. The orientation doc calls this out explicitly as a **verified do-not-retry pitfall**: *"Don't update our DB `angleToTrueNorth` to fix this. That field is wired only to our own coordinate helpers and never reaches Forge's `refPointTransform`."*

So the True-North *angle value* the customer reported is **useful evidence** (it tells us the building's rotation and whether it's consistent across exports), but the **decisive lever is `refPointTransform`'s rotation + the footprint tightness ratio**, which the debug snippet reads directly. Note also that models are loaded with **`ignoreTrueNorthAngle: true`** (`store/slices/projectModels/projectModelsActions.ts:67,189`) — a secondary thread worth checking, as it bears on whether any rotation ends up in `refPointTransform` at all.

### Precedent — this exact patch has already caused a "box tilted / misaligned" regression
`section-tool-orientation.md` (§Verified cases) records **PLT-2756 / SWITCH-ATL07**: the orientation patch **mis-fired** on a building that runs along world Y, tilting a correct box ~3°. The current `tightness < 0.9` ratio *replaced* the older "angle + anisotropy" thresholds specifically because they over-fired there. **FAR01/FAR02 is plausibly the same failure class on different geometry** — the ratio still mis-firing (or firing correctly but producing a box the user dislikes).

---

## Two hypotheses, weighed (they are NOT mutually exclusive)

**H1 — True-North / geometry-orientation data (Ilia's).** FAR01/FAR02 were authored with the building's True-North rotation **baked into geometry**, so `refPointTransform` has ~0 rotation but the footprint is diagonal → the orientation patch fires → box rotated. *Support:* the feature exists precisely for this; the customer's True-North screenshots (if nonzero) fit. *Gap:* unconfirmed that the patch actually fires on FAR (need `existingRotZ`/`tightness`), and this alone does **not** explain "why 07-14" (the data didn't change).

**H2 — Code/deploy regression.** A **release reaching FAR01/FAR02 prod ~07-14** turned on (or changed) the section-box behavior — the `SectionToolOrientation` "new style." *Support:* this is the *only* hypothesis that explains the customer's decisive facts — **model not updated, sudden onset 07-14, all models / both projects / other projects too.** A data cause cannot appear simultaneously across many un-updated models. *Gap:* I can't date the rollout from the shallow clone (feature predates the window; unmodified within it) — needs release/ops correlation.

**Leading position: BOTH, and they compose.** The **mechanism** is H1 (the orientation patch rotating the box because of the building's baked-in rotation); the **trigger** is H2 (that mechanism became active on FAR prod ~07-14 via a deploy/rollout). This is exactly the playbook's "a code change removed/added a normalization step that interacts with a per-model rotation." The customer's phrase **"the new style"** is itself strong evidence a behavioral change shipped. Neither piece is confirmed against FAR yet; one DevTools session confirms H1, one release-timeline check confirms H2.

---

## Bug vs feature-gap

This is a **behavioral regression from the user's standpoint**, but whether it is a *defect* or *working-as-designed-but-unwanted* is unresolved until the patch is shown to fire on FAR:
- If the patch **fires and rotates correctly** (tight diagonal footprint): the "new style" is *intended* — the fix is product/UX (offer axis-aligned mode, or a per-project opt-out), not a pure bug.
- If the patch **mis-fires** (fires on geometry it shouldn't, or picks a wrong `rect.angle` on an L-shaped/sprawling site): it is a **genuine bug** in the same class as PLT-2756 — tune the `tightness`/mismatch thresholds or exclude the footprint shape.
Either way the customer's ask ("change it back to how it was before") maps to **restoring the axis-aligned box** on these projects.

---

## Domain slug — why `viewer-and-model`

The entire mechanism lives in the ViewerPage 3D-viewer section tool (`components/section-tool/*`, `viewer-x` viewer-service) and turns on Forge `refPointTransform` / model orientation — squarely `dashboard/viewer-and-model.md` territory (which already documents refPointTransform and the section tool at `:67`). Sibling PLT-2874 used the same slug for viewer/model-count work. The Jira "Dashboard" software-area tag is metadata noise — the feature is ViewerPage-only.

---

## Confidence (per `xyz-platform-context/CLAUDE.md` scale)

- **Mechanism identified in code** (section box orientation = Forge `refPointTransform` + our `SectionToolOrientation` patch; DB True-North not consumed by the tool): **8/10** — read directly from source + the feature's own design doc + tests.
- **That the orientation patch is the operative cause on FAR01/FAR02 specifically:** **6/10** — fits the symptom, the "new style" wording, and prior art (PLT-2756), but **not yet confirmed** that the patch fires on FAR geometry (need `existingRotZ`/`tightness`); can't view the screenshots.
- **That the trigger is a ~07-14 deploy/rollout (H2):** **6/10** — the customer's "model not updated + sudden + broad" facts point hard at a deploy, but the rollout date is unconfirmed (shallow clone; needs release/ops).
- **Overall triage confidence: ~6-7/10.** Direction is clear and code-backed; two in-house checks (one DevTools diff + one release-timeline correlation) close it. Neither needs the customer.

---

## NEEDS HUMAN

- ⚠️ **THE decisive missing artifact — already in our hands, unanalysed for ~2 days:** the **two True-North screenshots** the customer attached on **2026-07-20** (comment 6). They are binary Atlassian media I **cannot open**. Someone must read them and record the **actual True-North angle value for FAR01 and for FAR02**, and whether it is consistent across all exported files (Ilia's own question). This is the single most decisive piece and it is sitting untouched.
- ⚠️ **Run the DevTools debug snippet** from `section-tool-orientation.md` (§"Debug snippet") against the **FAR01 and FAR02** federated models (model file shared 07-16). It prints `existingRotZ`, `angleDeg`, `tightness` — i.e. **whether `shouldApplyOrientationPatch` fires** (`< 5°` and `tightness < 0.9`). This is the broken-vs-working diff and confirms/kills H1 in ~10 min. Needs a dev with the model loaded.
- ⚠️ **Release/ops:** correlate what shipped to FAR01/FAR02 **production around 2026-07-14 08:00 CT** — did the `SectionToolOrientation` feature (or a Forge-viewer-library bump) roll out then? Confirms/kills H2. I could not date it (shallow clone; feature predates the 06-24→07-21 window and is unmodified within it).
- ⚠️ **`section_box.png`** (description attachment) — the customer's screenshot of the misaligned box; unviewable here. Confirms the exact visual ("rotated box" vs "no box drawn at all").
- ⚠️ Secondary: check the effect of **`ignoreTrueNorthAngle: true`** at model load (`projectModelsActions.ts:67,189`) on what rotation ends up in `refPointTransform` — bears on why the patch does/doesn't fire.

---

## Doc / knowledge-base refs

- **`hc-frontend/.../section-tool/section-tool-orientation/section-tool-orientation.md`** — the authoritative design doc: mechanism, thresholds, **verified cases table (incl. PLT-2756 regression)**, the **DevTools debug snippet**, and the pitfall "don't touch DB `angleToTrueNorth`." Read this first.
- `section-tool-orientation-math.ts:141-152` (`shouldApplyOrientationPatch`) + `.test.ts:124-166` — exact firing conditions and the SWITCH-ATL07/API2 cases encoded as tests.
- `dashboard/viewer-and-model.md:62-67` — `applyRefPoint` / `refPointTransform`, and the explicit note that the section tool reads this transform. **Doc gap:** it does not yet mention the `SectionToolOrientation` override or the True-North interaction — add a pitfall entry once confirmed (not edited here per task scope).
- `incidents/live-incident-playbook.md` — tone/pattern for the drafted reply; the "why now needs an owner" and "state-now ≠ state-then" disciplines apply directly.

## Roster / ownership notes

- **Ilia Kuzmin** (ilia.kuzmin@xyzreality.com) — investigation lead; playbook "mechanism interrogator." His True-North hypothesis is directionally right; the code refinement (refPointTransform + patch, not DB field) is above. **The next move is his** (analyse the 07-20 data + run the snippet).
- **Yash Patel** (reporter/coordinator) — owns the client channel; relayed the True-North data. Nothing further needed *from* him or the client right now.
- Likely next hops once confirmed: **product/UX** (if patch is working-as-designed → axis-aligned toggle / opt-out) and/or the **section-tool owner** (if patch mis-fires → threshold fix, PLT-2756 sibling). Release/ops for the 07-14 rollout correlation.
