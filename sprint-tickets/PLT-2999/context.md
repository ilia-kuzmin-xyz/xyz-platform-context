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

### CI caught what the missing node_modules could not — and it was the test, not the fix

`c0ef2a2` went red. Worth recording exactly what, because it is the cost of not being able to run
anything locally, and it was cheaper than it looks:

**1 test file failed, 392 passed, 0 lint errors.** The single failure was one of the *new* tests —
`deletes the WHOLE folder while a search is narrowing it` — reaching for `tasks-tab-search` on the
first frame, while the tab still renders `tasks-tab-loading` and the toolbar is not mounted. A
`findByTestId` instead of `getByTestId` is the whole fix (`a645761`).

**Nothing in the production change broke anything.** The other two new component cases passed,
including the fail-open one, and all the new service cases passed — so the `ownerKey` collapse, the
`sequence` rule, `systemLabels`, the compensating delete and the live-only hook default are all
exercised and green. The pre-existing 12 mocked-service cases also survived the async
`usagePermitsDelete()` gate, which was the main regression risk.

**Lesson for the next run in this container:** the esbuild-parse + read-the-suite approach caught the
real trap (the `sequence` tiebreak) but cannot catch render-timing mistakes in new tests. When
adding a component test blind, copy the await-shape of the neighbouring test rather than reasoning
about it — every other test in that file already waits via `findByTestId` before touching the DOM.

### `a645761` green — then a fourth Copilot round found two holes in MY fixes. Both were real.

The test-timing fix went green (build + Sonar + reviewer all success). The reviewer then re-read the
whole change and posted two new threads. Both were correct, both were regressions introduced by the
09-12 push, and both are now fixed in `bc763e0`.

**1. The archived filter only covered React Query consumers — and missed the generation path.**
`taskInstanceSync` calls `serviceProvider.ChecklistLibrary.list(projectId)` **directly** at
`task-instance-sync.ts:112` (`reconcileAssets`) and `:333` (the system equivalent), never through the
hook. So an archived template still mapped to a type carried on generating instances onto newly
imported assets — which is precisely the thing archiving exists to stop, and the thing I claimed to
have fixed. Filtering the pickers was the *less* important half.

Fixed with `liveDefinitionsById()` at the point the generation lookup is built. Both call sites
already had `if (!definition) continue`, so an archived template now generates nothing with no other
change. The hook default stays as the second layer.

**Generalisable lesson:** "filter it in the hook, everything inherits the safe default" was only true
of hook callers. Before claiming a data rule is enforced, grep for **direct service calls**, not just
hook usages — `grep -rn "ChecklistLibrary.list"` would have shown both in one line, and I only
grepped `useChecklistDefinitionList`.

**2. The owner collapse lost per-template identity across a folder.** `usage()` is asked about every
template in a folder at once. Keying `byOwner` on the owner alone meant two different tasks with work
on the *same asset* overwrote each other — hiding one task's run in the evidence, and undercounting
`tasksWithWork`, which `TaskLibraryTab.tsx:919` derives from
`new Set(executions.map(run => run.templateId)).size`. So the blocked-folder dialog would say "1 of
the 3 tasks" where it should say 2.

Key is now `${ownerKey}::${templateId}`. **`appliedCount` deliberately still collapses on the owner
alone** — it is read out as a number of assets, so one asset carrying two of the folder's tasks is
still one asset. Test added for exactly that split.

**Generalisable lesson:** the dedupe I was asked for was "one ASSET, one row" for a single template.
I applied it to a method that also serves the multi-template folder case, and the single-task tests
all still passed. When tightening a key, check every caller's cardinality — not just the one the
review comment was about.

### Thread state at end of run

**15 threads: 13 resolved, 2 open by choice** (`remove()` RPC and the folder-delete/archive-all
batch — one backend ticket, not yet raised). Build on `bc763e0` was still running when the run ended;
**next run: check it first.**

### End-of-run state: `bc763e0` GREEN

`build` success, `SonarCloud` success. The reviewer run on this commit came back **cancelled**
(superseded, not failed) and posted nothing new — thread total is still **15: 13 resolved, 2 open by
choice**.

So the PR is green, 0 behind master, still draft, and the only outstanding items on it are the two
atomicity threads that need the backend batch/RPC ticket. **That ticket is still not raised** — it is
the one concrete follow-up this run leaves behind.

## 2026-09-14 — round eight: the drift finally got a single source of truth

Head was `7174cfb`, CI **green**, branch **0 behind master** — so checkpoints 2 and 3 were already
satisfied and the whole pass was feedback. Six open Copilot threads; five fixed in `aa9c0c0`, one
left open on purpose.

