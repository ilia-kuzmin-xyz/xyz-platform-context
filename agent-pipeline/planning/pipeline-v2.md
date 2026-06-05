# Artifact Pipeline — Target Architecture v2

> **Status: DESIGN PROPOSAL — not yet implemented.**
> Goal: drop end-to-end latency from ~590 s to ~55 s without dropping data, by separating availability discovery from data delivery and overlapping the Claude composer with the heavy fetches.
> Moved from `XYZ_AgentPipeline/docs/PIPELINE-ARCHITECTURE.md`.

---

## The three concerns (strictly separated)

| # | Concern | Owns | Output |
|---|---------|------|--------|
| 1 | **Discovery** | "Does this project have progress / issues / schedule / media?" | `availability` map |
| 2 | **Composition** | Claude writes the TSX artifact | `artifact.tsx` |
| 3 | **Delivery** | Fetch full domain data | `artifact.data` |

Schema is a static contract (`agents/contract.py`) — not derived per request.

---

## End-to-end flow

```
user question → [Phase 0 RESOLVE ~0.5 s]
                    ↓
             [Phase A AVAILABILITY ~2–3 s]
             asyncio.gather(count_project, count_progress, count_issues,
                            count_schedule, count_media)
             Each probe: ONE size=1 MCP call. Reads totalElements + 1 sample.
                    ↓
     ┌──────────────┴──────────────────┐
     ▼                                 ▼
[Phase B COMPOSE ~30–55 s]      [Phase C DELIVER ~30–50 s]
Single Claude streaming call.   asyncio.gather(
Inputs: static contract +         deliver_progress(),
  availability map +               deliver_issues(),
  user question                    deliver_schedule(),
Output: artifact.tsx              deliver_media(),
  SSE: artifact_ready            )
                                Each → SSE: artifact_data_partial
                                SSE: artifact_data_complete
     └──────────────┬──────────────────┘
                    ▼
             [Phase D DONE]
             SSE: done { trace }

wall time ≈ Phase 0 + A + max(B, C) ≈ ~55 s  (vs ~590 s today)
```

---

## Cache layering (clean responsibilities)

| Cache | Scope | TTL | Holds | Filled by |
|-------|-------|-----|-------|-----------|
| `profile_cache` | cross-request | 90 s | Phase A output (availability map) | Phase A |
| `DataSourceCache` | per-request | request lifetime | Full paginated arrays | Phase C |

No more cross-phase cache hand-off. Profile never touches full data; deliverers fetch what they need.

---

## Module layout

```
agents/
  contract.py            ← NEW. Static schemas + field constants.
  project_resolver.py    ← unchanged
  profiler.py            ← REWRITTEN. Phase A only. count_* probes.
  composer.py            ← receives availability + contract instead of profile
  hydrators.py           ← REWRITTEN. Owns paginated fetches ("deliverers")
  data_cache.py          ← split: count_<domain>(size=1) + fetch_<domain>_full(paginated)
```

## Migration order

1. `agents/contract.py` — static schema for all 5 domains
2. Split `data_cache.py` fetchers into `count_*` and `fetch_*_full`
3. Rewrite `profiler.py` to call only `count_*`
4. Rewrite `hydrators.py` as deliverers with their own full fetches
5. `server.py`: `gather(stream_artifact_composer, deliver_all)`
6. Frontend `useCanvas.ts`: handle `artifact_data_partial`, merge immutably
7. `DevOverlay.tsx`: compose ∥ deliver branch view
8. Delete dead code

## Expected wall-time budget

| Phase | Today | Target |
|-------|-------|--------|
| 0 resolve | 0.5 s | 0.5 s |
| A availability | 315 s | 2–3 s |
| B compose | 55 s (sequential) | 30–55 s (parallel with C) |
| C deliver | 120 s (sequential) | 30–50 s (parallel with B) |
| **Total** | **~590 s** | **~55 s** |

User sees the artifact mount when Phase B completes (~55 s), even if Phase C is still streaming.
