## 2026-09-01 — ticket closed 2026-08-31 without posting the 08-31 correction below. See `context.md` top section.

The 2026-08-31 draft further down this file ("Yash, one correction to what I asked you on
Wednesday...") was never sent. The ticket then closed via Freshdesk sync on 08-31, so the last
technical instruction of record is still the superseded "set it to 0" ask. Not reopening or
posting anything here — flagged for a human decision, see `context.md`.

---

# PLT-2649 — recommended action (DRAFT ONLY — execute nothing)

## Group A verdict: **stay With Customer.** Ball is with the customer (via Yash).

Root cause is confirmed and specific, the remedy is a one-value fix in the source
model, and it was handed to the client on 07-24. Six days of silence is young.
**Do not transition this ticket.** The one thing worth doing is confirming the
hand-off actually carried the detail — and pinning the acceptance criterion now,
so nobody re-diagnoses this when the corrected model lands.

## Chosen action: (a) — one message to Yash: verify the hand-off, set the check

**This happened** — Pietro replied 07-13 (§Update in `context.md`), so the routing below is historical context, not a live instruction.

## Why this and not the others

- **Not Ready For Development.** There is **no frontend fix**. Re-verified against
  current code this run: the FE reads `zMeters` exactly as the API delivers it and
  never applies a level elevation itself (`dashboard-360-service.ts:544-546`;
  `elevation` appears only in filter metadata at `:365,419`). The transform is shared
  with the Quality pins, which are correct on the same model
  (`DashboardIssueService` and `DashboardImageService` both extend
  `DashboardPinpointBaseService`). Sending this to Dev would bounce.
- **Not With Technical Support.** Nothing left to clarify from the customer — we told
  *them* what to change, not the reverse.
- **Not Blocked.** It is waiting on a legitimate external dependency (the client's
  project-delivery team correcting and re-uploading a model), which is exactly what
  "With Customer" means. Blocked would misreport it and hide it from the chase list.
- **Not another nudge to Pietro.** His 07-13 question was overtaken — Ilia self-served
  the diagnosis on 07-16/07-24. Re-pinging him on the old thread would re-open a
  settled question.

## Draft — message to Yash Patel (coordinator; cc Ilia Kuzmin)

Playbook style: one owner, one closed question, explicit scoping.

> @Yash Patel — PLT-2649 (PA12 360 pins), just checking the 07-24 hand-off landed
> with the detail intact.
>
> **One question:** did the Freshdesk #6622 message to the client actually name
> **the model (`PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24_detached`), the level
> ("DC - 0G - FFL") and the target elevation (50.4 m → ~0)?** If it went out as a
> general "please check the room data in your model", it will come back unfixed —
> project delivery needs the exact value to change.
>
> **Scoping, so nobody re-opens this:** cause is settled — that one level sits 50.4 m
> above datum while the rest of the DC building is at 5.3 / 10.6 / 15.9, so the 101
> rooms on it (~1870 captures) float. Nothing to fix on our side, and **no 360
> captures need re-taking or re-uploading** — the model re-upload carries the
> correction through rooms → capture points → pins.
>
> **When the corrected model lands**, ping me and I'll verify before we close:
> "DC - 0G - FFL" reads ~0 in `project-levels`, pins sit in-room across a sample of
> the 101 rooms, and PowerBI agrees.
>
> No ETA from them yet — worth asking for one; it's been Major since 06 May.

## Also worth doing (small, separate — do not attach to this incident)

1. **Split off the editor side-thread.** Pietro's 07-13 "adjust the pin position from
   the 360 editor" idea and Jason's counter-proposal (a system-side pass flagging
   captures that no longer match their level, rather than user-movable pins) are a
   **product feature discussion, not this incident's fix** — and they currently live
   only in these comments, so they die when PLT-2649 closes. **DIGP-1420 "Model / 360
   Capture Auto-Align"** (Backlog, created 07-19) looks like the right home; worth
   confirming with Pietro/Jason rather than assuming. *Jason's version is the more
   valuable one: it would have caught this defect automatically.*
2. **Cross-project sweep** — this is an unaligned-linked-file federation defect, not a
   PA12 quirk. One query over `project-levels` for levels whose elevation is a gross
   outlier against their building's series would find any other project with the same
   latent problem, before it becomes the next ticket. (Playbook: *cohort — the reported
   project is a sample, not the population.*)

## On close

- Add a `dashboard/pitfalls.md` entry — still absent as of this run: *360 pin Z is
  derived from the hosting room's level elevation upstream and stored in
  `captures_360.zMeters`; the FE applies no elevation of its own, so a wrong level in
  the source federation floats every pin on that level and no FE change can correct
  it. Quality pins are unaffected because issue coordinates are recorded per-issue,
  not derived from the level — so "Quality fine, 360 wrong" points at the model, not
  the viewer.*
