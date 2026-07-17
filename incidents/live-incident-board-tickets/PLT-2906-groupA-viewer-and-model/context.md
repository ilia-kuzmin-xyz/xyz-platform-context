# PLT-2906 — "Section box misaligned form model" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2906
- **Issue type:** Live Incident ("To track live incidents on site.")
- **Status:** In Analysis (category: In Progress / yellow)
- **Priority:** Major
- **Project (report form):** FAR01 (customer later says FAR02 + "some other projects" too)
- **Software Area (form):** Dashboard · **Device still usable?:** "Usable"
- **Reporter:** Yash Patel (support/coordinator per roster)
- **Assignee:** Darminder Atker (FE lead)
- **Created / Updated:** 2026-07-15 14:01 / 2026-07-16 14:41 (+0100)
- **Freshdesk:** #7424
- **Domain slug:** `viewer-and-model`
- **Group:** `groupA` (In Analysis → evaluate/clarify)

---

## One-line symptom

On FAR01 (and, per the customer, FAR02 and "some other projects"), turning on the
**Section Box** now behaves differently than before: it "no longer aligns the way it
used to" and — the decisive new phrase — **"doesn't display the rectangular box,"**
making it hard to adjust/section the model. The customer explicitly asks to **revert
to the old behaviour** ("change the Section Box back to how it was before?").

---

## Description (verbatim, trimmed of empty form fields)

> Software Area: Dashboard … Is The Device Still Usable?: Usable, Project: FAR01
> Description: Hi there, when the Section Box is turned on, it no longer aligns the
> way it used to. **The new style isn't very useful because it doesn't display the
> rectangular box, which makes it difficult to adjust and section the model. Is it
> possible to change the Section Box back to how it was before?** … Ticket
> attachments: 1. section_box.png

## Comments (chronological)

1. **Yash, 07-15 14:05** — "user reported that the section box is misaligned from
   model. Have asked user more info. Do you need model file for investigation?"
2. **Yash, 07-15 14:05** — Freshdesk #7424 → Waiting on 3rd line.
3. **Yash, 07-15 14:54** — user answered the four scoping questions (THE key evidence):
   - **"Yes, this issue appears across all models in the project, including both
     FAR01 and FAR02, as far as I know. It also appears to be affecting some other
     projects as well."**
   - **Date/Time first noticed: July 14, 2026, ~8:00 AM Central Time.**
   - The issue started **recently**.
   - **"No, the model was not updated prior to noticing the difference."**
4. **Ilia, 07-15 15:49** — "yes, please" (yes to sending the model file).
5–9. Freshdesk status flapping (Waiting on customer ⇄ Open).
10. **Yash, 07-16 08:46** — model file link (SharePoint, TechnicalSupport site).
11. **Yash, 07-16 08:47** — Freshdesk → Waiting on 3rd line.

**Observation read (playbook Q1).** Two things distinguish this from the prior three
section-box tickets: (i) the complaint is not "the box is tilted" but "the box **isn't
shown as a rectangle**" / "**new style**" / "**revert it**" — a change in *kind*, not
just angle; and (ii) it is reported as **global** (all models, multiple projects) with
a **dated onset** and **no model change** — the signature of a release/deploy trigger,
not per-model Revit data. Both facts still need the screenshot + a repro to confirm.

---

## Attachments — ⚠️ NEEDS HUMAN

- ⚠️ **`section_box.png`** (149 KB PNG, Yash Patel, 2026-07-15 14:02) — the reporter's
  screenshot of the section box. **Could not be read** (Freshdesk/Atlassian-hosted;
  `GET .../attachment/content/60808` returns **HTTP 403** to the agent). This is the
  decisive evidence and a human must confirm from it which state is on screen:
  - **an oriented/tilted box but still a box** → same *class* as PLT-2651/2756/2771
    (orientation heuristic), OR
  - **no draggable rectangular gizmo at all / box not visible as a rectangle** → the
    "doesn't display the rectangular box" reading, a more fundamental break, OR
  - **a box placed far off / hugely oversized** → fitted-box/transform failure.
- ⚠️ **Model file** — SharePoint link in comment 10
  (`xyzrealityltd.sharepoint.com/:u:/s/TechnicalSupport/…`) — not accessible from here;
  needed to reproduce FAR01's section-box behaviour locally.

---

## The recurring history — this is the 4th section-box ticket in ~10 weeks

All three priors are **Done**. Together they are a documented saga around Forge's
`Autodesk.Section` box tool and XYZ's home-grown **`SectionToolOrientation`** workaround.

