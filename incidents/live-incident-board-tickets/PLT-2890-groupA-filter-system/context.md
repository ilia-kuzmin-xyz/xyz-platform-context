# PLT-2890 — "Contractor filter missing on the Dashboard Non-BI"

## 2026-09-01 — confirmed unchanged, delta-checked against live Jira

Status still **In Analysis**. Last comment still 110634 (Yash, 08-28, Freshdesk sync after
relaying the customer's new question about two separate contractor filters — QA vs progress/
activities — and whether they can be merged). No reply posted yet to that question. Matches last
run's reclassification (groupB → groupA, since the original fix shipped but this new question
reopened it). Nothing new to investigate.

- **Domain slug:** filter-system
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2890
- **Type:** Live Incident · **Priority:** Medium · **Status:** Open
- **Assignee:** Darminder Atker (fullstack lead — assignee on all four "contractor" tickets)
- **Reporter (Jira):** Yash Patel (support/coordinator, relaying a customer) · **Project:** ML9
- **Linked Freshdesk:** #7397 (status set "Waiting on 3rd line")
- Triage date: 2026-07-13

---

## 1. What is observed (exact surface + symptom)

The customer reports that the **"contractor" filter for QA** that existed in the **old (PowerBI)
dashboard** is **not present** in the **new dashboard** or on the **web viewer**. Reporter's own
framing (comment 107222, Yash): *"a missing filter type which was in old dashboard but not in new
dashboard and web viewer as well. 'contractor' filter is missing. Was this filter removed purposely
or it was forgotten?"*

Key characteristic: this is a **MISSING / not-rendered** symptom — the filter control is absent
from the UI entirely. This is **materially different** from "renders but doesn't filter" (that is
PLT-2891, see §3).

**⚠️ NEEDS HUMAN — attachments not viewable by me** (binary PNGs on Atlassian staging media; do not
guess contents). They are the corroborating screenshots of the old-vs-new filter panel:
- Description inline images (2×) — `UNKNOWN_MEDIA_attachment`, could not resolve.
- `image-20260713-112131.png` (att 60664) and `image-20260713-112145.png` (att 60665), by Yash.
- 2 inline blob images in comment 107222.
The text description is unambiguous on its own, so these are corroborative, not load-bearing — but a
human should open them to confirm *which exact panel/screen* the customer screenshotted (dashboard
QA filter panel vs. viewer issues-panel vs. portfolio).

## 2. What "Non-BI" means (this was a specific investigation ask)

**"Non-BI" = the new native in-browser dashboard that replaced PowerBI. "BI" = PowerBI (Business
Intelligence).** It is NOT a feature-flag variant of one shared component, and NOT a different data
source toggle inside one dashboard — it is a **wholly separate, newer implementation** superseding
the old PowerBI reports. Evidence:
- `hc-frontend/docs/dashboard/dashboard-page.md:5` — *"The Dashboard Page is a comprehensive analytics
  interface designed to replace PowerBI reports with native web-based data visualization."*
- Same doc `:7` — *"Primary Goal: Migrate data visualization and reporting capabilities from PowerBI."*
- Same doc `:315-341` "Migration from PowerBI" — lists **"Full PowerBI feature parity" as an
  unfinished Phase 4 goal.** i.e. by design, not every old PowerBI filter has been ported yet.
- `xyz-platform-context/dashboard/README.md:5` corroborates ("replaces PowerBI reports").

So the customer's "old dashboard" = PowerBI (BI); "new dashboard / Non-BI" = the DuckDB-WASM native
dashboard that lives inside the ViewerPage. The reporter's own question ("removed purposely or
forgotten?") is, in effect, **a PowerBI→native feature-parity question** — the crux of this ticket.

## 3. Cross-reference conclusion (the primary analytical job)

Four open "contractor" tickets, all assigned to Darminder. Read in full. My conclusion:

| Ticket | Status | Real subject | Surface | Layer | Same defect as 2890? |
|---|---|---|---|---|---|
| **PLT-2890** (this) | Open | contractor **FILTER absent** | new Non-BI dashboard + web viewer | **FE** (filter UI / parity gap) | — |
| **PLT-2891** | Open (sibling agent) | contractor **FILTER present but broken** | old/"current" dashboard | FE (filter predicate) | **Related, NOT same** |
| **PLT-2759** | Dev In Progress | contractor **CARD not on project cards** | portfolio project cards / web viewer | **BE** (tenant/company) | **No — distinct** |
| **PLT-2742** | Dev In Progress | contractor **CARD not shown though set** | project card (personal vs tenant login) | **BE** (tenant/company) | **No — distinct** |

### 2890 vs 2759 / 2742 (Dev-In-Progress) → DISTINCT. Do not treat as duplicate.
2759 and 2742 are the **same defect as each other** (contractor **company CARD** not displaying for
non-admin/personal logins), and they are **NOT about a filter at all**. Darminder + Sergey already
diagnosed the root cause on both:
- PLT-2742 comment 103598 (Darminder): *"a bug with the company not being attached to any tenants.
  The admin tenant gets all companies which is why you see it on admin account. Sergey is adding a fix."*
- PLT-2759 comment 104463 (Darminder): *"partly resolved by Sergey's fix on **PAPI-3344**… companies
  with no tenant assigned… Admin login will always see company in card and settings."*
These are a **backend tenant/company-association** issue (api-v1, Sergey, tracked by **PAPI-3344**).
FE surfaces are the contractor **card**: `ContractorCard.tsx` (PortfolioDashboardPage TradeWidget) and
project cards (`PortfolioPage/components/ProjectCard.tsx:112-113`). They share only the *word*
"contractor" with 2890. Different surface, different symptom, different layer, different owner, different
fix. **2890 is NOT covered by the PAPI-3344 work.**

### 2890 vs 2891 → RELATED PAIR, but likely NOT the same bug. Link, don't merge.
Strong relationship signals: **same reporter** (Yash), **same customer/project** (ML9), filed **6
minutes apart** (2890 @ 12:19, 2891 @ 12:25), and 2891's description opens *"Following my previous
ticket…"* (i.e. 2890). Both are about the **contractor FILTER** specifically.
BUT the two symptoms are logically distinct and point to different code paths:
- **2890 = filter MISSING** (not rendered) on the **new Non-BI** dashboard + web viewer.
- **2891 = filter PRESENT but NOT WORKING** on the **old/"current"** dashboard (2891 desc: *"also in
  the current Dashboard the contractor filter doesn't work"*; comment 107225: *"in old dashboard,
  Contractor filter does not work as it should… I tried it on my end as well and it didn't work"*,
  session `platform-web-1fa91a4d-cc5e-4f77-83f9-fc3026f9d420`).
