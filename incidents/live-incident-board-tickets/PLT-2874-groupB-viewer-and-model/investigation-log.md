# PLT-2874 — investigation log

FAR01 (`b28712bb-0691-4db2-a626-85c2f1f5ead6`). Editor federated file reported ~628,000 linked
elements on 07-07; dashboard reported ~695,000 with the scrubber at the end. Yash linked LVN1
(Freshdesk 7514) on 07-27 as a second project with the same symptom.

## 2026-07-30 — RESOLVED in diagnosis: the two surfaces count different units

**The editor counts elements. The dashboard counts geometry objects.** On this model there are
9.24% more objects than elements, and that accounts for the whole reported gap.

```
628,000 (editor, linked elements) × 1.0924 = 686,000     reported dashboard: 695,000
```

1.3% out over three weeks of edits. Nothing else measured comes close to this magnitude.

### Measured on prod, 2026-07-30

`element_base_data` (dashboard DuckDB):

| metric | value |
|---|---|
| rows | 737,093 |
| distinct `objectId` | 737,093 |
| distinct `modelElementId` | **668,978** |
| excess objects | **68,115 (9.24%)** |

`rows` equals `distinct_objects` exactly, so there is **no row duplication** — the LEFT JOIN on
`element_status` contributes nothing and the GROUP BY collapses nothing.

Objects-per-element distribution (sums to 68,115 and 668,978 exactly):

| objects/element | elements | excess |
|---|---|---|
| 1 | 611,920 | 0 |
| 2 | 50,395 | 50,395 |
| 3 | 6,022 | 12,044 |
| 4 | 334 | 1,002 |
| 5 | 20 | 80 |
| 6 | 135 | 675 |
| 7 | 24 | 144 |
| 12 | 3 | 33 |
| 16 | 2 | 30 |
| 21 | 102 | 2,040 |
| 47 | 6 | 276 |
| 54 | 14 | 742 |
| 655 | 1 | 654 |

91.5% singletons. Doubles are 74% of the excess, doubles plus triples 92%. The tail (641
elements at 4+) is 5,676 objects, and the exact repeated counts at 21 / 47 / 54 look like a
specific assembly placed many times rather than corruption.

### The two code paths

**Editor "Linked"** — `ModelDetailsPanel.tsx:220-224`:

```ts
linkedCount: new Set(forModelActiveSchedule.map(l => l.modelElementId)).size
```

Distinct `modelElementId`, filtered to the selected model (`getLinkedElementIdsInModel`,
`duckdb-element-store.ts:391`) and to the active schedule. Heading: "Elements linked to Latest
Program".

**Dashboard "Total"** — `dashboard-color-service.ts:679-698`:

```ts
this.coloredDbIds = Array.from(elementsByStatus.values()).flat()
this.statisticsService.setVisibleElements(this.coloredDbIds.length)
```

`coloredDbIds` holds `objectId`s. `dashboard-element-stats.tsx:41` then shows `stats.visible` in
preference to the geometry count, under the label **"Elements"**. Confirmed against prod: the
five status buckets summed to exactly the displayed total (94,425 + 105,202 + 340,064 + 30,737 +
104,719 = 675,147).

Colouring every object is correct — the viewer must paint all of them. **The defect is the
label.** `_visible_elements` (`dashboard-progress-service.ts:1999`) already carries
`modelElementId`, so the honest number is a `COUNT(DISTINCT modelElementId)` away with no
pipeline change.

### Proposed fix

In `_applyColorsToViewer`, keep `coloredDbIds` for painting and fragment visibility, but feed
`setElementsWithStatus` / `setVisibleElements` a distinct-element count. The status query already
selects `modelElementId`, so either count distinct in JS from `elementsWithStatus`, or read
`SELECT COUNT(DISTINCT modelElementId) FROM _visible_elements`.

Fixes FAR01 and LVN1 together. No backend or pipeline work.

