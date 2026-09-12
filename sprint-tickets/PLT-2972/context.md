# PLT-2972 — Asset Details: Affects System tag interaction

**Status:** Analysis In Progress (clarification raised 2026-09-05). **No branch, no PR.**

## 2026-09-05 — scoped, then held

### The surface

`assets-panel/asset-systems-section.tsx` — the "Affects Systems (N)" card. Each system card lists
that **system's** readiness sequence via `SystemStepRow`; clicking a tag today toggles an **inline
accordion** of read-only task names (`StepTaskRow`). The ticket wants that click to open a **modal**.

### Reuse available (most of the work is already built)

PLT-2967 shipped `assets-panel/step-tasks-modal.tsx` on the `PLT-2968` branch — tag → task list →
click a row → `TaskInstanceModal` (the full editor). Same shape this ticket describes.

**But it is not drop-in:** `StepTasksModal` fetches with
`useChecklistInstancesForStep(projectId, assetId, stepId)` — keyed on the **asset**. The Affects
Systems tasks are the **system's**, assembled in `use-asset-systems.ts` and keyed on `systemId`.
A system-scoped variant, or passing the tasks in, is needed.

### Why it is held rather than built

Two questions that change what gets built, not just how:

1. **Whose tasks?** The card today shows the system's own tasks **plus** the requirements it asks of
   **all** its members (`tasksBySystem` takes both `system_readiness` and `system_requirement`
   buckets, unfiltered by asset). But we are standing in **one asset's** detail panel, so "tasks
   assigned" could equally mean only what that tag puts on **this** asset. Two different lists;
   picking wrong makes the modal misleading rather than merely imperfect.
2. **How deep?** The mock-up is 1569×997 — big enough to be the full task-fill form, or a task list
   that opens the existing editor. Second is hours; first is a different piece of work.

Could not view the mock-ups (Jira attachment content 403s outside the MCP tool), which is why these
could not be settled by looking.

### Known gap when it is built

`IAssetSystemTask` (`use-asset-systems.ts:23`) has **no `id`** — just name / blocked / status /
complete. To open a task in the editor from the modal it needs `id: instance.id` adding at
`tasksBySystem`'s `entry.tasks.push(...)`. One line, but it is the reason the current rows are
read-only text.

### Also in flight on this surface

Rishi's **#2160** (PLT-2970/71/73, affects-systems) touches the same section — coordinate before
starting.

## 2026-09-07 — still held, clarification unanswered

Checked at the start of the scheduled run. **Nothing has changed since 09-05.** Still
`Analysis In Progress`; the 09-05 09:04 clarification is still the only comment, no reply. Two days
open on a **Critical** ticket.

The two questions (whose tasks — the system's across all members, or only what the tag puts on *this*
asset; and list-that-opens-the-editor vs a full fill-in form) are both still unanswered, and both
still change *what* gets built rather than how. Hold stands.

One thing worth noting for whoever picks it up: the reuse position has **improved** since 09-05.
`StepTasksModal` now sits on `PLT-2968`, which was merged up to current master today, and #2186 is
green with only one deliberately-open thread. So the moment the scope question is answered, the
system-scoped variant of that modal is the whole job.

**Do not re-ask** — see the same note on PLT-2952.


## 2026-09-08 — still unanswered (day 3)

Checked the ticket: **one comment, still mine, no reply**. Status unchanged at Analysis In Progress.
Held per the "do not re-ask" note above. The reuse position noted on 09-07 still holds and improved
slightly: `PLT-2968` took master again today (`e3684e1`), so `StepTasksModal` sits on current master.


## 2026-09-10 — still unanswered (day 5)

Checked at the start of the scheduled run. **One comment, still mine, still no reply.** Status
unchanged at `Analysis In Progress`. Held per the "do not re-ask" note — no second comment posted.

Fifth day open on a **Critical** ticket. As with PLT-2952, that is now worth Ilia hearing about
directly, so it is escalated in this run's summary rather than re-asked on the ticket.

The reuse position is unchanged and still good: `StepTasksModal` (from PLT-2968) sits on current
master, `PLT-2968` is **0 commits behind master** as of this run, and #2186 is green with **all 32
review threads resolved**. The moment the scope question is answered — whose tasks the modal shows,
and list-that-opens-the-editor vs. a full fill-in form — the system-scoped variant of that modal is
the whole job.

## 2026-09-12 — still unanswered (day 7)

Checked at the start of the scheduled run. **One comment, still mine, still no reply.** Status
unchanged at `Analysis In Progress`. Held per the "do not re-ask" note — no second comment posted.

Seventh day open on a **Critical** ticket whose blocker is a one-line product answer. Escalated in
this run's notification to Ilia again, alongside the #2186 finding. The Jira ticket stays quiet.

Nothing in the analysis above has changed and it remains complete enough to start the moment the
question is answered.
