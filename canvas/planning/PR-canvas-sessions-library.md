# Canvas: server-backed sessions, Library, publish & viewer

Branch: `feature/canvas-1.6.7-storage` → `master`

## What this adds

Turns the AI Canvas from a single-shot scratchpad into a persistent, shareable workspace:

- **Server-backed sessions** — every canvas conversation (chat + generated dashboards) is saved to project storage automatically, so it survives reloads and is reachable from any machine. Each session lives at its own URL `…/canvas/:session_id`.
- **Library** (`…/canvas/library`) — a tile grid of dashboards across the whole project. You see all of your own sessions (badged **Draft** / **Published**) plus other people's **Published** ones.
- **Publish** — promotes a session's current dashboard so the whole project can view it; captures a thumbnail for the tile.
- **Read-only viewer** (`…/canvas/library/:session_id`) — opens a published dashboard full-screen with no chat/editing.
- **Hydration storage** — dashboard data is cached in project storage so reopening a session (or viewing a published one) is fast and works the same on every page.

## Architecture (one paragraph, no detail)

Sessions, publish state, screenshots, and per-domain data are all stored as files on the existing **project files API** (append-only, newest-wins). The frontend reads/writes them through a small service layer; no new backend was needed. The 3D model ("viewer") data is now persisted alongside the other domains so restored dashboards render the model too.

---

## How to test it in the interface

> Prereq: the agent pipeline must be running on `:8000` (see `XYZ_AgentPipeline/LOCAL-SETUP.md`). Open a project's canvas at **`/projects/:project_id/canvas`**.

### 1. Create & auto-save a session
1. On `/canvas`, type a request that needs data (e.g. *"show me open issues"*) and generate a dashboard.
2. Watch the URL — after the first save it silently becomes `/canvas/<session_id>`.
3. **Reload the page** → the same chat + dashboard come back. ✅ persistence works.

### 2. Switch / create sessions via the Library
1. Click **Library** (top-right). You land on the tile grid.
2. Your new session shows as a **Draft** tile.
3. Click **Create new dashboard** (top-right) → fresh `/canvas`. Generate a different dashboard.
4. Back in Library → both sessions appear, newest first.

### 3. Rename / delete from a tile
1. Hover a tile → a **⋯** menu appears.
2. **Rename** → dialog; confirm → tile name updates immediately.
3. **Delete** → tile disappears.
4. Reload Library → changes persisted. ✅

### 4. Publish
1. Open one of your sessions in edit mode (click a Draft tile).
2. Click **Publish** (top bar, next to the session name) → confirm in the modal.
3. Tile badge flips **Draft → Published**; a screenshot thumbnail appears on the tile shortly after.
4. Generate a *newer* dashboard in the same session, hit **Publish** again → the published tile now points at the newer version.

### 5. View mode (read-only)
1. In Library, click a **Published** tile → opens `/canvas/library/:session_id`.
2. Confirm: dashboard renders full-screen, **no chat panel, no tabs**.
3. If it's your own session, an **Edit** button appears (next to the title) → returns you to edit mode. Other users' published dashboards have no Edit.
4. **Library** button (top-right) returns to the grid.

### 6. 3D viewer dashboards (regression check)
1. Generate a dashboard that shows the 3D model.
2. Reload / reopen the session, and open it from Library view mode.
3. Confirm the model still renders (not an empty panel).
   - Note: the model data is written the first time a session is generated/opened *with the pipeline*; a session that was never re-generated after this change shows the model only after one more generation.

### 7. Cross-user (optional, needs a 2nd account)
1. User A publishes a dashboard.
2. User B opens the same project's Library → sees A's **Published** tile (but **not** A's drafts).
3. B can open it in view mode; rename/delete from the ⋯ menu also works on any tile.

---

## Dev panel

`Ctrl+Shift+D` shows the pipeline timeline; `Ctrl+Shift+H` shows the **hydration inspector** (which data domains were served from storage vs. re-fetched, file sizes, timestamps). Pipeline version now reads **1.6.8**.

---

## Known limitations (MVP, by design)

- Storage is **append-only** (no hard delete): renames/deletes are newest-wins markers, and files accumulate over time. Concurrent edits to the *same* session from two places can clobber each other (no locking).
- View mode serves the **last stored** data regardless of age — it can be stale if nobody has re-generated the session recently; it never errors, just shows last-known-good.
- A published tile without a screenshot gets one for free the next time anyone re-publishes it.
