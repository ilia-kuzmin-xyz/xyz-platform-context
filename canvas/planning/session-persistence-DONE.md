# Canvas Session Persistence — IMPLEMENTED

> **Status: IMPLEMENTED** (as of 2026-06-02, branch `feature/canvas-1.6.7-storage`).
> Original design docs: `canvas-session-persistence-concept.md` + `canvas-session-persistence-plan.md` (moved here from `XYZ_AgentPipeline/docs/`).

## What was built

Full server-backed, per-project named session list. See the live-state documentation:
- [chat-and-sessions.md](../chat-and-sessions.md) — session model, lifecycle, storage
- [artifact-and-hydration.md](../artifact-and-hydration.md) — hydration, mount gate, dashboard switcher
- [ask-mode.md](../ask-mode.md) — ask spec persistence + rehydration
- [project-data-cache.md](../project-data-cache.md) — frontend cache across sessions
- [pitfalls.md](../pitfalls.md) — known gotchas discovered during implementation

## Key decisions made during implementation

- **Server storage only** — `localStorage` session persistence entirely removed. `canvas:mode:v1` UI toggle kept.
- **Append-only** — no DELETE endpoint exists; newest `insertedOn` wins; orphan accumulation accepted (v1 trade-off, ~1 file/turn).
- **Soft-delete** — POST a file with `{ deleted: true }` since no DELETE API.
- **Unified hydration** — one `mode:'hydrate'` request for the union of all dashboard + ask domains in the session, not one per dashboard.
- **Project-level frontend cache** — `projectDataCacheRef` (5 min TTL) shared across sessions; switching sessions within TTL hydrates instantly.
- **Profile stub separation** — `profile` and `hydrated` kept in separate buckets; completion judged against `Object.keys(hydrated)` only (see pitfall #1).
- **Sandpack mount gate** — show placeholder until `status === 'hydrated'`; mount once with final data.
- **Stale-ref fix** — `rehydrateSession` accepts explicit maps, not `stateRef.current`.
- **CORS fix** — download via `Storage` axios (webpack proxy on localhost).

## Still not done (v1 caveats)

- `saveStatus` not surfaced in UI (no save indicator yet)
- No localStorage→server one-time migration
- No retention/cleanup of orphan files (awaits DELETE endpoint)
