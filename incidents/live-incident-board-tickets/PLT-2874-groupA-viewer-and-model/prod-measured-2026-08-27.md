# PLT-2874 — both counters reproduced from live prod, 2026-08-27

First time either number has been **measured** rather than reasoned about. Project **FAR01**
(`b28712bb-0691-4db2-a626-85c2f1f5ead6`), federated model `APLD-FAR01-260813`
(`20cff6cf-659f-4eb6-b0d5-ae181080afa1`). Read-only throughout.

This supersedes the "one query settles it" framing in `context.md` §4 — the query has now been run,
and the answer is neither of the two options that section offered.

---

## Headline

**The gap is the residual of two larger effects pulling in opposite directions.** That is why its
sign has flipped between reports and why nobody could pin it down.

```
  editor  (distinct linked elements)                        879,931
  dashboard (non-deduped dbId entries, status-bearing)      851,409
  net gap                                                  -28,522   (-3.2%)

  decomposition, exact:
    population difference   797,527 - 879,931  =  -82,404   dashboard counts FEWER elements
    dbId expansion          851,409 - 797,527  =  +53,882   each element can hold several dbIds
                                                  -------
                            net                    -28,522
```

Ticket reported **+10.7%** (dashboard higher) on 2026-07-07. Today it is **−3.2%** (dashboard
lower). Both are the same mechanism with the two terms in a different balance. The 2026-08-13 QA
report of "Staging broken in the opposite direction" is not a second defect — it is this.

---

## What was measured

| artefact | rows |
|---|---|
| `project-element-list` | 3,211,890 rows / 1,631,508 distinct elements / 69 modelIds |
| `activity-links` | 1,180,217 rows / 1,180,217 distinct elements / 2,560 activities |
| `element-status` | 1,020,385 rows / 1,020,385 distinct elements |
| `svf2-object-id-map` | 74 files; the federation's own is 1,467,926 pairs / 1,389,337 elements |
| models (API) | 121, of which **1** federated |

### Identifying the federation's svf2 map — necessary, and a trap

The project-level `models_artefacts` listing returns **no `modelId`**, so which of the 74 svf2 maps
belongs to which model cannot be read off it. `models_model_id_artefacts` for the federated model
returns **0 artefacts** — the federation has none of its own registered under it.

Matched it by element set instead: one map (`m3`) covers **100.0%** of the federation's 1,389,248
elements at **100.0%** purity. Unambiguous.

⚠️ **Do not union all 74 maps.** They span many model versions and PC/QA variants; unioning gives
13.7M pairs and a dashboard figure of 8.1M — a 9.2× overstatement. An earlier pass in this session
did exactly that and produced a nonsense ratio. One model, one map.

---

## A. The editor counter — 879,931

`COUNT(DISTINCT pel.modelElementId)` over `project_element_list ⋈ activity_links`, scoped to the
federated `modelId` (`duckdb-element-store.ts:360-363`).

**Inside a single model `project_element_list` is exactly 1:1** — 1,389,248 rows, 1,389,248
distinct elements, zero duplicate `(modelId, modelElementId)` pairs. So there is **no** row
duplication at this layer. The `context.md` §2b concern about non-distinct row counts does not
apply here.

`activity_links` is also exactly 1:1 — 1,180,217 rows for 1,180,217 distinct elements. **No element
on FAR01 is linked to more than one activity.** Multi-activity linking, listed as a possible
inflation vector, is empirically zero on this project.

### The 1.95× that is real, and is a different trap

Project-wide, `project_element_list` holds 3,211,890 rows for 1,631,508 elements — **1.97×**. The
cause is structural and benign: an element is listed once under its own source model **and once
under the federation**.

| listed under | elements |
|---|---|
| 1 model | 202,025 |
| 2 models | 1,308,053 |
| 3 models | 94,891 |
| 4-8 models | 26,539 |

Of the 2-model elements, 1,291,799 rows are the federation's. **So summing per-model counts
double-counts by 1,001,704 (1.95×).** Any "total elements" figure built by adding models together
is wrong by roughly a factor of two. Worth checking wherever such a sum exists.

## B. The dashboard counter — 851,409

`coloredDbIds.length` — a flat, non-deduplicated array of `(status-bearing element → Forge dbId)`
entries (`dashboard-color-service.ts:604-643`).

Reproduced as `federation's svf2 map ⋈ element_status`:

