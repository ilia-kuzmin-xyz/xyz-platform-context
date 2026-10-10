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

## 2026-09-25 — still blocked, no answer yet

Re-checked the ticket. **No reply to comment 112746** (posted 22 Sep). Last activity on the
issue is still that comment. Left in **Analysis In Progress**; deliberately did not re-comment,
since a second ping adds nothing the first did not already ask.

Everything in the 09-22 entry above still stands — in particular that the API half is already
done (`calculatedOn` per output) and the blocker is the unreadable design PNG plus the
undefined staleness threshold. Nothing to implement without those.

## 2026-09-27 — still blocked, but the design ticket has moved

**No reply to comment 112746** (22 Sep). Left in **Analysis In Progress**, no second ping.

**What did change:** the blocking design ticket **UX-1114 is now `Ready For QA`**, and its
comments show Jason reviewed it and was happy (13 Aug). So the design half of the 09-22
clarification may now be answerable — the remaining unknown is the *content* of the two PNGs
(UX-1114 attachment 61259, and the same image on this ticket as 61260), which this run could
not open either: Jira attachment content needs credentials the MCP tools do not expose.

So the blocker is narrower than it was: it is no longer "is there a design?" but "what does the
design say?". Someone with Jira access can answer it in one look. The three questions from
09-22 stand otherwise — placement (tooltip on the schedule's Actual %/Planned % columns?),
what threshold counts as stale, and whether the mid-session "it has been recalculated"
notification is in scope here or a follow-up.

The 09-22 code findings are unchanged and still the useful part: `calculatedOn` already
ships per output, the frontend already reads it, and no new DPL/API work is needed for the
"last updated" half.

## 2026-09-28 — scheduled run: bumped the clarification, and a path correction

**Posted a nudge** (comment 113109) — the first re-ping since the original on 22 Sep. Two earlier
runs (09-25, 09-27) deliberately declined to bump; at six days on a **Critical** with the blocker
now narrowed to a one-look question, that balance flipped. Kept it short and pointed the three
questions at Darminder / Mostafa by name. Still **Analysis In Progress** — not started.

Re-confirmed this run that the attachment really is unreachable, rather than assuming it from the
earlier note: `GET .../attachment/content/61259` returns **403** with no Atlassian credential in the
session environment. So "someone paste what the design says" stays the ask.

### Correction to the 09-22 entry — the loader path was wrong

The 09-22 entry located `ProgressOutputsV2Loader` at
`app/pages/organisation/DashboardPage/dashboard-progress/loaders/progress-outputs-v2-loader.ts`.
**That path does not exist.** The file actually lives under the *ViewerPage* service tree:

```
src/main/webapp/app/pages/organisation/ViewerPage/components/services/dashboard-progress/loaders/progress-outputs-v2-loader.ts
```

Everything else in that entry verified first-hand against current master and is unchanged:

- `fetchOutputs()` at **:69-88**;
- the max-of-two resolution at **:81-82** — `[projectLevel?.calculatedOn, categoryGroups?.calculatedOn]`,
  sorted descending, first taken. The **activity-level** output's own `calculatedOn` is still
  dropped here, which is the extension point if the Gantt columns need their own timestamp;
- `hasProgressOutputs()` at **:99-104`, whose doc comment still draws the "never calculated"
  vs "partial/broken" distinction that scenario 1 needs.

Worth carrying forward generally: **dashboard-progress lives under `ViewerPage/components/services/`,
not under `DashboardPage/`.** That mis-location cost a wrong path in these notes for six days and
would have sent the next run looking in the wrong tree.

## 2026-09-29 — scheduled run: still blocked, no ping (bumped yesterday)

**No reply** to comment 113109 (the 28 Sep bump) or to the original 112746 (22 Sep). Left in
**Analysis In Progress**. Deliberately did **not** ping again: a second nudge one day after the
first, on the same unanswered question, is noise rather than progress. The 09-28 entry's
proportionality reasoning applies in the other direction now — the bump has been made, it needs
time to land.

**One new angle checked and closed off this run.** Rather than re-assert "the attachment is
unreachable", tried a different route to the design: the Atlassian MCP's `fetch` tool. It only
resolves Jira issue / Confluence page ARIs, not attachment content, so it cannot reach the PNG
either. Also re-read **UX-1114 in full** — its description and both comments — on the chance the
design was described in text somewhere. It is not: the description restates the same open
question this ticket is stuck on ("Consider whether the indicator lives at column header level,
row level, or as a page-level notification and whether it should be persistent or dismissible"),
and the only two comments are Darminder asking for Jason's review and confirming he was happy.

So the design exists and is signed off, but it exists **only as an image**, and no agent session
can read it. That is now verified from two directions rather than assumed. The ask is unchanged
and still a one-look job for anyone with normal Jira access.

Everything in the 09-22 / 09-28 entries stands, including the corrected loader path
(`ViewerPage/components/services/dashboard-progress/loaders/progress-outputs-v2-loader.ts`).

## 2026-09-30 — master catch-up only

PR **#2251**, green on arrival (`build` + Sonar success on `4b5f170`).

- **Checkpoint 1:** one thread open, unchanged — Copilot's "add a unit test for the polling hook"
  (initial request, 5-minute refresh, failure, project-id change, interval cleanup). Left open
  again, deliberately: **the test suite could not be run locally this run** (see PLT-3139's
  2026-09-30 entry — the gantt-stub workaround was refused by the sandbox), and a fake-timer test
  around a self-scheduling poll is exactly the kind that passes locally and fails CI. This ticket's
  own history has the precedent: an unhandled rejection failed the build with all 5705 tests green.
  Writing it blind is how that happens again.
- **Checkpoint 2:** green.
- **Checkpoint 3:** was 2 behind. Merged master — **no conflicts** (this PR is dashboard/PRG, the
  two new commits are commissioning) — pushed `b919cc9`.

## 2026-10-07 — master merged into the PR and pushed; all checkpoints clear

Checkpoint 1: nothing to action — every review thread on #2251 is resolved (8 of 8), and no new
review or comment has arrived since the last run.

Checkpoint 2: CI was green on the previous head and is re-running on the merged one.

Checkpoint 3: done. The branch had drifted 3 commits behind master (`b8e1da0` PLT-3172,
`959f1ad` PLT-3223, `95e1003` PLT-2910). Merged and pushed as `f1ff638` on
`task/PLT-2524-progress-freshness-tooltip`.

Verified rather than assumed — npm works this run (stub workaround per PLT-3152/context.md), so
**22 tests pass** on the merged head across `gantt-x/scheduler/` and `progressOutputsService/`.
`git merge-tree` reported no conflicts beforehand and file overlap with the three master commits
was zero.

The overlap worth having checked: PLT-3172 adds
`gantt-x/scheduler/hooks/use-linked-element-actions.ts` — same directory as this PR's
`use-progress-calculated-on.ts`. Different files, and both suites pass together on the merged
head, so the adjacency is benign.

## 2026-10-08 — unblocked and implemented by someone else; this file's "blocked" entries are superseded

**Status is now `In Code Review`** (ticket last updated 2026-10-02T13:40:35). So between 29 Sep and
2 Oct the question that blocked every run above got answered and the work got done — not by this
agent, and not through the ticket, because:

**The clarification comments are gone.** Every "Claude here —" comment this file records posting is
no longer on the issue. PLT-2799 now has **zero** comments; PLT-2524 is back to the five that
pre-date them. Both tickets were also updated within the same second of each other
(`13:40:35.5` and `13:40:35.9` on 2 Oct), which is the signature of a bulk edit or a sprint-wide
transition rather than two people working two tickets.

**Do not re-raise these questions.** The repeated reasoning above — "no reply, left in Analysis,
deliberately did not ping" — was correct at the time and is now spent. A fresh run arriving at
these tickets should read the implementation, not re-litigate the clarification.

**What stays useful** from the entries above is the code archaeology, which was verified first-hand
and is independent of the ticket's state: for PLT-2524, that `calculatedOn` already ships per
progress output and the frontend already reads it (no DPL/API work needed), plus the corrected
loader path under `ViewerPage/components/services/`; for PLT-2799, that
`ChecklistLibraryService.update()` already cuts version n+1 and repoints `current_version_id`,
and that `rename()` deliberately cuts no version.

**Worth noting as a pattern, not a grievance:** an agent's clarification comments are not durable.
Twice now the record of *why* a ticket stalled has vanished from the ticket while surviving only
here. That is an argument for this folder, not against commenting — but it means the context file
is the system of record for an agent's reasoning, and the Jira comment is a best-effort copy.

## 2026-10-10 — the tooltip was reading the wrong run; Copilot caught it

**This repo had already called it, and the implementation did it anyway.**
`dashboard/data-pipeline.md:178` (written 09-22, *while picking up this ticket*) ends:

> Any future "last updated" indicator on the Gantt columns should surface the
> activity-level timestamp rather than reusing `calculatedOn$`, or it will quietly
> claim a freshness the grid does not have.

The first cut of this PR reused the aggregate rule anyway — `resolveCalculatedOn`
took `max(project, category-groups)` for both the panel and the grid. Copilot
flagged it on 10-10; fixed in `5acc3d9dd`.

### Why it mattered more than a mismatch

`calculatedOn` is per-output, and the runs genuinely diverge. Under **DPL-1707**
(see `data-pipeline.md` 10-08 addition) a progress range crossing a calendar year
kills the labour-hours asset: the activity output stops being written while
category-groups keeps running on its own trigger and takes a **fresh** stamp over
**stale** activity data. So the tooltip would have said "Last calculated <an hour
ago>" over a column frozen for weeks — the exact misreading a freshness indicator
exists to prevent, and worse than rendering no line.

### Shape of the fix

`resolveCalculatedOn(outputs, levels)` — each caller passes the levels its own
figures come from:

| Caller | Levels | Figures |
|---|---|---|
| `ProgressOutputsV2Loader` (panel) | `AGGREGATE_LEVELS` | project + category-groups parquet |
| `useProgressCalculatedOn` (editor grid) | `ACTIVITY_LEVELS` | per-activity Actual % / Planned % |

No activity timestamp ⇒ no line, rather than borrowing one from another run.

### Correction to Copilot's mechanism, worth keeping straight

It cited `scheduler-service/utils.ts` and the activity *parquet*. The **editor's**
column actually reads `activityItem.actualProgress` off the **schedule API**
(`scheduler-columns.tsx:160` ← `transformScheduleData`); it is the **dashboard's**
Gantt that joins the activity parquet (`use-dashboard-schedule-data.tsx:268`). Two
different grids. The conclusion survives either way — both are per-activity, and
neither is described by the aggregate pair.

### Carry-forward

A documented pitfall in this repo is not a guardrail. This one was written down,
in the file for this very domain, three weeks before the code that contradicted it.
Worth grepping `dashboard/` for the surface you are touching *before* writing the
read, not only when a reviewer asks.
