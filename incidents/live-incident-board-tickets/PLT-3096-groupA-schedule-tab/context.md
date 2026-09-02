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

## 2026-09-01 (later) — NEW SUSPECT, and the reason one repro was not enough

**`bar/hooks/useShowWBS.ts:33` force-opens EVERY task:**

```ts
gantt.eachTask(task => (task.$open = true))
gantt.render()
```

inside a `useEffect` with deps `[gantt, showWBS]`. It therefore fires on mount, on every WBS toggle,
and on any remount of the component that owns the hook.

**On its own this produces the exact reported symptom**: the WBS collapsed by the first click
re-expands, and the second click appears to do nothing (it did toggle, then everything was reopened).

**Why the earlier instrumentation could not have caught it.** `plt-3096-collapse-diagnostics.ts`
wrapped `gantt.open/close/parse/clearAll/sort` and listened for `onTaskOpened`/`onTaskClosed`. A
direct `task.$open = …` assignment goes through none of those: no method call, no event. So a
force-open-all was invisible. This is a correction to the earlier plan, which expected one manual
repro to be decisive — it would have come back silent.

Three sites write `$open` directly. All three are now logged (commit `6d688e939`, branch
`PLT-3096`, still DO NOT MERGE):

| site | trigger |
|---|---|
| `useShowWBS.ts:33` | effect re-run: mount, WBS toggle, or remount |
| `use-actions.tsx` `expandAll` / `collapseAll` | context menu |
| `activity-context-menu.tsx` | "Expand/Collapse selected" |

`logOpenStateWrite(gantt, reason, nextValue)` prints the caller, the value, the branch count, how
many branches the write actually changes, and a stack.

### What the repro now answers

Collapse WBS A, then click the chevron on WBS B, and read the console:

- **A `[PLT-3096] $open := true via useShowWBS effect` line appears between the two clicks** →
  confirmed. The fix is to stop force-opening on every effect run: force-open only on the first
  parse of a new schedule, and preserve current `$open` across a WBS toggle.
- **No such line, but `onTaskClosed B` then `onTaskOpened A`** → something else reopens A; follow the
  stack on the `onTaskOpened`.
- **`expander CLICK on row A` when B was clicked** → click routing, not open-state, and the sort
  comparator/spacer rows come back into scope.

Still needs one manual run (or a fresh in-project `access_token` for `repro-playwright.js`); this
narrows what to look for, it does not remove the need for the run.

**Superseded:** the earlier PRIME SUSPECT (`scheduler-columns-sort.tsx` `resetToOriginalData`
replaying the `open:true` snapshot). Left in place above for the record, but its only caller is the
column-header 3-state sort cycle, which the chevron repro never touches. `useShowWBS` is the better
candidate because it needs no sort interaction at all.

## 2026-09-01 (later) — CONFIRMED a UI bug. The data is clean. Not related to PLT-3095.

Pulled ATL05's current schedule revision (`64db53d6-d6b4-4052-a36e-daf32f1e1355`) live from
`GET /api/v2/projects/4696d14d-fbe6-4f47-b655-2015dff75b81/schedules/{rev}` with a browser token,
read-only.

| check | result |
|---|---|
| rows | 3,761 (3,408 Activity, 353 WBS) |
| duplicate `itemId` | **0** |
| `parentItemId` referencing a row not in the payload | **0** |
| unreachable rows | **0** |
| roots | 1 |

**The payload is structurally perfect.** Nothing the API sends can explain the collapse defect, so
this is frontend-only. Collapse state is dhtmlx's client-side `$open` flag; it is never sent to or
read from the API.

### The PLT-3095 link is dead — do not re-open it

Earlier notes (both tickets) floated that 3095 and 3096 might be one defect, on the theory that two
schedule items sharing an `id` would explain both. That theory is now falsified on **both**
projects: AUS02 has 0 duplicate `itemId`s and ATL05 has 0. They are unrelated bugs with different
owners — 3095 is backend/import (missing WBS parents, api-v2, Sachin), 3096 is frontend (Darminder).

### Where that leaves the suspect

