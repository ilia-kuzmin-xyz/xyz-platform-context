# PLT-2917 — "Progress Dashboard" (milestones wrong) — triage context

- **Domain slug:** `progress-tracking` (justification in §7)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2917
- **Type:** Live Incident · **Priority:** Major · **Status:** **Open**
- **Assignee:** Ilia Kuzmin · **Reporter (Jira):** Yash Patel (support) · original client reporter: **Thomas**
- **Freshdesk:** Ticket 7420, status "Waiting on 3rd line" (i.e. back on us)
- **Project link given:** `https://cloud.xyzreality.com/progress-dashboard/69a964b9380af76aed8faa97` · Software Area: Dashboard
- **Created:** 2026-07-21 · **Attachments:** 1 screenshot (unreadable here — see §8 NEEDS HUMAN)
- **Recurrence:** Pietro Desiato already "worked on" this once; the customer replied it is *still* not fixed. Treat the earlier fix with suspicion per the playbook (symptom did **not** even disappear).
- Triage date: 2026-07-22

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

⚠️ **SURFACE CORRECTION (2026-07-22, second pass — supersedes the original §2 bet).** The pasted
URL `progress-dashboard/<24-hex id>` resolves to `ProgressReportPage` (`routes.tsx:88-95`), and
that page is **a PowerBI embed** — `ProgressReportPage.tsx:3-4` imports `powerbi-client-react`,
`:163-167` renders `<PowerBIEmbed>` with a report config fetched via
`ProgressDashboard.getProjectDashboardInfo(projectId)` (`:61-65`). It contains **no native
milestone code at all**. The native `MilestoneWidget` lives on `PortfolioDashboardPage`, which is
routed at a *different* path (`routes.tsx:245`), not on the customer's URL. So the surface Thomas
is complaining about is most likely the **per-project PowerBI Progress dashboard**, visited once
per project (which reads "For FAR01 → … For ELN04 → …" naturally as three separate page visits),
NOT the portfolio Milestone widget the original analysis targeted.

**Operator confirmation (2026-07-22):** `cloud.xyzreality.com/progress-dashboard/<id>` is the
**old, PowerBI-based dashboard**; the new native dashboard lives at
`/projects/<project_id>/dashboard` (the in-viewer DuckDB dashboard documented in
`xyz-platform-context/dashboard/`). So this ticket's
failing surface is definitively the **old PowerBI progress dashboard**. Note the repo tooling:
the `dashboard-progress-comparison` skill exists specifically for Platform-vs-PowerBI data
discrepancies and may be reusable here.

**Why the diagnosis survives the correction:** the milestone *state* shown on either surface comes
from the reporting DB, not from FE logic. The native widget provably reads
`reporting.vw_KeyMilestone` (§3); the PowerBI report reads the same reporting schema (unverified
which exact view/table its milestone visual binds — flag for the report owner, likely
Hussein/PowerBI per PLT-2884). Either way the FE/report layer renders what the reporting DB says,
and the editor↔dashboard disagreement lives in the **schedule → reporting-DB sync**, not in
`hc-frontend`. The §3–§4 mechanism analysis of the native widget is retained below both as the
verified half of that claim and because the widget shares the same upstream data and will show the
same wrongness.

**How an activity becomes a "milestone" (operator clarification, 2026-07-22):** "mapped as Key
Milestones" = the customer classified the activities in the editor's category-mapping screen with
**Discipline = `Milestone` and Package = `Key milestone`** (confirmed by the supplied screenshot —
see §8). The reporting view presumably selects on that mapping (consistent with its name
`vw_KeyMilestone`). This adds a FAR01-specific failure candidate: if the view/report filters on an
**exact package/discipline label match** and FAR01's package label differs (e.g. `Key Milestones`
plural, case, or a tenant-specific name), every FAR01 milestone silently falls out of the view —
zero showing, while ELN03/ELN04 (matching labels) show but with wrong status/dates. Cheap check:
compare the literal Discipline/Package labels across the three projects in the editor.

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

## 5a. ⚠️ SECOND REFRAME (Mostafa update, 2026-07-22 — supersedes parts of §2/§5b below)

