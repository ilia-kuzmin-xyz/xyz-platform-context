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
