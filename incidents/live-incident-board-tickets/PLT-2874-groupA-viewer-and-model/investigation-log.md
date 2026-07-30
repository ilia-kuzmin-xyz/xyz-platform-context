# PLT-2874 — investigation log

## 2026-07-30 — the two numbers are counting different things (read from source, not yet observed)

FAR01. Editor federated file says **~628,000 linked elements**. Dashboard says **~695,000**
with the scrubber at the end of the project. Yash linked LVN1 (Freshdesk 7514) on 07-27 as a
second project with the same symptom, there with three numbers instead of two.

Each number was traced to the code that produces it. They do not measure the same quantity, so
a gap is expected. Whether the *whole* 67k gap is definitional is still open.

### Number 1 — editor "Linked", `ModelDetailsPanel.tsx:220-224`

```ts
linkedCount: new Set(forModelActiveSchedule.map(l => l.modelElementId)).size
```

**Distinct elements**, with two filters applied before the count:

- `getLinkedElementIdsInModel(modelId, …)` (`duckdb-element-store.ts:391`) keeps only elements
  present in `project_element_list` **for the selected model**.
- `activeActivityIds.has(l.activityId)` keeps only links whose activity is in the **active
  schedule**. The panel heading says so: "Elements linked to Latest Program".

So a link to an activity from an older program, or to an element the model does not claim, is
excluded here.

### Number 2 — dashboard "Total", `dashboard-color-service.ts:679-698`

```ts
this.coloredDbIds = Array.from(elementsByStatus.values()).flat()
…
this.statisticsService.setVisibleElements(this.coloredDbIds.length)
```

`dashboard-element-stats.tsx:41` then displays `stats.visible` whenever it is non-zero, in
preference to the geometry count. **There is no dedup anywhere on this path** — `.length` is a
row count, one entry per row returned by the status query.

### Where the rows multiply

`getElementsWithDynamicStatus` (`dashboard-progress-service.ts:1990`) ends with:

```sql
SELECT DISTINCT objectId, modelElementId, status_code FROM computed_status
```

DISTINCT on the **triple**, not on the element. Its source is `element_base_data`
(`:2444-2458`):

```sql
CREATE OR REPLACE TABLE element_base_data AS
SELECT map.objectId, map.modelElementId, es.installationStatus,
       CAST(es.installationCheckDate AS TIMESTAMP)::DATE AS checkDate,
       MIN(...act.startDate...) AS startDate, MAX(...act.finishDate...) AS endDate
FROM svf2_object_id_map map
LEFT JOIN element_status es ON map.modelElementId = es.modelElementId
LEFT JOIN activity_links al ON map.modelElementId = al.modelElementId
LEFT JOIN api_activities act ON al.activityId = act.itemId
GROUP BY map.objectId, map.modelElementId, es.installationStatus, es.installationCheckDate
```

Three ways one element becomes several rows:

1. **One `modelElementId` with several `objectId`s in `svf2_object_id_map`.** The map is scoped
   to a single artefact for the activated model (`artefact-loader.ts:217-242`), but that model
   is the **federated** one, and a federation contains geometry from every sub-model. If two
   sub-models share element identity, the federated file holds two geometry objects that both
   map back to the same `modelElementId`. **This is the PLT-2909 signature.** On ATL08, 53% of
   elements were claimed by 3+ models. FAR01 has not been measured for this.
2. **Several `element_status` rows per element** with differing `installationStatus` or
   `installationCheckDate`. The GROUP BY collapses identical pairs only.
3. Both of the above then survive the `SELECT DISTINCT objectId, modelElementId, status_code`
   and land in `coloredDbIds` uncounted-for.

Note the multiplication is **not** one row per link — activities are aggregated with
MIN/MAX inside the GROUP BY, so an element on five activities is still one row for that
(objectId, status) pair.

### Prediction

Dashboard > editor, always, on any project where elements are shared across sub-models or carry
more than one status row. Direction matches FAR01 (695k > 628k) and LVN1.

## How to confirm without any DB access

Everything needed is already logged. Open FAR01 dashboard with DevTools console open, drag the
scrubber to the end, then read:

| Log line | Source | What it is |
|---|---|---|
| `Total elements in model: N` | `dashboard-statistics-service.ts:103` | unique dbIds in the loaded geometry |
| `[📊 DYNAMIC-STATUS] ✓ View built: X/Y elements have status` | `:2518` | Y = `COUNT(*)` of `element_base_data`, a row count |
| `Found N elements with status codes: [...]` | `:2036` | rows returned for the current scrubber position |
| `Applied dynamic status colors to N elements` | `:681` | `coloredDbIds.length`, **this is the 695,000** |

**The decisive check is the first line against the last.** `Total elements in model` is a
`Set<number>` of dbIds, so it is a true count of geometry objects and is an upper bound on how
many distinct elements can possibly be coloured. If it is **below 695,000**, then 695,000 cannot
be distinct elements and the dashboard number is confirmed to be inflated rows. No query needed,
pigeonhole.

Secondary, in the editor console on the same project:

- `[ModelDetailsPanel] Element count mismatch for model …` (`ModelDetailsPanel.tsx:194`) prints
  `dbtotalCount` (rows in `project_element_list` for the model) against `viewerElementCount`.
  A gap here is the parquet-vs-geometry divergence already noted in `dashboard/pitfalls.md`.

## Open questions

1. Is the whole 67k the definitional gap, or is part of it real? Only the log comparison above
   settles it.
2. If the duplication is driver 1, PLT-2874 and PLT-2909 are the **same defect** seen from two
   surfaces, and PLT-2874 is not independently fixable.
3. Which number is the one the customer should be shown? Neither is wrong for its own purpose,
   but two surfaces labelling different quantities "linked elements" is the reportable bug
   regardless of what the audit finds.

## Caveat

All of the above is read from source. Nothing has been observed at runtime on FAR01. The
mechanism is solid; the claim that it accounts for the specific 67k is not, and should not be
put on the ticket until the log lines are read. See PLT-2918's log for what happens when that
distinction is skipped.
