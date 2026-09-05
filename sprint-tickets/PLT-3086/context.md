# PLT-3086 — System Edit/Move: impact modal for membership-ending actions

**Status:** Dev In Progress (was Open — status was lagging the code). **Not my work.**

## 2026-09-05 — triaged, deliberately not started

Came up as eligible in the sprint sweep because Jira said **Open**. It is not unstarted: Rishi has
[#2190](https://github.com/XYZReality/hc-frontend/pull/2190) — **draft, 29 files, +2010/-33, 9
commits** — covering the shared modal, the data layer, in-app `system_requirement` generation and the
member-remove door. The ticket description itself carries an "Implementation status" section saying
so; the *status field* was the only thing out of date.

**No new branch was created.** Moved to Dev In Progress and commented on the ticket instead.

### State of #2190 as of this run

- **draft**, last touched **2026-08-27** — nine days idle.
- base `e1114cd`; master is `1b15ad9`. **Nine days behind.**
- `mergeable_state: blocked`.

### Why nothing was pushed to it

It is Rishi's branch. The routine's checkpoint-3 rule says bring master into a stale PR, but that
rule is for PRs I own or was asked to drive; pushing a merge commit into someone else's idle draft
without asking is not that. Raised on the Jira ticket as a question to him instead.

**Next run:** if #2190 is still idle and still stale, that question is the thing to chase — not the
code, which is already written.
