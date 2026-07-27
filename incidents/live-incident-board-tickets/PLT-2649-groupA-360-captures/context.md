# PLT-2649 — "[NEW DASHBOARD] PA12 360 pins appear too high" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2649
- **Issue type:** Live Incident ("To track live incidents on site.")
- **Status:** **With Customer** (as of 2026-07-24). Freshdesk #6622 set to "Waiting on customer" (Yash Patel, 2026-07-24). *Previously: In Analysis / "Waiting on 3rd line" (2026-06-19) — superseded, see § UPDATE 2026-07-24.*
- **Priority:** Major
- **Project (site):** PA12
- **Reporter & Assignee:** Masum Ahmed
- **Created:** 2026-05-06 · **Last updated:** 2026-07-24
- **Components / Labels:** none
- **Attachments:** 2 PNG screenshots (see NEEDS HUMAN) + 1 broken inline blob in the description
- **Domain slug:** `360-captures`

---

## One-line symptom

On the **new (native) dashboard**, the **360° capture pinpoints render too high (wrong Z / elevation)** in the 3D viewer for project **PA12** — floating above where the capture was actually taken. Reporter framed it as "a lot higher than PowerBI".

---

## UPDATE 2026-07-24 — root cause pinned down exactly (READ THIS FIRST)

**The hypothesis-stage material below is now superseded on the specifics.** The class of cause it identified (source coordinate data, not frontend code) was right; the *mechanism, the exact object, and the scope* are now known precisely, and the remediation is neither of the two options the ticket was previously debating.

**Root cause (Ilia Kuzmin, 2026-07-24 13:23):**

| Field | Value |
|---|---|
| Model | `PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24_detached` (Architectural, version V1, uploaded 2025-12-04) |
| Offending level | `DC - 0G - FFL` — elevation **+50.4 m** |
| Correct value | project datum, **~0 m** |
| Error magnitude | **+50.4 m** |
| Sibling levels (correct, for contrast) | `DC-01-FFL` = 5.3 · `DC-02` = 10.6 · `DC-03` = 15.9 |
| Blast radius | **101 rooms · ~1,870 captures** hosted on that level |
| Consequence | the DC building's ground floor sits *above its own roof*; every 360 pin hosted on it floats ~50 m too high |

**Upstream origin:** the level comes from a **linked file inside the federation** whose levels all sit at **48–73 m** — i.e. the linked file's shared coordinates were never aligned to the rest of the federation. This is the "old pbp" intuition from May, now made concrete: it is not stale captures, it is a mis-elevated level in the federated source model.

**Fix (owner: project delivery, customer side) — one value:**
1. Align the linked file's shared coordinates with the rest of the federation, **or** set `DC - 0G - FFL` to its project-datum elevation (~0).
2. Re-upload **the model**.
3. Rooms → capture points → 360 pins all **inherit** the corrected elevation on re-import.
4. **No captures need to be re-taken or re-uploaded.**

**Why this changes the ticket's shape:**
- The May/June debate — *client re-uploads all 360 captures* vs *XYZ remaps stale-base-point captures* — is **moot**. Both were more expensive and neither was correct. It is a one-value model-source fix plus a model re-upload.
- The "**~60% / 40%**" split was an eyeball estimate off screenshots. **Discard it.** The real shape is not a percentage split of captures — it is *"every capture hosted on one specific level"*: 101 rooms, ~1,870 captures. Hard numbers now, not estimates.
- **Status is now correct.** Yash Patel asked which model to change (2026-07-17 11:07), Ilia answered with the above (07-24 13:23), Yash acknowledged (07-24 13:56) and set Freshdesk #6622 → "Waiting on customer" (07-24 13:55). The ticket has moved from internal paralysis to a genuine external dependency — project delivery making the fix. That is the right place for it to sit.

### Spun-off product idea — NOT part of this ticket's resolution

**Jason Fingland** (product designer, 2026-07-13 14:11) responded to Pietro's earlier "should we let users edit pin position in the 360 editor?" suggestion. His input is a **forward-looking product/roadmap thread**, not a step on PLT-2649's fix path — the fix above requires no UI work at all. Recorded here so it is not lost, and so it is not conflated with the incident:

- **Against free-form pin editing:** *"We were trying to avoid allowing the user the ability to move things about too much, as that could mess with reality on site."*
- **Preferred option — a detection/reconciliation pass:** after a PBP or level change, do a pass over captures and flag ones that no longer match their expected position — *"These captures were taken using the Level 3 Floorplan, but now appear to be higher than Level 4?"* He notes it *"mostly sounds like the height that keeps being off"*.
- **If editing is wanted anyway:** reuse the existing **Edit pattern in the Editor** — surface X/Y/Z in the details panel and allow editing there, which would also enable **multi-edit**.
- **Known edge case he flags:** a single (or few) captures wrong *within* a capture point *"feels like it should be handled by a different flow"*.

