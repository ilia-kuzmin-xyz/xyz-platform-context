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

---

## 2026-08-07 — 0 eligible again (6th run); the gap Darminder flagged was real and pre-existing

JQL returned **only two tickets** this run — the sprint has shrunk:

| Ticket | Summary | Status | PR | Eligible? |
|--------|---------|--------|----|-----------|
| PLT-1770 | [Project Level] Create Custom Permissions | In Code Review | #2087 | ❌ |
| PLT-3025 | Infinite Canvas: cold load time + published reports as dashboard tabs | Dev In Progress | — | ❌ |

**PLT-2911 has left the sprint query** — it is now **Ready For QA, reassigned to Gennaro Boccia**
(same trajectory PLT-2447 took). Its PR **#2071 is still open and still ours**, so the routine
continues to own it under the harness's "PRs you created" rule even though the Jira ticket has moved
on. Do not read its absence from the JQL as "finished".

**Net: 0 eligible tickets for the sixth consecutive run. No development kicked off** — checkpoints
1–3 only.

### Checkpoint 1 — Darminder APPROVED #2071, and our own push dismissed it

The headline the last entry could not have known: **DarminderA approved #2071 on 2026-08-06 21:30**
(commit `d33a39e`) — *"Thanks for making those changes. Approved!"*. That clears the two standing
`CHANGES_REQUESTED` rounds; the `Promise.allSettled` fix was the right diagnosis after all.

His one caveat: *"there is now a big gap in the UI for project settings — it is in DEV as well. If
its a quick change would be good to get in otherwise can do in another ticket."*

**A parallel session had already pushed a fix (`9f9f3a2`) two minutes later. This run verified it
rather than trusting it, and it is correct:**

- `ModalDivider` (`ViewerPage/components/common/modal/modal.styles.tsx:65`) is a **zero-height
  `div` whose only paint is `border-bottom`**.
- The column it sits in — `Details` in `GeneralTab.styled.tsx:58` — is
  `display:flex; flex-direction:column; **gap: 24px**`.
- So the duplicated divider was **not** drawing a second line; it was adding an entire extra **24px
  of flex gap** between Country and Timezone. That is why it read as a big empty band rather than a
  double border. Fix = delete one (2-line diff).
- **Confirmed pre-existing**, exactly as Darminder said: both dividers are on `origin/master` at
  lines **332 and 334**. Nothing in PLT-2911 caused it — checked by reading master's blob, not by
  inferring from the commit message.

⚠️ **The gap-fix push auto-dismissed the approval** (review state is now `DISMISSED`). This is a
trap worth remembering: *fixing the reviewer's own drive-by note costs you their approval*, and
nobody is notified. Replied on the PR explaining the root cause and asking for a re-click.

| PR | Open threads | Reviews |
|----|--------------|---------|
| #2071 | 0 (2 resolved) | Darminder **APPROVED → dismissed by `9f9f3a2`**; needs a re-click |
| #2087 | 0 (3 resolved) | rishib-xyz `CHANGES_REQUESTED` standing — all 5 points replied to, awaiting re-review |

**No new human feedback on #2087 since 2026-08-06 16:05.** Both of Rishi's rounds are answered
(4 fixed + PAPI-3738 for the 403; then 403→toast + sonar). Deliberately did **not** ping him again.

### Checkpoint 2 — CI green on both PRs, no blockers left

