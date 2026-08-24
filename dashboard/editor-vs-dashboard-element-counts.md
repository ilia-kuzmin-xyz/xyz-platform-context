# Editor vs Dashboard — how each decides which elements exist and which are shown

Written 2026-08-24 for PLT-2874, but it is not a ticket note: it is the structural comparison of
the two element pipelines. Every claim below was read from `hc-frontend` at `origin/master`
(`e5d7685`) this session. Paths are relative to `src/main/webapp/app/pages/organisation/ViewerPage/`.

**Why this document exists.** PLT-2874 has been open since 2026-07-07 and reopened by QA on 08-12.
Each round has treated it as "one number is wrong". It is not. The two surfaces are two different
queries, over two different driving tables, in **two different DuckDB instances**, under different
filters. Some of the difference is by design and permanent; some is a genuine defect. Nobody can
tell which without the table below, and that is why the ticket keeps stalling.

---

## 0. The one-line version

The editor asks *"which elements of this one model are linked to any activity?"*
The dashboard asks *"which objects in the whole federation have a status I can paint, on a date
inside the window?"*

Those are not the same question, so they were never going to return the same number. The useful
question is not "why do they differ" but **"how much of the gap is designed, and what is left over
after you subtract it."**

---

## 1. They do not share a database

| | Editor | Dashboard |
|---|---|---|
| DuckDB instance | `new DuckDBService(...)` at `components/project-x/project-service.ts:176` | `new DuckDBService(..., { isDashboard: true })` at `components/dashboard-provider/dashboard-project-service.ts:84` |
| Driving table | `project_element_list` | `svf2_object_id_map` |
| Loads `project_element_list`? | yes | **no** — `dashboard-progress-service.ts:820` says "Load project-element-list ONLY for runtime mapping approach (not needed for parquet)" |
| Loads `svf2_object_id_map`? | no | yes |

**Consequence, and it is the first thing to internalise:** there is no query you can run in one
place that returns both numbers. Any diagnostic has to emit two blocks and correlate them
out-of-band. This is why the branch logs an editor ladder and a dashboard ladder separately under
one `[PLT-2874]` tag.

---

## 2. The editor's number, exactly

Two stages, and **the second overwrites the first**.

**Stage 1 — SQL** (`services/duckdb/duckdb-element-store.ts:571-620`):

```sql
-- "Total"
SELECT COUNT(*) FROM project_element_list WHERE modelId = '<modelId>'

-- "Linked"
SELECT COUNT(DISTINCT pel.modelElementId)
FROM project_element_list pel
INNER JOIN activity_links al ON pel.modelElementId = al.modelElementId
WHERE pel.modelId = '<modelId>'
```

Note `COUNT(*)` for Total — **rows, not distinct elements**. Any duplication in
`project_element_list` inflates it silently.

**Stage 2 — in-memory override** (`components/viewer-x/components/blocks/model-details-panel/ModelDetailsPanel.tsx:195-214`):

```ts
const activeActivityIds = new Set(activeSchedule.activities.keys())
const forModelActiveSchedule = forModel.filter(l => activeActivityIds.has(l.activityId))
linkedCount = new Set(forModelActiveSchedule.map(l => l.modelElementId)).size
```

So the figure on screen is **distinct elements of this model linked to an activity in the ACTIVE
schedule**. Links to any other schedule are counted by the SQL and then dropped by the override.

Also at `:183-193`: "Total" prefers a Forge viewer count over the DuckDB count when it is non-zero,
and logs a warning when the two disagree — in-repo evidence, predating this ticket, that Forge
counts and DuckDB row counts routinely diverge.

**Filters the editor does NOT apply:** no date filter, no status filter, no object-id map, no
federation scope. It is one model, one join.

---

## 3. The dashboard's number, exactly

Three stages.

**Stage 1 — `element_base_data`** (`components/services/dashboard-progress/dashboard-progress-service.ts:2581-2593`):

