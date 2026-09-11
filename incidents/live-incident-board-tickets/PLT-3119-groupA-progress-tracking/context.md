# PLT-3119 — "AEX not shown in portfolio dashboard" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3119
- **Issue type:** Dashboards (Live Incident) · **Project (customer):** AEX01 / **APLD-AEX01**
- **Status:** **With Customer** (id 10711) → Group A. **Brand new — created 2026-09-10, never
  triaged before.** Freshdesk #7907.
- **Priority:** Major · **Reporter:** Yash Patel · **Assignee:** Yash Patel (per live fetch;
  Darminder investigated but is not the Jira assignee)
- **Created:** 2026-09-10 12:26 · **Last updated:** 2026-09-10 13:48 (5 comments, all same-day)
- **Domain slug chosen:** `progress-tracking` (PRG) — every mechanism found (Progress Weighting /
  "Progress calculation logic" consistency across a portfolio) is the PRG domain's, same tag as the
  closest sibling **PLT-3109** and the same underlying guard built for **PLT-2911**.

---

## 0. Prior-run check

No existing folder. Not a repeat of Pattern 3 in the usual sense (that pattern is a single
project's own dashboard-vs-report mismatch) — this is the **portfolio-membership** analogue: a
project's progress weighting disagreeing with its portfolio peers, which `sprint-tickets/README.md`
and `sprint-tickets/PLT-2911/context.md` already document extensively as a *built* mechanism
(FE-only guard, shipped 2026-08-07). This ticket is very likely that guard's real-world shape
surfacing on the live board for the first time.

## 1. What "AEX" and "portfolio dashboard" mean here (not guessed from the title)

- **AEX = a project code**, not a generic acronym: the ticket's own custom field says `Project:
  AEX01`, and Yash's first comment names it precisely — **`APLD-AEX01`**, a project inside the
  **APLD** ("Applied Digital") tenant/portfolio.
- **"Portfolio dashboard" = the multi-project view listing every project in a portfolio** (as
  opposed to a single project's own PRG/QLT/CAP dashboard). Two candidate implementations exist in
  `hc-frontend`, and the ticket does not cleanly distinguish them:
  1. **Native, feature-flagged:** `app/pages/PortfolioDashboardPage/` (`Portfolio-Dashboard` FF,
     `GeneralTabEdit.tsx:481`). Ships a `MilestoneWidget` (on-screen title literally **"Milestone
     Performance"**, `MilestoneWidget.tsx:18`) and a `ProjectsWidget` (on-screen title **"Projects"**,
     `ProjectsWidget.tsx:194`).
  2. **Legacy, PowerBI-embedded:** referenced in `dashboard/README.md:118-122`
     (`PortfolioPage.tsx:97-105`) for the *per-project* dashboard redirect, but no portfolio-level
     PowerBI report is visible anywhere in `hc-frontend` or `XYZPlatformApi`. Darminder's own comment
     says the same: *"The one above linked to PowerBI I am not aware of access or how it works."*
  - Yash's wording — **"Milestone Performance"** and **"Project List"** as two named sections of one
    "APLD Portfolio" view — matches (1)'s widget naming closely (`Milestone Performance` exactly;
    `Project List` is a plausible loose name for `Projects`), but as shown in §3 below, (1)'s own data
    model **cannot produce the split Yash reports**, so which system the customer is actually looking
    at is unresolved (§5).

## 2. What was reported (full comment thread)

**Description** (custom fields; `Project:AEX01`, `Is The Device Still Usable?: Not Usable` — boilerplate
template noise, ignore): *"AEX not being in portfolio dashboard, thanks."* One inline image never
finished uploading (`blob:...UNKNOWN_MEDIA_attachment`, same known Freshdesk-relay failure as
PLT-3109/PLT-3033/PLT-2890).

1. **`111937` · Yash · 12:26** — relays the investigation so far:
   > Customer reports that project **APLD-AEX01** is not appearing in the **Project List** within
   > the **APLD Portfolio**. Initially, AEX01 was not visible anywhere because **"Include in
   > Portfolio"** was not enabled in project settings. After enabling it and refreshing the Power BI
   > portfolio data, the project began appearing in **Milestone Performance**. However, it still does
   > **not appear in the Project List** section.
   Two images attached (ids `64299`, and one inline `90991b4d…` — see §6).
2. **`111938` · Yash · 12:27** — Freshdesk #7907 → "Waiting on 3rd line".
3. **`111940` · Darminder · 13:20** — *"looking at Applied digital the project Portfolio dashboard in
   the one we created on the Platform space behind feature-flags the project **does** appear. The one
   above linked to PowerBI I am not aware of access or how it works. I have asked Platform team and
   no-one has experience with the PowerBI version. @Mostafa Kamel Hussien would you be able to
   advise?"* — attachment `64301`.
4. **`111942` · Darminder · 13:39** — *"Following group discussion including @Mostafa Kamel Hussien
   the cause of the problem is because you cant have both types of calculation logic in the same
   portfolio which has been set for this project"* — attachment `64304` (a screenshot, 14KB, much
   smaller than the others — likely a tight crop of one settings field).
5. **`111943` · Yash · 13:48** — Freshdesk #7907 → "Waiting on customer".

**Reading the sequence exactly:** comment 4 (13:39, the technical conclusion) precedes comment 5
(13:48, moved to "waiting on customer") by 9 minutes, so it is plausible Yash relayed comment 4's
finding to the customer via Freshdesk before flipping the status — but nothing in Jira confirms what,
if anything, was actually said to the customer. Not verified either way.

## 3. Code findings (hc-frontend)

**VERIFIED — "Include in Portfolio" is `isPortfolioEnabled`, on-screen label "Included in Portfolio
Dashboard":** `GeneralTabEdit.tsx:521`, form field `GeneralTabEdit.tsx:107,483`. Exact match for
Yash's wording in comment 1.

**VERIFIED — "calculation logic" is a real on-screen label, not paraphrase:** the radio group right
above the Portfolio toggle in the *same* General tab is titled **"Progress calculation logic"**
(`GeneralTabEdit.tsx:471`), bound to `progressWeightingMethod`
(`ProgressWeightingType.PLANNED_LABOUR_HOURS` / `LINKED_ELEMENT_COUNT`,
`app/types/progress-weighting-types.ts`). Darminder's screenshot (`64304`, 14KB — small, so likely a
tight crop of exactly this field) is almost certainly this control, or the conflict badge it drives.

**VERIFIED — a portfolio-wide weighting-consistency guard already exists, built for PLT-2911:**
`portfolio-weighting-guard.ts:getPortfolioWeightingConflict()` blocks/badges a project whose
`progressWeightingMethod` disagrees with its portfolio peers (first project sets the basis; a mixed
legacy portfolio hard-blocks everyone). This is Mostafa/Darminder's "can't have both types of
calculation logic in the same portfolio" **verbatim** — the mechanism they're describing is this
guard's own design comment (`portfolio-weighting-guard.ts:8-12`).

**VERIFIED, and this is the load-bearing finding — the guard/badge does NOT remove a project from
any list; it only warns, per PLT-2911's own 2026-09-04 entry (`sprint-tickets/PLT-2911/context.md`):**
the conflict badge renders *next to an already-ticked, already-portfolio-enabled* checkbox
(`GeneralTabEdit.tsx:139-142`), and blocks **Save** on that settings tab, not the project's presence
in any dashboard list. So a weighting mismatch, by itself, is not sufficient in this repo's own code
to explain a project being *absent from a list* — something else has to be doing the excluding, and
it isn't this guard.

**VERIFIED — on the native `PortfolioDashboardPage`, "Milestone Performance" and "Projects" read the
identical, already-filtered project array, so the split Yash describes (present in one, absent from
the other) cannot happen there:**
- Both widgets are driven by `usePortfolioData()` (`usePortfolioData.ts:14-32`), which fetches
  `GET /portfolios/:id/dashboard` once (`portfolioProjectsQueries.ts:9-16`,
  `portfolio-api-service.ts:43-53`) and applies the same client-side region/status filters
  (`usePortfolioFilters.ts` via `applyFilters`) before either widget's selector runs.
- `usePortfolioMilestones.ts:18-23` explicitly takes its "allowed projects" from that same
  `usePortfolioData(projects => projects)` call.
- `buildMilestoneWidgetData()` (`portfolioMilestonesData.ts:33-56`) builds `projectById` **only**
  from `allowedProjects`, and line 53 (`if (!project) continue`) **drops any milestone whose
  `projectId` isn't in that map** — so a project excluded from the dashboard's project array cannot
  surface in Milestone Performance either, on this code path.
- **Conclusion:** if AEX01 truly shows in Milestone Performance but not in "Project List", the
  surface Yash is looking at is very unlikely to be this native, `/portfolios/:id/dashboard`-backed
  page — consistent with Darminder's own read that the customer's "APLD Portfolio" is the
  PowerBI-linked one, which no one on the FE/platform team present in the thread has access to or
  understands.

## 4. Hypothesis

**INFERRED, not verified:** whatever renders the customer's "Project List" (most likely a PowerBI
report/dataset, per Darminder's comment, structurally outside both `hc-frontend` and
`XYZPlatformApi`) computes a per-project progress figure that assumes **one** weighting method across
the whole APLD portfolio, and silently drops a project whose own weighting doesn't match — the same
shape as **PLT-3109** (a labour-hours-only `WHERE` clause dropping element-weighted activities) and
**PLT-2911**'s guard (built specifically to stop this at enable-time, but frontend-only and
non-blocking once already enabled, so a pre-existing or manually-forced mismatch reaches whatever
consumes it downstream). "Milestone Performance" plausibly doesn't depend on progress-weighting at
all (it's date/status-driven, per `portfolioMilestonesData.ts` — no weighting field touched anywhere
in that file), which would explain why it shows AEX01 fine while a progress-percentage-bearing
"Project List" does not.

This has **not** been confirmed against any real query, table, or PowerBI artifact — there is no
prod/PowerBI access in this session (same gap recorded on PLT-3109), and the mechanism described by
Mostafa/Darminder in comment `111942` is a one-line verbal conclusion, not a traced root cause.

## 5. What remains unverified

- **Which system actually renders "Project List"/"Milestone Performance" for the customer** — native
  `PortfolioDashboardPage` (feature-flagged) or the legacy PowerBI portfolio report. Darminder himself
  does not know for the PowerBI one; this session cannot check either without prod/PowerBI access.
- **AEX01's actual `progressWeightingMethod`, and what the rest of the APLD portfolio's members are
  set to.** Nobody has stated the two values side by side — the "mismatch" conclusion is asserted,
  not shown as a diff (the exact discipline the 09-03 "denominator rule" and 09-09 "reproduce the
  predicate" entries in `live-incident-run-instructions.md` call for).
- **Whether "Project List" is even weighting-aware at all**, i.e., whether the hypothesis in §4 is
  the actual mechanism or just a plausible-sounding echo of PLT-2911's guard applied to the wrong
  layer.
- **What, if anything, was actually communicated to the customer** before Freshdesk flipped to
  "Waiting on customer" at 13:48.
- **Contents of all 4 screenshots** (`64299`, `64301`, `64304`, plus one inline image `90991b4d…` in
  comment 1) — not opened this session; see §6.

## 6. NEEDS HUMAN — attachments not opened this session

4 PNGs are attached, all from today (2026-09-10), none opened by this routine:

| id | author | time | size | likely content |
|---|---|---|---|---|
| `64299` (+ inline `90991b4d…`) | Yash | 12:26 | 446KB | the customer's own portfolio screenshot(s) showing AEX01 missing from Project List |
| `64301` | Darminder | 13:20 | 494KB | the native `PortfolioDashboardPage`, project visible |
| `64304` | Darminder | 13:39 | **14KB** (much smaller — likely a tight crop) | probably the "Progress calculation logic" field/badge (`GeneralTabEdit.tsx:471`) |

This routine has no working Jira attachment-content fetch (confirmed 403 on 2026-09-08, see
`live-incident-run-instructions.md`). A human should open `64304` first — if it shows the "Progress
calculation logic" radio or the weighting-conflict badge, §4's hypothesis is confirmed for free and
the only remaining question is which system enforces it on "Project List".

## 7. Confidence

- **"Include in Portfolio" = `isPortfolioEnabled`, and the label match to Yash's wording: 9/10** —
  exact on-screen label read directly.
- **Darminder/Mostafa's "calculation logic" conclusion refers to `progressWeightingMethod` /
  `portfolio-weighting-guard.ts`: 8/10** — exact label match ("Progress calculation logic") and the
  guard's own design comment uses almost the same words Darminder used, but the actual screenshot
  (`64304`) was not opened to confirm.
- **This repo's own guard mechanism, by itself, explains AEX01's omission from a list: 3/10** —
  actively contradicted by PLT-2911's own 09-04 finding that the guard is a non-blocking badge, not a
  filter. Something else (unidentified — likely PowerBI-side, unverified) has to be doing the actual
  exclusion.
- **The native `PortfolioDashboardPage` is NOT the surface the customer is describing: 7/10** — a
  clean code-level contradiction (Milestone Performance structurally cannot show a project absent from
  the same page's Projects widget), not just an absence of evidence.
- **Overall triage confidence: 3/10.** One day old, the internal team's own explanation is a verbal
  conclusion rather than a traced mechanism, and the two facts that would settle it (AEX01's weighting
  vs. its portfolio peers; which system renders "Project List") are both unread by anyone on this
  thread so far.
