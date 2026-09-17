# DAT — Data Pipeline

How data gets from the backend into the browser and becomes queryable in DuckDB.

## Two pipelines

The dashboard loads data via two parallel pipelines on page open. Both feed into the same shared DuckDB-WASM instance.

### Pipeline A — V2 Progress Outputs (parquet, fast path)

```
Progress Outputs API  →  Azure Blob Storage URLs
  browser downloads .parquet files (or reads from OPFS cache)
  files loaded into DuckDB as named tables
```

| API output name | DuckDB table | Purpose |
|----------------|-------------|---------|
| `planned-and-actual-category-groups` | `category_groups` | Per-discipline/package cumulative progress by calendar date |
| `planned-and-actual-project` | `project_progress` | Project-level cumulative progress by calendar date |
| `planned-and-actual-xyz-tracked-category-groups` | `category_groups_xyz` | Same as above but scoped to XYZ-tracked elements only |
| `planned-and-actual-xyz-tracked-project` | `project_progress_xyz` | Same as above but scoped to XYZ-tracked elements only |

The xyz-tracked variants are fetched at startup but only loaded into DuckDB when the user enables the "XYZ Tracked" filter toggle.

All parquet files are cached in OPFS under `/duckdb-cache/{projectId}/dashboard/` and only re-downloaded when the backend's `artefactHash` changes.

### Pipeline B — Artefacts + API (slower path)

```
Artefact API  →  Azure Blob Storage URLs
  browser downloads selected artefacts (or reads from OPFS cache)
  loaded into DuckDB
```

| Artefact type | DuckDB table | Purpose |
|--------------|-------------|---------|
| `element-status` | `element_status` | modelElementId → installationStatus (Installed, Not Planned, …) |
| `project-element-list` | `project_element_list` | modelElementId → sourceFileElementId (External ID / Revit GUID) |
| `svf2-object-id-map` | `svf2_object_id_map` | External ID → Forge dbId (for 3D colouring) |

REST APIs called on page load:
| API | DuckDB table | Used by |
|-----|-------------|---------|
| Activities API (via SharedDataLoader) | `api_activities` | PRG calculation, SCH Gantt rows |
| Activity Categories API (via SharedDataLoader) | `activity_categories_flat` | PRG discipline/package filters, SCH columns |
| Progress Weighting API | — (in-memory config) | PRG — determines labor vs element-count weighting |

### Lazy data (loaded on first tab open)

| Trigger | DuckDB table | Size | Purpose |
|---------|-------------|------|---------|
| User opens SCH tab | `activity_progress` | 50–200 MB | Per-activity progress snapshots by date |
| User opens QLT tab | `issues`, `issue_categories` | API-driven | Quality issues from REST API (1000/page, paginated) |
| User opens CAP tab | `captures_360` | API-driven | 360° capture records (URL, coordinates, timestamp) |

The `activity_progress` parquet is prefetched into OPFS in the background on page load so the first SCH tab open reads from cache instead of downloading.

## Loading order

```
DashboardProjectService starts
  ├─ DashboardFilterService          ready immediately
  ├─ SharedDataLoader                fetches activities + categories from REST
  ├─ DashboardScheduleService        subscribes to SharedDataLoader
  └─ DashboardProgressService        starts Pipeline A + B in parallel
       ├─ Pipeline A: category_groups + project_progress → DuckDB
       ├─ Pipeline B: element-status + project-element-list + svf2-object-id-map → DuckDB
       ├─ _queryDataDateRange()       derives real date range from data
       └─ isLoadingFiles = false      spinner dismissed, first data visible

User opens QLT tab → DashboardQualityService.initialize()
User opens CAP tab → Dashboard360Service.initialize()
User opens SCH tab → activity_progress loaded from OPFS
```

## SharedDataLoader

Activities and categories are shared between PRG and SCH. `SharedDataLoader` fetches them once and passes the result to both services. It also exposes schedule metadata (revision dates, schedule name) for the dashboard bar timestamp.

## Delta sync — editor status changes into DuckDB

When the user changes an element's installation status in the editor (viewer sidebar), the change is persisted to the backend and also synced into the in-memory DuckDB `element_status` table so the dashboard colours update immediately without a page reload.

**Flow:**
```
User sets status in editor
  → InstallationStatusServiceV2.setElementStatus()
      → POST /api/.../element-status (backend persisted)
      → ArtefactLoader.insertDeltaStatusRecords(records)
           → projects only { modelElementId, installationStatus,
                             installationCheckDate, lastModifiedOn }
           → duckdb.insertJSONByName('element_status', rows)
      → InstallationStatusServiceV2 updates installationStatuses map
      → recalculateElementStatuses(changedIds)
      → DashboardProgressService.refreshColours()
```

