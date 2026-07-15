# sprint-tickets

Per-ticket local working context for the scheduled sprint-dev routine. Each
`PLT-XXXX/` folder holds what the routine learned about a ticket so a later run
can resume without re-deriving domain context or re-reading the codebase.

## Convention

- One folder per ticket: `PLT-XXXX/`
- `context.md` — domain, key code refs, current state, and **where we stopped**
- Update the "Current state" section every time the routine touches the ticket

## Status legend for "Current state"

| State | Meaning |
|-------|---------|
| `AWAITING-CLARIFICATION` | Clarification comment left on Jira; ticket in *Analysis In Progress*; do NOT re-ask, do NOT dev until answered |
| `READY-FOR-DEV` | Confident, no open questions — safe to branch + implement |
| `IN-DEV` | Branch created, implementation underway |
| `IN-PR` | Draft PR raised |

## Current snapshot (2026-07-15)

| Ticket | Domain | Jira status | Local state |
|--------|--------|-------------|-------------|
| PLT-2531 | Viewer / Element Details Panel | Analysis In Progress | AWAITING-CLARIFICATION (since 2026-07-10) |
| PLT-2447 | Viewer / Editor selection + context menus | Analysis In Progress | AWAITING-CLARIFICATION (since 2026-07-10) |

Everything else assigned to me in the open sprint is *In Code Review* or
*Dev In Progress* — out of scope for this routine.
