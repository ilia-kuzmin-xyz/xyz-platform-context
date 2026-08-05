# PLT-3010 — "EQX-AT11 New dashboard FIGURES DISCREPANCIES" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3010
- **Issue type:** Live Incident ("To track live incidents on site.") · Issue Type field: Dashboards
- **Status:** **Open** (category To Do) → **Group A**
- **Priority:** **Major** (Freshdesk recorded it as High)
- **Project (site):** **EQX-AT11 / AT11x** — id `6a33bd04cc7baa2868780af2` (Freshdesk #7575)
- **Reporter:** Yash Patel (relaying client **Valeria**) · **Assignee:** **Rishi Bhugobaun**
- **Created:** 2026-08-03 12:25 · **Last updated:** 2026-08-03 17:06
- **Domain slug chosen:** `progress-tracking` (PRG) — the discrepant figures are the Overall Progress tile's Planned % and Actual %.
- **Triage date:** 2026-08-04 · **first pass, no prior run has looked at this ticket**

---

## 0. Live status (verified live 2026-08-04)

Four comments, all on 2026-08-03. Latest activity is administrative, not diagnostic:

- **12:25 Yash** — full Freshdesk #7575 hand-over dump (includes an **LLM-generated** escalation note, see §6).
- **12:56 Yash → Rishi** — the substantive comment. Splits the ticket into Part 1 (fixed) and Part 2 (open) and poses two questions. **This is the current state of the investigation.**
- **17:04 Rishi → Yash** — *"could I get an invite to the project?"*
- **17:06 Yash → Rishi** — *"Invite sent"*

So the assignee has had project access for well under a day and has not yet reported an observation. **Nobody has yet looked at the platform dashboard for AT11x with our own eyes.** Per the playbook that is the single highest-value outstanding move, and it is now unblocked.

---

## 1. What is observed (playbook Q1)

Client reports, for **3 August 2026**:

| Metric | Client "raw data" / Power BI | Platform dashboard | Δ (Platform − client) |
|---|---|---|---|
| **Planned %** | **11.42%** | **10.15%** | **−1.27 pp** |
| **Actual %** | **10.05%** | **10.48%** | **+0.43 pp** |
| *Variance (derived)* | *−1.37* | *+0.33* | — |
| *SPI (derived)* | *0.88* | *1.03* | — |

**The decisive structural fact, and the thing to lead with: the two legs disagree in OPPOSITE directions.** Platform Planned is *lower*, Platform Actual is *higher*. Everything else follows from that (see §4).

**The real business impact is the sign flip, not the pp gaps.** The client's numbers say AT11x is *behind* schedule (SPI 0.88). The dashboard says it is *ahead* (SPI 1.03). Two surfaces disagreeing by a point is a data question; two surfaces disagreeing about whether the job is ahead or behind is what makes this Major.

**VERIFIED — the reported dashboard pair is internally consistent, so the FE received exactly 10.15 / 10.48 and did not mangle them.** `use-progress-metrics.ts:24-25` computes `variance = actual − planned` and `spi = actual / planned`. With 10.48 and 10.15: variance = 0.33 ✓ and SPI = 1.0325 → 1.03 ✓, both matching the tile in the ticket. The same two formulas appear in the Pipeline-B formatter (`format-overview-data.tsx:21-23`). This is a small check but it earns its place: it rules out the whole class of "the tile is doing bad arithmetic on good inputs" and means the numbers arrived from DuckDB already wrong (or already right and mis-compared).

**We cannot observe AT11x ourselves in this environment** (no DuckDB, no Power BI, no runtime; `npm ci` fails on a private package). This is a code-and-docs pass plus a ticket read. Rishi now can observe it.

## 2. What did we expect, on whose authority? (playbook Q2)

Two references are being conflated in the ticket and they are **not the same artefact**:

1. **"The raw data"** — Valeria's own consolidation in `EQX-AT11x_Dashboard_Data.xlsx`, built by her from an XER in Excel.
2. **Power BI** — the escalation note claims *"the customer's own Power BI screenshot header also shows 11.42% / 10.05%"*, i.e. that (1) and (2) agree.

That claim is **INFERRED from an LLM-written note, not verified by a human** (§6), and it matters a great deal. If Power BI and the spreadsheet genuinely agree, the reference is two independent systems and is strong. If the 11.42/10.05 in the "Power BI" screenshot is actually Valeria's spreadsheet figure typed into a header, or the same consolidation feeding both, then we have **one** reference, hand-built in Excel, being treated as ground truth. Per the playbook, "the reference itself was wrong" kills half of all data incidents, and per `recurring-defect-patterns.md` the Power BI side carries at least six confirmed over/under-count bugs of its own (Patterns D, F, G, H, I). Neither number is ground truth yet.

**Also unresolved: which XER.** Two are attached, `EQXAT10-11xRev02-WREphys.xer` and `EQXAT10-11xRev02-WREphys_updated.xer`. Nobody has stated which one produced 11.42 / 10.05. Given Part 1 below turned on hours moving between groups, the vintage of the customer's consolidation is load-bearing, not housekeeping.

**And note the schedule is a combined AT10x + AT11x file** (`EQXAT10-11x...`), while the platform project is AT11x alone. Any Excel consolidation off that file has to filter to Bldg 11 correctly to be comparable. Part 1 proved that exact grouping was wrong at least once on this schedule.

## 3. Smallest broken-vs-working pair (playbook Q3)

**We do not have one yet, and this is the main gap in the ticket.** Everything on PLT-3010 is project-level rollup. PLT-2884 (the AT10x sibling) was far more tractable because the client named a single activity, `EL1031000`, that disagreed. Here there is no named activity, no named package, no discipline breakdown.

`EQX-AT11x_Dashboard_Data.xlsx` (2.3 MB) is almost certainly the per-activity or per-package export that would supply the pair, and it is unopenable here (§7). Getting a **package-level** or **activity-level** split of the 1.27 pp and 0.43 pp is worth more than any further reasoning about the two project totals, because a rollup gap tells you nothing about its own composition.

The four activities from Part 1 (`DF999040`, `DF999050`, `DF999060`, `DF999070`) are the nearest thing to a known-interesting pair we have.

## 4. Mechanism — how the Platform tile is computed (playbook Q4)

All **VERIFIED by reading the code** in this pass.

**Default weighting** is labour hours: `DEFAULT_PROGRESS_WEIGHTING = { method: PLANNED_LABOUR_HOURS, plannedProgressColumnName: 'LaborWeightedPlannedProgress', actualProgressColumnName: 'LaborWeightedActualProgress' }` (`app/types/progress-weighting-types.ts:17-23`). The per-project Progress Weighting API can override this to `LINKED_ELEMENT_COUNT`.

**Project-level path** (no discipline/package filter active) — `progress-queries-v2-api.ts:124-152`:
```sql
actual  = (COALESCE(e.EndActualProgress,0)  - COALESCE(s.StartActualProgress,0))  * 100
planned = (COALESCE(e.EndPlannedProgress,0) - COALESCE(s.StartPlannedProgress,0)) * 100
```
where each boundary is `... WHERE CalendarDate <= '<date>' ORDER BY CalendarDate DESC LIMIT 1`. So the tile is a **cumulative delta across the selected date range**, and both legs come from the *same row pair* of `project_progress`.

**Package-level path** (a discipline/package filter is active) — `:193-263`:
```sql
actual  = SUM(ActualDelta)  / NULLIF(SUM(Weight),0) * 100
planned = SUM(PlannedDelta) / NULLIF(SUM(Weight),0) * 100
```
with `AND ${weightColumn} > 0` on **both** boundary CTEs (`:218`, `:235`). Zero-weight packages are dropped from numerator *and* denominator.

**Baseline is a separate, hardcoded column.** `LaborWeightedBaselineProgress` at `:129`, `:139`, `:148` — always labour-weighted regardless of the selected weighting method. **So the tile's "Planned" is the live/current programme, and the baseline is a distinct third series.** This is the hinge for H1 below.

**Default date range on load** — `dashboard-progress-service.ts:244-301`. `_queryDataDateRange()` takes `MIN(CAST(startDate AS TIMESTAMP)::DATE)` and `MAX(finishDate)` from `api_activities` (falling back to `project_progress`, then `category_groups`), then **caps the end at today**: `const cappedEndDate = range.endDate < today ? range.endDate : today` (`:299-301`). So the default window is [earliest activity start → today].

That last finding **cheaply kills a hypothesis I expected to matter**: because the default window starts at project start, `StartActualProgress ≈ 0` and the delta is effectively the absolute cumulative figure. A "the Platform is clipping early progress because its range starts late" story does not survive the default view. It only becomes live if the user moved the slider — hence the date question in §5.

**Per-activity inputs (from the `dashboard-progress-comparison` skill, backend-computed at parquet generation, DuckDB only reads them):**
- `PlannedProgress = LiveWorkDayIndex / LivePlannedDurationDays`, over working days on the activity's calendar.
- `ActualProgress` = `InstalledElements / LinkedElements` when `LinkedElements > 0` (tangible), else `ReportedLaborUnits / PlannedLaborUnits` (intangible).

**Two labels in the ticket are NOT ours.** "Weight 45%" and "RW Weight 605,302.46" are attributed to "the dashboard tile" by the escalation note. `rg -i 'RW Weight|rwWeight'` across hc-frontend returns **no matches**, and the progress overview section renders only Planned, Variance and SPI beside the headline (`format-overview-data.tsx:50-86`). Those are **Power BI card labels**, and Yash's own comment supports that ("*matches the change in total weight on the Power BI card exactly*"). Anyone reasoning from "the dashboard shows RW Weight 605,302.46" is reasoning about the wrong surface.

## 5. Root-cause hypotheses, ranked, each with a falsifiable prediction

Ranking doctrine from `recurring-defect-patterns.md` Pattern 3: *"the first question is not 'what is wrong with the data' but 'what is this surface configured to show'."* Configuration checks therefore go first, cheapest first. Every hypothesis below is stated as a prediction that can fail.

**The opposite-sign constraint does most of the ranking work.** Any mechanism that shifts a shared denominator, snaps a shared date boundary, or serves stale data moves Planned and Actual **the same way**. Observed here they move in *opposite* ways. So no single such mechanism can be the whole answer. Either the cause touches the two numerators differently, or this is two effects, or the comparison is not like-for-like. Say this out loud in the thread, because it is the one inference that is free and it eliminates a large theory class.

### H1 — Not like-for-like: weighting basis and/or filter state differ between the surfaces
The tile's weighting basis is per-project and can be `LINKED_ELEMENT_COUNT` instead of labour hours (`progress-weighting-types.ts:17-23`). Power BI has no weighting variants at all; its weighting is baked into `ActualWeight` / `DailyPlannedWeight`. Element-reweighting redistributes both legs independently, so it can move Planned down and Actual up with no defect anywhere. The XYZ Tracked toggle (swaps to `project_progress_xyz`) and any active discipline/package chip do the same, and the package path additionally drops zero-weight packages (`:218`, `:235`).
- **Prediction:** AT11x's Progress Weighting setting reads **Model element count**, and/or a filter chip or XYZ Tracked is on in Valeria's screenshot. Flip to **Budgeted labour units** with all filters cleared and the Planned figure moves materially.
- **Falsified if:** the setting is already Budgeted labour units, no chips, XYZ Tracked off — then this is a genuine data disagreement and H2/H3 carry it.
- **Cost:** seconds, from the UI. Rishi has access as of yesterday 17:06.

### H2 — The Plan leg is live programme vs baseline, i.e. a label mismatch not a defect
**VERIFIED precondition:** the tile's Planned is `LaborWeighted*Planned*Progress`, and baseline is a *separate* `LaborWeightedBaselineProgress` series (`:129/:139/:148`). In P6, when a job slips and activities are pushed right, the **live** programme's planned-% at the data date falls **below** the baseline's. If Valeria's Excel "Plan 11.42%" is computed off baseline / BL target dates while our tile shows the live re-forecast, Platform-lower-on-Plan is the *expected* result. This is the best single explanation of the Plan leg's sign and rough size, and it implies no bug at all.
- **Prediction:** the Platform's own **Baseline %** for AT11x on 3 Aug reads **≈11.4%**, materially above its Planned 10.15%.
- **Falsified if:** Baseline reads near 10.15% too, or Valeria confirms she used live/current dates. Then the Plan gap is real and needs its own mechanism.
- **Cost:** one screenshot of the tile. **This is the cheapest test that could dissolve the larger of the two gaps, which is why it is the drafted action.**

### H3 — The Actual leg is a schedule-vintage artefact of Yash's own Part 1 fix
Yash's Part 1 (VERIFIED, his comment): `DF999040/50/60/70` (Rammed Aggregate Piers, Bldg 11) showed **0 hours despite being 100% done**, because they moved from the AT10x group to the AT11x group and their hours did not move with them. Correcting it added **2,719.75 hours**. Note in passing that on a labour-weighted project a 0-hour activity contributes nothing at all to a rollup and is dropped outright by the package path's `weightColumn > 0` (`:218`, `:235`) — so this defect was structurally invisible in the rollup until someone counted hours.

Arithmetic, and it is suggestive. Take the client's 10.05% as **pre-fix** on a denominator 2,719.75 lower than 605,302.46, and add 2,719.75 hours of fully-complete work to both numerator and denominator:
> pre-fix actual numerator = 0.1005 × 602,582.71 = 60,559.6
> post-fix = (60,559.6 + 2,719.75) / 605,302.46 = **10.45%**, against the observed **10.48%**. Within 0.03 pp.

- **Prediction:** Valeria's 10.05% was produced from the **pre-fix** state (or the non-`_updated` XER), and the dashboard is post-fix. Re-running her consolidation on the `_updated` XER lands her Actual at ~10.45%.
- **I am partially falsifying this myself, and it is important not to bury it.** Those 2,719.75 hours belong to *past, complete* activities, so they should also be ~100% **planned** at the data date. The same arithmetic then predicts Plan rises to (0.1142 × 602,582.71 + 2,719.75) / 605,302.46 = **11.82%** — but the dashboard shows Plan *falling* to 10.15%. **So H3 cannot explain both legs, and it is not a single-cause story.** It fits the Actual leg well and contradicts the Plan leg badly. That is exactly why H2 is needed alongside it rather than instead of it. Treat the 0.03 pp agreement as a promising coincidence to test, not as a solved Actual leg: one arithmetic near-miss on a two-variable equation is weak evidence on its own.

### H4 — Scope mismatch: combined AT10-11 XER vs AT11x-only platform project
The attached schedule is `EQXAT10-11xRev02`, a combined Bldg 10 + Bldg 11 file. The platform project is AT11x. If Valeria's Excel filter to Bldg 11 differs from the platform's grouping by even a few activities, both legs move independently. **Part 1 is direct evidence that this schedule's group assignment has already been wrong once**, on these very buildings, which raises the prior considerably.
- **Prediction:** AT11x's activity count and total planned hours on the platform differ from the Bldg-11 subset of her spreadsheet. `TotalPlannedLaborUnits` at project level is not 605,302.46.
- **Note the unit discipline here.** Before comparing 605,302.46 against anything, confirm both sides are summing the same thing over the same population. `recurring-defect-patterns.md` Pattern 4 step 2 is explicit that this family of bug has hit this board repeatedly and that `COUNT(*)` vs `COUNT(DISTINCT id)` style checks come *before* value comparison. PLT-2874 burned three weeks by skipping it.

### H5 — Power BI side is the wrong one
The client's reference is not ground truth. `recurring-defect-patterns.md` and the comparison skill document Pattern D (weekend-zero → PBI Planned denominator loses weight), Pattern F (stale `Fact_Progress` / `FactPlannedProgress` rows from prior schedule revisions, which **inflates PBI's Planned**), G (row dedup), H, I. Pattern F's undercount shape in particular pushes PBI Planned *up*, which is the observed direction.
- **Prediction:** on AT11x, `FactPlannedProgress` carries `DailyPlannedWeight` rows on dates belonging to a superseded schedule revision.
- **Cost:** needs a Power BI owner. Park until H1/H2 are answered.

