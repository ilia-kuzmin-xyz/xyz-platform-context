# PLT-2917 — "Portfolio Progress Dashboard" (milestones wrong) — triage context

- **Domain slug:** `progress-tracking` (justification in §7)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2917
- **Type:** Live Incident · **Priority:** Major · **Status:** **Open**
- **Summary field:** renamed **2026-07-31 13:57** by Yash, `Progress Dashboard` → **`Portfolio Progress Dashboard`** (changelog, verified 08-04). Small but useful: the surface ambiguity Ilia raised on 07-22 is now settled *in the ticket title itself*.
- **Assignee:** **Ilia Kuzmin** — ⚠️ **corrected 2026-08-04.** Prior runs recorded "Yash". Changelog shows Yash reassigned **Yash → Bailey Cotnoir at 07-31 13:33:34**, then **Bailey → Ilia at 07-31 13:33:37** (3 seconds later, same author). So it has been Ilia since 07-31, *before* the 08-03 run wrote "assignee is still Yash" — that statement in §0.6 was wrong. · **Reporter:** Yash Patel · original client reporter: **Thomas**
- **Freshdesk:** Ticket 7420, status "Waiting on 3rd line" (i.e. back on us)
- **Project link given:** `https://cloud.xyzreality.com/progress-dashboard/69a964b9380af76aed8faa97` · Software Area: Dashboard
- **Created:** 2026-07-21 · **Last updated:** 2026-08-03T15:10:58+0100 · **Comments:** 17 · **Attachments:** 4 (PNG 07-21, XLSX 07-27, XLSX 07-31, PNG 07-31) — **still none readable here; re-confirmed HTTP 403 on 08-04, see §8a**
- **Recurrence:** Pietro Desiato already "worked on" this once early on; the customer replied it was *still* not fixed. That earlier fix stayed undocumented for 9 days — **partly resolved by the 07-31 developments (§0.6): Pietro found and says he fixed the PBI-side gap. As of 08-04 that fix is still unconfirmed as shipped (§0.7).**
- Triage dates: 2026-07-13 · 2026-07-22 · 2026-07-30 · 2026-08-03 (§0.6) · **2026-08-04 (this run — delta pass; see §0.7. Falsifies one §0.6 guess and corrects two §0.6 facts.)**

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

---

## 0.6 RUN 2026-08-03 — Pietro found and fixed the actual gap; two decisions now sit with product

**New comments since 07-30, all same day (07-31), none yet reflected in any prior pass:**

| When | Who | What |
|---|---|---|
| 07-31 13:33 | Yash | "any updates on this?" |
| 07-31 13:34 | Yash | relays a further client file (another copy of the ELN03 milestones spreadsheet) |
| 07-31 13:54 | **Pietro** | *"For clarification, this is not showing correctly on the **PowerBI Portfolio Dashboard**, it's not the progress dashboard."* Then asks Mostafa if it's about how actual start/end date are calculated. |
| 07-31 14:00 | Mostafa | restates the real question: *"why are these milestones not showing up in the progress parquet if we entered in the progress on the editor"* |
| 07-31 14:09 | Pietro | asks **Rishi Bhugobaun** how these values are retrieved |
| 07-31 14:43 | **Rishi** | **Answers the mechanism directly, independently of this file's §0.3 code trace and matching it almost exactly:** the parquet holds only *calculated* progress; a user override is saved separately in `xyz."ActivityProgress"`; the API merges parquet + DB values at request time and flags overridden rows `isUserProgress: true`. **For the PowerBI Portfolio dashboard specifically, the fix is to join on `xyz."vw_CurrentUserDefinedProgress"` or `xyz."ActivityProgress"`** to pull in the user-defined %. This is the PBI-side join that was missing — confirms this file's diagnosis (Actual Finish Date never written) from one level up: the *symptom* Rishi is fixing is "user overrides never reach PBI", which is the parquet-side face of the same "no write path to Actual Finish Date" defect, now with a concrete backend remedy that does not require writing `actualFinishDate` at all — it surfaces the *existing* override table to PBI instead. |
| 07-31 16:33 | Pietro | checked the table for APLD projects — came back **empty** (screenshot) |
| 07-31 16:49 | **Pietro** | *"ok we got it working - will update and test the PBI to integrate the user values"* — the fix is in hand, not yet shipped |
| 07-31 16:49 | Pietro | asks Mostafa/Darminder: **"should we remove the feature flag for user progress since users are using it?"** — this is the `Editor-Progress` flag (`constants.ts:866,887`, default `false`) gating the whole manual-override Gantt path (research this run, hc-frontend) |
| 07-31 17:07 | Mostafa | *"there's one remaining task which needs to be done, which Darminder already has the designs for [image]"* — **unspecified**; no PR, ticket, or Figma link found anywhere in hc-frontend as of this run (confirmed via git log + repo-wide search) |

