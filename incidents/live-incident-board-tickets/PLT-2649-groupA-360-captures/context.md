# PLT-2649 — "[NEW DASHBOARD] PA12 360 pins appear too high" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2649
- **Issue type:** Live Incident ("To track live incidents on site.")
- **Status:** In Analysis (category: In Progress / yellow). Freshdesk #6622, last set to "Waiting on 3rd line" (2026-06-19) — i.e. back on us.
- **Priority:** Major
- **Project (site):** PA12
- **Reporter & Assignee:** Masum Ahmed
- **Created:** 2026-05-06 · **Last updated:** 2026-06-30
- **Components / Labels:** none
- **Attachments:** 2 PNG screenshots (see NEEDS HUMAN) + 1 broken inline blob in the description
- **Domain slug:** `360-captures`

---

## One-line symptom

On the **new (native) dashboard**, the **360° capture pinpoints render too high (wrong Z / elevation)** in the 3D viewer for project **PA12** — floating above where the capture was actually taken. Reporter framed it as "a lot higher than PowerBI".

---

## What the thread has ALREADY established (read before re-analysing)

The `[NEW DASHBOARD]` title is **misleading** — analysis in-thread has already disproven the "new-dashboard-only" framing. Established facts, in order:

1. **The same misplacement exists in the legacy PowerBI dashboard.** Ilia Kuzmin, 2026-05-11 (comment 101985): *"it seems there's an issue with the pinpoints coordinates since the powerbi dashboard has the same problem."* → rules out a new-dashboard code-path regression. **Independently confirmed by the customer**, relayed by Yash Patel 2026-06-05 (comment 104443): *"It's the same on the old one, which suggests a problem with the room data in the Revit models."**
2. **Quality-tab pinpoints are placed correctly** on the same project/model. Ilia, 2026-05-11: *"the pinpoints work correctly on the quality tab."* → the viewer's coordinate-transform pipeline itself is sound; only the 360 inputs are wrong. (Code confirms both tabs share one transform — see Mechanism.)
3. **It is a subset, not all pins.** Ilia, 2026-05-11 and 2026-05-12: *"for 60% of pinpoints the position is almost correct, but for the rest… broken or obsolete and was assigned to another pbp"*; *"60% of captures are assigned to the correct room position, but 40% need a review."* (Note the two comments phrase the split inconsistently — 60% correct/40% wrong vs, on 2026-06-30, "tweaking 60% … that inherited the old pbp." The exact fraction is an eyeball estimate from screenshots, not measured.)
4. **Working hypothesis on the thread (Ilia + Pietro):** elevation is wrong because a subset of captures **"inherited the old pbp"** (project base point) — i.e. captures positioned against a since-superseded model base point / room elevation. Suggested remedy floated by Ilia: *"the client should probably reupload all 360 captures."*
5. **Current stall:** Ilia asked Pietro Desiato (2026-06-30, comment 106186) *"who can assist us with tweaking 60% of the pinpoints position that inherited the old pbp?"* — **unanswered for ~2 weeks** (today 2026-07-13). The ticket is parked on an unassigned ownership question, not on active investigation.

**Net:** root cause is localised to **source coordinate DATA for PA12's 360 captures**, not to frontend rendering. This is well-supported (two independent legacy-repro confirmations + working Quality tab on the same model).

---

## Chronology (all 9 comments)

| Date | Author | Content |
|------|--------|---------|
| 2026-05-06 09:50 | Masum Ahmed | Freshdesk #6622 mirror → "Waiting on 3rd line" |
| 2026-05-06 10:35 | Rishi Bhugobaun | "attachment seems to be missing for this one too" |
| 2026-05-06 10:43 | Masum Ahmed | Re-posts screenshot (attachment `image-20260506-094327.png`) |
| 2026-05-11 15:50 | Ilia Kuzmin | PowerBI has same problem; Quality tab pins correct; ~60% almost-correct, rest broken/obsolete "assigned to another pbp"; suggests client re-upload. @Pietro. (attachment `Screenshot 2026-05-11 154311.png`) |
| 2026-05-12 16:44 | Ilia Kuzmin | Ask customer to check the **pbp of the model rooms**; Pietro thinks **elevation may be wrong**; 60% correct / 40% need review |
| 2026-05-14 16:56 | Masum Ahmed | Freshdesk #6622 → "Waiting on customer" |
| 2026-06-05 13:49 | Yash Patel | Customer reply: *"same on the old one… problem with the room data in the Revit models"* |
| 2026-06-19 08:51 | Yash Patel | Freshdesk #6622 → "Waiting on 3rd line" (back to us) |
| 2026-06-30 16:49 | Ilia Kuzmin | @Pietro — "who can assist us with tweaking 60% of the pinpoints… that inherited the old pbp?" — **last activity, unanswered** |

