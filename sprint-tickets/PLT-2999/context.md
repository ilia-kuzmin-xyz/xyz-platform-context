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
