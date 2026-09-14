# PLT-3119 — "AEX not shown in portfolio dashboard" — triage context

- **Domain slug:** `progress-tracking` (justification in §6 — the mechanism is progress-weighting
  consistency, same family as PLT-2917/Pattern 3, not a data-pipeline artefact defect)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3119 (id 122104)
- **Type:** Live Incident · **Priority:** Major · **Status:** **With Customer**
- **Assignee:** Yash Patel · **Reporter:** Yash Patel · original client project: **AEX01** (tenant **APLD**)
- **Freshdesk:** Ticket 7907 — flipped **Waiting on 3rd line → Waiting on customer** same day
- **Created:** 2026-09-10 12:18 · **Last updated:** 2026-09-10 13:48 (same day; 4 days quiet as of
  this run, 2026-09-14) · **Comments:** 5 · **Attachments:** 4, all PNG, all inline in comments

This is a brand-new ticket, first triage pass. Total elapsed time on-ticket is under 1.5 hours (all
5 comments land between 12:18 and 13:48 on 2026-09-10); nothing has moved since.

---

## 1. Verbatim description

> Project:AEX01
> Description: AEX not being in portfolio dashboard, thanks.

The one inline description image is the same permanently-broken `UNKNOWN_MEDIA_attachment` /
`url=null` shape seen on PLT-2917 and elsewhere — not a session access issue, genuinely lost.

**"AEX" is the project code (AEX01), not a technical term** — confirmed directly from the
description's `Project:` field and every comment. Nothing else in the ticket uses "AEX" any other
way.

## 2. Comments, and who's waiting on whom

| # | When | Who | What |
|---|---|---|---|
| 111937 | 09-10 12:26 | **Yash** | Restates the real complaint precisely: project **APLD-AEX01** is not appearing in the **Project List** section of the **APLD Portfolio**. Says investigation so far found: (a) AEX01 was invisible everywhere in the portfolio because **"Include in Portfolio" was not enabled** in project settings; (b) after enabling it and refreshing the Power BI portfolio data, the project **began appearing in Milestone Performance**; (c) it still does **not** appear in **Project List**. Two screenshots attached (64299, 64300). Asks Darminder to investigate the Milestone-Performance-vs-Project-List split. |
| 111938 | 09-10 12:27 | Yash | Freshdesk status → Waiting on 3rd line (bookkeeping) |
| 111940 | 09-10 13:20 | **Darminder** | Checked **our own** Portfolio Dashboard (the hc-frontend one, feature-flagged, referred to as "the one we created on the Platform space behind feature-flags") — **AEX01 appears there fine**, in its Project List. Says he has no visibility into the **PowerBI-linked** portfolio dashboard (the one the customer is actually looking at) and asks Mostafa to advise. Screenshot attached (64301). |
| 111942 | 09-10 13:39 | **Darminder** | "Following group discussion including Mostafa": names the cause as **"you cant have both types of calculation logic in the same portfolio which has been set for this project"** — a progress-weighting-method conflict. Screenshot of a settings panel attached (64304). No query, log, or data read is cited — this is a verbal/group conclusion, not a demonstrated one. |
| 111943 | 09-10 13:48 | Yash | Freshdesk status → **Waiting on customer** |

