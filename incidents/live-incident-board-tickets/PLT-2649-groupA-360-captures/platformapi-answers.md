# PLT-2649 — the five platformapi questions, ANSWERED (2026-08-27, later session)

Answers the handover in [`platformapi-questions.md`](platformapi-questions.md). That file was written
by a session **without** `platformapi` access. This session **had** it, and read the code.

**Headline: the root cause is settled, and the fix is 75 rows, not 1,868.**

> The 360 pin's height is a **stored number on the capture point row**. It is not derived from the
> model level at read time, and nothing in platform-api ever recomputes it. Correcting the level in
> the source model and re-uploading therefore **could never have moved the pins** — not because the
> re-upload failed, but because no code path exists that would have applied it.

This **supersedes** the "capture rows own their coordinates → 1,868-row fix" lean in
`platformapi-questions.md` §2. That inference was wrong. Reasoning preserved below.

---

## Answers

### Q1. Does `PATCH /room-capture-points/{id}` persist coordinates? — **YES. Confirmed by test.**

Not an inference. There is an e2e test that runs against a real Postgres with the real stored
procedure:

```
test/e2e/api/rooms.capturepoints.e2e.spec.ts:406-425
  PATCH { xMeters: 77.25 }
  → expect(row.XMeters).to.equal(77.25)
  → expect(row.YMeters).to.equal(originalY)     // unsent field untouched
```

So: coordinates persist, and **partial patch semantics are correct** — fields absent from the body
are left alone. The service passes `null` for unsent keys
(`src/services/rooms.capturepoints.service.ts:129-131`) and the SP treats `null` as "no change".

The decision-table branch *"handler ignores coordinate fields → everything goes to backend"* is
**dead**. We can fix this ourselves.

### Q2. Does `GET /360captures` return the capture's own coordinates, or the capture point's? — **The capture point's.**

This was the question that sized the fix. Five independent lines of evidence, all agreeing:

1. **The insert never writes coordinates.** `usp_Insert360Capture` is called with 16 arguments and
   not one is a coordinate (`src/services/360capture.service.ts:75-92`). Nor does the update:
   `usp_Update360Capture` takes `(projectId, fileReferenceId, plannedRoomCapturePointId,
   xyzDisplayName, description, updatedBy)` — `:16,:50`.
2. **The capture table's own coordinate columns are named differently.** `xyz."360Capture"` has
   `ActualXMeters / ActualYMeters / ActualZMeters` (`test/e2e/util/db-helper.ts:606`) — note
   *Actual*. `xyz."RoomCapturePoint"` has plain `XMeters / YMeters / ZMeters`.
3. **The controller reads the plain names.** `360captures.controller.ts:158-160` maps
   `row.XMeters → xMeters`. Contrast the Photos controller, which for the same API field name
   explicitly reads the other column: `photos.controller.ts:181-183` maps
   `row.ActualXMeters → xMeters`. Two controllers, same output field, different source column —
   360 captures are not reading `Actual*`.
4. **`modelLevelId` comes back from GET but is never inserted.** The insert takes `modelRoomId` and
   `roomCapturePointId` only. A field that is returned but never written can only be joined.
5. **The live PA12 data proves it numerically** (see next section).

The naming is the giveaway: this is a **planned-vs-actual** model. `RoomCapturePoint` is where a
photo was *meant* to be taken (the SP argument is literally `plannedRoomCapturePointId`);
`360Capture.Actual*` is where the headset says it *was*. **The 360 tab renders the planned point.**

**Consequence: correcting the 75 capture points fixes all 1,868 photos at once.** The captures carry
no coordinate of their own to correct.

### Q3. Does model re-import re-derive coordinates on rows that already exist? — **Nothing in platform-api does. And a re-run would be actively rejected.**

In the whole repo, `RoomCapturePoint` is touched by exactly four code paths, all of them explicit
API endpoints (`rooms.capturepoints.routes.ts`):

| Route | Effect |
|---|---|
| `POST /room-capture-points` | INSERT only (`usp_InsertRoomCapturePoints`) |
| `PUT /:roomCapturePointId` | full update, one row |
| `PATCH /:roomCapturePointId` | partial update, one row |
| `POST /room-capture-points/delete` | delete (⚠️ see the trap below) |

