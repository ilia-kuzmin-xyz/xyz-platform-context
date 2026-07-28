# PLT-2649 — "[NEW DASHBOARD] PA12 360 pins appear too high" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2649
- **Issue type:** Live Incident ("To track live incidents on site.")
- **Status:** **With Customer** (category: In Progress / yellow) — changed since last check. Freshdesk #6622 mirrored to "Waiting on customer" 2026-07-24 (Yash Patel, comment 108112), matching the Jira status.
- **Priority:** Major
- **Project (site):** PA12
- **Reporter & Assignee:** Masum Ahmed
- **Created:** 2026-05-06 · **Last updated:** 2026-07-24
- **Components / Labels:** none
- **Attachments:** 2 PNG screenshots (see NEEDS HUMAN) + 1 broken inline blob in the description
- **Domain slug:** `360-captures`

---

## DELTA since last check (2026-07-13 → 2026-07-28 re-check)

**Last recorded check:** 2026-07-13, status then "In Analysis," last comment on file was Ilia's 2026-06-30 unanswered question to Pietro. **This re-check found 6 new comments (107234 → 108113) and a status change to With Customer.** Root cause has been **substantially refined and upgraded in confidence** — see revised hypothesis below; the old "captures inherited an old PBP → client re-uploads captures" framing is **superseded**.

1. **2026-07-13 (same day as last check, later that afternoon) — Pietro answered.** Pietro Desiato (comment 107234) replied to Ilia's 06-30 question, asking whether we already have a list of the affected pins, and floated a **product idea**: an in-editor way to adjust pin position, looping in **Jason Fingland** (designer) and **Mostafa Kamel Hussien**. *(Timestamp 13:53 — likely just after the prior triage snapshot was taken that day, which is why it read as "unanswered" then.)*
2. **2026-07-13 — Jason Fingland pushed back** (107238) on broad manual pin-editing (risk of drifting from as-built reality). He proposed instead: detect captures whose position no longer matches their expected level/floorplan after a PBP change ("taken on Level 3 but now appears on Level 4"), and, if editing is wanted, expose X/Y/Z in the existing Editor details panel (supports multi-edit). **This product-design sub-thread was never explicitly closed** — see "Open side-thread" below.
3. **2026-07-16 — Ilia found the precise root cause** (107545): a **specific Revit level**, id `f0f4d409`, has elevation **50.4** where it should be **0**; fix that one value and "rooms→points→captures all inherit it on re-import." This replaces the earlier "old PBP / re-upload captures" hypothesis with a **single source-model data-entry error**.
4. **2026-07-17 — Yash asked which model** (107622) needs the correction.
5. **2026-07-24 — Ilia gave full, quantified detail** (108107): model **`PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24_detached`** (Architectural, V1, uploaded 2025-12-04). Level **"DC - 0G - FFL"** sits at **+50.4 m** vs the rest of the DC building's project datum (DC-01-FFL = 5.3, DC-02 = 10.6, DC-03 = 15.9) — ground floor ends up above the roof. **101 rooms, ~1870 captures** float ~50 m too high as a result. Cause: that level comes from a **linked file inside the federation** whose levels all sit at 48–73 m (a shared-coordinates misalignment), not from any per-capture PBP drift. **Fix:** align the linked file's shared coordinates, or set "DC - 0G - FFL" to ≈0 and re-upload the model — **rooms/points/captures inherit the fix automatically on re-import; no captures need re-taking or re-uploading.**
6. **2026-07-24 — Yash relayed this to the customer** and flipped Freshdesk #6622 to "Waiting on customer" (108112) — **this is why the ticket is now "With Customer."** Not a re-ask of the stalled internal question; the internal question WAS answered (by Ilia's own follow-up investigation, not by Pietro), and the resulting concrete, specific ask has been sent to the client's project delivery team.

**Why the 2026-07-22 run didn't touch this ticket:** consistent with the timeline above, the ticket was almost certainly still **"In Analysis"** on 07-22 — Ilia's decisive comments (precise level ID, model name, elevation values) weren't posted until 07-16 and 07-24, and the Jira status only flipped to "With Customer" on 07-24, two days *after* the 07-22 run. Nothing to fault; the run's ticket-selection by status simply predated the flip.

**Net effect on the working hypothesis:** upgrade, not overturn. The class-of-cause call ("data, not frontend code") holds and is now nailed down precisely: **one linked-file level offset in one federated model**, not a diffuse "60% of captures have a stale PBP." The "~60/40 split" language from May was an eyeball estimate from screenshots; the actual mechanism explains a **discrete, boundaried cohort** (one building's ground floor, 101 rooms / ~1870 captures) rather than a scattered per-capture problem — which fits "distinct floor floats above the roof" better than "random subset misplaced."

**Open side-thread — not blocking, but not closed either:** Pietro/Jason/Mostafa's 07-13 discussion about an in-editor pin-adjustment / mismatch-detection feature (comments 107234, 107238) has had no reply since Jason's 107238. It's now largely moot for *this* incident (Ilia's fix requires no manual pin editing — captures inherit the corrected elevation automatically), but it reads like a live product idea that got overtaken by the faster data-fix path and never got an explicit "shelve it" or "spin it into a backlog ticket." Worth a nudge so it doesn't quietly die mid-thread on an otherwise-closing incident ticket.

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
| 2026-06-30 16:49 | Ilia Kuzmin | @Pietro — "who can assist us with tweaking 60% of the pinpoints… that inherited the old pbp?" |
| 2026-07-13 13:53 | Pietro Desiato | Answers: asks for a list of affected pins; floats in-editor pin-adjust feature idea. @Jason @Mostafa |
| 2026-07-13 14:11 | Jason Fingland | Cautions against broad manual editing; proposes detecting level-mismatched captures instead; if editing wanted, use Editor's X/Y/Z details-panel pattern |
| 2026-07-16 17:39 | Ilia Kuzmin | Root cause pinned: level `f0f4d409` elevation 50.4 → should be 0; fix inherited on re-import, rooms→points→captures |
| 2026-07-17 11:07 | Yash Patel | Asks which model needs the level correction |
| 2026-07-24 13:23 | Ilia Kuzmin | Full detail: model `PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24_detached`; level "DC - 0G - FFL" +50.4m vs datum; 101 rooms/~1870 captures affected; linked-file shared-coords misalignment; fix = correct level + re-upload, no capture re-upload needed |
| 2026-07-24 13:55 | Yash Patel | Freshdesk #6622 → "Waiting on customer" (relayed to client) — **Jira status now With Customer** |
| 2026-07-24 13:56 | Yash Patel | Acks Ilia |

**Staleness:** last movement 2026-07-24 → **~4 days** since last comment (as of 2026-07-28); genuinely waiting on an external party (client project delivery), not stalled on an internal unanswered question.

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
