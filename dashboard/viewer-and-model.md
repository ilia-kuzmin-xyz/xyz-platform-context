# VWR — 3D Viewer and Model

How the Forge viewer integrates with dashboard data to colour elements by installation status.

## Model resolution

The dashboard doesn't let users pick a model. It auto-detects:

1. Call Folder API → list project folders.
2. Find a folder whose name contains `"federated"` (case-insensitive).
3. Find the first model inside that folder.
4. Fetch the model detail → extract `accUrn` from `versions[0]`.
5. Load into Forge Viewer with `skipPropertyDb: true` (saves ~100 MB download).

If any step fails (no federated folder, no model, no URN), the viewer doesn't load and logs an error. There are **no fallbacks or hardcoded URNs** — this was a deliberate choice to surface misconfigured projects immediately.

## The three-ID mapping chain

The central challenge: DuckDB knows elements by PostgreSQL UUID, but Forge knows them by integer `dbId`. Bridging the two requires a three-step ID chain:

```
PostgreSQL UUID (modelElementId)
    ↕  project_element_list parquet
External ID (sourceFileElementId) — Revit GUID or Navisworks element ID
    ↕  svf2-object-id-map parquet OR viewer.getExternalIdMapping()
Forge dbId (integer)
```

This chain is built as a DuckDB view (`element_base_data`) by joining the three tables. Once built, a single SQL query can go from "which elements are Installed?" to "which dbIds do I colour green?".

## Coloring flow

```
1. element_status table (from parquet)    → modelElementId + installationStatus
2. JOIN project_element_list              → get sourceFileElementId
3. JOIN svf2_object_id_map               → get Forge dbId
4. SQL CASE maps raw status              → display status (e.g. INSTALLED_ACCURATELY → "Installed")
5. Status → colour lookup                → "#00ea6c" (green)
6. viewer.model.setThemingColor(dbId, colour)
7. Single viewer.impl.invalidate(true)   → batch-apply all colours
```

Status colours:
| Status | Colour | Hex |
|--------|--------|-----|
| Installed | Green | `#00ea6c` |
| Installed Early | Dark Green | `#00ae49` |
| Not Installed | Red | `#fd3d39` |
| Late | Red | `#fd3d39` |
| Late Start | Orange | `#e08613` |
| Planned | Yellow | `#ffde14` |
| Not Planned | Grey | `#808080` |

All elements start as "Not Planned" (grey). Statuses override via theming colours. When filters change, the color service checks whether the change is **color-relevant** (dateRange, status, discipline, package, etc.) and skips the full re-colouring pass if nothing meaningful changed.

## Two mapping modes

There's a feature flag `USE_VIEWERPAGE_ID_MAPPING` (default: `false`):

| Mode | How it maps | Pros | Cons |
|------|------------|------|------|
| **Parquet** (default) | `svf2-object-id-map.parquet` loaded into DuckDB | Faster initial load, no model property DB needed | Requires correct artefact selection |
| **Runtime** | `viewer.getExternalIdMapping()` or `getBulkProperties2()` | Higher match rate, auto-detects Revit vs Navisworks | Needs full model property DB loaded |

## Element tooltips (lazy names)

Since `skipPropertyDb: true`, element names aren't available from Forge. Instead:

1. On first hover, DuckDB runs `read_parquet()` directly against the remote `client-element-metas` blob URL with predicate pushdown for the specific `modelElementId`.
2. Only the matching row group is downloaded (~1-2 KB via HTTP range request).
3. Result cached in-memory (`Map<modelElementId, name>`).
4. Repeat hovers are instant.
5. A background warm-up pre-fetches parquet footer metadata so the first hover doesn't pay the full round-trip.

No `client-element-metas` parquets appear in the Network tab during initial page load — they're only fetched on hover.

## Selective fragment loading

The viewer doesn't load all fragments. It filters based on which elements have installation status data:

1. Query `element_base_data` for all dbIds with a status.
2. Build a visibility set.
3. Apply `setFragmentVisibility()` for only those fragments.

This cuts fragment count dramatically (e.g. from 14M total to 2M with status data), improving load time and GPU memory.

## Deep-dive

- Viewer architecture: [`docs/dashboard/viewer/`](../../docs/dashboard/viewer/)
- Status calculation logic: [`docs/dynamic-status-calculation-logic.md`](../../docs/dynamic-status-calculation-logic.md)
