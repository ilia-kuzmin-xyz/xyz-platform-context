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
