# Agent Pipeline — Infinite Canvas Backend

FastAPI service (`XYZ_AgentPipeline/`) that converts natural-language questions into streaming React/TSX dashboards populated with real project data.

```
POST /api/chat  →  SSE stream  →  artifact_skeleton (TSX)  +  artifact_data_partial × N  →  done
```

## Subdomain index

| Code | Sub-domain | File |
|------|------------|------|
| PHS | Pipeline Phases | [phases.md](phases.md) |
| MOD | Modes & Intents | [modes-and-intents.md](modes-and-intents.md) |
| DAT | Data Contracts (SSE, request, payloads) | [data-contracts.md](data-contracts.md) |
| CCH | Caching | [caching.md](caching.md) |
| — | Pitfalls | [pitfalls.md](pitfalls.md) |

## Quick start (local)

```powershell
cd XYZ_AgentPipeline
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
cp .env.example .env   # fill ANTHROPIC_API_KEY
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Healthy startup: `pipeline: Pipeline v2 ready — 92 MCP tools loaded`

Required env vars: `ANTHROPIC_API_KEY`, `XYZ_MCP_SERVER_URL`, `CORS_ALLOWED_ORIGINS`.  
Model hardcoded in `agents/config.py` as `claude-opus-4-7`.

## File map

| File | Purpose |
|------|---------|
| `server.py` | FastAPI app; `POST /api/chat` orchestrator |
| `agents/intent_classifier.py` | Pure function: FRESH / EDIT / SKETCH / SWITCH_PROJECT / OFF_TOPIC |
| `agents/project_resolver.py` | Phase 0a: fuzzy project matching |
| `agents/profiler.py` | Phase 0b: parallel data probes (counts + samples) |
| `agents/clarifier.py` | Phase 0c: survey questions for FRESH turns |
| `agents/artifact_composer.py` | Phase 1: streaming Claude call → TSX |
| `agents/hydrators.py` | Phase 2: parallel domain fetchers |
| `agents/ask_agent.py` | Ask mode: generates JS spec instead of full dashboard |
| `agents/thread_store.py` | In-memory thread state (project + last artifact, 6h TTL) |
| `agents/profile_cache.py` | T1: cross-request profile cache (90 s) |
| `agents/project_data_cache.py` | T2: cross-request domain data cache (60–900 s) |
| `agents/data_cache.py` | T3: per-request dedup cache |
| `agents/data_accessor.py` | Composes T2 + T3; single entry point for all hydrators |
| `agents/mcp_client.py` | MCP tool abstraction + auth refresh on 401 |
| `agents/config.py` | Model name + pricing constants |

## Debugging

- `Ctrl+Shift+D` on the Canvas page → Dev overlay (resolve → profile → compose → hydrate timeline)
- `PIPELINE_DEBUG=true` in `.env` → verbose console logs
- `reports-debug/` — per-request filesystem dumps (when debug reporter active)

## Common tasks

**Change model**: edit `agents/config.py` → `ANTHROPIC_MODEL`. Update pricing constants to match.

**Add a new domain**:
1. Probe in `profiler.py` → `{available, count, scale, sample}`
2. Hydrator in `hydrators.py` → yields `{domain, payload}`
3. `ProjectDataKey` entry in `project_data_cache.py`
4. `DataAccessor` method in `data_accessor.py`
5. Update `ProjectData` TypeScript comment in `artifact_composer.py`

**Clear caches**:
```bash
curl -X POST http://localhost:8000/api/profile-cache/clear
curl -X POST http://localhost:8000/api/cache/invalidate \
  -d '{"project_id":"...","keys":["issues","schedule"]}'
```

**Fix `truncated at N chars`**: composer hit `max_tokens`. Auto-retries 3× with assistant prefill. If still failing, simplify the component or reduce widget count in the prompt.

## Planning docs

| File | Status |
|------|--------|
| [pipeline-v2.md](planning/pipeline-v2.md) | 🔵 DESIGN PROPOSAL — not implemented |
| [caching-refactor.md](planning/caching-refactor.md) | 🟡 IN PROGRESS |
| [data-profile-slim-down.md](planning/data-profile-slim-down.md) | 🟡 T1 done, T2–T5 pending |
| [ux-uplift.md](planning/ux-uplift.md) | 🔵 CONCEPT |
| [model-switcher.md](planning/model-switcher.md) | 🔵 CONCEPT — needs review |

## See also

- [Canvas domain](../canvas/README.md) — the frontend consuming this service
