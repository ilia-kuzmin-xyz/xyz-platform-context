# PLT-2858 — Recommended action (DRAFT ONLY — execute nothing)

## Chosen: (a) — post the answer that unblocks the thread, then escalate the product decision

**Revised 2026-07-29.** The 07-13/07-22 draft treated this as "nudge Mostafa on zone-config ownership."
That framing was built on an incomplete reading of the thread: the 2026-07-14 comments (107317, 107320 —
`context.md §1a`) were missed by both earlier passes. With them, the next step is no longer a nudge — there
are **three concrete unanswered questions**, and **we can answer the one that is most likely blocking the
PO ourselves, from code, today**:

1. **107320 (Mostafa → Darminder, 07-14, 15 days unanswered):** *"what is the difference between location
   and location details"*. Answer = `context.md §2a`. Mostafa's *"waiting on this since it was asked of me"*
   (107533, 07-16) most plausibly refers to exactly this — so the ticket may have been stalled for two weeks
   on a 30-second answer.
2. **107317 (customer → us, 07-14, 15 days unanswered):** the customer withdrew the configure-zones path and
   asked for **either** a Location dropdown **or** removal of the Location field. That is a decision request,
   and it has had no reply while Freshdesk #7286 sits Open on a **Critical**.
3. **106720 (Darminder → Mostafa, 07-07, 22 days unanswered):** go/no-go on the separate "surface Phase"
   ticket.