- Amend `dashboard/360-tab.md:47-49` to state **both** layers (FE reads the capture's
  own `xMeters/yMeters/zMeters`; those are derived upstream from `modelRoomId` → level).
- Record the trigger explicitly when closing: **not a regression** — the model is V1
  from 2025-12-04 and was always wrong; the new dashboard changed visibility, not
  behaviour. Worth one line so the "why now" question is closed rather than dropped.
- Unrelated code nit, do not bundle: `FIRST(c.zMeters)` has no `ORDER BY` within its
  `GROUP BY` (`dashboard-360-service.ts:546,554`) so a room's pin takes an arbitrary
  capture's Z. Irrelevant to this incident (all captures in an affected room share the
  same bad elevation), but still non-deterministic.

---

## 2026-08-14 — verdict and drafts (DRAFT ONLY, execute nothing)

**Verdict: resolved through communication, stay With Customer. Do not transition.** Nothing has
changed technically since 07-24 and nothing needs to. What has changed is the clock: **21 days of
silence** on a fix that is entirely on the client's side. That is no longer young, and a chase is
now the whole job.

The 07-30 draft above (message to Yash, "did the Freshdesk hand-off carry the detail?") was never
recorded as sent and is **not superseded** — if it never went, ask it first, because a nudge on a
message that went out vague will just produce another vague answer. If it did go with the detail
intact, send draft (a) below instead. Both are for a human to send; nothing is to be posted in
Jira by this run.

### (a) Client-facing nudge, for Yash to send on Freshdesk #6622

Coordinator voice, one question, answerable with a date. No new technical content, it only
restates what was already handed over on 24 July so the recipient does not have to dig it out.

> Hi, following up on ticket #6622, the 360 pin positions on PA12.
>
> On 24 July we sent over the exact change needed: in model
> `PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24_detached`, the level "DC - 0G - FFL" is set to +50.4 m
> instead of the project datum of roughly 0, while the rest of the DC building sits at 5.3, 10.6
> and 15.9. That one value is why the ground floor 360 captures appear above the roof, and
> correcting it and re-uploading the model fixes all 101 affected rooms at once. No captures need
> re-taking or re-uploading.
>
> Could you let me know the expected date for the corrected model going back up? If project
> delivery has not picked it up yet, say so and I will re-send the details to whoever should have
> them.
>
> Once it is re-uploaded we will verify the pins on our side before closing.

*Optional second paragraph, only if the client asks why it happened or seems likely to hit it
again. Do not lead with it, it competes with the one question:* "For context, that level comes
from a linked file in the federation whose levels all sit around 48 to 73 m, so the same
misalignment exists on several other linked files. It is only visible on this one today because
it is the only one with 360 captures on it. Aligning the shared coordinates across those links
would prevent a repeat, but it is not needed to fix what you are seeing now."

### (b) Internal note on the 07-13 product ideas, for Pietro Desiato (cc Jason Fingland)

One decision, one owner, one question.

> @Pietro Desiato PLT-2649 turned out to be a single wrong level elevation in the source model, so
> neither idea from 13 July is needed to close it and the free-form pin editing can be dropped
> outright, Jason's "could mess with reality on site" objection is exactly what this case proves.
> Jason's other proposal is the keeper: a pass that flags captures no longer matching their
> recorded level would have caught this at model upload in December instead of via the customer in
> May, and there is a working prototype of it in the ticket folder. Should that go on DIGP-1420
> "Model / 360 Capture Auto-Align", or do you want it as its own low priority ticket?

### Standing items, unchanged and still open

The four items in § "Also worth doing" and § "On close" above all still apply. Two now have more
behind them:

- **Cross-project sweep** is no longer hypothetical. Within PA12 alone, ~15 source files and ~44
  levels sit in the 45-73 m band while their same-named twins sit at datum (see `context.md`,
  2026-08-14). The sweep query is "levels whose elevation is a gross outlier against their
  building's series", and PA12 is a worked example of what it should return.
- **Post-fix verification** should expect **75 rooms with visible pins to move, plus 26 empty
  capture points corrected silently** (101 points on the level in total), and should re-query
  `project-levels` for `f0f4d409` expecting ~0. Baseline for the diff is
  `analysis/PA12-levels.csv`.

## 2026-08-26 — verdict unchanged

Still **stay With Customer; do not transition.** 33 days since the 07-24 hand-off, no reply from
project delivery. The nudge-to-Yash draft (confirm Freshdesk #6622 actually carried the model /
level / target-elevation detail) remains correct, still drafted, still unposted — worth sending
now given the clock. No new technical content to add.

---