```sql
CREATE OR REPLACE TABLE element_base_data AS
SELECT map.objectId, map.modelElementId, es.installationStatus,
       CAST(es.installationCheckDate AS TIMESTAMP)::DATE AS checkDate,
       MIN(CAST(act.startDate  AS TIMESTAMP)::DATE) AS startDate,
       MAX(CAST(act.finishDate AS TIMESTAMP)::DATE) AS endDate
FROM svf2_object_id_map map
LEFT JOIN element_status es ON map.modelElementId = es.modelElementId
LEFT JOIN activity_links al ON map.modelElementId = al.modelElementId
LEFT JOIN api_activities act ON al.activityId = act.itemId
GROUP BY map.objectId, map.modelElementId, es.installationStatus, es.installationCheckDate
```

The **map drives it and every join is LEFT**, so `COUNT(DISTINCT modelElementId)` here measures the
object-id map's universe and nothing else. It does not move when links are missing. That is what
makes it useful as a middle rung.

Grain is `(objectId, modelElementId, installationStatus, installationCheckDate)`. One element with
many objects yields many rows — by design, because the pipeline paints geometry.

**Stage 2 — `_visible_elements`** (`:2030-2070`, `:2116-2125`):

```sql
SELECT DISTINCT objectId, modelElementId, status_code
FROM (... CASE ... END as status_code FROM element_base_data base <joins> <where>)
WHERE status_code IN (<selectedStatuses>) AND status_code IS NOT NULL
```

with

```sql
-- only when dateRangeStart is truthy
base.endDate >= '<dateRangeStart>'
-- always
CASE WHEN base.installationStatus = 'INSTALLED_ACCURATELY' AND base.checkDate IS NOT NULL
     THEN LEAST(base.checkDate, base.startDate) ELSE base.startDate END <= '<dateRangeEnd>'
```

**Stage 3 — the tile** (`components/dashboard-panels/viewer/dashboard-element-stats.tsx:41`):

```ts
const displayTotal = stats.visible > 0 ? stats.visible : (elsCount ?? 0)
```

`stats.visible` is set from `countDistinctElements(...)` at
`components/dashboard-panels/viewer/dashboard-color-service.ts:700` and `:876` — the PR #2084 fix,
present at both call sites. But note the **fallback**: when `visible` is 0 the tile shows `elsCount`
instead, a different number entirely. Several paths set it to 0 (`:131`, `:421`, `:560`, `:817`).

---

## 4. The comparison, on one page