→ Treat as a candidate roadmap item (detect-and-flag mismatched captures after a level/PBP change). Should be captured in `dashboard/roadmap.md` or its own ticket if product wants it; **do not** block or extend PLT-2649 on it.

---

## What the thread has ALREADY established (read before re-analysing)

> **Note:** this section is the state of knowledge up to 2026-06-30 and is retained for provenance. Items 3–5 in particular are **superseded** by § UPDATE 2026-07-24 above — the "60/40" estimate and the unanswered-ownership stall no longer describe the ticket.

The `[NEW DASHBOARD]` title is **misleading** — analysis in-thread has already disproven the "new-dashboard-only" framing. Established facts, in order:

1. **The same misplacement exists in the legacy PowerBI dashboard.** Ilia Kuzmin, 2026-05-11 (comment 101985): *"it seems there's an issue with the pinpoints coordinates since the powerbi dashboard has the same problem."* → rules out a new-dashboard code-path regression. **Independently confirmed by the customer**, relayed by Yash Patel 2026-06-05 (comment 104443): *"It's the same on the old one, which suggests a problem with the room data in the Revit models."**
2. **Quality-tab pinpoints are placed correctly** on the same project/model. Ilia, 2026-05-11: *"the pinpoints work correctly on the quality tab."* → the viewer's coordinate-transform pipeline itself is sound; only the 360 inputs are wrong. (Code confirms both tabs share one transform — see Mechanism.)
3. **It is a subset, not all pins.** Ilia, 2026-05-11 and 2026-05-12: *"for 60% of pinpoints the position is almost correct, but for the rest… broken or obsolete and was assigned to another pbp"*; *"60% of captures are assigned to the correct room position, but 40% need a review."* (Note the two comments phrase the split inconsistently — 60% correct/40% wrong vs, on 2026-06-30, "tweaking 60% … that inherited the old pbp." The exact fraction is an eyeball estimate from screenshots, not measured.)
4. **Working hypothesis on the thread (Ilia + Pietro):** elevation is wrong because a subset of captures **"inherited the old pbp"** (project base point) — i.e. captures positioned against a since-superseded model base point / room elevation. Suggested remedy floated by Ilia: *"the client should probably reupload all 360 captures."*
5. **Current stall:** Ilia asked Pietro Desiato (2026-06-30, comment 106186) *"who can assist us with tweaking 60% of the pinpoints position that inherited the old pbp?"* — **unanswered for ~2 weeks** (today 2026-07-13). The ticket is parked on an unassigned ownership question, not on active investigation.

**Net:** root cause is localised to **source coordinate DATA for PA12's 360 captures**, not to frontend rendering. This is well-supported (two independent legacy-repro confirmations + working Quality tab on the same model).

---

## Chronology (all 15 comments)

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
| 2026-06-30 16:49 | Ilia Kuzmin | @Pietro — "who can assist us with tweaking 60% of the pinpoints… that inherited the old pbp?" — went unanswered; **superseded**, see below |
| 2026-07-13 14:11 | Jason Fingland | Product-design input on Pietro's "let users edit pin position?" idea — prefers a **detect-and-flag pass** over free-form editing; suggests X/Y/Z edit in the details panel if editing is wanted. **Spun-off roadmap idea, not this fix** |
| 2026-07-16 17:39 | Ilia Kuzmin | *"we should ask the project delivery to correct level f0f4d409 elevation 50.4 → 0 in the source model. We need one value change; rooms→points→captures all inherit it on re-import."* |
| 2026-07-17 11:07 | Yash Patel | *"Before I ask them to correct level in a model, can you please tell me which model they need to change the level?"* |
| **2026-07-24 13:23** | **Ilia Kuzmin** | **THE ANSWER — full root cause.** Model `PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24_detached`; level `DC - 0G - FFL` at +50.4 m vs datum ~0; 101 rooms / ~1,870 captures affected; origin is a linked file in the federation sitting at 48–73 m; fix = align shared coords or set the level to ~0, then re-upload the model; **no captures need re-taking or re-uploading** |
| 2026-07-24 13:55 | Yash Patel | Freshdesk #6622 → **"Waiting on customer"** |
| 2026-07-24 13:56 | Yash Patel | "Thanks for the info." |

