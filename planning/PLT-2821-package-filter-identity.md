# PLT-2821 — Package filter conflates same-named packages

**Verified against `master` — still actual.** `DashboardFilters.package` stores display **names**, which are not unique (e.g. "UG Electrical" under both CSA and Electrical, different `activityCategoryId`s). Selecting one filters both; the left-list highlights every same-named row.

## Goal
Re-key the **package** filter from name → `activityCategoryId`, and update every consumer to disambiguate. Discipline stays name-keyed (discipline names are unique / top-level; ticket is package-scoped).

---

## What the investigation found (the pipeline is ~90% id-ready)

**The linchpin already exists.** The progress service loads the full category tree from the API into `_categoryTreeMap: Map<activityCategoryId, IActivityCategory>` (`dashboard-progress-service.ts` `_fetchActivityCategories`). Each `IActivityCategory` has `activityCategoryId`, `parentActivityCategoryId`, `categoryName`, `typeName` — so **id → (discipline, package) is a clean 1:1 resolution**, and the (discipline, package) pair is itself unique.

**Already id-based (no change / simpler):**
- **Progress summary queries** — `getProjectProgressV2API` already filters by `ActivityCategoryId`; `_buildFilteredPackageIds` already resolves names→ids. Once the filter holds ids, this *simplifies*.
- **UI rows** — `Discipline`/`Package` list items already carry `id = activityCategoryId` (`use-progress-panel-data`). The click handlers just need to pass `id` instead of `name`.
- **Issues carry the id** — `IssueActivityCategory.activityCategoryId` exists (verified). So quality is fixable frontend-only.

**Name-only today, must be disambiguated:**
| Consumer | File | Today | Fix |
|---|---|---|---|
| Filter state | `dashboard-filter-service.ts` | `package: string[]` = names; `_disciplinePackageMap` name→name; `_pruneOrphanedPackages` by name | key by id; map discipline-name→package-id[]; prune by id |
| UI handlers | `progress-panel.tsx` `handleApplyFilter`, `discipline-list.tsx` | pass/highlight by `name` | pass/highlight by `id` (rows already have it) |
| Schedule | `dashboard-schedule-service.ts` `_buildCategoryFilters` | `c.package IN (names)` over `activity_categories_flat` (no id col) | resolve id→(discipline,package) pair; filter `(c.discipline=d AND c.package=p) OR …` |
| Viewer colouring | `dashboard-progress-service.ts` `getElementsWithDynamicStatus` | `cat.package IN (names)` over `activity_categories_flat` | same pair-resolution |
| In-memory gantt | `matchesScheduleFilters` | matches by package name | resolve to pair (or id if the gantt row carries it — to confirm) |
| Quality | `quality-sql-queries.ts` `buildCategorySemiJoin` + `issue_categories` table | `categoryName IN (names)` | add `activityCategoryId` column to `issue_categories` (populate from `issue.activityCategories`); filter by id |
| Right-rail panel | `dashboard-filter-panel.tsx` / `dashboard-filter-utils.ts` | dedupes packages by name (`new Set(...).flat()`) | key options by id; **show discipline context** for same-named packages so both are selectable/distinct |

## Disambiguation strategy — two mechanisms, both frontend-only
1. **Where the data has the id** (progress `category_groups`, issues `activityCategoryId`): filter by `ActivityCategoryId` directly.
2. **Where the data has only names** (`activity_categories_flat`: schedule + viewer): resolve each selected id → its **(discipline, package) pair** via `_categoryTreeMap` and filter on the pair. The pair is unique, so this disambiguates without a data-model change to the flat table.

A single **resolver** on the progress/filter service — `resolvePackageIds(ids) → { id, discipline, package }[]` — becomes the choke point every name-assuming consumer calls.

---

## Sequencing (avoids the "partial migration breaks consumers" trap the ticket warns about)
Do it as **one coherent change** (all consumers in the same PR), because flipping the filter to ids mid-way breaks name consumers (confirmed: schedule → "No schedule activities available", quality hangs). Order within the PR:
1. Add the `resolvePackageIds` / id→pair resolver (pure, testable).
2. Filter service: re-key `package`, `_disciplinePackageMap`, `_pruneOrphanedPackages` to ids.
3. UI handlers + highlight → ids.
4. Progress `_buildFilteredPackageIds` → consume ids directly.
5. Schedule + viewer → pair-based SQL.
6. Quality → add id column + filter by id.
7. Right-rail panel → id-keyed options with discipline context.
8. In-memory gantt matcher.

## One UX decision (needs a call)
The right-rail panel and left list currently show duplicate "UG Electrical" labels. When two packages share a name, how to distinguish them visually? Options: `UG Electrical — CSA` / `UG Electrical — Electrical` (discipline suffix), or group under discipline headers. **Recommend the discipline suffix** on collision only (clean when names are unique, disambiguated when not).

## Testing (minimal unit tests per request)
- One small unit test on the pure `resolvePackageIds` resolver (id→pair, collision case) — cheap, high value.
- Otherwise typecheck + lint + manual: on a project with two same-named packages under different disciplines, select one → progress %, 3D colouring, schedule, and issues all isolate to that single package; the other same-named package is unaffected; the left-list highlights only the selected row.

## Risk
Medium-high — touches 4 services + 3 UI areas; confirmed break-on-partial. Mitigated by the single-PR sequencing and the one resolver choke point. No backend dependency (all ids available frontend-side).

## Scope
Separate from **PLT-2818** (render-key fix for duplicate rows on sort) — that stands alone. This is the filter-identity work only.
