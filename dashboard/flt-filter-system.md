# FLT — Filter System

The central state hub that connects every service on the dashboard. All tabs read from the same filter state; no tab maintains its own independent filter copy.

## Filter state shape

```
DashboardFilters {
  dateRange       { startDate, endDate }   -- 'YYYY-MM-DD'; affects all tabs
  discipline      string[]                 -- PRG calc mode + QLT category join
  package         string[]                 -- PRG calc mode + QLT category join
  level           string[]                 -- floor; spatial → _visible_elements
  room            string[]                 -- spatial → _visible_elements
  status          string[]                 -- element install status → _visible_elements
  activityType    string[]                 -- PRG only
  xyzTracked      boolean                  -- PRG table swap (standard → xyz variants)
  categoryFilters Record<string,string[]>  -- dynamic (phase, area, zone…) from SCH
  issueStatus     string[]                 -- QLT filter; works in both project types
  qualityCategory string[]                 -- QLT category filter
  activityId      string[]                 -- SCH → PRG activity-level mode (no data recalc)
  issueId         string[]                 -- QLT selection state only (no data recalc)
  imageId         string[]                 -- CAP selection state only (no data recalc)
}
```

`activityId`, `issueId`, and `imageId` are **selection** filters — they don't trigger service re-queries, only control which detail panel is open and which viewer pinpoints are highlighted.

## Propagation chain

```
User changes filter in filter panel
  ↓
DashboardFilterService (BehaviorSubject<DashboardFilters>)
  emits filters$
  ↓
┌─────────────────────────────────────────────────────┐
│ DashboardProgressService                            │
│   re-queries project_progress / category_groups     │
│   → materializes _visible_elements temp table       │
│   → emits elementVisibility$                        │
│   → emits maxActualProgress$, categorySummary$, … │
└──────────────────────┬──────────────────────────────┘
                       │  elementVisibility$
          ┌────────────┴──────────────┐
          ↓                           ↓
 DashboardQualityService     Dashboard360Service
   JOINs issues against        re-queries captures_360
   _visible_elements            against _visible_elements
          │                           │
          ↓                           ↓
      issues$, overview$         roomSummaries$

Also, in parallel from filters$:
  ↓
DashboardColorService
  checks: is this a color-relevant change?
  YES → re-queries element_dynamic_status view
        → applies theming colors to 3D model
  NO  → skips (saves full 14M-fragment visibility scan)
```

**Why QLT and CAP subscribe to `elementVisibility$` instead of `filters$` directly:** the `_visible_elements` DuckDB temp table must exist before they can JOIN against it. Subscribing to the PRG signal guarantees the table is ready. In quality-only projects (no PRG), they fall back to a direct `filters$` subscription instead.

## Two filter dimensions in QLT

Within QLT, filters are split into two orthogonal groups:

| Dimension | Filters | Mechanism |
|-----------|---------|-----------|
| **Spatial** | level, room, status, activityType, xyzTracked | JOIN `_visible_elements` in DuckDB — only elements that pass PRG's spatial filter |
| **Category** | discipline, package, phase, area, zone, issueStatus, dateRange | Semi-join on `issue_categories` side table — keyed off the issue's own `activityCategories` tags |

These two dimensions are AND-combined. Spatial filters are hidden in the filter panel for quality-only projects (no `_visible_elements` to JOIN against).

## Filter options: where they come from

| Filter section | Source (progress projects) | Source (quality-only) |
|---------------|---------------------------|----------------------|
| Discipline / Package | `categorySummaryUnfiltered` from PRG parquets | Issues' own `activityCategories` tags |
| Floor / Room | `levels360`, `rooms360` from CAP parquets | Issues' own tags (if present) |
| Dynamic categories (phase, area, zone) | `scheduleCategoryValues` from SCH service | Issues' own tags |
| Issue Status | `allIssues` from QLT service | Same |
| Activity Type | PRG parquets | Hidden |

`extractFilterOptions()` in `dashboard-filter-utils.ts` merges all sources into the filter panel options.

## Discipline–package hierarchy

When disciplines are deselected, any packages that no longer belong to a selected discipline are automatically pruned from the active `package[]` filter. This avoids a filter state that is internally inconsistent (package selected but its parent discipline is not).

Single click on a discipline/package = select only that one. Shift / Alt / Ctrl + click = add to multi-selection.
