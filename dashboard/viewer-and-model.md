# VWR — 3D Viewer and Model

The Autodesk Forge (AggregatedView) viewer is shared across three page contexts. Each context uses the same `viewer-y.tsx` class component with different flags and configurations applied on top.

## Viewer contexts

| Context | Page | `isDashboard` | Selection | FPS cap | BoxSelection |
|---------|------|--------------|-----------|---------|-------------|
| **ViewerPage** | `/projects/:id/viewer` | `false` | LEAF_OBJECT | none | ✅ geometric |
| **Dashboard** | `/projects/:id/dashboard` | `true` | DISABLED | 30 fps | ❌ |
| **Canvas** | `/canvas/:id` | — | varies | none | ❌ |

**Dashboard-specific restrictions applied by `configureViewerAppearance()` and ViewerService:**
- Selection disabled entirely (`SelectionType.DISABLED`)
- FPS capped at 30 during navigation (halves GPU load vs ViewerPage — DuckDB WASM shares the same heap)
- Lines and points hidden (cleaner overview, no edge noise)
- Context menu disabled
- SAO / antialiasing / ground shadow / reflection / ambient shadows all off

**ViewerPage extras:**
- `Autodesk.BoxSelection` extension loaded with geometric intersection mode — allows drag-to-select multiple elements with Shift+Ctrl
- Selection mode: `LEAF_OBJECT` (deepest child selected, not parent assembly)
- Full FPS budget

**Canvas extras:**
- `wheelSetsPivot: false` (orbit pivot is NOT updated on scroll — opposite of ViewerPage/Dashboard)
- Otherwise same coordinate settings (`applyRefPoint: true`, `applyScaling: 'm'`)

---

## Shared profile (ViewerPage + Dashboard)

Both ViewerPage and Dashboard use a named profile `"XYZ"` applied via `viewer.setProfile()`:

```
ghosting: false             — no faded-out un-selected geometry
ambientShadows: false       — performance
antialiasing: false         — performance (Dashboard re-applies this)
groundShadow: false
groundReflection: false
firstPersonToolPopup: false — no walk-mode tooltip
lineRendering: false
envMapBackground: false
progressiveRendering: true
edgeRendering: true         — sharp element outlines
reverseMouseZoomDir: true
optimizeNavigation: true
wheelSetsPivot: true        — scroll wheel repositions the orbit pivot (Canvas uses false)
backgroundColorPreset: '[26,26,26,26,26,26]'  — dark grey background
extensions.load: ['Autodesk.ViewCubeUi']
```

---

## Pivot and anchoring

### wheelSetsPivot (scroll-to-reanchor)
When `wheelSetsPivot: true` (ViewerPage + Dashboard), each scroll-wheel zoom gesture updates the orbit pivot to the point under the cursor. The model orbits around that point, giving precise control over rotation center.

Canvas uses `wheelSetsPivot: false` — the pivot stays fixed and the camera simply dollies.

### applyRefPoint (shared coordinate origin)
Both ViewerPage, Dashboard, and Canvas set `applyRefPoint: true` in `getCustomLoadOptions`. This tells Forge to apply the Revit/Navisworks shared coordinate origin as the world origin, so models from different disciplines (structural, MEP, architecture) align to the same coordinate system when loaded together.

Without `applyRefPoint`, each sub-model would appear at its local origin, displaced by potentially hundreds of meters from the others.

The transform is stored on the model as `data.loadOptions.refPointTransform` (a `THREE.Matrix4`). The section tool reads this transform to orient cutting planes in world coordinates.

### applyScaling
`applyScaling: 'm'` tells Forge the model units are metres. Forge's internal unit is feet by default; without this, all coordinates are off by a factor of ~3.28.

### Navigation API (programmatic pivot control)
Three navigation methods from `forge-viewer-augmentations.d.ts` let code override pivot behavior:

| Method | Effect |
|--------|--------|
| `navigation.setPivotSetFlag(true)` | Locks the pivot — Forge won't auto-recalculate it on the next interaction |
| `navigation.setUsePivotAlways(true)` | All orbit and zoom operations use the locked pivot point |
| `navigation.setZoomTowardsPivot(true)` | Dolly zoom moves toward the pivot rather than the cursor |

These are used when the app needs to programmatically lock a camera orbit around a specific element (e.g. focusing on a selected room).

---

## Model resolution (Dashboard only)

The dashboard auto-detects which model to load — there's no manual picker:

1. Call Folder API → list project folders
2. Find folder whose name contains `"federated"` (case-insensitive)
3. Take the first model inside that folder
4. Fetch model detail → extract `accUrn` from `versions[0]`
5. Load with `skipPropertyDb: true` (saves ~100 MB property database download)

If any step fails, the viewer stays blank — no fallback, no hardcoded URNs. Deliberate: silent wrong-model loading is worse than a visible failure.

---

## The three-ID mapping chain (Dashboard)

DuckDB knows elements by PostgreSQL UUID (`modelElementId`); Forge knows them by integer `dbId`. Bridging requires three steps:

```
PostgreSQL UUID (modelElementId)
    ↕  project_element_list parquet
External ID (sourceFileElementId) — Revit GUID or Navisworks element ID
    ↕  svf2-object-id-map parquet  OR  viewer.getExternalIdMapping()
Forge dbId (integer)
```

Built as a DuckDB VIEW `element_base_data`. Two mapping modes controlled by `USE_VIEWERPAGE_ID_MAPPING`:

| Mode | Source | Default |
|------|--------|---------|
| **Parquet** | `svf2-object-id-map.parquet` loaded into DuckDB | ✅ yes |
| **Runtime** | `viewer.getExternalIdMapping()` / `getBulkProperties2()` | flag off |

Parquet mode is faster (no model property DB needed). Runtime mode has a higher match rate but requires the full property DB.

---

## Element colouring (Dashboard)

```
element_status (parquet)  →  modelElementId + installationStatus
  JOIN project_element_list  →  sourceFileElementId
  JOIN svf2_object_id_map    →  Forge dbId
  SQL CASE                   →  display status
  status → hex colour        →  viewer.model.setThemingColor(dbId, colour)
  viewer.impl.invalidate(true)  →  batch-apply all
```

All elements start as Not Planned (grey). Colours override via theming. The color service skips the full re-colouring pass if the filter change is not color-relevant (avoids a 14M-fragment visibility scan on every selection click).

| Status | Hex |
|--------|-----|
| Installed | `#00ea6c` |
| Installed Early | `#00ae49` |
| Not Installed / Late | `#fd3d39` |
| Late Start | `#e08613` |
| Planned | `#ffde14` |
| Not Planned | `#808080` |

---

## Camera state (ViewerPage)

On geometry load, ViewerService captures: `position`, `target`, `pivot`, camera `up`, ortho/perspective mode, and FOV/zoom. `restoreCameraState()` replays these, preserving the view across model reloads and panel resizes.

---

## Selective fragment loading (Dashboard)

The viewer doesn't load all geometry fragments upfront:

1. Query `element_base_data` for all dbIds that have a status
2. Build a visibility set
3. Apply `setFragmentVisibility()` for only those dbIds

Cuts rendered fragment count dramatically (e.g. 14M → 2M) — reduces load time and GPU memory pressure, which matters because DuckDB WASM runs in the same tab.

---

## Element tooltips (Dashboard)

`skipPropertyDb: true` means Forge has no element names. Instead:
- First hover → DuckDB runs `read_parquet()` directly against the remote `client-element-metas` blob URL with HTTP range request predicate pushdown — only the matching row group (~1-2 KB) is downloaded
- Result cached in-memory (`Map<modelElementId, name>`)
- Background warm-up pre-fetches the parquet footer so the first hover is fast
