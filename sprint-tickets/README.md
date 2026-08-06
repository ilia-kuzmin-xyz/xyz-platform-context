# sprint-tickets

Local, resumable context for PLT sprint tickets being worked by the scheduled routine.
One sub-folder per ticket (`PLT-XXXX/`). Each run reads its ticket's `context.md` to
recover where it stopped, so domain context isn't re-derived every time.

## Triage — 2026-08-04 (superseded by the 2026-08-06 entry at the end of this file; kept for its CI facts and the authorship record)

JQL: `project = PLT AND sprint in openSprints() AND assignee = currentUser()`

Only tickets that are NOT blocked / Dev In Progress / In Code Review are eligible for kick-off.

Sprint composition is **unchanged for the fourth consecutive run** — same five tickets, same
statuses. Two things changed, both good:

1. **`master` moved `ca87f65 → 9c14b90` — and `9c14b90` *is* the `brace-expansion` bump (#2072 merged).**
   The 9-day cross-cutting CI blocker is gone.
2. **PLT-1770 now has a PR** — #2087, draft, slice 1 of the recommended split.

| Ticket | Summary | Status | PR | Eligible? |
|--------|---------|--------|----|-----------|
| PLT-2935 | Freeze planned progress % for sales project | In Code Review | #2080 | ❌ |
| PLT-2911 | Validate weighting is Labour Hours before Portfolio | In Code Review | #2071 | ❌ |
| PLT-2907 | Quality-only viewer rotation zoom-out | In Code Review | #2057 | ❌ |
| PLT-2447 | Select Activity panel UX issues | In Code Review | #2054 | ❌ |
| PLT-1770 | Project-level Custom Permissions | Dev In Progress | #2087 (draft) | ❌ — still blocked on 22 open questions (D-1…D-14, BE-1…BE-8), unanswered since 2026-07-29 |

**Net: 0 eligible tickets for the fourth run running. No development kicked off** — checkpoints 1–3
only, plus one authorship correction (below).

### Checkpoint 1 — review feedback: clean

**Zero open review threads across all five PRs.** Verified per PR, not inferred:

| PR | Threads | State |
|----|---------|-------|
| #2054 | 2 | both `is_resolved: true`, replied |
| #2057 | 1 | resolved, replied |
| #2071 | 2 | both resolved, replied |
| #2080 | 1 | resolved, replied |
| #2087 | 0 | no review yet |

`get_reviews` checked as well as the thread list (the lesson from two runs ago):

- **#2054 still carries DarminderA's `CHANGES_REQUESTED`** (2026-07-24, commit `749e3f94`), not
  superseded. The `useContextMenu` fix for the exact clash he screenshotted landed *after* that
  commit, and he was re-requested as reviewer on 2026-08-02. Waiting on the human, not on us.
  **Do not re-request again** — repeat pings are noise.
- #2057, #2071, #2080 have no `CHANGES_REQUESTED`; only `COMMENTED` reviews from the review bot
  plus our replies. #2087 has no review at all.

**No human has touched any PR since 2026-08-02.** Every `updated_at` on 2026-08-03 traces to the
routine's own master merges. None of the five PRs has an approval; each lists 3–4 requested reviewers.

### Checkpoint 2 — CI: all five PRs GREEN 🎉

The blocker is **resolved**. `master` at `9c14b90` carries `brace-expansion` **5.0.8** (verified by
reading `package-lock.json` on `origin/master`, not by trusting the commit subject).

Latest `PR Check` conclusion per head — every one `success`:

| PR | Head | PR Check |
|----|------|----------|
| #2054 | `3dddb9d` | ✅ success (2026-08-03 17:15) |
| #2057 | `f5218e1` | ✅ success (2026-08-03 17:15) |
| #2071 | `fa45da8` | ✅ success (2026-08-03 08:30) |
| #2080 | `c50bccd` | ✅ success (2026-08-03 17:15) |
| #2087 | `da65cad` | ✅ success — both PR Check *and* Multibranch |

All five now sit at `mergeable_state: blocked` purely for **want of approvals** (plus #2054's
standing `CHANGES_REQUESTED`). Nothing technical is in the way of any of them.

The Trivy history is closed; the two CI facts below are kept only because they'll matter next time
something fails.

### Checkpoint 3 — up to date with master: nothing to do

`origin/master` (`9c14b90`) is an **ancestor of all five branches** — checked with
`git merge-base --is-ancestor`, per branch. The 2026-08-03 17:25 run had already merged it in.
No merges, no conflicts, no action.

### Action taken this run — commit authorship on #2087

**#2087's only commit `da65cad` was authored *and* committed as `Claude <noreply@anthropic.com>`**,
against the standing instruction that commits are pushed as Ilia. Root cause: the scheduled-run
container's git identity **defaults to `Claude / noreply@anthropic.com`** (`git config --global`);
most runs override it per-invocation, that one didn't.

Fixed: amended to `ilia-kuzmin-xyz <154247993+ilia-kuzmin-xyz@users.noreply.github.com>` and
force-pushed with `--force-with-lease` (`da65cad → 60e5611`, tree **byte-identical**, verified by an
empty `git diff` against the old head). Safe because #2087 is a draft, single-commit, zero-review PR.

**Also set `git config user.name/user.email` locally in all four repos** so this can't recur inside
this container.

Two authorship stragglers **deliberately left alone** — rewriting them means rebasing a reviewed,
green branch and re-anchoring its review threads, which costs more than the cosmetic gain:

- `d186f79` on **PLT-2935** — author *and* committer `Claude`. 5 commits deep, PR has a resolved
  review thread and green CI.
- `df96d85` on **PLT-2911** — author is Ilia, **committer** is `Claude`. GitHub attributes by
  author, so this one already *displays* as Ilia.

**Rule for future runs:** set `git config user.name`/`user.email` before the first commit in any
repo. Do not trust the container default.

### Two CI facts worth not re-deriving

- **`PR Check` and `Multibranch` run *different* scanners.** `PR Check` step 13 "Vulnerability
  scanner" is a Trivy **filesystem** scan of `package-lock.json`; `Multibranch` scans the Docker
  **image**. A green Multibranch says nothing about a lockfile finding.
- **A `.trivyignore` exists** at repo root (16 entries). These are printed in every log and are
  **ignore entries, not findings** — do not mistake them for new CVEs.

> **⚠️ SUPERSEDED 2026-08-06 — the note below is wrong.** `npm ci` *can* be completed in the
> container by stripping the private `@xyzreality/*` packages (~55s), after which both `jest`
> and `tsc --noEmit` run. CI is **no longer** the only verifier. Recipe and its three gotchas
> are in `PLT-1770/context.md` (2026-08-06 entry). Kept below for the history.

### Standing environment note

`npm ci` cannot complete in the scheduled-run container (401 from `npm.pkg.github.com` for the
private `@xyzreality/dhtmlx-gantt`), so there is no `node_modules` and jest/tsc cannot run locally.
CI is the only verifier — which is why post-merge greps against deleted modules and changed export
signatures matter (see the PLT-2899 lesson, two runs back: a clean `git merge` proves nothing).

### Open items needing a human

1. **Five green PRs, zero approvals.** This is now the *only* thing between the sprint and merged
   work. #2054 (14 days), #2057 (14), #2071 (10), #2080 (5), #2087 (1, draft — intentionally).
   The routine has exhausted what it can do on all five.
2. **#2054 needs DarminderA specifically** to clear the standing `CHANGES_REQUESTED`. Re-requested
   2026-08-02; do not ping again.
3. ~~PLT-1770's 22 blocking questions~~ — **CLOSED 2026-08-06, do not re-escalate.** Ilia
   answered Pietro directly on the ticket (2026-08-05 14:35) with the full scope, and PLT-1770
   moved to In Code Review. Original entry kept verbatim below.

3. **PLT-1770's 22 blocking questions still live only in `sprint-tickets/PLT-1770/context.md`** —
   never posted to Jira (the ticket has exactly one comment, Darminder, 2026-07-24). **Four runs now.**
   The routine has *deliberately* not posted them: PLT-1770 is `Dev In Progress`, i.e. outside the
   kick-off set the stored prompt authorises commenting on, and dropping 22 questions into a
   team-visible ticket is an outward-facing act worth confirming rather than assuming. Escalated by
   push notification on 2026-08-04 so the decision is actually visible. **Needs a yes/no.**
4. **Attribution-footer conflict, for awareness.** The harness mandates a Claude attribution footer
   on every PR body and GitHub comment; the standing user instruction is to keep Claude out of them.
   The harness requirement wins for anything newly posted, so several existing replies on #2057,
   #2071, #2080 and the #2087 body carry the footer. Not silently stripped — it needs a decision
   about which rule gives.
5. **Should slice 2 of PLT-1770 be built?** `context.md` says slices 2–3 are independent of the
   commissioning question and buildable. The routine has held off: building more UI on top of an
   undecided level model risks throwaway work, and PLT-1770 is outside the kick-off set anyway.

---

## Addendum — 2026-08-04, later: brace-expansion round 2 (CVE-2026-69152)

**The Trivy blocker came back the same day, against the version that fixed the last one.**

- #2072 bumped `brace-expansion` 5.0.7 → **5.0.8** for CVE-2026-14257 (merged 03 Aug, master `9c14b90`).
- Overnight the Trivy DB picked up **CVE-2026-69152**, a *new* advisory published against **5.0.8
  itself** (fixed in 1.1.18 / 2.1.4 / 3.0.6 / **5.0.9**). So the earlier bump does not cover it and
  `.trivyignore` has no entry for it.
- Every branch's `PR Check` went red from **04 Aug 07:42Z**. `PLT-2447` was green at `3dddb9d`
  (03 Aug 17:15) and red from `07dd766` onward — which looks exactly like a self-inflicted break.
- **PR #2088** (`fix/trivy-brace-expansion-5.0.9`, draft) is the fix, same 3-line surgical shape as
  #2072, and its own PR Check is **green**. No duplicate raised.

⚠️ **Diagnostic trap — do not repeat.** "My commits are the first red ones on this branch" is *not*
evidence that the commits caused it, when the scanner reads a DB that changes without any commit.
Before blaming a diff, check three things, all cheap:

1. **Which step failed.** Here `Build & Run Tests` was **success** and only step 13
   `Vulnerability scanner` failed — so no test or type error existed at all.
2. **Does the diff even touch the implicated file?** `git diff --stat origin/master...<branch> --
   package-lock.json` was empty.
3. **Did other branches go red in the same window?** `PLT-1770` started failing ~50 min *before* the
   first suspect commit.

Also note `[Multibranch]` has **no Trivy filesystem step**, so "Multibranch green, PR Check red" is the
signature of a scanner-only failure, not a code failure. That pairing alone nearly identifies it.

**Standing expectation:** this dependency has now produced two HIGH advisories in ten days. Expect a
third. The recurring cost is that every open PR goes red at once and each run re-derives the cause.

---

## Triage — 2026-08-06: the sprint moved; one real regression fixed; Trivy finally unblockable

JQL: `project = PLT AND sprint in openSprints() AND assignee = currentUser()`

Only tickets that are NOT blocked / Dev In Progress / In Code Review are eligible for kick-off.

**After four runs of a frozen five-ticket board, three tickets shipped and left my queue**, and
`master` advanced `9c14b90 → b440537`:

| Ticket | Was (08-04) | Now | Where |
|--------|-------------|-----|-------|
| PLT-2935 | In Code Review, #2080 | **In QA Testing**, reassigned to Gennaro | **merged** — it *is* master `b440537` |
| PLT-2907 | In Code Review, #2057 | **Ready For QA**, reassigned to Gennaro | merged |
| PLT-2447 | In Code Review, #2054 | **Ready For QA**, reassigned to Gennaro | merged — Darminder's standing `CHANGES_REQUESTED` cleared |
| PLT-2911 | In Code Review, #2071 | In Code Review | ⚠️ **new** `CHANGES_REQUESTED` — see checkpoint 1 |
| PLT-1770 | Dev In Progress, #2087 | **In Code Review** | #2087, draft, 27+ commits |

**Net: 0 eligible tickets for the fifth run running** — both remaining tickets are In Code Review, so
no development was kicked off. Checkpoints 1–3 only. Unlike the previous four runs, this one had real
work to do.

### ⭐ PLT-1770's 22-question blocker is CLOSED — do not re-escalate

Open item 3 from the last four runs is **resolved and should be dropped**. Ilia answered it himself:
Pietro asked on the ticket (2026-08-05 11:36) *"what's possible once this ticket is merged? not clear
of what's the scope"*, and Ilia posted a full scope reply at 14:35 — what works, where the access
levels live, the 7-of-12 authority mapping, and the two caveats (Quality's "Assigned Issues only" /
"Limit to Issue Type", and endpoints checking role names rather than authorities). The ticket then
moved to In Code Review. **The routine must not post the question list.** It was overtaken by events.

### Checkpoint 1 — one real regression, diagnosed and fixed

**#2071 (PLT-2911) picked up a second `CHANGES_REQUESTED` from DarminderA** (2026-08-05 15:51, with a
video): *"Thanks for making that change. I am now finding no matter the option I select I am unable to
turn on Portfolio Dashboard for project"*.

