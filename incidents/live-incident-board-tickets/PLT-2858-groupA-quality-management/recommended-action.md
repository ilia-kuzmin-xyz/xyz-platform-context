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

## ⚠️ 2026-08-03 re-check — ESCALATION STILL NOT EXECUTED; this is now the top-priority action on the board

Nothing has changed operationally since 07-30 except a fourth unanswered nudge (108643, 07-31).
**The escalation this file has now recommended twice (07-24, 07-30) has not been posted.** That is
the actual finding this run: the analysis is not the blocker, the *posting* is. See
`context.md` §7b for updated stall durations (18-21 days across the different threads) and a
correction to the FE effort estimate below (the dropdown option is smaller than previously scoped
— ~10-15 lines, not "real FE+BE work").

**Nothing in the draft message below needs to change in substance.** What changes is urgency: post
it now, to Pietro directly, cc Mostafa and Darminder — not as a fifth nudge to Mostafa alone.

---

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

---

## 2026-08-14 — supersedes the draft above for *what to post*; the diagnosis and routing are unchanged

**Why a new draft.** The message drafted on 07-24/07-30 above opens with "Zone setup ownership +
how-to", a question the customer already answered on 07-14 (they can't and won't configure zones).
It has now stood unposted across **ten consecutive runs**, and posting it as written would read as
not having read their reply, a month late. **Do not post the 07-24 draft.** Everything else in this
file stands: same diagnosis, same owners (Pietro primary, Mostafa and Darminder on it), same
"posting is the bottleneck, not the analysis" finding.

**What changed this run.** Mostafa's 07-14 question ("what is the difference between location and
location details") is the stated blocker on his side, and it is **fully answerable from the frontend
code without waiting for Darminder** (re-verified this run, `context.md` 2026-08-14 section). So the
recommendation is no longer "nudge someone to answer it" but "answer it, then ask the real decision
in the same breath". Two separate messages, one owner each, plus one line to the BE and one to the
customer.

**Action:** still **(a) resolved through communication** in progress, not Ready for Dev, not Blocked.
Post drafts 1 and 2 below now; 3 and 4 are parallel and do not gate them.

### Draft 1 — answer Mostafa's 107320 (anyone can post this; the code says it, not Darminder's memory)

> @Mostafa, coming back on your question from 14 July. They are two different fields.
>
> Location is the zone the issue sits in, meaning the floor, area or room from the named zones set
> up on the model. Nobody types it, the platform fills it in, and there is no control for it in the
> issue form at all. On ML9 it is blank on every issue because that model has no rooms configured.
>
> Location Detail is a plain free text box on the issue form, up to 100 characters, that anyone can
> type into. It saves and displays fine on ML9 today, regardless of zones. On the issue panel the
> two sit next to each other as "Location" and "Location Details", which is most of why they get
> confused.
>
> One thing worth knowing before we decide anything: even once a project does have zones set up, the
> panel currently prints the internal location id rather than the room name, so it would read as a
> code rather than "Level 2 Plant Room". Small fix, but it has to happen before anyone sees a
> populated Location.

*(FE evidence, not for the comment: `issue-details.tsx:139-140` and `:43-48`, `issue-form.tsx:526-537`,
no `locationId` control anywhere in the form, `format-issues.ts:87-88`.)*

### Draft 2 — the decision request to Pietro and Mostafa (playbook "Decision requests to product")

> @Pietro @Mostafa, this is PLT-2858, the QA Location field on ML9, and it needs a product call.
>
> Recap, since it has been a few weeks. The Location on a QA issue is not typed by anyone, it is
> filled in automatically from the rooms and zones configured on the model. ML9's model has none
> configured, so the field is empty on every issue there. That is not a bug, it is a model setup the
> client would have to do, and they have told us twice they have never done it and do not know how.
>
> On 14 July they told us what they would actually like. Either a drop down of Locations they can
> pick from when raising an issue, or take Location off the QA altogether so it stops looking like
> data is missing on the dashboard.
>
> Both are cheap for us. The drop down is roughly ten to fifteen lines of frontend work, because the
> list of locations is already fetched and there is an identical control sitting next to it for
> Stage. Removing the field is a one line change. So this is a product decision, not a cost one.
>
> One caveat before anyone picks the drop down. The list it would show comes from the backend issue
> parameters, and we do not yet know whether that list is populated for a project with no rooms
> configured. If it comes from the same model zones, the drop down would ship empty for this client
> and we would be back where we started. I have asked Sachin and Ali for a one line answer.
>
> My take is to hide the Location row when there is nothing in it, rather than delete it. That gives
> this client exactly what they asked for, no missing data look on the dashboard, and it keeps the
> field for the projects that do have zones configured. Then treat the drop down as its own piece of
> work once we know where that list comes from. Shout if you would rather we remove it outright, or
> if the drop down is the priority and you want it costed properly.

