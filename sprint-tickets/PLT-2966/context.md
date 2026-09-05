# PLT-2966 — Asset Details readiness area: completion date-time

**Status:** Dev In Progress · **PR:** [#2204](https://github.com/XYZReality/hc-frontend/pull/2204)
(draft, **base `PLT-2968`, not master** — review #2186 first)

## 2026-09-05 — implemented

### Why it is stacked

Jira's Gantt link says PLT-2966 "has to be done before" PLT-2967 and PLT-2968. **That is inverted in
reality** — 2967/2968 shipped first on #2186, and the field this ticket needs
(`LadderStep.override`) plus the row layout it slots into both arrive there. So the branch is based
on `PLT-2968`. Don't re-derive this from the Gantt link; it will mislead you again.

### The actual delta

The ticket reads "display the date-time of completion along with a tick". **The tick already
existed** (`step.achieved && <Check/>`). The only missing thing is the date-time.

### Where the moment comes from — the finding of the ticket

There is **no stored achievement timestamp on the asset side**:

- `asset_readiness` has `is_achieved`, **and nothing writes it** — the service says so explicitly and
  deliberately omits it from every write ("its writer is undecided; its NOT NULL default must not be
  clobbered"). There is **no `achieved_on` column** beside it.
- `system_readiness` — the systems analogue — **has both `isAchieved` and `achievedOn`**. The asymmetry
  is real, not an oversight in my reading.
- `IReadinessOverride.overriddenAt` exists and covers only the *override* case.

So `LadderStep.achievedAt` is **derived**: the latest `modifiedAt ?? createdAt` across the level's own
task instances (`system_requirement` excluded, matching the `achieved` rule). Compared as ISO
strings — no `Date` parsing, so a malformed value cannot skew the max the way a `NaN` would.

**Documented caveat:** re-saving an already-complete task moves the date forward, so it reads as
"last touched" in that case. Only a stored stamp fixes it, and that is an **xyz-supabase schema
change**, out of hc-frontend. If `achieved_on` is ever added to `asset_readiness` mirroring
`system_readiness`, this becomes a two-line change to read it.

### Rendering decision (flagged in the PR as a design call)

The date-time **replaces** the count rather than sitting beside it: `4/4 tasks` next to a tick says
nothing the tick doesn't, the row is 36px, and it mirrors the override line's slot and treatment
exactly. An **override keeps its own line** where both are true — it is the stronger statement about
*why* the level is achieved. The hook records both regardless; the ladder decides which shows.

Could not open the ticket's mock-ups — Jira attachment content 403s outside the MCP tool, so the
placement is reasoned, not copied. One-line change if the mock-up keeps the count.

### Blast radius to remember

`LadderStep` gained a **required** field, so two fixture literals needed `achievedAt: null`
(`override-readiness-modal.test.tsx`, `step-tasks-modal.test.tsx`). Anything constructing a
`LadderStep` literal breaks on a new required field — there are exactly two today.