**Who's waiting on whom, right now:** the customer. We (Darminder, via Yash/Freshdesk) gave an
explanation and the ball moved to them the same day, 4 days ago. Nothing indicates the explanation
was independently verified against AEX01's actual data before it went out — see §5. This is **not**
a case of us being unresponsive; if anything the risk is the opposite direction (see §5's flag).

## 3. What actually differs from PLT-2917 (checked directly, not assumed)

PLT-2917 ("Portfolio Progress Dashboard", milestones wrong) was extensively investigated and its
root cause is: **the platform has no write path to Actual Finish Date**, so a milestone marked
100% in the editor can never be reflected as "Complete" in `vw_KeyMilestone` / the Milestone
widget, because milestone completion is read from Actual End Date, not from user-entered progress.

**PLT-3119 is not that.** Nothing in this ticket concerns milestone completion status, Actual
Finish Date, or `vw_KeyMilestone`. The complaint here is that **an entire project is missing from
the Project List widget's project roster** — a portfolio-membership/aggregation problem, not a
per-milestone date problem. Different symptom, different named mechanism (weighting consistency
vs. Actual Finish Date), different fix surface if either is confirmed.

**What the two tickets do share, and it's a real structural echo worth flagging rather than a
duplicate:** in both tickets, the **Milestone Performance** widget is the one that keeps working
while a different, aggregation-dependent view breaks. In PLT-2917 that's because milestones are
zero-weight on every progress-weighting path (so weighting/aggregation quirks don't touch them —
see PLT-2917 context §0.3). In PLT-3119, Yash independently observed the identical asymmetry:
AEX01 shows in Milestone Performance but not Project List, straight after enabling Portfolio. That
is consistent with the same underlying fact (milestones don't participate in the
progress-weighting aggregation that a Project List rollup needs), not a coincidence — but it is a
**shared structural cause**, not a shared **defect**. **Not a duplicate of PLT-2917; a sibling
symptom of the same "Milestone Performance is aggregation-agnostic" property.**

## 4. Code findings — the "calculation logic" claim is real and traceable in hc-frontend

Darminder's diagnosis names a real, enforced product rule, not a guess invented for this ticket.
It is fully implemented as a client-side guard on the **project settings** screen that gates the
same "Include in Portfolio" toggle Yash used:

- **The toggle itself:** `GeneralTabEdit.tsx:481-522` — a `Checkbox` labelled *"Included in
  Portfolio Dashboard"*, bound to `isPortfolioEnabled`, rendered only when the `Portfolio-Dashboard`
  feature flag is on (`GeneralTabEdit.tsx:81`, `getFeatureFlagValue('Portfolio-Dashboard')`).
- **The rule:** `portfolio-weighting-guard.ts:46-76`, `getPortfolioWeightingConflict()`. A project
  may join a portfolio only if the portfolio is currently empty, or its `progressWeightingMethod`
  (labour-hours vs. linked-element-count — `app/types/progress-weighting-types.ts`) matches every
  other member already enabled in that portfolio. Enabling is **blocked with a named-projects
  warning toast** on conflict (`GeneralTabEdit.tsx:499-518`), both on the enable-click and again on
  Save (`:193-220`) — the guard re-checks even for an already-enabled project whose weighting
  changed since.
- **The guard's own doc comment explicitly names exactly this ticket's shape as a known gap:**
  `portfolio-weighting-guard.ts:54-56`, *"Legacy state from before this guard: members already
  disagree with each other, so no candidate can be consistent with all of them."* The guard stops
  **new** conflicts; it has no mechanism to detect or resolve one that already exists.
- **Membership/weighting lookup:** `usePortfolioWeightings.ts:34-106` — built from the user's
  project list filtered to `isPortfolioEnabled === true` and the same tenant, then each member's
  `progressWeightingMethod` fetched individually; a member that can't be read is skipped, not
  treated as absent (`:92-102`, deliberately fail-safe toward over-blocking).
- **This guard is recent:** its only commit in `hc-frontend` history is `478932d`, dated
  **2026-08-14** (squashed into an unrelated-looking commit message, `#2138` — same pattern of
  batched/squashed merges noted elsewhere on this board). **27 days before this ticket.** If AEX01
  was added to the APLD portfolio before 14 August, it could never have been checked by this guard
  at all — a clean, code-verified explanation for how it ended up in a conflicting state despite
  the guard existing today.

**What this guard does NOT reach, and is worth being explicit about:** this is entirely a
**hc-frontend project-settings** control. It has no visibility into, and makes no claim about,
what the **PowerBI-linked** Portfolio Dashboard's own Project List query does with a project whose
weighting conflicts with its portfolio siblings — that surface is external to hc-frontend, exactly
as established for PLT-2917 (the "old PowerBI portfolio dashboard" is a different consumer of a
different backend artefact than anything hc-frontend renders). Confirmed here independently:
Darminder's own comment (111940) says he could reproduce nothing wrong on **our** portfolio
dashboard — AEX01 shows correctly there — and has no access to the PowerBI side.

**hc-frontend's own Project List widget (`ProjectsWidget.tsx`, `porfolioProjectsData.ts`) applies
no weighting-consistency filter of any kind** — `deriveProjectCardsFromProjects()`
(`porfolioProjectsData.ts:39-63`) only filters client-side on `projectStatus` and `region`; the
full project list comes straight from `GET /portfolios/:id/dashboard`
(`portfolioProjectsQueries.ts:9-16`). This is consistent with Darminder's observation that our own
dashboard is unaffected, and confirms the defect (if it is one) is specific to whatever the PowerBI
report's Project List panel queries — not shared hc-frontend code.

## 5. What's unverified — and the one thing worth flagging before this closes

**Nobody has checked AEX01's actual `progressWeightingMethod` against its portfolio siblings'.**
Comment 111942 states the cause as settled fact from a "group discussion" with one screenshot, not
from a data read. This matches the recurring shape in `recurring-defect-patterns.md` — *"a
customer-facing instruction shipped on a premise nobody verified"* — closely enough to name: the
customer has already been put in "waiting on customer" (implying they've been told to do
something, e.g. align AEX01's weighting), and that instruction rests on an unconfirmed premise. The
underlying mechanism (portfolio aggregation needs one weighting basis) is real and code-verified in
§4; whether it is *actually what's wrong with AEX01 specifically* is not.

**Two follow-on questions, unresolved, in order of value:**
1. Was AEX01 added to the APLD portfolio **before 2026-08-14**? If yes, that's a complete,
   consistent explanation (legacy conflict, guard never had a chance to catch it) and nothing here
   points at a live bug. If AEX01 was added **after** that date, the guard should have blocked it —
   and didn't, which would itself be a defect worth its own investigation (guard bypass, or a
   feature-flag/tenant edge case).
2. Even once AEX01's own weighting is confirmed as the odd one out, **nothing establishes that the
   PowerBI Project List panel's query is what's excluding it, or how** — that panel's SQL/DAX is
   outside hc-frontend and this session has no BI/DB access. The Milestone-Performance-shows /
   Project-List-doesn't asymmetry is *consistent* with a weighting-based rollup excluding the
   project, but that is inference, not a read of the query.

## 6. Domain slug — why `progress-tracking`

The named mechanism (progress-weighting-method consistency for portfolio-level aggregation) is a
progress/schedule concept, lives in the same `ProgressWeightingType` surface as Pattern 3's three
confirmed occurrences (`recurring-defect-patterns.md` Pattern 3), and the code that actually
implements the only verifiable half of it (`portfolio-weighting-guard.ts`) sits in project
settings' progress configuration. `progress-tracking` is the better fit over `data-pipeline`
because there is no pipeline/artefact defect confirmed here — only a settings-consistency rule and
an external report this session cannot query.

**Candidate addition to Pattern 3** (not made — this ticket's mechanism is unconfirmed against real
data per §5): if AEX01's weighting-vs-portfolio conflict is confirmed, this would be a fourth organ
of Pattern 3, at portfolio-membership granularity rather than category-filter or headline-%
granularity — worth adding once verified, not before.

## 7. Attachments — unreadable, per the standing 2026-09-08 finding (not retried)

All four are inline-comment PNGs; per the confirmed dead end (session credentials 403 on
attachment content, `incidents/live-incident-run-instructions.md` § 2026-09-08), none were fetched.

| id | filename | posted by / where | what it would settle |
|---|---|---|---|
| 64299 | `Screenshot 2026-09-10 164519-20260910-112347.png` | Yash, comment 111937 | The customer's actual Project List view — confirms AEX01 is genuinely absent (not a search/filter/scroll artefact) and which portfolio this is |
| 64300 | `image-20260910-112412.png` | Yash, comment 111937 | Second customer-side image, likely the Milestone Performance view showing AEX01 present, for direct comparison against 64299 |
| 64301 | `image-20260910-121414.png` | Darminder, comment 111940 | Our own hc-frontend Portfolio Dashboard showing AEX01 present — the evidence behind his "works fine here" claim |
| 64304 | `image-20260910-123851.png` | Darminder, comment 111942 | The actual calculation-logic/weighting settings screen referenced as the cause — this is the single most decisive image: it would show AEX01's weighting value and (if visible) its portfolio peers', which is exactly what §5 says is unverified |

## 8. Confidence (explicit, not rounded up)

- **The complaint is precisely "project missing from Project List, present in Milestone
  Performance, on the PowerBI-linked Portfolio Dashboard":** 9/10 — verbatim from Yash's own
  comment, corroborated by Darminder's independent check.
- **A real, enforced progress-weighting-consistency rule exists in hc-frontend and named
  "calculation logic" is a fair plain-language label for it:** 9/10 — read the guard, its tests are
  absent but the logic is direct and the code comment names this exact legacy-conflict shape.
- **That rule is what's actually excluding AEX01 from the PowerBI Project List panel specifically:**
  4/10 — plausible, structurally consistent with the Milestone-Performance/Project-List asymmetry,
  but **not verified against AEX01's actual weighting value, its portfolio siblings' values, or the
  PowerBI query itself.** No DB/BI access this session.
- **This is unrelated to PLT-2917's root cause (Actual Finish Date):** 9/10 — read both mechanisms
  directly; no shared code path, only a shared "Milestone Performance is exempt" structural
  property (§3).

## 9. What remains unverified after this pass (explicit list)

1. AEX01's actual `progressWeightingMethod`, and its APLD portfolio siblings' — nobody has read
   this; comment 111942 asserts a conclusion, not a measurement.
2. Whether AEX01 was added to the portfolio before or after 2026-08-14 (the guard's ship date) —
   this is the single check that would confirm or rule out "legacy conflict, guard never applied."
3. What the PowerBI Portfolio Dashboard's Project List query actually filters on — entirely outside
   hc-frontend and this session's access.
4. All four attachments (§7) — unread.
5. Whether the customer has been given anything beyond "waiting on customer" — the actual reply
   text lives in Freshdesk ticket 7907, not in these Jira comments, and was not read.
