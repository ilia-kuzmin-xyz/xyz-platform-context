# PLT-2649 — "[NEW DASHBOARD] PA12 360 pins appear too high" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2649
- **Issue type:** Live Incident ("To track live incidents on site.") · Software Area: Dashboard
- **Status:** **With Customer** (category: In Progress / yellow) — ⚠️ **changed 2026-07-24 13:55** from `In Analysis`. Freshdesk #6622 set to "Waiting on customer" the same minute.
- **Priority:** Major
- **Project (site):** PA12
- **Reporter:** Masum Ahmed · **Assignee:** **Yash Patel** — ⚠️ **changed** (was Masum Ahmed on 07-13; the "get support off the assignee seat" follow-through from the last run has effectively happened)
- **Created:** 2026-05-06 · **Last updated:** 2026-07-24 13:56
- **Comments:** 16 (was 9 at the 07-13 run) · **Issue links:** none
- **Components / Labels:** none
- **Attachments:** 2 PNG screenshots (see NEEDS HUMAN) + 1 broken inline blob in the description
- **Domain slug:** `360-captures` (unchanged — still correct)
- **Group tag:** `groupA` (unchanged — `With Customer` is in-scope-but-parked per the README scope rules, so no folder rename)

---

## ⚠️ Re-check 2026-07-29 — THIS TICKET MOVED A LOT. Read this section first.

The 07-13 note in the board README ("*decision Q → Pietro, unanswered ~2 weeks, conf 8/10*") is **out of date**, and the 07-22 run **missed this ticket** (see § Routine gap below). Since 07-13 the ticket went from *stalled on an unowned ownership question* to **root cause pinned to a single named value, remediation specified, ball legitimately with the customer**.

**What changed, in one paragraph:** Pietro **did** respond (2026-07-13 13:53) — but not to the re-upload-vs-remap question as posed; he asked for the list of bad pins and pivoted to a product idea (edit pin position in the 360 editor), looping in Jason Fingland and Mostafa. Jason pushed back on free-hand pin editing the same afternoon. Then Ilia Kuzmin found the actual cause and it is **not** "40% of captures inherited an old PBP": it is **one level with a wrong elevation in one linked architectural file** — level `f0f4d409` ("DC - 0G - FFL") sitting at **+50.4 m** instead of ≈0, so every 360 pin hosted on it (**101 rooms, ~1870 captures**) floats **~50 m** too high. The remediation is a **one-value fix in the source model + re-upload** — **no captures need re-taking or re-uploading**, which retires the earlier "client should reupload all 360 captures" suggestion entirely. Yash relayed the ask; ticket → With Customer 07-24.

**Elapsed-time picture (corrected):** the 07-13 stall did **not** last 2.5 weeks — it broke the same day (Pietro replied 13:53 on 07-13). Current staleness is **5 days** since the last activity (2026-07-24 → today 2026-07-29), and those 5 days are legitimately customer-side. Total ticket age: **84 days** (created 2026-05-06). Time from first report to pinned root cause: **79 days**.

**Confidence moved up:** root cause 8/10 → **9/10**; remediation path 4/10 → **8/10**. See § Working hypothesis.

### Routine gap to note (process, not ticket)

By 2026-07-22 there were already **four** unread comments on this ticket (07-13 ×2, 07-16, 07-17), including Pietro's answer and Ilia's root-cause comment. PLT-2649 appears **nowhere** in the 07-22 README run entry — not in the Group A table, not in "closed since last run", not in "unchanged". So it was **skipped**, not "checked with no change". The README's ambiguity on that point is what this re-check had to resolve; worth making the 07-22-style entries explicitly list *every* carried-over folder, even as "unchanged", so a silent miss is distinguishable from a no-op.

---

## One-line symptom

On the **new (native) dashboard** *and* in legacy PowerBI, **360° capture pinpoints render ~50 m too high** in the 3D viewer for project **PA12** — the pins for one whole level float above the building. Reporter framed it as "a lot higher than PowerBI"; the "new dashboard only" framing in the title was disproven on 2026-05-11 and is a red herring.

---

## Root cause — as of 2026-07-24, pinned to a single value

Ilia Kuzmin, comment 108107 (2026-07-24 13:23), verbatim substance:

