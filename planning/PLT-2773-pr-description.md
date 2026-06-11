# PLT-2773 — Room/Floor filter: wire into Progress panel

## Problem

Selecting a Room or Floor in the dashboard filter recoloured the 3D model and narrowed the Quality issues list, but the Progress panel (Actual %, Planned %, Variance, SPI, trend chart, discipline/package list) showed whole-project numbers regardless — the spatial filter was silently ignored.

## What changed

**One file: `dashboard-progress-service.ts`**

Three additions:

| Addition | Purpose |
|---|---|
| `_buildRoomFilteredElementsSql()` | Extracts the room→element CTE SQL that already existed in `getElementsWithDynamicStatus`, now shared by both the coloring and progress paths — single source of truth |
| `_resolveRoomLevelToActivityIds()` | Runs the CTE + a `INNER JOIN activity_links` to turn room/floor names into activityIds. Returns `string[]` on success (may be empty), `null` when parquets are missing or query fails |
| Changes to `_getEffectiveDataLevel()` + `_queryAllData()` | Resolve spatial filter before deciding the data level; pass result in so the function can correctly distinguish "filter active, parquets available" from "parquets missing, skip filter" |

**Priority order (unchanged for existing filters):**

```
Gantt activity selection  (highest)
  ↓
Room / Floor filter       (new — forces activity level, resolved via activity_links)
  ↓
Dynamic category filter   (Phase / Zone / Area → _categoryFilteredActivityIds)
  ↓
Discipline / Package      (package level)
  ↓
No filter                 (project level, default)
```

When room/floor **and** a dynamic category filter are both active, the activityId sets are intersected (AND semantics).

**Graceful degradation:** if room parquets are missing or the bridge query fails, `null` is returned and the spatial filter is skipped — numbers stay unfiltered, matching exactly how the coloring path behaves today.

## How to test

### Setup
Open the dashboard for a project that has:
- Room/Floor filter options visible (has `element-room-mapping`, `project-rooms`, `project-levels` parquets)
- A linked schedule (has `activity_links` parquet with rows)

Use `SELECT COUNT(*) FROM activity_links` in the DuckDB console to confirm the bridge exists.

### Test cases

**1 — Happy path: Floor filter narrows progress numbers**

```
1. Load dashboard → note whole-project Actual % and Planned %
2. Select a Floor from the filter panel
3. 3D model recolours to that floor (existing behaviour — confirms parquets loaded)
4. ✅ Progress numbers change (lower than whole-project, or 0% if no schedule
   activities on that floor)
5. Trend chart reflects the same scope
6. Discipline/package list reflects the narrowed scope
```

**2 — Room filter behaves identically to Floor**

```
1. Clear floor, select a Room
2. ✅ Progress numbers update; 3D and Quality unchanged in behaviour
```

**3 — Floor + dynamic category (Phase/Zone) — intersection**

```
1. Select a Floor AND a Phase/Zone category filter
2. ✅ Numbers reflect only activities that are BOTH on that floor AND in that category
3. Stricter than either filter alone
```

**4 — Empty spatial match → zeros, not stale numbers**

```
1. Select a Floor or Room that has no scheduled activities (no activity_links rows
   for elements on that floor)
2. ✅ Progress shows 0.00% — not the previous whole-project value
3. Trend chart is empty
```

**5 — Regression: Gantt selection still takes priority**

```
1. Select activities in the Gantt
2. Also select a Floor
3. ✅ Progress numbers reflect only the Gantt-selected activities (floor ignored)
4. This matches pre-existing Gantt-selection behaviour
```

**6 — Regression: project without room parquets**

```
1. Open a project that does NOT have element-room-mapping / project-rooms parquets
2. Room/Floor filter options should not appear (hidden by the existing precondition check)
3. If somehow visible: selecting floor/room leaves progress numbers unchanged
   (filter skipped, same as coloring path)
4. ✅ No crash, no 0.00% appearing spuriously
```

**7 — Regression: 3D coloring and Quality unaffected**

```
1. Select a Floor
2. ✅ 3D model still recolours correctly (no change to getElementsWithDynamicStatus)
3. ✅ Quality issues still filter to that floor
4. ✅ No regression on either path
```

## Known limitation (out of scope)

When both a Room/Floor filter AND a Discipline/Package filter are active simultaneously, the Discipline/Package is ignored at the progress level (same behaviour as when Gantt activities are manually selected). A full intersection would require resolving package-filtered activity IDs — separate ticket.
