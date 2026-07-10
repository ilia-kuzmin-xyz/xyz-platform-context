# Dashboard Viewer — Polish Tasks (filter cascade, zero-element guard, colour-pipeline error state)

Three related fixes for the dashboard filter panel and 3D viewer colour pipeline.
All file paths are under `src/main/webapp/app/pages/organisation/ViewerPage/`.

> **Investigation note (re-grounded after master pull 436ec4c4a):** master already
> contains most of the scaffolding these tasks assumed was missing. The earlier draft
> of this plan was wrong on tasks 2 and 3 — the corrected, code-verified plan is below.
> Net effect: all three are small, surgical changes, not new subsystems.

---

## Task 1 — Cascading filter deselection (Floor → Room)

**Status: not implemented. Mirror the existing Discipline → Package pattern exactly.**

### How the existing parent→child prune works
`components/services/dashboard-filters/dashboard-filter-service.ts`:
- `_disciplinePackageMap: Map<string,string[]>` field (line 38), set once via
  `setDisciplinePackageMap()` (line 84).
- `_pruneOrphanedPackages(newDisciplines, currentPackages)` (lines 94–114) — builds a
  set of valid packages for the selected disciplines, filters the current selection,
  returns the original array unchanged if nothing was pruned (avoids needless emit).
- Called in `setDisciplines()` (line 164) and in the batch `setFilters()` when
  `'discipline' in safeFilters` (lines 289–291).

The map is built in `dashboard-progress-service.ts` (lines 414–422) from the category
tree and pushed into the filter service via `setDisciplinePackageMap`.

### The gap
`setLevels()` (lines 192–203) and `setRooms()` (208–219) just set state — no pruning.
The filter panel only *renders* rooms for currently-selected floors
(`dashboard-filter-panel.tsx` line 258: `filterOptions.rooms.get(level)`), so when a floor
is unticked its rooms vanish from the UI but **remain in `filters.room[]`** — a stale,
internally-inconsistent filter that still constrains the viewer/queries.

### The data already exists
`extractFilterOptions()` (`dashboard-panels/common/dashboard-filters/dashboard-filter-utils.ts`)
already returns `rooms: Map<levelName, roomNames[]>`, built from model elements
(`element.levelName → element.area`) merged with 360 data (`IRoomMetadata.levelName → roomName`).
This is exactly the level→room map we need — no new extraction required.

### Plan
1. In `DashboardFilterService` add, mirroring the discipline/package trio:
   - `_levelRoomMap: Map<string,string[]> | null = null`
   - `setLevelRoomMap(map)` setter
   - `_pruneOrphanedRooms(newLevels, currentRooms)` — identical shape to
     `_pruneOrphanedPackages` (same early-return guards, same "unchanged → original array").
2. Call `_pruneOrphanedRooms` in `setLevels()` and in `setFilters()` under
   `if ('level' in safeFilters)`.
3. Wire `setLevelRoomMap`: call it from the effect in
   `dashboard-bar/filters/dashboard-filters.tsx` where `filterOptions` is memoised
   (lines 148–166) — `setLevelRoomMap(filterOptions.rooms)`. The effect re-runs as
   `modelElements`/`levels360`/`rooms360` arrive, so the map stays current.
4. **Verify no other parent→child pair is missing pruning.** Audit the filter set:
   discipline→package (done), level→room (this task). Dynamic `categoryFilters`
   (phase/area/zone) are flat — no nesting. Confirm there are no others.

### Risk / nuance
`rooms360` loads lazily (CAP tab). The map is sourced primarily from `modelElements`
(available early), so it's reasonably complete before the user filters. Keep
`_pruneOrphanedRooms` defensive: same guards as the package version (no map / no levels
selected / no rooms selected → return unchanged) so a not-yet-populated map can never
prune a valid selection to empty.

### Acceptance
- Tick floor F + room R under it → untick F ⇒ `filters.room` no longer contains R.
- Re-ticking F and R works normally.
- Discipline→package behaviour unchanged.

**Confidence: 8/10** — pure mirror of a proven pattern; only unknown is the lazy-360
timing, mitigated by the defensive guards and model-element sourcing.

---

## Task 2 — Zero-element guard in the 3D viewer

**Status: half-implemented. The filter-reapply path is already correct; the *initial*
load path and the error path are not.**

`dashboard-panels/viewer/dashboard-color-service.ts`:

- `_applyFragmentVisibility(dbIds, model)` (lines 421–460) hides every fragment whose
  dbId is not in the set. Calling it with `[]` hides the entire model — the desired
  "empty" state.
- **Filter-reapply path** `reApplyColors` (line 757) **already** calls
  `_applyFragmentVisibility([], model)` when `elementsWithStatus.length === 0`. ✅ correct.
- **Initial load path** `_applyColorsWithParquetMapping` (lines 521–535): on
  `elementsWithStatus.length === 0` it sets stats to 0, marks `hasAppliedColors`, fires
  the callback, and **returns without hiding fragments** ⇒ the raw, un-coloured model
  stays fully visible. **This is the prod incident.** (0 elements happens when the svf2
  JOIN yields no rows — `getElementsWithDynamicStatus` returns `[]`.)
