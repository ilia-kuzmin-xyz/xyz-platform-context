# PLT-2858 — Recommended action

> **DRAFT ONLY — execute nothing.** No Jira comments, transitions, or edits. Drafts for a human to send.

---

## ⟢ UPDATED 2026-07-16 (supersedes the 07-13 draft below)

The situation moved on 07-14–07-16 (see `context.md` § UPDATE 2026-07-16). The blocking step is no longer
"ask Mostafa an open question" — it is now **Darminder answering the specific clarification Mostafa asked**
(*"what is the difference between location and location details?"*, comment 107320, 07-14), which Mostafa is
explicitly waiting on (107533, 07-16: *"waiting on this since it was asked of me"*). That answer already
exists and was re-verified in code this pass. In parallel, the customer has **narrowed the product decision
to two concrete options** (dropdown-to-select, or remove the field).

**Recommended next step (still option (a): a routed reply — but now an ANSWER + a two-option decision, not an open question).**
Route: **Darminder** answers Mostafa's question and states the two customer options; **Mostafa** (with
Pietro) picks A vs B. Then back to the customer via **Yash**.

### Draft reply for the thread (Darminder → @Mostafa, @Pietro)

> @Mostafa — re your question, they're **two different fields**:
> - **Location** (`issueLocationId`) — the **auto-derived zone** (floor/area/room). Read-only; the user
>   can't set it. It's empty on ML9 because the model has no named zones configured. (`format-issues.ts:87`)
> - **Location Detail** (`locationDetails`) — a **free-text box the user types** (max 100 chars). This one
>   works today and shows in the panel as "Location Details". (`format-issues.ts:88`, `issue-form.tsx:526-537`)
>
> On the customer's request (comment 107317) they've given us two options, since they believe zone→model
> config isn't possible for them:
> 1. **Dropdown to select Location on the QA** — this is a real product change: it turns the auto/read-only
>    zone Location into a user-editable field. Bigger scope, and it runs into a known display gap (the panel
>    currently shows the raw location **ID**, not the zone name — `issue-details.tsx:139`).
> 2. **Remove the Location field from the QA** — small FE change; avoids the "missing details" look on the
>    dashboard they screenshotted.
>
> **Before we pick:** can we confirm whether named-zone configuration is actually available for this
> project/model? The customer says it's "not possible", which contradicts our earlier "get your BIM team to
> configure zones" advice. If it IS possible we should hand them a how-to instead of removing the field; if
> it genuinely isn't, option 2 is the honest fix. @Pietro — do you know which is true for ML9's project type?

*(One answer, one factual disconnect to close, one A/B decision with owners — so the thread resolves rather
than loops.)*

### Why this and not the alternatives
- **Not Ready-For-Dev yet.** Both customer options are real work but neither should be built until Mostafa/
  Pietro pick A vs B *and* the "is zone config possible?" question is settled — building the wrong one (or
  removing a configurable capability) is worse than waiting one reply.
- **Not With-Customer.** We owe the customer an answer, but it depends on the internal A/B + feasibility
  decision first; relay via Yash *after*.
- **Not Blocked.** Owner is engaged (Mostafa is actively waiting); the blocker is a one-line answer we can now supply.

**Confidence: diagnosis 8/10 (unchanged, §2a re-verified). Next-step ~8/10** (up from 7 — the blocker now
has a concrete, in-repo answer and the decision is narrowed to two options).

---

## Original 07-13 draft (retained for history)

## Chosen: (a) Draft the next routed question to move analysis forward — addressed to **Mostafa Kamel Hussien** (PO), Pietro looped

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

---

## Draft message for the thread (Darminder or Yash to post; @Mostafa, @Pietro)

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