### Draft 3 — the one open engineering question, to BE (Sachin or Ali)

> @Sachin @Ali, one line if you can. Does `GET /api/v2/projects/{projectId}/issues/parameters` return
> `ISSUE_LOCATION` entries for a project whose model has no named zones configured, or is that list
> derived from the same zone hierarchy? Asking on PLT-2858: the client wants a Location drop down and
> I need to know whether it would ship empty for them.

### Draft 4 — acknowledgement to the customer, via Yash (do not wait for the decision)

> Apologies for the delay coming back to you on the Location field. Your suggestion is with our
> product team now and we will confirm which way we are going shortly. In the meantime the "Location
> Detail" box on the issue form is free text and works today, so it can be used to record a location
> manually if that helps.

**Do not** post drafts 1 and 2 as one message; they have different owners and different answers.
**Do not** re-send the 07-24 draft. **No Jira action was taken by this run.**

**Confidence:** diagnosis 8/10 unchanged; the FE half of Mostafa's answer is now 9/10 (read on
current code this run); the recommendation to hide-when-empty is a product steer, offered as one,
not a finding.

## 2026-08-20 — drafts unchanged and still correct; 15th run unposted. Escalate to Ilia.

Zero movement on the ticket (20 days silent, 37 days on Mostafa's unanswered question — see `context.md`
2026-08-20). **Drafts 1 to 4 in the 2026-08-14 section above are unchanged, still accurate against the
current code, and still the right thing to post.** Nothing in them needs rewording. Do not post the 07-24
draft, which remains superseded for the reason given in the 08-14 section.

The only change this run is to the framing of who this is waiting on. It is no longer waiting on analysis,
on Darminder, on Mostafa or on Pietro. **It is waiting on a human in this routine to paste four short
messages that have been ready since 08-14.** Fifteen consecutive runs have each produced a correct
recommendation and no posted comment, which is precisely the failure mode this routine exists to catch.

