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

## 2026-09-16 (13:30) — CORRECTION to the 12:55 entry: the thread counts above are wrong

**Amends, does not replace, the "24 of 30 unresolved review threads resolved" line above.** That
count was produced by a bug in my own inspection script, and the real numbers are different.

The GitHub MCP payload names the field **`is_resolved`** (snake_case). I filtered on
**`isResolved`**, which is absent, so `.get()` returned `None` for every thread and *all* of them
looked unresolved. The "30 unresolved" figure was an artefact of that, not a reading of the PR.

**True state now: 34 threads, 33 resolved, 1 open.**

What that changes:

- The 24 resolves I performed were real and did stick — that part stands.
- The **five atomicity threads I deliberately "left open"** (folder delete, archive-all, the
  `remove()` RPC, and the two duplicate sequential-mutation ones) were **already resolved before I
  looked**. My decision to leave them open was moot; I was not holding anything open.
- The two new Copilot threads from the 13:00 review are also already resolved.

**The one genuinely open thread** is the `commissioning_file_association` column question —
`IChecklistTemplateUsage` documents `task_item_id` while the probe filters `task_instance_id`. That
is the one waiting on Darminder, and it is the right one to still be open.

> **Read the payload's own key names before filtering on them.** `.get()` on a wrong key is silent
> and returns a falsy value, so a filter built on it does not fail — it quietly classifies
> everything one way. This is the same failure as the day's code bugs (*a rule applied to the wrong
> set*), committed in the tooling used to inspect the PR rather than in the PR. Print one record's
> `keys()` before trusting a field name.

## 2026-09-17 (08:00) — #2216 landed on master; merging it into #2203 was NOT a clean merge

**The stacking question is closed.** #2216 (PLT-2997) merged to master as `69576da`, and **#2186 has
been retargeted from `Task/PLT-2997-…` back to `master`**. PLT-2968 / 2967 / 2966 are no longer
blocked behind another PR. Nothing further needed from the user on that.

#2203 was 2 commits behind (`69576da` #2216, `53431f1` #2194). `git merge-tree` reported **zero
conflicting regions** — and that was misleading. The real merge produced **four conflicted files**,
plus two semantic problems a clean textual merge would have hidden.

> `merge-tree` against the merge-base is not the merge git will actually perform. Treat a zero from
> it as "probably small", never as "no conflicts". **Eleven of this branch's files were also touched
> by #2216.**

### The four conflicts, all resolved by keeping BOTH sides

`commissioningTheme.ts`, `checklistLibraryService/index.ts`,
`checklistLibraryService/checklist-library-service.ts` (imports), `hooks/useChecklistLibrary.ts` —
every one was two independent additions at the same spot, not a contested decision. Verified after
merging that both sides' features are present in the service (`usage`, `setArchived`, `ownerKey`,
`isLaterRun`, `blockedTemplateIds` from here; `draftItemRows`, `linkNestedItems`, `value_fields`,
`table_columns` from #2216) and in `TaskLibraryTab.tsx`.

One naming overlap left deliberately: `destructive`/`red` and `success`/`green` are the same brand
colour under two names — this branch named by meaning, #2216 by appearance. Both kept, with a
comment. Unifying them is a rename across two feature areas and does not belong in a merge commit
where nobody can review it as its own change.

### Two things the merge would have broken silently

1. **A missing closing brace.** Keeping both sides of the `useChecklistLibrary` conflict left
   `useChecklistDefinitionDelete` unterminated — git had put the shared trailing `}` *after* the
   `>>>>>>>` marker, so it closed whichever side won. Keeping both meant two functions needed two
   braces and only one existed.

   > **When a conflict's two sides are both additive, check what sits immediately after the
   > `>>>>>>>` marker.** Shared trailing punctuation belongs to exactly one side.

   Caught by **prettier**, which failed to parse. With no `node_modules` and no typechecker,
   `prettier --write` is the cheapest syntax check available in this container — a parse error is an
   `[error]`, a formatting nit is a `[warn]`. Use it on every file touched by a hand-resolved merge.

