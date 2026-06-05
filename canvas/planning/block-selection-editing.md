# Block Selection & Annotation — Technical Design

> **Status: CONCEPT — not yet implemented.**
> Moved from `XYZ_AgentPipeline/docs/block-selection-editing.md`.

## Problem

Editing dashboards requires writing free-text prompts like *"remove the progress chart and replace it with a table."* Claude must infer which panel from the entire prior TSX.

The desired UX: user clicks/selects a panel directly on the rendered dashboard, optionally adds a comment, and submits. Claude receives both the prompt AND the selected panel context — surgical precision.

---

## Recommended Approach — Transparent Selection Overlay (Option A)

Render a **transparent overlay on top of the Sandpack iframe** that knows panel positions.

```
┌─ ArtifactPanel ─────────────────────────────┐
│  ┌──── Sandpack iframe ──────────────────┐  │
│  │  (renders dashboard)                  │  │
│  └───────────────────────────────────────┘  │
│  ┌──── SelectionOverlay (z-index above) ─┐  │
│  │  • click zones mapped from panels     │  │
│  │  • highlight ring on selected         │  │
│  │  • comment popover on selection       │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Step 1 — Composer emits `data-panel` attributes

Add one rule to the artifact composer system prompt:
> Every top-level panel must have `data-panel="<short-kebab-name>"` on its outermost container.

Generated TSX:
```tsx
<Box data-panel="progress-chart" sx={{ gridArea: '2 / 1 / 3 / 3' }}>
  ...
</Box>
```

### Step 2 — SelectionOverlay reads panel positions

On mount and iframe load: `iframe.contentDocument.querySelectorAll('[data-panel]')` → build clickable zones. Sandpack is same-origin so `contentDocument` access works.

On click → set `selectedPanel`, show floating comment input anchored to the panel.

### Step 3 — Send with panel context

```typescript
panelContext: { panelId: 'progress-chart', panelLabel: 'Progress Chart', comment?: string }
```

### Step 4 — Backend enriches EDIT prompt

When `panel_context` present in body → force `Intent.EDIT`. Append to composer user prompt:
```
## SELECTED PANEL
The user selected `data-panel="progress-chart"`. Their instruction applies only to THIS panel.
```

---

## Implementation order

| # | Task | Effort |
|---|------|--------|
| 1 | Add `data-panel` rule to composer system prompt | 10 min |
| 2 | Parse `panel_context` in `server.py`, force EDIT | 15 min |
| 3 | Add `## SELECTED PANEL` block to `artifact_composer.py` | 15 min |
| 4 | `SelectionOverlay.tsx` — reads `data-panel` from iframe | 2–3 h |
| 5 | Comment popover anchored to selected panel | 1 h |
| 6 | Wire `panelContext` through ChatPanel → useCanvas → POST body | 30 min |
| 7 | Toggle button in chat input row | 15 min |
| 8 | Tests | 1 h |

**Total: ~5–6 hours**

## Edge cases

- Existing dashboards without `data-panel`: overlay shows "no panels detected"; free-text editing still works.
- Panel position drift on scroll/resize: re-query positions via `ResizeObserver` + scroll listener on iframe.
- V2 extension: multi-select (shift+click) → `panelContexts: [...]` array.
