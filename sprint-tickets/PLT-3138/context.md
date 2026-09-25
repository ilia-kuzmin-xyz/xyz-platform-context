# PLT-3138 — Assign task template to a user (default assignee)

**Status:** In Code Review · **PR:** [hc-frontend#2231](https://github.com/XYZReality/hc-frontend/pull/2231)
**Domain:** commissioning → checklist/task library

---

## 2026-09-25 — nothing outstanding

All **19** review threads resolved, CI green. Merged `origin/master` (was 2 behind, no
conflicts) and pushed `4be453f` so it reviews against current master; re-ran
ChecklistCreatePage / ChecklistDetailPage / useAssigneeOptions / checklistLibraryService /
commissioningApi afterwards — 336 passed, 1 skipped.

### Carry-forward from the earlier rounds (still true, still useful)

- **Option values are `TYPE:id`, decoded on change.** Contact, company and role ids are all
  24-char hex from *different tables*, so nothing guarantees they don't collide. A bare id
  could not tell "the role r1" from "the stored contact r1".
- **`undefined` omits, `null` clears.** Mapping `undefined` → explicit null was wiping the
  default on every spreadsheet re-import, since the import builds update drafts with no
  `assignee` key and has no "No default" control for anyone to have meant it with.
- **`requires_sign_off` has the same import bug and is NOT fixed** — pre-existing, left out
  of this PR deliberately. **Still needs its own ticket.**
- The nested `withOptionalColumn` retry is column-aware: it reads the PostgREST body message,
  which is the only place the missing column is actually named.
