# PLT-2941 — Dashboard filter panel hides every category with zero weight

**Ticket:** https://xyzreality.atlassian.net/browse/PLT-2941 (Bug, Blocker, Dev In Progress)
**Reported by:** Radu Vulpe, 5/5 repro. **Investigated:** 2026-07-30 on staging,
project `5831156a-8236-4800-b3c2-9faa4bd0e5b0` (mongo `68e4fc578fd84eaba0894b0b`).

**Confidence: 9.** Root cause proven by query against the live dashboard DuckDB, and a
quantitative prediction about the panel contents was made before looking and matched exactly.

---

## Problem statement

Two activities were mapped in the editor to two different disciplines (Commissioning, Design),
each holding a package named `TEST01`, then linked to elements. On the dashboard the left filter
panel showed **neither `TEST01` nor either parent discipline**. Selecting the activity made
`TEST01` appear.

The panel listed exactly one discipline (`CSA`) and one package (`Architectural Concrete`).

## Root cause

`getCategorySummaryV2API` (`progress-queries-v2-api.ts:498`) builds the filter option list from
the `category_groups` parquet and ends with:

```sql
WHERE (TypeName = 'Package' OR TypeName = 'Discipline')
  AND CalendarDate = '${latestDateStr}'
  AND ${weightColumn} > 0
```
`progress-queries-v2-api.ts:575-578`

`weightColumn` follows the project's progress weighting (`:516-519`):

| weighting | column |
|---|---|
| `LINKED_ELEMENT_COUNT` | `TotalLinkedElements` |
| `PLANNED_LABOUR_HOURS` | `TotalPlannedLaborUnits` |

**`PLANNED_LABOUR_HOURS` is the default** (`app/types/progress-weighting-types.ts:17-23`, UI label
"Budgeted labour units"). So by default **any discipline or package with no budgeted labour units
is deleted from the filter panel**, regardless of how many elements are linked to it.

### Why selecting an activity fixes it

`_getEffectiveDataLevel` (`dashboard-progress-service.ts:311-349`) switches to `'activity'` level
as soon as an activity is selected, and the activity-level query weights differently
(`progress-queries-v2-api.ts:970`):

```sql
GREATEST(COALESCE(pw.Weight, a.${apiWeightColumn}, 0), 1) as Weight
```

**The weight is floored at 1**, so a zero-weight category survives and shows 0% progress. The
package-level query has no such floor and excludes the row outright. Same data, same weighting
setting, opposite outcome — that asymmetry is the defect.

## Evidence (dashboard DuckDB, staging)

At the latest `CalendarDate` inside the selected range:

| TypeName | rows | pass `TotalLinkedElements > 0` | pass `TotalPlannedLaborUnits > 0` |
|---|---|---|---|
| Discipline | 3 | 2 | **1** |
| Package | 4 | 3 | **1** |

The four relevant rows, all with zero labour units:

| CategoryName | Type | TotalLinkedElements | TotalPlannedLaborUnits | ActivityCount |
|---|---|---|---|---|
| Commissioning | Discipline | 12,648 | **0** | 162 |
| Design | Discipline | 3 | **0** | 1 |
| TEST01 | Package | 3 | **0** | 1 |
| TEST01 | Package | 9,060 | **0** | 1 |

Predicted from this that the panel would show exactly one discipline and one package. It showed
`CSA` and `Architectural Concrete`.

Note Commissioning is a **pre-existing discipline with 162 activities**, hidden by the same gate.
This is not confined to newly created categories.

## Ruled out — do not re-investigate

1. **Stale parquet.** `category_groups` holds `TEST01` on **every** date from 2024-01-02 to
   2028-01-29, 2,978 rows (two, one per parent discipline), same 1,489-date span as every other
   category. The pipeline is fully up to date. This is not a backend problem.
2. **Date range.** Tested with the full project span 2024-01-02 to 2027-06-11. Planned progress
   ramps in Aug and Sep 2025, well inside it.
3. **`HAVING SUM(ActualDelta) != 0 OR SUM(PlannedDelta) != 0`** (`:1018`). Real, but it sits on
   the activity-level query, which is the path that already works. Verified by running the whole
   CTE chain without it: both `TEST01` rows come back with non-zero planned deltas.
4. **`categoryMappingService` unpopulated on the dashboard.** It is populated, live from the API,
   at `dashboard-progress-service.ts:389-407`, so `discipline2PackageMap` has `TEST01` under both
   parents.
5. **XYZ Tracked toggle.** Both activities have `linkedElementCount > 0` (9,060 and 3).

## Proposed solution

The filtered summary can keep the `> 0` gate — that is a reasonable display choice for the
progress panel. The **unfiltered** call, the one feeding the option list
(`dashboard-progress-service.ts:1182-1190`), must not have it.

Both calls currently go through the same function with no way to tell them apart, so the fix
needs either:

- **(a) minimal** — a `forOptionList?: boolean` parameter on `getCategorySummaryV2API` that drops
  the `AND ${weightColumn} > 0` clause. `SUM(w*p)/NULLIF(SUM(w),0)` already yields NULL rather
  than dividing by zero, so nothing else breaks; or
- **(b) consistent** — mirror the activity-level behaviour and floor the weight,
  `GREATEST(${weightColumn}, 1)`, so a zero-weight category appears at 0%; or
- **(c) correct, larger** — stop deriving the *option list* from a progress artefact at all and
  build it from the category API, already on the page as `activity_categories_flat` plus
  `categoryMappingService`. A category the user can map to should be filterable the moment it
  exists, with zero progress against it.

Recommend **(a) now** for the Blocker, with **(c)** raised as follow-up tech debt. (b) changes
displayed progress figures and would need the golden-master regression fixtures rebaselined
(`progress-queries-v2-api.ts:10-17`).

## Acceptance criteria

1. With Budgeted labour units weighting selected, a discipline or package that has linked
   elements but no budgeted labour units **appears** in the dashboard filter panel.
2. On the staging project above, the panel lists Commissioning, Design and CSA as disciplines,
   and `TEST01`, `TEST01` and Architectural Concrete as packages.
3. The progress figures shown in the progress panel are unchanged.
4. `npm run jest:regression` passes without rebaselining fixtures.

## Needs human

- Confirm on staging that switching weighting to **Model element count** makes the categories
  appear. This is the falsification test for the whole diagnosis and takes five seconds.
- Product decision on (a) vs (c), and whether a zero-weight category should be visibly marked as
  unmeasurable rather than simply showing 0%.

## Separate bug found alongside — raise its own ticket

Package identity across the filter code is **name-keyed, not id-keyed**. `mappedPackages` is a
flat `Set<string>` of names (`dashboard-filter-utils.ts:57`) and each discipline's package list is
filtered against it by name (`:86`). With two packages both called `TEST01` under different
disciplines, as soon as one qualifies the other is shown too, whether or not it should be.
`categoryMappingService._categoryByNameAndType` has the same weakness — keyed
`typeName:categoryName`, so the second `TEST01` overwrites the first
(`dashboard-progress-service.ts:403`).

This does not fire today because both `TEST01`s are hidden. It will surface the moment PLT-2941
is fixed. Related prior work: `planning/PLT-2821-package-filter-identity.md`.
