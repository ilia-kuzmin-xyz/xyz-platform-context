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

| Code | Sub-domain | File | Status | Summary |
|------|-----------|------|--------|---------|
| **PRG** | Progress Tracking | [progress-tab.md](progress-tab.md) | ✅ Live | Planned vs actual progress, SPI, discipline/package breakdown |
| **QLT** | Quality Management | [quality-tab.md](quality-tab.md) | ✅ Live | Issue tracking, category breakdown, cost/time impact |
| **CAP** | 360° Captures | [360-tab.md](360-tab.md) | ✅ Live | Room-based panoramic captures with date/level filters |
| **SCH** | Schedule | [schedule-tab.md](schedule-tab.md) | ✅ Live | Gantt chart with activity filtering that propagates to PRG |
| **RPT** | Reports | — | 📋 Planned | Not implemented |
| **DEV** | Dev Panel | (built-in) | 🛠️ Dev-only | DuckDB table inspector + loading timeline (Ctrl+Shift+D) |

## Cross-cutting topics

| Code | Topic | File |
|------|-------|------|
| **FLT** | Filter System — central state, propagation chain, per-service filter dimensions | [flt-filter-system.md](flt-filter-system.md) |
| **DAT** | Data Pipeline — how parquets and API data reach DuckDB | [data-pipeline.md](data-pipeline.md) |
| **VWR** | 3D Viewer — element ID mapping and status colouring | [viewer-and-model.md](viewer-and-model.md) |
| **CCH** | Caching — OPFS cache, service worker, lazy loading | [caching.md](caching.md) |
| **ELM** | Editor vs Dashboard element counts — why the two surfaces count different things (2026-08-24, PLT-2874) | [editor-vs-dashboard-element-counts.md](editor-vs-dashboard-element-counts.md) |
| — | Project Types — full-progress vs quality-only, what changes | [project-types.md](project-types.md) |
| — | Startup Journey — from route entry to first data on screen | [startup-journey.md](startup-journey.md) |
| — | Known pitfalls and gotchas | [pitfalls.md](pitfalls.md) |
| — | Roadmap and tech debt | [roadmap.md](roadmap.md) |

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

---

## 2026-08-14 — How a user reaches this page, and what still sends them to the old PowerBI report

Added during the PLT-2619 triage. Verified by reading the code; nothing was built or run.

Both dashboards are live in the shipped frontend, and **which one a user lands on is decided per
project by backend state, not by any feature flag or rollout cohort.**

- New (native) route `:project_id/dashboard` → `DashboardPage` is registered **unconditionally**,
  auth-gated only — `app/pages/project/routes.tsx:55-64`. (Compare the Commissioning routes directly
  below it, which *are* flag-wrapped.)
- Legacy route `progress-dashboard/:id` → `ProgressReportPage` still exists (`app/routes.tsx:59-66`)
  and embeds PowerBI (`app/pages/ProgressReportPage/ProgressReportPage.tsx:4, 163`) using a
  per-project report id fetched from the backend (`:62`).
- **The switch:** `resolveDashboardUrl(projectId)` — `app/helpers/dashboardNavigation.ts:6-21`.
  `Dashboard-Mode` flag on → native (`:7-9`); else `getProjectDashboardInfo(projectId)` and a
  **404 → native** (`:17-19`), any other response → **legacy PowerBI** (`:21`). So a project stays on
  PowerBI for exactly one reason: a PowerBI report is still mapped to it on the backend. Called from
  the Portfolio card (`app/pages/PortfolioPage/PortfolioPage.tsx:97-105`) and the viewer toolbar
  (`.../viewer-bar/tools/dashboard-mode-toggle.tsx:16-21`).
- **Two bypasses that skip the resolver entirely:**
  - project **name** contains `v1` (bare substring — `app/helpers/V1Rules/v1ProductionRules.tsx:2-4`)
    → Portfolio goes straight to PowerBI (`PortfolioPage.tsx:100-102`);
  - **dashboard-only users** are hard-redirected to PowerBI (`app/hooks/useProjectContext.ts:45-50`).
- `Dashboard-Mode` is **not** a rollout mechanism: feature flags come from a `feature-flags` browser
  cookie with a hardcoded all-`false` default (`app/helpers/getFeatureFlagValue/getFeatureFlagValue.ts:6-15`,
  `app/config/constants.ts:864, 886`). No org/tenant/user dimension exists anywhere in that path.

**Practical consequence:** "is project X on the new dashboard yet?" is answerable in 30 seconds by
opening it and reading the URL — `/projects/<id>/dashboard` vs `/progress-dashboard/<id>` — because
that URL *is* the resolver's output. Do it with a non-dashboard-only account and `Dashboard-Mode` off.
