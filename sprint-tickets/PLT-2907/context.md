# PLT-2907 — [Dashboard] Quality-only mode: model camera zooms out instantly when rotation starts

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2907
- **Type:** Bug · **Priority:** Major
- **Status:** Analysis In Progress (as of 2026-07-17)
- **Domain:** Dashboard → 3D Viewer & Model (VWR) · quality-only project mode
- **Repro project:** HITT - DC5 -xv2 · `progressProject = false` ·
  `/projects/6a048b016948eba33123d734/dashboard`

## Symptom
On the dashboard in **quality-only** mode, the first orbit/rotate drag makes the
camera instantly jump/zoom far out instead of orbiting the model smoothly.
Rotation is effectively unusable. Not reported for full-progress projects.

## Root cause (code-verified 2026-07-17, mechanism confidence ~8/10)

All paths under
`src/main/webapp/app/pages/organisation/ViewerPage/components/dashboard-panels/viewer/`.

1. **Quality-only loads the FULL model.** `use-model-loader.tsx:328-342` — when
   `isProgressProject === false` the loader skips the `element_base_data` wait and
   `getSelectiveLoadingDbIds`, so `selectiveDbIds` stays `[]` and the whole model
   loads (`loadModelIntoViewer`, :231-270, `applyRefPoint:true`/`applyScaling:'m'`
   :244-247). Progress projects instead load only status-linked dbIds. So the
   viewer's world bbox in quality-only is the entire raw model (incl. any
   off-origin / stray geometry the progress path would exclude), and the model is
   ref-point-offset from world origin.
2. **Nothing seeds a camera pivot/target on load.** `configureViewerAppearance`
   (`use-model-loader.tsx:28-52`) sets only `setOptimizeNavigation(true)` + FPS cap —
   no pivot/target/home. `use-model-loaded-events.ts:46-66` — quality-only
   `onModelRootLoaded` (:61-65) only flips `setModelLoading(false)`/`setModelLoaded(true)`;
   `onGeometryLoaded`/`onObjectTreeCreated` do no camera work. There is **no**
   load-time `fitToView` in any dashboard mode.
3. **Pivot is only ever locked on pin selection.** `dashboard-pinpoint-base-service.ts`
   `_lockPivotToMarkups` (:271-294) sets `setPivotPoint`/`setPivotSetFlag(true)`/
   `setUsePivotAlways(true)`/`setZoomTowardsPivot(true)`; `_clearPivotLock` (:300-306)
   sets all three flags `false` and nulls `_lockedPivot`; `_handleCameraChange`
   (:67-84) only re-locks when `_lockedPivot` is set. On the quality tab no pin is
   selected → `_lockedPivot = null` → Forge falls back to its own auto-pivot /
   raycast pivot on the first orbit.
4. **Net:** with no seeded pivot and `setUsePivotAlways`/`setZoomTowardsPivot`
   never enabled, the first orbit lets Forge derive a pivot from the large,
   off-centre world bbox → camera swings on a huge radius → reads as an instant
   zoom-out.

Mode source of truth: `dashboard-project-provider.tsx:173`
(`setIsProgressProject(projectResponse.progressProject !== false)`); propagated via
`useDashboard()` to the loader/effect/events hooks.

Corroborating docs: `dashboard/viewer-and-model.md` (pivot API, `wheelSetsPivot:true`,
selective fragment loading), `dashboard/project-types.md` (quality-only skips
colouring + selective load), `dashboard/quality-tab.md`.

## Fix direction (NOT yet implemented — do not touch shared viewer without confirmation)
Seed a sane orbit pivot after load in the quality-only branch (e.g. set pivot to
the loaded model's bbox centre on `onModelRootLoaded`). **Trade-off / risk:**
forcing `setUsePivotAlways`/`setZoomTowardsPivot` is exactly what the pin path does,
but it can reintroduce the cursor-zoom ("corner drift") behaviour the team
deliberately worked around (see doc comment `dashboard-pinpoint-base-service.ts:260-270`).
So the safe fix is likely a one-shot pivot seed on load rather than permanently
forcing the always-pivot flags. The viewer is shared across ViewerPage / Dashboard /
Canvas — changes must not regress the editor or canvas.

## Decision / status
**PARKED — blocked on user confirmation.** On 2026-07-16 I posted a clarification
comment on the ticket (as Ilia) and moved it to Analysis, asking 3 diagnostic
questions to confirm the far-pivot mechanism before editing the shared viewer:

1. Right after load, before any interaction — model framed/centred, or already
   zoomed-out?
2. When it jumps on orbit — recentre on empty space, or dolly straight back with
   the building still roughly centred?
3. Scroll-zoom first (sets pivot under cursor) then orbit — smooth?

Expected confirming pattern: (1) framed OK, (2) recentres on empty space,
(3) smooth after scroll → confirms far-pivot diagnosis → seed pivot on load.

As of 2026-07-17 **no reply has been posted** (only my comment exists on-thread).
No new human input. → Left in Analysis, **no re-comment** (avoid nagging).

## Next action (for the next run)
- If the user has answered the 3 questions → assess against the expected pattern;
  if it confirms far-pivot, this becomes dev-ready: branch `PLT-2907` off master,
  implement the one-shot pivot seed on load in the quality-only branch of
  `use-model-loaded-events.ts` (or the loader), verify it doesn't force the
  always-pivot drift, and open a draft PR.
- If still no answer → leave parked, do nothing on-thread (don't re-comment).

## Confidence
- Code mechanism (why quality-only orbit swings far): **8/10** — every link
  read in current source.
- That this fully explains the user-visible symptom: **6/10** — environment /
  Forge-runtime dependent; needs the 3-question repro confirmation before
  touching the shared viewer.
</content>
