# PLT-2858 — Recommended action

> **Refreshed 2026-07-17.** The prior action ("decision message → Mostafa") is **superseded**. Since then
> the ticket pivoted from "educate the BIM team to configure zones" to a **product feature decision**, and
> is now blocked on a *trivial, already-answered* question that Darminder hasn't replied to. The action has
> moved accordingly. (Prior draft preserved below under "Superseded".)

## Chosen: (a) Unblock the thread — draft Darminder's answer to Mostafa's location-vs-location-details question (`context.md §2a`) and tee up the customer's two concrete options for a product decision

The latest two comments define the state precisely: Mostafa (who took the ticket on 07-13, *"leave it with
me"*) asked Darminder *"what is the difference between location and location details"* (107320, 07-14) and
then, when nudged, said *"waiting on this since it was asked of me"* (107533, 07-16 14:44 — the comment that
moved the `updated` timestamp). **So the ticket is blocked on Darminder answering Mostafa** — and that
question is one we already answer in full (`context.md §2a`: auto-derived zone **Location** vs free-text
**Location Detail**). Meanwhile the customer (Mikel, via Yash 107317) has narrowed the ask to two options:
**(1) a drop-down to select Location on the QA**, or **(2) remove the Location field** so an empty value
stops reading as missing data on the dashboard. The highest-leverage move is to *unblock* (answer 107320
now, from our own analysis) and *frame the decision* (the two options + what each costs) so Mostafa can
actually choose rather than wait another cycle.

### Why (a), not the others
- **Not (b) Ready For Development yet.** Both customer options are real code — (1) a new zone-Location
  selector that today does not exist (`context.md §2b`); (2) conditionally hiding the Location row
  (`§2c`). But neither should be built until product picks one; sending to dev now pre-empts Mostafa's
  decision. This is the *next* step after (a), not this step.
- **Not (c) With Technical Support / needs the client.** We are not waiting on Mikel — he has given us a
  clear, actionable request (drop-down or remove). The block is entirely internal (Darminder → Mostafa).
- **Not (d) Blocked.** Not hard-blocked; it is stalled on a one-line answer we can supply immediately.

**Owner routing:** the reply should come from **Darminder** (Mostafa addressed him) — draft it for him, or
post the §2a answer directly so the thread moves. Decision owner remains **Mostafa**. Relay the chosen
option to **Mikel** via **Yash**. Loop **Pietro/Ali** only to settle the "can rooms be linked to models?"
premise (see open question).

---

## Draft message for the thread (Darminder to post, or on his behalf; @Mostafa)

> @Mostafa — answering your question, and framing the decision so we can move:
>
> **Location vs Location Detail (they're two different fields):**
> - **Location** = the *zone* (floor/area/room) an issue sits in. It is **auto-derived** from the model's
>   configured named zones and is **read-only** — there is no UI control to set it. On ML9 no zones are
>   configured, so it's empty (root cause, unchanged).
> - **Location Detail** = a **free-text** box the user *can* type into today (`issue-form.tsx:526-537`);
>   it shows in the detail panel as "Location Details". So users already have a manual way to note a
>   location — it's just not the auto zone-Location.
>
> **Mikel's two options (107317) map to:**
> 1. **Drop-down to select Location** — would mean building a new selector that writes the zone id
>    (`issueLocationId`); none exists today (`§2b`). Note it only helps if there are zones to choose from —
>    which loops back to whether rooms can be configured/linked for this model at all (open Q below).
> 2. **Remove/hide the Location field on the QA** — smaller change: suppress the Location row when empty so
>    it stops reading as "missing data" on the dashboard (`§2c`). Lowest-risk way to kill the confusion if
>    we're not going to populate zones.
>
> Which way do you want to go? Once you pick, I'll raise the dev ticket. Also still open from your 106714:
> the "surface Phase on the detail panel" idea — Phase may **already** be shown (the panel renders every
> category type except Discipline/Package, `issue-details.tsx:151-158`); worth a quick check before we
> ticket it.
>
> ⚠️ One premise to confirm (Pietro/Ali): Mikel says *"it is not possible to connect the rooms to the
> different models."* Is that actually true for this setup, or was it just never configured? The answer
> decides whether option (1) is even viable.

*(One answer to the blocking question, the customer's two options costed, one routed premise to verify — so
the thread gets a decision instead of another wait cycle.)*

---

## Superseded draft (pre-07-14, kept for reference)

The earlier plan routed three closed questions to **Mostafa/Pietro** (zone-setup ownership + how-to;
cohort of zone-less projects; the "surface Phase" heads-up) on the assumption the path forward was
*educating the BIM team to configure zones*. That assumption was overtaken on 07-14 when the customer said
room→model linking isn't possible (their understanding) and asked us to either add a Location selector or
remove the field. The cohort point (every project without configured zones shows empty Location) and the
GUID-not-label finding (`§2c`) still hold and are folded into the message above.

---

## Facts to have ready when this comes back

- **Partial workaround for the customer (via Yash):** the web-viewer form *does* have a free-text
  **"Location Detail"** field (`issue-form.tsx:526-537`, saved to `locationDetails`); it shows in the detail
  panel under "Location Details". If the customer just wants to record a location manually today, that field
  works now — the *auto* zone "Location" is the one that needs zones configured. (Set expectations: these
  are two different fields — `context.md §2a`.)
- **BE confirmation, if the mechanism is challenged:** how `issueLocationId` gets stamped from named zones
  is api-v2 (Sachin / Ali) — out of the frontend repo. Darminder has already asserted it in-thread; route to
  Sachin/Ali only if someone disputes it.
- **Two candidate dev follow-ups** (product to prioritise, both small, neither is the reported symptom):
  (i) resolve `issueLocationId → location` label in the detail panel (`context.md §2c`);
  (ii) the "surface Phase" ticket **only if** §2d confirms it isn't already shown.

---

## Notes for the coordinator (Yash)
- Freshdesk #7286 is Open / "Waiting on 3rd line" — the client is waiting for us. The honest client-facing
  update is: *"root cause identified (location needs named zones set up in the model); we're confirming
  internally who sets that up and the exact steps, and will come back with a how-to."* Do **not** promise a
  code fix — there isn't one for this symptom.
- **Priority mismatch to flag:** the ticket is **Critical**, but the diagnosis is a config/education gap
  with a manual workaround (free-text Location Detail) available. Worth confirming with Mostafa/Yash whether
  Critical still fits, so it isn't distorting the incident board.

**Confidence in diagnosis: 8/10. Confidence in this being the right next step: 8/10** (higher than the
07-13 pass — the block is now explicit and mechanical: Darminder owes Mostafa an answer we already have in
`§2a`, and the customer's ask has resolved to two costed options. The only genuine unknown is the
"can rooms be linked to models?" premise, which is routed to Pietro/Ali, not us).