- **Model:** `PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24_detached` — Architectural, **version V1, uploaded 2025-12-04**.
- **Bad value:** level **`DC - 0G - FFL`** (level id `f0f4d409`, from comment 107545) sits at elevation **+50.4 m**.
- **Reference (what it should be):** the rest of the DC building is at project datum — `DC-01-FFL = 5.3`, `DC-02 = 10.6`, `DC-03 = 15.9`. So the **ground floor ends up above the roof**.
- **Cohort, quantified:** all 360 pins hosted on that level — **101 rooms, ~1870 captures** — float **~50 m** too high. (Arithmetic is self-consistent: 50.4 − ≈0 ≈ 50.)
- **Upstream why:** the level "comes from a **linked file inside the federation whose levels all sit at 48–73 m**" — i.e. that link's shared coordinates are not aligned with the rest of the federation.
- **Fix:** align that linked file's shared coordinates with the federation, **or** set `DC - 0G - FFL` to its project-datum elevation of ≈0, then **re-upload the model**. *"Rooms, capture points and 360 pins will all inherit the corrected elevation on re-import. No captures need to be re-taken or re-uploaded."*

**This supersedes the old working hypothesis.** The 05-11/05-12/06-30 thread framing ("~60% roughly right / 40% inherited another pbp", "tweaking 60% of the pinpoints") was an **eyeball estimate off screenshots** and pointed at a per-capture PBP problem. The real defect is **per-level and uniform**: one level's elevation is wrong, so *every* capture hosted on it is wrong by the *same* amount, and captures on other levels are fine. That also dissolves the long-standing inconsistency in the thread about whether 60% or 40% was the broken share — neither figure was measured, and the meaningful number is "the captures on one of PA12's levels".

**What is NOT the cause (do not re-litigate):**
- Not a new-dashboard code path — reproduced in PowerBI (Ilia 05-11; customer-confirmed via Yash 06-05).
- Not the viewer coordinate transform — Quality pins run the identical transform and are correct on the same model (see § Mechanism).
- Not the metres-vs-millimetres PBP unit mismatch documented in `hc-frontend/docs/viewerpage-vs-dashboard-pinpoint-comparison.md` — that would break 100% of pins by ~×1000 and would not appear in PowerBI.
- Not the `FIRST(zMeters)` non-determinism noted in the last run (see § Secondary code note — now demonstrably irrelevant to *this* incident).

---

## Chronology (all 16 comments — new since last run marked 🆕)

| Date | Author | Content |
|------|--------|---------|
| 2026-05-06 09:50 | Masum Ahmed | Freshdesk #6622 mirror → "Waiting on 3rd line" |
| 2026-05-06 10:35 | Rishi Bhugobaun | "attachment seems to be missing for this one too" |
| 2026-05-06 10:43 | Masum Ahmed | Re-posts screenshot (`image-20260506-094327.png`) |
| 2026-05-11 15:50 | Ilia Kuzmin | PowerBI has same problem; Quality tab pins correct; ~60% almost-correct, rest "broken or obsolete and was assigned to another pbp"; suggests client re-upload all 360 captures. @Pietro (`Screenshot 2026-05-11 154311.png`) |
| 2026-05-12 16:44 | Ilia Kuzmin | Ask customer to check the **pbp of the model rooms**; Pietro thinks **elevation may be wrong**; 60% correct / 40% need review |
| 2026-05-14 16:56 | Masum Ahmed | Freshdesk #6622 → "Waiting on customer" |
| 2026-06-05 13:49 | Yash Patel | Customer reply: *"It's the same on the old one, which suggests a problem with the room data in the Revit models"* |
| 2026-06-19 08:51 | Yash Patel | Freshdesk #6622 → "Waiting on 3rd line" (back to us) |
| 2026-06-30 16:49 | Ilia Kuzmin | @Pietro — "who can assist us with tweaking 60% of the pinpoints position that inherited the old pbp? the rest part is working fine." |
| 🆕 2026-07-13 13:53 | **Pietro Desiato** | **Answers** — *"do we already have a list of those pins? I think it could be interesting to have in the 360 editor a way of adjust the pin position from the editor"* — @Jason Fingland @Mostafa Kamel Hussien. ⚠️ Does **not** decide re-upload vs remap; opens a **third, product-shaped option** and asks for the cohort list |
| 🆕 2026-07-13 14:11 | **Jason Fingland** (product designer) | Design pushback: *"We were trying to avoid allowing the user the ability to move things about too much, as that could mess with reality on site."* Prefers an **automated detection pass** — *"If the user changes the PBP, could we do a pass on the captures and see which ones no longer match their expected position? i.e. 'These captures were taken using the Level 3 Floorplan, but now appear to be higher than Level 4?'"* — noting *"it mostly sounds like the height that keeps being off"*. If editing is wanted: reuse the Editor's existing **Edit pattern**, show X/Y/Z in the details panel, allow **multi-edit** across selected capture points; single-capture-within-a-point is *"a different flow"*. **Mostafa never replied.** |
| 🆕 2026-07-16 17:39 | Ilia Kuzmin | **Root cause, first statement:** @Yash — *"we should ask the project delivery to correct level `f0f4d409` elevation 50.4 → 0 in the source model. We need one value change; rooms→points→captures all inherit it on re-import."* |
| 🆕 2026-07-17 11:07 | Yash Patel | *"Before I ask them to correct level in a model, can you please tell me which model they need to change the level?"* |
| 🆕 2026-07-24 13:23 | Ilia Kuzmin | **Full root-cause + remediation note** — model name/version, `DC - 0G - FFL` at +50.4 vs DC-01/02/03 at 5.3/10.6/15.9, "ground floor above the roof", **101 rooms / ~1870 captures**, linked-file levels at 48–73 m, fix = align shared coordinates or set to ≈0 + re-upload, **no capture re-upload needed** |
| 🆕 2026-07-24 13:55 | Yash Patel | Freshdesk #6622 → **"Waiting on customer"** (ticket status → **With Customer**) |
| 🆕 2026-07-24 13:56 | Yash Patel | *"Thanks for the info."* |