A "not-rendered" bug (gate / feature-not-ported) and a "renders-but-predicate-broken" bug are
different fixes even when they concern the same conceptual filter. **Recommend linking 2890↔2891 as
"relates to", not closing either as a duplicate of the other.** A sibling agent is actively
investigating 2891 — coordinate; do not re-investigate 2891 here. (Minor caveat: 2891's own wording
mixes "current" and "old" dashboard — a human/the sibling agent should pin down exactly which surface
2891 means; it does not change 2890's diagnosis.)

## 4. Code findings — is "missing" a render-gate or a true absence?

**True absence — the contractor filter does not exist anywhere in the new dashboard / viewer code.**
This is not a conditional render gate hiding an existing filter; there is nothing to gate.
- `grep -i contractor` across the **entire** `pages/organisation/ViewerPage/` tree (the new dashboard
  + web viewer) returns **only two unrelated gantt data JSON files** — zero filter code.
- New dashboard filter **type** has no contractor field:
  `.../services/dashboard-filters/dashboard-filter-service.types.ts:13-40` (`DashboardFilters`) —
  fields are dateRange, discipline, package, level, room, progress, activityType, status, issueStatus,
  qualityCategory, xyzTracked, categoryFilters, plus selection filters. No `contractor`.
- New dashboard filter **panel** renders no contractor control:
  `.../dashboard-panels/common/dashboard-filters/dashboard-filter-panel.tsx:136-394` — Discipline
  (+Package), Floor (+Room), Critical Path, Status, Issue Status, Tracking Type, and dynamic Category
  types. No contractor.
- `dashboard/flt-filter-system.md` (KB) independently lists the same dimensions — **no contractor
  dimension documented**, confirming this was never a first-class filter in the native dashboard.

**Where contractor filters DO exist (different surfaces, not QA):**
- `shared/layout/appbar/components/PortfolioFilterPanel.tsx:151-160` — a "Contractor" filter that
  filters **portfolio projects** by main contractor (set at project creation; `FilterTooltips.contractor`
  in `shared/components/filters/filter-tooltips.ts:37-39`).
- `pages/ProgressDashboardPage/.../Filters/Filters.tsx:33-59` — a contractor multi-select on the
  Progress/reports dashboard, options derived from `reportList[].contractor`.
Neither is a **QA/quality-issue** contractor filter, which is what the customer is asking for.

**Nuance worth flagging to product:** the new dashboard *does* have a **dynamic category** mechanism
(`categoryFilters`, driven by schedule / API-v2 category types — `dashboard-filter-panel.tsx:353-389`).
If the old PowerBI "contractor" was really a category/tag on issues or activities, it *could* in
principle surface as a dynamic category **if** the project's schedule/API data carried a "Contractor"
category — but it is not a built-in filter, and it is not appearing for ML9. Whether contractor
*should* be a QA filter dimension (and where its values would come from) is a **product/data
decision**, not a mechanical bug fix.

## 5. Why "missing" (2890) vs "not working" (2891) are genuinely different bugs

- **2890 "missing":** the contractor filter is **wholly absent** from the new dashboard code (verified
  above). Root cause class = **PowerBI→native feature-parity gap** (feature not ported / possibly
  intentionally dropped). "Fix" = a product decision to add it, then build a new filter + data source.
- **2891 "not working":** the filter is **present and renders** but the predicate does not filter.
  Root cause class = **broken filter logic** on a surface where the contractor filter is implemented
  (most plausibly the Portfolio or Progress/reports filter — to be confirmed by the sibling agent).
These are non-overlapping fixes. Confirming the distinction was the point of this triage.

## 6. Confidence

- **Cross-reference conclusion (2890 distinct from 2759/2742; related-but-different from 2891): 8/10.**
  Based on full ticket text + Darminder's own root-cause comments + code. Only residual unknown is the
  unviewable screenshots (text is unambiguous).
- **"Non-BI = new native (non-PowerBI) dashboard": 8/10.** Confirmed in code docs (`dashboard-page.md`)
  and KB; consistent with reporter's "old vs new dashboard" wording.
- **"Contractor filter is truly absent (not a hidden/gated control) in the new dashboard": 9/10.**
  Grep across the whole ViewerPage tree + filter type + filter panel all agree.
- **Recommended next step (see recommended-action.md): ~7/10.** It is a coordination/product judgment,
  not a code-testable fact.

**Needs human (does not block diagnosis):**
- ⚠️ 4 images total (2 attachments + inline blobs) not viewable — confirm exact screenshotted surface.
- The product-parity call ("was the QA contractor filter intentionally dropped in the PowerBI→native
  migration, or forgotten, and should it be restored?") requires **Mostafa / Pietro** (product owners).

---

## STATUS UPDATE (2026-07-13, second pass)
PLT-2890 was moved **Open → Ready For Development** (assignee now Ilia Kuzmin) between triage passes — so it is now a **Group B** ticket (re-filed from group-a to group-b accordingly). The analysis below stands: contractor filter is genuinely absent on the new (non-BI) dashboard = a PowerBI-migration parity gap. Dev-ready hinges on the product answer "was it dropped intentionally or forgotten?" — confirm before/at the start of dev.

---

## 2026-08-31 — RECLASSIFIED Group B → Group A. The original defect shipped and was QA-verified; the ticket has been reopened on a *new* question from the same customer.

**Everything above is retained as the history of the original report. Two parts of it are now
superseded — labelled below, not deleted.**

### Live state (fetched directly, 2026-08-31)

| Field | Value |
|---|---|
| Status | **In Analysis** (id 10129) — a **Group A** status per the run instructions |
| Assignee | **Ilia Kuzmin** (unchanged since the 07-13 second pass) |
| Reporter | Yash Patel · Project **ML9** · Priority Medium · Freshdesk **#7397** |
| Last updated | 2026-08-28 11:53 BST |
| Jira links | none (the 2890↔2891 "relates to" link recommended on 07-13 was never created) |

### Reclassification decision: **Group A**, on two independent grounds

1. **Live status is "In Analysis"**, which the run instructions name explicitly as a Group A status.
   The `groupB` tag in this folder's name dated from 2026-07-13, when the ticket was *Ready For
   Development*; that state no longer exists.
2. **Even if it were still Group B, both Group B exceptions fire simultaneously** — the ticket is
   **assigned to Ilia**, and **the most recent substantive comment is a question pointed at us**
   (Yash, 110633: *"Can we look into this?"*, @-mentioning Ilia). Either alone would force a full
   Group A pass.

There is no documented reason to keep the `groupB` tag. **Folder renamed
`PLT-2890-groupB-filter-system` → `PLT-2890-groupA-filter-system`.**

### How the classification actually moved (reconstructed from this folder + the run README)

- **2026-07-13, first pass** — Open, assignee Darminder. Filed **Group A** (`group-a/filter-system/`).
- **2026-07-13, second pass** — moved Open → **Ready For Development**, reassigned to **Ilia**.
  Refiled **Group B** (the "STATUS UPDATE" block above). Folder tag set to `groupB`.
- **2026-07-22 run** — out of scope. README line 2252-2255: *"Group B is empty this run — every
  ticket that was Group B on 07-13 (PLT-2890, PLT-2759, PLT-2742, PLT-2385) has since moved to
  `Ready For QA` or `Done`."*
- **2026-07-30 11:50 BST** — **Gennaro Boccia: *"Verified fixed on Staging 26.3.3."*** (comment
  108516). The filter was built and shipped. The ticket stayed out of scope for every run from
  07-22 through 08-28 — 20 runs — and this folder was never updated to say the fix landed.
- **2026-08-28** — reopened by the customer, in three steps: 09:50 Freshdesk #7397 → Open (110631);
  10:13 Yash relays the customer's follow-up and asks us to look (110633); 10:13 Freshdesk →
  Waiting on 3rd line (110634); **11:53 Jira status → In Analysis**.
- **Why it is absent from the 08-28 run's 11-ticket set** (inferred, but tightly): that run's JQL
  *did* include `"In Analysis"`, so the only explanation consistent with both records is that the
  board was queried **before 11:53 BST**, while 2890 was still sitting in a Done/QA status. This is
  a scope-timing miss, not a classification error — but it means the reopen went unnoticed for
  three days.

### What changed, in the customer's own words (comment 110633, Yash relaying, 08-28)

> "I noticed that the contractor filter is now working for QA. The only problem is that we have two
> different contractor filters: one is related to the QA, and the other one is for the progress
> (linked to the activities). Do you know if it is possible to merge both, or do we need to fill out
> both of them?"

So: **the original defect is resolved.** The ticket is now carrying a *different*, narrower
question — a usability/product question about two same-named filters coexisting in one panel.

### ⚠️ SUPERSEDED — §4 above ("True absence — the contractor filter does not exist anywhere…")

That was correct on 2026-07-13 and is **no longer true**. A QA contractor filter now exists in the
dashboard, end to end:

- Filter state field: `dashboard-filters/dashboard-filter-service.types.ts:32` (`contractor: string[]`),
  default at `:80`, empty-state at `dashboard-filter-utils.ts:346`.
- Panel control: `dashboard-filters/dashboard-filter-panel.tsx:363-379` — a hardcoded `Contractor`
  section, rendered for **both** project types, with a three-state tooltip (`:371-378`) covering
  "issues not loaded yet" / "no contractors found" / normal.
- Options source: the issues' own `company` field, scoped to non-Draft **Quality** issues so no
  option can filter to zero — `dashboard-bar/filters/dashboard-filters.tsx:127-128`, sorted at
  `:164`, threaded through `extractFilterOptions` at `:216` and
  `dashboard-filter-utils.ts:49,224`. `null` = issues not fetched yet, `[]` = fetched and none had
  a company (`dashboard-filters.tsx:101`).
- Predicate: `dashboard-quality/utils/quality-sql-queries.ts:45-51` → `company IN (…)` inside
  `buildBaseWhereClause`. Re-query gating at `dashboard-quality-service.ts:103-109`.
- **It touches quality only.** A grep for `contractor` across the whole `ViewerPage/` tree returns
  the files above and nothing in any progress service or progress query — verified this run.

The 07-13 conclusion that this was a **PowerBI→native parity gap** (§2, §5) was right, and the gap
was closed by building the filter. Nothing else in §1-§5 is retracted.

### ⚠️ SUPERSEDED — the "STATUS UPDATE (2026-07-13, second pass)" block above

It says the ticket "is now a Group B ticket". True on 07-13, false now. See the reclassification
above.

### The new question: why there are two "Contractor" filters

**Leading hypothesis — mechanism verified in code, NOT yet verified against ML9's data.** The second
Contractor control is a **dynamic category section**, not a second built-in filter.
`buildDynamicCategoryTypes` treats only `discipline` and `package` as core
(`dashboard-filter-utils.ts:241`) and renders every other schedule-declared category type as its own
section, titled straight from the type name (`:281`), in the dynamic block at
`dashboard-filter-panel.tsx:404`. So if ML9's schedule mapping declares a category type literally
named *Contractor*, the panel renders it **directly below the hardcoded QA Contractor section at
`:363`** — two sections, same title, in the same panel, with no code anywhere that would detect the
collision.

This is the **same mechanism as PLT-3044** (`recurring-defect-patterns.md` Pattern 2, 08-14
addition; `dashboard/flt-filter-system.md` § 2026-08-14): dynamic category sections have no
allow-list in either direction. PLT-3044 was "the panel shows category types we don't track"; this
is "the panel shows a category type whose name collides with a built-in filter". Worth watching as a
second occurrence of the *no-editorial-layer* shape.

**Why they cannot simply be merged (this is the substantive answer to the customer):** the two read
different fields, from different artefacts, and reach different things.

| | QA Contractor (`:363`) | Schedule "Contractor" (dynamic, `:404`) |
|---|---|---|
| Value source | the quality issue's own `company` | a category tag on the *activity*, from the client's schedule mapping |
| Where the values come from | `allIssues[].company` (`dashboard-filters.tsx:127-128`) | `activity_categories_flat` via the schedule service |
| What it filters | quality issues only | progress/activities **and** quality issues |
| Predicate | `company IN (…)` (`quality-sql-queries.ts:50`) | `issueId IN (SELECT … issue_categories WHERE typeName='contractor' …)` (`:65-71`, `:89-93`) |

Both land in the **same** quality WHERE clause and are **AND-combined**. So the practical trap is
sharper than "you have to fill both": **if the company strings on ML9's issues do not match the
contractor strings in its schedule mapping character for character, selecting a value in each returns
zero issues** — with no explanation on screen. Same class of failure as Pattern 6's unnormalised
`===` matching, one layer up.

**The falsifiable check that settles it, in one look at ML9** (needs a human — this environment
cannot run the app): open the dashboard filter panel and compare the two lists. If the second
section's values are schedule/activity contractor tags and the first's are the companies named on
quality issues, the hypothesis holds. If the two lists are identical, they are not measuring
different things and merging becomes a real option.

**Sibling hypothesis not excluded:** the customer may be comparing **two different pages**, not two
sections of one panel — there is a separate contractor multi-select on the Progress Dashboard page
(`ProgressDashboardPage/…/Filters/Filters.tsx:33-59`, options from `reportList[].contractor`) and
another on the portfolio filter panel (`PortfolioFilterPanel.tsx:151-160`). The two attached images'
aspect ratios (1839×810 wide, then 344×516 narrow — a full dashboard, then a filter panel) fit the
one-panel reading better, but the images are not viewable, so this is not settled.

### Sibling tickets — the contractor cluster is otherwise closed

Re-checked live this run. **PLT-2890 is now the only open ticket in the cluster.**

| Ticket | Live status (08-31) | Relationship to 2890 |
|---|---|---|
| PLT-2759 "Contractor not showing up on all cards on portfolio" | **Done** (updated 07-17) | Still distinct — contractor **company card**, backend tenant/company association (PAPI-3344), not a filter |
| PLT-2742 "Contractor not showing up although set" | **Done** (updated 07-17) | Twin of 2759, same backend cause |
| PLT-2891 → **PBD-2111** | **Done** (updated 07-13) | The PowerBI-side sibling |

The 07-13 §3 conclusion holds unchanged: 2759/2742 are a **backend tenant/company** defect, 2890 is
a **frontend filter** matter, and they share only the word "contractor". Nothing in the reopened
2890 changes that — the new question is about two *filters* colliding, still nothing to do with
company-to-tenant association.

### Unopenable media (unchanged in kind, one new item)

- 60664 / 60665 (`image-20260713-112131.png`, `image-20260713-112145.png`) — the original old-vs-new
  panel screenshots. Still binary behind Atlassian auth.
- **New:** the two images inside comment 110633 are **external Freshdesk links** behind a signed
  token (`eucattachment.freshdesk.com/inline/attachment?token=…`) — not fetchable. **These are now
  the load-bearing ones:** they would settle in one glance whether the two Contractor filters sit in
  the same panel (leading hypothesis) or on two different pages (sibling hypothesis), and what names
  each list contains.

### What remains unverified

- That ML9's schedule declares a category type named "Contractor". Verified only that the code
  *would* render one if it did.
- That the two lists contain different names. Not verified either way.
- Whether the customer is looking at one panel or two pages (see the sibling hypothesis).
- Which release carried the fix. Gennaro verified on **Staging 26.3.3** (07-30); no prod release
  version is recorded anywhere on the ticket, and `git log` in `hc-frontend` shows the contractor
  filter files only under a single working commit on the current branch, not a merged release
  history this checkout can see.
- Nothing here was compiled, run or tested — this environment cannot build the app.

---

## 2026-09-01 — four of the open questions ANSWERED against live prod data

Read-only GETs against `cloud.xyzreality.com` with a browser token. ML9 projectId
`ceeb18bc-5782-48f4-9727-e33a38a50607`. Ilia also supplied two screenshots of the live panel this
session, which replace the unfetchable Freshdesk images.

### 1. Does ML9 declare a category type named "Contractor"? — YES

`GET /api/v2/projects/{id}/category-types` returns **46** category types on ML9, including:

| typeName | level | enabled | values | importedFromSchedule |
|---|---|---|---|---|
| **`CONTRACTOR`** | 1 | true | **2** | **false** |
| `ML09 - Contractor` | – | true | 0 | true |
| `TCB_CONTRACTOR` | – | true | 0 | true |
| `ML09 - Subcontractor` | – | true | 0 | true |

**A refinement of the original question:** `CONTRACTOR` has `importedFromSchedule = false`, so it was
created in the platform, **not** imported from the P6 schedule. The prior note assumed "ML9's
schedule declares it" — the schedule does not; the project configuration does.

Only `CONTRACTOR` has any values, so only it renders. The other three are empty and invisible.
**Worth knowing before anyone "tidies up" the config** — deleting the empty three is harmless,
deleting `CONTRACTOR` removes the filter.

### 2. Do the two lists contain different names? — DIFFERENT SOURCES, overlapping values

`GET /api/v2/projects/{id}/activities/categories`:
- `CONTRACTOR` -> **`Kirby`, `Techbau`** (matches the second group in the screenshot exactly, and
  matches `activityCategoryCount = 2`)

`GET /api/v2/projects/{id}/issues?size=500`:
- the **only** contractor-ish field on an issue is **`company`**
- all 500 rows read = `Techbau`. **Partial: 500 of 1,135 issues, one page.** The full issue-side
  list is not established; the panel shows Kirby too, so Kirby probably appears later.

So the two filters draw from genuinely different objects, with values that overlap rather than being
identical.

### 3. One panel or two pages? — ONE PANEL

Ilia's screenshot shows both "Contractor" groups in the **same** Web Viewer filter panel, one between
"Issue Status" and "Tracking Type", the other below "Phase". The **sibling hypothesis (two different
pages) is dead** — the leading hypothesis was right.

A second screenshot shows the **Issue Details** form carrying **both** `Company` = Techbau **and**
`CONTRACTOR` = Techbau as separate fields on the same issue. The duplication exists at data entry,
not only in the filter list.

### 4. Which release carried the fix? — 26.3.3, released 2026-08-10

From the Jira `fixVersions` field: `26.3.3`, `released: true`, `releaseDate: 2026-08-10`. This
answers the prior run's "no prod release version is recorded anywhere on the ticket" — it is on the
ticket, in the field rather than in a comment. Gennaro's staging verification (07-30) preceded it.
The customer confirmed on 28 Aug that the QA contractor filter now works.

### The code, re-confirmed

| filter | site | mechanism |
|---|---|---|
| QA-side | `dashboard-filter-panel.tsx:364` | hardcoded `title='Contractor'`, items from `filterOptions.contractors`, built from `issue.company` (`dashboard-bar/filters/dashboard-filters.tsx:128`), SQL `company IN (…)` (`quality-sql-queries.ts:50`) |
| activity-side | `dashboard-filter-panel.tsx:404` | loops `filterOptions.categoryTypes`, one `Filter` per type, `title={catType.typeName}` |

### Verdict — the original ask is DONE, the ticket is open on a different one

Missing contractor filter: implemented, shipped in 26.3.3, verified by QA and by the customer.

The live question (28 Aug) is whether the two can be merged. **They cannot be merged as a UI change.**
One filters quality issues, the other filters activities; merging means choosing a single source of
truth for "contractor", and if that is the category type it is per-project configuration rather than
code. **Class 4 — needs a product decision (Mostafa or Pietro), not a fix.** In Analysis, Medium,
assigned Ilia, no reply from our side since 28 Aug.

### Still unverified

- The full issue-side option list (only 500 of 1,135 issues read).
- Whether the first "Contractor" group in the screenshot is definitely the hardcoded one rather than
  a fifth category type. The hardcoded one always renders and the customer's description ("one for
  QA, one for progress") matches, so this is very likely but not proven by id.
- Nothing was compiled or run; this environment cannot build the app.

## 2026-09-02 — ⚠️ the merge question is ANSWERED and CLOSED. §"Verdict" above is out of date.

The 09-01 verdict ends *"Class 4 — needs a product decision (Mostafa or Pietro), not a fix. In
Analysis, Medium, assigned Ilia, **no reply from our side since 28 Aug**."* All three of those are now
wrong. Superseded, not deleted — the reasoning still stands, only the state moved.

### Our side did reply, and the product decision came back

**Ilia posted comment `110989` on 09-01 17:17** (from the draft this session produced): the two cannot
be merged; the QA one reads the `Company` field on each issue, the other is ML9's `CONTRACTOR` project
category with values Kirby and Techbau filtering **activities** not issues; the same split shows on the
issue form where `Company` and `CONTRACTOR` are two separate fields holding the same value; so today
both need filling. He routed one question to Mostafa: should one of these be the single source of truth?

**Mostafa answered 90 seconds later** — `110990` and `110992`, 09-01 17:18 and 17:20:

> "they are two different field for now. And we should keep them separate for now."
> "one is default for issue and one of schedule attribute."

**So the merge question is settled: no merge, keep both.** That is the Class 4 product decision the
09-01 entry was waiting on. Nothing further is needed on the merge, and the "if the lists match, a
product call for Mostafa/Pietro" branch in `recommended-action.md` is now dead — the call was made
without needing the full list.

The 500-of-1,135 issue sample is therefore **moot for the merge question**. It is still unread, and it
now matters for a different reason (below).

### Status today: Open, and the ball is on OUR side on a NEW question

Freshdesk 7397 went Waiting-on-customer (09-01 17:31) → Open (09-02 09:00). Ilia asked whether the
ticket can be closed (`111072`, 10:57). Yash relayed a new customer question 4 minutes later
(`111073`, 11:01) and set Freshdesk to **Waiting on 3rd line**:

> "Do you know if there is any trick/way to automatically populate all the QA issues to match between
> the contractor and the company?"

**Unanswered as of this entry.** This is the only thing holding 2890 open.

### What the code says about auto-populating (platform-api, read 09-02)

| path | what it does |
|---|---|
| `POST /api/v2/projects/{id}/issues` | sets `company` on create (`issues.service.ts:73`) |
| `PATCH /api/v2/projects/{id}/issues/{issueId}` | sets `company` on one issue (`issues.service.ts:198`) |
| `PUT /api/v2/projects/{id}/issues/bulk-update-types` | the **only** bulk issue write (`issues.routes.ts:1505`) — issue **types** only, not `company` |
| `PUT /api/v2/projects/{id}/issues/activity-categories/{issueId}/link` | the contractor side — `usp_UpsertIssueActivityCategoryMappings`, **per issue**, gated on `ISSUE_EDIT` |

**No bulk `company` write exists, and nothing derives either field from the other.** So the honest
answer is: no trick today. `bulk-update-types` is the precedent if we want to build one — that is a
feature ask, not a live-incident fix, and it should be its own ticket rather than a third reopen of a
shipped one.

### ⚠️ Correction to something this session claimed earlier — do not repeat it

Earlier on 09-02 this session asserted that an issue's `activityCategories` is **derived from the
activity the issue is linked to**. **That is false.** `issues.categories.service.ts:8-27` shows
`UPSERT_ISSUE_ACTIVITY_CATEGORY_MAPPINGS = 'CALL xyz."usp_UpsertIssueActivityCategoryMappings"($1,$2,$3,$4)'`
and `linkActivityCategories()` — it is an **explicit per-issue mapping table**, written through the
endpoint above. A draft comment built on the derived-from-activity theory was withdrawn before it went
anywhere. Recorded here because the theory is superficially plausible and the same wrong turn is easy
to take twice.

This also *strengthens* Mostafa's answer rather than weakening it: two independently-written fields is
exactly why they cannot be merged, and exactly why nothing populates one from the other today.
