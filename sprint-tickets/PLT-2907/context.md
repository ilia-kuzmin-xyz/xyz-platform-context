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

## Confirmed root cause (code-verified)
Key files:
- `dashboard-panels/viewer/use-model-loader.tsx:332-342` — quality-only branch loads the
  **FULL** model (no `selectiveDbIds`); progress mode loads only `element_base_data` dbIds.
- `hooks/use-services-initialization.ts:66-86` — colour service NOT initialised in
  quality-only → `_applyFragmentVisibility` / isolate never runs → visible bbox = whole raw model.
- `hooks/use-model-loaded-events.ts:46-66` — quality-only `onModelRootLoaded` only dismisses the
  loader; nothing seeds a camera target/pivot.
- `services/dashboard-pinpoint-base-service.ts:271-306` — pivot lock only active when a pin is
  selected; default quality-tab state is `_clearPivotLock()` → `setPivotSetFlag(false)`,
  `setUsePivotAlways(false)` (Forge auto-pivot).
- `viewer-service.ts:1111-1113, 831-834, 985-988` — every `fitToView` disabled for `isDashboard`.
- `viewer-y.tsx:232` — profile `wheelSetsPivot: true`.

**Mechanism:** quality-only = full model + no isolate + no pivot seed. On first orbit Forge
derives its pivot from the large/off-centre world bbox (incl. stray/off-origin geometry the
progress selective-load would exclude) → camera swings on a huge radius → reads as instant
zoom-out. Progress mode avoids it because the selective load + colour-pipeline isolate give a
tight, centred bbox.

## Decision log
- 2026-07-16: Root cause confirmed at architecture level (high confidence). BUT exact Forge
  orbit mechanism + fix trade-offs (forcing `setUsePivotAlways`/`setZoomTowardsPivot` risks the
  cursor-drift the team worked around; a fit/reframe risks regressing the currently-fine initial
  view for ALL quality-only projects) are **not verifiable headless** — needs live orbit on
  HITT - DC5 -xv2. Per "don't rush, risks are real": moved ticket to **Analysis In Progress**
  and posted 3 concrete repro questions (comment 107518) that disambiguate the mechanism.
  No code / PR this run.

## Candidate fix (once mechanism confirmed)
Seed a sane orbit pivot in the quality-only post-load path (`use-model-loaded-events.ts`
`onObjectTreeCreated` / after GEOMETRY_LOADED). Lowest-risk option: `nav.setPivotPoint(nav.getTarget())`
so orbit rotates about the framed view without moving the camera. Confirm it "sticks" against
Forge's orbit hit-test, and whether `setPivotSetFlag(true)` is needed without reintroducing
zoom drift. Add a `dashboard/pitfalls.md` note once resolved.
