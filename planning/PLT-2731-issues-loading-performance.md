# PLT-2731 — Improve Issues Loading Performance (Dashboard + Viewer)

**Jira:** https://xyzreality.atlassian.net/browse/PLT-2731
**Area:** QLT — `dashboard-quality-service.ts` (Dashboard) + `issue-service.ts` (ViewerPage)
**Confidence:** 7/10 for the client-side phase (clear, testable in code). The BE phase is a hard dependency for the structural ceiling — see the separate BE task.

> **Revision note (re-contemplated):** The original draft proposed "parallel page fetching" (Option B) and "fire allLoaded on page 1" (Option C). Reading the actual code invalidated both as written. This revision corrects the plan and splits it into a client-only Phase 1 (ship now) and a BE-dependent Phase 2.

---

## Problem

Loading ~2000 issues on ELN03 takes 10+ seconds. Nothing renders until every page is fetched **and** inserted into DuckDB. The user stares at a blank spinner.

Two domains load issues independently:

| Domain | Service | Pipeline | Has incremental sync? | DuckDB? |
|--------|---------|----------|----------------------|---------|
| **Dashboard** (QLT tab) | `dashboard-quality-service.ts` | sequential cursor fetch (1000/page) → 20× batched DuckDB INSERT → `_allLoaded$` → first render | ❌ no | ✅ yes |
| **ViewerPage** | `services/issue/issue-service.ts` | `fetchAllPaginatedWithIndexId` (500/page) → transform in memory → render pins | ✅ yes (`lastSyncDateTime`) | ❌ no |

---

## Three findings that reshape the solution

