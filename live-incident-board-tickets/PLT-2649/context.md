# PLT-2649 — [NEW DASHBOARD] PA12 360 pins appear too high

> Context pack for human action. Read-only prep — no Jira action taken.
> Compiled 2026-07-10. Source: getJiraIssue (renderedFields) + xyz-platform-context docs + hc-frontend code.

## Ticket metadata

| Field | Value |
|---|---|
| Key | PLT-2649 · https://xyzreality.atlassian.net/browse/PLT-2649 |
| Summary | [NEW DASHBOARD] PA12 360 pins appear too high |
| Type | **Live Incident** ("track live incidents on site") · Priority **Major** |
| Status | **In Analysis** (statusCategory: In Progress / yellow) |
| Project | PLT — XYZ SW Platform : Platform (affected client project: **PA12**) |
| Reporter / Assignee | Masum Ahmed (both) |
| Created | 2026-05-06 · **Updated 2026-06-30** (last activity ~6 weeks ago at compile time) |
| Freshdesk | Ticket 6622 (status bounced: 3rd line → customer → 3rd line) |
| Resolution | None |

## Full description (verbatim)

> Issue Type: Software,Software Area: Dashboard,Software Component:,Device Serial Number software: , Device Serial Number Hardware: ,Is The Device Still Usable?: Usable,Project: PA12Description:On the new dashboard, the 360 pin appear a lot higher than Powerbi
> `![](blob:https://media.staging.atl-paas.net/...id=UNKNOWN_MEDIA_undefined...)`

The inline description image is an unresolvable `UNKNOWN_MEDIA_undefined` blob. **However** the real evidence screenshots do exist as proper attachments (see inventory).

## Comments (chronological) — thread is STALLED

| # | Date | Author | Substance |
|---|---|---|---|
| 1 | 05-06 09:50 | Masum (reporter) | Freshdesk 6622 → "Waiting on 3rd line" |
| 2 | 05-06 10:35 | Rishi Bhugobaun | "attachment seems to be missing for this one too" |
| 3 | 05-06 10:43 | Masum | Re-posts screenshot (attachment **57268**, image-20260506) |
| 4 | **05-11 15:50** | **Ilia Kuzmin** | **KEY.** "issue with the pinpoints coordinates since **the powerbi dashboard has the same problem**. worth noting that the **pinpoints work correctly on the quality tab**." + "for **60% of pinpoints the position is almost correct**, but for the rest, it seems … broken or obsolete and was assigned to another pbp. the client should probably **reupload all 360 captures**." Screenshot (attachment **57477**). @Pietro. |
| 5 | 05-12 16:44 | Ilia | "can we ask customer to check the **pbp of the model rooms**? **Pietro thinks the elevation might be wrong**." 60% correct / 40% need review. |
| 6 | 05-14 16:56 | Masum | Freshdesk → "Waiting on customer" |
| 7 | **06-05 13:49** | Yash Patel | Customer reply: **"It's the same on the old one, which suggests a problem with the room data in the Revit models"** |
| 8 | 06-19 08:51 | Yash | Freshdesk → "Waiting on 3rd line" |
| 9 | **06-30 16:49** | Ilia | "who can assist us with **tweaking 60% of the pinpoints position that inherited the old pbp**? the rest works fine." @Pietro — **unanswered ever since.** |

**Stall pattern:** the last comment is an open, un-owned ownership question ("who can assist…?") with no addressee-forced answer. It has sat ~6 weeks. This is the playbook's stalled-open-analysis anti-pattern (see below). Diagnosis is effectively complete; what is missing is an *owner for remediation*, not more analysis.

## Attachments / media inventory

| ID | File | Size | Author | Referenced in | Accessible? |
|---|---|---|---|---|---|
| 57268 | image-20260506-094327.png | 669 kB | Masum | comment #3 + description | Real attachment; content endpoint is Atlassian-auth-gated |
| 57477 | Screenshot 2026-05-11 154311.png | 1.16 MB | Ilia | comment #4 | Real attachment; auth-gated |