## Hypotheses tested and killed — do not re-run these

1. **Duplicate rows per object** (multi-status, or map producing repeat rows). Dead:
   `rows == distinct_objects` in both `element_base_data` and `_visible_elements`.
2. **Pigeonhole against geometry count.** Proposed as decisive; it is not. 675,147 sits below the
   737,093 distinct objects, so the test never fires.
3. **PLT-2909 cross-write.** The shape does not match. ATL08 had 366,840 elements at 3+ claimants
   (53%) with a tail to 19. FAR01 is 91.5% singletons with 0.096% at 4+. **The two tickets are
   independent.**
4. **Links to activities from an older program.** Dead: `api_activities` loads only the current
   schedule revision (`api-activities-loader.ts:71-73`), so both surfaces are on the latest
   program.
5. **Dashboard reading the wrong federated model.** Real defect (see below) but not the cause
   here: the two federated models are `20cff6cf-…` at 667,614 elements and `992055de-…` at
   665,074, only 2,540 apart. Cannot produce a 67,000 gap.

## Spun out: dashboard picks an arbitrary model from the federated folder

`dashboard-project-service.ts:164-175`:

```ts
const federatedFolder = folders.find(f => f.folderName?.toLowerCase().includes('federated'))
const federatedModel = models.find(m => m.parentModelFolderId === federatedFolder.modelFolderId)
```

`.find()` — first match in the paginated models response. No `isFederated` flag, no version or
recency rule. Every number on the dashboard derives from that one file and the others are
invisible. FAR01 has two near-twin models so the impact is 0.4% today, but a project with two
genuinely different federated models would show arbitrary figures depending on API ordering.
Worth its own ticket.

## Also noted

- **Dashboard's element universe is `svf2-object-id-map`; the editor's is `project-element-list`.**
  668,978 against 667,614 for the larger candidate model, so the map carries 1,364 elements the
  element list does not. Consistent with the divergence already in `dashboard/pitfalls.md`, and it
  means element counts cannot identify which model the dashboard loaded.

## Outstanding

One reading has not reconciled. `_visible_elements` measured 581,878 objects / 528,314 elements,
but the console showed `Total: 675,147`. 528,314 is below the 628,000 linked, so that query ran
with the scrubber short of the end or a filter applied. Re-run with the scrubber hard right and
filters cleared:

```sql
SELECT COUNT(*) AS rows, COUNT(DISTINCT modelElementId) AS elements FROM _visible_elements;
```

`rows` should equal the on-screen Total. That closes the chain from parquet to pixel. The
diagnosis does not depend on it, but the ticket comment should not quote exact figures until it
lands.

## Tooling notes for the next person

- **Dashboard service logs are unreachable in every build.** `dashboard-logger.ts:35` hardcodes
  `CURRENT_LEVEL = 'SILENT'`, so every `logger.info` / `logger.success` is dropped, including
  `[📊 DYNAMIC-STATUS]`. `window.dashboardLog` only edits the exclusion list, not the level. The
  lines that do appear are raw `console.log` / `console.table`.
- **Query the page's DuckDB directly.** `element_base_data` is a normal table and survives;
  `_visible_elements` is TEMP, so it is only visible on the connection that created it.
  `svf2_object_id_map` is dropped after the view is built (`:2521`).
- **`GET /api/v2/projects/{id}/models/artefacts` returns a Spring page envelope**
  (`content` / `pageable` / …), but `model-api-service.ts:81` returns `data` straight through and
  callers run `.filter()` on it. Worth a look — either the app reaches a different origin
  (`api-instance.ts:49` builds the base from `SERVER_API_URL`) or that path is broken.
- Parquet URLs can be lifted from the Network tab, already SAS-signed, and read by DuckDB over
  `httpfs`. Reconstructing `element_base_data` from parquet needs only `svf2-object-id-map` and
  `element-status` — the activity joins cannot change the row count because the GROUP BY key
  holds no activity column.