### Explicitly deprioritised, and why — Pattern A (intangible Actual = 0)
Pattern A was the leading hypothesis on the AT10x sibling PLT-2884, so the reflex is to reach for it here. **Direction rules it out as the primary cause.** Pattern A makes the *Platform* Actual **lower** than Power BI. On PLT-2884 that was the symptom (Platform 23.85 vs PBI 27.37). On PLT-3010 the Platform Actual is **higher**. Recording this as an elimination rather than silently dropping it, because "same project family, therefore same bug" is the specific error this ticket invites.

## 6. The Freshdesk escalation note is machine-generated — do not treat it as analysis

The bulk of Yash's 12:25 comment is an **automated escalation note**, and the note discloses its own provenance: *"The automated quality check flagged the drafted answer for review (recommendation: **reject**, score **0.45**). It has been escalated for human review."* It contains a plausible-looking five-hypothesis ranking that no human has vetted, and it is already wrong on at least one checkable fact (it attributes the Power BI card's "Weight / RW Weight" labels to our dashboard tile — §4). Its hypothesis 1 also leans on Portfolio Dataflows guidance from cited sources `[1]/[2]/[8]` that are not reproduced anywhere in the ticket.

Its list overlaps genuinely useful ground (stale XER revision, scope mismatch, data date) and those overlaps are reflected in §5 on their own merits. But a reader skimming PLT-3010 will read that block as a colleague's triage. It is not. Flagging it so the next pass does not inherit unearned confidence, and so nobody re-derives the RW Weight error.

