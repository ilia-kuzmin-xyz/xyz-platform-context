# PLT-2891 — "Contractor filter not working on the Dashboard"

- **Domain slug:** filter-system
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2891
- **Type:** Live Incident · **Priority:** Medium · **Status:** Open
- **Assignee:** Darminder Atker (fullstack lead — assignee on all 4 contractor tickets)
- **Reporter (Jira):** Yash Patel (support/coordinator) · **Software Area:** Dashboard · **Project:** ML9
- **Linked Freshdesk:** #7398 (Waiting on 3rd line)
- **Session Id (from customer):** `platform-web-1fa91a4d-cc5e-4f77-83f9-fc3026f9d420`
- Triage date: 2026-07-13

---

## 0. TL;DR for the triager

PLT-2891 is **not** a clean duplicate of the two Dev-In-Progress tickets (PLT-2742 / PLT-2759).
It belongs to a **different cluster**: it is the **sibling of PLT-2890** (same reporter, same
project ML9, same day, both explicitly about the *contractor filter*, one "missing" on the new
dashboard, one "not working" on the old one). The two Dev-In-Progress tickets are about the
contractor **company entity not being visible** (tenant/permissions data bug, already root-caused
to PAPI-3344) — a *different surface, different symptom, different mechanism*.

There **is** a plausible shared *upstream data dependency* (the contractor filter's data resolves
from the same tenant-scoped company/contractor source that PAPI-3344 fixes) — so the in-progress
fix **might** incidentally touch it — but that is a hypothesis to confirm, not grounds to close
2891 as a duplicate. Recommended path: **clarifying question to Darminder** (see
`recommended-action.md`).

---

## 1. The four tickets side by side (the cross-reference)

| Ticket | Status | Surface / Area | Symptom (verbatim gist) | Root cause | Reporter · Date |
|---|---|---|---|---|---|
| **PLT-2742** | Dev In Progress | Web Viewer · Far02 | Contractor **not showing although set** — visible from tenant/admin login, **not** from personal login | **Confirmed BE:** company not attached to any tenant; admin tenant gets all companies → Sergey fix | Masum/Mostafa · 28 May |
| **PLT-2759** | Dev In Progress | Web Viewer · portfolio | Contractor **card** shows on some project cards, not others | **Confirmed BE:** same — companies with no tenant assigned; admin sees all → **PAPI-3344** (Sergey) | Masum/Mostafa · 3 Jun |
| **PLT-2890** | Open | Dashboard · ML9 | Contractor filter (for QA) **MISSING** on new Dashboard (Non-BI) **and** web viewer | Unknown ("removed on purpose or forgotten?") | Yash · 13 Jul |
| **PLT-2891** (this) | Open | Dashboard · ML9 | Contractor filter **present but doesn't work** on old/current Dashboard | Unknown | Yash · 13 Jul |

**Verbatim anchors:**
- PLT-2891 description: *"Following my previous ticket, also in the current Dashboard the contractor
  filter doesn't work."* Yash comment: *"in old dashboard, Contractor filter does not work as it
  should… I tried it on my end as well and it didn't work."*
- PLT-2890 comment: *"a missing filter type which was in old dashboard but not in new dashboard and
  web viewer as well. 'contractor' filter is missing. Was this filter removed purposely or forgotten?"*
- PLT-2759 (Darminder, 5 Jun): *"partly resolved by @Sergey fix on PAPI-3344. The problem here is
  there are a list of companies with no tenant assigned… Admin login will always see company in card
  and settings because this login type gets access to every company setup on platform."*
- PLT-2742 (Darminder, 28 May): *"a bug with the company not being attached to any tenants. The admin
  tenant gets all companies which is why you see it on admin account. Sergey is adding a fix."*

## 2. Cross-reference conclusion — TWO clusters, not one

