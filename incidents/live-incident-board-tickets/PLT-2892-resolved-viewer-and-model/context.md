# PLT-2892 — "LVN-BL1-Model in dashboard syncing forever" — triage context

## ✅ RESOLVED — 2026-07-16 (folder retagged from groupA → resolved)

Ticket moved to **READY FOR RELEASE** (15 Jul 13:35). Full arc, fast:
- 2026-07-13 18:25 — Ilia found the bug in code: the dashboard page didn't handle
  the edge case of a project with linked elements but **no applied statuses** —
  the editor calculates colour visualization via activity links in that case, the
  dashboard just failed. Hotfix authored same day.
- 2026-07-15 13:28 — **Gennaro Boccia (QA) verified fixed on Staging 26.3.2.**
- 2026-07-15 13:35 — Freshdesk → "Awaiting release"; Jira → READY FOR RELEASE.

**No action needed this run** — excluded from Group A by the board's own scope
rules (READY FOR RELEASE is in the exclusion list). Folder kept as historical
context (same convention as PLT-2891). One good-news data point: from first
triage message to QA-verified fix took under 48 hours — worth noting as a
positive pattern for the playbook (edge-case bug, single owner, fast repro-to-fix,
no unannounced prod changes).

---

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2892
- **Issue type:** Live Incident ("To track live incidents on site.")
- **Status:** Open (category: To Do / blue-gray) — freshly triaged, no analysis on-thread yet.
- **Priority:** Major
- **Project (site):** LVN-BL1
- **Software Area (report form):** Dashboard · **Device still usable?:** "Not Usable"
- **Reporter:** Yash Patel (coordinator/support per roster)
- **Assignee:** Darminder Atker (fullstack team lead)
- **Created / Updated:** 2026-07-13 12:46 / 13:08 (+0100) — hours old at time of triage (today 2026-07-13)
- **Components / Labels:** none
- **Freshdesk:** #7399, set to "Waiting on 3rd line" (i.e. back on us)
- **Session id (from user):** `platform-web-1b2af15e-0501-45f2-8a43-c0e9ec01a2c5`
- **Domain slug:** `viewer-and-model`

---

## One-line symptom

On the **native dashboard** for project **LVN-BL1**, the **3D model never finishes loading** — the reporter's user sees it "processing / syncing" and it "doesn't load correctly after 1h". Yash reproduced a slow load on his own machine.

---

## Description (verbatim, trimmed of the empty form fields)

> Software Area: Dashboard … Is The Device Still Usable?: Not Usable, Project: LVN-BL1
> Description: Hi, The model in the dashboard doesn't load correctly after 1h processing. See snip below `![](blob: … UNKNOWN_MEDIA_attachment …)` Session id: platform-web-1b2af15e-0501-45f2-8a43-c0e9ec01a2c5

## Comments (chronological — both by Yash Patel, 2026-07-13)

1. **12:52** — "Hi @Ilia Kuzmin, user has reported that model in dashboard for project **LVN-BL1 is taking way too longer to load than usual time.** session id from user- platform-web-1b2af15e-0501-45f2-8a43-c0e9ec01a2c5 … `![](blob: … id=62cc5f62-2392-49c1-a34c-ba77f547152e … height=904 width=1909 …)` **I tried to load it on my end as well and it takes longer than it should.** Can you please look into this?"
2. **13:08** — "Ticket ID: 7399 - Freshdesk ticket status changed to : Waiting on 3rd line"

**Observation ambiguity (playbook Q1 — unresolved).** The title says "syncing **forever**" (never resolves); the description says "doesn't load correctly **after 1h processing**"; the comment says "**taking way too longer than usual**" / "takes longer than it should". These are two different failures: (i) load truly never completes, or (ii) load is very slow but may eventually finish. Yash reproduced a slow load — but the thread does **not** say whether his ever completed or how long he waited. This is the first thing to pin (see recommended-action).

---

## Attachments — ⚠️ NEEDS HUMAN

