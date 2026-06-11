# Dashboard Viewer — Polish Tasks

Three independent fixes for the dashboard filter panel and 3D viewer color pipeline.

---

## 1. Cascading filter deselection: Floor → Room (and all parent→child pairs)

### Problem

Selecting a floor and one of its rooms, then unticking the floor, leaves the room still active in `filters.room[]`. The model is filtered to rooms that belong to a now-deselected floor — inconsistent state.

The same gap exists if there are any other parent→child filter pairs beyond discipline→package.

### Current state

Discipline → Package pruning already works: `DashboardFilterService.setDisciplinePackageMap()` stores the map, and when `discipline[]` changes the service prunes any packages whose parent discipline is no longer selected.

Floor → Room has no equivalent. The filter panel renders rooms nested under each selected floor (`dashboard-filter-panel.tsx` lines 257–275) but toggling a floor off does not prune the `room[]` array.

### Root cause files

- `services/dashboard-filters/dashboard-filter-service.ts` — filter state + discipline→package pruning; add equivalent level→room pruning here
- `dashboard-panels/common/dashboard-filters/dashboard-filter-utils.ts` — `extractFilterOptions()` builds the discipline→package map at line 74–86; add level→room map extraction here
- `dashboard-panels/common/dashboard-filters/dashboard-filter-panel.tsx` — Floor section lines 245–276, Room section 257–275

### Proposed fix

1. In `dashboard-filter-utils.ts` — extract a `Map<level, room[]>` alongside the existing discipline→package map, sourced from the same filter options (CAP parquets `levels360`/`rooms360`).
2. In `DashboardFilterService` — add `setLevelRoomMap(map)` mirroring `setDisciplinePackageMap`; when `level[]` changes, prune `room[]` to only rooms that belong to a currently-selected level.
3. Verify no other parent→child pairs are missing the same treatment.

### Acceptance criteria

- Tick floor F and room R under it → untick F → `filters.room` no longer contains R
- Ticking R back works normally after the floor is re-selected
- Discipline→package behaviour unchanged

**Confidence: 8/10** — pattern is already established for discipline→package; execution is mechanical. Unknowns: how rooms are keyed to floors in the parquet (need to verify the level/room relationship field name).

---

## 2. Zero dbIds resolved → display empty model (not raw un-coloured model)

### Problem

If the dbId mapping step produces 0 resolved elements (e.g. `svf2-object-id-map.parquet` is empty or the JOIN returns no rows), `_applyFragmentVisibility` is either skipped or called with an empty set without hiding all fragments. The result: the full raw geometry is visible with no colour theming — looks like a broken, un-loaded state. Users see a grey model and assume it loaded correctly with no data, rather than understanding something failed.

### Root cause files

- `dashboard-panels/viewer/dashboard-color-service.ts`
  - `_applyFragmentVisibility(dbIds, model)` — line 421; loops fragments and sets visibility based on dbId Set membership
  - call sites: lines 631, 757, 804
  - `setThemingColor` call — line 614

### Proposed fix

In the colour-pipeline flow (after the DuckDB element status query but before calling `setThemingColor`):

```
if (resolvedDbIds.length === 0) {
  // Mapping produced no elements — hide everything rather than showing raw model
  _applyFragmentVisibility([], model)   // all fragments hidden
  // emit a warning / error state (see item 3 below)
  return
}
```

Also add a guard at every `_applyFragmentVisibility` call site: confirm the method is never bypassed when the resolved set is empty.

### Acceptance criteria

- Project where mapping resolves 0 elements → viewer shows a completely blank (hidden) model
- Normal project → behaviour unchanged
- A visible indicator tells the user nothing is displayed (see item 3)

**Confidence: 8/10** — fix is a null-guard + explicit empty-set call. Risk: confirming which exact code path is reached when the parquet JOIN returns 0 rows requires tracing the service initialisation flow carefully.

---

## 3. Color pipeline failure → visible error state in the viewer

### Problem

When any step in the colour pipeline fails silently (DuckDB query error, null model reference, mapping exception), the viewer either shows the raw un-coloured model or freezes on the loading state. Users have no feedback; they may think the model loaded correctly and make incorrect decisions based on missing colour data.

### Root cause files

- `dashboard-panels/viewer/dashboard-color-service.ts` — the color service; needs to catch and emit errors
- Viewer overlay / progress components used elsewhere on the page (check `dashboard-panels/viewer/` for existing overlay patterns)

### Proposed fix

1. In `DashboardColorService` — add an `error$: BehaviorSubject<string | null>` observable. In the top-level `try/catch` around the colour-apply flow, emit a descriptive message on failure.
2. In the viewer React wrapper — subscribe to `error$`; when non-null, render an overlay banner over the viewer area:

   > **3D colour visualisation unavailable**
   > Element status data could not be loaded. The model structure is shown without progress colours.

   Include a retry button that re-triggers the colour service initialisation.

3. The banner should be dismissible and should not block model navigation (overlay at the top of the viewer, not full-screen modal).

### Acceptance criteria

- Simulated DuckDB failure (e.g. corrupt parquet) → banner visible over the viewer
- Banner contains an actionable explanation (not just "error")
- Retry button re-attempts colour loading
- Success path → no banner, no regressions

**Confidence: 7/10** — pattern is straightforward; unknown: how the viewer React wrapper currently handles the color service lifecycle and whether an `error$` subject would cleanly integrate with the existing observable subscriptions. Needs a quick read of the viewer component before starting.

---

## Implementation order

| # | Item | Why first |
|---|------|-----------|
| 1 | Filter cascading | Self-contained, no viewer dependency |
| 2 | Zero-element guard | Prerequisite for item 3 (zero elements is one failure mode the error state should cover) |
| 3 | Error overlay | Depends on knowing the failure paths from item 2 |