**Why only 4 columns in the insert:** the parquet-loaded `element_status` table has exactly 4 columns (`modelElementId`, `installationStatus`, `installationCheckDate`, `lastModifiedOn`). Passing extra fields (e.g. `lastModifiedBy`) causes a DuckDB schema error. `ArtefactLoader.insertDeltaStatusRecords` explicitly projects to these 4. Do not add fields without also updating the parquet schema.

**`InstallationStatusServiceV2` dual-map design:**

The service maintains two maps:
- `installationStatuses` — raw `{installationStatus, installationCheckDate}` as returned by the API. Source of truth.
- `elementStatuses` — computed schedule-aware UI status (Installed Early, Late, etc.), derived from `installationStatuses` + linked activity dates.

`getInstallationStatus()` reads from `installationStatuses` directly (not back-derived from the UI status). `calculateElementStatus()` always reads from `installationStatuses` and writes to `elementStatuses`, keeping the two maps in sync. This means `installationCheckDate` is always available for Installed Early classification — the previous design lost it by passing only `installationStatus` to the compute function.

## 2026-09-17 addition — fresh-load freshness: element status has a capped live merge, Pipeline A has none

Investigated for PLT-3133 (customer: dashboard updates take "hours up to a day" to show). Answers
"what happens on a *fresh* page load, not the same open session" — the data-pipeline doc above only
covered the same-session delta-sync case.

**Element status (Pipeline B) does merge live data on every fresh load, not just within a session.**
`DashboardProgressService._initialize()` (`dashboard-progress-service.ts:659-713`) chains, right
after `ArtefactLoader.loadElementStatusParquet()`, into `ArtefactLoader.syncElementStatusDeltaFromAPI
(endSyncDateTime)` (`:828-833` → `artefact-loader.ts:353-429`): it reads the parquet's own watermark
(`ElementStore.getLastSyncTime('element_status')`, `duckdb-element-store.ts:295-305`), fetches
`serviceProvider.Element.listElementStatuses(projectId, { lastSyncDateTime, endSyncDateTime })`
(`element-api-service.ts:77-90`), and upserts the result (`_mergeElementStatusDelta`,
`artefact-loader.ts:733-762`). This matches the backend's own documented contract for this artefact
— `XYZPlatformApi/src/swagger.components.schemas.json:3708-3717` labels it a **"Nightly snapshot of
`xyz.ElementInstallationStatus`"** and specifies exactly this merge-by-`lastModifiedOn` rule.

**The catch: `endSyncDateTime` is capped at `this._v2Loader.getCalculatedOn()`**
(`dashboard-progress-service.ts:674`, `:833`; in-code comment: *"capped at the progress `calculatedOn`
so coloring never runs ahead of the figures"*). A status edit made after the last progress
recalculation is excluded from the merge until `calculatedOn` advances again — so element-status
freshness on a fresh load is bounded by the progress-recalculation cadence, not by how recently the
edit itself was saved.

**Pipeline A (`category_groups`, `project_progress` — "intangible %") has no merge step at all.**
`ProgressOutputsV2Loader.loadProgressFiles()` (`progress-outputs-v2-loader.ts:113-205`) downloads the
two parquet files straight from `cloudStoragePath` with no `lastSyncDateTime`/`since` parameter and
no live-API reconciliation anywhere in that file or in `ProgressOutputsApiService`
(`progress-outputs-api-service.ts:12`, whose only field is the read-only `calculatedOn`). So
intangible-%/activity-progress freshness on a fresh load is bounded **entirely** by how often the
backend regenerates that parquet — verified as an architectural absence, not inferred.

**Still unknown, and worth closing if this recurs:** the actual regeneration schedule for the
Pipeline A parquets. `XYZPlatformApi` only *reads* pre-computed rows via `reporting
."fn_GetLatestProgressOutputs"` (`projects.service.ts:20,132-145`) — no cron, queue, or worker exists
in that repo for writing them (checked `package.json` and top-level `src/` dirs). The write job must
live in a separate pipeline repo not in this session's access. Full ticket detail:
`incidents/live-incident-board-tickets/PLT-3133-groupA-data-pipeline/context.md`.

## Deep-dive

- DuckDB table schemas: [`docs/dashboard/duckdb-tables/`](../../docs/dashboard/duckdb-tables/)
- Progress calculation modes: [`docs/dashboard/progress-calculation-modes.md`](../../docs/dashboard/progress-calculation-modes.md)
