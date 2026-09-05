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