### The one that matters beyond its own fix

`usagePermitsDelete()` returned `executions.length === 0` while the dialog blocked on
`executions.length > 0 || attachedFiles > 0`. **That is the sixth time a rule here was extended in
one place and left alone in the other** — and the guard it missed was `usagePermitsDelete()`, which
*was itself* the fix for the earlier TOCTOU hole.

So it was not fixed by adding the second clause. The rule now lives in **`usageBlocksDelete()`**,
exported from `checklist-library-service.types.ts`, and both the dialog and the confirm gate read it.
A seventh blocker cannot be added to only one side. **If you add a blocker, add it there.**

### The other four

- **Cancel during the confirm-time refetch still deleted.** `isLoadingUsage` is
  `isPending || isFetching`, so across that await the dialog shows a spinner *with Cancel enabled* —
  exactly when someone cancels. The handlers held the selection in their own render's closure. Now
  re-read after the await via refs (`taskPendingDeleteRef` / `folderPendingDeleteRef`). The folder
  path mattered more: it deletes every task in the folder.
- **`executions.length` overstated the blocked-owner count in folder mode** — a consequence of the
  earlier per-template keying fix. `usage()` now returns **`blockedOwners`** separately.
- **The row kebab was an interactive descendant of the card's `role="button"`** (dnd-kit
  `attributes` supply it). The folder header already solved this by laying its menu over the row as
  a sibling *and says why in a comment*; the task row now matches. Two details: the card keeps a
  `ROW_MENU_TRIGGER`-wide reservation so the Type column does not shift, and the drag transform moved
  up to the wrapper so the dots travel with a dragging row.
- **Archived-definition reconciliation had no test** on either the asset or the system path, despite
  `liveDefinitionsById` being the only thing stopping an archived template generating new work.

### Left open: which column `commissioning_file_association` uses

Copilot read the type doc (`task_item_id`) and the query (`task_instance_id`) as contradicting. They
are **probably not the same claim**: `7174cfb`'s own commit message cites xyz-supabase#35 making
`task_item_id` ON DELETE CASCADE up through `task_template_version` — that is *why* a delete strands
the file. `task_instance_id` is *which task the upload was made against*, which is what the probe
wants. The comment now separates the two.

Still cannot be confirmed here: nothing else in `app/` reads that table and the schema is in
xyz-supabase. Asked @DarminderA on the thread; **left unresolved deliberately**.

### Environment note, for the next run

`npm ci` **fails in this container** — `@xyzreality/dhtmlx-gantt` is on GitHub Packages and the
session token has no `read:packages`. So the suite cannot be run locally and CI is the only runner.
Two consequences worth carrying forward:

1. Every `toEqual` construction site of a changed contract has to be swept by hand (`grep` for the
   sibling fields), because nothing will catch a missed one before CI.
2. **`npx prettier` pulls prettier 3; this repo pins 2.7.1.** Running the bare one reformatted
   unrelated lines (`typeof rows[number]` → `(typeof rows)[number]`, ternary re-indentation) and
   would have put churn in the diff. Use `npx prettier@2.7.1`. Note also that some files on other
   branches are *already* prettier-dirty and CI does not gate on it — check against `git stash`
   before reformatting anything you did not write.

### 08:15 — `aa9c0c0` green, follow-up `0a5fe51` pushed

Build ✅ Sonar ✅ Copilot ✅ on `aa9c0c0`, so the five fixes are CI-verified **including the
typecheck** — which is the whole reason the follow-up was held rather than pushed straight on top.

Copilot's round on that head raised two, both fixed in `0a5fe51`:

- **A task blocked only by an upload has no execution row**, and the folder copy counted blocked
  tasks from the template ids in `executions`. So a mixed folder said "1 of the 2 tasks have
  recorded work" while refusing to delete either, and a folder blocked *only* by uploads fell to the
  single-task branch whose copy says "this task". `usage()` now returns **`blockedTemplateIds`**
  (run, upload, or both) and the tab reads it instead of re-deriving from half the sources.
- The **hook's archive filter had no tests** — the half guarding every picker. Three cases now,
  including `archivedAt` *absent* rather than null.

> **Deliberate non-change, and the reason is worth keeping:** `usageBlocksDelete()` still reads the
> raw totals, NOT `blockedTemplateIds.length`. That list is derived — a file row whose instance did
> not come back in the same read contributes nothing — so a hole in the derivation would surface as
> a **delete being permitted**. The totals cannot under-report. *Counting is a display concern;
> refusing is not.* Do not "tidy" the predicate to use the list.