### What this changes

1. **The 07-30 draft's two open asks (David Webb on parquet zero-weight rows, Sachin/Ali on the `api_activities` row) are now moot for the PBI-side fix.** Rishi answered the load-bearing question directly and named the exact join (`vw_CurrentUserDefinedProgress` / `ActivityProgress`) without needing either lookup. Pietro is already implementing it. **Do not post the 07-30 draft comment as-is** — it would ask two people to chase something a third person just solved from a different angle.
2. **Two decisions are now open, both product/Mostafa+Darminder+Pietro's, neither ours to make:**
   - Remove the `Editor-Progress` feature flag (make manual milestone-progress override generally available, since "users are using it")? — Pietro asked, unanswered as of 08-03.
   - What is "the remaining task" with Darminder's existing designs? Given the §0.5 latent UX finding this file already flagged (Gantt invites a 100% edit on milestones that shows a success toast but can never move the dashboard), **this is very plausibly that same UX fix** — but it is not confirmed, and could equally be a different, unrelated design. **Needs one clarifying question**, not an assumption.
3. **This ticket is close to resolved on the customer-facing complaint** (ELN03/PMILE5030 thread) once Pietro's PBI update ships and is verified against the client's own xlsx export. FAR01/ELN04 remain unconfirmed and still need the screenshots Thomas never re-sent (§8a #4) — that part of the original description is untouched by this fix and should not be assumed closed alongside it.
4. **Assignee is still Yash** (auto-reassigned 07-22, never reverted per the 07-30 recommendation to reassign back to Ilia) — worth revisiting now that the mechanism is externally solved and what's left is two product/design questions, not engineering investigation.

### Revised confidence

- **PBI-side fix is real, mechanism-matched, and in progress (not yet shipped/verified): 8/10** — Rishi's answer independently corroborates this file's own §0.3 diagnosis via the parquet-merge mechanism, and Pietro confirmed "got it working," but no comment yet says the PBI report was actually republished or that the client re-checked ELN03.
- **"Remaining task w/ Darminder's designs" = the §0.5 UX fix: 4/10** — plausible, unconfirmed, needs one direct question rather than being carried forward as an assumption.
- **FAR01/ELN04 unaffected by this fix: 7/10** — those symptoms were never mechanistically tied to the user-override/PBI-join gap Rishi/Pietro just addressed; they still need their own screenshots.

---

## 2026-08-04 — RUN (delta pass): the "remaining task" is named (PLT-2524) and it is **not** what §0.6 guessed; two §0.6 facts corrected; the PBI fix is still unconfirmed 4 days on

Trigger for this pass: Jira `updated` moved to **2026-08-03T15:10:58+0100**, which is *after* the
08-03 run's own commit (07:13 UTC / 08:13 BST). One thing happened in that window.

### 0.7.1 What is actually new on the ticket (VERIFIED — read the live issue myself)

**Exactly one new comment since the 08-03 snapshot.** Comment total is now 17; this is the only
one dated after 07-31.

| When | Who | What |
|---|---|---|
| **2026-08-03 15:10:58** | **Darminder Atker** | Replying to Mostafa + Pietro: *"Yes it is [https://xyzreality.atlassian.net/browse/PLT-2524](https://xyzreality.atlassian.net/browse/PLT-2524)"* |

That is the answer to the §0.6 open item *"what is 'the remaining task' Darminder has designs for?"*.
It is **PLT-2524**, and it resolves that question outright.

**No other movement.** No new attachments (last is Pietro's 07-31 16:34 empty-table PNG). No status
change (still `Open`). No priority change (still `Major`). `resolution` is still null. Nothing from
Thomas, Mostafa, Yash or Pietro. `issuelinks` on PLT-2917 is **empty** — PLT-2524 is referenced only
as *URL text inside a comment body*, so the connection is invisible to any link-based or JQL
`issueLinkType` query. Worth a human adding a real "relates to" link.

### 0.7.2 What PLT-2524 actually is — this **falsifies** the §0.6 guess

§0.6 rated at **4/10** the guess that "the remaining task" = the §0.5 latent UX defect (Gantt invites
a 100% edit on milestones, shows a green success toast, dashboard never moves). **That guess is
wrong.** Read PLT-2524 directly:

- **PLT-2524** — *"Configure for planned and actual progress to track when parquet last updated on"*
- Type **Task** · Priority **Critical** · Status **Blocked** · **Assignee: none** · Created
  2026-03-20 · Last updated 2026-07-23 (i.e. **nothing has moved on it since**, including after
  Darminder pointed at it on 08-03)
- Parent epic **PLT-1792** *"[PLT] View % Planned and % Complete"* — status **Done**. So the epic is
  closed while this child sits Blocked; the child is the leftover.
- **Blocked by → UX-1114** *"UX/UI: Last Updated Indicator for Planned & Actual % Complete"* —
  status **Backlog**, priority **Medium**.
- Description (verbatim sense): *for work on Planned % complete and Actual % complete we need
  something to notify when the parquet was last updated or updated at all for these values*; needs
  coordinating **with the DPL team** and *"most likely an update on API side to notify frontend of an
  update"*. Two named scenarios: **(a)** the user uploads a new schedule and the values have not been
  calculated yet; **(b)** the user is in an editor session, the values *have* been recalculated, and
  the user is not aware.
- Mostafa, on PLT-2524, **2026-07-21 14:30**: *"I have spoken with @Jason Fingland and we have
  attached the proposed design, which will sit as a **tool tip for actual progress calculation**"* —
  this is the "designs already exist" claim, and it is real (two PNGs attached, 2026-03-20 and
  2026-07-23).

**So the remaining task is a data-freshness / "last updated" indicator on the planned & actual %
figures — not a fix to the milestone-edit UX.** The two are adjacent but different: PLT-2524 closes
the *"has my number been picked up yet?"* information gap; the §0.5 defect is the *"my number can
never reach Actual Finish Date"* write-path gap. **Shipping PLT-2524 would not make a milestone show
as complete.** §0.5 therefore remains an open, unraised, un-owned item — it was not what Mostafa
meant, and nobody is holding it.

⚠️ **PLT-2524 is currently unstartable**, which is the thing a human most needs to see here: it is
`Blocked`, it has **no assignee**, and its blocker **UX-1114 sits in `Backlog` at `Medium`**. Mostafa
describes it as the one remaining task on a Critical-priority item whose designs are done; Jira says
nobody owns it and its blocker is not scheduled. That is a stall, not progress.

### 0.7.3 Did the PBI join fix ship? — **no evidence either way, and it is now 4 days quiet**

VERIFIED (as an absence): the last word on the fix is still Pietro at **07-31 16:49** — *"ok we got
it working - will update and test the PBI to integrate the user values"*. Since then, **nothing**:
no comment saying the PBI report was republished, no verification against the client's own
`ELN03 Milestones Dashboard.xlsx`, no word from Thomas, and no status change. The customer-facing
complaint has had **no on-ticket close-out for four calendar days**.

Caveat on that claim: PBI work happens outside both Jira and `hc-frontend` (Power BI workspace,
Teams). Absence of a Jira comment is **not** evidence the fix didn't ship — only that it was not
recorded. Given this ticket's own history (Pietro's *first* fix went undocumented for 9 days and the
customer had to report the recurrence), an unrecorded second fix is the specific failure mode to
guard against. **This is the highest-value question on the ticket right now.**

### 0.7.4 The `Editor-Progress` flag question is **still unanswered**

Pietro asked Mostafa **and** Darminder on 07-31 16:49 whether to remove the user-progress feature
flag "since users are using it". Darminder's 08-03 reply answers **only** the remaining-task
question. The flag decision has had no response from anyone. It is still live and still Mostafa's.

Code state re-verified this run (`hc-frontend`, HEAD `9c14b90`, which contains `origin/master`
`28e03c3` plus two commits; no diff on any path below between HEAD and `origin/master`):

- `Editor-Progress` is still **default `false`** — `config/constants.ts:887` (`{ name: 'Editor-Progress', value: false }`), union member at `:866`.
- It gates **three** sites, so "remove the flag" is broader than the Gantt cell alone:
  1. `viewer-x/components/blocks/activity-properties/activity-progress.tsx:118` — early-returns the whole activity-progress block when off.
  2. `gantt-x/scheduler/scheduler-columns/scheduler-columns.tsx:12` — `showPercentageColumns`; gates the % columns (`:126`).
  3. `gantt-x/edit-schedule/blocks/edit-form/edit-form.tsx:65` — combined with `activeSchedule?.hasAnyActualProgress`.

That is the concrete answer to "what does removing the flag turn on for everyone": the activity
properties progress block, the Gantt % columns, and part of the edit-schedule form.

### 0.7.5 Does the §0.3 / §0.6 mechanism diagnosis still hold? — yes on code, but §0.6 **conflated two fixes into one**

All the load-bearing FE facts re-verified **first-hand this run** (not carried over):

| Claim | Evidence read this run |
|---|---|
| Milestone status → colour is a pure string switch, **no date input** | `PortfolioDashboardPage/utils/milestoneStatus.ts:14-30`, re-read in full; `MISSED → "Late"`, default → grey "Unknown" |
| Status + dates are passed through raw from **`reporting.vw_KeyMilestone`** | `services/portfolioService/portfolio-api.types.ts:125` (comment names the view), `:139` *"Non-null ⇒ the milestone is complete"* on `actualDate` |
| Unmatched milestones are **silently dropped** (the FAR01 vector) | `portfolioMilestonesData.ts:53` `if (!project) continue` |
| Marker position only | `portfolioMilestonesData.ts:83` `dueDate = actualDate ?? forecastDate ?? plannedDate` |
| KPI "on-time" = `actualDate != null`, **not** `status === 'COMPLETE'` | `portfolioMilestonesData.ts:118`; also `:138` for due-in-30 |
| **Nothing in the FE writes `actualFinishDate`** | exhaustive grep: 13 hits, every one a type declaration, a read, or a test fixture (`dashboard-schedule-service.ts:475,507`; `api-activities-loader.ts:101,124`; `use-dashboard-schedule-data.tsx:202`; `types.ts:20,46,85`; `test-duckdb-harness.ts`) |
| The only activity-progress write is unchanged | `activity-api-service.ts:262` `POST /projects/${projectId}/activities/progress` |
| The editable rule is unchanged | `gantt-x/…/scheduler-columns.tsx:149-150` — `hasLinkedElements = task.elements \|\| task.calculatedElementsSum > 0`; `isEditable = task.activityItem?.progressValid === true && !hasLinkedElements` |
| `isActivityEditableForProgress` unchanged | `use-actual-progress-mutation.tsx` — not-WBS, `elements > 0` ⇒ false, requires `progressValid === true` |
| **No code moved on this path** | `git log` on `portfolioMilestonesData.ts`, `milestoneStatus.ts`, `usePortfolioId.ts` → newest is still `83c5c11` (PLT-2763, 07-10); on `use-actual-progress-mutation.tsx` → `97ca212` (07-08) |

Six commits landed since 07-30 (`9f3536e`, `7e243fe`, `8d8db2d`, `28e03c3`, `ca87f65`, `9c14b90`).
I checked the two that could plausibly touch this surface — **`ca87f65`** (PLT-2899, removes
`defaultProject` as an active-project source; touches `ProgressDashboardHeader.tsx`, `urlUtils.ts`)
and **`8d8db2d`** (PLT-2764, routes V1 projects to the legacy progress dashboard; `PortfolioPage.tsx`,
`dashboard-no-model.tsx`, `dashboard-project-provider.tsx`). **Neither touches
`portfolioMilestonesData.ts` / `milestoneStatus.ts` / `usePortfolioId.ts` / the progress mutation.**
Citation fix: §0.3 and §3 cite `portfolio-api.types.ts:131` for *"non-null ⇒ complete"*; the actual
line is **`:139`** (and the `vw_KeyMilestone` mention is `:125`). Content is right, line drifted.

**The sharpening — and it matters for how this ticket gets closed.** §0.3 unified all the symptoms
under one root cause ("no write path to Actual Finish Date"), and §0.6 then treated Rishi's PBI join
as *the* fix for that root cause. Those are **two different columns on two different surfaces**:

- Rishi's remedy joins `xyz."vw_CurrentUserDefinedProgress"` / `xyz."ActivityProgress"` to surface the
  user-defined **percentage** into PBI. That addresses *"Dh4 Ready for energization = 100% → not
  showing 100%"* and Mostafa's *"why isn't it in the progress parquet"* — the **% symptom**.
- Milestone **done/late/complete** is read from **Actual End Date** (`vw_KeyMilestone.actualDate`,
  `portfolio-api.types.ts:139`), and the join writes no `actualFinishDate`. So the original
  description's three symptoms — FAR01 none showing, ELN04 past-late/future-done, ELN03 *"all
  milestones should be done"* — are **status/date** symptoms that the % join does **not** touch.

⇒ **This ticket contains two fixes' worth of scope and only one is in hand.** The realistic risk is
that the ELN03 % win gets read as "PLT-2917 fixed" and the milestone-status half closes silently with
it. §0.6 item 3 gestured at this for FAR01/ELN04; stating it as a **column-level** distinction is
firmer and is the thing to hold the line on at close-out.

**Confidence split on that:** VERIFIED on the FE side (the reads above). **INFERRED on the PBI side —
I cannot see the Power BI report, `vw_KeyMilestone`, or `vw_CurrentUserDefinedProgress`.** It remains
possible that Pietro's change also altered the milestone visuals, or that `vw_KeyMilestone` derives
`actualDate` from progress server-side. Do not assert this to Pietro as fact; ask.

### 0.7.6 Defect-family match (`recurring-defect-patterns.md`)

This is a **second clean instance of Pattern 4**, specifically its *"different source artefact"*
layer: the FE schedule surface reads **parquet merged with `xyz."ActivityProgress"` at request
time**, while PowerBI reads **parquet only**. Two consumers, two artefacts, guaranteed disagreement
that is a bug in neither renderer. Rishi's 07-31 answer is a textbook *"name the source artefact
behind each surface"* (method step 3). It also re-confirms **Pattern 2** (FE is a faithful renderer).
Worth promoting into `recurring-defect-patterns.md` Pattern 4 as a worked second example — the
PLT-2874 entry there is currently the only one. *(Not edited this run; noting only.)*

**Doc gap (unchanged, now better specified):** no file under `dashboard/` mentions `isUserProgress`,
`xyz."ActivityProgress"`, `vw_CurrentUserDefinedProgress`, or the `Editor-Progress` flag — grep
returns zero across all 13 files. `dashboard/progress-tab.md` documents the parquet path and the
`calculatedOn` timestamp (`:11`) but not the user-override merge that this whole incident turns on.
(Also: `CLAUDE.md`'s directory layout calls this file `dashboard/prg-progress.md`; on disk it is
`dashboard/progress-tab.md`.)

### 0.7.7 New code finding — PLT-2524 is partly precedented, and the Gantt tooltip it targets is a **static string**

Since PLT-2524 is now a named, live dependency of this incident, I read the FE state around it:

- A **"Last updated: …"** indicator **already exists**, but only on the in-viewer progress panel:
  `dashboard-panels/progress-panel.tsx:288` renders `` `Last updated: ${formatCalculatedOn(calculatedOn)}` ``.
  It is fed from the V2 progress-outputs API (`progress-outputs-api-service.ts:12`, *"ISO timestamp
  when calculation was performed"*), resolved as the most recent of the project-level and
  category-groups outputs (`progress-outputs-v2-loader.ts:80-82`), and exposed as
  `calculatedOn$` (`dashboard-progress-service.ts:1357-1358`). Documented at `progress-tab.md:11`.
- The **Gantt's Actual Progress column header** — the surface Mostafa's design targets ("a tool tip
  for actual progress calculation") — instead carries a **hardcoded, non-dynamic** tooltip:
  `gantt-x/scheduler/gantt-tooltip.tsx:19-20`
  `gantt_grid_head_actualProgress: 'Progress updates every 15 minutes. \nValues may be slightly delayed.'`
  There is no timestamp and no `Tooltip`/`title` anywhere in `scheduler-columns.tsx` (grep: zero hits).

⇒ **INFERRED (not confirmed — the design PNGs are 403):** PLT-2524 is about replacing that static
*"updates every 15 minutes"* string with a real last-calculated timestamp on the % columns. The
`calculatedOn` plumbing already exists one surface over, so the FE half is likely small; the
description's own words put the hard part on **DPL + API** ("notify frontend of an update"), which is
consistent with why it is `Blocked`. Useful either way: it tells whoever picks up PLT-2524 that a
working pattern exists at `progress-panel.tsx:288`, and it tells us the current Gantt tooltip is a
**promise the system does not verify** — a mild sibling of the §0.5 defect (the user is told progress
refreshes every 15 minutes; nothing shows whether it did).

### 0.7.8 Confidence read — 2026-08-04 (per-claim, not rounded up)

| Claim | Conf. | Basis / what would change it |
|---|---|---|
| The "remaining task" is **PLT-2524** | **10/10** | Darminder named it, answering that exact question, unambiguously |
| PLT-2524 is a **last-updated / data-freshness indicator**, *not* the §0.5 milestone-edit UX defect ⇒ **§0.6's 4/10 guess is falsified** | **9/10** | Read PLT-2524's description, its Mostafa comment, its parent epic and its blocker myself. The −1 is the two attached design PNGs, **unread (403)** — small chance the design covers more than the text implies |
| PLT-2524 is **unstartable right now** (Blocked, unassigned, blocker UX-1114 in Backlog/Medium) | **8/10** | Read all four fields directly. Discounted because Jira status hygiene often lags reality — someone may be working it untracked |
| Assignee has been **Ilia since 07-31 13:33**; §0.6's "still Yash" is wrong | **10/10** | Changelog, two entries 3 seconds apart |
| Summary renamed to "Portfolio Progress Dashboard" on 07-31 | **10/10** | Changelog |
| **No on-ticket evidence the PBI fix shipped or was verified** | **8/10** | Verified as an absence across all 17 comments. Not 9–10: PBI work is invisible to Jira and `hc-frontend`, so this is "unrecorded", not "not done" |
| The `Editor-Progress` flag decision is **still unanswered** | **9/10** | Darminder's reply addresses only the other question; no other comment exists. Could have been settled verbally |
| `hc-frontend` milestone/progress-write path **unchanged**; FE writes no `actualFinishDate` | **9/10** | Re-read the files, exhaustive grep, `git log` per path, HEAD vs `origin/master` diff empty on these paths |
| Removing `Editor-Progress` exposes **3 surfaces**, not just the Gantt cell | **9/10** | All three gate sites read this run |
| **The PBI %-join does not fix the milestone-status symptoms** (FAR01 / ELN04 / "all should be done") — different column, different view | **6/10** | FE half verified (`:139`, and nothing writes `actualFinishDate`). PBI half **inferred** — cannot see the report, `vw_KeyMilestone`, or whether it derives `actualDate` from progress. **Must be asked, not asserted** |
| FAR01 / ELN04 still have **no evidence at all** | **9/10** | Their only evidence was the 3 broken description images; never re-sent, still `url=null` |

**Overall for this pass: ~8/10.** High on *what changed* (one comment, fully read; two prior facts
corrected against the changelog; PLT-2524 read end-to-end) and on the FE code state. The soft ~2
points are all the same shape: **everything decisive now lives outside Jira and outside
`hc-frontend`** — the Power BI report, the two 403 spreadsheets, the 403 design PNGs, and the
DB views. This pass could not reduce that, and no future code-reading pass can either.

### 0.7.9 What remains unverified after this pass (explicit)

1. **Whether the PBI join fix actually shipped**, and whether ELN03/PMILE5030 now shows the
   user-entered %. Only Pietro can say. *Highest value.*
2. **Whether the milestone-status symptoms survive that fix** (§0.7.5). Needs the PBI report or a
   `vw_KeyMilestone` read for FAR01/ELN03/ELN04 — I have no DB or env access.
3. **The two `ELN03 Milestones Dashboard.xlsx` attachments (61396, 61764).** Re-attempted 08-04:
   **HTTP 403** from `api.atlassian.com/…/attachment/content/…` (94-byte error body) on both. **Not
   read — no claim is made about their contents.** Both are **exactly 203,335 bytes**, so 61764
   (07-31, *"File from user"*) is *almost certainly the same export re-sent* rather than new evidence
   — **INFERRED from byte-size identity only.**
4. **The PLT-2524 design PNGs (54220, 61260).** Re-attempted 08-04: **HTTP 403**. Not read. What the
   agreed tooltip design actually specifies is unknown.
5. **The 07-27 inline screenshot** — still Freshdesk-hosted (`eucattachment.freshdesk.com`), not a
   Jira attachment. Needs Freshdesk access. Unchanged from §8a.
6. **The 3 description screenshots (FAR01/ELN04/ELN03)** — still broken for everyone (`url=null`,
   `id=null`). Never re-sent. FAR01 and ELN04 still cannot progress.
7. **`Editor-Progress` flag decision** — unanswered by anyone.
8. **§0.5's latent UX defect** — now known *not* to be PLT-2524, so it is **un-raised and un-owned**.
   No PLT ticket exists for it (searched `hc-frontend` and this repo).
9. **Pietro's original undocumented fix (07-21)** — still never explained. Lowest value now that the
   mechanism is understood from other angles, but formally still open since §6.

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

### 8a. Attachments / media — ⚠️ ALL UNREADABLE BY THE AGENT (updated 2026-07-30; re-checked 2026-08-04)

> **2026-08-04 re-check:** still **HTTP 403** on the attachment-content endpoint for the ELN03 xlsx
> (61396) *and* for PLT-2524's design PNG (61260). Nothing below has been read, and neither have
> PLT-2524's two design images. Add to the table below: **attachment 61764** —
> `ELN03 Milestones Dashboard (2e5d118c-…).xlsx`, 07-31 13:34, **byte-identical in size to 61396
> (203,335 B)**, so most likely the same export re-sent, not new evidence (inferred from size alone).

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
