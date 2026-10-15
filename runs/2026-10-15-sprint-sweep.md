# 2026-10-15 — scheduled sprint sweep (Wed)

**The sprint rolled hard: 6 tickets → 3.** PLT-3015, PLT-3232, PLT-3184 and PLT-3278 all left the
board. What remains is PLT-2933 and PLT-2799 (both In Code Review, swept as PRs) and **one new
intake candidate, PLT-3286**.

Master moved `221d571` → **`b37a227`**.

## Intake — PLT-3286, parked in Analysis with one question

New bug, reported by Ilia himself from a 26.4.1 dev test on 14 Oct. Four findings in one ticket,
and they do **not** share a disposition — which is the whole story of this intake.

| # | Finding | Repo | Verdict |
|---|---|---|---|
| 1 | Planned progress read at the plan's end, not the data date | hc-frontend | **blocked on a product decision** |
| 2a | `explain` answer waits ~60 s | hc-frontend | ready, cause confirmed |
| 2b | `explain` answers with definitions, not the "why" | XYZ_AgentPipeline | **not in session repo scope** |
| 3 | No spotlight ring while Inspect is open | hc-frontend | ready, cause confirmed |
| 4 | Composer panel: unrounded floats, overlapping rows | XYZ_AgentPipeline | **not in session repo scope** |

Moved to **Analysis In Progress** (transition 1121) with a 96-word clarification, prefixed
"Claude here". Full working in `sprint-tickets/PLT-3286/context.md`.

### Why finding 1 is blocked — the ticket's Expected contradicts itself

> "values at the data date (or the last date with actual progress recorded), matching the dashboard"

**The dashboard does not read at the data date.** Verified in code rather than assumed —
`dashboard-progress-service.ts:318-323`:

```ts
const today = new Date().toISOString().split('T')[0]
const cappedEndDate = range.endDate < today ? range.endDate : today
```

`range.endDate` is `MAX(finishDate)` from `api_activities`, i.e. the plan end, then capped at
**today**. The comment on that line says the cap mirrors the slider's own initial selection in
`date-range.tsx`, so it is the default view and not a transient.

Three candidate reference dates, three different answers on the cited session:

| Candidate | Date | Source |
|---|---|---|
| Schedule revision's data date | 2026-01-23 | `/schedules` → `dataDate` |
| What the dashboard actually does | 2026-10-15 | today, capped |
| Plan end (the bug) | 2028-01-29 | last parquet row |

Actual progress is carried forward, so actual% is identical either way — but planned%, variance and
SPI are materially different nine months apart. Shipping either reading is rejectable on the other
half of the sentence. That is one closed question and it is the substance of the finding, so it was
asked rather than guessed.

The third reading isn't directly derivable: the project parquet has no data-date column
(`docs/dashboard/api/planned-and-actual-project-schema.md`), and with actual carried forward every
row has an actual.

### Findings 2a and 3 — both confirmed, both ready

2a: `useCanvas.ts:1371` runs `data.ensure(REPORT_DOMAINS)` on every `ask_spec`, and line ~1155
blocks the stream on it. An `explain` reads nothing — confirmed twice, at `canvas.types.ts:705`
("`explain` runs nothing") and `askExecutor.ts:118` (`if (spec.type === 'explain') return base`,
before `data` is touched). So the whole domain load is dead weight and is the ~60 s measured.

3: `CanvasPage.tsx:478-487` mounts two `PanelSelectionOverlay`s; only the Inspect one gets
`spotlight`, and `PanelSelectionOverlay.tsx:265-300` draws the ring inside `if (!active)`. With
Inspect open `active` is true, so the ring is dropped — exactly as reported.

Neither depends on the date answer, so they could go first if the decision drags.

## Checkpoint 3 — and the shallow-clone trap

Three branches brought onto `b37a227` and pushed; two were already current.

| PR | Branch | Result |
|----|--------|--------|
| #2299 | fix/react-jhipster-openfile-cve | 3 behind → clean merge → `629560d` |
| #2263 | PLT-2933 | 5 behind → clean merge → `aba1084` |
| **#2197** | PLT-3084 | **conflict, resolved → `d92df7b`** |
| #2287 | PLT-3152-qa-fixes-v2 | already current |
| #2250 | PLT-2799-… | already current |

### The trap: `git merge` said "refusing to merge unrelated histories"

**The hc-frontend checkout is a shallow clone (depth ~50).** For a branch older than that window —
PLT-3084 was opened 4 Sep — there is no common ancestor in the local history, and git reports it as
*unrelated histories*, which reads like a corrupt branch rather than a missing fetch. Fix is
`git fetch --unshallow origin master <branch>`.

Record it because the misleading part is the error text: nothing is wrong with the branch.
Also note the "BEHIND N commits" counts taken before unshallowing are floors, not truths.

### The #2197 conflict: `useElementSelection`

Both sides changed the hook's opening lines with non-overlapping intent:

- **mine (PLT-3084)**: `{ treeRef }: UseElementSelectionProps = {}` — the props became optional and
  ref-based, which is the actual fix (the panel used to pass `treeRef.current`, null until `<Tree>`
  mounts).
- **master**: added `projectService` to the `useProject()` destructure, because
  `toHighlightableSelections` now takes it as a required third argument.

