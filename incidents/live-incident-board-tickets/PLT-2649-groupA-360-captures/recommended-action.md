# PLT-2649 — recommended action (DRAFT ONLY — execute nothing)

> **Superseded 2026-07-27.** The previous recommendation — route the stalled ownership question to Pietro Desiato with a closed "re-upload vs remap" decision — is **DONE in substance and moot in detail.** The stall broke without it: Ilia inspected the source model and answered the root cause directly (2026-07-24), and the re-upload-vs-remap dichotomy turned out to be a false one — the fix is neither. The superseded draft is retained at the bottom for provenance. See `context.md` § UPDATE 2026-07-24.

## Chosen action: (c) — no status change; one narrow cohort question to the coordinator

**The ticket's current state is correct and needs nothing done to it.** Root cause is pinned (`DC - 0G - FFL` at +50.4 m in `PA12-M3-A-9200-ZZ-DC-ZZZZ-RBA_V14_R24_detached`; 101 rooms / ~1,870 captures), the fix is specified and cheap, the right party owns it, and Freshdesk #6622 correctly reads "Waiting on customer". **Do not comment on the mechanism again** — Ilia's 07-24 comment already says everything a re-explanation would say, and re-stating a settled cause is the noise that makes threads unreadable.

The one thing genuinely still open is **playbook #6 — cohort beyond the reported sample**. The fix addresses one level in one model. Nobody has asked whether the *same shape* — a linked file federated without its shared coordinates aligned — exists elsewhere. That question is cheap to ask now, while the mechanism is fresh, and expensive to discover later via a second ticket. So: **monitor + one small proactive-sweep question**, addressed to the coordinator, not the customer.

## Why this and not the others

- **Not (a) another substantive comment on the ticket.** The cause is stated once, precisely, by the person who found it. Adding a restatement or a "just checking in" three days after the hand-off is pure thread noise. The playbook's discipline is one clear statement per finding, not reassurance.
- **Not (b) Ready For Development.** Still no frontend work — and now emphatically so. The fix happens entirely in the source model; rooms → capture points → pins inherit the corrected elevation on re-import. Sending it to Dev would imply a code defect the evidence rules out. (`FIRST(zMeters)` non-determinism, `dashboard-360-service.ts:541-543`, is no longer even a contributing factor here — the mis-placement is level-scoped and uniform, so it needs no non-determinism to explain. Log it as standalone tech debt, not as PLT-2649 work.)
- **Not (d) Blocked.** It *is* waiting on someone else, but "With Customer" already expresses that accurately and keeps the ticket visible on the support cadence. "Blocked" would bury a ticket that is three days into a healthy, correctly-routed external dependency — exactly the entrenchment the playbook warns about.
- **Not a status move at all.** In June the status was wrong (parked on an unowned internal question while labelled as though we were waiting on someone). It is now right. Leave it.

## Draft — internal, cohort sweep (owner: Yash Patel, coordinator; cc Ilia Kuzmin)

Deliberately short, one closed question, no re-litigation of the cause:

> @Yash Patel — PA12 360 pins (PLT-2649) is correctly with project delivery now, nothing needed from us on the fix itself. Two small things while it's out:
>
> 1. **ETA** — when project delivery come back, could you note the expected re-upload date on the ticket? We'll want to verify the pins land correctly after the re-import (that's the only verification step left).
> 2. **Anyone else?** — the cause was a linked file inside the PA12 federation whose levels all sit at 48–73 m instead of project datum. That's a federation setup mistake, not a PA12-specific one. Worth a quick check: **are there other models (PA12 or other projects) with linked files at a non-datum elevation?** If yes we can flag them proactively rather than waiting for the next "pins are too high" ticket.
>
> No action needed on the ticket status — "Waiting on customer" is right.

## Verification step to run after the customer's re-upload (the actual close condition)

Per playbook Phase 6, this closes on cause ✔ / trigger ✔ / **cohort** — not on "the customer said they fixed it":

1. Confirm `DC - 0G - FFL` re-imports at ~0 m (alongside DC-01 = 5.3, DC-02 = 10.6, DC-03 = 15.9).
2. Spot-check that the ~1,870 captures across the 101 affected rooms now render at plausible height in the viewer — and that the previously-correct levels did **not** move.
3. Confirm the same in PowerBI (it shared the symptom, so it should share the fix — a useful independent check that the fix landed upstream of both dashboards, as predicted).
4. Only then close, recording cause + trigger + cohort in the thread.

## Follow-through the human should own (not executed here)

- **Reassign off Masum Ahmed** (support, off-roster) — still outstanding, and still the right call; ownership should sit with Yash (coordination) while it is With Customer.
- **Doc chores — re-checked 2026-07-27, both still NOT done** (flagged only, not actioned here):
  - `dashboard/pitfalls.md` — no pin-elevation / capture-coordinate entry exists. Add one: *360 pin Z comes from the capture's own stored coordinate, which inherits the source model's level elevation; a level mis-elevated in the federated model (e.g. from a linked file with unaligned shared coordinates) floats every pin on it, in both dashboards; `FIRST(zMeters)` per room is non-deterministic.*
  - `dashboard/360-tab.md:47-53` — line 49 still says coords come *"from its `modelRoomId`"*. Inaccurate: the code uses the capture record's own `xMeters/yMeters/zMeters` via `FIRST()` per room.
- **Spun-off product idea** (Jason Fingland, 2026-07-13): detect-and-flag captures whose position no longer matches after a PBP/level change, optionally with X/Y/Z editing via the existing Editor Edit pattern. Route to `dashboard/roadmap.md` or its own ticket — **do not** attach it to PLT-2649.

---

## Superseded draft (2026-07-13 run) — retained for provenance, do not send

<details>
<summary>Prior chosen action: (a) re-route the ownership question to Pietro Desiato</summary>

The prior run recommended reviving the stalled thread with a closed decision question:

> @Pietro Desiato — reviving PLT-2649 (PA12 360 pins too high). Analysis is settled on cause; we're stalled on one decision.
>
> **Confirmed:** this is a **capture-coordinate data problem, not a dashboard bug.** […]
>
> **One decision to unblock:** for the affected PA12 captures, do we (a) ask the client to **re-upload** them against the current model base point, or (b) **remap** the stale-base-point captures on our side? If (b), who owns that data task and can you point me to them?

**Why it is void:** the (a)/(b) framing was a false dichotomy built on the "captures inherited the old pbp" hypothesis. Neither is the fix — no captures are wrong, one *level* is. The prerequisite evidence the draft asked for (query `captures_360.zMeters` against `project-levels` elevation to size the cohort) was obtained more directly by inspecting the source model, and returned a cleaner answer than the query would have: not a percentage of captures, but every capture on one level.

</details>
