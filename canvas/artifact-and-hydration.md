# ART — Artifact & Hydration

## Artifact state machine

```
idle → pending → streaming (artifact_token events) → ready (artifact_skeleton received)
     → hydrated (artifact_data_complete received)
     → error
```

`ArtifactState.data` is a `ProjectData` object passed as `props.data` into the Sandpack component. The TSX only reads `props.data.<domain>` — it never fetches. Data is always injected from outside.

## Sandpack mount gate

**Mount Sandpack exactly once, with final hydrated data.**

Every `props.data` change triggers the in-browser bundler to re-bundle. Mounting with partial/stub data causes repeated heavy re-bundles (100 s+ for a session with 16 dashboards).

Gate: `ArtifactPanel` shows "Loading dashboard data…" placeholder while `hydrating && status !== 'hydrated'`. Mounts once when the active dashboard's hydration completes. `completeHydration` then freezes the artifact (later `artifact_data_partial` events for other dashboards are ignored).

## Dashboard switcher — chat is the UI

No tab bar. The chat IS the dashboard switcher:
- Each assistant dashboard turn shows summary text + a "View dashboard" button
- Clicking switches `activeDashboardId` and renders that turn's dashboard in ArtifactPanel
- All past dashboards reachable by scrolling chat

`CanvasState.activeDashboardId` — which dashboard is currently shown.
`CanvasState.hydratingDashboardIds` — Set driving loading spinners on "View dashboard" buttons and the "Refreshing data…" badge on ArtifactPanel.

## Hydration sources

| Source | Trigger | SSE events fired |
|--------|---------|-----------------|
| Live turn | User sends a message | `data_profile`, `artifact_data_partial` × N, `artifact_data_complete` |
| Session restore | `openSession()` → `rehydrateSession()` | Same events via `mode:'hydrate'` request |
| Manual view | Click "View dashboard" → `viewDashboard(id)` | Same events via `mode:'hydrate'` request |

All three paths share the same SSE handlers in `useCanvas.ts`. `runHydrate(domains, threadId, handlers)` is the single entry point for the last two cases.

## Profile stubs — the separation rule

Phase 0b profile (`data_profile` SSE event) contains keys for every domain — lightweight stubs (counts, sample rows, no full arrays). These are NOT hydrated data.

`runHydrate` keeps two separate buckets:
- `profile` — stubs from `data_profile`
- `hydrated` — full payloads from `artifact_data_partial`

`completeHydration` judges domain satisfaction against `Object.keys(hydrated)` ONLY. Profile keys are merged underneath for display (so widgets show counts immediately) but are never counted as "satisfied." Violating this causes the dashboard to mount with empty tables and maps.

## Key files

| File | Role |
|------|------|
| `useCanvas.ts` | `runHydrate`, `rehydrateSession`, `completeHydration`, `viewDashboard`, all SSE handlers |
| `ArtifactPanel.tsx` | Sandpack wrapper; `hydrating` prop controls the mount gate |
| `canvas.types.ts` | `ArtifactState`, `DashboardEntry`, `CanvasState.hydratingDashboardIds` |
