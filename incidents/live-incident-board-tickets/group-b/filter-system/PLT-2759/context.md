# PLT-2759 — "Contractor not showing up on all cards on portfolio"

- **Domain slug:** filter-system *(discoverability grouping only — see §7. The true
  owning layer is backend IAM / tenant-company association, not the FE filter system.)*
- **Group:** B (already being actively worked — **Dev In Progress**). This file is a
  context capture for the record, NOT a re-triage.
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2759
- **Type:** Live Incident · **Priority:** Minor · **Status:** Dev In Progress
- **Assignee:** Darminder Atker (fullstack lead — assignee on all four "contractor" tickets)
- **Reporter (Jira):** Masum Ahmed (Freshdesk/support agent, off dev roster) · originally
  reported by **Mostafa Kamel Hussien** · relayed into Jira by **Yash Patel**
- **Project:** — (not specified; portfolio-wide) · **Linked Freshdesk:** #6964 ("Waiting on 3rd line")
- **Created:** 2026-06-03 · **Last updated:** 2026-06-05
- Capture date: 2026-07-13

---

## 1. Description (verbatim symptom)

> "for the contractor card, I can sometimes see it on the project card for some projects
> and sometimes i cant see them on other projects."

So the symptom is **inconsistent per-project**: the contractor appears on *some* projects'
cards and not others — for the same logged-in user. (This is the description's own literal
framing, and it is the discriminating clue — see §6.)

**⚠️ NEEDS HUMAN — media not viewable by the agent.** The Jira `attachment` array is empty;
all images are inline blobs / external links behind auth, so I could not open any of them:
- Description: 4× broken blob refs (`UNKNOWN_MEDIA_undefined`) — unresolvable.
- Comment 104121 (Yash): 4× external Freshdesk inline images
  (`eucattachment.freshdesk.com/inline/attachment?token=…`) — unviewable.
The text is self-sufficient for the diagnosis below, but a human should open these to confirm
*which* projects showed vs. hid the contractor and under which login.

## 2. Key comments (author · date)

1. **Yash Patel · 2026-06-03** — relays the report from Mostafa Kamel Hussien (same wording as
   the description) with 4 Freshdesk screenshots.
2. **Masum Ahmed · 2026-06-03** — Freshdesk ticket #6964 moved to "Waiting on 3rd line".
3. **Darminder Atker · 2026-06-05** *(the in-progress diagnosis — load-bearing)*:
   > "I believe this will be partly resolved by @Sergey.Kuderskiy fix on **PAPI-3344**. The
   > problem here is there are a list of **companies with no tenant assigned** and this needs to
   > be sorted. Sergey is drawing up a list of this to resolve and decide how best to action.
   > **Admin login will always see company in card and settings because this login type gets
   > access to every company setup on platform** which Sergey is looking to stop as part of
   > PAPI-3344."

Note the two distinct sub-problems Darminder names: (a) the **code** bug (companies created
without a tenant link — fixed by PAPI-3344) and (b) a **data** remediation (the existing
orphaned companies "drawing up a list … to resolve"). Both must land for the symptom to clear.

## 3. Cluster relationship

### vs PLT-2742 — SAME defect (this ticket's twin). Linked "is connected to" (link id 105432).
- PLT-2742 "Contractor not showing up although set" (Major, Dev In Progress, project **Far02**):
  *"Although the project has contractor set up, when i log in as a user i cant see it… from
  tenant where i can see it and personal where i cant."*
- Darminder on PLT-2742 (comment 103598): *"a bug with the **company not being attached to any
  tenants**. The admin tenant gets all companies which is why you see it on admin account.
  Sergey is adding a fix."* and (103599) *"Ticket will be in 'Dev in Progress' until Sergey has
  added his fix to see all is working."*
- **Conclusion:** 2759 and 2742 are the **contractor company entity not displaying, login-type
  dependent** (visible via tenant/admin login, invisible via personal login). Same root cause,
  same owner, same fix. 2759 is the portfolio-cards manifestation; 2742 the per-project
  (Far02) manifestation. **Cluster attribution CONFIRMED** — from Darminder's own comments on
  both tickets, not inference.

### vs PLT-2890 / PLT-2891 — DISTINCT cluster. Do NOT merge.
- 2890/2891 (Open, Group A, group-a/filter-system/) are about the contractor **filter control**
  (2890 = filter absent on the new Non-BI dashboard; 2891 = filter present-but-broken on the old
  dashboard). Those are **FE filter-UI / PowerBI-parity** matters.
- 2759/2742 are about the contractor **company card/label** not rendering — a **backend
  tenant/company-association** matter (PAPI-3344).
- They share only the word "contractor". Different surface, symptom, layer, owner, fix. There is
  **no Jira link** between the two clusters (correct). See PLT-2890/context.md §3 for the full
  4-ticket matrix.

## 4. PAPI-3344 linkage (the shared backend root cause)

- **PAPI-3344 — "[IAM] Companies are being created without Tenant link"** · project **PAPI**
  (Cloud & DevOps) · Bug · **Critical** · **Status: RELEASED**.
  - Linked to PLT-2759 as **"is implemented by"** (link id 105433) and likewise to PLT-2742.
  - Reporter: **Sergey.Kuderskiy** (api-v1 / IAM). Assignee: **Gennaro Boccia** (QA).
  - **fixVersion 59.14.1, released 2026-06-16.** Verified fixed on Staging 59.14.1 by Gennaro
    Boccia on 2026-06-02.
  - Root cause (from PAPI-3344 description): **129 companies in Prod with `ownTenant: null`**
    (`db.company.find({ownTenant: null})`); created by `system` / `xyzreality@regeneron.com` /
    `null` / `anonymousUser`. Newest orphan dated 2021-06-09.
  - Fix PRs: `XYZReality/hc-iam#389` and `XYZReality/hc-project#681`.
  - QA note (Sergey): *"when a company is created under a user account (tenant-admin or
    project-admin) it should be saved in DB with the `ownTenant` attribute."*