`bar/hooks/useShowWBS.ts:33` — `gantt.eachTask(task => (task.$open = true))` inside an effect keyed
`[gantt, showWBS]`, force-opening every branch on mount, on WBS toggle, and on any remount of the
owning component. Still the best candidate and still unconfirmed; the instrumented branch
`PLT-3096` (commit `6d688e939`, DO NOT MERGE) logs it and the two other direct `$open` writers.
One repro run distinguishes them. See the dated section above for what each console outcome proves.

## 2026-09-02 — folder duplication reconciled

A second folder, `PLT-3096-groupA-progress-tracking/`, existed briefly under the wrong domain tag.
It was created 09-01 09:17 and touched again at 09:37 the same morning by an uninstructed parallel
pass that did not read this folder first (this one already existed since 07:19 that day and was
updated further at 12:32 and 15:43, all *after* the duplicate's last touch). Exactly the failure
`xyz-platform-context/.claude/CLAUDE.md` warns about. Reconciled today by reading both in full:

- **Symptom description, "verified from code" findings (native dhtmlx, no custom handlers), and
  the instrumented-branch commit lineage** were all consistent with, and superseded by, what is
  already recorded here — no new facts. The duplicate's commit `10db8e8bd` (wraps
  `gantt.open/close/parse/clearAll/sort`, listens for `onTaskOpened`/`onTaskClosed`) is the direct
  predecessor of this folder's `6d688e939` (extends logging to catch direct `$open` writes,
  because `10db8e8bd`'s method-wrapping couldn't see `useShowWBS.ts`'s plain `task.$open = true`
  assignment) — same branch, same DO NOT MERGE status, nothing to reconcile.
- **The duplicate's PRIME SUSPECT** (`scheduler-columns-sort.tsx` `resetToOriginalData` replaying
  an `open:true` snapshot) is the same one already marked **Superseded** in this folder's own
  09-01 (later) entry above (its only caller — the column-header sort cycle — is never touched by
  the plain chevron repro). No change needed.
