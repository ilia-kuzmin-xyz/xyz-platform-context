# PLT-2883 — Verify agent pipeline generates a proper "Room Readiness" dashboard

**Type:** Task · **Status at pickup:** Open · **Domain:** Canvas / Agent Pipeline (backend)

## Description
"The Canvas agent pipeline already works with the api-v2 MCP and knows its structure.
Task: double-check everything end-to-end so the pipeline reliably generates a proper
**Room Readiness** dashboard — the dashboard-type to be tested as the main one on prod."

## Assessment (this run)
- This is a **verification / QA** task, not a code change.
- The pipeline lives in the **`XYZ_AgentPipeline/`** FastAPI repo (see agent-pipeline/README.md),
  which is **outside this session's GitHub scope** (only `hc-frontend` + `xyz-platform-context`).
- Executing it needs a **running environment**: `ANTHROPIC_API_KEY`, `XYZ_MCP_SERVER_URL`,
  live project data, and manual end-to-end runs on the Canvas page (`Ctrl+Shift+D` dev overlay).
- Cannot be completed autonomously in a code-only session.

## Decision
→ Move to **In Analysis** + clarifying comment. Needs human/env access, or a scoped
definition of what "proper Room Readiness dashboard" acceptance looks like (which widgets,
which data domains, pass/fail criteria) before any code-side follow-up (e.g. composer prompt
tweaks) could be planned.

## Confidence: 2/10 (research only — cannot implement without env + backend repo)
