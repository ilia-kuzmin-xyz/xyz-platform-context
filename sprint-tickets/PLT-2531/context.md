# PLT-2531 — Element Details Panel: show all models an element belongs to

- **Type:** Task · **Priority:** Minor
- **Jira status:** Analysis In Progress
- **Domain:** Viewer / 3D model — Element Details Panel (see `dashboard/viewer-and-model.md`)

## Requirement

Today the Element Details Panel shows only **one** model for an element even
when it belongs to multiple. Show links to **all** of them in an accordion;
each link should jump to the element's corresponding `dbId` "if the model is
loaded".

## Domain findings (from prior analysis)

- The data model already carries every model an element belongs to
  (`ElementEntity.getModels()` / `.dbIds`), so an accordion listing is feasible
  and can **reuse the existing panel accordion** component.
- Current single "Model" link only **reveals** the model in the left Model
  Layers tree — it does **not** move the 3D camera.

## Current state: AWAITING-CLARIFICATION (since 2026-07-10)

Clarification left on Jira (comment 107119). Two open questions — do NOT dev
until answered, do NOT re-ask:

1. Per-model link behaviour: select + fit the element in the 3D viewer
   (`setAggregateSelection` + `fitToView`), keep current "reveal in tree", or
   both?
2. Models the element belongs to but that are **not loaded**: greyed-out /
   disabled, or trigger a model load first?

## Next run

- If Jira has a new reply answering the above → fold answers in, set
  READY-FOR-DEV, branch `PLT-2531` off latest master.
- If still no reply → leave as-is, no action.