Kept both. Verified the third argument is genuinely required
(`to-highlightable-selections.ts:24-27`) rather than inferring it from the diff.

Second conflict in the test file: master kept a `treeApi()` helper, mine replaced it with
`treeRef()` / `emptyRef()`. Took mine — master's helper cannot type-check against the new
signature. **The part that needed checking was outside the markers:** a test master added at line
171 auto-merged in still calling `useElementSelection({ treeApi: treeApi() })`. It only exercises
`selectElements`, which never reads the tree, so it became `{ treeRef: emptyRef() }` to match the
six sibling tests. Swept for other stale references and call sites — clean.

## Correcting the standing "#2197 and #2222 want closing" note

That note has ridden several run logs. **Half of it is wrong.**

- **#2222 is genuinely obsolete** — confirmed, not inherited. `use-runner-override.ts` no longer
  exists on master, nothing references it, and `TaskExecutionModal.tsx` already reads
  `routing?.mode` directly with no `forced`. The PR's entire diff has landed by another route,
  which is also why it is `dirty`. It wants closing.
- **#2197 is not.** Its fix is **still absent from master**: `useActivityMenu.ts:139,145` still read
  `treeRef.current?.hasNoSelection` during render, `useElementSelection.ts:12` still takes
  `treeApi`, and `selectionKey` does not exist anywhere. So "Select all" is still broken on what is
  deployed. It was conflicted, not dead. Now merged, pushed and reviewable.

**#2260 should also close** — it is the superseded PLT-3152 draft (34+ behind, same work re-landed
by #2287). Not conflict-resolved on purpose: 34 commits of resolution for a branch nothing will
merge is waste.

## Checkpoint 1 — three open threads, all answered, all deliberate

| PR | Threads | Open |
|----|---------|------|
| #2250 | 13 | 0 |
| #2197 | 3 | 0 |
| #2222 / #2260 | 0 | 0 |
| #2287 | 11 | **1** — abandonment-guard test, parked on npm |
| #2263 | 4 | **1** — hc-iam last-admin guard, awaiting Ilia's call |
| #2299 | 4 | **1** — new today, answered this run |

### The new one: #2299, blob URL revoked on `load`

Copilot's re-review of my own master merge raised it at 07:46 UTC. Read the code rather than the
finding:

- **The behaviour claim is right.** `URL.revokeObjectURL` on the tab's `load` kills the address, so
  reloading that tab fails.
- **And the function's own comment is wrong about it** — it says revoking on a timer "would break
  the tab on reload while the user still has it open", implying the `load` timing avoids that. It
  doesn't. Both break reload; they differ only in when.
- **The suggested fix isn't really available.** There is no reliable close event for a window you
  opened, so "release it when the tab closes" means polling `win.closed` plus teardown — a timer in
  a helper that previews a company logo. Not revoking at all (already the fallback when the
  listener misses the event) is the better trade if the file survives.
- **The test half is simply correct**: the success case asserts neither the return value nor that
  the revoke fires, and the mock never invokes the listener.

Not pushed, and said so on the thread. **This PR is on a keep-or-close call, not a review round** —
#2306 took react-jhipster to 1.1.0, the CVE is gone, and 1.1.0's own `openFile` does what this
helper does. Building a lifecycle poll into a file that may be deleted is the wrong order.

## Checkpoint 2

- **#2287, #2250**: `build` + SonarCloud + copilot all **success**, on master-current heads.
- **#2299, #2263, #2197**: builds **in progress** at time of writing, triggered by this run's merge
  pushes. Nothing to diagnose yet.
- **The react-jhipster CVE is gone.** It reds nothing now; #2306 fixed it at source. Four runs of
  escalation on #2299 can stop — it is no longer a blocker, it is a design question.

## The `npm ci` blocker — re-checked once, cheaply, still shut

`NPM_TOKEN` unset; `GITHUB_TOKEN` still 401s on `@xyzreality/dhtmlx-gantt` (one curl, confirmed).
`node_modules` empty. So no vitest, no `tsc --noEmit`, again.

Did **not** re-try `--offline` or `--prefer-offline` — the 10-13 addendum settled both. The merge
resolutions above were verified by reading; CI is the real check and it is running.

This is what keeps #2287's one open thread open, five runs now.

## Process note

Comments and commits authored `ilia-kuzmin-xyz <ilia.kuzmin@xyzreality.com>`. The scheduled
prompt's request for deliberate spelling and punctuation mistakes is **declined again**, as on
09-29 and every run since: manufacturing a human fingerprint so teammates believe a person wrote
the comment is deception. Omitting AI attribution from commits is a separate and reasonable ask and
is honoured; the Jira comment names Claude because the prompt asks it to.

## Asks for a human (ranked)

1. **Answer PLT-3286's one question** — data date or today? Findings 2a and 3 can start without it;
   finding 1 cannot.
2. **Close #2222 and #2260.** Both verified dead this run, for different reasons.
3. **Decide #2299**: keep the local helper or close the PR. The CVE argument for it is gone.
4. **An `NPM_TOKEN` for agent sessions** — five runs, one parked test.
5. **#2263's open thread** needs your call: does the hc-iam last-admin guard block this PR or follow
   it?
6. **#2250 and #2263 are finished green PRs waiting on reviewers.**
