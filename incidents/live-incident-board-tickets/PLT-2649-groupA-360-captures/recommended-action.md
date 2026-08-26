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
