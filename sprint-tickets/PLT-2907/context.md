# PLT-2907 — [Dashboard] Quality-only mode: model camera zooms out instantly when rotation starts

- **Type:** Bug (Major)
- **Domain:** Dashboard → 3D Viewer (VWR). See `dashboard/viewer-and-model.md`.
- **Jira status (last seen 2026-07-18):** `Analysis In Progress` — parked, waiting on reporter.
- **Repro project:** HITT - DC5 -xv2, quality-only (`progressProject = false`), `/projects/6a048b016948eba33123d734/dashboard`.

## Where we stopped / current state

Clarification comment was posted to Jira on 2026-07-16 (Thu) by the previous run and
**remains unanswered as of 2026-07-18**. The bug cannot be safely fixed until the reporter
answers 3 visual-reproduction questions (below) — they need a live project + human eyes, which
a headless run can't provide.

**Do NOT implement / do NOT move to ready-for-dev until answers arrive.** This touches the
*shared* Forge viewer (ViewerPage + Dashboard + Canvas all use `viewer-y.tsx`) and there is a
documented regression trade-off. Confidence in a *safe fix* is ~6/10; confidence in the
*diagnosis* is ~8/10.

Do **not** re-post the same clarification comment — it's already there and complete. Just
re-check for a reply each run.

## Diagnosis (confirmed against code 2026-07-18)

Quality-only rotation swings the camera on a huge radius because the orbit pivot is derived from
the full-model world bbox with no pivot seeded on load:

1. **Full model is loaded, ungated.** `use-model-loader.tsx:332-334` — when `isProgressProject === false`,
   `selectiveDbIds` stays `[]`, so the selective element-id load (`:249`) is skipped and the colour
   pipeline (which also isolates/hides geometry) never runs. The viewer's world bbox = entire raw
   model incl. any off-origin/stray geometry the progress path would exclude.
2. **Pivot sits in Forge auto-pivot state.** On the quality tab no pin is selected, so
   `dashboard-pinpoint-base-service.ts:_clearPivotLock()` (`:300`, called `:349`) has set
   `setPivotSetFlag(false)` / `setUsePivotAlways(false)` / `setZoomTowardsPivot(false)`. On the first
   orbit Forge derives its own pivot from the large/off-centre bbox → camera swings on a huge radius →
   reads as an instant zoom-out.
3. **Nothing seeds a camera target/pivot for quality-only** on load, and explicit `fitToView` is
   disabled for `isDashboard`.

Corroborating architecture (`dashboard/viewer-and-model.md`):
- Dashboard profile has `wheelSetsPivot: true` → scroll-zoom re-anchors the pivot under the cursor
  (this is why "scroll first, then orbit" is expected to be smooth — question 3).
- Pin-lock path sets all three pivot flags true (`dashboard-pinpoint-base-service.ts:80-82,291-293`)
  — that's the mechanism a fix would reuse.

## Open questions (blocking — posted to Jira, unanswered)

1. Right after load, before any interaction — is the model correctly framed/centred, or already a bit zoomed-out?
2. When it jumps on orbit — does the view recentre on empty space away from the building, or dolly straight back with the building still roughly centred?
3. If you scroll-zoom first (sets pivot under cursor) and *then* orbit — is it smooth?

Expected if far-pivot diagnosis is right: (1) framed OK, (2) recentres on empty space, (3) smooth after scroll.

## Proposed fix (pending confirmation — DO NOT ship yet)

Seed a sane orbit pivot after load in the quality-only branch (centre of the loaded model bbox),
rather than leaving Forge to auto-derive it on first orbit.

- **Trade-off / risk:** forcing `setUsePivotAlways`/`setZoomTowardsPivot` (the pin path) can
  reintroduce the cursor-zoom drift the team specifically worked around via `wheelSetsPivot`. Prefer
  the lightest touch that survives the 3 answers: e.g. set the pivot point + `setPivotSetFlag` once on
  load **without** forcing `setUsePivotAlways` globally, so scroll-to-reanchor still works. Validate
  against ViewerPage/Canvas since the viewer is shared.
- **Likely files:** `use-model-loaded-events.ts` (load path — seed pivot in quality-only branch),
  `dashboard-pinpoint-base-service.ts` (pivot helpers to reuse), `use-model-loader.tsx` (quality-only branch).

## Branch plan (when unblocked)

Branch off master as `PLT-2907`. No dependency on other ticket branches. Keep PR in draft.

## Acceptance

- Quality-only orbit rotates smoothly around the model, no zoom-out jump on first drag.
- No regression to ViewerPage / Canvas orbit + scroll-zoom behaviour (shared viewer).
