# PLT-2447 — Select Activity / Panel details: multiple UX issues

- **Type:** Bug · **Priority:** Medium · **Repro:** 5/5
- **Jira status:** Analysis In Progress
- **Domain:** Viewer / Editor — right-panel context menus + element selection / ghosting (see `dashboard/viewer-and-model.md`)
- **Related:** PLT-1717 (Closed) — back-nav from Activity Details to Element Properties, linked elements selectable

## The three reported issues

1. Opening/closing the 3-dot menu (or clicking outside it) **reverts the model
   to home view**.
2. **"Select Elements"** from the 3-dot menu **drops a prior multi-selection**
   (Shift+click highlight).
3. Both contextual menus can be **open at the same time**.

## Domain findings (from prior analysis)

- Linked-elements highlight uses **ghost + isolate + fitToView**; its cleanup
  runs `showAll()` + un-ghost → likely cause of the "home view" revert (#1).
- The Shift+click highlight (ghost isolation) and the menu's **Select** action
  use **different selection paths**; Select drops parent/directory nodes with
  no `dbId` (#2).
- The two menus are backed by **3 independent state stores**; making them
  mutually exclusive is a small refactor to a shared coordinator (#3).
- Ghosting/selection carries regression risk — touch carefully.

## Current state: AWAITING-CLARIFICATION (since 2026-07-10)

Clarification left on Jira (comment 107120). Open questions — do NOT dev until
answered, do NOT re-ask:

1. Exact expected camera behaviour on menu open/close — should the
   isolated/fitted view be fully preserved?
2. Should "Select Elements" preserve the highlight, and include children of
   selected parent nodes?
3. Confirm mutual-exclusion is the desired fix for the double-menu issue.
4. Split the 3 bugs into separate tickets? (regression risk + distinct
   mechanisms)

## Next run

- If Jira has replies → fold in, decide split vs single, set READY-FOR-DEV,
  branch `PLT-2447` (or per-issue branches) off latest master.
- If still no reply → leave as-is, no action.

---

## Run log — 2026-08-01

**Status has moved on since the AWAITING-CLARIFICATION note above — that section is stale.**
Jira is now **In Code Review**; PR #2054 is open (not draft), reviewers requested.

What actually shipped (2 of the 3 reported issues):
1. **Camera revert on menu dismiss** — fixed by making `useGhostedHighlight` *idempotent*
   (signature of the applied highlight; re-committing the same node set is a no-op), plus folder/model
   rows now highlight their descendants instead of falling through to the `showAll()` reset path.
2. **Both menus open at once** — `useContextMenu` ignores right-clicks whose target is outside the tree
   container (MUI portal events bubble through the React tree, not the DOM). Still `preventDefault()`s.
3. **"Select Elements" drops multi-selection** — **NOT in this PR.** Root-caused as a
   `setAggregateSelection`-in-a-loop bug in `useActivityMenu`; deliberately left out, flagged in the PR
   description as a separate raise. **This is the outstanding half of the ticket.**

Review threads: 2 from Copilot, **both resolved** — (a) `addItemDbIds` could reintroduce whole-model
isolation via a container's own dbId → hardened in `116144b`; (b) an accidental `CANVAS_API` localhost
override swept into the branch → reverted in `ed425d9`. **0 open threads.**

⚠️ **Scope note:** the branch also carries `7b7c4d3` "Hide Portfolio Settings until the portfolio dashboard
flag is on" (Header.tsx, Header.test.tsx, usePortfolioSummary.ts) — unrelated to this ticket. It is an
*increment on top of* master's PLT-2936 (`ec30214`), which already gates the button but still renders the
modal and still fires `listPortfolios` when the flag is off. Merged clean; the branch version supersedes.
Already disclosed in the PR description ("Also in this PR — unrelated, flagging it explicitly"), so no
extra comment was posted. A reviewer may still ask for it to be split.

- CI: red only on the repo-wide Trivy `brace-expansion` CVE. Sonar green.
- Checkpoint 3: merged `origin/master` (`28e03c3`) in — was 1 behind. Clean.

## Next run
- Consider raising the "Select Elements" multi-model bug as its own ticket — it is the unfinished third
  issue and the ticket cannot close without it.

---

## Run log — 2026-08-03 (second pass — Darminder's new finding, FIXED)

**The ticket's "outstanding half" is now closed.** Darminder reported (relayed by Ilia, not posted to
Jira/GitHub) that in the Linked elements panel, "Select element(s)" on **any model group / layer row**
selects nothing. Investigated → **real bug, not expected behaviour** → fixed in `07dd766` on PR #2054.

### Root cause

Container rows carry no selectable geometry of their own:
- model root: `__getModelStructure.ts:155-183` → `elementId: null`, `dbId = model.getRootId()`
  (root node owns **no fragments**, so selecting it highlights nothing)
- group/layer: `createTreeNode` → real `dbId`, `elementId` null (only real elements map to elementIds)

`useElementSelection.selectElements` was a flat filter — `nodes.filter(n => n.data.dbId)` — with no
descent, so a container contributed only its own useless dbId. `useContextMenu` additionally gated the
item on `some(n => n.data.elementId)`, which **greyed it out** for every container.

⚠️ **This PR had already fixed the same bug on the *highlight* path** (`addItemDbIds` recurses,
excludes the container's own dbId) and left the *selection* path untouched — so a folder row would
ghost-isolate its children but not select them. **Lesson: when a row-resolution rule is fixed in one
path, grep for every other path that resolves rows.** There were three (highlight, context-menu
select, activity-menu select).

### What shipped

1. **new `hooks/collectSelectableDbIds.ts`** — the descendant rules extracted out of
   `useGhostedHighlight` into one shared collector, now used by highlight + both selection paths.
   Single source of truth for "what does this row resolve to".
2. `useElementSelection.selectElements` — collector + **one** `setAggregateSelection`.
3. `useContextMenu` — `hasSelectableElements` (collector-based) gates "Select element(s)";
   separate `hasLinkedElements` (elementId) still gates unlink.
4. `useActivityMenu.showSelectedIn3D` — **also fixed the ticket's original issue #2**: it grouped by
   model and called selection once per model, and each call *replaced* the previous aggregate
   selection, so multi-model selections collapsed to whichever model was last. Now one call.
5. Removed now-dead `selectElementsByIds`, incl. its `models[0] // Fallback to first model` branch.
6. 26 unit tests total on the panel (8 new collector, 5 new selection, 4 new menu-availability).

### Deliberate non-changes (defend these in review)

- **Unlink stays non-recursive**, still gated on a real `elementId` — destructive, a container row must
  not unlink everything beneath it.
- **Selecting a container selects its *linked* descendants, not the whole model.** The tree is already
  pruned to linked elements (`pruneTreeByDbIds`), so children present == the linked set. Deliberately
  differs from Model Layers' `_selectWholeModel`, which also isolates + `fitToView` — this panel must
  not move the camera, which is bug #1 of this very ticket.
- **`selectAllElements` keeps `visibleNodes`.** Looked like it needed the full tree, but each visible
  row's `data` carries its whole subtree and the collector descends into it — so a collapsed group now
  contributes its children, while an active search still narrows to what's on screen. Using
  `treeApi.root.children` would have ignored filtering *and* leaned on an unverifiable API
  (no `node_modules` locally to typecheck against).

### Established platform rule (worth reusing)

Container rows resolve to descendants — this is how Model Layers has always behaved:
`model-browser-service.ts:327-330` ("Only expand to descendants for container nodes (no element ID)")
plus `_selectWholeModel` for model roots. Any new tree surface should follow it.

### Status

- Branch rebased onto `3dddb9d`; **#2072 landed on master**, so the repo-wide Trivy red should clear.
- PR description rewritten to cover all four defects + test steps 11-16. Comment left for Darminder.
- Darminder's standing `CHANGES_REQUESTED` (24 Jul) is still open — he was re-requested 02 Aug and is
  mentioned on the new comment. **Do not re-request again.**
- Still carries the unrelated `7b7c4d3` portfolio-gating commit; a reviewer may ask for a split.
