# Design-conformance review — 2026-08-12

Requested mid-run: check PRs **#2115 (PLT-3000)**, **#2116 (PLT-2993)**, **#2117 (PLT-2994)**
against the Claude design docs attached to the tickets, rather than against the Jira text.

Design sources used (attached by Ilia, treated as the specification):
- `Project Settings Types — Developer Doc` — the authoritative behaviour spec (§01–§10)
- `Project Settings — Types Prototype`
- `Task Management — Flows and Components` (FLOW 01–08 + component anatomy)

Method: read the **end state of each branch**, not the PR description. Verified against the
merge base `4c829f460` (master at PR creation).

---

## ⭐ Headline: all three PR descriptions are stale

In every case the code has moved on since the description was written, and in two of the three
the description now says the **opposite** of what the code does. A reviewer following the
"How to test" steps would file bugs that aren't bugs. Fix the descriptions before review.

---

## PLT-3000 / #2115 — Project Settings → Types tab

### Matches the design
- Types tab is the entry point, inside the Project Settings modal (§01).
- Asset types / System types **segmented control on one surface** (§01). Confirmed present:
  `TypesTab.tsx:153` `ToggleButtonGroup`.
- Search by name in a **fixed** toolbar row; only table rows scroll (§02 + prototype's fixed
  chrome). `TypesTab.tsx:132-140`.
- **Zero-instance types now listed** — `countByField(assets, 'assetType', catalogueNames)`
  (`AssetList.utils.ts`, `AssetListContent.tsx`). This directly implements §09
  *"Type with zero live instances"*. Real bug fix, and not hypothetical: 264 catalogue rows on dev.

### Divergences
1. **§01 modal drill-in rule is only half-satisfied.** The doc is explicit and calls it
   *project-mandated*: a type's detail replaces the whole modal content **including the title and
   tab strip**, with its own header (back chevron + page title, close X, divider below).
   The overlay is rendered inside `<ModalContent>` (`TypesTab.tsx:282-292`), but
   `<ModalTitle title='Project Settings'>` is a **DOM sibling above** `ModalContent`
   (`ProjectSettings.tsx:118` vs `:120`). An absolutely-positioned overlay inside ModalContent
   **cannot** cover it. So the tab strip is covered, the generic "Project Settings" title and its
   close X are not. The PR description claims the rule is matched — it isn't, for the title.

2. **The System types toggle is inert, not an empty state.**
   `ToggleButtonGroup value='assetTypes'` is **hardcoded with no `onChange`**, and the System
   types button is `disabled` with an aria-label "systemTypesSoon" (`TypesTab.tsx:153-171`).
   It is a signpost, not a working control.
   → **This corrects the record.** The 08-11 comment on PLT-3002 (comment 109344) and
   `PLT-3002/context.md` both state *"System types renders an empty state on purpose, so this
   ticket lands in it rather than restructuring the tab a second time."* **That is wrong.**
   There is no System types panel and no empty state — PLT-3002 must wire the control up
   (add state + `onChange`, un-disable) as well as build the panel.

3. **§02 create / rename / delete-archive and all of §03–§06 are absent** — type detail view,
   edit mode + session draft log, the review-and-save sheet, post-save effects. The PR declares
   this ("Scope note"), which is honest, but the doc calls the save sheet *"the heart of the
   feature"*, and there is currently no Create affordance on the tab at all. PLT-3000 delivers
   §02's read-only half only.

### Provenance caveat
GitHub reports #2115 as an 8-file diff (rename + the `countByField` fix); the Types UI itself
appears to arrive via the branch's base lineage rather than being authored in this PR. Worth
confirming before treating #2115 as the change that introduced the tab.

---

## PLT-2993 / #2116 — Task library, create folder

### Matches the design — precisely
FLOW 07 §4: *"Create new → New folder appends **'New Folder'** already in rename mode, focused
and selected → type the name, Enter commits."*
- default name is `newFolderName: 'New Folder'` (`TaskLibraryTab.tsx:287`, i18n confirmed) ✅
- `autoFocus` (`:114`) + `event.target.select()` (`:120`) → "focused and selected" ✅
- Enter commits (`:125`), Escape abandons without writing (`:89`, `:129`), blur commits (`:123`)
  — exactly FLOW 07 §2's *"Enter commits, Escape cancels, blur commits"* ✅

### ⚠️ The PR description contradicts the code
It says *"Empty names are allowed and render an* Untitled folder *placeholder, matching the
ticket's 'saved as it is'"*. The code now says the opposite — `:64`
*"Commit the typed name. Called on blur and on Enter; **an empty name is discarded**."*
The `untitledFolder` string survives only as a display fallback for pre-existing blank rows.