- **851,409** dbId entries ← the number the overlay's "Total" shows
- **797,527** distinct source elements behind them
- **1.0676×** inflation, **+53,882 phantom entries**

**The folder's leading hypothesis (axis 1, dbId expansion of a non-deduplicated count) is
CONFIRMED and quantified for the first time: 6.76% on FAR01.** It is real, and it is not big enough
on its own to be the whole story.

Fragment distribution in the federation's map: 1,323,204 elements → 1 dbId, 57,954 → 2, 7,548 → 3,
358 → 4, 19 → 5.

Per-model rates vary: the two largest sub-model maps sampled give 1.0566× and 1.0716×.

## C. The part nobody had named — the two surfaces count different populations

Same identity unit, same scope, federated model only:

| | elements |
|---|---|
| linked to an activity | 879,931 |
| carrying a status | 797,527 |
| **linked but NO status** | **168,529** |
| **status but NOT linked** | **86,052** |
| both | 711,402 |

**254,581 elements sit in one surface and not the other.** This is not a units artefact and no
amount of de-duplication touches it. "Elements linked to the latest program" and "elements the
dashboard colours" are genuinely different questions about different sets.

This term (−82,404) is **larger** than the dbId term (+53,882), which is why the dashboard reads
lower on FAR01 today.

---

## Every plausible reading of "how many elements", project-wide

Offered because the ticket compares two of these and the team has more than once compared two others.

| reading | count |
|---|---|
| `project_element_list` rows | 3,211,890 |
| linked: PEL ⋈ AL rows | 2,053,711 |
| status: ES ⋈ PEL rows | 1,834,115 |
| PEL distinct elements | 1,631,508 |
| `activity_links` rows | 1,180,217 |
| AL distinct elements | 1,180,217 |
| linked, distinct elements | 1,052,007 |
| `element_status` rows | 1,020,385 |
| status, distinct elements | 924,483 |
| linked AND status, distinct | 847,626 |

**Ten defensible answers spanning 3.8×.** Any comparison of two surfaces that does not first state
which row it means is unfalsifiable, which is the underlying reason this ticket has run 7 weeks.

---

## Verdict

**Not a miscalculation.** Both counters compute exactly what their code says. There is no arithmetic
bug on either side.

**But the dashboard's "Total" is not a defensible number as it stands.** It counts renderer
primitives, not things. 53,882 of the 851,409 it reports are the same physical element counted more
than once because its geometry is split across fragments. No user has ever wanted that figure.

Two changes, independent:

1. **De-duplicate the overlay count** — `new Set(coloredDbIds).size` by source element rather than
   `.length`. Removes the 53,882 and makes the number mean "elements". Small, local, FE-only.
2. **Relabel, because it still will not match the editor.** After de-duplication the two figures
   remain 82,404 apart on FAR01, because they count different populations. "Elements linked to
   latest program" vs "elements with a recorded status" — if both labels say what they count, the
   comparison stops looking like a bug.

Doing 1 without 2 leaves a smaller unexplained gap and another ticket in six weeks.

## What remains unverified

- **The July figures (628k / 695k) cannot be reproduced** — the federated model has been
  re-versioned since (`APLD-FAR01-260813`, i.e. 13 Aug), so the element set has moved. The
  *mechanism* reproduces; those two absolute numbers are gone.
- **Which sub-models are loaded when a user views the federation.** I used the federation's own map,
  which matches its element set exactly. If the viewer also loads sub-model maps, the dbId term is
  larger than 6.76% and the sign could flip back.
- **`installationCheckDate` / slider filtering was not applied.** The overlay filters to
  `displayDate <= sliderEndDate`; my 851,409 is the slider-at-end case. That is the ticket's
  scenario, but intermediate positions are not modelled.
- **Nothing was verified in a browser.** These are the artefacts the browser reads, queried
  directly. A runtime check of `coloredDbIds.length` against 851,409 would close the loop.

## Reproduction

```
prod MCP -> xyz_get_projects_project_id_models_artefacts        (project-level parquet URLs)
         -> xyz_get_projects_project_id_models                  (find isFederated)
blob GET  project-element-list 58.6 MB | activity-links 24.6 MB | element-status 22.0 MB
          svf2-object-id-map 74 files, 280 MB total (only the federation's is needed, 30.4 MB)
duckdb + pytz; match the map to the federation by element-set overlap, never by unioning.
```
Recipe: `incidents/prod-mcp-access.md`.
