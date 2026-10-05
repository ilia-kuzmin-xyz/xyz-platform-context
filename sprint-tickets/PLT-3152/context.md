# PLT-3152 — Summary Progress Report → PowerPoint

Epic: PLT-3151 (Reports Automation). Flag: `ClientReport` (default off).

## 2026-10-02 — the stranded-PR incident, and what actually shipped

**The headline, and the reason this ticket reopened: PR #2245's QA fixes never
reached `master`.**

The sequence:

| When | What |
|---|---|
| 24 Sep | #2232 (`PLT-3152-client-report-builder`) **squash-merged** into master as `4f2496d` |
| 25 Sep | Radu files 9 QA defects |
| 25 Sep | #2245 opened, based on `PLT-3152-client-report-builder` — i.e. on a branch whose PR was already merged |
| 30 Sep | #2245 merged **into that branch**, not into master |
| 01 Oct | Ticket reopened — QA re-tested master, which still had the original build |

A squash merge leaves the source branch's own history unmerged, so
`git merge-base --is-ancestor` on the branch head reports "not merged" and the
branch looks live. Stacking a second PR on it is then silently a no-op for
master.

**Check before stacking:** if the base branch's PR is already merged, branch
from `master` instead. `gh pr view <base-pr> --json merged` answers it in one
call; so does looking for the squash commit on master.

### What landed (PR #2260, draft, off `master`)

- All of #2245 reapplied, verified byte-identical across `ClientReportPage/`
  and `clientReportService/` (`git diff ab2b674c1 -- <those paths>` empty).
  Covers QA 1, 5, 6, 8, 9 plus the review fixes that rode with them.
- QA 7: `type='date'` → `app/components/DatePicker` behind an MUI field, the
  pairing `form-date-picker.tsx` already uses in the viewer.

### Still open — needs QA input, do not guess

- **QA 2** Project Overview "missing date". `resolveReportDate`
  (`client-report-assembler.ts:131`) already falls back to the latest progress
  point, and the overview renders `PROGRESS UP TO <date>`, so the obvious
  empty-default theory is **wrong**. Asked Radu which date he meant.
- **QA 3** models behind invisible side panels on zoom-out — capture-modal
  layout, needs a running app.
- **QA 4** preview vs downloaded `.pptx` layout — geometry, needs the recording.

Not on QA's list but true: unticking a discipline drops its slide pair but
leaves its packages in the other slides; and the cover now has **no** way to
capture an image, because removing the invisible slide-wide button (QA 9) took
the only entry point with it. A visible one is a design call.

## Code map

```
pages/ClientReportPage/
  ClientReportPage.tsx          route + deck assembly
  clientReportDeck.ts           slide ordering
  clientReportPptx.ts           PowerPoint export
  forgeCapture.ts               viewer screenshot capture
  components/PlannerPanel.tsx   planner's authoring surface (commentary, dates)
  components/SlideStage.tsx     deck shell + navigation arrows
  components/DashboardCaptureModal.tsx
services/clientReportService/
  client-report-assembler.ts    sources → ClientReportData (resolveReportDate)
  client-report-metrics.ts      formatReportDate, weighting, NO_VALUE = '—'
  client-report-loader.ts       progress-outputs reads
  planner-input-store.ts        localStorage drafts (per browser, not shared)
```

### Gotchas

- `reportDate` is an ISO day (`YYYY-MM-DD`). `formatReportDate` reads it in
  **UTC** on purpose — date-only values read locally shift a midnight-cut report
  back a day west of Greenwich. Anything converting to/from a `Date` must stay on
  local components and never round-trip through `toISOString()`.
- react-datepicker clones `customInput` and places the `id` itself, so an MUI
  `label` does not reliably name the input. Give the field its own `aria-label`.
- Planner drafts live in `localStorage` — per browser, not shared, not on the
  server. Stated in the panel deliberately.

## 2026-10-03 — QA 2/3/4 asked on the ticket; PR #2260 brought up to master

Supersedes nothing above; the 10-02 entry stands.

- Posted the clarification **on the Jira ticket** this time, not just in the PR
  description. The 10-02 note said "Asked Radu which date he meant" — that ask
  only ever existed in #2260's body, where QA does not read it. Comment now on
  PLT-3152 asking for a screen share on **QA 2, 3 and 4**.
- #2260 merged `master` (PLT-2986 + PLT-3153) in cleanly, no conflicts.
  505 tests green across `ClientReportPage/` and `clientReportService/`.
- Ticket stays **Analysis In Progress** — correct, it is waiting on QA input.