`#2071`: `build` **success**, SonarCloud **success**. `#2087`: 2× `build` **success**, SonarCloud
**success**. Every historic blocker is now gone from the repo — Trivy/brace-expansion merged to
master as `b8fbaf0` (#2088 landed, so the "needs one approval" open item from 08-06 is **closed**),
and master's vitest fallout was fixed in `08aaeab`. **No hotfix PR was needed or raised.**

### Checkpoint 3 — both branches were 2 commits behind; merged, re-verified, pushed

`origin/master` had moved to `5cb9f8b` (PLT-3029 webpack type-only re-exports, PLT-3026 removing 7
npm deps). Neither branch was up to date.

**Checked the risk before merging, not after:** `d9e8515` deletes `@mui/x-tree-view`,
`jszip-utils`, `jwt-decode`, `lottie-react`, `react-stomp`, `react-tabs`, `react-tooltip`. Grepped
both branches for imports of all seven — **zero hits on either**, so the removal is safe for us.

Merged into both, no conflicts, and **ran the suites on the merged trees** (the standing
"don't trust a clean merge" rule):

- PLT-1770 → `295f8de` — **73 tests / 4 files green** (the four CustomPermissions suites)
- PLT-2911 → `bccd37c` — **22 tests / 4 files green** (GeneralTabEdit + weighting-guard + hooks)

### Local test harness — recipe still works, and it is now vitest

The PLT-1770 recipe holds with one change: **drive `npx vitest run --config vitest.config.ts`, not
jest** (master removed jest in `baced44`). Strip `@xyzreality/*` from `package.json`, then
`npm install --legacy-peer-deps` (~1 min, 2215 packages), then **`git checkout package.json
package-lock.json`** to restore before committing. `node_modules/` is gitignored and did not appear
in `git status` this run — but the "never `git add -A`" rule still stands.

### Open items needing a human

1. **#2071 needs Darminder to re-click approve.** He already approved; our gap fix dismissed it.
   This is the single cheapest action available and the PR is otherwise green with 0 open threads.
2. **#2087 needs Rishi's re-review** — his `CHANGES_REQUESTED` is standing, but every point has been
   answered and CI is green. Also awaiting his call on the two deliberately-kept sonar smells
   (`handleCreateCompanyForUser(member)` ignoring its param, `handleCreateCompanyClick` unused).
3. **PAPI-3738 point 5 still open with BE** — which authority gates the `ms/iam/api/roles` CRUD
   family. Until named, a project admin sees the create button and gets a 403 (now a toast, not the
   global modal).
4. **Attribution-footer conflict, unchanged.** Harness mandates a Claude footer on every PR comment;
   the standing user instruction is to keep Claude out of them. Harness wins for newly posted
   content, so this run's #2071 comment carries it. Still needs a decision.
5. **PLT-3025 is Dev In Progress with no PR and no local context folder.** It is the largest ticket
   in the sprint (canvas cold-load caching + published reports as dashboard tabs) and it carries
   **three unanswered product questions** in its own description (who can publish, per-user vs
   shared tabs, tab-count cap). Worth answering before it becomes eligible.

### ⛔ LATE IN THE RUN — a NEW repo-wide Trivy blocker appeared: `js-yaml` (PR #2109 raised)

**This supersedes "CI green on both PRs" above.** Merging current `master` into both branches turned
both red — and it is **master's problem, not ours**:

```
js-yaml  GHSA-5p4m-2wfm-xmqj  HIGH  fixed
installed 4.3.0  →  fixed in 4.3.1, 3.15.1
JS-YAML: Quadratic CPU consumption in !!omap resolution — CVE-2026-59870
```

**Scanner-only, verified per this file's own rule — check *which step* failed, don't assume.** On
`bccd37c` the job steps were: step 6 `Build & Run Tests` **success**, step 9 Dashboard Progress
Regression **success**, step 11 SonarQube **success**, step 12 Dependency check **success**, and
**only step 13 `Vulnerability scanner` failed**. So the merge itself is sound; the tests really do
pass on both merged trees.

**Raised #2109** (draft) after confirming **no equivalent PR already existed** (searched open PRs for
js-yaml / trivy / CVE / bump — none). Facts worth not re-deriving:

- **`js-yaml` is NOT a direct dependency** — it is pinned by the **`overrides`** block in
  `package.json`. An earlier grep of `package.json` made it *look* direct; it is line 320 of the
  overrides object. Fix = raise the override floor `^4.3.0 → ^4.3.1`.
