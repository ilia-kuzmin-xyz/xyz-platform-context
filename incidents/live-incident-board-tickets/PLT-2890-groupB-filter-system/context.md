# PLT-2890 — "Contractor filter missing on the Dashboard Non-BI"

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
