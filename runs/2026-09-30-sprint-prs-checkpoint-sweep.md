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

## Open review threads across the 11 PRs: **3**
1 on #2235 (a11y keyboard, parked for a ticket), 1 on #2251 (polling-hook tests, parked on the
no-local-test-run constraint), 1 on #2245 (discipline-package filter, parked by the author on
09-28). Down from 9 on 09-29.

**Corrects an earlier line in this file that said 2** — it counted only the two PRs worked this
run and dropped #2245's, which was already open and is untouched.

#2236 cleared **8** threads this run, not 6: the 6 that were open on arrival, plus 2 more Copilot
raised on the first push (the name-lock hole my own retry-guard change opened, and the stale
"create system type page is unchanged" line in the description). Both fixed/corrected in `f1aedef`
and resolved.

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
5. **`ReadinessLevelsSection`'s rung picker loses its exclusion while the step-id query is
   pending** — master's, verified byte-identical there; concrete patch on #2236
   (`discussion_r4142507877`). Raised 09-30.

---

## Late in the run: every build went red, repo-wide, and it was not any of these PRs

#2250's build failed at 08:05 on `9c39a8a`. **Only the Trivy scan step failed** — lint, tests and
the docker build all passed. Two CVEs published into the scanner DB this morning:

```
brace-expansion  CVE-2026-102276  HIGH  fixed  5.0.9  → 5.0.10, 3.0.7, 2.1.5, 1.1.19
                 CVE-2026-102278  HIGH  fixed  5.0.9  → 5.0.11, 3.0.8, 2.1.6, 1.1.20
```

The scan runs `exit-code: 1`, `severity: CRITICAL,HIGH`, `ignore-unfixed: true` — and both are
marked **fixed** upstream, so `ignore-unfixed` does not skip them. `brace-expansion` 5.0.9 is on
**master**, and #2250 does not touch `package-lock.json`, so this is inherited and repo-wide:
every open PR and master itself fail until the lockfile moves.

### The fix — #2255, and why it is lockfile-only

Checked before reaching for `overrides`, and no override was needed:

- The only **non-dev** copy is `node_modules/brace-expansion`, reached via
  `@swagger-api/apidom-reference` → `minimatch`, which **already declares `^5.0.2`**. The lockfile
  was just pinned stale at 5.0.9. A refresh lands 5.0.12, past the 5.0.11 the later CVE needs.
- Dev-only copies move inside their own ranges: `1.1.16 → 1.1.21` (`^1.1.7`),
  `2.1.2 → 2.1.7` (`^2.0.1`). Trivy suppresses dev deps so these were not the failure, but same bug.

`npm update brace-expansion --package-lock-only`. 34 lines, all `version`/`resolved`/`integrity`
triples plus one `engines.node` line (5.0.12 wants `20 || >=22`; CI installs on Node 22 per
`pr-check.yaml`, and there is no `engine-strict` in `.npmrc`).

Deliberately **not** added to `.trivyignore` — that file's own comments reserve it for genuinely
unfixable findings, and these are fixable in the lockfile.

**#2255 is a DRAFT** (house default). It needs un-drafting and merging by a human; until it lands,
every open PR stays red on the scan step alone.

### ⚠ The important discovery for future runs: `npm install --package-lock-only` WORKS

This run's earlier note says local validation was impossible. That is true for **running** the
suite — `npm ci` still 401s on `@xyzreality/dhtmlx-gantt` and the stub workaround is refused by the
sandbox. But **lockfile-only** npm operations succeed, because they resolve metadata rather than
download the private tarball:

```
npm install --package-lock-only        # exit 0
npm update <pkg> --package-lock-only   # exit 0, respects .npmrc min-release-age=7
```

So **dependency/CVE hotfixes are fully doable from a scheduled run** even though the test suite is
not. Worth knowing before the next "every build is red on a CVE" morning — this is the second
repo-wide CI outage in two days (the Wolfi one on 09-29 was the first).

### Method note

Read the *whole* failing job log rather than the tail before concluding. The tail showed only the
Trivy table; it took the fuller log to establish that lint/tests/docker all passed, which is the
difference between "not this PR's failure" and a guess.

## Final CI state at end of run

Tests are **not** the problem anywhere. Sonar's quality gate passed on #2236 (52.1% coverage on
new code), #2235 and #2250 — and Sonar consumes the test run's lcov, so the suite completed and
passed on each. In particular **#2236's picker changes did not break the ~5,800-test suite**,
which was the one thing static analysis could not settle.

Every build then fails at the **Trivy step only**, on the `brace-expansion` CVEs, and stays that
way until **#2255** is un-drafted and merged. That is the single human action this run needs.

## Amendment — the CVE fix was PORTED into all four PRs, not just raised

The section above says #2255 needs merging before anything goes green. **That was the wrong call
and is superseded.** Leaving four PRs red while waiting on a draft of my own to be un-drafted is
still waiting, and a red PR cannot merge however green its tests are.