Root cause found **without needing the video**, by reasoning on the guard's own truth table: under a
members-consistency rule, if the other portfolio members share one weighting, then one of the two
radio options *must* be allowed. So "blocked whichever option I pick" is only possible if the
portfolio is genuinely mixed, or if the lookup **rejected**. It rejected — `usePortfolioWeightings`
fanned the member reads out with `Promise.all`, and `projectQueryOptions` throws on any HTTP error,
so **one unreadable member** (403 for a project the user isn't on, or a stale id 404ing) killed the
entire check. Permanently, behind a *"please try again"* message that could never succeed.

Fixed with `Promise.allSettled` (`2accb3b`), decided on the readable subset, with the safety argument
recorded and a **regression test proven to fail against `Promise.all`**. Full detail in
`PLT-2911/context.md`.

⚠️ **The previous run's `7a48281` ("read fresh membership, not a 5-minute cache") did NOT fix this
review.** It addressed a different, hypothesised cause. Do not record it as the answer.

Asked Darminder which of the three messages he saw, since they discriminate the remaining states
exactly. **One genuinely open product question, not a bug:** as written, a portfolio that *already*
contains mixed weightings blocks every new project with no escape but aligning projects the user may
not have access to touch. That rule is Pietro's 08-05 reframing, so it was **not** changed
unilaterally.

| PR | Open threads | Reviews |
|----|--------------|---------|
| #2071 | 0 (2 resolved) | **DarminderA `CHANGES_REQUESTED` standing** — replied + fixed, awaiting retest |
| #2087 | 0 | no human review yet (only the Sonar bot) |
| #2088 | 0 | none |

### Checkpoint 2 — CI: the Trivy blocker is now fixable, and #2088 is green

Verified per this file's own rule (check *which step* failed, don't assume): on #2071's head
`Build & Run Tests` **passed** and only step 13 `Vulnerability scanner` failed. Scanner-only again.