**Cluster 1 — company-visibility (PLT-2742 + PLT-2759): the same defect as each other.**
The "contractor" here is a **company entity** that fails to *display* (on web-viewer / portfolio
project cards and settings) for tenant-scoped (non-admin) users. Signature: **login-dependent**
(admin/tenant sees it, personal doesn't). Root cause **already confirmed**: companies with no tenant
assigned; admin login is granted every company on the platform. Fix owned by **Sergey (BE v1)** in
**PAPI-3344**. Both are correctly parked in Dev In Progress. This is a backend data/permissions bug.

**Cluster 2 — the contractor *filter* control (PLT-2890 + PLT-2891): a matched pair.**
Both are about the **filter UI**, filed by the **same reporter, same project (ML9), same day**, and
the reporter **explicitly cross-links them** ("Following my previous ticket"). 2890 = filter *absent*
on the new (Non-BI) dashboard + web viewer; 2891 = filter *present but ineffective* on the old/current
dashboard. They describe the contractor filter across two different surfaces.

**Is PLT-2891 the same defect as the Dev-In-Progress tickets?** — **Likely DISTINCT.** Evidence:
1. **Different surface / mechanism.** 2742/2759 = whether the contractor *company entity* is returned
   and shown at all. 2891 = a *filter control* that is rendered but does not narrow results.
2. **Different observation signature.** 2742/2759 is explicitly **login-type dependent** (the classic
   tenant/permissions tell). 2891 reports no such dependency — Yash reproduced it on his own account;
   the filter simply "doesn't work." That is a functional filter-application failure, not an
   entity-visibility gap.
3. **Different (already-known) root cause.** PAPI-3344's cause ("company has no tenant → not returned
   for non-admins") explains "entity not shown", **not** "filter present but ineffective."
4. **Tighter coupling to 2890 than to the card cluster** (same batch/project/day/reporter; both about
   the "contractor filter").

**Shared-upstream hypothesis (flag, do not assert).** The contractor filter's data ultimately derives
from the *same tenant-scoped company/contractor source* that 2742/2759 is about:
- `hooks/useCompanies.ts:7-59` — companies are fetched with `tenantId`; the file's own doc comment
  states the backend returns only that tenant's companies (403 otherwise) and that **admin /
  cross-tenant users see all** — i.e. the exact 2742/2759 mechanism.
- `services/projectService.ts:88-91` — `getProjectExistingContractors()` → `GET ms/project/api/contractors`.
- Filter options are built from the per-project `contractor` string
  (`ProgressDashboardPage/.../Filters/Filters.tsx:33-38`), matched via `item.contractor === filterItem`
  (`store/slices/reports/reportsActions.ts:83-91`).
So **if** a user's tenant scoping strips/omits contractor values from the underlying data (the
2742/2759 condition), the filter's options collapse or fail to match — meaning **PAPI-3344 might
incidentally improve 2890/2891 too.** This is the one thread worth having Darminder confirm; it does
**not** make 2891 a duplicate (surfaces and symptom differ).

## 3. Code path — is there a BI vs Non-BI split that explains "missing" vs "not working"?

**Yes — there genuinely are separate code paths, and they cleanly explain the two symptoms.**
("BI" = the PowerBI-era reports; "Non-BI" = the native DuckDB dashboard that replaced PowerBI —
see `dashboard/README.md`.)

- **New native project Dashboard has NO contractor filter dimension.** The documented `DashboardFilters`
  shape (`dashboard/flt-filter-system.md:7-24`) lists dateRange, discipline, package, level, room,
  status, activityType, xyzTracked, categoryFilters, issueStatus, qualityCategory, activityId, issueId,
  imageId — **no `contractor`**. A grep of `app/services` finds no contractor field on any dashboard
  filter service, and the only "contractor" hits under `ViewerPage/` are gantt JSON data, not a filter.
  → **This directly explains PLT-2890** ("contractor filter MISSING on the new Dashboard Non-BI"): the
  native dashboard never implemented one.
- **The contractor filter DOES exist on exactly two older/other FE surfaces** (full enumeration via
  grep of `name='contractor'` / `title='Contractor'` / `FilterTooltips.contractor`):
  1. **Portfolio filter** — `shared/layout/appbar/components/PortfolioFilterPanel.tsx:151-160`
     (`filters.contractor`, options from `extractFilterOptions(projects).contractors`), applied in
     `pages/PortfolioPage/utils.ts:86` (`filters.contractor.includes(project.contractor)`).
  2. **Progress-dashboard report-list filter** —
     `pages/ProgressDashboardPage/.../Filters/Filters.tsx:52-59` (a `CustomSelect name='contractor'`,
     options from `reportList[].contractor`), applied in `store/slices/reports/reportsActions.ts:78-122`.
  → **PLT-2891's "old/current dashboard, filter present but not working"** points at one of these
  (leading candidate = the ProgressDashboardPage report-list filter, since it is literally a
  "dashboard" with a contractor filter), **or** a legacy PowerBI/web-viewer quality filter not present
  in this repo.

