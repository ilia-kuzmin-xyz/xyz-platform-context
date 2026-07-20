# PLT-2906 — "Section box misaligned form [from] model"

- **Domain slug:** viewer-and-model (justification in §7)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2906
- **Type:** Live Incident · **Priority:** Major · **Status:** Open (group A)
- **Reporter / Assignee (Jira):** Yash Patel (support/coordinator) — relaying a **client** Freshdesk ticket (#7424)
- **Investigating engineer:** Ilia Kuzmin (FE)
- **Project / model:** **FAR01** (client-reported), also **FAR02**, "possibly other projects too" (all models, per customer)
- **Created:** 2026-07-15 · **Comments:** 14 (last substantive 2026-07-17 14:42) · **Attachments:** 1 PNG (`section_box.png`, see §8 Needs human)
- Triage date: 2026-07-20

---

## 0. Live state as of triage (comment thread verified against Jira)

Verified live — matches the briefed thread, **no new substantive comment after 07-17 14:42**:

- **07-15 14:05** Yash — relays report, asks Ilia if he needs the model file.
- **07-15 14:54** Yash — customer answers to clarifying questions (the load-bearing ones):
  - affects **all models** in the project, **both FAR01 and FAR02**, "also appears to be affecting some other projects as well";
  - first noticed **2026-07-14 ~08:00 Central**; issue "started recently";
  - **model was NOT updated** prior to noticing the difference.
- **07-15 15:49** Ilia — "yes, please" (wants the model file).
- **07-16 08:46** Yash — shares SharePoint model link.
- **07-17 14:42** Ilia (latest substantive) — suspects the models' **True North angle**; asks Yash to have the delivery/BIM team check the True North angle in Revit for FAR01/FAR02 and report the actual value(s) and whether it's consistent across all exported files.
- After that: only Freshdesk status pings (07-17 14:52 "Waiting on customer" → 17:54 "Open"). **Ball is with the customer/BIM team; no True North data returned yet.**

The description field also carries the verbatim client text ("when the Section Box is turned on, it no longer aligns the way it used to … doesn't display the rectangular box, which makes it difficult to adjust and section the model. Is it possible to change the Section Box back to how it was before?"). (An unrelated custom field `customfield_10060` literally contains the string "Test" — noise, ignore.)

## 1. What is observed — and can we observe it? (playbook Q1)

Reported: on the **ViewerPage** (editor 3D viewer), turning **Section Box on** now produces a box that (a) "no longer aligns the way it used to" and (b) "doesn't display the rectangular box", making it hard to adjust/section. i.e. the box the customer previously used — an **axis-aligned rectangular box** — has been replaced by a differently-oriented/fitted box.

I **could not observe this myself** (no runtime/env access, and the single screenshot `section_box.png` is binary behind Atlassian auth — §8). This is a code-and-docs diagnosis. The core facts (surface = section box, direction = "lost the rectangular box", cohort = all models/multiple projects, date = 07-14) are in text, so triage is not blocked on the image — but the image is the fastest confirmation of *which* visual state the box is now in (rotated-but-still-a-box vs degenerate/missing gizmo).

## 2. What did we expect — and on whose authority? (playbook Q2)

The reference is the customer's memory: *"the way it used to … change the Section Box back to how it was before."* Per the playbook's **"worked-before is a claim to date with evidence"** rule, this is currently **undated folklore** — there is no dated known-good screenshot, no build number, no "it looked like X on date Y". The "old" behaviour is almost certainly **Forge's default world-axis-aligned section box** (SectionTool's `getDefaultTransform()` returns identity when `refPointTransform` carries no rotation — see §4). That is a reasonable inference, **not** a confirmed reference. Flag: obtain a **dated** old-vs-new screenshot before treating "how it was before" as ground truth.

## 3. Smallest broken-vs-working pair (playbook Q3)

The customer says it affects **all** models across FAR01/FAR02 and possibly others, so there is likely **no working pair inside this account right now** — everything is on the new behaviour. Two viable pairs to construct:

- **Temporal pair (best):** an **older, dated known-good screenshot** of the FAR01 section box vs the current one. This is the diff that dates the regression (see §8 needs-human).
- **Cohort pair:** a project the customer says is **unaffected** (if any exists) vs FAR01 — diff their footprint geometry / `refPointTransform` rotation.
- **In-code pair (already documented):** the orientation service's own verified cases — **SWITCH-ATL08 (patched, oriented box)** vs **SWITCH-ATL07 (skipped, stayed axis-aligned; over-patching here was the PLT-2756 regression)**. This is the exact broken/working boundary the mechanism turns on (§4).

