# PLT-2524 — Configure for planned and actual progress to track when parquet last updated

**Priority:** Critical · **Epic:** PLT-1792 [PLT] View % Planned and % Complete (Done)
**Reporter:** Darminder Atker · **Design ticket:** UX-1114 (Ready For QA, Jason reviewed & happy)
**Domain:** dashboard → PRG progress + DAT data pipeline

---

## 2026-09-22 — first pick-up. Moved Ready For Development → Analysis In Progress

Picked this up because it was the only Critical / Ready-For-Development item on the board.
Did **not** implement. Posted a clarification on the ticket (comment 112746) and transitioned to
**Analysis In Progress**.

### What the ticket asks for

Two scenarios in Darminder's description:

1. user uploads a new schedule and the planned/actual values **have not been calculated yet** —
   nothing tells them;
2. user is mid-session in the editor, the values **have** been recalculated, and they don't know.

Mostafa (21 Jul) attached a proposed design and said it "will sit as a tool tip for actual progress
calculation". UX-1114 frames it as an indicator "within the schedule view" that must not "disrupt
the schedule table layout", with a distinct state for stale / not-yet-updated.

### What I established in the code (the useful part — carry this forward)

**The API dependency everyone assumed is already satisfied.** Darminder's opening comment says this
"most likely [needs] an update on API side to notify frontend of an update". That is out of date:

- `GET /api/v2/projects/{projectId}/progress-outputs` already returns **`calculatedOn` per output**
  — `ProgressOutputItem.calculatedOn` at
  `app/services/progressOutputsService/progress-outputs-api-service.ts:12`, and the item list covers
  the `activity`, `category-groups` and `project` hierarchy levels (`:9`).
- The frontend already reads it: `ProgressOutputsV2Loader.fetchOutputs()`
  (`.../dashboard-progress/loaders/progress-outputs-v2-loader.ts:69-88`) takes the **max of
  project-level + category-groups only** (`:81-82`) and exposes it via
  `DashboardProgressService.calculatedOn$` (`dashboard-progress-service.ts:1481`).
  **The activity-level output's own `calculatedOn` is available but currently unused.**
- It is already on screen once: `progress-panel.tsx:277-290` prints
  `Last updated: ${formatCalculatedOn(calculatedOn)}` (helper at `:20-38`, relative under 24h,
  absolute after).

**The "not calculated yet" state is already detectable too.** `hasProgressOutputs()`
(`progress-outputs-v2-loader.ts:99-104`) deliberately distinguishes "progress has never been
calculated" (legitimate empty state) from a partial/broken calculation. So scenario 1 needs no new
data either.

**Both target surfaces are parquet-derived — worth knowing, because they are *different* parquets.**

| Surface | Values | Source |
|---|---|---|
| Progress panel overview (Actual/Planned/Variance/SPI) | `use-progress-metrics.ts:19-34` | `project_progress` / `category_groups` parquet |
| Gantt grid `Actual %` / `Planned %` columns | `gantt/scheduler-columns/scheduler-columns.tsx:76-107` | `activity_progress` parquet, joined onto activities — see `use-dashboard-schedule-data.tsx:268`, whose comment reads *"null when progress parquet unavailable → column shows '-'"* |

So "last updated" is not one number; the schedule columns and the progress panel can in principle
have different `calculatedOn` values.

### Why I did not implement

1. **Placement is explicitly undecided.** UX-1114's own Notes say "Consider whether the indicator
   lives at column header level, row level, or as a page-level notification and whether it should be
   persistent or dismissible". The resolution is in the attached PNG (Jira attachment `61259` on
   UX-1114, `61260` on PLT-2524) — **`GET .../attachment/content/61259` returns 403 for this
   session, so I cannot read the design.** This is the hard blocker.
2. **Nothing defines "stale".** UX-1114 requires "a distinct visual state … for when data is
   considered stale" but no threshold exists anywhere — an hour? a day? since the last schedule
   upload?
3. **Scenario 2 is a different feature from the tooltip.** Telling a user mid-session that the
   figures moved means polling the outputs API while the dashboard is open, plus its own
   banner/toast UX and dismissal rules. Not derivable from the ticket.

**Confidence to implement blind: 4/10.** (Approach clear; the acceptance artefact is unreadable.)

### If the answers come back, the shape of the work

- Extend `ProgressOutputsV2Loader` to also surface the **activity-level** `calculatedOn` (currently
  dropped at `:81`), so the Gantt columns can show their own timestamp rather than the panel's.
- Tooltip on the two Gantt column headers. dhtmlx column `label` accepts an HTML string, so a
  `title`/custom tooltip is feasible without a React portal — check how other columns do it before
  inventing a pattern.
- Reuse `formatCalculatedOn` from `progress-panel.tsx:20` rather than writing a second formatter —
  move it somewhere shared if both surfaces need it.
- Staleness state and the mid-session notification both wait on the product answer.

### Open — needs a human

- **Darminder / Mostafa / Jason**: placement (column header vs row vs banner), staleness threshold,
  and whether the mid-session "recalculated" notification is in scope here or a follow-up.
  Asked in comment 112746.
- Someone with Jira attachment access should paste the design into the ticket body as text, or
  describe it, since the agent session cannot fetch attachments (403).
