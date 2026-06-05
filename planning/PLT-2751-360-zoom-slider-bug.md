# PLT-2751 — 360 Zoom Controls and Slider Don't Work on Pre-Zoomed Images

**Jira:** https://xyzreality.atlassian.net/browse/PLT-2751
**Area:** CAP — 360° Captures slideshow viewer (`dashboard-360-slideshow.tsx`)
**Confidence:** 4/10 — code analysis found no obvious pre-zoom mechanism; the bug needs to be reproduced with real data before the root cause can be confirmed

---

## Problem

In the 360 Captures viewer, some images appear already zoomed in when opened. When this happens, the zoom controls (+ / - buttons) and the 360° navigation slider do not respond correctly, making it difficult to adjust the view.

---

## What code analysis found (and didn't find)

**File:** `shared/capture-360-details/dashboard-360-slideshow.tsx`

The code does NOT set any initial zoom/pitch/yaw on image open:
- `View360` component initialises at library defaults (zoom=1, pitch=0, yaw=0) on every mount
- The component is re-keyed by `capture.url` — so it remounts on each new capture URL
- The `I360Capture` API type has no zoom/pitch/yaw fields — the backend doesn't return initial view state
- `DEFAULT_ZOOM = 1` (line 20); zoom is explicitly reset to 1 on every slide navigation

**This means the pre-zoom must have a different cause.** Known suspects:

| Suspect | How it could cause pre-zoom |
|---------|---------------------------|
| Split-view lock state | When split view is locked, camera state from panel A syncs to panel B. If the lock carries over stale zoom from a previous image, the new image opens zoomed. The re-entrancy guard (`lines 909-910, 952-958`) may not fully protect against this on mount. |
| View360 re-mount race | If `zoom reset` (`setZoomA(1)`) fires before the `View360` component has mounted its camera, the `animateTo({ zoom: 1 })` call targets a null ref and silently fails. The library's own initial render might then apply a different zoom based on image aspect ratio. |
| `@egjs/react-view360` aspect ratio fitting | The library may auto-fit equirectangular images with an effective zoom > 1 depending on viewport dimensions. If the container is narrower than the image's natural ratio, the library may crop/zoom to fill. |
| Image is not equirectangular | If a capture is a regular flat photo (not 360°), but is loaded with `EquirectProjection`, the projection math may produce a zoomed/warped result. |

---

## Investigation plan (human contribution required)

The bug cannot be reliably fixed without reproducing it.

### Step 1 — Reproduce on a known project

- Identify which specific images appear pre-zoomed (ask the reporter which project/room)
- Open that room in the 360 panel, confirm the bug is visible
- Note: is it always the same images, or random? Is it related to image dimensions?

### Step 2 — Check split-view state at the moment of open

Add a temporary log to `dashboard-360-slideshow.tsx` at the start of the `View360` render:
```typescript
console.log('[360 debug] Opening capture, zoom state:', { zoomA, zoomB, splitView, isLocked })
```
If `zoomA` or `zoomB` is not 1 when the image opens, the issue is in zoom reset logic.

### Step 3 — Check the image type

Log `capture.type` for the affected image. If it's not `IMAGE_360`, the `EquirectProjection` is wrong for that image.

### Step 4 — Check container dimensions

Add a log of `thumbnailContainerWidth` and the `View360` container dimensions when the affected image mounts. If the container is very narrow, the library may be applying an implicit zoom.

---

## Likely fixes (to implement once root cause confirmed)

### Fix A — Stale zoom in split-view lock (most likely)

In the slide navigation handlers (lines 1110–1148), ensure zoom reset happens AFTER the `View360` component has mounted, not before:

```typescript
// Instead of: setZoomA(DEFAULT_ZOOM) synchronously
// Use: animate to default zoom after a frame
requestAnimationFrame(() => {
  viewerARef.current?.camera?.animateTo({ zoom: DEFAULT_ZOOM, duration: 0 })
  setZoomA(DEFAULT_ZOOM)
})
```

### Fix B — animateTo on null ref

Add a null guard before every `camera.animateTo()` call:

```typescript
const resetZoom = (viewerRef, setZoom) => {
  setZoom(DEFAULT_ZOOM)
  if (viewerRef.current?.camera) {
    viewerRef.current.camera.animateTo({ zoom: DEFAULT_ZOOM, duration: 0 })
  }
}
```

### Fix C — Wrong projection for flat images

Check `capture.type` before choosing projection:
```typescript
const projection = capture.type === 'IMAGE_360'
  ? new EquirectProjection({ src: capture.url })
  : new CylindricalProjection({ src: capture.url })  // or show as flat image
```

---

## Acceptance criteria

- [ ] All 360° capture images open at zoom = 1.0 (default) unless the user has explicitly changed zoom
- [ ] Zoom controls (+ / - buttons) respond correctly after opening any image
- [ ] The 360° navigation slider responds correctly after opening any image
- [ ] Switching between captures in the same room resets zoom to default
- [ ] Opening a second room after the first does not carry over zoom state
- [ ] Split-view mode behaves correctly — no stale zoom sync on first open

---

## Files likely to change (after root cause confirmed)

| File | Change |
|------|--------|
| `shared/capture-360-details/dashboard-360-slideshow.tsx` | Fix zoom reset timing on slide change, add null guards on camera refs |
| `shared/capture-360-details/capture-360-details-content.tsx` | Possibly pass capture type through to slideshow |
