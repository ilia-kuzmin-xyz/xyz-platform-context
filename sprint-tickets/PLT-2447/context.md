# PLT-2447 — Select Activity panel details: multiple UX issues

**Type:** Bug · **Status at pickup:** Open · **Domain:** ViewerPage / activity-linking-list + context menus

## Three reported issues
1. Opening 3-dot menu then clicking outside / 3-dots again reverts model to HOME VIEW (camera reset).
2. Shift+Click multi-select from hierarchy, then 3-dot → "Select Elements" LOSES prior highlight/selection.
3. Both contextual menus can be open at the same time (should be mutually exclusive).

## Findings (why this is risky)
- **3 independent menu state stores**, not one:
  - Right-panel kebab: `activity-linking-list/hooks/useActivityMenu.ts:32` local `menuAnchor`.
  - Right-click tree menu ("Select element(s)"): `hooks/useContextMenu.ts:28` local `contextMenu`.
  - Element-properties kebab: shared viewer-provider `contextMenuType/Position` (`viewer-provider.tsx:141-143`,
    `openContextMenu :286-298`, `closeContextMenu :278-284`) via `context-menu/context-menu.tsx`.
  → Issue #3 requires a shared "active menu" coordinator across all three = architectural change.
- **Issue #1 camera reset:** `activity-linking-list/hooks/useGhostedHighlight.ts` — `ghostHighlight()`
  isolates + `viewer.fitToView()` (:109); `resetViewer()` (:71-80) `showAll`+un-ghost; a useEffect
  cleanup calls `resetViewer()` on unmount/identity change (:82-86). A remount/viewer-ref change on
  menu open/close fires it. Fixing safely needs care not to regress ghost-highlight.
- **Issue #2:** `useElementSelection.ts:21-43 selectElements` → `setAggregateSelection` replaces Forge
  selection but does NOT re-apply isolate/ghost, and drops nodes without `dbId` (parent/dir nodes).
  Two selection concepts (aggregate selection vs ghost-isolation) unsynced.

## Decision → IN ANALYSIS (not confident to 95%)
Reasons: (a) ticket says "refer to attached files" — 3 videos/images I cannot view, needed to
confirm exact repro & expected camera behaviour; (b) fixes are architectural (shared menu state)
with real regression risk to ghosting/selection; (c) 3 distinct bugs may warrant splitting.
Clarifying questions posted on the ticket.

## Confidence: 4/10 — needs human repro/media + design decision on menu-state unification.
