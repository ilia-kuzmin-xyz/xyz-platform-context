# PLT-2619 — "Demo dashboard update" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2619
- **Issue type:** Live Incident ("To track live incidents on site.") — **still**, 97 days on
- **Status:** **With Customer** (category: In Progress / yellow) — unchanged since 2026-04-29
- **Priority:** Medium
- **Project:** PLT (XYZ SW Platform : Platform)
- **Reporter & Assignee:** Masum Ahmed (support/Freshdesk agent, off-roster) — unchanged
- **Created:** 2026-04-23 · **Last updated:** 2026-07-27 · **Status last changed:** 2026-04-29
- **Components / Labels / Attachments:** none (`attachment: []` confirmed — no Jira media)
- **Jira "Software Area" field:** `Other` — Jira's own classification corroborates the `other` slug
- **External link:** Freshdesk ticket #6492 (client-facing origin — not accessible from here)
- **Domain slug:** `other` (unchanged — product/config request; touches the Dashboard domain but is not a dashboard code task)
- **Watchers:** 3

---

## RE-CHECK 2026-07-29 — CHANGED (one new comment), but the handoff did NOT happen

The 07-22 run recorded PLT-2619 as unchanged. That is **no longer true** — there is
**one new comment**, and it is worth reading carefully because it changes the *ownership*
picture without changing the *classification*.

| Date | Author | Content |
|------|--------|---------|
| **2026-07-27 11:04** | **Yash Patel** (coordinator) | *"@Ilia Kuzmin can we update this to new dashboard if not done already? thanks"* |

**What did NOT change:** issue type is still **Live Incident**; status is still **With Customer**
(unmoved since 29 Apr); assignee is still **Masum Ahmed** (support, off-roster); the ticket is
still on the live-incident board. **None of the four drafted follow-through items from 07-13 were
executed** — no reclassification, no reassignment to product, no status correction, no release
confirmation posted on-ticket.

**What the new comment actually does — three observations:**

1. **It routes the opposite way to the drafted action.** The 07-13 draft said: hand off to
   **product (Pietro/Mostafa)**, because the open question is *which* dashboard to relink.
   Yash instead routed it to **Ilia (FE)** and asked him to do the relink. That is a delivery
   ask sent to an engineer while the prerequisite product decision is still open.
2. **"if not done already" is the tell.** The coordinator does not know whether the work happened.
   After 3 months there is **no owner and no record of state** — which is precisely the failure
   mode a mis-filed, support-assigned ticket produces.
3. **It is not actionable as phrased.** You cannot "update this to the new dashboard" without
   knowing *which* dashboard/target project — and that is exactly the question Ilia asked
   **Pietro Desiato on 2026-04-27 that has now been unanswered for 93 days**. Yash's nudge routes
   *around* the blocker rather than resolving it. Answering Yash requires answering Pietro first.

Playbook parallel: this is the **PLT-2906 shape** flagged in the 07-22 cross-ticket notes — the
board reads "With Customer" while the open action is entirely **on us**. Here it is worse, because
the internal action has been unowned for three months rather than two days.

---

## Staleness — name it starkly

Four figures, all as of 2026-07-29. The 07-13 run cited "~75 days"; every figure has grown.