- ⚠️ **`image-20260713-114949.png`** (263 KB PNG, Yash Patel, 2026-07-13 12:52) — the reporter's screenshot of the stuck dashboard. **This is the key piece of evidence and I cannot read it** (binary PNG behind Atlassian auth). Do **not** guess its contents. A human must confirm from it **which UI state is on screen**, because the code paths diverge sharply (see Mechanism):
  - a **loading spinner / dark viewport** → URN resolved, load started but never completed (leading hypothesis);
  - the text **"No model selected for reporting. Set a federated model in the Editor…"** → the federated model / current version / `accUrn` did not resolve (a *different* branch — this is NOT a "spinner", so it would contradict the "syncing" framing);
  - the overlay **"Error loading 3D model"** → Forge raised an explicit load error.
- ⚠️ **Inline description image** — broken `blob:` URL (`UNKNOWN_MEDIA_attachment`); not resolvable. Presumed to be the same screenshot.
- ⚠️ **Comment-1 inline image** — `blob:` id `62cc5f62-2392-49c1-a34c-ba77f547152e`, 1909×904; also the same screenshot, not readable here.
- ⚠️ The **user session** `platform-web-1b2af15e-…` and **Freshdesk #7399** likely contain the real timing/console evidence; not accessible from here.

---

## Mechanism — how the dashboard resolves + loads a model, and how a load can hang forever (file:line)

The dashboard has **no manual model picker** and **no polling** — it resolves the model once at page open and then relies on Forge/RxJS events to dismiss the loading state. Trace:

1. **Model resolution** — `DashboardProjectService._initializeModel()`,
   `hc-frontend/.../dashboard-provider/dashboard-project-service.ts:143-218`.
   Folder API → folder whose name contains `"federated"` → the model in it → `getProjectModelDetail` → `versions.find(v => v.isCurrentVersion)` → `currentVersion.accUrn` (lines 182-195). On any miss it logs and leaves `_loadedModel = null`, then in `finally` emits `_modelInitialized$.next(false)` (line 214). Telling in-code comment at line 193: *"Current version … has no accUrn — **ingest may not have completed**."*
2. **No-model branch is a message, not a spinner.** `dashboard-project-provider.tsx:136-148`: `initialized === false` → `setNoModelFound(true)`; `dashboard-viewer.tsx:80` then renders `<DashboardNoModel/>`, whose text is *"No model selected for reporting. Set a federated model in the Editor to view report data."* (`dashboard-no-model.tsx:68-69`). **So a perpetual "syncing" spinner is NOT this branch** — it means the `accUrn` DID resolve and the load then stalled.
3. **Model load** — `loadDashboardModel()`, `hc-frontend/.../dashboard-panels/viewer/use-model-loader.tsx:276-356`:
   `waitForObjectIdMap()` (90 s timeout, but on timeout it **only logs and proceeds** — lines 90-113) → `getSelectiveLoadingDbIds()` → `loadDocument()` = `Autodesk.Viewing.Document.load('urn:'+urn)` with **no timeout** (lines 168-186) → `findViewable()` → `aggregatedView.load()` (lines 218-257).
4. **Spinner lifecycle (the "forever" part).** `_isModelLoading$` is initialised **`true`** — *"Start as true to show progress bar"* (`dashboard-project-service.ts:67`). It is only set false by:
   - **progress projects:** the colour-service `onColorsApplied` callback → `setModelLoading(false)` + `setModelLoaded(true)` (`use-services-initialization.ts:78-82`), which fires **only after** `element_base_data` is built **and** geometry loaded **and** colours applied;
   - **quality-only projects:** `onModelRootLoaded` → `setModelLoading(false)` (`use-model-loaded-events.ts:62-65`);
   - **explicit error:** `onError` → `setModelError()` + `setModelLoading(false)` (`use-model-loader-effect.ts:47-51`), which surfaces the "Error loading 3D model" overlay (`dashboard-viewer.tsx:88-112`).
5. **There is no watchdog.** Despite comments claiming *"Fallback timeouts ensure state updates even if events don't fire"* (`use-model-loader.tsx:349`, `use-model-loader-effect.ts:54`), a grep of the whole dashboard-viewer tree finds **no `setTimeout` that dismisses `setModelLoading` or forces an error** — the only `setTimeout` in the load path is the 90 s `element_base_data` wait, which does neither. Therefore, for a **progress project**, if the Forge derivative geometry never arrives (translation incomplete/stalled) **or** a required progress artefact never materialises `element_base_data` (so colours never apply), **none** of the dismiss paths fire and `_isModelLoading$` stays `true` **indefinitely** → permanent spinner = "syncing forever". Crucially, a derivative that is *still translating but not errored* produces a **spinner, not** the error overlay, because `Document.load` only calls `onError` on an explicit Forge error code.

