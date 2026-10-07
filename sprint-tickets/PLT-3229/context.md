# PLT-3229 — 3D view has no visible guidance on how to rotate, pan or zoom

Task, Medium, label `model`. Raised by Jason Fingland 2026-10-05, from ABL's
comments tracker (item 19, Avinash, 1 Oct 2026). Domain: ViewerPage
(`pages/organisation/ViewerPage/`), specifically `viewer-bar/` and `viewer-x/`.

## 2026-10-07 — domain mapped, moved to Analysis pending the design

### What the viewer actually does today

**Navigation is Autodesk Forge/APS defaults — the app binds none of it.**
A sweep of `viewer-x/` for `setNavigationTool` / `orbit` / `pan` / `dolly` /
`CameraControl` returns nothing; the only `navigation` references in
`viewer-service.ts` (`:221-313`) read camera position/target/pivot for
save-restore, they do not configure tools. So the legend's content is the Forge
default set — left-drag orbit, Shift+drag (or middle-drag) pan, scroll/right-drag
zoom — which matches the ticket's own "panning requires Shift + drag".

Consequence: this ticket is **pure UI**. There is no navigation behaviour to
change, only guidance to add. That is good news for sizing.

### Tooltips — the one unambiguous AC

`viewer-bar/tools/` holds 13 button components. **Only 2 have a `Tooltip`**
(`canvas-library-button.tsx`, `project-status.tsx`). The other 11 have none:

```
about-modal, assets-button, capture-360-button, coordinate-button,
dashboard-mode-toggle, issues-button, layer-button, media-button,
menu-button, section-tool-button, systems-button, uploads-button,
urn-list-button
```

### Hotkeys available to show in those tooltips

The registry is `components/hotkey-service/hotkey-service.ts` (wraps
`hotkeys-js`), consumed via `useHotkeyAction` / `hotkey-provider`. Registered
today — a short list, which bounds AC 2 ("tooltips that show the shortcuts"):

| Key | Action | Where |
|---|---|---|
| `Ctrl+K` | open Project Settings | `viewer-bar/tools/menu-button.tsx:75` |
| `ctrl+z` / `ctrl+shift+z` | undo / redo | `viewer-bar/viewer-bar.tsx:37-38` |
| `shift+s` | schedule | `gantt-x/bar/bar.tsx` |
| `esc` | cancel | `model-details-panel/ModelDetailsForm.tsx` |

Most toolbar buttons have **no** shortcut at all, so for those AC 2 degrades to
"a tooltip with the button's name" — worth confirming that is acceptable rather
than inventing shortcuts.

### Why this was not started

Three blockers, all design-side, none resolvable by reading code:

1. **The designs exist but are not linked.** The ticket's own notes say "There
   are designs for this where we have a toolbar within the 3D view. This would
   also then house the section box tool." No Figma URL on the ticket, and the
   Figma MCP `search_design_system` requires a `fileKey` — there is no
   search-by-name tool, so the file cannot be found from here. Building a
   standalone "?" affordance now risks being discarded when that toolbar lands,
   and the toolbar would relocate `section-tool-button` too.
2. **AC 3 names two mutually exclusive designs** — a "?" control opening a
   navigation legend, *or* a dismissible first-use hint — joined by "e.g.", so
   neither is chosen. They differ in placement, dismissal state and first-run
   behaviour.
3. **AC 4** ("covers mouse, trackpad and touch where they differ") would mean
   documenting touch gestures that cannot be verified in this environment.

**AC 6** (knowledge-base entry) is not a code change and needs an owner.

### Asked on the ticket (comment `114151`, 10-07)

For the Figma link, and whether this ships standalone or rides with the
in-viewer toolbar; plus which of the two affordances if standalone.

### If it unblocks — the shape to build

- Dismissal state is per-user and must not reappear: `localStorage` is the
  existing pattern for per-browser UI preferences, but note it is **per browser,
  not per account** (same caveat recorded for planner drafts in
  `PLT-3152/context.md`). If "does not reappear once dismissed" must hold across
  devices, that needs a server-side flag and therefore a BE ask — check this
  before building.
- The guidance is viewer-wide, not commissioning-specific ("affects every
  module"), so it belongs in `viewer-bar/` or a viewer-level overlay, **not**
  behind the `Commissioning` flag.
