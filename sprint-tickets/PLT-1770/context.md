# PLT-1770 — [Project Level] Create Custom Permissions

**Type:** Task · **Parent epic:** PLT-2015 (Custom Permissions, Backlog)
**Jira status (as of 2026-07-27 run):** **Analysis In Progress** — blocked on clarification.
**Local decision:** DO NOT DEVELOP yet. Not 95% confident (greenfield build + open product/design/backend questions). No hc-frontend branch, no PR.

## What the ticket asks
Build the **'Custom permissions'** surface inside Project Settings modal → **Team** tab:
- List view of existing custom permissions.
- Empty state when none exist.
- 'Create new permission' flow made of "permission modules" with "sliders" and a "permission details" section.
- Description says use the **V1 'iam' API**, check with Sergey if issues.

## Ticket relationships (matters — this is the first of a series)
- `PLT-1526` [Project Page] Project Settings - Team — **Closed** — has to be done **before** PLT-1770 (the Team tab it lives in already shipped).
- `PLT-1770` (this) → has to be done **before**:
  - `PLT-2926` [Project Level] Create Edit Custom permissions — **Open**
  - `PLT-2927` [Project Level] Remove Custom Permissions — **Open**
- So PLT-1770 is the foundational build; edit/remove stack on top. Its branch will likely be the base for PLT-2926/2927.

## Domain (verified in hc-frontend, master @ 2026-07-27)
Top-level domain = **Project Settings modal → Team tab** (NOT the dashboard).
- `src/main/webapp/app/pages/PortfolioPage/components/ProjectSettings/TeamTab` — the Team tab lives here.
- `src/main/webapp/app/store/slices/team` — team state slice.
- `src/main/webapp/app/helpers/usePermission` — existing permission *checking* hook (gates UI on current user authorities), NOT a custom-role editor.
- **Greenfield confirmed:** grep for `customPermission` / `createPermission` across `src/main/webapp/app` returns **nothing**. No list view, no empty state, no create flow exists yet.

**Feasibility of code:** the *shell* (modal section, list, empty state) is straightforward and reuses existing Team-tab + design-system components. The *create flow* (modules/sliders/details bound to iam authorities) is the risky part — depends entirely on unanswered design + backend questions below.

## Open questions (blockers — raised in my Jira comment 2026-07-25, still UNANSWERED as of 2026-07-27)
1. **Designs / behaviour** — the real behaviour lives in Figma links + a prototype video, neither openable from this environment. Need inline paste of: what the "modules" are, what the "sliders" do (per-authority toggle controls vs the slide-out side panels the Team tab already calls "Slider"), and what sits in the "permission details" section.
2. **Scope** — is PLT-1770 the whole thing (list + empty state + create-with-modules) or should it be sliced? (Edit/Remove are already split into PLT-2926/2927.)
3. **Backend** — confirm the V1 'iam' API already supports project-level custom roles/permissions (create/update with grouped authorities) before building UI against it. Check with Sergey.
4. **Commissioning overlap** — Darminder's 2026-07-24 comment says Jason will "add further details for commissioning custom permissions". Is this ticket waiting on those details, and does it touch the flag-gated Commissioning feature? Scope the right surface before starting.

## Why not implement now
Q1/Q3/Q4 are product / design / backend-contract decisions, not code-feasibility. Guessing would risk building the wrong interaction against an API that may not exist yet. Per workflow: reach 95% confidence first.

## State of my Jira clarification
Already posted (2026-07-25). No team reply since. Darminder's note (2026-07-24) about Jason adding commissioning details is still outstanding. **No new comment added this run** — would only duplicate the open ask.

## Next run — what unblocks this
- A team reply answering Q1–Q4, **or** the design behaviour pasted inline / Figma access, **or** Jason's commissioning-permission details landing.
- Once answered: branch `PLT-1770` off latest hc-frontend master, build the Custom Permissions section in `ProjectSettings/TeamTab`, reusing existing Team-tab list/empty-state + design-system components and the iam API. That branch then becomes the base for PLT-2926 (edit) and PLT-2927 (remove).
