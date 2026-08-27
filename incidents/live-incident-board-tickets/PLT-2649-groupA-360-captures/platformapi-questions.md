# PLT-2649 — what to check in `platformapi` (handover, 2026-08-27)

Written by a session **without** platformapi access. Everything below marked ⚠️ is inferred from
the frontend only and must be confirmed against the backend before anyone acts on it.

---

## The problem in 30 seconds

On PA12, 360° photos render ~50 m above the building instead of inside the rooms.

Cause: one model file has the ground floor recorded at **50.4 m** instead of 0.

In July we told the customer to correct that number and re-upload, saying the pins would follow.
They did it. **The pins did not move.**

Our current explanation: a pin's position is **copied and saved when the photo is taken**. It is a
snapshot, not a live link to the model. So fixing the model helps new photos only; the ~1,868
already taken keep the old height.

```
photo taken:   model floor = 50.4  ──copied──▶  photo saved at 50.4  (frozen)
today:         model floor = 0     ── nothing ──▶  photo still at 50.4
```

**That explanation is not confirmed.** Confirming or killing it is the entire point of this file.

---

## What IS confirmed (frontend, read directly)

| Fact | Evidence |
|---|---|
| The 3D view positions a pin from the **capture row's own** `xMeters/yMeters/zMeters`, not the capture point's | `capture-360-api.types.ts:34-36`; `dashboard-360-service.ts:598-600`; editor path `media-service.ts:791-812` |
| The frontend has **no** way to write a capture's coordinates | `I360CaptureUpdatePayload = { xyzDisplayName?, description? }` — `capture-360-api-service.ts:7-10` |
| The vertical axis is **`yMeters`** (not `zMeters`) | `swapYZ=true` builds `Vector3(x, z, y)` — `coordinate-transforms.ts:20-22`. All 75 stale points read `yMeters = 50.4` |
| Level elevation never reaches a pin coordinate in the FE | repo-wide; `elevation` appears only in filter metadata |
| The whole FE write-side for capture points is dead code except a rename | only live PATCH caller sends `{ userCapturePointId }` — `capture-point-360-properties.tsx:62-68` |

---

## ⚠️ What is NOT confirmed — the five questions for platformapi

### 1. Does `PATCH /api/v2/projects/{projectId}/room-capture-points/{id}` actually persist coordinates?

The FE *declares* the payload as accepting them:

```ts
IRoomCapturePointPatch = { xMeters?, yMeters?, zMeters?, modelRoomId?, modelLevelId? }
// room-capture-api.types.ts:27-34, sent by room-capture-api-service.ts:54-63
```

But our code has **never sent a coordinate** through it — only the rename. So this is the FE's
belief about a contract, not evidence the handler honours those fields.

**Find:** the PATCH handler for `room-capture-points/{id}`. Does it bind and persist x/y/z, or
ignore everything but the name?

### 2. Does `GET /360captures` return each capture's own stored coordinates, or join them from the capture point?

**This decides the size of the fix and nothing else does.**

- Join at read time → correcting **75 capture points** fixes all 1,868 photos for free.
- Own columns → the **1,868 capture rows** must each be corrected.

FE leans to "own columns": a capture with **no** `roomCapturePointId` still carries coordinates and
still renders (`media-service.ts:762-772`, `:793-800`) — a pure join could not survive that. But
that is inference.

**Find:** the `360captures` response assembly. Is the coordinate selected from the captures table,
or joined from `room_capture_points`?

### 3. Does model re-import re-derive coordinates on rows that already exist?

The load-bearing question. If yes, our whole current explanation is wrong and something else broke.

Two supporting clues from the data, both consistent with "written once, never re-derived":
- All 101 capture points on the bad level have `yMeters` **exactly** 50.4 — the level's own
  elevation, frozen at generation time.
- A 2026-04-27 probe of the live endpoint documented `lastModifiedOn` as *"usually null"*
  (`hc-frontend/docs/mcp-entity-shapes.md:154-173`).

