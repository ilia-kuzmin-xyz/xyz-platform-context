# Canvas UX — Layout & Interaction Map

> Schematic description of what the user sees and how the parts connect.
> For code locations see `README.md`; for session/hydration mechanics see sub-domain files.

---

## Page layout

```
┌─────────────────────────────────────────────────────────┬────────────────────┐
│                                                         │                    │
│                   CANVAS AREA                           │   CHAT PANEL       │
│           (fills remaining width, full height)          │   (fixed width,    │
│                                                         │    right edge)     │
│  • Renders the active Sandpack dashboard (TSX)          │                    │
│  • Empty / loading states shown here too                │                    │
│  • Overlays float above this area (see below)           │                    │
│                                                         │                    │
└─────────────────────────────────────────────────────────┴────────────────────┘
```

The canvas area has zero padding (full-bleed). The chat panel is always visible on
the right; its width is fixed.

---

## Canvas area — what appears here

### Empty state (no active session)

Nothing rendered in the canvas area itself. Overlays may appear on top of it:

- **Project picker** — centered modal over the canvas, shown on bare `/canvas`
  (no URL project). Lists user's assigned projects with a search box. User picks
  one → navigates to `/canvas/:mongoProjectId`. Dismissible ("Skip — use chat
  instead").

- **Sessions panel** — shown when the project already has saved sessions and no
  session is currently open. Floats centered near the top of the canvas. Lists
  sessions (name, relative time, author). Click → restores that session. × →
  soft-deletes. Disappears once a session is active or a message is sent.

### Active session

- **Live dashboard** — the Sandpack-hosted TSX component fills the canvas edge
  to edge. Rendered once TSX + hydration data are both ready (mount gate).
- **Streaming placeholder** — shown while the pipeline is generating TSX; includes
  the latest reasoning step ("Resolving project… / Composing dashboard…").
- **"Loading dashboard data…" placeholder** — shown when TSX is ready but
  hydration hasn't completed yet (session restore, manual refresh). Mounts Sandpack
  only once, with final data.
- **"Refreshing data…" badge** — small overlay badge on the canvas while
  re-hydration is in progress after restoring a session.
- **Error card** — shown if the compose step fails; includes a "Try again" button.

### Overlays that float above the canvas

| Overlay | Trigger | What it does |
|---------|---------|--------------|
| **Sketch canvas** | `+` menu → "Draw layout manually" | Replaces the artifact area with a drawing canvas. Prompt + sketch submitted together. |
| **Panel selection overlay** | Panel select mode in chat | Highlights clickable panels in the live dashboard; user picks one for targeted edits. |
| **Clarifier survey** | Pipeline returns questions before composing | Pre-compose survey ("What time range? Which metric?"). Submit → pipeline continues. |
| **Project resolution error** | URL `mongoProjectId` cannot resolve | Full-screen dark gate with a red error card. Blocks all interaction. |

---

## Chat panel (right side)

```
┌────────────────────────────────┐
│  HEADER                        │
│  ← Sessions   [session name]   │
├────────────────────────────────┤
│                                │
│  MESSAGE THREAD                │
│                                │
│  [user bubble]                 │
│  [reasoning trace — live]      │
│  [assistant bubble + summary]  │
│    [View dashboard] button     │
│  [assistant bubble]            │
│    [↑↑ table / list result]    │
│  ...                           │
│                                │
│  [activity bar — "Thinking…"]  │
├────────────────────────────────┤
│  INPUT AREA                    │
│  [text field, multi-line]      │
│  [+]  [Build ▼]       [↑ send] │
└────────────────────────────────┘
```

### Header

- Shows current session name (or "Canvas Chat" if no session).
- **← Sessions** button — appears when a session is active; clicking returns to
  empty state and triggers the Sessions panel to reappear.

### Message thread

Each turn adds two bubbles: user (right-aligned) then assistant (left-aligned).

**Dashboard turn** (mode = Build):
- Assistant bubble contains the pipeline summary text (markdown).
- Below the bubble: **"View dashboard"** button (yellow outline).
  - Active dashboard: shows "✓ Viewing" (brighter border).
  - Hydrating: shows "Loading data…" with a spinner.
  - Clicking any past button switches the canvas area to that dashboard and
    re-hydrates if needed. This is the only dashboard switcher — no tab bar.

**Ask turn** (mode = Ask):
- Assistant bubble contains the answer summary.
- Inline result rendered directly in the bubble:
  - **Table** — virtualized rows, expandable to fullscreen dialog.
  - **List** — virtualized items, expandable to fullscreen dialog.
  - While hydrating: "Loading latest data…" spinner inside the bubble.

**Live reasoning trace** — appears below the latest user message while the
pipeline is in flight. Shows the current step (resolve / profile / compose /
hydrate) as a collapsible trace. Collapses into a snapshot on the assistant
bubble after the turn completes.

**Activity bar** — one line below the thread. Shows "Thinking…",
"Calling {tool}…", or the current tool output label during streaming.

### Input area

- Multi-line text field. Enter sends; Shift+Enter adds a newline.
- **[+] button** — opens a small menu:
  - "Draw layout manually" — toggles the sketch canvas.
- **[Build ▼] / [Ask ▼] mode dropdown** — switches between the two modes:
  - **Build** — generate a full interactive dashboard (TSX + hydration).
  - **Ask** — get a direct answer (number, table, list, or text). No dashboard.
  The placeholder text in the input field changes to reflect the active mode.
- **[↑] send button** — yellow when input is non-empty; grey/disabled otherwise.

---

## Two modes

| | Build | Ask |
|--|-------|-----|
| What the pipeline returns | TSX component + domain data | JS spec evaluated against domain data |
| What appears in the canvas | Full interactive dashboard | Nothing (answer stays in chat) |
| What appears in chat | Summary + "View dashboard" button | Inline table / list / number |
| Re-hydration on restore | Full hydration (all domains in `domainsRead`) | Re-executes ask spec against fresh data |

Switching mode mid-session is allowed. A session can contain a mix of dashboard
and ask turns; all are retained and replayable from chat.

---

## Session lifecycle

```
/canvas (bare)
  → project picker → select project → /canvas/:mongoProjectId
                   → skip → type project name in chat

/canvas/:mongoProjectId
  → sessions panel (if project has sessions)
      → click session → restore → canvas shows last active dashboard
                                → all past "View dashboard" buttons alive
      → × delete → session soft-deleted (still in storage, marked deleted)
  → no sessions / dismissed → empty canvas → type to start

  while in a session:
    → chat sends → pipeline → new turn appended
    → idle ~2 s after each turn → session autosaved to project storage
    → ← Sessions → returns to sessions panel (session already saved)
    → "new session" is implicitly started on next send after ← Sessions
```

---

## Dev / debug overlays (keyboard shortcuts)

| Shortcut | Overlay | Contents |
|----------|---------|----------|
| Ctrl+Shift+D | Dev overlay | Pipeline timeline: resolve → profile → compose → hydrate phases, token counts, SSE event log, full artifact TSX, ask spec |
| Ctrl+Shift+H | Hydration inspector | Per-domain: source (mcp live vs storage), age, size, save status; footer: total hydration files + bytes in project storage (append-only accumulation) |

Both are read-only and float over the top-right corner of the page.
