# PLT-2917 — "Progress Dashboard" (milestones wrong) — triage context

- **Domain slug:** `progress-tracking` (justification in §7)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2917
- **Type:** Live Incident · **Priority:** Major · **Status:** **Open**
- **Assignee:** **Yash Patel** (was Ilia Kuzmin; auto-reassigned 2026-07-22 09:31 by Automation-for-Jira when Ilia moved it to With-Technical-Support) · **Reporter:** Yash Patel · original client reporter: **Thomas**
- **Freshdesk:** Ticket 7420, status "Waiting on 3rd line" (i.e. back on us)
- **Project link given:** `https://cloud.xyzreality.com/progress-dashboard/69a964b9380af76aed8faa97` · Software Area: Dashboard
<<<<<<< HEAD
- **Created:** 2026-07-21 · **Attachments:** 1 screenshot (unreadable here — see §8 NEEDS HUMAN)
- **Recurrence:** Pietro Desiato already "worked on" this once; the customer replied it is *still* not fixed. Treat the earlier fix with suspicion per the playbook (symptom did **not** even disappear).
- Triage date: 2026-07-22 · **Re-checked 2026-07-24 — see §Update, new comments landed same-day as the 07-22 triage and were not yet folded in**

---

## ⚠️ Update — 2026-07-24: the actual reply posted differs from the draft, and a new clarification narrows the mechanism further

Three comments exist on the ticket, all timestamped 2026-07-22, that this file's body (below) does not yet account for:

1. **Ilia (07-22 09:30)** posted **three clarifying questions to Thomas** (via Yash) — which dashboard (old PowerBI-link vs new `/projects/<id>/dashboard`), re-attach the broken screenshots per project, and one concrete example per project in the "activity ID + shown vs expected" format. **This is a different question than the one `recommended-action.md` drafted** ("what did Pietro's earlier fix touch?") — the real reply asked the customer, not Pietro. Net: **this ticket is currently, correctly, in a With-Customer-shaped wait state** (even though its Jira status still reads "Open"), and no further action is needed from us until Thomas/Pietro answer.
2. **Mostafa (07-22 09:33) — new information, not previously captured:** *"it's a different issue. For activity **PMILE5030** in ELN03, he's done it to be 100% in the editor but Pietro is saying it's **not coming up in the activity parquet file**. Is that because it's a milestone? This is for the **power bi dashboard for portfolio**."* This is Mostafa clarifying that at least the ELN03 complaint is specifically about a milestone activity missing from the **PowerBI portfolio activity-parquet export** — a different (older) surface than the `PortfolioDashboardPage`/Milestone-widget mechanism this file diagnoses below.
3. **Yash (07-22 09:42)** apologizes for conflating the two — confirms this ticket now covers **both** the original Milestone-widget symptom (FAR01/ELN04/ELN03, §1-§4 below) **and** Mostafa's PMILE5030/PowerBI-export variant.

**Investigated (2026-07-24, hc-frontend + xyz-platform-context):** hc-frontend does **not** generate the activity parquet PowerBI reads — that pipeline is backend ("Progress Outputs" service → Azure Blob → consumed by the browser; `dashboard/data-pipeline.md:9-26`), and the native Dashboard is documented as **replacing** PowerBI, i.e. a separate surface (`dashboard/README.md:5`). No milestone-exclusion logic of any kind exists in this repo (checked the two activity-parquet schema docs under `docs/dashboard/api/` — neither has an `IsMilestone`/milestone-exclusion column). **So Mostafa's question ("is that because it's a milestone?") most likely resolves to the exact same mechanism already diagnosed below, not a separate export bug:** PMILE5030 is probably missing/wrong in the PowerBI activity parquet for the identical reason ELN03's other milestones look wrong in the native widget — **the schedule activity's Actual End Date was never stamped, even though the element is 100% installed** (§4 ELN03, and `portfolio-api.types.ts:123-146`, `reporting.vw_KeyMilestone`). Both the old PowerBI export and the new Milestone widget most likely read the same underlying schedule/Actual-End-Date source; a stamping gap there would explain both surfaces at once. This **raises** rather than lowers confidence in the existing diagnosis — it is corroboration from a second, independent surface (PowerBI export) rather than a competing hypothesis.

**Revised understanding:** this is not "milestones are excluded from the parquet because they're milestones" — no such rule exists in code anywhere we own. It is one more instance of "Actual End Date not stamped despite the work being 100% done," now confirmed to affect at least two surfaces (native Milestone widget + legacy PowerBI activity parquet) for the same activity family. **No action needed from us right now** — we are correctly waiting on Thomas's answers to Ilia's three questions (07-22). Revisit once the customer replies.

