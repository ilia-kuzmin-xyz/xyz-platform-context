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

## 2026-10-06 — no change; QA items 2/3/4 still need Radu

No reply from Radu on the screen-share ask from 10-03, so QA items 2 (Project Overview missing
date), 3 (models behind invisible side panels on zoom out) and 4 (preview vs downloaded pptx
layout) remain unverifiable from here — all three are geometry/behaviour I would be guessing at.

PR **#2260** is unchanged and healthy: draft, CI green on `b89b52d` (build + SonarCloud both
success), **zero** open review threads, and it merges cleanly against master (verified by
`git merge-tree`, no conflicts) despite being 2 commits behind. Nothing to do on it this run
beyond the master merge that identity-blocked below.

Not re-asked: no escalation here, and chasing a QA screen-share again after three days adds
nothing the 10-03 comment did not already ask for.

## 2026-10-07 — master merged and pushed at last; QA 2/3/4 still need Radu

No reply from Radu on the 10-03 screen-share ask, so QA items 2, 3 and 4 remain unstarted for the
fourth run running. Reasoning unchanged and still correct: all three are geometry/behaviour
questions that cannot be closed by reading code. Not re-asked — no escalation, no new evidence.

**The thing that did change: the master merge finally landed.** The 10-06 run could not set
`git config user.name/user.email` to Ilia's identity (sandbox classifier refusal) and chose not to
push rather than author commits as Claude. **This run the identity set cleanly**, so the merge that
had been pending since 10-04 is in: `9bbe0d6` on `PLT-3152`, merging `b8e1da0` (PLT-3172),
`959f1ad` (PLT-3223) and `95e1003` (PLT-2910). Zero conflicts, zero file overlap with this PR's
own diff.

Verified rather than assumed, which earlier runs could not do: `npm` works this run via the stub
workaround recorded on 10-05, and **511 tests pass** across `ClientReportPage/` and
`clientReportService/` on the merged head. PR #2260 is still draft, still zero open review threads.

Checkpoints 1 and 2 were no-ops (no threads, CI green on the pre-merge head and re-running on the
new one). Checkpoint 3 is now **done** rather than deferred.

## 2026-10-07 — PR #2260 went red on a repo-wide CVE, not its own; green again, no action needed

Logged so a future run does not re-investigate this red build.

The `build` check failed on the 07-10 master-merge commit. **Trivy, not tests**: `source-map-js`
1.2.1, HIGH `CVE-2026-93749` (fixed in 1.2.2), flagged out of `package-lock.json`.

Not this PR's, and the evidence was cheap: the diff touches no dependencies, and sibling PRs
#2250 / #2251 / #2263 failed in the same wave off the same master merge.

Already fixed by the team while this was being diagnosed — #2273 bumped it on master (`5704bf8`),
and the same bump was applied directly onto the `PLT-3152` branch as `0e1acdb`. Build green on
that head at 08:23. **No hotfix PR was raised**: one was started and dropped on finding #2273 had
landed, which is the duplicate the standing instruction warns against. Check master's lockfile
before writing a CVE hotfix — these land fast.

Deliberately *not* done: merging current master in to clear the 2-commit lag. Master now carries
PLT-3233 ("Run type-checking in CI and take tsc and ESLint out of the image build"), which
restructures CI, Dockerfile and webpack. Pulling that into a green draft that is blocked on QA
buys nothing and risks owning someone else's infra failure. Being behind master is not a conflict
and not red CI. Bring it in deliberately when the PR is actually moving toward merge.

