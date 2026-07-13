# PLT-2742 — "Contractor not showing up although set"

- **Domain slug:** filter-system (see §6 for why, not project-types)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2742
- **Type:** Live Incident · **Priority:** Major · **Status:** Dev In Progress
- **Group:** B (Dev In Progress) — captured for the record, **not re-triaged**.
- **Assignee:** Darminder Atker (fullstack lead — assignee on all four "contractor" tickets)
- **Reporter/creator (Jira):** Masum Ahmed (support/Freshdesk agent). Relayed by
  Yash Patel; original customer reporter **Mostafa Kamel Hussien**.
- **Project:** Far02 · **Freshdesk:** #6890 ("Waiting on 3rd line")
- **Session log:** platform-web-86fded73-668a-4be4-82dc-99a8e509b600
- Created 2026-05-28, last updated 2026-06-05. Triage capture: 2026-07-13.

---

## 1. Description (verbatim substance)

Reported against **Web Viewer**, project **Far02**. "Although the project has
contractor set up, when i log in as a user i cant see it. attached two
screenshots. from **tenant** where i can see it and **personal** where i cant."

This tenant-vs-personal split is the load-bearing signal (see §4).

## 2. Comments (chronological)

1. **Yash Patel — 2026-05-28 14:16.** Relays it for @Darminder; issue reported by
   @Mostafa. *"contract not appearing when logged in from personal id but is there
   when logged in from tenant."* Attaches the two screenshots (see §3).
2. **Masum Ahmed — 2026-05-28 14:20.** Freshdesk #6890 → "Waiting on 3rd line".
3. **Darminder Atker — 2026-05-28 15:16 (root-cause comment).** *"have looked at
   this with @Sergey.Kuderskiy and it appears to be a bug with the company not
   being attached to any tenants. The admin tenant gets all companies which is why
   you see it on admin account. Sergey is adding a fix in that should resolve
   this."*
4. **Darminder Atker — 2026-05-28 15:17.** *"Ticket will be in 'Dev in Progress'
   until Sergey has added his fix to see all is working."* → current parked state.

## 3. Attachments

- `image-20260528-131642.png` (att 58322, 344 KB) — Yash, 2026-05-28.
- `image-20260528-131635.png` (att 58323, 124 KB) — Yash, 2026-05-28.
- The two comment-embedded `mediaSingle` images are the same two files (tenant vs
  personal screenshots).

**⚠️ NEEDS HUMAN:** both PNGs are binary behind Atlassian auth — I could not view
them. They are the tenant-sees-it / personal-doesn't screenshots that visually
prove the split. The text is unambiguous, so they are corroborative not
load-bearing, but a human should confirm which surface was screenshotted
(portfolio project card vs viewer vs project settings). The description's two
inline `blob:` images resolve to `UNKNOWN_MEDIA` and are unrecoverable.

## 4. Root cause — CONFIRMED (backend tenant/company assignment)

The cluster hypothesis holds, and the tenant-vs-personal detail confirms it:

- **Mechanism (from the tickets):** contractor companies exist in the DB with **no
  tenant link** (`ownTenant: null`). A **tenant/admin** login is granted *all*
  companies on the platform, so it resolves and shows the contractor. A **personal
  / tenant-scoped** login only sees companies linked to a tenant it belongs to, so
  the tenant-less contractor company resolves to nothing → the contractor field
  comes back empty and the UI shows nothing. (Darminder comment 3; corroborated
  verbatim on PLT-2759 comment: *"Admin login will always see company in card and
  settings because this login type gets access to every company setup on
  platform."*)

- **Backend root-cause ticket: PAPI-3344 "[IAM] Companies are being created
  without Tenant link"** (Critical; reporter Sergey; QA Gennaro).
  - Linked to PLT-2742 as **"is implemented by"** (Polaris work-item link).
  - Description: **129 companies in Prod with `ownTenant: null`**, created_by =
    system / xyzreality@regeneron.com / null / anonymousUser; newest 2021-06-09.
  - Sergey reproduced on staging: a **system/admin account creating a Company
    saves it with no Tenant**. Fix PRs: **hc-iam #389** + **hc-project #681**.
    QA note: *"when company is created under a user account (tenant-admin or
    project-admin) it should be saved with the `ownTenant` attribute."*
  - **Status: Released** (verified fixed on Staging 59.14.1 by Gennaro, 2026-06-02;
    issue updated 2026-06-17).

