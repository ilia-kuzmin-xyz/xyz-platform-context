# PLT-2906 — "Section box misaligned from model" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2906
- **Issue type:** Live Incident · Software / Dashboard (customer wrote "Dashboard"; the section box is a **Web Viewer/Editor** tool — area label is imprecise)
- **Status:** **Open** (To Do / blue-gray) → Group A (needs evaluation)
- **Priority:** Major
- **Project (site):** FAR01 (customer says also FAR02 and "some other projects")
- **Reporter:** Yash Patel (coordinator/support) · **Assignee:** Darminder Atker (fullstack lead)
- **Created:** 2026-07-15 · Freshdesk #7424 ("Waiting on 3rd line")
- **Domain slug:** `viewer-and-model` (section box = viewer tool)
- **Attachments:** `section_box.png` (149 KB, Yash) — **NOT viewable here; decisive evidence — see NEEDS HUMAN**
- Triage date: 2026-07-15

---

## One-line symptom

When the **Section Box** is turned on in the web viewer, it "no longer aligns the way it used to";
the customer says the **"new style … doesn't display the rectangular box"**, making it hard to adjust/
section the model, and asks to **"change the Section Box back to how it was before."** First noticed
**2026-07-14 ~08:00 Central**, across FAR01 + FAR02 + "some other projects", **no model updates** made
prior. That shape — recent onset, multiple projects, no data change — points at a **release/behaviour
change**, not project data.

---

## ⭐ Prior-art review — this is a RECURRING incident (the reason this ticket matters)

The user's explicit ask was "find similar tickets and review how they were resolved." There is a clear
**fix → regression → fix → recurrence chain** on this exact feature over the last ~10 weeks:

| Ticket | Date | Project | Symptom | Resolution |
|---|---|---|---|---|
| **PLT-2651** | May 2026 (Critical) | ATL08 | Box aligned to **true north instead of project north** (rotated vs BIM model) | DPL (Ali Seyedof) ruled out the exporter/transform layer → **front-end viewer** issue. Root cause (Rishi): how the Forge viewer orients the box when the model's true-north angle is 0. Shipped a **FE workaround** (explicitly *not* forcing every project to set true north — "risky for alignment"). **PR #1871, merged 2026-05-08 → released v26.2.3 (2026-05-26).** QA-verified by Gennaro across 3 projects. |
| **PLT-2756** | Jun 2026 (Critical) | Switch ATL5–7 | **"Following release 26.2.3"** boxes now **rotated/diagonal** | **The 26.2.3 workaround regressed other projects.** Rishi reworked the heuristic so the box becomes a **tight oriented bounding box** to the building footprint. **PR #1933 ("PLT-2756"), merged 2026-06-05.** Rishi test note: *"the box orients to the building's diagonal footprint as a tight oriented box."* Done. |
| **PLT-2771** | Jun 2026 (Major) | SWITCH ATL08-xv2 | "misaligned **again** … true north instead of project north; was working a week or two" | **Never actually fixed.** Rishi couldn't reproduce; no repro video returned; **closed administratively** via Freshdesk 2026-07-10. No code fix, no fixVersion. |
| **PLT-2906** | 15 Jul 2026 (Major) | FAR01/FAR02 + others | "no longer aligns … new style doesn't show the rectangular box … put it back" | **THIS TICKET — open.** |

**Two lessons from the prior art, load-bearing for how 2906 should be handled:**
1. **Every "fix" here changed the box-orientation heuristic, and the previous one regressed on projects
   with a different footprint/north setup.** 26.2.3 (PCA) fixed ATL08 but tilted ATL5–7; #1933 (min-area
   rectangle) re-fixed those. Any change for FAR01/02 must be **QA'd across multiple orientations** (0°
   true north, diagonal footprints) before release — that discipline is exactly what 26.2.3 skipped.
2. **PLT-2771 shows the "true-north recurrence" can also just be un-reproducible and die on the board.**
   Don't assume 2906 is the same as 2771 — the wording differs (see below).

