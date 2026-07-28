# PLT-2858 — Recommended action

## 2026-07-28 re-check: ESCALATE — address to Pietro directly, Mostafa cc'd (upgraded from "consider")

**Delta since 07-22: none.** Zero comments/activity since 107533 (07-16) — confirmed via Jira (26 comments
total, `updated` timestamp still 07-16). Mostafa never answered; Pietro has been tagged twice (106713,
107109, 107206) but has never once replied. It is now **15 days** since Mostafa's "leave it with me"
(107208, 07-13), **12 days** since his own "waiting on this since it was asked of me" went unanswered by
him in substance (107533, 07-16), and **21 days** since the customer said they don't know how to configure
zones (106728, 07-07) — on a **Critical** ticket. The 07-22 note's contingency ("if no answer within another
few days, consider looping Pietro directly") is now overdue by that same standard. Also newly folded in from
07-14 (pre-dates 07-22 but was missing from this file, see `context.md §-1`): the customer has floated a
concrete product fork — build a real Location selector, or remove the field entirely — which raises the
stakes of continued silence beyond just "who configures zones."

**Action, upgraded:** stop re-nudging Mostafa alone. Post directly to **Pietro** (not as a cc this time),
with Mostafa still tagged for continuity, and make the ask a closed decision rather than an open question.
See the revised draft message immediately below (replaces the 07-22 draft — the original three-question
draft further down this file is now superseded, kept for record only).

### Draft message for the thread (Darminder or Yash to post — @Pietro primary, @Mostafa cc'd)

> @Pietro Desiato — looping you in directly, as this has now sat unanswered for 15 days since @Mostafa
> Kamel Hussien picked it up ("leave it with me", 107208) and 12 days since his last update went nowhere
> (107533). You were independently named as the workflow authority both by Darminder (107109) and by the
> customer themselves (106728) — bringing you in straight rather than through a third nudge to Mostafa.
> This is Critical priority and Freshdesk #7286 has been open since 07-01.
>
> Three closed questions:
> 1. **Zone setup ownership + how-to.** Root cause confirmed: ML9's model has no named zones (floors/
>    areas/rooms) configured, so the auto-derived "Location" is empty on every issue. The customer says
>    they've never done this and don't know how, and separately (107317, 07-14) that connecting rooms
>    across models "is not possible" on their side. Who owns configuring named zones — customer's BIM team
>    or us — and is there an actual how-to we can hand them?
> 2. **Product fork the customer already proposed (107317, 07-14) — needs a ruling either way:** build a
>    real Location drop-down the user can pick from, **or** remove the Location field from the QA form/
>    detail panel entirely, since as-is it reads as broken/missing data on the Dashboard. This has been
>    sitting for 14 days with no response.
> 3. **Cohort.** Same empty-Location gap will show on every project without named zones configured, not
>    just ML9 — worth a stance (proactive sweep vs. per-ticket) once (1)/(2) are settled.
>
> Separate FE finding to log regardless of the above (not the reported symptom): once zones exist, the
> detail panel would show the raw location **ID**, not the zone name — `issue-details.tsx:139`,
> `format-issues.ts:87`. Small follow-up ticket, not urgent.

*(Direct to Pietro, closed questions, explicit day-counts to convey urgency on a Critical ticket — not
another open-ended ask to Mostafa.)*

---

## Original analysis (2026-07-22 and earlier, superseded above) — Chosen: (a) Draft the next routed question to move analysis forward — addressed to **Mostafa Kamel Hussien** (PO), Pietro looped

The reported symptom is diagnosed (empty "Location" = no named zones configured on ML9; the zone Location
is auto-derived and read-only by design — `context.md §1–§2`). What is blocking the ticket is a
**product/process decision**, not engineering, and a specific owner has just picked it up: Mostafa said
*"leave it with me"* (comment 107208, 2026-07-13) in reply to Ilia. The highest-leverage move is to convert
that open-ended commitment into a concrete, answerable decision — playbook style: one owner, closed
questions, phrased for a value — and to hand Mostafa the two engineering findings that should shape it.

### Why (a), not the others
- **Not (b) Ready For Development.** There is no dev fix for the reported symptom — it is data/config
  (configure named zones) + customer education. The only *code* candidates I found are secondary and
  need product prioritisation first: the GUID-not-label display gap (`context.md §2c`) and the
  "surface Phase" idea (`§2d`, which may already be done). Sending the ticket to a dev now would be a no-op
  on the actual complaint.
