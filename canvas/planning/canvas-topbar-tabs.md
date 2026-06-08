# Canvas Top Bar + Cross-Session Dashboard Tabs

> **Status: 🔵 PLAN.** Reference prototype: `xyz-platform-context/to_delete/Canvas Workspace (1).html`
> (a self-contained React prototype of exactly this UX). Companion to [canvas-ux.md](../canvas-ux.md).
> Tasks #6–#13 in the session task list.

## Goal

Replace the default global AppBar on the canvas page with a **local canvas top bar**
(same mechanism the dashboard page uses), giving the canvas its own chrome:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [◆ logo ▾]  Project name  │  [● GMP gate ·DC30 ×][● Forecast ·DC21 ×] …  [▦ All dashboards 5]  [user ▾] │
└──────────────────────────────────────────────────────────────────────────────┘
   logo+session menu          tab strip (dashboards across sessions)    right cluster
```

- **Logo** + a **session menu** (open / switch between sessions).
- A **row of tabs**, one per open dashboard. Dashboards can come from *different
  sessions*; switching to a tab whose dashboard belongs to another session
  **switches the active chat session too** ("switch sessions if needed").
- An **"All dashboards"** flyout on the right side listing every dashboard in the
  project, flattened across all sessions.

## Key conceptual model

```
Project (route-locked: /canvas/:mongoProjectId)
  └─ Session (chat thread)  ──many──>  Dashboard (build-turn artefact)
                                       Ask result (ask-turn artefact)

Top bar:
  • Active session  = which chat thread the RIGHT panel shows
  • Open tabs       = which dashboards are mounted in the canvas (flattened across sessions)
  • These are normally coupled, but a tab can point at a dashboard from a
    NON-active session → activating it switches the active session.