**Recommended handling for Ilia, in priority order when he next picks these up:**
1. Post Draft 1 (answers Mostafa's 107320 from code — unblocks the person who says he is blocked).
2. Post Draft 2 (the product decision to Pietro and Mostafa).
3. Post Draft 4 (acknowledgement to the customer via Yash — they have been waiting 37 days on a written
   request and this does not depend on the decision).
4. Draft 3 to Sachin or Ali is parallel and gates nothing.

Also still worth raising when it is posted: the **priority mismatch** noted in the coordinator section
above. Critical does not fit a config gap with a working manual workaround, and while it stays Critical it
distorts the board.

**No Jira action was taken by this run.**

## 2026-08-21 — 17th consecutive run, unchanged

No new information to add and nothing in Drafts 1-4 needs rewording. Restating the priority-ordered
handling list from 08-20 verbatim since it is still the recommendation: post Draft 1 (unblocks Mostafa),
then Draft 2 (the product decision), then Draft 4 (customer acknowledgement via Yash —45 days waiting on a
written request), with Draft 3 to Sachin/Ali parallel and non-gating. **No Jira action was taken by this
run.**

## 2026-08-24 — drafts unchanged; one addition, and a note on sequencing

The 08-14 drafts stand exactly as written and are still the right messages. Nothing about them has
been wrong for ten days; only unposted. Post them in this order — the first unblocks the second.

1. **Answer Mostafa's 107320 (41 days).** It is three sentences and does not need Darminder. This
   is the single highest-value thing on the whole board because it is the stated blocker on a
   Critical customer-facing ticket, and it costs one comment.
2. **Put the customer's two options to Mostafa and Pietro as a decision with costs attached** —
   both are cheap on the frontend now (dropdown ~10-15 lines, removal one line), so it is a
   straight product call, not an affordability question.
3. **Ask Sachin or Ali the one backend question**: is `ISSUE_LOCATION` populated independently of
   the 3D zone hierarchy, or from the same source? Only the dropdown branch depends on it, and it
   decides whether that branch ships this customer an empty list.

### New this run — mention the GUID fix when the decision lands, not before

Branch `PLT-2858-qa-issue-location-label` fixes the Location row rendering a raw GUID instead of
the zone name. Worth raising **with** the product decision rather than as its own thread, because:

- if product picks the dropdown, it has to go in anyway and the branch is already written;
- if product picks removal, the branch is deleted and nothing is lost;
- raising it separately risks reading as "here is a fix for PLT-2858", which it is not, and giving
  the impression the ticket has moved when the 41-day question is still open.

### Escalation, restated once and not re-argued

If the answer to Mostafa's question plus the decision request do not land within a couple of days
of being posted, this needs Pietro directly, in whatever channel he reads. That has been the
recommendation since 07-24 and the bottleneck has never been the recommendation.

## 2026-08-26 — restated, not re-argued

Post Draft 1 (answers Mostafa in 3 sentences, unblocks him), then Draft 2 (the decision request to
Pietro/Mostafa), then Draft 4 (customer acknowledgement via Yash). Draft 3 to Sachin/Ali is parallel
and non-gating. Board's only Critical-priority open item, now **24 runs / 43 days** on a one-line
question answerable from code since 08-14. No Jira action was taken by this run.

## 2026-08-31 — 27th consecutive run unposted. Drafts 1 and 2 rewritten to the SHORT rule; everything else unchanged.

**Do not read this as new analysis.** The diagnosis, the owners and the recommended action are
identical to 08-14. Zero Jira movement (`context.md` 2026-08-31: 27 comments, byte-identical since
08-25; Mostafa's own question now **48 days** unanswered; **31 days** total silence).

**Why the drafts changed at all.** The SHORT rule (`live-incident-run-instructions.md` § "Drafted
replies must be SHORT") was added **2026-08-27**, after the 08-14 drafts were written, and Drafts 1
and 2 breach it — Draft 2 is six paragraphs with no bolded closed question. The 08-14 text is
**preserved above and is not wrong**; it is superseded for *posting form only*. Post the versions
below instead. Drafts 3 and 4 above are already short and stand exactly as written.

**Order matters: post Draft 1 first — it unblocks the person who says he is blocked, and it costs
one comment.**

### Draft 1 (SHORT) — answers Mostafa's 107320, on PLT-2858. Anyone can post this; it comes from the code, not from Darminder's memory.

> @Mostafa, coming back on your question from 14 July. They are two different fields.
>
> Location is the floor, area or room the issue sits in. Nobody types it, the platform fills it in
> from the zones set up on the model, and there is no control for it on the issue form at all. On ML9
> it is blank on every issue because that model has no rooms set up.
>
> Location Detail is a plain free text box on the same form that anyone can type into. It saves and
> displays fine on ML9 today, zones or no zones. They sit next to each other on the panel, which is
> most of why they get confused.
>
> **Does that unblock you, or do you need anything else from us before the product call?**

### Draft 2 (SHORT) — the decision request, to Pietro with Mostafa copied. Post after Draft 1.

> @Pietro @Mostafa, PLT-2858 needs a product call and has been waiting 48 days.
>
> The Location on a QA issue fills itself in from the rooms and zones set up on the model. ML9 has
> none, so it is empty on every issue there and the dashboard reads as missing data. The client has
> told us twice they have never set rooms up and do not know how to.
>
> On 14 July they asked for one of two things. Either a drop down of locations they can pick from
> when raising an issue, or take Location off the QA altogether. Both are cheap for us, so this is a
> product call rather than a cost one. My suggestion is to hide the Location row when it is empty:
> the client gets what they asked for, and projects that do have zones keep the field.
>
> **Can you confirm hide-when-empty, or would you rather we remove it outright?**

*Assumption behind Draft 2, for the poster and not for the message: the drop-down branch depends on
whether the backend location list is populated for a project with no zones. That is Draft 3's
question and it is still unanswered, which is exactly why the recommendation steers to
hide-when-empty rather than the drop down.*

### Unchanged from 08-24, restated once

- Draft 4 (customer acknowledgement via Yash) does not depend on the decision. Send it.
- Draft 3 (to Sachin or Ali) is parallel and gates nothing.
- Mention the `PLT-2858-qa-issue-location-label` GUID fix **with** the decision when it lands, not
  before, for the reasons in the 08-24 section.
- The **priority mismatch** still stands: Critical does not fit a config gap with a working manual
  workaround, and while it stays Critical it distorts the board. Raise it when the ticket is touched.
- If Draft 1 and Draft 2 get no answer within a couple of days of being posted, take it to Pietro
  directly in whatever channel he reads. That has been the recommendation since 07-24.

**No Jira action was taken by this run.**

## 2026-09-01 — 28th consecutive run unposted. Flagged for human attention this run.

No change to diagnosis, owners, or the drafts. Drafts 1-4 (SHORT versions, 2026-08-31 section
above) are still exactly right and still unposted. **49 days on Mostafa's 107320 question, 28 runs
recommending the same four messages.** Still the board's only Critical-priority ticket. Surfaced
explicitly in this run's notification, same reasoning as PLT-2815: repeating a correct, ready
recommendation in a file nobody re-reads is not moving it, and a human decision is needed on
whether to post these or say why not. No Jira action was taken by this run.

---

# 2026-09-02 — RESOLVED by a product decision. All earlier drafts in this file are SPENT.

**Ilia asked Mostafa directly and got the decision the ticket had waited 50+ days for:**

> "I think we need to close it and just say that this is auto-populated based on the BIM room location"

So: **no dropdown, no removal of the field, close the ticket.** Every draft above was written to
*extract* this decision — chasing Mostafa's 107320, escalating to Pietro, laying out dropdown vs
remove. None of them are needed now. Kept above as the record of how it was chased, not to post.

### Draft (36 words, unposted — a human pastes it; the hard no-Jira-action rule stands)

> Hi Yash — checked with Mostafa. His words: *"I think we need to close it and just say that this is
> auto-populated based on the BIM room location."*
>
> Closing it on that. **Anything outstanding on 7286 first?**

**Deliberately short and mostly a quote, on Ilia's instruction:** *"let's avoid adding much context,
it's better mostly to quote mostafa"*. An earlier 90-word version of this draft explained the zone
mechanism, why ML9 is blank, and that Location Detail is the free-text field — all accurate, all in
`context.md` § 2a, and all cut. **If a longer explanation is ever wanted, take it from § 2a rather
than rewriting it.** The reason to keep it short: this is a product decision being relayed, and
Mostafa's own sentence is the authority; our paraphrase around it only invites re-litigation.

### ⚠️ Two things this close does NOT settle — do not let them die with the ticket

**1. The GUID defect becomes live the moment anyone acts on this answer.** Telling the customer it
auto-populates from BIM rooms points them at configuring rooms — and `issue-details.tsx:139` binds
the Location row to the raw `locationId` with no processor, so a configured project renders a **GUID,
not a room name** (§ 2c, re-verified on `origin/master` 08-24). ML9 only ever showed *blank* because
it has no zones at all. **The fix is already written on branch `PLT-2858-qa-issue-location-label`
(hc-frontend, 5 tests, `issue-location-name.ts`) and has never been raised as a PR.** It should be
raised and landed, and it does not depend on 2858 staying open — it is a defect in its own right.

**2. The customer's "it looks like missing data" complaint is declined, silently.** On 07-14 (107317)
they asked for either a dropdown *or* removal of the Location field, because an empty Location reads
as missing data on the dashboard. Mostafa's decision grants neither: the field stays, read-only, and
blank until rooms are configured. That is a legitimate call, but if the customer pushes back, the
pushback is about the *dashboard reading blank as missing*, not about the mechanism — and no one has
answered it.

**3. Cohort, still never swept.** Every project without named zones configured shows empty Location on
all its issues (§ 3 q6). ML9 is a sample, not the population. Closing 2858 does not change that.