2. **`sortRows` re-sorted on a hardcoded `id`, and #2216 introduced a table with no `id`.**
   #2216 added `tiebreakerColumn` precisely because `commissioning_project_file_scope` is keyed on
   `project_id` and PostgREST 400s on `order=id.asc` there. My chunk re-sort still used `id`, so on
   that one table every row would read `undefined`, every comparison would return equal, and the
   rows would come back in **chunk order from the function whose only job is to undo chunk order**.
   Silent, and only above 200 ids.

   Fixed in `d74d79b`: the re-sort uses the same `tiebreaker` the query was built with, so the two
   cannot drift apart again. Test added against `commissioning_project_file_scope` with 300 reversed
   ids.

   > Third time in two days for this exact shape, and the first where **neither side was wrong on
   > its own** — my sort was correct before #2216 existed, and #2216's tiebreaker is correct
   > independently. The defect was created by the merge. **After merging, re-read your own code
   > against the assumptions the other side just changed**, not only for textual conflicts.

### Also

34 files arrive from master **already prettier-dirty**. Not reformatted — CI does not gate on
format, and reformatting files this branch did not write would bury the real diff. Only the eight
files this branch actually edits are kept clean.

## 2026-09-17 (08:20) — I implemented a bot's false premise, and it took a second bot to catch it

**This supersedes the null-ordering claim in the 13:10 entry of 2026-09-16. That entry describes
the change as a fix; it was a regression.** The original code was right.

On 09-16 Copilot said, of `primary * direction`:

> "The comparator puts nulls after non-null values, but multiplying `primary` by `direction` here
> reverses that result for descending orders. A chunked `order: {ascending: false}` therefore
> returns nulls first, **unlike the server query**."

I verified the *mechanism* (yes, `* direction` flips null placement) and shipped the fix. **I did
not verify the premise** — the claim about what the server actually does. On 09-17 Copilot said the
opposite, and this time it is right:

> PostgreSQL: *"By default, null values sort as if larger than any non-null value; that is, **NULLS
> FIRST is the default for DESC order**, and NULLS LAST otherwise."*

We send no `nullsfirst`/`nullslast` modifier, so Postgres's default is what an unchunked read
returns — and reproducing an unchunked read is `sortRows`'s entire reason to exist. So nulls-last-
in-both-directions, which reads as the tidier rule, made the chunked path disagree with the
unchunked one on exactly the rows a nullable sort column exists to order.

Fixed in `672b066`: direction applies to null placement as well as to the values, which is the
single rule that produces both cases. The test asserting nulls-last-on-descending **was asserting
the bug**; it now asserts nulls first.

> **The lesson, and it is the sharpest one of the two days.** My standing rule was *verify a bot's
> claim before acting on it*, and I thought I was following it — I checked the operator, traced the
> flip, confirmed the behaviour changed. All true, and all beside the point. **I verified the
> mechanism and took the premise on trust.**
>
> A finding has two halves: *"the code does X"* and *"X is wrong because the correct answer is Y."*
> The first half is cheap to check and is where attention naturally goes. **The second half is the
> one that decides whether a change is a fix or a regression**, and here it was a one-line lookup in
> the Postgres docs that I never made.
>
> Ask explicitly: *what is this finding asserting about the outside world, and how would I know?*
> Yesterday's answer was "Postgres orders NULLS LAST on DESC" — checkable in thirty seconds,
> false, and load-bearing for the whole change.
>
> Corollary: **a test written from a false premise locks the bug in.** It passed CI, it looked like
> coverage, and it would have defended the regression against the next person to notice.

### Two more from the same review, both real

- **Restore left a dead folder link.** When the original folder was deleted, restore cleared
  `archived_at`, said "restored to root", and never cleared `folder_id`. It looked correct because
  `groupChecklistsByFolder` renders an unknown folder id at the root — so the *display* agreed with
  the toast while the *persisted row* disagreed with both.

  Fixing it forced the `has()` vs `get()` distinction: `get()` returns `''` for a folder that exists
  but was never named, so the old truthiness check read "unnamed" as "deleted". Harmless while the
  branch only chose a toast string; the moment it performs a write it would have **moved a task out
  of a real folder for having no name.** A latent bug that only becomes dangerous when a neighbouring
  branch gains a side effect — worth watching for.

- **`formatDateTime` had no test** despite feeding two surfaces. Three added. The valid case is
  asserted by shape, not exact string: `toLocaleString` with no explicit locale or timezone would
  otherwise test the CI runner's environment.

### Standing

- **#2186: green on `a5a94c3`, base back on `master`.** Unblocked.
- **#2203: `672b066` building.** Yesterday's green was `54cc8bc`, before the master merge.

## 2026-09-17 (08:35) — deleting a folder orphaned its archived tasks

Copilot's best finding on this PR, and it lands on the same fault line as the restore fix fifteen
minutes earlier.

**The chain.** `allFolders` groups `liveDefinitions`, so `folder.checklists` never mentions archived
tasks. Therefore:

- a folder holding **only** archived tasks counts as **empty** → takes the silent, no-dialog delete;
- a **mixed** folder deletes its live tasks and simply leaves the archived ones behind.

Either way those rows keep a `folder_id` pointing at a folder that no longer exists. That id is not
decoration — it is what *"Archived from …"* displays and what **Restore** uses. The FK clears it
after the fact, silently, so an archive row quietly changes where it claims to have come from and
Restore loses the destination it was advertising.

**Fixed in `a7be5fa`:** archived tasks in the folder are moved to the root deliberately, before the
folder goes, on both paths. *Moved, not deleted* — archiving is a decision to keep a task, and
deleting the folder it happened to sit in does not reverse that. A failed move leaves the folder
standing, because a folder that is still there can be deleted again whereas half-cleared archive
rows cannot be put back. The empty path also takes the loop-level re-entry claim, since it has no
dialog to disable the row's button and is now several writes rather than one.

Kept it dialog-free: nothing live to warn about, and warning about rows the user cannot see inside
that folder would be worse than the fix.

> ### The shape, now confirmed four times on this one PR
>
> **The archive filter is correct for the library VIEW and wrong for every path that WRITES.**
>
> 1. `usage()` filtered archived instances out of the query, so the file probe never saw them → a
>    delete proceeded over an upload (09-14).
> 2. `useChecklistDefinitionList` did not filter archived, so an archived template could still be
>    attached to a type and generated onto a new asset (09-14).
> 3. Restore did not clear a stale `folder_id`, so "restored to root" was a claim the row
>    contradicted (09-17, 08:20).
> 4. Folder delete resolved against live definitions only, orphaning the archived ones (09-17,
>    08:35).
>
> Two of those are "the filter was applied where it should not have been", two are "it was not
> applied where it should have been". **The question to ask of any new rule in this tab is not
> "is this correct?" but "which OTHER set does this rule also have to cover, and does it?"** Every
> one of these passed review and CI on the first pass.

**Standing:** `a7be5fa` building. #2186 green on `a5a94c3` with base back on `master`.

## 2026-09-18 (09:45) — merging master in reintroduced the archive bug through a door that did not exist

