# Canvas Top Bar — Session Tabs v2

> **Status: 🟢 READY FOR IMPLEMENTATION**
> Supersedes [canvas-topbar-tabs.md](canvas-topbar-tabs.md) (tabs-per-dashboard approach).
> All design questions answered.

---

## What changes

### Current bar (implemented)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [◆]  Project name  │  [● SESSION ▾]  │  [● tab ×][● tab ×]…  │  [▦ All N] [user ▾] │
└────────────────────────────────────────────────────────────────────────────┘
  logo  project name    session switcher   tabs = dashboards       all-dashboards flyout
```

### New bar

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [◆]  Project name  │  [tab ···][tab ···]…  [+]  │  [user ▾] │
└──────────────────────────────────────────────────────────────────────────┘
  logo  project name    tabs = sessions (max 10)   new  right cluster
```

**Removed:** session switcher dropdown, "All dashboards" flyout.
**Added:** `[+]` new-session button, three-dot `···` context menu per tab.

---

## Mental model shift

| | v1 (current) | v2 |
|--|--------------|-----|
| Tab unit | Dashboard — one session spawns many tabs | Session — one tab per session |
| Session switching | Dedicated dropdown button | Tab click |
| Within-session dashboard nav | Tab strip | Chat "View dashboard" buttons (unchanged) |
| Cross-session discovery | "All dashboards" flyout | Tab strip |
| Session creation | Session dropdown → "New session" | [+] button |

---

## Decisions (all resolved)

### Tab label
- If the session has a **pipeline-generated name** (future — see §Session naming): show it.
- Otherwise: first user message truncated to ~30 chars.
- Manual rename is supported via the three-dot menu → "Rename".
- Full session name shown as tooltip on hover.

### [+] new session
- Clicking `[+]` puts the UI into a **pending-new-session state**: a new blank tab
  appears, becomes active, canvas is empty, chat input is ready.
- **No session file is saved** until the first prompt returns a result (autosave fires
  after the first completed turn — same as today).
- If the user reloads before sending a message, the pending tab vanishes — that's
  intentional and fine.
- If the user already has **10 sessions**, `[+]` is disabled (greyed out, tooltip:
  "Session limit reached — delete one to create a new session").

### Tab three-dot menu (···)
Each tab shows a `···` button on hover (or long-press). Menu actions:
- **Rename** — inline text edit on the tab label
- **Delete** — soft-deletes the session (POST tombstone file, same as current
  `deleteSession`); tab is removed immediately

No bare `×` on the tab. The only way to close/remove a session is via the menu.

### Tab order
Creation order, oldest left → newest right. `[+]` is always the rightmost element
after the last tab.

### Session limit
Max **10 sessions per user per project**. Enforced on the frontend:
- Tab count reaches 10 → `[+]` is disabled with tooltip explanation.
- Session count is the number of non-tombstoned sessions in the user's filtered list.

### Tab switch behaviour
Clicking a tab:
1. Switches the active session (loads messages, sets `sessionId`).
2. Auto-shows the **latest dashboard** from that session in the canvas area
   (calls `viewDashboard(latestDashboardId)` then re-hydrates if needed).
3. If the session has no dashboards yet → canvas shows the empty placeholder.

"View dashboard" buttons in chat history remain functional — clicking one shows that
specific (older) dashboard in the canvas. This preserves dashboard history navigation.

### Empty / no sessions state
If the user has no sessions for this project (first visit):
- Tab strip shows just the `[+]` button (no tabs).
- Canvas shows the existing empty-state placeholder.
- User clicks `[+]` → pending-new-session tab appears → they type and start.

### Privacy — frontend filter (v1)
- Sessions are scoped to the current user on the frontend by comparing `createdBy`
  in the session file to the current user's ID.
- When saving a session, always write `createdBy: currentUserId` into `SessionFile`.
- On list: `sessions.filter(s => s.createdBy === currentUserId)`.
- This is a **UI filter only** — not a security boundary. Acceptable for dev-only
  canvas. Proper backend scoping is a v2 backend task.

