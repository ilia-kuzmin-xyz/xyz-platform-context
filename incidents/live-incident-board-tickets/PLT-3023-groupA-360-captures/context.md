# PLT-3023 — "Issues with 360 Photo Custom Capture Points in XYZ App, Dashboard and web viewer" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3023
- **Issue type:** Live Incident · Software Area: (unset) · **Issue Type field: Mobile App**
- **Status:** **Open** · **Priority:** Major
- **Project:** LVN - BL1-2 (two buildings, Building 1 and Building 2)
- **Reporter (Jira):** Yash Patel (support) · **Assignee:** Rishi Bhugobaun · Original client reporter: Lucas · Freshdesk #7606.
- **Created:** 2026-08-06 (brand new this run).
- **Attachments:** 6 screenshots (2 mobile app, 2 web viewer, 2 dashboard) — ⚠️ none opened this run, see §7 NEEDS HUMAN.
- **Domain slug chosen:** `360-captures` — same family as PLT-2649 (360 pin placement), though the
  mechanism here looks unrelated to PLT-2649's elevation-data cause.

## 1. What was reported

Client used the mobile app's new **"Add New Custom Capture Points"** feature to take 360 photos on
two buildings. Three surfaces now disagree:

- **Mobile app:** everything correct (per client's own screenshots).
- **Web Viewer:** not all custom capture points are visible; several capture points show **multiple
  photos grouped under one point** instead of one photo per point — Building 2 has points with 2-3
  photos each; **Building 1 is the extreme case: all external captures (10 photos) consolidated into
  a single point**, specifically the last one created.
- **Dashboard:** Building 2's capture point *locations* differ from the Web Viewer; Building 1's new
  custom capture points **don't appear at all**.

Only 2 comments exist: Yash's routing comment (verbatim restating the description, 08-06 06:35) and a
Freshdesk auto-sync note ("Waiting on 3rd line," 08-06 06:38). **Zero technical investigation has
happened on the ticket itself** — everything below is this run's first pass.

## 2. Prior-run check (per playbook step 0)

No existing folder (brand new ticket). Closest analogue on this board is **PLT-2649** ("PA12 360
pins appear too high," `360-captures` domain) — but that resolved to a **source-data elevation
error** (one Revit level's elevation wrong by 50.4m), a single scalar-offset bug, not a
grouping/visibility/multi-surface-disagreement shape. `recurring-defect-patterns.md` has no existing
pattern for "capture points collapse into one point" or "custom capture points invisible on one
surface only" — **this would be a new pattern candidate if confirmed**, not a repeat.

## 3. Domain doc check

`dashboard/360-tab.md` documents the **existing, room-based** 360 capture flow only: captures loaded
from the `360 Captures API v2` into a DuckDB `captures_360` table, room metadata joined in
(`roomId → roomName → levelName`), pinpoints rendered from each capture's own
`xMeters/yMeters/zMeters`. **It does not mention "custom capture points" at all** — this is a
documentation gap, not a contradiction; the underlying data model turns out to be the same one (see
§4), just previously undocumented as supporting room-less points.

## 4. Code findings (hc-frontend, current checkout)

Investigated via a dedicated code search of the 360/capture pipeline across Web Viewer and Dashboard.

### VERIFIED

- **There is no distinct "custom capture point" concept anywhere in hc-frontend.** No
  `CustomCapturePoint` type, component, service, or branch exists. Whatever the mobile app's new
  feature does, hc-frontend has exactly **one** capture-point data model, shared by both the old
  room-based flow and the new custom flow. The only schema trace of a distinction is
  `createdFrom: string` on `IRoomCapturePoint`/`IRoomCapturePointCreate`
  (`room-capture-api.types.ts:10,24`) — present in the type only, **never read, displayed, or
  branched on anywhere** in the app. If the backend tags custom points via this field, the frontend
  silently discards that information on arrival.
- **hc-frontend never creates capture points** — `RoomCaptureApiService.createRoomCapturePoints`
  (`room-capture-api-service.ts:28-53`) has zero call sites in the app. Point creation is entirely
  mobile-app/backend-side, consistent with "created via the mobile app."
- **Room-less points are already a first-class, documented case in the schema**:
  `IRoomCapturePointPatch.modelRoomId?: string | null` (`room-capture-api.types.ts:33`) explicitly
  allows a null room, and `capture-360-grouping.ts:1-8` / `dashboard-360/types.ts:43-46` state a
  capture point "need not belong to a room." So room-less ("custom") points aren't new to the schema
  — only new as a client-facing creation flow.
- **Grouping is 100% keyed on a shared string ID, never on spatial proximity.** Every surface buckets
  individual 360 *photos* into a capture-point *card/pin* using
  `roomCapturePointId || 'unknown'` — implemented independently three times, all agreeing:
  - Web Viewer editor panel: `build-capture-point-summaries.ts:56-64`
  - Web Viewer 3D pin markups: `media-service.ts:762-771`
  - Dashboard/DuckDB: `dashboard-360-service.ts:37` (`CAPTURE_POINT_ID_EXPR`), used at `:591-609`,
    `:637-643`, `:659-668`
  - The shared literal `UNKNOWN_CAPTURE_POINT = 'unknown'` (`capture-360-grouping.ts:8`) is explicitly
    commented as "the contract between the panels, the editor markup service and the dashboard SQL."
  - **No proximity/distance/threshold/cluster/dedup logic exists anywhere in the 360 pipeline** — this
    was checked directly and came back clean.
- **Mechanism for "10 photos consolidated into one point": this is upstream of hc-frontend.** Since
  grouping is purely by `roomCapturePointId`, ten photos collapsing into one card/pin in **all three
  surfaces simultaneously** means those ten photo records share one `roomCapturePointId` value (either
  a real ID reused/duplicated by the new mobile flow across distinct physical points, or several
  distinct points all left with a null/empty id and falling into the shared per-project `'unknown'`
  bucket). The frontend is grouping exactly as designed on the ids it was given.
- **Web Viewer and Dashboard pick a "representative" photo for a point's displayed position with
  different tie-break rules** — both sort candidate photos by `imageTakenOn` descending, but:
  - Dashboard (`dashboard-360-service.ts:591-608`): SQL `ROW_NUMBER() OVER (PARTITION BY
    capturePointId ORDER BY imageTakenOn DESC NULLS LAST, fileReferenceId)` — deterministic secondary
    sort key.
  - Web Viewer 3D markups (`media-service.ts:783-791`) and editor cards
    (`build-capture-point-summaries.ts:67-71`): plain JS `.sort((a,b) => dateB - dateA)`, **no
    secondary sort key** — ties resolve to in-memory array order (pagination/merge order).
  - If a burst of custom-point photos share an identical (or near-identical) `imageTakenOn`, and their
    individual `xMeters/yMeters/zMeters` differ (plausible if each photo is stamped with its own
    device-reported position rather than one calibrated point location), Dashboard and Web Viewer can
    legitimately pick a **different** photo as "the" position for the same `roomCapturePointId` —
    producing a genuinely different pin location per surface even though neither query is
    individually wrong. Both paths feed the chosen position through the same shared transform
    (`media-service.ts:805`, `dashboard-pinpoint-base-service.ts:176-186`), so the transform itself is
    not the divergence point.
- **Web Viewer supports incremental refresh; Dashboard does not.**
  `MediaService.load360Captures` (`media-service.ts:410-505`) computes
  `useIncremental360 = previousLastSync360 != null && this._360Captures.length > 0` (`:427-429`) and,
  when true, asks the backend for only captures changed since `lastSyncDateTime` (`:440-444`).
  `load360Captures(true)` (forcing this path) fires after almost every edit/delete interaction
  (`capture-360-panel.tsx:105`, `capture-point-360-properties.tsx:47`,
  `capture-360-properties.tsx:46,218`, `slideshow.tsx:139`). `Dashboard360Service._fetchAllCaptures()`
  (`dashboard-360-service.ts:205-238`) by contrast **always does a full, unfiltered fetch** — it never
  sends `lastSyncDateTime`. `LastSyncService`'s `toJSON`/`fromJSON` persistence methods exist but have
  **zero call sites** — the sync clock is purely in-memory and resets on every page load.

### INFERRED / NOT VERIFIED

- Whether the new custom-capture-point photos actually share `roomCapturePointId` values or land in
  the `'unknown'` bucket — would need the raw capture records (backend/DB), not visible from the repo.
- Whether an edge case in the backend's `lastSyncDateTime` filter (timestamp semantics, timezone,
  boundary handling) could silently exclude the new custom points from an **incremental** Viewer
  refresh while Dashboard's always-full fetch still shows them — falsifiable in a live session (see
  §5 H3).
- **No frontend mechanism was found that would make Building 1's new points invisible on Dashboard
  specifically while Building 2's render fine** — checked the room/level LEFT JOIN (explicitly
  commented as non-exclusionary, `dashboard-360-service.ts:571-572`) and the full-fetch path; nothing
  building-scoped exists in this code. This looks most consistent with a **backend/indexing timing
  issue** (new points not yet visible to the `/360captures` or `/room-capture-points` endpoints when
  Dashboard queried), outside hc-frontend — flagged explicitly as unconfirmed rather than guessed.

