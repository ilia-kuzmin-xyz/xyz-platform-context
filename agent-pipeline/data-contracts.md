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
