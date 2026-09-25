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