---
=======
- **Created:** 2026-07-21 · **Last updated:** 2026-07-27 · **Attachments:** 1 PNG + **1 XLSX (new 07-27)** — neither readable here, see §8
- **Recurrence:** Pietro Desiato already "worked on" this once; the customer replied it is *still* not fixed. His change remains undocumented and **still unanswered as of 07-30**.
- Triage dates: 2026-07-13 · 2026-07-22 · **2026-07-30 (this run — major scope change, see §0)**

---

## 0. RUN 2026-07-30 — WHAT CHANGED (read this first; it supersedes §2/§4 in part)

Three things happened after the 07-22 triage. **The ticket's scope was formally redefined**, and a
new decisive artifact arrived.

### 0.1 Timeline of everything after 07-22 09:30

| When | Who | What |
|---|---|---|
| 07-22 09:30 | **Ilia** (comment) | Posted 3 clarifying questions for Thomas: (1) *which* dashboard — the link is the **old PowerBI dashboard**, or the new `/projects/<id>/dashboard`? (2) re-attach the screenshots, one per project — **the inline images in the description are broken**; (3) per project, one example: activity ID + shown-vs-expected; and is it (a) milestone status/date display, (b) progress % in the schedule panel, or (c) 3D highlighting? |
| 07-22 09:31 | Ilia → Automation | Status **Open → With Technical Support**; Automation auto-reassigned **Ilia → Yash** |
| 07-22 09:33 | **Mostafa** (comment) | ⚠️ **SCOPE CHANGE.** *"it's a different issue. For activity **PMILE5030** in **ELN03**, he's done it to be **100% in the editor** but **Pietro is saying it's not coming up in the activity parquet file**. **Is that because it's a milestone?** This is for the **power bi dashboard for portfolio**."* |
| 07-22 09:42 | **Yash** (comment) | Confirms it: *"the issue mentioned in Description above was looked into by Pietro. **This ticket is raised for the issue user is having as mentioned by Mostafa.**"* |
| 07-23 15:54 | Yash | Status **With Technical Support → Open** — **with no comment and none of Ilia's 3 questions answered** |
| **07-27 10:55** | **Yash** (comment + attachment) | Client update: *"Little update about ELN03. [screenshot] **All milestones are not updated.** Please have look when free."* — plus new attachment **`ELN03 Milestones Dashboard.xlsx`** (203 KB) |

### 0.2 The four consequences

1. **Ilia's Q1 is answered: the surface is the old PowerBI portfolio dashboard**, not our new
   Milestone Performance widget. That retires the 07-22 run's `PortfolioDashboardPage` framing as
   *the customer's surface* (§2 caveat resolved — it was the wrong surface). The FE findings in §3–§4
   are still **true and still relevant**, because both surfaces read the same schedule/progress data
   layer, and PLT-2763 (our widget) is now **In QA Testing** — it will inherit the same defect.
2. **Ilia's Q2/Q3 were never relayed to Thomas.** Yash flipped the ticket back to Open on 07-23
   without answering them. The description's three screenshots are **still lost** (§8).
3. **The ticket now carries two signals again.** Yash scoped it (07-22) to Mostafa's PMILE5030 /
   parquet question, but the 07-27 client update is the *original* ELN03 "all milestones should be
   done" thread. Per the playbook this needs an explicit split — except that this run finds they are
   **the same root cause** (§0.3), which is the useful finding.
4. **Pietro's earlier undocumented fix is still unasked/unanswered** — 9 days later. Open loop.

### 0.3 UPDATED ROOT-CAUSE HYPOTHESIS (code-verified, replaces the 07-22 "backend/data, unspecified")

**Mostafa's question — "is that because it's a milestone?" — can be answered YES, with a precise
mechanism, and the answer is stronger than "the parquet is missing a row".**

**A milestone can never be driven to "done" from inside the platform, by design, because the
platform has no write path to Actual Finish Date — and Actual Finish Date is what every
milestone-completion view reads.**

Verified end-to-end in `hc-frontend` (current `main`, this run):

