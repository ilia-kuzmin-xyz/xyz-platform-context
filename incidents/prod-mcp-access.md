# Reaching live prod data from a Claude session — verified 2026-08-27

Written after the first live-prod session on PLT-2649. The canonical doc lives in
`XYZ_AgentPipeline/` ("Working with the prod MCP"); this file records only what was **different in
practice** from that doc, plus a recipe that needs no pipeline checkout.

**Never commit credentials here.** They are supplied per session and held in memory only.

---

## Corrections to the canonical doc

| Doc says | Actually observed 2026-08-27 |
|---|---|
| dev `https://mcp-dev.holosite.dev/mcp` "works" | **403.** WAF now blocks dev too, not just staging. Prod is the only scripted way in. |
| Needs `XYZ_AgentPipeline/`, venv, `MultiServerMCPClient` | **Not needed.** Plain `curl` + JSON-RPC over HTTP works. No repo, no venv, no `mcp` package. |
| "128 tools" | **126** on prod. `xyz-mcp-server 1.1.0`, protocol `2025-03-26`. |
| Prod MCP at `http://52.149.102.215:8080/mcp` (in `mcp-auth-context-investigation.md`, 2026-07-20) | Stale. Use `https://mcp.xyzreality.com/mcp`. |
| Whitelist = 12 projects | Login returned **33** visible projects, PA12 among them, and a project-scoped read on PA12 succeeded. Either the allowlist widened or a real user's authorization applies. Do not assume the 12-project list is current. |

## The whole recipe

```bash
cat > /tmp/mcp.sh <<'EOS'
#!/bin/bash
curl -sS -m 120 -X POST https://mcp.xyzreality.com/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":9,\"method\":\"tools/call\",\"params\":{\"name\":\"$1\",\"arguments\":$2}}"
EOS
chmod +x /tmp/mcp.sh

/tmp/mcp.sh xyz_login '{"username":"...","password":"..."}'
# -> body.auth_context_id ; pass it as auth_context_id on every later call
```

Responses are double-wrapped: `result.content[0].text` is a JSON **string** holding the XYZ
envelope. Unwrap twice. Paged reads put rows under **`body.records`** with `body.recordCount` and
`body.lastFetchedIndexId` — not under `content`, which is what the canonical doc implies and what
cost a wrong "0 rows" reading on the first attempt this session.

## The prod MCP is read-only for practical purposes

Only two write-ish tools exist across all 126, and neither touches domain data:

```
xyz_get_projects_project_id_progress_outputs
xyz_post_projects_project_id_files
```

There is **no** tool to modify capture points, activities, links or progress. Granting a session
MCP access cannot mutate customer data. Remediation still has to go through platform-api.

## Getting at parquet artefacts

`xyz_get_projects_project_id_models_artefacts` returns `fullDownloadUrl` blob links needing no auth
header. Content types seen on PA12: `project-levels`, `project-rooms`, `project-element-list`,
`element-status`, `element-room-mapping`, `activity-links`, `client-element-metas`,
`view-element-mapping`, `svf2-object-id-map`, `floor-plan` (svg), `project-room-level-mapping`.

`pip install duckdb pytz` in the session, then query the file directly. `pytz` is a real
requirement — duckdb's Python scan throws on timestamp columns without it, which is the first
error you hit on `project-levels`.

`project-levels` columns: `modelLevelId, sourceFileLevelId, levelHandle, levelName, elevation,
isRemoved, modelVersionId, userFileUploadedOn, definitionInModels, definitionInModelVersions`.

## Worth knowing for any "wrong position / stale value" incident

Comparing a **frozen row** against its **current source** is a cheap, high-yield diagnostic. On
PA12, joining 407 capture points to 99 levels found the defect under investigation *and* six other
levels quietly adrift by 0.4 m — and the levels that were not adrift matched to 0.000, which is
what turned a theory into a measurement. See
`live-incident-board-tickets/PLT-2649-groupA-360-captures/prod-mcp-findings-2026-08-27.md`.