| Axis | Editor | Dashboard |
|---|---|---|
| Driving table | `project_element_list` | `svf2_object_id_map` |
| Scope | **one `modelId`** | whole federation, all loaded models |
| Must be linked? | **yes** — INNER JOIN `activity_links` | no join by default; unlinked drop out via NULL dates (§5) |
| Schedule filter | **active schedule only** (in-memory, `ModelDetailsPanel.tsx:206`) | via `api_activities`, whatever the progress artefact contains |
| Date filter | **none** | `endDate >= start` and `displayDate <= end` |
| Status filter | **none** | `status_code IN (selected) AND IS NOT NULL` |
| Unit shown as "Total" | `COUNT(*)` rows, or a Forge count if non-zero | distinct `modelElementId` (post-#2084), or `elsCount` if zero |
| Unit shown as "Linked"/"Total" | distinct `modelElementId` | distinct `modelElementId` |
| Refresh bound | `lastSyncDateTime` only (`services/linking/linking-service.ts:93-104`) | additionally capped at the progress artefact's `calculatedOn` (`dashboard-progress-service.ts:674`) |

**Read the table as a subtraction.** Start from the editor's number for one model. The dashboard
should be *higher* for federation scope, and *lower* for the date filter, the status filter and the
undated exclusion. Any residual after accounting for those is the actual defect.

---

## 5. The finding that changes how to run the test — "full date range" is not "all elements"

This is the important part of this document and it was not previously written down anywhere.

Ilia's instruction was to take the full date range so we are comparing maximum available elements.
**That does not neutralise the date filter.** From the SQL in §3:

- `startDate` is `MIN(act.startDate)` and `endDate` is `MAX(act.finishDate)` over a **LEFT JOIN**.
- An element with **no activity link** gets `startDate = NULL`, `endDate = NULL`.
- An element whose linked activities **all lack a start date** gets `startDate = NULL`. Same for
  finish.
- In SQL, `NULL <= '2030-01-01'` is NULL, not TRUE. `NULL >= '2020-01-01'` is NULL, not TRUE.

So those elements fail the predicate **at every date range, including the widest one you can drag
to.** Widening the slider cannot recover them. They are not "outside the window"; they have no
window.

Three distinct populations are silently excluded and today are indistinguishable from each other:

1. elements with no activity link at all — arguably correct, the tile is about scheduled work;
2. elements linked only to activities with a NULL start or finish date — **almost certainly not
   intended**, and one undated activity removes all of its elements;
3. elements whose dates are NULL only because **`api_activities` has not finished loading** — a
   load-order race, not a data property.

(3) deserves emphasis. It is the same code producing different numbers depending on timing, which
is exactly the profile of "Prod agrees, Staging is 52k short, identical build". The diagnostic
therefore logs `apiActivitiesRows` next to the undated count.

The branch adds this rung as `baseDataUndated`:

```sql
SELECT COUNT(DISTINCT modelElementId) FROM element_base_data
WHERE startDate IS NULL OR endDate IS NULL
```

---

## 6. Divergence vectors, ranked, with direction

| # | Vector | Direction | Where |
|---|---|---|---|
| 1 | Undated / unlinked elements excluded at any range (§5) | dashboard **lower** | `dashboard-progress-service.ts:2041-2050` |
| 2 | `api_activities` not fully loaded when the query runs | dashboard **lower**, timing-dependent | same predicate, via the LEFT JOIN |
| 3 | Status filter — element has no classifiable status | dashboard **lower** | `:2118` |
| 4 | Federation scope vs one model | dashboard **higher** | §4 |
| 5 | Editor's active-schedule override drops other-schedule links | editor **lower** | `ModelDetailsPanel.tsx:206` |
| 6 | Object-id map version older than the loaded model | dashboard **lower** | `loaders/artefact-loader.ts` version fallback |
| 7 | `calculatedOn` cap on the dashboard's link sync | dashboard **lower** | `:674`, bounded to post-parquet links only (see PLT-2874 folder, 08-14) |
| 8 | Editor "Total" is `COUNT(*)`, not distinct | editor **higher** | `duckdb-element-store.ts:590` |
| 9 | Tile falls back to `elsCount` when visible is 0 | either | `dashboard-element-stats.tsx:41` |
| 10 | Which federated model the dashboard picks | either | `dashboard-project-service.ts:164-176`, first match, no ordering guarantee |

Vectors 1, 2 and 3 all push the dashboard **down** and all three are currently invisible. That is
the shape QA reported. Vectors 4 and 8 push the other way and are what the original 07-07 overcount
was about.

---

## 7. How to organise the debug logs — and the constraint that decides it

### The constraint nobody had checked

`services/logService/logger.ts:15-19`:

```ts
const CONSOLE_VERBOSE = process.env.NODE_ENV !== 'production'
function shouldLogToConsole(level) {
  return level === 'warn' || level === 'error' || CONSOLE_VERBOSE
}
```

**`logger.debug` and `logger.info` never reach the console on a production build.** Staging and
Prod are the only environments this ticket is about, so any diagnostic written at info is invisible
precisely where it is needed. The first version of the branch made this mistake; it now logs at
**warn**.

Separately — and this is a real finding worth its own ticket —
`components/dashboard-provider/dashboard-logger.ts`:

```ts
const CURRENT_LEVEL: LogLevel = 'SILENT'
const LEVELS = { SILENT: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 0 }
const shouldLog = level => LEVELS[level] <= LEVELS[CURRENT_LEVEL]
```

`CURRENT_LEVEL` is hardcoded `SILENT` in every environment, and `DEBUG` is ranked `0`, the same as
`SILENT`. With `CURRENT_LEVEL = SILENT`, the only level that passes `<= 0` is **DEBUG**. So every
direct `dashboardLogger.info/warn/error(...)` call and `logInitSummary` is suppressed everywhere,
while `dashboardLogger.debug` is the one thing that prints. This does **not** affect
`createServiceLogger` (`:236-252`), which wraps `createLogger` directly and bypasses this table —
but it does mean a chunk of dashboard logging is dead, including errors.

**The build does not strip anything.** `webpack/webpack.prod.js:65-90` and
`webpack.prod.ci.js:62-83` configure Terser with no `drop_console` and no `pure_funcs`. So
`console.*` and warn-level logger calls survive to production untouched.

### The channel that already exists and should be used

There is a complete session-log pipeline already in place, and support is already using it:

- `createLogger`'s `write()` appends **every** line that passes `minLevel` to an OPFS file, on a
  path completely independent of whether the console shows it (`logger.ts:99-108`). So info-level
  lines are captured on prod even though they are not printed.
- `services/logService/log-auto-upload.ts` uploads that file every ~3 minutes, on any `error`-level
  event (debounced 10s, capped 10/tab), and on page hide.
- **Help menu → `SyncLogModal`** gives the user a button — *"Help us diagnose your issue faster:
  sync your session logs and include the session ID in your support ticket"* — which uploads on
  demand and copies the session id to the clipboard.

That is exactly where `platform-web-4d72a647-c1da-4f87-9296-3ef58a8e8e5e` in PLT-3084 came from.

**So the answer to "how do we organise debug logs to know more" is: we already have the transport,
and we have not been putting anything worth reading into it.** No new mechanism, no query param, no
debug flag is needed. What is needed is that the diagnostics be (a) at warn so they reach the
console too, (b) tagged so they are greppable in an uploaded log, and (c) emitted once, not per
render.

### The design, as implemented on `PLT-2874-dashboard-element-count-diagnostics`

Two blocks, one tag, correlated by session id — separate because §1.

```
[PLT-2874] editor element ladder
  modelId, totalRows, totalElements, allModelsElements, linkedElements, linkRows

[PLT-2874] dashboard element ladder
  projectId, calculatedOn, dateRange,
  objectIdMapElements, activityLinkElements, apiActivitiesRows,
  baseDataElements, baseDataObjects, baseDataUndated, visibleElements
```

Conventions worth keeping for any future diagnostic here:

- **Unit in the key name.** `Rows` = raw rows, `Elements` = DISTINCT `modelElementId`, `Objects` =
  DISTINCT `objectId`. Most of this ticket's history is people comparing two different units.
- **Warn, not info** — see the constraint above.
- **Once per instance / per model**, never per filter change. `_hasLoggedCountLadder` and
  `_loggedElementLadderModelIds`.
- **A missing table reads as `"unavailable"`, not `0`.** Zero and absent mean different things and
  conflating them has already cost this ticket a round.
- One flat object, so it pastes as one block.

### Decision table

Compare `baseDataElements` against the editor's `totalElements` for the same model — expect the map
to read **slightly above** it (on FAR01 it held 1,364 more), not equal.

| Reading | Cause |
|---|---|
| `activityLinkElements` short, `baseDataElements` full | link sync behind — `calculatedOn` cap or a stale links parquet |
| `activityLinkElements` full, `baseDataElements` short | wrong or older `svf2-object-id-map` version |
| both full, `baseDataUndated` large, `apiActivitiesRows` **0 or small** | `api_activities` not loaded when the query ran — a race, re-check on reload |
| both full, `baseDataUndated` large, `apiActivitiesRows` plausible | genuinely undated activities in the schedule — a data question for the planner |
| all full, `baseDataUndated` small, `visibleElements` short | the date window or the status filter |
| `baseDataObjects` >> `baseDataElements` | normal object expansion; do not read it as duplication |

### What the frontend cannot answer

- Whether Staging's artefacts are stale relative to Prod's, and by how much. `calculatedOn` is
  logged, but the comparison is between environments and needs both sides.
- Whether the activity-links parquet and the progress calculation are published by the same
  pipeline run. This decides whether the `calculatedOn` cap is a real vector or a no-op, and it is
  a data-pipeline question.
- Whether `svf2_object_id_map` and `project_element_list` are expected to hold the same element
  universe. On FAR01 they differed by 1,364 and nobody has said whether that is normal. Ali was
  asked on the ticket on 07-31 and has not answered.

---

## 8. Note on how this was produced

Read directly from source this session. A parallel multi-agent trace was attempted first and
**failed completely** — a harness fault stripped required parameters from every subagent's file
tools, so all six readers received zero bytes, and the synthesis step correctly refused to write a
design with fabricated citations rather than produce something that looked verified. Nothing in
this document comes from that run. Recorded because the failure mode is worth recognising: a
confident-looking synthesis over an empty dossier is the thing to watch for.