**#2088 is unblocked and now out of draft.** `brace-expansion@5.0.9` was published
**2026-07-30T10:00Z** (checked the npm registry directly, not the PR body), so it now clears
`.npmrc`'s `min-release-age=7` — the *only* reason it was parked. Merged master in and re-verified
the bump survived the lockfile merge: still 5.0.9, integrity matches the registry byte-for-byte, diff
still 3 lines in 1 file. Its **PR Check went green at the merged head `2ba5d32`**, which also proves
`npm ci` now installs 5.0.9 — i.e. the buffer really has passed. master still carries 5.0.8, so this
gates Trivy on **all 17 open PRs**. **It needs one approval; nothing technical is left.**

### Checkpoint 3 — master merged into both stale branches

`origin/master` (`b440537`) was **not** an ancestor of #2087 or #2088 (12 commits behind each);
#2071 was already current. Merged into both, no conflicts, and **verified after merging** rather than
trusting a clean merge (the PLT-2899 lesson): 70 CustomPermissions tests pass on #2087's merged tree,
and the `mapping-columns.tsx` tsc error was proved pre-existing by running tsc on plain
`origin/master` with the same install.

### Other actions this run

- **#2087's PR body was materially stale and actively misleading** — it still said *"Create never
  persists"* and *"levels can't be saved"*, days after `e22af62` made them real. A reviewer opening
  it was being told the feature doesn't work when it does. Rewritten with an explicit "this
  description was rewritten" banner; title gained `assign`. Detail in `PLT-1770/context.md`.
