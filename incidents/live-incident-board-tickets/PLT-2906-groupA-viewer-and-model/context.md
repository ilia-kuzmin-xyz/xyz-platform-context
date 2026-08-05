# PLT-2906 — "Section box misaligned from model" — triage context

- **Domain slug:** `viewer-and-model` (justified in §Domain slug)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2906
- **Type:** Live Incident · **Priority:** Major · **Status:** **Open**
- **Assignee:** Yash Patel (support) — **investigation lead is Ilia Kuzmin** per comments · **Reporter (Jira):** Yash Patel
- **Project:** FAR01 (also affects FAR02 per follow-up; customer says "some other projects as well") · **Software Area (metadata):** Dashboard — but this is a **3D-viewer / ViewerPage** feature, not the dashboard.
- **Created:** 2026-07-15 · **Last updated:** 2026-07-20
- **Attachments:** `section_box.png` (description); 2 × True-North screenshots in comment 6 (2026-07-20) — **all unviewable here, see NEEDS HUMAN**
- **Triage date:** 2026-07-22

> 🔴 **READ §2026-08-04 FIRST — the header above and the ⚠️ banner below are both stale.**
> Live status is **Open** (reverted from Done on 08-03 16:26), assignee is **Ilia Kuzmin**,
> `updated` is **2026-08-03T16:26:27+0100**, Fix Version **26.3.4**. Root cause is
> **CONFIRMED**, the fix is **written** (PR
> [#2069](https://github.com/XYZReality/hc-frontend/pull/2069)) — and **not merged**, 11 days
> open with zero human review approvals. The "stalled on our unanalysed screenshots" framing
> below was true only up to 07-24 ~14:50 and is fully superseded.

> ⚠️ *(historical, superseded 2026-07-24)* **This ticket is not fresh and it is not parked on the client.** It is mid-investigation and **the ball is on OUR side.** The customer answered Ilia's True-North question on **2026-07-20**; as of 2026-07-22 that answer sat **unanalysed** and no one had replied. **2026-07-24 re-check: still true, no new comments — now ~4 days stalled on Ilia's own follow-through**, not the customer. This is the same shape as PLT-2649 in this same run (a customer/team answer sitting on our side, unactioned) — worth noticing as a pattern across this run, not just this ticket. (See §NEEDS HUMAN and `recommended-action.md`.)

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

---

## Closed/moved since 07-22 (checked 2026-07-28)

**Status now: "In Code Review"** (was "Open" at 07-22 triage) — this is why the ticket dropped out of the current in-scope JQL (which excludes `In Code Review`).

**Yes — Ilia did analyse the screenshots, and it did NOT just get parked.** Comment 2026-07-24 14:57 (Ilia):
> "thanks for the screenshots. I think the customer doesn't need to change anything in revit. The True North angles (FAR01 272.29, FAR02 177.71) are correct and intentional. The bug is on our side: the section box logic treats such a small angle (2.3 degrees) as 'no rotation' and replaces the correct orientation with its own estimate, which on FAR01 is about 18 degrees off... It also explains why only some projects are affected: projects with True North = 0 are fine."

This confirms this triage's H1/mechanism read almost exactly: `shouldApplyOrientationPatch`'s `|existingRotZ| < 5°` fold is mis-triggering on FAR01/FAR02's small-but-real True North angles (2.3° folded), then substituting the patch's own footprint-fitted rotation instead of leaving the correct near-zero rotation alone — a genuine **bug** (mis-fire), not working-as-designed. Yash acknowledged same day ("Thanks for looking into this. It makes sense now.", 07-24 15:35).

Status then moved straight from Open → **In Code Review** (last Jira update 2026-07-24 16:14; no intermediate "Ready For Development" comment visible, and no comment describing the actual code fix/PR — the status transition itself is the only evidence a fix was written). No further comments after 07-24.

**Verdict: genuinely resolved on the "our side" question — Ilia did his follow-through, root cause confirmed and matches this doc's hypothesis, and a fix appears to have been coded (status = In Code Review, not just relabelled to a support/waiting status).** The one gap: no comment states what the fix actually does (threshold tune vs. exclude-condition vs. something else) or links a PR — can't confirm from Jira alone whether the fix addresses the general `tightness`/`existingRotZ` threshold class (protecting future PLT-2756-style regressions) or is a narrow FAR01/FAR02 patch. Worth a quick PR-diff check before assuming full closure of the mechanism, not just this instance.

---

# 2026-08-04 — full re-investigation (ticket had been out of every run table since 07-24)

**Why a full pass:** PLT-2906 appears in the 07-22 and 07-24 run tables and then in neither the
07-30 nor the 08-03 run table, with no line anywhere in `../README.md` explaining the exit. This
pass re-derived everything from the live Jira issue, its **changelog**, GitHub, and the code.

## Live ticket state (VERIFIED — `getJiraIssue` + `expand=changelog`, 2026-08-04)

| Field | Value |
|---|---|
| Status | **Open** |
| `updated` | **2026-08-03T16:26:27+0100** |
| Assignee | **Ilia Kuzmin** (was Yash Patel until 07-24 14:53) |
| Priority / Type | Major · Live Incident |
| Fix Version | **26.3.4** (set by Ilia 07-31 15:25) |
| Story Points | 2 (set 07-24 14:54) |
| Comments | 26 · Attachments | 4 |
| Freshdesk | #7424 — **Closed** 08-03 16:21, then flipped back to *Waiting on customer* 08-03 16:25 |

### Status history (VERIFIED, from the changelog — this is the crux of the "drop")

| When | Transition | By |
|---|---|---|
| 07-15 14:02 | created **Open**, assigned Darminder Atker | Pietro Desiato |
| 07-16 14:41 | Open → **In Analysis** | Ilia |
| 07-17 14:42 | In Analysis → **With Technical Support**; assignee → Yash | Ilia |
| 07-17 14:52 | With Technical Support → **With Customer** | Yash |
| 07-17 17:54 | With Customer → **Open** | Automation for Jira |
| 07-24 14:53:18 | Open → **Dev In Progress** | Ilia |
| 07-24 14:53:22 | Dev In Progress → **In Code Review** | Ilia |
| 07-24 14:53:28 | assignee Yash → **Ilia** | Ilia |
| 07-31 15:25 | Fix Version → **26.3.4** | Ilia |
| 08-03 16:21:09 | In Code Review → **Done** (auto, on the Freshdesk close) | Automation for Jira |
| 08-03 16:26:27 | Done → **Open** (manual revert) | Yash |

## Why it left the run tables — a real process failure, but NOT the PLT-2909 failure mode

**The duplicate-folder hypothesis is FALSIFIED. Do not carry it forward.** (All VERIFIED.)

1. **There is, and has only ever been, one `PLT-2906*` folder** —
   `PLT-2906-groupA-viewer-and-model/`, added by `df94504` (07-22), never duplicated on any
   branch (`git log --all --name-only | grep 2906` returns four paths, all inside that one
   folder). So the PLT-2909 3-way-duplication mechanism cannot apply here.
2. **The exit was legitimate, not silent-at-the-JQL-level.** From **07-24 14:53 to 08-03 16:21**
   the status was **In Code Review**, which `../README.md` § Scope rules lists as **excluded**.
   The 07-30 run (commit `862d276`, 07-30 09:02 UTC) and the 08-03 run (commit `ce9b1dc`, 08-03
   07:13 UTC) both ran while the ticket was In Code Review, so both were *correct* to leave it
   out of Group A. The 08-03 run finished ~9 hours **before** Yash flipped it back to Open.
3. **The actual failure: the exit was never written down at run level.** Neither run's section in
   `../README.md` contains a line saying "PLT-2906 left scope → In Code Review". The transition
   *was* recorded — but only inside this file, in §"Closed/moved since 07-22 (checked 2026-07-28)",
   written by an out-of-band 07-28 session. That note was on an **unmerged branch until 07-31**
   (`08bff08`'s lineage first reached `main` via PR #4 merge `408f9b7`, 07-31 16:57 +0300), so the
   07-30 run could not have read it, and the 08-03 run did not open the folder. Net effect: a Major
   live incident with a customer promise attached became invisible to the routine's own index for
   10 days, and nobody noticed the fix had stopped moving.
4. **Corollary — the 08-03 run's stated cause for PLT-2909's 07-30 disappearance is wrong.**
   `../README.md` § 2026-08-03 attributes it to the three duplicate PLT-2909 folders. But
   `PLT-2909-groupA-data-pipeline/` and `PLT-2909-groupA-viewer-and-model/` were **created by
   `862d276` — the 07-30 run's own consolidation commit** (`git log --all --diff-filter=A` on each
   path). At 07-30 run start (`103b6f1^1`) `main` held exactly one PLT-2909 folder. The duplicates
   are a *product* of that run, not a cause of anything that preceded it. Same for the stale
   root-level `live-incident-board-tickets/` the 08-03 run removed — also created by `862d276`.
   **Whatever dropped PLT-2909 from the 07-30 table, it was not duplicate folders; re-check it.**

**Named plainly:** *the routine tracks tickets by table rows but has no rule that a ticket leaving
scope must be logged in the run table.* Combined with per-ticket notes living on unmerged branches
(the exact hazard the repo's own `CLAUDE.md` is written about), a ticket can exit on a legitimate
status change and simply never be looked at again — even when it re-enters scope, as this one did
on 08-03. **Fix candidate (for whoever owns the routine):** every run table gets an explicit
"left scope this run" row naming the status that removed it, and the next run re-queries *without*
the status filter once to catch returnees.

## Root cause — now CONFIRMED, not inferred

The 07-22 pass's mechanism was right in shape and wrong in one detail. Corrected:

**VERIFIED** (live diagnostic by Ilia on FAR01, transcribed in the PR body and reproduced by
reading the code):
- FAR01 `refPointTransform` decomposes to **rotZ 87.7086°** (Revit *Angle to True North*
  **272.2914°**); FAR02 TN **177.71°**. Both **fold to ±2.29°** off the nearest world axis via
  `angleFromNearestAxis` — a **real surveyed site bearing**, consistent across the two files, and
  intentional. The customer has nothing to change in Revit.
- `ORIENTATION_MISMATCH_THRESHOLD_RAD` is **5°** (`section-tool-orientation-math.ts:7`), and
  `shouldApplyOrientationPatch` (`:141-152`) treats anything under it as "effectively no
  rotation". 2.29° < 5° → **the guard meant to defer to authoritative Revit shared coordinates
  did not protect these projects.**
- FAR01 footprint **`tightness = 0.8806`**, just under the `MIN_RECT_TIGHTNESS_RATIO = 0.9`
  trigger (`:12`) → the patch **fires**.
- It then overwrites the correct transform with the compound-footprint `minAreaRect` estimate
  **−20.46°** — **~18° wrong** — applied to the entire federated `Navis` model
  (`section-tool-orientation.ts:110-115`). **That is the misaligned "new style" box.**
- The borderline 0.88-vs-0.90 tightness also explains the **intermittency** across
  projects/sessions, and TN = 0 projects are untouched (patch fires but the estimate is right).
- Second, independent defect found in the same path: `refPointTransform.makeRotationZ(rect.angle)`
  (`section-tool-orientation.ts:115`) **resets the whole matrix**, wiping the shared-coordinates
  translation *and* scale for every later reader of that model's `refPointTransform`.

**Correction to the 07-22 note:** the 07-22 row in `../README.md` reads *"rotating the box to the
building footprint via Forge's `refPointTransform` (not our `angleToTrueNorth`)"*. Accurate as far
as it goes, but the operative fault is **not** "we ignore True North" — it is that the model's real
True-North bearing *does* reach `refPointTransform`, and our own 5° dead-band **discards it**. The
07-22 pitfall "don't touch DB `angleToTrueNorth`" still stands and is still the right warning.

**Also corrected: PLT-2756 is not the regression that caused this.** VERIFIED from GitHub:
`SectionToolOrientation` was introduced by **PR #1871 / PLT-2651** (merged 2026-05-08, PCA-based),
and **PR #1933 / PLT-2756** (merged 2026-06-05) replaced PCA with the min-area-rect + tightness
ratio. Both long predate the 07-14 onset. The **07-14 trigger is therefore a rollout/release
correlation, still UNVERIFIED** — no commit touching this feature exists between 06-05 and today.
Per the PR body this is the **4th** incident on the feature: PLT-2651 → PLT-2756 → PLT-2771 →
PLT-2906.

## The fix — written, CI-green, and NOT MERGED (this is the live risk)

**PR [#2069](https://github.com/XYZReality/hc-frontend/pull/2069)** — *"PLT-2906: don't let the
section-box orientation patch override a real True-North bearing"*, by Ilia. All VERIFIED via the
GitHub API on 2026-08-04:

| | |
|---|---|
| Created | **2026-07-24T13:20:21Z** (≈37 min *before* the RCA comment on the ticket) |
| State | **open**, not merged, not draft · `mergeable_state: "blocked"` |
| Head / base | `PLT-2906-section-box-true-north` @ `e0fe469` → `master` |
| Size | 4 files, **+50 / −7**, 7 commits |
| Reviewers requested | TomMasdinXYZ, DarminderA, rishib-xyz, SergiuszXYZ — **11 days, none has reviewed** |
| Reviews present | Copilot bot (COMMENTED, 07-24) + **Ilia's own** self-review (COMMENTED, 07-24). **Zero human approvals.** |
| CI (head commit) | **all green** — `build` ×2 success, `SonarCloud Code Analysis` success, all completed 2026-08-03 17:17–17:34Z |

Contents of the fix (read from the diff):
1. `ORIENTATION_MISMATCH_THRESHOLD_RAD` **5° → 0.5°** — the threshold's job is to absorb
   `decompose()` float noise on a true-zero rotation, not to swallow surveyed bearings.
2. `makeRotationZ` → **`compose(pos, quatZ(angle), scale)`** — preserves translation/scale
   (defect 2 above). THREE read lazily at call time, since it is a Forge viewer global.
3. Tests pinning **FAR01** (rotZ 87.7086°, tightness 0.8806 → must NOT patch) and **FAR02**, plus
   float-noise cases (≈0, ≈−90°) that must still patch. Pre-existing ATL07/ATL08/API2 expectations
   unchanged.
4. `section-tool-orientation.md` updated: new threshold, FAR01 row in the verified-cases table,
   compose rationale.

The PR's own author-declared caveat: **jest could not be run in the authoring environment**
(`npm ci` blocked by the private `@xyzreality/dhtmlx-gantt` registry) — the decision matrix was
executed against esbuild-transpiled source (11/11). CI has since gone green on the head commit,
which substantially closes that gap but is not the same as a reviewer confirming the suite.

Two items the PR explicitly defers to follow-up on this ticket:
- The gate/footprint is computed from **`getVisibleModels()[0]` only** — load-order-dependent on
  multi-model sessions (`section-tool-orientation.ts:93,104`).
- The compound-footprint min-area-rect estimate is **unreliable on multi-building/site
  footprints** (it produced the −20.46° here); an agreement-check against the existing rotation is
  worth adding if the workaround is ever extended.

**`master` does not contain the fix.** VERIFIED: the working checkout of `hc-frontend`
(`master` @ `28e03c3`, 07-31) still has `ORIENTATION_MISMATCH_THRESHOLD_RAD = 5°` and
`refPointTransform.makeRotationZ(rect.angle)`. **Production is still broken for FAR01/FAR02.**

## ⚠️ The gap that needs a human — a customer-facing promise resting on an unmerged PR

Sequence, all VERIFIED:
- **07-31 12:32** Yash: *"Any update on this?"*
- **07-31 15:25** Ilia sets Fix Version **26.3.4**.
- **07-31 16:22** Ilia: *"it's been resolved. Planned to be pushed within the 26.3.4 release."*
  \+ a confirmation screenshot.
- **08-03 16:21** Yash **closes Freshdesk #7424**; Jira automation flips the ticket to **Done**.
- **08-03 16:26** Yash flips Jira back to **Open** (Freshdesk back to *Waiting on customer*).

So the customer channel has been told this is fixed and shipping in 26.3.4, and the support ticket
was closed on that basis — while the only code that fixes it sits in an **unapproved PR**. If
26.3.4 is cut from `master` as it stands, it ships **without** the fix and the incident reopens on
a customer who was already told it was done. **This, not the diagnosis, is the open risk.**
No `v26.3.4` tag is visible from this checkout's remote refs (only `v26.3.1`), so whether the
release is already cut is **UNVERIFIED** — and it is the first thing to check.

## Media — still unopenable (all 4 attachments)

| File | Added | Status | What it would settle |
|---|---|---|---|
| `section_box.png` | 07-15 | not viewable | the exact visual; **no longer decisive** |
| `FAR01.png`, `FAR02.png` | 07-20 | not viewable | the True-North values — **now moot**: the exact numbers (272.2914° / 177.71°) are transcribed in the Jira comment *and* pinned as test constants in PR #2069 |
| `Screenshot 2026-07-31 182124.png` | 07-31 | **HTTP 403** on `/attachment/content/61765` (verified this pass) | ⚠️ **the one still-decisive artifact.** This is the image Ilia offered as *"attached screenshot for confirmation"* behind the claim "it's been resolved". Unread, we cannot tell whether it shows a **passing test run**, a **fixed FAR01 viewer on a local build**, or a **deployed environment**. That distinction is exactly the difference between "fix written" and "fix verified", and it is the evidence the customer promise rests on. |

## Confidence (per `xyz-platform-context/CLAUDE.md` scale) — no rounding up

- **Root cause / mechanism:** **9/10** — no longer a hypothesis. Live-measured values, an
  independent code read, and pinned unit tests all agree. Not 10: the numbers are transcribed from
  Ilia's diagnostic, not re-measured this pass (`npm ci` cannot run here).
- **That PR #2069 is the correct and complete fix for *this* incident:** **8/10** — diff read
  line-by-line, both defects addressed, regression cases for ATL07/ATL08 preserved, CI green.
  Not higher: the suite has never been run by a reviewer, and the two deferred hazards
  (`models[0]`, compound-footprint estimate) mean the *feature* is not de-risked, only this case.
- **Why it left the run tables:** **9/10** — changelog timestamps vs run commit timestamps are
  decisive and mutually consistent.
- **That the 08-03 run's duplicate-folder explanation for PLT-2909 is wrong:** **8/10** — the
  folder-creation commit is verified; what *did* drop PLT-2909 is not re-investigated here.
- **07-14 trigger (which rollout):** **4/10** — no code change in window; needs release/ops. Was
  6/10 on 07-22 on a deploy-regression pattern match; **lowered**, because the two candidate
  commits are now dated and both are too early.
- **Overall: 8/10.** The engineering question is answered. What is unresolved is delivery and
  process, not diagnosis.

## NEEDS HUMAN (supersedes the 07-22 list — items 1–3 there are all done)

1. ⚠️ **Get PR #2069 reviewed and merged, or say out loud that 26.3.4 ships without it.** 11 days
   open, CI green, zero human approvals, `mergeable_state: blocked`. Four reviewers were asked on
   07-24. This is a "just post it / just approve it" situation, the same shape as PLT-2858's
   thrice-recommended-never-posted escalation.
2. ⚠️ **Confirm whether 26.3.4 is already cut**, and if so whether #2069 made it. If it is cut
   without the fix, the 07-31 message to Yash and the closed Freshdesk #7424 both need correcting
   *before* the customer notices.
3. ⚠️ **Open `Screenshot 2026-07-31 182124.png`** (403 here) and record whether "resolved" meant
   *tests pass*, *local build verified on FAR01*, or *verified on a deployed env*.
4. **Run the suite:** `npm run jest -- section-tool-orientation` — never executed by a human;
   impossible in this environment.
5. **Release/ops:** still unanswered from 07-22 — what reached FAR01/FAR02 prod ~07-14 08:00 CT,
   given the feature code has been unchanged since 06-05? Post-mortem only, does not block.
6. **Doc debt, now earned:** the `dashboard/pitfalls.md` and `dashboard/viewer-and-model.md`
   entries sketched in `recommended-action.md` §07-16 should land on merge —
   `viewer-and-model.md:62-67` documents `applyRefPoint`/`refPointTransform` and says "the section
   tool reads this transform to orient cutting planes", but still says nothing about the
   `SectionToolOrientation` override, the 4-incident history, or the two thresholds. Verified this
   pass: no mention of `SectionToolOrientation`, True North, or the section box's orientation
   behaviour anywhere in that file.
7. **Routine-level:** apply the "left scope this run" rule from §"Why it left the run tables", and
   re-check what actually dropped PLT-2909 from the 07-30 table.

## Left scope 2026-08-05 — moved In Code Review → Ready For QA

Live JQL fetch (`project = PLT AND issuetype = "Live Incident" ORDER BY created DESC`, unfiltered)
shows status changed to **Ready For QA** (assignee now Gennaro Boccia, QA), `updated`
`2026-08-04T09:27:11+01:00`. This answers two of this file's own open questions from the 08-04 run:

- **PR #2069 did get approved and merged** — the ticket cannot reach Ready For QA otherwise. The
  "11 days open, zero human approvals" risk flagged 08-04 is resolved; exact approval timestamp not
  checked (not available via the issue fields fetched this run).
- Freshdesk #7424 shows one more status flap in-between (`Closed` at 08-03T16:21, then
  `Waiting on customer` at 08-03T16:25) — five seconds apart, almost certainly an automation
  artefact rather than a human re-opening it, but worth a human eyeballing if the customer asks
  about it.

**Still open, not answered by this fetch:** whether 26.3.4 is cut and whether it contains #2069;
whether QA (Gennaro) is testing against the fix or just the original repro; the 07-31 "resolved"
screenshot is still unopened (403). Folder tag left as `groupA` per the PLT-2874 precedent (advanced
past Group A but not yet Done) — revisit when it reaches Done, at which point rename to
`resolved-viewer-and-model` per the PLT-2892 convention.
