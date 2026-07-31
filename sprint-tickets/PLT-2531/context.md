# PLT-2531 — Element Details Panel: show all models an element belongs to

**Type:** Task · **Parent epic:** PLT-2717 (Q2 2026 Bugs and Improvements)
**Jira status:** **Ready For QA** — PR #2060 MERGED 2026-07-24. Ticket complete pending QA.
**Resolution:** Ilia supplied the design (Element_Details_Panel.dc.html) in-session; it answered both
open questions (Q1: link → element dbId via fitToView, same ↗ affordance; Q2: unloaded → greyed +
Load button → spinner → link). Implemented on branch `PLT-2531`, draft PR:
https://github.com/XYZReality/hc-frontend/pull/2060 (subscribed for CI/review follow-up).
See plan.md for verified data paths and design decisions.
**2026-07-24 follow-up:** testing found the Load button unreachable — `ElementEntity.models`
only holds loaded models, so unloaded ones never listed. Fixed in 454a766 (membership from
`elementStore.getModelsForElement()`, project-wide list, unioned + name-sorted); 12 tests pass.
Pitfall recorded in dashboard/pitfalls.md.

## What the ticket asks
Today the Element Details panel shows only ONE model for an element even when it
belongs to several. Ticket wants all models listed in an accordion, each link
navigating to the element's `dbId` "if the model is loaded".

- Attachment: `image-20260323-133139.png` (current single-model state) — **not accessible to this agent** (Jira attachment auth returns "no permission").
- Design: `claude.ai/design/p/6fdf8c9f-...` (Element+Details+Panel.dc.html) — **not accessible to this agent** (share link → HTTP 403; not a fetchable code-artifact URL).

## Domain (verified in hc-frontend)
Top-level domain = **ViewerPage / 3D viewer element properties panel**.
- `src/main/webapp/app/pages/organisation/ViewerPage/components/project-x/entities/element-entity.ts`
  - `models: Set<string>` (all model ids the element belongs to).
  - `getModels(): ModelEntity[]` — resolves ids to entities, drops models since removed. (element-entity.ts:39)
  - `get dbIds(): { model: ModelEntity; dbId: number }[]` — **"Only returns dbIds for models that have been loaded"** (element-entity.ts:46-51). This is the crux of open question #2.
- Element properties / details blocks live under
  `.../viewer-x/components/blocks/` (e.g. `element-linking-list/`, `issue-properties/`).
- Context doc: `xyz-platform-context/dashboard/viewer-and-model.md` (VWR). Selection/fit APIs
  (`setAggregateSelection`, fit-to-view, navigation pivot) documented there.

**Feasibility: HIGH.** Data model already carries every model + per-model dbId; an
accordion reusing the existing panel accordion is straightforward.

## Open questions (blockers — carried from my Jira comment 2026-07-10, still UNANSWERED)
1. **Link action:** today the single "Model" link only reveals the model in the left
   Model Layers tree (does not move the 3D camera). Should each per-model link
   select + fit the element in the viewer (`setAggregateSelection` + fitToView),
   keep the current "reveal in tree" behaviour, or both?
2. **Unloaded models:** for a model the element belongs to but that is NOT loaded,
   should the link be greyed-out/disabled, or trigger a model load first?

Neither has been answered by the team. Rishi asked Jason "was anything mocked up?"
(2026-06-03) — no reply. A design link now exists in the description but is not
openable by the agent, so it cannot be used to self-resolve the questions.

## Why not implement now
Both questions are product/interaction decisions, not code-feasibility. Guessing
would risk building the wrong interaction. Per workflow: reach 95% confidence first.

## Next run — what unblocks this
- A team reply answering Q1 + Q2, **or** the design behaviour pasted inline / access granted.
- Once answered: branch `PLT-2531` off latest hc-frontend master, add the accordion in
  the element details block, reusing existing accordion + selection/fit services.
