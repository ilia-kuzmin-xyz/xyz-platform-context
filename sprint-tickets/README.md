# sprint-tickets

Local, resumable context for PLT sprint tickets being worked by the scheduled routine.
One sub-folder per ticket (`PLT-XXXX/`). Each run reads its ticket's `context.md` to
recover where it stopped, so domain context isn't re-derived every time.

## Last triage — 2026-07-18

JQL: `project = PLT AND sprint in openSprints() AND assignee = currentUser()`

Only tickets that are NOT blocked / Dev In Progress / In Code Review are eligible for kick-off.

| Ticket | Summary | Status | Eligible? |
|--------|---------|--------|-----------|
| PLT-2907 | Quality-only viewer rotation zoom-out | Analysis In Progress | ✅ — parked, blocked on reporter answers (see folder) |
| PLT-2905 | Commissioning tasks/workflow unify | In Code Review | ❌ (also Commissioning, out of scope by default) |
| PLT-2883 | Infinite Canvas Room Readiness verify | Dev In Progress | ❌ |
| PLT-2863 | Redirect to editor after project creation | In Code Review | ❌ |
| PLT-2736 | Model fully rendered w/ no activities | In Code Review | ❌ |
| PLT-2531 | Element panel — show all models | Dev In Progress | ❌ |
| PLT-2447 | Select Activity panel UX issues | Dev In Progress | ❌ |

Net: 1 eligible ticket (PLT-2907), itself blocked on human input. No development kicked off this run.