There is **no import job, no Kafka consumer, no scheduled task and no background writer** in
platform-api that touches capture points. Grep across `src/`, `scripts/`, and any
kafka/jobs/consumers path returns nothing.

**And the INSERT path is closed against re-running.** It enforces a per-project unique constraint on
`UserCapturePointId`, mapped to a 400:

```
RoomCapturePoint_key: "UserCapturePointId already exists in project."
                                    src/services/rooms.capturepoints.service.ts:63
```

Every one of the 101 points on the bad level is named `"<room> - Default Point"` with
`createdFrom: System`. So if the generator re-ran after the customer's corrected re-upload, it would
have hit that constraint on every row and either errored or skipped. **Either way the existing wrong
rows survive untouched.** That is the mechanism for why five weeks of waiting produced no change.

⚠️ **Scope limit, stated plainly:** the generator that created those `System` rows is **not in this
repo** — it must be an upstream model-processing service calling `POST /room-capture-points`. I have
ruled out platform-api as the rewriter; I cannot rule out that separate service from here. But it
reaches capture points only through the INSERT endpoint above, and that endpoint cannot update.

### Q4. What writes `lastModifiedOn` / `createdFrom`? — **PUT/PATCH write `lastModifiedOn`; `createdFrom` is set once at insert and never updated.**

`createdFrom` is a mandatory insert field (`validator.ts:199`) and appears in no update path
(`mapCapturePointToRow` includes it, the patch/update signatures do not). `lastModifiedOn` is
returned on read and doubles as the **optimistic-concurrency token** for PATCH — the service reads
the row first and passes the existing value as the 10th SP argument
(`rooms.capturepoints.service.ts:127,153`); a mismatch raises `"modified concurrently"` → 409.

Practical effect for us: **PATCH is safe against a concurrent writer**, and the `null` value that the
04-27 probe recorded is consistent with "nothing has ever rewritten these rows" — as Q3 predicts.

### Q5. Is there a bulk correction path? — **No. 101 single-row PATCHes. And do NOT use the bulk delete.**

`PATCH` and `PUT` are both single-id. The only array-bodied endpoints are `POST /` (insert) and
`POST /delete`.

⚠️⚠️ **The trap — do not "delete and re-create" the 75 points.** `deleteCapturePoints` returns the
capture points' **linked captures** and then deletes their **blobs from cloud storage**:

```
src/services/rooms.capturepoints.service.ts:305-321
  DELETE_ROOM_CAPTURE_POINTS → rows[0]._linkedcaptures
  → blobPaths = [CloudStoragePath, SmallImageCloudStoragePath]
  → Promise.allSettled(blobPaths.map(deleteCloudFile))
```

Delete-then-recreate would **destroy all 1,868 photographs**, files and all. It is irreversible and
the blob deletion is not transactional with the DB commit. This is by far the most dangerous thing
anyone could reach for here, and it is the obvious-looking shortcut. It must not be used.

---

## The numeric proof for Q2 (run this run, on the data already in `analysis/`)

Falsifiable prediction: *if the capture's coordinate is joined from its capture point, then every
capture sharing a point has byte-identical coordinates equal to that point's.* If instead each
capture stores its own position, values will drift between photos.

```
1,868 stale captures, 75 distinct capture points
  capture points where ALL their captures share identical x/y/z : 75 / 75
  capture points with ANY variation                             :  0 / 75
  capture triple == its own capture point's triple              : 75 / 75
  imageTakenOn range                             2025-05-28 → 2026-07-15  (14 months)
```

**Zero variation, not one millimetre, across a 14-month capture window.** A device-recorded *actual*
position — someone standing in a room with a headset on 52 occasions over 14 months — cannot be
byte-identical every time. `Actual*` is excluded as the source. The value is the planned point's.

This also quietly kills the **"snapshot copied at capture time"** theory that
`platformapi-questions.md` opened with: a snapshot would need the source value to have been
identical on all 1,868 occasions anyway, and there is no code that copies it.

