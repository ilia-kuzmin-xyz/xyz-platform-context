# PLT-2531 — Implementation plan

**Status:** DONE — implemented, draft PR https://github.com/XYZReality/hc-frontend/pull/2060, Jira → In Code Review (2026-07-22). Design received from Ilia (Element_Details_Panel.dc.html) — both
open questions resolved; ticket moved to Dev In Progress. Branch: `PLT-2531` off master.

## Design decisions (from the .dc.html mock + ticket text)
1. Under the existing **Model** field: a collapsible "Appears in N other models" row
   (chevron, **expanded by default**), shown only for single-element selection and only
   when the element belongs to >1 model. Multi-select keeps plain "Various" (no section).
2. Row list is a bordered rounded box, divider between rows.
3. **Loaded** other-model → clickable link (↗ icon, same affordance as Model link).
   Click → `viewer.fitToView([dbId], model.geom)` where `dbId = model.getDbIdForElement(element.elementId)`
   ("going to their corresponding dbId" per ticket). Fallback if dbId unresolvable → reveal model
   in Model Layers tree (reuse `handleModelClick` from scene-properties).
4. **Not loaded** → greyed name + `Load` button → `viewerService.addExtraDocument(model.id)`.
   While `model.isLoading` → spinner + "Loading". No local load state needed:
   `ModelEntity.isLoading/isLoaded` setters → `projectService.updateModels()` → `setModels([...])`
   → `useProject().models` context re-render (verified project-service.ts:464-469, model-entity.ts:103-125).

## Data path (verified)
- `SelectedElement.mongoId` == `modelElementId` (selection.types.ts:5-23, documented misnomer)
- `projectService.elements` keyed by `modelElementId` (element-entity.ts:17-18)
- `ElementEntity.getModels()` → all ModelEntity, dead models filtered (element-entity.ts:39-43)
- current model = `SelectedElement.mongoModelId`; "other" = getModels() minus it
- `model.getDbIdForElement(sourceFileElementId)` (model-entity.ts:363) — mappings applied during
  `_loadModel` → `applyMappings` (viewer-service.ts:967), so available right after load resolves.

## Files
- NEW `viewer-x/components/blocks/scene-properties/other-models-section.tsx` — the section component
- EDIT `scene-properties.tsx` — render `<OtherModelsSection onRevealModel={handleModelClick} />`
  inside `MetadataDetails`, after the metadata map ('model' is the last metadata item)
- Reuse: `useProject`, `useSelection`, `useViewer`, MUI (Stack/Typography/Collapse/Button/CircularProgress),
  `react-bootstrap-icons` BoxArrowUpRight, ExpandIcon, theme `base.secondaryGlow` hover glow
  (same as StaticLink), pattern precedent: issue-model-element-details.tsx.

## Self-review checklist
- [ ] no new services/deps; reuses existing entities + viewer service
- [ ] multi-select unaffected; commissioning untouched
- [ ] load button idempotent (guard isLoading/isLoaded)
- [ ] tsc + eslint clean on touched files; targeted unit test for pure helper
- [ ] PR: draft, concise, test steps; no assistant/copilot mentions; commits authored by Ilia
