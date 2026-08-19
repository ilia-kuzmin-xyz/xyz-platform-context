# PLT-3060 — "Model name disappears while Opening Models with Filter Active" — triage context

## Ticket

| Field | Value |
|---|---|
| **Jira** | https://xyzreality.atlassian.net/browse/PLT-3060 (id 119897) |
| **Status** | Open · **Priority** Medium |
| **Software Area** | Web Viewer · **Project** All (not project-specific) |
| **Assignee** | Darminder Atker · **Reporter** Yash Patel |
| **Created / Updated** | 2026-08-17 14:56 / 14:58 — brand new, 1 comment |
| **Attachments** | 1 screen recording (`Screen Recording 2026-08-17 192540.mp4`, 88.8MB) — not
  viewable here (no video playback), but **not load-bearing**: the description already gives a
  complete, numbered repro with no ambiguity (see below). |
| **Domain slug** | `viewer-and-model` — ViewerPage model switcher + filter interaction |

## What was reported

Full repro from Yash himself (own words, numbered):
1. Open a model.
2. Add a Model Filter (tested with **"Progress – Linked"**).
3. Try to open Model No. 2.
4. **Model No. 2 fails to open and disappears from the available models list.**
5. Remove the Model Filter.
6. **Model No. 2 reappears** in the model list.
7. Open Model No. 2 successfully.
8. Reset the Model Filter.

Not project-specific ("Project: All" on the intake), general Web Viewer behaviour.

## Prior-ticket check (playbook step 0)

No existing folder for this mechanism before today. One sibling ticket already names the adjacent
half of it: `PLT-2882-groupA-progress-tracking/investigation-log.md:29-42` flags that
"if any model filter is active, `use-linked-element-actions.ts:47-50` intersects with
`allowedDbIdsByModel`; a model with no entry in that map drops everything silently" — that note was
about elements disappearing from a *selection*, not about a model vanishing from the *switcher tree*.
This ticket is the switcher-tree instance of the same underlying map going stale.

## Mechanism — code-verified

All paths relative to `hc-frontend/src/main/webapp/app/pages/organisation/ViewerPage/`. Checked on
branch `claude/vigilant-franklin-7k21i4`, HEAD `3e374fb`.

**1. The switcher list is filter-gated, not an unconditional "all project models" list.**
`components/viewer-x/components/blocks/model-layers/model-tree/tree.tsx:79-119` (`ModelTree`)
subscribes to `projectService.filterService.allowedDbIdsByModel$` (`:79-81`) and, whenever
`getModelActiveFilterCount()` is non-zero, rebuilds the tree via `filterTree()` (`:88-119`) before
passing it to the `react-arborist` `<Tree data={filteredData}>` (`:187`). `filterTree` keeps a node
only if:
- it's an **unloaded** model (`node.isMain && !node.isDir && !node.modelId`, `:96-99`), or
- `allowedDbIdsByModel.get(node.modelId)?.has(node.dbId)` is true for its own root dbId (`:101-104`),
- or, failing both, at least one child survives recursion (`:106-115`) — otherwise the whole node,
  **including a model that was just opened**, is dropped.

**2. A freshly-opened model has no entry in `allowedDbIdsByModel` yet — verified.** A model gets a
`modelId` as soon as it registers with the viewer (`model-browser-service.ts:100-104`,
`viewer.getVisibleModels()`), which is enough to fail the "unloaded" exemption — but the filter map
that would let it pass the direct-match check is a separate, asynchronously-populated cache.

