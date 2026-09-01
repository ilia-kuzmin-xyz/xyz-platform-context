# PLT-3096 — WBS collapse re-expands the previously collapsed WBS (ATL05)

**Status 2026-09-01: PARKED mid-investigation by Ilia's request.** Diagnosis not confirmed; one
strong suspect identified; live repro built but blocked on a fresh browser token.

## Symptom (customer Kyriakos, reproduced by Yash)

Collapse WBS A → works. Then click collapse on WBS B → **A re-expands** and B does not collapse.
Medium, assigned Darminder. Screenshots + video on the ticket (not needed — repro is deterministic
per Yash).

## What is VERIFIED from code

- The chevron/collapse is dhtmlx-native; **no custom onTaskClick/onTaskOpened/onTaskClosed handlers
  exist** in gantt-x (grepped).
- `wbs-service.ts` (the overlay the panel name suggests) only colours rows — no click handling.
- The data-mapping overlay paths (`scheduler-data-mapping.tsx`, `progress-bar.tsx` filters) run only
  while the mapping panel is open; the customer's screenshot shows it closed.
- Search-filter `gantt.open(parentId)` on `onDataRender` (`use-apply-search-filter.tsx:125-131`)
  fires only with an active search ≥3 chars.
- gantt-x has had almost no commits since 2026-07-20 (only PLT-2914 CX colouring) — so if this is a
  regression it is either old, or caused outside gantt-x.
- On load, **every task is forced open**: `use-load-schedule-data.tsx:60` `element.open = true`,
  then `gantt.parse(...)`; `gantt.sort('text')` runs after every parse (`:71`).

## PRIME SUSPECT (unconfirmed — parked here)

`scheduler-columns/scheduler-columns-sort.tsx` keeps an "original data" reset path:

- `:37-38` — `gantt.clearAll()` + `gantt.parse({ data: originalData … })` — "reset gantt to original
  data using DHTMLX's recommended clearAll + parse approach".
- `:275` — an `onGanttRender` hook in the same file; `:279`/`:293` two `onGridHeaderClick` handlers.

A `clearAll()+parse(original)` **resurrects the `open: true` snapshot** for every task. If the
reset path (or any sort interaction) runs on the second toggle — e.g. triggered via the
`onGanttRender` hook after B's collapse — it would restore A to open and leave B open, which is
EXACTLY the symptom. The first collapse works because the snapshot is only replayed on the *next*
render cycle. **NOT VERIFIED — the next step is to read `scheduler-columns-sort.tsx` in full
(when/why the reset runs, what `originalData` holds) and instrument the repro.**

Also worth checking there: whether the sort comparator / reset interacts with the three `__spacer__`
rows and with `gantt.sort('text')` re-running.

## Live repro harness — built, works up to auth, parked

`repro-playwright.js` (this folder) drives prod headless from the agent container:

- chromium at `/opt/pw-browsers/chromium`; the egress proxy resets chromium's TLS ClientHello
  (post-quantum hello, 39-byte alert), so ALL page traffic is routed through Playwright's Node-side
  fetch via `ctx.route('**/*', route.fulfill(ctx.request.fetch(...)))` — this works (page renders).
- cookies: `access_token` (JWT) + `feature-flags` with `enableGlobalWebViewerAPI:true` (flags are
  read from the `feature-flags` cookie — `getFeatureFlagValue.ts`), which exposes
  `window.projectService`.
- viewer URL: `/projects/{projectId}/editor`.
- **Blocker:** the route guard fetches `GET /ms/iam/api/account/projects/{id}/authorities`, which
  returns **403 `scopeNotValid`** for the current JWT (its `scope` claim is empty) — on ATL05 *and*
  PA12. platform-api v2 doesn't enforce that scope (v2 calls worked all session), IAM does.
  **Unblock: a fresh `access_token` cookie captured from a browser that is inside any project's
  viewer**, then rerun the script (clicks two expanders, dumps per-row open/closed state at +300ms
  and +1800ms, screenshots at each step). The state dumps distinguish "wrong task toggled" from
  "toggled then re-opened" — which decides between the reset-path suspect and a click-routing bug.

## Next steps when resumed

1. Read `scheduler-columns-sort.tsx` fully; find every caller of its reset/parse path.
2. Fresh token → run `repro-playwright.js`; capture which task ids actually toggle.
3. If the reset path is confirmed: fix is to stop replaying the `open:true` snapshot (preserve
   current `$open` across reset — e.g. capture `gantt.getState()`/task `$open` before parse and
   reapply), branch `PLT-3096`, PR per protocol.
