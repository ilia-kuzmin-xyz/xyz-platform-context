# PLT-2649 — recommended action (DRAFT ONLY — execute nothing)

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

Re-route the stalled ownership question to **Pietro Desiato** (product owner) with a crisp restatement of the confirmed root cause plus **one** closed, answerable decision question. This is the smallest move that unblocks a ticket that has sat unanswered since 2026-06-30.

**This happened** — Pietro replied 07-13 (§Update in `context.md`), so the routing below is historical context, not a live instruction.

## Why this and not the others

- **Not (b) Ready For Development.** There is **no frontend fix to make.** The pin transform is provably correct — Quality pins use the identical `transformPushPinsToViewer` path and render right on the same PA12 model (`context.md` § Mechanism). The symptom reproduces in legacy PowerBI, which shares none of this code. Sending it to Dev implies a code defect that the evidence rules out; it would bounce back. (The one code-adjacent nuance — non-deterministic `FIRST(zMeters)` in `dashboard-360-service.ts:541-543` — is an *amplifier* that only matters if XYZ later chooses to remediate on our side; it is not a fix for the root cause.)
- **Not (c) With Technical Support / client question.** The customer has **already answered** (2026-06-05: "same on the old one… problem with the room data in the Revit models") and effectively handed it back. Going to the client again *before* we have internally decided whether **we** remap the coordinates or **they** re-upload would just re-loop the ticket. A client ask becomes correct only *after* the internal decision below.
- **Not (d) Blocked.** It is stalled, but the blocker is an **internal question that was asked once and never owned** — not an external dependency we are legitimately waiting on. "Blocked" would entrench the stall; a routed, closed question is the move the playbook prescribes for exactly this ("assign the 'what changed / who owns' question an owner; do not let it drop").

## Draft — internal reply (owner: Pietro Desiato, product; cc Ilia Kuzmin)

Playbook style: root cause stated once, one owner, one closed decision question, explicit scoping.

> @Pietro Desiato — reviving PLT-2649 (PA12 360 pins too high). Analysis is settled on cause; we're stalled on one decision.
>
> **Confirmed:** this is a **capture-coordinate data problem, not a dashboard bug.** Same misplacement shows in PowerBI, and Quality pins (identical viewer transform) are correct on the same PA12 model — so no code change fixes it. A subset of captures carry a wrong elevation, consistent with your "old project base point" read.
>
> **One decision to unblock:** for the affected PA12 captures, do we (a) ask the client to **re-upload** them against the current model base point, or (b) **remap** the stale-base-point captures on our side? If (b), who owns that data task and can you point me to them?
>
> Scoping: `[NEW DASHBOARD]` in the title is a red herring — the defect is upstream of both dashboards.

## Prerequisite evidence to attach (whoever picks it up — small, do first)

To move the split estimate ("~60/40") from eyeball to fact and to confirm the trigger before choosing (a) vs (b) — playbook Phase 6 (cause ✔ / **trigger** / **cohort**):

1. **Cohort:** query `captures_360.zMeters` for PA12 against `project-levels.elevation` / `project-rooms` per `modelRoomId`; list capture/room IDs whose Z deviates beyond a floor-height threshold. Gives the exact count and which rooms.
2. **Trigger:** correlate the bad captures' upload dates (`insertedOn`) against PA12's federated-model version / base-point change history — does "inherited the old pbp" hold, and dated when?

These make the client ask (if we land on option a) specific ("re-upload these N captures") instead of "re-upload everything".

## Follow-through the human should own (not executed here)

- After the (a)/(b) decision, reassign off **Masum Ahmed** (support, off-roster) to the named data owner or to product.
- If option (a): Yash relays a **specific** re-upload request to the client (which captures, why) via Freshdesk #6622 — not before.
- Post-close: add a `dashboard/pitfalls.md` entry (360 pin Z = capture source coordinate; stale-base-point captures mis-place; `FIRST(zMeters)` is non-deterministic per room) and fix the `360-tab.md:47-53` note (pins use the capture's own coords, not a room-elevation lookup).