**Staleness:** last movement 2026-06-30 → **~13 days** untouched; the substantive analysis has been static since early June.

---

## Mechanism — how a 360 pin's Z is computed (new dashboard), with file refs

The 360 pin Z comes straight from the **capture record's own stored coordinate**, transformed by the *same* pipeline the (correct) Quality pins use. Trace:

1. **Data service** `Dashboard360Service._queryAllData()` builds one pin per room, taking coordinates from the capture rows themselves:
   `FIRST(c.xMeters)`, `FIRST(c.yMeters)`, `FIRST(c.zMeters)` from table `captures_360`
   — `hc-frontend/.../services/dashboard-360/dashboard-360-service.ts:541-543` (query 529-553). Source column `zMeters` is populated from the **API v2 `360captures` endpoint** (table DDL lines 232-254; comment "coordinates from first capture for viewer pinpoint rendering" at 527-528).
2. **Reactive bridge** maps each `roomSummary` row → `IProjectImage` with `zPosition: room.zMeters` — `hc-frontend/.../dashboard-panels/viewer/hooks/use-pinpoints-reactive-render.ts:35-51`.
3. **Pin service** `DashboardImageService.renderImages()` extracts `xPosition/yPosition/zPosition` via `extractImageCoordinates` — `.../services/dashboard-image-service.ts:211-268`; extractor at `.../ViewerPage/utils/coordinate-extractors.ts:50-52`.
4. **Transform** `DashboardPinpointBaseService._transformCoordinates()` → `transformPushPinsToViewer(dbPos, pbpData, rotMatrix, globalOffset, swapYZ=true)` — `.../services/dashboard-pinpoint-base-service.ts:176-218`; transform at `.../services/coordinate/utils/coordinate-transforms.ts:10-34`. With `swapYZ=true` the capture's **`zMeters` becomes the viewer's vertical axis**, then rotation + PBP add + globalOffset subtract are applied.

**Key corroboration that this is data, not code:** Quality issue pins run the *identical* transform (`DashboardIssueService` extends the same base; `extractIssueCoordinates` reads `xMeters/yMeters/zMeters`, `coordinate-extractors.ts:38-44`) and are reported correct. Same transform + same PBP/globalOffset + same model → the only variable is the **input coordinates**. This matches the thread's conclusion at code level.

### New finding to add (secondary, code-adjacent — not the root cause)

`FIRST(c.zMeters)` is a DuckDB aggregate over a `GROUP BY c.modelRoomId` **with no `ORDER BY` inside the group** (dashboard-360-service.ts:541-543, 551). `FIRST()` therefore returns an **arbitrary** capture's coordinate for the room. If a room contains a mix of good and stale/wrong-elevation captures, the pin can inherit the *bad* one non-deterministically — which would make the mis-placement look partial/patchy (consistent with the reported "~60/40" pattern) and potentially flaky between loads. This is a **contributing amplifier at most**: it presupposes wrong z values already exist in `captures_360`, and it cannot explain PowerBI showing the same symptom. Worth a dev's attention only if XYZ decides to remediate on our side rather than by re-upload.

### Distinct, already-diagnosed issue — do NOT conflate

`hc-frontend/docs/viewerpage-vs-dashboard-pinpoint-comparison.md` documents a *separate* new-dashboard-only pin bug: a **metres-vs-millimetres PBP unit mismatch** (V2 survey PBP in m vs Forge globalOffset in mm) that put dashboard pins ~×1000 / hundreds of km off the model. That is **not** PLT-2649: (a) it would break 100% of pins catastrophically off-model, not "too high but ~60% roughly right"; (b) it would not appear in PowerBI (separate tool); (c) Quality pins currently render correctly, so that unit fix is effectively in place. Mentioned only to pre-empt re-litigation.

---

## Doc refs

