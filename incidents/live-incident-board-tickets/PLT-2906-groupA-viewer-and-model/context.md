# PLT-2906 — "Section box misaligned form model" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2906
- **Type:** Live Incident · **Priority:** Major · **Status:** Open (Freshdesk #7424 flapping
  Open/Waiting-on-customer — bot noise, not a real signal)
- **Software Area (customer's label):** Dashboard · **Projects:** FAR01, FAR02, "some other
  projects as well" (customer's words) · **Reporter:** Yash Patel · **Assignee/investigator:** Ilia Kuzmin
- **Created:** 2026-07-15 · **Last updated:** 2026-07-20
- **Domain slug:** `viewer-and-model` (the section-box tool lives in ViewerPage code; "Dashboard"
  is the reporter's area tag, not the actual surface)

---

## One-line symptom

Customer: *"when the Section Box is turned on, it no longer aligns the way it used to. The new
style isn't very useful because it doesn't display the rectangular box... Is it possible to
change the Section Box back to how it was before?"*

**Decisive fact the customer supplied unprompted:** the models were **NOT** updated/re-uploaded
before the change was noticed (first seen 2026-07-14 ~8am Central). This rules out a
PLT-2882/PLT-2909-style re-upload/data regression — this is shaped like a **code/deploy** change,
not a data change.

---

## Thread so far

1. Yash relays report, offers to send the model file.
2. Customer confirms: affects **all models** in FAR01 *and* FAR02, "some other projects as well";
   started ~2026-07-14 08:00 Central; no model re-upload beforehand.
3. Ilia's on-ticket hypothesis (2026-07-17): *"I suspect this is tied to the models' True North
   angle... ask the delivery/BIM team to check the True North angle in Revit for FAR01/FAR02 and
   report the actual value(s), and whether it's the same across all exported files."*
4. Customer replied 2026-07-20 with two screenshots of Revit "True North info" for FAR01/FAR02 —
   **unreadable here** (binary, behind Jira attachment auth). See NEEDS HUMAN.

## Deep-research findings (Opus agent, code-verified) — this changes the plan

Full mechanism traced end-to-end in `hc-frontend`:

- The section box's alignment is driven by a **custom orientation patch this codebase adds on top
  of stock Forge**, not by Forge's default behaviour: `SectionToolService._activateBoxSectionTool`
  (`.../ViewerPage/components/section-tool/section-tool-service.ts:241-266`) calls
  `SectionToolOrientation.patchIfNeeded()`
  (`.../section-tool/section-tool-orientation/section-tool-orientation.ts:88-129`).
- The patch fires **unconditionally, no feature flag**, whenever a model's footprint is
  **diagonal in world coordinates** (`tightness < 0.9`, minimum-area-enclosing-rectangle test)
  **and** it has no rotation already baked into `refPointTransform`
  (`section-tool-orientation-math.ts:141-152`). When it fires, it mutates Forge's
  `refPointTransform` to rotate the section box to match the building footprint, then
  reloads the section extension so it picks up the new orientation.
- **This is exactly the reported symptom**: a box that used to be screen/world-axis-aligned now
  appears rotated to match the building — which reads as "doesn't display the rectangular box"
  and "difficult to adjust" to a user expecting the old gizmo. The in-repo design doc
  (`section-tool-orientation.md:85-90`) documents this as intentional, selective behaviour:
  diagonal projects (e.g. SWITCH-ATL08) get patched, axis-aligned/near-square ones don't.
- **True North is a *selector*, not the cause and not the fix.** The DB field
  `angleToTrueNorth`/`trueNorthAngle` is wired only into unrelated coordinate-conversion helpers
  (`services/coordinate/utils/get-transformed-position.ts:33`,
  `unified-coordinate-transforms.ts:47,120`) — **never** into the section tool's
  `refPointTransform`. The design doc explicitly warns against this exact false lead
  (`section-tool-orientation.md:157`): *"Don't update our DB `angleToTrueNorth` to fix this. That
  field is wired only to our own coordinate helpers and never reaches Forge's
  `refPointTransform`."* True North *does* explain **which** projects are affected (buildings
  whose rotation is baked into geometry rather than shared coordinates are the ones that come out
  "diagonal" and trip the patch) — but reading the customer's Revit True North values will not
  produce a fix, and editing our True North field would do nothing.
- **"Why now" (trigger) = a deploy of this orientation feature reaching FAR01/FAR02's
  environment**, not a model change. No feature flag gates it, so the moment the code ships, every
  diagonally-placed project's section box flips from axis-aligned to oriented at once — matching
  the sudden, multi-project, no-re-upload onset exactly.
  - ⚠️ Caveat: this checkout's git history is a shallow/squashed snapshot — the entire
    `section-tool/` directory shows one artefactual authoring commit dated 2026-06-22, not a real
    deploy date. The actual production deploy date for this feature could not be confirmed from
    git and needs the real CD/release log (see NEEDS HUMAN).
  - One candidate library-bump commit in the incident window, `1966715` ("PAPI-3226 update libs
    versions", 2026-07-15) was checked and only touches backend `build.gradle`/
    `gradle.properties` — no Forge/three.js version change. Ruled out.

## Bug vs. as-designed

Leans **"as-designed, but the customer dislikes/is confused by it"** — the oriented box is a
deliberate improvement for diagonal buildings (tighter fit), not a defect. There is a secondary,
unconfirmed possibility that "doesn't display the rectangular box" means the box fails to render
at all (a real bug in `calculateFittedBoundingBox` or the extension-reload race) rather than
"renders, just rotated" — this ambiguity needs a human to look at the actual customer session /
model, or the (currently unread) screenshots.

## Confidence (per xyz-platform-context CLAUDE.md scale)

- Mechanism identified in code: **9/10** — traced to exact file:line, matches symptom precisely.
- Deploy-of-this-feature as trigger (vs. True North as trigger): **8/10** — the code makes True
  North structurally incapable of being the trigger; docked for not being able to confirm the
  exact deploy date from this repo's git history.
- Bug vs. as-designed-but-disliked: **5/10** — needs a repro/screenshot to rule out a genuine
  "box doesn't render" defect.

## NEEDS HUMAN

- ⚠️ **FAR01.png / FAR02.png** (customer's True North screenshots, 2026-07-20) — unreadable here.
  Per the code, these confirm *scope* (why these projects), not a fix — don't let reading them
  become the blocking step; the decisive next move is internal (deploy-date correlation), not
  customer data.
- ⚠️ **section_box.png** (original attachment, 2026-07-15) — unreadable; would disambiguate
  "rotated-but-present" vs. "missing/degenerate" box.
- ⚠️ **Exact production deploy date** of `SectionToolOrientation` — needs the real release/CD log,
  not git (this checkout's history is squashed).

## Doc refs
- `hc-frontend/.../section-tool/section-tool-orientation/section-tool-orientation.md` — in-repo
  design doc; already documents the True-North false-lead and the verified per-project cases.
- `xyz-platform-context/dashboard/viewer-and-model.md` — VWR domain doc; confirms the section
  tool reads `refPointTransform` via `applyRefPoint`.
