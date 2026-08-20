# PLT-2619 — "Demo dashboard update" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2619
- **Issue type:** Live Incident ("To track live incidents on site.")
- **Status:** With Customer (category: In Progress / yellow) — **status unchanged since 2026-04-29**
  (`statuscategorychangedate = 2026-04-29T13:17`), despite the 27 Jul comment
- **Priority:** Medium · **Project:** PLT (XYZ SW Platform : Platform)
- **Reporter:** Masum Ahmed · **Assignee: Yash Patel** (reassigned off Masum by Pietro Desiato
  2026-08-03T14:55 — see § 2026-08-04)
- **Created:** 2026-04-23 · **Last updated:** 2026-08-03T15:13 (Freshdesk mirror comment)
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

## RUN 2026-08-04 — the 89-day stall broke twice on 08-03, both times sideways

The 08-03 pass recorded `updated` as still 07-27 and left the ticket in "confirmed unchanged"
(`README.md:93`). That pass ran at ~07:13 UTC. **Two things then happened the same afternoon**, both
after it, and neither is what the prior draft was waiting for.

### VERIFIED — the 08-03 timeline (read from the changelog + comment list, not inferred)

| Time (BST) | Actor | Event | Source |
|---|---|---|---|
| 14:55:02 | **Pietro Desiato** | **Assignee: Masum Ahmed → Yash Patel** | changelog id `1522065` |
| 15:13:28 | **Yash Patel** | comment: "Ticket ID: 6492 - Freshdesk ticket status changed to : **Waiting on customer**" | comment id `108742` |
| 17:15–17:32 | CI | PR #2080 (PLT-2935) rechecked — **both `build` jobs + SonarCloud all green** | PR check-runs |

**Two independent things, 18 minutes apart, then the sibling ticket's PR going green two hours later.**

### VERIFIED — what did *not* change (this is most of the story)

- **Status: still `With Customer`. `statuscategorychangedate` still `2026-04-29T13:17:46`** — the
  ticket has *never* been transitioned since April. **97 days in one status.**
- **Still `Live Incident`.** Type untouched. Priority Medium. Reporter still Masum Ahmed.
- **`issuelinks: []`, `attachment: []`, `labels: []`, `components: []`, `resolution: null`** — all
  re-verified empty. Still **no Jira link to PLT-2935** despite the two being worked in tandem.
- **Nobody answered Yash's 07-27 question to Ilia.** 6 comments total; the new 6th is a Freshdesk
  *status mirror*, not a reply. The internal question is **8 days** unanswered.
- **Pietro did not answer his own 04-27 question** ("which dashboard should we relink?") — he
  reassigned the ticket instead. That question is now **99 days** open.

### What the two events actually mean

1. **Pietro's reassignment closes one prior recommendation — someone else did it.** The 07-30 draft's
   follow-through item "reassign off Masum Ahmed (off-roster support agent)" is **done**, by Pietro,
   on 08-03. Note the shape: Pietro re-engaged with the ticket for the first time since he created it
   on 04-23, and what he did was **route it, not answer it**. The one fact only he had (which
   dashboard) is still missing.
2. **The Freshdesk flip inverts the 07-30 "the ball is on us" finding — and kills part of the prior
   draft.** #6492 went "Awaiting release" (29 Apr) → **"Waiting on customer"**. Yash has an **open
   question out to the client right now**. Two consequences:
   - **The prior draft's "close Freshdesk #6492" instruction is now actively wrong.** Closing a
     ticket that is mid-question to the client would cut the thread. **Do not do it this week.**
   - For the first time since April, `With Customer` is *arguably accurate* — but **accidentally**:
     the Jira status was never set, it just happens to have caught up with reality. Do not read this
     as the workflow working.
3. **⚠️ The content of Yash's client message is invisible from here.** A status mirror tells us a
   question was asked, not what was asked. This is the new central unknown, and it is **not
   answerable from Jira** — it lives in Freshdesk #6492.

### PLT-2935 — moved materially, and now carries the strongest evidence yet

**Status: Analysis In Progress → `In Code Review`** (`statuscategorychangedate 2026-07-30T09:19`).
New comment 07-30 08:48 (id `108491`): Ilia closes out his own three 28-Jul questions. This retires
the prior context's "PLT-2935 is itself blocked on three open questions" gap — **it isn't any more.**

