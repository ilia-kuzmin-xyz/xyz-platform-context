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

---

## 2026-09-02 — MEASURED ON LIVE PROD. It is not over-linking. It is a MOVE, and it is exactly reversible.

The prior pass listed "exact scale of the over-link" as unverified and had no prod access. Measured
now via the prod MCP (ATL08 is on the prod whitelist, so no browser token is needed — the platform-API
token route is not required for this). **Read-only throughout; no write tool exists on the prod MCP.**

### What actually happened

`CY-1300` = activityId `9136f5b1-735c-47de-9fd8-00c325acfdbd` (stable across all schedule revisions).

`xyz_get_projects_project_id_elements_activity_links` accepts a `lastSyncDateTime`/`endSyncDateTime`
window, which isolates the event precisely:

| finding | value |
|---|---|
| link changes, 2026-09-01 15:00–18:00 UTC | **2,478 rows** |
| distinct activities touched | **exactly 2** |
| `CY-1300` rows | 1,239, **all `isDeleted = false`** (created) |
| `CY-1250` rows (`eb5a58bf-306e-4501-ad5e-2633599d2f28`) | 1,239, **all `isDeleted = true`** (removed) |
| are the two element sets identical? | **YES — 1,239/1,239 overlap, 0 only-in-either** |

**So 1,239 elements were MOVED from `CY-1250` to `CY-1300`.** Not new links on unlinked elements —
a re-link of an already-linked set. An element holds one activity link, so linking a
previously-linked element to a new activity moves it.

### Timing — matches the customer's account exactly

Bisected: **all 2,478 rows fall in 2026-09-01 15:55:00Z–16:00:00Z**, i.e. **16:55–17:00 UK (BST)**.
The customer said "approximately 5:00 PM UK time". Confirmed.

### Nothing has happened since. The state is clean to reverse.

Widened to **2026-09-01 00:00Z → 2026-09-02 10:00Z: still exactly 2,478 rows.** Those 1,239 moves
are the *only* activity-link changes on ATL08 in that whole period. No later edits sit on top, so a
reversal today restores the exact prior state with no arbitration needed.

### Current totals

`CY-1300` now holds **3,461** linked elements (`recordCount`, not a page count). 1,239 of those
arrived in the incident, so it held **2,222** before. `CY-1250` lost 1,239.

### Reversal is precise, and the list is committed

`analysis/PLT-3099-ATL08-CY1300-moved-elements.csv` — all 1,239 `modelElementId`s with source and
destination activity ids. Reversal = unlink those 1,239 from `CY-1300`, relink to `CY-1250`. Nothing
else is affected.

**Not executed.** Standing instruction for this session was GET-only, and the prod MCP exposes no
write tool for activity links regardless — remediation has to go through platform-api, as recorded in
`incidents/prod-mcp-access.md`.

### This reframes the over-linking mechanism

The prior pass's leading theory was parent-node expansion in
`SelectionService._handleSelectionChange()` (a container dbId with no element id of its own pulling in
all children). **The data points elsewhere:** the moved set is *exactly* `CY-1250`'s existing link
set, no more and no less. A parent-expansion would pull in whatever sits under one tree node — there
is no reason that would coincide precisely with another activity's link set.

The far better fit: **the selection at the time contained `CY-1250`'s linked elements** — e.g. the
customer had used "Select linked elements" on `CY-1250`, or isolated them — and then linking to
`CY-1300` moved every one of them. `linkSelectedElements()` (`linking-service.ts:365-415`) links
whatever is in `selectionStore.selectedElements` with **no count confirmation and no comparison
against what is visibly highlighted**, which is exactly the missing guard.

**Do not drop the parent-expansion theory entirely** — it may still explain how the customer's
*visible* click became a large selection — but the 1,239 == `CY-1250` coincidence is the stronger
signal and should be checked first.

### Correction to the ticket's framing

