# PLT-2917 — "Progress Dashboard" (milestones wrong) — triage context

- **Domain slug:** `progress-tracking` (justification in §7)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2917
- **Type:** Live Incident · **Priority:** Major · **Status:** **Open**
- **Assignee (as of 07-28): Yash Patel** — changed from Ilia Kuzmin (recorded 07-22); ticket has bounced back to support, consistent with clarifying questions being asked of the client. **Reporter (Jira):** Yash Patel (support) · original client reporter: **Thomas**
- **Freshdesk:** Ticket 7420, status "Waiting on 3rd line" (i.e. back on us) — as of 07-22; not re-confirmed 07-28.
- **Project link given:** `https://cloud.xyzreality.com/progress-dashboard/69a964b9380af76aed8faa97` · Software Area: Dashboard
- **Created:** 2026-07-21 · **Attachments (as of 07-28): 2** — the original `image-20260721-123812.png` (still unreadable, blob placeholder in description) **and** a new `ELN03 Milestones Dashboard.xlsx` added 07-27 (see DELTA §0, still unviewable — auth-blocked).
- **Recurrence:** Pietro Desiato already "worked on" this once (re: the original 3-symptom description); the customer replied it is *still* not fixed. Treat the earlier fix with suspicion per the playbook (symptom did **not** even disappear).
- Triage date: 2026-07-22 · **Re-checked: 2026-07-28 (this run) — see DELTA §0 below.**

---

## 0. DELTA since 2026-07-22 (re-check on 2026-07-28, 6 days later)

**Something changed — this is not a "nothing new" re-check.** Three things moved:

**(a) Ticket scope was narrowed the same day as the last triage, but the narrowing was never captured in this file.** Comments `107904`–`107906` (all 2026-07-22, 09:30–09:42) were on the ticket before/around the 07-22 write but are absent from the analysis above. In order:
- **107904 (Ilia Kuzmin, assignee at the time):** asked Thomas, via Yash, three clarifying questions — (1) which dashboard: the old PowerBI link in the ticket, the new `/projects/<id>/dashboard`, or both; (2) re-attach one screenshot per project (FAR01/ELN04/ELN03); (3) one concrete example per project in the format "activity ID + shown vs expected", and whether the problem is (a) dashboard milestone display, (b) schedule-panel progress %, or (c) viewer highlighting. **This is a different, broader clarifying action than the one drafted in the 07-22 `recommended-action.md`** (which proposed asking Pietro what his earlier fix touched) — the real ticket owner took an independent, not-yet-fully-answered path.
- **107905 (Mostafa Kamel Hussien):** *"it's a different issue. For activity **PMILE5030** in ELN03, he's done it to be 100% in the editor but Pietro is saying it's not coming up in the **activity parquet file**. Is that because it's a milestone? This is for the **Power BI dashboard for portfolio**."*
- **107906 (Yash Patel):** confirms the split — the original description (FAR01/ELN04/ELN03, "worked on" by Pietro already) is a **separate, prior** issue; **this ticket (PLT-2917) is actually tracking the PMILE5030/ELN03 parquet issue Mostafa raised**, on the Power BI Portfolio dashboard specifically.

This matters because the 07-22 analysis in §1–§9 below did all its code archaeology against **`hc-frontend`'s `PortfolioDashboardPage` / `MilestoneWidget` / `reporting.vw_KeyMilestone`** — the *new* React dashboard's data path. If 107906 is taken literally, the ticket's real target is the **old Power BI Portfolio dashboard** and the **parquet generator**, a different pipeline. See DELTA (c) for why this is likely moot in practice.

**(b) New comment + new attachment, 2026-07-27 (`108243`, Yash relaying the client):** *"Little update about ELN03 ... All milestones are not updated. Please have a look when free."* Attached: **`ELN03 Milestones Dashboard.xlsx`** (real Jira attachment, not a `blob:` placeholder) plus an inline Freshdesk-hosted screenshot.
- The **xlsx is unviewable** — `WebFetch` on the Jira attachment-content URL returned `403 Forbidden` (tried once, per playbook policy; needs a human with Jira session/API token).
- The **inline Freshdesk screenshot resolved** (redirect chain to a signed S3 URL rendered as a real PNG — read via the Read tool). **It is decisive evidence**, see (c).

