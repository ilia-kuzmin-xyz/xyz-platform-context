# Dashboard Page

## What it is

The Dashboard Page is an in-browser analytics surface that replaces PowerBI reports with native data visualization **tightly coupled to a 3D model viewer**. It opens inside the ViewerPage for a specific project and gives project managers and site engineers a single place to track construction progress, inspect quality issues, review 360° site captures, and navigate the project schedule — all while seeing the corresponding elements coloured in a live Autodesk Forge model.

## Who uses it

- **Project managers** — track planned-vs-actual progress, SPI, discipline breakdown.
- **Site engineers** — verify element installation status against the 3D model.
- **QA teams** — review quality issues and link them to spatial locations.
- **Developers / AI copilots** — debug data pipelines via the Dev Panel (Ctrl+Shift+D).

## Key technology choices

| Technology | Role |
|------------|------|
| **DuckDB-WASM** | Client-side SQL engine. Parquet files are loaded into an in-browser database so all aggregation, filtering, and joining happens locally with zero backend round-trips after initial download. |
| **Autodesk Forge Viewer** | 3D model rendering. Models are loaded with `skipPropertyDb: true` to avoid downloading the full property database (saves 100+ MB). Element names are resolved lazily via remote parquet queries. |
| **OPFS (Origin Private File System)** | Persistent browser cache for parquet files and viewer fragments. Survives page reloads; keyed by `artefactHash` for invalidation. |
| **RxJS BehaviorSubjects** | All data flows are reactive. Services expose observables; React hooks subscribe. No polling, no prop-drilling. |

## Sub-domains (tabs)

| Tab | File | Status | Summary |
|-----|------|--------|---------|
| Progress | [progress-tab.md](progress-tab.md) | ✅ Live | Planned vs actual progress, SPI, discipline/package breakdown |
| Quality | [quality-tab.md](quality-tab.md) | ✅ Live | Issue tracking, category breakdown, cost/time impact |
| 360 | [360-tab.md](360-tab.md) | ✅ Live | Room-based panoramic captures with date/level filters |
| Schedule | [schedule-tab.md](schedule-tab.md) | ✅ Live | Gantt chart with activity filtering that propagates to Progress |
| Reports | — | 📋 Placeholder | Not implemented |
| Dev | (built-in) | 🛠️ Dev-only | DuckDB table inspector + loading timeline (Ctrl+Shift+D) |

## Cross-cutting topics

| Topic | File |
|-------|------|
| Data pipeline (how data reaches the browser) | [data-pipeline.md](data-pipeline.md) |
| 3D viewer and element mapping | [viewer-and-model.md](viewer-and-model.md) |
| Caching strategy (OPFS, service worker, lazy loading) | [caching.md](caching.md) |
| Known pitfalls and gotchas | [pitfalls.md](pitfalls.md) |
| Planned work and tech debt | [roadmap.md](roadmap.md) |

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────┐
│  React (ViewerPage)                                             │
│  ┌──────────────┐  ┌────────────────────────────────────────┐   │
│  │ Forge Viewer  │  │ Dashboard Panels (Progress/Quality/…)  │   │
│  │ (3D model)    │  │ React hooks ← RxJS observables         │   │
│  └──────┬───────┘  └──────────────────┬─────────────────────┘   │
│         │                              │                         │
│  ┌──────┴──────────────────────────────┴─────────────────────┐  │
│  │  Service Layer (TypeScript classes, singleton per project) │  │
│  │  DashboardProjectService  ← owns all sub-services          │  │
│  │    ├─ DashboardFilterService   (central filter state)      │  │
│  │    ├─ DashboardProgressService (parquet → DuckDB → metrics)│  │
│  │    ├─ DashboardScheduleService (gantt data, shared loader) │  │
│  │    ├─ DashboardQualityService  (lazy, API → DuckDB)        │  │
│  │    ├─ Dashboard360Service      (lazy, API → DuckDB)        │  │
│  │    └─ DashboardColorService    (element status → 3D color) │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                              │                                   │
│  ┌──────────────────────────┴────────────────────────────────┐  │
│  │  DuckDB-WASM (shared instance, OPFS-cached parquets)      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Service ownership

`DashboardProjectService` is the **root orchestrator**. It:
1. Resolves the project's federated model by finding the "federated" folder via Folder API.
2. Creates a shared `DuckDBService` instance (deduplicated init, single worker).
3. Instantiates `DashboardFilterService` first — every other service receives it.
4. Creates Schedule before Progress (Progress subscribes to Schedule's `categoryFilteredActivityIds$`).
5. Creates Quality and 360 services lazily — they only `.initialize()` when their tab opens.
6. Disposes everything on unmount (completes all BehaviorSubjects, removes listeners).

## Filter system

All filters live in `DashboardFilterService` as a single `BehaviorSubject<DashboardFilters>`. Filter types: dateRange, discipline, package, level, room, status, activityType, xyzTracked, qualityCategory, issueId, imageId, plus dynamic `categoryFilters` from the schedule panel.

When filters change:
1. Progress service re-queries DuckDB, materializes a `_visible_elements` temp table.
2. It then emits `elementVisibility$` — a signal that the temp table is ready.
3. Quality and 360 services subscribe to `elementVisibility$` (not `filters$` directly) to avoid querying before the temp table exists.
4. Color service checks whether the change is color-relevant; if not, it skips the expensive re-coloring pass.

## Deep-dive docs

For schemas, SQL examples, and API mappings, see [`docs/dashboard/`](../docs/dashboard/).
