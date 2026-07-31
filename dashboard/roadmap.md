# Roadmap and Known Gaps

## Known tech debt

| Area | Issue | Impact |
|------|-------|--------|
| Default date range | Hardcoded to 2024-01-02 → 2028-01-29 instead of derived from data | Progress may show out-of-range for projects outside this window |
| `_postgresProjectId` typing | Typed as `string \| null` but used as `string` in several places without null-check | TypeScript errors (pre-existing, not blocking runtime) |
| 360 tab reuses `IssueTable` | Room list is rendered via the quality panel's `IssueTable` component with adapted data | Awkward abstraction; changes to IssueTable can break 360 display |
| Calculation mode debug | `SHOW_CALCULATION_MODE_DEBUG = false` hides the mode switcher | Useful for debugging but not exposed to users |
| `FilterApplicability` | Type defined but enforcement is manual per service | No runtime validation that a service only uses filters it declares |

## Planned improvements

| Priority | Item | Notes |
|----------|------|-------|
| High | Reports tab | Currently a placeholder — no implementation |
| Medium | Runtime mapping as default | `USE_VIEWERPAGE_ID_MAPPING` flag → higher match rates but needs perf work for large models |
| Medium | Derive date range from data | Replace hardcoded range with min/max from `api_activities` or `project_progress` |
| Medium | Id-keyed filtering for ALL category types | PLT-2821 re-keyed only the package filter by `activityCategoryId`; discipline + dynamic category types (phase/area/zone) are still name-keyed, so same-named values conflate there too. Raised by Rishi in PR #1996 review — align all category filters on ids end-to-end (same resolver pattern: `DashboardFilterService.setCategoryMaps`) |
| Low | Dev panel export/logging | Dev panel stats are ephemeral — no way to save or share a debug snapshot |
| Low | 360 tab dedicated list component | Replace `IssueTable` reuse with a purpose-built room list |

## Feature flags

| Flag | Default | Purpose |
|------|---------|---------|
| `USE_VIEWERPAGE_ID_MAPPING` | `false` | Use runtime viewer mapping instead of parquet-based |
| `SHOW_CALCULATION_MODE_DEBUG` | `false` | Show progress calculation mode switcher in UI |
| `LOAD_ON_PAGE_INIT` (schedule) | `false` | If true, loads large activity parquet eagerly; if false, prefetches to OPFS in background |
