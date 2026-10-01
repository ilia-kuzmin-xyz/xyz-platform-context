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
7. **Codebase-level: unsettled query data read as a meaningful value.** Five distinct instances
   recorded on 2026-09-30 across two PRs and two features (table above). Not a type-page quirk;
   worth a deliberate look at how query results are consumed rather than another per-site fix.
6. **`ReadinessLevelsSection` drops a rung task whose template was deleted** — same
   `.filter(Boolean)` shape as the Other-list bug fixed in `2cb365a`, also master's and also newly
   reachable now that #2203 ships template deletion. Invisible, unremovable, still generating.

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
| #2236 | `b12dd79` | **success** |
| #2251 | `7a1f58b` | **success** |

So the port is not a hope — the same commit that turned #2255 green has cleared feature PRs that
were red on the identical failure.

**#2236's staging freeze (`b12dd79`) passed the suite.** Sonar's gate is green on that head and it
consumes the test run's lcov, so the freeze did not break the create-page tests — the one piece of
this run's code that had no local validation at all. Copilot's re-review of the same head came back
with **no new findings**, ending a chain that had produced two findings on each of the previous
two pushes.

**#2255 still needs merging.** master remains red on the CVE; cherry-picks into feature branches do
not fix master, and every PR opened from now inherits it until #2255 lands.

### All five green — final

Every PR touched this run finished **build: success**: #2255 `ce9a96b`, #2250 `a3e6d46`,
#2235 `a4606eb`, #2236 `b12dd79`, #2251 `7a1f58b`. Copilot's re-review of #2236's final head was
clean, so the three-round fix chain on that PR is closed.

Nothing on these five is waiting on us now — only on human reviewers, and on **#2255 being
un-drafted and merged**, which is the only thing that clears master.

---

## 2026-09-30 afternoon — fourth Copilot round on #2236, and #2255 is now moot

### #2255 is redundant: master got the fix another way

