# PLT-3033 — debug instructions (2026-08-27)

**Category: 🟡 Stale / needs a chase.** Darminder's schedule-pair question is 9 days cold; the branch
removes the need for the customer's file.

**Branch:** `PLT-3033-schedule-ingest-diagnostics`

## What I found
- WBS rows are **excluded** from the un-mapped count (`_getUnmappedActivities`), so the extra parent
  WBS and the count spike are **not** causally linked through the count formula.
- But one cause produces both: `_createActivityMap` builds `_activityId2MongoId` with a bare
  `Map.set` — **last write wins, no collision detection** (`schedule-entity.ts:292-306`).
- If one XER export carries rows from more than one `proj_id`, activity codes repeat across projects,
  each collision silently drops an activity's identity, any category mapping keyed on it stops
  resolving (→ reads as "became un-mapped"), and the second project's WBS root becomes the extra
  parent node. One cause, both symptoms.

## What's on the branch
- Reports, at schedule construction: duplicated activity codes and how many rows each shadows;
  root-node count; orphans whose parent id is absent from the schedule.
- Logs a `[schedule-ingest]` line only when a signature is present.

## What I need from you
- [ ] **Run the app on this branch against WI1 B11 and paste the `[schedule-ingest]` console line.**
      That replaces "we need the customer's XER to check `proj_id`" with a line from their own session.
      - `>1 root node` → confirms the extra parent WBS is structural.
      - `duplicated activity code(s) shadowing N row(s)` → confirms the multi-project merge and
        explains the count spike in one number.
- [ ] If both fire, the ask to the customer changes from "send us the file" to "your export contains
      more than one project — re-export scoped to B11."
