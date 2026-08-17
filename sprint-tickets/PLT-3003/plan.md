# PLT-3003 — Types → System types: Create New (2026-08-17 kickoff)

**Branch `PLT-3003`** = same base as PLT-3001 (see its plan). Pushed.
DEPENDS ON PLT-3001's multi-select task picker — implement 3001 first; PR must say
"PLT-3001 should be reviewed first".

Ticket: "+ New System Type" button in Types → System types → create page: name +
tasks per SYSTEM tag (Blue/White ladder per doc §1) + Other. Add-task behaves as in
PLT-3001. Design: Types Prototype §2/§3 system half.

Existing: `systemTypeService.create` (name-unique via DB? check — the viewer's
create-system modal (#2140 `create-system-modal.tsx`) already creates types inline
with duplicate detection — REUSE its patterns/copy). `SystemTypeDetail` +
`system-type-readiness` section already render steps. System steps come from
`system_type.workflow_id` → workflow steps (Blue/White pre-baked default workflow).

Plan: mirror PLT-3001's create slider on the system half; name validation with
"System Type name already in use"; apply tasks per step via workflow_step_task
(service exists: WorkflowStepTasks.replaceForStep/listForProject). Tests mirror 3001.
Confidence 7 once 3001's picker exists.