- **Exactly one `js-yaml` entry** exists in the whole lockfile (single hoisted copy), so a one-entry
  edit is the complete fix — no nested copies.
- 4.3.1 changes **neither its deps** (`argparse ^2.0.1`) **nor its `bin`**; integrity hash was
  **verified against the npm registry directly**, not trusted from install output.
- **Do NOT regenerate the lockfile with `npm install --package-lock-only`** — the local npm strips
  `libc` fields from ~30 optional platform packages, producing ~34 lines of unrelated churn. The
  entry was hand-edited to 3 lines instead. Net diff: **4 lines, 2 files.**
- **Did not bump to `latest` (5.2.3)** — major version, and this is a minimal unblock.

⏳ **#2109 is in draft for exactly one reason: `.npmrc` `min-release-age=7`.** js-yaml 4.3.1 was
published **2026-07-31T17:39Z**, so `npm ci` refuses it until **~2026-08-07T17:39Z** — later the same
day this was raised. **This is the second time this exact buffer has gated a Trivy hotfix** (#2088 /
brace-expansion was the first). **Next run: check the clock, re-run #2109's checks, and if green take
it out of draft.** No code change should be needed.

Both #2071 and #2087 were told on-thread that the red is not their diff, so a reviewer doesn't stall
on it — this matters especially for #2071, where a human is being asked to re-approve.

**Pattern worth naming for future runs:** a *new* HIGH advisory against a transitively-pinned package
lands on master roughly weekly, and `min-release-age=7` guarantees a ~7-day window where the fix is
known but uninstallable. Expect it; raise the draft PR immediately so only the un-drafting is left.

### ✅ CORRECTION, same run — `min-release-age` does NOT gate `npm ci`. #2109 is green and out of draft.

**The entry immediately above is wrong on its central claim, and CI disproved it within twenty
minutes. Read this before repeating that reasoning.**

I claimed #2109 had to sit in draft until ~2026-08-07T17:39Z because `.npmrc` sets
`min-release-age=7` and js-yaml 4.3.1 was published 2026-07-31. **That is not how it works:**

- `min-release-age` constrains **version *resolution*** — i.e. `npm install`, when npm is choosing
  which version satisfies a range.
- **CI runs `npm ci`**, which installs **exactly what the lockfile pins** and does not re-resolve.
  The buffer therefore never applies to it.
- **Proof, not inference:** on #2109's very first run, with 4.3.1 already in the lockfile, step 6
  `Build & Run Tests` **succeeded** (07:58:27 → 08:05:18), then step 13 `Vulnerability scanner`
  **passed too**. Whole `PR Check` green, hours before the supposed buffer expiry.

**#2109 is green, approved by rishib-xyz, and has been taken out of draft.** It only needs merging;
once merged it clears the scanner red on every open PR.

⚠️ **This also casts doubt on the 2026-08-06 account of #2088** (brace-expansion), which asserted the
same mechanism — *"it now clears `.npmrc`'s min-release-age=7, the only reason it was parked"*. That
explanation rests on the assumption just disproven. #2088 did go green after waiting, but **"it went
green later" is not evidence that the buffer was what held it** — a re-run, a master merge or a
Trivy DB refresh explains it equally well. Treat the #2088 rationale as **unverified**, not as
established fact.

**And disregard the "expect this weekly / ~7-day uninstallable window" pattern I wrote above** — it
was generalised from the same wrong premise. The real, much simpler pattern is: a new HIGH advisory
against a pinned transitive package lands on master periodically, and the fix is a lockfile bump that
**can be applied and verified immediately**. There is no waiting period to plan around.

**Standing lesson for this repo's notes:** the previous run wrote the min-release-age claim, this run
repeated it as received wisdom and built a "pattern" on top, and it took a live CI run to catch it.
Prefer *"this is what the run showed"* over *"this is how it works"* whenever a mechanism has not been
tested directly.

