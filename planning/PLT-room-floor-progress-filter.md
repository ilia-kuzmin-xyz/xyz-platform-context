# Room & Floor filters do not affect the Progress panel

**Type:** Bug / Feature gap
**Area:** Dashboard → Progress tab → Filter panel (Floor + Room)
**Severity:** Medium (silent — filters appear active but progress metrics never change)

---

## Summary

Selecting a **Room** or **Floor** in the dashboard filter panel recolors the 3D
model and narrows the Quality issues list, but the **Progress** panel (Actual %,
Planned %, Variance, SPI, trend chart, discipline/package list) **does not
change**. The spatial filters are never fed into the progress calculation, so a
user filtering to one floor still sees whole-project progress numbers — with no
indication the filter was ignored.

---

## Current behaviour (schematic)

```
User selects Floor / Room in filter panel
        │
        ▼
dashboardFilterService.filters$  ({ ..., level: [...], room: [...] })
        │
        ├─────────────────────────────┐
        ▼                              ▼
  COLOR SERVICE                  PROGRESS SERVICE (_queryAllData)
        │                              │
        ▼                              ▼
  getElementsWithDynamicStatus   _getEffectiveDataLevel(filters)
  (roomNames, levelNames)  ◄──┐        │   looks at ONLY:
        │                     │        │     • activityId
        ▼                     │        │     • categoryFilteredActivityIds
  builds _visible_elements    │        │     • discipline / package
  (room→element resolution    │        │   ❌ room / level NOT considered
   via parquet CTE)           │        ▼
        │                     │   dataLevel = project | package | activity
        ├──────────────┐      │        │
        ▼              ▼      │        ▼
   3D model       QUALITY     │   ProgressQueriesV2API.* on
   coloring       issues      │   project_progress / category_groups /
                  (semi-join  │   activity_progress
                   _visible_  │        │   query inputs: useProjectLevel,
                   elements)  │        │   filteredPackageIds(discipline/pkg),
                              │        │   activityIds, dateRange, weighting
                              │        │   ❌ no room/level, no _visible_elements
                              │        ▼
                              │   SAME numbers regardless of room/floor
                              └────────────────────────────────────────
```

**Net effect:** Room/Floor are wired into the *element-visibility* path (coloring +
Quality) but not into the *progress-aggregation* path.

---

## Root cause (code references)

File: `…/services/dashboard-progress/dashboard-progress-service.ts`

1. **`_getEffectiveDataLevel()` (~line 309)** decides which progress table to
   query. It branches only on `activityId`, `categoryFilteredActivityIds`,
   `discipline`, `package`. `filters.room` / `filters.level` are absent.

2. **`_queryAllData()` (~line 895)** derives `useProjectLevel` and
   `filteredPackageIds` (built from discipline/package names via
   `_buildFilteredPackageIds`). Nothing room/level-related is passed to the
   query builders.

3. **`ProgressQueriesV2API` (`utils/progress-queries-v2-api.ts`)** has no
   `room`/`level`/`roomName`/`levelName` references — every "level" there means
   *project-/package-/activity-level calculation*, not Floor. The tables it
   reads (`project_progress`, `category_groups`, `activity_progress`) are
   pre-aggregated and carry **no room/element granularity** to filter on.

4. **`getElementsWithDynamicStatus()` (~line 1515)** *does* accept
   `roomNames` / `levelNames` and resolves them to `modelElementId`s through a
   parquet CTE (`element-room-mapping` → `project-rooms` → `project-levels`,
   ~line 1711). But this method builds `_visible_elements` for the **color
   service** and is **not** part of the progress metric query path.

> Note: a Floor/Room change is *not* a selection-only filter, so it still
> triggers `_queryAllData()` — the re-query runs but, ignoring room/level,
> returns identical numbers. (Wasted work, not a crash.)

---

## Why this is a feature, not a one-line fix

Progress is aggregated at **project / package / activity** granularity. Room and
Floor are **element-spatial** concepts. The only progress granularity fine
enough to honour a spatial filter is **activity-level** (`activity_progress`),
because activities map to elements which map to rooms. There is no room column
in `project_progress` or `category_groups`.

So honouring Floor/Room means forcing the **activity-level** path and feeding it
the activity IDs that belong to the room-filtered elements.

---

## Proposed solution (schematic)

Reuse the existing room→element resolution and the existing activity-level
calculation path. Add a room/floor → activity-IDs bridge.

```
Floor/Room filter active
        │
        ▼
resolve room/level names → modelElementIds        (existing parquet CTE,
   (element-room-mapping ⋈ project-rooms ⋈ levels)  already in service)
        │
        ▼
modelElementIds → activityIds                      (NEW: via element↔activity
   (element_status / activity_links join)            mapping already loaded
        │                                             in DuckDB)
        ▼
_getEffectiveDataLevel(): add rule
   room/level present ⇒ dataLevel = 'activity'      (NEW branch, lower priority
        │                                             than explicit Gantt
        ▼                                             activityId)
merge room-derived activityIds with any
discipline/package/dynamic-category narrowing       (intersection — all active
        │                                             filters are AND-ed)
        ▼
ProgressQueriesV2API.getProjectProgressByActivity(  (existing function)
   …, activityIds, …)
        │
        ▼
Progress overview / trend / list reflect Floor/Room ✅
```

