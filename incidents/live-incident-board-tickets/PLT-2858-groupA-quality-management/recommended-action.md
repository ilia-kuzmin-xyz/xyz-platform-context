# PLT-2858 — Recommended action

> **All messages below are DRAFTS for a human to review and post. Nothing here is or should be
> auto-posted to Jira. Do not change ticket status or priority.**

## Chosen: (a) A two-part action — (1) answer Mostafa's live question NOW, then (2) surface the customer's two proposals as one product decision

Two new comments (2026-07-15 context) reshape the next step:
- **107320 (Mostafa → Darminder):** *"what is the difference between location and location details?"* — a
  live, blocking question we **already have the exact answer to** (`context.md §2a`). Answering it is the
  single highest-leverage, lowest-risk move on this ticket: zero new investigation, unblocks the owner,
  and it is a prerequisite for him to make the decision below sensibly.
- **107317 (customer via Yash):** the customer proposed **two alternatives of their own** — a **manual
  Location dropdown** on the QA, or, failing that, **remove the Location section** entirely so it stops
  looking like missing data. That converts the old "who configures zones" question into a genuine
  **product decision** (`context.md` Net thread state, option B).

So the recommended action is **part 1: post the direct answer** (below), and **part 2: put the customer's
two proposals to Mostafa as closed questions** once he has the field distinction. Part 1 needs no decision
and should go first.

### Part 1 — Direct answer to Mostafa (DRAFT; Darminder or Ilia to post; @Mostafa)

Verbatim-artifact style — state the two fields, their code paths, done. No hedging.

> @Mostafa — the two are separate fields on a QA issue:
>
> - **"Location"** = the zone. FE `locationId` / v2 API `issueLocationId`. **Auto-derived** from the
>   project's configured named zones (floors/areas/rooms) and **read-only** — there is no control in the
>   issue form that sets it (`issue-form.tsx` has no zone selector). Shown in the detail panel's
>   **"Location"** row (`issue-details.tsx:139`). This is the one that's empty on ML9, because ML9 has no
>   named zones configured.
> - **"Location Detail"** = free text. FE `locationDescription` / v2 API `locationDetails`.
>   **User-editable**, max 100 chars, entered in the form's **"Location Detail"** box
>   (`issue-form.tsx:526-537`). Shown in the detail panel as **"Location Details"**.
>
> In short: "Location" is the auto zone (needs zones set up), "Location Detail" is the manual note the user
> can type today.

*(This is a direct answer, not a question — it needs no decision from anyone and can be posted immediately
after a human confirms the field/line references still match the current code.)*

---

### Part 2 — Put the customer's two proposals to Mostafa as one decision (DRAFT)

Only after Part 1. See the "Draft message for the thread" section below.

### Why (a) — answer-then-decide — not the others
- **Not (b) Ready For Development — yet.** There is still no dev fix for the *reported* symptom — it is
  data/config (configure named zones) + customer education. The customer's two new proposals (107317) *could*
  become dev work, but only **after** Mostafa picks one: a **manual Location dropdown** would be a genuine
  **new feature** (Location is currently read-only, `context.md §2a–§2b`) needing its own scoping/estimate;
  **removing/hiding the Location section** is a small FE change. Neither is actionable until product decides
  which (Part 2). The other *code* candidates remain secondary and product-gated: the GUID-not-label display
  gap (`context.md §2c`) and the "surface Phase" idea (`§2d`, which may already be done). Sending the ticket
  to a dev today would be a no-op on the actual complaint.
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

## Draft message for the thread — Part 2 (DRAFT; post only after Part 1; Darminder or Yash to post; @Mostafa, @Pietro)

> @Mostafa @Pietro — following the customer's message (107317), the "Location" question is now a product
> decision. Three closed questions:
>
> 1. **Which direction for "Location" on the QA?** The customer offered two options themselves: (i) a
>    **manual dropdown to pick Location on the QA**, or (ii) **remove the Location section** so it stops
>    looking like missing data. For the record: (i) is a **new feature** — Location is currently auto-derived
>    from named zones and read-only (`context.md §2a–§2b`), so it needs scoping/estimate; (ii) is a small FE
>    change; and a third option (iii) is to **keep auto-derivation and get named zones configured** (the
>    original plan — but the customer says they've *never done this and don't know how*, 106728). Which of
>    (i)/(ii)/(iii) do we go with?
> 2. **If (iii): zone-setup ownership + how-to.** Who owns configuring named zones — the customer's BIM
>    team, or us — and **is there a step-by-step we can hand them** (or a self-serve UI)? Without a how-to,
>    (iii) can't move.
> 3. **Cohort.** Whatever we pick, empty "Location" affects **every project without named zones configured**,
>    not just ML9. Do we identify and proactively flag/remediate those, or handle per-ticket?
>
> Two side-findings to log (neither is the customer's symptom):
> - **"Surface Phase" idea (106714):** the detail panel **already renders every project category type except
>   Discipline/Package** (`issue-details.tsx:151-158`), and Phase is a category type — so Phase may already
>   be shown. Worth confirming against ML9's config before spinning a separate ticket.
> - **GUID-not-label:** even once zones are configured, the detail panel shows the raw location **ID**, not
>   the zone **name** — it binds to `issueLocationId` and never resolves it to the `IIssueLocation.location`
>   label (`issue-details.tsx:139`, `format-issues.ts:87`). Small follow-up so "fixing" the data gap doesn't
>   just surface a GUID.

*(Three closed questions, one owner (Mostafa), plus two explicitly-scoped side-findings — so the thread gets
a decision, not another round of open-ended discussion.)*

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
- Freshdesk #7286 is Open / "Waiting on 3rd line" — the client is waiting for us, and has now proposed their
  own two options (dropdown vs remove the Location section, 107317). The honest client-facing update is:
  *"root cause identified (location needs named zones set up in the model); thanks for the two suggestions —
  we're deciding internally between adding a manual Location picker, removing the section, or helping you get
  zones configured, and will come back with a direction."* Do **not** promise a specific outcome or a code
  fix before Mostafa decides (Part 2) — a manual dropdown in particular would be a new feature, not a quick
  fix.
- **Priority mismatch to flag:** the ticket is **Critical**, but the diagnosis is a config/education gap
  with a manual workaround (free-text Location Detail) available. Worth confirming with Mostafa/Yash whether
  Critical still fits, so it isn't distorting the incident board.

**Confidence in diagnosis: 8/10.**
**Confidence in Part 1 (answering Mostafa) being the right next step: 9/10** — it directly answers a live,
explicit question using analysis we already did (`context.md §2a`), needs no decision from anyone, and
carries essentially no downside beyond a human confirming the code line references still hold.
**Confidence in Part 2 (the routed product decision): ~7/10** — comms/process judgment; depends on how
Mostafa wants to weigh the customer's dropdown-vs-remove proposals against driving zone configuration.