**Upstream state that decides this (backend, not FE):** whether LVN-BL1's current federated-model version is **fully translated** (Autodesk SVF2 derivative complete / ingest `SUCCEEDED`) vs still **"Processing"**. The model-ingest vocabulary — `Status.Processing = 'In progress'`, `OngoingStatuses = [Queued, Processing, Cancelling]` — lives in `model-upload/UploadStatus.types.ts:1-14`, and `ModelApiService.listOngoingModelUploads()` polls `ingestStatus` (`model-api-service.ts:167-178`) — **but that polling is in the upload panel, not the dashboard.** The dashboard reads `accUrn` **once** and never re-polls, so if translation is mid-flight at page open, the only "retry" is a manual refresh after it finishes.

---

## Playbook six-question status

1. **Observed / can we see it?** Partial. Symptom = LVN-BL1 dashboard model never/too-slowly loads; Yash reproduced a slow load. **Exact UI state and "does it ever finish" are unconfirmed** — they live in the unreadable screenshot + Yash's own repro.
2. **Expected / on whose authority?** "usual time" (Yash) — folklore, no number. Need the baseline load time for this project.
3. **Smallest broken-vs-working pair?** Not in ticket. Natural diffs a human can make: LVN-BL1 yesterday (worked?) vs today; or another project's dashboard loading fine *right now* vs LVN-BL1.
4. **Mechanism?** Established from code above — resolve-once `accUrn` → Forge load → colour-pipeline-gated spinner with **no timeout**. Solid.
5. **Why now (trigger)?** Not stated. Leading candidate: a **recently (re)uploaded LVN-BL1 model version whose SVF2 translation is stuck/slow** ("after 1h processing"). Unconfirmed — needs upload/version history + deploy list.
6. **Cohort?** Only LVN-BL1 + one client (Yash also affected). No other projects/models cited → looks **project/model-specific**, which argues against a global FE regression and toward a stuck-translation-for-this-model cause.

---

## Doc references (xyz-platform-context)

- `dashboard/viewer-and-model.md:85-95` — "Model resolution (Dashboard only)": documents the folder→model→`accUrn` chain and *"If any step fails, the viewer stays blank — no fallback."* **Does not** document the stuck/slow-translation → **infinite spinner with no timeout/error** case that this ticket is about.
- `dashboard/startup-journey.md:47-62` — loading timeline; confirms the dismiss point is `onColorsApplied → setModelLoaded(true) → loading bar fully dismissed`, i.e. gated on the full colour pipeline.
- `dashboard/data-pipeline.md:28-41,60-75` — Pipeline B (`element-status`, `project-element-list`, `svf2-object-id-map`) and `element_base_data`; the selective-load/colour path that must complete for the spinner to clear.
- `dashboard/pitfalls.md` — has "Federated folder naming" and "Wrong artefact in multi-model projects" (→ model stays grey) but **no** "stuck ingest / no load-timeout / infinite spinner" pitfall. Add one once this closes.
- `dashboard/README.md:21` — "No polling" (reactive-only) — relevant: the dashboard does **not** re-poll translation status; completion after a mid-flight translation requires a page refresh.
- `incidents/live-incident-playbook.md` — tone/pattern for the drafted reply.

---

## Working root-cause hypothesis

**Leading:** LVN-BL1's current federated-model version has a resolvable `accUrn` but its **Autodesk SVF2 derivative is not fully translated** (ingest still "processing" / stalled), so the dashboard's Forge document/geometry load never completes; because the dashboard has **no load-timeout/error watchdog** for progress projects (`_isModelLoading$` starts `true` and is only cleared by the colour pipeline), the loading spinner persists indefinitely → "syncing forever". "After 1h processing" fits a translation/ingest job, and the single-project/single-model cohort fits a per-model backend issue rather than an FE regression.

**Alternative (cannot yet rule out):** the `accUrn` is fine and Forge geometry loads, but a required progress artefact never finishes so `element_base_data` is never built → colours never applied → same never-cleared spinner. Distinguishing leading-vs-alternative needs the screenshot + backend status.