## 7. NEEDS HUMAN — attachments (5, all unopenable here) + data/env

**All five attachments return HTTP 403** from the Jira attachment-content API with this MCP token (verified this pass: ids 61942-61946 all `http=403`, 94-byte error body). Same permission wall as PLT-2884 and PLT-2917; it is an Atlassian scope limit, not a proxy fault, and retrying will not help. Freshdesk also warns it could not virus-scan them. **This ticket is a brand-new report whose entire evidential weight sits in files we cannot open** — the description alone gives four numbers and no breakdown.

| # | Attachment | id | Type / size | What it would settle |
|---|---|---|---|---|
| 1 | `2026.08.03_AT11 dashboard progress.png` | 61945 | png, 37 KB | ⚠️ **Highest value per byte.** Settles **H1 and H2 at once**: the weighting-method setting, any active filter chips, XYZ Tracked state, **the exact date-range slider endpoints**, the **Baseline %**, and the `calculatedOn` "last updated" stamp. The two dates quoted in the escalation note (`03/06/2024`, `03/08/2026`) are probably the slider ends but that is unconfirmed, and even their format (dd/mm vs mm/dd) is ambiguous from text. |
| 2 | `2026.08.03_AT11 prower bi progress.png` | 61944 | png, 89 KB | Confirms whether Power BI *itself* shows 11.42 / 10.05, or whether that pair is the spreadsheet's. **This is the §2 authority question** and it decides whether we have one reference or two. Also whether PBI has a date filter applied. |
| 3 | `EQX-AT11x_Dashboard_Data.xlsx` | 61943 | xlsx, 2.3 MB | ⚠️ **The decisive artefact for §3.** Almost certainly the per-activity/per-package consolidation. Would give the missing broken-vs-working pair, the package-level split of both gaps, her actual denominator, and her Bldg-11 filter (H4). |
| 4 | `EQXAT10-11xRev02-WREphys.xer` | 61942 | XER, 4.15 MB | Baseline vs live dates for H2; and grep `DF999040/50/60/70` for the pre-fix 0-hours state. |
| 5 | `EQXAT10-11xRev02-WREphys_updated.xer` | 61946 | XER, 4.15 MB | The post-fix counterpart. **Diffing 4 against 5 on those four activity codes settles H3's vintage question directly**, and the 116-byte size difference between them suggests a genuinely small edit. |

