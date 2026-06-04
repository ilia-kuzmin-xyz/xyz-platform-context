# CCH — Caching Strategy

How the dashboard avoids re-downloading hundreds of megabytes on every page load.

## Three caching layers

| Layer | What it caches | Storage | Invalidation |
|-------|---------------|---------|-------------|
| **OPFS cache** | Parquet files (element-status, project-element-list, svf2-object-id-map, V2 progress outputs) | Origin Private File System (persistent, survives page reload) | `artefactHash` comparison — if hash changes, file re-downloaded |
| **Service Worker** | Forge viewer fragments (`.pack` files, geometry data) | Cache API (persistent) | URL-based; new model version = new URLs |
| **In-memory** | Element name cache, DuckDB query results, filter state | JavaScript heap | Cleared on page unload |

## OPFS directory layout

```
/duckdb-cache/{projectId}/
  ├─ models/{modelId}/
  │   ├─ svf2-object-id-map.parquet      ← one per federated model
  │   └─ {modelVersionId}.parquet         ← client-element-metas (per version)
  ├─ element-names/
  │   └─ {modelArtefactId}.parquet        ← tooltip name cache
  ├─ {artefactId}.parquet                 ← element-status, project-element-list
  └─ metadata.json                        ← hash + size per cached file
```

Each cached file has metadata: `artefactHash` (primary key), `fileSizeBytes` (actual downloaded size, not the API-reported size which can be 0).

### Cache validation flow

```
1. ArtefactLoader wants to load element-status.parquet
2. Check OPFS: does /duckdb-cache/{projectId}/{artefactId}.parquet exist?
3. Check metadata: does artefactHash match what the API reports?
4. YES → load from OPFS (zero network)
5. NO  → download from blob storage → write to OPFS → store actual byte length in metadata
```

The size check skips validation when `fileSizeBytes` is 0 or falsy (some artefacts report 0 from the backend). `artefactHash` is the real cache key.

## Lazy element names (remote parquet queries)

`client-element-metas` parquets can be 200+ MB across all sub-models. Instead of downloading them upfront:

- DuckDB's `read_parquet('https://blob-url...')` with predicate pushdown fetches only the matching row group over HTTP range requests.
- First hover on an element: ~100-200ms (downloads parquet footer + one row group).
- Background warm-up pre-fetches footer metadata so the first real hover is faster.
- In-memory `Map<modelElementId, name>` makes repeat hovers instant.
- **No `client-element-metas` network requests during initial page load.**

## Service Worker (Forge fragments)

The Forge Viewer loads model geometry as `.pack` fragment files (thousands of small requests). The Service Worker intercepts these and caches them. Second visit loads the 3D model almost entirely from cache.

This is separate from OPFS — it uses the browser's Cache API and is managed by the Forge viewer integration, not by DuckDB.

## Cache thrashing (fixed)

Previously, all models in a federated project shared the same OPFS key for `client-element-metas`. Each model load evicted the previous model's cached file → every model re-downloaded on every page load. Fixed by using `{modelArtefactId}.parquet` as the cache filename so each model gets its own entry.

## Deep-dive

- Viewer caching details: [`docs/dashboard/viewer/caching-strategy.md`](../../docs/dashboard/viewer/caching-strategy.md)