**Response latency worth noting:** Yash's "which model?" (07-17 11:07) waited **7 days** for the answer (07-24 13:23) — the single largest remaining delay in the thread, and it was on our side, not the customer's.

---

## Mechanism — why a wrong *level* elevation shows up as a wrong *pin* Z (code-verified)

Two facts have to hold together for Ilia's diagnosis to be coherent, and the FE code confirms the FE half of it.

**(1) The FE never reads level elevation for pin placement.** Pin Z comes straight from the capture record's own stored coordinate:

1. `Dashboard360Service._queryAllData()` builds one pin per room from the capture rows: `FIRST(c.xMeters)`, `FIRST(c.yMeters)`, **`FIRST(c.zMeters)`** from table `captures_360` — `hc-frontend/src/main/webapp/app/pages/organisation/ViewerPage/components/services/dashboard-360/dashboard-360-service.ts:544-546` (query 532-556; table DDL 232-254; comment *"Include coordinates from first capture for viewer pinpoint rendering"* at 529-531).
2. Reactive bridge maps each `roomSummary` → `IProjectImage` with `zPosition: room.zMeters` — `.../components/dashboard-panels/viewer/hooks/use-pinpoints-reactive-render.ts:42` (and the initial-render twin at `use-pinpoints-initial-render.ts:63`).
3. `DashboardImageService.renderImages()` extracts `x/y/zPosition` via `extractImageCoordinates` — `.../dashboard-image-service.ts:211-268`; extractor `.../ViewerPage/utils/coordinate-extractors.ts:50-52`.
4. `DashboardPinpointBaseService._transformCoordinates()` → `transformPushPinsToViewer(dbPos, pbpData, rotMatrix, globalOffset, swapYZ=true)` — `.../dashboard-pinpoint-base-service.ts:176-185`, called at `:213`; transform at `.../services/coordinate/utils/coordinate-transforms.ts:10-34`. With `swapYZ=true` the capture's **`zMeters` becomes the viewer's vertical axis**, then rotation + PBP add + globalOffset subtract.

Meanwhile `project-levels.elevation` is loaded by the FE **only as metadata** — for the Level filter dropdown and the level list: `dashboard-360-service.ts:360-366` (`ILevelMetadata.elevation`), `:414-421` (the normalized `levels` table it creates: `modelLevelId, levelName, elevation, sourceFileLevelId`), and `.../services/duckdb/duckdb-room-store.ts:74-84, 103-113, 172-186`. **No FE code path uses `elevation` to position a pin.** Consequence: **a wrong level elevation is completely invisible to the frontend** — it can only reach the viewer already baked into `captures_360.zMeters`.

**(2) Corroboration that the transform is innocent:** Quality issue pins run the *identical* path (`DashboardIssueService` extends the same base; `extractIssueCoordinates` reads `xMeters/yMeters/zMeters`, `coordinate-extractors.ts:38-44`) and are reported correct on the same PA12 model. Same transform + same PBP + same globalOffset + same model ⇒ the only variable is the input coordinate.

**⚠️ Honest scoping — the ingestion half is NOT code-verified here.** Ilia's claim that *"rooms → points → captures all inherit"* the level elevation on re-import is a **backend/ingestion** claim. This repo (`hc-frontend`) only *consumes* `captures_360.zMeters` from the API v2 `360captures` endpoint; nothing here shows how that value is derived from the host level. The claim is strongly *circumstantially* supported — the offset magnitude (~50 m) matches the level error (50.4 → ≈0) almost exactly, and `project-levels` carries `sourceFileLevelId`, i.e. levels are tracked with their originating-file provenance, exactly as a mis-referenced federation link would produce. But "one value change fixes 1870 captures with no re-upload" is an assertion that should be **verified on re-import**, not assumed. See § Still open, item 3.