**Also NEEDS HUMAN / dev+data:**
- ⚠️ **Rishi opens the AT11x dashboard himself** and reads off: weighting method, filter/XYZ state, slider dates, Planned, Actual, Baseline, `calculatedOn`. He was invited 2026-08-03 17:06 and has not yet reported. This is the playbook's Phase 4 "repro in our hands" and it is now unblocked.
- ⚠️ **Which XER produced 11.42 / 10.05** (Yash → Valeria). Pre-fix or `_updated`.
- ⚠️ **"Why now"** — has AT11x been re-ingested since the 2 Aug fix, and what is the parquet `calculatedOn`? Yash asserts the dashboard refreshed after 2 Aug; that is worth a timestamp rather than an assertion. The playbook is blunt that an unowned "what changed" question is how incidents recur.
- ⚠️ **Cohort:** AT10x shares this combined schedule and PLT-2884 is the same complaint one building over. If a group-assignment or vintage story lands, sweep AT10x too rather than waiting for the next ticket.

## 8. Confidence (per `xyz-platform-context/CLAUDE.md` scale)

Not rounded up. This is a first pass with zero data access on a one-day-old ticket.

- **Mechanism: how the Platform tile computes Planned/Actual/Baseline, its delta window, default date range, weighting and zero-weight exclusion — 8/10.** Read directly in `progress-queries-v2-api.ts:124-263` and `dashboard-progress-service.ts:244-301`.
- **That this is not a frontend rendering bug — 8/10.** The FE performs only `variance` and `spi` on values DuckDB hands it, and the reported tile is arithmetically consistent with those two formulas, so the inputs arrived as 10.15 / 10.48. Consistent with `recurring-defect-patterns.md` Pattern 2, and note that doc's own warning that Pattern 2 was wrong on PLT-2874: the reflex is applied here, not assumed.
- **That the comparison is not like-for-like (H1 or H2), i.e. some of the gap is not a defect — 5/10.** H2's precondition is verified in code and the direction fits, but nothing is confirmed against AT11x and I have not seen the screenshot that would show the settings.
- **That H3 explains the Actual leg — 4/10.** The 0.03 pp arithmetic agreement is striking, but I falsified its Plan-side prediction myself (§5), it rests on assuming pre-fix vintage for the client's figure, and one near-miss on a two-variable equation is weak.
- **That any single named hypothesis is the operative cause — 4/10.** The opposite-sign constraint actively argues for two effects rather than one.
- **Overall triage confidence: 5/10.** The mechanism is well understood and the hypothesis set is ranked and falsifiable, but the decisive evidence is a 37 KB screenshot behind a 403 and a dashboard nobody on our side has opened yet. Approach is clear; the answer is environment-dependent.

