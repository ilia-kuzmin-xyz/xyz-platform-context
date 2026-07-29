# DAT — Data Contracts

## `POST /api/chat` request body

```json
{
  "message":           "show me issues for this week",
  "thread_id":         "uuid (omit to start a new thread)",
  "use_cache":         true,
  "mode":              "dashboard",
  "project_id":        "postgres-uuid (optional — from URL /canvas/:id)",
  "project_name":      "optional — paired with project_id",
  "clarifier_answers": { "q1": "value" },
  "skip_clarifier":    false,
  "sketch":            { "shapes": [{ "x":0, "y":0, "w":6, "h":4, "label":"Issues" }] },
  "panel_context":     { "panelId": "panel-1", "panelLabel": "Issues", "comment": "add severity" },
  "prior_artifact":    { "tsx": "...", "title": "...", "summary": "...", "domainsRead": [] },
  "domains":           ["issues","progress"]
}
```

`prior_artifact` — fallback TSX for EDIT when `thread_store` was evicted (pipeline restart). Frontend sends it on EDIT turns against a restored session.

`domains` — filter hydrators to only these domains (used with `mode:'hydrate'`).

---

## SSE event sequence

```
session_created         { threadId, pipelineVersion }
thread_context          { project_id, project_name, turn_count, has_prior_artifact }
intent_step             { phase, status, summary, detail }      (many — transparency log)
status                  { message }
agent_io                { agent, model, input, output, tool_calls }
data_profile            { profile, cache: 'hit'|'miss' }

  ─── clarifier path (FRESH, ambiguous) ───────────────────────────────
  clarifier_questions   { questions, original_message }
  done                  { reason: 'awaiting_clarifications' }   ← stream ends here
  ─────────────────────────────────────────────────────────────────────

artifact_pending
artifact_token          { delta, chars, elapsed_ms }            (many)
artifact_progress       { phase, chars, elapsed_ms }            (heartbeat ~1 s)
artifact_skeleton       { artifact: { title, summary, domainsRead, tsx } }

artifact_data_partial   { domain, payload }                     (one per domain, order not guaranteed)
artifact_data_complete  { domains, failed }

done                    { total_elapsed_s, model, input_tokens, output_tokens, estimated_cost_usd }

# Error variants
artifact_error          { message, code?, raw_head?, raw_tail? }
artifact_rate_limited   { attempt, max_attempts, retry_after_s, message }
ask_spec                { spec: { type, label, fn, followUp, domainsRead } }   (ask mode)
ask_error               { message }
error                   { message }
```

---

## Profile shape (Phase 0b output — `data_profile` event)

```json
{
  "project":  { "available": true,  "id": "...", "name": "..." },
  "issues":   { "available": true,  "total": 1420, "count": 1420, "scale": "rich", "sample": {...} },
  "progress": { "available": true,  "actual": 0.62, "planned": 0.58, "disciplines": [...] },
  "schedule": { "available": true,  "activity_count": 340 },
  "media":    { "available": true,  "photo_count": 2100, "capture_count": 890, "room_count": 372, "level_count": 4 }
}
```