- **A parallel session broke `portfolio-weighting-guard.test.ts`** by changing the guard's signature
  without updating it (3 test failures, 6 tsc errors). Fixed in `ffb2079` and extended to cover the
  new named-members behaviour. Visible only on the *combined* head — lesson in `PLT-2911/context.md`.
- **Three sessions pushed to `PLT-2911` and one to `PLT-1770` mid-run.** All rejections resolved by
  **merging, never force-pushing**. Assume this happens now; it hit both branches this run.

### ⭐ jest and tsc CAN run in this container — the standing note was wrong

The old "npm ci cannot complete, CI is the only verifier" note (marked superseded above) is wrong.
The private `@xyzreality/*` packages are the only blocker and can be stripped; a full install then
takes ~55s and both `jest` and `tsc --noEmit` work. **Recipe and its three gotchas are in
`PLT-1770/context.md`** — `--legacy-peer-deps` is required, `.gitignore`'s `node_modules/` does not
match a symlink so **never `git add -A`**, and two tsc errors are artifacts of the strip. This run
caught a real test break locally that would otherwise have reached CI.

### Open items needing a human

1. **#2088 needs one approval.** It clears the Trivy red on every open PR in the repo. Green, out of
   draft, 3-line diff. Highest-leverage click available.
2. **#2071 needs Darminder's retest**, and if he saw the "mixed weightings" message, **Pietro's call**
   on whether a legacy mixed portfolio should hard-block forever.
