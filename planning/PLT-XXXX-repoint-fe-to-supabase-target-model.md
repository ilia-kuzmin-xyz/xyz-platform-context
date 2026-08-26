# PLT-XXXX — Re-point hc-frontend to the Supabase target model

*Drafted 2026-08-25. No ticket number yet — raise in Jira and rename this file.*

## Problem statement

XYZ_Supabase migration `20260819120000_target_model_expand.sql` (applied to `dev` on 19 Aug)
replaced the step→task linkage and reshaped `readiness_step`. hc-frontend still speaks the old
model. Two confirmed breakages and one suspected (details + evidence:
`commissioning/data-layer.md`, 2026-08-25 sections):

1. **`readinessStepService.create` fails on dev** — upserts on the dropped `(project_id, name)`
   unique (42P10) and omits the now-NOT-NULL `workflow_id` / `position` (23502). So
   `defaultWorkflowSetup` seeding breaks on any project without steps; fresh projects show empty
   commissioning surfaces. `readiness-step-service.ts:75`.
2. **`workflowStepTaskService` reads/writes the orphaned `workflow_step_task`** (9 rows) while the
   real catalogue links live in `asset_type_task` (249 rows) / `system_type_task` (3), actively
   written by the import feature and/or mobile. FE task pickers show a stale subset; FE saves are
   invisible to new-model consumers. Surfaces: PLT-3003 (#2147), PLT-3058 (#2150).
3. **`workflow_step` standing unverified** — `readiness_step` now carries `workflow_id`+`position`
   itself; the new tables reference `workflow_id`+`readiness_step_id` directly. If `workflow_step`
   is also orphaned from `supabase/schemas/*`, the tag derivations (`useAssetWorkflowSteps`,
   `use-asset-current-tag`) read legacy order. **Verify against schemas/* before repointing.**

## Proposed solution (phased)

1. **Fix seeding first** (small, unblocks dev):
   `readinessStepService.create` gains `workflow_id` + `position`; arbiter becomes
   `project_id,workflow_id,name`. `defaultWorkflowSetup` passes them (it already knows the
   workflow + order). If `workflow_step` remains declared, keep writing it; else stop.
2. **Re-point step→task services**: `workflowStepTaskService` → `asset_type_task` /
   `system_type_task` (both carry `bucket`, `position`, `workflow_id`, `readiness_step_id`, plus
   the type id the old table lacked — this also obsoletes the `listForAssetType` limitation noted
   in data-layer.md). Keep the bucket predicates.
3. **Re-point step order** (pending §3 verification): derive ladder order from
   `readiness_step.workflow_id`+`position` instead of `workflow_step`.
4. **One-off data check** on dev: whether the 9 legacy `workflow_step_task` rows contain links
   missing from `asset_type_task` (FE wrote them after the 19 Aug migration copy); migrate by hand
   or re-save through the UI.

## Acceptance criteria

- Fresh project on dev seeds Red/Yellow/Green and shows them.
- Task pickers list the same links mobile/import see (spot-check 249-row project).
- FE-created links land in the new tables.
- No FE code reads or writes `workflow_step_task`.
- Existing suites green; wire-contract specs updated to the new tables.

## Confidence: 7/10

Approach clear; unknowns: `workflow_step` standing (§3), whether mobile still writes anything
FE reads in between, and whether XYZ_Supabase will drop the orphans (ask them to — or to declare
them — so the middle state ends).

## Needs human

- Raise the Jira ticket; decide sequencing vs XYZ_Supabase promotion PR #5 (**this must land
  before #5 merges**, or stable comes up with a schema the deployed FE can't seed).
- Answer §3 via the XYZ_Supabase repo (is `workflow_step` in `supabase/schemas/*`?).
- Coordinate the §4 data check.

## Relation to PLT-2968

PLT-2968 (hc-frontend #2186) builds on `asset_readiness`, which IS the target model — unaffected
by this re-point except that its ladder inherits whatever step-order derivation §3 lands on.
