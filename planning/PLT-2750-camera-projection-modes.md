# PLT-2750 — Preserve Camera State When Switching Projection Modes

**Jira:** https://xyzreality.atlassian.net/browse/PLT-2750
**Area:** VWR — 3D Viewer, ViewerPage camera controls
**Confidence:** 8/10 — root cause is clear, fix is localised; main risk is Forge's async frame timing after projection switch

---

## Problem

Switching between Perspective, Orthographic, and "Perspective with Ortho Faces" in the 3D viewer causes unexpected disruption: model flipping, zoom level changes, or the view jumping to a different position. The projection change should only affect rendering mode, not the user's current view.

---

## Root cause

**File:** `viewer-x/components/viewer-bar/tools/menu-button.tsx` (lines 134–144)

The projection switch handlers call Forge's native navigation methods directly with no camera state preservation:

```typescript
const setPerspectiveView = () => {
  handleClose()
  viewer?.navigation?.toPerspective()   // ← Forge takes over, disrupts camera
}

const setOrthographicView = () => {
  handleClose()
  viewer?.navigation?.toOrthographic()  // ← same problem
}
```

**What Forge does internally:** When `toPerspective()` / `toOrthographic()` is called, Forge recalculates the camera to keep the scene visible in the new projection. This recalculation may:
- Adjust zoom (ortho zoom ↔ perspective FOV are not 1:1)
- Move the camera position
- In some cases flip the up vector

**What already exists but is not used here:**

`viewer-service.ts` has a fully working `restoreCameraState()` (lines 255–287) that:
- Restores position + target via `nav.setView()`
- Restores FOV (perspective) or zoom (orthographic) correctly
- Restores pivot point

It is only called during model reload, not during projection switches.

---

## Proposed solution

**Step 1 — Expose a `switchProjection` method on `ViewerService`**

Add to `viewer-service.ts`:

```typescript
public async switchProjection(type: 'perspective' | 'orthographic') {
  if (!this._viewer) return

  // 1. Capture current state before switch
  const nav = this._viewer.navigation
  const camera = this._viewer.impl.camera
  const savedState = {
    position: nav.getPosition().clone(),
    target: nav.getTarget().clone(),
    pivot: nav.getPivotPoint().clone(),
    up: camera.up.clone(),
    fov: camera.isPerspectiveCamera ? camera.fov : null,
    zoom: camera.isOrthographicCamera ? camera.zoom : null,
  }

  // 2. Switch projection
  if (type === 'perspective') {
    nav.toPerspective()
  } else {
    nav.toOrthographic()
  }

  // 3. Wait one frame for Forge to complete the switch
  await new Promise(resolve => requestAnimationFrame(resolve))

  // 4. Restore position / target / pivot
  camera.up.copy(savedState.up)
  nav.setView(savedState.position.clone(), savedState.target.clone())
  nav.setPivotPoint(savedState.pivot.clone())

  // 5. Restore FOV or zoom (cross-convert if switching modes)
  const newCamera = this._viewer.impl.camera
  if (newCamera.isPerspectiveCamera && savedState.fov !== null) {
    newCamera.fov = savedState.fov
    newCamera.updateProjectionMatrix()
  } else if (newCamera.isOrthographicCamera && savedState.zoom !== null) {
    newCamera.zoom = savedState.zoom
    newCamera.updateProjectionMatrix()
  }

  this._viewer.impl.invalidate(true, true, true)
}
```

**Step 2 — Update `menu-button.tsx` to call the service method**

```typescript
const setPerspectiveView = () => {
  handleClose()
  viewerService?.switchProjection('perspective')
}

const setOrthographicView = () => {
  handleClose()
  viewerService?.switchProjection('orthographic')
}
```

---

## Edge cases to test

| Case | Expected behaviour |
|------|------------------|
| Switch ortho → perspective | Position and target preserved; FOV restores to saved value |
| Switch perspective → ortho | Position and target preserved; zoom adjusts to match view scale |
| Switch while model is loading | Guard: skip if `_viewer.impl.camera` is null |
| Switch during animation | Camera may still move; acceptable — animation completes before restore |
| Switch back to same mode | No-op or invisible (position unchanged) |

---

## Acceptance criteria

- [ ] After switching from Perspective to Orthographic, the model stays in the same position and orientation
- [ ] After switching from Orthographic to Perspective, the model stays in the same position and orientation
- [ ] Zoom level is preserved (proportionally) across the switch
- [ ] Pivot point is unchanged — orbit center stays on the same point
- [ ] No model flipping or up-vector inversion
- [ ] Works on both ViewerPage and Dashboard (Dashboard has `isDashboard=true`; projection controls currently only in ViewerPage menu)

---

## Files to change

| File | Change |
|------|--------|
| `viewer-x/components/services/viewer-service.ts` | Add `switchProjection(type)` method |
| `viewer-x/components/viewer-bar/tools/menu-button.tsx` | Replace direct `toPerspective()`/`toOrthographic()` calls with `viewerService.switchProjection()` |
