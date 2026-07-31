# PLT-2649 — recommended action (DRAFT ONLY — execute nothing)

<<<<<<< HEAD
## ⚠️ 2026-07-24 re-check — supersedes the action below; answer Yash's question first

The situation has moved past "re-route to Pietro" (that already happened, 07-13 — see `context.md` §Update). Root cause is now a **named level + a named wrong value** (level `f0f4d409`, elevation 50.4 → should be 0), stated by Ilia on 07-16. Yash then asked, on **07-17**, the one fact needed to act on it — *"which model?"* — and it has sat unanswered **7 days**.

**Chosen action now: (a′) — post the model identifier Yash asked for, then let Yash take the specific re-upload/correction request to the client's project-delivery team.** This is not a new investigation; §Update in `context.md` shows Ilia already had enough to name the exact level id and both its wrong and correct values, so the model it belongs to should be a lookup against that same analysis, not fresh work.

- **Not (c) With Technical Support / client question — yet.** Yash cannot productively go back to the client until he has the model name; going to the client with "which model has level f0f4d409" would just relay our own internal question outward. Answer internally first, *then* Yash's client message becomes the specific, actionable one Jason Fingland's UX framing wants ("these captures used Level 3, now read as Level 4").
- **Not (b) Ready For Development.** Still no frontend fix — the fix is a one-value correction in the source Revit model plus a re-import; nothing in `hc-frontend` changes for the root cause itself. (Jason Fingland's X/Y/Z-in-details-panel editing idea, 07-13, is a separate, optional future capability — not this ticket's fix.)
- **Not (d) Blocked.** Identical to PLT-2906's diagnosis: this reads as blocked-on-the-client only if you don't notice the last move in the thread is *ours*, unanswered.

## Draft — reply to Yash (author: Ilia Kuzmin)

> @Yash Patel — level `f0f4d409` (elevation currently 50.4, should be 0) belongs to **[MODEL NAME — Ilia to fill in from his 07-16 analysis]**. Once project delivery corrects that one value and the model is re-imported, rooms → points → captures all inherit the fix — no per-capture re-upload needed. Worth relaying to them as a single, precise ask rather than "re-upload everything."

*(Bracketed placeholder is intentional — this draft cannot invent the model name; it is the one fact this run could not source. Posting a guess would be worse than the current silence.)*

---

## Action as originally drafted 2026-07-13 (superseded, kept for the record)

### Chosen action: (a) — draft the next reply (internal, one owner)
=======
## Group A verdict: **stay With Customer.** Ball is with the customer (via Yash).
>>>>>>> origin/main

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
