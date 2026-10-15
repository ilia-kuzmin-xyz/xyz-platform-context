# PLT-3286 — Infinity Canvas: dev test findings (26.4.1, 14 Oct 2026)

- **Type:** Bug (Minor), label `InfinityCanvas`
- **Reporter:** Ilia Kuzmin (self-reported from a dev test session)
- **Jira status:** `Analysis In Progress` — **parked, awaiting one answer** (see § The one question)
- **Domain:** Canvas page (`/projects/:mongoId/canvas`) → report-data + panel overlay
- **Repro session:** API 2 FULL PROJECT -xv2, report "Activities behind schedule",
  `https://frontend.holosite.dev/projects/68b19ae480f11301198805f0/canvas/0b8caecc-b316-45f6-b1ba-b8d644fe0229`
- **First touched by scheduled run:** 2026-10-15

## 2026-10-15 — intake

Four findings in one ticket. They do **not** share a disposition, and that is the
main thing a later run needs to know before opening a branch.

| # | Finding | Repo | Verdict at intake |
|---|---|---|---|
| 1 | Planned progress read at the plan's end, not the data date | hc-frontend | **blocked on a product decision** |
| 2a | `explain` answer waits ~60 s before showing | hc-frontend | **ready** — cause confirmed in code |
| 2b | `explain` answers with definitions, not the "why" | XYZ_AgentPipeline | out of this session's repo scope |
| 3 | No spotlight ring on the changing panel while Inspect is open | hc-frontend | **ready** — cause confirmed in code |
| 4 | Composer panel: unrounded floats, overlapping rows | XYZ_AgentPipeline | out of this session's repo scope |

`XYZ_AgentPipeline` is not attached to the agent session (scope is hc-frontend,
xyz-platform-context, XYZPlatformApi, hc-iam), so 2b and 4 cannot be implemented
from here at all. They want their own ticket.

## The one question (why this is not Ready For Development)

The ticket's "Expected" for finding 1 is **self-contradictory on this project**, and
the contradiction decides the headline numbers.

> "values at the data date (or the last date with actual progress recorded), matching the dashboard"

Three candidate reference dates, three different answers:

| Candidate | On the cited session | Where it comes from |
|---|---|---|
| Schedule revision's data date | 2026-01-23 | `/schedules` → `dataDate` (`schedule-api-service.types.ts:8`) |
| **What the dashboard actually does: today, capped to the data range** | 2026-10-15 | see below |
| Plan end (today's canvas behaviour — the bug) | 2028-01-29 | last parquet row |

**The dashboard does not read at the data date.** Verified, not assumed —
`dashboard-progress-service.ts:318-323`:

```ts
const today = new Date().toISOString().split('T')[0]
const cappedEndDate = range.endDate < today ? range.endDate : today
this._dashboardFilterService.setDateRange(range.startDate, cappedEndDate)
```

`range.endDate` is `MAX(finishDate)` from `api_activities` — the plan end. It is then
capped at **today**. The comment on that line says the cap matches the slider's own
initial selection in `date-range.tsx`, so this is the dashboard's default view, not a
transient.

On a live project data date ≈ today and the two coincide, which is why the
expectation reads as one thing. On this project they are **9 months apart**: actual
progress is carried forward flat, so actual% is the same either way, but planned%,
variance and SPI are materially different. Shipping either reading can be rejected on
the other half of the sentence.

The third reading ("last date with actual progress recorded") is not directly
derivable: the parquet carries no data-date column
(`docs/dashboard/api/planned-and-actual-project-schema.md`), and because actual is
carried forward every row *has* an actual — it would have to be inferred as "last
date where actual increases", which is fragile on a plateau.

→ **Do not start finding 1 until this is answered.** It is one closed question and it
is the whole substance of the finding.

## Findings 1 — where the fix goes once the date is chosen

All four sites read "the last row" and would need the same cut:

- `pages/CanvasPage/services/report-data/progress.ts`
  - `headline()` line 148 — `dated[dated.length - 1]`
  - `progressPayload()` line 171 — `as_of` from the same last row
  - `latestByCategory()` line 105 — per-category max date (feeds `disciplines_detail`,
    which is what the "Furthest behind plan" panel reads, hence every category at 100%)
- `pages/CanvasPage/lib/filterProgress.ts`
  - `shapeOf()` — `curve[curve.length - 1]` for actual/planned/variance/`as_of`
  - the category query's `WHERE "CalendarDate" = (SELECT MAX(CalendarDate) …)`

The S-curve `rows` / `curve` should **keep** running to the plan end — the curve is
meant to show the full plan. Only the headline and the per-category snapshot move.

`filterProgress.prepare()` already fetches `/schedules` and resolves
`currentRevision(revisions)`, so the revision's `dataDate` is one field away on that
path. `progress.ts` does **not** currently fetch schedules — it builds from the two
progress parquets only, so wiring a date in there is the larger half of the change.

Also named in the ticket: `XYZ_AgentPipeline/agents/terms.py` 182–187 defines
`actual_now` / `planned_now` / `spi_now` / `progress_as_of` as "on the latest date",
and the Data Inspector shows that wording. If the FE definition moves, the vocabulary
text has to move with it or the inspector will contradict the panel. Pipeline repo —
flag it on whichever ticket covers 2b/4.

## Finding 2a — ready, cause confirmed

`useCanvas.ts:1371`, in the `ask_spec` handler:

```ts
if (data) extra = data.ensure(REPORT_DOMAINS)
```

`REPORT_DOMAINS` is every builder key (`report-data/index.ts:65`). Line ~1155 then
blocks the stream on it:

```ts
if (event.type === 'artifact_data_complete') await extra
```

An `explain` spec reads no rows at all. Confirmed twice over, so this is not a guess:

- `canvas.types.ts:705-707` — "`explain` runs nothing. The model only pointed at
  terms; the pipeline attached the panel and the vocabulary…"
- `askExecutor.ts:116-118` — `if (spec.type === 'explain') return base`, before `data`
  is even looked at.

So for an `explain` turn the whole domain load is dead weight, and it is exactly the
~60 s the ticket measured. Fix is to not start it for `explain`. Keep `unanswerable`
on the existing path — its `fn` is still compiled and run.

## Finding 3 — ready, cause confirmed

`CanvasPage.tsx:478-487` mounts **two** `PanelSelectionOverlay`s. The second is the
Inspect one and is the only one given `spotlight`:

```tsx
<PanelSelectionOverlay active={inspecting && !sketchOpen} mode='inspect'
  … spotlight={spotlightOf(hoveredPanel, changingNow(isStreaming, changingPanel))} />
```

`PanelSelectionOverlay.tsx:265-300` draws the ring inside `if (!active) { … }` and
returns early from it. With Inspect open `active` is `true`, so that branch never runs
and the ring is dropped — matching the report exactly (ring shows with Inspect closed,
not with it open).

The fix is to draw the ring in the `active` branch too. Not a pure move: the active
branch already paints zone boxes and a selected/hovered state, so the ring needs to
stay distinguishable from those rather than being pasted in. Extracting the ring into
one small component used by both branches is the obvious shape.

## State / next run

- Clarification posted on the ticket 2026-10-15, prefixed "Claude here", from Ilia's
  account. **No reply yet.**
- Nothing implemented, no branch opened.
- If the answer lands: findings 1, 2a and 3 are all hc-frontend and can go on one
  `PLT-3286` branch off master. 2a and 3 are independent of the answer and could go
  first if the decision drags.
- 2b and 4 need a pipeline ticket raised by a human — not raisable from this session.
