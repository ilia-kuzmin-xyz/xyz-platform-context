# PLT-2649 — settled against live prod data, 2026-08-27

First session to reach **live prod** for this ticket. Everything below is measured, not inferred.
Supersedes the inference-based sections of `platformapi-questions.md` — that file's five questions
are answered here and it should be read as history, not as an open list.

Read-only throughout. No capture point was modified.

---

## What was actually run

Prod MCP, credential login as `ilia.kuzmin@xyzreality.com`, project
`EQX - PA12 Phase 1&2 -xv2` = `129a3279-da09-4b1d-b7a1-3d07e2079d98`.

| Source | Rows |
|---|---|
| `xyz_get_projects_project_id_room_capture_points` | 407 capture points |
| `xyz_get_projects_project_id_360captures` | 6,944 captures |
| `project-levels` parquet (`models_artefacts` → blob) | 99 levels |
| `xyz_get_projects_project_id_models` | 142 models |

---

## 1. The pins are frozen snapshots — now proven six times over, not once

The theory was "a capture point's height is written once and nothing re-derives it." Live data
confirms it, and the confirmation is much stronger than expected because **seven levels** show the
same frozen drift at different magnitudes:

| levelName | level elevation today | frozen pin height | drift | photos |
|---|---|---|---|---|
| **DC - 0G - FFL** | **−50.400** | **+50.400** | **+100.800** | **1,927** |
| GB-0G-FFL | +0.000 | −0.400 | −0.400 | 36 |
| GB-02-FFL | +10.600 | +10.200 | −0.400 | 24 |
| GB-01-FFL | +5.300 | +4.900 | −0.400 | 24 |
| SS-OG-SSL | +50.100 | +49.700 | −0.400 | 0 |
| SS-B1-Undercroft | +48.100 | +47.700 | −0.400 | 0 |
| SS-01-FFL | +53.800 | +53.400 | −0.400 | 0 |
| *(all six DC/FH levels refreshed 2026-08-06)* | — | matches to 0.000 | 0.000 | 4,831 |

Where a level's elevation has been edited since its points were generated, the points did not
follow. Where it hasn't, they agree **exactly** (delta 0.000). That is the mechanism, measured.

Corroborating: `lastModifiedOn` is **null on all 407** points, `createdFrom` is **System on all
407**. Nothing has ever rewritten a single one.

**Question 3 and 4 of `platformapi-questions.md` are answered: no, re-import does not re-derive
existing rows.** No backend reading required.

## 2. The customer's fix overshot — the level is now −50.4, not 0

This is the finding that changes the plan.

```
project-levels parquet, refreshed 2026-08-06 07:21:52
  f0f4d409-c2b4-42cf-a8a9-c9497aecb3f7   "DC - 0G - FFL"   elevation = -50.400000622892186
```

The July instruction was "the ground floor is at 50.4, set it to 0." What came back on 2026-08-06
is **−50.4**. A sign flip, not a zero. The re-upload *did* land — the levels artefact refreshed on
08-06 and every DC level's elevation changed that day — so the customer did the work and the
platform ingested it. The number they wrote is just still wrong.

Model version confirming the upload: `PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24` **V2, 2026-08-06
12:14:56** — the exact model Yash named in his 08-26 comment.

**So there are two independent defects, and fixing either alone leaves the customer broken:**

- the 1,927 existing photos are frozen at +50.4 → only a data correction moves them;
- the level is at −50.4 → any *new* capture point generated on that floor will be 50 m
  **underground**. Patching the pins without fixing the model just changes which direction it is
  wrong in.

## 3. Sizing, exact

| | count |
|---|---|
| capture points on `f0f4d409` | **101** |
| ...of those holding ≥1 photo | **75** |
| photos on those points | **1,927** |
| distinct (x,y,z) among those 1,927 photos | **75** |
| distinct y among them | **{50.4}** — one value |

1,927 photos hold exactly 75 positions, one per point. The earlier
`analysis/PLT-2649-stale-pinpoints.csv` count of 75 is **correct** and matches live.

Busiest points: `PH2-L00-MB CORRIDOR K.1` (55), `PH2-L00-MB PRIMARY COP_K` (55),
`PH2-L00-MB CORRIDOR H.2` (54), `PH2-L00-MB DATAHALL 1.1` (54, id `00b5344c…`, the one named as the
single-pin test candidate).

