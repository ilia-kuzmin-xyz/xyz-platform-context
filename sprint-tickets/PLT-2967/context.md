# PLT-2967 — Asset details, readiness tag *task* context menu

**Type:** Task · **Domain:** Commissioning / viewer Assets panel
**Jira:** https://xyzreality.atlassian.net/browse/PLT-2967 · **Sibling:** PLT-2968 (same kebab menu)

**Status after 2026-08-24 run: `Analysis In Progress`. Mostly already built. No branch, no PR.**

---

## 2026-08-24 — most of this exists; one design question left

### Where the surface lives

`.../viewer-x/components/blocks/assets-panel/readiness-ladder.tsx` (268 lines) — the Readiness
accordion on the asset detail panel. Step data comes from `use-readiness-steps.ts`.

### Ticket steps vs master

| Ticket step | State |
|---|---|
| context menu on each tag | **Done** — kebab per row, `readiness-step-kebab-<stepId>`, `:178-190` |
| with `View tasks` | **Done** — `StyledMenu` at `:242`, item `readiness-step-view-tasks` at `:243` |
| opens a modal with the tag's task info | **Different shape** — expands an inline accordion (`:190`) |
| users can update values in the modal | **Done, one click deeper** — `TaskInstanceModal` |
| save button | **Done** — that modal owns its Save |

### The open question

`View tasks` today sets `expandedId` and shows the tag's task instances **inline**; clicking one
opens `TaskInstanceModal` (`components/AssetWorkflowStepTasks/TaskInstanceModal`), the same editor
the Task library and tasks panel use. The ticket's screenshots (1537×964, then 1617×1009) read as
`View tasks` opening a **tag-level modal** directly. Accordion-then-modal vs one modal is a real
UX difference and the design (`Commissioning Platform (standalone).html`) is 403 to every tool
available.

### Two loose ends found while reading — useful if the answer is "yes, a modal"

1. **`ReadinessLadder` declares `onViewTasks?` (`:39`) that no caller ever passes.** Grepped the
   whole app: the only non-test hits are the declaration, the destructure and the call. It is a
   hook left for exactly this ticket.
2. **`components/AssetWorkflowStepTasks/AssetWorkflowStepTasks.tsx` (170 lines) is orphaned.**
   Its *siblings* (`task-status`, `task-type`, `TaskInstanceModal`) are imported all over, but the
   default export — a `WorkflowStep` card listing an asset's task instances per step, with
   `completed/total` trailing counts — is imported by **nobody**. It is most of a tag-level task
   modal, already written. Likely the pre-`ReadinessLadder` surface.

So if the answer is "a modal", this becomes wiring, not new UI.

### Cross-ref

PLT-2968 adds `Override readiness level` to the **same** `StyledMenu`. Worth doing them in one
branch if both get answered.