Cherry-picked `ce9a96b` (the lockfile commit) onto all four branches instead:

| PR | branch head after port |
|----|------------------------|
| #2236 | `2419235` |
| #2250 | `a3e6d46` |
| #2235 | `a4606eb` |
| #2251 | `7a1f58b` |

Verified each cherry-pick touches **only** `package-lock.json` before pushing. Because the content
is byte-identical to what #2255 puts on master, a later master merge is a no-op rather than a
conflict — the port costs nothing once the base carries it.

One standing-down comment left on each PR naming the failing check and why it is not that PR's.
#2250's first comment said the opposite ("not re-running until #2255 merges"); a follow-up comment
there corrects it rather than leaving the wrong plan as the last word.

**#2255 still wants merging** — master itself is red on this, and master is not something a
cherry-pick into feature branches fixes.

### Confirmed on #2236's failed build (`f1aedef`)

The failing step is `scan.__run_4` (Run Trivy). Lint passed, the **full test suite passed** — Sonar
posted a green gate with 52.1% coverage on new code, and it consumes the test run's lcov — and the
docker image built (`frontend:7f6e68f` tagged, then removed in cleanup). So the cross-bucket picker
changes did **not** break the suite, which was this run's one unvalidated risk.

## #2255 verified green — the CVE fix works

`build` **success** on #2255 (completed 08:30), Sonar gate green with 0 new issues. The Trivy step
that fails on every other head passes on the lockfile bump, so the fix is confirmed rather than
assumed, and the four ported branches should follow.

**#2255 still needs merging** — master is red on this and a port into feature branches does not
fix master.

## Third Copilot round on #2236 — two more HIGH findings, one fixed, one scoped out

### Fixed: create-page staging stayed editable after a partial save (`b12dd79`)

`createWithStagedTasks` is **link-only by design** — a create has no persisted baseline to diff
against, so it never had reason to unlink. Fine while the draft could not change after Save; not
fine once `971da9e` made Save retryable. Unstage a task that linked *before* the failure and the
retry finishes with the type carrying a task the draft no longer shows.

Froze staging from the moment the row exists — same precondition the name field already locks on,
and the same fix shape as the system-type create page earlier in this run. `tasksFrozen` gates
`stageOnStep` / `unstageFromStep`, so one choke point covers rungs and Other rather than threading
a flag into two sections. Ref mirrored into state so it lands as the create resolves.

*Known limitation, stated on the thread rather than glossed:* the controls go inert, not visibly
disabled. Making them render read-only needs a new prop through `ReadinessLevelsSection` and
`OtherTasksBlock` — wider than the bug warrants.

### Scoped out: the rung picker's exclusion dies with an unresolved step-id query

Mechanism verified, and it is real: `tasksByLevel` re-keys `mappedByStepId` through `nameById` and
**drops any id whose rung does not resolve**, so with that query pending the rung picker's
exclusion is empty and it will offer a task already mapped to another rung. Same shape as the
`otherTaskIds = []` hole, one query further out.

**But both memos are byte-for-byte identical on master** (checked with
`git show origin/master:...ReadinessLevelsSection.tsx`). All this PR adds to that file is the
`excludedIds` prop, which only feeds Other ids in. The cross-bucket version was fixed here because
this PR introduces the Other bucket; this rung↔rung window is master's.

Proposed patch left on the thread — drive the exclusion off `mappedByStepId` (already in the right
shape) and use the rung-keyed map only to re-open staged removals. Unresolved, the worst case flips
from "writes a second row" to "keeps offering a task staged for removal". No loading gate, so Edit
does not go dead on load — which is why the gate was rejected when this came up on the Other side.

**Thread left OPEN deliberately**, unlike the 09-25 `assetTypeId` decline which was resolved: a
real scope question was put to the reviewer ("shout if you'd rather it rode this PR"), and an open
thread is how a human notices it. Needs a ticket — see the follow-ups list below.

## The port is validated end to end

| PR | head | build |
|----|------|-------|
| #2255 | `ce9a96b` | **success** — Trivy green on the lockfile bump |
| #2250 | `a3e6d46` | **success** — was red on Trivy, now green with the port |
| #2235 | `a4606eb` | **success** |
| #2236 | `b12dd79` | Sonar green (52.6% on new code); build still in its docker/Trivy stage |
| #2251 | `7a1f58b` | pending |

So the port is not a hope — the same commit that turned #2255 green has cleared feature PRs that
were red on the identical failure.

**#2236's staging freeze (`b12dd79`) passed the suite.** Sonar's gate is green on that head and it
consumes the test run's lcov, so the freeze did not break the create-page tests — the one piece of
this run's code that had no local validation at all. Copilot's re-review of the same head came back
with **no new findings**, ending a chain that had produced two findings on each of the previous
two pushes.

**#2255 still needs merging.** master remains red on the CVE; cherry-picks into feature branches do
not fix master, and every PR opened from now inherits it until #2255 lands.
