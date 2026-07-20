# PLT-2907 — [Dashboard] Quality-only mode: model camera zooms out instantly when rotation starts

- **Type:** Bug (Major)
- **Jira status:** `Analysis In Progress` (as of 2026-07-20 scheduled run)
- **Domain:** Dashboard page → 3D Viewer / camera-pivot (VWR)
- **Repro project:** HITT - DC5 -xv2 · `/projects/6a048b016948eba33123d734/dashboard` · quality-only (`progressProject = false`)

## Symptom
On the dashboard in **quality-only** mode, the first orbit/rotate drag makes the
camera instantly jump/zoom far out instead of orbiting smoothly. Rotation is
effectively unusable. Not reported for full-progress projects.

## Diagnosis (root cause — verified against code 2026-07-20)
Quality-only projects load the **full raw model** and never seed an orbit pivot,
so Forge derives its own pivot from a large/off-centre world bbox on first orbit →
huge orbit radius → reads as an instant zoom-out.

Verified file:line references (branch `claude/nice-darwin-9gxtts`, HEAD `ba925d7`):
- `.../dashboard-panels/viewer/use-model-loader.tsx:333` — quality-only
  (`isProgressProject === false`) keeps `selectiveDbIds = []` and loads the full
  model; the colour pipeline (which isolates/hides geometry) never runs, so the
  world bbox is the entire raw model incl. any stray/off-origin geometry.
- `.../viewer/services/dashboard-pinpoint-base-service.ts:300-306` —
  `_clearPivotLock()` sets `setPivotSetFlag(false)`, `setUsePivotAlways(false)`,
  `setZoomTowardsPivot(false)`. On the quality tab no pin is selected, so the pivot
  sits in Forge's default auto-pivot state → Forge picks its own pivot on first orbit.
- `.../viewer/components/dashboard-provider/dashboard-project-service.ts:126` —
  dashboard mode calls `setDashboardMode(true)` which disables **all** `fitToView`
  calls, so nothing re-frames/seeds a camera target for quality-only after load.

## Proposed fix direction
Seed a sane orbit pivot (model bbox centre) after load in the quality-only branch,
mirroring what the pin path does (`dashboard-pinpoint-base-service.ts:289-294`).

## ⚠️ Risk (why we did NOT rush to dev)
The pin path also calls `setZoomTowardsPivot(true)`. Per the in-code comment at
`dashboard-pinpoint-base-service.ts:268-269`, `zoomTowardsPivot` is **"the root
cause of cursor-corner drift"** the team specifically worked around. Forcing the
full pin-lock combo on load could reintroduce that drift regression. So the safe
fix may need to seed only the pivot point + `setPivotSetFlag`/`setUsePivotAlways`
WITHOUT `setZoomTowardsPivot` — but that needs confirmation of the actual mechanism.

## Open clarifications (posted to Jira 2026-07-16, STILL UNANSWERED)
Cannot reproduce headless; need a human on HITT - DC5 -xv2 to confirm:
1. Right after load (no interaction) — is the model framed/centred, or already zoomed-out?
2. On the jump — does the view recentre on empty space away from the building, or
   dolly straight back with the building still roughly centred?
3. Scroll-zoom first (sets pivot under cursor) then orbit — is it smooth?

Expected confirming pattern: (1) framed OK, (2) recentres on empty space, (3) smooth
after scroll → confirms far-pivot diagnosis → seed pivot on load.

## Where we stopped
- Diagnosis re-verified against current code; still accurate.
- Ticket left in `Analysis In Progress`; clarification comment already on Jira, no
  reply yet. **Blocked on human answers to the 3 questions above** before dev — do
  NOT implement against the shared viewer until the mechanism is confirmed, because
  of the cursor-drift regression risk.
- Next run: check the Jira ticket for a reply. If answered and diagnosis confirmed →
  branch `PLT-2907` off master and seed pivot on load (careful with zoomTowardsPivot).
