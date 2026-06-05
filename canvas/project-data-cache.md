# PDC — Project Data Cache (Frontend)

## Purpose

A frontend-side cache shared across all sessions within the same project. Avoids re-fetching domain data when switching between sessions within a short window.

## Shape

`projectDataCacheRef` — `React.useRef<Map<string, { data: unknown; ts: number }>>()` in `useCanvas.ts`.

Key = domain name (`'issues'`, `'progress'`, `'schedule'`, `'media'`).  
TTL = `PROJECT_DATA_TTL_MS` (5 minutes).

## Behaviour

**Priming**: live SSE turns prime the cache as data arrives — `data_profile` and `artifact_data_partial` events write to the map.

**Lookup on hydrate**: `runHydrate` checks the cache before firing a pipeline request. Fresh cached domains are served instantly via `onPartial`; only missing or expired domains go to the pipeline (passed via the `domains` filter on the `mode:'hydrate'` request).

**Clear on project switch**: `setProjectContext()` clears the cache entirely when the active project changes. Prevents data from project A leaking into project B.

**No persistence**: lives in a React ref — cleared on page reload. That's intentional. The pipeline's own T2 cache (60–900 s) absorbs repeat fetches across reloads.

## Relationship to pipeline caching

```
Frontend PDC (5 min)         ← checked first on session switch
  ↓ miss
Pipeline T2 (60–900 s)       ← hit avoids MCP fetch
  ↓ miss
MCP fetch → pipeline T2 + PDC primed
```

## Key file

`useCanvas.ts` — `projectDataCacheRef`, `PROJECT_DATA_TTL_MS`, `runHydrate`, `setProjectContext`
