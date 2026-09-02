# PLT-3099 — "Wrong linking in the Web Viewer - SWITCH - ATL08 -X"

New ticket, created 2026-09-01 17:17 BST, no prior folder. First pass 2026-09-01.

## Ticket

- **Project:** ATL08. **Reporter:** customer (Kyriakos), relayed by Yash. **Assignee:** Ilia Kuzmin.
  **Priority:** Major. **Status:** Open.
- **Model:** `PC-RAGAN 8.1-Model Switch EVO Bldg 6-MECH_CHW Pipes-V7`.
- **Symptom, customer's own words (via the description and Yash's comment 110991, 2026-09-01
  17:18):** tried to link a few elements to activity **CY-1300** — intending to link only the
  visible elements at the time ("only pipe insulations") — but the platform linked **all elements
  in the area** to CY-1300 instead. Customer tried **Ctrl+Z** to undo; it did not revert the
  mapping. Believed to have happened at approximately **5:00 PM UK time (2026-09-01)**, and states
  this was the **last action performed in the Web Viewer** — offered as a pointer for log tracing.
  Customer asks (a) why the operation ignored the intended selection and linked more, and (b)
  whether the mapping can be reversed/restored.
- One comment on the ticket (110991, Yash Patel, 17:18): relays the above verbatim and attaches one
  screenshot. No dev-side reply yet.

Two genuinely separate questions are bundled in one ticket: **why did linking over-select**, and
**why did undo not undo it**. Treated separately below because the code paths are unrelated.

## Media — unopenable, flag for human

One attachment: `Screenshot 2026-09-01 185949-20260901-161822.png` (Jira-hosted, behind Atlassian
auth). This environment has no authenticated fetch path for Jira attachment content (`WebFetch`
refuses authenticated services; no Atlassian MCP tool here exposes attachment bytes). **Not
opened.**

What it would settle: whether the over-selected set reads as **one whole system/category**
(consistent with the parent-node-expansion hypothesis below — e.g. all of a pipe run's insulation
*and* the pipes themselves, or a whole branch) or as a **scattered/arbitrary** set (which would
argue against that hypothesis and point somewhere else, e.g. a stale multi-select left over from
an earlier click). Also would show whether the model tree, if visible in the shot, highlights a
single parent/category node rather than many individual leaves — the more direct tell.

## Preliminary defect-pattern check

The task brief for this run named a specific prior "linking" incident history (PLT-2702, PLT-2749,
PLT-2612, PLT-2685, PLT-2705, PLT-2673, described as all now Done). **That history does not exist
anywhere in this repo** — grepped `recurring-defect-patterns.md`, the whole
`live-incident-board-tickets/` tree, and every ticket number individually; zero matches for any of
those six IDs anywhere in `xyz-platform-context`. Not asserting they don't exist in Jira, only that
there is no note of them here to build on, so this is a genuine first pass, not a pattern-matched
one. What the repo **does** already have on "linking" is more specific and more useful than that
list would have been — see next section.

## PLT-3084 is the same symptom on a different project, and it was fully root-caused a week ago

`PLT-3084-resolved-viewer-and-model/` (AT10X, "undo/Ctrl-Z not working properly in web viewer"),
closed out 2026-08-24/26. Read in full this run. Its core finding, **proven live on prod, not
inferred**: `LinkingService` registers its `HistoryType.Link` undo/redo callbacks in its
constructor (`linking-service.ts:56-59`, confirmed present in **this** checkout too), but the
regression introduced when the V1 linking wrapper was deleted (PLT-2610/2611) meant that
registration was missing on master until it was restored by PR #2081 (commit `4ad83a7`, merged
2026-08-07). **A build predating that commit links elements successfully but can never undo a
link, on any project, 100% of the time** — `historyService.undo()` finds no callback for
`HistoryType.Link`, logs an error, and silently purges the link entries
(`history-service.ts:49-54`). AT10X's prod was found to be running exactly that stale build.

