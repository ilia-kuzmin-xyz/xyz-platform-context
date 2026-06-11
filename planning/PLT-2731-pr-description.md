# PLT-2731: Issues loading performance — page size + bulk DuckDB load

## Problem

Opening the Quality tab on a project with ~4 000 issues (filtered from ~6 000+ total)
took **~14 s** locally and **~22 s** on `frontend.holosite.dev`.

Two bottlenecks caused this:

1. **Too many serial round-trips.** The client was requesting 1 000 issues per page.
   Because the API uses cursor-based pagination, every page depends on the cursor
   returned by the previous one — they cannot be parallelised. A 4 k-issue project
   required 5 sequential network calls; a 10 k-issue project would need 11.

2. **Slow DuckDB ingestion.** Issues were inserted in batches of 100 via hand-built
   `INSERT INTO issues VALUES (…, …, …)` strings. For 4 000 issues that meant 40
   separate SQL parse + execute cycles, each with manual quoting/escaping of every
   field.

## Changes

### 1. Page size 1 000 → 10 000

```ts
// dashboard-quality-service.ts · _fetchAllIssues
const pageSize = 10000
```

The backend default is 10 000/page (max 50 000 per `XYZPlatformApi`
`config/default.json`). Raising the client cap to match eliminates all serial
round-trips for projects up to 10 k issues — the common case — in a one-line change.
Larger projects still loop correctly.

### 2. Bulk DuckDB load via `insertJSONByName`

```ts
// dashboard-quality-service.ts · _loadIssuesToDuckDB
const issueRows = issues.map(toIssueRow)
await this._duckdbService.insertJSONByName('issues', issueRows)

const categoryRows = toCategoryRows(issues)
if (categoryRows.length > 0) {
  await this._duckdbService.insertJSONByName('issue_categories', categoryRows)
}
```

`insertJSONByName` registers the data as a virtual JSON file and bulk-loads it
with `INSERT INTO … BY NAME (SELECT * FROM read_json(…))`. This replaces 40+
batched string INSERTs with two operations — one per table — and eliminates all
per-row SQL parsing and hand-rolled escaping.

Supporting helpers added to `quality-sql-queries.ts`:

- **`toIssueRow(issue)`** — projects `IIssue` to a flat object whose keys match
  the `issues` table columns exactly (required by `read_json … BY NAME`).
  Handles the `modelId: string | string[]` variance the old code also handled.
- **`toCategoryRows(issues)`** — flattens `activityCategories` into one
  `{issueId, typeName, categoryName}` row per tag.

Removed: `buildBatchInsertQuery`, `buildCategoriesInsertQuery`, the `safeStr /
safeNum / safeDate` imports from `sql-helpers`.

## Expected improvement

| Scenario | Before | After |
|---|---|---|
| ≤ 10 k issues — round-trips | 2–11 serial fetches | 1 fetch |
| DuckDB INSERT (4 k issues) | 40 batched string INSERTs | 2 bulk `read_json` loads |
| `frontend.holosite.dev` baseline | ~22 s | expected ~8–12 s |

Exact numbers will be visible in the browser DevTools Network tab (one large
issues request instead of many small ones) and in `logger.info` output if
you add timing temporarily.

## Files changed

```
src/.../services/dashboard-quality/dashboard-quality-service.ts
src/.../services/dashboard-quality/utils/quality-sql-queries.ts
src/.../services/dashboard-quality/utils/quality-sql-queries.test.ts
```

## How to test

**Project:** "API 2 FULL" on `test` environment (returns ~4 000 quality issues,
6 000+ total across types).

**Steps:**

1. Open the project dashboard → Quality tab.
2. Open DevTools → Network tab, filter by `issues` or `XYZ` to find the API calls.
3. Confirm you see **one** issues fetch (not 4–6) — it will be a larger payload
   (~several MB JSON).
4. Measure time from tab click to issues list becoming interactive. Target: well
   under 14 s (the previous local baseline).
5. Verify all filters still work: category chips (Discipline / Package / Phase),
   search, issue selection, issue details panel.
6. Verify the issue count badge / overview metrics match the old behaviour.
7. Repeat on `frontend.holosite.dev` — previous baseline was ~22 s.

**Regression check:**
- Quality tab filters and search function correctly.
- Progress tab unaffected (separate service).
- 360 Images tab unaffected.
