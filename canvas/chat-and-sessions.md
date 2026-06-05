# CHT + SES — Chat & Sessions

## Chat model

Each user and assistant turn is a `ChatMessage`:
```ts
{ id, role: 'user'|'assistant', content, timestamp, result?: PersistedResultRef }
```

An assistant message's `result` field links it to a dashboard or ask result:
- `{ kind: 'dashboard', dashboardId }` — "View dashboard" button renders that dashboard in ArtifactPanel
- `{ kind: 'ask', askId }` — ask result renders inline in the chat bubble

Messages accumulate; none are discarded within a session.

## Session model

One session = one pipeline `thread_id` = one conversation. Holds many turns — dashboard and ask turns freely interleaved.

```
Project
 └── Session  (thread_id)
      ├── messages[]       — full chat history
      ├── dashboards[]     — one PersistedDashboard per dashboard-mode turn
      └── askResults[]     — one PersistedAskResult per ask-mode turn
```

Session name = first user message truncated to 60 chars.

## Session lifecycle

```
1. New session     → generate UUID as sessionId, blank messages/dashboards/askResults
2. Send message    → POST /api/chat { thread_id: sessionId, project_id, message, ... }
3. Turn completes  → append ChatMessage + DashboardEntry or AskResultEntry to state
4. Idle autosave   → debounced 2–3 s, fires only when !isStreaming
                     → CanvasSessionApiService.saveSession(projectId, sessionFile)
                     → POST /api/v2/projects/{id}/files  (multipart, single chunk)
5. On load         → listSessions() → SessionsPanel shows if sessions exist
6. openSession()   → loadSession(fileReferenceId) → restore messages + dashboards + askResults
                     → rehydrateSession() → POST /api/chat { mode:'hydrate', ... }
```

## Server storage — files API (append-only)

Sessions live in **server storage only**. No localStorage (legacy `canvas:lastSession` removed). Stored as `canvas-session-{sessionId}.json`. No DELETE endpoint exists — newest `insertedOn` wins.

**Listing**: `GET /api/v2/projects/{id}/files` → filter `canvas-session-` prefix → group by `sessionId` parsed from filename → pick newest per group → `SessionSummary[]` for the panel. Zero content fetches needed for the panel (all metadata comes from the list response).

**Downloading**: `GET /files/{fileReferenceId}` → `{ downloadUrl }` → fetch via `Storage` axios instance (`ViewerPage/utils/storage-fetch.ts`). Do NOT use raw `fetch(downloadUrl)` — see [pitfalls.md](pitfalls.md#3-cors-on-blob-download).

**Saving**: `POST /files` multipart with `fileName=canvas-session-{id}.json`, `xyzDisplayName=<name>`, `chunkIndex=0`, `totalChunks=1`. Returns new `fileReferenceId` (discardable). Each save creates a new file (no overwrite). Orphan accumulation is accepted v1 trade-off.

**Soft-delete**: no DELETE endpoint, so deletion = POST a new file with `{ deleted: true }` in the JSON body. Panel hides sessions whose newest file is tombstoned.

## Continuing a restored session

After restore, `currentSessionId` = saved `sessionId`. New turns use the same `thread_id` → pipeline continues the conversation. Each completed turn → autosave POSTs a new file version.

EDIT turns after pipeline restart: `thread_store` is in-memory (6h TTL, wiped on restart). If evicted, send `prior_artifact: { tsx, title, summary, domainsRead }` in the `/api/chat` body. Pipeline uses it when `thread.last_artifact` is absent. The frontend is the source of truth; the server thread is a cache.

## Key files

| File | Role |
|------|------|
| `useCanvas.ts` | `sendMessage`, `openSession`, `newSession`, `deleteSession`, autosave effect |
| `canvas-session-api-service.ts` | `listSessions`, `loadSession`, `saveSession` |
| `canvas-session.types.ts` | `SessionFile`, `PersistedChatMessage`, `PersistedDashboard`, `PersistedAskResult` |
| `SessionsPanel.tsx` | Session list UI — shown on empty canvas when sessions exist |
| `ChatPanel.tsx` | Renders messages; "View dashboard" button per dashboard turn |
