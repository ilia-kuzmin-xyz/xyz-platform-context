# PLT-3040 — "UG electrical displayed more than once in dashboard" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3040
- **Issue type:** Live Incident · **Issue Type field:** `Dashboards` (Software Area / Component left blank
  by the reporter)
- **Status:** **Open** · **Priority:** Major
- **Project:** CH08 — Minooka (`699db456380af76aed84b728`)
- **Reporter (Jira):** Yash Patel (support, Freshdesk #7653) · **Assignee:** Darminder Atker
- **Created:** 2026-08-11 19:22 · **Last updated:** 2026-08-11 19:22 (the auto-comment; no human
  activity since)
- **Comments:** 1, and it is the Freshdesk automation ("status changed to: Waiting on 3rd line").
  **No human has said anything on this ticket yet** — it is completely untriaged, unlike PLT-3033
  which at least had Darminder's question to build on.
- **Attachments:** **none on Jira** (`attachment: []`, re-verified live via
  `getJiraIssue` on 2026-08-12). The single image in the description is a `blob:` staging-media
  placeholder (`id=UNKNOWN_MEDIA_attachment`) that never finished uploading — the identical failure
  mode to PLT-3033. See §7.
- **Domain slug chosen:** `progress-tracking` — the surface the customer is describing (a
  Disciplines/Packages breakdown where a package reads as sitting "under" a discipline) and the
  strongest verified mechanism both live in the Progress panel
  (`progress-panel/hooks/use-progress-panel-data.tsx`). Deliberately **not** `data-pipeline`: unlike
  PLT-3033 nothing here points at ingest, and the parquet is probably correct — the defect is in how
  the panel joins parquet rows to the API category tree. Deliberately **not** `filter-system`, though
  H3 below is a genuine second candidate mechanism that lives there; if the screenshot turns out to
  show the filter panel rather than the progress breakdown, `filter-system` is the better tag and the
  folder should be renamed on the next run.

---

## 1. What was reported

> As you can see from the snip below UG electrical appeared 2 times under CSA and Electrical. There is
> nothing mapped under Electrical - UG electrical. Can you please correct this ASAP as it creates
> confusion to the client?

Two claims, and the second is the load-bearing one:

1. A package named **"UG electrical" is listed twice**, once associated with the discipline **CSA** and
   once with the discipline **Electrical**.
2. **Nothing is mapped under `Electrical > UG electrical`** — i.e. one of the two listings is empty,
   which is why the customer reads it as a phantom rather than as two legitimate packages.

The customer's "under CSA and Electrical" phrasing matters for identifying the surface. Neither
candidate surface renders a literal nested tree; **both render a flat package list and append the
parent discipline as a suffix only when a package name collides** — `${name} — ${discipline}`
(`discipline-list.tsx:38-53` for the progress breakdown, `dashboard-filter-panel.tsx:41-56` for the
filter panel). So a screen reading "UG electrical — CSA" and "UG electrical — Electrical" would be
described in exactly these words. That suffix is not an accident: it was added precisely because this
data shape exists (§4).

## 2. Prior-run check (per playbook step 0)

No existing folder for PLT-3040 — brand new ticket, created 19:22 the evening after the 08-11 run's
board snapshot, first run to touch it. Same "missed by a few hours" shape as PLT-3033 on 08-10 and
PLT-3024 on 08-06.

Nothing in `recurring-defect-patterns.md` covers duplicated categories or the discipline/package
breakdown list (`grep -ril "UG electrical\|duplicate categor\|discipline-list"` over `incidents/` —
no hits). **One related prior ticket exists and is directly load-bearing:** PLT-2918 (HITT AUS01,
`PLT-2918-groupA-progress-tracking/`), whose mechanism is that the schedule Data Mapping panel's Save
was a **destructive diff** that deleted category mappings the user never touched and cascaded to
descendants. That is a documented way for a real category to end up with **nothing mapped to it**,
which is half of this ticket's report — see H4.

## 3. Domain doc check

`dashboard/flt-filter-system.md` § "Package identity — id-keyed (PLT-2821)" is the single most
relevant page in the KB and it **already documents the precondition for this ticket**: *"Package
display names are NOT unique (same name can exist under several disciplines), so `filters.package`
holds `activityCategoryId`s, not names."* PLT-2821 converted the filter/selection layer to ids and
added the collision-only discipline suffix. It did **not** convert the progress panel's
parquet-to-category **data join**, which still falls back to names (§4, H1). Read this ticket as the
unfinished half of PLT-2821 rather than as a new phenomenon.

`dashboard/progress-tab.md` documents `categorySummary$` as a service output (lines 28, 69) but does
not describe `DisciplineList` or how its rows are assembled from the API category tree — that join is
undocumented, which is why nobody has looked at it. Worth a `progress-tab.md` addition once the
mechanism is confirmed.

## 4. Code findings (hc-frontend)

### VERIFIED — two same-named packages under different disciplines is a supported, expected data shape

The codebase does not treat this as corrupt data; it was designed for. The regression test for the
package-id resolver uses **this exact project's data as its fixture**:

```
// "UG Electrical" exists under BOTH CSA and Electrical — same name, distinct ids.
['CSA',        ['pkg-ug-csa', 'pkg-builder']],
['Electrical', ['pkg-ug-elec']],
```
(`dashboard-filter-service.resolver.test.ts:9-18`, asserting `resolvePackageId('CSA','UG Electrical')`
≠ `resolvePackageId('Electrical','UG Electrical')` at `:51-52`, and that the bare name must resolve to
**nothing** because it is ambiguous at `:61`.)

So "UG electrical appears twice" is, on its own, **not a defect** — it is two distinct
`activityCategoryId`s that happen to share a display name, and the panel labels them apart with the
discipline suffix. The defect claim rests entirely on the second half of the report: that one of them
has nothing mapped and should therefore not be displayed at all.

### VERIFIED — the API category tree cannot itself duplicate a package across two parents

`generateDisciplinePackageMap()` (`category-mapping-service.ts:183-227`) builds
`discipline2PackageMap` strictly from `parentActivityCategoryId`, so each Package category has exactly
one parent discipline. A name appears under two disciplines **only if two distinct Package category
records with that name exist**. Two collision hazards worth noting while in here, neither
sufficient to explain this ticket: `packageMap` and `package2DisciplineMap` are **name-keyed and
last-write-wins** (`:196`, `:210`), as is `_categoryByNameAndType` (`:108-109`), so any consumer of
those maps silently loses one of the two "UG electrical" categories.

### VERIFIED — the progress panel's package rows can borrow a same-named sibling's parquet row (H1's mechanism)

`use-progress-panel-data.tsx:215-333` builds `disciplineListData` by walking the **API category tree**
(one row per category) and looking up each category's numbers in the **parquet** result
(`categorySummaryUnfiltered`). The lookup is an OR:

```ts
const packageData = categorySummaryUnfiltered.find(
  cat =>
    cat.TypeName === 'Package' &&
    (cat.ActivityCategoryId === packageCategory.activityCategoryId ||
      cat.CategoryName === packageCategory.categoryName),
)
```
(`use-progress-panel-data.tsx:253-259`; the identical fallback exists one level up for disciplines at
`:233-239`.)

The name half of that OR is **not discipline-scoped**, and there is no guard restricting it to the
mode that needs it. Consequences, each verified:

- **A package with nothing mapped has no parquet row.** `getCategorySummaryV2API` ends its WHERE with
  `AND ${weightColumn} > 0` (`progress-queries-v2-api.ts:577`) and then drops any row whose actual and
  planned are both zero (`:601-606`). So the empty `Electrical > UG electrical` category is provably
  absent from `categorySummaryUnfiltered` in package-level mode.
- **Absent from the parquet, it still renders.** Its UUID match fails, the `.find()` falls through to
  `CategoryName === 'UG electrical'`, and it matches **CSA's** row. It is therefore emitted with
  `id: packageCategory.activityCategoryId` (its own id) and `name: packageCategory.categoryName`, but
  with **CSA's planned, actual, variance and segments** (`:281-292`). Without the fallback it would
  return `null` and be dropped by `.filter(Boolean)` (`:294`) — i.e. the customer would see the name
  once, which is what they expect.
- **Both rows then render, distinctly.** `DisciplineList` keys and selects by package id
  (`discipline-list.tsx:229-232`, `:243`) and appends the discipline suffix because the name now
  collides (`:38-53`).

**Why the fallback exists** (so the fix does not just delete it): when an activity is selected the
panel switches to `getCategorySummaryByActivity`, which aliases `ac.CategoryName as ActivityCategoryId`
(`progress-queries-v2-api.ts:1011`) — in that mode the parquet genuinely carries names, not UUIDs, and
the hook's own comment says so (`use-progress-panel-data.tsx:248-250`). Note that this mode is
**worse**, not better, for our data shape: it groups by `ac.CategoryName, ac.TypeName,
ac.ParentDiscipline` (`:1017`) yet exposes only the name as the id, so two same-named packages produce
two rows sharing one id and the hook's `.find()` hands the **same** row to both categories. The
correct fix is to scope the name fallback to activity mode and to match on the (discipline, package)
pair rather than the name alone — the same pair-keying PLT-2821 already introduced in
`dashboard-filter-service.ts:125-133`.

**This makes PLT-3040 a Pattern 2 counterexample, like PLT-2874.** The frontend is not faithfully
rendering an upstream duplicate here; it is synthesising a row that the data does not contain.

### VERIFIED — the filter panel has an independent, structurally similar leak (H3's mechanism)

`extractFilterOptions()` gates each discipline's tree-derived packages against the set of packages
"that exist in the schedule" — but that set, `mappedPackages`, is a **flat set of names with no
discipline scoping** (`dashboard-filter-utils.ts:57`, populated at `:64-65` and `:74-75`), and the
filter is `pkgArray.filter(pkg => mappedPackages.has(pkg))` (`:86`). So an empty
`Electrical > UG electrical` is offered as a filter option purely because **CSA's** same-named package
has data. Same class of bug as H1, different surface, and it also explains a "nothing mapped" reading:
selecting the phantom option resolves to a package id whose parquet has no rows, and per
`flt-filter-system.md` an id that resolves to no known pair matches **nothing** everywhere.

### Hypotheses, ranked

**H1 — The empty `Electrical > UG electrical` category is real, and the progress panel displays it by
borrowing CSA's parquet row through the unscoped `CategoryName` fallback
(`use-progress-panel-data.tsx:253-259`).** Explains both halves of the report with one mechanism, on
the surface the customer's wording best fits. **Falsifiable in one look at the screenshot: the two
rows must show identical planned %, actual % and variance badge.** If they differ, H1 is dead and H2
is alive. **Confidence this is the ticket's mechanism: 6/10.** Confidence the defect itself is real and
worth fixing regardless of this ticket: **8/10** (read directly, both OR branches traced, and the
absence of a parquet row for a zero-weight package is provable from `:577` and `:601-606`).

**H2 — No frontend defect: both categories carry real weight, both rows are legitimate, and "nothing
mapped" means no linked model elements rather than no activities.** Under the default
`PLANNED_LABOUR_HOURS` weighting (`app/types/progress-weighting-types.ts:17-23`) a package whose
activities carry labour units but zero linked elements passes `weightColumn > 0` and renders with real
numbers, so the customer can be looking at two genuine packages and objecting to the duplicate *name*
and to the fact that one has no model content. Then the fix is data cleanup, not code. Adjacent to
`recurring-defect-patterns.md` Pattern 3 (the weighting setting decides what the panel shows).
**Prediction: the two rows show different numbers. Confidence: 4/10.**

**H3 — The surface is the filter panel, not the progress breakdown, via the discipline-agnostic
`mappedPackages` name set (`dashboard-filter-utils.ts:57`, `:86`).** The mechanism is verified; what is
unverified is whether it is the screen in the snip. **Confidence as the reported surface: 4/10**;
confidence the leak exists: 8/10.

**H4 — The Electrical package once had activities mapped and lost them, PLT-2918-style.** The Data
Mapping panel's Save deleted category mappings the user never edited and cascaded to descendants
(`PLT-2918-groupA-progress-tracking/context.md`; the guard now documented at
`category-mapping-service.ts:225-240` postdates that incident). This is the only hypothesis that
answers "why now" with a dated cause rather than "it was always like this", and it changes the remedy:
the category should be **re-mapped**, not deleted. **Confidence: 3/10**, but cheap to test and
expensive to get wrong.

**H5 — Only one "UG electrical" category exists and the second row is injected by the issue-derived
merge.** `dashboard-filters.tsx:141-152` pairs an issue's package tag with whatever discipline tag
happens to sit on the same issue, and `dashboard-filter-utils.ts:196-201` merges those pairs into the
tree-derived map **unconditionally** (`issueCategoryData` is passed on every project, not only
quality-only ones — `dashboard-filters.tsx:207-217`). One quality issue tagged Discipline=Electrical
plus Package=UG electrical (CSA's category) would manufacture the pair. Filter-panel only.
**Confidence: 2/10** — but it is the only mechanism that needs **no** duplicate in the category tree,
which is why the discriminating check below is worth running first: it separates H5 from H1/H2/H4 in
one query.

### The one check that discriminates all five

List CH08's activity categories and count Package categories named "UG electrical", with their parent
discipline and their mapping count. Two ids → H1/H2/H4 live, H5 dead. One id → H5 is the only survivor.
Zero mappings on the Electrical one → H1 or H4; non-zero → H2. This needs no customer input and no
screenshot: it is the Data Mapping panel on CH08, or `Activity.listCategories` /
`Activity.listMappings` for `699db456380af76aed84b728` (the same two calls the dashboard itself makes —
`api-categories-loader.ts:85-92`, `:98-110`).

## 5. What remains unverified

- **Which surface the snip shows.** The progress panel's Packages list (H1) and the filter panel's
  package options (H3) both render a flat list with a `— <discipline>` suffix on collision, so the
  customer's wording fits either. The image would settle it in one look, and it is unrecoverable (§7).
- **Whether CH08's category tree contains one or two Package categories named "UG electrical."**
  Everything above branches on this and it was not checkable from this environment (no project data
  access; this repo cannot run the app).
- **Whether the two displayed rows show identical numbers.** This is H1's falsifiable prediction and
  the single cheapest confirmation available. It requires the screenshot.
- **Whether the Electrical one ever had mappings** (H4) — needs either the customer's memory or a
  mapping-history check on the backend.
- **Whether CH08 is on labour or element weighting**, which decides whether H2 is even possible.
- **"Why now."** No dated trigger is available. The local `hc-frontend` checkout is shallow (50
  commits, `--is-shallow-repository` = true) and only two commits touch
  `use-progress-panel-data.tsx`, so `git log -S` cannot date the name fallback, and the customer has
  not said whether this is new. Do not assume a regression; the fallback may have always behaved this
  way and the duplicate category may be recent instead.
- **Nothing here has been compiled, type-checked or run** (standing environment limit).

## 6. Confidence

- **Two same-named packages under different disciplines is an expected, designed-for data shape, and
  the twice-listing alone is not the defect: 9/10** — the resolver test encodes exactly this case with
  CSA/Electrical/UG Electrical as its fixture (`dashboard-filter-service.resolver.test.ts:9-18`).
- **A package with nothing mapped is absent from the package-level parquet result: 9/10** — read
  directly (`progress-queries-v2-api.ts:577`, `:601-606`).
- **The progress panel will render such a package anyway, wearing a same-named sibling's numbers:
  8/10** — both branches of the `.find()` OR traced (`use-progress-panel-data.tsx:253-259`), including
  what the `null`/`.filter(Boolean)` path would otherwise have done (`:294`).
- **That this is PLT-3040's actual mechanism: 6/10** — it fits both halves of the report and the
  customer's phrasing, but the surface is inferred from wording, and the category-tree precondition is
  unconfirmed.
- **Overall triage confidence: 6/10.** Higher than PLT-3033 (4/10) because the mechanism is entirely
  inside this repository and reads cleanly, and because the discriminating check needs no customer
  cooperation. Capped at 6 because the surface identification rests on a sentence rather than an
  image, and H2 (no code defect at all) has not been excluded.

## 7. NEEDS HUMAN — the description image never uploaded (same failure mode as PLT-3033)

⚠️ The single image in the description is a `blob:` staging-media placeholder
(`id=UNKNOWN_MEDIA_attachment`) and `attachment` is an empty array via the API, re-verified live on
2026-08-12. As on PLT-3033, this is **not** an auth or permissions gap on the agent's side: the file
does not exist server-side, so no credentials will fetch it and nobody, human or agent, can open it.
It needs a **re-send as a real Jira attachment**, not a different viewer.

**What the image would settle, in priority order:**
1. Which of the two surfaces the customer is on (progress breakdown vs filter panel) — decides H1 vs H3
   and therefore which file the fix lands in.
2. Whether the two "UG electrical" rows show **identical** planned/actual/variance numbers. Identical
   confirms H1 outright; different kills it and promotes H2. This is the cheapest confirmation
   available on the whole ticket.
3. Whether the rows carry the `— CSA` / `— Electrical` suffix, which confirms the collision path is
   active rather than the customer inferring parentage from elsewhere.

Note that the discriminating category check (§4) does **not** need the image and can run in parallel,
so this ticket should not be parked waiting on the customer.