**Orthogonal but real, whatever the trigger:** the dashboard lacks a timeout/error surface for a progress-project model that *starts* loading but never finishes — the code comments assert a fallback that does not exist. That gap is what converts any upstream slowness into a silent "forever", and is a candidate FE follow-up regardless of this incident's cause.

**Confidence (per CLAUDE.md scale): 4/10 overall** for the incident root cause — the direction is clear and code-grounded, but the actual cause is environment-dependent and **cannot be confirmed without the unreadable screenshot and backend translation/artefact status for LVN-BL1's current version**. Sub-scores: FE mechanism (how a never-completing load yields a permanent, timeout-less spinner) **8/10**, code-verified; specific trigger (stuck SVF2 translation vs missing artefact) **3-4/10**, unverified.

**Still needed to close (playbook Phase 6):** (a) exact observed UI state + whether it *ever* completes; (b) backend translation/ingest status of LVN-BL1's current federated-model version (SUCCEEDED vs Processing) and whether it was re-uploaded recently (trigger); (c) cohort check — any other project/model stuck the same way right now.

---

## Deep-dive: console log analysis (2026-07-13, second pass — real customer console)

Customer console (LVN-BL1) shows two errors. Traced both through code; the spinner mechanism is now **confirmed, not hypothesized**.

### Error 1 — `project_rooms_raw does not exist` (red herring for the spinner, real bug on its own)
- `dashboard-360-service.ts:299-346` — `_fetchRoomsFromParquet()` only creates `project_rooms_raw` if a `project-rooms` parquet artefact exists; otherwise returns `[]` and **no table is created**. The API fallback (`_fetchAllRooms`, :267-293) returns rooms but also never creates a DuckDB table.
- `dashboard-360-service.ts:119-126, 163-168` — `_enrichRoomsWithLevelNames()` is gated on `levels.length > 0` (**wrong guard**: levels-parquet exists, rooms-parquet doesn't) and then queries `FROM project_rooms_raw` (:439) → Catalog Error. Caught at :452-456, emits empty rooms → **degrades Floor/Room filters only**, non-fatal to the spinner.
- Fix shape: guard enrichment on rooms-parquet presence (or `information_schema` check), and/or create the `rooms` table from the API fallback too.

### Error 2 — `Timeout waiting for element_base_data` (THE spinner cause)
Confirmed chain, all links verified:
1. `dashboard-progress-service.ts:867-893` — six artefact sources load in parallel; `canBuild = mapSuccess && statusRows > 0 && linksCount > 0 && activitiesCount > 0` (:891). If ANY input is missing/empty → `_buildDynamicStatusView()` never runs, only `logger.warn('[Progress] Cannot build dynamic status view - missing data', {mapSuccess, statusRows, linksCount, activitiesCount})` (:895).
2. `_elementDynamicStatusViewLoaded$` (:95) is **only** set true at :2486, at the end of a successful build. In the `canBuild=false` branch it stays `false` forever — no error emit, no fallback.
3. `use-model-loader.tsx:77-113` — loader waits on that subject with a 90 s race; on timeout logs the exact error from the console and proceeds to load the FULL model (geometry does appear).
4. `dashboard-color-service.ts:105-126` — initial colors fire only when `combineLatest([geometryLoaded$, elementDynamicStatusViewLoaded$])` are BOTH true. viewReady stays false → `applyColors()` never runs.
5. `use-services-initialization.ts:78-82` — `setModelLoading(false)` lives in the **colors-applied callback** (invoked from `_applyColorsToViewer`). For progress projects there is NO other path that clears the loading state (quality-only projects have a fallback, :67-69). → **spinner spins forever = "syncing forever"**.

### What's missing for LVN-BL1 specifically (needs one console line)
The decisive line is the warn `[Progress] Cannot build dynamic status view - missing data: {mapSuccess, statusRows, linksCount, activitiesCount}` (or `[📊 DYNAMIC-STATUS] ✗ Failed to build view`). Top suspect: `mapSuccess=false` — the `svf2-object-id-map` artefact missing/not regenerated for the current model version. Supporting signal: the same project is ALSO missing its `project-rooms` parquet (Error 1), i.e. an incomplete ProcessedData artefact set for this model — consistent with a partial/failed ingest run. Note `activity_progress` parquet downloaded fine, so the artefact set is *partially* present.

### Code follow-ups this exposes (regardless of LVN-BL1's data fix)
1. **No terminal state**: `canBuild=false` leaves the dashboard in an infinite spinner for progress projects. The `else` branch should surface an error state / clear loading (as quality-only does), not just `logger.warn`.
2. `recordError('colourPipeline', …)` fires only for `!mapSuccess && statusRows>0` (:909-914); all other missing-input combinations are fully silent.
3. Error 1's wrong guard + missing API-fallback table.

Confidence: mechanism 9/10 (every link read in code); LVN-BL1 trigger 6/10 pending the one console line / backend artefact check.

---

## CORRECTION (2026-07-13, third pass — supersedes the "same ingest set" inference above)

Two fixes to the analysis above, prompted by review:

### 1. project-rooms is UNRELATED to element status — drop the conflation
The earlier note implied the missing `project-rooms` parquet and the `element_base_data` timeout were "two missing artefacts from the same ingest set." That inference was wrong. They are independent subsystems:
- **Element status** build inputs are exactly FOUR (`dashboard-progress-service.ts:2348-2353`, gate at `:891`): `svf2-object-id-map`, `element-status`, `activity-links`, `api-activities`. **project-rooms is not among them.**
- **project-rooms** is loaded only by `dashboard-360-service.ts` to populate Floor/Room filter options in the 360 tab. Its `project_rooms_raw does not exist` error (from the wrong guard at `dashboard-360-service.ts:166` querying the rooms table at `:439`) degrades **only** those 360 filter dropdowns. It has zero bearing on the spinner. Treat it as unrelated noise (still a real minor bug, tracked here for completeness).

### 2. Primary root cause is more likely a HANG, not a skip
The earlier mechanism assumed `canBuild=false` (a load returns empty → build skipped → `[Progress] Cannot build dynamic status view` warning logged). But the stronger hypothesis is that the **element-status parquet load never resolves**, so the check is never even reached:
- `statusPromise` (`dashboard-progress-service.ts:806-825`) = `loadElementStatusParquet()` → `duckdb.loadParquet()`. Two hang points, neither with a timeout:
  1. **Download**: `Storage.get(artefact.fullDownloadUrl, {responseType:'arraybuffer'})` (`duckdb-service.ts:412`) has no timeout — a stalled/oversized blob fetch waits indefinitely.
  2. **Materialization**: `CREATE OR REPLACE TABLE element_status AS SELECT … FROM read_parquet(…)` (`duckdb-service.ts:299-302`) runs in the DuckDB-wasm worker; a very large element-status parquet can exhaust browser memory and the query never returns.
- The six loads are gathered by a **`Promise.all` with NO timeout** (`dashboard-progress-service.ts:874`). One never-resolving load blocks the whole thing → `_buildDynamicStatusView()` never called → `elementDynamicStatusViewLoaded$` stays false → colours never apply → `setModelLoading(false)` (only fired from the colours-applied callback) never runs → **infinite spinner**.

**Distinguishing signal (this is the diagnostic to request, not "which input is 0"):**
- HANG → console shows `[📊 INST-STATUS | PARQUET] Loading element-status.parquet...` with **no** matching `✓ Loaded N statuses` line, and **no** `[Progress] Cannot build dynamic status view` warning.
- SKIP → the `✓ Loaded` lines appear AND the `Cannot build…` warning appears naming the 0/false input.
The `Timeout waiting for element_base_data` (model-loader side, `use-model-loader.tsx:92`) fires in BOTH cases, so it does not distinguish them.

### Revised FE fix targets (for the follow-up resilience ticket)
1. Add a timeout to the parquet **download** (`Storage.get`, `duckdb-service.ts:412`).
2. Add a timeout / `Promise.race` around the six-way `Promise.all` (or per-load), so one hanging artefact can't stall the pipeline forever.
3. On timeout/failure, surface a terminal error state and clear `setModelLoading(false)` (progress projects currently have no such path; quality-only does).

Confidence: mechanism 9/10; that the LVN-BL1 instance is the hang (vs skip) variant — pending the one console line above — 5/10.
