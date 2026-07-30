# PLT-2619 — "Demo dashboard update" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2619
- **Issue type:** Live Incident ("To track live incidents on site.")
- **Status:** With Customer (category: In Progress / yellow) — **status unchanged since 2026-04-29**
  (`statuscategorychangedate = 2026-04-29T13:17`), despite the 27 Jul comment
- **Priority:** Medium · **Project:** PLT (XYZ SW Platform : Platform)
- **Reporter & Assignee:** Masum Ahmed (unchanged)
- **Created:** 2026-04-23 · **Last updated:** 2026-07-27T11:04 (comment only)
- **Components / Labels / Attachments / Issue links / Remote links:** **none** (all empty — verified
  `attachment: []`, `issuelinks: []`, `getJiraIssueRemoteIssueLinks → []`)
- **External ref:** Freshdesk ticket #6492 (mentioned only inside the mirror comments; there is
  **no** Jira remote link to it)
- **Domain slug:** `other` (product/demo-asset request; touches Dashboard but is not a dashboard code task)

---

## RUN 2026-07-30 — what changed after 14 weeks of silence

**One new comment, and it is the whole story:**

| Date | Author | Content (verbatim) |
|------|--------|--------------------|
| 2026-07-27 11:04 | **Yash Patel** | "@Ilia Kuzmin can we update this to new dashboard if not done already? thanks" |

Nothing else changed: no status transition, no reassignment, no attachments, no links, no
description edit. The ticket is **still typed `Live Incident`, still `With Customer`, still assigned
to Masum Ahmed**.

### What the update actually does — ownership flip, not resolution

1. **It confirms the 07-13 finding rather than overturning it.** Yash (coordinator, owns the client
   channel) is asking an *internal* engineer to do the work. Nobody is waiting on the customer. The
   `With Customer` status has now been factually wrong for 3 months.
2. **It kills the April blocker.** The April parking reason was "awaiting a non-PowerBI dashboard
   release". Yash's phrasing — *"if not done already"* — plus the native Dashboard Page being ✅ Live
   (`dashboard/README.md:27-30`) means the release blocker is **gone**. What replaces it is a
   factual question: *has the demo already been moved?*
3. **The ball is now explicitly on Ilia** (the owner of this triage routine). This is the second
   ticket in the routine where **we, not the customer, are the open action** (cf. PLT-2906 on the
   07-22 run). 3 days open as of today.
4. **Pietro's 27 Apr question ("which dashboard should we relink?") is still unanswered** — 94 days.
   It was never routed to a second owner after Pietro went quiet.

### ⭐ Decisive cross-reference: PLT-2935, created 2.5 h after Yash's nudge

Board sweep (`project in (PLT, PBD) AND (summary ~ demo OR summary ~ sales) AND updated >= 2026-06-01`)
returns exactly **two** live items: this ticket and **PLT-2935**.

**PLT-2935 — "[Dashboard] Freeze planned progress % for sales project `69e232b2c222e55fa039eab2`"**
- Task (not Live Incident), priority Minor, status **Analysis In Progress**
- **Reporter + assignee: Ilia Kuzmin**, created **2026-07-27 13:35** — i.e. **2 h 31 min after
  Yash's PLT-2619 comment**
- Description: *"This is a sales/demo project. The backend keeps refreshing progress data, so the
  **planned progress %** on the dashboard keeps increasing over time. For demo purposes it should
  stay fixed…"* — approach agreed as **FE-only, hardcoded on project id**
- Note in the description: *"Match on project id for now (stable); **project name is not known yet**"*
- One comment (28 Jul 08:44, Ilia): three clarifying questions (freeze to what value? scope = headline
  metric only or also trend line / per-package? do variance + SPI follow the frozen planned?) —
  **awaiting an answer; that is where PLT-2935 currently sits**

**Why this matters for PLT-2619:** the mechanics described in PLT-2935 (backend refreshing progress
data, planned % on *the dashboard*, `DashboardProgressService` / `maxPlannedProgress$`) are **native
new-dashboard mechanics — a PowerBI report has none of them**. So a sales/demo project is **already
running on the new dashboard**, and the work now being requested on it is cosmetic demo-polish, not
a migration. That is the direct answer to Yash's *"if not done already"*: **apparently yes, done.**

**The one unproven link:** PLT-2935 never names the project (only the mongo id
`69e232b2c222e55fa039eab2`), so *"is `69e2…` the same asset as 'Mission Critical Dashboard'?"* is
not proven from Jira alone. Same day, same requester chain, same subject, only two demo tickets
alive — strong circumstantial linkage (~75-80%), not certainty. **This single question decides
whether PLT-2619 closes or reopens as real work.**

### Historical cross-reference: "Mission Critical Dashboard" is a PowerBI *sales demo* asset

JQL `text ~ "Mission Critical"` shows the asset's whole lineage sits in the **PBD (Power BI
Dashboard)** project, not PLT — all closed/archived, all last touched 2026-04-22 (bulk close):