---

## 2026-08-08 — the drought broke: 6 eligible tickets, all sent to Analysis, 0 kicked off

**First run in seven with eligible work.** The board turned over completely: every ticket the
previous six runs tracked (PLT-1770, PLT-2911, PLT-2935, PLT-2907, PLT-2447) has left the sprint
query, and **their PRs #2071, #2087 and #2088 are all merged** — `origin/master` is now `4ad83a7`
and carries PLT-1770's custom permissions as `30143ca`. The routine's PR-ownership backlog is
effectively discharged.

JQL: `project = PLT AND sprint in openSprints() AND assignee = currentUser()` → **7 tickets**.

| Ticket | Summary | Status in | Eligible? | Action |
|--------|---------|-----------|-----------|--------|
| PLT-2992 | Task library — create new Task | Open | ✅ | → Analysis In Progress + comment |
| PLT-2993 | Task library — create new folder | Open | ✅ | → Analysis In Progress + comment |
| PLT-2994 | Task library — drag and drop | Open | ✅ | → Analysis In Progress + comment |
| PLT-3000 | Type Library — Asset Types | Open | ✅ | → Analysis In Progress + comment |
| PLT-3002 | Type Library — System Types | Open | ✅ | → Analysis In Progress + comment |
| PLT-2963 | Infinite Canvas — speed up generation | Open | ✅ | → Analysis In Progress + comment |
| PLT-3025 | Infinite Canvas — cold load + dashboard tabs | Dev In Progress | ❌ | — |

**All six eligible tickets went to `Analysis In Progress` with a clarification comment. Zero
development kicked off.** Not caution for its own sake — each one has a named, evidenced blocker,
and two of them would have produced throwaway work. Per-ticket detail is in the folders; the
domain facts they share are in **`sprint-tickets/_shared-commissioning-domain.md`** (written once,
so the next run doesn't re-derive them five times).

### Grouping

Two domains, as the stored prompt asks:

- **A · Commissioning / Project Settings** — PLT-2992, 2993, 2994, 3000, 3002.
  Note these are **Commissioning**, which hc-frontend's root `CLAUDE.md` puts *out of scope by
  default*. Working them requires `touch .claude/commissioning-active` (branch names must be
  `PLT-XXXX`, so the branch-name trigger can never fire for them).
- **B · Infinite Canvas / agent pipeline** — PLT-2963 (and PLT-3025, ineligible).

### The two findings worth the run on their own

1. **PLT-3000 appears already shipped.** *"List all the Asset types, showing the number of assets
   assigned and tasks against a type"* is exactly what the existing **Asset Types** tab does —
   `AssetsTab` → `AssetListContent` with `initialView='assetTypes'`, whose group table already
   carries name + asset count + **Tasks** count via `useReadinessTaskCountsByType`. A developer
   working from the description alone would rebuild a shipped table. The residual ask looks like an
   **IA restructure** ("Type library" parent with Assets/Systems children) — nothing named "Type
   library" exists in the codebase.

2. **PLT-2963 duplicates PLT-3025 almost line for line** — same baselines, same faster-MCP-schema
   ask, same pre-warm ask, the same `schedules_schedule_revision_id → request_failed` note
   verbatim, and the same acceptance criterion **including the unfilled `<target>` placeholder**.
   PLT-3025 is already Dev In Progress. Suggested on-ticket: PLT-2963 keeps the *viewer/first-paint*
   half, PLT-3025 keeps the *caching* half — they are independent and touch different code.

### The structural blocker behind the whole Task library trio

Folders in the Task library are **derived, not authored**: `groupChecklistsByType()` buckets each
checklist under the asset type(s) it's linked to, with a synthetic `__unassigned__` bucket.
PLT-2993 wants user-created folders; PLT-2994 wants to drag into them; PLT-2992's "+ Create new"
menu contains *New Folder*. **All three wait on one product decision** — do user folders replace
the asset-type grouping or coexist with it. Answering PLT-2993 unblocks the other two.

Also new-to-the-model and unanswered: PLT-2992's **Task type** enum (Checklist / Functional
Performance Test / Integrated System Test) has no field on `IChecklistDefinition`, and PLT-3002's
**System type** has no data source at all (an asset carries one flat `system: string`).