- **Unique and preserved:** `repro-playwright.js`, moved into this folder unmodified. A headless
  Playwright harness that reaches the viewer from this environment (routes all page traffic
  through Playwright's Node-side `fetch` to dodge the egress proxy resetting Chromium's TLS
  ClientHello; sets `access_token` + `feature-flags` cookies to enable
  `enableGlobalWebViewerAPI`), clicks two WBS expanders in sequence, and dumps each row's
  open/closed DOM state at +300ms/+1800ms. Not superseded — the `useShowWBS` diagnosis above is
  still the *best candidate*, not confirmed, and this is the only tool in either folder that can
  independently observe the DOM-level symptom (rather than the instrumented branch's console logs)
  once run. It is still blocked exactly as the duplicate folder left it: `GET
  .../authorities` returns 403 `scopeNotValid` (empty `scope` claim) on the current JWT — needs a
  fresh `access_token` cookie captured from inside a live project's viewer. **Caveat:** its console
  filter (`t.includes('[3096]')`) will not match the instrumented branch's actual log prefix
  `[PLT-3096]` (confirmed above) — that substring never occurs inside `[PLT-3096]`, so update the
  filter before relying on it to surface the diagnostic logs; the DOM state dump itself doesn't
  depend on that filter and is usable as-is.

Duplicate folder deleted after this merge — nothing left behind unread.

## 2026-09-02 — left scope: With Technical Support

Live `getJiraIssue` fetch today: status is **With Technical Support** (moved there via Freshdesk
sync, comment 110927, 2026-08-31 17:11, right after the ticket was raised — same day as creation).
Out of scope for Group A/B under this routine's standing exclusion list; no further investigation
done this run. Newest comments (all after this folder's 09-01 15:43 entry, not yet reflected
anywhere): Ilia tried to reproduce himself (110988, 09-01 17:00) and could not — "It works fine on
my side" — and after Yash described his own repro steps (110993, 09-01 17:26), Ilia posted a video
of it working and noted "It seems schedule has been updated," asking Yash to record a new video if
it still occurs (110996, 09-01 17:41, the newest comment). Folder tag kept as `-groupA-schedule-tab`
per this routine's standing precedent of keeping the last in-scope tag rather than relabelling on a
scope exit. GitHub: no PR exists for the `PLT-3096` branch in `xyzreality/hc-frontend` (checked via
`search_pull_requests`/`list_pull_requests` for both `PLT-3096` text and `head:PLT-3096` — zero
results); the branch remains unmerged, DO-NOT-MERGE instrumentation only, exactly as described
above. `origin/cursor/duckdb-queries-examples-3096` was not separately checked for a PR (name
suggests it is unrelated to this ticket's schedule/WBS mechanism).

## 2026-09-02 (late) — back in scope (status is now Dev In Progress), and a real defect fixed

Live status today is **Dev In Progress**, not "With Technical Support" as the earlier entry recorded
— that entry is superseded on status only; everything else in it stands.

**PR: `XYZReality/hc-frontend` #2195, draft, branch `PLT-3096-fix` off `master`** (deliberately NOT
the `PLT-3096` branch, which stays as the DO-NOT-MERGE instrumentation).

### The repro run did NOT reproduce the symptom. Read this before claiming 3096 is fixed.

Ilia's instrumented run (15:49–15:51) collapsed two WBS rows in sequence — `Building C - Cx - First
Floor North (C2...)` then `Building C - Cx - First Floor South (C1...)` — and both closed cleanly:
`expander CLICK` → `onTaskClosed` for each, **nothing reopening either**. Consistent with his own
Jira comments (110988, 110996): "It works fine on my side", "It seems schedule has been updated".

So the customer symptom is currently **not reproducible**, and #2195 does not claim to fix it.

### What the run DID prove, and it is worth fixing on its own

Two facts from the log:

1. `useShowWBS`'s force-open fired **before** `gantt.parse` on mount and reported
   **`0 branches, 0 changing`** — on mount it is already a no-op.
2. `gantt.parse(12380 tasks, 12377 with open:true)` — the all-expanded first render comes from the
   **parse path**, not from `useShowWBS`. Confirmed in code:
   `scheduler/hooks/use-load-schedule-data.tsx:58-60` sets `element.open = true` on every element
   before parse. (The 3 remainders are the spacer rows, `open: false`, `createSpacerRows()`.)

Together these mean the force-open in `useShowWBS` does nothing useful on mount and **everything it
does do is on the path the repro never exercised**: a re-run of the effect with WBS rows shown — a
Show-WBS toggle off and back on, or a remount of the owning component — reopened every branch the
user had collapsed.

That is a genuine defect and the leading candidate for the reported symptom. It is not a confirmed
cause and #2195 says so in its first paragraph.

### The fix

- `bar/hooks/wbs-open-state.ts` (new) — `captureAndOpenAllBranches` / `restoreOpenState`.
- `bar/hooks/useShowWBS.ts` — snapshot `$open` in a ref on the way into the flat view, restore on the
  way out. With WBS shown and no snapshot held, the effect no longer touches `$open` at all.

**The force-open is genuinely required in the flat state** and is kept there: hiding WBS rows filters
the grid to `type === 'Activity'` with `treeColumn.tree = false`, but an activity is still a child of
its WBS row, so a collapsed branch would render its activities nowhere. That is the case that breaks
if the capture side ever regresses — it is in the PR's manual test steps.

Extracted to a module so the state handling is testable without the viewer context and the redux
store. 6 tests; **2 fail when `restoreOpenState` is reduced to a no-op** (i.e. reproducing the old
behaviour). The hook's own ref lifecycle is **not** covered — reviewed by reading only.

The other two `$open` writers (`use-actions.tsx` expandAll/collapseAll, `activity-context-menu.tsx`)
are explicit user actions and are untouched. `useShowWBS` was the only implicit one.

### CI outcome — GREEN

`build` success and SonarCloud success (0 new issues, 0 hotspots, 22.0% coverage on new code) on
`d5509246b`. Same Trivy story as #2194 — red on the base-branch `nanoid` CVE first, green after
porting #2192's `.trivyignore` entry. **#2195 is a green, mergeable draft.**