### Implementation notes
- **Bridge step** is the new work: a query that turns room-filtered
  `modelElementId`s into the `activityId`s used by `activity_progress`. The
  element↔activity link already exists in DuckDB (`activity_links` /
  `element_status`) — see `artefact-loader.ts`.
- **Combine with other filters by intersection.** If discipline/package or a
  dynamic category filter is also active, the final activity set must be the
  intersection (filters are AND-ed across types). Reuse the existing
  `_categoryFilteredActivityIds` merge pattern in `_queryAllData()` /
  `getProjectProgressByActivity`.
- **Empty match = explicit zeros.** Mirror the existing activity-level
  "matched no activities → emit zeros" handling (~line 957) so the panel shows
  0.00% rather than stale unfiltered numbers.
- **Calculation-mode interaction.** Decide precedence vs the Package/Project
  debug toggle. Recommend: an active spatial filter forces activity level
  regardless of mode (same as the existing `activityId` override).

---

## Feasibility — verified against the data model ✅

Every link needed already exists as a loaded DuckDB table / parquet. **No
backend or parquet-schema work is required** — this is a pure front-end wiring
task.

```
ROOM / FLOOR names
   │  element-room-mapping.parquet   (modelRoomId ↔ modelElementId)
   │  project-rooms.parquet          (roomName, ownerModelLevelId)
   │  project-levels.parquet         (levelName = floor)
   ▼        ── existing CTE, dashboard-progress-service.ts ~line 1738 ──
modelElementId[]
   │  activity_links  (modelElementId → activityId)
   │     artefact-loader.ts:523 loadActivityLinksParquet → table `activity_links`
   │     columns: modelElementId, activityId   (line 544)
   ▼        ── NEW join: the one missing bridge ──
activityId[]
   │  activity_progress
   │     already consumed by ProgressQueriesV2API.getProjectProgressByActivity
   ▼
Progress overview / trend / list  ✅
```

- `element-room-mapping`, `project-rooms`, `project-levels`,
  `project-element-list` — registered lazily by `_ensureRoomParquetsRegistered`
  (~line 1461); already a precondition for **today's** room filtering (coloring +
  Quality), which warns and disables if any are missing.
- `activity_links` (`artefact-loader.ts:523`) — the element→activity bridge. Loads
  gracefully to 0 rows if the `activity-links` artefact is absent (line 534).
- `activity_progress` — already the source for the activity-level path.

**Conclusion:** the proposed room→element→activity routing is buildable entirely
from data already in the dashboard DuckDB for any project that has a linked
schedule. The only genuinely new code is the `modelElementId[] → activityId[]`
join over `activity_links` plus the `_getEffectiveDataLevel` branch.

## Per-project precondition & open question

- Projects without `element-room-mapping` cannot support this (same projects
  where room filtering already does nothing today).
- Projects without `activity_links` rows have no element→activity bridge, so
  spatial progress filtering is impossible even though the filter UI may show.
- **Open question (grooming):** for such projects, hide/disable Floor+Room, or
  leave them affecting only coloring/Quality? (See acceptance criteria #6.)

## Verifying a specific project (e.g. "API 2 FULL" on test)

I could not confirm this project's runtime artefacts from the static repo — the
parquets are fetched per-session from the V2 API. To confirm before committing
to the work, use any of:

- **A — observational (quickest):** open the project dashboard, select a Floor.
  If the 3D model recolors/narrows to that floor, `element-room-mapping` +
  room/level parquets are present (confirms the room→element half).
- **B — definitive:** inspect the project's V2 model-artefacts / progress-outputs
  API response and check for `outputContent: 'activity-links'` **and**
  `'element-room-mapping'`. Both present ⇒ full chain available.
- **C — DuckDB direct:** in the running dashboard's console, query the dashboard
  DuckDB: `SELECT COUNT(*) FROM activity_links` (>0 ⇒ element→activity bridge
  exists) and read `element-room-mapping.parquet`.

> Reminder: dashboard `logger.info/warn` are suppressed (`CURRENT_LEVEL=SILENT`),
> so the `[📊 LINKS]` / `[📊 ROOM-FILTER]` load lines won't appear in console by
> default — prefer checks A–C over watching logs.

---

## Acceptance criteria

1. With a Floor selected, Progress overview (Actual/Planned/Variance/SPI), trend
   chart, and discipline/package list reflect only elements on that floor.
2. Same for a Room selection, and for Floor+Room combined.
3. Spatial filter combined with discipline/package and/or a dynamic category
   filter yields the **intersection** (AND semantics preserved).
4. A spatial filter that matches no activities shows **0.00%** / empty trend,
   not stale whole-project numbers.
5. 3D model coloring and the Quality issues list continue to behave as today
   (no regression to the `_visible_elements` path).
6. Projects lacking the required parquets: filters are either hidden/disabled or
   their no-op-on-progress behaviour is explicitly accepted and documented (pick
   one during grooming).

---

## Out of scope

- Changing how `_visible_elements` drives coloring / Quality.
- Adding a room dimension to `project_progress` / `category_groups` (we route
  through activity level instead).
- Backend/parquet schema changes (assumes element↔activity↔room links already
  loaded; if not, that becomes a BE dependency to be split out).

---

## Suggested reply to reporter

> Confirmed. Room/Floor currently filter the 3D model coloring and the Quality
> issues list, but **not** the Progress metrics — Progress is computed at
> project/package/activity level and doesn't consume the spatial filters today.
> Making it do so means routing Room/Floor through activity-level aggregation;
> raised as this ticket.
