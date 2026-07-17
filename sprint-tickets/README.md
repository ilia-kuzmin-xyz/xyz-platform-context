# Sprint Tickets — local working context

Durable per-ticket memory for the **sprint-dev routine** (project PLT, current
open sprint, assignee = Ilia). Separate from `incidents/live-incident-board-tickets/`
(that's the triage routine's memory).

Each scheduled run:
1. Pulls my open-sprint tickets that are **not** blocked / in-progress / in-code-review
   (i.e. ready-for-dev, backlog, analysis — anything implying kick-off).
2. For each, reads/creates `PLT-XXXX/` here before re-investigating, so we resume
   where we stopped instead of re-deriving domain context every time.

## Layout

```
sprint-tickets/
  README.md
  PLT-XXXX/
    context.md   ← ticket + domain + code-level root cause (file:line) + decision + next step
```

`context.md` records, at minimum: ticket summary, top-level domain, verified
code references, root-cause hypothesis + confidence, current decision
(ready-for-dev / parked-in-analysis / blocked-on-answer), and the exact next
action so a later run can continue without re-reading the codebase.

## Run log

### 2026-07-17
- **In scope (1):** PLT-2907 (Dashboard / viewer camera) — only sprint ticket in a
  kick-off state. Already in **Analysis** carrying my clarification from 2026-07-16;
  **no reply yet** → kept parked, no re-comment. Code root cause re-verified against
  current source (see `PLT-2907/context.md`).
- **Out of scope (6):** PLT-2905, PLT-2863, PLT-2736 (In Code Review); PLT-2883,
  PLT-2531, PLT-2447 (Dev In Progress).
</content>