Yash's comment asks us to investigate "why the linking operation ignored the current visible
selection/filter and **linked additional elements**". Strictly, nothing additional was linked: 1,239
elements were **taken off `CY-1250`**. That matters for the reply, because the customer's real
exposure is that **`CY-1250` silently lost its links**, which they have not noticed yet and which
their own screenshot of `CY-1300` would not show.

## 2026-09-02 — the Ctrl+Z half is ANSWERED: the fix exists and 26.3.6 has not been released

Ilia recalled this from the AT10X incident; verified against live Jira.

| ticket | status | fixVersion | released |
|---|---|---|---|
| **PLT-3084** — AT10X, "undo/Ctrl Z not working properly in web viewer" | Ready For QA | **26.3.6** | **false** |
| **PLT-2743** — "Remove double source of truth for element installation/linking state in V2 viewer" (the fix) | Ready For QA | **26.3.6** | **false** |

Ilia's own comment on PLT-3084 (110366, 2026-08-25): *"the issue has been resolved by PLT-2743 which
will be a part of 26.3.6 release"*. The registration is present in `master`
(`ViewerPage/services/linking/linking-service.ts:55-56`, `registerHistoryCallbacks(HistoryType.Link, …)`).

**So Kyriakos's Ctrl+Z did nothing because ATL08 prod runs a build predating 26.3.6, which has never
shipped.** No new defect, no investigation needed on this half — it is release-pending.

### Two corrections to earlier passes in this folder

1. **"Stale build" is the wrong framing.** The earlier note described AT10X as running a *stale*
   build, implying prod had fallen behind. It has not: **the fix has never been released to anyone.**
   Every project on prod has had non-functional linking-undo continuously since the regression.
   PLT-3099 is therefore the **second customer incident caused by the same unreleased fix**, eight
   days after the first.
2. **Attribution.** This folder credited PR #2081 / commit `4ad83a7` (2026-08-07) with restoring the
   registration. Jira attributes the resolution to **PLT-2743**. Both may be true (a restore plus a
   wider refactor), but PLT-2743 is what the release is tracked against and is the correct reference
   in any reply. Not reconciled further — it does not change the conclusion.

### The console check in `recommended-action.md` is now unnecessary

That pass proposed running `window.projectService.linkingService.constructor.toString()` against
ATL08 to test for a missing registration. **Skip it.** The Jira release state answers the same
question with no browser session: the code has the registration, the release carrying it is not out.

### What this leaves open on PLT-3099

Of the four questions the ticket really contains:

| # | question | state |
|---|---|---|
| 1 | why did the selection hold `CY-1250`'s 1,239 links instead of the visible pick | **open** — see the 09-02 measurement section above; PLT-3100 raised for the missing guard |
| 2 | why did Ctrl+Z not work | **answered** — 26.3.6 unreleased |
| 2b | can undo be used to recover now | **no** — undo is browser-session state, that session is long gone; recovery is a data operation regardless |
| 3 | can the links be restored | **yes, exactly** — 1,239 ids in `analysis/PLT-3099-ATL08-CY1300-moved-elements.csv`, no other link changes on ATL08 since |
| 4 | what about `CY-1250`, which silently lost 1,250 links | **not asked by anyone**, not in the ticket, customer unaware |

### ⚠️ Worth raising internally, not with the customer

**26.3.6 has been sitting unreleased since at least 2026-08-25 and is now blocking a second customer
incident.** That is a release-scheduling question, not an engineering one, and it is the single
cheapest thing that would stop this recurring.

---

## 2026-09-02 (later) — ⛔ THE 09-02 "MOVE" FINDING ABOVE IS WRONG. Retracted, with the checks that killed it.