```

**Important scope clarification vs the prototype:** the prototype mixes sessions
from *different projects* (DC30, DC21, portfolio). The real canvas route is
**project-locked** (`/canvas/:mongoProjectId`). So all sessions — and therefore all
cross-session tabs — live within **one project**. Hydration `project_id` is constant;
no cross-project switching. Drop the prototype's multi-project framing.

---

## The core architectural gap

| | Today | Needed |
|--|-------|--------|
| `CanvasState.dashboards` | the **active session's** dashboards only; replaced wholesale when `openSession` runs | a **project-level registry** of dashboards across *all* sessions |
| Switching session | reloads messages + dashboards + askResults for that one session | same, but the registry/tabs persist across the switch |
| Tabs | none — chat "View dashboard" buttons are the only switcher | `openTabs: string[]` decoupled from the active session |

**Without the registry, cross-session tabs are impossible** — a tab from session B
can't render while chat is on session A because B's `DashboardEntry` (tsx +
domainsRead) isn't in memory. So Task #9 (project-level dashboard registry) is the
prerequisite for Tasks #10/#11.

### Registry sourcing

Each session's `content.json` (files API) already carries `dashboards[]` with
`tsx`, `domainsRead`, `title`, `summary`, `createdAt` (see
[canvas-session-persistence-goal](session-persistence-DONE.md)). The registry =
list sessions → read each session's dashboard **metadata** (not hydration data).
Hydration data stays transient and flows through the existing per-project data
cache + 30-min storage tier ([hydration-persistence-e2e](hydration-persistence-e2e.md)).
So: design lives in the registry, data is re-derived on view — exactly the existing
"save the design, re-derive the data" rule.

---

## Component reuse map (keep the design legacy neat)

| Need | Reuse | Path |
|------|-------|------|
| Bar container (48px, z-index, dark bg) | `Navbar` | `app/shared/layout/appbar` |
| Left/Center/Right sections + separator | `Left` `Center` `Right` `Vertical` | `…/ViewerPage/components/viewer-bar/viewer-bar.styled` |
| Right cluster (portfolio switch, help, notifications, account) | `UserOptions` | `app/shared/layout/appbar` |
| Logo glyph + open/closed states | `XYZIcon` | `…/viewer-bar/icons/xyz-icon` |
| Logo button hover/open wrapper | `IconButtonWrapper` | `…/viewer-bar/menu-button.styled` |
| Logo + dropdown menu pattern | `DashboardMenuButton` (adapt → `CanvasMenuButton`) | `…/dashboard-bar/tools/dashboard-menu-button` |
| Hide global bar | add `'/canvas'` to `hiddenHeaderPaths` | `app/config/constants.ts` |
| Shell layout (bar flex-shrink:0, content flex:1) | `DashboardShell` pattern | `…/ViewerPage/DashboardPage.styled` |
| Theme tokens for tab strip / flyout | `theme.palette.base.*` (already used in ChatPanel) | — |

**New components (bespoke, but theme-tokened):** `CanvasBar`, `CanvasMenuButton`,
`CanvasTabStrip`, `AllDashboardsFlyout`. The tab strip and flyout have no existing
analogue (the dashboard tool buttons are mode toggles, not tabs), so they're new —
but built from `theme.palette.base` tokens and the same overlay conventions as
`SessionsPanel`/`DevOverlay`, not ad-hoc colours.

---

## Wiring

1. `constants.ts`: `hiddenHeaderPaths += '/canvas'` → global `AppBar` returns null.
2. `CanvasPage.styled.ts`: drop `height: calc(100vh - 48px)`; introduce `CanvasShell`
   (100vh flex column). `CanvasBar` is `flex-shrink:0`; the existing canvas+chat row
   is `flex:1`.
3. `CanvasPage.tsx`: render `<CanvasBar … />` above `<CanvasRoot>` inside the shell,
   feeding it `sessions`, `sessionId`, `openSession`, `newSession`, the dashboard
   registry, `openTabs`, `activeDashboardId`, and tab/flyout handlers from `useCanvas`.

---

## Edge cases (Task #12)

1. **Tab from a non-active session** — activating it switches the active session
   (user's explicit ask), then hydrates that dashboard via existing
   `viewDashboard`/`runHydrate`. (Prototype instead *decoupled* and showed a banner —
   we choose auto-switch per the request. The banner can stay as a deferred nicety.)
2. **Close the active tab** → activate the neighbour; **no tabs left** → empty canvas
   (existing empty state / `SessionsPanel`). Closing a tab never changes the session.
3. **Delete a session that owns open tabs** → close those tabs and drop its
   dashboards from the registry. (Soft-delete keeps the file; the registry filter
   excludes tombstoned sessions.)
4. **Session with zero dashboards (ask-only)** → switching to it loads chat; canvas
   shows the empty/placeholder state; no tab is forced open.
5. **Duplicate open** → opening an already-open dashboard just activates its tab.
6. **New dashboard in the active session** → live turn appends a tab and activates it
   (extends today's `activeDashboardId` set).
7. **Stale tab data** → the existing 30-min storage tier re-hydrates on activate; no
   special tab logic.
8. **Draft chat input on session switch** → the right panel reloads messages for the
   new session; an in-progress draft is lost. v1: accept; optionally guard later.
9. **Tab overflow** → horizontal scroll in v1 (prototype). Overflow menu deferred.
10. **Tab persistence across reload** → v1 ephemeral view-state. On load, seed
    `openTabs` from the active session's dashboards (or empty). Persisting the open-tab
    set per project is a deferred v2.
11. **Two session UIs** (Task #13) → `CanvasMenuButton` dropdown = quick switcher;
    `SessionsPanel` overlay = empty-state full manager + "Manage all sessions…"
    target. Both read the same `sessions` list + `openSession`. Consider demoting the
    ChatPanel header's "← Sessions"/sessionName now that the bar owns session identity.

---

## What we deliberately DON'T build (v1)

- No cross-project sessions (route is project-locked — prototype's multi-project list
  is illustrative only).
- No persisted open-tab set across reloads (ephemeral view-state).
- No tab drag-reorder, no overflow dropdown (horizontal scroll only).
- No decoupled "tab without switching session" + banner — we auto-switch instead.

---

## Open questions — RESOLVED (2026-06-05)

1. **Does `content.json` carry full `tsx` per dashboard?** ✅ **YES — verified.**
   `SessionFile.dashboards[]` → `PersistedDashboard` (`canvas-session.types.ts:22-31`)
   persists `id`, `messageId`, `title`, `summary`, `tsx`, `domainsRead`, `tokensCss`,
   `createdAt` — everything needed to mount. So the registry builds purely from the
   files API; no backend change.
   - **Cost note:** the registry needs one **content fetch per session** (today's
     `SessionsPanel` uses list-metadata only, zero content fetches). Mitigation:
     **fetch-on-demand + cache** — only download a session's `content.json` the first
     time its dashboards are actually needed (opening the All-dashboards flyout, or
     activating a cross-session tab), then keep it. Avoids fetching every session up
     front. (Folds into Task #9.)
2. **Session menu creates a new session inline?** ✅ **YES.** `CanvasMenuButton`
   dropdown includes a "New session" action (calls `newSession`) alongside the
   switch list and "Manage all sessions…". (Folds into Task #8.)
3. **Is the ChatPanel "← Sessions" affordance redundant now?** ⏸️ **Leave for now.**
   Keep it as-is in v1; revisit once the bar's session identity is in place.
   (Task #13 no longer demotes it — just ensures both read the same `sessions`/`openSession`.)
