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

## 2026-08-17 — polish pass on PR #2147

PLT-3003 branch contains PLT-3001's commits, so #2147's diff inherits its
findings: merged the PLT-3001 polish commit (dead locals + test literal dedupe)
into PLT-3003 rather than re-fixing. 3003's own files (CreateSystemTypeContent,
SystemTypeDetail, TypesTab) lint clean. `TypesTab.test.tsx` warnings are
pre-existing master code, not in this diff. Suites 130/130 green after merge.

## 2026-08-20 — REWORKED with the asset side (see PLT-3001 08-20 note)

Same draft-editor pattern for "+ New system type" (#2147 commit 89b950b96): Blue/White
ladder staged locally, ISTs offered, Save provisions the type's OWN two-rung workflow
via `createSystemTypeWorkflow` then applies tasks via setForStep on the minted steps.
**Bug found in the first cut: created system types had `workflowId: null`** (create
passed only {name}), so the detail's task application was dead on arrival — the
"adopts the project's default workflow" claim in the original PR body was wrong.
Per-type workflow because `workflow_step_task` hangs off workflow_step rows: a shared
workflow would leak applied tasks across types. `createSystemTypeWorkflow` runs the
asset ensure first so the project's OLDEST workflow stays the asset Default
(`pickDefaultWorkflow` picks by age — a system workflow born first would get asset
types backfilled onto it).

## 2026-08-20 (later) — consolidated into ONE PR per the user

#2146 closed; **#2147 is now the single Types-tab PR** ("PLT-3001 / PLT-3003:
Types tab — create asset & system types as the prototype's draft editors"),
base master, ready-for-review, head `PLT-3003` (contains both halves + the
footer-bar rework). Multi-ticket PR titles are house style (see #2140, #2149).
Branch `PLT-3001` still exists but has no open PR — future asset-half work goes
through PLT-3003/#2147 until it merges.

## 2026-08-20 (evening) — visual pass, PLT-2992 fold-in, review round 2

Real-browser verification (recipe worked again; project card menu = the
`[data-type]` CardSettingsIcon, hover-revealed): the footer bar's grey button
showed a stray YELLOW border + 4px radius — a global button rule out-cascades
sx, fixed with `border: '0 !important'` + `borderRadius: '8px !important'`.
Create pages' scroll container was missing the detail page's `py + gap={3}`
rhythm (name divider hugged the "Asset Readiness levels" heading). Cancel
buttons (outlined secondary) rendered near-invisible on the dark surface →
prototype ghost style. **System-tab CTA label verified CORRECT in browser**
("+ New System Type") — the user's mislabel report was a stale build.

#2135 (PLT-2992, CHECKLIST TYPE → task kind) judged worth keeping (the kind
drives IST rules/outcome model), merged into PLT-3003, PR closed. #2147 title
now "PLT-3001 / PLT-3003 / PLT-2992".

Copilot round 2 folded in: isMissingRelation (42P01/PGRST205/404) is the ONLY
non-fatal prerequisite failure — real failures keep the create page up with a
visible retry that resumes from the created type (createdTypeRef +
savedRequirementsRef, no re-create → no dup-guard lockout);
createSystemTypeWorkflow fails fast + removes the minted workflow if step
seeding fails (tests added, 22 pass); picker groups in one pass; detail picker
exclusions computed once. All 5 threads resolved.