| Ticket | Status | Note |
|---|---|---|
| **PBD-1298** | Closed | "Update Sales Dashboard to 4.1 using BIM360 as data source" — *Project: The Mission Critical Dashboard / Mission Critical Datacentre*; "demo sales dashboards … updated to the latest versions" |
| **PBD-1213** | ARCHIVED (NOT RELEASED) | "Sales Demo Dashboard - Issue", *Project: Mission Critical Dashboard*, Live Incident, reporter **Masum Ahmed** — the direct predecessor of this ticket |
| **PBD-1254** | Closed | "Fix Bug in Mission Critical Dashboard" |
| **PBD-1890** | Done | "Absence of categories for QAs in dashboard" — *Project: MISSION CRITICAL (Smith Johns)*, "the dashboard used for demo" |
| **PBD-814 / PBD-763 / PBD-603 / PBD-427** | Closed/Done | demo-project PBI dashboard creation, marketing/sales demo setup |
| **DIGP-814** | **Live** | "[PBD][PLT] New Sales Demo Dashboard" — the *sanctioned successor programme*: enhance the sample datacentre dataset (model+schedule, costs, issues, 360) for the sales storyline. Dependencies list names Mostafa, Pietro, Ilia, Dave, Gizem |

Conclusion: this ticket is a **PBD-lineage sales-demo asset request filed on the PLT live-incident
board**. Precedent for relocation already exists in this routine (PLT-2891 → PBD-2111). PBD itself
looks wound down (everything bulk-closed 22 Apr 2026), which is consistent with the whole demo
estate moving to the native platform dashboard — i.e. **DIGP-814 / PLT-2935 are where this now lives**.

---

## Classification (unchanged, now better evidenced): (ii) content/config request — MIS-FILED

Not a bug. No error, no reproduction, no broken user, no worked-before/broken-now. Verbatim ask:

> "Can we update 'Mission Critical Dashboard'. I think it's still running on the old system and would
> be great to have this running faster for client demos!"

"Old system" = PowerBI; the native Dashboard Page is explicitly its replacement
(`dashboard/README.md:4-5`). It is a **modernization/relink of a sales-demo asset** — product/ops
owned, low urgency, no defect. Not (i) bug, not (iii) feature, not (iv) unclear.

## Code check — done briefly, and it says "not a code task"

Instructed to look only if a real technical mechanism is in play. It is worth **one** paragraph
because it changes the shape of the ask:

- **Old surface (PowerBI):** route `progress-dashboard/:id` → `ProgressReportPage`
  (`hc-frontend/src/main/webapp/app/pages/ProgressReportPage/ProgressReportPage.tsx:1-4, 62, 163`)
  embeds `<PowerBIEmbed>`; its config comes **per project from the backend** via
  `serviceProvider.ProgressDashboard.getProjectDashboardInfo(projectId)` (report id + embed token;
  fails with `error.reportNotExist` when a project has no report mapped). Same pattern in
  `components/ProjectReportList/ProjectReportList.tsx`. Route registered at `app/routes.tsx:88-95`;
  path constant `app/config/constants.ts:13`.
- **New surface (native):** the ViewerPage dashboard — DuckDB-WASM over parquet artefacts
  (`dashboard/README.md`). **Entirely different data path.**
- **Therefore:** "relinking" the demo is **not a link swap and not an FE code change**. There is no
  FE toggle that flips a project from PowerBI to native; the project simply needs to exist on the
  platform with progress artefacts in the new pipeline. This is a **data/ops + product action**.
- Confirmed the PLT-2935 anchors exist and are **not yet implemented**: `maxPlannedProgress$` at
  `…/services/dashboard-progress/dashboard-progress-service.ts:131, 1093, 1154, 1333`; `grep` for
  `69e232b2c222e55fa039eab2` across `src/` returns **nothing** (no hardcoded freeze in the code yet).
  Repo state at check time: branch `claude/vigilant-franklin-7c9ecw`, HEAD `4f61c0b` (2026-07-29).

## KB relevance check (asked for explicitly)

- `dashboard/project-types.md` — **no "demo" project type exists**. Only full-progress vs
  quality-only via the `progressProject` flag. A demo is a standard project used for sales; there is
  no special demo handling to configure. (Re-verified this run — still true.)
- `dashboard/README.md:4-5, 27-30` — native Dashboard Page is the PowerBI replacement; all four tabs
  ✅ Live. This is what retires the April "awaiting release" blocker.
- Nothing else in `xyz-platform-context` mentions "Mission Critical" or a demo/sales project.

## Chronology (all 5 comments)

