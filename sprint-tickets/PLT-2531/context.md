# PLT-2531 — Element Details Panel: show all models an element belongs to

- **Type:** Task · **Parent:** PLT-2717 (Q2 Platform Bugs & Improvements) · **Priority:** Minor
- **Jira status:** Analysis In Progress
- **Domain:** ViewerPage / Editor — Element Details panel

## Ask
An element can belong to multiple models, but the panel shows only one. Show links to **all** in an accordion; each link goes to the element's `dbId` "if the model is loaded".

## Domain anchors (hc-frontend)
- `app/pages/organisation/ViewerPage/components/project-x/entities/element-entity.ts` — `ElementEntity.getModels()` / `.dbIds` already carry every model the element belongs to → listing them is feasible, reuses existing panel accordion.
- `app/pages/organisation/ViewerPage/components/viewer-x/components/blocks/element-linking-list` — related panel block.
- Existing single "Model" link only reveals the model in the left Model Layers tree; it does **not** move the 3D camera.

## Analysis state (as of 2026-07-14)
- **BLOCKED — awaiting product/human answer.** Clarification comment left on Jira (2026-07-10, "Claude here").
- Data model supports it; only the interaction/behaviour is undecided.

## Open questions (raised, unanswered)
1. Per-model link behaviour: select + fit in 3D viewer (`setAggregateSelection` + `fitToView`), keep current "reveal in tree", or both?
2. Models the element belongs to but that are NOT loaded: greyed-out/disabled, or trigger a model load first?
   - (Also unanswered: Rishi asked Jason 2026-06-03 whether anything was mocked up — no design surfaced.)

## Next step
Do NOT start dev. Resume once behaviour is confirmed. Confidence to implement once answered: high (8/10) — data + accordion already exist.
