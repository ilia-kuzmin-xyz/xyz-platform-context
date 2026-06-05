# PLT-2731 — Improve Dashboard Issues Loading Performance

**Jira:** https://xyzreality.atlassian.net/browse/PLT-2731
**Area:** QLT — DashboardQualityService, issue fetching pipeline
**Confidence:** 6/10 for implementation — the optimisations are clear, but the right approach must be validated by measuring real timings on ELN03. Human contribution required for measurement phase.

---

## Problem

Loading ~2000 issues on ELN03 (production) takes 10+ seconds. Nothing renders until all issues are fully loaded and inserted into DuckDB. The user sees a spinner for the entire duration.

---

## Root cause

**File:** `services/dashboard-quality/dashboard-quality-service.ts`

Current pipeline is fully sequential and all-or-nothing:

```
Page 1 (1000 issues) → wait → Page 2 (1000 issues) → wait
  → loadIssuesToDuckDB(all 2000) → _allLoaded$.next(true) → first render
```

Three compounding bottlenecks:

| # | Bottleneck | Detail |
|---|-----------|--------|
| 1 | Sequential fetching | Pages fetched one at a time in a `while` loop (line 187). For 2000 issues = 2 sequential API calls. For 10k issues = 10 sequential calls. |
| 2 | All-or-nothing rendering | `_allLoaded$.next(true)` fires only after ALL pages AND all DuckDB inserts complete (line 162). Nothing renders before this. |
| 3 | Full metadata per issue | 37+ fields returned per issue (fileReferences, activityCategories, coordinates, financials). Some of these may not be needed for the initial list render. |

**Endpoint:** `GET /api/v2/projects/{projectId}/issues?size=1000&lastFetchedIndexId=...`
**Batch insert:** 100 issues per DuckDB INSERT (line 220). For 2000 issues = 20 INSERTs.

---

## Investigation plan (human contribution required)

Before implementing, we need to measure where time is actually spent. This requires connecting to ELN03 on production.

### Step 1 — Baseline measurement

**What to measure:**
- Time for each API page call (Network tab: TTFB + transfer)
- Time for DuckDB batch inserts (add `performance.now()` around `_loadIssuesToDuckDB`)
- Time from `initialize()` call to first render

**How to connect to ELN03 production:**
- Open the ELN03 project dashboard on production in Chrome DevTools
- Network tab → filter by `/issues` → note timing for each page request
- Add temporary timing logs to `dashboard-quality-service.ts` locally and deploy to staging with ELN03 data

**What we'll learn:**
- Is the bottleneck in API network time? (→ parallelise fetching)
- Is the bottleneck in DuckDB inserts? (→ optimise batch size or schema)
- Is the bottleneck in the all-or-nothing wait? (→ progressive rendering)

### Step 2 — Scenario comparison

Once we can connect, measure these scenarios against each other:

| Scenario | Approach | Expected win |
|---------|---------|-------------|
| A (baseline) | Current sequential, all-or-nothing | ~10s |
| B | Parallel page fetching (all pages in parallel after page 1 count) | Depends on API rate limit |
| C | Progressive: show page 1 immediately, load rest in background | Page 1 visible in ~1-2s |
| D | Reduce fields (if API supports `fields` param) | Smaller payload, faster transfer |
| E | Larger page size (2000/page instead of 1000) | Fewer round-trips |

### Step 3 — Implement the winning combination

Most likely: B + C together (parallel + progressive) will give the biggest perceived improvement regardless of where the bottleneck is.

---

## Proposed implementation (pending measurement)

### Option C — Progressive rendering (highest perceived performance gain)

Emit page 1 results immediately so users see issues while the rest load:

```
_fetchPage(1) → loadIssuesToDuckDB(page1) → _allLoaded$.next(true) [PARTIAL]
                                           → _queryAllData() → first render visible
then in background:
_fetchPage(2...N) → append to DuckDB → re-query
```

This requires changing `_allLoaded$` semantics (or adding a separate `_firstPageLoaded$` signal) so the filter subscriptions can start without waiting for all pages.

### Option B — Parallel page fetching

If page 1 returns a total count header, compute total pages and fire all requests simultaneously:

```javascript
const firstPage = await fetchPage(1)           // get count
const totalPages = Math.ceil(total / 1000)
const remaining = await Promise.all(
  Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2))
)
```

Risk: if the API has rate limiting, parallel requests may be throttled. Measure on ELN03 first.

### Option D — Reduce metadata

If the API supports a `fields` query parameter, request only the fields needed for the issue list:
`issueId, title, issueStatus, issueSeverityCategoryName, assigneeName, issueRaisedOn, cost, modelElementId, activityCategories`

File references (`fullDownloadUrl`, `smallImageDownloadUrl`) only need to load when a user opens the detail panel. This could be a separate lazy fetch.

---

## Acceptance criteria

- [ ] First visible issues render within 2 seconds for ELN03 (2000 issues)
- [ ] Total load time for all 2000 issues is significantly reduced (target: under 5s)
- [ ] Loading spinner has a progress indicator ("Loading 1000 / 2000 issues") rather than a blank spinner
- [ ] Filtering and search work correctly during background loading (gracefully handle partial data)
- [ ] No regression on small projects (< 100 issues)

---

## Files to change (after investigation)

| File | Change |
|------|--------|
| `services/dashboard-quality/dashboard-quality-service.ts` | Parallelise fetching, add progressive emit |
| `quality-panel/hooks/use-quality-service.tsx` | Surface partial-load state for progress indicator |
| `quality-panel/components/issue-table/issue-table.tsx` | Show progress text during partial load |