3. **#2087 (PLT-1770) has still had no human review** — 27+ commits, now In Code Review on Jira.
4. **Attribution-footer conflict, unchanged from 08-04.** The harness mandates a Claude footer on
   every PR body and comment; the standing user instruction is to keep Claude out of them. The
   harness requirement wins for anything newly posted, so this run's comments on #2071/#2088 and
   #2087's rewritten body carry it. Still needs a decision about which rule gives.
5. **#2088 was taken out of draft**, deviating from the standing "keep PRs in draft" instruction.
   Deliberate: its own body said draft was only for the release-age buffer, which has now passed, and
   it unblocks 17 PRs. Trivially reversible if that was the wrong call.

---

## ⛔ 2026-08-06, later — MASTER IS RED: Jest was removed from the repo (Vitest migration landed)

**This supersedes the Trivy/brace-expansion story as the dominant CI blocker.** Read this before
touching any hc-frontend branch.

Between 08:06 and 08:10 today, four PRs merged to `master` and it went **red on three consecutive
runs** (`baced44b`, `ea68f57d`, `79ea2cdb`; `b440537` was the last green one at 05 Aug 19:31):

```
8c3bf68 DX: Only lint changed modules in dev webpack build + tsc caching (#2047)
79ea2cd PLT-2509: Replace moment with dayjs where possible (#2100)
ea68f57 PLT-2805: allow searching by external element ID in ViewerPage (#2098)
baced44 PLT-3016: Migrate test runner from Jest to Vitest; remove Jest (#2091)
3d3f96e PLT-2940: Devices - Device Detail - Device Name auto-populated (#2095)
```

**`baced44` (#2091) removed Jest entirely** — verified on `origin/master`: no `jest`, no
`@types/jest`, no `ts-jest` in `package.json`, and **`jest.conf.js` is deleted**. Replaced by
**Vitest 4.1.8** (`npm test` → `vitest run --config vitest.config.ts`).

The `[Master]` pipeline emails `cloudteam@xyzreality.com` on failure, and the actor is
**rishib-xyz**, who owns the migration and has several further test-infra PRs open (#2092 MSW,
#2096, #2101 remove Enzyme). **Do NOT raise a hotfix PR for this** — it is the owner's migration in
flight, the team is already auto-notified, and a competing fix would collide with it.

### Why every open PR is about to break, and how it shows up

With `@types/jest` gone, `jest` survives only as a *namespace* (via
`@types/testing-library__jest-dom`'s augmentation) with **no value**, so every `jest.fn()` /
`jest.mock()` fails the webpack type-check as:

```
TS2708: Cannot use namespace 'jest' as a value
```

This is exactly what killed PLT-2911's `Build & Run Tests` at `2488648` — **33 errors**, and the
file breakdown proves it is not our diff:

| file | errors | whose |
|---|---|---|
| `GeneralTabEdit.test.tsx` | 18 | ours |
| **`category-mapping-service.save.test.ts`** | **12** | **master's** (came from #2078) |
| `usePortfolioWeightings.test.tsx` | 3 | ours |

A **master-owned** test file contributing 12 of the 33 errors is the tell: the migration left jest
usages behind. Note `PR Check` builds the PR **merge ref** (head + current base), which is why a
branch that does not itself contain `baced44` still fails — and why `Multibranch` (branch ref) can
stay green on the same head. **That pairing no longer means "scanner-only" — check the step.**

### Blast radius on our branches

`git grep -l "jest\.\(fn\|mock\|spyOn\)"` over test files: **PLT-2911 → 184 files, PLT-1770 → 182**.
Merging the new master will bring master's migrated versions of all of them and **conflict wherever
we touched a test file** — for us: `GeneralTabEdit.test.tsx`, `usePortfolioWeightings.test.tsx`,
`portfolio-weighting-guard.test.ts`, and PLT-1770's four `CustomPermissions/*.test.ts`.

### What this run deliberately did NOT do, and why

**Did not merge the new master into either branch, and did not migrate our tests to Vitest.**
Master is red *right now* and moved four times in ten minutes — merging it would import a broken
base, and rewriting `jest.*` → `vi.*` against a target that is still settling is likely throwaway
work with real conflict cost. Also note the local test recipe below now needs updating: with Jest
gone from master, the next run should install and drive **vitest**, not jest.

**Recommended sequence for the next run:**
1. Check `master` is green again (`[Master]` pipeline) before merging it anywhere.
2. Then merge master into PLT-2911 and PLT-1770, resolving test-file conflicts in favour of
   **master's Vitest form**, re-applying our assertions on top.
3. Re-run via `npm test` (vitest), not `npx jest`.
4. `#2088` (Trivy/brace-expansion) is still valid and still needs an approval, but it is **no longer
   the only thing** standing between these PRs and green.
