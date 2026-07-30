# PLT-2883 — Infinite Canvas: verify agent pipeline generates a proper "Room Readiness" dashboard

- **Type:** Task · **Parent:** PLT-2639 (Infinite Canvas, Done) · **Priority:** Major
- **Jira status:** Analysis In Progress
- **Domain:** Canvas / Agent Pipeline (backend `XYZ_AgentPipeline/`; FE surface = `app/pages/CanvasPage`)

## Ask
End-to-end verification that the Canvas agent pipeline reliably produces a proper **Room Readiness** dashboard (the dashboard-type to be the main one tested on prod). Pipeline already works with the api-v2 MCP.

## Analysis state (as of 2026-07-14)
- **BLOCKED — awaiting product/human answer.** Clarification comment left on Jira (2026-07-10, "Claude here").
- This is an env-dependent QA/verification task: the pipeline lives in the **XYZ_AgentPipeline backend repo** (NOT present in the hc-frontend checkout — confirmed) and needs a live env (ANTHROPIC_API_KEY, XYZ_MCP_SERVER_URL, live project data) + manual Canvas runs. Not executable from the frontend repo alone.

## Open questions (raised, unanswered)
1. What defines a "proper" Room Readiness dashboard — required widgets/data domains + pass/fail acceptance criteria?
2. Which project(s) / environment to verify against?
3. Any code change expected (e.g. composer-prompt tuning) or purely QA for whoever has env access?

## Next step
Do NOT start dev. Resume once the 3 questions are answered on Jira. Confidence to implement: low (2/10) — cannot act without env + acceptance criteria.
