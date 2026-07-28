# PLT-2935 — [Dashboard] Freeze planned progress % for sales project

**Type:** Task · **Status (as of 2026-07-28):** Analysis In Progress — awaiting clarification
**Domain:** Dashboard (Viewer-based) → Progress tab (PRG)
**Target project:** `69e232b2c222e55fa039eab2` (Mongo id = URL `project_id`)

## Goal
FE-only, hidden, hardcoded freeze of the **planned %** for this one demo project so it stops
advancing when the backend refreshes progress data. Actual + other widgets stay live. Other
projects unaffected.

## Domain findings (code map — verified 2026-07-28)
- Route: `pages/project/routes.tsx` → `:project_id/dashboard` → `DashboardPage.tsx`.
- Planned % pipeline (parquet → DuckDB → RxJS → hook → widget):
  - SQL: `services/dashboard-progress/utils/progress-queries-v2-api.ts`
    `getProjectProgressV2API` (~L82), planned = `(EndPlannedProgress − StartPlannedProgress)*100`
    (~L147). It is a **date-range delta**, NOT a static total.
  - Service: `services/dashboard-progress/dashboard-progress-service.ts` →
    `_maxPlannedProgress$.next(projectProgress.planned)` (~L1093/1154), getter `maxPlannedProgress$`.
  - Hook: `.../progress-panel/hooks/use-dashboard-progress.ts` subscribes → state `maxPlannedProgress`.
  - Metrics: `use-progress-metrics.ts` → `plannedProgress = maxPlannedProgress||0`,
    `variance = actual − planned`, `spi` — **both derived from planned**.
  - Widget: `use-progress-panel-data.tsx` overview "Planned" detail; also feeds the **trend chart
    planned line** + per-package planned in discipline breakdown.
- Project id in dashboard: `dashboard-project-provider.tsx` — `params.project_id` = Mongo id
  (matches ticket id); converted to Postgres UUID (`postgresProjectId`) for the service. Exposed
  as `useDashboardProject().projectId` (Mongo id). **Cleanest key = Mongo id at hook layer.**
- **No existing precedent** for branching logic on a specific project id anywhere in dashboard code.
- PRG has a golden-master regression suite (dev reference project). A freeze scoped to this one
  unrelated project id will NOT affect those fixtures → safe.

## Why moved to Analysis (open questions — comment posted 2026-07-28)
1. **Freeze value?** Ticket says "stay fixed in its current state" but gives no number.
   Snapshot-on-load-and-hold drifts upward on later reloads (re-captures a higher value), so it
   doesn't truly pin "today's" number. Need: specific literal %, or confirm snapshot-hold is fine.
2. **Scope** — overview metric only, or also trend-chart planned line + per-package planned?
3. **variance/SPI** — derived from planned; freeze them consistently, or keep live?

## Planned implementation (once answered) — draft
- Add constant `FROZEN_PLANNED_PROJECTS` (map projectId → value|null) near a dashboard constants file.
- Apply at `use-dashboard-progress.ts` subscription (Mongo id available via `useDashboardProject`):
  if current projectId is in the map, override/snapshot `maxPlannedProgress` before setting state.
  Freezing at this source keeps overview + variance + spi internally consistent.
- Branch: `PLT-2935` off latest `master`. Draft PR. No dependency on other ticket branches.

## Where we stopped
Blocked on the 3 questions above. Do not implement until answered. Re-check next run.