Note the **ticket and the design disagreed** here: PLT-2993's text says the name is "saved as it
is" (implying a blank row is fine), the design says the row is pre-filled with "New Folder".
The code follows the **design**, which is the right call per the same precedence rule used on
PLT-2981 (design is the live spec, Jira text is not) — but it should be said out loud in the PR.

---

## PLT-2994 / #2117 — Task library, drag and drop

### Matches the design, better than its own description claims
FLOW 07 §3: *"Dragging a card lifts a ghost and lights valid targets → any folder row, the
**Move to top level** zone (shown while dragging a foldered task), or Archive."*
- task rows draggable (`:255`), folder rows are drop targets (`:139-149`) ✅
- a **purpose-built "Move to top level" zone**, gated on
  `showRootDrop = Boolean(draggedTask && draggedTask.folderId)` (`:345`, rendered `:530`) —
  i.e. shown **only while dragging a foldered task**. That is an exact match to the design ✅
- hovered target highlights (`dropActive`, `:576`); `dragleave` ignores child-row bubbling so the
  outline doesn't flicker ✅

The PR description undersells this — it says *"every folder, including the ungrouped bucket, is a
drop target; dropping on the ungrouped bucket clears it"*, describing an earlier design where the
existing Unassigned bucket was reused. The code has since grown the dedicated conditional zone.

### Gaps vs the design (none blocking, none currently stated in the PR)
- **Folders are not draggable.** Design: *"Folders move whole, cycles are denied."* Only task
  rows carry `draggable`. Likely fine while the folder model is flat (no nesting → no cycles),
  but it is an unstated deviation.
- **Archive is not a drop target.** Design FLOW 06 §3: *"Dragging a card onto Archive also
  archives it."* Archive doesn't exist yet (unticketed), so legitimately deferred — worth naming
  in the PR rather than leaving silent.
- *"lights valid targets"* (plural) — only the hovered target lights, not all valid targets on
  drag start. Cosmetic.
- Keyboard route absent — already flagged honestly in the PR as a deliberate gap.

---

## What to do with this
1. Refresh all three PR descriptions — two are actively misleading for a manual tester.
2. Correct the PLT-3002 record: there is **no** System types empty state to land in.
3. Decide whether #2115's drill-in must cover the modal title to satisfy §01, or whether the
   rule is relaxed for the settings modal. That is a product/design call, not a code call.

---

## 2026-08-12 (later) — implementation round

**#2129 (PLT-2914) merged to master** as `dbf1bada8` mid-run. That invalidated the
"still stacked on an unmerged branch" state and is why #2115 could be re-pointed.

### Done
- **#2115** — base re-pointed `PLT-2914-…` → `master`; master merged in; the
  rename/modify collision (master carried the Types restyle on the old `AssetsTab`
  filename) resolved in favour of the rename. Master's `AssetsTab.tsx` was
  byte-identical to this branch's `TypesTab.tsx` apart from one doc-comment line —
  both already used the `hc.components.TypesTab` i18n keys — so deleting it lost
  nothing. Also fixed its CI: it had inherited the `StyledMenu` ReferenceError from
  a base pinned one commit before the fix.
- **All three PR descriptions rewritten.** Two previously stated the opposite of
  the code (empty folder names; the ungrouped-bucket drop target), and all three
  cited `COMMISSIONING_ENV`, which #2118 deleted.
- **PLT-3002 → PR #2134** (draft, stacked on #2115). Wires the segmented control
  (it was hardcoded + disabled, not an empty state) and adds `SystemTypesList`.
- **PLT-2992 → PR #2135** (draft, off master). The importer's `CHECKLIST TYPE`
  → task-kind mapping, the ticket's only unbuilt piece.

### Blocked / deliberately not done
- **#2116's master merge.** Source side fully resolved (patch kept in the session
  scratchpad), but master brings ~686 lines / 37 tests for the asset-type filter,
  12 seeded through the derived-links mock PLT-2993 deletes. Porting them needs a
  decision — with folders as real rows, the "asset-type filter" is really a folder
  filter now. That is a design call, not a conflict resolution, and there is no way
  to run the suite locally (`npm ci` fails on `@xyzreality/dhtmlx-gantt`, 401).