- The description's `UNKNOWN_MEDIA_undefined` blob is **not** resolvable, but it is superseded by the two real PNG attachments above — the visual evidence is **NOT lost**, it lives on the ticket.
- **I could not render either image**: WebFetch/curl cannot read `api.atlassian.com/.../attachment/content/*` (OAuth-gated), and no image-capable fetch path was available. **A human can open both directly in Jira.** The screenshots would only add visual confirmation of magnitude ("how high"); the written analysis in the thread already stands without them.

## Relevant domain docs + takeaways

- `dashboard/360-tab.md` (CAP): each 360 capture has spatial coords `xMeters/yMeters/zMeters` tied to its `modelRoomId`; room metadata parquets map `roomId → roomName → levelName → elevation`. The viewer renders these coords as clickable pinpoints. **Pin position is derived from capture coords + room/elevation data — both sourced upstream (Revit/room API), not computed in the FE.**
- `dashboard/README.md`: `Dashboard360Service` and `DashboardColorService`/pin services are all client-side readers of parquet/API data; no elevation is invented on the FE.
- `dashboard/pitfalls.md`: nothing about pin height / Z-axis / elevation. (Pitfalls are about DuckDB load order, artefact selection, colouring — unrelated.)

## Relevant hc-frontend code + findings (branch claude/vigilant-franklin-op2yys; Commissioning OFF — not touched)

Pin-placement mechanism (playbook Q4):