- **Two-part fix — important caveat:** PAPI-3344's PRs fix the **creation path**
  (new companies get `ownTenant`). They do **not** by themselves backfill the
  **129 pre-existing tenant-less companies**. PLT-2759's Darminder comment says
  Sergey was *"drawing up a list of this to resolve and decide how best to
  action"* — i.e. a **data remediation/backfill** is a separate step. So even with
  PAPI-3344 Released, Far02's contractor will only reappear for a personal login
  **once that company's `ownTenant` is backfilled**. This is why 2742 is still
  parked in Dev In Progress rather than closed.

## 5. Frontend findings — FE has NO role (backend-only)

The FE only renders whatever the API returns; tenant scoping of company data is
enforced server-side:

- **Render (portfolio project card):**
  `pages/PortfolioPage/components/ProjectCard.tsx:112-113` — conditionally prints
  the `contractor` string prop; renders nothing when it is empty/undefined. No
  tenant logic.
- **Prop source:** `PortfolioPage.tsx:187` passes `project.contractor`; the field
  is supplied by the portfolio API payload —
  `services/portfolioService/portfolio-api.types.ts:58-60` (`contractor`,
  `contractorId`, `mongoCompanyId`). FE does not resolve company→name itself.
- **Tenant scoping is server-side (key evidence):**
  `services/companyService.ts:11-18` — docstring for `getByIds` (PAPI-3298):
  *"Not restricted to the caller's own tenant — companies from tenants the user is
  not invited to are **filtered out server-side**."* Confirms company visibility
  is a backend decision, not FE.
- Company model: `shared/model/enumerations/company-type.model.ts:4` has
  `MAIN_CONTRACTOR`; `shared/model/project/project-company.model.ts` (companyId,
  companyType, project). `services/projectCompanyService.ts` → `ms/project/api/
  project-companies`. None of these carry FE tenant filtering.
- The portfolio `contractor` **filter** (`PortfolioPage/utils.ts:85-86`, options
  from `p.contractor`) is downstream of the same data — if the contractor string
  is absent server-side, it is simply absent from filter options too. Not a
  separate defect.

**Conclusion:** no FE change is required for PLT-2742. Fix is entirely backend
(PAPI-3344 code + a data backfill of tenant-less companies).

## 6. Cluster relationships

- **PLT-2759 "Contractor not showing on all cards on portfolio"** — **same defect,
  sibling.** Linked to 2742 ("Discovery - Connected") and both "implemented by"
  PAPI-3344. Same assignee (Darminder), same reporter chain (Mostafa→Yash→Masum).
  2759 is the portfolio-wide/"some projects yes, some no" manifestation of the same
  tenant-less-company bug; 2742 is the single-project (Far02), explicit
  tenant-vs-personal manifestation. Resolve together.
- **PAPI-3344** — the backend root-cause bug both PLT tickets point to. Released,
  but see the backfill caveat (§4).
- **PLT-2890 / PLT-2891 (contractor *filter control*, Group A, filter-system)** —
  **DISTINCT cluster; do NOT merge.** Those are about the QA/dashboard contractor
  *filter* (2890 = filter absent on new Non-BI dashboard = PowerBI parity gap;
  2891 = filter present but predicate broken on old dashboard). Different surface,
  symptom, layer and owner. They share only the word "contractor". See
  `group-a/filter-system/PLT-2890/context.md`.

## 7. Confidence

- **Root cause = backend tenant/company-assignment (PAPI-3344): 9/10.** Stated by
  Darminder + Sergey on-ticket, mechanism matches the tenant-vs-personal symptom
  exactly, PAPI-3344 documents the `ownTenant: null` data, and FE code confirms
  visibility is server-side. Residual 1 pt: the two screenshots are unviewed.
- **FE has no role / backend-only: 9/10.** Confirmed by ProjectCard render +
  companyService server-side-filter docstring.
- **PLT-2742 ≡ PLT-2759, distinct from 2890/2891: 9/10.** From explicit Jira links
  + matching root-cause comments.
- **Whether 2742 is actually resolved by the Released PAPI-3344: 5/10** —
  depends on the pending data backfill of the 129 tenant-less companies (Far02's
  contractor specifically), which I cannot verify from code. **Needs human.**
</content>
