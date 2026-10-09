# PLT-3133 — New dashboard takes hours to a day to refresh after changes applied

**Raised** 2026-09-16 17:29 by Yash Patel (Freshdesk 7989). **Status** Open · Medium · assignee
Darminder Atker. First seen on the board this run (2026-09-17) — created after the 09-16 scheduled
run's fetch, so it never appeared in a prior entry.
**Domain tag:** `data-pipeline` — this is squarely `dashboard/data-pipeline.md`'s territory (Pipeline
A parquet refresh + the element-status delta-sync mechanism), not a progress-calculation-mode
question.

## Description (verbatim, condensed)

Customer (Kyriakos), project **ATL07**: updates to **element progress** and **intangible activity
%** take "hours up to a day" to appear in the Dashboard after being made in the Web Viewer. Customer
was told to expect immediate-to-15-minute reflection and asks (a) whether this is expected, (b)
whether there's a data-processing/sync problem, and (c) whether there's a manual action on their side
to force a refresh.

## Comments (3, all read)

1. `112348` Yash → Darminder, 2026-09-16 17:40: relays the above, adds that the behaviour spans
   **ATL05, ATL06, ATL07, ATL08**, affects both element status and intangible progress, and asks for
   example Activity/Element IDs + timestamps once the customer supplies them.
2. `112349` Yash, 17:41: Freshdesk 7989 → Waiting on customer (automation).
3. `112350` Darminder → Yash, 17:44: *"Will look into this as the status update should appear in
   dashboard once it is done in the editor. If we can get a video from the user that would be the
   most useful — updating status in editor then opening dashboard to see the element."*

No attachments on this ticket (confirmed — `attachment: []` in the Jira response, nothing to flag
as unopenable).

## Domain doc read first (per this routine's step 5)

`xyz-platform-context/dashboard/data-pipeline.md` (already covers this area, no new domain doc
needed) documents two load pipelines feeding the dashboard's DuckDB-WASM instance:
- **Pipeline A** (parquet, `planned-and-actual-*`) — project/category progress, cached in OPFS,
  re-downloaded "only when the backend's `artefactHash` changes" (doc's own wording, now refined
  below — no `artefactHash` field actually exists on this endpoint, see Verified §2).
- **Pipeline B** (artefacts) — `element-status`, `project-element-list`, `svf2-object-id-map`.
- A documented **delta-sync** path: `InstallationStatusServiceV2.setElementStatus()` POSTs the
  change and also inserts it directly into the open session's in-memory DuckDB table, so the
  *currently open* dashboard tab updates without a reload.

That doc, as written before this run, does **not** say what happens on a **fresh** page load (new
tab, next day, different device) for either pipeline — that gap is exactly the customer's question,
and is what this run's investigation (below) fills in.

## Investigation — two backend/frontend agents dispatched, findings verified against source

### Verified: `element-status` colouring has a real live-merge, but it is capped