Master moved 3 (#2213 PLT-3086, #2218, #2220). Merged into #2203 as `0197d90` — **clean this time**,
no conflicts. But the semantic check afterwards found a real regression, and **no reviewer would
have caught it, because neither side was wrong.**

### What happened

**#2213 added membership reconciliation** to `task-instance-sync.ts`. Both of its new paths build
their own definition map before generating:

```ts
const definitionById = new Map(definitions.map(def => [def.id, def]))
```

The two pre-existing generating paths (lines 144, 361) use `liveDefinitionsById`, which drops
`archivedAt` rows. So after the merge an archived template could be generated onto:

- a **newly joined member** (`reconcileMemberships`), and
- a **rejoining** one whose owner chose "fresh" over restore.

That is exactly what the archive filter exists to prevent. The filter was in place, correct, and
**simply not reached**.

Fixed in `6817fcc`: both go through `liveDefinitionsById`, so an archived template behaves as a
deleted one already does — resolves to nothing, and the existing `!definition` guard skips it. Test
added on the membership path mirroring the asset and system ones.

> ### Fifth instance, and the first that arrived from someone else's merge
>
> The running tally of *a rule applied to the wrong set* on this PR:
>
> 1. `usage()` filtered archived instances out of the query → file probe blind to them (09-14)
> 2. `useChecklistDefinitionList` did not filter → archived template attachable to a type (09-14)
> 3. Restore did not clear a stale `folder_id` (09-17)
> 4. Folder delete resolved against live definitions only → orphaned archived tasks (09-17)
> 5. **#2213's two new generation paths bypassed the filter (09-18)**
>
> The first four were mine. The fifth is nobody's fault: **#2213 could not respect an invariant it
> had never heard of, and my filter could not cover a call site that did not exist.** The merge is
> the only place the two meet.
>
> **So a clean merge is not a safe merge, and "did my code survive?" is the wrong question.** The
> right one is: *what new code did the other side add that my invariant is supposed to govern?*
> For this branch, concretely — **on every merge, grep for new `ChecklistLibrary.list` callers and
> new `ChecklistInstances.generate` callers, and check each goes through `liveDefinitionsById`.**
> An invariant enforced by a helper only holds where somebody remembers to call the helper.
>
> (The stronger fix is to make it unbypassable — have the service never hand out archived
> definitions to the reconciler at all, rather than asking four call sites to filter. Worth raising
> once this PR lands; too broad to do inside it.)

### Also verified, and clean

`postgrest-client.ts` also overlapped: master added a `notNull` filter op. The chunking only
inspects `in` filters and passes every other op through untouched, so there is no interaction. Four
of the six overlapping files were test/type files with no behavioural overlap.

## 2026-09-18 (09:55) — three more from Copilot: two mine and real, one I pushed back on

Fixed in `b8f14e8`.

### Restore announced itself before the move landed — MINE, and the same bug one step later

Yesterday's 08:20 fix cleared the stale `folder_id` when the original folder was gone, then **fired
`moveTask.mutate` and showed the success toast in the same breath**. A failed move left the task
live again, still pointing at the deleted folder, with *"restored to root"* already on screen.

> **That is the exact defect the fix was for — claim without the write — reintroduced by the fix
> itself, displaced by one step.** Fixing a fail-open with a second unawaited write just moves where
> the lie is told. When a fix adds a write, ask what the UI says if only *that* write fails.

Both writes now sit in one awaited `try`; failure shows an error naming the task. Worst case stays
recoverable and visible (live with its old link) rather than silently misreported.

### A chunked `in` list could return a row twice — MINE, and a semantic change nobody asked for

`in.("a","a")` matches a row **once**. The same value split across two chunks matches **once per
request**, and the concatenation returns it twice. So crossing 200 values quietly changed what an
`in` filter means.

Deduplicated **on the way in** (`[...new Set(values)]`), not by filtering rows on the way out —
the client has no row identity to dedupe by. A set gives exact parity with the unchunked query.
Test: 250 distinct ids passed twice → two requests, 250 rows.

> Third defect the chunking has produced (default order lost, nulls flipped, now duplicates). All
> three are the same class: **an optimisation that changes the SHAPE of a query has to preserve
> every guarantee the original had**, not just return the right set of rows. Ordering, null
> placement and multiplicity were each a separate promise.

### The folder-delete path at :1197 — DISAGREED, with a reason

Copilot said the dialog path also releases the claim before `remove` settles, exposing the row
kebab. Checked, and it does not: `DeleteTaskDialog` is a plain MUI `Dialog`, so it is **modal with
a backdrop**, and it only closes inside that mutation's own `onSuccess`. While the request is in
flight the dialog is up, its buttons are disabled by `isBusy` (which includes `remove.isPending`),
and the backdrop blocks the menu underneath.

The **empty-folder** path was genuinely exposed for the opposite reason — no dialog at all — which
is why it needed the await. Offered symmetry if a reviewer prefers one mechanism, but did not
restructure a working path on a race that cannot be constructed.

> Both of the suppressed findings were correct and the unsuppressed one was not — **Copilot's own
> confidence ranking was inverted here.** Verify each on its own; the label is not evidence.

## 2026-09-18 (10:05) — a cancel during the evacuation could still delete the folder

Fixed in `ea3eef2`. The destructive one of the round, and **entirely mine**: the rule was already
written twice in this file and I did not apply it to the loop I added yesterday.

`evacuateArchived` is several awaits. The withdrawal check sat only **before** it, so a cancel
landing inside the evacuation fell straight through to removing the folder — after having already
moved some of its archived tasks to the root.

Worse than the reviewer said: **`moveTask.isPending` was never in `isBusy`.** Every other mutation
the dialog can start was there. So Cancel was not merely reachable *between* moves the way it is
between deletes — it was enabled *throughout* them.

Two changes: the flag joins `isBusy`, and the withdrawal test is **passed into** the evacuation
rather than repeated after it, so one check does both jobs (moves stop; `false` means the delete
never runs). The empty-folder path passes no predicate — no dialog, nothing to withdraw.

> **Every new await in a cancellable sequence needs the same guard the existing awaits have, and
> every new mutation needs to join the flag that disables Cancel.** I added a loop and wired
> neither. The tell was available without a reviewer: `isBusy` names four mutations, the handler
> uses five.

### The collation point — taken, with the claim corrected

`<` on strings is code-point order (every uppercase before every lowercase; accents after `z`);
Postgres uses the database's collation. Switched to `Intl.Collator` and **rewrote the comment to
stop claiming parity** — the collation belongs to the database, not the browser, so this narrows
the gap rather than closing it.

Unreachable today, and worth recording why: the only two reads ordered by a text column
(`asset_type.name`, `system.name`) filter on `eq`/`is` only and never chunk.

### The `ArchiveSection` finding — WRONG, and checked before replying

Claimed the archive is hidden when a search leaves `folders.length === 0`. It is not: the ternary
closes on the line above and the archive renders as a **sibling**, guarded only by `!isEmpty`. The
comment sitting on it describes that exact scenario as the reason it is placed there.

> **Second wrong finding in two rounds, both about nesting/modality** — the folder-delete "race"
> behind a modal dialog, and now this. Copilot reads the diff hunk, not the surrounding structure,
> so its false positives cluster on *what encloses the code*. Cheap to check, and worth checking
> every time rather than either trusting or dismissing by reflex.

**Round tally across the two reviews: 5 findings, 3 real (all mine), 2 wrong (both structural).**

## 2026-09-18 (12:20) — Darminder: deleting a task leaves an unopenable row. A DESIGN decision, escalated not fixed

`changes_requested` from **Darminder** (COLLABORATOR, with a video): delete a task that is assigned
to a type, and *"the old task remains but nothing to show when you click on it. Maybe it should
update the type and asset with the task removed?"*

### Mechanism — verified, and it is deliberate

`task_instance.task_template_id` is **`ON DELETE SET NULL`**, and the schema reference states the
intent outright: *"instance survives template deletion"*
(`docs/commissioning/PLT-2862-schema-reference.md:95`). The instance also carries a **denormalised
`template_name`**. So after a delete the row keeps its name and loses its template — it renders, and
there is nothing behind it to open.

`ChecklistLibraryService.remove()` deletes the `task_template` row and nothing else; everything else
is the FK. **Not a bug in this PR's code** — the PR's own test plan documents it ("check the asset
still has its generated task").

### Why the intent now looks wrong

Keeping the instance was reasonable when delete was the only verb. **This PR adds Archive**, whose
entire definition is *"take the task out of the library, leave everything already applied
untouched"*. If Delete also leaves the instances, the two verbs differ only in whether the library
row survives — and Delete's version leaves something strictly worse: a task nobody can open, run or
clear.

Delete is already refused outright when a task has **any** recorded work, so everything a cascade
would remove is by definition a never-run instance. Nothing of value is lost.

**Recommendation: Delete should cascade** (unlink type mappings, remove never-run instances) and
Archive should be the verb that preserves.

### Why it was NOT implemented

- It **reverses a stated design decision** and changes what a destructive action does. That is the
  author's call.
- The user's own brief says a report backed by **video/images** → comment or leave open, and the
  work order says a larger ask from a human reviewer → propose, the author decides.
- `asset_type_task`'s FK behaviour is **not documented anywhere in the repo**, so whether the
  type→task mapping survives or cascades could not be verified from here. Asked Darminder to confirm
  what he saw on the type, since that would be a second cleanup rather than the same one.

Thread left **open**, not resolved.

> The tell that this is a design question and not a defect: the behaviour is **documented in three
> places** (schema reference, the FK itself, the PR test plan). When the code, the schema and the
> test plan all agree, a reviewer's "this seems wrong" is a challenge to the decision, not a report
> of a deviation from it. Those go to the author.

**APIs that exist if the cascade is approved:** `TypeTasks.unlinkAssetType(...)` and
`ChecklistInstances.removeInstances(projectId, instanceIds)` — so the change is bounded, just not
mine to make unasked.

## 2026-09-18 (13:20) — merging the #2186 merge in produced a duplicate i18n key

#2203 brought master in again after #2186 landed (`015bf5e`). One textual conflict — both sides had
added an import to `checklist-library-service.ts`, kept both.

**The real find was in `main.json`: a duplicated `preconditions` block.** Both sides had added an
identical block to `hc.pages.ChecklistCreatePage`, at different points in the file, so git took both
and produced a valid-looking JSON object with the key twice.

> **Same class as the `requiresSignOff` duplicate that broke the build on 09-16, in a different
> language.** In TS a duplicate key is TS1117 and webpack refuses it; in JSON it is *legal* — the
> parser silently keeps the last one. So it would not have failed a build, a test or Sonar. It would
> simply have sat there, with one of two identical blocks winning, until someone edited the "wrong"
> one and wondered why nothing changed.
>
> **The check is cheap and worth running on every merge that touches a translations file:**
> ```
> python3 -c "import json,collections; json.load(open('src/main/webapp/i18n/en/main.json'),
>   object_pairs_hook=lambda p: (print([k for k,n in collections.Counter(k for k,_ in p).items() if n>1] or ''), dict(p))[1])"
> ```
> `json.load` alone will NOT tell you — it has to be `object_pairs_hook`.

Blocks were byte-identical, so dropping either was safe; kept the one sitting with the other builder
strings.

### The post-merge invariant check passed this time

Ran the check written down after the 09-17 merge — all four `ChecklistLibrary.list` call sites in
`task-instance-sync.ts` still route through `liveDefinitionsById`, and #2186 added no new
`ChecklistInstances.generate` callers. **The check earning a "nothing found" is the point**; it cost
one grep.

## 2026-09-18 (13:25) — a wrong finding that cited, as its evidence, the test that disproves it

Copilot on `commissioningTheme.ts:36`: *"`CX.warning` and `CX.destructive` … do not populate
`commissioningTheme.palette.warning` or `palette.error` … so these buttons can fail to render/style
**(and the new theme test exercises that path)**."*

Both halves are wrong, and the parenthetical is the giveaway.

1. **Rendering** — `createTheme` fills in MUI's defaults for any palette key you omit, so
   `palette.warning.main` exists on `commissioningTheme` whether or not it is named. There is no
   missing-key path.
2. **Styling** — these buttons never render under `commissioningTheme`. The tab wraps everything in
   **`taskLibraryTheme`** (`createTheme(commissioningTheme, …)`), which carries explicit
   `containedWarning` / `containedError` overrides setting fill, border, text colour and hover from
   the CX tokens. The palette entry is not what paints them.
3. **The cited test asserts exactly that.** `taskLibrary.theme.test.tsx` renders
   `<Button variant='contained' color='warning'>` under `taskLibraryTheme` and checks the CSS MUI
   actually emitted contains `background-color:{CX.warning}` and `border:1px solid {CX.warning}`.
   Green on the current head. Were the palette entry load-bearing, that assertion would be finding
   MUI's default orange.

Replied with the evidence and **resolved** — confident disagreement, per the run brief.

> ### Third wrong Copilot finding, and the same failure mode all three times
>
> 1. the folder-delete "race" — missed that the dialog is **modal**;
> 2. `ArchiveSection` hidden by a search — missed that it sits **outside** the ternary;
> 3. this one — missed that the buttons render under a **derived theme**.
>
> Every one is a misread of **what encloses the code**, not of the code. The diff hunk is all it
> reliably sees: a wrapping `ThemeProvider`, a parent JSX branch, a modal backdrop, a theme built
> `createTheme(base, …)` — none of that is in the hunk.
>
> **So the check for any Copilot finding is: what does this code sit inside, and did the finding
> account for it?** That one question would have resolved all three in under a minute each. It is
> also why the three real findings it got right this week were all *local* — a missing await, a
> hardcoded value, an unfiltered map.
>
> Corollary worth keeping: **a finding that cites supporting evidence is not thereby better
> supported.** This one named the test that refutes it. Open the evidence.

**Thread state on #2203: 40 of 41 resolved.** The one left open is the
`commissioning_file_association` column question (`task_item_id` vs `task_instance_id`) awaiting
Darminder — plus his delete-cascade report, which is an issue comment rather than a review thread.

## 2026-09-22 — four days on: the fix PR is still unreviewed, and a seven-region merge

### #2222 has sat unreviewed since 09-18, and the hotkey is still live on master

`use-runner-override.ts` is **still on `master`** (`91adb63`). #2222 has had no review in four days.
Merged master into it to keep it current — master has not touched any of the three files it removes
from, so nothing was re-decided.

> Worth stating plainly for the next run: **the escalation worked and the fix still has not landed.**
> Flagging a risk and opening a fix does not retire it. Until #2222 merges, anyone testing
> Commissioning on dev is opening the managed runner for every task regardless of its real mode.

### Darminder's delete-cascade: agreed, and escalated to the designer

He replied agreeing it is a design question and asked Ilia to confirm with **Jason**: *"it could be
a bit confusing if you delete a task and the task still remains with no reference in the library."*

Replied with the two framings for Jason, plus the point that makes the decision cheap: **delete is
already refused when there is any recorded work**, so a cascade can only ever remove never-run
instances. It is not "is it worth building" — the APIs exist — it is only "what should Delete mean
now that Archive exists to preserve". Re-asked, unanswered so far, whether the **type mapping** also
survived; `asset_type_task`'s FK is undocumented in the repo.

### The #2225 merge: seven conflict regions, and git reported none of the three real problems

`#2225` (task library import from file) rebuilt the import flow inside the same tab this branch
restructured. Seven conflicting regions; **six took this branch's side because it is a strict
superset** — the kebab wrappers merely indent master's content (folder row and task card are
byte-identical inside), and the state and render halves contain nothing master has that this does
not. Verified by **diffing the two halves** (`grep -vxF -f ours theirs` returned empty) rather than
reading 230 lines and hoping.

**The imports took the union, and that is where it bit.** Three errors, none of them a conflict:

1. `ChecklistImportContent` and `SliderContent` became **unused** — #2225 replaced the slider import
   flow with a modal, and the usage left via the *auto-merged* half. `noUnusedLocals` fails the build.
2. The union imported `TeamSliders.styled`, `checklistLibraryService` and `commissioningTheme`
   **twice each** — duplicate-identifier errors.
3. `commissioningTheme` then had **no use left**, because the ThemeProvider here takes the derived
   `taskLibraryTheme`.

> ### The rule this yields
>
> **"Take the union" is safe for content and unsafe for imports.** Two sides that each added an
> import block produce duplicate modules and orphaned bindings, and the orphans are created by the
> *auto-merged* parts of the file — the half git resolved silently, which is the half you did not
> read.
>
> So after resolving any merge that unions an import block, run three checks before committing:
> ```
> grep -oP "^import .* from '\K[^']+" FILE | sort | uniq -d      # duplicate modules
> # every named binding: count occurrences; 1 means import-only
> node -e "...brace balance..." ; prettier --check FILE           # parses
> ```
> All three caught something here. None of them is a conflict marker.

## 2026-09-22 (18:35) — five findings on the merge, all real, one of them a merge interaction

Fixed in `02cdfa3`. Notable because **all five were correct** — the first round in a week with no
false positive, and the reason is visible: every one is *local* to a few lines, which is the shape
Copilot gets right (see the 09-18 note on its three structural misses).

1. **`duplicate()` dropped `requiresSignOff`** — a MERGE INTERACTION. The flag and
   `signingSlotsFor` arrived from master; `duplicate()` predates them and nothing forced the two to
   meet. And it is worse than losing a flag: `create()` derives the version's **signing slots** from
   it, so the copy had none — a run of it could never be signed off.

   > The comment directly above already argued the general case for `type`: *"The kind locks at
   > creation, so it has to be set HERE."* **A rule stated for one field and not applied to the
   > next field with the same property** — the archive-filter shape again, in a new place.
   >
   > **Check after any merge that adds a field to a create path: does every OTHER caller of that
   > create path pass it?** `duplicate()`, import, and any template-copying path all build drafts.

2. **Chunk de-duplication was by JS identity, not wire value.** `Set` keeps `1` and `'1'` apart;
   `quote()` renders them identically, so they land in different chunks and the row returns twice.
   Keyed on `String(value)` now. The fix I made on 09-18 for duplicates was correct in intent and
   incomplete in reach.

3. **The confirm guards compared only the task id.** Cancel during the usage refetch, reopen the
   **same** task, and the stale continuation matched on id and deleted without the new dialog being
   confirmed. **An id says which task; it cannot say which asking.** Added a generation token bumped
   on every open and cancel, checked after the await on both paths.

4. **Restore treated an unreadable folder list as an empty one.** `taskFolders` defaults to `[]` on
   error and only the definitions query's error was handled, so every real folder failed
   `folderNameById.has()` and the task was moved to the root — placement lost because a transient
   read failed. Now refuses, matching the rule the delete dialog already follows.

   > Third time this exact fail-open has appeared on this PR (usage check, then the restore branch
   > once it gained a write, now the folder list). **The pattern: a default value that stands in for
   > "no data" is indistinguishable from "the read failed" — and becomes dangerous the moment the
   > branch reading it performs a write.** `= []` and `?? 0` defaults are the places to look.

5. **`resolveRejoin(..., 'fresh')` had no archived test** — the filter went in on 09-18, the
   coverage did not. Added.

## 2026-09-22 (later) — `02cdfa3` is fully green; one thread left open by design

Build, SonarCloud (quality gate passed, 51.1% coverage on new code) and the Copilot re-review all
came back **success** on head `02cdfa3` — the commit carrying the five fixes from the post-#2225
merge review. #2203 is now green and mergeable-blocked only on human approvals.

Copilot's re-review raised one finding, and it **crossed with the push**: it asked for a
`resolveRejoin(..., 'fresh')` case asserting an archived library definition generates nothing. That
test was already in `02cdfa3` (`task-instance-sync.test.ts:655-662`, *"fresh generates nothing when
the template has since been archived"* — asserts `generate` not called and the archived set
untouched). Verified against the file before answering, replied on the thread and resolved it.

**Still open on the PR, deliberately: the `commissioning_file_association` column question**
(`task_item_id` as documented on `IChecklistTemplateUsage` vs `task_instance_id` as queried). My
reading — that the two columns answer different questions and the doc ran them together — is on the
thread; it needs a human with the real FK to confirm. Do not resolve it on a re-read.

Also still awaiting humans from earlier runs: Darminder on whether the **type mapping** survives a
delete (`asset_type_task` FK undocumented), Ilia/Jason on the delete-cascade decision, and Rishi's
rejection code for "Could not save". PLT-3140 (Delete Assets) landed on the board on 22 Sep and is
downstream of that same cascade answer — see `sprint-tickets/PLT-3140/context.md`.

## 2026-09-25 — master merged (PR #2203)

Branch was 8 commits behind `origin/master`, no conflicts. Merged and pushed (`d9fddce`)
so the PR is reviewed against current master. Re-ran TaskLibraryTab + checklistLibraryService
+ typeTaskService suites after the merge: 269 passed, 1 skipped.

No new review feedback since the last run. The one open thread is still the deliberate one
(the `task_item_id` vs `task_instance_id` file-association question), last word mine —
left open on purpose, as the PR description says.

## 2026-09-25 — Copilot found the same id-only guard bug in the folder loops (`d1deabf`)

Master was merged into the branch (`d9fddce`) and Copilot re-reviewed. One High finding, and it is
correct: **the archive-all loop guarded on the folder id alone.**

This is the *same* defect 02cdfa3 fixed for the single-task confirm path, in code that never learned
the lesson. An id says WHICH folder; it cannot say WHICH asking. Cancel while a run is in flight,
reopen the same folder, and the id matches again — so the withdrawn run carries on archiving the old
selection under a dialog the user has just opened and never confirmed.

Four holes, one shape (Copilot named three; the fourth came out of reading around it):

1. `archivePendingFolderTasks` per-iteration guard — id only.
2. **No check after the last await at all**, so `setFolderPendingDelete(null)` + the success toast
   ran unconditionally. A cancel landing during the final archive closed whatever dialog was open by
   then and claimed a count for a run the user abandoned. *(Not in the finding; found by reading.)*
3. `confirmDeleteFolder` captured a `generation` but spent it **once** before the loop; the
   per-iteration guard fell back to the id.
4. The `evacuateArchived` abandoned-callback — id only.

**Fix:** one `stillAsking(folder, generation)` closure used at every site in both loops. The point
is not brevity. The guard had been written out by hand in five places and one drifted; a single
predicate makes it impossible for a loop to check one half of the answer at one site and both at
another. Both halves are load-bearing — the id alone misses cancel-and-reopen of the same folder,
the generation alone misses a switch to a *different* folder inside one asking.

Regression test added on the archive-all reopen race
(`TaskLibraryTab.context-menu.test.tsx`, *"stops archive-all when the folder is cancelled and the
SAME one reopened"*). It flushes a macrotask before asserting, deliberately: reaching the next task
is all microtask work, so without the flush the assertions pass instantly **and would still pass
with the guard deleted** — the #2186 trap, avoided this time by design rather than by luck.

### Pitfall banked: `prettier --check` on a copy outside the repo silently uses default config

Checking whether a file was already prettier-dirty at baseline, I wrote the committed version to the
scratchpad and ran `prettier --check --parser typescript` on it. It said **clean**. It was not —
prettier resolves `.prettierrc` **relative to the file being checked**, and the scratchpad is
outside the repo, so it used stock defaults. Re-running via `git stash` *in place* showed the file
was dirty at baseline all along.

That wrong reading had already made me accept `prettier --write`, which reformatted **three
unrelated lines** (`x ?? null` → `(x ?? null)` — a newer prettier major than the repo's, because
`npm ci` fails here so `npx` fetches latest). Those were reverted; the pushed diff is only the guard
change. **To test baseline formatting, stash and check in place — never a copy outside the repo.**

### Outcome of `d1deabf` — green, and Copilot raised nothing new

Build, SonarCloud (gate passed, 50.7% on new code) and the Copilot re-review all **success**. The
re-review posted no new findings: the thread count held at 47 and the only unresolved thread is
still the `commissioning_file_association` one, open by design. The new archive-all reopen test ran
in CI, so the guard is covered by a test that has actually executed — not just by local reasoning.
