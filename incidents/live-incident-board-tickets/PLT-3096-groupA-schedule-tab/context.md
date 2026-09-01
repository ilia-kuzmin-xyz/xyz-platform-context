# PLT-3096 — ATL05: WBS not collapsing properly in the Web Viewer

New ticket, created 2026-08-31 17:07, no prior folder. First pass 2026-09-01.

## Ticket

- **Project:** ATL05. **Reporter:** customer (Kyriakos), via Yash. **Assignee:** Darminder.
  **Priority:** Medium. **Status:** Open.
- **Symptom:** collapsing two WBS branches in the Gantt/Schedule tree in sequence: the first
  collapses fine; clicking the collapse icon on a second WBS re-expands the *first* one instead
  of collapsing the one that was clicked.
- **Comment 110926 (Yash, 2026-08-31 17:11):** Yash reproduced it himself on his own account
  ("I tried on my end as well and have reproduced same on my end"), with a screenshot of his own
  repro attached. That is a second, independent confirmation beyond the customer's video — this
  is not a one-off client-side fluke.

## Media — unopenable, flag for human

Four attachments: a 36 MB screen recording (`Screen Recording 2026-08-31 213520.mp4`) and three
screenshots. Same limitation as PLT-3095 — no authenticated path to Jira attachment bytes from
this environment. **None were opened.**

What the recording would settle: the exact click sequence and timing (is there a pause between
the two collapses, does a background refresh land in between, does it reproduce on the very first
two WBS rows or only after scrolling/searching) — useful for narrowing which of the two
hypotheses below is live, but not essential; the text description plus Yash's own repro already
specify the behaviour precisely enough to investigate without it.

## Code read (hc-frontend) — verified

Searched the whole `gantt-x` tree for custom collapse/expand handling
(`open|close|toggle|collapse|expand|onBeforeTaskOpen|onTaskOpened`, case-insensitive) —
**no custom click handler for the WBS expand/collapse icon exists anywhere in this codebase.**
The interaction is entirely native `@xyzreality/dhtmlx-gantt` behaviour: clicking the tree icon
calls the library's own `gantt.open(id)`/`gantt.close(id)`, which toggles `task.$open` on the
library's internal task object, keyed by task `id`.

Two things this codebase does control, both read and neither found to run on a plain click:

- `gantt.config.open_tree_initially = false`
  (`app/pages/organisation/ViewerPage/components/gantt-x/scheduler/hooks/use-initialize-gannt-chart.tsx:85`)
  — sets the *initial* collapsed state on load; irrelevant to a mid-session toggle bug.
- `wbs-service.ts`'s `rerenderRows()` fires on `onGanttRender`/`onGanttScroll`
  (`scheduler-wbs.tsx:18-19`) purely to recolor DOM elements
  (`scheduler-wbs/wbs-service.ts:16-46`); it reads `$grid_data.childNodes` and never calls
  `gantt.open`/`gantt.close`/`gantt.render`, so it cannot itself flip a row's collapsed state.
- The one place in this codebase that does call `gantt.open()` on a WBS ancestor
  (`use-apply-search-filter.tsx:129`, inside an `onDataRender` handler) is gated on
  `parentIdsToExpand.current`, which is only ever populated by `taskMatchesSearch()`
  (`use-apply-search-filter.tsx:71-89`), itself only reachable when
  `searchService.searchText.length >= 3` (`:95`). With no active search text, this path is a
  no-op every render — verified by reading the guard, not by reproducing live.

**Conclusion from code alone: nothing in hc-frontend explicitly re-opens a row.** Whatever is
happening is either (a) inside the third-party `@xyzreality/dhtmlx-gantt` package itself — not
read this run, out of this repo — or (b) a case where two DOM rows are being driven by the *same*
underlying task id, so what looks like "closing row 2 reopened row 1" is actually "row 1 and row 2
are the same task as far as the library's internal state is concerned," and a single toggle flips
one shared `$open` flag that both rows render from.

## Hypothesis (inferred, NOT verified — falsifiable, and shared with PLT-3095)

**If two ScheduleItemDto rows in ATL05's current schedule have the same `id`, DHTMLX would only
ever track one `$open` state for both.** Sequence: collapse "row A" (id `X`) → `$open=false` →
row A visually collapses. Collapse "row B", which secretly shares id `X` → the library toggles the
*same* task's `$open`, flipping it back to `true` → row A (the only place that id's collapsed
state is rendered) reappears open, and row B — never really a distinct task to the library — was
never actually closed. That reproduces the reported symptom exactly, including "the *first* one
re-opens," without requiring any bug in this codebase's own event handling.

This is the same underlying mechanism proposed for PLT-3095 (a Map keyed by `id` silently drops a
collision; see that ticket's `context.md`), on the same schedule-entity code
(`schedule-entity.ts:292-306`) — a duplicate `id` there causes a *dropped* WBS branch on load, and
would separately cause *this* symptom once the surviving id is toggled. Both are downstream of the
same possible defect, on two different projects, both reported the same day (2026-08-31) via the
same route (Yash). That clustering is suggestive of a shared, possibly recently-introduced cause,
but **neither ticket's root cause is confirmed yet** — treat this as one hypothesis to test in
both places, not two independent findings.

**Falsifying query, not run (no access from this environment):** pull the schedule-revision API
response (or `gantt.serialize()` from the browser console on a live ATL05 session) and check for
duplicate `id` values among the rows. Darminder (assignee) can run this directly against ATL05
without needing customer involvement.

## What remains unverified

- Whether ATL05's schedule actually has any duplicate `id`/`ItemId` — untested, needs live access.
- Whether `@xyzreality/dhtmlx-gantt`'s own source has an unrelated collapse/expand bug independent
  of id collisions — not read this run (third-party package, not in this checkout by source).
- Whether the bug reproduces on the very first two WBS rows a user tries, or only after some other
  interaction (scroll, search, filter) — the video would answer this, not opened.
- Any link to PLT-3095 beyond same-day/same-shape — not established.