### PLT-2651 — "Section box misaligned with BIM models" (ATL08) — Critical, Done
- Created 2026-05-06. Reporter/assignee Masum Ahmed; engineering by **Rishi Bhugobaun**.
- **Root cause:** the Revit author baked the building rotation into geometry, so the
  model's true-north angle is **0** and Forge's `refPointTransform` carries **no
  rotation** → Forge's SectionTool renders the box world-axis-aligned and misses the
  diagonally-drawn building. (Rishi: "this affects how the viewer internally handles
  the section box … a workaround fix has been created," 05-11.)
- **Fix:** the `SectionToolOrientation` **workaround** — detect the mismatch, mutate
  `refPointTransform` at runtime and reload the Section extension so the box orients to
  the building. **Released in 26.2.3.** Verified CNR by **Gennaro Boccia** on 3 projects
  (05-19). Reopened once ("still not fully aligned with ATL08," 06-03); Rishi could not
  reproduce ("the few I've tried seem okay"); closed 06-04.

### PLT-2756 — "Scope Box Alignment Issue Switch ATL5–7" — Critical, Done
- Created 2026-06-02, assignee **Rishi**. "**Following the release 26.2.3**, users
  experienced the misaligned section box on SWITCH ATL5/6/7."
- **This is the 26.2.3 fix over-correcting:** the orientation patch fired on buildings
  that were already aligned, tilting ATL5–7 boxes ~3°. Rishi's test note (06-05):
  "ATL07 (regression) — box should be aligned, not tilted; ATL08 (diagonal) — box
  orients to the diagonal footprint."
- **Fix:** replaced the earlier angle+anisotropy thresholds with a single scale-free
  `tightness = minAreaRectArea / worldAabbArea` ratio, patching only when
  `tightness < 0.9` **and** the existing refPoint rotation is < 5° off-axis (so
  already-aligned buildings are left alone). Closed 06-19. This is the current
  `shouldApplyOrientationPatch()` logic.

### PLT-2771 — "Section box misaligned again" (SWITCH ATL08) — Major, Done
- Created 2026-06-09, reporter/assignee **Masum**. "Our section box is misaligned
  **again**, was working for a week or two but now is **aligned with true north instead
  of project north**." → the orientation patch **stopped firing** for ATL08 (reverted
  to world/true-north axis).
- Rishi (06-15): "**I'm not seeing this issue my side**" + screenshot; asked for a repro
  video. Went to Waiting on customer; **no customer response** → **closed 2026-07-10
  as CNR — with no engineering fix.**

### What the history tells us
- The section box has been **broken and "fixed" three times in a row**, and the
  orientation heuristic has mis-fired **both ways** — patching when it shouldn't
  (2756: tilts aligned buildings) and not patching when it should (2771: reverts to
  true north). It is inherently fragile: a per-model geometric guess reverse-engineered
  onto undocumented Forge internals.
- **PLT-2771 was closed on "can't reproduce" + customer silence, not on a fix** — exactly
  the playbook's premature-closure anti-pattern (§Anti-patterns #3). PLT-2906 opened
  **5 days later**. An unresolved recurrence wearing a "Done" label came back, as the
  playbook predicts.
- **No durable fix owner and no documentation.** Rishi built the workaround; 2771 died
  on the support side (Masum) with no engineering resolution; nothing in
  `dashboard/pitfalls.md` or `dashboard/viewer-and-model.md` records the
  `SectionToolOrientation` heuristic or its repeated mis-fires. (This triage should log
  it — see below.)

---

## Mechanism — how the section box is produced today (file:line, repo `hc-frontend`, branch `claude/vigilant-franklin-cs6txw`, read-only)

1. **Forge default.** `Autodesk.Section`'s SectionTool reads `getDefaultTransform()`
   **once at construction** from `model.getData().refPointTransform` (only if
   `loadOptions.applyRefPoint`). If that transform has no rotation, `_transform` is
   identity and the box is world-axis-aligned. There is no public API to update it after
   construction. (Documented in
   `.../section-tool/section-tool-orientation/section-tool-orientation.md`.)
2. **XYZ orientation workaround.** On box activation,
   `SectionToolService._activateBoxSectionTool()`
   (`.../components/section-tool/section-tool-service.ts:241-266`) **awaits**
   `this._orientation.patchIfNeeded()` before setting the box.
   `SectionToolOrientation._doPatch()`
   (`.../section-tool/section-tool-orientation/section-tool-orientation.ts:88-129`):
   - reads `refPointTransform` + `loadOptions.applyRefPoint` (`:94-96`);
   - computes the min-area-rectangle of the visible footprint and the `tightness` ratio
     (`:104-109`);
   - **gates on `shouldApplyOrientationPatch({existingRotZ, tightness})`** (`:110-112`);
   - if it fires: `refPointTransform.makeRotationZ(rect.angle)`, then
     **`viewer.unloadExtension('Autodesk.Section')` + `await
     viewer.loadExtension(...)`** (`:115-123`), re-strips hotkeys, and calls back
     `onExtensionReloaded` → `_applySectionExtensionOverrides()` which reassigns
     `setSectionFromState` (`section-tool-service.ts:274-288`).
