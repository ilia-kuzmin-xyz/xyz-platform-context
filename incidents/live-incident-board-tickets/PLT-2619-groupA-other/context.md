# PLT-2619 — "Demo dashboard update" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2619
- **Issue type:** Live Incident ("To track live incidents on site.")
- **Status:** With Customer (category: In Progress / yellow) — parked awaiting the client
- **Priority:** Medium
- **Project:** PLT (XYZ SW Platform : Platform)
- **Reporter & Assignee:** Masum Ahmed
- **Created:** 2026-04-23 · **Last updated:** 2026-04-29
- **Components / Labels / Attachments:** none
- **External link:** Freshdesk ticket #6492 (client-facing origin — not accessible from here)
- **Domain slug:** `other` (product/config request; touches the Dashboard domain but is not a dashboard code task)

> **Re-checked 2026-07-23 — no new comments since 04-29 (~85 days stale).** Status unchanged (With
> Customer), Freshdesk side already "Awaiting release" as of 04-29. Recommendation unchanged: this is
> mis-filed as a live incident (a demo-dashboard relink request, not a defect) — hand off to
> product/reclassify rather than continuing to carry it on the incident board.

---

## Classification: (ii) content/config request — MIS-FILED on the live-incident board

This is **not a bug**. There is no error, no reproduction, no broken user, no "worked-before/broken-now". It is a request to **relink / migrate a sales-demo dashboard ("Mission Critical Dashboard") off the old PowerBI system onto the new native (non-PowerBI) dashboard**, so it renders faster for client demos.

Verbatim description:

> "Can we update 'Mission Critical Dashboard'. I think it's still running on the old system and would be great to have this running faster for client demos!"

"Old system" = PowerBI. The native Dashboard Page is explicitly the PowerBI replacement (`xyz-platform-context/dashboard/README.md:4-5` — "replaces PowerBI reports with native data visualization"). So the ask is a **modernization/relink of a demo asset**, product-owned, low urgency — it does not belong on the live-incident board. Triage hygiene: recommend reclassifying it off the incident board (see recommended-action.md).

Not (i) bug (no defect/repro), not (iii) feature (nothing new is being built for this ticket — it depends on an already-planned native release), not (iv) unclear (description + comments are explicit).

---

## Chronology (all 4 comments)

| Date | Author | Content |
|------|--------|---------|
| 2026-04-23 14:45 | Masum Ahmed | Freshdesk #6492 mirror → status "Waiting on 3rd line" |
| 2026-04-27 10:10 | Ilia Kuzmin | "@Pietro Desiato, do you know which dashboard we should relink for them?" |
| 2026-04-27 10:19 | Ilia Kuzmin | "@Masum Ahmed, can we tell the client that we're waiting for a non-powerbi dashboard release to update this?" |
| 2026-04-29 13:17 | Masum Ahmed | Freshdesk #6492 mirror → status "Awaiting release" |

## What it is actually waiting on

The "With Customer" label is misleading — **the ticket is not blocked on the customer**. Evidence:
- The customer has already been told (per Ilia's 27 Apr note, reflected in the 29 Apr Freshdesk status "Awaiting release") that the team is waiting on a **non-PowerBI dashboard release**.
- The real blockers are **internal**: (1) an **outstanding product decision** — Ilia's question to Pietro Desiato "which dashboard should we relink?" was **never answered in-thread**; and (2) the **native dashboard release** the relink depends on.

Note for the human: the native Dashboard Page is now documented as ✅ Live (`dashboard/README.md:27-30`). If that release has shipped since Apr 2026, the release blocker may already be **cleared** and only the product decision (which dashboard, which target project) remains. This needs confirmation.

## Staleness

**Stale.** No movement since 2026-04-29; today is 2026-07-13 → **~75 days (≈10.5 weeks) untouched**, sitting on the live-incident board the whole time.

## Roster / ownership flags

- **Masum Ahmed** (reporter + assignee) — **NOT on the provided team roster**. Behaves as a support/Freshdesk agent (posts the #6492 Freshdesk-status mirror comments). Ownership should move to product, not stay with support.
- **Ilia Kuzmin** — commenter; this is the current user (ilia.kuzmin@xyzreality.com), FE / "mechanism interrogator" in the playbook. Not in the routing roster, but internal.
- **Pietro Desiato** ("Pietro") — on roster (product owner). Correct escalation target; his open question is the pivot.

## Code dive — NOT warranted

Per the task rule, a deep hc-frontend dive is not justified for a content/config relink request. There is no defect to localize. Supporting facts from the KB instead of code:
- No distinct "demo" project type exists — `dashboard/project-types.md` defines only full-progress vs quality-only (via the `progressProject` flag). A demo is just a standard project used for sales; there is no special demo handling to inspect.
- "Mission Critical Dashboard" appears nowhere in `xyz-platform-context` or the codebase context — its identity/target lives in Freshdesk #6492 and/or Pietro's knowledge.

## NEEDS HUMAN

- ⚠️ **Freshdesk #6492** — the original client wording and any screenshots are there; not accessible from this environment. Do not guess contents.
- ⚠️ **Release status** — confirm whether the non-PowerBI dashboard release that unblocks this has shipped (KB says the Dashboard Page is Live; needs a human to confirm it covers this demo).
- ⚠️ **Product decision** — which dashboard/target project to relink "Mission Critical Dashboard" to (Pietro).

## Confidence

**8 / 10** (per CLAUDE.md scale: high confidence, minor unknowns). The classification (content/config relink request, mis-filed as an incident, internally parked not customer-blocked) is directly supported by the description and comments. The only unknowns are external/environmental: the current release status and the Freshdesk #6492 detail — neither of which changes the classification.

## Doc refs

- `xyz-platform-context/dashboard/README.md:4-5, 27-32` — native Dashboard Page as PowerBI replacement; tab status
- `xyz-platform-context/dashboard/project-types.md` — no "demo" project type; only full-progress vs quality-only
- `xyz-platform-context/incidents/live-incident-playbook.md` — communication/tone patterns used for the draft