Substantive change of approach recorded there: **the freeze is no longer a hardcoded percentage.**
Planned % is not a stored number a refresh overwrites — it is recomputed per query as a delta
resolved at a *moving* end date, so the fix pins **the date** instead. Scope settled as planned
everywhere-but-not-actual; variance/SPI follow automatically.

**New actor identified: `Mostafa` is the original requester of the freeze** ("got Mostafa's original
ask — *'i want to freeze it in this state'*"). He was previously only a name in DIGP-814's dependency
list. **This matters: he is the first person we can name who was looking at project
`69e232b2c222e55fa039eab2` on screen** — i.e. the first real owner for the identity question, which
until now had no owner but Ilia's own lookup.

### ⭐ VERIFIED: a sales/demo project **is** live on the native dashboard on prod

Found PR **#2080** — *"PLT-2935: Freeze planned progress for sales dashboard project"*
(https://github.com/XYZReality/hc-frontend/pull/2080), open, **not** draft, `+306/−4` over 4 files,
head `PLT-2935` @ `c50bccd`, base `master` @ `9c14b90`. Its own testing section states:

> "`69e232b2c222e55fa039eab2` only exists on **prod**" · "On **cloud.xyzreality.com**, open
> `/projects/69e232b2c222e55fa039eab2/dashboard`"

That route is the **native** dashboard (`/projects/:id/dashboard`) — **not** the legacy PowerBI route
`/progress-dashboard/:id` (`app/routes.tsx:88-95`, `constants.ts:13`). So the 07-30 inference is now
**verified**: a sales/demo project really is running on the new dashboard on prod, and the work being
done to it is cosmetic demo-polish, not a migration.

**What is still NOT verified — and it is the same one thing:** that this project is the asset the
client calls *"Mission Critical Dashboard"*. **The project name appears nowhere.** PLT-2935's
description still says verbatim *"project name is not known yet"*; the 07-30 comment doesn't name it;
PR #2080 doesn't name it. The link is still circumstantial.

### PR #2080 is green and waiting on a human — this is the real live blocker now

- **Reviews: `copilot-pull-request-reviewer[bot]` (08-01) and Ilia's own reply (08-01). Zero human
  reviews.** Requested reviewers: `TomMasdinXYZ`, `DarminderA`, `rishib-xyz`, `SergiuszXYZ`.
- **CI is fully green as of 08-03 17:32** — the Trivy/`brace-expansion` failure that reddened every
  open PR is **cleared**: #2080's base is `9c14b90`, which *is* the `#2072` lockfile bump.
- **`mergeable_state: "blocked"`** with CI green ⇒ blocked on **missing human approval**, nothing
  technical. **5 days, four named reviewers, no review.**

So the family's blocker has migrated again: April = "awaiting a release"; 07-27 = "awaiting Ilia";
now = **awaiting a code review and a client reply**. PLT-2619 itself has never been the blocker.

### Code re-verification (static reading only — this env cannot build hc-frontend)

The mechanism described in PLT-2935's 07-30 comment is real in the code:

- `WHERE CalendarDate <= '${endDate}' ORDER BY CalendarDate DESC LIMIT 1` —
  `…/dashboard-progress/utils/progress-queries-v2-api.ts:141-142, 201-202, 410-411, 724-725, 993-994`
- the today-cap it mirrors — `refDate = MIN(currentDate, calEndDate)` —
  `…/dashboard-progress/dashboard-progress-service.ts:1771, 2131, 2570`; `utils/progress-queries.ts:750-751`
- `maxPlannedProgress$` — `dashboard-progress-service.ts:131, 1093, 1154, 1333` (unchanged)

📌 **Path correction for this file's own doc refs:** the service lives at
`src/main/webapp/app/pages/organisation/ViewerPage/components/services/dashboard-progress/` —
**not** `src/main/webapp/app/services/dashboard-progress/` as the 07-30 doc-refs implied. That path
does not exist.

**The freeze is not on `master`.** Local checkout `claude/vigilant-franklin-2122zp` @ `9c14b90`
(= master, 08-03): `grep -rn 69e232b2c222e55fa039eab2 src/` → **nothing**;
`utils/frozen-planned-progress.ts` → **does not exist**. It exists only on the unmerged PR branch.
(One local `frozen` hit — `progress-queries-v2-api.regression.test.ts:543` — is a *test-fixture*
frozen refDate, unrelated to this feature. Checked so a future run doesn't misread it as the freeze.)

### Classification — REAFFIRMED and strengthened; recommendation re-sequenced

**Still not a live incident.** Nothing this run weakens that; the 08-03 activity *strengthens* it:
**103 days end-to-end and the only two things that have ever happened to this ticket are a
reassignment and support-tool status mirrors.** No defect, no repro, no error, no worked-before /
broken-now, no attachment, no code ever written against it. That is the signature of a **service
request**, not an incident — while the one piece of genuine engineering in this family sits on a
correctly-typed **Task** with a green PR.

**But the off-board action must now be sequenced, not just executed.** #6492 is mid-question to the
client. Taking the ticket off the board *this week* risks dropping a live client thread. Reaffirm the
classification; hold the bookkeeping until the client replies.

### Domain tag — `other` is now demonstrably wrong

Recommend renaming the folder `PLT-2619-groupA-other` → **`PLT-2619-groupA-dashboard-migration`**
(**not done here — flagged for the human**). The ask is precisely a PowerBI→native demo-asset
migration. Deliberately **not** `data-pipeline` or `progress-tracking`: those mechanics
(`CalendarDate`, parquet, planned/SPI) belong to **PLT-2935**, not to this ticket, which has no code
component at all. Caveat: if this closes into PLT-2935, **archive the folder rather than rename it.**

### Staleness (recomputed)

| Clock | Days |
|---|---|
| Created 04-23 → today | **103** |
| In `With Customer`, never transitioned (since 04-29) | **97** |
| Pietro's 04-27 question unanswered | **99** |
| Yash's 07-27 question to Ilia unanswered | **8** |
| PR #2080 open, green, zero human reviews | **5** |

### Confidence — 2026-08-04 (not rounded up)

- **The 08-03 factual delta** (reassignment + Freshdesk flip + PR green, and *nothing else*):
  **9.5/10** — read directly from changelog, comment list and PR API.
- **Classification (mis-filed service request, not a live incident): 9.5/10** — unchanged, now with
  103 days and zero engineering activity behind it.
- **"A sales/demo project is already live on the native dashboard on prod": 9/10** — *up* from
  inference to verified, on PR #2080's own prod URL and route shape.
- **"PLT-2619 is superseded by PLT-2935 / same asset": 7/10 — deliberately DOWN from 07-30's 7.5.**
  Not a typo and not rounded. The *linkage* evidence improved, but a **counter-signal** appeared:
  on 08-03 Yash went **outward to the customer** rather than closing the loop internally. If the
  migration were known-done, the natural move was to tell the client it's done and close — going to
  the client with a *question* is weakly more consistent with the target dashboard still being an
  open question. Better evidence on one leg, worse on the other ⇒ net slightly lower.
- **"The open action is now on the customer, not us": 6/10** — the Freshdesk status says so, but the
  *content* of Yash's client message is invisible from here. A status mirror is not proof of what was
  asked, or of whom.

### Unresolved items — 2026-08-04

1. **What did Yash ask the client on Freshdesk #6492 on 08-03?** New this run and now the central
   unknown; it determines whether this ticket is closing or reopening. **Not answerable from Jira or
   from this environment.**
2. **What is the project *name* behind `69e232b2c222e55fa039eab2`?** Still unnamed in every source
   (PLT-2935 description, its 07-30 comment, PR #2080). Still the single fork the whole
   recommendation turns on. **Now has a candidate owner: Mostafa.**
3. **Is that project the same asset as "Mission Critical Dashboard"?** Follows from (2). Unproven.
4. **PR #2080 has four requested reviewers and zero human reviews after 5 days**, CI green,
   `mergeable_state: blocked` on approval alone. Nothing to diagnose — it needs a person.
5. **PLT-2619 ↔ PLT-2935 still have no Jira issue link**, so neither ticket shows the other. Cheap
   fix, invisible to every future sweep until someone does it.
6. **Jira status still never transitioned** (97 days). Now *accidentally* accurate, which makes it
   less likely anyone notices it was never actually set.
7. **Whether a second, still-PowerBI demo exists** ("Smith Johns" / "Mission Critical Datacentre"
   variants in PBD) — carried forward unchanged from 07-30, still unchecked.
8. **PR #2080's frozen-date assumption** (`2026-07-24`) is unconfirmed against whatever Mostafa
   actually screenshotted. Flagged in the PR as a one-constant change; nobody has confirmed it.

## Doc refs

- `xyz-platform-context/dashboard/README.md:4-5, 27-30` — native Dashboard Page as PowerBI replacement
- `xyz-platform-context/dashboard/project-types.md` — no "demo" project type
- `hc-frontend/src/main/webapp/app/pages/ProgressReportPage/ProgressReportPage.tsx:62` — per-project
  PowerBI config fetch (`getProjectDashboardInfo`)
- `hc-frontend/src/main/webapp/app/routes.tsx:88-95`, `app/config/constants.ts:13` — legacy
  `/progress-dashboard/:id` route
- `hc-frontend/src/main/webapp/app/pages/organisation/ViewerPage/components/services/dashboard-progress/dashboard-progress-service.ts:131, 1333`
  — `maxPlannedProgress$` (PLT-2935 target). ⚠️ Corrected 08-04: the shorter
  `app/services/dashboard-progress/…` path used above in the 07-30 notes **does not exist**.
- `…/services/dashboard-progress/utils/progress-queries-v2-api.ts:141-142, 201-202, 410-411` —
  `WHERE CalendarDate <= endDate ORDER BY CalendarDate DESC LIMIT 1` (the mechanism PLT-2935 pins)
- `…/services/dashboard-progress/dashboard-progress-service.ts:1771, 2131, 2570` — existing
  `refDate = MIN(currentDate, calEndDate)` today-cap that PR #2080 mirrors
- **PR #2080** https://github.com/XYZReality/hc-frontend/pull/2080 — PLT-2935 implementation; its
  testing section is the source for "the demo project is on the native dashboard on prod"
- `xyz-platform-context/incidents/live-incident-playbook.md` — tone/routing for the draft

## Re-verified 2026-08-05 (light pass, this run)

Live JQL fetch: `updated` still `2026-08-03T15:13:28+01:00`, comment count unchanged at 6. No new
activity since the 08-04 run's own coverage of the Freshdesk Waiting-on-customer flip; Yash's live
client question (content not visible here) is still open, and PR #2080 status was not re-checked
this run (light pass, no `updated` movement to justify it).

## ⭐ Re-verified 2026-08-10 — the family's one real blocker cleared; the identity question is now the only thing left

**PLT-2619 itself: unchanged.** Live fetch: `updated` still `2026-08-03T15:13:28+01:00`, comment
count still 6, status still `With Customer`. No new Jira activity on this ticket in a week.

**PR #2080 (the thing every run since 08-04 flagged as "green, zero human reviews, blocked on
approval alone"): resolved.** Checked directly against GitHub, not carried forward:
- **Rishi Bhugobaun approved it 2026-08-05T16:32:59Z** ("LGTM"), and **Ilia merged it
  2026-08-05T19:31:49Z** into `master` @ `9c14b90`. `merged: true`, `state: closed`.
- **PLT-2935 moved accordingly**: status is now **`Ready For QA`** (was `In Code Review` as of
  08-04), reassigned **Ilia Kuzmin → Gennaro Boccia** (QA), `updated = 2026-08-06T13:14:25+01:00`.
  No new substantive comments — the 07-30 comment (108491, Ilia closing his own three questions,
  switching the freeze from a hardcoded percentage to a date-cap) is still the latest content;
  the status/assignee changes are what moved.

**What this settles:** the planned-% freeze for the sales/demo project `69e232b2c222e55fa039eab2` is
now code-complete and in QA — not merely "on a green PR" as every run from 08-04 through 08-07
recorded it. The family's only concrete engineering work is essentially done. **This does not by
itself resolve PLT-2619** — the single fact the whole ticket has hinged on since 07-30 (is
`69e232b2c222e55fa039eab2` the same asset the client calls "Mission Critical Dashboard"?) is still
unnamed anywhere in Jira, and Mostafa — identified 08-04 as the first named person who was looking at
that project on screen — has still never been asked the drafted one-line question in
`recommended-action.md`. That question is now the only open item in the entire family.

**Also unchanged and still worth carrying:** the content of Yash's 08-03 message to the client on
Freshdesk #6492 is still invisible from here; whether it's the same demo asset or a different one
still determines whether PLT-2619 closes into PLT-2935 or reopens as separate work.

### Confidence — 2026-08-10

- **PR #2080 merged, PLT-2935 in QA:** 10/10 — read directly from the GitHub API, not inferred.
- **"The engineering work in this family is functionally done, only the identity question and QA
  sign-off remain":** 8.5/10 — up from 08-04's 6/10-ish framing (which still treated the PR as an
  open risk).
- Everything else carried forward unchanged from 08-04 (see that section above).

## Re-verified 2026-08-11 (light pass, this run)

Live fetch: `updated` still `2026-08-03T15:13:28+01:00`, comment count still 6, status still `With
Customer`. No new Jira activity on this ticket. The identity question to Mostafa (is
`69e232b2c222e55fa039eab2` "Mission Critical Dashboard"?) is still the only open item in the family
and is still unposted — carried forward unchanged from 08-04/08-10. PLT-2935's QA status not
re-checked this run (light pass, no `updated` movement on PLT-2619 to justify the extra lookup).

## ⭐ 2026-08-14 — the old-vs-new dashboard switch found in code. It is **data-driven per project**, not a feature-flag cohort

This run did not re-derive the Jira story (it is unchanged: `updated` still 2026-08-03, 6 comments,
still `With Customer`, Yash's 07-27 question to Ilia still unanswered — now **18 days**). It went
after the one thing every prior run left as "needs human, cohort unknown": **what actually decides
whether a given project shows the old PowerBI report or the new native dashboard.** That is now
answered from code, and it changes the shape of the "needs human" step from "find out which rollout
cohort this project is in" (which does not exist) to a **30-second URL lookup anyone can do**.

Repo state at check time: `hc-frontend` on `claude/vigilant-franklin-icxmur`, HEAD `b700eb3`
(PLT-3040 merge). ⚠️ The checkout is **shallow — 50 commits** — so `git log` cannot date when any of
the files below landed. Nothing was built or run (this env cannot).

### VERIFIED — both surfaces coexist in the shipped frontend

- **New (native) dashboard route is registered unconditionally**, with no feature-flag wrapper:
  `app/pages/project/routes.tsx:55-64` (`:project_id/dashboard` → `DashboardPage`, auth-gated only).
  The contrast in the *same file* is the tell: the Commissioning routes right below are wrapped in
  `{isCommissioningEnabled && …}` (`app/pages/project/routes.tsx:65-77`). The dashboard is not.
- **Legacy PowerBI route still exists:** `progress-dashboard/:id` → `ProgressReportPage`
  (`app/routes.tsx:59-66`), which embeds `<PowerBIEmbed>`
  (`app/pages/ProgressReportPage/ProgressReportPage.tsx:4, 163`) using a **per-project** config
  fetched from the backend (`ProgressReportPage.tsx:62`, `getProjectDashboardInfo`).

So "new dashboard" and "old dashboard" genuinely are two live things in Aug 2026 — consistent with
the PLT-3024 / PLT-2874 traffic this week that talks about both as current.

### ⭐ VERIFIED — the switch itself: `resolveDashboardUrl`

`app/helpers/dashboardNavigation.ts:6-21`:

1. `getFeatureFlagValue('Dashboard-Mode')` true → `/projects/${projectId}/dashboard` (`:7-9`)
2. otherwise call `serviceProvider.ProgressDashboard.getProjectDashboardInfo(projectId, { skipGlobalErrorHandler: true })` (`:11-15`)
3. **HTTP 404** (no PowerBI report mapped for this project) → `/projects/${projectId}/dashboard` (`:17-19`)
4. **anything else** (a report exists) → `/progress-dashboard/${projectId}` (`:21`)

**Read that backwards and it is the whole answer to this ticket:** a project keeps showing the old
PowerBI dashboard *precisely because the backend still has a PowerBI report mapped for it*. There is
no per-project FE setting, no org flag, no allow-list. "Migrating the demo to the new dashboard"
means, mechanically: (a) the project has progress artefacts in the new pipeline, and (b) its PowerBI
report mapping is gone so `getProjectDashboardInfo` 404s. Both are **backend / data-ops** acts.

Callers of the resolver (i.e. every entry point that can land you on either surface):
- Portfolio project-card "open dashboard" — `app/pages/PortfolioPage/PortfolioPage.tsx:97-105`
- Viewer toolbar dashboard button — `app/pages/organisation/ViewerPage/components/viewer-bar/tools/dashboard-mode-toggle.tsx:16-21`

### VERIFIED — two bypasses that keep a project on PowerBI regardless of the resolver

1. **Name-based V1 rule.** `isV1Project(projectName)` is a bare case-insensitive substring test for
   `'v1'` on the **project name** (`app/helpers/V1Rules/v1ProductionRules.tsx:2-4`). Portfolio checks
   it *before* the resolver and sends such projects straight to `/progress-dashboard/:id`
   (`PortfolioPage.tsx:100-102`) — the resolver is never called. "Mission Critical Dashboard" has no
   `v1` in it, so this should not apply here, **but only if the platform project name matches the
   phrase the client uses**, which is exactly the identity question this ticket has hung on since
   07-30.
2. **Dashboard-only users.** Anyone whose access is dashboard-only is hard-redirected to
   `${constants.url.progressDashboard}/${activeProjectId}` unconditionally, with no resolver call
   (`app/hooks/useProjectContext.ts:45-50`). If the client's demo audience are dashboard-only users,
   they land on PowerBI even for a fully migrated project. Worth knowing before anyone declares the
   demo "done".

### VERIFIED — `Dashboard-Mode` is NOT a rollout cohort, so there is no cohort to look up

Feature flags in this FE are read from a **browser cookie** named `feature-flags`, falling back to a
hardcoded list in which every flag is `false`
(`app/helpers/getFeatureFlagValue/getFeatureFlagValue.ts:6-15`; the list and the `Dashboard-Mode`
entry at `app/config/constants.ts:864` and `:886`; toggled by hand at
`app/pages/FeatureFlagsPage/FeatureFlagsPage.tsx:20-27`). There is **no org, tenant or user dimension
anywhere in that mechanism**. `Dashboard-Mode` is a local override for one browser — a developer/demo
convenience, not a rollout gate.

**Consequence, stated plainly:** the standing "feature flags often gate per-org, so we cannot tell
from code" caveat that earlier runs (and this run's own brief) carried is **wrong for this feature**.
There is no per-org gating to be blind to. What we are blind to is a **backend data fact** (does this
project have a PowerBI report row), which is a different and much cheaper question.

### AMENDS the 07-30 "Code check" section above — does not overturn its conclusion

The 07-30 note said: *"There is no FE toggle that flips a project from PowerBI to native"*. Half
right and half misleading, so recording the correction rather than deleting it:
- **Right:** relinking is not an FE code change, and the demo cannot be "repointed" the way a PowerBI
  report id can. That conclusion stands, unchanged.
- **Wrong/incomplete:** there *is* an FE resolver, `resolveDashboardUrl`, and it is decisive for which
  surface a user lands on. It just resolves from backend state instead of from configuration.

### What this does and does not answer for Yash's 07-27 question

- **Answered, generally and now verifiably:** the new dashboard is live, un-flagged, and is the
  **default** for any project that has no PowerBI report mapped. The April parking reason ("waiting
  on a non-PowerBI dashboard release") is definitively dead, not just probably dead.
- **Not answered, specifically:** whether *this* demo project has been migrated. That is backend row
  state plus artefact presence. Invisible from code, invisible from Jira, and this environment has no
  DB or analytics access. **Still needs a human — but a much smaller one than before.**
- **⭐ The cheap check that settles it (no DB, no analytics, ~30 seconds).** Open the project from the
  Portfolio and click through to its dashboard, then read the URL:
  - `…/projects/<id>/dashboard` → **already migrated**, the demo is on the new dashboard, nothing to do
    but tell Yash.
  - `…/progress-dashboard/<id>` → **still on PowerBI**, because a report is still mapped for it.

  This is not a proxy for the answer — it *is* the branch `resolveDashboardUrl` computes
  (`dashboardNavigation.ts:17-21`), so the URL is the ground truth. Caveat: do it with a normal
  account, not a dashboard-only one (bypass 2 above), and with `Dashboard-Mode` **off** in the flags
  cookie (bypass at `:7-9`), or the check answers a different question.

### Still true and carried forward unchanged

- The identity question ("is `69e232b2c222e55fa039eab2` the same asset as 'Mission Critical
  Dashboard'?") is unresolved and still unposted to Mostafa. **Note, though, that the URL check above
  bypasses it for PLT-2619's purposes** — you no longer need to know whether the two are the same
  project in order to answer Yash about *this* project. The Mostafa question remains worth asking for
  PLT-2935's own bookkeeping (its description still says "project name is not known yet"), but it is
  no longer on PLT-2619's critical path.
- Content of Yash's 08-03 client message on Freshdesk #6492: still invisible from here.
- Classification unchanged: mis-filed service request, not a live incident. **113 days** end-to-end,
  **107** in an untransitioned `With Customer`, zero engineering activity ever attached to this
  ticket.

### What remains UNVERIFIED after this run — 2026-08-14

1. **Whether the demo project currently 404s on `getProjectDashboardInfo`.** The one fact that
   decides the ticket. Backend state; not readable from code, Jira or this environment.
2. **The platform project name behind "Mission Critical Dashboard"**, and therefore whether the
   `isV1Project` name bypass (`v1ProductionRules.tsx:2-4`) applies to it. Unknown since April.
3. **Whether the demo project has progress artefacts in the new pipeline at all.** A 404 routes you
   to the native dashboard whether or not there is data behind it, so "migrated" and "useful for a
   demo" are two different checks. Nobody has done either.
4. **Whether the client's demo audience are dashboard-only users** (`useProjectContext.ts:45-50`),
   which would keep them on PowerBI regardless.
5. **When `resolveDashboardUrl` shipped.** The checkout is shallow (50 commits), `git log` on
   `app/helpers/dashboardNavigation.ts` returns one unrelated squashed commit. So this run cannot say
   whether the resolver existed in April — i.e. cannot say whether the April "awaiting release"
   answer was already stale when it was given.
6. **Anything about production rollout breadth** — how many projects are on each surface. No
   analytics access. `analyticsService.progressDashboardAccess(projectId, dashboardType)`
   (`app/services/analyticsService.ts:106-108`) does emit a `dashboard_access` GA event with a
   `dashboard_type` dimension, and it is fired from the **PowerBI** page only
   (`ProgressReportPage.tsx:68`, hardcoded `'project'`) — so GA can in principle answer "is this
   project still hitting PowerBI", but only someone with GA access can run it. Flagged as an option,
   not a finding.
7. **Freshdesk #6492 content** — unchanged gap, carried from 08-04.

## 2026-08-19 — re-verified, unchanged

Live fetch: status With Customer, priority Medium, assignee Yash Patel, 6 comments, `updated`
still `2026-08-03T15:13:28` — identical to the 08-18 record. Yash's 07-27 question ("can we update
this to new dashboard if not done already?") is now **23 days** unanswered. The two-branch drafted
reply in `recommended-action.md` remains correct and unposted; the "cheap fixes still undone" list
there (issue-link PLT-2619↔PLT-2935, deliberate transition after 112 days static) is also unchanged.

## 2026-08-20 — re-verified, unchanged

Live fetch: status With Customer, priority Medium, assignee Yash Patel, still 6 comments, `updated`
still `2026-08-03T15:13:28` — byte-for-byte identical to 08-19. Yash's 07-27 question is now
**24 days** unanswered. The two-branch drafted reply in `recommended-action.md` remains correct and
unposted; the 30-second URL check (open the demo project, read whether it's `/dashboard` or
`/progress-dashboard/<id>`) is still the only thing standing between this ticket and a reply.
