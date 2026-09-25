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
