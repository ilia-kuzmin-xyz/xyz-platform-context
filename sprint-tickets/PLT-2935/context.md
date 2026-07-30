# PLT-2935 — [Dashboard] Freeze planned progress % for sales project `69e232b2c222e55fa039eab2`

**Type:** Task · **Priority:** Minor · No parent epic.
**Jira status (as of 2026-07-30 run):** **Analysis In Progress** — blocked on clarification.
**Local decision:** DO NOT DEVELOP yet. Not 95% confident (3 open product questions, still unanswered). No hc-frontend branch, no PR.

## What the ticket asks
Sales/demo project. Backend keeps refreshing progress, so the **planned progress %**
on the dashboard keeps creeping up. For the demo it should stay fixed.

- Freeze **only the planned %** for this ONE project; actual + other widgets stay live.
- Agreed approach: **FE-only**, hidden hardcoded condition keyed on project id
  `69e232b2c222e55fa039eab2`. Match on id (stable); name not known yet.
- No attachments on the ticket.

## Domain (verified in hc-frontend, 2026-07-30)
Top-level domain = **Dashboard page** (`/projects/:projectId/dashboard`) → progress
metrics pipeline. Confirmed the planned % path is unchanged since my 2026-07-28 review:
- `.../ViewerPage/components/services/dashboard-progress/dashboard-progress-service.ts`
  - `private readonly _maxPlannedProgress$ = new BehaviorSubject<number|null>(null)` (line 131)
  - fed by `projectProgress.planned` on refresh (lines 1068, 1093, 1154)
  - exposed via `get maxPlannedProgress$()` (line 1333), completed at teardown (line 2683)
- This observable flows into the overview "Planned" card. **variance = actual − planned**
  and **SPI** are derived from planned, so freezing planned shifts them too.
- Separate planned representations also exist: the planned line on the trend chart and
  per-package planned in the discipline breakdown.
- Context docs: `dashboard/progress-tab.md`, `dashboard/data-pipeline.md`.

**Feasibility: HIGH once questions answered.** A single id-keyed guard where
`_maxPlannedProgress$` is set would freeze the headline value cleanly.

## Open questions (blockers — from my Jira comment 2026-07-28, still UNANSWERED)
1. **Freeze to what value?** Ticket says "stay fixed in its current state." Need either a
   specific planned % to hardcode (e.g. 45%) or agreement to snapshot-on-load. NB:
   snapshot-on-load is NOT a true freeze — a later reload re-captures a higher number.
   Locking to *today's* number requires the actual value hardcoded.
2. **Scope:** only the headline "Planned" overview metric, or also the trend-chart planned
   line + per-package planned? (Reading "only planned %" as overview-only — confirm.)
3. **Variance & SPI:** they're computed from planned. OK for them to track the frozen
   planned (keeps on-screen maths consistent), or keep them on the live value?

All three are product/interaction decisions, not code-feasibility. Guessing risks freezing
the wrong thing (esp. Q1 — no target value = nothing concrete to pin to).

## Why not implement now
Per workflow: reach 95% confidence first. Confidence is low purely on product intent, not
on code. My clarification comment is already on the ticket; a **duplicate** comment this run
would just be noise, so none was added — ticket left in Analysis awaiting a reply.

## Next run — what unblocks this
- A reply answering Q1–Q3 (especially the concrete value / snapshot decision in Q1).
- Once answered: branch `PLT-2935` off latest hc-frontend master, add the id-keyed freeze
  guard in `dashboard-progress-service.ts` where `_maxPlannedProgress$` is set, keep it
  hidden/hardcoded, reuse the existing observable — no new pipeline.