**This is a strong candidate for the "Ctrl+Z did nothing" half of PLT-3099**, and if it's the
cause it needs zero new code — PLT-3084's fix is already "ship a newer build." The falsifiable
check is identical to the one that resolved PLT-3084 and needs no new tooling:

```js
window.projectService.linkingService.constructor.toString()
```
run in ATL08's browser console (enable `window.projectService` via the `feature-flags` cookie,
`enableGlobalWebViewerAPI: true`, per PLT-3084's notes — append to the cookie, never replace it, or
other flags revert). An empty constructor body (no `registerHistoryCallbacks` call) means ATL08 is
on a stale build too, same root cause, same fix (ship a current build). A constructor that *does*
call `registerHistoryCallbacks(HistoryType.Link, …)` rules this out and points at one of the three
still-real, still-unfixed defects PLT-3084 catalogued on master itself (D1/D2/D3 below), or at the
selection-sharing-the-stack behaviour, which is "working as designed."

**I have not run this check.** No browser session/prod access from this environment on this ticket
(unlike PLT-3084's later passes, which had one). Flagging it as the single highest-value next step
for whoever picks this up.

### If it's not a stale build, PLT-3084 already named three live defects and one by-design behaviour that fit

All read directly in **this** checkout, current as of this run:

- **D2 — `invalidateLinks()` drops the private undo/redo stacks but never tells the global
  `HistoryService`, so the `Link` entry is left behind as an orphan.** Confirmed still present:
  `linking-service.ts`'s `invalidateLinks()` only clears `this.undoStack`/`this.redoStack` and
  emits `linkChanges$` — no call to `historyService.clearHistoryOfType`. Fires on
  `syncActivityLinks()` (project load, or `reloadSyncData` after a schedule save) and on any failed
  link/unlink. If any of those ran between the customer's link and their Ctrl+Z, the press pops an
  empty stack and does nothing, with nothing in the UI to say why.
- **Selection shares the same global undo stack as linking, by design, and this is probably the
  simplest explanation.** Every non-empty viewer selection change pushes a `Select` entry onto the
  same ordered list `HistoryService` uses for `Link`
  (`selection-service.ts:305-312,456-492`, confirmed present here). **If the customer clicked
  anything in the 3D view after the over-broad link happened — including just looking at the
  result, or trying to click an element to check it — that click pushed a `Select` entry on top of
  the `Link` entry, and the first Ctrl+Z reverted the *selection*, not the link.** No error, and
  the customer would have no way to know a selection had even been "undone" if it looked
  unchanged. PLT-3084 flagged this as "almost certainly part of what the customer experienced"
  there; it applies here with no new reasoning needed.
- **D1 — every model load/unload resets the global undo cursor to the end of the list**
  (`history-service.ts`'s `clearHistoryOfType`, wired from `viewer-service.ts`'s
  `MODEL_ROOT_LOADED_EVENT`/unload handlers). Less likely here — nothing in the customer's own
  account mentions opening or closing a model between the link and the Ctrl+Z — but worth asking
  about if the stale-build check comes back negative.
- PLT-3084's fix branch (`PLT-3084-undo-ctrl-z-linking`, commit `d0c919c`) patches D1–D3 but was
  **still unmerged** as of that ticket's last update (2026-08-26). Confirmed: this checkout's
  `invalidateLinks()` does not clear the global entry, so D2 is real on whatever master currently
  is, independent of the stale-build question above.

## The over-linking half — not covered by PLT-3084, new to this run

PLT-3084 only reported "select linked elements didn't select everything" (resolved separately, not
an over-selection) and the undo failure. **Linking too much is a different claim and needs its own
mechanism.** Read `linkSelectedElements()` (`linking-service.ts:365-415`): it links whatever is
currently in `this.projectService.selectionStore.selectedElements` — there is no size check, no
"you are about to link N elements, proceed?" confirmation, and no comparison against what's
visually highlighted. Whatever populated that selection map is what got linked.

**How that map gets populated is where the candidate defect is.** In
`SelectionService._handleSelectionChange()` (`viewer-x/components/services/selection-service.ts:305-413`),
for every selected `dbId` that has **no element-id mapping of its own** (i.e. it's a
container/grouping node in the model tree rather than a leaf element —
`this._viewerService.modelDbId2ElementId.has(mapKey)` is false), the code looks up that node's
children via `physicalParentToChildren` and adds **every one of them** to the selection
(`:380-393`):

```ts
if (!isBulkSelection) {
  for (const dbId of dbIdArray) {
    const mapKey = `${modelId}-${dbId}`
    const hasElementId = this._viewerService.modelDbId2ElementId.has(mapKey)
    if (!hasElementId) {
      const childIds = parentToChildrenMap.get(dbId) || []
      childIds.forEach(childId => {
        if (!allowedDbIds || allowedDbIds.has(childId)) {
          expandedDbIds.add(childId)
        }
      })
    }
  }
}
```

This is **not** gated to Navisworks models — it runs for any model whose instance tree has a node
without its own element id (`model-mapping-service.ts:460-513` builds `physicalParentToChildren`
generically from the Forge instance tree for any model type). No warning, no log line, no count
shown before the fact — the toast that appears during `processLinkOperation` ("Linked N of M
elements") is the only visible signal, and it only appears *after* the operation has already
started.

**Falsifiable prediction:** if the dbId(s) the customer actually picked (visually, on "pipe
insulation") resolve to a **parent/grouping node with no element id of its own** in ATL08's loaded
instance tree for this model, then `physicalParentToChildren` for that node's dbId returns every
child under it — which would be "all elements in the area" exactly as described, with no error
anywhere. This is checkable by loading the model, picking the same visual target, and reading
`viewer.getSelection()` / the resulting dbId count against what the customer intended to click,
or — cheaper — reading the console for the element/link counts in the "Linked N of M" toast that
should still be visible in the browser's own log if the tab is still open (`log.info('Link
operation completed', {...})` at `linking-service.ts:322-326`, but only if `logger.info` is
reaching the console — per `dashboard/pitfalls.md`, `info`/`debug` are no-ops without
`?logging=true`; `warn`/`error` always land, so this specific line would need that query param to
have been present).

**Why "pipe insulation" specifically is a plausible trigger:** in Revit, pipe insulation is
typically hosted by (a child of, or geometrically coincident with) the pipe it wraps. If the
dbId picked by a click actually resolves to the hosting pipe/run node rather than to the insulation
sub-element, and that node itself carries no element id, the expansion above would pull in every
child of that pipe run — plausibly reading as "the whole area" to someone expecting only the
insulation layer. **This is inferred from general Revit host/child structure, not verified against
this specific model** — I have no way to inspect PC-RAGAN 8.1's actual category hierarchy from
here.

**What would kill this hypothesis:** if the screenshot (unopenable, see above) shows a scattered,
non-contiguous set of extra elements rather than one clean system/branch, or if ATL08's model tree
for this model has no grouping nodes above leaf elements at all (i.e. every dbId already has an
element id, so the expansion branch never triggers).

## What remains unverified

- Whether ATL08's deployed prod build predates PR #2081 (the single highest-value check — see
  above). No prod/browser access from this environment on this ticket.
- Whether the customer clicked anything in the 3D view between the link action and pressing Ctrl+Z
  (settles D1/D2 vs. the by-design selection-sharing explanation). Not stated in the ticket; would
  need the customer or a session/Clarity recording.
- Whether the specific dbId(s) picked resolve to a grouping node with no element id in this exact
  model — the core of the over-linking hypothesis. Needs the model loaded against ATL08's live data,
  which this environment cannot do.
- Whether "the area" in the customer's wording means a whole system/branch (consistent with the
  parent-expansion hypothesis) or something more diffuse (which would argue against it). The
  screenshot would likely settle this and is unopenable here.
- Exact scale of the over-link (how many elements actually got linked to CY-1300) — not stated by
  the customer, not deducible from the ticket text alone.
