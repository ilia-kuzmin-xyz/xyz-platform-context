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

## Open review threads across the 11 PRs: **2**
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
