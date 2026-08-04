# sprint-tickets

Local, resumable context for PLT sprint tickets being worked by the scheduled routine.
One sub-folder per ticket (`PLT-XXXX/`). Each run reads its ticket's `context.md` to
recover where it stopped, so domain context isn't re-derived every time.

## Last triage — 2026-08-04

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
