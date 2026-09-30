# 2026-09-30 — scheduled sweep over Ilia's sprint PRs

Master HEAD at run time: `27a2f9a` (#2203, PLT-2999 task-library row actions), which had **merged
since the 09-29 run** and made two PRs dirty.

## Ticket intake: nothing to start

JQL `project = PLT AND sprint in openSprints() AND assignee = currentUser()` returns **5 tickets,
all "In Code Review"**: PLT-3140, PLT-3139, PLT-2986, PLT-2799, PLT-2524. None in Ready for Dev /
Backlog / Analysis, so **no ticket was picked up, no status transitioned, no clarification comment
raised**. The whole run was checkpoints 1–3 on the existing PRs.

## Changed and pushed (all on Ilia's account)

| PR | Ticket | What |
|----|--------|------|
| **#2236** `c5a3b33` | PLT-3139 | Master merge + **all 6 open Copilot threads** + an archived-picker break the merge introduced |
| **#2250** `9c39a8a` | PLT-2799 | Master merge, one test-file conflict resolved as a union |
| **#2235** `ca1ebdc` | PLT-3140 | Master merge (2 behind), no conflicts |
| **#2251** `b919cc9` | PLT-2524 | Master merge (2 behind), no conflicts |

**#2236 was the run's real work** — full detail in `sprint-tickets/PLT-3139/context.md`. Headlines:

- **A break the merge introduced and nobody had flagged.** #2203 widened the library read to
  `includeArchived: true` and pushed the narrowing to each picker's call site. The Other picker
  this PR adds was written against the old live-only list, so post-merge it would have offered
  **archived tasks for linking** on both the asset and system pages. Both sides auto-merged clean —
  git cannot see this class of break.
- **Cross-bucket moves duplicate the instance** (2 threads). Confirmed against the reconciler:
  `generateForStep` and `generateOtherForAsset` scope "already generated" to different queries, so
  a rung↔Other move in one edit creates a second instance while the first survives. Fixed by
  disallowing the one-session cross-bucket move (each picker re-offers only its own bucket's staged
  removals). Rung→rung has the same shape **on master** and was deliberately left alone.
- **Disagreed with 2 threads** ("Other-only edits bypass the review sheet"). The removal path
  *does* open the sheet — Copilot anchored on the adds walk and missed `removesLive`. The adds
  behaviour is master's #2240 contract. **The PR description was the stale half**; updated it.
- **System-type create not retryable** — real, but Copilot's mechanism was wrong (it predicted a
  duplicate insert; the duplicate guard actually makes the retry a silent no-op, stranding the
  type). Fixed with the `createdTypeRef` pattern already proven on the asset side.
- **No in-flight guard** on the system-type direct save — guarded + button disabled.

## ⚠ Could not run anything locally this run

`npm ci` still 401s on `@xyzreality/dhtmlx-gantt`. **The 09-29 gantt-stub workaround is no longer
available** — repointing `package.json`/`package-lock.json` at a local stub was **refused by the
sandbox classifier**, and the refusal is on the outcome, not the command, so there is no variant to
try. `node_modules` could not be installed: no vitest, no `tsc --noEmit`, no eslint.

Everything above is **static analysis + CI**. Compensating checks done by hand: traced every
consumer of each changed memo, read the reconciler instead of assuming, checked type assignability
on the new ref, and hand-checked line widths against `printWidth: 100` (reflowed one 104-char line
that `format:check` would have rejected).

**For the next run:** if #2236's build is red, look at tests asserting the *old* picker re-offer
behaviour first. That is the predicted blast radius, and a red build there is not infra.

## Left as-is, deliberately

- **#2235** — 1 open thread: the `asset-card` a11y **keyboard path + selectable-list semantics**.
  Genuine gap, but it makes the container a `role='listbox' aria-multiselectable` and has to
  reconcile two states listbox models only one of. Design call. **Wants a ticket.**
- **#2251** — 1 open thread: polling-hook tests. Left open *because* the suite could not be run —
  a fake-timer test around a self-scheduling poll written blind is how this very ticket previously
  failed CI with all tests green.
- **#2241 (PLT-2986, draft)** — 3 behind master. Left: it is a draft, the 09-29 note records a
  local master-merge hitting `useViewer is not defined`, and that cannot be verified without a
  test run. **Do not un-draft or merge master into it until the suite runs again.**
- **#2245** (stacked on #2232), **#2222** (green, 0 threads), **#2212** (draft), **#2197**
  (Darminder CHANGES_REQUESTED, blocked on a scope question), **#2249** (Wolfi CI fix, now
  redundant — master carries the equivalent via #2217).

Master-merges were **not** pushed to #2222/#2197/#2212/#2245: all green or blocked on human input,
and merging master into a PR that cannot be test-verified is exactly what broke #2236 on 09-29.

## Open review threads across the 10 PRs: **2**
1 on #2235 (a11y keyboard, parked for a ticket), 1 on #2251 (polling-hook tests, parked on the
no-local-test-run constraint). Down from 9 on 09-29.

Plus 2 open product/design questions carried over: #2197 (Darminder, select-all scope) and the
#2203 Delete-cascade question to Jason (now moot — #2203 merged).

## Needs a Jira ticket, none exists yet
1. **System-type unlink orphans its task instances** — `SystemTypeDetail.applyChanges` writes
   mappings only, never calls `removeTaskInstances`. Pre-existing for the rungs, now also true for
   Other. Raised on #2236, not ticketed.
2. **`reconcileAssets` resolves an asset's type via `assetTypeId` only** — legacy name-only assets
   get no tasks generated. Flagged 09-25, still not ticketed.
3. **`asset-card` selectable-list a11y** — from #2235.
4. **The dangling `titleId` in `common/modal/modal.tsx`** — `title` sets `aria-labelledby` at an id
   nothing renders, so every dialog using that prop is unnamed. Flagged on #2235 09-25.
