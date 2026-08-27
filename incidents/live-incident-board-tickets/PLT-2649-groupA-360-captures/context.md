# PLT-2649 — "[NEW DASHBOARD] PA12 360 pins appear too high" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2649
- **Issue type:** Live Incident ("To track live incidents on site.")
- **Status:** **With Customer** (category: In Progress / yellow) — moved 2026-07-24 13:55.
  Freshdesk #6622 set to **"Waiting on customer"** 2026-07-24.
- **Priority:** Major
- **Project (site):** PA12
- **Reporter:** Masum Ahmed · **Assignee: Yash Patel** (⚠️ *changed since the 07-13 run — was Masum Ahmed*)
- **Created:** 2026-05-06 · **Last updated:** 2026-07-24 13:56 (2026-08-03 re-check: still 07-24, unchanged)
- **Components / Labels:** none
- **Attachments:** 2 PNG screenshots (see NEEDS HUMAN) + 1 broken inline blob in the description
- **Domain slug:** `360-captures`
- **Comment count:** 16 (was 9 at the 07-13 run — **7 new**)

---

## ⚡ STATUS CHANGE SINCE LAST RUN — READ THIS FIRST

The 07-13 run left this ticket parked on an unanswered ownership question
("re-upload vs XYZ remap → Pietro"). **That question is now closed, and the
answer is neither option.** The ticket has moved further in the last two weeks
than in the preceding two months.

**The root cause is now pinned to a single, named, falsifiable data defect**
(Ilia Kuzmin, 2026-07-24, comment 108107):

> Model **`PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24_detached`** (Architectural,
> version **V1**, uploaded **2025-12-04**). In it, level **"DC - 0G - FFL"**
> (id `f0f4d409…`) sits at elevation **+50.4 m**, while the rest of the DC
> building is at project datum (DC-01-FFL = 5.3, DC-02 = 10.6, DC-03 = 15.9).
> The ground floor therefore ends up **above the roof**, and all 360 pins
> hosted on it — **101 rooms, ~1870 captures** — float **50 m too high**.
>
> That level comes from a **linked file inside the federation whose levels all
> sit at 48–73 m** (shared-coordinates misalignment). Fix: align the linked
> file's shared coordinates with the rest of the federation, **or** set
> "DC - 0G - FFL" to its project datum elevation of ~0, then **re-upload the
> model**. Rooms, capture points and 360 pins all inherit the corrected
> elevation on re-import. **No captures need to be re-taken or re-uploaded.**

**This supersedes three things the 07-13 context recorded:**

| 07-13 record | Now |
|---|---|
| "client should probably **re-upload all 360 captures**" (Ilia, 05-11) | ❌ Superseded — **no capture re-upload needed**; one level value in the **source model**, then re-upload the *model* |
| "**~60/40** split, eyeball estimate" | ❌ Superseded — the real cohort is "**rooms hosted on the one bad level**": 101 rooms / ~1870 captures. The 60/40 was a screenshot guess (and was stated inconsistently in both directions across comments) |
| "old **pbp** inherited" | ⚠️ Refined — not a project-base-point issue; a **level elevation** issue originating from an unaligned **linked file's shared coordinates** |

**The (a)-re-upload vs (b)-XYZ-remap decision drafted on 07-13 was never
answered as posed, and is now moot** — Ilia self-served the diagnosis and
produced option (c): a one-value source-model correction by project delivery.

---

## ⚠️ Update — 2026-07-24 re-check: root cause now CONFIRMED to a single value; stalled 7 days on OUR OWN unanswered question

**This ticket was not touched in the 2026-07-22 run** (it re-checked 2918/2917/2909/2906/2884/2882/2858 only — see `README.md`). Four real comments landed after the 2026-06-30 "last activity" this file previously recorded, and they change the picture substantially:

| Date | Author | Content |
|---|---|---|
| 2026-07-13 13:53 | **Pietro Desiato** | Answers Ilia's 06-30 ownership question indirectly — asks back: *"do we already have a list of those pins? I think it could be interesting to have in the 360 editor a way of adjust the pin position from the editor"* — @Jason Fingland @Mostafa |
| 2026-07-13 14:11 | **Jason Fingland** (product designer) | Pushes back on free-form pin editing (*"could mess with reality on site"*); proposes instead: detect when a PBP change makes existing captures inconsistent with their recorded floor/level (*"these captures were taken using the Level 3 Floorplan, but now appear higher than Level 4"*), and separately floats showing X/Y/Z in the details panel with multi-edit if XYZ does want manual editing |
| **2026-07-16 17:39** | **Ilia Kuzmin** | **⭐ The root-cause finding, not in the previous doc at all:** *"we should ask the project delivery to correct level `f0f4d409` elevation **50.4 → 0** in the source model. We need one value change; rooms→points→captures all inherit it on re-import."* — this is no longer a hypothesis ("~40% inherited an old pbp"); it names **one specific level object, its current wrong elevation, and its correct value**, and states the inheritance chain explicitly (level → rooms → points → captures). |
| **2026-07-17 11:07** | **Yash Patel** | *"Before I ask them to correct level in a model, can you please tell me **which model** they need to change the level? Thank you."* — **unanswered for 7 days as of this 07-24 re-check.** |

**Net effect on the diagnosis:** the "~60/40, unconfirmed trigger" framing in the rest of this file (§ chronology, § confidence) is now **superseded** — Ilia's 07-16 comment reads as a confirmed, specific finding (a named level object with a named bad value), not the earlier eyeballed fraction. The **only thing separating this ticket from being handed back to the client with a precise, actionable fix request is one fact Ilia already has and hasn't posted: which model contains level `f0f4d409`.**

**This is the same failure shape as PLT-2906** (sibling ticket, same investigator): the customer/team is not the blocker — **our own unposted answer is**. Yash asked a closed, one-value question exactly per the playbook's "one question per message, phrased so it can be answered with a value" — and it has sat for a week.

**Revised confidence (2026-07-24):**
- **That the class of cause is data (level elevation), not frontend code:** **9/10** (up from 8/10) — Ilia's 07-16 finding names a specific level + specific wrong value + explicit inheritance chain (level → rooms → points → captures), which is a much stronger claim than the earlier "~40% inherited an old pbp" eyeball estimate.
- **Precise trigger / remediation path:** now effectively **decided in principle** (correct the one elevation value, re-import) — what's missing is purely the pointer (which model), not a mechanism question. This flips the old "4/10, unvalidated hypothesis" line below into a "trivial to close, if answered" state.

**Recommended immediate action (see `recommended-action.md` for full draft): answer Yash's 07-17 question today.** This is not a re-investigation — it is surfacing a fact Ilia's own 07-16 comment implies he already has (he named the level id and its wrong/correct values; the model it belongs to should be a lookup, not new analysis).

---

---

## One-line symptom

On PA12, **360° capture pinpoints render ~50 m too high** in the 3D viewer for
every room hosted on level "DC - 0G - FFL" — because that level's elevation in
the source Revit federation is +50.4 m instead of ~0. Reproduces identically in
legacy PowerBI; the `[NEW DASHBOARD]` framing in the title is a red herring.

---

