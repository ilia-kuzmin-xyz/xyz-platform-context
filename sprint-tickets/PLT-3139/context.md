# PLT-3139 — Add tasks to the Other tasks section of asset and system types

**Status:** In Code Review · **PR:** [hc-frontend#2236](https://github.com/XYZReality/hc-frontend/pull/2236)
**Domain:** commissioning → asset/system types + task-instance generation

---

## 2026-09-25 — three review threads closed

### The real bug: the "once per type" invariant had a loading hole

The PR's contract is *"A task still appears once per type: the step pickers and the Other
picker hide each other's tasks"*. That is enforced entirely client-side, from two queries:

- `useAssetTypeTasks` → `stepTaskIds` (pre-existing, on master)
- `useAssetTypeOtherTasks` → `otherTaskIds` (new in this PR)

**Neither was in `AssetTypeDetailContent`'s loading/error gate** — the gate was only
`registerQuery || catalogueQuery` (`AssetTypeDetailContent.tsx:245-246`), while both mapping
queries sat ~35 lines below it with silent `= []` / `= {}` defaults.

Why that is not cosmetic: re-adding the *same* Other task **is** idempotent — `linkAssetType`
upserts on
`project_id,asset_type_id,workflow_id,readiness_step_id,task_template_id,bucket`
and the null step collapses because the index is `nulls not distinct`. But that is not the
case the gap opens. With `otherTaskIds` empty the **step** picker stops hiding an
already-mapped Other task, so it can be added to a readiness step: different
`readiness_step_id`, different `bucket` → a genuinely distinct row that nothing dedupes.

Fix: both queries now feed `isLoading` / `isError`. Fallbacks are module-level constants
(`NO_OTHER_TASKS` / `NO_STEP_TASKS`), not `?? []` literals — the latter hand the memos below
a fresh reference every render, which `react-hooks/exhaustive-deps` flags.

### What that immediately exposed — two test fixtures were lying

Gating the queries broke 8 previously-green tests, and the reason is the same hole one layer up:

- `AssetTypeDetailModal.test.tsx` mocked `TypeTasks` **without** `getOtherForAssetType`.
- `AssetTypeDetailContent.i18n.test.tsx` had no `TypeTasks` key at all — it still named the
  service `ReadinessTasks` (an old name), so **both** mapping reads had been rejecting and
  the empty-array default swallowed it.

Both fixed. **Check this pattern elsewhere**: a `useQuery` destructured with a literal default
and left out of a page's gate will hide a missing service mock indefinitely.

### `typeTaskService` had no tests at all

Added `type-task-service.wire-contract.test.ts` (12 tests), following the recording-fake
pattern from `checklist-instance-service.wire-contract.test.ts`. Pins:

- `getOtherForAssetType` — table, `bucket = other`, no fallback read on unknown type, dedupe
- stepless `linkAssetType` — null step **and** null workflow, `other` bucket, no step lookup,
  and the exact `onConflict` string the idempotent re-add depends on
- stepless `unlinkAssetType` — `op: 'is'`, not `eq`. **`eq null` matches no row in SQL**, so
  getting this wrong makes the unlink a silent no-op
- `setForSystemTypeStep` — both directions of the bucket/step biconditional

Writing them caught that the fake was missing `rpc`, which vitest tolerated and `tsc` did not.
**Run `npx tsc --noEmit` on new test files** — a fake that implements a client interface will
pass at runtime while failing the build.

### Declined: legacy assets without `assetTypeId`

`reconcileAssets` resolves an asset's type via `asset.assetTypeId` only, so an asset carrying
just the catalogue *name* is skipped. `assetTypeId` **is** optional on the model, so the
concern is real — but that line is unchanged from master (this PR only loosened the guard from
`!type?.workflowId` to `!type`, so workflow-less types generate their Other tasks). A name
fallback would change which assets get tasks generated for *every* caller, and needs its own
answer for a name matching two catalogue entries or none. Replied, resolved, flagged for a
separate ticket.

**Worth raising:** that follow-up ticket does not exist yet.

Commits: `4c8a3d4`. Also merged `origin/master` (was 2 behind, no conflicts).

## 2026-09-25 (later the same run) — second Copilot round, two more real findings

Copilot re-reviewed after the push and raised two more. Both were genuine.

### 1. The exclusion had a *third* unresolved dependency

I had gated the two mapping queries but missed that `onTypeIds` also walks
`STATIC_READINESS_LEVELS` and resolves each rung's **name** → this type's step id via
`useAssetTypeStepIds`, which is its own query. Unresolved, that map is empty, the walk yields
nothing, and the Other picker offers a task already on a rung — the same duplicate, by a
different route.

**Rejected the obvious fix.** Disabling Edit until `stepIds` settles works, but it makes the
button dead on every load for a dependency that only matters while staging, and it broke 13
tests that click Edit immediately. Worse, it strands the page if that query never settles.

**Took a better one: don't need the resolution at all.** `stepTaskIds` is *already* keyed by
step id. The name → id map was only ever needed to line the ladder's rungs up with this
session's staged *removals*. So `onTypeIds` now walks the mappings themselves and uses the
name map only to attach removals. Unresolved, the worst case flips from "writes a second
mapping" to "keeps offering a task staged for removal" — harmless. **16-line diff, no UI
change, no test churn.** Generalisable: when a derived set must be complete, drive it from
the data that is already in the right shape, not from the presentation's own vocabulary.

### 2. Create-then-link was not retryable

`createdTypeRef` was assigned only after `createWithStagedTasks()` returned in full, so a link
failing threw with the type **already created** and the ref still null. The catalogue refetch
had by then made `duplicate` true, so pressing Save again returned at
`if (duplicate && !createdTypeRef.current) return` — type stranded without its tasks, no user
recovery. The ref's own comment claims it survives exactly this; it just wasn't true for a
failure inside the helper.

Ref is now set the moment the row exists; the helper creates only when it has none, so a retry
re-applies the links. No per-link bookkeeping needed — `linkAssetType` upserts on the mapping's
own key, so re-applying a landed link is a no-op.

**Both regression tests were verified to fail on the previous implementation** before being
kept. Worth doing every time — a test written after the fix can pass vacuously.

Commits: `4208212`, `971da9e`. Earlier in the run: `4c8a3d4`, `883497b` (a third fixture,
`TypesTab.test.tsx`, also missing `getOtherForAssetType` — caught only by CI, because I had
run the `AssetTypePage/` folder and not the suite).

## 2026-09-25 (third round) — the regression test broke CI, and was right to

The create/link retry test (`mockLink.mockRejectedValueOnce`) passed locally and **failed the
CI build** — with all 5705 tests green. The step that failed was "Lint & Run Tests"; lint was
clean and no test failed. The cause was one line in the vitest summary:

```
Errors  1 error
⎯⎯⎯⎯ Unhandled Rejection ⎯⎯⎯⎯⎯  Error: link is down
```

**Vitest exits non-zero on an unhandled rejection even when every test passes.** A local
single-file run does not surface it the same way, so this is only visible on a full run.
Worth remembering before writing any test that makes a component's promise reject.

And the rejection was a real defect, not test noise: `save()` is called from an `onClick`
(`void save()`), and its `try` had only a `finally`. So a failing link escaped as an unhandled
rejection and **the user got nothing at all** — a Save button that appeared to do nothing.

Fixed by catching it into the same partial-save shape the prerequisites already use
(`sysReqSaveFailed` → now also `taskSaveFailed`): the type exists, the name field locks, the
message says what happened, and Save resumes the links. Needed its own i18n key —
`create.sysReqError` names prerequisites specifically, so reusing it would have lied.

Commit `72a8d5a`.

### Running tally of process lessons from this one ticket

1. Run the **folder**, not the file (missed `use-asset-systems.test.ts` on PLT-2972).
2. Run the **suite**, not the folder (missed `TypesTab.test.tsx`).
3. Run **`tsc --noEmit`** too — a fake implementing a client interface passed vitest and failed tsc.
4. Watch the **`Errors` line**, not just pass/fail counts — an unhandled rejection fails CI silently.
5. Verify each regression test **fails without its fix** before keeping it.

## 2026-09-25 (fourth round) — my own fix had a bug, caught by the next review

Copilot flagged that the `try/catch` I added around `createWithStagedTasks()` wrapped the
**create** as well as the links. So a failed *create* reported *"The type was created, but its
tasks could not all be saved"* and disabled the name field.

The locking was the worse half: **a create can fail precisely because of the name** (duplicate,
validation), so telling the user the type already exists and then locking the field left them
unable to change the only thing that was wrong.

`createdTypeRef` already distinguishes the two, because it is set the moment the row lands:
set → the type exists and only links are outstanding (resumable, name locked); unset → nothing
was created (own message, name editable). Added `create.createError` rather than reusing either
partial-save string.

**The lesson, and it is the recurring one on this ticket:** widening a `catch` without narrowing
what it *concludes* turns one failure mode into a wrong diagnosis of another. Same shape as the
`otherTaskIds = []` default — an absent value being read as a meaningful one.

Commit `e02fa1a`. Test verified to fail on the previous commit.

## 2026-09-26 — scheduled run: master catch-up, no new review work

Checkpoint sweep only; no code change needed on this ticket.

- **Checkpoint 1 (feedback):** all review threads on this PR are resolved. Nothing outstanding.
- **Checkpoint 2 (build):** green on the previous head before the merge below.
- **Checkpoint 3 (master drift):** the branch was **4 commits behind** master
  (`e94611c` PLT-3141, `5bf2509` PLT-3142, `8bebb79` PLT-3127, `ff81032` PLT-3138).
  Merged `origin/master` in — **no conflicts** — and pushed. CI re-running on the new head.

Still in **In Code Review**; waiting on human reviewers, not on us.

## 2026-09-28 — scheduled run: checkpoint sweep, nothing to do

PR **#2236**, head `e4bf8c2`.

- **Checkpoint 1 (feedback):** every review thread resolved. Nothing outstanding.
- **Checkpoint 2 (build):** `Build & Test - frontend service [PR Check]` **success** on the
  current head.
- **Checkpoint 3 (master drift):** none. `origin/master` is still `ff81032` (PLT-3138), the
  same commit this branch was brought up to on 09-26 — master has not moved in two days, so no
  merge was needed.

Still **In Code Review**, waiting on the four requested human reviewers.

## 2026-09-29 — the master merge broke the build, and it was hiding a real bug

PR **#2236**. Arrived at this run **red**: `build` failed on `a3996bf` (the 28 Sep master merge),
3 tests in `AssetTypeDetailContent.test.tsx`, all of them this ticket's Other-tasks save tests,
all failing on `findByTestId('asset-type-changes-review')`.

### What master changed, and why it hit this ticket

`#2240` (PLT-3123/PLT-3171) introduced **`touchesLiveWork`** and rewired `requestSave`: the
changes-review sheet now only opens when the draft reaches work already in flight; anything else
saves straight through with a toast. Master's own new tests state the contract plainly —
*"a draft that touches no live work saves without the review sheet and toasts"* and
*"removing a template with no generated tasks saves without the review sheet"*.

`touchesLiveWork` walks `STATIC_READINESS_LEVELS`. **Other tasks are staged under
`OTHER_TASKS_KEY` ('other'), which is not a rung**, so the whole bucket was invisible to it.

### The half that was a real bug, not just stale tests

**Removing an Other task an asset already carried saved silently.** `deleteInstances` can only be
set from the review sheet, and `applyStagedChanges` only calls `removeTaskInstances` when it is
true — so with no sheet the user was never asked and the instances were left behind. That is
precisely the case the sheet exists for.

### The half that was stale tests

The two Other **add** tests were asserting the *old universal-review* behaviour that master
deliberately removed. Other tasks gate no step, so an add cannot un-achieve a rung — by master's
own rule it touches no live work. Those two were rewritten to assert the direct save; the
"review shows the other tag" assertion moved onto the removal test so the coverage was not lost.

**The judgement worth carrying forward:** when a master merge breaks your tests, decide per
assertion whether master changed the *contract* or broke the *code*. Here it was one of each, and
bending the production code to keep all three tests green would have hidden the real bug.

`10632e8` (fix) + `be325b9` (merge of today's master, `a4f6044`).

### Then Copilot found a second, narrower hole in the fix — and was right

`useAllTaskInstances` also returns **parked membership tasks**, which share the `other` bucket but
each name the system they were parked from. `listTypeInstancesOnAsset` filters those out
(`!instance.systemId`) when the delete collects what to remove; my live-work match did not.

So an asset carrying *only* a parked copy opened the whole review sheet, offered delete-instances,
and `collectTemplateInstancesOnType` then collected nothing — a decision put to the user that
nothing acts on. Fixed in `dc6c2ce`, scoped to the null-step bucket so the rung matches are
unchanged (rung instances carry a step; parked ones do not, so rungs were never exposed).

**One correction to my own working notes while chasing this:** I first concluded
`listTypeInstancesOnAsset` did not exist and that Copilot had invented it. It does — I had grepped
the working tree while it was checked out on the **PLT-2986** branch. Check which branch the tree
is on before concluding a symbol is missing.

### The big process change this run: the test suite runs locally now

Every previous entry on these PRs says the suite could not be run locally because `npm ci` 401s on
the private `@xyzreality/dhtmlx-gantt`. **That is now worked around.** `GITHUB_TOKEN` does not carry
`read:packages` either, so the token route is still dead — but the package is only imported by the
ViewerPage gantt files, so a **local stub** satisfies everything else:

```
/tmp/.../gantt-stub/{package.json,index.js,index.d.ts,codebase/dhtmlxgantt.css}
# package.json: name @xyzreality/dhtmlx-gantt, version 8.0.8
# then point the dependency AND an override at file:<stub> and `npm install`
```

2175 packages install, and `npx vitest run --config vitest.config.ts` runs the full suite
(~470 files, ~5800 tests, about 8 minutes) plus `tsc --noEmit` and `npm run lint`.

**Restore `package.json` and `package-lock.json` before committing** — `git checkout --` both;
`node_modules` survives it.

This is what turned this run from "push and hope" into "reproduce, fix, verify". It reproduced the
CI failure exactly (3 failed / 39 passed), and it caught a merge break on PLT-2986 *before* it was
pushed. Every prior red build on these PRs was found by CI or a reviewer; this run found two itself.

Caveat to be honest about: the stub types the gantt package as `any`, so `tsc` cannot see a type
error *inside* the ViewerPage gantt files. Fine for diffs that do not touch them; not a substitute
for CI if one does.
