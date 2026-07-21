# PLT-2907 — [Dashboard] Quality-only mode: model camera zooms out instantly on orbit

**Type:** Bug · **Priority:** Major · **Jira status:** Analysis In Progress
**Domain:** Dashboard viewer (Forge/3D) — `ViewerPage/components/dashboard-panels/viewer`
**Repro project:** HITT - DC5 -xv2 (`/projects/6a048b016948eba33123d734/dashboard`), quality-only (`progressProject = false`)

## State — BLOCKED on human input (do not implement yet)

Ticket is intentionally parked in **Analysis**. A prior Claude review already posted a
clarification comment (Jira comment 107518, 2026-07-16) with 3 reproduction questions.
**Those questions are still unanswered** — nothing new to act on. Do NOT re-post the
comment (avoid noise) and do NOT start dev until the answers arrive.

## Root cause (confirmed against code 2026-07-21 — still accurate)

Quality-only orbit swings on a far/off-centre pivot, reading as an instant zoom-out:

1. **Full model loaded.** `use-model-loader.tsx` only applies selective element loading
   when `selectiveDbIds.length > 0` (line ~249, `getSelectiveLoadingDbIds` ~341). Quality-only
   skips selective loading + the colour pipeline (which also isolates/hides geometry), so the
   world bbox is the entire raw model incl. off-origin/stray geometry.
2. **No pivot lock.** On the quality tab no pin is selected, so
   `dashboard-pinpoint-base-service.ts` `_clearPivotLock()` (lines 300–305) leaves Forge in
   auto-pivot: `setPivotSetFlag(false)` / `setUsePivotAlways(false)` / `setZoomTowardsPivot(false)`.
   First orbit → Forge derives its own pivot from the large bbox → huge-radius swing.
3. **Nothing seeds a camera target/pivot** for quality-only in `use-model-loaded-events.ts`
   (confirmed: no fitToView/pivot/camera seeding there); explicit `fitToView` disabled for `isDashboard`.

## The trade-off (why we didn't just fix it)

The pin path locks the pivot via `setPivotSetFlag(true)` / `setUsePivotAlways(true)` /
`setZoomTowardsPivot(true)` (lines 80–82, 291–293). Comment at lines 266–268 documents that
`setZoomTowardsPivot(true)` is a deliberate workaround. Forcing the same lock on load to fix
orbit **can reintroduce the cursor-zoom drift the team specifically worked around**. So the
correct fix depends on real-browser behaviour we can't observe headless.

## Open questions (blocking) — asked in Jira comment 107518

1. Right after load, before interaction — is the model framed/centred, or already zoomed-out?
2. On the orbit jump — does the view recentre on empty space, or dolly straight back with the
   building still roughly centred?
3. If you scroll-zoom first (sets pivot under cursor) then orbit — is it smooth?

If (1) framed OK, (2) recentres on empty space, (3) smooth after scroll → far-pivot diagnosis
confirmed → seed a sane orbit pivot on load in the quality-only branch.

## Key files
- `.../viewer/use-model-loader.tsx` — full vs selective load
- `.../viewer/hooks/use-model-loaded-events.ts` — load-time camera handling (no pivot seed today)
- `.../viewer/services/dashboard-pinpoint-base-service.ts` — pivot lock/clear (`_clearPivotLock`)

## Next run
Check Jira for a reply to comment 107518. If answered → validate against the 3 outcomes above,
move to dev status, branch `PLT-2907` off hc-frontend master, seed pivot on load. If still
unanswered → leave as-is, no new comment.
