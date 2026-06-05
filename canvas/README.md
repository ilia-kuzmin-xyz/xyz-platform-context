# Canvas — Infinite Canvas AI Dashboard Page

AI chat interface at `/canvas` and `/canvas/:mongoProjectId`. Users ask natural-language questions; the backend streams a React/TSX dashboard populated with live project data. Dev-only, gated behind `isDevEnv`.

## Subdomain index

| Code | Sub-domain | File |
|------|------------|------|
| CHT | Chat & Sessions | [chat-and-sessions.md](chat-and-sessions.md) |
| ART | Artifact & Hydration | [artifact-and-hydration.md](artifact-and-hydration.md) |
| ASK | Ask Mode | [ask-mode.md](ask-mode.md) |
| PDC | Project Data Cache (frontend) | [project-data-cache.md](project-data-cache.md) |
| — | Pitfalls | [pitfalls.md](pitfalls.md) |

## Architecture at a glance

```
User message
  → useCanvas.sendMessage()
  → POST /api/chat  (SSE stream)
      session_created → data_profile → artifact_token × N → artifact_skeleton
      artifact_data_partial × N → artifact_data_complete → done
  → Sandpack mounts TSX with props.data
  → idle debounced autosave → POST /api/v2/projects/{id}/files
```

## Key files

| File | Purpose |
|------|---------|
| `app/pages/CanvasPage/CanvasPage.tsx` | Page root: project-resolver gate, SessionsPanel, layout |
| `app/pages/CanvasPage/useCanvas.ts` | All state + logic (~1400 lines) |
| `app/pages/CanvasPage/canvas.types.ts` | `CanvasState`, `ChatMessage`, `DashboardEntry`, `AskResultEntry` |
| `app/pages/CanvasPage/useCanvasProject.ts` | Resolves `mongoProjectId` → postgres UUID + project name |
| `app/pages/CanvasPage/components/ChatPanel.tsx` | Chat thread, "View dashboard" buttons, ask inline results |
| `app/pages/CanvasPage/components/ArtifactPanel.tsx` | Sandpack wrapper with hydration mount gate |
| `app/pages/CanvasPage/components/SessionsPanel.tsx` | Session list overlay (project-scoped, shown on empty canvas) |
| `app/services/canvasSessionService/canvas-session-api-service.ts` | Files API: list / load / save sessions |
| `app/services/canvasSessionService/canvas-hydration-api-service.ts` | Files API: per-domain hydration persistence (`canvas-hydration-*`) |
| `app/services/canvasSessionService/canvas-session.types.ts` | `SessionFile`, `PersistedDashboard`, `PersistedAskResult`, `HydrationFileRecord` |
| `app/pages/CanvasPage/components/HydrationInspector.tsx` | Ctrl+Shift+H read-only hydration provenance overlay |

## Routes

| Route | Behaviour |
|-------|-----------|
| `/canvas` | Empty state — shows SessionsPanel if project has sessions |
| `/canvas/:mongoProjectId` | Project locked; resolves mongoId → postgres UUID on mount |

Defined in `src/main/webapp/app/routes.tsx` lines 251–270.

## Planning docs

| File | Status |
|------|--------|
| [session-persistence-DONE.md](planning/session-persistence-DONE.md) | ✅ IMPLEMENTED |
| [canvas-routing-DONE.md](planning/canvas-routing-DONE.md) | ✅ IMPLEMENTED |
| [hydration-persistence-e2e.md](planning/hydration-persistence-e2e.md) | ✅ IMPLEMENTED (v1) — e2e scenario + code touchpoints |
| [hydration-data-persistence.md](planning/hydration-data-persistence.md) | 🔵 reference — full analysis + deferred v2 ideas |
| [flat-dashboard-list-ux.md](planning/flat-dashboard-list-ux.md) | 🔵 CONCEPT — needs review |
| [sketch-to-dashboard.md](planning/sketch-to-dashboard.md) | 🔵 CONCEPT |
| [block-selection-editing.md](planning/block-selection-editing.md) | 🔵 CONCEPT |

## See also

- [Agent Pipeline domain](../agent-pipeline/README.md) — the backend responding to `POST /api/chat`
