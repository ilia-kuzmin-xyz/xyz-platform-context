# PLT-2649 — settled against live prod data, 2026-08-27

First session to reach **live prod** for this ticket. Everything below is measured, not inferred.
Supersedes the inference-based sections of `platformapi-questions.md` — that file's five questions
are answered here and it should be read as history, not as an open list.

Read-only for §1-6. **Amended later the same day:** one capture point *was* subsequently patched,
with explicit approval — see the appended section "the one-pin test RAN" at the end of this file,
which supersedes §4's "still unproven" and §"What this means for the next action" item 4.

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

> **Superseded the same day — do not act on the two paragraphs above.** The one-pin test settled
> both: the PATCH *does* persist coordinates, and it *is* a read-time join (the 54 capture rows were
> never written yet their reported height changed). See the appended section at the end of this file.
> The fix is 101 points and it is ours.

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

---

# 2026-08-27, later — the one-pin test RAN. Fix confirmed as 101 rows, ours.

Executed with Ilia's explicit per-pin approval. One row, one field.

## What was done

`PATCH /api/v2/projects/129a3279…/room-capture-points/00b5344c-57a1-4e87-a0fe-df1bbbf68961`
body `{"yMeters": 0}` → **HTTP 200**.

Target: `PH2-L00-MB DATAHALL 1.1 - Default Point`, 54 photos.

## Result 1 — the PATCH persists coordinates, and touches nothing else

| field | before | after |
|---|---|---|
| `yMeters` | 50.39999771118164 | **0** |
| `lastModifiedOn` | null | 2026-08-27T14:38:19.241Z |
| `xMeters`, `zMeters`, `modelRoomId`, `modelLevelId`, `userCapturePointId`, `createdFrom` | — | **all unchanged** |

Sending only `yMeters` left the name alone, so the duplicate-name constraint is never engaged.
**Use PATCH, not PUT** — PUT (`rooms.capturepoints.routes.ts:231`) demands `userCapturePointId` in
the body and would re-submit the name.

## Result 2 — the 54 photos followed, and `GET /360captures` JOINS at read time

After the patch:

- the 54 captures on that point report `yMeters` **0** (was 50.4);
- the 1,873 captures on the level's other 100 points still report **50.4**;
- **not one of the 54 capture rows was written** — `lastModifiedOn` identical on all 54
  (e.g. `2026-04-01T08:22:24.770Z` before and after).

Their reported coordinate changed while their own rows did not. So the capture's position is
**joined from `room_capture_points` at read time**, not stored per photo.

**This answers question 2 of `platformapi-questions.md` definitively, and its §2 inference was
wrong.** The size of the fix is **101 capture points**, not 1,868 capture rows. And it is a data
correction we can perform ourselves — no backend work, no release.

## State of prod right now

⚠️ **That one point is still at `yMeters = 0`.** Left in place deliberately so the pin can be
eyeballed in the 360 tab. It is the only one of 101 corrected, so on PA12 today one pin sits at
ground level and 100 sit ~50 m up. Revert with:

```
PATCH …/room-capture-points/00b5344c-57a1-4e87-a0fe-df1bbbf68961   {"yMeters": 50.39999771118164}
```

## What this does and does not close

Closes: is the PATCH real (yes), does it persist (yes), do photos follow (yes), how many rows (101).

Does **not** close: the model level still reads **−50.4**, so any *newly* generated capture point on
that floor will be 50 m underground. Correcting the 101 points fixes every existing photo and
nothing about the future. The model fix is still required and still the customer's.

Also open: the target height. 0.0 is used here because the generator sets pin y = level elevation
exactly, and the two duplicate `DC-0G-FFL` levels both read ≈0. If DC's ground should match the
other buildings (GT/SS/FH 0G read −0.2 to −0.298), the target is −0.2. Worth one line from whoever
owns the datum before the remaining 100 are touched.

---

# 2026-08-27, later still — why the target is 0.0, and the Phase 2 ground floor rooms are GONE

Triggered by Ilia asking where "≈0" came from and how we would prove it rather than assume it.

## Where the original claim came from — one informal argument, never checked

