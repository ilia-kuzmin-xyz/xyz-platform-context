# QA Story — Canvas (Infinity Canvas): End-to-End Testing

**Env:** https://frontend.holosite.dev
**Start here:** https://frontend.holosite.dev/projects/68b19ae480f11301198805f0/canvas/library

---

## What this is

Canvas is an AI-powered dashboard builder. You describe what you want to see (e.g. "show open issues by category"), and the AI generates a live dashboard from real project data. Dashboards are saved as sessions, can be published and shared with the team, and are browsable from the Library.

---

## Pages & URLs

| Page | URL suffix | Purpose |
|------|-----------|---------|
| Library | `/canvas/library` | Grid of all dashboards — home base |
| Canvas (new) | `/canvas` | Blank canvas — chat right, dashboard left |
| Session (editing) | `/canvas/:session_id` | Existing dashboard you're working on |
| Published view | `/canvas/library/:session_id` | Read-only full-screen view for teammates |

---

## Scenario 1 — Library

1. Open the Start here link above.
2. Verify the Library loads: a grid of tiles, each showing a dashboard name, status badge (Draft / Published), and a thumbnail or placeholder.
3. Draft tiles are yours only. Published tiles are visible to everyone on the project.
4. Hover a tile → a **⋯** menu should appear. Options: Rename, Delete.

---

## Scenario 2 — Create a new dashboard

1. From the Library, click **Create new dashboard** → lands on `/canvas` (blank).
2. In the chat panel (right side), type a prompt, e.g.:
   - `show open issues by category`
   - `what is the overall progress for this project`
   - `list the top 10 activities by planned hours`
3. Observe the response:
   - The assistant replies with a short summary in the chat.
   - A **"View dashboard"** button appears in the chat bubble.
   - The dashboard panel (left side) renders the generated output.
4. Click **"View dashboard"** to make sure the panel switches to that dashboard.
5. After the turn completes, wait 2–3 s for autosave. Then **refresh the page**.
6. ✅ The session should reload with the same chat history and dashboard intact. The URL now contains a `session_id`.

---

## Scenario 3 — Ask mode (inline answers)

Some prompts return a quick inline answer instead of a full dashboard — this is "ask mode":

1. Try prompts like: `how many open issues are there?` or `what's the total planned hours?`
2. The answer renders **directly inside the chat bubble** — no "View dashboard" button, no panel update.
3. Refresh the page → the inline answer should re-appear (it re-computes from saved data on load).

---

## Scenario 4 — Multiple dashboards in one session

1. In an open session, send a second prompt (e.g. `now show the same issues as a table`).
2. A second dashboard turn appears in chat with its own "View dashboard" button.
3. Click between the two "View dashboard" buttons — the panel should switch between them cleanly.
4. Refresh → both dashboards and all chat messages should be restored.

---

## Scenario 5 — Publish a dashboard

1. Open a Draft session.
2. Click **Publish** (top bar) → confirm the dialog.
3. ✅ Navigate back to the Library. The tile for this session should now show a **Published** badge and a preview thumbnail.
4. Publishing again (re-publish) updates the shared version — verify the tile updates.

---

## Scenario 6 — View a published dashboard (as a teammate)

1. From the Library, click a **Published** tile.
2. Opens at `/canvas/library/:session_id` — full-screen, no chat panel.
3. If it's your own dashboard, an **Edit** button should appear that takes you back to the editing session.
4. If it's someone else's: Edit button should not be visible.

---

## Scenario 7 — Rename and delete

1. Hover a tile in the Library → click **⋯** → **Rename** → give it a new name → confirm.
2. ✅ Tile updates immediately with the new name.
3. Hover the same tile → **⋯** → **Delete** → confirm.
4. ✅ Tile disappears from the Library.

> **Note (early version):** Delete only hides the dashboard — it's not fully erased from storage yet. This is known and expected.

---

## Scenario 8 — Session persistence after page reload

This is the main regression to watch for:

1. Create a session with at least 2 messages and 1 published dashboard.
2. Hard-refresh the page (Ctrl+Shift+R).
3. ✅ Chat history, all dashboards, and inline ask answers all restore.
4. The active dashboard panel should show the last viewed dashboard.
5. Published status should be preserved (tile still shows Published badge in Library).

---

## Things to flag immediately

- Any dashboard that shows blank / empty after a refresh (hydration regression)
- Published tile missing from Library after publishing
- Session lost after refresh (autosave not firing)
- Significant slowness on sessions with many dashboards (5+)
- Inline ask answers not reappearing after refresh

---

## Known limitations (not bugs)

- Delete hides dashboards but doesn't erase storage — expected.
- Published dashboards may show slightly stale data if the session hasn't been refreshed — expected, won't break.
- If the AI pipeline server restarts, an in-progress generation may fail — just retry the prompt.
