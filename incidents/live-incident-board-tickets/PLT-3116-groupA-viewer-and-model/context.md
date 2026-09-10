# PLT-3116 — Can't isolate selected elements on editor

**Raised** 2026-09-09 18:07 by Yash Patel (Freshdesk `#7908`, Waiting on 3rd line)
**Status** Open · Medium · assignee Darminder Atker
**Project** LVN1-2 · Software Area: Web Viewer

## Description (verbatim, condensed)

Customer: *"When trying to select certain elements on the editor we cant isolate and then select
the status of those elements."* Yash's own repro note (comment `111798`): after clicking **"select
same type"**, trying to isolate the selected elements "behaves odd and doesn't let them isolate
them." Yash reproduced it himself (session `platform-web-70e55a74-4834-49e2-8a87-a6f9bf98c1fb`).

## Media — unopenable, flagged per standing rule

Three attachments, all confirmed 403 on content fetch from this session (per the 2026-09-08 rule —
Atlassian MCP credentials here can read metadata only, never bytes):
- `64256` `image-20260909-170956.png`
- `64257` `image-20260909-171003.png`
- `64258` `Screen Recording 2026-09-09 223529.mp4` (31 MB)

**What each would settle:** whether the "odd behaviour" is a hard no-op (nothing changes) or a
partial isolation (some elements isolate, others don't) — that distinguishes the hypothesis below
(all-or-nothing on a resolution failure) from a per-element mapping gap. A human with Jira access
should pull these and describe what's on screen; the video especially would show whether any
console warning is visible during the action.

## Domain cross-reference

`dashboard/viewer-and-model.md` and `recurring-defect-patterns.md` § Pattern 1 both cover
*isolate* failures, but Pattern 1 is specifically the **linked-elements / activity-panel** isolate
path (`use-linked-element-actions.ts`), reached from the schedule/link panel — a metadata-vs-geometry
divergence on activity-to-element mappings. This ticket's entry point is the **context-menu**
"select same type" → "isolate selected" path in the Web Editor/Viewer, which is a **different**
code path end to end (confirmed by reading both — no shared function or store between them beyond
the viewer instance itself). Do not reuse Pattern 1's remediation runbook here; it does not apply.

## Code trace (verified this run, file:line cited throughout)

**Select same type** — `use-context-menu-actions.tsx:240-289` (`selectSameTypes`), menu entry wired
at `viewer-context-menu.tsx:56-57`. Computes matching dbIds via family-tree matching
(`select-same-family.ts`) and writes them straight into the **Forge native selector**:
`viewer.impl.selector.setAggregateSelection(aggregateSelection)` (`use-context-menu-actions.tsx:284`)
— it does **not** go through any app-level selection store directly.

**Bridge, native selection → app store** — `selection-service.ts:305-426`. Forge fires
`AGGREGATE_SELECTION_CHANGED_EVENT`, `_handleSelectionChange` maps each dbId to an `elementId` via
`modelDbId2ElementId` and only then calls `selectionStore.setSelectedElements` (`:401`, `:425`).
**A dbId with no entry in `modelDbId2ElementId` is silently dropped** — `console.warn` only, no user
-visible signal (`viewer-service.ts:674`).

**Isolate selected** — `use-context-menu-actions.tsx:99-104` (`isolateSelected`), menu entry at
`viewer-context-menu.tsx:68-69`. Reads `viewerService.getAggregateSelection()`
(`viewer-service.ts:636-684`), which is built **only** from `projectService.selectionStore
.selectedElements` (the app-store copy, not the Forge native selection directly) — so isolate sees
whatever survived the bridge above, never the raw "select same type" result. The aggregate selection
is then handed to `filterService.onIsolatedSelectedThroughMenu` (`filter-service.ts:658-664`).

**The empty-selection branch** — `filter-service.ts:678-692`. When the incoming selection is empty,
`applyFilters` takes the `isolatedNodesCache.length === 0` branch and calls `cacheIsolatedNodes`
instead of `setAggregateIsolation`; because this call sets `executedOutsideFilterPanel = true`, the
usual `viewer.showAll()` reset is **also skipped**. Net effect: nothing on screen changes, no error,
no dialog — exactly "doesn't let them isolate them."

## Hypothesis — not verified end-to-end, this is what a live check would settle

If any dbId returned by `selectSameTypes` (family-tree matching, `select-same-family.ts`) has no
entry in `modelDbId2ElementId` — plausible for family/leaf-descendant dbIds the map may not cover,
or for NWD-sourced models generally — the bridge silently drops it. If **all** matched dbIds are
dropped, `selectionStore.selectedElements` ends up empty, `getAggregateSelection()` returns `[]`,
and isolate takes the empty-selection no-op branch above. This would explain a **hard** no-op
(nothing isolates) specifically following "select same type", while isolate on a normally-clicked
selection works fine (different entry point, same bridge, but rarely encounters unmapped dbIds
because a user can only click on rendered, mapped geometry in the first place).

**What is NOT yet verified:** whether `modelDbId2ElementId` actually has gaps for this project's
models, and whether the customer's video shows a hard no-op vs. a partial one. Both determine
whether this is the right mechanism at all.

## What remains unverified

- Whether `select-same-family.ts`'s family-tree matching can return dbIds for elements outside the
  model's mapped set (this session read the function but did not instrument it against a live model).
- Whether a `console.warn` from `viewer-service.ts:674` actually fires during the customer's repro —
  the screen recording would show this if the browser console were open, but was not visible to us
  (media unopenable, see above).
- Whether this reproduces on more than one project — only LVN1-2 reported so far, cohort unknown.

---

## 2026-09-10 (later run) — independent confirmation of the mechanism, plus a decisive check

This run re-derived the trace above from source without having read this file first (it was written
by the 08:00 sweep, commit `638434d`). It landed on the **same** chain, by the same file:line hops:
`isolateSelected` → `viewerService.getAggregateSelection()` → `selectionStore.selectedElements` →
the `modelDbId2ElementId` gate in `_handleSelectionChange` → the empty-selection no-op branch in
`applyFilters`. Two independent reads converging is worth recording; it does **not** upgrade the
hypothesis to verified — both reads are static, and neither instrumented a live viewer.

**One detail the earlier note doesn't have, which sharpens the case.** `selectSameTypes` already
runs its matched dbIds through a filter before selecting them — `buildAggregateEntry`
(`use-context-menu-actions.tsx:214-238`) calls `filterByVisibilitySets` with `hiddenNodes`,
`isolatedNodes` **and** `disabledDbIds` (`projectService.modelId2model.get(model.id)?.disabledDbIds`).
So the code already has a platform-side notion of "dbIds this app knows about" at the exact point
where it builds the selection — but it filters on *visibility*, never on whether the dbId resolves
through `modelDbId2ElementId`. That asymmetry is the shape of the bug: the selection is allowed to
contain ids the isolate path structurally cannot act on. It also suggests where a fix goes —
`buildAggregateEntry` is the natural place to either drop unmapped ids or count them for a message.

**Replace the eyeballed console check with this.** The 08:00 note asks for
`selectionStore.selectedElements.size` compared against "what's highlighted on screen", which is a
judgement call on a dense model. Both numbers are readable directly, so compare them:

```js
// after Select same type, BEFORE clicking Isolate. Read-only.
const vs = window.projectService.viewerService
const forge = vs.viewer.getAggregateSelection()
  .reduce((n, s) => n + (s.selection || s.ids || s.dbIdArray || []).length, 0)
const app = vs.getAggregateSelection().reduce((n, s) => n + s.ids.length, 0)
console.table([{ forge, app, dropped: forge - app }])
```

Note the two `getAggregateSelection` are **different functions** — `vs.viewer.…` is Forge's native
selection, `vs.…` is the app-store reconstruction (`viewer-service.ts:636`). That is the whole bug
in one line.

- `app === 0` while `forge > 0` → the hard no-op is fully explained; hypothesis confirmed.
- `0 < app < forge` → the bridge drops *some* ids; expect a partial isolation, not a no-op.
- `app === forge` → hypothesis is wrong, fault is downstream in `filter-service.ts`. Per the
  2026-09-09 Forge-BoxSelection lesson: measure before believing our own layer is at fault.

Watch the console for `No data found for key:` (`viewer-service.ts:674`) during the same action —
that warning firing is a second, independent signal of the same drop.