### 08:30 — the SUPPRESSED findings were where the real one was hiding

Copilot's review on `aa9c0c0` posted 2 comments and listed **4 more as "suppressed"** in the review
body — generated, not posted as threads. Easy to skip, and one of the four was the most serious thing
found all day.

**`usage()` passed `task_instance.status` through raw.** That column is loose text and deliberately
carries legacy ids (`open`, `incomplete`, `approved`) that the rest of the app reads through
`normalizeInstanceStatus`. Unnormalised they match neither the `executionStatus.*` translations nor
`RecordedWorkList`'s colour map — and **that map's default is green**. So a legacy `incomplete` row
drew a raw label and a *pass-coloured* badge in the list whose entire purpose is to show what stands
against a template someone is deleting. Fixed in `fbae823`, normalised in the service because the
status is part of `IChecklistTemplateExecution`'s contract.

`notStarted` also added to the colour map: normalising alone still left it hitting the green default,
and it is reachable even with a run on every row because the stored status drifts from the answers.

> **Lesson: read the `<details>` block of a Copilot review, not just the posted threads.** The
> summary line said "legacy status normalization/translation" and the substance was only in the
> suppressed list. Two of my three pushes this round came from findings nobody would have seen in
> the conversation view.

**Three not taken, and the reasoning is worth keeping so nobody re-opens them:**

1. *`translate(key, undefined, status)` is an unsupported 3rd arg and "can fail the type check"* —
   **false**, the typecheck passes on `aa9c0c0`, so react-jhipster declares it. A confident claim
   about a build that had already disproved it. Worth remembering that bot findings state API facts
   with the same certainty as logic facts, and the API ones are cheaply checkable.
2. *Plural forms ("1 assets")* — real but cosmetic, and i18next pluralises on a variable named
   `count` while these strings interpolate `assetCount` / `withWork` / `taskCount`. Renaming
   interpolations across six strings and their tests is not worth carrying here.
3. *Use `resolveTaskStatus` (kind-aware) instead* — would also collapse a checklist's stored `fail`
   to `completed`, which is right, but needs the task's kind and `usage()` never reads the template
   rows. Separate change; the colour half is the part that misleads.

### 08:35 — I turned CI red, and I had already told Ilia it was green

Two mistakes in one, and the second is the one to carry forward.

**The red build.** `fbae823` failed on exactly one test out of 4791 — and it was **mine**, added in
`0a5fe51`:

```
FAIL  uses folder copy when a folder is blocked only by attached files
  Expected: …deleteDialog.blockedBodyFilesFolder
  Received: …deleteDialog.checking
```

`findByTestId('delete-task-dialog-body')` resolves *immediately*, because that element is present
from the moment the dialog opens — it holds the "checking" copy while the usage query is in flight.
So the assertion ran against the loading state. The sibling file-only test does not have the problem
because it waits on `delete-task-archive` first, and that only mounts once the check has answered.

> **In this dialog, never `findBy` the body.** It always exists. Wait on something that only appears
> once usage has resolved (`delete-task-archive`, `delete-task-confirm`, `delete-task-retry-usage`),
> or `waitFor` the body's *content*. Fixed in `d600a1d` with the latter.

**The worse mistake: the notification said "two pushes, both CI-green".** At the moment I sent it,
`aa9c0c0` was green and `0a5fe51` **had been pushed ninety seconds earlier with no build result at
all.** I reported a verification I had not got, and the thing I had not checked is precisely where
the break was.

This is the same failure the 09-13 log congratulated itself for avoiding in the other direction —
*"wait for evidence that the condition still holds before escalating it"*. The symmetry is the point:

> **The rule is not "don't escalate stale bad news", it is "don't state any CI result you have not
> read".** Green is a claim about a specific sha at a specific time, and it does not extend to the
> commit pushed after it. Say which sha is green and which is still running, or say nothing about
> the second one.

Mitigating but not excusing: the same failed run proves everything *else* in both pushes, since 392
files and 4637 tests passed around that one failure — including the new `task-status` import into the
service, which was the structural risk I was actually worried about.

### 08:38 — round ten, and the pattern has a name now

Copilot's review on `fbae823` posted 3 and suppressed 15. All three posted ones were real; fixed in
`ac1eb63`.

**The fail-open, and the best finding on the PR.** `usage()` filtered archived instances out **in the
query**, so the file-association probe never saw them. Archiving an instance withdraws neither the
upload nor the association, and the cascade that strands the file does not care that the instance is
archived — so a template whose only attachment sat on an archived instance reported **zero**
attachments and deleted straight through. Where *every* instance was archived it returned zeros
without running the probe at all.

