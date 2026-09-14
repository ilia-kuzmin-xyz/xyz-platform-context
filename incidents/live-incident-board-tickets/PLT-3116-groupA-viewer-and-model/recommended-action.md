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

---

## 2026-09-11 (scheduled) — unchanged, classification and draft both stand

Jira re-fetched: no new comments, no status change (still Open), no new attachments since the
2026-09-10 entry. Classification is unchanged: **3 — resolvable in-session, needs Ilia's visual
debugging first**. The console check above (`forge`/`app`/`dropped` table in `context.md`) is still
the one thing that settles this, and it has still not been run. No draft Jira comment is warranted
yet — the ticket is 2 days old, assigned, and nobody is waiting on us for a reply; posting the console
snippet itself would be premature since we have not run it ourselves first.

---

## 2026-09-14 (scheduled run) — second mechanism found; a first draft is now warranted

**Classification unchanged: 3 — resolvable in-session, needs visual debugging first.** context.md's
2026-09-14 section adds a second candidate mechanism (a Filters-panel override in the same function),
independent of the 09-10 bridge-drop one. Both are fully specified in code; choosing between them
needs exactly one fact neither of us can get from source: whether a Filters-panel filter was switched
on during the repro. Not class 2 — nothing should be coded before that fact is known, on either
candidate. Not class 4 — this is a mechanism to confirm, not a product ambiguity.

The prior "no draft needed, only 1-2 days old" reasoning (09-10, 09-11) is now stale: the ticket is
5 days old with zero developer reply on the thread, and there are now two candidate causes worth
putting in front of Darminder together rather than continuing to hold both back. A short nudge is
warranted.

**Assumption the draft rests on:** that Darminder has not already looked into this privately since he
has not commented; if he has, the question may already be answered.

Draft (not posted), to Darminder:

Before writing a fix, could you reproduce this on LVN1-2? Select some elements, click select same
type, then try isolate, and check one thing: is any filter, like discipline, package, level or status,
switched on in the left panel at that moment? Also note whether the model visibly changes at all
right when you click select same type, before isolate. **Was a panel filter switched on when isolate
did nothing?** That single check tells us which of two causes is at play, so please share what you
see either way.

(90 words)

## What this session did NOT do (2026-09-14)

No code was written or pushed, no branch created, and the draft above was not posted to Jira — per
the standing hard rule, it is left here for a human to send if they choose.