- **Basing PLT-3002 on the Systems stack (#2126).** Tried; it is rooted on the
  glossary rename and produced 33 conflicts against master. Instead `systemTypeService`
  / `systemService` were written to the **same shape** as that stack's copies so
  whichever lands second merges rather than forks. Comments in both files say so.

### Schema
`system` and `system_type` exist on **neither** database. DDL + RLS + rationale:
`hc-frontend/docs/commissioning/system-types-schema.md`. Same tables the Systems
stack needs — create once, for both.

---

## 2026-08-12 (end of run) — #2138 state, and the blocker to clear first

**#2116 + #2117 were combined into #2138** (`PLT-2993/PLT-2994`, base `master`).
**#2115 + #2134 → #2136** (`PLT-3000/PLT-3002`). #2135 (PLT-2992) unchanged.

### CI on #2138 — converging, not green
| sha | failures | passing |
|---|---|---|
| `73e5b26` | 13 | 4048 |
| `ad34d2e` | 6 | 4076 |
| `fb0902c` | **5** | 4077 |

Every fix so far was a **confirmed** root cause, all one theme: PLT-2993's tests were
written when the task detail **replaced** the list. After merging master's PLT-2914
restyle it is an absolutely-positioned **overlay that covers** it, so everything behind
stays mounted. Three symptoms:
1. `queryByTestId('tasks-tab-action-bar'/'tasks-tab-search')).not.toBeInTheDocument()`
   — still present. Rewritten to assert covering.
2. `getByText(<task name>)` — name is on screen **twice**, throws
   `getMultipleElementsFoundError`. Scope with `within(detail)`.
3. testid drift: `tasks-tab-search-clear` → master's `tasks-search-clear` (11 refs).

Plus one **genuine logic bug** caught by a new test: `groupChecklistsByFolder` only
dropped folders emptied by the SEARCH term, never by the task-KIND filter, though its
own comment claimed "not while filtering". The kind filter arrived from master
separately and was never wired in. Fixed by broadening to any active narrowing while
keeping empty folders visible when nothing filters (or a new folder vanishes before it
can be named).

### The 5 that remain — do NOT guess at these
One is `TaskLibraryTab.test.tsx` "lists checklists newest-first": `items[0]` passes,
`items[1]` fails, meaning either a 3rd element matches `/^task-item-/` or only one
rendered. Undiagnosable from the CI log.

**A strong suspect for some of the rest is `task-folder-service.test.ts`, written blind
in this run.** If `InMemoryCommissioningClient` ignores `order` in `select`, the
creation-order assertion fails; if `update` returns no rows, the rename assertions fail.
Check that file first — it may be self-inflicted, not merge fallout.

Sonar also went **0 → 6 new issues** on `fb0902c` (gate still passes). Unreviewed; the
new test files are the likely source.

### ⛔ The blocker that made all of this slow
`npm ci` fails in the routine's environment: **401 on `@xyzreality/dhtmlx-gantt`** from
`npm.pkg.github.com` — the session token has no `read:packages`. So **not one test can
be run locally** and every verification costs a ~5-minute CI round trip. Two bugs
(`ViewerTextField` crash, the ugly rename field) reached the branch and were found by
Ilia running the app, not by any check available here.

**Fix this before the next implementation run**: provide an `NPM_TOKEN` with
`read:packages`. It is worth more than any amount of extra static checking.

### Static checks that DO help (keep using them)
- unused-import scan, and — added this run — the **reverse** check: every
  `<Capitalised>` JSX element resolves to an import or local definition. The reverse one
  is what catches the `StyledMenu` / `ViewerTextField` class of merge breakage; the
  unused-import direction cannot see it.

### Drag-and-drop — the real fix is a port, not patches
Both reference implementations use **`@dnd-kit/core`, already a dependency**:
- `EditableAttributeList.tsx` (Attributes tab) — `useDraggable`/`useDroppable`,
  `PointerSensor` with `activationConstraint {distance:3, tolerance:5}`, custom
  collision detection falling back to a `root-dropzone` on near-misses, 20px
  anti-flicker threshold.
- `model-tree/hooks/use-drag-and-drop.tsx` — same sensors plus `KeyboardSensor`, and
  **spring-loaded folders** (1200ms hover opens them).

The task library uses **native HTML5 DnD**, which is why manual testing reported
"~85% fine, sometimes hard to drop". Copilot independently found one piece (the
"Move to top level" zone cleared its highlight on any `dragleave`, strobing as the
pointer crossed its own icon/label — now guarded). The rest is inherent to HTML5 DnD.
**Porting to `@dnd-kit` is the fix**, and would also supply the missing keyboard route.
Awaiting Ilia's go-ahead as its own PR.

---

## 2026-08-13 — review round: the npm blocker has a workaround, and PLT-2992 was inert

### ⚠️ Supersedes the "not one test can be run locally" claim above

That section is still right about the cause (`npm ci` 401 on `@xyzreality/dhtmlx-gantt`,
token has no `read:packages`) and still right that an `NPM_TOKEN` is the proper fix.
It was **wrong that nothing can be run**. There is a workaround, and it works:

```bash
# from the hc-frontend checkout
cp package.json package-lock.json /tmp/backup/            # ALWAYS back these up first
python3 -c "import json;p=json.load(open('package.json'));
del p['dependencies']['@xyzreality/dhtmlx-gantt');json.dump(p,open('package.json','w'),indent=2)"
npm install --no-audit --no-fund --ignore-scripts         # ~50s, 2171 packages
cp /tmp/backup/package.json /tmp/backup/package-lock.json .   # restore BEFORE committing
```

`npm ci` is all-or-nothing, so one unreachable private package blocks the whole tree;
`npm install` on a manifest without it resolves everything else fine. `node_modules` is
git-ignored, so it survives `git checkout` between branches — install once, use it for
the whole session across every branch.

**Caveats:**
- Restore both manifests before `git add`. Verify with `git status --short` — only your
  intended files should appear.
- `tsc --noEmit` will report errors in `gantt-x/**` (the `MappingColumn` type came from
  the removed package). Filter those out; anything else is real.
- Anything importing the gantt will fail at runtime. Everything else — the entire
  commissioning surface — runs.

This run used it to execute **977 tests** across four suites before pushing. That is the
difference between guessing and knowing, and it is why the two bugs below were caught
here rather than by Ilia running the app.

### PLT-2992 (#2135) shipped inert — the test passed because it tested the wrong thing

`mapImportedTaskType` was wired into `validateChecklistImport`'s draft. **The page never
calls that function.** The real path is `ChecklistImportPage.tsx` →
`buildChecklistBatch` → `useChecklistDefinitionCreate`, and `buildChecklistBatch` built
its draft as `{ name, description, items }` — no `type`. So every imported task landed
on the column default and the feature did nothing.

The unit test passed throughout, because it exercised `mapImportedTaskType` in isolation.
**A mapper test proves the mapper; it proves nothing about whether anything calls it.**
Caught by Copilot, not by the suite. Fixed in `c01ca929f` — mapping moved onto the batch
draft, plus batch-level tests asserting `rows[n].draft.type`, which is the assertion that
would actually have failed.

*Generalisable*: when adding a pure helper to an existing flow, grep for the call site
that reaches production **before** writing the test, and assert on the object that
crosses the boundary — not on the helper.

### Alias tables: the asymmetry worth reusing

Copilot also flagged `performancetest`/`systemtest` as over-broad aliases. Agreed and
dropped, but the useful principle is the line drawn rather than the deletion:

> An alias that resolves to the **fallback** value is free — matching and not matching
> produce the same row. An alias that resolves **away** from the fallback carries all the
> risk. So be generous with the first kind and strict with the second.

`check`/`inspection` → `checklist` stay (checklist is the default anyway). Anything
mapping to `functionalTest`/`ist` is now restricted to documented labels and shorts.

### PLT-3000/3002 (#2136) — review round

Five comments, all legitimate. Three (zero-asset catalogue empty state, count gating
across all three queries, sortable-header a11y) were fixed in `6f23c81b3`; the empty-state
one had **killed the feature** the same way PLT-2992's did — `countByField` was seeded
from the catalogue, but `isEmpty` still keyed on `assets.length === 0`, so a project with
types and no assets hid the catalogue entirely. Two more addressed in `65db5eb23`:
`SystemTypesList` now has 20 tests, and a `vi.mock` declared twice was removed.

Pushed back on one: `systemTypeService.create` is unused here **on purpose**, kept
byte-identical to Rishi's copy on the systems-register branch so whichever lands second
merges clean. That is also the source of the ~2% Sonar duplication. The PR description
already said so.

### Parallel runs of this routine are live — check the remote before working

`6f23c81b3` landed on `PLT-3000/PLT-3002` **one minute** before this run went to fix the
same comments, authored by another session of this same scheduled routine. Earlier in the
sprint the identical thing happened with the `StyledMenu` import fix.

**Always `git fetch` + `git reset --hard origin/<branch>` immediately before starting on
a branch**, and re-check right before pushing. Verify a parallel run's fix rather than
trusting the commit message — this run re-read the diff and re-ran the AssetListPage suite
(374 tests) before resolving those threads.
