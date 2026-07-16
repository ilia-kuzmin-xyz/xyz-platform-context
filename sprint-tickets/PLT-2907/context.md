# PLT-2907 — [Dashboard] Quality-only mode: model camera zooms out instantly when rotation starts

**Type:** Bug (Major) · **Status at pickup:** Open · **Domain:** Dashboard → 3D Viewer (VWR)

## Problem
On `/projects/:id/dashboard` in **quality-only** mode (`progressProject = false`),
starting a rotate/orbit drag makes the camera instantly jump/zoom far out instead of
orbiting smoothly. Repro project: HITT - DC5 -xv2 (`6a048b016948eba33123d734`).

## Domain context gathered (from xyz-platform-context/dashboard)
- Viewer is the shared Autodesk Forge `viewer-y.tsx` class component, `isDashboard=true`.
- Dashboard profile "XYZ": `wheelSetsPivot: true`, `optimizeNavigation: true`,
  selection DISABLED, FPS capped 30.
- **Quality-only vs full-progress (project-types.md):**
  - Quality-only skips Pipeline A + B entirely (no parquets, no element status).
  - **3D element colouring skipped entirely** in quality-only.
  - `_visible_elements` table never exists; **selective fragment loading**
    (setFragmentVisibility) is driven by element status → in quality-only there is no
    status set, so the selective-visibility path differs (cf. PLT-2736: model fully
    rendered when no activities linked).
  - Loading bar dismissal differs: quality-only dismisses on `MODEL_ROOT_LOADED`
    directly (no color service `onColorsApplied`).
- Pivot/anchor: `navigation.setPivotSetFlag`, `setUsePivotAlways`,
  `setZoomTowardsPivot` are the programmatic pivot locks.
- Camera state capture (`restoreCameraState`) documented for **ViewerPage only**.

## Working hypothesis (pre-code-confirmation)
On the first orbit interaction Forge recalculates the pivot / auto-fits. In
full-progress mode the color/visibility pipeline constrains the visible bbox and/or a
camera-fit runs after colours apply; in quality-only that path is skipped, so the
pivot/fit resolves against an empty or full-model bounding box → instant zoom-out.
Needs code confirmation (Explore agent running).

## Decision log
- (pending code map)