---

## Mechanism — how the box is oriented, and what changed (code-verified)

Section-box code lives under `hc-frontend/src/main/webapp/app/pages/organisation/ViewerPage/components/`:

- `section-tool/section-tool-service.ts` — activation/toggle/undo-redo. `_activateBoxSectionTool` (:241)
  awaits the orientation patch, then picks a box via
  `defaultBBox || _orientation.calculateFittedBoundingBox() || _calculateTotalBoundingBox()` and calls
  Forge `_sectionExtension.setSectionBox()`. **The box is Forge's native `Autodesk.Section` box (geometry
  + drag handles) — there is NO custom-drawn rectangle in our code.**
- `section-tool/section-tool-orientation/` (`section-tool-orientation.ts`, `-math.ts`, `.md`) — the
  alignment workaround that all these incidents revolve around.
- `section-box-helper-functions.ts` — elements-inside math + a green `LineSegments` **debug** overlay
  (`drawCustomBoundingBox`, only `visualize=true`); not user-facing.
- `viewer-bar/tools/section-tool-button.tsx`, `icons/section-box-icon.tsx` — toolbar UI only.

**Orientation source.** Forge's `SectionTool` reads `model.getData().refPointTransform` **once at
construction** to orient the box. If the Revit author baked building rotation into geometry (rather than
into the project base point / shared coords), `refPointTransform` carries no rotation → the box renders
world-axis-aligned and misses a diagonal building. Our DB's `angleToTrueNorth` never reaches Forge. The
workaround detects the mismatch, mutates `refPointTransform.makeRotationZ(θ)`, and reloads the extension
(`section-tool-orientation.ts:88-129`). Documented at `dashboard/viewer-and-model.md:62-67`.

**What #1871 (PLT-2651) did:** added the `SectionToolOrientation` service; detected the axis via **PCA
principal axis + anisotropy** (`shouldApplyOrientationPatch`: patch when `|existingRotZ|<5°`, `|θ|≥5°`,
`anisotropy≥3`), then rotated `refPointTransform`.

**What #1933 (PLT-2756) did — the likely culprit for 2906:** replaced PCA with the **minimum-area
enclosing rectangle** (rotating calipers), gated on a scale-free `tightness = minRectArea/worldAabbArea
< 0.9`, and made the extension reload awaited. **This changed *which* projects get an oriented (rotated)
box vs. the world-aligned one.** A project's box can flip behaviour purely from this heuristic change.

**Recency check:** #1933 (2026-06-05) is the **only** section-box change in the last ~6 weeks. The most
recent viewer PR before the incident, **#1993 (PLT-2795, 2026-07-10)**, touches only dashboard filters/
progress/colour pipeline — **no section-box files**. Local git is shallow (back to 2026-06-15 only); no
section-box commits in that window. **No PR anywhere restyled the box, removed handles, or switched from
a drawn rectangle to clip planes** — so "doesn't display the rectangular box" is *not* a literal UI
removal; most plausibly the box is now **rotated/oriented to the building diagonal** and the customer
reads that as "not a usable rectangle / wrong style."

---

## Playbook 6-question status

1. **Observed & reproducible by us?** ⚠️ Not yet — no internal repro on FAR01/02; screenshot unviewable.
2. **Expected, on whose authority?** Customer reference = "how it was before" (the world-aligned box).
   Note this is exactly what the #1871/#1933 reworks deliberately *changed* — so "expected" may collide
   with an intentional product change, not a bug. Needs product to confirm intended behaviour.
3. **Smallest broken-vs-working pair?** Available in principle: a FAR01/02 model that now shows a rotated
   box vs. one still world-aligned; or FAR01 before/after #1933 reached its environment. Not yet run.
4. **Mechanism?** ✅ Traced (above): `refPointTransform` orientation + the #1933 tightness-gate heuristic.
5. **Why now (trigger)?** **The key open question.** Hypothesis: #1933 reached FAR01/FAR02's environment
   ~2026-07-14, flipping them across the `tightness<0.9` gate into an oriented box. **Confirm the deploy/
   release date of #1933 to those projects** — if it lands on ~July 14, that's the trigger.
