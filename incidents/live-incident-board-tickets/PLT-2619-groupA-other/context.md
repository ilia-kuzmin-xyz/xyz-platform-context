# PLT-2619 — "Demo dashboard update" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2619
- **Issue type:** Live Incident ("To track live incidents on site.")
- **Status:** With Customer (category: In Progress / yellow) — parked awaiting the client
- **Priority:** Medium
- **Project:** PLT (XYZ SW Platform : Platform)
- **Reporter & Assignee:** Masum Ahmed
- **Created:** 2026-04-23 · **Last updated:** 2026-07-27 (new comment; see delta below — status/substance unchanged since 2026-04-29)
- **Components / Labels / Attachments:** none
- **External link:** Freshdesk ticket #6492 (client-facing origin — not accessible from here)
- **Domain slug:** `other` (product/config request; touches the Dashboard domain but is not a dashboard code task)

---

## RE-CHECK #3 (2026-07-28) — THIRD CONSECUTIVE CONFIRM. STOP RE-CONFIRMING.

**Prior checks:** 2026-07-13 (this file first written, confidence 8/10, action drafted: hand off to
product + reclassify) → 2026-07-22 (confirmed unchanged, no delta) → **2026-07-28 (this check)**.

**Delta since 2026-07-22:** exactly one new comment, no status change, no field change:

| Date | Author | Content |
|------|--------|---------|
| 2026-07-27 11:04 | Yash Patel | "@Ilia Kuzmin can we update this to new dashboard if not done already? thanks" |

That is the entire delta. Everything else — status (`With Customer`), assignee/reporter (Masum Ahmed),
priority (Medium), the two open questions to Pietro (which dashboard to relink to; whether the
non-PowerBI release is actually ready) — is **identical** to the 07-13 and 07-22 snapshots. Pietro
never answered either question, in-thread or otherwise.

**Why the new comment does not count as progress:** Yash's comment does not answer either open
question — it re-asks the ticket to be actioned ("if not done already") without knowing whether the
target dashboard has even been decided, and directs the ask at Ilia (an FE commenter, not the product
owner who holds the actual decision, and not the person carrying out relink work). It is a **nudge to
close the loop**, not new information. The ticket is functionally exactly where it was on 04-29: parked
on an unanswered product decision, mislabeled "With Customer" while the customer isn't actually the
blocker.

**Verdict: nothing has genuinely moved in ~90 days** (04-29 → 07-28), across three separate
recheck cycles (07-13, 07-22, 07-28), despite being flagged as mis-filed and internally-blocked
every time. Re-confirming this a fourth time next cycle would add no value — see
`recommended-action.md`, now updated to a decisive reclassify-or-close call instead of a repeated
"hand off" recommendation.

---

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
| 2026-07-27 11:04 | Yash Patel | "@Ilia Kuzmin can we update this to new dashboard if not done already? thanks" — NEW, re-check #3 delta, does not answer either open question (see Re-check #3 section above) |

## What it is actually waiting on

The "With Customer" label is misleading — **the ticket is not blocked on the customer**. Evidence:
- The customer has already been told (per Ilia's 27 Apr note, reflected in the 29 Apr Freshdesk status "Awaiting release") that the team is waiting on a **non-PowerBI dashboard release**.
- The real blockers are **internal**: (1) an **outstanding product decision** — Ilia's question to Pietro Desiato "which dashboard should we relink?" was **never answered in-thread**; and (2) the **native dashboard release** the relink depends on.

Note for the human: the native Dashboard Page is now documented as ✅ Live (`dashboard/README.md:27-30`). If that release has shipped since Apr 2026, the release blocker may already be **cleared** and only the product decision (which dashboard, which target project) remains. This needs confirmation.

## Staleness

**Stale, and now confirmed stale across three separate recheck cycles.** No *substantive* movement
since 2026-04-29; today is 2026-07-28 → **~90 days (≈13 weeks) with the core blockers unresolved**,
sitting on the live-incident board the whole time. A single comment landed on 2026-07-27 (Yash Patel,
see Re-check #3 above) but it repeats the ask rather than resolving it — the product decision and
release-confirmation blockers identified on 07-13 are still open on 07-28.

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

**9 / 10** (up from 8/10 at 07-13; per CLAUDE.md scale: high confidence, minor-to-none unknowns).
Three consecutive rechecks (07-13, 07-22, 07-28) with no substantive change raises confidence in the
classification *and* in the staleness verdict — this is no longer a judgment call, it's an observed
90-day pattern. The only remaining unknowns are external/environmental (Freshdesk #6492 detail,
whether the native dashboard covers this specific demo project) — neither changes the recommendation
to force-reclassify/close rather than re-confirm again.

## Doc refs

- `xyz-platform-context/dashboard/README.md:4-5, 27-32` — native Dashboard Page as PowerBI replacement; tab status
- `xyz-platform-context/dashboard/project-types.md` — no "demo" project type; only full-progress vs quality-only
- `xyz-platform-context/incidents/live-incident-playbook.md` — communication/tone patterns used for the draft