## 4. Mechanism — what decides section-box alignment (playbook Q4)

**Section-box orientation is NOT a plain Forge extension configured client-side, and it is NOT driven by our DB True North field. It is decided by our own heuristic service `SectionToolOrientation`.** Full trace:

- **Entry point:** `section-tool-service.ts:241 _activateBoxSectionTool()` calls `await this._orientation.patchIfNeeded()` **on every first box-section activation** (`:246`), then applies `this._orientation.calculateFittedBoundingBox() || this._calculateTotalBoundingBox()` (`:251-252`).
- **The heuristic:** `section-tool-orientation.ts:88 _doPatch()`:
  1. Reads `model.getData().refPointTransform`, decomposes its Z-rotation `existingRotZ` (`:101-102`).
  2. Builds the building **footprint** from visible-fragment world-AABB corners and computes the **minimum-area enclosing rectangle** (`minAreaRect`, rotating calipers) → orientation `rect.angle` + `rect.area` (`:104-107`).
  3. `tightness = rect.area / worldAabbArea` (`:108-109`).
  4. **Fires the patch only if** `shouldApplyOrientationPatch({existingRotZ, tightness})` — i.e. `|existingRotZ|` folded to nearest axis `< 5°` **AND** `tightness < 0.9` (`section-tool-orientation-math.ts:141-152`, thresholds `ORIENTATION_MISMATCH_THRESHOLD_RAD`, `MIN_RECT_TIGHTNESS_RATIO`).
  5. When it fires: `refPointTransform.makeRotationZ(rect.angle)` **mutates Forge-internal data** (`:115`), then `unloadExtension('Autodesk.Section')` + **await** `loadExtension(...)` so SectionTool re-runs `getDefaultTransform()` against the mutated transform (`:117-123`), and a **fitted, oriented** box (`calculateFittedBoundingBox`, `:73-86`, carries `.transform`) is applied instead of the axis-aligned world AABB.
- **Old behaviour (no patch):** SectionTool's `getDefaultTransform()` is identity → box is **world-axis-aligned** = the "rectangular box" the customer describes.
- **New behaviour (patch fires):** box is **rotated to the building's diagonal** and fitted — a box the customer perceives as "no longer aligned / not the rectangular box / hard to adjust."

So the observed symptom = **the orientation patch now firing (or misfiring) on FAR01/FAR02 where the customer previously got the axis-aligned box.** The design doc (`section-tool-orientation.md`) documents this service as an **unsupported runtime mutation + extension-reload hack**, with a prior async-race misalignment bug and a threshold that was **already re-tuned once** ("This single ratio replaces the earlier angle + anisotropy thresholds, which mis-fired on SWITCH-ATL07 (PLT-2756)") — i.e. this heuristic has a **track record of mis-firing** and is fragile by its authors' own account.

**True North, precisely placed:**
- Our DB field **`angleToTrueNorth` does NOT feed the section box.** Verified: it appears only in coordinate helpers `get-transformed-position.ts:23/33`, `get-original-position.ts:21/48`, `unified-coordinate-transforms.ts:45/47/118/120` (survey/base-point coordinate conversion). Within the whole `section-tool/` tree the token appears **only in the .md pitfall** that says *"Don't update our DB `angleToTrueNorth` to fix this — that field … never reaches Forge's `refPointTransform`."*
- What Ilia is really chasing via the BIM team is the **Revit source True North / building rotation**, which determines whether `refPointTransform` carries rotation (`existingRotZ`) — and that is exactly the input the heuristic branches on. So the True North ask is a sensible **precondition** probe (does the geometry have rotation baked in vs in shared coords?), **but it is not itself the code path**, and it is not the layer where a 07-14 change could have originated (§5).

## 5. Why now? (playbook Q5) — this is a regression on OUR side

The customer **explicitly ruled out a model update**, and the change appeared suddenly on **2026-07-14 across all models / multiple projects**. True North is a **static property of the model**: if no model was re-exported, the True North angle did **not** change on 07-14 — therefore **True North cannot be the trigger**, only a standing precondition. The only thing that can flip section-box behaviour for *every* model at once, with no data change, is **our code/config** — specifically the `SectionToolOrientation` heuristic (its presence, a threshold change to `MIN_RECT_TIGHTNESS_RATIO`/`ORIENTATION_MISMATCH_THRESHOLD_RAD`, or the fitted-box path) shipping/enabling in a release around 07-14. This is a **global FE regression**, not a per-project data issue.