- **Error path** the `catch` (lines 552–559) logs, fires the callback, and likewise
  leaves the raw model visible.

### Plan
1. In the `length === 0` block (521–535) add `this._applyFragmentVisibility([], model)`
   followed by `this.viewer.impl.invalidate(true)` before `return` — exactly what
   `reApplyColors` already does at line 757.
2. In the `catch` (552–559), also hide fragments (`_applyFragmentVisibility([], model)`
   + invalidate) so a failed colour pass shows an unambiguous empty model rather than
   raw geometry. (Pairs with Task 3's banner, which explains *why* it's empty.)
3. `_applyFragmentVisibility` already try/catches a missing fragment list, so calling it
   on the initial pass is safe even if timing is early.

### Acceptance
- Project whose mapping resolves 0 elements ⇒ blank viewer on first load (not grey raw model).
- Normal project unchanged.

**Confidence: 9/10** — the correct call already exists two methods away; this copies it
into the two paths that lack it.

---

## Task 3 — Colour-pipeline failure → visible banner

**Status: the banner UI fully exists and is already mounted. The work is wiring
colour-pipeline *failures* into the error signal it reads.**

### What already exists
- `ServiceNotificationBanner` (`app/components/ServiceNotificationBanner/`) — generic
  banner with `variant`, `title`, `message`, `primaryButton{text,onClick}`, dismissible.
- `dashboard-error-banner/dashboard-error-banner.tsx` — renders an ERROR banner with a
  **Retry** button (`window.location.reload()`) when `useDashboardLoadError()` is true.
- `dashboard-provider/use-dashboard-load-error.ts` — returns true when the active view's
  service has any entry in its `errors$` map (progress / schedule / quality / 360).
- **Already mounted** in `DashboardPage.tsx` (line 34), between the bar and the layout.
- `dashboard-progress-service.ts` already records `errors$` for `initialization`
  (686–689), `v2Progress` (754–757), and `artefacts` (895–898 — but only on a *thrown*
  exception).

### The gap
The colour pipeline can fail **without throwing**, so no banner shows:
- `loadSvf2ObjectIdMap()` returns `false` on failure (does not throw). In the artefact
  pipeline (`dashboard-progress-service.ts` ~853–887), that makes `mapSuccess = false` ⇒
  `canBuild = false` ⇒ it only `logger.warn`s "Cannot build dynamic status view" (881–886)
  and records **nothing** to `errors$`. Model stays grey, user gets no feedback.
- The colour-service `catch` (color-service 552–559) swallows colour-apply errors entirely.

### Plan
1. In `dashboard-progress-service.ts`, in the `else` branch of `canBuild` (≈880–887),
   when the cause is a genuine failure — specifically `mapSuccess === false` — record:
   ```ts
   this._errors$.next({ ...this._errors$.value,
     colourPipeline: 'Element status data could not be loaded — 3D colours unavailable.' })
   ```
   Do **not** raise the error merely because `statusRows === 0` / `linksCount === 0`,
   which can be legitimately empty (no status captured yet) — that's Task 2's blank-model
   case, not a failure. Gate strictly on the loader-failure boolean.
2. Optionally add a small public helper `recordError(key, message)` on the progress
   service rather than exposing `_errors$`, and call it from the colour-service `catch`
   (552–559) too, so a downstream colour-apply exception also surfaces the banner.
3. Customise the message: the existing banner text is generic
   ("Some dashboard data could not be loaded…"). Either reuse it (any key triggers it) or,
   if a colour-specific message is wanted, branch in `dashboard-error-banner.tsx` on the
   presence of the `colourPipeline` key. Recommend reuse for v1 — Retry (reload) is the
   right recovery for both.

`useDashboardLoadError` already treats any progress-errors key as active on the progress
tab, so once `colourPipeline` is set the banner appears automatically — no new wiring.

### Acceptance
- svf2 map load failure (or colour-apply exception) ⇒ banner visible with explanation + Retry.
- Success path ⇒ no banner (no regression).
- Legitimately-empty projects ⇒ blank model (Task 2), **no** error banner.

**Confidence: 8/10** — reuses fully-built, already-mounted banner + error mechanism;
main judgement call is keeping "failed to load" distinct from "legitimately empty".

---

## Suggested order
1. **Task 2** — smallest, self-contained, fixes the visible prod incident.
2. **Task 3** — builds on Task 2 (banner explains the empty/failed state); reuses existing UI.
3. **Task 1** — independent; mirror of a proven pattern.

## Cross-cutting verification
- Tasks 2 + 3 together must keep three states distinct:
  *success* (coloured model, no banner) · *legitimately empty* (blank model, no banner) ·
  *failure* (blank model + banner + Retry).
- Re-check the "Fragment visibility duplication" pitfall (dashboard/pitfalls.md): colours
  apply exclusively from the `combineLatest(geometryLoaded$, elementDynamicStatusViewLoaded$)`
  subscription — don't introduce a second apply path.
