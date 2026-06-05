# Sketch-to-Dashboard — Design Doc

> **Status: CONCEPT — not yet implemented.**
> Moved from `XYZ_AgentPipeline/docs/sketch-to-dashboard.md`.

## What we're adding

A third entry point for the dashboard composer alongside **fresh** and **edit**:
**sketch**. The user draws rough grey rectangles with text labels on a tldraw canvas, then sends it. The pipeline treats the sketch as a layout reference, skips the clarifier survey, and asks the composer to produce a polished dashboard that respects the sketched grid.

This is a **layout-first** workflow — the user already knows what panels they want and where.

---

## UX flow

| Mode | Trigger | Inputs to composer |
|------|---------|--------------------|
| Fresh | First message in thread | profile + clarifier answers |
| Edit | Prior artifact + edit cue | profile + prior TSX + user message |
| **Sketch** | User clicks "Draft layout" → draws → submits | profile + sketch JSON + user caption |

### The "Draft layout" entry point

- Pencil/grid icon button in the chat panel header
- Click → inline tldraw canvas slides down (restricted to rectangle tool only, grey fill)
- Buttons below: **Cancel** | **Send sketch** + optional caption field

### Wire format (sketch JSON sent to pipeline)

```json
{
  "canvas": { "w": 1200, "h": 800 },
  "shapes": [
    { "x": 0, "y": 0, "w": 1200, "h": 80, "label": "Header — KPIs" },
    { "x": 0, "y": 100, "w": 800, "h": 400, "label": "S-curve actual vs planned" },
    { "x": 820, "y": 100, "w": 380, "h": 400, "label": "Open issues by discipline" }
  ]
}
```

---

## Library choice

**tldraw** — locked to rectangle-only mode. Use `overrides` API to hide all other tools. Force `color: 'grey'`, `fill: 'solid'` on creation. Strip non-rectangle pastes.

---

## Pipeline changes

- `intent_classifier.py`: add `Intent.SKETCH`. Server detects `sketch` field in body → forces `Intent.SKETCH`, skips clarifier.
- `artifact_composer.py`: add `sketch` param → `_render_sketch_block()` injects `## LAYOUT SKETCH` section instructing composer to honour grid, use labels as panel intent, snap to 12-column grid.
- No changes to hydrators, resolver, or profile builder.

## Frontend changes

- `SketchOverlay.tsx` (new) — tldraw mount + lockdown + serialize + submit
- `serializeSketch.ts` (new) — tldraw shapes → wire-format JSON
- `ChatPanel.tsx` — +1 "Draft layout" button
- `useCanvas.ts` — `submitSketch(json, caption)` action
- `canvas.types.ts` — `SketchJson` type

## Files to change

| File | Change |
|------|--------|
| `package.json` | + `tldraw` dependency |
| `SketchOverlay.tsx` | NEW |
| `serializeSketch.ts` | NEW |
| `ChatPanel.tsx` | +1 button |
| `useCanvas.ts` | + `submitSketch` action |
| `canvas.types.ts` | + `SketchJson` |
| `agents/intent_classifier.py` | + `Intent.SKETCH` |
| `agents/artifact_composer.py` | + `sketch` param + render block |
| `server.py` | + sketch detection + routing branch |

**Estimated: ~5–8 hours** (tldraw lockdown + composer prompt + wiring)

## Not building

- Snap-to-grid on client (composer does it)
- Saved sketches / templates
- Multi-shape support (arrows, ellipses)
- Round-trip "edit your sketch" after dashboard built (use EDIT mode instead)
