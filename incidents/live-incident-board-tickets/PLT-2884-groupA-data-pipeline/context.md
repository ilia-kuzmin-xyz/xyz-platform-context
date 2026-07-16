# PLT-2884 — "EQX-AT10 New dashboard error" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2884
- **Issue type:** Live Incident ("To track live incidents on site.") · Software Area: **Dashboard**
- **Status:** **With Customer** (category: In Progress / yellow). Status-category last changed **2026-07-14**. Per this folder's scope rules, "With Customer" = in-scope-but-parked (ball with the client). Freshdesk **#7384**, last set "Waiting on customer" (2026-07-10).
- **Priority:** **Critical**
- **Project (site):** **EQX-AT10** — Equinix AT10x (Mongo project id `6808f6afae311c4f8409624f`)
- **Reporter / Assignee / Creator:** Yash Patel (support/coordinator). Watchers: 2 (Yash + Ilia).
- **Created:** 2026-07-09 · **Last updated:** 2026-07-14
- **Components / Labels:** none
- **Domain slug chosen:** `data-pipeline` (deviates from the obvious `progress-tracking` — justified below)
- **Attachments:** 3 × `.png` (activity screenshots), 1 × `.xlsx` data export, 1 × `.xer` P6 schedule — **all unreadable here, see NEEDS HUMAN.**

---

## One-line symptom

On the **new (native Platform / DuckDB) dashboard** for Equinix AT10x, the project **Actual %** is **lower** than on the **old (Power BI) dashboard** — **23.85% (new) vs 27.37% (old), a −3.52 pp gap**. A subset of activities show **actual progress on the old dashboard but ~0 / missing on the new one**. Named example: **"Install Temp Power", activity `EL1031000`** (plus the two other screenshotted activities, **"Line Side Feeders"** and **"MUW Tank Northside Installation"**). Crucially, the customer reports **those same activities show the OLD (correct) numbers in the web-viewer Editor-Progress**, and that "Hussein" found "some activities were missing from the source data" in Power BI.

---

## Playbook questions applied

