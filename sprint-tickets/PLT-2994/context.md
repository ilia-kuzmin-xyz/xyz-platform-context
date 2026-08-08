# PLT-2994 — Project Settings · Task library drag and drop

**First seen 2026-08-08.** Status was `Open`. **Moved to `Analysis In Progress` + clarification
comment posted** (comment id 109176 — note: **edited in place** after a factual correction, see below).

> Read `../_shared-commissioning-domain.md` first.

## Blocked on PLT-2993
Drag-and-drop is meaningless until authored folders exist. In today's derived model, dropping a
task on a folder would mean *"link this checklist to that asset type"* — a much larger action than
the ticket implies. Jira link type on PLT-2992 confirms the intended order
(`PLT-2992 → PLT-2994 → PLT-2997`).

## ⚠️ Correction made this run — read before repeating it
The first version of the Jira comment claimed **the repo has no drag-and-drop library**. That was
**wrong**. `@dnd-kit/core` ^6.3.1 is a direct dependency and is already used for a folder tree with
DnD (`viewer-x/.../model-layers/model-tree/hooks/use-drag-and-drop.tsx`) and inside the Project
Settings modal itself (`AttributeTab/EditableAttributeList.tsx`). The comment was corrected in
place rather than left standing. **Lesson: grep `package.json` for the package name, not for the
words "drag"/"dnd".**

## Open questions posted
1. Move or copy — one folder per task, or several?
2. Drag back out to top level / drop on empty space?
3. Reorder *within* a folder too? (No manual order is stored today; list is newest-first.)
4. Are folders themselves draggable/reorderable?
5. A11y fallback — a context-menu "Move to folder…" for keyboard users, given this lives in a modal?

## Confidence
**3/10** while PLT-2993 is open; **7–8/10** afterwards, since the DnD pattern is already in-house.
