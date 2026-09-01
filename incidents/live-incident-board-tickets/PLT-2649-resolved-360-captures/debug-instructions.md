# PLT-2649 — debug instructions (2026-08-27)

**Category: 🔴 Too global — needs a room.** Spans api-v2 contract, a production data
remediation with no precedent in the runbook, BIM coordination, and a duplicate-level
design question. Not settleable by one person in a session.

**Branch:** `PLT-2649-duplicate-level-name-diagnostics`

## What I found
- The pin renders from the **360 capture row's own** `xMeters/yMeters/zMeters`, never from the
  room-capture-point (`capture-360-api.types.ts:34-36`, `dashboard-360-service.ts:598-600`).
  **Patching the 75 capture points would move zero pins** — the plan of record was aimed at the
  wrong rows.
- **No FE endpoint can write a capture coordinate.** `I360CaptureUpdatePayload` is
  `{ xyzDisplayName?, description? }` (`capture-360-api-service.ts:7-10`). Any fix runs in api-v2/DB.
- **XSPCMA-868 is the same bug.** The floor filter matches on level **name string**
  (`dashboard-filter-utils.ts:97,:218`; `dashboard-360-service.ts:43,:560`). PA12's DC ground floor
  is the only DC floor whose duplicate is spelled differently — `DC-0G-FFL` ×2 @0.0 vs
  `DC - 0G - FFL` @50.4, with all 1868 images on the spaced copy. Pick the ground floor → empty.
- **The BIM team edited the wrong artifact.** `f0f4d409` lives in source file `2210cd43` — a
  multi-building coordination model (SS/GT/DC/FH/Genset, `Limit PLU`) at a uniform **+50.40** offset.
  The DC architectural model's own `DC-0G-FFL` already reads 0.0 — nothing there to change.
- Vertical axis is **`yMeters`**, not `zMeters`. The folder had this wrong since July.

## What's on the branch
- Detector for levels sharing a separator/case-insensitive name but disagreeing on elevation.
  Logs one line per conflict when the levels table is built. Fixture is the real PA12 level set.
- Deliberately does *not* flag DC-01/02/03 (duplicates agree on elevation → single filter option,
  works correctly).

## What I need from you
- [ ] **Nothing in the browser** — this one needs data access, not a console read.
- [ ] Re-pull PA12 `room-capture-points` and check **`lastModifiedOn`** (documented as "usually null",
      `hc-frontend/docs/mcp-entity-shapes.md:154-173`). Null ⇒ write-once, confirmed *positively*.
      This outranks reading `yMeters`, which cannot distinguish "no job ran" from "a job ran".
- [ ] Re-pull `project-levels`: is `f0f4d409` still 50.40? Has a *fourth* DC ground floor appeared?
- [ ] ⚠️ Dedupe any pull by id — api-v2 cursor pages overlap and inflated counts ~4.3× before.
- [ ] Prod MCP whitelists only ELN03/A015, so this likely needs your authenticated api-v2 session.

## For the room
- Who owns a 1868-row coordinate correction, and under what approval? The runbook has no PATCH precedent.
- Fixing pin height alone does **not** close XSPCMA-868 — the captures stay on an unpickable level.
- XSPCMA-868 is Critical, **unassigned**, zero comments since 13 Aug, and unlinked to this ticket.

---

## 2026-08-27 (later) — ⚠️ next session needs `platformapi` access

**Start here: [`platformapi-questions.md`](platformapi-questions.md).** It has the 30-second problem
statement, what is confirmed vs inferred, and the five things to check in the backend repo.

**Correction to this file's claim that we can fix the pins ourselves.** That rested on the
frontend's *type definition* of the PATCH endpoint
(`IRoomCapturePointPatch` accepting `xMeters/yMeters/zMeters`) — which is the frontend's belief
about a contract, not proof the handler persists those fields. Our code has never sent a coordinate
through it, only a rename. Treat it as unconfirmed until someone reads the handler.

This session was scoped to `hc-frontend` + `xyz-platform-context` only and could not check.

---

## 2026-08-27 (later, WITH platformapi access) — the correction above is now CONFIRMED, and inverted

The note above said to treat "we can patch the points ourselves" as **unconfirmed** because it rested
on a frontend type declaration rather than the handler. **It is now confirmed from the backend**, by
an e2e test that runs against a real Postgres with the real stored procedure:

```
platformapi/test/e2e/api/rooms.capturepoints.e2e.spec.ts:406-425
  PATCH { xMeters: 77.25 } → row.XMeters == 77.25, row.YMeters unchanged
```

So coordinates persist, and partial-patch semantics are correct (unsent fields untouched).

**And the scope inverted in our favour:** the coordinate lives on the **capture point** (101 rows),
not on each capture (1,868 rows) — so patching the points fixes every photo at once. See
`platformapi-answers.md`. The one-pin test below is no longer needed to establish *whether* we can
write; it remains worth doing as the cheap confirmation of the join, and as the safe first step of
the remediation.

**Body: `{"yMeters": 0.0}` only.** Not `zMeters` (wrong axis — would move pins sideways), and do not
include `modelRoomId`/`modelLevelId` (triggers a room/level mapping validation that would reject it).
Requires `CAPTURE_POINT_EDIT`; `INTERNAL_ROLE` is accepted (`rooms.capturepoints.routes.ts:300`).

⚠️ **New hard prohibition: never use the bulk delete to "reset" these rows.** It cascades into the
linked captures and deletes their image blobs from cloud storage — all 1,868 photographs,
irreversibly (`rooms.capturepoints.service.ts:305-321`).

---

## 2026-08-27 (later still) — ⚠️ SETTLED ON LIVE PROD. Read the new file first.

**[`prod-mcp-findings-2026-08-27.md`](prod-mcp-findings-2026-08-27.md)** — measured against live
prod, not inferred. It answers questions 3 and 4 of `platformapi-questions.md` (no, re-import does
not re-derive existing rows) and **contradicts §2's inference** that captures own their coordinates
independently.

**Two things changed the plan:**

1. The level is now at **−50.4**, not 0. The customer's 08-06 re-upload landed and took effect; the
   value they wrote is a sign flip of the old one. So the model still needs fixing *and* the pins
   still need correcting — neither alone is enough.
2. Pin-freezing is now proven six independent times, not argued: six other levels show the same
   drift at 0.4 m, and levels whose elevation has not been edited match their pins to 0.000.

Sizing confirmed exactly as this folder had it: 101 points on the bad level, 75 with photos,
1,927 photos, 75 distinct positions. Target height for the pins is **0.0**.

Still unproven, unchanged: whether the capture-point PATCH persists coordinates. The one-pin test
is still the way to find out and is still **not run** — needs approval.
