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
