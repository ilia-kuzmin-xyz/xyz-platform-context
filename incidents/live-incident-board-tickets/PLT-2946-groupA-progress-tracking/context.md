# PLT-2946 — "Hutto2 Tangible Activities with wrong Actual percentage on Dashboard" — triage context

## Ticket

| Field | Value |
|---|---|
| **Jira** | https://xyzreality.atlassian.net/browse/PLT-2946 (id 118252) |
| **Summary** | Hutto2 Tangible Activities with wrong Actual percentage on Dashboard. |
| **Issue type** | Live Incident · Project `PLT` (XYZ SW Platform : Platform) |
| **Status** | Open (statusCategory `To Do`) |
| **Priority** | Minor |
| **Reporter (Jira)** | Murray Hendriksen (support relay) — the *customer* reporter is **Thiago Santos** via Freshdesk #7557 |
| **Assignee** | Rishi Bhugobaun |
| **Created** | 2026-07-30 16:48:54 +0100 |
| **Updated** | 2026-07-30 17:01:05 +0100 (Yash's comment edit — no activity since, re-verified 2026-07-31) |
| **Components / Labels** | none / none |
| **Software Area field** | empty in the intake template (`Software Area: ,`) — not tagged to Dashboard even though "Issue Type: Dashboards" is set |
| **Project (site)** | Hutto2 — Freshdesk project field reads `PBOX - HUTTO2` |
| **Freshdesk** | #7557, created 2026-07-30 11:16:39Z, updated 15:48:12Z; escalated 15:35:51Z by yash.patel to Mostafa Hussien + Pietro Desiato, reason *"Its a issue that platform team needs to look into"* |
| **Age at triage** | ~1 day. Zero technical investigation on-ticket. |

## Description + comments (verbatim, condensed)

**Description** (intake template; customer text verbatim):

> Issue Type: Dashboards, Software Area: , Software Component:, Device Serial Number software: , Device Serial Number Hardware: , Is The Device Still Usable?: Usable, **Project: Hutto2**
>
> Description:
> Hi Guys,
> There are activities that with wrong actual percentage from the dashboard, Can you please take a look at that:
> **Package : Cable Trays**
> Best activity example:
> **Activity: Low Voltage Cable Tray Installation & Termination- DH1, B1**
> Dashboard snip
> **As you can see from snip, majority of this elements are already installed, only a few arent. This is happening through out the package cable trays.**
> Some other examples: **Low Voltage Cable Tray Installation & Termination- MNR, B**
> **This one for example subsection E3 is showing 25% actual while no items are installed**
> **Activity: Low Voltage Cable Tray Installation & Termination- DH2, E3**
> Thiago Santos

**Comments (4 — all handover/escalation, no mechanism proposed by anyone):**

1. **Murray Hendriksen**, 16:48:54 — `@Rishi Bhugobaun` *"Linked from support ticket … Please pick this up."*
2. **Murray Hendriksen**, 16:48:55 — full Freshdesk #7557 dump, including the internal note *"Escalated … to the Web Viewer and Dashboard team by yash.patel@xyzreality.com. Reason: Its a issue that platform team needs to look into. Team: Mostafa, Pietro"* and the support reply to Thiago acknowledging the three activities.
3. **Rishi Bhugobaun**, 16:58:54 — `@Murray Hendriksen` *"Hey, could you please add the screenshots from the ticket?"*
4. **Yash Patel**, 17:00:50 (edited 17:01:05) — *"Please ignore below comments from murray"*; restates the report as three bullets; embeds the two images as `blob:` references.

Nothing else. No date range stated, no activity IDs (`userItemId` / P6 codes), no element IDs, no statement of which dashboard surface. The only technical content anywhere on the ticket is the customer's two sentences.

## Attachment / media inventory

| # | Filename | Size | Uploaded by | When | Readable here? |
|---|---|---|---|---|---|
| 1 | `77a1aef9-8256-4f4f-926e-b61d54214b2e.png` | 372,613 B | Yash Patel | 2026-07-30 17:00:49 | ❌ No |
| 2 | `image-20260730-160034.png` | 341,082 B | Yash Patel | 2026-07-30 17:00:49 | ❌ No |
| 3 | 2× inline `blob:` refs in comment 4 | — | Yash Patel | 2026-07-30 17:00:50 | ❌ No — `media.staging.atl-paas.net` blob placeholders, never resolvable outside the authoring session |

Both PNGs attempted, both failed (HTTP 503 on the attachment-content endpoint; even on success the fetch path converts to markdown and cannot do vision on a PNG). Not readable in this triage — stated plainly rather than guessed at.

Both images are full-window captures (1901×907, 1892×891 px), not cropped panels — so the date-range bar and active filter chips are almost certainly visible in them. That matters: the single most load-bearing unknown in this diagnosis is what date range was selected, and a human opening these two PNGs can likely answer it in five seconds.

⚠️ **NEEDS HUMAN**: open attachments 61703/61704 (Jira) and record (a) which panel/surface is shown, (b) the selected date range, (c) the exact Actual % / Planned % values per row, (d) any active discipline/package chips.

## Domain context

Sources: `xyz-platform-context/`.

- **Where per-activity "Actual %" lives.** `dashboard/README.md` lists SCH — Schedule as the Gantt surface; the PRG tab's own breakdown is category-level only (`dashboard/progress-tab.md` § What the user sees). **A per-activity Actual % on the dashboard means the SCH Gantt grid, not the Progress panel** — a distinction nobody on the ticket has made yet.
- **Delta semantics are documented.** `dashboard/progress-tab.md`: *"All numbers are progress deltas within the selected date range — not cumulative totals from project start."*
- **FE-is-faithful-renderer reflex, with its own counterexample.** `incidents/recurring-defect-patterns.md` § Pattern 2 states per-activity progress is backend-computed, but explicitly warns: *"PLT-2874 is the counterexample… apply the reflex, but confirm it — establish what unit each surface is counting before concluding the frontend only renders."*
- **Pattern 1 — dead activity links.** Confirmed on PLT-2882/FAR01, PLT-2909/ATL08, PLT-2931/ELN03: `installed/linked` denominator inflated by dead links, decisive test is arithmetic. Caveat: `svf2-object-id-map` (the geometry oracle) exists for Navisworks-path models only — silently useless on Revit-mapped projects.
- **Tangible vs intangible is a documented backend branch** (`dashboard-progress-comparison` skill): `LinkedElements > 0` → tangible (`installed/linked`); `LinkedElements = 0` → intangible (`ReportedLaborUnits/PlannedLaborUnits`). A project mixes both per activity.
- **Sibling precedent — PLT-2917** (`PLT-2917-groupA-progress-tracking/context.md:62-67`) already found a milestone with zero linked elements where the UI invites a manual 100% entry, and left an **unanswered question to David Webb**: does the parquet consume `isUserProgress` rows from `POST /activities/progress`? If PLT-2946 lands as intangible, this is the second sighting and the question becomes urgent.
- **Hutto2 precedent:** PLT-2879/PLT-2868 are prior Hutto2 tickets, both access-related — no prior progress-data finding on this site.

## Code references

All paths relative to `hc-frontend/`. Branch `claude/vigilant-franklin-q3mayf`, HEAD `8d8db2d`.

**The surface.** `.../ViewerPage/components/dashboard-panels/gantt/scheduler-columns/scheduler-columns.tsx:77-91` — the only per-activity Actual % on the dashboard: `Math.round(task.activityItem.actualPercent * 100)`. No tooltip, no provenance marker, no linked-element count in the column set. `use-dashboard-schedule-data.tsx:268` — pure pass-through from the API; `:154-171` — no parent/WBS rollup, every row renders its own value.

**The computation — a within-window `MAX − MIN` delta.** `services/dashboard-schedule/dashboard-schedule-service.ts:442-489`:
```
450  WITH progress_delta AS (
455-456   MAX(PlannedProgress) - MIN(PlannedProgress) as PlannedProgress,
          MAX(ActualProgress)  - MIN(ActualProgress)  as ActualProgress
462-465   WHERE CalendarDate BETWEEN CAST('<start>' AS DATE) AND CAST('<end>' AS DATE)
488-489  COALESCE(p.ActualProgress, 0) as ActualPercent
```
`MIN` is the activity's earliest **in-window** row, not the value at the window boundary — progress earned before that row is silently subtracted. `COALESCE(…, 0)` means an activity with no rows in the window renders `0%`, not `-`.

**The same repo already fixed this exact class of bug elsewhere and didn't port it here.** `services/dashboard-progress/utils/progress-queries-v2-api.ts:679-727` — comment *"DENOMINATOR FIX (live incident)"* — uses `arg_max(…, CalendarDate) WHERE CalendarDate <= '<boundary>'` (nearest snapshot at-or-before the boundary, absent ⇒ 0). The Gantt column at `:455-465` still uses `MIN` over `BETWEEN`. **Two code paths compute "actual progress in range" by different rules; only one was corrected.**

**Date window defaults.** `dashboard-progress-service.ts:244-301` sets the initial range to the full project span, capped at today. Presets exist: "Last 2 weeks" (`date-range.tsx:334-348`, button `:517-520`), "To Date" (`:350-362`), "Next 2 weeks" (`:364-378`). With "Last 2 weeks" selected, every Gantt Actual % becomes progress earned in the last fortnight — still labelled `Actual %` with no indication of the window.

**Tangible/intangible branch.** `docs/dashboard/api/planned-and-actual-activity-schema.md:7` (David Webb): zero linked elements ⇒ `ReportedLaborUnits / PlannedLaborUnits`. `activity-progress-v2-loader.ts:145-153` carries `LinkedElements`/`PlannedLaborUnits`; `api-activities-loader.ts:88-105` **drops** `isUserProgress`, `validForProgressCalculations`, `actualProgress`, `plannedProgress` when building `api_activities`. **The dashboard can tell tangible from intangible (`linkedElementCount > 0`) but cannot tell user-entered progress from schedule-derived progress at all.** The editor *does* mark this: `components/gantt-x/scheduler/gantt-tooltip.tsx:18` → `'actual-progress-linked': 'Values are driven via linked elements.'` Manual entry is only possible when `elements === 0` (`use-actual-progress-mutation.tsx:36-40`), and it stamps `isUserProgress = true` with **today's** date, not the real completion date.

**No length/quantity metric exists anywhere.** Grep across `services/` and `scheduleService/` for `quantit|unitOfMeasure|uom|length` returns zero progress-related hits. Only element count (tangible) and labour units (intangible) exist. For "Cable Trays" specifically this is a real conceptual gap: the platform measures element count, the customer eyeballs metres of tray run.

**Everything needed to settle this is already loaded client-side** — `activity_links`, `element_status`, `element_base_data`, `api_activities`, `activity_progress` are all in the page's own DuckDB (`dashboard-progress-service.ts:820-858`, `:2115-2160`). No backend access is required to run the diagnostic query below.

**Staleness trap:** the `calculatedOn` timestamp shown on the dashboard only reflects the project-level/category-groups outputs (`progress-outputs-v2-loader.ts:80-82`) — it says nothing about the freshness of the activity-level parquet feeding this column. Also, `dashboard-logger.ts:35` hardcodes `CURRENT_LEVEL = 'SILENT'` — don't plan around reading a log line.

**Routing sanity check.** `v1ProductionRules.tsx:2` / `dashboard-project-provider.tsx:230-233` (added same day, `8d8db2d`, PLT-2764) redirects V1-named projects to the legacy PowerBI dashboard. "Hutto2"/"PBOX - HUTTO2" contains no `v1` ⇒ native dashboard — but worth confirming the exact platform project name.

**Remediation endpoint, if this lands as Pattern 1:** `services/elementService/element-api-service.ts:39-41` — `deleteActivityLinks()`, reversible soft delete, procedure in `incidents/data-remediation-runbook.md`.

## Diagnosis

The frontend performs no install-vs-linked computation — `ActualProgress` arrives pre-computed 0–1 from the parquet, and the FE's only arithmetic is the date-window delta and a `Math.round`. So this is not an ordinary rendering bug, but it is also not automatically upstream: the FE's *window semantics* are capable of making correct data look wrong. This is the PLT-2874 trap — apply the faithful-renderer reflex, but confirm the unit first.

**The two symptoms are almost certainly two different mechanisms** (tentative on symptom 1 — depends on the unopened screenshot):

**Symptom 1 (DH1/B1 — dashboard appears to UNDERstate):**
- **(1a) Gantt `MAX − MIN` window delta subtracts progress earned before the window** — the strongest FE-side candidate, and the sibling aggregate path was already fixed for exactly this while the Gantt column wasn't (`progress-queries-v2-api.ts:706-716` vs `dashboard-schedule-service.ts:455-465`).
- **(1b) Pattern 1 — dead links inflating the linked-elements denominator** (would be the 4th confirmed project).
- **(1c) Count-vs-length unit mismatch** — not a defect, but would make the ticket unresolvable as filed for a linear-quantity package like cable trays.
- Also cheap to rule out: a parent/WBS row with no children in-window rendering `0%` via `COALESCE`.

**Symptom 2 (DH2/E3 — dashboard OVERstates, "25% while no items installed"):** mechanism 1a **cannot** produce this (if nothing is ever installed, `MAX − MIN` is 0). Candidates:
- **(2a) Intangible activity (`LinkedElements = 0`)** — the 25% is reported labour, not installs, and the customer's own ticket title ("Tangible Activities") may be the wrong assumption. Most likely candidate. Second sighting of PLT-2917's mechanism if confirmed.
- **(2b) Links scoped to the wrong subsection** — same trigger family as PLT-2909 (PC-EXCEL cross-write).
- **(2c) Small denominator, one stray claim** — 25% = 1/4, cheap to confirm or kill.
- **(2d) Customer misread across rows in the tree grid** — not dismissible without the screenshot.

**One query, run in the page's own DuckDB, discriminates all of the above** — see recommended action.

## Confidence

**5/10 overall** (per `CLAUDE.md`'s scale: "approach is clear but behaviour is environment-dependent"). Split by claim:

| Claim | Conf. |
|---|---|
| FE computes no install ratio; Actual % is backend-computed and read from parquet | 9/10 — code-verified |
| Gantt `Actual %` is an unlabelled within-window `MAX − MIN` delta; sibling path was fixed, this one wasn't | 9/10 — direct code comparison |
| Tangible/intangible branch exists; dashboard can't show which applies (`isUserProgress` dropped at load) | 9/10 — schema doc + loader code |
| No length/quantity metric exists | 8/10 — exhaustive grep, negative result |
| Mechanism 1a explains symptom 1 on Hutto2 specifically | 5/10 — needs the selected date range |
| Mechanism 2a explains symptom 2 on Hutto2 specifically | 4/10 — needs one row of `LinkedElements` |
| Symptoms 1 and 2 are two distinct mechanisms | 7/10 — a delta artifact cannot mathematically produce 25% where nothing is installed |

Nobody has run a query or opened a screenshot yet; a ranked mechanism list plus a one-shot discriminating diagnostic is the honest output of a first pass, not an inflated confidence score.

## Recommended action (drafted, not executed)

See `recommended-action.md` in this folder for the full drafted comment and diagnostic SQL.