Standing pattern worth knowing: lockfile CVEs (brace-expansion, pcre2, now source-map-js) fail
*every* build repo-wide until bumped. Three CI hotfix PRs (#2249, #2255, #2261) have sat green in
draft for days unmerged — a recurring drag, flagged to Ilia on 10-05.

Unchanged: QA 2 / 3 / 4 still waiting on Radu; cover still has no visible capture entry point.

## 2026-10-09 — two open PRs for this ticket, and a real `undefined` in the client deck

### The duplicate first, because it matters more than the bug

**There are now two open PRs for PLT-3152 and they overlap heavily.** This needs Ilia's call; it
was not resolved unattended.

| PR | Head | State | Size | Content |
|---|---|---|---|---|
| #2260 | `PLT-3152` | **draft** | 27 files, +738 | All of #2245 re-landed, **plus** QA 7 (app date picker) and discipline exclusions, plus slide tests and `forgeCapture.test.ts` |
| #2287 | `PLT-3152-qa-fixes-v2` | **open, reviewers requested** | 13 files, +369 | A **subset**: the #2245 re-land plus deck arrows and focus |

Both branch off `master` at the same point and touch the same files, so whichever merges first
leaves the other conflicted across `ClientReportPage/`, `clientReportPptx.ts`, `SlideStage.tsx`,
`forgeCapture.ts` and `main.json`. #2287 is the one in review; #2260 is the fuller one and has been
a finished draft since 10-02.

Not a merge decision an unattended run should make — flagged, not acted on.

### The bug: `Report notes: undefined` shipped to clients

Copilot flagged one missing placeholder key on #2287. It was **three**, and the root cause was a
type that could not catch any of them:

```ts
placeholders: Record<string, string>   // any key resolves to undefined, silently
```

`ClientReportPage.tsx` wired **9** keys. `clientReportPptx.ts` reaches **12**. `main.json` has had
all 12 the whole time — only the wiring was short. So:

- `scheduleNotes` → contents slide exported the literal text `Report notes: undefined`
- `discipline` → by-discipline, at-risk and full-breakdown tables, via `nameCell`
- `contractor` → groups table, via `nameCell`

Fixed in `bf43952` by **naming the twelve keys on the interface**, not by adding the one key.
Verified the type is the real guard: deleting the three wirings now fails `tsc --noEmit` with
*"missing the following properties: scheduleNotes, discipline, contractor"*. Confirmed by mutation,
not assumed.

**Important: `ClientReportPage.test.tsx` cannot catch this class of bug** — it mocks
`exportClientReportPptx`, so the production labels object never reaches the exporter. Removing the
wiring leaves all 16 of its tests green. The compiler is the only guard for the wiring; the new
tests guard the exporter's *behaviour* given complete labels. Worth knowing before anyone "adds a
test instead of tightening a type" here.

**#2260 has the same bug, partially.** It wires `scheduleNotes` but is still missing `discipline`
and `contractor`, and still types the object `Record<string, string>`. If #2260 is the one that
ships, that half must be carried across. Noted on #2287's thread too.

### Tests added on #2287 (all mutation-checked)

- `clientReportPptx.test.ts`: schedule-notes fallback, and a **deck-wide** guard that no slide text
  contains `undefined` for any unset name — covers table cells via a new `allSlideText()` helper
  that reads `addTable` rows as well as `addText` (a text-only sweep misses `nameCell` entirely).
- `SlideStage.test.tsx`: focus-on-mount, and an arrow fired at `document.activeElement` with no
  click first. Copilot was right that the existing tests bypass the regression — every one of them
  fires at the stage directly. Removing the mount `useEffect` turns both red.
- **New `forgeCapture.test.ts`, 11 tests**: `captureErrorMessage` mapping and pass-through, timeout
  rejection under fake timers, timer cleanup on success, empty screenshot, synchronous LMV throw,
  and both fallback hangs (FileReader read + Image decode). Dropping `reader.onerror` or
  `image.onerror` makes the matching test **time out at 5s** rather than fail fast — which is
  exactly the "Capturing…" with no error and no way back that QA 1 reported.

Validated on the pushed head: 511 tests green across `ClientReportPage/` and `clientReportService/`,
`tsc --noEmit` clean, eslint 0 errors. All three Copilot threads answered and resolved.

Unchanged: QA 2 / 3 / 4 still waiting on Radu (unanswered since 10-03); cover still has no visible
capture entry point.