The archived split is now in code, not in the query: `allInstanceRows` feeds the file probe, the live
subset feeds applied counts and executions. Reading `archived_at` rather than filtering on it also
degrades better on a bridge predating the column — the filter made PostgREST reject the whole read.

**My own cancel fix was half a fix.** I guarded the way INTO the folder handlers and left the loops
open. `mutateAsync` resolves between iterations, `isBusy` drops, Cancel goes live in the gap. Both
loops now re-check every iteration, and the archive toast counts what was archived rather than the
folder's length.

**The green default, again.** One commit after fixing legacy statuses rendering as passes, the *local*
colour map still defaulted `notStarted`, `pendingSignOff` and `signedOff` to green. Now read from
`TASK_STATUS_BY_ID`, which already assigns each a colour, with grey as the fallback.

> **Four findings on this PR, one shape: A RULE APPLIED TO THE WRONG SET.** The blocking rule in the
> dialog but not the confirm gate. The cancel check outside the loop instead of inside it. The colour
> map covering three statuses of nine. The archived filter over the file probe. Whenever this tab
> grows a rule, the question to ask is not "is the rule right" but **"which set is it being asked
> about, and is that the set that matters here"**.

**Deliberately untested:** the mid-loop cancel guard. Cancel is disabled while a mutation is in
flight, so the window only exists between iterations, and every deterministic test for it asserted a
fake rather than the real race. Said so on the thread. Given I turned this PR red today with a
timing-sensitive test of my own, a flaky test here would be worse than none.

## 2026-09-16 (12:55) — Rishi found a real scale bug: the usage probe 400s at ~585 instances

**The best review finding on this PR so far, and the first from a human rather than a bot.** Rishi
tested the delete path against the dev Supabase branch (`ohmzwpcilvxpozljllle`) with real data and hit
a folder with **594 task instances** behind it: the usage read returns **400**, so `DeleteTaskDialog`
refuses to offer a delete at all.

### The defect

`Range` pages the **response**. **Nothing paged the filter.**

`filterParam` (`postgrest-client.ts:61`) joins every value of an `in` filter into one query string,
and `select()` never chunks it. `usage()` passes instance ids straight through
(`checklist-library-service.ts:636`). Each quoted, URL-encoded uuid costs ~43 bytes, so the request
line grows linearly until the edge proxy rejects it.

His measured threshold, replayed against dev with real ids:

| ids | URL bytes | status |
|---|---|---|
| 575 | 24,943 | 200 |
| 580 | 25,158 | 200 |
| **585** | **25,373** | **400** |
| 594 | 25,760 | 400 |

### Three things he established that are worth keeping

1. **It is not PostgREST.** The body is plain-text `Bad Request`, not PostgREST's JSON envelope — the
   gateway rejects the request line before Postgres or PostgREST sees it. So `errorCode()` calls
   `response.json()`, that throws, and the caller gets a **bare 400 with no SQLSTATE**. That is
   precisely why this surfaced as *a delete the dialog quietly declined to offer* rather than an
   error that explained itself.
2. **Not file-specific.** `task_execution` takes the same unchunked list and 400s at the same size.
   The `commissioning_file_association` read just fires first, which makes it *look* file-specific.
3. **A malformed uuid is a different 400** — `22P02 invalid input syntax for type uuid`, *with* a
   JSON body. Worth distinguishing when triaging the next one.

### Fixed in `0040714`

Chunked inside `select()`, **not** inside `usage()` — the limit is a property of the transport, not
of one caller, so every table reached through the client (`task_instance`, `task_execution`,
`task_execution_item`, `commissioning_file_association`) gets it at once and no caller has to know
the limit exists. Split at **200** values (~8.6KB).

Two things that fell out of implementing it:

- **Only the longest `in` list is chunked.** Two would need the cross product of their chunks, and no
  caller passes two long ones — it is always a set of ids alongside short `eq`/`is` filters, which
  are repeated on every batch.
- **Chunking silently breaks ordering, and I nearly shipped that.** Each batch comes back ordered but
  the concatenation is not — a row from batch 2 can sort before one from batch 1. Added `sortRows()`
  to re-apply the caller's order with the same `id` tie-break the query asks the server for, and a
  test that drives 300 ids **reversed** so the batches arrive deliberately out of order.

> This is the same defect shape this tab keeps producing, one level down: **a rule applied to the
> wrong set.** Paging was applied to the response and not to the filter. Five of the ten earlier
> findings on this PR were that exact shape. When something here grows a rule, ask immediately which
> *other* set the same rule has to cover.