## 5. Hypotheses, ranked, each stated as a falsifiable prediction

**H1 (leading, Building 1's "10 photos → 1 point") — the new mobile flow wrote a duplicate or
missing `roomCapturePointId` across distinct physical points.** *Prediction:* the 10 consolidated
Building 1 captures share one identical `roomCapturePointId` value (or all have it null/empty) in the
raw capture records — a single DB/API lookup on that building's captures settles this immediately.

**H2 (Building 2's location mismatch between Web Viewer and Dashboard) — tie-break divergence on
near-simultaneous captures.** *Prediction:* the mismatched Building 2 capture points have ≥2 photos
sharing the same (or very close) `imageTakenOn`, with differing `xMeters/yMeters/zMeters` between
them. Falsified if each mismatched point's photos all share one identical position already.

**H3 (Building 1's "new points don't appear in Web Viewer at all") — incremental-sync edge case.**
*Prediction:* the missing points appear immediately after a **hard reload** of the Web Viewer tab
(which resets the in-memory sync clock and forces a full, non-incremental fetch). If they still don't
appear after a hard reload, H3 is dead and the cause is elsewhere (e.g. genuinely not yet indexed
backend-side, same family as the Dashboard-invisibility symptom below).

**H4 (Building 1's "new points don't appear in Dashboard at all") — backend indexing lag, not
frontend.** No frontend mechanism found to explain this; treated as the working assumption pending
backend input, not as a confirmed cause. *Prediction:* the points appear in Dashboard after a fixed
delay or a project data refresh, with no frontend change needed.

**Ruled out by code:** frontend-side capture-point creation (dead code — creation is mobile/backend
only), spatial-proximity/clustering logic (does not exist), a `createdFrom`-based filter hiding custom
points (field is never read).

## 6. What remains unverified

- The actual `roomCapturePointId` values (and whether null/duplicate) on Building 1's 10 consolidated
  captures and Building 2's mismatched pair(s) — the single highest-value unknown, decisive for H1/H2,
  requires DB/API access not available from this repo.
- Whether the six attached screenshots show anything beyond what the description text already states
  (see §7 — unopened).
- Whether `createdFrom` on these specific captures is actually populated with a value indicating
  "custom"/mobile-created, which would confirm the backend does distinguish these points even though
  the frontend currently ignores that signal.

## 7. NEEDS HUMAN — unopened attachments

**All 6 attachments unopened this run** (`App_building 1.jpg`, `App_building 2.jpg`,
`Webviewer_Building 1.png`, `Webviewer_Building 2.png`, `Dasboard_building 2.png`,
`Dashboard_Building 1.png` — none accessible to the investigating agent). These are **corroborative
but not decisive** given the description text is already detailed and specific (which building, how
many photos, which surface) — the higher-value unknown is the raw `roomCapturePointId`/coordinate
data behind H1/H2, which no screenshot can show. Still worth a look before replying, in case the
screenshots reveal something the text didn't (e.g. whether the "grouped" Web Viewer point shows a
different `roomCapturePointId` label than expected).

## 8. Confidence

- **No frontend "custom capture point" concept exists; the mobile flow writes into the same shared
  data model as room-based points: 9/10** (exhaustive code search, not inference).
- **Grouping mechanism (shared `roomCapturePointId`, no spatial logic) as the explanation for
  points merging: 8/10** — the code path is fully verified; only the actual duplicate/null id on the
  real records is unconfirmed (needs DB access).
- **Tie-break divergence (H2) as the explanation for Building 2's location mismatch: 5/10** —
  plausible and falsifiable, but speculative until the timestamp/coordinate data is checked.
- **Incremental-sync edge case (H3) for Web Viewer's missing points: 4/10** — a real asymmetry exists
  (Viewer incremental vs. Dashboard always-full) but nothing yet ties it to this specific symptom；
  a hard-reload test would confirm or kill it in seconds.
- **Backend indexing lag (H4) for Dashboard's missing Building 1 points: 3/10, deliberately low** —
  no frontend mechanism found, but "no mechanism found in this repo" is not the same as "confirmed
  backend," so this is the weakest-evidenced hypothesis, not a conclusion.

**Overall triage confidence: ~6/10 on mechanism family (shared-key grouping is real and well
understood), ~3/10 on which specific record-level defect produced this specific ticket** — the
single DB lookup in §5 H1 would move this to 8-9/10 in one step.
