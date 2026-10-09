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

## 2026-10-04 — no change; all three blockers still unanswered

No reply from Jason on placement, nothing from BE on where Length/Area/Volume come from, and no
definition of "Coverage". Last comment on the ticket is still the 10-03 one. Stays Analysis In
Progress, no code written. The reuse shortlist and the `activityCategoryId`-not-name row-key
warning above are the things to re-read when it unblocks — the UI itself is small once the three
decisions land.

## 2026-10-05 — no change; still blocked on all three

Nothing moved over the weekend. Last comment on the ticket is still the 10-03 clarification —
no answer from Jason on placement, nothing from BE on where Length/Area/Volume come from, no
definition of "Coverage". Stays Analysis In Progress, no code written, and nothing re-asked:
the ask is two calendar days and zero working days old, so chasing it again would just be noise.

## 2026-10-06 — escalated by Pietro to top priority; blockers re-verified against the backend and still hold

Pietro commented on 10-05: *"@Ilia Kuzmin this is top prioritity please"*. That is an escalation,
**not an answer** — all three questions from 10-03 are still open and the ticket still cannot start.

This run did **not** just re-note the stall. The second blocker was re-verified first-hand against
`XYZPlatformApi` at `origin/master` (`e904547`), because a three-day-old "backend has nothing"
claim is worth re-checking before repeating it to a product owner:

- `quantityType` — **zero** occurrences in `src/`.
- `packageType` — **zero** occurrences.
- `coverage` — **zero** occurrences.
- `Volume` — **zero** occurrences.
- The only weighting concept is still `ProjectProgressWeightingMethod`
  (`src/models/ingress.ts:44`) = `PLANNED_LABOUR_HOURS | LINKED_ELEMENT_COUNT`, exposed as
  **GET-only** at `GET /:projectId/progress-weighting`
  (`src/api/v2/projects/projects.routes.ts:754`), backed by `fn_GetProjectProgressWeighting`.
  Project-level, one value, no write path.

So the backend blocker is confirmed, not assumed: **there is no per-package mapping to save to and
no Length/Area/Volume field to measure.** This ticket is backend-first; the FE panel cannot be
built against anything today.

A fresh comment was posted to PLT-3184 (comment `114045`) addressed to Pietro, carrying that
verification and asking whether to raise the backend ticket plus 10 mins with Jason, or to size it
backend-first and park the UI. Re-asking was justified this time where it was not on 10-04/10-05:
the priority changed, three working days have passed, and the comment carries new evidence rather
than a repeat of the question.

**Deliberately did not start the UI.** A panel with a quantity selector that persists nowhere and a
"Coverage" column whose number I invented is worse than no panel — it looks like progress, and
every bit of it gets rewritten once the real contract lands.

## 2026-10-08 — the three 10-03 blockers were overtaken by events; PR #2277 unblocked from red + conflicted

Supersedes the "deliberately did not start the UI" stance recorded on 10-06 — not because that
reasoning was wrong, but because the ticket moved on without it: **PR #2277 exists** (created
10-07 10:01, 22 files), the ticket is **In Code Review**, and the UI was built against a Supabase
`package_measure` table (`xyz-supabase#60`) as a stopgap until API 2.0 has an endpoint. The three
10-03 questions were answered by decision rather than by reply — placement went to a *third* toggle
inside the Types tab (option 3 of the 10-03 shortlist, the one marked "not recommended"), gated on
a new `PackageQuantities` flag rather than Commissioning. Worth knowing that the recommendation was
overruled; the Types tab now shows with either flag on.

Still true and still blocking the feature (not the PR): **PAPI-4185** — saving the new "Weighted
labour units" weighting needs BE support that does not exist, and length/area/volume are still not
extracted from models, so non-Count measures render "—".

### What this run actually did

The PR was **red and conflicted** at the start of the run — both now cleared.