### Secondary code note (now demonstrably not the cause — downgraded)

`FIRST(c.zMeters)` is a DuckDB aggregate over `GROUP BY c.modelRoomId, r.name, r.levelName` with **no `ORDER BY` inside the group** (`dashboard-360-service.ts:544-546, 554`), so it returns an *arbitrary* capture's coordinate per room. Last run this was flagged as a possible amplifier of a "patchy 60/40" pattern. **With the real cause known, it is irrelevant to PLT-2649**: the whole level is offset uniformly, so every capture in those 101 rooms carries the *same* wrong Z and which one `FIRST()` picks makes no difference. Keep it only as a **latent robustness/tech-debt item** (a room mixing good and bad captures would render non-deterministically between loads) — not part of this incident, and not a reason to route this ticket to Dev.

---

## Doc refs

- `xyz-platform-context/dashboard/360-tab.md:49` — "Each 360 capture has spatial coordinates (xMeters, yMeters, zMeters) **from its `modelRoomId`**". **Still inaccurate** and now worth fixing with the sharper statement: pin Z is the *capture record's own* `zMeters` (`FIRST()` per room), and `project-levels.elevation` is FE metadata only (filter/level list) — so a bad level elevation cannot be seen or corrected in the FE.
- `xyz-platform-context/dashboard/viewer-and-model.md:62-71` — `applyRefPoint` / `applyScaling:'m'` origin + unit handling (context for the transform).
- `xyz-platform-context/dashboard/pitfalls.md` — **still no** pin-elevation / capture-coordinate pitfall entry (re-checked). Add one on close; see recommended-action § Follow-through.
- `xyz-platform-context/planning/PLT-2751-360-zoom-slider-bug.md` — sibling 360 bug, unrelated mechanism (slideshow zoom state). No shared root cause.
- `hc-frontend/docs/viewerpage-vs-dashboard-pinpoint-comparison.md` — the *separate*, already-fixed m-vs-mm PBP mismatch. Explicitly not this ticket.

---

## NEEDS HUMAN (attachments/media I cannot read)

Unchanged from the last run — **no new attachments** were added in the 07-13…07-24 comment burst. Importantly, these are now **corroborative rather than decisive**: the quantities they were needed for (offset magnitude, which captures, what fraction) have since been established textually by Ilia's 07-24 analysis (~50 m, 101 rooms, ~1870 captures, level `DC - 0G - FFL`).

- ⚠️ **`image-20260506-094327.png`** (684 KB, Masum Ahmed, 2026-05-06, attachment id 57268) — reporter's screenshot, presumably new-dashboard 360 pins floating high vs PowerBI. Binary PNG behind Atlassian auth; **not readable here**. Do not guess contents.
- ⚠️ **`Screenshot 2026-05-11 154311.png`** (1.22 MB, Ilia Kuzmin, 2026-05-11, attachment id 57477) — attached with the "PowerBI same problem / Quality tab correct / 60% roughly right" comment. **Not readable here.**
- ⚠️ **Inline description image** — broken `blob:` URL (`id=UNKNOWN_MEDIA_undefined`); likely a duplicate of the 05-06 PNG. Not resolvable.
- ⚠️ **Freshdesk #6622** — the customer-facing side of the thread (including whatever project delivery replies to the 07-24 ask) is not visible from Jira. Anything about the customer's actual response lives there.
- One thing a human *could* still get from the screenshots: an **independent read of the offset magnitude** (does the pin cluster sit ~50 m up, consistent with 50.4?). That would convert the arithmetic corroboration into an observational one. Nice-to-have, not blocking.

---

## Roster / ownership flags (updated)