`fb3863c` (#2256, "drop the dead rule that was hiding the viewer") **carried the same
`brace-expansion` bump**, so `node_modules/brace-expansion` on master is 5.0.12 and the scan is
clear without #2255. Master is now `c93c7d3`.

So the "un-draft and merge #2255" ask from this morning **no longer applies**. Commented on it
recommending closure rather than merging — its diff is an empty no-op against current master.
Left it open rather than closing it unasked, same as #2249 was handled.

The four cherry-picks were still the right call at the time: they got those PRs green hours before
#2256 landed, and they collapse to nothing on the next master merge.

### Two more HIGH findings — the stale-refetch window, and both were right

`isLoading` was the wrong predicate for "the mappings are trustworthy". On
`@tanstack/react-query` ^5.90, `isLoading` is `isPending && isFetching`, so a **cached query being
refetched has `isLoading` false while `data` is still the previous value**. Saving invalidates both
mapping queries, so there is a real window where Edit reopens on the pre-save exclusion sets and a
rung picker will offer a task that was just added to Other.

**That is the cross-bucket duplicate this run's own guard exists to prevent, reached through a
different door** — the guard covers the staging path; this walks in through stale data.

Fixed on both pages: Edit is disabled while either mapping query `isFetching` (`616df74`).

**Why this does not reinstate the objection that killed the gate idea on 09-25:**
`useAssetTypeStepIds` is *not* in the loading gate, so it can be pending while content renders —
gating on it made Edit dead on every cold load and broke 13 tests. The two mapping queries **are**
in the gate, so content only renders after they have resolved once, which means `isFetching` can
only go true again on an invalidation or a refocus. Never dead on arrival.

**The lesson worth keeping:** `isLoading` answers "have I ever had data", not "is my data current".
For any set whose *correctness* depends on freshness — an exclusion set, a uniqueness check, a
diff baseline — `isFetching` is the predicate. This is the third variant of the same bug on this
one ticket (empty default → unresolved name map → stale refetch), each one an absent or outdated
value being read as a meaningful one.

Both threads resolved. Open threads back to **3**.

## Fifth round on #2236 — both findings were gaps in THIS RUN's own fixes

Not new territory: both are places an earlier fix from today stopped one step short.

### A deleted task template left an invisible-but-active Other mapping (`2cb365a`)

`otherTasks` on the asset page used `flatMap` and **dropped** any id the library no longer
returns. The row vanished so it could not be removed, `onTypeIds` kept hiding it from the picker
(it is driven off `otherTaskIds`, not off the resolved list), and reconciliation kept generating
its instances off the mapping row. Invisible, unremovable, still doing work.

**The tell was internal disagreement:** `SystemTypeDetail`'s Other list falls back to
`link.taskTemplateId`; the asset one dropped. Both are new in this PR, so that was self-inflicted.
Fixed the asset side to match.

**Reachability changed this week and that is the point.** Archived templates resolve here —
`definitions` is read with `includeArchived: true` exactly so an archived-after-linking task still
shows. Only a **deleted** template hits this, and delete landed on master days ago in #2203. The
branch did not change; what could happen to the data did.

*Correction to Copilot's comment, which said the ladder keeps the raw id:* it does not.
`ReadinessLevelsSection` has the same `.filter(Boolean)` drop and it is byte-identical on master.
After this fix Other is the odd one out, in the better direction. Not changing the ladder from
inside this ticket — added to the follow-ups.

### System-type create staging was not frozen — the half of `b12dd79` I missed

Fixed exactly this on the **asset** create page earlier today and did not carry it to the system
one. Same bug, same page shape, one of two done.

The system version is worse: its loop is `if (staged.length > 0)` per rung, so an **emptied** slice
is skipped rather than written as an empty replace — the persisted mapping survives, and moving
that task to Other writes a second mapping for the same template on top.

Took the freeze over "replace every already-written rung including empty slices": the replace is
more faithful in principle but needs bookkeeping of which rungs were written, on the error path,
which by definition already went wrong once. Freezing makes the resumed save equal to the save the
user confirmed.

### The honest read on five rounds

Every round since the first has been a **variant of one mistake**: a value that is absent, stale or
unresolved being treated as meaningful. Empty default → unresolved name map → stale refetch →
dropped-on-missing-definition. And twice now (the name lock, the create freeze) a fix landed on one
of two symmetrical pages.

Two process points worth carrying:
1. **When a fix applies to "the create page", check there are not two.** Asset and system type
   creation are near-identical flows; a fix to one is a hypothesis about the other.
2. **A fix that makes two of my own components disagree is a bug in one of them.** The Other list
   divergence was visible in my own diff before any reviewer saw it.

## ⛔ I broke the build, and the revert is the lesson

`616df74` — the `isFetching` edit gate — **turned #2236 red: 32 failures in
`AssetTypeDetailContent.test.tsx`**. Reverted in `cb9980a`. Both threads reopened rather than left
resolved on a fix that no longer exists.

### The reasoning error, precisely

I argued on the thread that `isFetching` could only be true after an invalidation, *because* both
mapping queries are in the loading gate, so content does not render until they have resolved once.
That inference is wrong in one specific way: **`staleTime` is 0**, so React Query refetches on
mount and cached data is stale immediately. `isLoading` false + `isFetching` true is the *ordinary*
render, not the exceptional one. The gate disabled Edit in normal use.

The failure DOM said it flatly: `disabled=""` and `Mui-disabled` on `asset-type-edit`, with the
click no longer opening edit mode.

### What made this worse than a wrong guess

I had **already been told** this shape of fix was dangerous — the 09-25 entry records rejecting a
loading gate because it made Edit dead on load and broke 13 tests. I convinced myself this case was
different, wrote a confident paragraph on the PR explaining why, and the distinction did not exist.
**A reassuring argument for why the known failure mode does not apply this time is itself a warning
sign**, particularly when it cannot be checked by running anything.

### `SystemTypeDetail.test.tsx` stayed green with the identical defect

The same broken gate on the system page passed its suite. So the asset page's 32 failures were
luck, in the sense that only one of the two surfaces had coverage that noticed. Worth knowing
before trusting a green system-type run.

### What the real fix needs, left open deliberately

`isFetching` cannot distinguish a post-save invalidation from a mount refetch, and only the former
makes the exclusion sets wrong. It wants a flag armed on save-success and cleared once the mappings
settle — which carries its own race, because the refetch may not have started on the frame the save
resolves, so a naive "clear when not fetching" clears instantly and leaves the window open.

Small piece of state, real ordering trap, **and no way to run the suite here**. Left for someone
with a working local install rather than spending another red build guessing. Both threads open.

### The rule this run earned

**Do not push a change to interaction state that no local check can exercise.** Everything else
pushed today was either mechanical (a lockfile, a merge union) or provably local in effect (a
guard on a mutator, a fallback on a map lookup). This one changed when a control is usable, which
is precisely the class that needs a render to verify. CI is an acceptable validator for the first
kind and not for the second.

## The stale-mapping window was fixed properly — by someone else, with a better design

While this session was standing down on it, `fdf42ab` landed on the branch (plus `df57037`,
prototype polish on the save toast / list shade / viewer note). My revert `cb9980a` is intact
underneath both.

**"PLT-3139: End a type's edit session only once its mappings have reloaded."** Save waits for the
type-task queries to reload before it ends the edit session, so Edit only returns once the
exclusion sets already include what was just saved. **No `isFetching` gate at all**, so the
refetch-on-mount that broke my version cannot touch it. A test holds the reload open and asserts
the page stays in edit mode until it lands, verified to fail without the fix.

**This is a better design than what I proposed on the thread.** I was reaching for a flag armed on
save-success and cleared when the mappings settle — extra state, plus the ordering race I flagged.
The landed fix removes the window instead of policing re-entry into it: there is no interval during
which the page is editable on stale data, so nothing needs to be disabled and nothing needs to know
whether a refetch is a save's or a mount's.

**Worth taking the general lesson, not just the fact:** I was treating "the data can be stale while
the UI is usable" as a *guarding* problem and looking for the right predicate to block on. It was a
*lifecycle* problem — the edit session was ending too early. When several attempts at a guard all
founder on "which refetch is this", that is the signal the guard is in the wrong place.

It also confirms the call to stop was right for the right reason. The blocker was never the
difficulty; it was that this class of change needs a render to verify and this environment cannot
provide one. Someone with a working install wrote a test that fails without the fix — which is the
step I could not have done.

Nothing here is this session's to resolve: the three open threads belong with whoever landed the
fix. CI running on `fdf42ab`.

## Closing state of the run

**#2236 green on `fdf42ab`** — build, Sonar and Copilot all success (14:34). The red build this
session caused is cleared, by the revert plus the proper fix that landed on top.

Branch history, in order: `2cb365a` (mine) → `cb9980a` (my revert) → `df57037` → `fdf42ab`.

### Scoreboard for the whole day on #2236

Five review rounds, **twelve findings**. Ten fixed, one disagreed with on evidence (the review-sheet
contract — the description was stale, not the code), one scoped out to master with a patch on the
thread (the rung picker's exclusion vs the step-id query). Three threads on the stale-mapping
window are open and belong to whoever landed `fdf42ab`.

Of the ten fixed, **four were gaps in this session's own earlier fixes**. That is the number worth
remembering, not the ten.

### What this run should change about the next one

1. **`npm ci` cannot install here and the 09-29 stub workaround is now blocked by the sandbox.**
   Everything this session pushed was validated by CI after the fact, which worked for mechanical
   and locally-scoped changes and failed exactly once, on the one change that altered when a
   control is usable. A `read:packages` token in the environment would remove this whole class of
   risk; without it, decline interaction-state changes rather than reasoning about them.
2. **`npm install --package-lock-only` DOES work**, so dependency and CVE hotfixes remain fully
   doable even while the suite does not.
3. **A confident argument for why a previously-rejected approach is safe this time is a warning
   sign.** That is precisely what preceded the broken build.
4. **When a fix applies to "the create page" or "the type detail", check there are two.** Asset and
   system are near-identical surfaces; three separate findings this run were the un-carried half of
   a fix.

## Cross-ticket confirmation: the same bug shape turned up on #2250

Later the same day, two Copilot findings were fixed on **#2250 / PLT-2799** (`798e5e2`, by a
parallel session — not this one). The first is worth recording here rather than only in that
ticket's file:

> while the pinned-version read is still in flight `data` is `undefined`, so it was briefly falling
> back to the template's current text — the exact leak the pin exists to close

That is the **same shape as every variant on #2236 today**: an in-flight query's absent value being
read as a meaningful one. Different PR, different feature, different author — so this is not a
quirk of the type pages, it is a **codebase-level pattern** in how query results are consumed.

The instances now on record, all 2026-09-30:

| Where | Absent value | Read as |
|---|---|---|
| `AssetTypeDetailContent` | unstubbed mapping query → `[]` | "this type maps nothing" |
| `AssetTypeDetailContent` | unresolved `nameById` | "this type has no rung tasks" |
| both type pages | cached-but-refetching mappings | "these mappings are current" |
| `AssetTypeDetailContent` | template deleted from library | "this mapping does not exist" |
| `TaskInstanceModal` (#2250) | pinned-version read in flight | "this version stored no description" |

The fix is different each time (a gate, a reshaped memo, a later session end, a fallback, an
`isSuccess` check), which is exactly why it keeps recurring — there is no single wrong line to
find. **The generalisable rule: a query's `data` before it settles is not a value, and any code
that treats "nothing came back" and "nothing exists" as the same case is wrong by default.**

Worth raising as a codebase concern rather than five ticket-level fixes. Added to the follow-ups.

## 2026-10-01 — the pattern bit the fix for the pattern

A sixth instance, and the sharpest one, because it was **created by a fix for the fifth**.

`798e5e2` closed "pinned-description read in flight → falls back to the template's current text" by
gating the card on `isSuccess`. Correct for the in-flight case. But `isSuccess` never becomes true
once the query exhausts its retries, so a **terminal failure now hides the description for good**
while the rest of the task stays answerable (`discussion_r4158418540`, MEDIUM).

That text is where the engineer is told what state the unit must be in and when a No needs a
comment. Hiding it indefinitely is worse than the bug it replaced.

**The shape:** "unsettled read as meaningful" was fixed by introducing "terminal failure treated as
unsettled". A three-state reality — *pending* / *failed* / *settled* — collapsed into a two-state
predicate, which is the same error as the original, one state over.

This is the strongest argument yet for follow-up #7 being a real codebase concern rather than a
tidy observation. **Six instances, and the sixth was introduced while fixing the fifth.** Per-site
fixes are not converging; each one just moves which pair of states gets conflated. What is needed
is a shared way to consume a query that makes all three states explicit at the call site.

Not actioned by this session: it is another session's code, that session was active on the PR
minutes before the finding landed, and changing how a failure renders is UI state — the class this
run already proved it cannot validate here.
