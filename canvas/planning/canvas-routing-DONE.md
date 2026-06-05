# Canvas URL Routing — IMPLEMENTED

> **Status: IMPLEMENTED**. Route `/canvas/:mongoProjectId` exists; `useCanvasProject` hook resolves mongoId → postgres UUID.
> Original design doc moved here from `XYZ_AgentPipeline/docs/canvas-mongo-project-routing.md`.

## What was built

- Route `/canvas/:mongoProjectId` in `src/main/webapp/app/routes.tsx`
- `useCanvasProject.ts` — reads `mongoProjectId` from `useParams`, calls `serviceProvider.ProjectApiV2.getProjectId(mongoId)`, returns `{ postgresId, name }`
- Backend: `project_id` + `project_name` accepted in `/api/chat` body; resolver short-circuits when `project_id` is explicit
- Thread store updated with explicit project on first turn

## Original design goals met

- ✅ `/canvas/:mongoProjectId` loads canvas with project locked
- ✅ First `/chat` POST contains `project_id` + `project_name`
- ✅ Resolver skipped for URL-locked sessions
- ✅ Sessions are scoped to the project from the URL

## Out of scope (still)

- Deep-link to individual threads: `/canvas/:mongoId/threads/:threadId`
- Multi-tenant slug routes
- Shareable/permalink URLs encoding artifact state