6. **Who else (cohort)?** Customer already says FAR01, FAR02, "and some other projects" — consistent with
   a heuristic change hitting every project whose footprint now crosses the gate. Enumerate once confirmed.

---

## Bug vs. by-design vs. UX pushback (do not conflate)

Three distinct possibilities, and the screenshot + trigger date decide between them:
- **(b1) Regression:** #1933's min-area-rectangle gate now *wrongly* rotates FAR01/02 (their box should be
  world-aligned). → FE fix, tune the gate. Consistent with the 2651→2756 regression pattern.
- **(b2) Working-as-designed but unwanted:** the oriented box is "correct" for FAR01/02's footprint, but
  the customer preferred the old world-aligned rectangle. → **product decision** (keep oriented / revert /
  make it user-toggleable). The customer literally asks to "change it back" — this is a real UX-vs-intent
  call, echoing the 360-pin (PLT-2649) and QA-location (PLT-2858) pattern of "customer wants the old way."
- **(a) True-north recurrence (like 2771):** less likely given the "new style" wording, but not excluded
  until the screenshot is seen.

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

- **That 2906 is fallout from the #1933 section-box rework (family (b)):** **7/10** — #1933 is the sole
  recent change, its mechanism plausibly flips FAR01/02, and the wording ("new style / put it back")
  matches an orientation change rather than a data recurrence. Not yet confirmed by screenshot or deploy
  date.
- **That the box code path/mechanism is as described:** **8/10** — read from source with file:line + PR
  archaeology.
- **Whether it's a bug (b1) vs. by-design-but-unwanted (b2):** **4/10** — undecidable without the
  screenshot and a product statement of intended behaviour.

---

## NEEDS HUMAN (evidence I cannot obtain)

- ⚠️ **`section_box.png`** (149 KB, Yash, 2026-07-15) — binary behind Atlassian auth; **the single
  decisive artifact.** It disambiguates "box rotated/oriented to building diagonal" (family b) vs.
  "genuinely no box drawn" vs. "old true-north rotation" (family a). Do not guess its contents.
- ⚠️ **Deploy/release date of PR #1933 (PLT-2756) to FAR01/FAR02's environment.** If it reached prod
  ~2026-07-14, that confirms the trigger (playbook Q5). Owner: release/Darminder.
- ⚠️ **Customer model file** — Yash offered, Ilia said "yes, please" (comment 2026-07-15 15:49). Enables
  an internal repro + the `existingRotZ`/`tightness` check below.
- ⚠️ **Fastest code lever (needs env access to a FAR01/02 model):** run the DevTools debug snippet in
  `section-tool-orientation.md` and compare `existingRotZ` / `tightness` against the `<0.9` gate — shows
  directly whether these projects now cross into the oriented-box branch.

---

## Roster / ownership notes

- **Rishi Bhugobaun** — authored both prior fixes (#1871, #1933); the natural owner for the FE mechanism.
- **Darminder Atker** (assignee) — FE lead; owns routing.
- **Ilia Kuzmin** — engaged on-ticket (asked for the model file).
- **Yash Patel** — coordinator/client comms.
- If the answer is (b2) "customer wants the old box back", this needs a **product owner** (Pietro /
  Mostafa, with Jason on UX) — same product-decision shape as PLT-2649 and PLT-2858 this cycle.

## Doc refs
- `xyz-platform-context/dashboard/viewer-and-model.md:62-67` — `applyRefPoint`/`refPointTransform`; "the
  section tool reads this transform to orient cutting planes." **No section-box pitfall documented yet** —
  add one when this closes (the orientation heuristic + its regression history is a textbook pitfall).
- `hc-frontend/.../section-tool/section-tool-orientation/section-tool-orientation.md` — the workaround's
  own design note + DevTools debug snippet.
- `incidents/live-incident-playbook.md` — tone/pattern for the recommended reply.
