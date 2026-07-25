# PLT-1770 — [Project Level] Create Custom Permissions

**Type:** Task (in reality a LARGE feature) · **Project:** PLT
**Jira status (as of 2026-07-25 run):** moved to **Analysis In Progress** — clarification raised.
**Local decision:** DO NOT DEVELOP yet. Not 95% confident. No hc-frontend branch, no PR.

## What the ticket asks
Add a **'Custom permissions'** area inside **Project Settings Modal → 'Team' tab**:
- entry point / list of existing custom permissions
- empty state when none exist
- 'Create new permission' flow with **Permission modules** containing **sliders**
- a **permission details** section

All behaviour is defined only in Figma + a prototype video. Should use the **V1 `iam` API** ("check with Sergey").

## Domain (verified in hc-frontend)
Top-level domain = **PortfolioPage → ProjectSettings modal → Team tab**.
- Modal: `src/main/webapp/app/pages/PortfolioPage/components/ProjectSettings/ProjectSettings.tsx`
  - tab list at `:65-78` (General, Team, Integrations, Devices, Attributes, Asset Types, Task library, Workflow, Models — several flag-gated). Team → `TeamContent` (`:149-156`).
- Team tab: `.../ProjectSettings/TeamTab/TeamContent.tsx` (~1257 lines). Companies/members, per-user role menus, invite flow, slide-out panels via `TeamSliders.tsx`.
  - **Current permission model is a fixed 3-role enum only** — `roleConstants.ts:8-12` (`admin_role/editor_role/viewer_role`); role select filtered to Admin/Editor/View in `useProjectRoles.ts:55-57`. **No create/edit-permission capability exists.**
- **'Custom permissions' UI = GREENFIELD.** grep for `customPermission` / `Create new permission` → zero matches app-wide.
- Closest analog (NOT reusable as-is — legacy reactstrap/react-jhipster, different design system): admin role editor `pages/organisation/RolePage/RolePage.tsx` + `components/RoleTree`. Its data-mapping helpers (`mapApiPayloadToRoleTreeData`, `mapRoleTreeDataToApiPayload`, `findCheckedKeys`) and `IRole`/`IAuthority` models ARE reusable.
- **"Slider" ambiguity:** in this codebase "Slider" = slide-out **side panel** (`TeamTab/components/Slider.tsx`, `SliderOverlay`), NOT a range/toggle control. The ticket's "sliders inside modules" meaning is unclear.

## IAM API surface (present on FE — base path `ms/iam/api`, this IS v1)
- `roleService.ts:11` `ms/iam/api/roles`; `:15` `ms/iam/api/project-roles`.
- `userRoleService.ts:7` `ms/iam/api/user-roles`.
- `authorityService.ts:17` `ms/iam/api/authorities`; `authorityCategoryService.ts:7`; `authoritySubcategoryService.ts:9`.
- Models under `shared/model/iam/` (`role.model.ts`, `authority*.model.ts`, `user-role.model.ts`).
- A "custom permission" ≈ an `IRole` composed of `authorities` grouped by category/subcategory. Generic role create/update endpoints exist; **project-level custom-permission backend support NOT confirmed.**

**Feasibility: MEDIUM–LOW.** Container (Team tab + Slider pattern) is easy to extend; the feature itself (list + empty state + create/edit modules with grouped-authority controls) is greenfield multi-component UI in the MUI dark modal style.

## Open questions (blockers — posted as Jira comment 2026-07-25)
1. **Designs** — behaviour only in Figma links + prototype video, **not openable by this agent**. Need interaction rules pasted inline: what are the "modules", what do "sliders" do (per-authority toggles vs slide-out panels), and the "permission details" layout.
2. **Scope** — one ticket for the whole feature, or slice it?
3. **Backend** — does v1 `iam` support project-level custom roles/permissions (create/update w/ grouped authorities)? confirm before building UI against it.
4. **Commissioning overlap** — Darminder's comment: "@Jason Fingland to add further details for commissioning custom permissions." Is the ticket waiting on that, and does it touch the flag-gated **Commissioning** MVP (out of scope by default per hc-frontend CLAUDE.md)?

## Why not implement now
Every core interaction (module layout, slider semantics, empty/list/create states, details panel) is defined only in design assets the agent cannot open, the ticket is large/greenfield, backend support is unconfirmed, and there's an open request for further spec detail + a possible commissioning overlap. Guessing would build the wrong thing.

## Next run — what unblocks this
- Team replies to Q1–Q4 (or design behaviour pasted inline / access granted) **and** backend confirmation.
- Then: slice if needed, branch `PLT-1770` off latest hc-frontend master, extend `TeamTab` (new Custom Permissions section + slide-out panel via existing `Slider`/`TeamSliders`), reuse `IRole`/`IAuthority` models + role-tree mapping helpers, wire react-query hooks to `roleService`/`authorityService`.