- **What the user did.** In the Gantt, the *Actual % Complete* cell is inline-editable **only when the
  activity has no linked 3D elements**:
  `scheduler-columns.tsx:150` → `isEditable = task.activityItem?.progressValid === true && !hasLinkedElements`,
  same rule in `use-actual-progress-mutation.tsx:36-41` (`isActivityEditableForProgress`: not WBS,
  `elements > 0` ⇒ false, requires `validForProgressCalculations === true`). A milestone like
  PMILE5030 has **zero linked elements**, so the UI **invites** a manual 100%. Linked activities get
  the read-only tooltip *"Values are driven via linked elements."* (`gantt-tooltip.tsx:18`).
- **Where that 100% goes.** `useActualProgressMutation` →
  `serviceProvider.Activity.updateActualProgress(projectId, dayjs().format('YYYY-MM-DD'), [{activityId, progress}])`
  → **`POST /projects/{id}/activities/progress`** with body `{calendarDate, activitiesProgress}`
  (`activity-api-service.ts:257-266`). On success the row is flagged `isUserProgress = true`
  (`use-actual-progress-mutation.tsx:86-97`) and a success toast fires
  (*"Actual % Complete updated to 100%"*).
- **⚠️ Two things that write is NOT.** (i) It carries **`calendarDate = today`**, not the milestone's
  real completion date — so a milestone finished months ago is stamped with the edit date.
  (ii) **It does not touch `actualFinishDate`.** Exhaustive grep of the whole activity API surface
  (`activity-api-service.ts`, all 40+ methods) shows `POST .../activities/progress` is the **only**
  activity-progress write, and **no FE code path anywhere writes `actualStartDate` /
  `actualFinishDate`** — every occurrence is a read
  (`api-activities-loader.ts:100-101`, `dashboard-schedule-service.ts:474-475/506-507`,
  `use-dashboard-schedule-data.tsx:201-202`). Actual dates enter the system **only** from the
  uploaded P6/XER schedule (`schedule-parser.ts:159-170`, `getFirstValidDate(['act_end_date', …])`).
- **What the milestone views read.** `actualDate` on the milestone row **is the Actual End Date**, and
  *"Non-null ⇒ the milestone is complete"* (`portfolio-api.types.ts:131`); it is passed through raw
  from **`reporting.vw_KeyMilestone`** (`:115-138`). Same for the PowerBI portfolio milestone view,
  which reads the same reporting layer.

