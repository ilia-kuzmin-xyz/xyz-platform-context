# Agent Pipeline — Known Pitfalls

## 1. PermissionError on log file rotation (Windows)

**Symptom**: Pipeline appears stuck (no SSE events), log file error in terminal. Multiple Python processes holding the log file open.

**Cause**: `RotatingFileHandler` on Windows can't rotate when another process holds the log file. Stale `uvicorn --reload` worker processes accumulate. `sse_starlette` and `httpx` emit DEBUG logs for every SSE chunk — megabytes of log output.

**Fix**: 
```python
logging.raiseExceptions = False   # suppress PermissionError from logging itself
handler = RotatingFileHandler(..., delay=True)  # don't open until first write
for _noisy in ("httpcore","httpx","sse_starlette","mcp.client.streamable_http","watchfiles"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)
```
Kill all stale Python processes before restarting (`Get-Process python | Stop-Process`).

## 2. PowerShell mangles JSON in `-d` flag

**Symptom**: Pipeline returns 500 / validation error on POST. Request body is malformed.

**Cause**: PowerShell interprets single/double quotes in `-d '{...}'` differently from bash. JSON keys and values get corrupted.

**Fix**: Write the body to a file, then use `--data "@file.json"`:
```powershell
'{"message":"test","project_id":"..."}' | Out-File body.json -Encoding utf8
curl.exe http://localhost:8000/api/chat --data "@body.json" -H "Content-Type: application/json"
```

## 3. Thread store evicted — EDIT turns lose context

**Symptom**: Follow-up questions after pipeline restart generate an artifact with no prior art — fully recreated from scratch instead of edited.

**Cause**: `thread_store` is in-memory only, wiped on restart. `last_artifact` absent → composer gets no prior TSX.

**Fix**: Frontend sends `prior_artifact: { tsx, title, summary, domainsRead }` in the request body on EDIT turns. Pipeline uses it when `thread.last_artifact` is absent. Already implemented in `useCanvas.ts`.

## 4. Profile stubs mixed with hydrated data in T2

**Symptom**: Hydrated domain returns counts but no row arrays.

**Cause**: Phase 0b profile output has the same domain keys as Phase 2 hydrated output, but profile values are stubs (no rows). If profile data is accidentally cached in T2 under the same key as hydrated data, subsequent requests serve stubs instead of full payloads.

**Rule**: T1 (profile cache) and T2 (project data cache) are completely separate objects. Never store profile output in T2. Profile is keyed by `project_id` only; T2 is keyed by `(project_id, ProjectDataKey)`.

## 5. `artifact_error: truncated at N chars`

**Symptom**: Dashboard renders with incomplete or invalid TSX.

**Cause**: Composer hit `max_tokens`. The streaming response was cut mid-JSON.

**Behaviour**: Composer auto-retries up to 3× with assistant prefill (re-feeds the truncated head back). If all retries fail, `artifact_error` is emitted.

**Fix**: Reduce component complexity (fewer widgets, shorter prompt). Edit `agents/artifact_composer.py` to tighten the layout constraint.

## 6. MCP auth expires mid-stream

**Symptom**: Hydrator silently returns empty data; log shows 401 from MCP tool call.

**Cause**: The MCP session token expired during a long Phase 2 hydration run.

**Behaviour**: `mcp_client.py` catches 401 and re-runs `xyz_login` (30-second retry cooldown). The affected domain hydrator retries. If cooldown fires too often (heavy parallel load), hydrations for that domain fail and `artifact_data_complete` will list it in `failed`.

**Detection**: Check `failed` field in `artifact_data_complete` event, or look for `401` in pipeline logs.