- **Yash Patel** — on roster (coordinator). **Now the assignee** (was Masum Ahmed) and the owner of the customer channel. Correct seat for a `With Customer` ticket.
- **Masum Ahmed** — reporter, **off-roster** (support/Freshdesk agent). No longer assignee ✅ — the last run's "get support off the assignee seat" follow-through has happened.
- **Ilia Kuzmin** — the investigator (`ilia.kuzmin@xyzreality.com`), playbook "mechanism interrogator". Produced the root cause. Not the assignee, and the ticket carries no record of who owns the **post-fix verification**.
- **Pietro Desiato** — on roster (product owner). Answered 07-13; his contribution redirected toward a **product capability**, not the data fix. Has not commented since.
- **Jason Fingland** — on roster (product designer). One substantive design comment (07-13). His "automated detection pass" idea is arguably the more valuable long-term output of this incident.
- **Mostafa Kamel Hussien** — on roster (product owner). @-mentioned by Pietro 07-13, **never replied**. The product-side thread has no owner as a result.
- **Rishi Bhugobaun** — on roster (senior fullstack). One housekeeping comment only, back in May.
- **"Project delivery"** — the party that must actually change the model. Named only as a role; **no individual is identified anywhere on the ticket**, which is a real handoff risk (see recommended-action).

---

## Working hypothesis + confidence

**Hypothesis (now near-confirmed):** PLT-2649 is a **source-model data defect** — level `f0f4d409` / `DC - 0G - FFL` in `PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24_detached` carries elevation **+50.4 m** instead of its project-datum ≈0, because it originates from a federated **linked file whose levels all sit at 48–73 m** (shared coordinates not aligned). Rooms and capture points hosted on that level inherit the bad elevation, which propagates into `captures_360.zMeters`, which is exactly what the viewer plots. Remediation is one value in the source model plus a model re-upload; captures themselves are fine.

**Confidence (per CLAUDE.md scale):**
- Class of cause is **data, not dashboard code** — **9/10** (was 8). Two independent legacy-repro confirmations, identical shared transform provably correct for Quality pins, and the FE now shown to have no code path that could produce a per-level Z offset.
- The **specific bad value** (level `f0f4d409` at 50.4 vs siblings at 5.3/10.6/15.9) and the **cohort** (101 rooms / ~1870 captures) — **8/10**. Specific, internally consistent, and consistent with the ~50 m symptom; but sourced from a single investigator's query with no artifact posted in-thread and no second pair of eyes.
- The **remediation** ("one value change, everything inherits on re-import, no capture re-upload") — **8/10** (was 4). Mechanically plausible and matches the `sourceFileLevelId` provenance model; but the ingestion inheritance is not code-verified in this repo and has not been demonstrated by an actual re-import.
- **Trigger** ("why now") — **3/10**. Barely addressed; see below.
- **Cross-project cohort** (other projects with mis-datumed federation links) — **2/10**. Never asked.

## Still open to close properly (playbook Phase 6)

1. **Trigger / "why now" — effectively unanswered.** The model version carrying the bad level was uploaded **2025-12-04**; the incident was reported **2026-05-06**, five months later. So the most likely reading is *not* a regression at all: the level was wrong from that upload, and the symptom only surfaced when captures on that level were taken/first viewed. Nobody has said this on the ticket. Per the playbook, an unanswered "why now" is an open incident wearing a closed label — it should be **stated explicitly** ("no dated regression; wrong since the 2025-12-04 upload") rather than silently dropped.
2. **Model identity ambiguity — a likely bounce risk.** Ilia's 07-24 comment says *"version V1, uploaded 2025-12-04"* while the filename itself contains **`_V14_R24`**. Almost certainly two different numbering schemes (platform upload version vs the client's own file revision), but a project-delivery recipient reading "V1" against a file named "V14" can easily conclude the wrong file. Should be disambiguated in one line before/with the relay.
3. **Verification of the fix is unplanned and unowned.** Nothing on the ticket says how we confirm success after re-upload (re-check pin Z across the 101 rooms / `captures_360.zMeters` for that level), who does it (QA — Gennaro or Radu — or Ilia), or what the acceptance figure is. Without this the ticket will close on "looks fine now", which the playbook explicitly rejects.
4. **Cross-project cohort never swept.** The generalizable class is "a federated linked file whose levels sit at a foreign datum silently mis-places every level-hosted entity (360 pins here; plausibly anything else positioned off level elevation)". A cheap sweep — for each project, flag levels whose elevation is a large outlier vs its siblings, or whose `sourceFileLevelId` provenance groups sit in a different band — would find the next PA12 before a customer does. Nobody has proposed it.
5. **The product/design thread is unowned and unticketed.** Pietro's "adjust pin position in the 360 editor" and Jason's counter-proposals (automated level-mismatch detection pass; Edit-pattern X/Y/Z editing with multi-select) are a genuine **feature discussion riding inside a live incident**. `issuelinks` is empty — no follow-up ticket exists. Mostafa, the other @-mentioned owner, never replied. Two risks: it holds the incident open after the data fix lands, or it evaporates when the incident closes. Needs to be split out (playbook: label side-findings loudly and give them their own track + owner).