1. **Merge conflict (`mergeable_state: dirty`)**, from PLT-3247 landing on master: it added
   `initialOpenType` (the viewer's "View type" deep-link) to the very props this branch had
   extended with `showCommissioningTypes` / `showPackageTypes`. The two features are independent,
   so both sides were kept. The one judgement call is the `kind` seed:

   ```ts
   const [kind, setKind] = useState<TypeKind>(
     initialOpenType?.kind ?? (showCommissioningTypes ? 'assetTypes' : 'packageTypes'),
   )
   ```

   A deep-link names the half it belongs to, so it has to win over the flag default — otherwise
   the viewer asks for a type and the tab opens somewhere else. `ProjectSettingsTypeTarget.kind`
   is `'assetTypes' | 'systemTypes'`, a subset of the branch's three-way `TypeKind`, so this
   type-checks without widening anything.

2. **Red build was the branch's own lint**, and master had already fixed it: PLT-3234 (#2283)
   removed the `--max-warnings` cap. Verified rather than assumed — `npm run lint` on the merged
   head **exits 0** (0 errors, 3166 warnings) where the 10-07 run failed at 3167 over a 3151 cap.
   The dead `ReplaySubject` import came out too.

   Left alone deliberately: `CategoryGroupsRow` / `ProjectProgressRow` in
   `progress-queries-v2-api.ts` are both declared-and-unused, and are *documentation of the parquet
   row shapes*, not dead code. With the cap gone they cost nothing, and deleting one of a matched
   pair would be worse than keeping both.

3. **Validated on the merged head before pushing**, which matters because this branch touches
   progress weighting (PLT-3010 / recurring Pattern 3): `tsc --noEmit` clean apart from the known
   gantt-stub artifacts, **421 tests pass** across 30 files (ProjectSettings, TypesTab,
   usePackageMeasures, progress-weighting-types, dashboard-progress utils), lint exit 0.

`mergeable_state` went `dirty` → `blocked`, i.e. the only thing left is approvals.

### Review threads

- **MED, dirty-form drafts (resolved, fixed in `4e53a0d`)** — switching catalogue halves unmounted
  `PackageTypesPanel` and silently binned unsaved measure edits. Fixed by lifting the drafts into
  `TypesTab` rather than by a confirm dialog: nothing to confirm if nothing is lost, and it is less
  UI. **The trap when touching this:** the prop takes a `SetStateAction`, not a plain value —
  `handleSave` must clear exactly what it sent against the *latest* drafts, or a measure changed
  mid-save is dropped, which is the bug `c69e5050f` already fixed once. Passing a plain value
  re-breaks it.
- **HIGH, Supabase auth (left open, deliberately)** — see below.

### The HIGH finding is a property of the whole bridge, not of this PR

Checked rather than repeated: `commissioningApi/postgrest-client.ts` sends the *same* two headers
off the *same* publishable key (`apikey` + `Authorization: Bearer`), and per
`commissioning/data-layer.md` every commissioning table carries a permissive anon policy
(`using (true) with check (true)`) with project separation done client-side. So `package_measure`
is exactly as exposed as the other 21 tables — this PR widens the blast radius by one table, it
does not create the hole, and there is no Supabase↔platform identity to derive `modified_by` from.

Which is why no patch was attempted: half-fixing it (dropping `modified_by` from the body) would
lose the audit trail without closing anything, since the key can still write any row. The exits are
the two already on the roadmap — front it with api-v2 (PAPI-4185), or tighten all 22 policies at
once. Left unresolved for a human security call, which is also the rule for security findings.

### Testability gap worth recording

There is **no regression test** for the draft-persistence fix, and this is not laziness: both
`PackageTypesPanel` views render rows through `react-virtuoso` (`TableVirtuoso` and `VirtuosoGrid`),
so under jsdom the header and footer render but **no row ever does** — the measure `Select` is
unreachable from a test. Confirmed by building the test and watching it fail on an empty body.
Covering it means shimming the virtualiser; until someone does, this panel's row-level behaviour
cannot be tested at all. Recorded so the next run does not spend the same half hour rediscovering it.

### Addendum, same run — the draft lift created a save race, caught and fixed

Copilot's re-review of `4e53a0d` found a real consequence of the fix above, and it is worth
recording because it is non-obvious: once the drafts outlive `PackageTypesPanel`, switching
catalogue halves mid-save and returning gives a **fresh, idle `useMutation`**. The user can then
press Save again while the first request is still in flight, and if the older write lands last it
silently overwrites the newer measure. Before the lift this was impossible, because the drafts died
with the panel.

Fixed in `65217bc` with a React Query **mutation scope** keyed per project:

```ts
scope: { id: `package-measures-save-${projectId}` },
```

The reason this works where component state would not: scopes live on the **mutation cache**, which
hangs off the QueryClient, so the queueing survives the unmount. Scoped mutations run serially, so
the later write lands last.

The other half of the finding was already safe and does not need changing: `withoutSaved` deletes a
draft only when it still equals what that save sent, so an earlier Area save completing leaves a
newer Volume draft dirty and saveable (that was `c69e5050f`). **Ordering was the only real problem.**

Known cosmetic leftover: on the remounted panel `isSaving` is false while a scoped save from the
previous mount is pending, so Save looks enabled. Pressing it queues rather than races, so it is not
a data-integrity issue; surfacing it needs `useMutationState`.

**Still open on #2277 (2 threads):** the HIGH Supabase auth decision, and a request for MSW-backed
save-lifecycle coverage — the latter left open deliberately, because the "assert the displayed
measures" half of it is blocked by the virtuoso gap above and landing only the request-shape half is
exactly what the reviewer objected to.

## 2026-10-09 — conflicted again; resolved. Second conflict in two days, same file

#2277 was `mergeable_state: dirty` again at the start of this run — the second conflict in two days,
both in `TypesTab.tsx`, both because this branch widens that component's props while master keeps
adding to them.

**This time:** master's PLT-3192 (`aeb2213`, loading state for asset/system type updates) added
`handleModalClose` to the prop destructure; this branch had added `showCommissioningTypes` and
`showPackageTypes`. Git conflicted on the one destructuring block.

Resolution was the **union of both sides** — and it was unambiguous, which is worth recording:

- The `TypesTabProps` **interface merged automatically** and already declared all four props.
- `ProjectSettings.tsx:184-190` already **passes all four**.
- `handleModalClose` is consumed at `TypesTab.tsx:453` and `:475`.

So the only resolution that leaves both features working was to keep all four. Nothing was dropped
and no behaviour was chosen between.

Merged in `5261f36`. `mergeable_state` `dirty` → `blocked`. Base is now `d45aeaf`.

Validated on the merged head before pushing: `tsc --noEmit` clean, eslint clean on the resolved
file, **377 tests** across `ProjectSettings/` and `DashboardPage/`.

**Pattern worth acting on:** `TypesTab.tsx`'s prop list is a collision point. Two conflicts in two
days, both trivial to resolve but both requiring a human-ish read. This branch has been open since
10-07 and is blocked on PAPI-4185 plus the HIGH Supabase decision, so it will keep colliding for as
long as it sits. Either land it or expect to re-merge every couple of days.

**Still open on #2277 (2 threads, unchanged and both deliberate):** the HIGH Supabase auth decision
(cross-repo, needs a human), and the MSW save-lifecycle coverage request blocked by the
`react-virtuoso` jsdom gap. Neither moved this run — no new evidence to add, so re-pinging would be
noise.

### Later the same day — same-named packages were indistinguishable in both views

Copilot flagged the gallery card showing only `row.name` with the discipline in a hover `title`.
Checked the table expecting it to be the safe one — **it isn't.** Its columns are Package type /
Measure type / Quantity available, with **no discipline column**, and `packageName`
(`PackageTypesPanel.tsx:513`) was also `row.name` + `title`. So both views had it.

Package names genuinely repeat across disciplines — two "Access Control" rows, which the
`toPackageRows` fixture already carries — and sorting by name puts them adjacent.

Why this was worth fixing rather than noting: the panel's only job is assigning a measure per
package. Picking the wrong one of two identical-looking rows raises no error; it silently weights
the wrong package's progress, and the next sight of it is a dashboard number nobody can account
for.

Fixed in `1a83c1b` — table renders the discipline in muted text beside the name, gallery cards on
their own caption line above the element counts. `labelOf` still backs the hover title and the
aria-labels.

**Note on how this was missed:** an earlier thread on this same PR asked for the discipline in the
*accessible* labels, and that fix (`c69e5050f`) landed and was resolved. It covered screen readers
only, and having "fixed the discipline problem" once made the visible half easy to overlook. An
a11y label is not a visible label.

**Flagged, not fixed:** `matches()` at line 80 searches `row.name` only, so searching a discipline
name finds nothing even though it is now on screen. That is a behaviour change to the search box
rather than part of the finding — left for a decision.