3. **Box placement.** Back in `_activateBoxSectionTool`, the box is
   `defaultBBox || this._orientation.calculateFittedBoundingBox() ||
   this._calculateTotalBoundingBox()` (`:249-254`). `calculateFittedBoundingBox()`
   (`section-tool-orientation.ts:73-86`) returns an **oriented** box carrying a
   `.transform` (rotationZ) — SectionTool then skips its own inverse-transform step.
   Then `_sectionExtension.activate('box')` + `setSectionBox(totalBBox)`.

**Where "doesn't display the rectangular box" could come from (hypotheses, unproven):**
the box gizmo is created by Forge inside `activate('box')` after the extension has been
**unloaded and reloaded** and after `setSectionFromState` has been monkey-patched. Any
of: (a) a fitted/oriented box so large or so placed that the visible rectangle sits
off-view; (b) the extension reload leaving the box-mode UI in a state where the gizmo
doesn't render; or (c) the `setSectionFromState`/override throwing post-reload — would
produce "no rectangular box to grab." All are consistent with the customer's "new style
… doesn't display the rectangular box," but **none is confirmed without the screenshot
and a repro.**

---

## Why-now (trigger) investigation — code suspects checked and RULED OUT

Onset is dated (July 14 ~08:00 Central ≈ 14:00 BST) and reported **global with no model
change** → look for a release/deploy, not per-model data. Repo checked read-only (50
commits; the section-tool code lives in the baseline import `7c2560e`, so the whole
orientation feature + its 2651/2756 fixes are already present in this tree — git here
cannot show *when* they shipped to FAR's release channel).

- ❌ **PAPI-3226 "update libs versions" (`1966715`, Sergey, 2026-07-15)** — my leading
  "Forge viewer bump" hypothesis. **Ruled out:** the diff touches only `build.gradle` +
  `gradle.properties` — Spring Boot 3.5.14→3.5.16, checkstyle, apache-commons, tomcat
  cleanup. **No Autodesk/Forge/LMV/three.js/frontend dependency change.** Backend build
  only.
- ❌ **PLT-2825 "Remove dead coordinate and reference-point code" (`906b69d`, 2026-07-07)**
  — tempting on the name. **Ruled out:** it deletes the dead **V1 room-capture**
  `ReferencePointsService` + `serviceProviderAdapter` room/coordinate methods (consumers
  moved to `RoomCaptureApiService`). That is the 360/room-capture "reference points,"
  **not** Forge's `refPointTransform`/`applyRefPoint`, which the section tool reads
  directly off `model.getData()`. Name collision only.
- ❌ **Other July viewer/dashboard commits** (`c09e924` PLT-2864 webviewer elements,
  `e16d381` PLT-2795 viewer zero-element guard, `31ef345` PLT-2892 colouring,
  `72ce544` PLT-2764 V2 project, `6953935`, `3150c85`) — grepped each for
  `refPoint|applyRefPoint|Autodesk.Section|section.?box|loadExtension|getDefaultTransform`:
  **no hits.** No frontend commit in the visible window touches the section box.

**Conclusion on trigger:** no code trigger is visible in this repo's window. The onset
must be correlated to a **release to FAR** — specifically *which viewer/app version FAR01/
FAR02 are running and when the `SectionToolOrientation` "oriented box" behaviour (or any
Forge upgrade) reached that channel.* This is the perennial playbook Q5 ("why now?") and
is a **needs-human** step (deploy-timeline correlation + FAR's release version).

---

## Doc references (xyz-platform-context)

- `dashboard/viewer-and-model.md:62-67` — documents `applyRefPoint` /
  `data.loadOptions.refPointTransform` and states *"The section tool reads this transform
  to orient cutting planes in world coordinates."* **Does not** document the
  `SectionToolOrientation` workaround, its `tightness`/off-axis heuristic, the
  unload/reload dance, or the recurring mis-fire class.
- `dashboard/pitfalls.md` — **no** section-box entry at all. Given this is the 4th ticket
  on the same feature, a pitfall belongs here (see recommended-action).
- `incidents/live-incident-playbook.md` — §"universal shape" Q1/Q2/Q5, §Anti-patterns
  #3 (premature closure) and #4 (unanswered "why now") map directly onto the 2651→2771
  history.
- `hc-frontend/.../section-tool/section-tool-orientation/section-tool-orientation.md` —
  the in-repo design note for the workaround; names **PLT-2756** (the SWITCH-ATL07
  mis-fire) as the reason the threshold logic was simplified.

---

## Root-cause hypothesis & verdict

**Regression-history verdict (high confidence, 8/10):** PLT-2906 is the **4th recurrence**
of the same fragile feature (Forge section box + XYZ's `SectionToolOrientation`
workaround). It follows PLT-2651 → PLT-2756 → PLT-2771, the last of which was **closed on
"can't reproduce" + customer silence with no fix**, 5 days before this ticket opened.
There is **no durable fix owner and no documentation** of the heuristic — this is the
significant, surface-strongly finding.

**Is it the *same bug* or a new variant? — leaning "new variant of the same feature"
(medium confidence).** The prior three were all "box present but wrongly *oriented*" and
each tied to a *specific* project's Revit data. PLT-2906's own words ("new style,"
"doesn't display the rectangular box," "change it back") plus its reported **global,
dated, model-unchanged** onset point away from a per-model orientation tilt and toward
**the oriented-box workaround itself (the "new style") reaching FAR's release channel and
misbehaving there** — most likely the fitted/oriented box or the extension unload/reload
leaving no usable rectangular gizmo on FAR's models. A Forge/LMV viewer behaviour change
delivered via a release (not visible in this repo) is the runner-up.

**Overall confidence in a *specific* code root cause: 4/10.** The direction is
code-grounded, but the decisive screenshot is unreadable (403), the onset cannot be
correlated to a deploy from this repo, and the two strongest code triggers (PAPI-3226,
PLT-2825) were both inspected and ruled out. Sub-scores: FE mechanism of how the section
box is produced and could fail to show a gizmo **7/10**; specific trigger for FAR on
July 14 **3/10**; regression-history + ownership-gap finding **8/10**.

**Still needed to close (playbook Phase 6):** (a) the screenshot / a repro confirming
gizmo-absent vs merely-tilted; (b) FAR01/FAR02's current release version and when the
oriented-box feature (or any Forge upgrade) shipped there — the trigger; (c) an explicit
link to PLT-2651/2756/2771 and a **named engineering owner** for the section-box feature
so this stops being closed on no-repro.

---

## 2026-07-17 — Teams input (Rishi, + Tom via Rishi) and the True-North analysis

New evidence arrived off-Jira, in a Teams thread (Ilia ↔ Rishi Bhugobaun, 16:03–16:21):

- **Rishi (16:06):** he had previously suggested this root cause — *"it was possible
  that they do not set it [True North] for a project. If we could get them to set it
  correctly I think it would solve the issue; the implementation I did is a best-effort
  one to estimate the model-aligned BB — however it seems sometimes it incorrectly
  overrides the model."* There are "various cases in the unit tests, maybe this is just
  a new one." Floated alternative: a user-facing toggle between 'calculated axis' and
  'default axis' for the section box — "but it's not great UX."
- **Ilia (16:09):** empirical correlation — *"for most projects where the section box
  works correctly the true north angle equals 0, whereas for FAR01 it's different."*
- **Rishi, after checking with Tom (16:12):** *"we don't actually apply the true north
  angle to models in the editor. It is set when exporting models from the Revit file;
  this gets put into one of the Forge transforms which helps it internally orient it."*

### Code check — how a non-zero True North actually flows through the gate

Re-read `section-tool-orientation.ts` + `section-tool-orientation-math.ts` (branch
`claude/vigilant-franklin-cs6txw`, read-only). Rishi/Tom's account is corroborated:
the TN rotation arrives as `model.getData().refPointTransform`, consumed only when
`loadOptions.applyRefPoint` is set (`section-tool-orientation.ts:94-96`) — exactly
"one of the Forge transforms." The decisive branch logic
(`shouldApplyOrientationPatch`, `section-tool-orientation-math.ts:141-152`):

- **TN folded-to-nearest-axis ≥ 5°** (`ORIENTATION_MISMATCH_THRESHOLD_RAD`): patch
  **refuses to fire** (`:149`) — the comment says the rotation "came from Revit shared
  coordinates and is authoritative." SectionTool then uses stock-Forge behaviour:
  default transform = the TN rotation. If the box is wrong in this branch, the code
  never corrects it — by design.
- **TN non-zero but folded < 5°** (small angles like 1–4°, or near-multiples of 90°):
  treated as "effectively no rotation." If `tightness < 0.9` the patch **fires and
  overwrites the real TN** with the min-area-rect estimate
  (`refPointTransform.makeRotationZ(rect.angle)`, `section-tool-orientation.ts:115`) —
  precisely Rishi's "sometimes it incorrectly overrides the model."
- Two extra fragilities recorded while reading:
  1. **`models[0]` dependency** — both the gate inputs and the footprint come from the
     *first visible model only* (`:93`, `:104`), while the fitted box unions *all*
     visible models (`:76`). FAR01 is a ~100-model federation → which model is
     `models[0]` (load order / visibility) decides whether and how the patch fires.
     Mixed TN values across files would make behaviour flip between sessions.
  2. **`makeRotationZ` wipes the translation** component of `refPointTransform` (it
     resets the whole matrix). Any *later* consumer of that transform on the same model
     data sees a falsified transform. Possible cross-link to other alignment oddities
     on patched projects (e.g. pin placement class of bugs).

**Ilia's TN=0-works / TN≠0-breaks correlation is mechanically consistent with both
hazardous branches.** TN=0 projects sit in the two well-tested paths (axis-aligned, or
the 2651-style diagonal patch). TN≠0 projects land either in "authoritative, never
corrected" (≥5°) or "silently overridden" (<5°). **Which branch FAR01 is in is decided
by one number we don't have yet: the exact TN angle.** (From delivery's report, or from
the viewer console on FAR01: decompose `viewer.model.getData().refPointTransform`.)

### Revit-knowledge validation of the "ask delivery to check TN at export" plan

Checked against standard Revit/APS behaviour — the assumption **has a real chance to be
correct**, with important caveats on phrasing:

- **True North is a project position property, not an export checkbox.** It's set via
  Manage ▸ Position ▸ Rotate True North (or implicitly by Acquire Coordinates from a
  linked/site file). What the *export step* decides is which coordinate basis lands in
  the file: NWC "Coordinates: **Shared** vs **Internal**", IFC site placement, and for
  RVT→Forge the shared-position transform travels in the derivative's AEC model data
  (our `refPointTransform`). So "check it in Revit while exporting" is meaningful, but
  the check spans **two** things: the TN angle itself *and* the export coordinate
  setting.
- **A non-zero TN is normal and usually correct** — real buildings rarely align to true
  north. FAR01 having TN≠0 is *not* by itself an authoring error, and "set it to 0"
  would change georeferencing — with blast radius on anything consuming shared
  coordinates (multi-model federation alignment, survey coordination, on-site AR
  alignment). The ask must be **verify-and-report, not change**.
- **What would be a genuine export-side defect:** (a) *inconsistent* TN values or mixed
  Shared/Internal export settings across the federated FAR01/FAR02 files — this breaks
  cross-model alignment outright and also randomises our `models[0]` gate; (b) an
  *accidental* TN nobody intended (wrong Acquire Coordinates source); (c) a *tiny* TN
  (< 5°) — almost certainly unintentional, and exactly the value range our gate
  silently overrides.
- **TN cannot explain the July-14 onset by itself.** The customer states models were
  not updated before the change appeared — TN lives in the exported file, so if files
  didn't change, TN didn't change on July 14. TN explains **which projects are
  susceptible**; the **trigger** (what shipped to FAR's channel ~13–14 Jul — release /
  viewer version / load-options change engaging `applyRefPoint` differently) is still
  the open why-now question from the 07-16 pass. Both must be answered to close per
  playbook Q5.

### Updated hypothesis ranking (2026-07-17)

1. **(leading)** FAR01/FAR02 carry non-zero TN in their exported models; a ~13–14 Jul
   release changed how that rotation engages (workaround reaching their channel, Forge
   viewer change, or load-options change) → box now renders oriented differently ("new
   style"), either trusted-but-wrong (≥5° branch) or overridden-and-wrong (<5° branch).
2. Same, but the defect is purely the `<5°` override branch mis-firing on a small
   accidental TN — pure code-side, delivery's report would show TN ≈ 1–4°.
3. Export-side inconsistency across the federation (mixed TN / mixed Shared-Internal) —
   delivery's per-file report decides.

Confidence in the *direction* (TN ↔ refPointTransform ↔ box orientation chain): **8/10**
— code-confirmed chain + independent empirical correlation + mechanism-owner agreement.
Confidence in a *specific* root cause: still ~5/10 until we have (i) the exact TN
angle(s), (ii) the release timeline, (iii) the screenshot/gizmo question from the
07-16 pass.
