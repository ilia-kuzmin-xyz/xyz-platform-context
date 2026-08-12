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