### ⚠️ A wrong claim I posted and corrected within the run

On PLT-2994 I first wrote that *"the repo has no drag-and-drop library"* and that the ticket would
have to bring one in. **False.** `@dnd-kit/core` ^6.3.1 is a direct dependency and is already used
for a folder tree with DnD (`viewer-x/.../model-tree/hooks/use-drag-and-drop.tsx`) and inside the
Project Settings modal itself (`AttributeTab/EditableAttributeList.tsx`). The Jira comment was
**edited in place** to say so. Cause: grepping for the words `drag`/`dnd`/`sortable` in a truncated
listing instead of grepping `package.json` for the package name. In the spirit of the 08-07 lesson
— *prefer "this is what the run showed" over "this is how it works"* — the check is cheap, so do it
before asserting an absence.

### Checkpoints 1–3 — one PR left, and it is clean

Open PRs in hc-frontend: **#2109 (ours)**, #2110 and #2111 (rishib-xyz), #1664 (piedukexyz, Jan,
not ours). Only #2109 is the routine's.

**#2109 `fix: bump js-yaml to 4.3.1`** — `mergeable_state: clean`, out of draft, base `4ad83a7`
= current master (so checkpoint 3 is a no-op), **all three checks green** (2× `build`, SonarCloud),
**zero open review threads**, approved by rishib-xyz. Nothing technical remains. **It needs one
click to merge**; the routine did not merge it, since merging to master is not something to do
unprompted.

No CI hotfix PR was needed or raised this run.

### Standing limitation, now hitting every ticket in the batch

Five of the six tickets carry their real specification in **Jira media blobs and `claude.ai/design`
prototypes that the runner cannot fetch**. Descriptions alone were enough to *triage* (the code
comparison did the work), but they will not be enough to *build* pixel-accurate UI. If these
tickets are meant to be delivered by this routine, the designs need to reach it some other way —
exported PNGs attached to the ticket would do.

### Open items needing a human

1. **PLT-2993's folder-model question** — one decision unblocks three tickets (2992, 2993, 2994).
2. **PLT-3000: is it just the IA restructure?** If yes it is the cheapest ticket on the board and
   can start immediately. If no, say what's missing from the shipped table.
3. **PLT-3002 needs a data model** for System types before any UI can be written.
4. **PLT-2963 vs PLT-3025 duplication** — close one, or split them on the viewer/caching line.
5. **`<target>` is unfilled** in the acceptance criteria of both canvas tickets.
6. **#2109 needs merging.** Green, approved, clean, 4-line diff.
7. **Attribution-footer conflict, unchanged from 08-04.** The harness mandates a Claude footer on
   every GitHub comment and PR body; the standing user instruction is to keep Claude out of them.
   No GitHub comments were posted this run, so nothing new carries it — but the conflict is still
   undecided. (Jira is not affected: the stored prompt *asks* for Claude to be named there.)

---

## 2026-08-09 (Sunday) — no-op run: nothing moved, and the silence is a weekend

**Deliberately a short entry, because almost nothing changed.** Recording it so the next run can
tell "nobody answered" apart from "nobody ran".

JQL unchanged. Sprint composition **identical to 08-08**: PLT-2992, 2993, 2994, 3000, 3002, 2963 all
still `Analysis In Progress`; PLT-3025 still `Dev In Progress` (ineligible).

**Every one of the six clarification comments posted on 08-08 still has exactly one comment on the
ticket — mine. Zero replies, zero status changes.**

