# QLT — Quality Management

Monitors quality issues and defects linked to spatial locations across the project.

## What the user sees

- **Overview metrics:** Total issues, open/resolved/closed counts, cost impact, time delays.
- **Category breakdown:** Issues grouped by severity category (e.g. Structural, MEP, Safety). Clicking a category filters the list.
- **Searchable, paginated issue list:** Each issue shows status badge, assignee, reporter, cost, date, and thumbnail.
- **Issue detail panel:** Opens on issue selection — photo/video carousel, 360 capture links, download button.
- **Issue status filter:** Open / Resolved / Closed (available in both full-progress and quality-only projects).

## Data flow

```
Issues REST API v2  →  paginated, 1000/page
  all issues fetched upfront and stored in memory (_allIssues[])
  also loaded into DuckDB as `issues` table + `issue_categories` side table

DashboardQualityService
  ├─ lazy: only initializes when QLT tab is first opened
  ├─ subscribes to elementVisibility$ (spatial filter path)
  ├─ subscribes to filters$ (category/issueStatus/dateRange path, debounced 100ms)
  └─ emits: issues$, categorySummary$, overview$, trendData$
```

Issues are stored **both in memory** (for full detail display in the panel) and **in DuckDB** (for SQL-based filtering and aggregation). DuckDB queries return IDs, which are cross-referenced against the in-memory list to build the final display data.

## Filter coordination

QLT has two parallel trigger paths:

### Spatial path (via `elementVisibility$`)
When PRG re-materializes `_visible_elements` (after a status, discipline, or room filter change), it fires `elementVisibility$`. QLT responds by running a query that JOINs `issues` against `_visible_elements`, showing only issues whose linked 3D element passes the current spatial filter.

Issues without a `modelElementId` (not spatially linked) always appear when this path fires — they're never filtered out by spatial constraints.

### Category/status path (via `filters$`)
For changes to issueStatus, dateRange, qualityCategory, or category filters (discipline, package, phase, area, zone), a separate debounced subscription re-queries without waiting for PRG. This path is the primary trigger for quality-only projects where PRG never runs.

### Category filtering: issue's own tags
Discipline/package/phase filters apply against the issue's own `activityCategories` array (denormalized from its linked activity at creation time), NOT against the linked 3D element's category. This is stored in a DuckDB side table `issue_categories(issueId, typeName, categoryName)` and joined via a semi-join per active category type.

## Two project modes

| Mode | Category filter source | Spatial filter source |
|------|----------------------|----------------------|
| Full-progress project | Issue's `activityCategories` (same logic) | `_visible_elements` from PRG |
| Quality-only project | Issue's `activityCategories` (same logic) | Not available (no PRG, no `_visible_elements`) |

In quality-only mode, the filter panel hides spatial filters (room, level, status, activity type) and only shows category and issue status filters.

## Key service

`DashboardQualityService` in `services/dashboard-quality/`. Lazy — only initializes on first QLT tab open. Contains all SQL query builders (`quality-sql-queries.ts`).
