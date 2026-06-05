# Hydration Persistence — E2E Scenario (v1)

> **Status: CONCEPT — needs review.** Companion to [hydration-data-persistence.md](hydration-data-persistence.md)
> (which holds the full analysis). This file is the simple version: what we build, nothing else.

## Idea in one sentence

After the pipeline hydrates a dashboard, save each domain's data as a JSON file in project storage;
next time a session opens, load those files instead of waiting 10–30 s for MCP.

## Storage

Same files API the sessions already use (`/api/v2/projects/{id}/files`, append-only, no delete,
newest `insertedOn` wins — see `canvas-session-api-service.ts`):

```
canvas-session-{sessionId}.json            ← existing
canvas-hydration-{projectId}-issues.json   ← new, one file per domain
canvas-hydration-{projectId}-progress.json
canvas-hydration-{projectId}-schedule.json
canvas-hydration-{projectId}-media.json
```

File content = the domain payload exactly as the SSE `artifact_data_partial` event delivered it.
No transformation, no compression, no caps.

**Domains are NOT hardcoded in the frontend.** The pipeline defines them (4 today: issues,
progress, schedule, media — one hydrator each), but the canvas already handles domains
generically: payloads keyed by `event.domain`, mount gate checks the artifact's `domainsRead`.
Persistence follows suit — file name derived from `event.domain` on save, domain parsed back
from the file name on load (same trick as `sessionIdFromFileName`). A 5th pipeline domain would
be persisted with zero frontend changes. Only guard: validate the domain string is a plain
identifier (`/^[a-z_]+$/`) before it becomes part of a file name.

## E2E scenario

### Day 1 — first dashboard (cold)

```
user opens /canvas/:projectId
user: "show me issues vs progress"
  → pipeline runs as today (MCP) → dashboard renders
  → on artifact_data_complete:
      save canvas-hydration-{projectId}-issues.json
      save canvas-hydration-{projectId}-progress.json
      (after render, in background — user never waits on saves)
```

### Day 1 — more dashboards

```
each new dashboard / ask answer → fresh hydration from pipeline (as today)
  → on complete: re-save only domains whose data changed
    (string-equality check vs last save — append-only storage, don't spam identical files)
```

Storage always holds whatever the last generation produced. No scheduled jobs, no refresh logic —
normal usage keeps it fresh.

### Day 2 — reopen session (warm)

```
user opens session
  → GET /files (the call SessionsPanel already makes) → newest hydration file per domain
  → per domain needed by the session's dashboards (domainsRead):
      file younger than 30 min   → download it
      file older / missing       → hydrate via pipeline (today's path, unchanged)
  → wait until ALL needed domains are present (existing mount gate — mount once, final data)
  → dashboards render in ~1–2 s instead of 10–30 s
```

### Any time — inspector (debug hotkey, e.g. Ctrl+Shift+H)

Read-only overlay, one row per domain:

```
domain     status       source           age      saved
issues     hydrated     storage          2h 14m   ✓
progress   hydrated     mcp (live)       0m       ✓
schedule   not loaded   —                —        —
```

Footer: count + total size of hydration files in the project.

## Scenario readiness

| Scenario | What happens | Why it works |
|----------|--------------|--------------|
| **All domains in storage (fresh)** | parallel downloads → render ~1–2 s, pipeline never called, nothing re-saved | storage loads feed the SAME merge path as SSE events (rule 5) |
| **No domains in storage** | exactly today's pipeline path → save all on complete → next open hits row 1 | storage branch is additive; its absence = current behavior |
| **Mixed (fresh / stale / missing)** | fresh → download; stale+missing → ONE narrowed pipeline call (`mode:'hydrate', domains:[...]` — already supported, `useCanvas.ts:418-449`); both feed the same merge; per-dashboard gates mount progressively; delivered domains saved → storage converges to all-fresh | per-domain merge is already order-independent; gate is already per-dashboard |

A stale file = treated as missing (v1 never shows old data while waiting).
A failed download = treated as missing (one `catch`, not a retry subsystem).

## Rules (each is one `if`, not a subsystem)

1. Save only payloads with `_hydrated: true` — never profile stubs
2. Save after render, fire-and-forget — a failed save changes nothing for the user
3. Skip save when serialized payload equals the last saved one
4. Mount only when all of a dashboard's `domainsRead` are present (existing gate, no new code)
5. **Single merge path**: storage loads enter state through the same "domain payload arrived" function as `artifact_data_partial` SSE events (`useCanvas.ts:1170-1220`) — two transports, one code path. The gate, ask completion, and provenance never know the source.

## What we deliberately do NOT build (v1)

- No background refresh / mid-session data swap / "stale" badges
- No per-domain staleness tuning — one constant (30 min)
- No compression, no size caps, no hashing
- No retry/fallback machinery — stale or missing file simply means today's pipeline path runs

## Code touchpoints

| File | Change |
|------|--------|
| `canvas-hydration-api-service.ts` (new) | list / load / save — clone of session service with new prefix |
| `useCanvas.ts` | save hook on `artifact_data_complete`; storage branch in `openSession`; provenance state |
| `HydrationInspector.tsx` (new) | read-only overlay + hotkey |