Mostafa, in-thread (paraphrased verbatim enough): *"it's a different issue. For activity PMILE5030
in ELN03 — he's done it to be 100% in the editor but Pietro is saying it's not coming up in the
**activity parquet file**. Is that because it's a milestone? This is for the **PowerBI dashboard
for portfolio**."*

Two corrections to everything above:
1. **Surface (third and hopefully final answer):** the PowerBI **portfolio** dashboard — not the
   per-project PBI embed the ticket URL pointed at (§2), and not the native Portfolio widget (§3).
   The URL in the description was a red herring throughout.
2. **Data path:** the milestone state there is fed by **the activity parquet**, and Pietro's
   finding is that PMILE5030 has **no rows in it at all** — not `vw_KeyMilestone.actualDate`
   (that path belongs to the native widget only).

**Answer to Mostafa's "is that because it's a milestone?" — very likely YES (code-grounded):**
The activity parquet is almost certainly `v2_activities_progress.parquet`, the **weight-based
progress output** (FE consumes it via the "V2 progress-outputs API",
`dashboard-schedule/loaders/activity-progress-v2-loader.ts:17,56`). Its per-activity content is
only `ActualWeight` / `PlannedWeight` per date (`dashboard-schedule/types.ts:5-12`), and progress
% is derived as `SUM(ActualWeight)/TotalPlannedWeight` (`types.ts:62-63`). Weights come from
linked elements — and milestone activities have **Elements = 0** (confirmed for PMILE5030 in the
supplied screenshot). Zero linked elements ⇒ zero weight contribution ⇒ **no rows in the parquet,
structurally, regardless of anything set in the editor.** The customer's "100% in the editor" is
a *different field family* — the api-v2 activity record (`activityStatus` / `actualFinishDate`,
`types.ts:14-27`). The NEW dashboard merges parquet + api-v2 (`MergedActivityData`, `types.ts:1-33`)
so it can still show milestone data; a PBI dashboard reading **only the parquet** never sees
milestones at all.

**Sharp consequence:** milestones are structurally invisible to any weight-parquet-fed surface.
No editor action by the customer can fix ELN03; the fix is a pipeline/product decision (either
progress-outputs emits milestone rows sourced from the activity's manual %/actual dates, or the
PBI portfolio dashboard joins the activity-record fields for milestone-type activities).

**Held-back caveats (do not overclaim):**
- ELN04's "past look late / future look done" is NOT explained by pure absence — something *is*
  rendering there with wrong states. Different sub-mechanism or the PBI visual derives status
  from planned dates alone when actuals are absent (which WOULD look exactly like "past = late,
  future = done"!). Actually note: planned-dates-only rendering predicts precisely ELN04's
  symptom — past-planned milestones with no actuals look "late", future-planned ones look
  "upcoming/ok". Worth testing once the PBI visual's fields are known.
- FAR01's "none showing" fits absence-from-parquet directly IF that visual lists parquet
  activities — consistent, unconfirmed.
- The identification "activity parquet = v2_activities_progress" is inferred from FE code
  (7/10); the PBI portfolio dashboard could consume a separate BI export — the pipeline owner
  (Sachin/Ali for api-v2 progress-outputs; David Webb for the data pipeline; Hussein for the PBI
  report binding) must confirm.
- §5b's stale-schedule-version hypothesis is now **demoted** (structural absence explains ELN03
  better) but not dead — it still could contribute to FAR01/ELN04.

## 5b. (Demoted by §5a) Earlier unifying hypothesis: PBI reads a stale/different schedule version

The supplied screenshot carries two hints the original analysis didn't have: the schedule is
named `101342_LIVE-2-25-26_For_new_dashboard_test_updated__I_(3)` — the "`(3)`" implying
**multiple uploads/revisions of this schedule exist** — and the header shows a
**"Baseline & Current"** toggle. If the PowerBI pipeline (or the reporting view it reads) is bound
to an **older schedule version or the baseline** rather than the current schedule Thomas edits,
that single cause explains all three projects at once:

- **FAR01 — none showing:** the key-milestone mapping (Discipline=`Milestone`,
  Package=`Key milestone`) was applied to the *current* schedule; an older snapshot has no such
  mapping → the view selects zero rows.
- **ELN03 — should be done:** the 100% actuals / finish dates were entered after the snapshot the
  report reads → milestones look incomplete.