## 9. Relationship to the rest of the board

| Ticket | Relation |
|---|---|
| **PLT-2884** (EQX-AT10x, Done) | **Closest sibling.** Same client family, same combined `AT10x-A11x Rev_02` schedule, same "new dashboard disagrees with Power BI on progress %" complaint, one building over. But **the Actual leg points the opposite way** (there Platform was lower, Pattern A was the lead theory; here Platform is higher, which eliminates Pattern A as primary). Read `PLT-2884-groupA-progress-tracking/context.md` before this one — inherit the method, not the diagnosis. It is also the reason to ask *why an AT10x-family ticket closed and its sibling opened three weeks later*. |
| **PLT-2874** | The cautionary tale, and the reason §5 puts the unit check ahead of the value check. Three weeks classified as a data problem; it was a labelling problem. |
| **PLT-2946** (Hutto2, With Technical Support) | **Checked live this pass: a cousin, not a sibling.** Different project (Hutto2, not EQX), and the complaint is *per-activity* element-based Actual % on the Cable Trays package ("25% actual while no items are installed"), not a project rollup vs Power BI. Different level, different surface. Do not merge. |
| `recurring-defect-patterns.md` **Pattern 2 / 3 / 4** | Pattern 4 is the governing method (pin each number to a query before comparing; unit before value; name the source artefact; quantify each layer separately). Pattern 3 sets the ordering in §5. Pattern 2 is the reflex, applied with its own stated caveat. |

