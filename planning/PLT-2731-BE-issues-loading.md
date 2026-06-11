# PLT-2731 (BE) — Issues List API: enable fast bulk loading

**Parent:** PLT-2731 — Improve Issues Loading Performance (frontend)
**Endpoint:** `GET /api/v2/projects/{projectId}/issues`
**Backend repo:** `XYZPlatformApi` (`platform-api`, Node + Express + Postgres/Citus)

> **Revision note (verified against XYZPlatformApi source).** I read the real controller/service/validator/config. Two of the original "blockers" do not hold against the actual code. This doc replaces the earlier guesses with what the backend actually does, file by file.

---

## What the backend actually does (verified)

Request flow: `issues.routes.ts` → `validateGetIssueListRequest` → `getIssueList` controller → `service.getIssueList` (simple) **or** `service.getDetailedIssueList` (default) → Postgres function → `buildPaginatedQueryResponse`.

| Fact | Source | Value |
|------|--------|-------|
| Default page size | `config/default.json` → `api.defaultPagingSize` | **10000** |
| Max page size | `config/default.json` → `api.maxPagingSize` | **50000** |
| Size clamping | `middleware.ts:parsePagingQueryParam` | `min(requested ?? 10000, 50000)` |
| Pagination | cursor `lastFetchedIndexId` (row `Id`) | sequential |
| `recordCount` meaning | `pagination.util.ts:buildPaginatedQueryResponse` | **`records.length` of THIS page — NOT the project total** |
| `simple=true` path | `getIssueList` → `fn_GetIssueList` | issue rows only |
| default (detailed) path | `getDetailedIssueList` → `fn_GetIssueListDetailed` | issue rows **+ `fileReferences` + `activityCategories`** |
| `fields` query param | parsed in `parsePagingQueryParam`, stored on `PagingQueryParam` | **parsed but IGNORED by the issues SQL/service** |

---

## Blocker 1 (original: "cursor pagination forces serial fetch") — **mostly a FRONTEND self-limitation, not a BE constraint**

The server already accepts **up to 50,000** issues per request and **defaults to 10,000**. The frontend currently asks for **1000/page** (dashboard) and **500/page** (viewer), which is what creates the multiple sequential round-trips. 

**For any project ≤ 10k issues, a single request with no `size` param (or `size=10000`) returns everything in one round-trip.** No BE change, no parallelism needed. This is a one-line FE change and should be tried first.

Cursor pagination only remains a real constraint for **>50k-issue projects** (need >1 page even at max size). That is rare today; defer offset/parallel pagination until such a project exists.

**BE ask (small):** none required for typical projects. Optionally document the 10k/50k limits in the FE-facing API notes so the client stops self-capping at 1000.

## Blocker 2 (count) — `recordCount` is **page length, not project total**

`buildPaginatedQueryResponse` sets `recordCount: records.length`. **There is no project-total field in the response today.** The earlier plan's "show 2000 (loading 1000…) using `recordCount`" does **not** work as written.

However, this is dissolved by Blocker 1's fix: if the FE fetches in **one large page**, then `records.length` of that single response **is** the project total (for ≤10k/≤50k projects). The total is known as soon as the one fetch completes — no separate count needed.

**BE ask (only if projects can exceed the max page size):** add a real total — either a `totalCount` field in the envelope (one extra `COUNT(*)`), or a lightweight `GET …/issues/count`. Not needed while one request covers the whole project.

## Blocker 3 (the real one) — the **detailed** list does expensive per-row work

This is the latency lever the FE cannot touch. The default (non-`simple`) path, `fn_GetIssueListDetailed` + `mapRowToDetailedIssue`, does per-row work that scales with issue count:

1. **Azure SAS URL signing, per file reference** — `mapRowToIssueFileReference` calls `generateTokenisedBlobDownloadUrl` **twice** per file (`fullDownloadUrl` + `smallImageDownloadUrl`). A project with media on most of 2000 issues = thousands of blob-URL signings per list fetch.
2. **IAM name resolution, per row** — `mapRowToIssue` calls `getNameFromCacheOrIam` for **both** reporter and assignee on **every** issue (this happens on the `simple` path too). Cache-warm it's cheap; cache-cold it's IAM round-trips in the request path.

These — not raw JSON size — are the most likely dominant cost. Two things follow:

**Quick win, no BE change:** the FE can call **`?simple=true`** today. That uses `fn_GetIssueList`, which skips `fileReferences` entirely (no Azure signing). Caveat: `simple=true` **also drops `activityCategories`**, which the dashboard needs for discipline/package/type filtering — so simple-as-is is too aggressive for the dashboard (fine for the viewer if it only needs pins).

**BE ask (the actual valuable work):**
- **Add a "list" projection that keeps `activityCategories` but omits `fileReferences`** (and its Azure signing). Either:
  - implement the already-scaffolded **`fields`** param for this endpoint, or
  - add a third mode between `simple` and detailed (e.g. `include=activityCategories`), or
  - make `fileReferences` opt-in on the list (`includeFileReferences=true`, default false).
- **Lift name resolution out of the per-row path** — batch the reporter/assignee lookups (one IAM/cache call for all distinct emails in the page) instead of 2×N awaits, or return names from the SQL join if available.

---

## Acceptance criteria (BE)

- [ ] Document the 10k default / 50k max page size for FE consumers (so the client stops capping at 1000/500).
- [ ] Provide a list projection that includes `activityCategories` + coordinates but **excludes `fileReferences`** (implement `fields`, add an `include` flag, or default `fileReferences` off on the list).
- [ ] Batch reporter/assignee name resolution so it is not 2×N sequential lookups per page.
- [ ] (Only if >50k-issue projects must be supported) add a real `totalCount` to the envelope or a `…/issues/count` endpoint, and/or offset pagination for parallel fetch.
- [ ] No change to `GET …/issues/{issueId}` — it stays full-fidelity for the detail panel.

## Must keep in the list projection
`modelElementId`, `xMeters`, `yMeters`, `zMeters` (viewer pins), `activityCategories` (dashboard category filters), `issueStatus`, `issueSeverityCategoryName`, `cost`, `issueRaisedOn`. Trim **media (`fileReferences`)**, not geometry or categories.

## Suggested target
2000-issue project: full list-view retrievable in **≤ 2s** via one large-page request of a projection without `fileReferences`. Confirm with the FE timing instrumentation (PLT-2731 Phase 1c) before/after.

## Measurement first (cheap, do before any BE change)
On ELN03, compare in the Network tab:
1. current call (detailed, `size=1000`) — baseline,
2. `size=10000` detailed — isolates round-trip cost,
3. `size=10000&simple=true` — isolates the Azure-signing / fileReferences cost.
The gap between (2) and (3) tells you how much of the 10s is the per-row blob signing — i.e. how much Blocker 3 is worth.