## New activity since the 07-13 / 07-22 runs (7 comments — full digest)

> The 07-22 detailed run did **not** re-examine this ticket (the README's
> "unchanged" note covers PLT-2815 and PLT-2619 only, not 2649). Everything in
> this section is new to the durable memory.

| Date | Author | Content |
|------|--------|---------|
| 2026-07-13 13:53 | **Pietro Desiato** (107234) | Replies to Ilia's 06-30 ownership question — **but does not decide re-upload vs remap.** Asks *"do we already have a list of those pins?"* and pivots to a **product idea**: *"it could be interesting to have in the 360 editor a way of adjust the pin position from the editor"* — @Jason Fingland @Mostafa Kamel Hussien. *(Posted the same day as the last triage run; the 07-13 context.md captured the thread just before this landed.)* |
| 2026-07-13 14:11 | **Jason Fingland** (107238) | Product-design pushback on user-editable pins: *"We were trying to avoid allowing the user the ability to move things about too much, as that could mess with reality on site."* Counter-proposes a **system-side validation pass**: *"If the user changes the PBP, could we do a pass on the captures and see which ones no longer match their expected position? i.e. 'These captures were taken using the Level 3 Floorplan, but now appear to be higher than Level 4?'"* Notes *"it mostly sounds like the height that keeps being off"*. Fallback if editing is wanted: expose X/Y/Z in the details panel with multi-edit, via the Editor's existing Edit pattern. |
| 2026-07-16 17:39 | **Ilia Kuzmin** (107545) | **Diagnostic breakthrough.** @Yash: *"we should ask the project delivery to correct level f0f4d409 elevation 50.4 → 0 in the source model. We need one value change; rooms→points→captures all inherit it on re-import."* |
| 2026-07-17 11:07 | **Yash Patel** (107622) | Sensible gate before going to the client: *"Before I ask them to correct level in a model, can you please tell me which model they need to change the level?"* |
| **2026-07-24 13:23** | **Ilia Kuzmin** (108107) | **THE 07-24 UPDATE** — the full answer quoted in the box above: model name + version + upload date, the offending level and its elevation, the sibling level elevations as the reference, the cohort (101 rooms / ~1870 captures), the upstream cause (linked file at 48–73 m), the remedy, and the explicit *"no captures need to be re-taken or re-uploaded"*. |
| 2026-07-24 13:55 | **Yash Patel** (108112) | Freshdesk #6622 → **"Waiting on customer"** (32 min after Ilia's answer). |
| 2026-07-24 13:56 | **Yash Patel** (108113) | *"Thanks for the info."* |

**Answers to the questions this run was asked to settle:**
- **Did the ticket move since 07-13?** Yes — decisively. Root cause pinned, cohort quantified, remedy specified, status advanced to With Customer, assignee moved to Yash.
- **Did Pietro decide re-upload vs remap?** **No.** He deflected to a feature idea and asked for the pin list. The unblock came from **Ilia's own diagnostic**, not from Pietro's decision.
- **Is the customer still silent / did they respond?** They responded once, back on 06-05 ("same on the old one… problem with the room data in the Revit models"). Since the 07-24 hand-off they have **not** responded — **6 days** as of 2026-07-30. That silence is young and the status is correct.
- **What is the 07-24 update?** Ilia's precise model/level identification (comment 108107) — the single most valuable artifact on this ticket.

---

## Full chronology (16 comments)

| Date | Author | Content |
|------|--------|---------|
| 2026-05-06 09:50 | Masum Ahmed | Freshdesk #6622 mirror → "Waiting on 3rd line" |
| 2026-05-06 10:35 | Rishi Bhugobaun | "attachment seems to be missing for this one too" |
| 2026-05-06 10:43 | Masum Ahmed | Re-posts screenshot (`image-20260506-094327.png`) |
| 2026-05-11 15:50 | Ilia Kuzmin | PowerBI same problem; Quality tab pins correct; ~60% almost-correct; suggests client re-upload captures. @Pietro (`Screenshot 2026-05-11 154311.png`) |
| 2026-05-12 16:44 | Ilia Kuzmin | Ask customer to check pbp of model rooms; Pietro thinks elevation may be wrong; 60/40 |
| 2026-05-14 16:56 | Masum Ahmed | Freshdesk → "Waiting on customer" |
| 2026-06-05 13:49 | Yash Patel | Customer: *"same on the old one… problem with the room data in the Revit models"* |
| 2026-06-19 08:51 | Yash Patel | Freshdesk → "Waiting on 3rd line" (back to us) |
| 2026-06-30 16:49 | Ilia Kuzmin | @Pietro — who can assist with tweaking the pins that inherited the old pbp? |
| **2026-07-13 13:53** | **Pietro Desiato** | Asks for the pin list; floats editor-side pin adjustment @Jason @Mostafa |
| **2026-07-13 14:11** | **Jason Fingland** | Don't let users move pins; propose a system-side "capture no longer matches its level" validation pass |
| **2026-07-16 17:39** | **Ilia Kuzmin** | Correct level `f0f4d409` elevation 50.4 → 0 in the source model; one value change |
| **2026-07-17 11:07** | **Yash Patel** | Which model? |
| **2026-07-24 13:23** | **Ilia Kuzmin** | Model + level + cohort + linked-file cause + remedy (see box above) |
| **2026-07-24 13:55** | **Yash Patel** | Freshdesk → "Waiting on customer" |
| **2026-07-24 13:56** | **Yash Patel** | "Thanks for the info." |

**Staleness:** last movement 2026-07-24 → **6 days**. Correctly parked with the
customer; not stalled on us.

---

## Mechanism — re-verified against CURRENT code (2026-07-30)