## 10. Doc / code references

- `dashboard/progress-tab.md` — delta-within-range semantics (`:13`, `:42`), calculation modes, weighting, zero-weight exclusion (`:55`).
- `dashboard/pitfalls.md:129-140` — `weightColumn > 0` hiding zero-weight categories.
- `dashboard/data-pipeline.md` — Pipeline A (V2 Progress Outputs parquet) vs Pipeline B.
- Skill `dashboard-progress-comparison` — Platform vs PBI architecture, per-activity tangible/intangible Actual, Known Bug Patterns A-I, the 3-level comparison workflow and its export queries.
- `incidents/live-incident-playbook.md` — Q1-Q6 frame, message craft, question bank.
- Code, all verified this pass: `progress-queries-v2-api.ts:124-152` (project delta), `:193-263` (package weighted delta, `:218`/`:235` zero-weight), `:129/:139/:148` (baseline column); `dashboard-progress-service.ts:244-301` (default range, `:299-301` end capped at today); `use-progress-metrics.ts:24-25` (variance, SPI); `format-overview-data.tsx:21-23`, `:50-86` (tile fields); `app/types/progress-weighting-types.ts:17-23` (default weighting).

## RESOLVED 2026-08-04 — root cause was weighting basis, not a data or calculation bug

Full arc happened after this file's last entry, on `main` before this run started (08-04 comments,
read live this run since the ticket left scope). **Two separate findings, worth keeping apart:**

