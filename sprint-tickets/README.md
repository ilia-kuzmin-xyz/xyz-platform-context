# sprint-tickets

Local, resumable context for PLT sprint tickets being worked by the scheduled routine.
One sub-folder per ticket (`PLT-XXXX/`). Each run reads its ticket's `context.md` to
recover where it stopped, so domain context isn't re-derived every time.

## Last triage — 2026-08-02

JQL: `project = PLT AND sprint in openSprints() AND assignee = currentUser()`

Only tickets that are NOT blocked / Dev In Progress / In Code Review are eligible for kick-off.

Sprint composition is **unchanged from 2026-08-01** — same five tickets, same statuses, and `master`
is still on `28e03c3` (no merges landed in 24h).

| Ticket | Summary | Status | PR | Eligible? |
|--------|---------|--------|----|-----------|
| PLT-2935 | Freeze planned progress % for sales project | In Code Review | #2080 | ❌ |
| PLT-2911 | Validate weighting is Labour Hours before Portfolio | In Code Review | #2071 | ❌ |
| PLT-2907 | Quality-only viewer rotation zoom-out | In Code Review | #2057 | ❌ |
| PLT-2447 | Select Activity panel UX issues | In Code Review | #2054 | ❌ |
| PLT-1770 | Project-level Custom Permissions | Dev In Progress | none | ❌ — blocked on 22 open questions (D-1…D-14, BE-1…BE-8), unanswered since 2026-07-29 |

**Net: 0 eligible tickets for the second run running. No development kicked off** — the run was
checkpoints 1–3 again.

### Checkpoint 1 — review feedback

**Zero open review threads across all four PRs.** Every thread (2 on #2054, 2 on #2071, 1 each on
#2057 and #2080) is `is_resolved: true` with a reply already posted. Nothing new arrived since
2026-08-01; the only new activity was SonarCloud's quality-gate bot (passed on all four).

So the PRs are not waiting on the routine — they are waiting on **human review**. None of the four
has an approval yet; each still lists 3–4 requested reviewers.

**#2054 was worse off than the thread list suggested.** Review *threads* were all resolved, but the
PR still carries a standing **`CHANGES_REQUESTED`** review from **DarminderA** (2026-07-24, the
context-menu clash screenshot). The fix landed the same day (`5e623d349`, explained in a comment
tagging them), but the review verdict was never re-requested — so GitHub kept the PR blocked and the
PR dropped out of Darminder's review queue. That is why `mergeable_state` would stay `blocked` even
after the Trivy fix lands.

**Action taken:** re-requested `DarminderA` as reviewer on #2054, which is the mechanism that puts an
addressed `CHANGES_REQUESTED` PR back in the reviewer's queue. No extra comment was posted — the
24 July one already explains the fix and how to verify it.

**Lesson for future runs:** `get_review_comments` resolved-flags are *not* sufficient for checkpoint 1.
Also call `get_reviews` and look for a `CHANGES_REQUESTED` state that no later review supersedes —
resolving the individual threads does not clear it.

### Checkpoint 2 — the cross-cutting blocker (unchanged, now acted on)

Every PR's `build` check is red on the **same repo-wide Trivy finding**, verified again from the job
log on run 30690869325 — still exactly one finding, no new CVEs have accumulated:

```
package-lock.json (npm)   Total: 1 (HIGH: 1, CRITICAL: 0)
brace-expansion  CVE-2026-14257  HIGH  installed 5.0.7  fixed 5.0.8
```

The `Build & Test [Multibranch]` job **passes** on all four heads — so the code itself is fine and
only the vulnerability-scanner step fails.

**PR #2072** (`fix/trivy-brace-expansion`) is still the single fix. Progress since last run: it is
**no longer draft** (reviewers requested 2026-08-01). Still unmerged.

Searched for a duplicate hotfix before doing anything — `is:pr is:open brace-expansion in:title,body`
returns only #2072 and #2071 (the latter just mentions it in prose). No duplicate exists, so per
checkpoint 2 none was raised.

**Action taken this run:** #2072 was 7 commits behind master, and its last CI run was 2026-07-25
against a stale master. Merged `origin/master` in and pushed (`529d1160`). Checked first that master
has **not** touched `package.json` / `package-lock.json` since the branch point (`e1ab02d`), so there
was no stale-lockfile revert risk and no conflict — the diff vs master is still exactly the 3 lockfile
lines. A comment was left on #2072 naming the four PRs it blocks.

### Checkpoint 3 — up to date with master

All four feature branches are `behind=0` vs `origin/master` (`28e03c3`) — they were brought up to date
on 2026-08-01 and master has not moved since. Nothing to do.

### Standing environment note

`npm ci` cannot complete in the scheduled-run container (401 from `npm.pkg.github.com` for the private
`@xyzreality/dhtmlx-gantt`), so there is no `node_modules` and jest/tsc cannot run locally. CI is the
only verifier.

### Open item worth a human decision

PLT-1770's 22 blocking questions live **only in `sprint-tickets/PLT-1770/context.md`** — they were
never posted as a Jira comment. The ticket itself has a single comment (Darminder, 2026-07-24) and no
record of the clarifications. Since PLT-1770 sits in *Dev In Progress* it is out of the kick-off set,
so the routine did not transition it or comment; but nobody other than Ilia can currently see what is
blocking it.
