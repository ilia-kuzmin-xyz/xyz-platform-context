# PLT-2799 — Edit checklist: versioning behaviour

**Priority:** Minor · **Epic:** PLT-2778 CX - Manage Checklists
**Reporter:** Pietro Desiato (created 12 Jun 2026) · **Domain:** commissioning → checklist library

---

## 2026-09-22 — first pick-up. Moved Open → Analysis In Progress

Posted a clarification (comment 112748) and transitioned to **Analysis In Progress**. Did not
implement — because the headline of this ticket appears to be **already shipped**, and what is left
is two product decisions the description itself flags as open.

### What already exists (verified in code, not assumed)

The ticket's acceptance criterion is *"editing a checklist in use never changes what a field
engineer mid-completion sees"*. That holds today:

- `ChecklistLibraryService.update()`
  (`app/services/checklistLibraryService/checklist-library-service.ts:561-630`) reads the current
  template row, finds the highest existing `version` (`:578-581`), **inserts version n+1**
  (`:583-589`) with fresh item rows, and repoints the template's `current_version_id` at the new
  version row (`:611`).
- Instances and executions carry the version they were created against, so an in-flight completion
  is not re-pointed by the edit.
- `type` is deliberately **excluded** from the update payload (`:557-559`) — the kind locks at
  creation, so an edit cannot silently reinterpret executions already recorded.
- `rename()` is a narrow name PATCH and deliberately does **not** cut a version — cutting a revision
  identical to its predecessor would strand every recorded execution behind it. (Documented on the
  method; landed with PLT-2999.)

