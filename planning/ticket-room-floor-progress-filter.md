# Title

Progress panel ignores Room & Floor filters (spatial filters only affect 3D coloring + Quality)

---

# Description

## Summary

Selecting a **Room** or **Floor** in the dashboard filter panel recolors the 3D
model and narrows the Quality issues list, but the **Progress** panel
(Actual %, Planned %, Variance, SPI, trend chart, discipline/package list) does
**not** change. The spatial filters are never fed into the progress
calculation, so a user filtering to a single floor still sees whole-project
progress numbers — with no indication the filter was ignored.

This is a silent gap: the filter chips appear active, but the metrics are stale.

## Steps to reproduce

1. Open a progress project dashboard → **Progress** tab.
2. In the filter panel, select a **Floor** (and/or a **Room**).
3. Observe the 3D model recolor / Quality issues narrow.
4. Observe the Progress overview %, trend chart, and discipline/package list — **unchanged**.

**Expected:** Progress metrics reflect only the selected room/floor.
**Actual:** Progress metrics reflect the whole project (or whole package).

## Root cause

In `dashboard-progress-service.ts`:

- `_getEffectiveDataLevel()` (~line 309) chooses the progress query granularity
  based only on `activityId`, dynamic category filters, `discipline`, and
  `package`. `filters.room` / `filters.level` are **not considered**.
- `_queryAllData()` (~line 895) passes only `useProjectLevel` + discipline/package
  -derived `filteredPackageIds` to the query builders.
- `ProgressQueriesV2API` (`utils/progress-queries-v2-api.ts`) has no room/level
  references; its tables (`project_progress`, `category_groups`,
  `activity_progress`) carry no room/element granularity.
- Room/Floor are consumed only by `getElementsWithDynamicStatus()` (~line 1515),
  which builds the `_visible_elements` table for **3D coloring + Quality** — not
  the progress metric path.

## Why it's a feature, not a one-liner

Progress is aggregated at project / package / activity level. Room/Floor are
element-spatial concepts. The only granularity fine enough to honour a spatial
filter is **activity-level** (`activity_progress`). Honouring Floor/Room means
forcing the activity-level path and feeding it the activities belonging to the
room-filtered elements.

## Proposed solution

Route the spatial filter through existing data:

```
room/floor names
  → modelElementId[]   (element-room-mapping + project-rooms + project-levels — existing CTE)
  → activityId[]       (NEW join on activity_links: modelElementId → activityId)
  → activity_progress  (existing getProjectProgressByActivity)
  → Progress reflects Room/Floor ✅
```

1. Add a `modelElementId[] → activityId[]` resolution via the loaded
   `activity_links` table.
2. In `_getEffectiveDataLevel()`, add a branch: room/level present ⇒ `'activity'`
   (lower priority than an explicit Gantt `activityId` selection).
3. Intersect (AND) the room-derived activity IDs with any active
   discipline/package/dynamic-category narrowing — reuse the existing
   `_categoryFilteredActivityIds` merge pattern.
4. Empty match ⇒ emit explicit zeros (mirror the existing activity-level
   "matched no activities" handling, ~line 957).

**No backend or parquet-schema changes required** — every link already exists in
the dashboard DuckDB (`element-room-mapping`, `project-rooms`, `project-levels`,
`activity_links`, `activity_progress`).

## Acceptance criteria

1. With a Floor selected, Progress overview, trend chart, and discipline/package
   list reflect only elements on that floor.
2. Same for a Room selection, and for Floor + Room combined.
3. Spatial filter combined with discipline/package and/or dynamic category
   filters yields the **intersection** (AND semantics).
4. A spatial filter matching no activities shows **0.00%** / empty trend, not
   stale whole-project numbers.
5. No regression to 3D model coloring or the Quality issues list.
6. Projects lacking `element-room-mapping` or `activity_links`: Floor+Room
   filters are either hidden/disabled, or their no-op-on-progress behaviour is
   explicitly accepted (decide during grooming).

## Out of scope

- Changing how `_visible_elements` drives coloring / Quality.
- Adding a room dimension to `project_progress` / `category_groups`.
- Backend / parquet schema changes.

## Notes

- Detailed engineering analysis with code references and verified data-flow:
  `xyz-platform-context/planning/PLT-room-floor-progress-filter.md`.
- Per-project feasibility: confirm the target project exposes the
  `activity-links` and `element-room-mapping` artefacts (see analysis doc for
  the runtime check recipe).