- `xyz-platform-context/dashboard/360-tab.md:47-53` — "Pinpoints in the viewer": says pin coords come "from its `modelRoomId`". **Minor doc inaccuracy:** the code actually uses the *capture record's own* `xMeters/yMeters/zMeters` (`FIRST()` per room), not a room-elevation lookup. Doesn't change the diagnosis (either way it is source data), but flagged for a doc fix.
- `xyz-platform-context/dashboard/viewer-and-model.md:62-71` — `applyRefPoint` / `applyScaling:'m'` coordinate origin + unit handling (context for the transform).
- `xyz-platform-context/dashboard/pitfalls.md` — **no** existing pin-elevation/Z-offset or capture-coordinate pitfall documented (checked). Add one once this closes.
- `xyz-platform-context/planning/PLT-2751-360-zoom-slider-bug.md` — sibling 360 bug, but **unrelated mechanism** (slideshow zoom state, not viewer pin placement). No shared root cause.
- `xyz-platform-context/incidents/live-incident-playbook.md` — tone/pattern used for the recommended reply.

---

## NEEDS HUMAN (attachments/media I cannot read)

- ⚠️ **`image-20260506-094327.png`** (684 KB, Masum Ahmed, 2026-05-06) — the reporter's screenshot, presumably new-dashboard 360 pins floating high vs PowerBI. **Key evidence; not readable here** (binary PNG behind Atlassian auth). Do not guess contents.
- ⚠️ **`Screenshot 2026-05-11 154311.png`** (1.22 MB, Ilia Kuzmin, 2026-05-11) — attached with the "PowerBI same problem / Quality tab correct / 60% roughly right" comment; presumably shows the 60/40 pattern. **Key evidence; not readable here.**
- ⚠️ **Inline description image** — a broken `blob:` URL (`id=UNKNOWN_MEDIA_undefined`); likely the same as the 05-06 PNG. Not resolvable.
- ⚠️ The precise quantities the human needs — **how high (metres), which specific captures/rooms, exact good/bad fraction** — live only in these screenshots and in Freshdesk #6622. My analysis relies on the thread's *textual* descriptions of them, not the images.

## Roster / ownership flags