These are lightweight stubs — counts and one sample row per domain. Full row arrays are NOT present. Do not treat profile key presence as "domain hydrated" — see [canvas pitfalls #1](../canvas/pitfalls.md#1-profile-stub-false-satisfaction-dashboard-mounts-with-empty-data).

---

## Hydrated domain payloads (Phase 2 — `artifact_data_partial` events)

**issues** `{ total, open, closed, pending, issues: [{id, title, status, severity, category, assignee, date, days_open, position?}], by_category, by_severity, _hydrated: true }`

**progress** `{ actual, planned, variance, rows: [{date, actual, planned, baseline, spi}], disciplines_detail, _hydrated: true }`

**schedule** `{ activity_count, activities: { all, overdue, in_progress, upcoming, completed, ..._count }, _hydrated: true }`

**media** `{ photo_count, capture_count, room_count, photos: [{url, caption, date}], rooms: [{roomId, name, level, thumbnailUrl}], rooms_geometry: [{room_id, polygons, center}], _hydrated: true }`

---

## Artifact TSX component signature

```typescript
function App(props: { data: ProjectData; theme?: 'light' | 'dark' }): React.ReactElement
```

`ProjectData` shape mirrors the hydrated payloads above. The component must handle any domain being `undefined` (data may arrive after TSX mounts, or a domain may be unavailable for the project).

---

## Other endpoints

`GET /api/health` → `{ ok, version, profile_cache }`

`POST /api/profile-cache/clear` → clears T1 cache globally

`POST /api/cache/invalidate` → `{ project_id, keys?: string[] }` — empty keys clears T1 + all T2 for that project

---

## 3D Viewer colour mapping (INTERACTIVE viewer intent)

**Model**: hardcoded `claude-fable-5` (`agents/config.py`). Fable = always-on thinking (send NO `thinking` param), needs larger `max_tokens` (thinking shares the budget), inconsistent `\uXXXX` escaping (see FE pitfall 14).

Phase 0b½ classifies viewer intent (NONE/DISPLAY/INTERACTIVE). Only INTERACTIVE runs the parquet mapper (Phase 0d).

**Clarifier promotion**: broad prompts never name the model, so the keyword classifier can't infer INTERACTIVE. The clarifier's multi-select "which sections?" question (rule 8 = the only multi_select) gets a **"3D viewer"** option appended when `capabilities.viewer`. If the user ticks it, `server.py` overrides the decision to INTERACTIVE.

**Mapper** (`agents/viewer_mapper.py`): downloads `svf2-object-id-map` + `element-status` + `activity-links` parquets, JOINs via pandas → per-element `{dbId (=objectId), modelElementId, installationStatus, activityId}`. Cached in T2 (`VIEWER_MAPPING`, 2h). ~1.4M elements on a full project.

**Wire format** (`to_wire_format()`): the full mapping is ~140MB JSON → crashes the browser. Ship GROUPED instead:

```json
{ "format": "grouped-v2",
  "statusDbIds": { "Installed": "<encoded>", "Late": "<encoded>", … },
  "roomDbIds":   { "<room_id>": "<encoded>", … },   // Room Readiness only
  "issueElements": [ /* full records, issue-linked only */ ],
  "totalElements": 1404520, "statusElements": 1044589 }
```

**dbId groups are sorted-delta base36 strings**, `.`-separated (`encode_db_ids()`
server-side, `decodeDbIds()` in `ForgeViewerStatic.ts`; the viewer still accepts
plain int arrays so an older cached mapping keeps rendering).

This is not a micro-optimisation — it is what keeps the canvas loadable. The
whole mapping is serialised into the **Sandpack VFS** as `/viewer-mapping.json`,
and past roughly 9MB the bundler dies with `Couldn't connect to server /
TIME_OUT` before it boots. Measured on the reference project:

| | int arrays | delta+base36 |
|---|---|---|
| `statusDbIds` | 8.19 MB | 2.10 MB |
| `roomDbIds` | 1.19 MB | 0.36 MB |
| **whole wire** | **9.37 MB** | **2.46 MB** |

Adding `roomDbIds` at 1.19MB was what pushed it over the edge, so any future
addition to this payload needs the same scrutiny.

~8MB. SSE `viewer_mapping` carries this; `viewer_config` carries the palette (`build_viewer_config`, deterministic — field + INSTALLATION_STATUS_PALETTE). Both emitted in Phase 0d, BEFORE `artifact_skeleton`.

**`roomDbIds`** appears only when the Room Readiness template is active. The rooms rollup returns a room→`modelElementId` index; `to_wire_format(mapping, room_element_ids)` trades it for dbIds **server-side** so no GUID ever reaches the browser. Rooms that resolve to zero dbIds are dropped — isolating to an empty set reads as a broken viewer, and the component falls back to the whole building. Measured on the reference project: 502/502 rooms, 151,296 of 161,519 room-mapped elements resolved (93.7%), +1.34MB.

This is why **Phase 0c½ (rooms) runs before Phase 0d (viewer mapper)** — the index must exist while the wire format is built. Both are sequential and pre-compose, so the order is free.

**`GET /api/viewer-mapping/{project_id}`** → the grouped wire mapping **plus** a bundled `config` (so FE restore works even when the persisted config is absent). Used by the FE to refetch on session restore (the mapping is too big to persist). 404 if the project has no viewer parquets. **`?rooms=1`** additionally resolves `roomDbIds`, at the cost of a second ~60MB parquet join — only pass it when the restored artifact actually uses room isolation.

Palette keys (exact): `Installed`, `Installed Early`, `Planned`, `Late Start`, `Late`, `Not Planned`.