**Possible pure-FE cause for "not working" (independent of the tenant data hypothesis).** In
`reportsActions.ts:78-122` the filter categories are **OR-combined** — each filter type *appends* its
matches to `tempItems`, then the list is de-duped by `projectId`. On a single contractor selection
this should still narrow, so on its own it is a logic quirk rather than a smoking gun; but combined
with empty/missing `rep.contractor` values (see §2 hypothesis) it would present exactly as "the filter
does nothing." Root cause is **not confirmed** — it needs a repro (see below).

## 4. Doc / KB state

- `dashboard/flt-filter-system.md` documents the native filter system in full and **contains no
  contractor dimension** — consistent with 2890. `dashboard/pitfalls.md` has **no** contractor /
  company / tenant entry (grep clean). **Doc gap:** the contractor filter's tenant-scoped data
  dependency (useCompanies / project contractors) is undocumented in the KB. Noting only — not editing
  outside this folder per task constraints.
- `dashboard/project-types.md` confirms filter *options* sources differ by project type but does not
  mention contractor.

## 5. Needs human

- ⚠️ **NEEDS HUMAN — attachments not viewable by me (binary staging media).** PLT-2891 has 2 PNG
  attachments (`image-20260713-112708.png` id 60667; `image-20260713-112715.png` id 60666, both by
  Yash) plus 2 inline blob images in Yash's comment. I could not view them. They are the
  screenshots that would disambiguate **which exact surface** the customer means (old PowerBI/BI
  dashboard vs ProgressDashboardPage report list vs portfolio filter panel vs web-viewer quality
  filter). Do not guess their contents.
- ⚠️ **NEEDS HUMAN — internal inconsistency in the ticket itself.** The description says "current
  Dashboard"; Yash's comment says "old dashboard." These are not the same surface in our taxonomy.
  Which one is authoritative must be confirmed with the reporter.
- ⚠️ **Surface for 2890/2891 stated "for the QA" (quality).** No contractor dimension exists in the
  native QLT filter path; the old quality contractor filter (if PowerBI/web-viewer) may not live in
  this repo. Confirm whether the customer means a *quality-issue* contractor filter or a *project*
  contractor filter.
- Pull the two session recordings (2891 `platform-web-1fa91a4d-…`; and for the cluster, 2742
  `platform-web-86fded73-…`) via the team's session tooling (playbook §Phase 1) — cheaper than asking
  the customer.

## 6. Confidence

- **Cross-reference conclusion (2891 distinct from 2742/2759; sibling of 2890; possible shared upstream
  via PAPI-3344): 7/10.** Based on descriptions, comments, and the code showing separate filter code
  paths + a shared tenant-scoped data source. Not higher because I cannot view the screenshots or
  reproduce, and the "old/current" surface is genuinely ambiguous in the ticket.
- **Root cause of PLT-2891 itself: 3/10.** Two live hypotheses (tenant-scoped contractor data missing;
  or FE filter-logic/empty-options) — neither confirmed; needs repro on a matching account.
- Per `xyz-platform-context/CLAUDE.md` scale: 7–8 = high confidence, minor unknowns (the cross-ref);
  3–4 = needs human to reproduce/test (the root cause).

---

## STATUS UPDATE (2026-07-13, second pass) — TICKET RELOCATED, NOW OUT OF SCOPE
PLT-2891 was **moved to the Power BI Dashboard project as PBD-2111** and marked **Done**. It is no longer a PLT live-incident ticket, so it drops out of this routine's scope. This matches the earlier analysis: 2891 was the "current/PowerBI dashboard" sibling of 2890 — it was re-filed into the PBD (PowerBI) project. Folder kept as historical context; no further action on the PLT board.