**Prerequisite**: check whether `SessionFile` already has a `createdBy` field;
if not, add it. Check `useCurrentUser` hook for the current user ID.

### SessionsPanel component
- **Removed from the flow** — tabs replace the sessions-panel overlay entirely.
- Component file kept (not deleted) — may be repurposed later.
- The `showSessions` / `sessionsForced` state in `CanvasPage.tsx` is removed.

### Session naming (pipeline — future, not v1)
The agent pipeline should eventually generate a short session name after the first
turn (similar to how ChatGPT names conversations). Not implemented here — tracked as
a separate pipeline task. Until then, tab labels fall back to the truncated first
message.

---

## On-load sequence

```
/projects/:projectId/canvas
  1. useCanvasProject resolves mongoProjectId → postgres UUID
  2. listSessions() → filter by createdBy === currentUserId → sort by creation order
  3. Render one tab per session + [+] button
  4. Auto-activate the most-recently-updated session (highest insertedOn)
  5. openSession(lastUpdated) → rehydrateSession → show latest dashboard
  If no sessions: show [+] only, empty canvas, chat input ready
```

---

## Tab overflow

Horizontal scroll if tabs exceed bar width. `[+]` always visible (sticky right).
No overflow dropdown in v1. Max 10 sessions means overflow is bounded.

---

## Components affected

| Component | Action |
|-----------|--------|
| `CanvasSessionButton.tsx` | **Delete** — session dropdown replaced by tabs |
| `AllDashboardsFlyout.tsx` | **Delete** — no longer needed |
| `CanvasTabStrip.tsx` | **Rewrite** — tabs are now sessions; each tab shows session name + `···` menu |
| `CanvasBar.tsx` | **Simplify** — remove `allDashboardsTrigger` slot, remove session button slot |
| `useCanvas.ts` | Remove `openTabs`/`closeTab`/`activateTab`/`loadSessionDashboards`; add `latestDashboardForSession()` helper; tab switching = `openSession` + `viewDashboard(latest)` |
| `CanvasPage.tsx` | Remove `registrySnapshot` effect, `allDashboardsGroups` memo, `handleDeleteSession` wrapper, `sessionsForced` state; remove `SessionsPanel` render |
| `canvas-session-api-service.ts` | Ensure `createdBy` is written on save; filter on load |
| `canvas-session.types.ts` | Verify/add `createdBy: string` to `SessionFile` |
| `SessionsPanel.tsx` | Keep file, remove from render tree |
| `useCanvasProject.ts` | No change |

---

## Edge cases

| Case | Behaviour |
|------|-----------|
| Delete active tab | Activate the tab immediately to the left; if none, empty canvas |
| Pending tab (unsaved) + user deletes it via `···` | Discard in memory, no API call (nothing saved yet) |
| Session with only ask results (no dashboards) | Tab shows empty canvas; chat shows ask results |
| Session autosave fails | Tab stays; warn in console; existing retry behaviour unchanged |
| 10 sessions + user tries `[+]` | Button disabled, tooltip shown |
| Rename while session is streaming | Allowed — name field is independent of streaming state |
| Two browser tabs open for the same user | Both see their own sessions; concurrent edits = last-write-wins (existing append-only behaviour) |

---

## What stays the same

- Chat panel (right side) — unchanged
- "View dashboard" buttons in chat — unchanged, still navigate within a session
- Session restore flow (`openSession` → `rehydrateSession`) — unchanged
- Session autosave — unchanged  
- Hydration mechanics — unchanged
- Project data cache — unchanged
- Files API storage format — `createdBy` field added to `SessionFile`

---

## Confidence: 8/10

Clear implementation path. The two uncertainties:
1. `createdBy` field — need to verify `SessionFile` type and whether it's already
   populated on save (quick grep).
2. "Latest dashboard per session" — need a small helper that, given a session's
   `dashboards[]` array, returns the one with the highest `createdAt`.
   Straightforward but needs a test path through `openSession` → `viewDashboard`.
