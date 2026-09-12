# PLT-2999 — Task library context menu (Rename / Duplicate / Delete)

**Status:** Dev In Progress · **PR:** [#2203](https://github.com/XYZReality/hc-frontend/pull/2203) (draft, base `master`)
**CI:** first run FAILED on `fac8569` (one real regression, mine — see below), fixed in `ab35e3f`.

## 2026-09-05 — implemented

### Where the tab stands

`ProjectSettings/TaskLibraryTab/TaskLibraryTab.tsx` is one ~1100-line module. Only **three commits
have ever touched it**; the shape it has now came from `478932d` (**PLT-2993/2994**, real folders +
dnd-kit drag). That commit left exactly the scaffolding this ticket needed — a kebab, a Menu, a
rename-in-place field and an optimistic mutation — but **on the folder row**. PLT-2999 is largely
lifting that pattern down onto the task row, plus three service operations that did not exist.

Task rows render in exactly one place: `TaskFolderSection` → `DraggableTaskCard`. All tasks pass
through it, including the synthetic Unassigned bucket, so there is no second render site to update.

### What did NOT exist before (checked, not assumed)

`checklistLibraryService` had `list / create / update / moveToFolder / clear` and **no rename, no
duplicate, no single-row delete** — grep across `services/`, `hooks/` and the Checklist pages found
zero clone/duplicate/remove-one anywhere.

### The three service methods, and why each is shaped that way

- **`rename` is a narrow `name` PATCH, NOT `update()`.** `update()` cuts a **new version**, and the
  whole reason `task_template_version` exists is that a run holds the wording it was given. A rename
  changes no question, so an update would strand every recorded execution behind a revision identical
  to its predecessor. This is the single most important decision on the ticket.
- **`duplicate` is built on `create()`**, not a second insert chain — it inherits the
  items-before-current-version ordering and the PLT-2992 `task_template_id` fix. It takes the source
  **definition**, not an id, because the caller already holds it. Two things must be carried
  explicitly: the **kind** (locks at creation; a copy that silently became a `checklist` would be
  scored differently from the functional test it came from) and the **folder** (applied after, since
  `create` only ever writes at the root).
- **`remove`** walks items → versions → template (the client does not cascade), and **nulls
  `current_version_id` first** so the template is not still pointing at a version row being deleted.
  Note `clear()` does *not* do that; whether that is a latent bug depends on the FK, which is not in
  the schema doc. Nulling first is safe under RESTRICT, NO ACTION and SET NULL alike.

### What survives a delete — schema facts, from `docs/commissioning/PLT-2862-schema-reference.md`

| table | FK to `task_template` | effect |
|---|---|---|
| `task_instance` | **ON DELETE SET NULL** | a task already generated onto an asset **survives**, keeping its snapshotted `template_name` / `template_version` |
| `task_item`, `readiness_task_link`, `element_task_status`, `workflow_tag_task` | **ON DELETE CASCADE** | links go; a level that required the template stops requiring it |

So **no recorded field work is destroyed by deleting a template**, and that is designed-for, not
incidental. The confirmation dialog says so, because that is what decides whether someone clicks it.
(`asset_type_task` / `system_type_task` post-PLT-3058 are **not** in that doc — their FK behaviour is
unverified.)

### UI traps — all three cost real debugging elsewhere, none are optional

`RowActionsMenu.tsx` was **extracted** from the folder kebab rather than copied, because both rows sit
inside a clickable container and every one of these has to be identical in both:

1. The trigger stops propagation on **`onPointerDown`** as well as `onClick`. The task card is its own
   dnd-kit drag handle with a 3px activation distance, so a pointer-down that reaches the row starts
   a drag *from the dots*. Click-only is enough for the folder header and NOT enough here.
2. The `Menu` stops propagation too. It **portals to the body, but React's synthetic events follow the
   REACT tree** — without this, clicking a menu item also fires the row's `onClick` and opens the task
   behind the menu.
3. `disableRestoreFocus` / `disableEnforceFocus` / `disableAutoFocus`. Rename unmounts the trigger and
   mounts the field in its place; a menu that restores focus on close pulls it straight off the field,
   blurring it, committing an unedited name and closing the edit again.

### The CI failure — a real regression, worth remembering

`TaskLibraryTab.test.tsx:487` picks the task rows out with **`/^task-item-(?!type-)/`**. My kebab's
`task-item-menu-<id>` matched it, joined the list and shifted the ordering assertion by one.

Fixed by **moving out of the namespace** (`task-menu-` / `task-rename-` / `task-duplicate-` /
`task-delete-` / `task-name-input-`), not by widening the regex — the type badge already needed the
one exception and a second would leave the same trap for the next control added to a row.

> **Standing note for this tab: any new `task-item-*` testid joins the row-ordering match.** Prefix
> row *sub-elements* with something else.

## Open / follow-ups

- **No usage warning on delete.** Considered counting the types linking the template and showing it
  in the dialog; not built — the cascade is designed-for and the count is a data question. Flagged in
  the PR as a follow-up if the team wants it.
- **`tr` locale:** the entire `hc.components.TaskLibraryTab` namespace is absent from
  `i18n/tr/main.json`, so the new keys are en-only like the rest of the tab. Consistent with where
  that stands (see the standing i18n-fallback candidate), not a decision taken here.

## 2026-09-09 — status only; no code change

Found parked in **Analysis In Progress**, not Dev In Progress as the header above says. The
transition Dev In Progress → Analysis In Progress was made **2026-09-08 10:56:24 by Ilia's
account** (which is also this routine's token, so the changelog can't tell human from run).
PLT-2999 has **zero Jira comments**, so no analysis question was ever recorded against it.

Moved back to **Dev In Progress** this run, because the code is done: PR
[#2203](https://github.com/XYZReality/hc-frontend/pull/2203) still draft, `build` + SonarCloud
**green**, no review threads at all yet.

Master merged in (`cc97667`, master `c7c96b0 → 00be0c1`) — clean, no conflicts, no file overlap
with master's 9 changed files. Nothing in the implementation notes above is superseded.

> If this ticket appears in Analysis again, **do not move it a second time** — ask Ilia whether the
> 09-08 move was deliberate. Flagged in the 09-09 run summary.

## 2026-09-12 — worked the three review rounds; 10 findings fixed and pushed

Pushed `c0ef2a2` to `PLT-2999`. CI was green before it and the branch was 0 behind master, so
checkpoints 2 and 3 were already satisfied — this run was checkpoint 1 only.

Every finding was **re-verified in the tree** before being accepted. Three of the four rounds' worth
of comments collapsed into ten real defects, one disagreement, and three server-side asks.

### Fixed

1. **Folder delete acted on the FILTERED folder** — the one the 09-11 notes led with, and confirmed:
   `folders` (`TaskLibraryTab.tsx:1165`) is grouped with `search` + `taskType`, and `:1306` handed
   that object to `startDeleteFolder`. New `wholeFolder()` helper re-resolves from `allFolders`
   (unfiltered) before anything destructive. Fixes archive-all on the same path, since both read
   `folderPendingDelete`. Test: search narrows a 2-task folder to 1, delete, both go.
2. **Delete guard failed open** — `blocked = executions.length > 0`, so a rejected usage query read
   as "no recorded work" and drew the red Delete. `usageError` / `onRetryUsage` plumbed through;
   dialog has an explicit `unchecked` state offering only a retry.
3. **`staleTime: 0` didn't refetch on Confirm** — both confirm paths now await `usagePermitsDelete()`,
   which refetches and gates. Narrows the window; does not close it (see below).
4. **`usage()` counted per instance, not per asset** — contradicting its own doc comment. New
   `ownerKey()` (asset → system → instance) collapses both `appliedCount` and the evidence list.
5. **"Latest run" picked by `started_at`** — the runner uses persisted `sequence`
   (`checklist-instance-service.ts:194`). New `isLaterRun()`: sequence decides, timestamp breaks a
   tie. **The tiebreak is load-bearing** — existing tests insert executions with no `sequence`, and
   a pure sequence compare regressed them.
6. **System tasks named after themselves** — `template_name` shown where the system's name belongs.
   `system_id` added to the row type, `systemLabels()` added alongside `assetLabels()`.
7. **Archived templates still reachable from every picker** — `useChecklistDefinitionList` has 8
   callers and none filtered `archivedAt`, so an archived task could be attached to a type and
   generated onto a new asset. Hook is now live-only by default via `select`; the tab opts in with
   `{ includeArchived: true }`. Same cached query, so opting in costs no request.
8. **`duplicate()` stranded its copy** at the root if `moveToFolder` failed, and retrying multiplied
   strays. Compensating delete added.
9. **Empty-folder delete had no `onError`** — silent failure, no dialog to carry the message.
10. **`<button>` inside `<button>`** — `RowActionsMenu` was inside `ListItemButton`. Moved to a
    sibling overlaid on the row's right end. Also dropped `disableAutoFocus` (kept
    `disableRestoreFocus`, which is the one that protects Rename's field) and added a keydown
    propagation stop.

Plus the i18n copy: `appliedBody` promised deletion removes the task "from those assets" while
`remove()`'s own doc says `task_template_id` is ON DELETE SET NULL and the asset keeps it.

### Disagreed, resolved with reasoning

The probe excluding **archived instances** and **invalidated executions** is deliberate: an archived
instance is a task the asset no longer owes, and an invalidated run's replacement is already in the
list. Deleting a template doesn't destroy history either way (SET NULL). The copy was what overstated
it — `blockedBody` changed from "while that history exists" to "while that work is still on those
assets".

### Left OPEN — need a server-side change

- `remove()` is not atomic with its own precondition. Needs a Postgres RPC.
- Folder delete is a sequential loop with no rollback.
- Archive-all, same shape (less damaging — reversible — but the toast still claims the full count).

Grouping all three into **one backend ticket** rather than three. Not yet raised.

### State

11 of 13 threads resolved, 2 open by choice. PR description rewritten (test step 6 covers the
filtered-folder case). Still draft.

### Caveat on validation — read this before trusting the above

**Nothing was run locally.** `npm ci` fails in the scheduled-run container: the private
`@xyzreality/*` packages need `read:packages` and neither the session `GITHUB_TOKEN` nor `NPM_TOKEN`
carries it (401 on `@xyzreality/dhtmlx-gantt`). So no vitest, no eslint, no tsc.

What was done instead: every file parsed with standalone `esbuild` (JSX balance, syntax), formatted
with the repo's exact `prettier@2.7.1`, and the existing test suite read line by line to reason about
breakage — which is how the `sequence` tiebreak in (5) was caught before pushing. CI is the real
validator. **Next run: check #2203's build first.**
