# PLT-2858 — Recommended action

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

**2026-07-22 re-check:** unchanged since 07-16 — Ilia nudged ("any updates?"), Mostafa replied "waiting on
this since it was asked of me" (still unresolved, 6 days after his own "leave it with me"). The three
closed questions below are now overdue; this has stalled on the SAME owner for 9 days since the customer's
"we don't know how" (106728). Escalation candidate: if no answer within another few days, consider looping
Pietro directly (he was independently named as workflow authority by both Darminder and the customer) rather
than re-nudging Mostafa a second time.

**2026-07-24 re-check: still no new comments — the escalation trigger above has now fired.** It has been
8 days since Mostafa's "waiting on this since it was asked of me" (07-16), 11 days since his own "leave it
with me" (07-13) never converted into an answer, and **17 days** since the customer said "we don't know how"
(106728, 07-07). This is now the stalest open loop across this run's Group A tickets (worse than PLT-2649's
7 days and PLT-2906's 4 days). **Recommended change of approach: stop re-nudging Mostafa a third time and
loop Pietro directly**, per the escalation candidate flagged two runs ago — Pietro was independently named
as the workflow authority by both Darminder (107109) and the customer themselves (106728: *"Who should be
able to clarify this? Pietro? Ali?"*), so going to him directly is not a new escalation path, it's the one
the thread itself already pointed at. Draft below updated accordingly — @Pietro moved to primary, Mostafa cc'd.

---

<<<<<<< HEAD
## Draft message for the thread (Darminder or Yash to post; **@Pietro primary as of 07-24**, cc @Mostafa)
=======
## ⚠️ 2026-07-30 re-verify — ESCALATE, and the draft below is now PARTLY SUPERSEDED

**Two changes to the posture. Read both before posting anything.**

### 1. Escalation: "consider looping Pietro" → **do it now**
No comment on the ticket for **14 days** (last: 107533, 07-16). On a **Critical** live incident with
Freshdesk #7286 still Open, against a customer who has been waiting since 07-07. The 07-22 threshold is
crossed and re-nudging Mostafa a third time is not a plan. **Address the next message to Pietro directly**
(named as the workflow/product authority by Darminder in 107109 *and* by the customer in 106728), with
Mostafa and Darminder kept on it — not as a bypass, but because two prior nudges to Mostafa alone produced
one non-answer.

### 2. The stall is probably NOT where we said it was — and the customer's ask has changed
The 07-30 fetch surfaced **two 07-14 comments both earlier runs missed** (now in `context.md §1`):
- **107320 — Mostafa asked Darminder: *"what is the difference between location and location details"*.
  Never answered. 16 days.** This likely *is* what "waiting on this since it was asked of me" refers to.
  So this is plausibly a **two-way deadlock**, not Mostafa sitting on a decision — and the single
  cheapest unblocking move on the whole ticket is Darminder answering it, which `context.md §2a` does in
  two lines. **Do this first; it may unstick the thread without any escalation at all.**
- **107317 — the customer (Mikel) already moved past "teach us how".** They said connecting rooms to the
  models isn't possible for them and asked for either **(i) a drop-down of Locations to select on the QA**,
  or **(ii) removing the Location field** so it stops reading as missing data on the dashboard.
  → **Q1 of the draft below ("who owns zone setup + is there a how-to") is largely moot.** Asking it now
  would read as not having read their 07-14 reply — 16 days late. Replace it with the real decision.

### Revised next step (supersedes the draft's Q1; Q2/Q3 and the side-finding still stand)
1. **Darminder** — answer 107320 in one line (Location = auto-derived zone, read-only; Location Detail =
   free-text, user-entered, `context.md §2a`). Unblocks Mostafa.
2. **Pietro + Mostafa** — decide between the customer's own two options: **drop-down** (new FE selector +
   a writable `issueLocationId` path — the field is read-only *by design* today, so this is real FE+BE
   work, and `§2c`'s GUID-not-label fix becomes mandatory in the same change) vs **remove/hide Location**
   (cheap, kills the dashboard "missing details" complaint, loses the feature). A third option worth
   naming: keep it, but hide the row when no zones are configured.
3. **Yash** — the customer has had no reply for 16 days on a request they put in writing. They need an
   acknowledgement now, independent of the decision.

**Do NOT re-send the draft below verbatim** — it asks the customer-side question they already answered.

**Revised confidence: 8/10 diagnosis (unchanged); ~7/10 that this is the right next step** — the routing
and escalation are well-evidenced; which of the two product options is correct is Pietro's call, not ours.

---

## Draft message for the thread (Darminder or Yash to post; @Mostafa, @Pietro)
>>>>>>> origin/main

> @Pietro — looping you directly since Mikel asked for you by name (106728) and Darminder named you as the
> workflow authority (107109). Mostafa's had this since 07-13 ("leave it with me") without a resolution, so
> rather than a third nudge on the same person, three closed questions to whoever can actually decide:
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
