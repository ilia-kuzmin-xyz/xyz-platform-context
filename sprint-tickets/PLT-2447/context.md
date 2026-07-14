# PLT-2447 — Select Activity / Panel details: multiple UX issues

- **Type:** Bug · **Parent:** PLT-2813 (Q3 2026 Bugs & Improvements) · **Priority:** Medium
- **Jira status:** Analysis In Progress · Relates to PLT-1717 (Closed)
- **Domain:** ViewerPage / Editor — right-side panel details, linked-elements, Model Layers, 3-dot contextual menu

## Ask — three distinct bugs
1. Opening/closing the 3-dot menu **reverts model to home view**.
2. Menu "Select Elements" **loses the previous multi-selection** (Shift+click highlight).
3. **Both contextual menus can be open at once.**

## Domain anchors (hc-frontend)
- `app/pages/organisation/ViewerPage/...` — linked-elements highlight uses **ghost + isolate + fitToView**; cleanup runs `showAll()` + un-ghost (root of bug 1).
- Shift+click highlight (ghost isolation) vs menu "Select" use **different selection paths**; Select drops parent/directory nodes with no `dbId` (root of bug 2).
- The two menus are backed by **3 independent state stores** → making them mutually exclusive is a small refactor to a shared coordinator (bug 3).

## Analysis state (as of 2026-07-14)
- **BLOCKED — awaiting product/human answer.** Clarification comment left on Jira (2026-07-10, "Claude here"). Attached repro videos not viewable by me.
- Regression risk to ghosting/selection is real; proposed possibly splitting into 3 tickets.

## Open questions (raised, unanswered)
1. Bug 1: exact expected camera behaviour on menu open/close — should the isolated/fitted view be fully preserved?
2. Bug 2: should "Select Elements" preserve the highlight, and include children of selected parent nodes?
3. Bug 3: confirm mutual-exclusion (shared coordinator) is the desired fix.
4. Split into 3 separate tickets?

## Next step
Do NOT start dev. Resume once scope + expected behaviour confirmed. Confidence to implement once answered: medium (6/10) — architecture + regression risk.