**Find:** the model-import / re-import job. Does any path update `room_capture_points` or
`360captures` coordinates for rows that already exist, or only insert new ones?

### 4. What writes `lastModifiedOn` and `createdFrom` on `room_capture_points`?

All 101 points on the bad level have `userCapturePointId` ending `" - Default Point"` and
`createdFrom: System` — i.e. machine-generated one-per-room, not human-placed. So a generator
exists. **Does it ever re-run against existing rows?**

Checking `lastModifiedOn` on PA12's 101 points is the cheapest discriminator available:
null ⇒ nothing has ever rewritten them; a timestamp after the re-upload ⇒ something did, and
question 3 answers itself.

### 5. Is there any bulk / admin path to correct coordinates?

If the answer to 2 is "own columns", ~1,868 rows need correcting. Is there an existing bulk
endpoint, migration pattern or admin tool — or is this a one-off script?

Note: `incidents/data-remediation-runbook.md` covers a 611-row **DELETE** and has **no precedent
for bulk-PATCHing production rows**. This would be the first.

---

## The one-pin test (does not need platformapi, but does need approval)

If you'd rather answer 1 and 2 empirically in five minutes:

1. `PATCH /api/v2/projects/{PA12}/room-capture-points/00b5344c-57a1-4e87-a0fe-df1bbbf68961`
   with `{ "yMeters": 0 }` — pin #1 in `analysis/PLT-2649-stale-pinpoints.csv`, 52 photos, easy to spot.
2. Reload the 360 tab and look at that pin.
3. Revert with a PATCH back to `50.4`.

| Result | Meaning |
|---|---|
| Pin drops to ground level | PATCH persists **and** captures join from the point → 75-row fix, we can do it ourselves |
| Pin stays at 50 m, but a re-GET shows the point at 0 | PATCH persists, captures own their coordinates → 1,868-row fix, needs backend |
| Point still reads 50.4 on re-GET | The handler ignores coordinate fields → everything goes to backend |

⚠️ This is a write to production data. Per `data-remediation-runbook.md` §3, get a line of approval
on the ticket first — even though it is one row and trivially reversible.

---

## Two things that are true regardless of the answers

**1. The BIM team may have edited the wrong file.** The bad level (`f0f4d409`) belongs to source
file `2210cd43` — a multi-building coordination model carrying SS/GT/DC/FH/Genset levels plus
`Limit PLU`, uniformly **+50.40 m** above datum. Yash's 26-Aug comment names
`PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24`, which reads as the single-building DC architectural model —
and in *that* model `DC-0G-FFL` already sits at 0.0, so there was likely nothing there to change.
The SharePoint link to the re-exported model returns **403**, so this is unconfirmed.

**2. XSPCMA-868 is the same bug.** "Ground floor 360 images missing", Critical, **unassigned**, no
investigation since 13 Aug, not linked to this ticket. PA12 lists the DC ground floor three times —
`DC-0G-FFL` ×2 at 0.0 and `DC - 0G - FFL` (spaced) at 50.4 — and it is the only DC floor whose
duplicate is spelled differently. The floor filter matches on the level **name string**, so those
are two separate options and every photo sits on one of them. Pick the other → empty floor.

**Fixing the pin height alone will not close XSPCMA-868** — the photos stay on a level nobody picks.

---

## Drafted messages, not sent

- To **Sachin** — questions 1-3, conversational: `recommended-action.md` § 2026-08-27.
- To **Yash** — hold the BIM team, don't blame them, one date question: `recommended-action.md`.
- To the **BIM team** — only if question 3 confirms; identifies the file by listing its 16 levels
  rather than by a filename we are guessing at.

## Full working

`context.md` § "2026-08-27 (second pass)" — mechanism, ranked hypotheses, confidence table.
The two earlier 08-27 sections are superseded in their *ranking* but their facts stand.
