# sprint-tickets

Local, resumable context for PLT sprint tickets being worked by the scheduled routine.
One sub-folder per ticket (`PLT-XXXX/`). Each run reads its ticket's `context.md` to
recover where it stopped, so domain context isn't re-derived every time.

## Last triage — 2026-08-03

JQL: `project = PLT AND sprint in openSprints() AND assignee = currentUser()`

Only tickets that are NOT blocked / Dev In Progress / In Code Review are eligible for kick-off.

Sprint composition is **unchanged for the third consecutive run** — same five tickets, same
statuses. What *did* change: `master` moved `28e03c3 → ca87f65`.

| Ticket | Summary | Status | PR | Eligible? |
|--------|---------|--------|----|-----------|
| PLT-2935 | Freeze planned progress % for sales project | In Code Review | #2080 | ❌ |
| PLT-2911 | Validate weighting is Labour Hours before Portfolio | In Code Review | #2071 | ❌ |
| PLT-2907 | Quality-only viewer rotation zoom-out | In Code Review | #2057 | ❌ |
| PLT-2447 | Select Activity panel UX issues | In Code Review | #2054 | ❌ |
| PLT-1770 | Project-level Custom Permissions | Dev In Progress | none | ❌ — blocked on 22 open questions (D-1…D-14, BE-1…BE-8), unanswered since 2026-07-29 |

**Net: 0 eligible tickets for the third run running. No development kicked off** — the run was
checkpoints 1–3 again.

### Checkpoint 1 — review feedback

**Zero open review threads across all four PRs, and nothing new since 2026-08-02.** Every thread
(2 on #2054, 2 on #2071, 1 each on #2057 and #2080) is `is_resolved: true` with a reply posted.
No human has commented on any PR since the routine's own 2026-08-02 escalation comment on #2072.

Per the lesson recorded last run, `get_reviews` was checked as well as the thread list:

- **#2054** still carries DarminderA's `CHANGES_REQUESTED` (2026-07-24, commit `749e3f94`), not
  superseded by any later review. The fix landed the same day and `DarminderA` was re-requested as
  reviewer on 2026-08-02, which is the correct mechanism. Nothing further to do — it is waiting on
  the human, not on us. **Do not re-request again**; repeat pings are noise.
- #2057, #2071, #2080 have no `CHANGES_REQUESTED` — only `COMMENTED` reviews from the review bot
  and the replies to them.

None of the four PRs has an approval yet; each still lists 3–4 requested reviewers.

### Checkpoint 2 — the cross-cutting blocker (unchanged, 9 days old)

Verified again from the job logs — all four PRs fail on **only** the Trivy step, with exactly one
finding, no new CVEs accumulated:

```
package-lock.json (npm)   Total: 1 (HIGH: 1, CRITICAL: 0)
brace-expansion  CVE-2026-14257  HIGH  installed 5.0.7  fixed 5.0.8
```

`Build & Test [Multibranch]` (push event) **passes** on all four heads; only `Build & Test
[PR Check]` is red, and only at the `scan` step. So no PR has a code problem.

`master` at `ca87f65` **still carries `brace-expansion` 5.0.7** — the bump has not landed.

**PR #2072** (`fix/trivy-brace-expansion`) remains the single fix, and is proven: its PR Check went
green on 2026-08-02, which is direct evidence the 5.0.8 bump clears the finding. Searched again for
a duplicate hotfix (`is:pr is:open brace-expansion OR trivy OR CVE-2026-14257 in:title,body`) —
returns only #2072 and #2071 (prose mention). **No duplicate raised**, per checkpoint 2.

An escalation comment naming the four blocked PRs was already left on #2072 on 2026-08-02 and has
had no reply. **Not repeated this run** — a second identical nag adds nothing.

### Checkpoint 3 — up to date with master (action taken)

`master` advanced to `ca87f65` — **PLT-2899, "Remove defaultProject as an active-project source"**
(#2076). All five branches were 1 behind. Merged `origin/master` into each and pushed:

| Branch | old head | new head |
|--------|----------|----------|
| PLT-2447 | `d968b35` | `9bab76f` |
| PLT-2907 | `1aac98e` | `bc3474d` |
| PLT-2911 | `b33f263` | `218e711` |
| PLT-2935 | `c070379` | `1165cfe` |
| fix/trivy-brace-expansion | `529d116` | `092839f` |

All five merged **cleanly, no conflicts**, and each branch's diff vs master is byte-identical to
what its PR description claims (#2072 is still exactly the 3 lockfile lines).

#### Why this merge needed checking beyond "git says clean"

PLT-2899 is a **7,486-line deletion** commit. A clean textual merge is not sufficient evidence here,
because two classes of breakage don't produce conflicts:

1. **Deleted modules.** It removed `ProjectSelect/`, `GoBackDashboard/`, `CreateTestData/`,
   `CdeConnectionErrorModal/`, `DownloadListPage/`, and both `BIM360Project*SelectPage/` trees. A
   branch file importing any of them would merge clean and fail at build. Grepped every
   branch-changed file for all six names — **no references**, all five branches safe.
2. **`isUserProjectAdminSelector` changed shape.** It went from a selector to a **selector factory**:
   `useSelector(isUserProjectAdminSelector)` → `useSelector(isUserProjectAdminSelector(projectId))`.
   It no longer reads `account.defaultProject.id`; the caller supplies the project id. A stale call
   site merges clean and breaks at compile time. Grepped every branch-changed file — **no branch uses
   it**; master's only remaining call site (`useDevicesQuery.ts`) was updated in the same commit.

Also confirmed **PLT-2935 is unaffected** by the `defaultProject` removal specifically: its
`mongoProjectId` comes from the route param (`params?.project_id`,
`dashboard-project-service.ts:73`), not from `defaultProject` or `store/selectors`. The freeze keys
on the URL id and that source did not move.

**Reusable rule for future runs:** after any large deletion commit lands on master, a clean
`git merge` proves nothing on its own. Grep the branch's changed files for (a) modules the commit
deleted and (b) exported symbols whose signature it changed.

### Standing environment note

`npm ci` cannot complete in the scheduled-run container (401 from `npm.pkg.github.com` for the
private `@xyzreality/dhtmlx-gantt`), so there is no `node_modules` and jest/tsc cannot run locally.
CI is the only verifier. This is why the two greps above matter — a local typecheck would have
caught both classes of breakage instantly, and we cannot run one.

### Open items needing a human

1. **#2072 needs one approval.** It is the whole critical path: four PRs are red solely because of
   it, it is proven green, and it has sat since 2026-07-25. Nothing else the routine can do.
2. **#2054 needs DarminderA to re-review** and clear the standing `CHANGES_REQUESTED`.
3. **PLT-1770's 22 blocking questions still live only in `sprint-tickets/PLT-1770/context.md`** —
   never posted to Jira. The ticket has one comment (Darminder, 2026-07-24) and no record of the
   clarifications. It sits in *Dev In Progress*, so it is outside the kick-off set and the routine
   has deliberately not transitioned it or commented — three runs now. Nobody but Ilia can see what
   is blocking the only ticket actually assigned for development. **This needs an explicit decision:
   post them to Jira, or accept that they stay local.**