**3. The map is skipped from refreshing specifically when a model change (not a filter change)
triggers the recompute.** `filter-service.ts:61-69` `activateViewer()` subscribes to
`elementStateService.updated$` (fires when a model's elements register) combined with the active
`_modelFilters$`, debounced 200ms, and calls `onElementsUpdate` (`:1059-1073`). With a linking filter
like Progress active (`filters.progress.length > 0`, `:1067`), it calls
`applyFilters(viewer, true)` — the `true` sets `executedOutsideFilterPanel = true`. Inside
`filterAndApplyElements`, the block that rebuilds and publishes `_allowedDbIdsByModel$` is gated by
`if (executedOutsideFilterPanel !== true)` (`:803-813`) — **when it's `true`, that publish is skipped
entirely.** The viewer's own visibility/isolation still applies to the new model, but the cached map
`tree.tsx` reads from is never updated with its entries.

**Concrete chain:** open Model 2 → it registers with the viewer, gets a `modelId` → `updated$` fires →
`onElementsUpdate` re-applies the active Progress-Linked filter with `executedOutsideFilterPanel=true`
→ the `allowedDbIdsByModel` publish is skipped (`:803`) → Model 2's root dbId (and its children) have
no entry in the map `tree.tsx:101` reads → `filterTree` drops the whole Model 2 subtree → it
disappears from the switcher, even though the user is actively trying to open it, not just viewing it
in a filtered state. Clearing the filter makes `getModelActiveFilterCount()===0` (`tree.tsx:89-90`),
which returns the raw unfiltered `data` — Model 2 reappears, matching the repro exactly at steps 5-6.

**This reads as a genuine, narrow FE bug, not a data or backend issue** — the guard at
`filter-service.ts:803` looks intentional (skip a recompute triggered outside the filter panel,
probably to avoid redundant work on every element-load tick), but it has the side effect of never
backfilling a newly-opened model into the filter map until the user re-touches the filter panel
directly (which is exactly why removing/reapplying the filter "fixes" it in the repro).

## Diagnosis

Not automatically stale-render or a timing coincidence — the code path is a specific, named guard
(`executedOutsideFilterPanel !== true`) that permanently (not transiently) omits the newly-opened
model from the filter map until the next filter-panel-triggered recompute. "Progress – Linked" is
just one of the model filters that can trigger this; nothing in `filterTree` or `onElementsUpdate` is
specific to that filter type, so the mechanism should reproduce with any active model filter, not only
Progress – Linked (unconfirmed against other filter types, but nothing in the code path suggests
otherwise).

## Confidence

- **Switcher tree visibility is gated by `allowedDbIdsByModel`, code-verified: 9/10** — direct read of
  `tree.tsx:79-119`.
- **The map is skipped on model-triggered (not filter-panel-triggered) recomputes: 9/10** — direct
  read of `filter-service.ts:803-813`, `:1059-1073`.
- **This exact chain explains the reported repro: 8/10** — every step of the mechanism traces to a
  specific line; not independently reproduced in a live session (no runtime access here), so the
  8/10 rather than 9-10 reflects "read, not run."
- **Bug reproduces with any active model filter, not only Progress – Linked: 6/10** — inferred from
  the code having no filter-type-specific branching, not tested against other filter types.

## NEEDS HUMAN

- ⚠️ The screen recording (88.8MB mp4) was not viewed — no video playback available here. Not
  load-bearing given the description's own numbered repro is unambiguous, but worth a quick watch to
  confirm no additional detail (e.g. does the model briefly flash before vanishing, consistent with
  the 200ms debounce at `filter-service.ts:61-69`?).
- ⚠️ Confirm the bug reproduces with model filters other than "Progress – Linked" (any filter that
  populates `_modelFilters$` should trigger the same `executedOutsideFilterPanel` path).

## 2026-08-19 — advanced to Group B (Open → Dev In Progress), folder renamed groupA → groupB

**Darminder Atker transitioned Open → Dev In Progress directly at 2026-08-18T15:31:48**, skipping
"Ready For Development" — no intermediate stop, and no comment accompanied the transition (still
only the original 08-17 repro comment from Yash on the ticket; our drafted mechanism handoff was
never posted). Reads as Darminder having picked this up from the description's own repro rather than
from a written mechanism handoff, and starting work independently. He remains assignee.

Per this routine's Group A/B rule, the ticket has now progressed past Group A entirely — folder
renamed `PLT-3060-groupA-viewer-and-model` → `PLT-3060-groupB-viewer-and-model`. No further
clarification needed from us; the code-confirmed mechanism (`filter-service.ts:803`
`executedOutsideFilterPanel` guard skipping the `allowedDbIdsByModel` publish on model-triggered
recomputes) stands as recorded above, worth a quick informal check with Darminder that it matches
what he's implementing, but not blocking.
