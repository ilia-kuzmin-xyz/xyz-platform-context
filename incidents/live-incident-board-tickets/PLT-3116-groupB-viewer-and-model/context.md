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

---

## 2026-09-11 (scheduled) — unchanged since 2026-09-10

Fetched fresh via `getJiraIssue` (fields incl. `comment`, `attachment`, `status`, `updated`).
**VERIFIED:** status still **Open**, assignee still Darminder Atker, `updated` field is
`2026-09-09T18:11:51.719+0100` — the timestamp of comment `111798`, i.e. no activity since the
09-10 run read this ticket. Comment thread is unchanged: still exactly the two comments already in
this file (`111797` Freshdesk auto-note, `111798` Yash's repro note incl. session id
`platform-web-70e55a74-4834-49e2-8a87-a6f9bf98c1fb`). Attachments unchanged: still the same three
(`64256`, `64257`, `64258`), all already flagged below as 403-on-content per the 2026-09-08 standing
rule — not re-flagging as new.

No new information to investigate against, so the hc-frontend code was **not** re-read this run;
the 09-10 entry's independent two-read confirmation of the mechanism stands as the current state.
The drafted console check (`forge`/`app`/`dropped` table, above) has still not been run/confirmed by
a human. Nothing here supersedes any prior section.

---

## 2026-09-14 (scheduled run) — second, independent candidate mechanism found in the same function

Re-fetched the ticket fresh (`comment`, `attachment`, `status`, `updated` in fields). **No change since
09-11:** same two comments (`111797`, `111798`), status still Open, assignee still Darminder, `updated`
timestamp unchanged at `2026-09-09T18:11:51.719+0100`, same three attachments, still 403 on content —
not re-flagging as new. The 09-10 hypothesis (`modelDbId2ElementId` bridge drop → empty selection →
empty-selection no-op branch) is neither confirmed nor ruled out; its console check has still not been
run by a human.

This run re-derived the same static trace as the two prior entries (three independent reads now agree),
then kept reading `filter-service.ts`'s `applyFilters` (`:666-712`) past the point where the earlier
entries stopped — past the *empty*-selection branch they describe, into the branch that runs when the
selection is not empty.

**New finding: a second, separate branch in the same function can also fully explain "isolate does
nothing," with no dependency on the bridge-drop hypothesis at all.** `applyFilters` only calls
`viewer.setAggregateIsolation(this.isolatedNodesCache)` when `getModelActiveFilterCount() === 0`
(`filter-service.ts:682-685`) — i.e. only when no discipline / package / level / room / progress /
status / category filter is currently selected in the editor's Filters panel. Whenever any one of
those is active, the function takes the `else` branch unconditionally (`:700-708`) and calls
`filterAndApplyElements`, which rebuilds visibility purely from the filter-panel state
(`elementId2ModelMongoDbIdWithForgeDbId` filtered by `_filterElement`) and never reads
`isolatedNodesCache` at all. So a non-empty, correctly-resolved menu selection can be silently thrown
away the moment isolate is applied — no error, no message; the isolation is cached in memory
(`this.isolatedNodesCache`) but never handed to the viewer.

Checked this is a live branch, not a guess: `getModelActiveFilterCount()` is the same method the
Filters panel itself reads to decide whether anything is active (also called at `:1010` and `:1083`),
and `onIsolatedSelectedThroughMenu` — what `isolateSelected` calls — has four live call sites project
-wide: the viewer right-click menu (`use-context-menu-actions.tsx:103`), the model-layer tree's isolate
action (`model-layer-context-menu.tsx` via `model-browser-service.ts:214,300`), and the linked-elements
panel's isolate action (`use-linked-element-actions.ts:87`). **If this mechanism is real, it is not
specific to "select same type" or to LVN1-2** — it would silently defeat every menu-driven isolate
action in the editor, on any project, the instant any Filters-panel filter is switched on.

This does not rule out the 09-10 bridge-drop hypothesis. The two are compatible and cover different
preconditions: bridge-drop needs an empty resulting selection with *no* panel filter active; this one
needs a *non-empty* selection with a panel filter active. Both stay open until one live check
discriminates them.

**What is NOT verified:** whether the customer or Yash had any Filters-panel filter switched on during
the repro (session `platform-web-70e55a74-4834-49e2-8a87-a6f9bf98c1fb`). Neither the description nor
comment `111798` says either way. This is the one fact that would confirm or rule out this mechanism,
and it needs no more code reading — only the screen recording (still 403 to us) or one fresh repro
with the Filters panel checked before clicking isolate.

### Updated discriminating check (adds to, does not replace, the 09-10 console script)

Before running the `forge`/`app`/`dropped` console table from the 09-10 entry, first look at whether
the editor's Filters panel shows any active discipline, package, level, room, progress, status or
category selection. Do this both on a fresh repro and, once a human can open it, against the screen
recording.

- No active filter chip showing, and the console table gives `app === 0` while `forge > 0` → the
  09-10 bridge-drop hypothesis is confirmed; this filter-panel mechanism is not what happened here.
- One or more active filter chips showing, regardless of what the console table gives → this run's
  mechanism is at least in play; confirm by clearing every filter, repeating "select same type" →
  "isolate selected," and checking whether isolation now works with the panel empty.
- An active filter chip showing **and** the console table gives `app === 0` → both mechanisms may be
  layered; clear the filters first, then re-test the bridge-drop hypothesis on its own.

## 2026-09-15 (scheduled) — confirmed unchanged, ticket now 6 days old with zero dev reply

Live `getJiraIssue` re-fetch (full fields incl. comments/attachments): status still **Open**,
assignee still Darminder Atker, still **2 comments**, newest still `111798` (09-09), same 3
attachments (2 PNGs + the screen recording). Neither candidate mechanism (bridge-drop, filter-panel
override) has been checked against a live session since 09-10/09-14 — the drafted console check in
`recommended-action.md` is still unposted and unrun. No re-investigation performed.

## 2026-09-16 (scheduled) — confirmed unchanged, ticket now 7 days old with zero dev reply

Live `getJiraIssue` re-fetch (full fields incl. comments/attachments): status still **Open**,
assignee still Darminder Atker, still **2 comments**, newest still `111798` (09-09), same 3
attachments. Neither candidate mechanism has been checked against a live session. The drafted
console check is still unposted and unrun. No re-investigation performed.

## 2026-09-17 (scheduled) — confirmed unchanged, ticket now 8 days old with zero dev reply

Live `getJiraIssue` re-fetch (full fields incl. comments/attachments): status still **Open**,
assignee still Darminder Atker, still **2 comments**, newest still `111798` (09-09), same 3
attachments. Neither candidate mechanism has been checked against a live session. The drafted
console check is still unposted and unrun. No re-investigation performed.

## 2026-09-21 (scheduled) — moved to Group B: status now Dev In Progress

Live `getJiraIssue` (`status`, `assignee`, `comment`, `updated`): status is now **Dev In Progress**
(Open → Dev In Progress since 09-18), assignee is now **Rishi Bhugobaun** (changed from Darminder
Atker). `updated` = `2026-09-18T17:30:52+0100`. Still exactly **2 comments** — no new comment since
`111798` (09-09) — and same 3 attachments, still unopened (403, standing gap). One line of status per
this run's instructions (Group B — detailed pass deferred): dev has picked this up and reassigned to
Rishi; neither candidate mechanism (bridge-drop / filter-panel override, both above) has been
confirmed or ruled out yet, and the drafted console check is still unrun. Folder renamed this run:
`PLT-3116-groupA-viewer-and-model/` → `PLT-3116-groupB-viewer-and-model/`.
