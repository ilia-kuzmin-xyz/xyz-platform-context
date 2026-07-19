# PLT-2907 — [Dashboard] Quality-only mode: model camera zooms out instantly when rotation starts

- **Type:** Bug (Major)
- **Jira status:** `Analysis In Progress` — **parked, awaiting human answer**
- **Domain:** Dashboard page → 3D viewer (`ViewerPage/components/dashboard-panels/viewer`)
- **Repro project:** HITT - DC5 -xv2 (quality-only, `progressProject = false`),
  `/projects/6a048b016948eba33123d734/dashboard`
- **Last touched by scheduled run:** 2026-07-19 (analysis re-verified against code)

## Where we stopped (state)

A clarification was raised on the ticket **2026-07-16** (posted via Ilia's
account, prefixed "Claude here"). It asks the reporter for 3 quick manual
reproduction checks on HITT - DC5 -xv2. **As of 2026-07-19 there is no reply.**

→ **Do not start dev until those questions are answered.** The fix touches the
shared viewer and has a real regression trade-off (see Risk below). Re-posting
the clarification adds noise — leave it parked until the reporter responds.

### The 3 open questions
1. Right after load, before any interaction — is the model correctly
   framed/centred, or already a bit zoomed-out?
2. When it jumps on orbit — does the view recentre on empty space away from the
   building, or dolly straight back with the building still roughly centred?
3. If you scroll-zoom first (sets pivot under cursor) and *then* orbit — smooth?

Confirmation signature for the far-pivot diagnosis: (1) framed OK, (2) recentres
on empty space, (3) smooth after a scroll.

## Root cause (verified against code 2026-07-19, confidence 8/10)

Quality-only path leaves Forge in its **auto-pivot** state over the **full raw
model** bbox, so the first orbit swings on a huge radius → reads as instant
zoom-out.

Two contributing facts, both confirmed in the current branch:

1. **Full model is loaded, no selective isolation.**
   `use-model-loader.tsx:332-342` — when `isProgressProject === false`,
   `selectiveDbIds` stays `[]`, the `element_base_data` wait + selective load are
   skipped, and the colour pipeline (which also isolates/hides geometry) never
   runs. World bbox = entire raw model, including any off-origin/stray geometry
   the progress path would have excluded.

2. **Nothing seeds a camera pivot/target on load for quality-only.**
   `hooks/use-model-loaded-events.ts:62-65` — the quality-only branch of
   `onModelRootLoaded` only calls `setModelLoading(false)` / `setModelLoaded(true)`.
   No pivot seeding. With no pin selected, the pivot sits in Forge default
   auto-pivot state (`dashboard-pinpoint-base-service.ts` `_clearPivotLock`,
   lines 300-305: `setPivotSetFlag(false)` / `setUsePivotAlways(false)` /
   `setZoomTowardsPivot(false)`). On first orbit Forge derives its own pivot from
   the large/off-centre world bbox.

Reference for the "correct" pivot lock (the pin path):
`dashboard-pinpoint-base-service.ts:290-293` sets pivot center + all three flags
`true`. Semantics documented at lines 265-268 of that file.

## Proposed fix direction (not yet implemented)

Seed a sane orbit pivot after load in the quality-only branch (e.g. world-bbox
center of the loaded model), mirroring the pin path's
`setPivotPoint`/`setPivotSetFlag(true)` — but **without necessarily** forcing
`setUsePivotAlways`/`setZoomTowardsPivot`.

### Risk (why we contemplate, not rush)
Forcing `setUsePivotAlways(true)` / `setZoomTowardsPivot(true)` is exactly what
the pin path does, and the team previously worked around **cursor-zoom drift**
by *not* doing that globally. Turning it on for the quality-only viewer could
reintroduce that drift. So the decision hinges on the reporter's answer to Q3
(scroll-then-orbit): it tells us whether just seeding a pivot point is enough, or
whether the always-pivot flags are needed.

## Key files
| File | Why |
|------|-----|
| `.../viewer/use-model-loader.tsx` | quality-only full-model load, `selectiveDbIds` |
| `.../viewer/hooks/use-model-loaded-events.ts` | load-complete handler; no pivot seed for quality-only |
| `.../viewer/services/dashboard-pinpoint-base-service.ts` | `_seedPivot` (290-293) vs `_clearPivotLock` (300-305); pivot flag semantics (265-268) |

## Next-run checklist
- [ ] Re-check ticket comments for a reply to the 3 questions.
- [ ] If answered → decide pivot-seed vs always-pivot per Q3, move to dev,
      branch `PLT-2907` off latest `master` of hc-frontend.
- [ ] If still no reply → leave parked, no action.
