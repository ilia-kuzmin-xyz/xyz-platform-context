# PLT-1770 — [Project Level] Create Custom Permissions

**Type:** Task · **Parent epic:** PLT-2015 (Custom Permissions, Backlog)
**Jira status (as of 2026-07-26 run):** **Analysis In Progress** — blocked on clarification.
**Local decision:** DO NOT DEVELOP yet. Not 95% confident. No hc-frontend branch, no PR.
Clarification comment already posted 2026-07-25 and still UNANSWERED — did **not** re-comment
this run (would be duplicate noise).

## What the ticket asks
Add a **Custom Permissions** feature inside **Project Settings modal → Team tab**:
- A list view of existing custom permissions, an **empty state** ("no permissions yet"),
  and a **'Create new permission'** flow.
- The create flow contains permission **"modules"** with **"sliders"** and a
  **"permission details"** section.
- "Should work with V1 'iam' API — if there are issues check with Sergey."

### Media / designs — NOT accessible to this agent
- 4 PNGs + `Custom permissions.mov` (185 MB) attached — Jira attachment auth not fetchable here.
- Behaviour is defined almost entirely in **Figma** (multiple node links) + a **prototype video**.
  None openable from this environment. This is the single biggest blocker — the exact meaning of
  "modules", "sliders" and "permission details" cannot be self-resolved without them.

## Domain (verified in hc-frontend, 2026-07-26)
Top-level domain = **PortfolioPage → ProjectSettings modal → Team tab** (route `portfolio`,
`routes.tsx:242`; modal opened with a `projectId`, no deep-link route).

- Modal shell: `pages/PortfolioPage/components/ProjectSettings/ProjectSettings.tsx`
  (tabs at :65-78; Team tab renders `<TeamContent>` at :149-156).
- Team tab: `.../ProjectSettings/TeamTab/TeamContent.tsx` (roster: companies, members, invite,
  role-change menus). Slide-out host: `TeamTab/TeamSliders.tsx` (mounted from TeamContent.tsx:1203).

**Custom permissions = GREENFIELD.** No list view, no empty state, no create flow anywhere.
Today's "permission" UI is only the fixed 3-role picker (`TeamContent.tsx:1027-1037`,
`roleConstants.ts` = ADMIN/EDITOR/VIEWER). Project roles are **read-only** on FE
(`hooks/useProjectRoles.ts` even filters to `['Admin','Editor','View only']` at :56).

### IAM API layer — read side exists, create side has a gap
- `services/roleService.ts` → base `ms/iam/api/roles` (generic create/update/delete via
  `ApiBaseService`) + `getProjectRoles()` → `GET ms/iam/api/project-roles`.
  **No project-role create/update method yet** — main FE gap to fill.
- `services/authorityService.ts` (`getAllAuthoritiesData()` returns authorities + categories +
  subcategories = the grouped-authority structure), `authorityCategoryService.ts`,
  `authoritySubcategoryService.ts`, `userRoleService.ts`. Registered in `services/serviceProvider.ts`.
- Models `shared/model/iam/`: `role.model.ts` `IRole` already carries grouped authorities
  (`authorities[]`, `authorityCategories[]`, `authoritySubcategories[]`, `project`, `companyType`).
  `authority-category.model.ts` / `authority-subcategory.model.ts` map naturally to the ticket's
  **"modules"**. Gate: `AUTHORITIES.PROJECT_ROLE_MANAGE` (`usePermission(...)` in useProjectRoles.ts:26).

### Reuse targets (for when it IS unblocked)
- **Best end-to-end template:** the **AttributeTab** (`ProjectSettings/AttributeTab/`) — list +
  empty state + create + slide-out editor with grouped items + hooks (`useAttributeState`,
  `useAttributeSliderMethods`, `useAttributeSelection`). Closest existing pattern to this ticket.
- **Slide-out panel:** `TeamTab/components/Slider.tsx` (note: "Slider" here = slide-out **panel**,
  not a range control) + `SliderHeader.tsx`; register a new `CreatePermissionSlider` in
  `TeamSliders.tsx` and drive open state via `TeamTab/context/TeamContext.tsx`.
- The ticket's "sliders" (per-module toggle controls) have **no** dedicated DS component — would be
  built from MUI `Switch`/`Select` grouped by authority category.

**Feasibility once unblocked: MEDIUM.** Data model + IAM read layer are in place and there's a
strong template (AttributeTab). Blocked purely by (a) inaccessible design behaviour and
(b) missing/unconfirmed project-role create backend.

## Scope — now clarified by sibling tickets (new since last run)
PLT-1770 is the first of a linked series ("has to be done before"):
- **PLT-2926** [Project Level] Create **Edit** Custom permissions — Open
- **PLT-2927** [Project Level] **Remove** Custom Permissions — Open
So PLT-1770 = create/list/empty-state only; edit → PLT-2926; delete → PLT-2927. The exact
PLT-1770 ↔ PLT-2926 boundary (does "Create" include first-save editing?) is still fuzzy.

## Open questions (blockers — from my Jira comment 2026-07-25, still UNANSWERED)
1. **Designs/behaviour** — need the interaction rules inline (Figma/video not openable): what are
   the "modules", what do the "sliders" do (per-authority toggles vs our slide-out panels?), and
   what sits in "permission details".
2. **Scope** — single ticket for whole thing, or sliced? (partly answered by PLT-2926/2927 now).
3. **Backend** — does V1 `iam` API already support project-level custom role create/update with
   grouped authorities? (FE only has generic `roles` POST/PUT + `project-roles` GET). Check w/ Sergey.
4. **Commissioning** — Darminder (2026-07-24) noted Jason still to "add further details for
   commissioning custom permissions". Is this ticket waiting on those, and does it overlap the
   flag-gated Commissioning surface?

## Where we stopped (2026-07-26)
No new answers since 2026-07-25 clarification. Kept status = Analysis In Progress. No re-comment
(avoid dupes). Next run: re-check comments for answers from Jason/Sergey/Darminder + whether the
Figma behaviour has been pasted inline; only then consider moving to dev.