⇒ **The loop is open by construction.** Set a milestone to 100% in the editor → a user-progress row
lands in api-v2 dated *today* → **Actual Finish Date is still null** → `vw_KeyMilestone` /
PowerBI / our widget all still say "not done". Pietro's own diagnosis — *"the Actual End Date should
have a value but it doesn't"* — and Mostafa's — *"100% in the editor but not in the activity parquet"* —
are **the same defect seen from two ends**. That unifies the 07-21 description thread (ELN03 "all
milestones should be done") with the 07-22 redefined thread (PMILE5030) into **one root cause**.

**Secondary, corroborating:** progress is **weight-averaged** by `TotalPlannedLaborUnits` (default) or
`TotalLinkedElements` (`progress-queries-v2-api.ts:166-167/373-374/518-519/655-656`), and
`dashboard/progress-tab.md:55` states zero-weight rows are *excluded from the denominator*. A
milestone has zero duration, zero labour units and zero linked elements ⇒ **zero weight on every
path**, which is the most likely reason it never materialises in the activity parquet at all. And the
native SCH query `LEFT JOIN progress_delta … COALESCE(p.ActualProgress, 0) as ActualPercent`
(`dashboard-schedule-service.ts:~455-490`) means an activity **absent from `activity_progress` renders
as 0%**, not as blank — exactly the reported symptom.

### 0.4 What this means for FAR01 and ELN04

The 07-30 evidence speaks directly only to **ELN03 / PMILE5030**. The other two remain as diagnosed on
07-22 (§4), *unconfirmed*, and are now **lower priority** because the ticket was formally rescoped:

- **FAR01 (none showing)** — still either zero Key-Milestone rows, or a `projectId` join-miss silently
  dropped at `portfolioMilestonesData.ts:53`. Note this is a **new-widget** symptom; if Thomas is on
  PowerBI it may not even be the same surface. **Needs the screenshot he was asked for.**
- **ELN04 (past = late, future = done)** — still "the view emits `status`/`actualDate` inconsistent
  with the timeline". The §0.3 mechanism gives a plausible *specific* vector: an `actualDate` derived
  from a **user-progress `calendarDate` = edit date** rather than a real finish date would place a
  completed-looking marker in the future (`dueDate = actualDate ?? forecastDate ?? plannedDate`,
  `portfolioMilestonesData.ts:83`). **Plausible, not verified.**

### 0.5 Code re-verification (does the 07-22 FE finding still hold?)

**Yes, unchanged.** Since the widget shipped (`83c5c11`, PLT-2763, 07-10) the only commits touching
`PortfolioDashboardPage/` or `portfolioService/` are `da8877d` (PLT-2900 permissions scaffolding) and
`9bfa0cd` (PLT-2628 status counts) — neither touches milestone logic. `milestoneStatus.ts` is still a
pure `status`-string → label/colour switch with **no date input**; `portfolioMilestonesData.ts` still
derives `dueDate` for position only and still uses `actualDate != null` for the KPI "complete".
Sibling tickets PLT-2918 / PLT-2906 shipped nothing that touches this path.

**Doc inaccuracy spotted:** `docs/dashboard/duckdb-tables/schedule-schemas.md:66` says `itemType` is
e.g. `"Task" | "Milestone"`. In the actual code the value domain is **`Activity` | `WBS`**
(`progress-queries-v2-api.regression.test.ts:445` filters `itemType = 'Activity'`;
`use-actual-progress-mutation.tsx:38` and `useShowWBS.ts:23` branch on `'WBS'`/`'Activity'`).
So **milestones are not distinguishable by `itemType` in our data** — they arrive as ordinary
`Activity` rows with zero duration/labour/elements. Worth fixing in the doc, and it matters: any
proposed "handle milestones specially" fix needs a real discriminator first.

⚠️ **Latent product/UX defect found this run (independent of the data fix):** the Gantt lets a user
type 100% on exactly the activities where it cannot possibly affect milestone completion (no linked
elements ⇒ editable), and then shows a **green success toast**. The user is told the edit worked; the
dashboard never changes. This is a genuine PLT-side item — see recommended-action.
>>>>>>> origin/main

---

## One-line symptom

On the **Milestone Performance widget** of the Portfolio ("Progress") Dashboard, milestone
markers render with the wrong done/late/complete state for three projects — and for one project
(FAR01) none render at all. The state shown is **whatever the backend classifies each milestone
as**; the frontend does not compute it (see §3–§4). So this is almost certainly a **backend
data / view defect**, not a frontend rendering bug.

**Verbatim description (Thomas):**
> Within the Progress dashboard, the milestone are not showing properly.
> **FAR01** → None are showing (mapped as Key Milestones).
> **ELN04** → Milestones in the past show late and the one in the future look done (mapped as key milestones too).
> **ELN03** → All milestones should be done.

**Verbatim follow-up (via Yash, relaying Pietro + client):**
> "This is not fixed. ELN03 → Dh4 Ready for energization = 100% → not showing 100%. All the others too."
> Pietro: *"the Actual End Date should have a value but it doesn't."*

---

## 2. What is the surface? (which page / widget)

The failing widget is the **Milestone Performance** widget — a per-project "upcoming milestones"
gantt that groups project tracks by region and draws one diamond per key milestone. It exists in
**exactly one place** in the codebase: `PortfolioDashboardPage`.

- Widget registered only there: `PortfolioDashboardPage/dashboardWidgets.config.tsx:29`
  (`{ id: 'milestone', component: () => <MilestoneWidget /> }`); no other page imports
  `MilestoneWidget` (grep: single usage).
- The widget shipped **2026-07-10** in PR #2031 / **PLT-2763** (`git show 83c5c11`) — it has **no
  prior history**. The ticket was raised **2026-07-21**, 11 days later. This is a brand-new
  feature meeting real client key-milestone data for the first time (see §6, "why now").

⚠️ **Route-vs-widget caveat (NEEDS HUMAN, §8):** the pasted URL `progress-dashboard/<24-hex id>`
resolves to `ProgressReportPage`, not `PortfolioDashboardPage` (`routes.tsx:88-104`; the id is a
24-hex Mongo project id per `useAnalytics.tsx:11-12`). The Milestone widget lives on
`PortfolioDashboardPage` (route `progress-dashboard`, **no id**). The multi-project FAR01/ELN03/
ELN04 tracks in the report are unambiguously the Milestone-widget layout, so the diagnosis targets
that widget — but confirm from the screenshot which surface Thomas is on. Note also that
`usePortfolioId()` **ignores the URL id** and always resolves the tenant's **default** portfolio
(`usePortfolioId.ts:26-29`), so the widget's data set is "the default portfolio's milestones",
independent of the link.

---

## 3. What decides done / late / on-track / complete? (mechanism, playbook Q4)

**The frontend decides none of it. Every milestone's status is passed through raw from the
backend, and the FE is a faithful renderer.** This is the single most important finding and it
reframes all three symptoms as backend/data issues.

**Status → colour is a pure lookup, no dates involved:**
- `utils/milestoneStatus.ts:14-30` `getMilestoneStatusMeta(status)` maps the string
  `COMPLETE → "Complete"` (dark green), `ON_TRACK → "On track"`, `AT_RISK → "At risk"`,
  `MISSED → "Late"`, anything else → grey "Unknown". **It takes only `status`; it never reads a
  date and never compares to "now".**
- The diamond colour is set from that map in `MilestoneMarker.tsx:100` (stacks) and `:122`
  (single). There is **no** date-vs-today branch anywhere in the marker.

**Where the status comes from — the backend view:**
- `portfolio-api.types.ts:115-138` documents `PortfolioMilestone`: *"Values are passed through raw
  from the DB (**`reporting.vw_KeyMilestone`**) — the API does not normalise them… `MISSED` (not the
  swagger enum's `LATE`) is the value on the wire… may be null / an unknown string."* The row
  carries `status`, `plannedDate`, `forecastDate`, `actualDate`, `slippageDays`.
- `actualDate` **is the milestone's Actual End Date**: *"Non-null ⇒ the milestone is complete"*
  (`portfolio-api.types.ts:131`).
- API call is a thin GET: `portfolio-api-service.ts:55-60` `getPortfolioMilestones()` →
  `GET /api/v2/portfolios/:id/milestones`; no transformation.

**What the FE derives from dates (and it is *not* done/late):**
- `dueDate = actualDate ?? forecastDate ?? plannedDate` → **marker position only**
  (`portfolioMilestonesData.ts:83`; test `:75-89`).
- "Complete" for the KPI strip = `actualDate != null` (**not** `status === 'COMPLETE'`) —
  `portfolioMilestonesData.ts:118` + comment `:117`, and `:137` for "due in 30 days"; test
  `:113-121, 142-151`.

So the FE has **two independent "complete" signals fed from the same backend row**: the diamond
colour (from `status`) and the KPI "on-time"/due logic (from `actualDate`). If the backend sets one
but not the other, colour and KPIs can disagree — but both still originate in `vw_KeyMilestone`.

---

## 4. The three symptoms as separate mini-diffs (playbook Q3)

Treated distinctly, per the playbook. All three resolve to the backend row content, but via
different code paths.

### FAR01 — zero milestones render
Two backend/data conditions produce this; the FE cannot invent markers:
- **(a) `/milestones` returns no rows for FAR01** — no activities are flagged Key Milestone in
  `vw_KeyMilestone` for that project, or FAR01 isn't in the resolved (default) portfolio.
- **(b) `projectId` join miss** — a milestone renders only if `milestone.projectId` matches a
  project's `projectId` from `GET /portfolios/:id/dashboard`. The join is at
  `portfolioMilestonesData.ts:51-57`; **unmatched milestones are silently dropped** at
  `if (!project) continue` (`:53`). This exact "orphan dropped" behaviour is pinned by the unit
  test `portfolioMilestonesData.test.ts:63-72`. If `vw_KeyMilestone` emits a different id family for
  FAR01 than `/dashboard` does (e.g. Postgres `projectId` vs `mongoProjectId`), every FAR01
  milestone is dropped even though the endpoint returned rows.
- Either way FAR01 still appears as an **empty track row** (a row is created for every allowed
  project regardless of milestones — `portfolioMilestonesData.ts:39-48`), which matches "none are
  showing" (row present, no diamonds).

### ELN04 — past milestones look "late", future ones look "done"
- Diamond colour is 100% `status` from `vw_KeyMilestone`; position is `dueDate`. A **future**
  diamond coloured dark-green means the backend returned `status = COMPLETE` (and/or a **future
  `actualDate`**, which also pushes the marker into the future via `:83`). A **past** red diamond
  means `status = MISSED`.
- **This is NOT the frontend date-comparison bug the brief hypothesised.** The FE performs no
  "is this before/after now → late/done" logic at all (§3). The inverted *look* means the backend
  view is emitting statuses/`actualDate`s inconsistent with the planned timeline — a data/view
  defect. (Most likely vector: `actualDate` populated for not-yet-due milestones, or `status`
  mis-derived from a stale/incorrect Actual End Date source.)

### ELN03 — "all should be done", not showing 100% / not Complete
- Completion here = `status === 'COMPLETE'` (colour) and/or `actualDate != null` (KPI), both from
  `vw_KeyMilestone`, which reads the schedule activity's **Actual End Date**. Pietro's own
  diagnosis — *Actual End Date should have a value but doesn't* — **is exactly this mechanism**:
  the view has no actual-finish date for these activities, so they are neither coloured Complete
  nor counted on-time.
- **Definitional trap to flag:** the customer says *"Dh4 Ready for energization = **100%** → not
  showing 100%."* The Milestone widget has **no percentage** — it shows status + dates only
  (`MilestoneExplanation.tsx` describes only On-time %, slippage, delayed-this-month, due-in-30).
  The "100%" is a **progress/installation** metric shown elsewhere. So the true complaint is *"the
  activity is 100% installed but its milestone isn't marked Complete."* That is the classic
  **cross-source mismatch**: installation/progress % (element status) says done, but the
  **schedule activity's Actual Finish** (what `vw_KeyMilestone` reads) was never stamped. This
  single mismatch is the through-line candidate behind all three symptoms.

---

## 5. Expected behaviour, on whose authority? (playbook Q2)

- **In-product authority** for what the widget means: `MilestoneExplanation.tsx:3-8` — On-time %,
  average slippage, delayed-this-month, due-in-30. It defines *metrics*, not the done/late colour
  rule; the colour semantics live only in code (`milestoneStatus.ts`) and the DB view.
- **"All milestones should be done" (ELN03) is a client claim about the schedule, not a named
  spec.** Whether those activities *are* complete is exactly what must be checked against
  `vw_KeyMilestone` / the schedule's Actual End Date — do not take "should be done" as ground truth
  (playbook Q2: the reference itself may be the folklore).
- **"Mapped as Key Milestones"** (Thomas) is the client's assertion that these activities carry the
  Key-Milestone flag the view keys on. For FAR01 that mapping is precisely what may be missing or
  emitting a mismatched project id (§4 FAR01).

---

## 6. Why now? (trigger, playbook Q5)

- **Primary:** the Milestone Performance widget is **11 days old** — shipped 2026-07-10 (PR #2031 /
  PLT-2763), ticket raised 2026-07-21. This is the feature's first contact with real client
  key-milestone data, so any pre-existing gap in `vw_KeyMilestone` / Actual-End-Date population for
  FAR01/ELN03/ELN04 surfaces now for the first time. There is no "it worked before" to honour.
- **Secondary / must-ask:** Pietro already "worked on" this once and it recurred, with **no ticket
  or PR reference recorded**. His change is undocumented — it may have been a **data-side action**
  (e.g. re-mapping which activities are Key Milestones, or stamping some Actual End Dates) rather
  than code. Per the playbook, an undocumented prior fix during a live issue destroys attribution;
  we must ask him what he touched before re-diagnosing (§8, and recommended-action). If his fix was
  data-only, the recurrence means either it didn't cover FAR01/ELN04 or the data reverted.

---

## 7. Domain slug — why `progress-tracking`

Milestones are a **progress/schedule** concept (key schedule events, planned-vs-actual dates,
slippage), and the fix will live in the progress/schedule data path (`vw_KeyMilestone`, schedule
Actual End Date) — the closest of the allowed slugs is `progress-tracking`. Caveats: (a) the widget
is on `PortfolioDashboardPage`, not the in-viewer Dashboard Progress tab documented in
`dashboard/progress-tab.md`; (b) the operative defect is backend/data, so a `data-pipeline` filing
is also defensible. `progress-tracking` is the best single fit; flag for re-file if the board keeps
a portfolio-dashboard home.

---

## 8. NEEDS HUMAN (unreadable media, undocumented prior fix, data I can't query)

### 8a. Attachments / media — ⚠️ ALL FOUR ARE UNREADABLE BY THE AGENT (updated 2026-07-30)

I attempted to fetch the attachment binaries and got **HTTP 403** from
`api.atlassian.com/…/attachment/content/…` (Atlassian auth; the MCP tool exposes metadata only, not
file bytes). **Nothing below has been read — the descriptions are inferred from surrounding text and
from the image dimensions in the ADF payload. Ilia must open these and backfill this section.**

| # | Artifact | Where | What it probably shows | Value |
|---|---|---|---|---|
| 1 | **`ELN03 Milestones Dashboard.xlsx`** (id 61396, 203 KB, added by Yash **2026-07-27 10:55**) | Jira attachment | Almost certainly the client's **export of ELN03's milestone list** — one row per milestone with planned / forecast / **actual** dates and a status or % column — the evidence behind *"All milestones are not updated."* 203 KB is far too big for a handful of rows, so it likely contains the **full ELN03 activity/milestone set**, possibly multi-sheet. | 🔴 **DECISIVE.** This is the single most load-bearing artifact on the ticket and it is brand new. If it contains an **Actual End Date column that is populated in the client's own source schedule** while our system shows null, that flips the diagnosis from "P6 never had the actual date" to "we dropped it on ingest" — a materially different fix. **Open this first.** |
| 2 | `image-20260721-123812.png` (id 61115, 47 KB, **1533 × 223**) | Jira attachment, inside Yash's 07-21 comment | A **wide, very short strip** — a single table/grid row. Given the caption, near-certainly the **ELN03 "Dh4 Ready for energization"** row showing a value that is not 100%. | 🟡 Corroborative — the text already states the claim. |
| 3 | Inline screenshot in the **07-27** comment (**1872 × 594**) | **Freshdesk-hosted** (`eucattachment.freshdesk.com`, JWT in URL) — **not** a Jira attachment | Landscape, dashboard-sized. Likely the **ELN03 milestone table or gantt** as Thomas currently sees it, with milestones showing not-updated. | 🟠 Important — it finally shows *which* surface Thomas is on (the unanswered Q1). **Requires Freshdesk access, not Jira.** |
| 4 | **The 3 description screenshots** (FAR01 / ELN04 / ELN03) | Description body | **Genuinely broken in Jira** — they serialise as `UNKNOWN_MEDIA_attachment` with `url=null` and `id=null`; there are no matching attachment records. This is **not** an agent access limitation: nobody can see them, which is exactly what Ilia reported on-ticket on 07-22. | 🔴 **Lost.** Only re-attachment by Thomas recovers them. He was asked on 07-22 and **never answered** (ticket was flipped back to Open on 07-23 without a reply). These are the only evidence that ever existed for **FAR01** and **ELN04**. |

### 8b. Other gaps
- ⚠️ **Pietro's earlier fix is undocumented** — no ticket / PR / commit reference. **Ask him
  exactly what he changed** (code? a Key-Milestone re-mapping? stamping Actual End Dates? which
  projects?) *before* re-diagnosing, or we risk re-investigating something already ruled out and
  mis-attributing the recurrence. (Playbook: announce/record every fix action; an undocumented one
  is an open loop.)
- ⚠️ **Raw `/portfolios/:id/milestones` payload** for FAR01 / ELN03 / ELN04 (or a direct
  `reporting.vw_KeyMilestone` query) — I have no env/API/DB access. This is the decisive artifact:
  it shows, per milestone, the `status`, `actualDate` (Actual End Date), `plannedDate`,
  `forecastDate`, and `projectId` the FE actually receives. That settles FAR01 (zero rows vs
  join-miss), ELN04 (are future rows `COMPLETE` / future-`actualDate`?), and ELN03 (is `actualDate`
  null where it should be set?).
- ⚠️ **Which portfolio / project ids** — confirm the tenant's default portfolio (what
  `usePortfolioId` resolves) actually contains FAR01/ELN03/ELN04, and whether the FAR01
  `projectId` in `vw_KeyMilestone` matches the `/dashboard` project id.

---

### 8c. The three live-only diagnostics that close the remaining gap (2026-07-30)

None of these are answerable from code. Each needs env/DB access or a person.

1. **`api_activities` row for PMILE5030 (ELN03).** Is `actualFinishDate` null? Is
   `validForProgressCalculations` true? Is `plannedLaborUnits` 0? Is `linkedElementCount` 0?
   → *Owner: Sachin / Ali (api-v2).* This single row confirms or kills §0.3 outright.
2. **Does PMILE5030 appear in `activity_progress` / the reporting parquet at all**, and if so with
   what `CalendarDate` and `ActualProgress`? Does the pipeline drop zero-weight activities, and does
   it consume `isUserProgress` rows from `POST /activities/progress`?
   → *Owner: David Webb (DPL / data-pipeline — he owns `DPL-1627`, the milestone-widget processing).*
3. **Pietro's earlier undocumented fix** — code or data? which projects? still unanswered since 07-21.
   → *Owner: Pietro.*

Plus the unanswered process gap: **Ilia's 3 questions to Thomas (07-22) were never relayed** — Yash
reopened the ticket on 07-23 without them. FAR01 and ELN04 cannot progress without those screenshots.

---

## 9. Confidence (per xyz-platform-context CLAUDE.md scale)

- **FE is a faithful renderer; done/late/complete are all backend-supplied (no FE date logic for
  status):** **9/10** — read every relevant line (`milestoneStatus.ts`, `MilestoneMarker.tsx`,
  `portfolioMilestonesData.ts`, `portfolio-api.types.ts`) plus the unit tests.
- **Root cause is backend `vw_KeyMilestone` / Actual-End-Date population (common thread across all
  three symptoms):** **6/10** — strongly supported by the code path + Pietro's own diagnosis, but
  **not yet verified against the actual `/milestones` payload** for these three projects. FAR01's
  zero could alternatively be a `projectId` join mismatch (a data-shape issue, still backend, but a
  different fix) — cheaply testable.
- **This is NOT primarily a frontend bug:** **8/10** — the FE contains no logic that could produce
  the reported done/late inversion; the one *latent* FE weakness is the silent join-drop
  (`portfolioMilestonesData.ts:53`) which hides FAR01 rows with no warning.

**Overall triage confidence: ~6/10.** Mechanism and layer are clear; the exact backend cause per
project needs one data-payload step.

### 9b. Confidence after the 2026-07-30 re-investigation (supersedes the above)

| Claim | Conf. | Basis |
|---|---|---|
| FE is a faithful renderer; milestone done/late/complete are all backend-supplied; **code unchanged since 07-22** | **9/10** | Re-read every file; git log confirms no milestone commits since `83c5c11` |
| **The platform has no write path to Actual Finish Date** — `POST /activities/progress` is the only activity-progress write and it does not touch `actualFinishDate`; actual dates enter only from the uploaded XER | **9/10** | Exhaustive grep of `activity-api-service.ts` + every `actualFinishDate` reference is a read (§0.3) |
| Therefore **setting a milestone to 100% in the editor can never mark it complete** in `vw_KeyMilestone` / PowerBI / the widget — i.e. **Mostafa's "is it because it's a milestone?" = YES** | **8-9/10** | Follows from the above + `portfolio-api.types.ts:131` (*non-null `actualDate` ⇒ complete*). Residual risk: an api-v2 server-side rule could derive `actualFinishDate` from a 100% user-progress row — invisible to FE code. **Check #1 in §8c settles it.** |
| Milestones are missing from the activity parquet because they are **zero-weight on every weighting path** | **6/10** | Strong circumstantial (weighting code + `progress-tab.md:55` + `COALESCE(…,0)` rendering 0%), but the parquet job is backend — **needs check #2** |
| ELN03 description thread and the PMILE5030 thread are **one root cause, not two** | **8/10** | Both reduce to "Actual End Date never stamped"; matches Pietro's *and* Mostafa's independent observations |
| FAR01 / ELN04 share this cause | **3/10** | Unverified; their only evidence (the description screenshots) is **lost** (§8a #4) |
| This is **not** a frontend bug to fix on the PLT board | **8/10** | The customer-visible fix is in the schedule-ingest / reporting layer. The one genuine PLT-side item is the **UX defect in §0.5** (editable + success toast on an edit that cannot take effect) |

**Overall triage confidence: ~8.5–9/10 on mechanism and on who should own it next** — up from 6/10.
The last ~5–10% is **not obtainable from code**: it needs the xlsx opened (§8a #1) and the two
backend row-checks (§8c #1–#2). Stated explicitly rather than guessed, per the brief.

---

## 10. Doc / KB refs

- `dashboard/progress-tab.md` — Dashboard Progress tab (the in-viewer progress surface); the
  Milestone widget is **not** documented here (nor anywhere in `dashboard/` — grep for "milestone"
  returns zero). **Doc gap** to close after resolution: add a note that milestone status is
  backend-supplied (`reporting.vw_KeyMilestone`), FE renders it verbatim, and completion depends on
  the schedule activity's Actual End Date.
- `dashboard/pitfalls.md` — no existing milestone-date pitfall.
- Sibling triage `PLT-2882` / `PLT-2874` — precedent that "count/status wrong on screen" often
  resolves to a backend/data source, not FE; same investigate-the-payload-first discipline applies.
- `incidents/live-incident-playbook.md` — six-questions frame + message craft used above.