- **Important nuance — two halves, only one is "Released":** the PAPI-3344 code fix stops
  **new** companies being created without `ownTenant`. It does **not** by itself backfill the
  **129 pre-existing orphaned** companies — that is the "drawing up a list … to resolve" data
  remediation Darminder referenced, and it is what actually governs whether *today's* projects
  (whose contractor is an already-orphaned company) start showing on cards for personal logins.

## 5. Code references (hc-frontend) — the contractor-on-card render + data source

**Portfolio project card (the exact surface in this ticket):**
- Render: `src/main/webapp/app/pages/PortfolioPage/components/ProjectCard.tsx:112-113` —
  renders the `contractor` string in the card subtitle **only when truthy**
  (`{contractor && … contractor}`). Correct behaviour: if no contractor value arrives, the card
  simply omits it — exactly the reported "sometimes shows, sometimes doesn't".
- Prop origin: `PortfolioPage.tsx:187` passes `contractor={project.contractor}` straight from
  the project list item.
- Data source: `contractor` (name) and `contractorId` are fields **on the portfolio/report API
  response** — `src/main/webapp/app/services/portfolioService/portfolio-api.types.ts:58-59`.
  i.e. the card's contractor **name is resolved server-side**, not client-side. The FE card does
  no company lookup of its own.
- (Same pattern on the map tooltip: `PortfolioPage/components/MapPanel/MapPanel.tsx:264`.)

**Company data hooks (used on OTHER surfaces — settings, not the portfolio card):**
- `src/main/webapp/app/hooks/useCompanies.ts:7-29` — `useCompanies()` is **scoped to the
  logged-in user's own tenant** (`accountCompanyOwnTenantId` selector → `queryParams.tenantId`).
  This is the mechanism that makes visibility login-type dependent: a personal login's own-tenant
  scoping will **not** return a company whose `ownTenant` is null (PAPI-3344), whereas an admin
  login "gets all companies" (Darminder's comment) and resolves it.
- `useCompanies.ts:40-59` — `useProjectCompanies(projectTenantId)` scopes to the **project's**
  tenant (`mongoTenantId`) instead of the user's own; an FE mitigation for cross-tenant
  resolution. Used in project settings: `ProjectSettings/GeneralTab/GeneralTabDetail.tsx:49-54`
  (resolves contractor name from `contractorId`, falling back to `project.contractor`) and
  `GeneralTabEdit.tsx:104`.
- `src/main/webapp/app/hooks/useCompaniesByIds.ts` + `services/companyService.ts:16-18`
  (`getByIds` → `bulk-get`, **PAPI-3298**) — a bulk lookup that is **not** restricted to the
  user's own tenant. Another FE mitigation for cross-tenant/portfolio company resolution.

## 6. Root cause as understood

**Backend / IAM tenant-company association (PAPI-3344), not a frontend bug.**
- Some company records have **no `ownTenant`** (orphaned; 129 in Prod). Contractor visibility is
  gated by tenant scoping: an **admin/tenant login sees all companies** and resolves the
  contractor; a **personal login, scoped to its own tenant, cannot resolve an orphaned company**,
  so the contractor name is absent and the card omits it.
- This exactly explains 2759's "some projects yes, some projects no" for one user: it depends on
  whether *that project's* configured contractor happens to be an orphaned (tenant-less) company.
- The FE portfolio card (`ProjectCard.tsx:112-113`) behaves correctly given the data it receives;
  it has no role in the defect. FE company-resolution mitigations already exist
  (`useProjectCompanies` project-tenant scoping; `useCompaniesByIds` bulk-get / PAPI-3298) but
  they serve the **settings** surfaces, not the portfolio card, and they cannot conjure a company
  that has no tenant link at all.

**FE change needed? No — backend-only** for the root cause. Resolution = PAPI-3344 code (released)
**plus** the data backfill of existing orphaned companies (the open half).

## 7. Domain-slug rationale

Filed under **filter-system** to keep the whole "contractor" cluster discoverable next to
PLT-2890/2891 (which live in `group-a/filter-system/`). It is a **cross-reference convenience,
not a technical domain claim** — 2759's real owning layer is backend IAM / tenant-company
association. `project-types` (full-progress vs quality-only mode) is unrelated and would be
misleading; no better existing slug fits. If a future run adds an `access-permissions`- or
`iam`-style slug for tenant/company scoping, 2759+2742 would sit more accurately there.

## 8. Confidence (per CLAUDE.md scale)

- **Cluster attribution (2759≡2742; company-entity, login-type dependent; backend root cause via
  PAPI-3344): 9/10.** Stated explicitly in Darminder's own comments on both tickets and confirmed
  by the "is implemented by PAPI-3344" links; PAPI-3344's description independently documents the
  tenant-less-company mechanism.
- **Backend-only / no FE change required: 8/10.** The FE card just renders a server-resolved
  string; own-tenant scoping in `useCompanies` is consistent with the login-dependence. Residual
  1-2 points: could not view the screenshots, and I did not trace the server side that populates
  `portfolio-api` `contractor` (out of these repos).
- **Will PAPI-3344 alone fully clear 2759: 6/10.** The code fix is Released, but it prevents new
  orphans; the **129 existing orphaned companies still need the data backfill** Sergey was
  "drawing up a list" for. 2759's "some projects don't show" strongly implies already-orphaned
  companies, so releasing the code is necessary but likely not sufficient — hence the ticket
  correctly still sits in Dev In Progress pending verification. **Do not close on "PAPI-3344
  released" alone.**
