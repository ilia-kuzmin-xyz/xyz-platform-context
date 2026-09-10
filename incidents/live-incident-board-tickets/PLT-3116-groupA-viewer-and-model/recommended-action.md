# PLT-3116 — recommended action (2026-09-10, first pass)

## Classification: **3 — resolvable in-session, needs Ilia's visual debugging first**

The mechanism (context.md § Hypothesis) is a specific, falsifiable claim — dbIds from "select same
type" missing from `modelDbId2ElementId`, dropped silently by the selection bridge, leaving isolate
with an empty selection it silently no-ops on. It cannot be confirmed by more source reading; it
needs one live check.

**Not class 1** — only 1 day old, assignee (Darminder) hasn't had a working day on it yet, no chase
warranted. **Not class 4** — this isn't ambiguous or a product question, it's a mechanism to confirm.

## The one console check that settles it

Reproduce on LVN1-2 (or any project): select an element, right-click → **Select same type**, then
right-click → **Isolate selected**. Before clicking Isolate, paste in the browser console:

```js
console.log('selected (app store):', window.projectService?.selectionStore?.selectedElements?.size)
```

(Needs `enableGlobalWebViewerAPI` cookie set first — see `live-incident-run-instructions.md`
§ 2026-09-04 "Viewer internals on prod: it's a cookie, not a build" for the one-liner and the
`window.projectService` access path. Read-only call, nothing is mutated.)

- **Size is 0 or much smaller than the elements actually highlighted on screen** → confirms the
  bridge is dropping dbIds; the hypothesis holds, and the fix is either widening
  `modelDbId2ElementId`'s coverage or having `selectSameTypes` filter to only mapped dbIds before
  calling the native selector, so an "isolate" attempt on the unmapped remainder can say why (a
  status/toast) instead of nothing happening.
- **Size matches what's highlighted** → the hypothesis is wrong; the fault is downstream in
  `filter-service.ts`'s isolation branch itself, or `select-same-family.ts` is returning dbIds Forge
  itself never actually renders as selected (a Forge-layer issue, same shape as the 2026-09-09
  Forge-BoxSelection lesson in the run instructions — don't assume our layer is at fault without a
  measurement).

Either outcome is decisive and needs nothing further to interpret.

## Draft — none needed yet

Ticket is 1 day old, already assigned to Darminder, no customer chase pending. Nothing to post.

## What this session did NOT do

No code was written or pushed. No branch was created. This is a diagnosis-and-a-console-check
hand-off, not a fix — per this run's instruction to describe actions rather than perform them.
