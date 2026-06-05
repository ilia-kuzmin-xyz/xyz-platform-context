# PHS — Pipeline Phases

## Overview

```
[0a] Project Resolver   ~0.5 s   deterministic fuzzy match → project_id
[0b] Profiler           ~2–3 s   parallel MCP probes → counts + samples per domain
[0c] Clarifier          ~2 s     optional survey for FRESH turns (stream pauses for user)
      ↓ phases 1 + 2 run IN PARALLEL via asyncio.Queue
[1]  Artifact Composer  ~30–55 s Claude streams TSX → artifact_skeleton SSE event
[2]  Hydrators          ~30–50 s parallel domain fetches → artifact_data_partial × N SSE events
```

Wall time ≈ Phase 0a + 0b + 0c + max(1, 2) ≈ 35–60 s for a cold request.

For `mode:'hydrate'` (session restore): skips 0c + 1. Wall time ≈ 0a + 0b + 2 ≈ 5–15 s.

---

## Phase 0a — Project Resolver (`project_resolver.py`)

Deterministic fuzzy match against the user's project list (5-min in-memory cache from `xyz_get_projects_user_projects`).

**Short-circuit**: if the request carries `project_id` (set by the frontend for URL-locked `/canvas/:mongoProjectId` sessions), the resolver is skipped entirely. Sticky thread fallback also bypassed.

Output: `project_id` (postgres UUID), `project_name`, `candidates`, `resolve_source` (`"explicit"|"fuzzy"|"sticky"`).

---

## Phase 0b — Profiler (`profiler.py`)

Parallel MCP probes — one lightweight `size=1` call per domain. Reads `total` count + one sample row. No full data fetched here.

```python
asyncio.gather(
  probe_project(),    # metadata
  probe_progress(),   # actual/planned percentages
  probe_issues(),     # total count + sample issue
  probe_schedule(),   # revision count
  probe_media(),      # photo + capture counts
)
```

Output: `data_profile` — availability map with `{available, count, scale, sample}` per domain. Emitted as the `data_profile` SSE event (frontend uses it to pre-populate stubs). Cached in T1 (90 s).

---

## Phase 0c — Clarifier (`clarifier.py`)

Optional. Fires on `FRESH` turns when the composer would benefit from more context (ambiguous question, multiple candidate projects, etc.).

Emits `clarifier_questions` SSE event with `{questions, original_message}`. **Stream ends here** — the `done` event carries `reason: "awaiting_clarifications"`. The frontend shows the questions; the user answers; the frontend re-sends the original message with `clarifier_answers` in the body. The next request skips the clarifier (`skip_clarifier=true`).

---

## Phase 1 — Artifact Composer (`artifact_composer.py`)

Single streaming Claude call. Inputs:
- Static data contract (field names + schemas, stable → prompt-cacheable)
- Availability map from Phase 0b
- User question (+ prior artifact for EDIT, sketch shapes for SKETCH)

Streams TSX tokens as `artifact_token` SSE events. When the full TSX is ready, emits `artifact_skeleton` with `{ title, summary, domainsRead, tsx }`.

The component must match:
```typescript
function App(props: { data: ProjectData; theme?: 'light' | 'dark' }): React.ReactElement
```

Must handle any domain being `undefined` — data arrives after TSX mounts.

---

## Phase 2 — Hydrators (`hydrators.py`)

Parallel fetchers — one per domain in `artifact.domainsRead` (or all domains if not filtered).

```python
asyncio.gather(
  hydrate_issues(),
  hydrate_progress(),
  hydrate_schedule(),
  hydrate_media(),
)
```

Each domain yields as it completes:
```
SSE: artifact_data_partial  { domain, payload }    (one per domain, order not guaranteed)
SSE: artifact_data_complete { domains, failed }    (when all done)
```

Fetches go through `DataAccessor` → T3 → T2 → MCP. See [caching.md](caching.md).

---

## Phase 2 only — `mode:'hydrate'` (session restore)

Used when restoring a saved session. Skips phases 0c and 1 (no clarifier, no composer — TSX already exists in the saved session).

Request body: `{ mode:'hydrate', project_id, thread_id, domains?: string[] }` (no `message`).

Runs: 0a resolve → 0b profile → 2 hydrators (filtered to `domains` if provided).

Emits the same `data_profile`, `artifact_data_partial`, `artifact_data_complete`, `done` events → same frontend handlers fill `props.data`.
