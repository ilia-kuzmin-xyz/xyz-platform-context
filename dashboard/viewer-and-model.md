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

### SectionToolOrientation — a five-incident feature (2026-08-31 addition)

`section-tool-orientation.ts` derives the section box's rotation angle (`_theta`) once via
`patchIfNeeded()` and memoizes it for the life of the service (`:57-63`, `:114`); nothing resets it on
model load/unload — the only lifecycle hook (`viewer-service.ts:597-598`, `:883-884`) fires at zero
models and never reaches this service. Both the dead-band gate and the footprint calculation also read
only `getVisibleModels()[0]` (`:90-93`, `:104`), while `calculateFittedBoundingBox()` unions *all*
loaded models' fragments but rotates the union by that one stale, first-model angle (`:76-77`, `:84`).
Net effect: whichever model was visible first when the angle was computed wins for the rest of the
session: loading more models afterward gives a box that clips the right volume at the wrong angle.

### 2026-09-01 — the causal chain, and one design fact that keeps getting lost

The five incidents are not independent sightings; each fix caused the next report:

`PLT-2651 ATL08 → fix in 26.2.3 (05-26) → regressed ATL5/6/7 → PLT-2756 (06-02, Critical) → rewrite
PR #1933 → PLT-2906 FAR01 → PR #2069 tunes the dead-band, ships 26.3.4 (08-17) → PLT-2651 reopens (08-28)`

**On ATL08 a tilted section box is the INTENDED output.** ATL08 is a diagonal building and PR #1933's
acceptance criteria (Rishi, PLT-2756 comment 104360, 06-05) were explicitly: ATL07 axis-aligned,
**ATL08 "orients to the building's diagonal footprint as a tight oriented box"**. Any change that
makes ATL08's box axis-aligned re-breaks #1933. Check this before treating "the box is tilted" as the
defect — the defect is the box being tilted to the *wrong* thing.

PR #2069 explicitly deferred two hazards that are now the live symptom on PLT-2651: the footprint
comes from `getVisibleModels()[0]` only, and the compound-footprint min-area-rect estimate is
unreliable on multi-building sites. **Neither shipped fix touched them**, which is why the feature
keeps reopening on new projects.

This is the fourth fix/incident on the same feature, PLT-2651 being both the original (PR #1871,
2026-05-08) and now its own fifth occurrence: PR #1933/PLT-2756 rewrote it, PR #2069/PLT-2906 narrowed
the dead-band 5°→0.5°, and PLT-2771 (same project as the reopened PLT-2651, no fix ever shipped) sits
in between. Full incident detail and the live hypothesis:
`incidents/live-incident-board-tickets/PLT-2651-groupA-viewer-and-model/context.md`.

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

| Status | Code | Hex |
|--------|------|-----|
| Installed Early | 1 | `#00ae49` |
| Installed | 2 | `#00ea6c` |
| Planned | 0 | `#ffde14` |
| Late Start | 3 | `#e08613` |
| Late | 4 | `#fd3d39` |
| Not Planned | NULL | `#808080` |

### Status SQL — `buildInstallationStatusCaseSql`

All status queries (viewer colouring, tooltip label, progress distribution) share one SQL builder: `dashboard-progress/utils/installation-status-sql.ts → buildInstallationStatusCaseSql(refDateExpr, columns)`. It produces a DuckDB CASE expression evaluated "as of" `refDateExpr`:

```sql
CASE
  -- Installed Early: installed before the linked activity was due to start.
  WHEN installationStatus = 'INSTALLED_ACCURATELY'
       AND checkDate <= refDate
       AND startDate IS NOT NULL
       AND checkDate < startDate THEN 1

  -- Installed: installed as of refDate. checkDate IS NULL handled for legacy rows.
  WHEN installationStatus = 'INSTALLED_ACCURATELY'
       AND (checkDate IS NULL OR checkDate <= refDate) THEN 2

  -- Late: not installed and activity end date has passed.
  WHEN endDate < refDate THEN 4

  -- Late Start: not installed and activity has started.
  WHEN startDate < refDate THEN 3

  -- Planned: not installed but linked to a future activity.
  WHEN startDate IS NOT NULL OR endDate IS NOT NULL THEN 0

  -- Not Planned: no schedule link — excluded from colouring.
  ELSE NULL
END
```

