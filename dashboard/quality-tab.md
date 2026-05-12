# Quality Tab

Monitors quality issues and defects across the project.

## What the user sees

- **Overview metrics:** Total issues, open, resolved counts, cost impact, time delays.
- **Category breakdown:** Issues grouped by type (Mechanical, Electrical, Civil, etc.).
- **Searchable issue table:** Status filtering, issue selection opens detail panel.
- **Currency symbol support** for cost impact display.

## Data source

Issues are fetched from the **REST API v2** (`projects/{projectId}/issues`) with full pagination. The complete issue objects (including `fileReferences`) are kept in memory for detail display. Issue records are also loaded into **DuckDB** for efficient SQL-based filtering, category summary, overview metrics, and trend data.

**Not parquet-based** — unlike Progress/Schedule, Quality uses API data loaded into DuckDB via `buildCreateTableQuery()` / `buildBatchInsertQuery()` in batches of 100.

## Lazy initialization

The Quality service only initializes when the user opens the Quality tab (`autoInit: false`). This avoids fetching issues for users who never look at quality.

## Filter coordination

Quality subscribes to `elementVisibility$` (not `filters$` directly). This ensures the Progress service has already materialized the `_visible_elements` temp table in DuckDB before Quality JOINs against it. Category filtering via `dashboardFilterService.setQualityCategories()`.

## Key service: `DashboardQualityService`

Located in `services/dashboard-quality/`. Data mappers: `mapToOverview`, `mapToCategorySummary`, `mapToTrendData`, `mapDuckDBRowToIssue`.