| Date | Author | Content |
|------|--------|---------|
| 2026-04-23 14:45 | Masum Ahmed | Freshdesk #6492 mirror → status "Waiting on 3rd line" |
| 2026-04-27 10:10 | Ilia Kuzmin | "@Pietro Desiato, do you know which dashboard we should relink for them?" — **never answered** |
| 2026-04-27 10:19 | Ilia Kuzmin | "@Masum Ahmed, can we tell the client that we're waiting for a non-powerbi dashboard release to update this?" |
| 2026-04-29 13:17 | Masum Ahmed | Freshdesk #6492 mirror → status "Awaiting release" |
| **2026-07-27 11:04** | **Yash Patel** | **"@Ilia Kuzmin can we update this to new dashboard if not done already? thanks"** |

## Staleness

**89 days** end-to-end (created 23 Apr → today 30 Jul), of which **89 days in the same status**
(`With Customer` since 29 Apr, never transitioned). The 27 Jul comment broke a **89-day** comment
silence but did **not** move the ticket. Open action has been on **us** for **3 days**.

## Roster / ownership

- **Masum Ahmed** — reporter + assignee, **off-roster** (support/Freshdesk agent; posts the #6492
  mirror comments). Also the reporter of the predecessor PBD-1213. Should not remain the owner.
- **Yash Patel** — coordinator per the playbook (owns client channel). Author of the new comment;
  he is the right person to answer to, and the right person to own the Freshdesk close-out.
- **Ilia Kuzmin** — this routine's user; now the **named actionee**, and separately the
  reporter/assignee of PLT-2935.
- **Pietro Desiato** — product owner; his 27 Apr question is still the unanswered fork, but is now
  **superseded** if PLT-2935 is the same asset.

## Updated hypothesis

The 07-27 update **does not resolve or reclassify the ticket** — it re-routes it internally. The
substantive ask ("get the demo off PowerBI onto the fast native dashboard") looks **already
satisfied**: the release shipped, and a sales/demo project is demonstrably live on the native
dashboard (PLT-2935, opened by Ilia hours after the nudge, is *tuning* that native dashboard for
demo use). PLT-2619 is therefore most likely a **zombie ticket whose work has migrated elsewhere**,
still wearing a `Live Incident` type and a factually wrong `With Customer` status.

It is **stuck for a bookkeeping reason, not a technical one**: nobody has (a) confirmed the demo
project identity, (b) transitioned the ticket, or (c) closed Freshdesk #6492. One reply from Yash
settles all three.

## Confidence

**9 / 10.**
- Classification (mis-filed content/config request, not customer-blocked): **9.5/10** — description +
  5 comments + no attachments/links are unambiguous.
- "Release blocker is gone, ball is on us": **9/10** — Yash's wording + Dashboard Page Live.
- "Substantive work already done / superseded by PLT-2935": **7.5/10** — strong circumstantial chain
  (same day, same actor, only two live demo tickets, native-only mechanics) but the project name
  behind `69e232b2c222e55fa039eab2` is **not stated anywhere in Jira**.
- Recommended action is robust to that gap: it is a one-question reply that resolves either branch.

## Gaps / NEEDS HUMAN

- ⚠️ **The decisive question:** is project `69e232b2c222e55fa039eab2` (PLT-2935) the same asset as
  "Mission Critical Dashboard"? Ilia can settle this by opening the project — **not answerable from
  Jira**.
- ⚠️ **Freshdesk #6492** — original client wording and any screenshots live there; **not accessible
  from this environment**, and there is no Jira remote link. If the ticket is closed, #6492 needs
  closing too (it still reads "Awaiting release" from 29 Apr).
- ⚠️ **Attachments: none on this Jira ticket** (verified empty). Nothing behind Atlassian auth to
  chase *here* — the only unviewable media is whatever sits in Freshdesk #6492, and in the
  historical PBD tickets (PBD-1213/PBD-1890 embed Freshdesk-hosted inline images, also unreachable).
- ⚠️ **PLT-2935 is itself blocked** on Ilia's three 28 Jul questions (freeze target value / scope /
  variance+SPI). If PLT-2619 is closed into it, that blocker becomes the live one — it needs an owner
  (whoever requested the freeze; likely sales via Yash).
- ⚠️ Whether a *second*, still-PowerBI demo exists (the "Smith Johns" / "Mission Critical Datacentre"
  variants seen in PBD) — if so, PLT-2619 is not fully superseded.

## Doc refs

- `xyz-platform-context/dashboard/README.md:4-5, 27-30` — native Dashboard Page as PowerBI replacement
- `xyz-platform-context/dashboard/project-types.md` — no "demo" project type
- `hc-frontend/src/main/webapp/app/pages/ProgressReportPage/ProgressReportPage.tsx:62` — per-project
  PowerBI config fetch (`getProjectDashboardInfo`)
- `hc-frontend/src/main/webapp/app/routes.tsx:88-95`, `app/config/constants.ts:13` — legacy
  `/progress-dashboard/:id` route
- `hc-frontend/…/services/dashboard-progress/dashboard-progress-service.ts:131, 1333` —
  `maxPlannedProgress$` (PLT-2935 target)
- `xyz-platform-context/incidents/live-incident-playbook.md` — tone/routing for the draft