**Key invariant — do not add `checkDate IS NULL` guards to the Late/Late Start/Planned branches.** The backend stamps `checkDate` on every status write, including a clear to `NOT_SET`, and never nulls it. So a not-installed element is always identified by `installationStatus`, never by an absent `checkDate`. Adding such a guard causes cleared-status elements (stale non-null `checkDate`, `installationStatus = NOT_SET`) to fall to `ELSE NULL` and turn grey instead of Late/Planned. This was the PLT-2741 regression.

**`refDateExpr`** is always `MIN(sliderEndDate, TODAY)` — the refDate cap. This prevents a future slider position from marking elements as Late relative to a future date. The cap is only for status classification; element _visibility_ (displayDate) uses the raw slider end date.

### `checkDate` semantics

`checkDate` (`installationCheckDate` in the DB) is the backend's last-modified audit timestamp for element status, not an "is installed" flag:

- Stamped on every status write, including a clear to `NOT_SET`.
- Never set to NULL by the backend after it has been set once.
- Used in the SQL only within the `INSTALLED_ACCURATELY` branches (Installed Early / Installed) to judge when the element was physically installed relative to the activity schedule.
- Legacy rows (status set before the field existed) may have `checkDate IS NULL`; branch 2 above handles this with `OR checkDate IS NULL`.

### `displayDate` — when elements become visible

Each element has a computed `displayDate` controlling when it first appears as the slider advances:

```
displayDate =
  INSTALLED_ACCURATELY AND checkDate IS NOT NULL → LEAST(checkDate, startDate)
  otherwise                                      → startDate
```

An element is included in the query **only when `displayDate <= sliderEndDate`** (using the raw end date, not refDate). This produces the gradual reveal: planned elements appear yellow at their `startDate`; early-installed elements appear as soon as their `checkDate` is reached. Elements with no schedule (both dates NULL) are excluded by the status CASE returning NULL and are never coloured.

---

## Objects vs elements: the two pages count different things

`objectId` (Forge dbId) is a geometry object. `modelElementId` is an element. **One element can
own many objects**, either because a Navisworks model has ungrouped geometry, or because the same
element appears in several sub-models of a federation. On FAR01, 737,093 objects to 668,978
elements, 9.24% more.

| surface | counts | source |
|---|---|---|
| Dashboard, Elements box | distinct `modelElementId` from `_visible_elements` (was objects until PLT-2874) | `svf2-object-id-map` |
| Dashboard, `Selected` | dbIds, still (`dashboard-statistics-service.ts:128`) | viewer selection |
| Editor, Model details "Linked" | distinct `modelElementId`, one model, active schedule | `project-element-list` + element metadata |
| Editor, schedule Elements column | sum of per-activity counts, **no dedup**, so an element repeats per link (`schedule-entity.ts:786-810`) | activity links |

The colour pipeline must keep working in objects, since every object has to be painted. Only the
reported figure is element-based.

**The editor cannot see extra objects at all.** It builds `sourceFileElementId → dbId` as a Map
(`model-mapping-service.ts:226`), so it holds one dbId per element by construction. That is why it
never had the inflation, and also why the surplus Navisworks dbIds are unreachable there for
selection and isolation.

Even with the same model and the same unit the two pages will not match exactly: they read
different artefacts. On FAR01 after PLT-2874, dashboard 609,643 against editor 606,524, 0.5%
apart, of which 1,364 is `svf2-object-id-map` disagreeing with `project-element-list` for the same
model version.

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
