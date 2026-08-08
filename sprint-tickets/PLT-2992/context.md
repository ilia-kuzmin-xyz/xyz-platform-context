# PLT-2992 — Project Settings · Task library (create new Task)

**First seen 2026-08-08.** Status was `Open` (eligible). **This run moved it to `Analysis In
Progress` and posted a clarification comment** (comment id 109175).

> Read `../_shared-commissioning-domain.md` first — it carries the domain facts for all five
> Project Settings commissioning tickets.

## Ask
"+ Create new" opens a context menu (New Folder / New Task). New Task opens a modal with a
drag-in form-element area, plus a **Task type** field: Checklist · Functional Performance Test ·
Integrated System Test. Save → task lands in the Task library list **without a folder**.

## Already built (do NOT rebuild)
- Task library tab with search, folder grouping, inline read-only detail.
- **Create already opens the builder in-modal** — `ChecklistBuilderContent` slides in over the tab.
- Palette already has `passFailNa · header · staticText · inputField · table · fileUpload ·
  signature` — so "drag in input fields and signature" is covered.
- Save already drops the definition into the unassigned (no-folder) bucket.

## Genuinely new / blocked
1. **Task type doesn't exist on `IChecklistDefinition`.** Behaviour-bearing or label-only in v1?
2. FacilityGrid importer reads `CHECKLIST TYPE` and discards it — should it now map onto the enum?
3. Required on save? Default for existing definitions?
4. **"+ Create new" split menu is shared with PLT-2993** — can't be built until the folder model is
   settled, and Import needs a home in the new bar.

## Confidence
**4/10** as written — high once (1) and (4) are answered; the builder work is already done.
Answer **PLT-2993 first**, it gates the menu.