- **Masum Ahmed** (reporter + assignee) — **NOT on the provided roster.** Behaves as a support/Freshdesk agent (posts all #6622 status mirrors). A support agent should not remain the assignee of an incident whose next step is a product/data decision.
- **Rishi Bhugobaun** — on roster (Rishi, senior fullstack). One housekeeping comment only.
- **Ilia Kuzmin** — the current operator (ilia.kuzmin@xyzreality.com), FE / "mechanism interrogator" in the playbook. Driving the analysis; not in the routing roster but internal.
- **Yash Patel** — on roster (coordinator). Relaying client comms, as expected.
- **Pietro Desiato** ("Pietro") — on roster (product owner). The correct escalation target; his unanswered 2026-06-30 question is the pivot.

---

## Working hypothesis + confidence

**Hypothesis:** PLT-2649 is a **source-data defect, not a frontend bug** — a subset (~40%, unverified) of PA12's 360 capture coordinates carry a wrong elevation (Z), most plausibly because those captures were positioned against a superseded project base point / room elevation in the Revit model ("inherited the old pbp"). The viewer transform and the Quality-tab equivalent are provably correct, and the symptom reproduces in legacy PowerBI, so no frontend code change would fix it.

**Confidence (per CLAUDE.md scale):**
- That the class of cause is **data, not new-dashboard code** — **8/10** (multiple independent confirmations; identical shared transform works for Quality).
- That the **precise trigger** is the "old PBP / changed room elevation" and the **remediation path** (customer re-upload vs XYZ-side coordinate remap) — **4/10** (a plausible but unconfirmed hypothesis; not validated by querying `captures_360.zMeters` vs level/room elevation, nor by model-version history; the quantifying screenshots are unreadable to me).

**Still needed to close (playbook Phase 6):** confirm the **trigger** (did PA12's federated model PBP / level elevations change, and when, relative to the mis-placed captures' upload dates?) and enumerate the **cohort** (which capture/room IDs are off) — both answerable by querying `captures_360` z against `project-levels`/`project-rooms` elevation. Then a single **ownership decision**: customer re-uploads, or XYZ remaps the stale-base-point captures.

---

## Update — 2026-07-15 — root cause NAILED from data exports (conf 4→9)

Ilia supplied four raw PA12 exports (issues, two 360capture pages, roomcapturepoints).
Analysis is in `analysis/` (reproducible: `python3 detect_stale_360.py <dir>`), outputs
`PLT-2649-stale-360-captures.csv` (flagged rows) + `PLT-2649-stale-cohort.json` (IDs).

### Method (the one Ilia proposed: issues = ground truth → envelope → filter 360)
Issues are correctly aligned, so their coordinate span is the valid model envelope.
360 captures outside it — specifically ABOVE it — are stale.

### What the data proved
1. **Vertical axis is `Y`, not Z** (within-level stdev of Y == 0.000 across all 9
   levels; X/Z vary as the horizontal plan). Matches the viewer transform's `swapYZ=true`.
   The earlier "wrong Z" framing was mislabelled — the wrong axis is **Y (elevation)**.
2. **Issue envelope:** Y ∈ [−2.2, 22.1] (real levels L00–L03 = 0.0 / 5.3 / 10.6 / 15.9 m).
3. **The stale cohort is one phantom level.** 1,868 of 6,565 captures-with-coords
   (**28.5%**) sit at **Y = 50.4 m** — a ~50 m spike with a completely empty 16–47 m
   gap beneath it (two disjoint bands). All 1,868 are on **one level id
   `f0f4d409-…`**, spanning **75 rooms / 75 capture points**.
4. **Filenames prove it and give the fix target.** 100% of the 1,868 stale captures
   are filename-floor **`L00` (ground floor)** (`…PH1-L00-FOH-CORRIDOR…`). The 36
   *correctly* placed L00 captures live on the real L00 level **`7026451f`** at
   **Y = 0.0 m**. So `f0f4d409` is a **phantom/duplicate Level-00 defined 50.4 m too
   high**; the correct elevation is **0.0 m** (offset = −50.4 m).
5. **Capture Y == its roomCapturePoint Y exactly** (|dY| max 0.00 over 6,565) →
   staleness is in the **room/capture-point definition**, not per-capture drift.
6. **Not a one-time "old PBP" import.** Stale captures are spread evenly across the
   whole timeline (2025-05 → 2026-07, ~28%/month incl. this month) — new captures
   into these rooms **keep** coming out high. So the defect is a **standing wrong
   elevation on the level/room data**, matching the customer's own words ("problem
   with the room data in the Revit models") more precisely than "inherited the old pbp".
7. Secondary: **30** captures are horizontal (X/Z) outliers within the Y envelope —
   minor, listed as SUSPECT in the CSV, not part of the headline cohort.

### Revised root cause (supersedes §"Working hypothesis")
PA12 has a **duplicate Level-00 (`f0f4d409`, 75 rooms) defined at Y≈50.4 m instead of
0.0 m**. All 1,868 captures assigned to those rooms inherit 50.4 m and render ~50 m too
high in the viewer — in BOTH dashboards (shared upstream data), while Quality/issue pins
(correct data) render fine. This is the whole "~40% too high" symptom, measured at 28.5%.

### Remediation (now concrete — offset & target are known, no re-upload strictly needed)
- **Correct elevation is derivable per capture from data** (filename floor code →
  good-capture elevation map), so an **XYZ-side remap** is viable: for the 75 capture
  points / 75 rooms on level `f0f4d409`, set Y 50.4 → 0.0 (or re-parent to real L00
  `7026451f`). Deterministic, exact IDs in the cohort JSON. This is also exactly the
  "detection pass when PBP changes" Jason floated (07-13) — already implemented here.
- **OR source fix (customer/model):** correct level `f0f4d409`'s elevation in the Revit
  room data. The customer already pointed here.
- Either way we can now hand Pietro the exact list he asked for ("do we have a list of
  those pins?", 07-13) instead of "re-upload everything".

### Confidence (revised)
- Cause = data, wrong **Level-00 elevation** (not new-dashboard code): **9/10**.
- Cohort enumerated (which pins, correct target elevation): **9/10** (exact IDs + offset).
- One residual human check: confirm PA12 has **no genuine ~50 m structure** (near-certain
  — empty 16–47 m gap, zero issues above 22 m, all stale rows are L00 ground-floor).