`DashboardProgressService._initialize()` (`dashboard-progress-service.ts:659-713`) runs on every
page mount, unconditionally — not just session-continuation. It calls
`_loadArtefactsAndBuildView()` (`:802-973`), which after `ArtefactLoader.loadElementStatusParquet()`
(`artefact-loader.ts:299-345`) loads the nightly `element-status` parquet, **chains into**
`ArtefactLoader.syncElementStatusDeltaFromAPI(endSyncDateTime)` (`:828-833` → `artefact-loader.ts:
353-429`). That call:
1. reads the parquet's own watermark, `ElementStore.getLastSyncTime('element_status')` = `MAX
   (lastModifiedOn)` (`duckdb-element-store.ts:295-305`);
2. calls `serviceProvider.Element.listElementStatuses(projectId, { lastSyncDateTime,
   endSyncDateTime })` — i.e. "give me every status row modified since the parquet's own max
   timestamp" (`element-api-service.ts:77-90`);
3. upserts the result into DuckDB (`_mergeElementStatusDelta`, `artefact-loader.ts:733-762`).

This is, functionally, the exact merge algorithm documented as required in the **backend's own API
contract** — verified directly by reading `XYZPlatformApi/src/swagger.components.schemas.json:
3708-3717` (`ModelArtefactParquetElementStatus`): *"Nightly snapshot of `xyz.ElementInstallationStatus`
... merge with live API 2 records filtered by `lastModifiedOn` greater than the max timestamp in the
file."* So the frontend does implement the documented reconciliation, on the fresh-load path, not
only within a single open session.

**The cap that reproduces the symptom, verified:** the delta fetch's `endSyncDateTime` is `this
._v2Loader.getCalculatedOn()` (`dashboard-progress-service.ts:674` and again at `:833`), with an
in-code comment: *"capped at the progress `calculatedOn` so coloring never runs ahead of the
figures."* **Any status change made after the last V2 progress recalculation (`calculatedOn`) is
excluded from the merge**, even though the merge mechanism itself runs correctly. If
`calculatedOn` only advances once a day (see next section), a same-day status edit is invisible on a
fresh load until the next `calculatedOn` tick, however recently it was actually saved.

### Verified: intangible/activity progress % (Pipeline A) has **no** merge step at all

`ProgressOutputsV2Loader.loadProgressFiles()` (`progress-outputs-v2-loader.ts:113-205`) downloads
exactly two parquet snapshots (`category_groups`, `project_progress`) straight from
`cloudStoragePath` into DuckDB. **No `lastSyncDateTime`/`since` parameter, no live-API call, no
merge step exists anywhere in this file or in `ProgressOutputsApiService`** (whose only relevant
field is the read-only `calculatedOn` timestamp, `progress-outputs-api-service.ts:12`). Pipeline A's
caller, `_loadV2ProgressFiles` (`dashboard-progress-service.ts:719-796`), never reconciles beyond the
parquet. **For "intangible %" specifically, the customer's symptom is fully and simply explained:
freshness is bounded entirely by how often the backend regenerates that parquet, with nothing on the
frontend bridging the gap.**

### Verified (backend, `XYZPlatformApi`): where these numbers actually come from, and what could not be found there

- `GET /api/v2/projects/:projectId/progress-outputs` → `getProjectProgressOutputs`
  (`projects.controller.ts:348-358`) → `projects.service.ts:132-145`, backed by a Postgres function
  call, `SELECT * FROM reporting."fn_GetLatestProgressOutputs"($1)` (`projects.service.ts:20`). This
  repo only **reads** the pre-computed rows — there is no cron, queue, worker, or job directory
  anywhere in `XYZPlatformApi` (checked `package.json` deps and top-level `src/` dirs; `kafkajs` is
  present but only wired to CDE/Autodesk integration, unrelated to progress data).
- The activity-progress **write** path is separate and immediate: `POST /api/v2/projects/:projectId/
  activities/progress` → `saveActivitiesProgress` (`activities.service.ts:258-278`) → a synchronous
  stored-procedure call, `CALL xyz."usp_InsertActivitiesProgress"($1,$2,$3,$4)` — no queue, writes
  land in the OLTP table immediately.
- **Not found in this repo, and therefore not verified — flagged, not guessed:** the actual batch
  job that turns raw `ActivityProgress` rows into the `category_groups`/`project_progress` parquet
  files, its schedule, and whether it runs more or less often than the `element-status` parquet's
  documented nightly cadence. This must live in a separate pipeline/repo not accessible from this
  session. **This is the one fact that would convert "up to a day, bounded by an unknown cadence"
  into an exact number for the customer.**

### What this settles about Darminder's own comment (112350)

Darminder's *"the status update should appear in dashboard once it is done in the editor"* is true
for the **same open session** (delta-sync writes straight into the live DuckDB table) — but not, per
the above, for a **fresh load**, where element-status is capped at `calculatedOn` and progress % has
no live path at all. His ask for a video (editor update → open dashboard) is likely to reproduce
exactly this: if the video shows a *fresh* dashboard open (not the same tab that made the edit), a
multi-hour gap is the expected, current behaviour, not evidence of an outage.

## What remains unverified

- The actual regeneration schedule/trigger for the Pipeline A parquets (`category_groups`,
  `project_progress`) — not found in `XYZPlatformApi`, likely in an external pipeline repo not in
  this session's scope.
- Whether `calculatedOn` itself advances on the same cadence as the element-status parquet's
  "nightly" label, or on its own separate schedule — the swagger doc's "Nightly snapshot" language is
  on `ModelArtefactParquetElementStatus` specifically, not verified for the progress-outputs
  artefact type.
- Whether the customer's four affected projects (ATL05/06/07/08) share anything unusual, or whether
  this is simply the first time this specific "how fresh is fresh" question has been asked plainly —
  no evidence yet of an actual regression, as distinct from a documented-but-unfamiliar cadence.
- Darminder's requested video/repro has not yet been supplied (comment 112350 is 1 day old as of
  this fetch — status is Freshdesk "Waiting on customer").

## 2026-09-18 — the customer's concrete example landed, and it is checkable from inside the app. Four new screenshots (unopenable here). "Atom" appears as a second edit path.

**The 09-17 entry above was written from a fetch taken before 09:16 BST that day and is therefore
incomplete, not wrong** — it recorded 3 comments and `attachment: []`. The live ticket now has
**6 comments and 4 PNG attachments**, all added 2026-09-17 09:06–09:17. Nothing above is superseded;
this section adds what arrived after that fetch.

Live fields this pass: status **Open** (unchanged), priority Medium, assignee **Darminder Atker**
(unchanged — unlike PLT-3033, no automation reassignment has fired here), reporter Yash Patel,
`updated` `2026-09-17T09:17:03+0100`, resolution `null`.

### New comments

- `112385` (09-17 09:06) — Freshdesk 7989 → **Open** (automation).
- `112387` (09-17 09:16, Yash → Darminder) — the substantive one. Customer supplies a specific
  example and widens the report in two ways that matter:
  - **The edits are made through the Web Viewer *and Atom*** ("updated through both the Web Viewer
    and Atom on a daily basis"). The 09-17 entry only reasoned about the Web Viewer.
  - Customer's own words: *"I installed these elements yesterday, however even though the Dashboard
    refreshed several hours later they still appear un-installed."* Plus: *"It seems Dashboard gets
    stuck and does not refresh normally."*
  - Four screenshots attached (see below): the elements marked installed, and the same elements
    still reading uninstalled in the Dashboard hours later.
- `112388` (09-17 09:17) — Freshdesk 7989 → **Waiting on 3rd line**. The ball is explicitly ours now;
  it is no longer parked on the customer.

### Why this example fits the documented cap rather than contradicting it

The customer's framing is "the Dashboard refreshed but the elements didn't change", which sounds
like a stuck cache. Under the mechanism verified on 09-17 it is the expected output, because
**"refreshed" and "merged my edit" are two different events**:

- Re-verified this pass, unchanged: `endSyncDateTime` is `this._v2Loader.getCalculatedOn()` and is
  only set when the progress-outputs prefetch succeeds —
  `dashboard-progress-service.ts:670-674` (`const endSyncDateTime = outputs ? (this._v2Loader
  .getCalculatedOn() ?? undefined) : undefined`), with the in-code comment at `:666-668` stating
  that on prefetch failure "delta syncs run uncapped". Passed through to
  `syncElementStatusDeltaFromAPI` at `:690` → `:833`.
- **New this pass — the element-status delta path has no freshness short-circuit.**
  `artefact-loader.ts:353-429` runs the delta unconditionally on every fresh load. Its sibling,
  `syncActivityLinksDeltaFromAPI`, *does* skip the API call when the parquet watermark is under five
  minutes old (`artefact-loader.ts:604-612`). So for element status the `calculatedOn` cap is the
  **only** gate, and it is a hard one: a page reload does not and cannot pull in an edit made after
  `calculatedOn`, no matter how many times the customer reloads. That is exactly the "refreshed but
  nothing changed" signature they describe.

### New this pass, and the reason this is now a checkable ticket: `calculatedOn` is shown in the UI

The progress panel renders **`Last updated: <calculatedOn>`** — `progress-panel.tsx:277-288`, using
the `formatCalculatedOn` helper defined at `progress-panel.tsx:17`, fed from
`use-progress-panel-data.tsx:23,363`, which is the same value emitted by
`dashboard-progress-service.ts:744` and the same one used as `endSyncDateTime` at `:674`.

**This means the cut-off is already visible to the customer, on the screen they are complaining
about.** The diagnostic is therefore free and needs no backend access, no logs and no new build:

- If `Last updated` is **older** than the time the elements were marked installed → this is the
  documented cap behaving as designed, and the only real question left is the regeneration cadence
  (still unknown, see 09-17 entry).
- If `Last updated` is **newer** than the edit and the elements still read uninstalled → the cap is
  *not* the explanation and something genuinely is stuck. That would be a new defect, and the next
  place to look is whether the backend's `listElementStatuses` delta
  (`element-api-service.ts:77-90`) is actually returning those rows for the window requested.

Either answer moves the ticket. The screenshots the customer already sent may even contain it, if
the progress panel is visible in either one — unverifiable here, see below.

### The Atom path qualifies Darminder's 09-16 comment further

The 09-17 entry noted that Darminder's *"the status update should appear in dashboard once it is done
in the editor"* holds only for the same open session, via the in-session delta-sync write
(`InstallationStatusServiceV2.setElementStatus()`). **For edits made in Atom that consolation does
not exist at all** — there is no browser session holding an open DuckDB table to write into, so an
Atom edit is *only* ever visible to the Dashboard through the capped fresh-load merge. If a
meaningful share of this customer's daily updates come from Atom, the "it should appear immediately"
expectation was never achievable for those, independent of any cadence question. **Unverified:**
that Atom writes land in the same `xyz.ElementInstallationStatus` table the artefact and the delta
API read from — highly likely from the swagger contract quoted in the 09-17 entry, but the Atom
client is not in either repo reachable from this session.

### Pattern check (per routine step 4) — this is not novel

`incidents/recurring-defect-patterns.md` already carries the `calculatedOn` cap as a **candidate**
entry (2026-08-13, PLT-2874, § "Dashboard element-sync capped at the progress artefact's
`calculatedOn`, editor's sync isn't", plus the 2026-08-14 amendment that narrows it). PLT-3133 is
the **second independent report with the same shape** — and the first from a customer on Production
rather than from QA on Staging. It is not yet a *confirmation* of PLT-2874's mechanism (that ticket
had three live hypotheses and this one does not distinguish between them), so nothing there is
promoted by this entry; a cross-reference has been added instead. Recognition signature worth
carrying: **"the dashboard refreshed but my change still isn't there" is a cap symptom, not a cache
symptom** — check the panel's own `Last updated` before assuming staleness.

### New unopenable attachments (metadata only — 403 on content is a confirmed gap for this session, not re-tested)

All four uploaded by Yash Patel, 2026-09-17 09:16, PNG:

| id | filename | size | what it would settle |
|---|---|---|---|
| 64823 | `Screenshot 2026-09-17 134446.png` | 285 KB | largest of the "element details" pair — likely the Web Viewer/Atom side showing the elements marked installed, with timestamps |
| 64824 | `Screenshot 2026-09-17 110534.png` | 176 KB | one of the two inline images in the customer quote — the Dashboard still showing them uninstalled |
| 64825 | `Screenshot 2026-09-17 110458.png` | 137 KB | the other inline image — the installed-state evidence |
| 64826 | `Screenshot 2026-09-17 134520.png` | 422 KB | second "element details" shot; **the most likely of the four to contain the progress panel's `Last updated` value**, which is the single fact that resolves this ticket |

None of these can be read by this routine. A human opening **64826 and 64824 side by side** and
reading `Last updated` against the installation timestamp would likely close the diagnosis without
any further customer contact.

### What remains unverified (carried forward plus new)

- Everything under the 09-17 entry's "What remains unverified" still stands, in particular the
  **Pipeline A parquet regeneration cadence** — still the one number that converts "up to a day"
  into an answer for the customer.
- Whether the four screenshots show the `Last updated` value (cannot open them).
- Whether Atom's write path is the same `ElementInstallationStatus` table (Atom client not in scope).
- Whether `calculatedOn` for ATL05–ATL08 is actually lagging, or advancing normally — this is the
  crux and is a data question about those four projects, answerable only with app or DB access.

## 2026-09-21 (scheduled) — LEFT SCOPE this run: status moved to With Technical Support

Live `getJiraIssue` (`status`, `comment`, `updated`): status is now **With Technical Support**
(statusCategory "To Do"), assignee still **Yash Patel** (Jira assignee field; Darminder remains the
drafted recipient throughout this ticket's history). `updated` = `2026-09-18T17:01:57+0100`. Two new
comments since the 09-18 entry above, both same-day:

- `112500` (Yash, 09-18 10:27) relays a customer update: *"It seems the updated elements were not
  part in the FED model, hence that might be the cause of the dashboard not refreshing. For ATL05
  after installing an element the refresh took place after 5-10 minutes as expected. However when I
  update intangible progress through the Web Viewer the dashboard does not refresh automatically."*
  This is a **new, independent confirmation of the two-pipeline split already diagnosed on 09-17/18**
  — element status *did* eventually refresh (consistent with the capped delta-merge path), intangible
  progress did not (consistent with "no live merge path at all" for Pipeline A, § 09-18 above). The
  FED-model remark is a new, not-yet-investigated wrinkle (whether an element outside the current FED
  model is excluded from the delta sync entirely) — not evaluated this run, out of scope while parked
  With Technical Support.
- `112567` (Rishi Bhugobaun, 09-18 17:01) is the handoff comment that likely explains the status
  move: asks Yash to clarify whether the customer expects live in-tab refresh vs. a reload, then
  states *"Currently, values will only update when the page is reloaded. On this project at the
  moment I can see the progress calculations have updated, and it appears to be ~15 mins after the
  last change from checking the DB."* **This is independent, DB-level confirmation of the
  `calculatedOn`-cap mechanism from a second engineer** — reload-only refresh, and a ~15-minute
  cadence, matching the capped-merge model this ticket's own investigation traced through
  `dashboard-progress-service.ts`/`artefact-loader.ts`. Nothing here contradicts the 09-17/09-18
  diagnosis; it corroborates it from the DB side rather than the code side.

**Why this reads as a handoff, not a resolution:** no comment states the ticket is fixed, closed, or
"as designed" — Rishi is actively still asking a clarifying question of Yash (unanswered as of this
fetch), and the ball is now explicitly with a technical engineer rather than with the customer or
with us. Per this routine's established precedent (PLT-3033 stayed tagged `groupA` through its own
earlier With-Technical-Support excursions rather than being renamed to `resolved`), **this folder is
NOT renamed** — a temporary internal hand-off is not the same as a fix identified/owned elsewhere or
an "as designed" close.

**Status for hand-back:** the fully-diagnosed mechanism from 09-17/09-18 (element-status delta capped
at `calculatedOn`; intangible % has no live merge path at all; the progress panel's own "Last
updated" field is the free diagnostic) stands unchanged and is corroborated, not superseded, by
today's two comments. It is ready to hand back to Group A evaluation, unchanged, if/when the ticket
re-enters scope. The one open technical thread this run adds to the unverified list: whether an
element being outside the "FED model" affects the delta-sync window independently of the
`calculatedOn` cap (raised by Yash in `112500`, not investigated).

## 2026-09-22 (scheduled) — RE-ENTERED SCOPE: status back to With Customer. Rishi's DB spot-check finds no delay over 15 minutes; ball is now on the customer for a concrete repro.

Live `getJiraIssue` re-fetch: status is now **With Customer** again (was With Technical Support as of
09-21), assignee still Yash Patel. **11 comments, up from the ~9 recorded through `112567`** on
09-21 — three new, all same-day (09-21):

- `112603` (Yash, 09:41) — clarifies for Rishi what the customer actually means: not "the dashboard
  page doesn't live-refresh while open" (Rishi's 09-18 question), but "the underlying data takes
  hours/a day to appear in the Dashboard after a Web Viewer edit."
- `112616` (Rishi, 11:13) — **concrete backend measurement**, a table of save-to-output timestamps
  across four projects:

  | Project | Saved | Output updated | Elapsed |
  |---|---|---|---|
  | ATL06 | 15 Sep 06:44:56 | 06:47:52 | 3m |
  | ATL08 | 16 Sep 07:11:56 | 07:19:16 | 7m |
  | ATL05 | 17 Sep 13:38:18 | 13:51:24 | 13m |
  | ATL07 | 16 Sep 06:52:55 | 07:06:38 | 14m |

  All four are inside the ~15-minute `calculatedOn`-cap cadence already diagnosed on 09-17/09-18 —
  **none shows anything close to the customer's reported "hours, up to a full day."** Rishi asks for
  concrete examples (activity/element ids, expected values, filter state) to investigate further.
- `112621` — Freshdesk sync, "Waiting on customer."

**Net effect: this corroborates, and now measures, the existing diagnosis — and shifts the open
question from "is there a pipeline delay" to "why does the customer's experience not match four
independent spot-checks."** Per the standing precedent (PLT-3033's own earlier With-Technical-Support
excursions), this folder was never renamed away from `groupA` and stays that way now that the ticket
is back with the customer. The FED-model wrinkle raised in `112500` (09-18, an element outside the
current FED model possibly excluded from delta sync) is still unraised as its own thread and still
not investigated.

## 2026-09-24 (scheduled) — confirmed unchanged

Live `getJiraIssue` re-fetch: status still **With Customer**, assignee still **Yash Patel**, still
11 comments, newest still `112621` (09-21, Freshdesk "Waiting on customer"). Rishi's 09-21 ask for
concrete activity/element examples with timestamps is still unanswered by the customer. No
re-investigation performed.

## 2026-09-25 (scheduled) — confirmed unchanged

Live `getJiraIssue` re-fetch: status still **With Customer**, assignee still **Yash Patel**, still
11 comments, newest still `112621`. Rishi's 09-21 ask for concrete examples remains unanswered. No
re-investigation performed.

## 2026-09-28 (scheduled) — status silently flipped With Customer → Open via Freshdesk sync, not a real customer reply

Live `getJiraIssue` re-fetch: status now **Open** (was **With Customer** on 09-25), assignee still
**Yash Patel**, 12 comments, one new: `113055` (Yash, 2026-09-25T08:53:30) — *"Ticket ID: 7989 -
Freshdesk ticket status changed to: Open"*. That is the whole comment; it is Freshdesk's own
automation echoing a status bounce on their side, not a customer message and not new content. **Do
not read the status change as "ball back with us"** — Rishi's 09-21 ask for concrete
activity/element examples with timestamps (`112616`) is still unanswered, one week now. Same shape
as the silent board moves already logged this week on PLT-2651, PLT-2918, PLT-3109 and PLT-3147:
status/assignee fields move with no human comment narrating why. No re-investigation performed;
`recommended-action.md`'s "correctly parked, nothing to draft" verdict is unchanged — if anything
the Freshdesk noise makes it more important to state plainly that no real update has landed.

## 2026-09-29 — one new comment, still Freshdesk noise

Newest comment `113113` (Yash, 09-28 08:59): *"7989 … Waiting on customer"*. It landed ~40 minutes after
the 09-28 run and Jira status is still `Open` (the Freshdesk echo did not move it back to With Customer
this time). So the 09-28 reading holds: ball is with the customer, Rishi's ask `112616` (09-21) for
concrete examples is unanswered, now 8 days. Status label is misleading, not the situation.

## 2026-09-30 (scheduled) — unchanged
Fresh fetch: newest comment and status identical to this folder (no new comment since the last entry). Standing ages are one day older; nothing re-drafted. No Jira action taken.

## 2026-10-02 (scheduled) — status Open -> With Customer, moved by Rishi, no comment

Fresh fetch: 13 comments, newest still `113113` (Yash, 09-28), same as the folder. Changelog: **Rishi moved it Open -> With Customer on 10-01 16:52** (the Open state was Freshdesk automation on 09-25, not a customer reply; see 09-28 entry). So Rishi is now explicitly treating the ball as with the customer, which matches his 09-21 ask (`112616`) for concrete ids / expected values. Customer has been silent since then (11 days). Folder tag unchanged.
Not re-investigated; nothing verified beyond the fetch.

## 2026-10-05 (scheduled) — unchanged
Fresh fetch with comments: 13 comments, newest `113113` (Yash, 09-28), With Customer. Customer owes concrete examples (Rishi's three asks, `112616`); 14 days since the ask, 7 since Freshdesk went to Waiting on customer. Backend timing was measured by Rishi (3 to 14 minutes, `112616`). Class 1, parked. No Jira action was taken.

## 2026-10-08 (scheduled) — customer replied 10-07 with a sharper symptom; a linked dashboard-pipeline bug (DPL-1707) fits it and was not in these notes

**Supersedes** the 10-02 / 10-05 entries' "nothing new, parked with customer": 7 comments landed on 10-07 (`114184`..`114335`, 20 total).
Status is still **Open** (Freshdesk echo: Open 11:01, Waiting on 3rd line 11:09, Waiting on customer 14:46, Open 15:21,
Waiting on customer 15:32); assignee Rishi.

### What the customer said (`114187`, 10-07 11:09, relayed by Yash)
*"I have updated several intangibles and the dashboard won't refresh if I don't update the installation status of an element
included in the FED."* Example project ATL06, one new screenshot (attachment `65932`, unopenable) and a session id
(`platform-web-622ab899-076e-45bb-adff-333d03d71a67`). This is the same split as `112500` (09-18): element installs refresh in
5-10 min, **intangible-only edits do not**.

### Rishi's reply (`114221`, 10-07 12:16)
Cannot see anything wrong; repeats the three asks from `112616` (activities + expected values, **last calculation time on the
progress tab**, filters), plus "when they edited / reported / checked". Adds: *"From the DB I can see that the progress was
updated several times this morning."* **Unverified which table he means** (raw input rows vs the calculated output). That is the
whole question below.

### New: issue link `DPL-1707` (Relates), "Actual progress calculation fails when the progress date range spans a calendar year
boundary" — Backlog, assignee Kuba.Maruszczyk, reporter Rishi, created 09-21 10:49 (24 minutes before `112616`)
Read in full this run. Its claims, **all taken from the ticket, none verified by us** (the pipeline repo is outside this session):
- `activity_actual_progress_from_reported_labour_hours` throws on a `pl.concat(how="diagonal")` dtype mismatch (Decimal vs Float64)
  whenever the progress date range crosses a calendar-year boundary (2+ yearly chunks). Fails every time, per project.
- Effect: `ProjectChangelog.LaborHoursProgressLastCalculatedOn` never advances and **no new activity- or project-level
  `planned-and-actual` output is produced. "User-entered (intangible) progress never reaches the Dashboard."** Each new edit triggers a
  new run that fails identically.
- Range = min(schedule start, earliest check date, earliest user-progress date) to max(schedule finish, latest check, latest
  user-progress). Prod "unaffected only because ATL05-08 ranges sit inside 2026" (they calculated OK 15-17 Sep).
- **Dated risk: fails automatically on 1 January 2027 (85 days from today) for every prod project, earlier for any project whose
  range already reaches 2027** (a 2027 finish date, a 2025 revision, or out-of-year progress).
- **Secondary effect, directly relevant here:** while the labour asset fails, `category_groups_planned_and_actual_progress` still runs
  on its own trigger and re-stamps a **fresh `calculatedOn` over months-old activity data** (dev example: stamped 09-21 over 14 July data).

This matches the customer's symptom point for point (intangible edits never show; element status does, because it is a different
path). It is a **hypothesis, not a finding** for ATL06: DPL-1707 itself says ATL05-08 were fine on 15-17 Sep, and Rishi wrote
`112616` the same morning he raised it, so he knows it and judged prod clear then. What has changed since is unknown.

### Falsifiable prediction (one query, Rishi has the DB)
*If DPL-1707 is the cause on ATL06:* `LaborHoursProgressLastCalculatedOn` is **older than this morning's intangible edits**, and the
orchestrator shows a failed run for the ATL06 partition after them. *If it is not:* it advanced within ~15 min of the edits, and the
cause lies elsewhere (candidates below). Check **before** asking the customer for more screenshots.

### Correction to my own 09-18 diagnostic — SUPERSEDES "the panel's `Last updated` is a free yes/no"
09-18 said `Last updated` older than the edit = cap working as designed, newer = real defect. **Under DPL-1707 that test is unsafe.**
The FE's `calculatedOn` is `max(project-level, category-groups)` (`progress-outputs-v2-loader.ts:80-82`, re-read this run, live; used as
the merge cap at `dashboard-progress-service.ts:674` and `:833`, also live) and **never reads the activity-level output's stamp** (09-22
finding). If category-groups is re-stamped over stale activity data, `Last updated` looks fresh while intangible % is frozen. So
Rishi's own ask #2 (read the progress tab's last calculation time) can return "fresh" in exactly the failing case. The reliable
signal is the backend's `LaborHoursProgressLastCalculatedOn`, not the panel.

### Other candidates if the DB check clears DPL-1707 (none verified)
1. The element-status merge is capped at `calculatedOn` (`:674`), so an install after the last recalculation is hidden; unrelated to
   intangibles but could be what the customer sees for installs.
2. OPFS parquet cache serving an old file: not tested; `data-pipeline.md` says re-download is keyed on a hash, no such field was found on
   the endpoint (09-17 note).
3. "Not part of the FED model" (`112500`, 09-18): never investigated.

### Verified vs inferred this run
Verified: Jira comments/ids/timestamps above (fetched live, 20 of 20); DPL-1707 text; `getCalculatedOn` call sites live on
hc-frontend `4f6464e`; `XYZPlatformApi` has no recalculation trigger on the activity-progress write path (grepped `src/`: only a read of
`CalculatedOn`, `projects.service.ts:740`). Inferred: that DPL-1707 applies to ATL06 now. **Not verified:** ATL06's date range, the
run history, which table Rishi meant, the contents of attachment `65932`.

### Unopenable media (403, confirmed gap)
`65932` `Screenshot 2026-10-07 130039-20261007-100846.png` (119 KB, Yash, 10-07 11:09): the customer's ATL06 example. Would show
which activities were edited and whether their dashboard values moved. Older: `64823`-`64826` (09-17), `64906` (Rishi, 09-18).

## 2026-10-09 (scheduled) — status Open to With Customer; nothing new from either side

Fresh fetch (20 comments). Newest `114335` (10-07 15:32), a Freshdesk "Waiting on customer" echo, after `114323`/`114326` (more echoes). Jira status moved to **With Customer** on 10-08 (updated 14:16), so Yash has put Rishi's three asks (`114221`: when the activity changes were made, when reported, when checked; the last-calculation time on the progress tab; whether filters are applied) to the customer on 10-07. Ball: customer, 2 days. Nothing for us to chase. The DPL-1707 question to Rishi from the 10-08 draft stands and is still unanswered. Attachments unchanged (five screenshots, `65932` unopenable). **Class 1 (customer), with the class 4 half (DPL-1707 priority) unchanged.** No Jira action was taken.
