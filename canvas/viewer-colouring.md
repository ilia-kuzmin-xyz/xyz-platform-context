# Canvas — 3D Viewer Colour Visualisation (VIS)

**Status: DONE, in PR** — `PLT-2883` (hc-frontend, → master) + matching agent-pipeline changes on `feature/infinity-canvas-23-07-2026`. Depends on the pipeline change being deployed; without it the viewer falls back to the raw model rather than erroring.

Colours a canvas dashboard's embedded Forge viewer by element **installation status** (Installed / Late / Planned / …), matching the native `/projects/:id/dashboard` viewer — including selective isolation (only status-bearing geometry loads) and status filtering.

## How it works (end to end)

```
Pipeline (INTERACTIVE viewer intent)
  Phase 0d: resolve_viewer_mapping() → parquet download + element→dbId JOIN
  → to_wire_format(): GROUPED payload  { statusDbIds: {status: [dbId…]}, issueElements: […] }  (~8MB)
  → SSE viewer_mapping + viewer_config  (BEFORE artifact_skeleton)

FE useCanvas
  viewer_mapping / viewer_config SSE → state.viewerMapping / viewerConfig
  (restore: NOT persisted — refetched from GET /api/viewer-mapping/:projectId)
  → ArtifactPanel injects into Sandpack VFS: /viewer-mapping.json, /viewer-config.json

Sandbox (ForgeViewerStatic scaffold → /ForgeViewer.tsx)
  static import of the two JSON files
  → SELECTIVE LOAD: pass status dbIds as loadOptions.ids  (only tracked geometry loads → isolated)
  → setThemingColor(dbId, colour) per status group          (Forge applies as fragments stream)
  → filterStatus prop → viewer.isolate() / showAll() on click
```

## Key mechanism: selective loading, not post-load hiding

This is THE thing to understand. The dashboard shows only status-bearing elements because it **never loads** the untracked ones — it passes the status dbIds as Forge `loadOptions.ids`. It does NOT load everything then hide. The canvas scaffold does the same:

- `if (selectiveDbIds.length > 0) loadOptions.ids = selectiveDbIds` — **no upper cap** (an earlier `< 800000` guard silently disabled it for real ~1M-dbId projects → full model loaded → untracked elements showed raw material = "50% coloured, 50% raw").
- `setThemingColor(dbId, colour)` needs no fragment-matching loop — Forge applies it to each fragment as it streams. Colours appear progressively.
- Isolation/filtering uses high-level `viewer.isolate()` / `showAll()`, which resolve dbIds→fragments internally and defer until geometry is ready.

**Do NOT reintroduce the manual `fragId2dbId` visibility loop for the initial paint.** On a 16M-fragment federated model that map isn't populated while geometry streams — it matched 0 (or a random partial) of 16M and never converged. Multiple retry/stability/`colorEpoch` attempts all failed for this reason.

## Grouped wire format

Full mapping = ~1.4M elements × {dbId, modelElementId (36-char guid), installationStatus, activityId} ≈ **140MB JSON** → crashed the tab (duplicated across React state + Sandpack VFS string + iframe parse). Wire format is grouped:

```json
{ "format": "grouped",
  "statusDbIds": { "Installed": [dbId…], "Late": [dbId…], … },
  "issueElements": [ /* full records, issue-linked only */ ],
  "totalElements": 1404520, "statusElements": 1044589 }
```

~8MB (~94% smaller). `to_wire_format()` in `agents/viewer_mapper.py`. FE consumes `statusDbIds`; keeps the legacy flat `elements` array as a fallback.

## Room isolation

`<ForgeViewer selectedRoomId={roomId} />` shows only that room's elements.
Props are exactly `urn, projectId, height, filterStatus, selectedRoomId` —
nothing else; React drops unknown props silently, so an invented one fails
invisibly.

The data is `roomDbIds` in the mapping (room_id → dbIds), built server-side by
trading the rooms rollup's room→element index for dbIds, so no GUID reaches the
browser. It is **opt-in**: the endpoint only returns it for `?rooms=1`, and both
FE call sites decide by testing the saved TSX for `selectedRoomId`. Forgetting
that flag is silent — isolation just never happens.

Room and status filters **intersect** rather than replace, so picking a room
inside an active filter still shows only that status.

Two behaviours that are not obvious:

- **Ghosting is toggled with the selection.** The status filter runs with
  `setGhosting(false)` and hides non-matching fragments outright. A room holds a
  median of 18 tracked elements, so the same treatment leaves an apparently
  empty canvas — room selection uses `viewer.isolate()` with ghosting on to keep
  the building as context, plus `fitToView` on the selection.
- **A deterministic home camera** is computed from the bounding box after load
  and restored on deselect. `AggregatedView` otherwise returns whatever view the
  document carried, which on a federated model is often edge-on or inside the
  geometry.

Scale to expect: 502 rooms, 93.7% of room-mapped elements resolve to a dbId,
median 18 per room, 218 of 502 with ≤5. The 3D answers *"where in the building
is this room's tracked work"*, not *"here is the room"*.

## Restore (session persistence)

The multi-MB mapping is **deliberately NOT persisted**. `PersistedDashboard` stores only the small `viewerConfig` + `viewerProjectId` (postgres id). On restore the mapping is refetched from `GET /api/viewer-mapping/:projectId` (2h server cache; the endpoint bundles a colour config too, so restore works even for dashboards saved without a config).

Refetch is driven by a **declarative effect** in `useCanvas` (fires whenever a viewer dashboard becomes active — page-reload autoOpen, openSession, viewDashboard, completed generation), with retries for the multi-MB response and a sentinel on failure so the viewer still shows the raw model rather than hanging.

## Two viewer routes (both must be wired)

- `/canvas/:session_id` → `CanvasPage` + `useCanvas` (editable canvas).
- `/canvas/library/:session_id` → `CanvasGalleryPage/DashboardViewerPage` (read-only published view). **Separate component** — does NOT use `useCanvas`. It must fetch the mapping+config itself and pass them to the runner. (This route silently had no viewer data for a while because it was overlooked.)

## Key files

| File | Purpose |
|------|---------|
| `CanvasPage/components/ForgeViewerStatic.ts` | The injected `/ForgeViewer.tsx` scaffold string — SDK load, selective load, theming, filter, loading bar |
| `CanvasPage/components/ArtifactSandpack.tsx` | Injects `/viewer-mapping.json`, `/viewer-config.json`, `/sandbox.config.json` into VFS |
| `CanvasPage/components/ArtifactPanel.tsx` | Mounts the viewer runner once, only when mapping is ready |
| `CanvasPage/CanvasGalleryPage/DashboardViewerPage.tsx` | Library route — fetches mapping+config itself |
| `CanvasPage/useCanvas.ts` | `ensureViewerMapping()` refetch + declarative trigger effect |
| `CanvasPage/canvas.types.ts` | `ViewerMapping` (grouped), `ViewerConfig` |
| pipeline `agents/viewer_mapper.py` | parquet JOIN, `to_wire_format()` |
| pipeline `agents/viewer_config_builder.py` | deterministic colour config (field + palette) |
| pipeline `server.py` | Phase 0d emission + `GET /api/viewer-mapping/{project_id}` |

See [pitfalls.md](pitfalls.md) §Viewer for the traps.