1. **Part 1 (fixed 2 Aug, before this file's analysis above was even written):** four activities
   (`DF999040/50/60/70`, Rammed Aggregate Piers Bldg 11) had been moved from the AT10x group to
   AT11x without their hours moving too — 2,719.75 hours restored, matching the Power BI weight
   change exactly. Unrelated to the hypothesis set above; Valeria confirmed this leg fixed.
2. **Part 2 (the actual remaining gap this file investigated):** Ilia found it 08-04 — **AT11x was
   configured on element weighting, Power BI computes on labour weighting.** Not a bug on either
   side; a per-project setting. Pietro confirmed users change this from project settings. Customer
   confirmed AT11x should match AT10x (labour), Freshdesk closed 08-04T14:12.
3. **This file's hypothesis set (scope/filter mismatch, weighting basis as hypothesis #3, data-date
   mismatch) correctly flagged weighting basis as a live candidate** (§ hypothesis list references
   "Weight 45% / RW Weight 605,302.46... worth confirming this weight basis matches") — worth noting
   for calibration: the reasoning that produced a 5/10 triage confidence had already named the right
   mechanism as one of several candidates, it just wasn't yet isolated as *the* answer.
4. **Not verified this run:** the attachments (all 403 throughout this ticket's life) were never
   opened by any run; the resolution came from Ilia/Pietro/Yash's live back-and-forth, not from the
   screenshots or XERs this file spent most of its analysis on. Worth remembering next time a ticket
   like this arrives — a project-settings mismatch is now a named candidate to check early (see
   `recurring-defect-patterns.md`), before the deep dashboard-vs-PowerBI query work this file did.

**Folder renamed** `PLT-3010-groupA-progress-tracking` → `PLT-3010-resolved-progress-tracking` per
the PLT-2892 convention (ticket is Done, kept as historical context, not re-litigated).