### The prior session's counter-evidence, resolved

`platformapi-questions.md` §2 leaned toward "own columns" on the grounds that *a capture with no
`roomCapturePointId` still carries coordinates and still renders* (`media-service.ts:762-772`,
`:793-800`). Re-read this run: that code buckets point-less captures under an
`UNKNOWN_CAPTURE_POINT` key and **then guards `xMeters != null` before creating a markup**
(`media-service.ts:795-800`). It shows the frontend *tolerates* null coordinates. It never shows the
backend *supplies* them. Defensive null-handling was read as evidence of a data shape. Corrected.

---

## What is now confirmed vs still inferred

**Confirmed by reading code or running a query:** Q1 (e2e test on real DB); the insert/update
argument lists; the `Actual*` vs plain column naming and the two controllers' differing mappings;
that platform-api has no background writer for capture points; the `UserCapturePointId` unique
constraint; the PATCH concurrency token; the delete-cascades-to-blobs behaviour; the PATCH authority
(`CAPTURE_POINT_EDIT`, `INTERNAL_ROLE` accepted — `routes.ts:300`); the 75/75 and 14-month data
findings; and that the dashboard's `captures_360` DuckDB table is filled from the **API response**,
not a parquet artefact (`dashboard-360-service.ts:244-278`) — so this API field is what positions the
pin.

**Still inferred — I could not read the stored procedure.** `fn_GetProject360CaptureList` /
`fn_GetProject360Capture` live in the separate DB-functions repo, which is not checked out here (the
only submodule is `XYZGitUtils`). So I have not literally seen the `LEFT JOIN`. Every observable
consequence points one way and #1/#3/#5 above are each close to conclusive on their own, but the
join itself remains inferred rather than read. **Anyone with that repo can close this in 30 seconds**
by opening `fn_GetProject360CaptureList` and looking at where `XMeters` is selected from.

**Not investigated:** whether the upstream model-processing service (outside platform-api) has its
own capture-point correction path, and whether `360Capture.Actual*` is populated at all on the device
sync route.

---

## What this means for the remediation

- **101 PATCHes**, one per capture point on level `f0f4d409-c2b4-42cf-a8a9-c9497aecb3f7`, body
  `{"yMeters": 0.0}`. Uniform across all 101: `currentY = 50.4`, `targetY = 0.0`, `yOffset = -50.4`.
  75 of them carry the 1,868 photos and move visible pins immediately; the remaining 26 have no
  captures yet and are corrected so future captures land right.
- **`yMeters` is the vertical axis, not `zMeters`.** `swapYZ=true` builds `Vector3(x, z, y)`
  (`coordinate-transforms.ts:20-22`). A remediation aimed at `zMeters` would corrupt the floor-plan
  position of all 75 pins while leaving the height wrong. This correction has been wrong in this
  folder twice; it is the single easiest way to make this incident worse.
- **Patch only `yMeters`.** Omit `modelRoomId`/`modelLevelId` entirely — including either key
  triggers `validatePatchSpatialPlacement`, which checks the room/level pair against the
  `project-room-level-mapping` parquet (`service.ts:136-140, 242-283`) and would reject the change
  as *"modelRoomId is not associated with modelLevelId in the project model"*. Which means the
  **"reparent the room to the real L00 level" option offered in `PLT-2649-stale-pinpoints.csv` is
  very likely blocked by validation** and should not be attempted through this endpoint.
- **A coordinate-only PATCH runs no spatial validation at all**, so the 101 calls are clean and each
  is individually reversible (PATCH back to `50.4`).
- Per `../data-remediation-runbook.md` §3 this is the **first bulk PATCH of production rows** on
  record here — it needs a line of written approval on the ticket, and there is no precedent to
  point at.
- **This does not close XSPCMA-868.** Pin height and floor membership are different problems: the
  rooms stay parented to the phantom level, and the floor filter matches on the level **name
  string**, so the ground floor still appears twice and the photos still sit on the option nobody
  picks. Fixing Y makes the pins land in the right place on the wrong floor label.