| Measure | From | Days |
|---|---|---|
| Age of ticket | created 2026-04-23 | **97** |
| **Consecutive days of complete silence** (broken only by Yash's nudge) | 2026-04-29 → 2026-07-27 | **89** |
| In the same (wrong) status `With Customer` | 2026-04-29 | **91** |
| **Pietro's pivotal question unanswered** | 2026-04-27 | **93** |
| Yash's nudge unanswered | 2026-07-27 | **2** |

The blunt version for the drafted action: **a Medium-priority sales-demo config request has sat on
the live-incident board for 97 days, 89 of them with literally zero activity, in a status that says
"With Customer" while nothing was ever waiting on the customer, assigned the whole time to a support
agent who is not on the delivery roster.** Two triage passes (07-13, 07-22) recommended taking it off
the board; neither was acted on. The 07-27 nudge is the first movement in three months and it does not
fix any of that.

---

## Classification: UNCHANGED — (ii) content/config request, MIS-FILED on the live-incident board

Still **not a bug**. No error, no reproduction, no broken user, no worked-before/broken-now.
It is a request to **relink / migrate a sales-demo dashboard ("Mission Critical Dashboard") off
PowerBI onto the native (non-PowerBI) dashboard**, so it renders faster for client demos.

Verbatim description (unchanged since 04-23):

> "Can we update 'Mission Critical Dashboard'. I think it's still running on the old system and would be great to have this running faster for client demos!"

"Old system" = PowerBI. The native Dashboard Page is explicitly the PowerBI replacement
(`xyz-platform-context/dashboard/README.md:5` — "replaces PowerBI reports with native data
visualization"). Not (i) bug, not (iii) feature, not (iv) unclear.

**New corroboration this run:** Jira's own **Software Area** field on this ticket is set to
**`Other`** — the platform's own metadata agrees this is not a dashboard-domain defect.

---

## NEW EVIDENCE this run — the demo asset's ticket history lives in **PBD**, not PLT

A cross-project search (`text ~ "Mission Critical"`) surfaces the asset's paper trail, and it is
entirely in the **PBD** project (XYZ SW Platform : Power BI Dashboard) — none of it in PLT:

| Ticket | Project | Type | Status | Relevance |
|---|---|---|---|---|
| **PBD-1298** | PBD | Service request | Closed | *"Update Sales Dashboard to 4.1 using BIM360 as data source"* — field **Project: "The Mission Critical Dashboard / Mission Critical Datacentre"**; asks the *"demo sales dashboards for the new project X dashboards"* be updated, benchmarked against *"the CWL12 dashboard"*. **The direct predecessor of PLT-2619.** |
| **PBD-1213** | PBD | **Live Incident** | ARCHIVED (NOT RELEASED) | *"Sales Demo Dashboard - Issue"*, field **Project: "Mission Critical Dashboard"**, assignee **Masum Ahmed**. Same asset, same reporter-agent, same request class — filed on the **PBD** board. |
| **PBD-1254** | PBD | Task | Closed | *"Fix Bug in Mission Critical Dashboard"* |
| **PBD-1890** | PBD | Live Incident | Done | *"Absence of categories for QAs in dashboard"*, field **Project: "MISSION CRITICAL (Smith Johns)"**, assignee Masum Ahmed — *"The dashboard used for demo…"* |

**Two things this buys us:**

1. **The mis-filing is now evidenced, not just argued.** Every prior ticket about this exact demo
   asset — including one of the same *Live Incident* type (PBD-1213) — was raised in **PBD**.
   PLT-2619 is the outlier. And the board already has a **precedent for the correction**: the 07-13
   run recorded **PLT-2891 → moved to PBD as PBD-2111** for the same reason (a PowerBI-dashboard
   concern mis-landed on the PLT board).
2. **A concrete lead on the 93-day-unanswered "which dashboard?" question.** PBD-1298 and PBD-1890
   name the asset with far more precision than PLT-2619 does — *"The Mission Critical Dashboard /
   Mission Critical Datacentre"*, *"MISSION CRITICAL (Smith Johns)"*, and a comparison target
   (*"functioning like the CWL12 dashboard"*). A human can very likely resolve the target from
   PBD-1298 without waiting on Pietro. **Caveat:** the PBD tickets above all carry `updated`
   timestamps clustered inside a few minutes on 2026-04-22 (22:27–22:32), i.e. a **bulk edit**, not
   real activity — do not read chronology into those dates.

**Scoping note (important):** PBD is where the *asset* and its history are owned, but the *requested
work* is to move **off** PowerBI onto the native platform — so PBD is the right place to answer
"which dashboard is this?", not necessarily the right place to do the work. Don't collapse the two.

---

## The "awaiting release" blocker is now demonstrably STALE — and was never the real blocker

The 07-13 context flagged this as needing confirmation. It can now be answered from the board itself:

- `dashboard/README.md` lists **PRG, QLT, CAP, SCH all ✅ Live** on the native Dashboard Page.
- More decisively, the **07-22 board run is full of live incidents raised by real customers against
  the native (non-BI) dashboard in production** — PLT-2890 (*"Contractor filter genuinely absent on
  new (non-BI) dashboard"*), PLT-2917 (Progress-Dashboard milestones), PLT-2909, PLT-2882. Customers
  are actively using it. The thing this ticket was parked "awaiting release" on shipped and has been
  in customer hands for months.

**So the shape of the stall is:** the ticket was parked in April on a blocker that has since expired,
while **the actual blocker — an unassigned product decision — was never owned by anyone.** Nobody
re-checked the parking condition for 89 days. That is the reusable lesson here, not the relink itself.

---

## Full chronology (5 comments)

| Date | Author | Content |
|------|--------|---------|
| 2026-04-23 14:45 | Masum Ahmed | Freshdesk #6492 mirror → status "Waiting on 3rd line" |
| 2026-04-27 10:10 | Ilia Kuzmin | "@Pietro Desiato, do you know which dashboard we should relink for them?" — **never answered (93d)** |
| 2026-04-27 10:19 | Ilia Kuzmin | "@Masum Ahmed, can we tell the client that we're waiting for a non-powerbi dashboard release to update this?" |
| 2026-04-29 13:17 | Masum Ahmed | Freshdesk #6492 mirror → status "Awaiting release" — **last status change** |
| — | — | *— 89 days of silence —* |
| **2026-07-27 11:04** | **Yash Patel** | **"@Ilia Kuzmin can we update this to new dashboard if not done already? thanks"** — **NEW** |

## What it is actually waiting on (unchanged conclusion, now sharper)

The "With Customer" label remains **wrong**. Nothing is or ever was blocked on the customer — they
were told "awaiting release" on 29 Apr and have not been asked for anything since. The blockers are
internal, and there are now clearly **two, in order**:

1. **Product decision (the real one, 93 days open):** which dashboard / target project should
   "Mission Critical Dashboard" be relinked to? Owner should be **Pietro** (or resolvable from
   PBD-1298, see above). **Nothing else can proceed before this.**
2. **Then the config/setup work itself** (does a native project exist for the demo; who provisions
   it) — this is what Yash asked Ilia for on 07-27, out of order.

The nominal third blocker ("awaiting release") is **cleared**.

## Code dive — still NOT warranted

Unchanged from 07-13, and re-confirmed: there is no defect to localize.
- No distinct "demo" project type exists — `dashboard/project-types.md` defines only full-progress
  vs quality-only (via the `progressProject` flag). A demo is a standard project used for sales.
- "Mission Critical Dashboard" appears nowhere in `xyz-platform-context` or the codebase context —
  its identity lives in **PBD-1298 / Freshdesk #6492 / Pietro's head**, not in code.

## NEEDS HUMAN

- ⚠️ **Freshdesk #6492** — the original client wording and any screenshots; not accessible from this
  environment. Do not guess contents. *(This is the only "attachment needing human" — the Jira issue
  itself has* **zero** *attachments, confirmed `attachment: []`. Flagging so the next run doesn't
  re-hunt for Jira media.)*
- ⚠️ **Product decision (the pivot):** which dashboard / target project for the relink. **Try
  PBD-1298 first** (*"The Mission Critical Dashboard / Mission Critical Datacentre"*, benchmark
  *"CWL12 dashboard"*) before waiting on Pietro again — 93 days of waiting suggests the ask needs a
  different route, not a louder repeat.
- ⚠️ **Does a native (non-PowerBI) project already exist for this demo**, and does anyone own
  provisioning it? Not determinable from Jira or the KB.
- ⚠️ **Confirm the PBD relocation route** with whoever owns the PBD board (precedent: PLT-2891 →
  PBD-2111) — or confirm that a native-platform demo-setup task belongs somewhere else entirely.

## Confidence

**9 / 10** (up from 8/10 on 07-13; per CLAUDE.md scale: high confidence, minor unknowns).

Raised because two of the previous run's unknowns are now closed with evidence: (1) the "awaiting
release" blocker is demonstrably stale — the native dashboard is live and in customer hands, proven
by other live incidents on this same board; (2) the mis-filing is now corroborated by the asset's
entire ticket history sitting in PBD (incl. a same-type Live Incident, PBD-1213) plus Jira's own
Software Area = `Other`. The classification, the "not customer-blocked" reading, and the diagnosis of
*why* it stalled are all directly supported by ticket text.

Remaining unknowns are external and do not affect the classification: the relink target
(≈4/10 confidence I could name it without a human) and Freshdesk #6492's contents.

## Roster / ownership flags

- **Masum Ahmed** (reporter + assignee) — **NOT on the team roster**; support/Freshdesk agent (posts
  the #6492 status mirrors). Has been the nominal owner for 97 days. Also the assignee on the PBD
  siblings (PBD-1213, PBD-1890) — consistent with an agent relaying, not owning.
- **Yash Patel** — coordinator; **new participant this run** (07-27 nudge). Correct instinct
  (unsticking a stale ticket), wrong routing (FE before the product decision).
- **Ilia Kuzmin** — the operator (ilia.kuzmin@xyzreality.com); **the ball is currently on him**,
  2 days. His own 04-27 question to Pietro is the thing still blocking.
- **Pietro Desiato** — on roster (product owner). Still the correct decision-maker; 93 days silent
  on this ticket. Consider **Mostafa** as the second product route.
- **Aliaksei Masanski** — off-roster; assignee on PBD-1298/PBD-1247, i.e. likely the PowerBI/PBD-side
  owner who knows which asset "Mission Critical Dashboard" is. **Possible shortcut to the answer.**

## Doc refs

- `xyz-platform-context/dashboard/README.md:5` — native Dashboard Page as the PowerBI replacement
- `xyz-platform-context/dashboard/README.md` § Sub-domains — PRG/QLT/CAP/SCH all ✅ Live (release-blocker evidence)
- `xyz-platform-context/dashboard/project-types.md` — no "demo" project type; only full-progress vs quality-only
- `xyz-platform-context/incidents/live-incident-board-tickets/README.md` — 07-13 run (PLT-2891 → PBD-2111 relocation precedent); 07-22 run (native-dashboard live incidents; PLT-2906 "the action is on us" pattern)
- `xyz-platform-context/incidents/live-incident-playbook.md` — tone/pattern for the draft; "state-now ≠ state-then", closed-answerable-questions-with-one-owner