**(c) The screenshot confirms the root-cause hypothesis with concrete activity IDs — no longer just theory.** It shows two things side by side: a dark milestone-status panel (red-diamond "Missed" cards) and a schedule/activity export table. Read together:

| Activity | ID | Planned Finish | Status shown (widget) | Actual % Complete (schedule data) |
|---|---|---|---|---|
| DH4 Ready for Energization | **PMILE5030** | Apr 6, 2026 | **Missed** | **100%** |
| DH5 SUB AND MECH ROOMS Ready for Energization | PMILE5010 | Apr 6, 2026 | **Missed** | **100%** |
| DH6 Ready for Energization | PMILE5040 | Apr 6, 2026 | **Missed** | **100%** |
| DH6 SUB AND MECH ROOMS Ready for Energization | PMILE5020 | Apr 6, 2026 | **Missed** | **100%** |

All four are flagged `Key milestone`, all four have a **past** planned finish (Apr 6, 2026 vs. today 2026-07-28), all four show **Actual % Complete = 100%** in the schedule/activity data, yet the milestone widget marks all four **Missed**. This is exactly the §4 "ELN03 — definitional trap" mechanism from the 07-22 analysis (installation/progress says done, but the field the widget actually reads — Actual Finish / `status`/`actualDate` in `vw_KeyMilestone` — was never stamped), now **anchored to four real activity IDs** instead of a general hypothesis. It also directly matches **`dashboard-progress-comparison` skill → Known Bug Patterns Library → Pattern A** ("Intangible activities reporting 0% actual on Platform... first observed on **ELN03**") — milestones are typically zero-linked-element (intangible) activities, and Pattern A is a **confirmed, previously-diagnosed** bug where the parquet generator's intangible fallback doesn't propagate reported completion into the output the dashboards read. Whether this ticket's widget is the new `vw_KeyMilestone`-backed one or the Power BI one (per DELTA (a)), **the mechanism and the affected IDs are the same** — so the surface ambiguity from (a) does not block the next step.

**(d) Still unanswered:** no one has answered Ilia's three clarifying questions (107904) or the "what did your earlier fix touch" question (never actually posted — the drafted 07-22 comment was never sent; only a different, real comment went out). **Pietro has not commented directly on the ticket at all** — all his input is second-hand via Yash/Mostafa.

**Net assessment:** the situation **moved forward**, but not via anyone answering the open questions — via the client sending more (partially decodable) evidence. The recommended action must change: we now have four named activity IDs to test directly, which is strictly better than "pull the payload and eyeball it." See updated `recommended-action.md`.

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

- ⚠️ **1 screenshot attachment** on PLT-2917 — binary media behind Atlassian auth, **not viewable
  here**. Do not guess its contents. It is the fastest way to confirm (i) which surface Thomas is
  on (Portfolio dashboard vs the `progress-dashboard/:id` report — §2 caveat), and (ii) exactly
  which diamonds are miscoloured for ELN04.
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
  three symptoms):** **7/10 as of 07-28** (was 6/10) — the 07-27 screenshot (DELTA §0c) confirms,
  with four named activity IDs (PMILE5030/5010/5040/5020), that ELN03 milestones sit at Actual % =
  100% in the schedule data while showing `Missed` in the widget — the exact mechanism, no longer
  just theory. Still **not yet verified against the raw `/milestones` payload or `vw_KeyMilestone`
  row** for those IDs — that would close the gap to 9/10. FAR01's zero-rows case is unconfirmed by
  the new evidence (no FAR01 data arrived) and could still be the `projectId` join mismatch.
- **This is NOT primarily a frontend bug:** **8/10** — unchanged; the FE contains no logic that could
  produce the reported done/late inversion; the one *latent* FE weakness is the silent join-drop
  (`portfolioMilestonesData.ts:53`) which hides FAR01 rows with no warning.
- **This matches a known, previously-confirmed bug (`dashboard-progress-comparison` skill, Pattern
  A — intangible activities on ELN03 not propagating completion into parquet output):** **7/10** —
  same project, same shape (labour/intangible milestone activity, complete upstream, not reflected
  downstream); not proven identical without seeing the parquet/view row directly.

**Overall triage confidence: ~7/10 as of 07-28** (was ~6/10 on 07-22). Mechanism and layer are clear
and now anchored to real IDs; which exact pipeline stage (vw_KeyMilestone population vs. the parquet
generator's intangible fallback, DELTA §0a/c) still needs one direct data read to pin down.

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
