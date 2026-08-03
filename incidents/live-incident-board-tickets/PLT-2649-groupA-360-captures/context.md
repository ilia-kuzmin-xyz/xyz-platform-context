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
|---|---|---|
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