So bullets 1–3 of the description ("edit flow reuses the definition editor", "saving creates version
n+1", "in-progress completions pinned to their version") read as done.

### What is genuinely left

1. **"library shows current version, history viewable"** — there is no version history UI today and
   no design for one. The data is there (`task_template_version` rows survive), so this is a view,
   not a schema change.
2. **"Decide and document: which edits are version-bumping vs cosmetic (e.g. description typo)"** —
   an explicit, unmade product decision. Current behaviour: **every** save through the editor bumps,
   including a description-only change. Only `rename()` is exempt.

Both are decisions, not code problems. Hence Analysis rather than a branch.

**Confidence to implement: 5/10** — the mechanism is fully understood; the scope is not.

### Watch-outs for whoever picks this up

- If cosmetic edits are made non-bumping, the split has to be decided on the **stored** row, not the
  draft: the same reasoning as `type` at `:621-623` (echo the stored value so a stale client can't
  relabel a template). A "description only" diff must be computed against the persisted row.
- `signingSlotsFor(draft.requiresSignOff)` is written per version (`:587`). If `requiresSignOff`
  changes, that is emphatically **not** cosmetic — a run of a version with no signing slots can
  never be signed off. (This is exactly the bug that bit `duplicate()` in PLT-2799's neighbour
  PLT-2999; see that ticket's context.md.)
- References in the description to **PLT-2785** and **XSPCMA-699** were not chased — worth checking
  their state before scoping the history view.

### Open — needs a human

- **Pietro / Darminder**: is the remaining scope just (a) a version-history view and (b) making
  cosmetic edits non-bumping, or is something in the current behaviour actually broken?
  Asked in comment 112748.

## 2026-09-25 — still blocked, no answer yet

**No reply to comment 112748** (posted 22 Sep); it is still the only comment on the ticket.
Left in **Analysis In Progress**, no second ping.

The 09-22 finding stands: the headline behaviour already ships, and what remains is two
product decisions (a version-history view, and whether cosmetic edits should stop bumping).
Neither is a code problem, so there is nothing to start.

## 2026-09-27 — still blocked, no answer (5 days)

**Still no reply to comment 112748** (22 Sep); still the only comment on the ticket. Left in
**Analysis In Progress**, no second ping — a third nudge on an unanswered product question is
noise, not progress.

Nothing has changed in the code or the ticket since 09-25. The two outstanding calls remain
product decisions, not code problems: (a) whether a version-history view is in scope, and
(b) whether cosmetic edits should stop cutting a version.

## 2026-09-28 — scheduled run: still blocked, no ping

**No reply** to comment 112748 (22 Sep). Left in **Analysis In Progress**.

Deliberately did **not** bump this one, unlike PLT-2524 on the same run. The difference is
proportionality, and it is worth writing down so the next run makes the same call consistently
rather than re-deciding it:

- PLT-2524 is **Critical**, and its blocker had narrowed to a question anyone can answer in one
  look ("what does the signed-off design say"). Worth a nudge at six days.
- PLT-2799 is **Minor**, and its blocker is a **product decision** that has not been made —
  which edits are version-bumping vs cosmetic, and whether a version-history UI is wanted at all.
  A second ping does not make a decision happen any sooner, it just adds noise to the ticket.

The 09-22 finding stands: the stated acceptance criterion — *"editing a checklist in use never
changes what a field engineer mid-completion sees"* — already holds in code.
`ChecklistLibraryService.update()` inserts version n+1 and repoints `current_version_id`;
instances and executions keep the version they were created against; rename is a narrow name
patch that deliberately cuts no version. So the remaining scope is only the two things the
description itself flags as undecided, and both need a human.

## 2026-09-29 — scheduled run: still blocked, no ping

**No reply** to comment 112748 (22 Sep); still the only comment on the ticket. Left in
**Analysis In Progress**, and again deliberately **no** second ping — the 09-28 entry's
reasoning is unchanged and worth keeping consistent rather than re-deciding each run: this is a
**Minor** whose blocker is an unmade *product decision*, and pinging does not make a decision
happen. (Contrast PLT-2524, which was bumped once at six days because it is Critical and its
blocker had narrowed to a question anyone can answer in one look.)

Nothing has changed in the code or on the ticket since 09-25. The 09-22 finding stands: the
stated acceptance criterion already holds in `ChecklistLibraryService.update()`, and what is
left is (a) a version-history view and (b) whether cosmetic edits should stop cutting a version.

## 2026-09-30 — master merge, one conflict, resolved as a union

Arrived **DIRTY**. Master moved to `27a2f9a` (#2203, task-library row actions), which lands
`remove()` on `checklistLibraryService` — the same service this ticket adds `versionDescription()`
to, so a collision was expected.

**One conflict**, in `checklist-library-service.wire-contract.test.ts`, and it was purely
positional: both sides appended a new block at the end of the same `describe`. HEAD added
`describe("a version's own description")` (5 tests), master added
`it('removes one template…')` + `describe('the tasks a deleted template left on assets')` (4 tests).
Kept **both** — closed HEAD's block explicitly and let master's keep the trailing closers.

Checked the auto-merged **service** file for a semantic collision rather than trusting the clean
merge: `remove()` (master, line ~1248) and `versionDescription()` (ours, ~1336) are both present
and orthogonal — master's delete relies on the schema cascading `task_template_version`, ours adds
a column to the version insert. No interaction. Both sides' `seedTemplate()` helpers are scoped to
their own `describe`, so the duplicate name is fine.

Pushed as `9c39a8a`. No code change beyond the merge.

**Still blocked on the same thing as before:** XYZReality/xyz-supabase#51 (the
`task_template_version.description` column). Safe to ship without it — the write retries without
the column and the read falls back to the template.

## 2026-09-30 (evening) — two findings left open, one verified, deliberately not fixed here

A parallel session pushed `798e5e2` fixing two Copilot findings (the in-flight pinned read falling
back to the template's current text; the version row storing an untrimmed description where the
template stores a trimmed one). CI green on that head. Copilot then raised two more and went quiet.

### HIGH — `versionDescription` drops its project scope. Verified, real.

```ts
this.assertProjectId(projectId)          // validated for presence…
const [row] = await this.client.select<ChecklistVersionRow>(VERSION_TABLE, [
  { column: 'id', op: 'eq', value: versionId },   // …and then never used
])
```

`listVersions()` is the contrasting case — it resolves the parent template against `project_id`
first. Commissioning's posture (`docs/commissioning/README.md`) is permissive RLS with client-side
scoping as *the* boundary, so a read that carries no scope is a defect against the design.

**Severity is bounded, and say so when sizing it:** the only caller passes
`instance.templateVersionId` from an already project-scoped instance, so no cross-project id can
reach it today. Defence-in-depth, not a reachable leak — but exactly the trap the next caller falls
into.

### Why this session did not fix it

Three reasons, in order of weight:

1. **The fix is a design call, not a mechanical one.** Scoping properly means resolving the
   version's `task_template_id` and checking that template's project — a second round trip on every
   description read. That should be chosen deliberately, not slipped in during a review round.
2. **It breaks the wire-contract test** that pins the current single filter, so it needs a
   replacement test written *blind* — and this session already turned #2236 red doing exactly that.
3. **A parallel session was live on this PR**, having pushed 50 minutes earlier. Two agents editing
   one branch is how today's #2251 picked up a commit mid-run; the collision risk outweighed the
   benefit of grabbing a non-urgent finding.

Analysis posted on the thread so whoever takes it is not starting cold. **Both findings still open.**

### The general point about concurrent sessions

This is the third time today another session touched a PR this one was working (#2251 mid-run,
#2236's `fdf42ab`, #2250's `798e5e2`). **Check the head SHA before assuming a branch is yours**, and
prefer a comment over a push when another agent is demonstrably active on it — a comment cannot
conflict.

---

## 2026-10-01 — scheduled sweep. No change pushed; one open thread advanced on paper

PR **#2250** is green (run 5107 on `798e5e2`), 4 commits behind master, `blocked` only on human
approval. **2 open Copilot threads.** Nothing pushed this run — see
`runs/2026-10-01-sprint-prs-checkpoint-sweep.md` for the two environment blockers (no `NPM_TOKEN`,
and commit authorship as Ilia now refused by the sandbox).

### Thread 1 — `versionDescription` ignores `projectId` (open)

The 09-30 reply stood this down as needing "a second round trip … a design call". Re-checked
first-hand and the finding is real, but a **one-query fix exists and was not considered**:

- `checklist-library-service.ts:1344-1358` — `assertProjectId(projectId)` runs, then the select
  filters on `id` only. The argument is validated and dropped. Confirmed.
- `ChecklistVersionRow` (`:243-257`) has `task_template_id`, **no `project_id`** — so simply adding
  a `project_id` filter is not available. That much of the 09-30 reasoning holds.
- `CommissioningDataClient.select()` hard-codes `select=*`, so PostgREST embedded filtering
  (`task_template!inner(project_id)`) cannot be expressed without extending the client.

**The option not yet on the thread:** the sole caller is the runner, which already holds
`instance.templateId` as well as `instance.templateVersionId`. Widen to
`versionDescription(projectId, templateId, versionId)` and filter
`task_template_id = eq.templateId` alongside `id = eq.versionId`. One read, no client change, and a
version id from another project cannot match. Strictly stronger than today. It does not prove the
template is in the project — the instance's own project scoping did that upstream — so it is
defence-in-depth of the same grade `listVersions()` has, at no extra round trip.

Still **not an active leak**: the only id reaching this method comes off an already-project-scoped
instance. Priority is "fix before the second caller appears", not "fix now".

### Thread 2 — no service test pins the `templateVersionId` mapping (open)

Unchanged and uncontested. `checklist-instance-service.ts:451` is the mapping that enables the whole
pinned-description read, and only the modal tests cover it, by injecting the field directly. This is
**the right first push once vitest can run** — small, in scope, nothing to design.

### Stale resolution worth knowing about

Copilot's JSDoc thread (`discussion_r4136326425`) is marked resolved and *not* outdated, but
`checklist-library-service.ts:1321-1343` still stacks two doc blocks above `versionDescription`,
leaving `listVersions` undocumented. The resolution is not backed by the tree. Cosmetic; fold it
into the next commit that touches the file.

## 2026-10-02 — all three parked findings resolved (`69fd8c11`), by a session that *could* run the suite

Everything the 09-30 entry left open is now fixed and test-verified by a parallel session:

- **`versionDescription` project scope** — resolves the version's `task_template_id` against
  `project_id` before returning, same shape as `listVersions`. Took the second round trip, as the
  analysis predicted, and broke the wire-contract test pinning the single filter, also as predicted.
  Both tests now seed the parent template, plus a third asserting a version whose template belongs
  to another project returns null.
- **`templateVersionId` mapping test** — added in the `getInstance()` wire-contract block.
- **Terminal read failure hiding the description** — fixed, and **with a better answer than the
  obvious one**: it does *not* fall back to the template on error, because that is the since-edited
  wording the pin exists to exclude — a naive fallback would have reintroduced this PR's own bug on
  a rarer path. The card now states the description could not be loaded. The engineer sees the
  requirements are **missing**, not that there are none.

That last one is the proper close on the state-conflation thread: splitting *failed* out of
*pending* is only half the job; what you render in the failed state has to not recreate the
original defect. Three states, three distinct behaviours.

## ⚠ "npm works now" does NOT apply to the scheduled sandbox — verified

The fixing session said it "got npm working locally". **That is a different environment.** Checked
directly from this sandbox on 2026-10-02:

```
npm view @xyzreality/dhtmlx-gantt version
→ npm error code E401 ... unauthenticated: User cannot be authenticated with the token provided
```

So the constraint recorded on 09-30 **still stands for scheduled runs here**: no suite, no
`tsc --noEmit`, no eslint. `npm install --package-lock-only` still works.

**Do not read the PR comments and conclude the blocker is gone** — test the registry first, as
above. It is a two-second check and the 09-30 run's one red build came from assuming something
about the environment that was not true.

## 2026-10-03 — merge conflict with master resolved, PR #2250 green again

PLT-3153 (#2247) landed on master and restructured the task runner onto a new
`TaskRunnerLayout`, moving the modal header and body under `header` / `footer` /
`side` props. That collided with this branch's pinned-description work: the
description block moved and was re-indented, so `TaskInstanceModal.tsx` conflicted.

**Resolution:** took master's layout wholesale, then re-applied the pinned read
into its body — the card renders `description` (the version's own text, falling
back to the template only once the pinned read has *settled*) instead of master's
`definition.description`, with the unavailable card after it. 406 tests green
across `AssetWorkflowStepTasks/`, `checklistLibraryService/` and
`checklistInstanceService/`.

**Note for anyone resolving this file again:** master's `definition?.description`
is the *mutable template* text. Re-taking it silently undoes this whole ticket —
the conflict looks cosmetic (indentation) but the variable swap is the point.

All six Copilot threads on #2250 were already resolved before this run.