### 1. The endpoint is cursor-based — parallel fetch is NOT possible client-side
`GET /api/v2/projects/{id}/issues` paginates by `lastFetchedIndexId` (a cursor from the previous page's response). Page N's request **cannot be built without page N-1's response**. The original plan's `Promise.all(... fetchPage(i+2))` is unimplementable against this API. True parallelism requires a BE change (offset/page pagination, a higher max page size, or a bulk endpoint). → **Phase 2 / BE task.**

### 2. `recordCount` gives the true total on page 1 — this kills the "misleading count" concern
`IIssueListResponse` returns `{ records, recordCount, lastFetchedIndexId }`. `recordCount` is the **total** issue count, available from the very first response. So we can decouple two numbers that the original plan conflated:

- **Total count** (header metric, "2000 issues") → from `recordCount`, correct from page 1.
- **Loaded count** (how many rows are in DuckDB / memory right now) → grows as pages arrive.

This is the answer to the worry about "showing 12 issues when there are 2000": we never display 12 as the total. We display **2000 (loading 1000…)** and only the *list* fills progressively. *(Verify once on ELN03 that `recordCount` is the project total, not the page length — cheap to confirm in the Network tab.)*

### 3. `allLoaded$` is the render gate for viewer pinpoints — do NOT fire it early
`use-pinpoints-initial-render.ts:49` renders pins for **all** issues, gated on `qualityService.allLoaded`. If we flip `_allLoaded$` to true after page 1 (original Option C), the viewer would paint a partial, spatially-misleading set of pins. **Pins and aggregates must wait for the full set; only the scrollable issue list may render progressively.** This is the crux of the user's concern and the reason naive progressive rendering is wrong.

---

## Recommended solution

### Phase 1 — Client-side only (ship now, no BE)

Highest-confidence wins that need no BE change. Implement in `dashboard-quality-service.ts` (the slow path).

**1a. Decouple total count from loaded count.**
Capture `recordCount` from the first page into a new `_totalCount$`. Surface it through `use-quality-service` so the header and list show the true total immediately. The spinner becomes a determinate **"Loading 1000 / 2000 issues"** instead of a blank wait. Pure UX honesty — no behavioural risk.

**1b. Optimise DuckDB ingestion.**
Today: 20 sequential `INSERT` statements, each a string-built 100-row batch (line 220) — SQL parsing dominates. Replace with a single bulk load via DuckDB-WASM's JSON registration (`registerFileBuffer` + `INSERT INTO issues SELECT … FROM read_json_auto(...)`) or one multi-row INSERT. Expected to collapse the insert phase from ~20 round-trips to ~1. Measure first (1c) to confirm inserts are a real cost.

**1c. Add timing instrumentation.**
Wrap `_fetchAllIssues` and `_loadIssuesToDuckDB` in `performance.now()` markers behind the existing logger. This is the "human contribution / measurement" step — it tells us how much of the 10s is network vs. DuckDB and proves the Phase-1 wins. Keep it; it also powers the BE task's before/after.

**1d. Progressive LIST rendering — list only, with hard guards.**
Add a separate `_firstPageLoaded$` signal (do **not** touch `_allLoaded$`). On first page: insert page 1 → emit the list so the table is interactive in ~1–2s. Keep loading remaining pages in the background, re-querying the list as they land.
**Guards (these are the whole point):**
- `_allLoaded$` stays false until every page is in DuckDB → **viewer pins and 360 pins keep waiting** (no partial-pin problem).
- Overview/aggregate tiles (open count, cost, category summary, trend) show a "calculating…" state until `_allLoaded$`, because they are wrong over a partial set. Do **not** show partial aggregates.
- The list shows the determinate progress indicator from 1a so a partial list never reads as complete.

**1e. (Both domains) bump page size if the BE max allows.**
Dashboard uses 1000/page, Viewer uses 500/page. If the BE accepts a larger `size`, raising it cuts sequential round-trips (2000 issues: 2 calls → 1). This is a one-line client change but **bounded by the BE's max page size** — confirm the cap (belongs to the BE task). Low effort, real win if allowed.

**1f. (ViewerPage) leave pins all-or-nothing; lean on existing incremental sync.**
`issue-service.ts` already renders all pins after full load and already does `lastSyncDateTime` incremental sync, so repeat opens are cheap. Do **not** add progressive pins here. Its only first-load levers are page size (1e) and field trimming (Phase 2). Optionally adopt the dashboard's `recordCount`-driven progress indicator for parity.

### Phase 2 — Backend (hard dependency for the structural ceiling)

Phase 1 makes the page *feel* fast (list in ~1–2s) and trims DuckDB time, but the **fetch wall-clock** is still bounded by sequential cursor paging over a fat 37-field payload. Beating that needs BE. See **`PLT-2731-BE-issues-loading.md`**:

- Parallelisable pagination (offset/page, or a documented higher max `size`, or a bulk/streaming endpoint).
- A `fields` projection so the list fetch can drop `fileReferences` (URLs, thumbnails) and other detail-only fields, lazy-loaded when the detail panel opens.
- Confirm/raise the max page `size`.

---

## Acceptance criteria

- [ ] Dashboard issue **list** is interactive within ~2s for ELN03 (2000 issues).
- [ ] Header/overview shows the **true total** (`recordCount`) from the first page; spinner is determinate ("Loading X / Y").
- [ ] **Viewer pins and aggregate tiles never render over a partial set** — they wait for `_allLoaded$` (no misleading pinpoint count, no wrong cost/open totals).
- [ ] DuckDB ingestion time measurably reduced (single bulk load vs. 20 INSERTs).
- [ ] Filtering/search behave correctly during background loading (operate on loaded rows; re-run as pages land).
- [ ] No regression on small projects (<100 issues) or in ViewerPage pins.
- [ ] Timing instrumentation present to compare baseline vs. Phase 1 vs. Phase 2.

---

## Files to change (Phase 1)

| File | Change |
|------|--------|
| `services/dashboard-quality/dashboard-quality-service.ts` | capture `recordCount`→`_totalCount$`; add `_firstPageLoaded$`; emit list after page 1; keep `_allLoaded$` gated on full load; bulk DuckDB load; timing markers |
| `quality-panel/hooks/use-quality-service.tsx` | surface `totalCount` + partial-load state |
| `quality-panel/components/issue-table/issue-table.tsx` | determinate "Loading X / Y" indicator; list renders on partial data |
| overview/aggregate tiles | "calculating…" state until `allLoaded` |
| `services/issue/issue-service.ts` (optional) | page-size bump (1e), parity progress indicator |

## Open questions (cheap to resolve)
- Confirm `recordCount` = project total, not page length (Network tab, one request).
- Confirm BE max `size` (drives 1e) — also in the BE task.
- Measure 1c before committing to 1b/1d ordering.