`context.md:336` (and Ilia's own 07-16 Jira comment, `context.md:64`): the sibling DC levels sit at
**5.3 / 10.6 / 15.9**, forming a coherent 5.3 m floor-to-floor series "that 50.4 m plainly breaks."
The target was written as "50.4 → 0" and as "~0" — an extrapolation, stated once, then carried
through five weeks of this ticket unexamined. It happened to be right. It was never proven.

## Now proven three independent ways — the answer is exactly 0.000

**1. The ladder is exact, not approximate.** Every DC floor is an exact integer multiple of
DC-01's elevation:

| level | elevation | ratio to DC-01 |
|---|---|---|
| DC-0G-FFL (unspaced) | 0.000000000000000 | ×0 exactly |
| DC-01-FFL | 5.300000065502532 | ×1 exactly |
| DC-02-FFL | 10.600000131005064 | ×2 exactly |
| DC-03-FFL | 15.900000196507596 | ×3 exactly |

Least-squares through floors 1-3 gives floor-to-floor 5.300000065502535 and an intercept of
**−5.9e-15** — zero to floating-point precision. (DC-04 and above break the series; the building
changes floor height above L03, which does not affect the intercept.)

**2. Physical room geometry, independent of any level field.** `project-rooms` parquet carries
`elevationMinMeters` per room, regenerated with the model:

- the 11 **PH1-L00** rooms (Phase 1 ground floor) sit at **0.000** → 5.200;
- `datahall coté PDC 112`, the sole room on the unspaced `DC-0G-FFL`, sits at **0.000** → 3.200.

Actual room floors on this project's ground level are at 0.000.

**3. The room-to-level rule holds everywhere well-behaved.** `min(room.elevationMinMeters)` equals
its level's `elevation` exactly on 8 of 11 levels (`a418671b`, `65b08248`, `6869795d`, `ac4bdbbb`,
`83c44989`, `5998dc6a`, `f72da41e`, `a8e3fdab`). So level elevation *is* the floor plane.

**Nothing anywhere in the model — no room, no level, no geometry — sits near −50.** The −50.4 now
in the level field is not a datum, it is the error.

### Retracting the −0.2 worry from the previous section

The prior section flagged that `GT - 0G - FFL` / `SS - 0G - FFL` / the new `GB-0G-FFL` read −0.2 to
−0.298 and asked whether DC's ground should match. **It should not, and no question to anyone is
needed.** Those three are all from the 2026-08-06 upload; the *older* `GB-0G-FFL` (`7026451f`,
2025-12-04) reads **0.000** and its rooms sit at 0.000. The datum is 0. **Target for the 101 points
is `yMeters = 0.0`.** Settled.

## ⚠️ NEW AND SERIOUS: the 101 rooms no longer exist

While proving the above:

- all 101 capture points on `f0f4d409` carry a `modelRoomId`;
- **0 of those 101 rooms are present** in the current `project-rooms` parquet;
- **0 rooms named `PH2-L00*` exist at all** — the entire Phase 2 ground floor is absent;
- `isRemoved` is `false` on all 297 surviving rooms, so this is not a soft-delete — the rows are
  simply not in the regenerated artefact;
- Phase 2 still has L01 (30 rooms), L02 (32), L03 (4). Only its ground floor vanished.

So the 2026-08-06 re-import **re-keyed and dropped** the Phase 2 ground floor. The 101 capture
points now reference a `modelRoomId` and a `modelLevelId` that no longer resolve. This confirms
hypothesis 3 from `platformapi-questions.md` ("re-import re-keyed the level") and goes further —
the rooms went with it.

### What that means for the fix

Patching `yMeters = 0` still works for position — proven empirically, the pin and its photos move,
because the render path reads the point's own coordinate and does not need the room to resolve.

But it does **not** make those 1,927 photos whole:

- they stay attached to a level named `DC - 0G - FFL` that exists only as an orphan at −50.4, so
  **XSPCMA-868 is untouched** — the floor filter still offers a phantom floor and an empty real one;
- anything keyed on room association (room-based filter/navigation for those photos) is broken and
  patching a coordinate will not repair it.

**Re-pointing the points to the correct room instead of patching the height is not currently
possible:** the PATCH accepts `modelRoomId`/`modelLevelId` and validates the pair against the model
(`rooms.capturepoints.service.ts:136-140`), but there is no Phase 2 ground floor room in the model
to point at. That option only opens once the customer's model carries those rooms again.

**Revised recommendation:** the model fix is now the *first* step, not the second. Get Phase 2's
ground floor back (level at 0.0, unspaced name, rooms present), then decide between patching 101
heights and re-pointing 101 rooms — re-pointing would fix position, floor and room in one pass.
Patching heights now would deliver a visually-correct-but-still-orphaned result and burn the
customer's second re-upload.

---

# 2026-08-27 — ✅ EXECUTED: all 101 capture points corrected on prod

Approved by Ilia ("go ahead to tweak capture points"). Before-state captured first.

## What ran

`PATCH /api/v2/projects/129a3279…/room-capture-points/{id}` with body `{"yMeters": 0}`, one row at
a time, 101 rows. **101 / 101 returned HTTP 200.** No retries, no conflicts, no failures.

