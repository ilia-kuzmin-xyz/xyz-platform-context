# sprint-tickets

Local, resumable context for PLT sprint tickets being worked by the scheduled routine.
One sub-folder per ticket (`PLT-XXXX/`). Each run reads its ticket's `context.md` to
recover where it stopped, so domain context isn't re-derived every time.

## Last triage — 2026-08-01

JQL: `project = PLT AND sprint in openSprints() AND assignee = currentUser()`

Only tickets that are NOT blocked / Dev In Progress / In Code Review are eligible for kick-off.

| Ticket | Summary | Status | PR | Eligible? |
|--------|---------|--------|----|-----------|
| PLT-2935 | Freeze planned progress % for sales project | In Code Review | #2080 (draft) | ❌ |
| PLT-2911 | Validate weighting is Labour Hours before Portfolio | In Code Review | #2071 | ❌ |
| PLT-2907 | Quality-only viewer rotation zoom-out | In Code Review | #2057 | ❌ |
| PLT-2447 | Select Activity panel UX issues | In Code Review | #2054 | ❌ |
| PLT-1770 | Project-level Custom Permissions | Dev In Progress | none | ❌ — blocked on 22 open questions (D-1…D-14, BE-1…BE-8), unanswered since 2026-07-29 |

**Net: 0 eligible tickets. No development kicked off this run** — the run was checkpoints 1–3 on the
four open PRs.

### Cross-cutting blocker (all four PRs)

Every open PR's `build` check is red on the **same repo-wide Trivy finding**, not on its own diff:

```
package-lock.json (npm)
brace-expansion  CVE-2026-14257  HIGH  installed 5.0.7  fixed 5.0.8
```

`brace-expansion@5.0.7` is in `package-lock.json` on master, so every PR inherits it. The fix already
exists — **PR #2072** (`fix/trivy-brace-expansion`, lockfile bump 5.0.7 → 5.0.8, `mergeable_state: clean`)
— but it has sat in **draft since 2026-07-25**. No second hotfix PR was raised (checkpoint 2 says not to
duplicate one). **Nothing else will go green until #2072 lands on master.**

### Checkpoint 3 outcome

All four branches were behind master (`28e03c3`); `origin/master` merged into each and pushed. All four
auto-merged cleanly. Only PLT-2935 overlapped a file master had changed
(`dashboard-progress-service.ts`) and the two edits are in disjoint regions — checked, no interaction.

Note: `npm ci` cannot complete in the scheduled-run container (401 from `npm.pkg.github.com` for the
private `@xyzreality/dhtmlx-gantt`), so there is no `node_modules` and jest/tsc cannot run locally.
CI is the only verifier for these merges.