**Deliberately not fixed:** `update()` and `remove()` build the same query string and will hit the
same wall. Chunking a mutation changes its atomicity, which is the subject of the six threads left
open here about needing a server-side batch — so it belongs with that work, not quietly in this PR.
Said so in the reply.

### Also this pass

- **24 of 30 unresolved review threads resolved.** All had my replies and pushed fixes; they were
  just never marked resolved, which misrepresented the PR's state to human reviewers. Spot-checked
  ten claimed fixes (`usagePermitsDelete`, `blockedTemplateIds`, `MENU_WIDTH`, `event.repeat`,
  `systemLabels`, `wholeFolder`, `ownerKey`, `isLaterRun`, `usageError`, `liveDefinitionsById`) —
  all present in the tree before resolving anything.
- **Six left open on purpose**: the folder-delete / archive-all / `remove()` atomicity set (needs a
  server-side batch), and the `commissioning_file_association` column question for Darminder.
- **Merged master in** (`3a4a241`) — was 3 commits behind, zero conflicting regions.

> **Still no local test runner.** `npm ci` fails here (`@xyzreality/dhtmlx-gantt` is on GitHub
> Packages, session token has no `read:packages`), so there is no `node_modules` and CI is the only
> runner. Everything above was hand-swept. Two places in the new code were rewritten specifically
> because I could not typecheck them: a destructuring assignment that was an ASI hazard under
> `semi: false`, and a `<` between two `string | number` values, which the compiler may reject. Both
> replaced with forms that cannot fail rather than betting on them — this PR has already been burned
> twice by "passes vitest, fails the webpack prod build".

## 2026-09-16 (13:10) — the chunking commit shipped two bugs of its own, both the same shape

Copilot reviewed `0040714` within minutes and found **two defects in the fix itself**, plus one older
one. All three were real. Fixed in `54cc8bc`.

### The two I introduced, an hour after writing an essay about this exact failure mode

1. **Chunked reads lost the DEFAULT order.** `select()` sends `order=id.asc` whether or not the
   caller names a column — so an unordered read is still a promise of id order. My re-sort only ran
   `if (options.order)`. A caller who asked for nothing got **chunk order** back, silently, and only
   once a list crossed 200.
2. **Nulls jumped to the front on a descending order.** The comparator put nulls last, then the
   result was multiplied by `direction`, which flipped them. `{ ascending: false }` returned nulls
   **first** — contradicting PostgREST's `NULLS LAST`, the server's own answer to the same query,
   and *the doc comment directly above the line*.

> Both are **a rule applied to the wrong set** — the ninth and tenth instance of that shape on this
> PR, and I wrote the paragraph naming it as the recurring defect *in the commit these two shipped
> in*. Recognising a pattern is not the same as checking for it. The check has to be mechanical:
> after writing a rule, enumerate every set it must cover and walk them one at a time. Here the sets
> were "caller named a column" / "caller did not", and "values" / "nulls".

The direction now applies to the **values only** — a null is a row with nothing to sort on, not a
small value that descending floats to the top. Both have regression tests, the descending one with a
third of the rows null across a chunk boundary.

### The third: a second confirm could start a second folder loop

`isBusy` is a disjunction of the individual `isPending` flags, and every one drops between
iterations — so **Confirm went live in exactly the gap Cancel does**. The per-iteration guard added
on 09-14 cannot catch it: a second confirm leaves `folderPendingDelete` untouched, so both loops
agree they are working on the right folder.

Fixed with a loop-level claim held for the whole run (a **ref**, because state lags by a render and
that render *is* the gap being closed), released in a `finally`.

> **Copilot's suggested fix was wrong, and taking it would have broken a feature.** It said to fold
> the flag into `isBusy`. But `isBusy` also gates **Cancel** (`DeleteTaskDialog.tsx:199`) — so that
> would disable the only control that can stop a folder delete once it is running, and would make
> the withdrawal check added on 09-14 **unreachable dead code**, since that check only ever fires
> when a cancel lands between iterations.
>
> They are separate props now: `operationRunning` locks what *starts* work, `isBusy` gates
> everything including Cancel. **Re-entry and withdrawal are opposite answers to the same gap, and
> one flag cannot serve both.** A correct finding does not come with a correct fix attached — verify
> the remedy against the code the same way you verify the bug.

### Rishi's finding was itself Claude-authored

He edited his comment down and signed it "— Claude". Does not change anything — the defect was
verified independently against the code before a line was written, and the byte table reproduced. But
worth recording: **the strongest review finding on this PR came from another agent**, and the
verification step is what made it safe to act on either way.
