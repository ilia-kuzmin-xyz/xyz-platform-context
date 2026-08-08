# PLT-2963 — Infinite Canvas: speed up report generation and viewer data preparation

**First seen 2026-08-08.** Status was `Open` (eligible). **Moved to `Analysis In Progress` +
clarification comment posted** (comment id 109177).

## ⭐ Headline: near-total overlap with PLT-3025 (which is Dev In Progress)
Compared line by line against `../PLT-3025/context.md` and the live ticket, **PLT-3025 restates**:
the same baselines on the same project (API 2 FULL PROJECT -xv2, 1.4M elements / 502 rooms;
hydration 30–50s, rooms rollup ~60s, warm ~2.4s), the same *"move MCP reads onto the faster
schema"*, the same *"pre-warm on project open"*, the same
`xyz_get_projects_project_id_schedules_schedule_revision_id → request_failed` trap **verbatim**,
and the same acceptance criterion **including the unfilled `<target>` placeholder**.

PLT-3025 then adds the T1/T2 server-side persistence design and a second, unrelated half
(published reports as dashboard tabs).

**Proposed split, offered on the ticket:**
- **PLT-2963 = the viewer / first-paint half** — mount the viewer independently of the rest of the
  report, stop it blocking first paint, persist the 2.46MB mapping with the session.
- **PLT-3025 = the caching / persistence half.**

These are genuinely independent and touch different code. Left as-is, both tickets re-point the
same fetches at the same new schema and will collide.

## Other blockers raised
- **`<target>` is literally unfilled** in the acceptance criteria of *both* tickets. Not signable.
- **Repo scope:** most of half 1 lives in `XYZ_AgentPipeline/`, which is **not in this routine's
  accessible repo set** (hc-frontend, xyz-platform-context, XYZPlatformApi, hc-iam). Only the
  viewer/first-paint items are actionable from here.

## Domain reading (already in this repo — don't start from code)
`agent-pipeline/caching.md`, `agent-pipeline/phases.md`, `canvas/artifact-and-hydration.md`,
`canvas/project-data-cache.md`, `dashboard/README.md`.

## Confidence
**3/10** as written (duplication + unspecified target + repo scope).
**7/10 for the frontend/viewer half alone** if the split is agreed — that part is well specified
and does not depend on the caching work.
