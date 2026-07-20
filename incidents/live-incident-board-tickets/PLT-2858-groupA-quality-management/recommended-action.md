# PLT-2858 — Recommended action

> **Revised 2026-07-20.** Supersedes the 07-13 draft (kept below as § Prior draft).
> The block has moved: it's no longer "who configures zones" (the customer has told us the
> BIM route doesn't work for them) — it's now (1) Mostafa's own unanswered question
> *"what is the difference between location and location details"* (comment 107320, open 6
> days) and (2) the customer's concrete **dropdown-or-remove** proposal (107317, no reply
> 6 days). See `context.md §7`.

## Chosen: (a) Draft a single thread reply that (i) answers Mostafa's question so it stops blocking, and (ii) turns the customer's two options into one closed product decision

Both blockers are answerable **now** and neither needs the customer. The reply is addressed to
**Mostafa** (owns the decision + asked 107320) and **Darminder** (assignee; 107320 was routed to him).
It follows the playbook: answer the open question with a value, then present the two options pre-sized so
the thread produces a decision, not another round.

### Why (a), not the others
- **Not "send to the customer."** We're not waiting on them — they've already given us the two options
  they'd accept. Going back now with anything other than a decision just adds another 6-day round.
- **Not "Ready For Development."** There *is* now a small FE candidate (hide the Location row — proposal b,
  `context.md §7c`), but it needs a one-line product yes/no first (hide vs dropdown vs both). Sending to dev
  before that is premature.
- **Not "Blocked."** It's parked on a product decision with an engaged owner (Mostafa), not hard-blocked.

**Owner routing:** primary → **Mostafa** (decision + 107320); **Darminder** (assignee, FE sizing). Relay to
the customer via **Yash** only once the option is chosen.

---

## Draft message for the thread (@Mostafa, @Darminder — Darminder or Ilia to post)

> @Mostafa @Darminder — answering the open question first, then the customer's two options with rough FE
> sizing so we can pick one.
>
> **1. Location vs Location Detail (your Q, 107320).** They're two separate fields:
> - **"Location"** = the **named zone** (floor / area / room) the issue's element sits in. It's
>   **auto-derived** from the model's configured zones and is **read-only** — there's no form control for
>   it. It's empty on ML9 because ML9 has no named zones set up.
> - **"Location Detail"** = a **free-text note** the user types on the QA form (max 100 chars). Fully
>   editable, nothing to do with zones — **it works today**.
> So the customer's screenshot shows an empty *Location* (the zone), while *Location Detail* is a separate
> box they can already fill in.
>
> **2. The customer's two options** (they've told us connecting rooms to models isn't working for them, so
> "configure zones" is off the table for now):
> - **(b) Hide the Location row when a project has no zones configured** — **very small FE change, no
>   backend.** The detail row already supports a `hidden` flag (we use it for Discipline/Package today), so
>   we'd hide "Location" whenever the project has no zones. Directly fixes the "looks like missing data"
>   complaint.
> - **(a) Add a Location dropdown on the QA form** — also a **small FE change** (the zone list is already
>   loaded client-side and the save path already exists), **but** two catches: it renders **empty on ML9**
>   (same missing-zones data), so it wouldn't actually help this customer; and it turns an auto-derived
>   field into a manual one, which is a product-model change I'd want to confirm the backend persists
>   (@Darminder / api-v2).
>
> **My recommendation:** given many projects likely never configure zones, **go with (b) hide-when-empty**
> as the fix here — it's tiny, no backend, and solves what the customer actually complained about. Keep the
> dropdown (a) as a *separate* enhancement only for projects that do configure zones. One more small
> follow-up regardless: even where zones exist, the panel currently shows the raw zone **ID**, not its name
> — worth fixing alongside (b).
>
> **@Mostafa — can you confirm (b), (a), or both?** Once you pick, I'll size the ticket. (One data point
> that would firm this up: how many projects have zero configured zones? If it's most of them, (b) is
> clearly right.)

*(One open question answered with a value; two options each pre-sized to a rough FE cost; one closed
decision asked of one owner — per the playbook message-craft rules.)*

---

## Facts to have ready when this comes back

- **Which surface to change (proposal b).** The customer's screenshot says *"on the Dashboard"* — the
  **dashboard quality panel** has its own detail component
  (`quality-panel/…/issue-details-panel/issue-details-panel.tsx`), separate from the viewer detail panel
  (`issue-details.tsx:139`). Confirm the exact surface against the attachment before ticketing (⚠️ NEEDS
  HUMAN — `image-20260714-113920.png` inaccessible). Possibly both surfaces.
- **Dropdown (proposal a) FE building blocks already exist:** lookup `issueParameters.issueLocations`
  (`issue-form.tsx:56`), write path `set('issueLocationId', form.locationId)` (`format-issues.ts:146`).
  Blocker is product (manual vs auto model) + BE persistence check (Sachin/Ali), not FE plumbing.
- **Partial workaround the customer can use today (via Yash):** the free-text **"Location Detail"** field
  (`issue-form.tsx:527-537`) already works and shows on the panel — if they just want to record a location
  note now, it's available. (Two different fields — see the answer above.)
- **Latent §2c gap:** panel binds `compare('locationId')` → renders a GUID, never resolves to
  `IIssueLocation.location`. Bundle the id→label fix with whichever option is chosen.

---

## Notes for the coordinator (Yash)
- Freshdesk #7286 last flipped to "Waiting on 3rd line" (07-07). Honest client-facing holding line once the
  option is picked: *"we can hide the empty Location on projects without configured zones so it no longer
  looks like missing data — rolling that out"* (if b), or the dropdown scope (if a). Do **not** promise the
  auto-Location will populate without zone config — it can't.
- **Priority mismatch still worth flagging:** Critical, but this is a display/config gap with a free-text
  workaround available. Confirm with Mostafa/Yash whether Critical still fits, so it isn't distorting the
  board.

**Confidence in the location-vs-detail answer: 9/10. In the feasibility sizing: 8/10. In "(b) is the right
option": 6/10** (product call + cohort count not mine to settle — `context.md §7d/§7e`).

---

## Prior draft (2026-07-13) — superseded, kept for provenance

The 07-13 recommendation was to send **three closed questions to Mostafa/Pietro** (zone-setup ownership +
how-to; cohort; and a heads-up that Phase may already be surfaced), plus the §2c GUID-not-label side
finding. That framing assumed the block was *"who configures zones and how."* It is now overtaken: the
customer has reported the BIM/zone route doesn't work for them and has proposed dropdown-or-remove, so the
live decision is the two-option product call above. The Phase-surfacing heads-up (§2d) and the cohort
question remain valid and are folded into the new draft / `context.md §7d`.