**Owner routing:** post as **Darminder** (he owns the answer to #1 and #3) or Ilia; **@Mostafa** and
**@Pietro** for the decision; **@Yash** for the customer-facing side. **Loop Pietro directly this time** —
the 07-22 note flagged this as the escalation trigger, and the trigger has now fired (see the escalation
block below).

### Why (a), not the others
- **Not (b) Ready For Development.** There is still no dev fix for the *reported* symptom. But note this is
  closer to (b) than it was: the customer's option (b) — hide "Location" when a project has no locations —
  is a **small, well-guarded FE change** (`issueLocations.length > 0` already discriminates at
  `use-issue-form.ts:519`; `duckdb-room-store.hasRoomsData()` at `:211-220` on the dashboard side —
  `context.md §2f`). It needs one product decision, not analysis. If Mostafa/Pietro pick option (b), this
  goes straight to Ready For Development with a precise scope.
- **Not (c) With Technical Support / back to the client.** We do not need anything *new* from the client —
  they already told us what they want. We **owe them a reply**. The reply is blocked on our own product
  decision, so the next move is internal. (Yash should still send a holding update — see below.)
- **Not (d) Blocked.** It has behaved like Blocked for two weeks, but it isn't: nothing external blocks us.
  The unblocking action is in our own hands, which is precisely why marking it Blocked would be wrong.

---

## Escalation — the 07-22 trigger has fired

The 07-22 draft said: *"if no answer within another few days, consider looping Pietro directly."* As of
2026-07-29:

| Clock | Days |
|---|---|
| Ticket open (Critical) | **28** |
| Since customer's "we don't know how" (106728, 07-07) | **22** |
| Since Darminder's Phase go/no-go ask (106720, 07-07) | **22** |
| Since Mostafa's "leave it with me" (107208, 07-13) | **16** |
| Since the customer's dropdown-or-remove request (107317, 07-14) — **unanswered** | **15** |
| Since Mostafa's question to Darminder (107320, 07-14) — **unanswered** | **15** |
| Since any comment at all (107533, 07-16) | **13** |

**Escalate, but not at Mostafa.** A third nudge aimed at him would repeat the mistake — on the evidence he
is waiting on Darminder, not withholding. The escalation that matters is:
- **Pietro looped directly** (named independently as the workflow authority by Darminder, 107109, and by the
  customer, 106728) — as a decision-maker on the two options, with the engineering feasibility attached.
- **Yash flagged** that a **Critical** ticket has left a customer request unanswered for 15 days with
  Freshdesk Open. That is the part that should not be allowed to age further.
- **A named date.** The playbook's lesson is that ownerless open questions float forever; attach "answer by
  X or we default to option (b) behind a flag" so silence resolves to something.

---

## Draft message for the thread (author: Darminder or Ilia; @Mostafa, @Pietro, @Yash)

> @Mostafa — answering your question from 14 Jul first, since I think this is what's been blocking you.
>
> **Location vs Location details — there are actually three fields, two of them share the label:**
>
> | What the user sees | Field | Where it comes from | Editable? |
> |---|---|---|---|
> | "Location" (web viewer issue panel) | `issueLocationId` | auto-derived from the project's **named zones** (floors/areas/rooms) | **No** — there is no UI control for it at all |
> | "Location Detail(s)" | `locationDetails` | free text, max 100 chars | **Yes** |
> | "Location" (**Dashboard** quality panel) | `modelRoomId` | the issue's raw **model room** id — a *different field* | **No** |
>
> So "Location" is a zone the system infers, "Location details" is a note the user types — and the Dashboard's
> "Location" isn't even the same field as the viewer's. Both auto ones render the raw **ID**, not a name
> (`issue-details.tsx:139`, `issue-details-panel.tsx:366`). On ML9 there are no rooms configured, so both
> read empty / `N/A` — which is what the customer's 14 Jul screenshot is showing.
>
> @Pietro @Mostafa — **the customer has since proposed the decision for us** (Yash's comment, 14 Jul). They
> said rooms can't be connected to their models, and asked for either **(a) a dropdown of Locations to pick
> on the QA**, or **(b) remove the Location field** so it doesn't look like missing data on the Dashboard.
> Engineering reality on each, so you can pick:
>
> - **(a) Dropdown — mostly already built, but it won't help ML9 on its own.** The form state, validation and
>   save path for `locationId` all exist; only the dropdown control is missing. **But** its options come from
>   the project's `ISSUE_LOCATION` list, which is the same named-zone config ML9 doesn't have — so on ML9 it
>   would render an empty dropdown. It only helps if zones get configured, or if that list can be populated
>   independently (@Sachin / @Ali — can `ISSUE_LOCATION` parameters exist without per-model rooms?).
> - **(b) Hide Location when the project has no locations — small and it actually fixes the complaint.** We
>   already branch on "does this project have locations" in two places, so this is a guard, not a feature.
> - **(c) Or we still go back to configuring zones on ML9** — which needs the how-to we've never produced.
>
> **One factual check before you decide** (@Darminder): the customer's premise is *"it is not possible to
> connect the rooms to the different models."* Is that true for ML9? If rooms *can* be connected, the answer
> is (c) plus a how-to, and (a)/(b) are moot.
>
> Two things still open from 7 Jul, while we're here: the **go/no-go on the separate "surface Phase" ticket**
> (my 106720) — and heads-up that Phase may already be on the detail panel, since it renders every project
> category type except Discipline/Package (`issue-details.tsx:151-158`), so worth checking ML9's config
> before I raise it.
>
> Separate FE finding to log either way (not the customer's symptom): once zones *are* configured, these
> panels will show a **GUID** rather than a zone/room name. Room names are already available client-side
> (`duckdb-room-store.getRoomById`), so it's a small fix — worth its own ticket so that fixing the data gap
> doesn't just surface an ID.

*(One answer, three closed decision options with the engineering cost attached, one factual check routed to
one person, and the side-findings explicitly scoped — so the thread produces a decision rather than another
round of open-ended discussion.)*

---

## Facts to have ready when this comes back

- **Answer for the customer today, via Yash (does not need the product decision):** the form *does* have a
  free-text **"Location Detail"** field (`issue-form.tsx:526-534` → `locationDetails`), shown in both panels
  under "Location Details". If they just want to record a location manually right now, that works — the
  *auto* zone "Location" is the one needing zones configured. Set expectations that these are different
  fields (`context.md §2a`).
- **If option (b) is chosen — scope is already identifiable:** hide/suppress the "Location" row when the
  project has no locations, on **both** surfaces (viewer `issue-details.tsx:139`; dashboard
  `issue-details-panel.tsx:355-367`), using the existing discriminators (`issueLocations.length`,
  `hasRoomsData()`). Straightforward Ready-For-Development scope for Darminder/Rishi.
- **If option (a) is chosen:** the missing piece is only the select control writing `locationId`; everything
  else is wired (`context.md §2f`). Requires the BE answer on whether `ISSUE_LOCATION` can be populated
  without per-model rooms — **do not commit to (a) before that answer**, or we ship an empty dropdown.
- **BE confirmation, if the mechanism is challenged:** how `issueLocationId` / `modelRoomId` get stamped from
  named zones is api-v2 (Sachin / Ali) — out of the frontend repo. Darminder has asserted it in-thread;
  route to Sachin/Ali only if disputed, or for the `ISSUE_LOCATION` question above.
- **Three candidate dev follow-ups** (product to prioritise; none is the reported symptom):
  (i) resolve id → name on both panels (`context.md §2c`, `§2e`);
  (ii) make the two "Location" labels mean the same thing across viewer and dashboard, or rename one (`§2e`);
  (iii) the "surface Phase" ticket **only if** `§2d` confirms it isn't already shown.

---

## Notes for the coordinator (Yash)

- **Send a holding update to the customer now — don't wait for the decision.** They have been silent-treated
  for 15 days on a Critical. Honest wording: *"root cause confirmed (Location is derived from named zones,
  which aren't configured on ML9). We've taken your two suggestions — a Location dropdown, or removing the
  field — to product; we'll come back with which one we're doing. In the meantime the free-text 'Location
  Detail' field can be used to record a location manually."* Do **not** promise a code fix or a date until
  Mostafa/Pietro answer.
- **Correct the record on this ticket's history:** the 07-14 customer request (107317) was never
  acknowledged on-ticket. Worth an explicit "sorry for the delay, picking this up" so the thread doesn't
  read as if the customer's proposal was rejected in silence.
- **Priority mismatch, flag again:** still **Critical**, but the diagnosis is a config/UX gap with a manual
  workaround available. 28 days at Critical with 13 days of silence distorts the incident board — confirm
  with Mostafa/Yash whether Critical still fits, or downgrade and track as product work.
- **Cohort (playbook #6):** every project without named zones shows this on both surfaces. Worth asking
  product whether to identify those projects proactively rather than per-ticket.

**Confidence in diagnosis: 8/10. Confidence in this being the right next step: 8/10** (up from ~7/10 — the
step is now answering two specifically identified unanswered questions rather than a judgment call about how
to nudge; the residual uncertainty is which of the three options product picks, and the unverified BE fact
behind option (a)).