- **Not (c) With Technical Support / needs the client.** We are not waiting on information from the
  customer — we've diagnosed it. The customer already told us the blocker on their side (*"we don't know how
  to configure zones"*, comment 106728). We cannot give them a useful answer until product defines the
  workflow, so the next step is internal, not client-facing. It returns to the client *after* Mostafa's
  decision.
- **Not (d) Blocked.** It is effectively parked on a product decision, but it is not hard-blocked — the
  owner (Mostafa) is engaged as of today. Marking it Blocked would understate momentum and drop the two
  findings that should inform his decision.

**Owner routing:** primary → **Mostafa** (owns "leave it with me" + the Phase idea); loop **Pietro** (named
by both Darminder, 107109, and the customer, 106728, as the workflow authority). Relay to the customer
(Mikel) via **Yash** only after the workflow answer exists.

**2026-07-22 re-check:** unchanged since 07-16 — Ilia nudged ("any updates?"), Mostafa replied "waiting on
this since it was asked of me" (still unresolved, 6 days after his own "leave it with me"). The three
closed questions below are now overdue; this has stalled on the SAME owner for 9 days since the customer's
"we don't know how" (106728). Escalation candidate: if no answer within another few days, consider looping
Pietro directly (he was independently named as workflow authority by both Darminder and the customer) rather
than re-nudging Mostafa a second time.

---

## [SUPERSEDED 2026-07-28 — kept for record] Draft message for the thread (Darminder or Yash to post; @Mostafa, @Pietro)

> @Mostafa @Pietro — to turn this into a concrete next step, three closed questions:
>
> 1. **Zone setup ownership + how-to.** Confirmed root cause: ML9's model has no named zones (floors/areas/
>    rooms) configured, so the auto-derived "Location" on every issue is empty. The customer (Mikel) has
>    said they've *never done this and don't know how*. Who owns configuring named zones — the customer's
>    BIM team, or us — and **is there a step-by-step we can hand them** (or a self-serve UI)? Without a
>    how-to we can give the customer, this can't move.
> 2. **Cohort.** This affects **every project without named zones configured**, not just ML9. Do we want to
>    identify and proactively flag/remediate those, or handle per-ticket?
> 3. **"Surface Phase" idea (your 107208 / 106714).** Heads-up before we spin a separate ticket: the issue
>    **detail panel already renders every project category type except Discipline/Package**
>    (`issue-details.tsx:151-158`), and Phase is a category type in the form. So Phase may already be shown —
>    can you confirm against ML9's config whether anything is actually missing?
>
> Separate FE finding to log (not the customer's symptom): even once zones are configured, the detail panel
> shows the raw location **ID**, not the zone **name** — it binds to `issueLocationId` and never resolves it
> to the `IIssueLocation.location` label (`issue-details.tsx:139`, `format-issues.ts:87`). Worth a small
> follow-up ticket so that "fixing" the data gap doesn't just surface a GUID.

*(Three closed questions, one owner each, plus one explicitly-scoped side-finding — so the thread gets a
decision, not another round of open-ended discussion.)*

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

**Confidence in diagnosis: 8/10. Confidence in this being the right next step: ~7/10** (comms/process
judgment; depends on how Mostafa wants to own zone-config ownership and the Phase idea).

---

## 2026-07-28 re-check — updated notes for the coordinator

- **Priority mismatch flag still stands and is now sharper:** Critical priority, 21 days since the customer
  said they don't know how to proceed, 15 days since a named owner (Mostafa) took it and produced nothing.
  If Critical is meant to reflect urgency, the ticket's actual velocity contradicts it — surface this to
  Mostafa/Pietro alongside the escalation, not as a separate ask.
- **Confidence in diagnosis: unchanged, 8/10** (no new technical information this pass — root cause was
  never in question).
- **Confidence in the escalation being the right next step: 8/10** (up from 7/10) — this is no longer a
  judgment call between plausible options; the 07-22 note's own stated trigger condition ("no answer within
  a few days") has been met and then some (12 days), so directly looping the second named owner is the
  mechanical next step, not a debatable one.
