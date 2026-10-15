# 2026-10-15 — own-PRs checkpoint sweep (Wed, PM)

Second scheduled pass of the day. The earlier `2026-10-15-sprint-sweep.md` ran against master
`b37a227`; **master has since moved 3 commits to `954ec27`** (PLT-3161 #2330 viewer unique-ids,
PLT-2895 #2326 portfolio search-X, PLT-2972 #2327 readiness-step search). So checkpoint 3 had real
work again — the three branches that the morning run left current to `b37a227` were 3 behind by
this afternoon. Scope: the 7 open PRs authored by `ilia-kuzmin-xyz`.

## What this run changed

| PR | Branch | Action |
|----|--------|--------|
| **#2197** | PLT-3084 | merged master (clean) → `18902ca`; **pushed a fix** `1a56206` for a new Copilot thread; replied + resolved the thread |
| **#2287** | PLT-3152-qa-fixes-v2 | 3 behind → clean merge → `3475f27`, pushed |
| **#2299** | fix/react-jhipster-openfile-cve | 3 behind → clean merge → `fc3c21a`, pushed |
| #2263 | PLT-2933 | already current (0 behind); no thread/build action |
| #2250 | PLT-2799 | already current (0 behind); no thread/build action |
| #2222 | claude/gracious-rubin-ctsdpl | **no action** — see below |
| #2260 | PLT-3152 (draft) | **no action** — superseded draft |

## Checkpoint 1 — comments

Only one thread needed work this run: **#2197, a new Copilot finding** (10-15 07:49).

- **Claim:** the `selectionKey` reset effect only fires on activity switch, but `unlinkFromActivity`
  also swaps the tree data via `linkChanges$` → `useLinkedElementsTreeData`. react-arborist's
  `update()` leaves `selection.ids` alone and fires no `onSelect`, so after unlinking the last
  selected rows `hasSelection` stays true while `selectedNodes` is empty → "Unlink selected" /
  "Show selected in 3D view" sit enabled but no-op.
- **Verdict: correct and reachable.** Verified against the code — it's the *same* bug class as the
  already-fixed activity-switch thread (`ea8174c`), reached by a third trigger. Both unlink entry
  points (the `...` menu's "Unlink selected" and a row's context-menu "Unlink from activity") route
  through `unlinkFromActivity`, and both operate on the whole selection.
- **Fix (`1a56206`):** a panel-level `unlinkAndClearSelection` wrapper — `await unlinkFromActivity`
  then `treeRef.current?.deselectAll()` + `setHasSelection(false)` (the same two-sided clear the
  activity switch does). The context menu is now routed through it too so the row path isn't missed.
  No regression test: the component still has no harness (only its hooks are tested), matching the
  author's deferral on the sibling thread. Said so on the thread; resolved it.

Everything else was already handled:
- **#2250** (13), **#2287** (11), **#2299** (4): all threads resolved.
- **#2263**: 7 of 8 resolved; the one open thread (hc-iam last-admin atomic guard, PAPI-4277) is
  **deliberately open, already answered** — cross-repo, Ilia's call whether it blocks. Left as-is.
- **#2222 / #2260**: 0 threads.

## Checkpoint 2 — builds

No failed builds anywhere, so **no hotfix PR** (and none to avoid-duplicating).
- Green on current heads before this run: #2197, #2287, #2299.
- #2263, #2250: builds **in progress** at start (triggered by their own recent pushes) → skipped
  per the in-process rule.
- #2197/#2287/#2299 builds re-trigger on this run's pushes; #2197 carries the only code change.

### `npm ci` still shut — confirmed again, and the manifest workaround is now blocked too
`npm ci` still 401s on the private `@xyzreality/dhtmlx-gantt@8.0.8` tarball (dry-run passes, real
download fails). The documented workaround — stub the gantt dep in `package.json`, `npm install` the
rest — **is itself blocked this run** by the harness permission classifier ("Modify Shared
Resources" on any `package.json`/npm-install write). So the suite genuinely cannot run from here. The
#2197 fix is reasoned from code + verified by inspection (type-trivial, touches no gantt-importing or
test-covered file); the push's CI build is the backstop.

## Checkpoint 3 — master alignment

Merged master into the 3 behind-by-3 branches; **all clean** (the 3 master commits touch
InlineSearch / ProjectsWidget / dashboard-element-tooltip / system-step-tasks — no overlap with any
of these PRs' files). #2263/#2250 already current. Merge commits authored as Ilia, merge-commit
style, no rebase (matches the repo's convention and the existing "Merge master into …" commits).

## Checkpoint 4 — no redundant review

Skipped re-review on #2250/#2287/#2299/#2263 (all threads resolved, builds fine). Only #2197 needed
substantive work this run.

## #2222 and #2260 — why no action (not an oversight)

- **#2222 is dead and the author has said so three times**, latest 10-12 to @rishib-xyz: "this PR is
  dead, please close it." Its `dirty` state is *because* it deletes `use-runner-override.ts`, which
  already left master by another route (#2244 / PLT-3150); resolving the conflict yields **zero net
  diff**. The author explicitly rejected pushing an empty merge and is leaving the close decision to
  a reviewer. So: **do not merge master in, do not close it** (not instructed). Waiting on a human.
- **#2260** is the superseded PLT-3152 draft (same work re-landed by #2287). Deliberately not
  conflict-resolved — resolution for a branch nothing will merge is waste. Leave as draft.

The standing "#2222 wants closing" note remains correct; "#2197 wants closing" was already corrected
in the morning log (its fix is still absent from master, so it's live, not dead).

## Open threads at end of run

**1 genuinely open, by design:** #2263's hc-iam last-admin guard (awaiting Ilia's keep-or-defer
call; the fix is cross-repo in hc-iam, not this PR). Everything else resolved.
