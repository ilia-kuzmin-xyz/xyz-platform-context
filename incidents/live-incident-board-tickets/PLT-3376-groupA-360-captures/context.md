# PLT-3376 — "(ML5.4) Room's name incorrect on 360 tab in web viewer and XYZ mobile app"

First seen 2026-10-27 (scheduled run). Ticket created 2026-10-26 09:59 UTC. Live Incident, Major, ML5.4,
Software Area: Dashboard. **Status Open, assignee Ilia, reporter Yash.** One comment (116485, Yash,
10-26 10:13 UTC), nobody has replied. Ball is with us (Ilia), about 1 day.

## What the ticket says (fetched live, with comments)

Customer: rooms on the 360 tab and in the mobile app show a different name from the Room model. They
checked with RootsBIM and the BIM manager and the model side looks correct.
Yash's comment: the 360 tab and mobile app names do not match the model's room names; and, from the
Editor's details panel of a QA issue, "Room name from Model is not same as the Capture point name
which they should be". He asks us why they differ.

## Media

Attachments `66788`, `66789`, `66790` (PNG) plus three inline images in comment 116485. **All
unopenable from this routine (403, 09-08 note stands).** What they would settle: *which* names are
wrong, and by how much (one old name vs a different spelling vs a different room entirely).

## Mechanism candidates (all from code; none observed on ML5.4)

Two different names exist and the UI shows them in different places:

| Name | Source | Where shown |
|---|---|---|
| **Capture point name** | `userCapturePointId` on the room-capture-point record, a free-text label, fetched from the API (`dashboard-360-service.ts:509-534`, applied at `:723-733`) | 360 tab card title (`360-panel.tsx:65`, `capturePointName \|\| roomName`), pinpoint tooltip (`use-pinpoints-initial-render.ts:67`), details panel "Capture point name" (`capture-360-details-content.tsx:257-262`) |
| **Room name** | `rooms` table from the project-rooms parquet, joined on the capture's `modelRoomId` (`dashboard-360-service.ts:595`, `:610`) | details panel "Room" row (`capture-360-details-content.tsx:265`); only the **fallback** for the card title |

So the card title is the label whenever one exists. **The label and the model room name can only agree
if something copied one into the other.** In code, nothing keeps them in sync:
- the label is written by create/PUT/PATCH only; the only live FE writer is the rename box
  (`capture-point-360-properties.tsx:62-68`, shown only when `canEdit`);
- platform-api has no background writer or re-derivation job (PLT-2649 `platformapi-answers.md:169`);
- the label is unique per project (`rooms.capturepoints.service.ts:63`, error text "UserCapturePointId
  already exists in project"), so it cannot equal a room name for two points in the same room.

**H1 (leading, inferred): the label is a stale snapshot of the room name.** On PA12 (PLT-2649) every
generated point was `createdFrom: System` with `userCapturePointId` of the form `"<room name> - Default
Point"` (`PLT-2649.../platformapi-questions.md:88`), one per room, written by an upstream model-processing
service that is not in platform-api. If ML5.4's points were generated the same way and the rooms were
renamed afterwards (RootsBIM / BIM manager edit), the parquet shows the new name and the label keeps the
old one. The mobile app would show the same stale label, which explains why **both** surfaces are wrong
and the model is right. The mobile app is not in the repos available here, so that half is unverified.
**H2: the point is attached to the wrong room** (`modelRoomId` differs from where it was captured). Then
the label is right and the "Room" row is wrong. Would also hit the room filter. **H3: stale room
parquet** (rooms table older than the model). Then "Room" is wrong. H2 and H3 predict the opposite
of H1 on which of the two fields is correct.

**One observation separates them:** open one affected point in the Editor and read the details panel.
H1: Capture point name = old room name (probably ending " - Default Point"), Room = correct current
name. H2/H3: Capture point name correct, Room wrong.

## Killed before it was written

- **"PLT-2794 changed the card title from room name to capture point name, so this is a regression
  since August."** Wrong. Before #2082 the title was already `room.capturePointName || room.roomName ||
  room.roomId` (`git show 6f0582ebd^:.../360-panel.tsx:64`). #2082 changed the card *grouping* (one card
  per capture point, not per room), not the name precedence. Nothing in the FE history shows a change
  to how the name is chosen. Checked because the first read of the diff suggested it.

## What is NOT verified

- Everything above is read from code. **No ML5.4 data was read** (prod MCP needs credentials supplied
  per session, none here; screenshots 403).
- That ML5.4's capture points are system-generated or follow the `- Default Point` form.
- What the mobile app displays for a capture point.
- When the rooms were renamed, and whether room ids changed on re-upload.
- Whether the customer ever saw the "right" names (a regression claim needs that date).

## Fix shapes (do not start any until the observation above is in)

- H1 resolves **without development**: rename the labels (Editor rename box, per point) or a bulk PATCH
  through `data-remediation-runbook.md` (PATCH only, `userCapturePointId`; the uniqueness rule applies).
  A durable fix (labels follow the room name) is a product decision for Mostafa/Pietro and an upstream
  generator question for Sachin/Ali, not an FE change. A cheap FE alternative, show the room name on
  the card and the label as secondary, is also a product call.
- H2/H3 are data fixes (re-point `modelRoomId`; refresh parquet), again not FE.

hc-frontend master when read: `0da75a626`. Latest tag `v26.3.7` (2026-10-08); the 360 code above is in it.
