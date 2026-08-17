# PLT-3001 — Types → Asset types: Create New (2026-08-17 kickoff)

**Branch `PLT-3001`** = #2140's `task/PLT-2977-cx-systems-register` + master merged (clean). Pushed.
Base gives: systems panel (create/edit modals, `system-form-fields.tsx`), extended
commissioningApi (request errors), `systemService`/`systemTypeService` full copies.

## Ticket (Critical, Open, unassigned — Darminder)
"+ New Asset Type" in Project Settings → Types → Asset types → a CREATE page:
name, Asset Readiness levels (Add task per tag), System prerequisites (Add System
type → its Blue/White steps carry tasks), Other tasks. Add-task = MULTI-SELECT page
("Add selected tasks"), tasks removable. Design: Types Prototype (same artefact as
PLT-3000/3002; measured values in `_design-conformance-2026-08-12.md`).

## Developer-doc rules that bind this ticket (§2, §4 — verbatim-quoted strings)
- Opens a DRAFT detail page in edit mode, title "Create asset type".
- ONE draft at a time: second create attempt reopens it — "Finish the type you are
  already creating first".
- Name uniqueness case-insensitive — error "Asset Type name already in use";
  empty name cannot save ("Please enter a name", warn-orange #FE9526; dup #FD3D39;
  input: h42 bg#000 border#303030 r6; focus ring rgba(46,240,255,.15)).
- Cancelling a brand-new draft DISCARDS the type — row never enters the list.
- Footer note: "Pre-baked — read-only at launch. Tasks are applied per step after
  the type is created."

## What already exists on the branch
- `assetTypeService.create` (adopts project's default workflow) — creation works.
- `AssetTypeDetailContent` renders per-type detail; `ReadinessLevelsSection` has
  per-step AddTaskMenu (SINGLE-pick, has IST footnote); `SystemRequirementsSection`
  exists (check its data source before building); `typeDetail.styles.ts` tokens.
- TypesTab action bar (`types-tab-action-bar`) + drill-in sliders incl. task slider.

## Plan
1. "+ New asset type" button in the asset-types half (action bar, ghost style,
   `actionButtonSx`). One-draft guard via local state + toast.
2. Create slider = AssetTypeDetailContent in a create/edit mode variant: name input
   per prototype (validation above), Create/Cancel. Create → `AssetTypes.create` →
   swap slider to the real detail keyed by the new name.
3. Multi-select task picker (new shared component, replaces AddTaskMenu usage in
   EDIT contexts only): slider listing library tasks w/ checkboxes + "Add selected
   tasks"; reuse for 3003. Keep IST filtering + footnote.
4. System prerequisites: "Add System type" → list existing system types (service
   exists). Storage for SGP config likely MISSING — census has no such table.
   → Schema md (asset_type_system_requirement: id, project_id, asset_type_id,
   system_type_id, created_at; task links keyed (asset_type, system_type, step,
   task_template)). Follow docs/commissioning/system-types-schema.md style.
   If table absent on dev, gate the section's writes and say so in PR test steps.
5. Tests: create flow (empty name, dup name case-insensitive, cancel discards,
   one-draft), picker multi-select, removal. tsc + eslint + suites before push.

Confidence: 7/8 for steps 1–3+5 (all code-side); 5 for step 4 (needs table on dev
or product call). Draft PR; commits as ilia (git config FIXED in this container —
verify `git config user.name` after any container restart!).

## 2026-08-17 — progress
**Draft PR #2146 open** (base master; branch based on #2140 + master — say "review
#2140 first"). Landed: create draft page (`CreateAssetTypeContent`, 8 tests; submit
gated on catalogue fetch because the service UPSERTS BY NAME — a submit racing the
load would silently overwrite a type), "+ New asset type" action-bar button + slider
in TypesTab, multi-select `AddTasksPicker` replacing the anchored menu on readiness
steps (6 section tests rewritten to the picker contract; disabled options guarded in
the handler because a div-based ListItemButton lets synthesised clicks through), SGP
schema doc `docs/commissioning/asset-type-system-requirements-schema.md`.

Remaining on the ticket: Other-tasks bucket → same picker (small); "Add System type"
blocked on the SGP tables (run the schema doc's DDL on dev first); AddTaskMenu is now
unused by the readiness section but still used elsewhere? (grep before deleting).