Still open and unchanged: unticking a discipline drops its slide pair but leaves
its packages in the other slides; the cover has no visible capture entry point
since QA 9 removed the invisible one.

## 2026-10-04 — no change; QA has not replied

Radu has not answered the 10-03 ask for a screen share on QA 2 / 3 / 4, so those three stay
unstarted — all are geometry/repro questions that cannot be closed by reading code. PR #2260
re-verified this run: **draft, CI green (run 5164), 0 commits behind master, 0 open review
threads.** Checkpoints 1–3 are all no-ops on it. The two non-QA items from 10-02 are still true
and still unowned (discipline untick leaves packages behind; cover has no visible capture entry).

## 2026-10-05 — discipline exclusion fixed end-to-end (the one unblocked item)

QA 2/3/4 still unanswered (Radu has not replied to the 10-03 ask), so those remain
unstarted — unchanged reasoning, they need a repro not a code read. But the
"unticking a discipline leaves its packages behind" item logged on 10-02 needed
**no** QA input, so it was done this run rather than logged a third time.

**Shipped in `b89b52d` on `PLT-3152` (PR #2260, still draft).**

### What it actually was

`excludedDisciplines` only ever reached `buildDisciplines`, which set
`reportSlide: false`. Only `selectDisciplineSlides` reads that flag, so the
slide pair vanished and every table kept the rows — by-discipline rollup,
at-risk packages, full breakdown, preview and pptx alike.

The panel's own copy settles the intended semantic without asking anyone:
**"Untick a discipline to leave it out of the report."** Not out of its slide pair.

### The design, and why not the obvious one

Filter **once at assembly**, not at the ~12 consumption sites across
`PackagesSlide`, `PackageBreakdownSlide`, `DisciplineSlide`, `clientReportDeck.ts`
and `clientReportPptx.ts`. Patching each is how preview and export drift apart —
which is already QA defect 4 on this very ticket.

### The trap that shaped it (re-read this before touching the picker)

`report.disciplines` / `report.packages` **cannot** simply be filtered in place:

- `ClientReportPage.tsx:147-155` sourced the picker's own options from
  `report.disciplines` — an excluded discipline must stay listed to be re-ticked.
- the same block derived `packageCount` from `report.packages`, and
  `PlannerPanel` *disables* a row at `packageCount === 0`.

So filtering alone makes unticking a **one-way door**. Hence new
`ClientReportData.disciplineChoices`, built from the unfiltered sets, which the
picker reads. There is now a page-level test that fails if anyone points the
picker back at `report.disciplines`.

### Deliberately out of scope, and why

- **Groups** are contractor-keyed, **look-ahead** is phase/level/area-keyed —
  neither carries discipline attribution, and a contractor can span disciplines.
  Nothing to filter on, left whole.
- **Project Overview gauge** stays project-level truth from `projectPoints`.
  Excluding a discipline must not silently restate the project's own progress.
- `reportSlide` kept: several tests use `reportSlide: true` as a seam to force a
  slide pair for a package-less discipline. Its docstring now says explicitly
  that it is *not* the exclusion mechanism — setting `false` would hide the
  slides and leave the rows, i.e. recreate this exact bug.

Both tables already took their denominator from their own set (`PackagesSlide`
docstring), so shrinking membership recomputes totals **without** a new weighting
basis — the thing PLT-3010 was burnt on.

### Verification

529 tests green (`ClientReportPage/`, `clientReportService/`, `useClientReport`),
`tsc --noEmit` clean, eslint 0 errors. Three mutation checks run to prove the new
tests are not vacuous: removing the package filter fails 4, building the choices
from filtered sets fails 2, pointing the picker back at `report.disciplines`
fails 1.

### How the suite was run here at all — reusable

`npm ci` 401s on the private `@xyzreality/dhtmlx-gantt` (no `NPM_TOKEN` in the
remote session), which is why earlier runs pushed blind or declined to push.
Workaround that worked: a local stub package exposing `gantt` / `Gantt`, the
dependency repointed at it with `file:`, then `npm install --ignore-scripts`.
`npm overrides` does **not** work — npm rejects an override that conflicts with a
direct dependency (`EOVERRIDE`).

Only the gantt *type* imports fail `tsc` afterwards (`GanttStatic`, `GridColumn`);
filter those out and the rest of the check is trustworthy. **Restore
`package.json` and `package-lock.json` from a backup before committing** — the
stub must never reach a commit.

### Still open on this ticket

- QA 2, 3, 4 — waiting on Radu for a repro / screen share.
- Cover has no visible capture entry point since QA 9 removed the invisible one.
  Design call, still unowned.
