# PLT-2531 — Element Details Panel: show ALL models an element belongs to

**Type:** Task · **Status at pickup:** Open · **Domain:** ViewerPage / Element Details (SceneProperties)

## Ask
Element panel currently shows ONE model even when element belongs to several. Show links to
ALL models in an accordion; each link navigates to the element's dbId in that model IF loaded.

## Key findings — data model ALREADY supports multi-model
- `project-x/entities/element-entity.ts:10` `models: Set<string>`; `:39-43 getModels()`;
  `:50-55 get dbIds(): {model, dbId}[]` (loaded/loading models only) → perfect source.
- Collapse-to-one logic: `viewer-x/.../services/element-properties-service.ts:50-66 _getModel()` —
  returns single `{display, mongoId}` or `'Various'` when >1. THIS is what to expand.
- Types: `element-properties.types.ts:23-26 PropertyModelValue`, metadata item id `'model'` (:35-51).
- Rendered: `scene-properties.tsx:143-152` (`metadata.id === 'model'` → one StaticLink,
  `handleModelClick` :92-103 reveals in model tree only, no 3D nav).

## Reuse
- Accordion: `model-layers/scene-properties.styled.tsx:5-73 AccordionWrapper` (already used in
  scene-properties.tsx:180-197).
- dbId navigation: `activity-linking-list/hooks/useElementSelection.ts:45-83 selectElementsByIds`
  → `viewer.setAggregateSelection`; example `linked-node.tsx:46,59` (setAggregateSelection + fitToView).

## Plan
Expose all models (id+display+dbId per model) from element-properties-service instead of collapsing;
render an accordion/list of models in scene-properties; per-model onClick = reveal in tree (existing)
AND, if model loaded, select+fitToView its dbId via existing helper.

## Decision (this run) → IN ANALYSIS + clarification comment
Not implemented yet. Two open questions posted on the ticket:
1. Should each per-model link navigate/isolate the element in 3D (setAggregateSelection +
   fitToView) — a behaviour change — or keep today's "reveal in Model Layers tree"?
2. For NOT-loaded models: disabled/greyed, or trigger a load?
Also to resolve at impl time: selected element → ElementEntity resolution path (selection store
records carry mongoModelId/dbId/externalId; ElementEntity is keyed by modelElementId in
projectService.elements) and the shared-mutable module-level `metadata` array in
element-properties-service._createMetadataArray (careful when turning `model` into a list).

## Confidence: 6/10 — approach + reuse clear, but real UX ambiguity + a new panel UI that
can't be visually verified locally. Implement once product confirms link behaviour.
