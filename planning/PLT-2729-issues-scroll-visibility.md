# PLT-2729 — Increase Visibility of Issues (Scroll + Sticky Search)

**Jira:** https://xyzreality.atlassian.net/browse/PLT-2729
**Area:** QLT — Quality Management tab, left panel layout
**Confidence:** 7/10 — layout refactor with a risk of breaking 360 panel (shared component)

---

## Problem

The issue list inside the Quality panel has its own scroll container (Virtuoso creates an internal scroll area bounded to the flex height of its parent). This produces double-scrolling: the user scrolls inside a small box rather than scrolling the whole left panel.

The search bar is already `position: sticky, top: 0` in `IssueTable` but its stickiness is relative to the IssueTable's own scroll container, not the left panel. Since the outer panel has `overflow: hidden`, the sticky bar never actually leaves the viewport — it appears sticky but only within a small clipped area.

---

## Root cause

**File:** `dashboard-panels/quality-panel.tsx` (lines 151–195)
The `IssueTable` is wrapped in a flex container with `overflow: 'hidden'` and `flex: 1, minHeight: 0`. This bounds the Virtuoso component to the remaining panel height and forces it to create its own scroll context.

**File:** `quality-panel/components/issue-table/issue-table.tsx` (lines 81–92, 215–242)
The `Virtuoso` component is configured with `height: '100%'` inside a bounded flex container. This is correct for an isolated scroll but wrong when we want the panel to scroll.

**File:** `dashboard-resizer/resizable-layout.tsx` (lines 404–432)
The left panel container has `overflow: 'hidden'`. This is what needs to change to become the scroll parent.

---

## Proposed solution

**Step 1 — Make the left panel the scroll parent**

In `resizable-layout.tsx`, change the left panel container:
```
overflow: 'hidden'  →  overflow-y: 'auto'
```
Add a ref to this container and forward it down.

**Step 2 — Tell Virtuoso to use the left panel as its scroll container**

`react-virtuoso` supports `customScrollParent` prop — pass it the left panel DOM node ref. This makes Virtuoso render all items at their natural height and delegates scrolling to the outer panel instead of managing its own scroll area.

In `IssueTable`, add optional prop `scrollParent?: HTMLElement` and pass it to `<Virtuoso customScrollParent={scrollParent}>`.

**Step 3 — Let IssueTable's search bar stick to the left panel top**

With the panel as the scroll parent, `position: sticky; top: 0` on the search bar section will stick relative to the panel scroll container — which is exactly what we want.

**Step 4 — Guard 360 panel**

The 360 panel reuses `IssueTable` via `entityType='image360'`. Because `scrollParent` is optional, the 360 panel keeps its existing behaviour unless we also pass the ref there. Test both explicitly.

---

## Thumbnail size unification

**Current sizes** (both live in `issue-item/issue-item.tsx` lines 225–227, branched by `actualEntityType`):

| Panel | Width | Height | Item height |
|-------|-------|--------|-------------|
| Issues (`entityType !== 'image360'`) | `114px` | `114px` | `auto` |
| 360 rooms (`entityType === 'image360'`) | `128px` | `100%` | `128px` |

Both thumbnails should be reduced to the same smaller size so the two panels feel visually consistent. The exact target size is a design decision, but the current difference (114 vs 128) should be eliminated and both made a bit smaller (e.g. `80px` or `96px` — to be agreed).

**Change:** Remove the `actualEntityType === 'image360'` branch from the thumbnail size logic in `issue-item.tsx` and use a single shared constant for both.

---

## Acceptance criteria

- [ ] The left panel scrolls as a whole — no nested scroll inside the issue list
- [ ] The search bar sticks to the top edge of the left panel when scrolled past
- [ ] Issue list items are fully visible; user doesn't bump into double-scrolling
- [ ] 360 Captures panel (room list) is unaffected — still scrolls correctly
- [ ] Progress panel and other left panel states are unaffected
- [ ] Quality-only projects (no progress tab) behave the same way
- [ ] Issue item thumbnails and 360 room item thumbnails are the same size
- [ ] Both thumbnail sizes are visually smaller than the current 114px / 128px values

---

## Risk

`customScrollParent` changes how Virtuoso measures and renders. With very long lists (2000+ issues) on a panel that is taller than its content, the layout may collapse to zero height if `minHeight` guards are missing. Verify with a project that has 500+ issues.

---

## Files to change

| File | Change |
|------|--------|
| `dashboard-resizer/resizable-layout.tsx` | Change left panel `overflow: hidden` → `overflow-y: auto`, add ref |
| `dashboard-panels/quality-panel.tsx` | Pass `scrollParent` ref down to IssueTable |
| `dashboard-panels/360-panel.tsx` | Optionally pass `scrollParent` ref to IssueTable |
| `quality-panel/components/issue-table/issue-table.tsx` | Add `scrollParent` prop, pass to `<Virtuoso customScrollParent>` |
| `quality-panel/components/issue-item/issue-item.tsx` | Unify thumbnail size — replace `entityType`-branched sizes (114px / 128px) with a single shared constant |
