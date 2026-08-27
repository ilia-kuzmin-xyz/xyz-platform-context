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
