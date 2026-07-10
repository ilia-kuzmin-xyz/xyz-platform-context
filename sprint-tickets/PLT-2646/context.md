# PLT-2646 — Edit % Complete: several UI issues (Schedule / Gantt)

**Type:** Bug · **Status at pickup:** Open · **Domain:** Dashboard Schedule / DHTMLX Gantt
⚠️ "risks are real" — schedule domain. Fixes below are targeted + self-contained.

## Subsystem map (`.../ViewerPage/components/gantt-x/scheduler/`)
- "Actual % Complete" column: `scheduler-columns/scheduler-columns.tsx:140-163`. Cell emits
  `.actual-progress-linked` (linked elements → NON-editable, tooltip target) or
  `.actual-progress-editable` (click-to-edit).
- Tooltip: custom React `gantt-tooltip.tsx` using shared MUI `components/common/tooltip/tooltip.tsx`.
  Mounted `scheduler.tsx:69`.
- Inline editor: `scheduler-editor/scheduler-editor.tsx` (mount `scheduler.tsx:72`), lifecycle in
  `hooks/use-scheduler-inline-editor.tsx`. Input = shared `common/editable-field/editable-table-cell.tsx`.
- Tooltip & editor are siblings with NO shared state → root of sub-issues 3 & 4.

## Four fixes
1. **Font** — `common/editable-field/editable-table-cell.tsx:78-83` hardcodes
   `fontFamily: 'Roboto Mono, monospace'`; grid text is Roboto sans (`gantt-x.styled.tsx:497-505,648`).
   → change editor input font to match grid (Roboto/inherit). Only consumer is % Complete number-editor,
   so scope is contained.
2. **Full stop** — `gantt-tooltip.tsx:18` literal `'Values are driven via linked elements'` → add `.`.
   (only occurrence, not i18n.)
3. **Hide tooltip when editing** — tooltip has no editor awareness. Self-contained fix: clear the
   tooltip state on gantt click (which is what opens the editor) inside `gantt-tooltip.tsx`.
4. **Scroll while tooltip shown** — `gantt-tooltip.tsx:81` overlay Box is `position:fixed` z2000 with
   `pointerEvents:'auto'` → capturing wheel events. Change to `'none'` (tooltip is driven by gantt
   onMouseMove, not by hovering the Box). Also consider clearing tooltip on `onGanttScroll`.

## Reuse
Shared tooltip already used — no new component. Fixes are overlay/state wiring + one string + one font.

## Confidence: 8/10. #1,#2,#4 clearly correct & low-risk; #3 self-contained via click-clear.
Manual verify in-env recommended (Gantt interaction) since no local runtime.