## 2026-08-27 — SUPERSEDES every prior verdict in this file (DRAFT ONLY, execute nothing)

### ⛔ Do not send the nudge drafts above. The customer already did their part.

Every recommendation on this page up to here — the 07-30 "did the Freshdesk hand-off carry the
detail?" message to Yash, the 08-14 client-facing chase for an ETA, and the 08-26 "verdict
unchanged" — was built on **stay With Customer**. That verdict is dead. The BIM team applied the
fix we asked for, re-exported the model, and **the pins are still 50 m high** (comment 110446,
2026-08-26). Sending a chase now would ask the client to redo work they have already done, on the
strength of a diagnosis their own attempt just falsified.

Keeping them here per the additive-writing rule: they were correct when written, and the 07-30
question in particular ("did the Freshdesk message actually name the model, the level and the
target value?") **is still worth answering** — but as *forensics on why the fix missed*, not as a
chase.

### Verdict: **the ball is on us.** Not With Customer, not With Technical Support, not Dev.

Live Jira state, 2026-08-27: status **`Open`**, assignee **Ilia Kuzmin**, Freshdesk #6622
**"Waiting on 3rd line"**. Jira has already moved it back to us; this page just hadn't caught up.

- **Not With Customer.** There is nothing left to ask of them. They changed a value and
  re-uploaded. Asking again without first establishing *why it did not take* repeats the mistake.
- **Not With Technical Support.** We are not missing information the customer holds. We are
  missing information **our own backend holds** — whether model re-import re-derives capture-point
  coordinates. Nobody has ever asked.
- **Not Ready For Development yet.** Still no frontend fix (the FE reads the coordinate verbatim;
  see `context.md` 2026-08-27 § mechanism). It may become a **backend/data** ticket, but not
  before the check below says which.
- **Not Blocked.** Nothing external is blocking; a query we can run ourselves decides it.

**Group tag stays `groupA`. Domain tag stays `360-captures`.**

### Chosen action: run the data check ourselves, before writing to anyone

Playbook § "smallest broken-vs-working pair" and § "prefer an instance that is broken **right
now**". We have a pre-fix baseline saved in `analysis/` and a post-fix system in production. The
diff between them is the diagnosis, and it costs one round trip.

Three lookups for PA12, in this order. Stop as soon as one answers.

1. **`project-levels`** — what does level `f0f4d409-c2b4-42cf-a8a9-c9497aecb3f7`
   ("DC - 0G - FFL") read for `elevationMeters` now? Is there a *different* level id with that
   name? Baseline: `analysis/PA12-levels.csv` (50.4, `sourceFileLevelId
   2210cd43-599c-4d9b-826e-4d369b8660da-00584452`).
2. **`/api/v2/projects/{PA12}/room-capture-points` and `/360captures`** — does **`yMeters`**
   (⚠️ **not** `zMeters` — see the axis correction in `context.md` 2026-08-27) still read **50.4**
   for the 75 capture points listed in `analysis/PLT-2649-stale-pinpoints.csv`?
3. **id continuity** — do the `modelLevelId` / `modelRoomId` values the captures carry still match
   anything in the newly regenerated `project-levels` / `project-rooms`?

**How to read the result:**

| 1. level elevation | 2. capture `yMeters` | Reading | Then |
|---|---|---|---|
| still 50.4 | still 50.4 | The fix never reached our data — **wrong artifact edited** (H2), or the re-import never landed | Back to the client, but with a *much* more specific ask: the level lives in linked file `2210cd43…`, not the DC host |
| now ~0 | still 50.4 | **H1 confirmed** — the model fix worked and the pins simply do not inherit it | Ours: a data remediation, PATCH 101 capture points. See below |
| now ~0 | now ~0 | Fixed at source; the site engineer is seeing cache or an app-side stale read | Verify with the engineer, then close on cause + trigger + cohort |
| id changed / level absent | either | **H3** — re-import re-keyed the ground floor | Explains XSPCMA-868 too; becomes a backend re-linking job |

Only after this do we write to anyone. Everything below is drafted for that moment.

### Draft (a) — to Sachin or Ali (api-v2), the question nobody has asked

One owner, one closed question, answerable with yes or no. This is the highest-value message on
the ticket and it should go **before** anything client-facing.

> @Sachin — PLT-2649, PA12 360 pins. **When a model is re-uploaded and re-imported, does anything
> re-derive the stored coordinates on existing `room_capture_points` and `360captures` rows from
> the new level elevations, or are those coordinates written once at capture-point creation and
> only ever changed by PATCH?**
>
> Context in one line: we told the client to correct a level elevation in the source model and
> re-upload, on the assumption that rooms, capture points and pins all inherit it on re-import.
> They did it, and the pins are still 50 m high. I can see the FE reads `yMeters` straight off the
> capture row and never touches level elevation, so if there is no re-derivation step on your side
> the pins were never going to move and this needs a data fix instead.

### Draft (b) — to Yash, holding the client, no new ask

Only after (a) has an answer, or the data check has run. Coordinator voice, no technical detail he
cannot use, and explicitly does not ask the client for anything.

> @Yash Patel — thanks, that is useful and it tells us something important: the elevation change
> was the right thing to do but it was not sufficient on its own, so please do not go back to the
> BIM team yet. The pin positions were saved into our database when the captures were taken, and
> correcting the model afterwards does not appear to rewrite them. I am confirming that with the
> backend team now and it looks like the remaining fix is on our side, not theirs.
>
> **One question while I do:** do you know roughly **what date the corrected model was actually
> re-uploaded**? XSPCMA-868 was raised on 13 August and I need to know whether it came before or
> after the re-export, because that changes whether the two are the same problem.
>
> Separately, XSPCMA-868 describes the ground floor 360 images being **missing**, which is a
> different symptom from the pins being too high. It may well have the same cause, but I am
> tracking it as its own thread so we do not fix one and assume the other went with it.

### Draft (c) — if the data check confirms H1, the remediation shape

Do not send as a proposal until the check has run. Recorded so the next run does not re-derive it.

The write path exists and is per-point: `PATCH /api/v2/projects/{projectId}/room-capture-points/{id}`
accepts `{ xMeters, yMeters, zMeters, modelRoomId, modelLevelId }`
(`hc-frontend/.../services/referencePointsService/room-capture-api-service.ts:54-63`, type at
`room-capture-api.types.ts:27-34`). The correction is **`yMeters -= 50.4`** on the 101 capture
points on level `f0f4d409` — 75 with imagery, 26 empty — enumerated in
`analysis/PLT-2649-phantom-level-all-points.csv`. Whether the 1868 `360captures` rows need the
same treatment or follow their capture point is **unknown and must be established before any
write**; `detect_stale_360.py` observed capture coords equal their capture point's exactly, which
suggests they are stored separately and would each need patching.

**Read `incidents/data-remediation-runbook.md` before proposing any of this.** Bulk-patching 101
production records on a live customer project is exactly what that runbook exists for.

⚠️ **Still do not hand `PLT-2649-stale-pinpoints.csv` to anyone as-is** — the 08-14 warning
stands: its `correctLevelId(realL00) = 7026451f` is `GB-0G-FFL`, a **GB** building level. The
elevation-correction branch is the safe one.

### Standing items — status this run

- **§ "Also worth doing" #1 (split the Pietro/Jason editor side-thread) — now stronger.** Jason's
  07-13 proposal, a system-side pass flagging captures that no longer match their recorded level,
  would have caught **both** this ticket and its failed fix, and `analysis/detect_stale_360.py` is
  a working prototype. Draft (b) of the 08-14 section still reads correctly; send it.
- **§ "Also worth doing" #2 (cross-project sweep) — unchanged and still not done.** Note the
  scope correction: the ~44 latent levels in the 45-73 m band host no capture points, so they are
  not part of this incident's cohort (`context.md` 2026-08-27, H4).
- **§ "On close" — the `dashboard/pitfalls.md` entry now needs rewriting before it is added.** The
  version drafted on 07-30 says the pin Z "is derived from the hosting room's level elevation
  upstream", which is the exact belief this run falsified. The correct entry is: *360 pin height
  comes from `yMeters` (not `zMeters` — `swapYZ=true` at
  `coordinate-transforms.ts:20-22`), stored per capture point and per capture in api-v2 and
  snapshotted from the level at creation time. Correcting a level elevation in the source model
  does not move existing pins. The FE applies no elevation of its own and cannot compensate.*
  **Do not add the old wording.**
- **Housekeeping for a human:** link XSPCMA-868 to PLT-2649 (currently unlinked), assign
  XSPCMA-868 (unassigned at Critical), and decide whether PLT-2649 should move off Major.

---

## 2026-08-27 (second pass) — REVISES the plan above: the data-check order changed and the remediation target changed

The 08-27 verdict ("ball is on us, run the data check before writing to anyone") **stands**. Two
things inside it are now wrong and are corrected here. See `context.md` § "2026-08-27 (second pass)".

### What changed

1. **The remediation target.** The plan above implied patching the **75 room-capture-points**. Pins
   are rendered from the **1868 capture rows'** own coordinates, never from the capture points
   (`capture-360-api.types.ts:34-36`; `dashboard-360-service.ts:598-600`; `media-service.ts:791-812`).
   Patching the points would move **zero pins**. And no FE endpoint can write capture coordinates at
   all — `I360CaptureUpdatePayload` is `{ xyzDisplayName?, description? }`
   (`capture-360-api-service.ts:7-10`). **Any fix runs in api-v2/DB, not through our API.**
2. **The decisive lookup.** Add **`lastModifiedOn` on the capture points** as check #1 — it separates
   "no re-derivation job exists" (null) from "a job ran" (timestamped). Reading `yMeters` alone
   cannot: the planned check would have reported "still 50.4" and mis-read it as confirmation.

### Also new: XSPCMA-868 is the same bug, and it is a name collision

PA12 has three DC ground-floor levels — `DC-0G-FFL` ×2 at 0.0 and `DC - 0G - FFL` (spaced) at 50.4 —
and it is the **only** DC floor whose duplicate is spelled differently (DC-01/02/03 duplicates share
identical names, which is why they work). The floor filter matches on the level **name string**
(`dashboard-filter-utils.ts:97,:218`; `dashboard-360-service.ts:43,:560`), so picking the ground
floor returns nothing while all 1868 images sit on the spaced copy. **Fixing the pin height alone
will not close XSPCMA-868.** Say so before anyone declares victory on a Y-offset patch.

### Revised action: still no client-facing message. Three reads, then one question.

Order matters; stop as soon as one answers. Checks 1-3 are read-only. **Check 4 is a production
write and needs written approval on the ticket first** (`incidents/data-remediation-runbook.md` §3).

1. `lastModifiedOn` + `createdFrom` on PA12's 101 room-capture-points.
2. `project-levels` for PA12 — is `f0f4d409` still 50.40, and has a *fourth* DC ground floor appeared?
3. **The 2-minute one, needing no backend access:** open PA12's 360 tab, clear every filter, look at
   the ground-floor captures. Present-but-floating ⇒ phantom-level theory. *"Unknown Level"* ⇒
   re-keying after all. Absent ⇒ neither, escalate.
4. *(gated)* PATCH one capture point's `yMeters` to 0, re-GET its captures, revert — settles whether
   captures own their coordinates or join them, and therefore whether the fix is 75 rows or 1868.

⚠️ Dedupe any fresh pull by id — api-v2 cursor pages overlap and inflated counts ~4.3× in prior
reports (`agent-pipeline/pitfalls.md`, 2026-08-10). ⚠️ Prod MCP whitelists only ELN03/A015, so this
likely needs a human with an authenticated api-v2 session.

### Draft (a) — to api-v2 (Sachin or Ali), REPLACES the draft above

Tone note from the notes' own base rate: closed, action-shaped questions to Ali get answered in
minutes; broad "one to be aware of" asks go unanswered for weeks (PLT-3034's 08-17 ask, PLT-2874's
svf2 question). Keep it to one decidable thing.

> @Sachin — PA12, PLT-2649. **Two questions, both yes/no.**
>
> 1. On `room_capture_points`, is `lastModifiedOn` ever written by anything other than a user edit —
>    specifically, does a model re-import re-derive `xMeters/yMeters/zMeters` on rows that already
>    exist? For PA12's 101 points on level `f0f4d409` it currently reads null as far as I can tell.
> 2. Does `GET /360captures` return each capture's **own** stored coordinates, or does it join them
>    from the capture point at read time?
>
> Why it matters: we told the client to correct a level elevation and re-upload, expecting the pins to
> follow. They did it; the pins are still 50.4 m high. If (1) is no and (2) is "own", then the fix is a
> data update on 1868 capture rows and it has to come from your side — there is no endpoint on ours
> that can write a capture coordinate.

### Draft (b) — to Yash, REPLACES the draft above (do not ask the client for anything)

> @Yash Patel — PLT-2649. Please **don't go back to the BIM team yet**, and please hold off telling
> them the elevation change was wrong — it wasn't, it just couldn't have worked on its own. Two things:
>
> **1.** The pin positions were written into our database when the captures were taken. Correcting the
> model afterwards doesn't rewrite them, so the existing pins were always going to stay where they are.
> That's on us to fix, not them.
>
> **2.** I think the level they changed may not be the one causing this. The bad level belongs to a
> *linked* coordination model inside the federation — the one carrying SS, GT, DC, FH and Genset levels
> together between 48 and 73 m — not the DC architectural model. In the DC model itself, `DC-0G-FFL`
> already reads 0.0, so there'd have been nothing to change there. Before we ask them for anything I
> want to confirm that against the re-exported model.
>
> **One question, no rush:** roughly **what date was the corrected model re-uploaded**? XSPCMA-868 was
> raised on 13 Aug and I need to know if that was before or after.
>
> Separately — I think **XSPCMA-868 is the same bug, not a second one**, and it's currently Critical and
> unassigned. PA12 has the ground floor listed twice under two spellings (`DC-0G-FFL` and
> `DC - 0G - FFL`); all the images are on one of them, so picking the other shows an empty floor. I'll
> link the two tickets. Worth flagging that fixing the pin height won't fix that on its own.

### Draft (c) — to the BIM team, ONLY once check 2 confirms `f0f4d409` is still 50.40

The last instruction was ambiguous and cost five weeks. This one names the artifact by its contents,
not by a filename we are guessing at.

> The level that needs correcting is **not** in `PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24` — in that model
> `DC-0G-FFL` already sits correctly at 0.0.
>
> It is in the **linked coordination model** that contributes these 16 levels to the federation:
> `SS - 1S - FFL` 48.10, `SS - 0G - FFL` 50.10, `GT - 0G - FFL` 50.20, **`DC - 0G - FFL` 50.40**,
> `GT - 01 - Signage` 55.50, two `Reflected Ceiling Plan FoH` levels, `SS - 02 - FFL` 59.50,
> `Genset building_Wall Type_02` 60.80, `FH - 03 - FFL` 62.77, `GT - 03 - FFL` 66.10,
> `FH - 04 - FFL` 66.30, **`DC - 04 - FFL` 67.81**, `Limit PLU` 70.40, `Limit PLU - Eq Tqn` 73.40.
>
> Note the level names in that file use **spaced** formatting (`DC - 0G - FFL`) where the rest of the
> federation uses unspaced (`DC-0G-FFL`) — that is the quickest way to identify it.
>
> Its whole level set is **exactly +50.40 m** above datum (DC ground 50.40 vs 0.00; DC-04 67.81 vs
> 17.41). The fix is to align that file's **shared coordinates** with the federation, not to edit
> individual level elevations.
>
> Please note this corrects future captures only — the 360 pins already taken carry stored positions
> that we will correct on our side separately.

### Action on the board

Stay `Open`, assigned to Ilia. Do **not** move to With Customer — nothing is with them. Two
housekeeping items worth doing regardless of the checks: **link XSPCMA-868 to PLT-2649**, and get it
assigned (Critical + unassigned + zero comments since 13 Aug).

---

## 2026-08-27 (later session, WITH platformapi access) — verdict changes: this is ours to fix, and it is 75 rows

**Supersedes drafts (a) and the Sachin questions above.** Draft (a) asked Sachin whether the PATCH
persists coordinates and whether `GET /360captures` joins them. **Both are now answered from the
code — do not send it.** Full working: [`platformapi-answers.md`](platformapi-answers.md).

Draft (b) to Yash **still stands and is still the right message**, with one correction to its
wording: the pin positions were written when the *capture points were generated*, not "when the
captures were taken". The substance — the model change could not have moved them, that is on us not
the BIM team — is confirmed correct.

**What changed:** the pin height is a stored number on the **capture point** (101 rows), not on each
photo (1,868 rows). The captures carry no coordinate of their own; they read through to the point. So
the fix is ~50× smaller than the last session feared, it needs **no backend change**, and the
existing PATCH endpoint does it — proven by an e2e test that runs against a real database.

Also confirmed: **nothing in platform-api ever rewrites those rows**, and the insert path is blocked
by a unique constraint, so a re-import would be *rejected* rather than applied. That is the mechanism
for the five lost weeks.

### Chosen action: the one-pin test FIRST, then the 101-row correction

Not straight to the bulk fix. One inference is still open — I could not read the stored procedure
itself (the DB-functions repo is not checked out here), so the join is proven by consequence, not by
sight. The one-pin test closes it for the price of one reversible row.

1. **PATCH one point** — `00b5344c-57a1-4e87-a0fe-df1bbbf68961` (pin #1, 52 photos, easy to spot),
   body `{"yMeters": 0.0}` **only**.
2. **Reload the 360 tab.** Pin drops to ground level → the join is confirmed and all 52 of its photos
   moved together, which is the whole theory demonstrated.
3. **Revert** (`{"yMeters": 50.4}`) or keep, as preferred.
4. **Then the remaining 100**, same body, with approval on the ticket first.

⚠️ **Three things that would make this worse — all live traps:**

- **Patch `yMeters`, never `zMeters`.** `yMeters` is the vertical axis here. This folder had it
  backwards until yesterday; patching `zMeters` would move all 75 pins sideways on the floor plan and
  leave the height wrong.
- **Send only `yMeters` in the body.** Including `modelRoomId` or `modelLevelId` triggers a
  room/level validation against the model mapping, which would reject it. This also means the
  *"reparent the room to the real L00 level"* option in `PLT-2649-stale-pinpoints.csv` is probably
  not executable through this endpoint at all.
- **⚠️ Never delete-and-recreate the points.** The bulk delete endpoint cascades into the linked
  captures and **deletes their image files from cloud storage** — 1,868 photographs, irreversibly,
  non-transactionally. It is the obvious-looking shortcut and it is catastrophic.

Per `../data-remediation-runbook.md` §3 this is the **first bulk PATCH of production rows** here, so
it needs a written line of approval on the ticket. There is no precedent to point at.

### Draft — internal comment on the ticket (for a human to post)

> Update on the 360 pins, and it's better news than last week: this is ours to fix, and it's small.
>
> The pin height isn't read from the model. It was written into our database once, when the capture
> points were first generated, and nothing since then ever updates it. That's why correcting the
> level and re-uploading didn't move anything, and why it never could have. The BIM team did what we
> asked; the instruction was wrong.
>
> The good part: the height lives on the 101 capture points, not on the 1,868 photos, so correcting
> 101 values fixes every photo at once. No code change, no release. I'd like to prove it on a single
> point first, watch its 52 photos drop into place, then do the rest.
>
> **Can I have the go-ahead to correct those 101 values on PA12?** It's reversible, and I'll do the
> one-point check before anything else.

### Draft — to Yash (short version of (b), if (b) hasn't gone yet)

> @Yash Patel — PLT-2649. Please don't chase the BIM team on this, and please don't tell them the
> elevation change was wrong. It wasn't. It just couldn't have worked: our pin positions were saved
> once when the capture points were created, and re-uploading a model doesn't rewrite them. That's
> our bug, not theirs.
>
> I can fix it from our side without a release. Nothing needed from the client.
>
> **One question when you get a chance: roughly what date was the corrected model re-uploaded?**
> XSPCMA-868 was raised on 13 Aug and I need to know whether that was before or after.

### Action on the board

Stay **Open**, assigned to Ilia — the ticket is now genuinely actionable by us, which it has not been
since May. Unchanged housekeeping: **link XSPCMA-868** (still Critical, still unassigned) and note
that this fix does **not** close it — the rooms stay on the mis-named level, so the ground floor still
appears twice in the floor filter and half the photos still hide behind the unpicked option.

---

## 2026-08-27 (addendum) — hold the BIM-team instruction. One question to Yash first.

Supersedes the "raise DC - 0G - FFL by 50.4" ask. See `prod-mcp-findings-2026-08-27.md` §addendum:
the −50.4 is in our export, Revit reads 0.00, and the instruction would have been executed in Revit.

> You were right to stop me, and the answer to your question is yes — about +50.4 — but not for the
> reason it looks like.
>
> That export shifted the whole file down by 50.4, and the shift on its own was enough.
> GT - 0G - FFL and SS - 0G - FFL weren't hand-edited and they came out correct. DC - 0G - FFL was
> also edited by hand to 0.00, so it got the correction twice and ended up 50.4 below the ground.
> The 0.00 in the screenshot is that hand-edit, and it's what broke it.
>
> So in Revit that level should read about +50.4, the same as its neighbours. I don't want to tell the
> BIM team that yet though, because if I've got it wrong they'll move it 50 m the wrong way again.
>
> **Can you get a screenshot of that same level schedule showing GT - 0G - FFL and SS - 0G - FFL?**
> If they read about +50.2 and +50.1 then I'm right and we can tell the team confidently. If they read
> about −0.2, stop — my explanation is wrong and nobody should touch the model.
>
> The missing L0 rooms are a separate problem in the same export. I'll come back to that one.

## 2026-08-28 — TOP PRIORITY: check whether the wrong instruction already went to Yash before this addendum was drafted

> **⛔ SUPERSEDED 2026-08-31 — do not send this section's draft.** Its ask (a screenshot of
> `GT - 0G - FFL` and `SS - 0G - FFL`) was answered by Yash on 08-28. Kept for the record; the
> current draft is the 2026-08-31 section at the end of this file.

Live Jira re-fetch confirms the sequence. **Comment 110576 (16:20 BST, 08-27, already posted)** told
Yash the pins are fixed and asked him to get the BIM team to *"set the ground floor level to 0 and
re-upload."* **Comment 110577 (16:24 BST): Yash agreed** — *"Will ask for BIM team to change the
elevation on the model and re export."* Nothing on Jira since.

The addendum immediately above this section — reached only **after** 16:24 BST, and never posted —
concludes the opposite: the level already reads 0.00 in Revit, and the fix is **+50.4**, not 0. So
the instruction Yash has already agreed to relay is not just unconfirmed, it is very likely the wrong
one, and it left this folder's hands before the correction did.

**This is not a routine "post the draft" item.** It is a check on whether a customer-facing message
already sent asked for the wrong thing, and if it hasn't reached BIM yet, it needs to be stopped
before it does.

### Action, in order

1. **Ask Yash directly, out of band if faster than Jira, whether he has relayed anything to the BIM
   team yet.** If not, hold him before he does.
2. **If not yet sent, post this instead of "set it to 0":**

> One correction before you pass anything to the BIM team — please hold off on "set it to 0" for now.
>
> I looked closer and the ground floor is already at 0.00 in Revit — the July fix worked. The −50.4
> we're seeing is a separate shift affecting the whole file, the same one that correctly moved the
> other ground floors on this building. So the actual target for this level is **+50.4**, to match
> its neighbours, not 0.
>
> Before I say that with full confidence, **could you get one more screenshot of that same level
> schedule — this time showing GT - 0G - FFL and SS - 0G - FFL as well?** If those read about +50.2
> and +50.1, I'm confident and we can tell BIM the exact number. If they read close to 0 or negative,
> stop, my theory doesn't hold and nobody should touch the model yet.

3. **If it has already been sent** (worth asking plainly, not assuming): find out whether the BIM
   team has acted on it. Per the theory, "set it to 0" executed in Revit on a level that already
   reads 0.00 should be a no-op — but confirm rather than hope, and be ready to explain the correction
   either way.

### Why this jumps the queue

Every other open item on this ticket is a stalled draft costing time. This one is a **live,
already-agreed-to instruction that may be wrong**, sitting with the one person who can stop it before
it reaches a client's BIM team. The cost of checking is one message; the cost of not checking, if it's
already in flight, is a second wasted BIM correction on the same ticket that has already cost five
weeks once.

---

## 2026-08-31 — SUPERSEDES the 08-28 "TOP PRIORITY" draft above. Do not send it: its ask was already answered.

**Why the section above is stale.** It asks Yash for a screenshot of `GT - 0G - FFL` and
`SS - 0G - FFL`. **He supplied it on 2026-08-28** (recorded in commit `b75e490`, 10:44 UTC, and in
`prod-mcp-findings-2026-08-27.md` § "resolved"). The prediction was confirmed: +50.20 and +50.10.
Sending that draft now would ask him for something he already gave three days ago.

**What the live Jira fetch says today.** Status **With Customer**, assignee Yash, `updated` still
**2026-08-27T16:25**, **20 comments, last is 110577**, no attachment since 08-26, `issuelinks`
empty. So the public record on this ticket still ends with the wrong instruction ("set the ground
floor level to 0") and Yash agreeing to relay it. **Four days, no correction posted.**

**Urgency, honestly downgraded but not to zero.** The acute 08-28 fear — a wrong instruction in
flight to a client's BIM team — has almost certainly passed: Yash was holding, not relaying. What
remains is that the only durable record anyone can read is wrong, and the right number has never
been written down anywhere the customer's side can see it. That is a same-day fix, not an
emergency.

**Assumption behind the draft:** that Yash has not relayed anything to BIM. Inferred from his
supplying the schedule on 08-28, not stated by him — which is why the message ends by asking.

### Draft — to Yash Patel, post on PLT-2649 (replaces the "set it to 0" ask in 110576)

> Yash, one correction to what I asked you on Wednesday. Please ignore "set the ground floor level
> to 0". That one was wrong.
>
> The level schedule you sent settles it. DC - 0G - FFL already reads 0.00 in Revit, and FH-0G-FFL
> right next to it reads 50.40 and lands in exactly the right place in our system. So the ask for
> the BIM team is to make DC - 0G - FFL read 50.40 as well, matching FH-0G-FFL in that same
> schedule, then re-export.
>
> The photos are already fixed and none of this affects them. This is only so new 360s taken on
> that floor land in the right place, and it should also bring back the floor plan that was missing
> in the mobile app.
>
> **Have you passed anything to the BIM team yet?**

### Second message — separate, send only after the above is answered

Do not merge this into the message above; it carries its own question and would bury the
correction. The Phase 2 ground floor rooms are still missing from the export and have **still never
been mentioned to the customer**, and XSPCMA-868 is still Open, Critical and unassigned after 18
days with not one substantive comment on it.

> Separately, on the missing ground floor images in the app. The Phase 2 ground floor rooms are not
> in the model export we currently hold, which is why those photos have nothing to sit in. That is
> a different problem from the level height and the re-export above may or may not bring them back.
>
> **Can you ask whether the Phase 2 ground floor rooms were dropped deliberately in the 6 August
> export?**

### Housekeeping, unchanged and still not done

- **Link XSPCMA-868 to PLT-2649.** `issuelinks` is still empty; recommended since 08-27.
- **XSPCMA-868 needs an assignee.** Critical, raised 08-13, unassigned for 18 days, nine comments
  all of which are Freshdesk status noise.
- The pin fix does **not** close XSPCMA-868. Say so when it is linked.
