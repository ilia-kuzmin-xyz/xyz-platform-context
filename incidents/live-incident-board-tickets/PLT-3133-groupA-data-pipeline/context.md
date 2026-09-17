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