Room names are all `PH2-L00-…` — L00, ground floor. Consistent.

### Correction to a number in this folder: 15 more points, but no photos on them

Three further levels sit in the ~50 m band (`SS-OG-SSL` 9 points, `SS-B1-Undercroft` 4,
`SS-01-FFL` 2) = **116 points in the band, not 101**. All 15 extras hold **zero** photos, so they
do not affect the visible bug — but they are only −0.4 m adrift, i.e. they are ordinary drift on a
genuinely high SS structure, **not** part of the 50 m defect. The 50 m defect is `f0f4d409` alone.

## 4. Coordinates come from the point, not the photo — contradicts the prior inference

`platformapi-questions.md` §2 argued from the frontend that captures own their coordinates,
citing "a capture with no `roomCapturePointId` still carries coordinates." **That is false on live
data:**

- 102 captures have `roomCapturePointId = null`. All 102 have `xMeters`, `yMeters`, `zMeters`
  **null** and `modelLevelId` **null** too. No point ⇒ no coordinates.
- Of the 6,842 captures that do link to a point, the number whose own `y` differs from its point's
  `y` is **0** — across all 13 levels, to 4 decimal places.

So the capture's coordinate is the point's coordinate. Whether that is a read-time join or a
copy-at-write that has never once diverged is still not distinguishable from outside — but for the
purposes of this fix it stops mattering: correcting the 101 points is either sufficient (join) or
necessary-and-then-some (copy). It is the right first move under both.

⚠️ Still unproven: whether `PATCH …/room-capture-points/{id}` persists coordinates at all. Our
code has only ever sent a rename through it. Unchanged from the handover.

## 5. XSPCMA-868 — confirmed, and the duplicate is now a triplicate

PA12 carries **three** ground-floor DC levels:

| levelId | levelName | elevation | uploaded |
|---|---|---|---|
| `f0f4d409` | `DC - 0G - FFL` (spaced) | **−50.400** | 2026-08-06 |
| `344df6bc` | `DC-0G-FFL` | 3.2e-16 (≈0) | 2026-08-06 |
| `f72da41e` | `DC-0G-FFL` | 6.3e-13 (≈0) | 2026-02-13 |

All 1,927 photos are on the spaced one. `f72da41e` has one capture point and zero photos;
`344df6bc` has none. The floor filter matches on the name string, so a user picking either
unspaced `DC-0G-FFL` sees an empty floor. **XSPCMA-868 is this, confirmed on live data.**

Fixing pin height does not close it. The photos stay on a level whose name has stray spaces.

## 6. Timeline detail

Captures on the bad level run **2025-05-28 → 2026-08-05**, ~100/month, all at y=50.4 including
the 18 taken in August. There are **no** captures on that level after the 08-06 re-upload, so live
data cannot yet say whether a *newly* generated point would inherit the −50.4. Given §1, it would.

---

## What this means for the next action

1. The model still needs correcting: `DC - 0G - FFL` from −50.4 to **0**, and the stray spaces in
   the name removed while they are in there (closes XSPCMA-868's duplicate).
2. The 101 points need a data correction to **y = 0.0** — the generator sets pin y = level
   elevation exactly (proven by the six 0.000-delta levels), so 0.0 is the target, not 0.4.
3. Order matters: correcting the model first and letting the customer re-upload does **not** fix
   the 1,927 photos. Both are needed. Neither is optional.
4. The one-pin test remains the cheapest way to prove the PATCH works before touching 101 rows.
   **Not run — awaiting approval.** Per `../data-remediation-runbook.md` §3.

## Note for whoever asks the customer

The July message told them to set the ground floor to 0. They set it to −50.4. Worth being careful
about how that is raised — the instruction was ours, it was terse, and the result is a plausible
misreading of it rather than carelessness.

---

## Killed hypotheses (do not re-run)

- ~~"The re-upload never landed."~~ It landed 2026-08-06; levels artefact and model V2 both confirm.
- ~~"The BIM team edited the wrong file."~~ They edited the file Yash named, and it took effect.
  The value they wrote was wrong, which is a different problem.
- ~~"Re-import re-derives capture coordinates."~~ No. `lastModifiedOn` null on all 407, plus six
  levels of frozen drift.
- ~~"Captures own their coordinates independently of the point."~~ No — no point means no
  coordinates at all (102 cases).
- ~~"The fix is 1,868 capture rows."~~ It is 101 points, 75 of which carry photos.