- **`.../dashboard-panels/viewer/services/dashboard-image-service.ts`** — renders 360 pins. `renderImages()` (:211) → `_extractAndTransformCoordinates(images, extractImageCoordinates)` (:222).
- **`.../ViewerPage/utils/coordinate-extractors.ts:50-52`** — `extractImageCoordinates` reads `xPosition/yPosition/zPosition` off the image entity (the **z here is the capture's own stored elevation**). Issues use `xMeters/yMeters/zMeters` (:38-44).
- **`.../dashboard-panels/viewer/services/dashboard-pinpoint-base-service.ts`** — shared transform. `_transformCoordinates` (:176) → `transformPushPinsToViewer(pos, pbpData, rotMatrix, globalOffset, true)` (:185): Y↔Z swap → rotation → +PBP → −globalOffset. **Issue (Quality) pins use this SAME base class + transform.**
- `services/referencePointsService/room-capture-api.types.ts` — capture points carry `xMeters/yMeters/zMeters` + `modelRoomId/modelLevelId` from V2 API.

**Exoneration of FE code (why this is a data bug, not a code bug):**
1. Bug reproduces in **PowerBI (old) AND new dashboard** (comment #4, confirmed by customer #7). FE transform runs only on the new dashboard → cannot explain the PowerBI symptom.
2. **Quality-tab (issue) pins render correctly** (comment #4) — they share the identical `DashboardPinpointBaseService` transform pipeline. If the transform/PBP were wrong, issue pins would be wrong too.
3. Only **~40%** of 360 pins are wrong and only in **elevation** ("too high"); a code bug would be uniform, not per-capture.
→ Conclusion: the wrong input is the **per-capture elevation / room association upstream** (capture points that "inherited the old pbp" / obsolete `modelRoomId`→room elevation in the Revit models), i.e. a **data-remediation issue**, not an hc-frontend fix.

**Red herring to pre-empt:** `docs/viewerpage-vs-dashboard-pinpoint-comparison.md` documents a dashboard-only **×1000 PBP unit (m vs mm) bug**. That is a *different* defect — it would break **all** dashboard pins including Quality, produce wildly-wrong (not "slightly too high") positions, and would **not** affect PowerBI. It does **not** match PLT-2649. Do not conflate.

## Playbook-frame analysis (six questions)

1. **Observed:** ~40% of PA12 360 pins render too high; ~60% ~correct. Evidence = 2 screenshots on ticket (unrendered here).
2. **Expected vs authority:** expected = pin at real capture elevation; reference was "PowerBI" — but PowerBI shows the **same** error, so PowerBI is not a valid "correct" reference. The true reference is the physical capture location / correct room elevation.
3. **Smallest broken-vs-working pair:** already implicitly found — Quality pins (correct) vs 360 pins (broken) share the same transform → isolates the fault to 360 capture *input data*. Not yet nailed to a single named room + its zPosition vs room elevation (the one concrete artifact still worth capturing).
4. **Mechanism:** FE reads `zPosition` per capture + room elevation and transforms via shared pipeline (files above). Pipeline is sound (Quality proves it). Faulty input = capture elevation / obsolete pbp-room association from Revit.
5. **Why now / trigger:** never established. Likely the PA12 Revit model room data or capture-point→room mapping changed/was re-imported, orphaning ~40% of captures onto an old pbp. **Unowned.**
6. **Cohort:** the ~40% mis-elevated captures in PA12; possibly other projects with re-imported Revit rooms — not swept.

**Stalled-open-analysis flag:** a **Major** live-incident open since 2026-05-06, no activity since 2026-06-30, blocked on an un-addressed ownership question. Per the playbook, an open incident that has drifted this long without an owner or explicit "blocked" label needs a coordinator re-anchor independent of the technical fix.

## Confidence score + reasoning

**7 / 10 — on the diagnosis** (NOT the "implement solo" scale — there is no hc-frontend code fix to implement; a code-fix confidence would be ~1–2 because the fault is upstream data).
- High because the diagnosis is triangulated three ways (PowerBI+new both wrong; Quality pins fine on the shared transform; customer confirms Revit room data) — the missing screenshots do **not** change it.
- Held below 8 because: (a) no single named broken-vs-working room instance with actual `zPosition` vs room-elevation numbers has been captured (playbook Q3 not fully closed); (b) "why now" trigger is unknown; (c) exact remediation path (client reupload vs internal capture-point re-association) is undecided.

## Recommended next action (do NOT execute — for Ilia/human)

**Primary: coordinator/product re-anchor + assign a remediation owner, and flag the 6-week stall.** Diagnosis is done and it is a **data** problem, so no FE dev ticket is warranted (do NOT move to Ready For Development). Route to **Yash** (coordinator — status/priority re-check on a Major incident stale since 30 Jun) and **Pietro/Mostafa** (product — own the decision on who fixes the PA12 capture-point/Revit-room elevation data).

Draft comment text (for a human to post — read-only here):

> Status recap on PLT-2649 (Major, no movement since 30 Jun): diagnosis is effectively complete. The "360 pins too high" symptom reproduces on **both** the new dashboard **and** PowerBI, and Quality-tab pins (which use the identical FE coordinate transform) render correctly — so this is **not** a frontend bug. ~40% of PA12 360 captures inherited an obsolete pbp / wrong room elevation in the Revit model data (customer confirmed "same on the old one → problem with the room data in the Revit models").
> @Pietro / @Mostafa — this needs a **data-remediation owner**, not a FE dev: decide client-reupload of the ~40% affected captures vs an internal re-association of capture points to the correct rooms.
> @Yash — can we re-check priority/status? It has sat in "In Analysis" ~6 weeks on an unanswered ownership question.
> To close the loop cleanly, one concrete artifact would help: for **one** currently-wrong room, its capture `zPosition` vs that room's model elevation (confirms the elevation-inheritance hypothesis with a number).

**Note on the "re-request screenshot" option:** not needed as a blocker — both evidence screenshots are already attached (57268, 57477); a human just needs to open them in Jira. The useful *new* evidence ask is the single broken-room coordinate pair above, not the screenshot.

## Open questions for a human

1. **Remediation owner + path:** client reupload of all PA12 360 captures, or internal re-association of the ~40% orphaned capture points to correct `modelRoomId`/elevation? Who owns it? (Ilia asked this 30 Jun; still open.)
2. **Trigger:** what changed in PA12's Revit model / capture import that orphaned ~40% of captures onto the old pbp? (playbook Q5 — unowned).
3. **Concrete pair:** pick one wrong room; is its capture `zPosition` off by a constant floor offset, or arbitrary? (confirms elevation-inheritance vs random mis-assignment).
4. **Cohort:** any other projects that had Revit rooms re-imported and could show the same 360 mis-elevation?
5. **Screenshots:** human to open attachments 57268 / 57477 in Jira to eyeball magnitude — I could not render them (auth-gated content endpoint).
