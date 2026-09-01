# PLT-3095 — AUS02: Core & Shell + Milestones WBS missing in the Web Viewer

**Solved from the customer's XER, 2026-09-01.** Ticket: Major, reported by Kyriakos (HITT AUS02)
via Yash, Freshdesk 7800. Symptom: several WBS branches present in P6 are absent from the Web
Viewer schedule; toggling Show WBS and re-importing did not help; customer verified their WBS
codes are "unique".

## The finding — two full-code collisions, exactly the two missing branches

Parsed `AUS02-60-Schedule-L1-.xer` (236 PROJWBS rows, 1,586 TASK rows). Building each node's
concatenated code (root short + "." + … + own short) yields **exactly two collisions** in the
whole file:

| concatenated code | node A | node B |
|---|---|---|
| `AUS02-60-Schedule-L1-.1.1.1` | **Milestones** (101 tasks) | CFCI Procurement (2 tasks) |
| `AUS02-60-Schedule-L1-.1.1.2` | **Core & Shell Construction** (314 tasks) | OFCI / OFE Procurement (87 tasks) |

The viewer is missing **Milestones** and **Core & Shell Construction** — the two collision losers,
415 activities. Zero other collisions, zero other missing branches. The correlation is exact.

## Why the codes collide even though the customer is right that they're "unique"

P6's identity is `wbs_id`/`parent_wbs_id`; uniqueness is enforced per (parent, short_name) only.
The *concatenated* code is display sugar and can collide when a short name itself contains dots:

```
Milestone Schedule (short "1")
  ├─ Milestones      short "1.1"  -> code .1.1.1   ┐ same string
  └─ Procurement     short "1"                       │
       └─ CFCI Proc. short "1"    -> code .1.1.1   ┘
```

156 of the 236 shorts in this file contain dots, so this schedule is a minefield for any importer
that keys on the concatenated string. (No duplicate (parent, short) pairs exist — checked.)

## Where the defect lives — NOT in the repos this session can reach

- hc-frontend builds its Gantt from `parentItemId` supplied by the API (`scheduler-service/utils.ts`) — faithful renderer.
- platform-api only **reads** schedule rows (`schedules.service.ts`); no XER parsing exists in it
  (`grep PROJWBS/wbs_short_name` = zero hits).
- So the collision is in the **schedule ingest service** (backend/data pipeline), which evidently
  keys or de-duplicates WBS nodes by concatenated code instead of `wbs_id`. Owner: api-v2 /
  data-pipeline team (Sachin/Ali).

**Fix for the importer:** key WBS nodes on `wbs_id` + `parent_wbs_id` from PROJWBS; treat the
concatenated code as a display string, never as identity.

## Customer workaround available today (verifiable prediction)

Rename either side of each collision in P6 so the concatenated strings differ — cheapest is the two
Procurement children (short `1` → e.g. `CFCI`, short `2` → `OFCI`) — then re-export and re-upload.
**Prediction: all 8 top-level branches appear.** If they don't, the diagnosis is wrong.

## Unverified / open

- Could not check AUS02 in our DB or API — the project is not visible to Ilia's account (only AUS01).
  The diagnosis rests on the XER (input), the P6 + viewer screenshots (output), and the exact
  missing-set match.
- What the importer does with the collision *winner* (merge? drop?) — the viewer's "Procurement"
  row also renders at the wrong depth in the screenshot, suggesting more than a simple drop.
- The "1586 un-mapped activities" banner = all activities unmapped; expected for a fresh schedule
  with no element mapping, treated as unrelated.
- Screenshots supplied by Ilia in-session; XER supplied by Ilia (uploads/11029333-AUS0260ScheduleL1.xer).