- **ELN04 — past look late, future look done:** statuses/dates from an outdated snapshot are
  simply inconsistent with today's timeline.

It also fits the recurrence: if Pietro's earlier fix was a data action on the **current**
schedule, it would never reach a report pinned to an older upload. **Status: hypothesis only** —
testable by asking the PBI report owner (Hussein, per PLT-2884) which dataset/schedule version the
milestone visual binds, and whether it distinguishes baseline vs current. This is the first thing
to check once the client confirms the surface (see recommended-action.md).

## 5c. Open product/definitional question (no owner yet)

If the schedule shows **Actual % Complete = 100** but no **Actual Finish date** was ever stamped
in the source P6/XER, which is authoritative for "milestone complete" on a dashboard? Today the
reporting side keys on the date (`actualDate`), so a %-complete-without-date milestone renders
incomplete. Whether that is "customer data hygiene issue — stamp your actual dates" or "platform
gap — derive completion from % when the date is absent" is a product decision nobody has made
explicitly. Route to Mostafa/Pietro once the mechanics are confirmed; don't let the eventual fix
embed this decision silently.

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

- ✅ **RESOLVED 2026-07-22 (Ilia supplied the screenshot directly, out of band).** It is **not** a
  screenshot of the Portfolio-dashboard Milestone widget — it's the **Schedule tab's mapping/import
  screen** for schedule `101342_LIVE-2-25-26_For_new_dashboard_test_updated__I_(3)` (banner:
  "2530 un-mapped activities → Open mapping"), same surface as PLT-2918. Row shown:
  `DH4 Ready for Energization` (`PMILE5030`, Sector G / DH 4 East) — Discipline=`Milestone`,
  Package=`Key milestone`, Phase=`Sector G`, **WBS Location = blank**, **Planned % Complete = 100%,
  Actual % Complete = 100%**, **Elements = 0**, End=04/06/2026.
  - `Elements = 0` confirms milestones carry no linked geometry — their "Actual % Complete" can't
    come from installation-status roll-up; it must come straight from the imported schedule's own
    percent-complete field (P6/XER-style `phys_complete_pct`), which reads 100% here.
  - This **sharpens, not just confirms, Pietro's diagnosis.** The Milestone widget (§3) reads a
    *different, specific* field — `actualDate` (Actual End Date) in `vw_KeyMilestone` — not "Actual
    % Complete." The screenshot's single "End" column (04/06/2026) does **not** disambiguate whether
    that is a stamped Actual Finish or just the planned/current finish carried on a 0-duration
    milestone regardless of completion state — so this does **not** by itself prove Actual End Date
    is populated. The refined, testable hypothesis: **the schedule import can set Actual % Complete
    = 100 without stamping a real Actual Finish date** (a known P6/XER data-quality gap), and the
    Milestone widget only trusts the latter field. Still needs the `/milestones` payload (§8 below)
    to confirm `actualDate` specifically, distinct from % complete.
  - New signal not previously visible: the **"2530 un-mapped activities"** banner on this same
    schedule is a live data-quality flag on the exact schedule the customer is complaining about.
    This row's Discipline/Package/Phase are filled (so it isn't itself in the unmapped pool for
    those), but WBS Location is blank — worth checking whether the unmapped-activity count and the
    milestone Actual-Finish gap share a common import-time cause (see PLT-2918, same mapping screen,
    different symptom — both may trace to the same schedule-(re)import event).
- ⚠️ **Screenshot provenance unconfirmed** — the schedule-mapping screenshot supplied out of band
  on 2026-07-22 (§ above) matches the shape of the customer's inline image in Yash's comment
  ("Dh4 Ready for energization = 100%", 1533×223) but it was not confirmed whether it IS that
  image or Ilia's own repro. Distinction matters mildly (customer-evidence vs our-repro); confirm
  when convenient.
- ⚠️ **Description's three inline images (one per project) are broken** in the ticket for all
  three projects — the drafted reply to Yash asks Thomas to re-attach them; nothing dashboard-side
  has been seen by anyone on our side yet.
- ⚠️ **PBI report binding unknown** — which dataset/view and which schedule version the PowerBI
  milestone visual reads (baseline vs current, which upload). Owner to ask: Hussein (PowerBI, per
  PLT-2884). Decisive for hypothesis §5b.
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