**1. What exactly is observed — can we observe it?** A project-level Actual-% gap (old 27.37% vs new 23.85%) plus a set of per-activity gaps where old > new. We **cannot** observe it directly yet: the `.xlsx` (the customer's own old-vs-new export — the decisive artifact listing which activities differ) and the `.xer` are behind Atlassian/Freshdesk auth (NEEDS HUMAN). The three `.png`s show single-activity detail we also can't read. So today this is still a **reported** observation, not one reproduced in our hands.

**2. Expected, on whose authority?** The reference is the **old Power BI dashboard (27.37%)**, corroborated by **the web-viewer Editor-Progress showing the same old numbers**. That second reference is the important one: the Editor reads live activity/installation data, and it **agrees with Power BI** — so for the flagged activities the actual-progress data **exists in the platform ecosystem**; the new dashboard is the lone disagreer. "Old dashboard is right" is therefore backed by a second independent surface, not folklore.

**3. Smallest broken-vs-working pair.** Handed to us at two granularities: (a) project 27.37% vs 23.85%; (b) **activity `EL1031000` "Install Temp Power"**: has actual on old + editor, ~0 on new. The diff to run is a single-activity pipeline walk (see Mechanism / NEEDS HUMAN) — the playbook's Step-1 "reproduce on one activity" move.

**4. Mechanism — what decides it?** See next section. Two live hypotheses, and they are **not** the same bug:
   - **H1 (Mostafa's, on-ticket):** the customer's **XER schedule file itself** is bad — activities missing / malformed in the source, so the platform pipeline legitimately has nothing to show. Fix = customer re-uploads a corrected XER.
   - **H2 (platform-side, from the comparison skill):** **Pattern A — intangible activities reporting 0% actual on the Platform parquet.** Activities with `LinkedElements = 0` and `PlannedLaborUnits > 0` (labour-based / "intangible") get `ActualProgress = 0` in the `activity_progress` parquet even though the earned labour exists — Power BI computes `ActualLaborUnits / PlannedLaborUnits` and shows it correctly. This is **independent of the XER** and lives in the parquet generator.

**5. Why now? (trigger)** Not established. The uploaded schedule is `EQIX_AT10x-A11x_Rev_02_updated20260427.xer` — a **Rev_02** dated **2026-04-27**. Plausible unconfirmed triggers: (a) the new dashboard was recently switched on for this project and the old (PBI) had always been computing actuals a different way; (b) a schedule re-version (Rev_02) that the parquet regeneration handled differently from PBI. Must be asked, not assumed.

**6. Cohort.** If H2, the affected set is **every intangible activity on AT10x** (LinkedElements=0, labour>0) — "Install Temp Power" / "Line Side Feeders" are classic non-modelled electrical/temporary works. If H1, it is whichever activities the customer's XER dropped/mangled. The `.xlsx` export is the ready-made cohort list — **unread (NEEDS HUMAN).**

---

## Mechanism — old (Power BI) vs new (Platform) compute Actual % differently

This is the core recurring theme in this codebase (documented in the `dashboard-progress-comparison` skill and the cross-ticket notes for **PLT-2385 / PLT-2874** — "count/linking correctness in the data pipeline"). The two dashboards are two independent pipelines that only *should* agree:

- **New / Platform:** V2 Progress Outputs API → **parquet** files (`project_progress`, `category_groups`, `activity_progress`) → DuckDB-WASM → browser SQL. Per-activity `ActualProgress` is **pre-computed on the backend during parquet generation**; DuckDB just reads the 0–1 value (`activity-progress-v2-loader.ts:83,134-149` loads it as a zero-copy VIEW). Frontend does no progress math. There **is** a client-side XER parser (`ViewerPage/.../schedule-upload-service/schedule-parser/schedule-parser.ts` — reads P6 `TASK`/`PROJWBS`, `task_code`, `act_start_date`, `target_work_qty`), but it is used **only for upload preview/validation** (`schedule-upload-service.tsx:74`); the authoritative ingest is a multipart POST to the backend (`platform-api-service.ts:32`, `/projects/{id}/upload-schedule`), and **actual progress + labour units never come from the FE parser** — they arrive as backend V2 parquet (`dashboard/data-pipeline.md`, `dashboard/progress-tab.md`). So the actual-% discrepancy is a backend parquet-generation / XER-ingest matter, not a frontend one.
- **Old / Power BI:** SQL DB → tabular model → DAX. `[Actual%] = SUM(Fact_Progress[ActualWeight]) / [TotalWeight (ignore dates)]`. For an intangible activity, PBI's actual is effectively `ActualLaborUnits / PlannedLaborUnits` read from `Latest Programme MV`.

**Per-activity actual is decided by whether the activity has linked BIM elements** (`dashboard-progress-comparison` skill, "How ActualProgress Is Computed"):

| Condition | Method | Formula |
|---|---|---|
| `LinkedElements > 0` | tangible (element-based) | `InstalledElements / LinkedElements` |
| `LinkedElements = 0` | intangible (labour-based) | `ReportedLaborUnits / PlannedLaborUnits` |

**Pattern A (confirmed on ELN03, PA12, others):** the parquet generator's **intangible fallback is failing** — activities with `LinkedElements = 0` and `PlannedLaborUnits > 0` come out as `ActualProgress = 0` in the parquet, while Power BI (reading a *different* upstream path) returns the correct `ActualLaborUnits / PlannedLaborUnits`. On ELN03 this depressed each discipline's Actual % by **5–7 pp** — the **same shape and magnitude** as AT10x's **−3.52 pp** project-level gap, in the **same direction** (Platform lower).

**Why this fits AT10x better than the XER-only story:** the customer's own observation that **the web-viewer Editor-Progress matches the OLD dashboard** means the earned actuals for `EL1031000` et al. **exist and are readable** by at least two surfaces (Editor + PBI). A *missing-from-source* / bad-XER cause would make the data absent everywhere; instead it is present everywhere **except the new dashboard's parquet** — which is exactly what Pattern A produces. "Install Temp Power" and "Line Side Feeders" are electrical / temporary-works activities that are typically **not modelled in BIM** → `LinkedElements = 0` → intangible path → prime Pattern-A candidates.

**This does not disprove H1.** Mostafa owns the schedule/data domain and looked at the actual XER; he may have seen a concrete defect (missing activities, duplicated/renamed activity codes, wrong `% Complete Type`, or actuals absent in *this* XER revision). The honest position: **H1 and H2 can both be partly true**, and the "it's the XER file" explanation is *convenient* enough that a real platform-side Pattern-A discrepancy could be riding along unnoticed. The `.xlsx` + one DuckDB query settle it (NEEDS HUMAN).

---

## Diagnosis: XER-only vs a real platform-side discrepancy

**Most likely: a genuine platform-side Actual-% discrepancy (Pattern A) is at least partly in play, not XER-only.** The single most diagnostic fact on the ticket — Editor-Progress agreeing with the old dashboard for the flagged activities — is **unexplained by the bad-XER theory** and is **the textbook signature of Pattern A**. The gap's direction (Platform lower) and magnitude (−3.52 pp) match prior Pattern-A cases. That said, this is **not confirmed against AT10x data**, and Mostafa's XER finding is a real signal from the domain owner, so the two hypotheses remain open. The risk to flag loudly: closing this purely on "customer's XER was bad, re-upload fixes it" may **mask a live parquet-generator bug** — the same failure mode already tracked as PLT-2385/PLT-2874.

---

## Domain slug — why `data-pipeline`, not `progress-tracking`

The symptom is a Progress-tab number, so `progress-tracking` (PRG) is the obvious tag. But **where a fix would live** is the data pipeline: the candidate root cause (Pattern A) is in the **backend parquet generator** (`activity_progress` intangible-actual computation), and the alternative (H1) is **schedule/XER ingestion** — also pipeline. The frontend PRG code does no progress math; it reads pre-computed parquet values. This also keeps AT10x in the **same bucket as its siblings PLT-2385 and PLT-2874**, which the board already files under the "count/linking correctness in the data-pipeline" theme (README cross-ticket notes). Flagging so a human can re-file under `progress-tracking` if the board prefers to tag by surface rather than by fix-owner.

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

- **The two dashboards are independent pipelines that compute Actual % differently, and this is a known recurring discrepancy class:** **8/10** — documented in the comparison skill and PLT-2385/2874.
- **That the operative cause is Pattern A (intangible actuals zeroed in the parquet) specifically:** **5/10** — the direction, magnitude, and the "Editor matches old dashboard" fact all fit, but **not confirmed against AT10x data** (attachments unreadable, no DuckDB query run) and Mostafa's XER finding competes.
- **That it is XER-only (H1) with no platform-side component:** **4/10** — cannot be reconciled with Editor-Progress showing the correct actuals.

**Overall triage confidence: ~5/10.** Clear direction and a strong documented pattern-match, but the XER-vs-platform split is genuinely unresolved and depends on one unreadable export + one data query.

---

## NEEDS HUMAN (attachments I cannot read / data I cannot query)

- ⚠️ **`2026.07.09_EQX-AT10x_Dashboard-error.xlsx`** (attachment id 60494, 3.16 MB) — the customer's own old-vs-new export; **the decisive artifact** (the actual list of which activities differ and by how much). Atlassian `/attachment/content/60494` → **HTTP 403** ("You do not have permission to view attachment"); the Freshdesk mirror (`.../helpdesk/attachments/103331040850`) redirects into a login loop. **Do not guess contents.** It is parseable once a human downloads it (it is a real `.xlsx`).
- ⚠️ **`EQIX_AT10x-A11x_Rev_02_updated20260427.xer`** (attachment id 60531, 4.35 MB) — the P6 schedule Mostafa diagnosed. Same 403. A `.xer` is plain-text tab-delimited and fully parseable once downloaded — worth extracting `EL1031000`'s `% Complete Type`, `ActualLaborUnits`/`RemainingLaborUnits`, and whether it (and the other flagged activities) even appear.
- ⚠️ **3 × `.png`** (`Install Temp Power`, `Line Side Feeders`, `MUW Tank Northside Installation`, ids 60492/60493/60495) — per-activity detail screenshots. Not readable here.
- ⚠️ **Data confirmation (DuckDB console / dev on AT10x, project `6808f6afae311c4f8409624f`):** the Pattern-A diagnostic for `EL1031000` and its cohort —
  ```sql
  -- how many flagged activities are intangible-with-labour but read 0 actual
  WITH am AS (
    SELECT ActivityId, MAX(ActualProgress) max_actual,
           MAX(PlannedLaborUnits) labor_units, MAX(LinkedElements) linked
    FROM activity_progress GROUP BY ActivityId)
  SELECT COUNT(*) affected, SUM(labor_units) unrecognised_labor
  FROM am WHERE linked = 0 AND labor_units > 0 AND max_actual = 0
  ```
  and confirm `EL1031000` specifically (join `api_activities` on `userItemId='EL1031000'`). If it is `linked=0, labor>0, actual=0`, it is Pattern A, not a bad XER.
- ⚠️ **Weighting mode (labour vs element) for AT10x** — Pattern A bites labour-weighted rollups; run the skill's weighting-detection query first.
- ⚠️ **Trigger:** was the new dashboard recently enabled for AT10x, and/or did Rev_02 (2026-04-27) regenerate parquets differently from PBI's path?

---

## Roster / ownership notes

- **Yash Patel** — reporter/coordinator, owns the client channel; the one to re-ping the customer (6 days silent).
- **Ilia Kuzmin** (the operator) — already engaged on-ticket (asked the 07-13 re-upload status). Playbook "mechanism interrogator"; the right person to run the independent `EL1031000` data check.
- **Mostafa Kamel Hussien** — diagnosed the XER file as the cause (07-10). Domain owner for schedule/data; his XER finding must be reconciled with the Editor-Progress fact before closing.
- **"Hussein"** (customer-side, per description) — the person who checked Power BI source data; not an XYZ engineer. Do not conflate with Mostafa Kamel Hussien.
- If Pattern A is confirmed, the fix hop is the **backend parquet-generator team** (per the comparison skill's "upstream parquet generator caveat" — DuckDB reads whatever the parquet contains; the fix is not in the frontend).

## Comment timeline (verbatim gist)

- **07-09 18:58** Yash → Ilia: user reports new-vs-old dashboard differences; "old one shows latest data whereas new one doesn't." 3 activity screenshots inline. "Have asked for XER file also."
- **07-09 19:01** Freshdesk #7384 → "Waiting on 3rd line".
- **07-10 09:25** Yash uploads the `.xer`.
- **07-10 10:46** Freshdesk → "Waiting on customer".
- **07-10 10:47** Yash → Ilia: "Please wait for now as Mostafa has identified the issue. It was with the XER file. We have recommended user to rectify that and come back to us if the issue still persists."
- **07-13 10:50** Ilia → Mostafa, Yash: "Do you know if the customer had a chance to re-upload the schedule?"
- **07-13 10:56** Yash → Ilia: "have asked customer to reupload after rectify it on their end. still waiting for them to get back with outcome."
- **As of 2026-07-16:** no further reply — **~6 days since the re-upload request, 3 days since the status check.**

## Doc / knowledge-base refs

- `dashboard-progress-comparison` skill — old (Power BI) vs new (Platform) architecture; **Pattern A** (intangible actuals = 0 on Platform) and the diagnostic/confirmation queries; "upstream parquet generator caveat."
- `xyz-platform-context/dashboard/progress-tab.md` — PRG calculation modes, weighting; frontend reads pre-computed parquet, does no progress math.
- `xyz-platform-context/dashboard/data-pipeline.md` — Pipeline A (progress parquet) vs Pipeline B; where `activity_progress` comes from.
- README cross-ticket notes — **PLT-2385 & PLT-2874** = the same "count/linking correctness in the data pipeline" theme; PLT-2884 is the **progress-%** sibling.
- `xyz-platform-context/incidents/live-incident-playbook.md` — six-question frame; tone; the **PLT-2815 stale-nudge** precedent for a parked "With Customer" ticket.
