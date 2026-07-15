# PLT-2447 — Select Activity / Panel details: multiple UX issues

- **Type:** Bug · **Priority:** Medium · **Repro:** 5/5
- **Jira status:** Analysis In Progress
- **Domain:** Viewer / Editor — right-panel context menus + element selection / ghosting (see `dashboard/viewer-and-model.md`)
- **Related:** PLT-1717 (Closed) — back-nav from Activity Details to Element Properties, linked elements selectable

## The three reported issues

1. Opening/closing the 3-dot menu (or clicking outside it) **reverts the model
   to home view**.
2. **"Select Elements"** from the 3-dot menu **drops a prior multi-selection**
   (Shift+click highlight).
3. Both contextual menus can be **open at the same time**.

## Domain findings (from prior analysis)

- Linked-elements highlight uses **ghost + isolate + fitToView**; its cleanup
  runs `showAll()` + un-ghost → likely cause of the "home view" revert (#1).
- The Shift+click highlight (ghost isolation) and the menu's **Select** action
  use **different selection paths**; Select drops parent/directory nodes with
  no `dbId` (#2).
- The two menus are backed by **3 independent state stores**; making them
  mutually exclusive is a small refactor to a shared coordinator (#3).
- Ghosting/selection carries regression risk — touch carefully.

## Current state: AWAITING-CLARIFICATION (since 2026-07-10)

Clarification left on Jira (comment 107120). Open questions — do NOT dev until
answered, do NOT re-ask:

1. Exact expected camera behaviour on menu open/close — should the
   isolated/fitted view be fully preserved?
2. Should "Select Elements" preserve the highlight, and include children of
   selected parent nodes?
3. Confirm mutual-exclusion is the desired fix for the double-menu issue.
4. Split the 3 bugs into separate tickets? (regression risk + distinct
   mechanisms)

## Next run

- If Jira has replies → fold in, decide split vs single, set READY-FOR-DEV,
  branch `PLT-2447` (or per-issue branches) off latest master.
- If still no reply → leave as-is, no action.