The 07-13 finding *"transform proven identical to Quality pins"* **still holds**.
Re-checked line by line against the working tree (branch
`claude/vigilant-franklin-7c9ecw`); line numbers shifted since 07-13 because
**PLT-2614 "Add filters for 360 captures" (`a8d0abb`, PR #2059)** added level/room
`WHERE` clauses to the room-summary query. **That change did not touch the
coordinate path** — the only commits to `dashboard-360-service.ts` are PLT-2614,
PLT-2769 and PLT-2870, none coordinate-related.

Current trace (all paths re-confirmed):

1. **Data service** — `Dashboard360Service._queryAllData()` takes the pin coordinate
   straight from the capture rows: `FIRST(c.xMeters)`, `FIRST(c.yMeters)`,
   **`FIRST(c.zMeters)`** —
   `hc-frontend/src/main/webapp/app/pages/organisation/ViewerPage/components/services/dashboard-360/dashboard-360-service.ts:544-546`
   (query 532-556; DDL `zMeters DOUBLE` at :246). Comment at :530-531 — *"Include
   coordinates from first capture for viewer pinpoint rendering"*.
2. **Reactive bridge** — `roomSummary` row → `IProjectImage` with
   `zPosition: room.zMeters?.toString() ?? null` —
   `.../dashboard-panels/viewer/hooks/use-pinpoints-reactive-render.ts:42`
   (and the initial-render twin at `use-pinpoints-initial-render.ts:63`).
3. **Pin service** — `DashboardImageService extends DashboardPinpointBaseService`
   (`.../viewer/services/dashboard-image-service.ts:29`), extracting via
   `extractImageCoordinates` (`ViewerPage/utils/coordinate-extractors.ts:49-51`).
4. **Transform** — `DashboardPinpointBaseService._transformCoordinates()` →
   `transformPushPinsToViewer(dbPosition, pbpData, rotMatrix, globalOffset, true)`
   (`.../viewer/services/dashboard-pinpoint-base-service.ts`, `_transformCoordinates`
   + `_extractAndTransformCoordinates`). `swapYZ=true` → the capture's `zMeters`
   becomes the viewer's vertical axis.

**Shared-transform corroboration re-confirmed:** `DashboardIssueService` **extends
the same base class** (`dashboard-issue-service.ts:25`) and therefore calls the
*identical* `_transformCoordinates`; it reads `xMeters/yMeters/zMeters` via
`extractIssueCoordinates` (`coordinate-extractors.ts:38-44`). Same transform, same
PBP, same globalOffset, same model — and Quality pins render correctly. **The only
variable is the input Z.** ✅ Prior hypothesis survives.

**⭐ New code finding that directly corroborates the 07-24 diagnosis:**
The frontend applies **no level elevation of its own** — it consumes `zMeters`
exactly as delivered by the API v2 `360captures` endpoint. Grepping `elevation`
across `src/main/webapp/app` shows level elevation is read **only** for filter-panel
metadata (`dashboard-360-service.ts:365,419`) and never added to a pin coordinate.
So a wrong level elevation in the source model can only reach the viewer by being
**baked into `zMeters` upstream** — which is precisely what Ilia's *"rooms→points→
captures all inherit it on re-import"* asserts. **The FE cannot compensate, and a
FE fix cannot resolve this ticket.**

**Coherence check (why Quality pins are unaffected):** Quality issue `zMeters` is
recorded per-issue at issue-creation time against the surveyed position, whereas
360 capture `zMeters` is *derived* from the hosting room → level. A wrong level
elevation therefore poisons capture Z but not issue Z. This explains the single
most confusing fact on the ticket (same model, same transform, one pin type right
and one wrong) and it holds. *Caveat: the derivation happens backend-side and is
not visible in FE code — inferred from Ilia's statement plus the FE's read-only
use of `zMeters`.*

**The FE already holds the data needed to verify the fix.** `RoomStore` exposes
`project-levels` with `modelLevelId, levelName, elevation, sourceFileLevelId` —
`.../ViewerPage/services/duckdb/duckdb-room-store.ts:104-113` (`getAllLevels`),
`:175-186` (`getLevelById`), joined to rooms via `ownerModelLevelId` at `:120-150`.
Note `sourceFileLevelId` — the column that makes Ilia's "*this level comes from a
linked file*" claim checkable, and that makes post-fix verification a one-query job.

### Secondary, code-adjacent — now demoted

`FIRST(c.zMeters)` is a DuckDB aggregate over `GROUP BY c.modelRoomId, r.name,
r.levelName` with **no `ORDER BY` inside the group** (`dashboard-360-service.ts:546,
554`), so the room's pin inherits an arbitrary capture's Z. Flagged on 07-13 as a
possible amplifier of a patchy 60/40 pattern. **With the 07-24 diagnosis this is
almost certainly irrelevant to PLT-2649** — every capture in an affected room shares
the same wrong level elevation, so which one `FIRST()` picks makes no difference.
Keep it as a standalone code-hygiene nit, not part of this incident.

### Distinct, already-diagnosed issue — do NOT conflate

`hc-frontend/docs/viewerpage-vs-dashboard-pinpoint-comparison.md` documents a
*separate* new-dashboard-only **metres-vs-millimetres PBP unit mismatch**. Not
PLT-2649: it would throw 100% of pins hundreds of km off-model, would not appear in
PowerBI, and Quality pins currently render correctly. Mentioned only to pre-empt
re-litigation.

---

## Playbook Phase 6 scorecard (cause / trigger / cohort)

| | Status | Evidence |
|---|---|---|
| **Root cause** | ✅ **Confirmed** | Level "DC - 0G - FFL" at +50.4 m vs sibling levels at 5.3 / 10.6 / 15.9; ground floor above the roof. Named model, named level, named value. |
| **Trigger ("why now")** | ✅ **Effectively answered — and it is NOT a regression** | The model is **version V1, uploaded 2025-12-04**, and has not been re-versioned. The elevation has been wrong since first upload; there is no deploy or data change to correlate. What changed in May 2026 was **visibility**, not behaviour — the new dashboard put the pins in front of the customer. This closes the playbook's most-commonly-dropped question rather than leaving it open. *(Worth one human confirmation that no newer version of that model exists.)* |
| **Cohort** | ✅ **Quantified** | 101 rooms / ~1870 captures, all hosted on the one level. Everything not on that level was reported working on 06-30 and is unaffected. **Cross-project sweep not done** — see gaps. |

---

## Doc refs

- `xyz-platform-context/dashboard/360-tab.md:47-49` — *"Each 360 capture has spatial
  coordinates (xMeters, yMeters, zMeters) **from its `modelRoomId`**"*. Previously
  flagged as a doc inaccuracy vs the code (which uses the capture's own columns).
  **The 07-24 finding partly vindicates the doc**: the FE reads the capture's own
  columns, but those columns are themselves *derived upstream* from the room→level.
  Best fix: state both layers explicitly rather than "correcting" it either way.
- `xyz-platform-context/dashboard/viewer-and-model.md:62-71` — `applyRefPoint` /
  `applyScaling:'m'` origin + unit handling (transform context).
- `xyz-platform-context/dashboard/pitfalls.md` — re-checked 07-30: **still no**
  pin-elevation / capture-coordinate pitfall entry. Add one on close.
- `xyz-platform-context/planning/PLT-2751-360-zoom-slider-bug.md` — sibling 360 bug,
  unrelated mechanism (slideshow zoom state). No shared root cause.

## Related tickets found this run (board sweep, created since 07-01)

- **DIGP-1420 — "Model / 360 Capture Auto-Align"** (Feature Version, Backlog,
  created 2026-07-19). The closest existing home for the Pietro/Jason side-thread.
  Created 6 days *after* that exchange — plausibly its downstream, but **not linked
  to PLT-2649 and not verified as such**. Flagging, not asserting.
- **PLT-2921** — "Apply 360 capture filters to the 3D viewer" (Open, 07-22) —
  same service, unrelated concern.
- **DPL-1668** — "[DPL] ATL08 model prep for 360 localization" (DEV TESTING) and
  **DPL-1658** — "360 Localization MVP Q3 2026" (Dev In Progress). Different project
  (ATL08), but the *same class* of work (model↔360 spatial alignment). Possible
  source of expertise if project delivery needs help with the shared-coordinates fix.
- **No ticket exists** for "adjust 360 pin position from the editor" — Pietro's and
  Jason's 07-13 exchange is currently **unticketed and living only in this incident's
  comments**, where it will be lost when PLT-2649 closes.

---

## NEEDS HUMAN (attachments/media I cannot read)

⚠️ **Both attachments remain unreadable to the agent** — binary PNGs behind
Atlassian auth; the MCP tool returns metadata and a `content` URL only, not pixels.
I did not open them and have not guessed their contents.

- **`image-20260506-094327.png`** (684 KB, Masum Ahmed, 2026-05-06, attachment id
  57268) — the reporter's original screenshot.
- **`Screenshot 2026-05-11 154311.png`** (1.22 MB, Ilia Kuzmin, 2026-05-11,
  attachment id 57477) — attached to the "PowerBI same / Quality correct / 60%"
  comment.
- **Inline description image** — broken `blob:` URL (`id=UNKNOWN_MEDIA_undefined`),
  unresolvable; likely a duplicate of the 05-06 PNG.

**Materiality has dropped sharply since the 07-13 run.** At that point the
screenshots were the *only* source of the quantitative facts, and were flagged as a
decisive gap. They no longer are: Ilia's 07-24 comment states the model, level,
elevation (50.4 m), reference elevations, and cohort (101 rooms / ~1870 captures)
**in text**. The images are now **corroborative, not decisive** — worth a glance if
Ilia is verifying his own earlier read, not a blocker for anyone else.

⚠️ **Freshdesk #6622 is also outside my reach.** Yash flipped it to "Waiting on
customer" at 13:55 on 07-24, 32 minutes after Ilia's answer — but **the text he
actually sent the customer is not visible in Jira.** Whether project delivery
received the model name, the level name and the target elevation (as opposed to a
generic "please check your model") is **unverified and is the single highest-value
thing a human can confirm.** See recommended-action.md.

---

## Roster / ownership

- **Yash Patel** — **now the assignee** (was Masum Ahmed). Correct: the ticket's
  remaining work is client communication and chase, which is exactly the
  coordinator's role card. The 07-13 recommendation to move it off Masum has
  effectively happened.
- **Ilia Kuzmin** — the operator, and the person who actually cracked this. Played
  *mechanism interrogator* and then *repro driver* (playbook §Role cards).
- **Pietro Desiato** — product owner. Engaged on 07-13 but did not resolve the
  routed question; drifted to feature design. Not currently blocking anything.
- **Jason Fingland** — product designer. On-roster; sound design instinct
  (don't let users move pins) and independently pointed at height/level as the axis.
- **Mostafa Kamel Hussien** — @-mentioned 07-13, never replied.
- **Masum Ahmed** — off-roster support/Freshdesk agent; still reporter, no longer
  assignee.
- **Rishi Bhugobaun** — one housekeeping comment, not involved.

---

## Working hypothesis + confidence

**Hypothesis (upgraded, and now specific):** PLT-2649 is a **source-model data
defect**. In `PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24_detached` (V1, 2025-12-04), the
level **"DC - 0G - FFL"** carries elevation **+50.4 m** instead of project datum ~0,
inherited from a **linked file in the federation whose levels sit at 48–73 m**
(shared coordinates never aligned). Room, capture-point and capture coordinates are
derived from that level on import, so **every 360 pin in the 101 rooms on that level
(~1870 captures) renders 50.4 m too high** — in both the new dashboard and PowerBI.
The viewer transform is correct and is provably shared with the Quality pins, which
render correctly on the same model. **No frontend change can fix this**; the remedy
is one elevation value corrected in the source model followed by a **model**
re-upload (no capture re-upload, no re-shooting).

**Confidence (per CLAUDE.md scale):**
- **Class of cause is source data, not dashboard code — 10/10.** Independently
  confirmed three ways: PowerBI reproduces it, Quality pins share the identical
  transform and are correct, and the FE demonstrably never touches level elevation.
- **The specific defect (level "DC - 0G - FFL" @ 50.4 m in that named model) —
  9/10.** A precise, falsifiable, internally-consistent claim: the sibling elevations
  (5.3 / 10.6 / 15.9) form a coherent 5.3 m floor-to-floor series that 50.4 m plainly
  violates, the 48–73 m linked-file range explains the origin, and it accounts for the
  earlier "height is what's off" observations from three people independently. Held
  back from 10 only because **I could not query the PA12 `project-levels` parquet
  myself** — I am relying on Ilia's numbers.
- **That correcting it fully resolves the ticket — 7/10.** It should clear the 101
  affected rooms. Residual risk: whether *every* mis-placed pin the customer sees is
  on this level. Ilia stated on 06-30 that the rest works fine, but no per-room
  verification exists, and the earlier "40% need review" framing was never formally
  retracted.
- **Overall ticket-state assessment (status, ball position, next step) — 9.5/10.**

**Gaps a human must close (nobody else can):**
1. **Confirm what was actually sent to the customer on 07-24** via Freshdesk #6622 —
   specifically that it names the model, the level and the target elevation. ← highest value
2. **Confirm no newer version** of that model exists (Ilia says V1 / 2025-12-04);
   if project delivery has already re-uploaded, the ticket may be verifiable now.
3. **Cross-project cohort sweep** — the same unaligned-linked-file pattern could
   affect other federations. One query over `project-levels` for levels whose
   elevation is a large outlier vs their building's series would find them. Not done.
4. **Post-fix verification** (define now, run on re-upload): re-query
   `project-levels` for "DC - 0G - FFL" → expect ~0; spot-check pins in several of
   the 101 rooms; confirm PowerBI agrees.
5. **The two PNGs** — corroborative only now (see NEEDS HUMAN).

## Re-verified 2026-08-04 (light pass, this run)

Live JQL fetch of the board: `updated` for this ticket is still `2026-07-24T13:56:22+01:00` — bit-for-bit identical to what the 08-03 run already captured as unchanged. Since a Jira comment or status change always bumps `updated`, this confirms zero new activity in the 24h between runs without needing a full re-read. Carrying forward the 08-03 finding as-is; no new investigation performed.

## Re-verified 2026-08-05 (light pass, this run)

Live JQL fetch: `updated` still `2026-07-24T13:56:22+01:00`, comment count unchanged at 16. Still
waiting on project delivery to correct level `f0f4d409`'s elevation (50.4 → 0) in the source Revit
model and re-upload — this is genuinely with the customer's side, not a stall on ours, so no draft
action this run.

## Re-verified 2026-08-10 (light pass, this run)

Live fetch: `updated` still `2026-07-24T13:56:22+01:00`, comment count unchanged at 16, status still
`With Customer`. 17 days since hand-off, no reply yet. Still correctly parked — no action needed.

## Re-verified 2026-08-11 (light pass, this run)

Live fetch: `updated` still `2026-07-24T13:56:22+01:00`, comment count unchanged at 16. 18 days since
hand-off, still no customer reply. Genuinely with the customer's project-delivery team — no action
needed.

## 2026-08-14 — re-check (full pass, first one to open `analysis/`)

**Ticket state:** unchanged since 2026-07-24 13:56. Status **With Customer**, priority Major,
assignee Yash Patel, reporter Masum Ahmed, 16 comments. **21 days of silence** since the hand-off,
up from 18 at the 08-11 light pass. Nothing technical is left to diagnose; the mechanism, model,
level, wrong value, target value and remedy are all already on-ticket and already with the client.

### What the prior runs got right (re-confirmed, do not re-litigate)

- **Class of cause is source data, not dashboard code.** Still 10/10. Re-verified against the
  current working tree (branch `claude/vigilant-franklin-icxmur`, line numbers moved again, see
  below): the FE never adds a level elevation to a pin coordinate.
- **The specific defect** (level `f0f4d409` "DC - 0G - FFL" at +50.4 m). Now independently
  checkable from this folder's own `analysis/PA12-levels.csv`, which the earlier write-ups never
  cited. It holds. Details below.
- **Ruled out and still ruled out:** a frontend fix; a viewer-transform fault (Quality pins share
  the identical transform and are correct); the metres-vs-millimetres PBP mismatch documented in
  `hc-frontend/docs/viewerpage-vs-dashboard-pinpoint-comparison.md`; re-taking or re-uploading any
  360 captures; and the 07-13 "re-upload vs XYZ remap" fork, which Ilia's own diagnosis made moot.

### What is now stale in the earlier sections of this file

1. **The `FIRST(c.zMeters)` code nit (§ "Secondary, code-adjacent — now demoted") is obsolete.**
   That query no longer exists. `dashboard-360-service.ts` now builds a **capture-point** summary,
   not a room summary, and picks the representative row deterministically with
   `ROW_NUMBER() OVER (PARTITION BY capturePointId ORDER BY c.imageTakenOn DESC NULLS LAST,
   c.fileReferenceId)`, taking `recencyRank = 1`
   (`.../services/dashboard-360/dashboard-360-service.ts:578-614`, coordinates carried at
   `:598-600` and mapped at `:630-632`). The non-determinism the 07-30 run flagged is gone.
   **Do not file that nit.** (Side note, unrelated to this ticket: the pin unit changed from room
   to capture point, so `use-pinpoints-*-render.ts` now maps `point.zMeters`, not `room.zMeters`.)
2. **All code line numbers in § Mechanism have moved.** Current, re-verified 2026-08-14:
   - `.../dashboard-panels/viewer/hooks/use-pinpoints-reactive-render.ts:43` and
     `.../use-pinpoints-initial-render.ts:63` — `zPosition: point.zMeters?.toString() ?? null`.
   - `.../viewer/services/dashboard-image-service.ts:30` and `.../dashboard-issue-service.ts:25`
     both extend `DashboardPinpointBaseService`; the shared transform is
     `dashboard-pinpoint-base-service.ts:176` (`_transformCoordinates`), called at `:213`.
   - `elevation` in `dashboard-360-service.ts` appears only at `:385`, `:411`, `:460` (level
     filter metadata, `ANY_VALUE(elevation)` inside a `GROUP BY modelLevelId`). A repo-wide grep
     for `elevation` outside tests/mocks hits 5 sites in `duckdb-room-store.ts` and nothing on any
     pin-coordinate path. **The FE still cannot compensate for a wrong level elevation.** ✅

### New this run — the `analysis/` folder, which no prior write-up references

`context.md` and `recommended-action.md` never mention `analysis/`, and `detect_stale_360.py`
points back at a *"context.md 'Update 2026-07-15'"* section that does not exist in this file. The
artefacts are real and load-bearing, so indexing them here:

| File | What it is |
|---|---|
| `detect_stale_360.py` | Classifier: Quality issues define the valid vertical envelope (Y ≤ 25 m), captures above it are stale. Reproduce with four API JSON exports. |
| `PLT-2649-stale-cohort.json` | Cohort summary: **1868 stale / 30 suspect / 4667 ok / 6667 total** captures. |
| `PLT-2649-stale-pinpoints.csv` (75) | One row per capture point that actually holds imagery, with `yOffset = -50.4`. This is the "list of pins" Pietro asked for on 07-13. |
| `PLT-2649-phantom-level-all-points.csv` (101) | Every capture point on the bad level, including empties. |
| `PLT-2649-stale-captures.csv` (1868) | One row per image. |
| `PA12-levels.csv` (92 levels) | The `project-levels` extract. Undated. |

**Verified from these artefacts (arithmetic and lookups I ran myself, 2026-08-14):**

- **The "101 rooms / ~1870 captures" figure Ilia gave the client is correct, with one nuance
  worth knowing before anyone verifies the fix:** the bad level carries **101 capture points
  across 101 distinct `modelRoomId`s**, but only **75 of them hold captures** (1868 images); the
  other **26 are empty points**. So a post-fix spot check should expect 75 rooms to visibly move
  and 26 more to be silently corrected. Nobody is wrong here, the numbers just count two things.
- **Ilia's "linked file whose levels all sit at 48-73 m" is exactly right and now falsifiable.**
  `f0f4d409` belongs to source file `2210cd43-599c-4d9b-826e-4d369b8660da`, and **all 16 of that
  file's levels** sit between **48.10 and 73.40 m** (`SS - 1S - FFL` 48.102, `SS - 0G - FFL`
  50.102, `GT - 0G - FFL` 50.2, `DC - 0G - FFL` 50.4, up to `Limit PLU - Eq Tqn` 73.4). The
  sibling DC elevations Ilia quoted (5.3 / 10.6 / 15.9) come from **different** source files
  (`ffba833f`, `cb3fe738`), where `DC-0G-FFL` correctly reads **0.0**. The federation therefore
  holds `DC-0G-FFL` three times: twice at 0.0 and once at 50.4.
- **⭐ The misalignment is not confined to one linked file, and the one-value fix will not clear
  it.** Grouping all 92 levels by source file, roughly **15 source files, ~44 levels in total,
  sit wholly inside the ~45-73 m band**: `2210cd43` (16 levels, 48.1-73.4), `c1cf12db` (8,
  50.4-73.4), `bca5376b` (4, 48.1-60.0), `0cf0d242` (4, 55.5-66.1), plus singletons `b644c9fb`,
  `e3e052f9`, `55063bda`, `588579c2`, `26416be1`, `05e5d34b`, `11669e82`, `458c0e49`, `5a651e03`,
  `65d4270f`. The same buildings appear twice, once at datum and once ~50.4 m higher (`FH-0G-FFL`
  exists at both 0.0 and 50.4). **Only `f0f4d409` currently hosts 360 capture points, which is
  why only one symptom is visible.** Setting that single value to 0 closes PLT-2649 and leaves
  the rest latent: the first capture taken in any SS / GT / FH / R+1 / R+2 room hosted on one of
  those levels reproduces this ticket. That is the argument for Ilia's *option A* (align the
  linked files' shared coordinates) over *option B* (patch the one elevation), and it is worth
  saying to the client once, without turning it into a blocker for the fix already asked for.
- **⚠️ Do not hand `PLT-2649-stale-pinpoints.csv` to project delivery as-is.** Its `action`
  column offers *"set Y=0.0 (offset -50.4) OR reparent room to real L00 level"* with
  `correctLevelId(realL00) = 7026451f`, and the cohort JSON calls `7026451f` "the real L00". In
  `PA12-levels.csv`, `7026451f-9464-4206-9730-2df67560d108` is named **`GB-0G-FFL`** (source file
  `96080aaf`), a **GB** building level, not a DC one. Taking the reparent branch literally would
  move 101 DC rooms onto a GB level. The elevation-correction branch is the safe one; if
  reparenting is ever wanted, the DC candidates at 0.0 are `344df6bc` (`ffba833f`) or `f72da41e`
  (`cb3fe738`). Inferred from names and source-file grouping only, not confirmed with Ilia.
- **`PA12-levels.csv` is undated, so it cannot tell us whether the client has already fixed
  anything.** Its `DC - 0G - FFL` row still reads 50.4, but the extract predates the 07-24
  hand-off as far as anyone can tell. It documents the *pre-fix* state and is the right baseline
  for the post-fix re-query, nothing more.

### The Pietro / Jason product side-thread (07-13) — still unclosed, and now decidable

The 07-30 run already flagged this (`recommended-action.md` § "Also worth doing" #1) and it has
not moved. What is new is that the root cause is now known, which settles which of the two ideas
survives:

- **Pietro's "adjust the pin position from the 360 editor"** and Jason's fallback **"expose X/Y/Z
  in the details panel with multi-edit"** would not have helped here and would have hurt: the
  correct fix was one source-model value, and hand-nudging 101 rooms would have masked a defect
  that also affects rooms, floorplans and anything else derived from that level. Jason's own
  objection (*"could mess with reality on site"*) is vindicated by the outcome.
- **Jason's primary proposal, a system-side pass flagging captures that no longer match their
  recorded level, is the one worth keeping.** It is a detector for exactly this defect class and
  would have surfaced it at model upload in December 2025 rather than via a customer in May 2026.
  `detect_stale_360.py` in this folder is a working prototype of it.
- Candidate home remains **DIGP-1420 "Model / 360 Capture Auto-Align"** (Backlog, created
  2026-07-19). Still **not verified** as the right home, still not linked to PLT-2649. Owner for
  the decision is Pietro, with Jason. Draft in `recommended-action.md`.

## 2026-08-19 — re-verified, unchanged

Live fetch: status With Customer, priority Major, assignee Yash Patel, 16 comments, `updated`
still `2026-07-24T13:56:22` — identical to the 08-18 record. **26 days** of silence since Ilia's
hand-off to the client's project-delivery team. The nudge-to-Yash draft in `recommended-action.md`
remains correct and unposted.

## 2026-08-20 — re-verified, unchanged

Live fetch: status With Customer, priority Major, assignee Yash Patel, still 16 comments, `updated`
still `2026-07-24T13:56:22` — byte-for-byte identical to 08-19. **27 days** of silence on a fix that
sits entirely with the client's project-delivery team. The nudge-to-Yash draft in
`recommended-action.md` remains correct and unposted.

## 2026-08-21 — re-verified, unchanged

Live fetch: status With Customer, priority Major, assignee Yash Patel, still 16 comments, `updated`
still `2026-07-24T13:56:22`. **28 days** of silence. Nothing to add; the nudge-to-Yash draft remains
correct and unposted.

## 2026-08-25 — no change

Live fetch: status `With Customer`, priority Major, assignee Yash Patel, 16 comments, newest still
2026-07-24 13:56 — byte-identical to every run since 08-18. **32 days** silence on a fix that sits
entirely with the client's project-delivery team (correcting one model level's elevation). The
nudge-to-Yash draft is unchanged. Nothing re-derived.

## 2026-08-26 — no change

Live fetch: status `With Customer`, priority Major, assignee Yash Patel, 16 comments, newest still
2026-07-24 13:56 — byte-identical to every run since 08-18. **33 days** silence on a fix that sits
entirely with the client's project-delivery team (correcting one model level's elevation). The
nudge-to-Yash draft is unchanged. Nothing re-derived.

---

## 2026-08-27 — fix applied but pins still wrong; root-cause re-opened

**Read this before any earlier section of this file.** The customer did the thing we asked. The
symptom did not go away. The 07-24 diagnosis is therefore **field-falsified as stated**, and the
half of it that failed is identifiable: not *"the level elevation is wrong"* (that part still
looks right) but *"rooms, capture points and 360 pins will all inherit the corrected elevation on
re-import"* (comment 108107). Nothing in the code supports that second clause.

### Ticket state changed materially — the header of this file is now stale

Live fetch, 2026-08-27:

| Field | Was (every run 07-24 → 08-26) | **Now** |
|---|---|---|
| **Status** | With Customer | **`Open`** (statusCategory `To Do`) |
| **Assignee** | Yash Patel | **Ilia Kuzmin** |
| Comment count | 16 | **18** |
| Attachments | 2 | **3** (`Screenshot 2026-08-26 164846.png`, id 63374, 912 KB, Yash) |
| `updated` | 2026-07-24T13:56:22 | **2026-08-26T12:33:58** |
| Priority | Major | Major (unchanged — arguably wrong now, see below) |
| Issue links | none | **still none** — XSPCMA-868 is referenced only as text in a comment |

The `Status: With Customer` line at the top of this file (:5) and the ownership section (:299)
are **superseded**. The ball is back on us: Freshdesk #6622 is "Waiting on 3rd line", the Jira is
Open, and it is assigned to the person who produced the original diagnosis.

**Group tag stays `groupA`** — Open + assigned to Ilia is Group A twice over per
`live-incident-run-instructions.md` (§ Grouping). Domain tag stays `360-captures`.

### The two new comments

| Date | Author | Content |
|---|---|---|
| 2026-08-26 12:30 | Yash Patel (110446) | *"the Bim Team changed the elevation as requested in model **PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24.** After the change in elevation and re export of the model, we received a new ticket from site engineer which has Jira XSPCMA-868. And even after the elevation change in model, the 360 pins still appear high above building."* + screenshot + a SharePoint link to the model. *"Can we look into this as this is now affecting the usability of the XYZ app on field."* |
| 2026-08-26 12:32 | Yash Patel (110447) | Freshdesk #6622 → **"Waiting on 3rd line"** (back to us) |

### ⚠️ XSPCMA-868 is NOT the same symptom — do not let this get merged by accident

Fetched it. **XSPCMA-868 "Missing Ground Floor 360 Images on Dashboard and XYZ App"**, project
PA12, **Critical**, **unassigned**, status Open, created **2026-08-13**, reporter Yash (mirroring
Freshdesk #7620). Body, verbatim:

> *"I'm trying to view the 360 images of the ground floor on both the Dashboard and the XYZ App,
> but the entire floor plan with the images is missing. L01 and L02 are displaying correctly."*

That is **images missing**, not **pins floating**. Yash's comment presents it as the follow-on
report of the same defect, and it may well be causally downstream of the same re-export (see H3
below, which predicts exactly this) — but it is a **different observation** and the two must be
kept separately falsifiable. Note also the dates: XSPCMA-868 was raised **13 Aug**, thirteen days
before Yash told us the re-export had happened. Whether the re-export predates 13 Aug is
**unknown and is one of the two highest-value facts a human can supply** (see NEEDS HUMAN).

### ⭐ Correction to every prior write-up in this file: the vertical axis is `yMeters`, not `zMeters`

This is load-bearing and it has been wrong in this folder since 07-13. If we hand the backend a
remediation instruction naming `zMeters`, it will patch the wrong column.

- The transform is `transformPushPinsToViewer(dbPosition, pbp, rot, globalOffset, **true**)`
  (`.../viewer/services/dashboard-pinpoint-base-service.ts:185`, called from `:213`).
- With `swapYZ = true` it builds `new THREE.Vector3(position.x, position.z, position.y)`
  (`.../ViewerPage/services/coordinate/utils/coordinate-transforms.ts:20-22`). So the **DB
  `yMeters` becomes the viewer's up axis**; DB `zMeters` becomes a horizontal.
- The FE passes both through unchanged — `yPosition: point.yMeters`, `zPosition: point.zMeters`
  (`.../dashboard-panels/viewer/hooks/use-pinpoints-reactive-render.ts:41-43`, twin at
  `use-pinpoints-initial-render.ts:63`), then `extractImageCoordinates`
  (`ViewerPage/utils/coordinate-extractors.ts:50-52`).
- **The folder's own artefacts already said so and nobody joined it up:** `detect_stale_360.py`
  states *"Vertical axis in the stored coords is Y (within-level stdev of Y == 0.000) … The
  viewer transform's swapYZ=true matches"*, and every row of `PLT-2649-stale-pinpoints.csv` reads
  `currentY = 50.4` with `zMeters` scattered (-16.768, 7.623, 0.994 …).

So the § Mechanism claim at :168-169 (*"swapYZ=true → the capture's zMeters becomes the viewer's
vertical axis"*) is **wrong and is hereby superseded.** Everything else in § Mechanism survives:
the FE reads the coordinate verbatim and applies no level elevation of its own.

### The mechanism, re-derived — and why the customer's fix could never have worked

Re-verified against the working tree (branch `claude/vigilant-franklin-3g5z09`, HEAD `cf72b43`).

**1. Pin coordinates are persisted rows, not derived values.**
`captures_360` is loaded verbatim from `GET /api/v2/projects/{id}/360captures`
(`services/capture360Service/capture-360-api-service.ts:33-41`; DDL with `xMeters/yMeters/zMeters
DOUBLE` at `.../dashboard-360/dashboard-360-service.ts:259-261`, bulk-inserted unmodified at
`:274-275`). The summary query selects `c.xMeters, c.yMeters, c.zMeters` straight out of that
table (`:599-601`, mapped at `:628-630`).

**2. Capture points are themselves stored records with their own coordinates and pinned model
foreign keys.** `IRoomCapturePoint` carries `{ roomCapturePointId, modelId, modelRoomId,
modelLevelId, xMeters, yMeters, zMeters, createdFrom }`
(`services/referencePointsService/room-capture-api.types.ts:13-24`). They are **written once** by
`POST /room-capture-points` with explicit coordinates
(`room-capture-api-service.ts:27-51`) and are mutable **only** by
`PATCH /room-capture-points/{id}`, whose payload accepts exactly
`xMeters/yMeters/zMeters/modelRoomId/modelLevelId` (`:54-63`, type at
`room-capture-api.types.ts:27-34`).

**3. Level elevation never touches a pin coordinate, anywhere.** A repo-wide grep for `elevation`
outside tests hits only: level filter metadata (`dashboard-360-service.ts:385`, `:411`, `:460`),
the room store's level lookups (`ViewerPage/services/duckdb/duckdb-room-store.ts:20, 79, 109,
178`), and the project **base point** (`services/projectService/project-api-service.utils.ts:70`,
`dashboard-provider/dashboard-project-provider.tsx:187`). Not one of them feeds a pin.

**4. The stored number *is* the level elevation, frozen.** All 75 stale capture points in
`analysis/PLT-2649-stale-pinpoints.csv` sit on the single level `f0f4d409` with
`currentY` **exactly 50.4** on every row — the same value `PA12-levels.csv` records for that
level's `elevationMeters`. `detect_stale_360.py` further notes *"Capture (x,y,z) == its
roomCapturePoint (x,y,z) exactly for all matched rows"*. That is the signature of a value
**snapshotted from the level at capture-point-creation time and persisted**, not one recomputed
per render.

**Conclusion:** correcting the level in Revit changes the `project-levels` parquet. It does not,
and by this architecture cannot, rewrite `room_capture_points.yMeters` or `360captures.yMeters`.
Ilia's *"rooms→points→captures all inherit it on re-import"* (comments 107545, 108107) asserts a
backend re-derivation job that **no FE-visible contract implies exists**. Unless the backend runs
one — which nobody on this ticket ever confirmed, and which was the unexamined load-bearing
assumption of the whole 07-24 hand-off — the pins were always going to stay at 50.4.

### Hypotheses, ranked, each falsifiable by one query

**H1 — the remedy's second clause is false: the model fix cannot move already-stored pins.
Confidence 7/10. Primary.**
Mechanism above. Predicts: pins still at `yMeters = 50.4` *regardless of what the BIM team did*,
and therefore predicts the observed outcome without needing anyone to have made a mistake.
**Falsify by:** re-pull `/api/v2/projects/{PA12}/room-capture-points` and `/360captures`; if
`yMeters` for the 75 points in `PLT-2649-stale-pinpoints.csv` still reads 50.4, H1 holds. Held
back from 9 only because the backend re-derivation job is *absence-of-evidence* from the FE side
— a human with api-v2 access can confirm or kill it in minutes, and that is the single cheapest
thing left to do on this ticket.

**H2 — the wrong artifact was edited. Confidence 5/10. Not exclusive with H1.**
Two tells. (a) Yash's model name is `PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24`, Ilia's was
`..._V14_R24_detached`. In a Revit workflow `_detached` is the detach-from-central copy — usually
the thing actually uploaded — so the names may or may not denote the same artifact. (b) Far more
telling: the level at 50.4 does **not** live in the DC model at all. `PA12-levels.csv` gives
`f0f4d409` a `sourceFileLevelId` of **`2210cd43-599c-4d9b-826e-4d369b8660da-00584452`** — source
file `2210cd43…`, whose **16 levels all sit at 48.1-73.4 m** (08-14 audit, above). Ilia said this
explicitly in 108107: *"this level comes from a linked file inside the federation."* A BIM team
opening the DC host model and "changing the elevation" edits the host's own level list; the
linked file's level object keeps 50.4 and re-imports at 50.4. **Falsify by:** the same
`project-levels` re-pull — if `f0f4d409` still reads 50.4, either H2 is true or the re-import
never landed.

**H3 — the re-export re-keyed the ground floor, orphaning the captures. Confidence 5/10, and it
is the only hypothesis that also explains XSPCMA-868.**
Captures join to rooms and levels **by id**: `LEFT JOIN rooms r ON c.modelRoomId = r.id LEFT JOIN
levels l ON c.modelLevelId = l.id` (`dashboard-360-service.ts:610-611`, repeated at `:641-642`,
`:665-666`, `:683-684`). `rooms.id` comes from `project_rooms_raw.modelRoomId` and `levels.id`
from `project_levels_raw.modelLevelId` (`:356-360`, `:458-463`). The floor label is
`COALESCE(l.name, r.levelName)` (`:43`) and the level **filter matches on that name**
(`:558-561`). So if the edit-and-re-export minted a **new** `modelLevelId` (or re-parented the DC
ground-floor rooms), every existing capture — still carrying the old ids — falls out of both
joins, its `levelName` collapses to `'Unknown Level'` (`:624`), and **the ground floor disappears
from the level filter and the room list while untouched L01/L02 keep working.** That is
XSPCMA-868 word for word. Pins would meanwhile still render (coordinates are on the capture row,
not the join) and still be 50.4 high — i.e. H1 + H3 together produce *both* reported symptoms
from one cause. **Falsify by:** diff the new `project-levels` / `project-rooms` ids against the
`currentLevelId`/`modelRoomId` values in the folder's CSVs.

**H4 — multi-level: RULED OUT as the explanation for what is observed. Confidence 8/10.**
Re-ran the numbers: all 75 stale capture points are on the one level `f0f4d409`, all `floor=L00`,
all `currentY=50.4` — a single-valued cohort, not a spread. The 08-14 finding that ~15 source
files / ~44 levels sit in the 45-73 m band **stands and is still worth fixing**, but those levels
host no capture points today, so they cannot be producing the pins the site engineer is looking
at. This is latent, not active. Do not let it broaden the current diagnosis.

**H5 — frontend caching served stale parquet: RULED OUT. Confidence 8/10.**
The OPFS parquet cache validates against `artefact.artefactHash` first and `fileSizeBytes` second
and returns `false` on any mismatch (`ViewerPage/services/duckdb/opfs-cache-manager.ts:113-163`,
called from `duckdb-service.ts:256-262` and through `loadParquet` at `:279-290`). A regenerated
parquet has a new hash and is refetched. **One residual, genuinely unverified:** both parquet
lookups take the **first** artefact whose `outputContent` matches, with no version predicate —
`artefacts.find(a => a.outputContent === 'project-rooms' …)` (`dashboard-360-service.ts:325-328`)
and the `project-levels` twin (`:432-435`), against
`GET /projects/{id}/models/artefacts?includeModels=true` (`services/modelService/model-api-service.ts:81-86`).
`IModelArtefact` exposes `models[].modelVersionId` (`model-api.service.types.ts:8-11`) and the FE
ignores it entirely. If that endpoint can return more than one `project-levels` artefact per
project, the FE picks arbitrarily among versions. I could not determine whether it can. Low
probability, cheap to check, would be a real FE bug if true.

### What the 07-24 diagnosis got right, and should not be re-litigated

- The **class** of cause is upstream data, not dashboard code. Still holds: the FE reads the
  coordinate verbatim and the Quality pins, which share the identical transform
  (`dashboard-issue-service.ts:25` and `dashboard-image-service.ts:30` both extend
  `DashboardPinpointBaseService`), render correctly on the same model with the same PBP.
- **Level `f0f4d409` "DC - 0G - FFL" at 50.4 m is genuinely anomalous**, and the linked-file
  origin (`2210cd43…`, 16 levels at 48.1-73.4) is confirmed from `PA12-levels.csv`.
- The **cohort** (101 capture points, 75 with imagery, 1868 images) is confirmed arithmetic.
- Still ruled out: a frontend fix; a viewer-transform fault; the metres-vs-millimetres PBP
  mismatch in `hc-frontend/docs/viewerpage-vs-dashboard-pinpoint-comparison.md`; the PBP itself
  (project-level, shared with the correct Quality pins).

### Revised confidence (supersedes § "Working hypothesis + confidence", :330-346)

| Claim | 07-24 / 08-14 | **2026-08-27** | Why moved |
|---|---|---|---|
| Class of cause is upstream data, not FE code | 10/10 | **10/10** | Untouched by the falsification; re-verified this run |
| Level `f0f4d409` sat at 50.4 m and that is anomalous | 9/10 | **9/10** | Independently checkable in `PA12-levels.csv`; unaffected |
| **"Correcting the level and re-uploading resolves the ticket"** | **7/10** | **2/10** | **Field-falsified.** The customer executed it and the symptom persisted. Its unexamined premise — an inheritance/re-derivation step — has no support in any contract the FE can see |
| **"Rooms → points → captures inherit it on re-import"** (the specific mechanism) | never scored; asserted | **2/10** | Capture points are persisted rows with their own coordinates and a pinned `modelId`, writable only by POST/PATCH (`room-capture-api.types.ts:13-34`) |
| That the *remaining* work is a data remediation on our side, not a further model change | — | **7/10** | Follows from H1; contingent on the one query below |
| That XSPCMA-868 shares a root cause with PLT-2649 | — | **5/10** | H3 explains both elegantly, but the symptoms differ and the dates do not obviously line up |
| Overall ticket-state assessment | 9.5/10 | **6/10** | We got the diagnosis half right and shipped the wrong remedy to a client, twice-over costing five weeks |

**The precise thing I now doubt is not "which level" — it is "what re-import does".** The 07-24
comment fused a *correct observation* (this level's elevation is wrong) with an *unverified
mechanism* (the fix propagates to existing captures) and shipped both to a customer as one
instruction. Playbook § "What did we expect, on whose authority?" — the authority for the second
half was nobody's; it was never asked of the backend and never checked in code.

### NEEDS HUMAN — this run's additions

1. **⚠️ The one query that separates H1 / H2 / H3.** Re-pull, for PA12: (a) `project-levels` —
   what is `f0f4d409`'s `elevationMeters` now, and is there a level named "DC - 0G - FFL" with a
   *different* id? (b) `/api/v2/projects/{PA12}/room-capture-points` and `/360captures` — does
   `yMeters` still read **50.4** for the 75 points in `analysis/PLT-2649-stale-pinpoints.csv`?
   Baselines for both diffs are already in `analysis/`. This is a 10-minute job and it decides
   everything below it.
2. **When was the corrected model actually re-uploaded?** XSPCMA-868 was raised 2026-08-13;
   Yash reported the re-export on 08-26. If the re-upload postdates 13 Aug, XSPCMA-868 cannot be
   its consequence and H3 dies.
3. **Does api-v2 re-derive capture-point coordinates on model re-import?** Straight question for
   Sachin or Ali. A yes kills H1 outright; a no makes the remediation ours. Nobody has ever asked.
4. **`Screenshot 2026-08-26 164846.png`** (attachment 63374, 912 KB, Yash, 08-26) — unreadable to
   the agent, blob URL behind Atlassian auth. Would settle whether the screenshot shows pins
   floating at ~50 m (same offset as before → nothing moved) or at some *new* wrong height
   (→ something did move, and moved wrong). That distinction discriminates H1 from H2 on its own.
5. **SharePoint model link** in comment 110446 — attempted, **HTTP 403**. Would settle whether the
   uploaded artifact is the `_detached` file, and whether the level object at 50.4 lives in the
   host or in linked file `2210cd43…` (H2).
6. **XSPCMA-868 has no Jira link to PLT-2649** and is **unassigned at Critical**. Two separate
   housekeeping gaps.
7. **Priority.** PLT-2649 is still Major while its field consequence is now filed at Critical and
   the coordinator says it is *"affecting the usability of the XYZ app on field."* Worth a human
   deciding whether to raise it.