## Verified after, against live prod

| Check | Result |
|---|---|
| capture points on `f0f4d409` | 101, **all at `yMeters` 0** (single distinct value) |
| `lastModifiedOn` now set | 101 / 101 |
| 360 photos on that level | 1,927, **all now report `yMeters` 0** |
| **other** capture points moved | **0** |
| **other** levels' photos moved | **0** |
| capture **rows** rewritten | **0** — re-proves the read-time join |
| project totals | 407 points / 6,944 captures — **unchanged**, nothing created or destroyed |
| `xMeters` / `zMeters` | untouched (100 distinct x values preserved) |

## The record

- **[`analysis/PLT-2649-PA12-capture-points-BEFORE.xlsx`](analysis/PLT-2649-PA12-capture-points-BEFORE.xlsx)**
  — per-row before/after, photo counts, HTTP result, and the exact revert body for each of the 101
  rows. Two sheets: the data, and a summary carrying the still-open items.
- **[`analysis/PLT-2649-capture-points-before-after-2026-08-27.csv`](analysis/PLT-2649-capture-points-before-after-2026-08-27.csv)**
  — same data, diff-friendly, so the next run can see it in `git` without opening Excel.

Revert for any row: `PATCH …/room-capture-points/{id}` with `{"yMeters": 50.39999771118164}`.
Every row was at that exact value beforehand. **Never** use the DELETE endpoint on these — it
soft-deletes the linked photos and cleans up their blobs.

## Blast radius, checked before running rather than after

- **Regular photos are unaffected.** They carry their own coordinates and expose no capture-point
  field. Of 1,882 coordinate-bearing photos, zero sat at 50.4 and zero at exactly 0 — a join would
  have produced a 54-photo cluster at 0 after the pilot patch. Their heights are a continuous
  measured scatter, unlike the level-snapped discrete values capture points hold.
- **Issues** have their own `XMeters`/`YMeters` in a separate table (`issues.service.ts:61`).
- **No parquet artefact holds capture points**, so nothing went stale and nothing needed
  regenerating — unlike the PLT-2882/2909 family.
- **Side effect accepted:** `lastModifiedOn` null → timestamp and `lastModifiedBy` → `ilia.kuzmin`
  on 101 rows. The audit trail reads as a user edit. Also means the optimistic-concurrency check is
  now live on these rows, so a stale client gets a 409 rather than clobbering — safer than before.
- No `modifiedSince` param exists on the capture-points GET, so devices pick the new value up on
  their next ordinary pull. No re-sync storm.

## Durability — will a future model upload undo this?

**No.** The 2026-08-06 upload is the experiment: it changed this very level's elevation from +50.4
to −50.4 in place, same `modelLevelId`, and the 101 points did not move. `lastModifiedOn` was null
on all 407 afterwards. Re-imports update levels and rooms; they never touch capture points.

**One prediction to watch.** Capture points sit 1:1 with rooms on every level where rooms exist
(102/102, 71/71, 33/33, 32/32, 16/16, 14/14, 8/8, 2/2, 1/1 — no exceptions). So if the customer
restores the Phase 2 ground floor rooms, the generator will likely create ~101 **new** capture
points for them, and pins may appear doubled: ours holding the 1,927 photos, the new ones empty.
Deleting the **empty** new ones is safe. Confidence moderate — the 08-06 import only dropped rooms,
never added any, so the generator has not been observed creating points.

## Still open — this fix does not close the ticket

1. **Model level still reads −50.4.** Customer action. New points on that floor would be 50 m
   underground. This is the remaining half of the defect.
2. **All 101 `modelRoomId`s are orphaned** — no `PH2-L00*` room exists. Room name and room filter
   stay broken for these 1,927 photos, and a coordinate patch cannot repair that.
3. **XSPCMA-868 untouched** — the ground floor is still listed under two spellings.
4. **Separate thread worth raising with Sachin/Ali:** a re-import silently dropped an entire
   floor's rooms with `isRemoved` false on every survivor. If it can do that here it can do it
   elsewhere. Not a Revit problem — a pipeline behaviour.

## Note on the workbook

LibreOffice could not complete a recalculation in this environment (`recalc.py` timed out at 100s
and 240s), so the formulas are unverified by machine and were audited by hand. Three real bugs were
caught that way and fixed before delivery: a `=B10-B11` that pointed at the photo count instead of
the height, a `COUNTIF(…,50.4)` that could never match the stored `50.39999771118164`, and HTTP
codes written as text so numeric comparison failed. Totals now use `SUMPRODUCT`/`ROUND`. Worth
remembering: an unrecalculated workbook hides exactly this class of error.