**Staleness:** **none — actively moving.** Last movement 2026-07-24 (3 days ago as of 2026-07-27). The 2026-06-30 stall broke on 07-16/07-24; the ticket is now legitimately parked on an external dependency (project delivery's model fix), not on an unowned internal question.

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

> **Post-2026-07-24 note:** this is now **not needed to explain PLT-2649 at all.** It was invoked to account for the apparent "patchy 60/40" pattern; that pattern was an artefact of the eyeball estimate. The real pattern is clean and level-scoped (every capture on `DC - 0G - FFL`, all off by the same +50.4 m), so no non-determinism is required to explain it. `FIRST(zMeters)` remains a **latent robustness wart** worth logging as tech debt on its own merits — it is no longer part of this incident's causal chain.

### Distinct, already-diagnosed issue — do NOT conflate

`hc-frontend/docs/viewerpage-vs-dashboard-pinpoint-comparison.md` documents a *separate* new-dashboard-only pin bug: a **metres-vs-millimetres PBP unit mismatch** (V2 survey PBP in m vs Forge globalOffset in mm) that put dashboard pins ~×1000 / hundreds of km off the model. That is **not** PLT-2649: (a) it would break 100% of pins catastrophically off-model, not "too high but ~60% roughly right"; (b) it would not appear in PowerBI (separate tool); (c) Quality pins currently render correctly, so that unit fix is effectively in place. Mentioned only to pre-empt re-litigation.

---

## Doc refs

- `xyz-platform-context/dashboard/360-tab.md:47-53` — "Pinpoints in the viewer": says pin coords come "from its `modelRoomId`". **Minor doc inaccuracy:** the code actually uses the *capture record's own* `xMeters/yMeters/zMeters` (`FIRST()` per room), not a room-elevation lookup. Doesn't change the diagnosis (either way it is source data), but flagged for a doc fix.
- `xyz-platform-context/dashboard/viewer-and-model.md:62-71` — `applyRefPoint` / `applyScaling:'m'` coordinate origin + unit handling (context for the transform).
- `xyz-platform-context/dashboard/pitfalls.md` — **no** existing pin-elevation/Z-offset or capture-coordinate pitfall documented. **Re-checked 2026-07-27: still absent — the doc fix flagged in `recommended-action.md` has NOT been made.** Both post-close doc chores remain outstanding: (i) add the pitfalls entry, (ii) fix `360-tab.md:47-53` (re-verified 2026-07-27 — line 49 still reads *"coordinates (xMeters, yMeters, zMeters) from its `modelRoomId`"*, which is inaccurate; the code takes the capture record's own coords via `FIRST()` per room). Flagged only — not actioned here.
- `xyz-platform-context/planning/PLT-2751-360-zoom-slider-bug.md` — sibling 360 bug, but **unrelated mechanism** (slideshow zoom state, not viewer pin placement). No shared root cause.
- `xyz-platform-context/incidents/live-incident-playbook.md` — tone/pattern used for the recommended reply.

---

## NEEDS HUMAN (attachments/media I cannot read)

> **Downgraded 2026-07-27 — the screenshots are no longer load-bearing.** They mattered while the analysis depended on eyeballing *how high* and *what fraction* of pins were wrong. Ilia's 2026-07-24 comment supplies both numerically and from the source model (level `DC - 0G - FFL`, +50.4 m vs datum, 101 rooms / ~1,870 captures), so **the root cause no longer rests on any unreadable image.** The items below are retained as corroborating evidence a human may still want for the customer conversation — they are not blockers, and nothing in this file is now inferred from them.

- ⚠️ **`image-20260506-094327.png`** (684 KB, Masum Ahmed, 2026-05-06) — the reporter's screenshot, presumably new-dashboard 360 pins floating high vs PowerBI. **Key evidence; not readable here** (binary PNG behind Atlassian auth). Do not guess contents.
- ⚠️ **`Screenshot 2026-05-11 154311.png`** (1.22 MB, Ilia Kuzmin, 2026-05-11) — attached with the "PowerBI same problem / Quality tab correct / 60% roughly right" comment; presumably shows the 60/40 pattern. **Key evidence; not readable here.**
- ⚠️ **Inline description image** — a broken `blob:` URL (`id=UNKNOWN_MEDIA_undefined`); likely the same as the 05-06 PNG. Not resolvable.
- ~~⚠️ The precise quantities the human needs — **how high (metres), which specific captures/rooms, exact good/bad fraction** — live only in these screenshots and in Freshdesk #6622.~~ **RESOLVED 2026-07-24 in-thread:** +50.4 m, level `DC - 0G - FFL`, 101 rooms / ~1,870 captures. The "good/bad fraction" framing was itself wrong — it is level-scoped, not fractional.
- Remaining genuinely-human items: (i) confirming with project delivery **when** the corrected model will be re-uploaded (ETA), and (ii) verifying the fix in the viewer after re-import.

## Roster / ownership flags

- **Masum Ahmed** (reporter + assignee) — **NOT on the provided roster.** Behaves as a support/Freshdesk agent (posts all #6622 status mirrors). A support agent should not remain the assignee of an incident whose next step is a product/data decision.
- **Rishi Bhugobaun** — on roster (Rishi, senior fullstack). One housekeeping comment only.
- **Ilia Kuzmin** — the current operator (ilia.kuzmin@xyzreality.com), FE / "mechanism interrogator" in the playbook. Driving the analysis; not in the routing roster but internal.
- **Yash Patel** — on roster (coordinator). Relaying client comms, as expected.
- **Pietro Desiato** ("Pietro") — on roster (product owner). Was the escalation target for the 2026-06-30 question; **that question is now moot** — Ilia resolved the root cause directly on 07-24 without needing it. Pietro's residual involvement is only the spun-off "editable pin position" product thread.
- **Jason Fingland** — **new participant (2026-07-13)**, product designer. Contributes only to the spun-off product idea (detect-and-flag mismatched captures / X-Y-Z edit pattern). **Not an owner of this incident's fix.**
- **Yash Patel** — now the effective driver of the external hand-off: asked the disambiguating question (07-17) and moved Freshdesk #6622 to "Waiting on customer" (07-24). The natural owner of the ETA chase.

---

## Root cause + confidence (revised 2026-07-27)

**Root cause (no longer a hypothesis):** PLT-2649 is a **source-model data defect, not a frontend bug.** In `PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24_detached`, the level `DC - 0G - FFL` carries an elevation of **+50.4 m** where project datum is **~0 m** — inherited from a linked file inside the federation whose levels all sit at 48–73 m, i.e. shared coordinates never aligned to the federation. Every 360 pin hosted on that level (**101 rooms, ~1,870 captures**) therefore renders ~50 m too high. The viewer transform and the Quality-tab equivalent are provably correct and the symptom reproduces in legacy PowerBI, so no frontend change fixes it. **Remediation is one value:** set the level to datum (or realign the linked file's shared coordinates) and re-upload **the model** — rooms, capture points and pins all inherit on re-import; **no captures are re-taken or re-uploaded.**

**Confidence (per CLAUDE.md scale):**

| Claim | Was | Now | Why |
|---|---|---|---|
| Class of cause is **data, not new-dashboard code** | 8/10 | **10/10** | Was already multiply-confirmed (PowerBI repro + working Quality pins on the same transform); the source-model inspection closes it outright. |
| **Precise trigger / mechanism** | 4/10 | **9/10** | No longer "a plausible but unconfirmed hypothesis". Named model, named level, exact elevation (+50.4 m), exact delta against named sibling levels (5.3 / 10.6 / 15.9), and the upstream origin identified (a linked file at 48–73 m). Read off the source model, not inferred from screenshots. |
| **Cohort / scope** | 4/10 (eyeball "~60/40") | **9/10** | **101 rooms, ~1,870 captures** — a counted figure with a crisp boundary condition ("hosted on `DC - 0G - FFL`"). Replaces an estimate from a screenshot with a quantity. |
| **Remediation path** | 4/10 (re-upload vs remap, owner unknown) | **9/10** | Path is concrete, single-step, owner-assigned (project delivery, customer side), and self-evidently correct given the mechanism — the inheritance chain rooms→points→captures makes one value sufficient. |

**Why not 10/10 on the last three:** the fix is stated but **not yet executed or verified** — nobody has seen the corrected model re-import and the pins land. Per the CLAUDE.md scale that is "high confidence, minor unknowns" territory pushing into "can implement solo, fully testable"; the residual is execution risk on the customer side (e.g. realigning shared coordinates may surface other misaligned levels in that linked file), not diagnostic uncertainty. **The diagnosis itself is as pinned-down as an incident gets.**

**Playbook Phase 6 status (cause / trigger / cohort):**
- **Cause** ✔ — mis-elevated level in the federated source model.
- **Trigger** ✔ — the linked file was federated without its shared coordinates aligned; present since the model's 2025-12-04 upload (V1), which is why this was never "working before".
- **Cohort** — ✔ *within PA12* (101 rooms / ~1,870 captures on one level). ✖ **across the estate**: nobody has checked whether other PA12 levels, or other projects, contain linked files federated at the wrong elevation. See `recommended-action.md` — this is the one genuinely open thread.
- **Follow-ups** ✖ — the two doc chores (pitfalls entry, `360-tab.md:47-53` fix) are still outstanding; `FIRST(zMeters)` non-determinism is unlogged tech debt.