Ilia asked for a deeper self-review. It found that the section above ("It is not over-linking. It is
a MOVE") is **false**. Three claims retracted:

| claim | verdict | evidence |
|---|---|---|
| "An element holds exactly one activity link, so linking moves it" | **FALSE** | **3,024 elements are currently linked to BOTH `CY-1250` and `CY-1300`.** Multiple activity links per element are normal. |
| "1,239 elements were MOVED from `CY-1250` to `CY-1300`" | **FALSE** | All 1,239 are in **both** activities' current link lists. They were **added** to `CY-1300`; nothing left `CY-1250`. |
| "`CY-1250` silently lost 1,239 links" | **FALSE** | `CY-1250` holds **4,521** links, all 1,239 among them. |
| "The moved set was *exactly* the source activity's existing link set" | **FALSE** | 1,239 of 4,521 is 27%, and none were removed. The coincidence that made this theory attractive does not exist. |

Verification, deliberately redundant after being wrong twice:

- `CY-1250` = 4,521 links, `CY-1300` = 3,461 — **stable across two fetches at different `size` values**, identical element sets both times.
- Set intersection: **3,024 elements in both.**
- All 1,239 incident elements: present in `CY-1300` **and** present in `CY-1250`, 0 in neither.
- Five individual element ids spot-checked one at a time — all in both.

### So the customer was right and the correction was wrong

Kyriakos reported that linking "linked all the elements in the area". That is what happened: **1,239
links were created on `CY-1300`** that he did not intend. Nothing was taken from anything. The
original framing on the ticket, and the prior pass's framing, were correct.

### The error, named so it is not repeated

**`isDeleted` rows in `xyz_get_projects_project_id_elements_activity_links` were read as domain
deletions without checking current state.** That endpoint is a **sync change feed**, not a statement
of truth. It emitted 1,239 `isDeleted: true` rows against `CY-1250` in the incident window while
those links remain live today. One query against the activity's current link list would have caught
it; it was not run until challenged.

**What those `isDeleted` rows actually mean is UNKNOWN.** Candidates: the feed emits a
supersede pair (old mapping row deleted, new one created) when an upsert rewrites a row; or the
mapping ids changed. `usp_InsertModelElementActivityMapping` and the mark-as-inactive path are
stored procedures whose SQL is not in the platform-api checkout. **Do not guess this again — read
the proc or ask api-v2 (Sachin/Ali).**

### What still stands, and is safe to rely on

- **1,239 links created on `CY-1300`** between **2026-09-01 15:55–16:00 UTC** (16:55–17:00 UK).
  Matches the customer's "approximately 5:00 PM UK".
- Those 2,478 feed rows are the only activity-link changes on ATL08 from 1 Sep 00:00Z to 2 Sep 10:00Z.
- `CY-1300` holds 3,461 links now, so **2,222 before** the incident.
- `analysis/PLT-3099-ATL08-CY1300-moved-elements.csv` still lists the correct 1,239 element ids —
  but its `previousActivity_*` columns are **misleading** and should be ignored; those elements were
  not taken from `CY-1250`.

### Reversal — simpler and safer than the retracted version claimed

**Remove the 1,239 links from `CY-1300`. `CY-1250` needs no change at all.** No restoration, no
arbitration about which activity should own what. Since elements can hold several activity links,
removing these does not orphan anything.

### The draft comment in `recommended-action.md` must not be posted

It leads with "1,239 elements were moved off CY-1250" and asks the customer to confirm CY-1250 should
get them back. **Both are false.** Superseded — see the dated section appended to that file.

### PLT-3100 corrected

The ticket raised for the missing guard has been rewritten (summary now "Linking writes a large
selection with no count shown and no confirmation") with both false claims removed and an explicit
corrections section. The engineering ask is unchanged and still valid: linking writes whatever is in
the selection with no count and no confirmation.

---

## 2026-09-02 (afternoon) — ROOT CAUSE FOUND in FE code. The customer named it, and the code confirms it.

### First, a process failure to record

The **retracted** draft was posted to the ticket as comment `111080` (09-02 11:39) before the
falsification was found (~13:00). So the ticket publicly states that 1,239 elements were "moved off
CY-1250", that "an element holds only one activity link", and that "CY-1250 lost 1,239 links" — **all
three false.** Yash relayed it and the customer agreed to a "revert to CY-1250" that is not the
operation needed. Anything written on this ticket before ~13:00 should be read against the retraction
above.

### The customer's reply is the breakthrough (comment `111085`, 09-02 11:53)

Two things in it:

1. They **confirmed** the elements can go back to `CY-1250`.
2. **They described the workflow, and it is the answer:** they *"intentionally selected and linked
   approximately **400 visible elements** while working with a **section box** and **isolated element
   types**"*, yet 1,239 were linked. Their own hypothesis: *"the selection may have included
   non-visible elements within the dragged selection area, even though those elements had been hidden
   and were not intended to be linked."*

1,239 − ~400 ≈ 839, against their "~800 additional". Consistent.

### VERIFIED in code — drag-select honours the section box and filters, but NOT isolation

`viewer-x/components/services/selection-service.ts`, `_handleButtonUp` (~`:111-153`) takes the raw
Forge box selection and filters it **twice**:

| filter | applied? | mechanism |
|---|---|---|
| section box / cut planes | **yes** | `getElementsInsideSectionBox(s.ids, model, viewer, false, false, 1)` — fragment world-bounds vs `viewer.getCutPlanes()` (`section-box-helper-functions.ts`) |
| active filters | **yes** | `_filterBoxSelectionByAllowedDbIds(...)` when `filterService.getModelActiveFilterCount() > 0` |
| **isolation / hidden elements** | **NO** | nothing in that path reads `getIsolatedNodes`, `getHiddenNodes` or `isNodeVisible` |

`getElementsInsideSectionBox` is purely geometric — it never consults visibility either.

**The bitter detail:** this same file *does* track isolation, at `_handleIsolationChange:156-182`,
storing it via `selectionStore.setIsolatedElements()`. **The data is already there and this path
never uses it.**

### Why this is a bug and not by design

The code already establishes the principle twice over — a drag should select only what the user has
narrowed to (section box, filters). **Isolation is the same class of narrowing and is the one case
missed.** That is an inconsistency, not a deliberate choice.

### This SUPERSEDES the parent-node-expansion hypothesis

The 09-01 pass proposed `SelectionService._handleSelectionChange()` expanding a container dbId into
all its children (`:380-393`). That remains real code, but it is **not needed** to explain this
incident and is not the better-evidenced cause. The isolation gap explains the exact numbers and the
exact workflow the customer described. **Do not lead with parent-expansion again.**

### Remediation, corrected

**Remove the 1,239 from `CY-1300`. `CY-1250` needs no change** — it holds all 4,521 of its links
including those 1,239. Needs a platform-api write (Sachin or Ali); **no owner lined up yet, so do not
promise timing.**

### The fix

`selection-service.ts:_handleButtonUp` — apply the same treatment against the viewer's
isolated/visible set that `_filterBoxSelectionByAllowedDbIds` already gives the filter case, one step
after `getElementsInsideSectionBox`. Small, and mirrors a pattern two lines above.

**Two things not verified:** whether hidden-by-**hide** behaves the same as hidden-by-**isolate**
(different Forge mechanisms; only isolation was reasoned about, because that is what the customer
used), and the fix itself — hc-frontend cannot be built or run here, and this is UI behaviour that
wants a visual check rather than CI alone.

### PLT-3100 needs its Cause section rewritten

It currently names parent-node expansion as the candidate. Superseded by the above. Note that
PLT-3100's actual ask — a confirmation before writing a large selection — **is still valid and
independent**: even with isolation respected, a drag can select more than intended and there is no
count or confirmation before the write.

### Communication lesson, worth keeping

The first corrected draft opened with *"Correction to my earlier comment, I had this wrong"* and
Ilia rejected it: from the customer's side **nothing changed** — they want those 1,239 off `CY-1300`
and on `CY-1250`, which is exactly what happens either way. The correction was **less damage than we
said, not different damage.** Broadcasting our confusion into the customer channel buys them nothing.
State the accurate position, move to the action, and own the error internally.

A second draft then said *"nothing needed on their side"* and immediately asked permission to remove
the links — a contradiction Ilia caught. **The permission already existed** in comment `111085`;
asking again was both redundant and self-contradicting.