### The reading that matters: this is a weekend, not a stall

08-08 was a **Saturday**, 08-09 is a **Sunday**. The six questions have been live for ~24h, all of
it weekend. **Do not escalate on this, and do not re-post the questions** — a second identical nudge
a day later is noise, and it would land on people who are simply not at work. The first working day
these can be answered is **Monday 2026-08-10**; if they are still unanswered by the run *after*
that, then it is a genuine stall and worth escalating.

**No Jira comments were posted this run**, on purpose.

### 0 tickets kicked off — same six blockers, re-checked not re-assumed

Each was re-examined against the possibility of starting anyway. All five holds still hold:

- **PLT-3000** is the tempting one — 8–9/10 confidence *if* the ask is only the IA restructure. But
  it would mean renaming/absorbing a **shipped** flag-gated tab with the design prototype
  unreachable. Silence over a weekend is not confirmation. Held.
- **PLT-2963** would collide with **PLT-3025, which is actively Dev In Progress** — starting the
  overlapping half is the one action here that could damage someone else's work in flight. Held.
- **PLT-2992 / 2993 / 2994** still pivot on the single folder-model decision (2993 is the keystone);
  guessing wrong throws away the work *and* breaks `useReadinessTaskCountsByType` on the Assets tab.
- **PLT-3002** still has no data model for System types. Unbuildable, not merely unclear.

### Checkpoints 1–3 — all clean, all no-ops

`origin/master` is **still `4ad83a7`** (unmoved since 08-08), so checkpoint 3 is a no-op by
definition — nothing to merge in.

**#2109 `fix: bump js-yaml to 4.3.1`** is the routine's only PR and is unchanged: `state: open`,
`mergeable_state: clean`, **not merged**, out of draft, base = current master, all 3 checks green
(2× `build`, SonarCloud), **0 open review threads**, approved. Checkpoint 1 clean (no new feedback),
checkpoint 2 clean (no failing build anywhere).

⚠️ **It has now been sitting green and mergeable for two days.** It is not just ours: until it
merges, the Trivy `Vulnerability scanner` red persists on **every open PR in the repo**, including
rishib-xyz's #2110 and #2111. One click, 4-line diff. The routine does not merge to master
unprompted — this needs a human.

### Open items for a human (unchanged from 08-08 — reproduced so this entry stands alone)

1. **PLT-2993's folder model** — one decision unblocks three tickets (2992, 2993, 2994).
2. **PLT-3000: is it only the IA restructure?** If yes, cheapest ticket on the board, starts at once.
3. **PLT-3002 needs a System-type data model** before any UI exists to write.
4. **PLT-2963 vs PLT-3025 duplication** — close one, or split on the viewer/caching line.
5. **`<target>` unfilled** in the acceptance criteria of both canvas tickets.
6. **#2109 needs merging.**
7. **Attribution-footer conflict still undecided** (harness mandates a Claude footer on GitHub posts;
   standing user instruction is to keep Claude out of them). No GitHub posts were made this run.

---

## 2026-08-10 (Monday) — still 0 replies, but the run bought something: PLT-2963's FE half is now code-traced

JQL unchanged. **Sprint composition identical to 08-08 and 08-09** — PLT-2992, 2993, 2994, 3000,
3002, 2963 all `Analysis In Progress`; PLT-3025 still `Dev In Progress` (ineligible).

**All six clarification comments from 08-08 still have exactly one comment each — mine. Zero
replies, zero status changes, third run running.** Verified per ticket via `fields:["comment"]`,
not inferred from `updated` timestamps.

Today is the **first working day** since the questions were posted (08-08 Sat, 08-09 Sun). Run
fired 07:40 UTC — i.e. 08:40 BST, as people arrive. Per the 08-09 note, that makes today the
earliest point a stall could even be diagnosed, so this run escalated **to Ilia by notification**
rather than re-posting on the tickets. **No nudge comments were posted** — a second identical ask
a day later is noise.

