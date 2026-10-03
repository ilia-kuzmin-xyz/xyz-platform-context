# PLT-3184 — Project Settings → Package types mapping panel

Epic: PLT-3186 ([Platform] Quantities and Labor Hours, Progress Weighting).

## 2026-10-03 — moved to Analysis, three blockers, no code written

Darminder's own comment on the ticket said to check placement with Jason Fingland
before starting. Did the code dig first; it turned up two more blockers beyond
placement. All three are on the ticket.

### 1. "Project Settings → Types" is Commissioning-only

`ProjectSettings.tsx:72` — `{ type: 'types', label: 'Types', enabled: isCommissioningEnabled }`,
flag from `config/constants.ts:907` (`Commissioning`, **default off**). `TypesTab.tsx`
contains Asset types and System types and nothing else. Tests pin the gating
(`ProjectSettings.test.tsx:106-125`).

Package types are a progress/schedule concept, so putting them there hides a
progress feature behind a commissioning flag. Options, least-friction first:

1. **New top-level tab** in `ProjectSettings.tsx` — the contract is three edits
   (tab union `:32-42`, `tabsConfig` row `:65-81`, one render line `:144-178`).
2. **Inside the Attributes tab**, which already manages the category-type registry
   that packages live in.
3. Third toggle inside `TypesTab` — only if product wants it commissioning-gated.
   Not recommended.

Relevant: the **General tab already hosts "Progress calculation logic"**
(`GeneralTab/GeneralTabEdit.tsx:477-486`, `FormRadioGroup name='progressWeightingMethod'`),
which makes General/Attributes the closer neighbour.

### 2. Length / Area / Volume do not exist in the frontend

No `quantityType`, no `quantity`, no Length/Area/Volume element parameter anywhere
in `src/main/webapp/app`. The only Volume code is viewer mesh maths
(`shared/util/geometry-utils.ts:87-95`) — a computation, not a stored queryable
quantity. `measurementType` is Metric/Imperial only, which also means the ticket's
hardcoded `m / m² / m³` would need conversion for an Imperial project.

Someone has to say where the quantities come from: a new BE field on the element,
or something DPL derives.

### 3. No API, and "Coverage" is undefined

Progress weighting today is **one project-level choice**:
`types/progress-weighting-types.ts:2-5` — `ProgressWeightingType` has exactly
`PLANNED_LABOUR_HOURS` and `LINKED_ELEMENT_COUNT`. Read via
`GET /projects/{id}/progress-weighting` (`project-api-service.ts:144-146`,
read-only; writes go through the generic project PATCH as `progressWeighting`).
Nothing stores a per-package mapping. **A new platform-api resource is needed.**

"Coverage" appears nowhere in the codebase — needs a product definition, not a guess.

### Where packages actually come from (useful whenever this restarts)

A package is **an activity *category* row with `typeName === 'Package'`**, parented
by a `Discipline` row. Not an entity, not primarily a field.

- Canonical: `activityService.listCategories(projectId)` →
  `GET /projects/{id}/activities/categories` (`activity-api-service.ts:78-95`).
  Tree assembly: `dashboard-progress-service.ts:388-460`.
- DuckDB rollups: `category_groups.parquet` + `activity_categories_flat`;
  package-level queries in `progress-queries-v2-api.ts:171,301`.
- Denormalised field `packageType?: string` on schedule activities
  (`project-service.types.ts:31`) — the gantt mapping UI's view of it.

**Row key must be `activityCategoryId`, not the name.** Package names are not unique
across disciplines (PLT-2821) — see `dashboard/flt-filter-system.md:93-102` and the
collision-aware display naming at `use-progress-panel-data.tsx:233-305`.

### Reuse shortlist for when it unblocks

| Need | Reuse |
|---|---|
| Tab layout + sticky action bar | `TypesTab.tsx:119-299` |
| Search box | `TypesTab.tsx:182-220` (`groupSearchSx`) |
| Filter pills | `AssetListContent.tsx:474-490` |
| Table + sortable header | `components/Table/`, `components/TableHeader/` |
| Bulk select (shift/ctrl range) | `AttributeTab/useMultiSelection.ts` |
| Tri-state header checkbox | `common/checkbox` + `installation-status.tsx:26,61` |
| Fetch + persist + invalidate | `PortfolioPage/hooks/useCategoryTypesQuery.ts` |

No DataGrid / TanStack Table in this repo — every table is hand-rolled.

### Risk to flag when it is specified

Adding a *third* weighting dimension multiplies a failure mode that has already
caused live incidents: PLT-3010's root cause was a weighting-basis mismatch, logged
as recurring Pattern 3 ("check settings before data"). See also
`dashboard/pitfalls.md:184-187` (zero-weight packages vanish from filter lists) and
the portfolio weighting guard (`GeneralTab/portfolio-weighting-guard.ts`), which
today requires a project's weighting to agree with its portfolio peers — a
per-package quantity type interacts with that.
