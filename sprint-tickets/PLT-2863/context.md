# PLT-2863 — Redirect user to project editor after project creation

**Type:** Task · **Status at pickup:** Open · **Domain:** My Projects (PortfolioPage) / project creation

## Ask
After successful project creation, redirect to the new project's editor page instead of
returning to the My Projects grid. Keep success toast; on failure stay put with error.

## Key findings
- Creation: `components/ProjectCreateModal/ProjectCreateModal.tsx` — `createProjectMutation`
  (160–228). `response.data.id` (line 164) is the new project id = mongoProjectId used by editor.
- Current `onSuccess` (211–220): shows toast "Project created successfully!", `handleClose()`,
  invalidates `['projects']`. **No navigation today.** No `useNavigate` imported yet.
- Editor route: `/projects/:project_id/editor` (`pages/project/routes.tsx:32-41` → `<ViewerPage/>`).
- Canonical open-editor pattern: `PortfolioPage.tsx:87-95 handleOpenEditor(id)` does
  `updateWorkingProject(id)` + `dispatch(getProjectDetails(id))` + `navigate(/projects/${id}/editor)`.
  The editor likely relies on working-project being set → mirror these side-effects, don't just navigate.

## Plan
In `ProjectCreateModal.onSuccess`: add `useNavigate`; after success toast + invalidate,
replicate handleOpenEditor's side-effects for `data.id`, then `navigate(/projects/${data.id}/editor)`.
Failure path already handled by mutation `onError` (stays on page). Keep toast.

## Risk
- Editor init dependence on working-project/getProjectDetails — mirror PortfolioPage exactly to be safe.
- Whether toast should show on editor page vs grid — keep showing it (acceptance allows either).

## Confidence: 8/10 — pattern exists to reuse; review recommended for editor-init side-effects.

## Status: PR #2037 ready for review · Jira In Code Review · Sonar passed

## Copilot review round (addressed)
- Always dispatch getProjectDetails(id) (independent of working project) + guard on missing id.
- Fix committed & pushed; thread resolved. PR body cleaned of auto-footer + test steps sharpened.
