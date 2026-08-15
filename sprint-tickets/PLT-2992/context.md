# PLT-2992 — Project Settings · Task library (create new Task)

**First seen 2026-08-08.** Status was `Open` (eligible). **This run moved it to `Analysis In
Progress` and posted a clarification comment** (comment id 109175).

> Read `../_shared-commissioning-domain.md` first — it carries the domain facts for all five
> Project Settings commissioning tickets.

## Ask
"+ Create new" opens a context menu (New Folder / New Task). New Task opens a modal with a
drag-in form-element area, plus a **Task type** field: Checklist · Functional Performance Test ·
Integrated System Test. Save → task lands in the Task library list **without a folder**.

## Already built (do NOT rebuild)
- Task library tab with search, folder grouping, inline read-only detail.
- **Create already opens the builder in-modal** — `ChecklistBuilderContent` slides in over the tab.
- Palette already has `passFailNa · header · staticText · inputField · table · fileUpload ·
  signature` — so "drag in input fields and signature" is covered.
- Save already drops the definition into the unassigned (no-folder) bucket.

## Genuinely new / blocked
1. **Task type doesn't exist on `IChecklistDefinition`.** Behaviour-bearing or label-only in v1?
2. FacilityGrid importer reads `CHECKLIST TYPE` and discards it — should it now map onto the enum?
3. Required on save? Default for existing definitions?
4. **"+ Create new" split menu is shared with PLT-2993** — can't be built until the folder model is
   settled, and Import needs a home in the new bar.

## Confidence
**4/10** as written — high once (1) and (4) are answered; the builder work is already done.
Answer **PLT-2993 first**, it gates the menu.

---

## 2026-08-11 — blocker (4) is GONE; this is now one answer from being built

**Status unchanged (`Analysis In Progress`), but the shape of the hold changed completely.**

### What resolved
Blocker (4) was *"the + Create new split menu is shared with PLT-2993"*. PLT-2993 shipped in
**PR #2116** and the menu exists: `TaskLibraryTab.tsx:273` — *"+ Create new opens a small menu
(New task / New folder)"*, `data-testid='tasks-tab-create-menu'`. Combined with what was already
there (builder-in-modal, full palette incl. inputField + signature, save-to-root), **every part of
this ticket except `taskType` is now built.**

### ⚠️ Correction that makes the remaining part bigger
The 08-08 entry inherited the claim that commissioning is localStorage-backed. **It is not, and was
not then.** `checklist-library-service.ts` reads `task_template` / `task_item` through
`commissioningDataClient` — verified at `4ad83a7`, the very commit the old comment cited.

Consequence: `taskType` is **a column on `task_template` + a backfill of existing rows**, not a
client-side field. `IChecklistDefinition` today is
`{ id, name, description, items, version, folderId, createdAt }` — confirmed on the PLT-2994 branch.

### The one thing that blocks it
Not the enum values (those are in the ticket) but **the migration semantics**:
1. Behaviour-bearing or label-only in v1?
2. **What do existing definitions backfill to, and is the column nullable or required-on-save?**

(2) is the hard stop — a guess writes wrong data into live dev rows across every project. This is
the reason the 08-11 run shipped no code despite the ticket being otherwise ready.

3. Separately: FacilityGrid importer reads `CHECKLIST TYPE` and discards it
   (`ChecklistImport.utils.ts`). Mapping needs someone who's seen real FacilityGrid values; can
   follow as its own slice.

Posted as comment **109343**.

## Confidence — updated
**8/10** (was 4) the moment (1) and (2) are answered. The work itself is small and well understood.

---

## 2026-08-15 — PR #2135 is green and all feedback is closed; only human review is missing

No code change this run. Status of the ticket's last open slice:

| | |
|---|---|
| PR | [#2135](https://github.com/XYZReality/hc-frontend/pull/2135) — `CHECKLIST TYPE` cell → task kind |
| Review threads | **1 total, resolved** (Copilot: over-broad aliases `performancetest` / `systemtest`; dropped in `c01ca929f`) |
| `build` | ✅ success |
| SonarCloud | ✅ Quality Gate passed, 0 new issues |
| `mergeable_state` | `blocked` — **awaiting human approval**, not a failing gate |
| Reviewers requested | TomMasdinXYZ, DarminderA, rishib-xyz, SergiuszXYZ |

**Action taken:** the branch was 1 commit behind `master` (PLT-3025 / #2142 merged 14 Aug).
Merged `origin/master` in and pushed (`6275f4d42..730935978`). **Clean merge** — the merge brought
in only `CanvasPage/` + `ViewerPage/` files; nothing under `ChecklistImportPage/` was touched, so
there is no interaction between #2142 and this PR.

⚠️ **Local test run was not possible** and this is likely to bite every future run in this
container: `npm ci` fails with **401 Unauthorized** on `npm.pkg.github.com` for
`@xyzreality/dhtmlx-gantt` — the private GitHub Packages registry needs a token this environment
does not carry. `node_modules` is absent, so Vitest cannot start at all. Verification of this push
therefore rests on CI, which is fine for a merge that touches none of the PR's own files, but
**do not assume you can run tests locally here.**

### Ticket lifecycle note (unchanged from 08-14)
The rest of PLT-2992 is already on master via #2129 and #2138. Once #2135 lands the ticket is fully
delivered and should be closed rather than left open against shipped work.
