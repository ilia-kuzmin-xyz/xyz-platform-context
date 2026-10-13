# PLT-3278 — Infinity Canvas: panel changes stay on the panel; 3D model only where it can be coloured

Domain: **canvas/** (see `canvas/README.md`, `canvas/artifact-and-hydration.md`).
Paired backend: `XYZ_InfiniteCanvasAgentPipeline` PR #25.

## 2026-10-13 — first entry (created by the sprint sweep)

**This ticket was never an intake candidate, despite showing as `Open`.** It was created
2026-10-12 by Ilia with the PR links already in the description, i.e. written up *after* the
work. hc-frontend PR **#2305** already existed, non-draft, with four reviewers requested.

Status corrected this run: `Open` → **In Code Review** (transition id 871).

### Why the status was wrong, and the lesson

A ticket in a To Do status is not evidence that the work is unstarted. Check for a PR before
treating a sprint ticket as intake — the description's "## PRs" section is the cheapest tell.
Two minutes of reading the description saved re-implementing a finished 284/37-line change.

### PR #2305 — state as of this run

- Head was `2b25ee9`, base `9a56c2e` (4 behind master). Merged master → **`bfd7e8e`**.
- Branch is named **`PLT-3232-viewer-availability`**, not `PLT-3278`. It started life as a
  PLT-3232 offshoot and was retitled. Not renamed — renaming the branch would detach the PR.
  Noted so a future run doesn't "fix" it.
- **Review threads: 2, both resolved, both fixed with real code** (not waved away):
  - `r4247441541` — the inspector read the *incoming* artifact's bindings while the old
    dashboard was still on screen during an in-place panel edit. Fixed in `d8bb879`: during a
    panel change the inspector reads the **active dashboard**; outside one the artifact is the
    report on screen, so it stays the source there.
  - `r4248268865` — the new report-selection branch had no test. Fixed in `1a1ba89`:
    `reportOnScreen` moved into `panelChange.ts` beside the other transition helpers, with a
    case each for dashboard-while-changing, turn's-report-when-done, and
    turn's-report-when-no-dashboard.
- Known and deliberate, per the PR body: when the changed report swaps in, "Opening the
  report" flashes for a few seconds. Separate fix, not this PR's.

### What the change actually does (so the next run needn't re-read the diff)

1. **3D model gating** — the canvas offered the 3D model to every project, but its DuckDB only
   starts when the model files are present. A report drawing "Model by install status" on a
   project without the object-id map produced
   `Catalog Error: Table with name element_status does not exist`. The model is now offered
   only when the files the canvas needs exist (the same check that starts the database); the
   survey omits it, new reports don't draw it, and an existing report says so in plain words.
2. **Panel-change framing** — a change with a panel selected used to take the whole report off
   canvas for the minutes the edit takes, so it read as a full regenerate. The report now stays
   on screen, panel ringed, with a "Changing <panel>" pill. Question → answered in chat.
   Whole-report edit → build progress as before. Declined change → report untouched, chat says
   why, and (new) **nothing is saved** — previously a declined edit was written as an identical
   new version with no reason shown.

### Open for a human

Nothing on the code. It wants the four requested reviewers, and the build is red on the
repo-wide Trivy CVE (see below), not on anything in this diff.