- I **cannot pin the deploy date** from this checkout: the repo is a squashed 50-commit snapshot; `section-tool-orientation.*` all appear in one 2026-06-22 batch commit (`faecfcd`, PLT-2817) and haven't been touched since in-tree — so git here shows the service is *recent* (mid-2026) but gives **no reliable prod-deploy date**. Correlating the FAR01/FAR02 07-14 onset to an actual release is a **NEEDS HUMAN** step (§8).
- Per the playbook: an unowned "why now" is an open incident wearing a closed label. The why-now owner here is **our release timeline**, not the BIM team.

## 6. Who else? (playbook Q6 — cohort)

Customer already reports **FAR01 + FAR02 + "possibly other projects."** This matches a **broad regression** driven by a global heuristic, exactly as §5 predicts. Once the mechanism is confirmed, the sweep is *every project whose federated model has a diagonal footprint with no rotation in `refPointTransform`* — i.e. everyone the `shouldApplyOrientationPatch` predicate now returns true for. Do **not** treat this as FAR01-only.

## 7. Domain slug justification — viewer-and-model

The symptom, the deciding code (`section-tool/`, `SectionToolOrientation`, `refPointTransform` mutation, Forge Section extension) and the KB home (`dashboard/viewer-and-model.md` §"applyRefPoint" notes "The section tool reads this transform to orient cutting planes") are all squarely 3D-viewer/model-placement. Not data-pipeline (no parquet/count involvement), not access. → **viewer-and-model.**

## 8. Hypothesis, confidence & NEEDS HUMAN

**Hypothesis (high confidence on mechanism, moderate on exact variant):** This is a **regression in our `SectionToolOrientation` heuristic**, not a customer-data problem. Previously the section box was Forge's world-axis-aligned rectangle; a change on our side (~07-14) now makes the auto-orientation patch fire (or misfire) on FAR01/FAR02's geometry, replacing the familiar rectangular box with a rotated/fitted one that the customer finds unusable. True North is relevant only as the **precondition** the heuristic reads (via `refPointTransform`), and — because the model wasn't re-exported — **cannot be the trigger**; our code is. Whether the fix is "the patch shouldn't fire for these projects" (threshold over-firing, à la PLT-2756) vs "the patch fires correctly but the fitted/rotated box is itself the regression the customer is rejecting" needs the screenshot + an in-app repro to separate.

**Confidence: 7/10** (per `xyz-platform-context/CLAUDE.md`: high confidence, minor unknowns — review recommended). Mechanism is traced end-to-end in code; the regression-on-our-side conclusion is strongly supported by the customer's "no model update" + broad cohort + sudden date. Downgraded from higher because (i) I cannot observe FAR01 or view the screenshot, (ii) I cannot pin the deploy date, and (iii) I cannot distinguish over-firing vs fitted-box-rejected without a repro.

**NEEDS HUMAN:**
- ⚠️ **Attachment `section_box.png`** (149 KB, by Yash, on the ticket) — binary behind Atlassian auth (`.../attachment/content/60808`); **I cannot view it. Do not guess its contents.** It is the single fastest confirmation of the current box's visual state (rotated-but-rectangular vs degenerate/no gizmo) and thus which regression variant applies.
- ⚠️ **Deploy-date correlation (the why-now owner):** confirm whether `SectionToolOrientation` (or a change to `MIN_RECT_TIGHTNESS_RATIO` / `ORIENTATION_MISMATCH_THRESHOLD_RAD` / the fitted-box path) shipped to prod in the release covering **~2026-07-14**. Not determinable from this squashed checkout — needs release/deploy history.
- ⚠️ **In-app repro on FAR01/FAR02** (env access): run the DevTools debug snippet in `section-tool-orientation.md` §"Debug snippet" to read `existingRotZ`, `angleDeg`, `tightness`. If `|existingRotZ| < 5°` and `tightness < 0.9`, the patch is firing — confirming the mechanism and letting the fix be scoped (adjust threshold / add a per-project opt-out / revert to axis-aligned default).
- ⚠️ **Dated old-vs-new screenshot** to convert "how it was before" from folklore (§2) into a real reference.
- BIM-team **True North values** (Ilia's pending ask) — useful as the precondition check, but note it will **not** answer why-now.