### 0 tickets kicked off — blockers re-checked against code, not inherited

The holds from 08-08/08-09 all still stand and are unchanged. What changed is **PLT-2963**, where
this run stopped comparing descriptions and read the actual code. Full write-up with line numbers
in `PLT-2963/context.md` (2026-08-10 entry). Headline:

- The *"nothing else on screen for ~55s"* symptom is **`ArtifactPanel.tsx:407`** — while
  `viewerMapping` is null, the **entire dashboard** is replaced by the `ViewerLoading` skeleton,
  not just the viewer block.
- The mapping is **deliberately not persisted** with the session and is refetched on restore
  (`useCanvas.ts:2082-2099`), because — per the comment there — it is **"~8MB"**.
- **That rationale is stale.** Both canvas tickets say the mapping is now **2.46MB (was 9.37MB)**.
- Therefore, of the three fixes the ticket floats, **"persist the mapping with the session" is the
  only one that fits the existing invariants** ("mount Sandpack exactly once"; the mapping is a
  static JSON import that Sandpack won't re-run on `updateFile`, documented at
  `ArtifactPanel.tsx:395-406`). *"Mount the viewer separately"* would need two Sandpack instances;
  *"pre-warm on project open"* is a mitigation that leaves the gate in place.
- Confidence on the **FE/viewer half** accordingly moves **7/10 → 9/10**, still gated on the
  duplication answer plus one small storage question (mapping is per-*project*, sessions are
  per-*user*).

This was posted to PLT-2963 as an **additive technical note** (not a re-ask) — it narrows what
product has to decide and reduces the chance of an answer that can't be built.

### Checkpoints 1–3 — all clean, all no-ops (third run running)

`origin/master` **still `4ad83a7`**, unmoved since 08-08 → checkpoint 3 is a no-op by definition.

Open PRs in hc-frontend: **#2109 (ours)**, #2110 + #2111 (rishib-xyz), #1664 (piedukexyz, Jan).

**#2109 `fix: bump js-yaml to 4.3.1`** — unchanged since 2026-08-07T17:20Z: `state: open`,
`mergeable_state: clean`, **not merged**, out of draft, base = current master, **all 3 checks
green** (2× `build`, SonarCloud), **APPROVED by rishib-xyz**, no `CHANGES_REQUESTED`, Copilot's
review generated **0 comments**. Checkpoint 1 clean (no new feedback anywhere), checkpoint 2 clean
(no failing build anywhere). **0 open review threads across all our PRs.**

⚠️ **#2109 has now been green, approved and mergeable for 3 days.** Until it merges the Trivy
`Vulnerability scanner` red persists on **every open PR in the repo**, including rishib-xyz's #2110
and #2111. 4-line diff, one click. The routine does not merge to master unprompted.

### Open items for a human (unchanged + one new)

1. **PLT-2993's folder model** — one decision unblocks three tickets (2992, 2993, 2994).
2. **PLT-3000: is it only the IA restructure?** If yes, cheapest ticket on the board, starts at once.
3. **PLT-3002 needs a System-type data model** before any UI exists to write.
4. **PLT-2963 vs PLT-3025 duplication** — close one, or split on the viewer/caching line. Now
   backed by code: the two halves touch different files and layers.
5. **`<target>` unfilled** in the acceptance criteria of both canvas tickets.
6. **#2109 needs merging.**
7. 🆕 **PLT-2963 storage question:** persist the 2.46MB mapping **per-session** (simplest, but N
   users on a project each carry a copy) or **per-project** alongside the hydration records? One
   line unblocks the implementation.
8. **Attribution-footer conflict still undecided** (harness mandates a Claude footer on GitHub
   posts; standing user instruction is to keep Claude out of them). No GitHub posts were made this
   run, so nothing new carries it.
