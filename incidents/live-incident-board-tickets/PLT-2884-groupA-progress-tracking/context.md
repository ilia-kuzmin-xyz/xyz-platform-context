# PLT-2884 — "EQX-AT10 New dashboard error" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2884
- **Issue type:** Live Incident ("To track live incidents on site.") · Software Area: Dashboard
- **Status:** **With Customer** (category: In Progress / yellow) → **Group A** (parked, ball with client)
- **Priority:** **Critical**
- **Project (site):** **EQX-AT10 / AT10x** — id `6808f6afae311c4f8409624f` (Freshdesk #7384)
- **Reporter & Assignee:** **Yash Patel** (support/coordinator relaying the client)
- **Created:** 2026-07-09 · **Last updated:** 2026-07-14 (status-category timestamp only — **no comment after 2026-07-13**)
- **Components / Labels:** none
- **Domain slug chosen:** `progress-tracking` (PRG) — the symptom is the Overall Progress **Actual %** and per-activity progress; squarely `dashboard/progress-tab.md` territory.
- **Triage date:** 2026-07-20

---

## 0. Live status (verified live 2026-07-20)

**No customer response yet.** The latest activity on the ticket is still:
- **2026-07-13 10:50 — Ilia Kuzmin:** asks Mostafa/Yash whether the customer has re-uploaded the schedule.
- **2026-07-13 10:56 — Yash Patel:** *"have asked customer to reupload after rectify it on their end. still waiting for them to get back with outcome."*

Nothing after that. The 2026-07-14 `updated` timestamp is a status/field change, not a new comment. So it has been **~1 week parked With Customer with no client reply.** The ball is genuinely with the client per the working theory (below), but the wait is now long enough to warrant a nudge — see `recommended-action.md`.

---

## 1. What is observed — and can we observe it? (playbook Q1)

Client (via Yash) reports the **new (Platform) dashboard's progress doesn't match the old (Power BI) dashboard** for AT10x:

| Metric | Old DB (Power BI) | New DB (Platform) | Variance |
|---|---|---|---|
| **Actual %** | **27.37%** | **23.85%** | **3.52%** (new is **lower**) |

Two supporting observations from the client (both load-bearing, both in text — not trapped in the screenshots):
1. *"some activities on the old dashboard have progress, but the new dashboard doesn't show it"* — example **"Install Temp Power", Act `EL1031000`**.
2. *"Some of these activities also have the same numbers as in the old dashboard when I check the web-viewer **Editor-Progress**."*
3. *"We checked with Hussein in Power BI and found some activities were missing from the source data."*

**Direction is the decisive fact: NEW < OLD.** The new (Platform) dashboard shows *less* progress and is *missing* progress that the old (Power BI) dashboard has. **We cannot observe AT10x ourselves** (no runtime/DuckDB/PBI access) — this is a code-and-docs diagnosis plus a client-supplied export we cannot open (see §7).

## 2. What did we expect, on whose authority? (playbook Q2)

The reference the client trusts is **Power BI (the "old" dashboard) = 27.37%**. That is itself a claim to verify, not ground truth — the comparison skill's Known Bug Patterns library documents **several Power-BI-side over/under-count bugs** (stale `Fact_Progress` rows from prior schedule revisions, weekend-zero, row dedup, legacy-schedule element pull). So "old = 27.37% and it's right" is an assumption. But note those PBI bugs mostly cause PBI to *over*count — which would *widen* a "new is lower" gap, consistent with, not against, the direction here.

The **third client observation is the most useful reference**: the Platform figure *matches the web-viewer Editor-Progress* for some activities. That is **expected behaviour, not a symptom** — see §4.

## 3. Smallest broken-vs-working pair (playbook Q3)

Handed to us already: **activity `EL1031000` ("Install Temp Power")** — has progress on old (PBI), zero/absent on new (Platform) — vs any activity that *does* match across both. This single activity is the whole diagnosis (see §5 decisive test). "Install Temp Power" is, by name, a **temporary-works / electrical-setup activity** — exactly the kind of activity that typically has **no linked BIM elements** (it is intangible/labour-tracked, not element-tracked). Hold that thought for §4.

## 4. Mechanism — how the two dashboards compute Actual, and where they diverge (playbook Q4)

Two independent pipelines feed the "same" number (from `dashboard/data-pipeline.md`, `dashboard/progress-tab.md`, and the `dashboard-progress-comparison` skill):

- **Old = Power BI:** SQL/tabular model. `Actual% = SUM(Fact_Progress[ActualWeight]) / [TotalWeight]`.
- **New = Platform:** V2 Progress-Outputs parquet → DuckDB. Overall Actual is a weighted roll-up of **per-activity `ActualProgress`** values that are **pre-computed by the backend parquet generator** (DuckDB only reads them).

**Per-activity `ActualProgress` on the Platform is computed two different ways depending on links** (skill § "How ActualProgress is Computed"):

| Condition | Method | Formula |
|---|---|---|
| `LinkedElements > 0` | **Tangible** (element-based) | `InstalledElements / LinkedElements` |
| `LinkedElements = 0` | **Intangible** (labour-based) | `ReportedLaborUnits / PlannedLaborUnits` |

Two consequences that explain *this exact symptom + direction*:

- **(a) The "matches Editor-Progress" clue is expected, not a bug.** For tangible activities the Platform Actual = `InstalledElements / LinkedElements` — the *same* element-installation source the web-viewer editor shows. So the Platform agreeing with the editor is the system working correctly; it is not evidence that the schedule is corrupt.
- **(b) The intangible path is a known Platform defect — comparison skill "Pattern A".** On projects like ELN03 the intangible fallback produces **`ActualProgress = 0`** for activities with `LinkedElements = 0` and `PlannedLaborUnits > 0`, while **Power BI correctly returns `ActualLaborUnits / PlannedLaborUnits` (non-zero)**. Net effect: activities show progress on the **old (PBI)** dashboard and **zero on the new (Platform)** one — **precisely** what the client reports for "Install Temp Power". Pattern A depressed every discipline's Actual by **5–7 pp** on ELN03; the **3.52 pp** project-level gap here sits right in that range.

**"Install Temp Power" is the textbook Pattern-A candidate.** If `EL1031000` has `LinkedElements = 0`, `PlannedLaborUnits > 0`, and Platform `ActualProgress = 0`, this is a **Platform/parquet-generator bug, not a bad XER** — and a customer re-upload will **not** fix it.

## 5. Direction flag — this is the OPPOSITE shape from the stale-link family

**Explicitly noted per triage brief.** The other progress/count incidents on this board — **PLT-2385** (DC10 activities retain stale links to both PC & QA models → **inflates** % / hours), **PLT-2874** (dashboard non-DISTINCT count runs **higher** than editor), **PLT-2882** (orphaned links) — all make the **NEW/dashboard side show *more***, because stale/duplicate links *add* weight. **PLT-2884 is the mirror image: the new side shows *less*.** So the stale-link / orphaned-link / duplicate-count mechanism is **not** the cause here; a mechanism that makes activities *drop out* of the new pipeline is required. Two candidates, in order of code-support:

1. **Pattern A (intangible actual = 0)** — activities *present* in both pipelines but the Platform computes their Actual as 0 (labour fallback broken). **Strongest code-documented match**, and it needs **no missing data at all** — the activity is there, its number is just wrong. → **Platform bug.**
2. **Genuine source/ingestion gap** — activities *literally absent* from the Platform's parquet source (the client's "missing from the source data" line). This *could* be a malformed/incomplete XER (Mostafa's theory) **or** a Platform-side ingestion/schedule-sync failure that dropped rows. Direction fits either.

**Decisive single-activity test** (resolves Pattern-A vs true-absence, and thereby XER-vs-Platform) — run on AT10x:
```sql
-- Does EL1031000 even exist on the Platform, and why is its actual 0?
SELECT a.userItemId, a.itemName, a.activityStatus,
       MAX(p.LinkedElements)    AS linked_elements,
       MAX(p.PlannedLaborUnits) AS planned_labor_units,
       ROUND(MAX(p.ActualProgress)*100, 2) AS actual_pct
FROM api_activities a
LEFT JOIN activity_progress p ON a.itemId = p.ActivityId
WHERE a.userItemId = 'EL1031000'
GROUP BY a.userItemId, a.itemName, a.activityStatus
```
- **Row returns, `linked_elements = 0`, `planned_labor_units > 0`, `actual_pct = 0`** → **Pattern A / Platform bug.** Re-upload won't help; XER diagnosis is wrong.
- **No row at all** → activity genuinely absent from Platform source → supports an ingestion/XER-absence gap (then confirm whether it's in the XER — see §7 — vs dropped by the Platform).
- **Row with `linked_elements > 0` and installs < PBI** → tangible mismatch (element-status / link difference), a *different* track.

## 6. Assessment of Mostafa's "it was the XER file" diagnosis (playbook Q2 + rigor)

Mostafa's diagnosis (2026-07-10, relayed by Yash) — *"the issue … was with the XER file; recommended user to rectify and come back"* — is **plausible but unverified in code by anyone, and arguably premature.** Honest read:

- **What supports it:** the direction (new missing data) is consistent with an incomplete schedule; the client independently said "some activities were missing from the source data"; and the attached XER is a *combined* `AT10x-A11x Rev_02` export (dated 2026-04-27), so a schedule-side irregularity is not far-fetched.
- **What argues against taking it on authority:**
  1. **Both dashboards ultimately derive from the same uploaded P6 schedule.** A genuinely bad XER should break **both** dashboards, not create a *divergence* — for a divergence the two pipelines must **read the schedule differently**, which the comparison skill confirms they do (Platform derives Actual from installed-element/labour parquet; PBI from `Fact_Progress` weights). So a divergence points at the **pipeline difference**, not necessarily at XER corruption.
  2. **A code-documented Platform bug (Pattern A) reproduces this exact symptom + direction + magnitude** with a *valid* XER. If it is Pattern A, asking the client to "rectify the XER and re-upload" is **victim-blaming and futile** — the re-upload cannot fix a broken intangible-actual computation on our side.
  3. **The client's own "matches Editor-Progress" observation** is evidence of the *methodology difference* (element-based Platform vs weight-based PBI), which is the Pattern-A precondition — not evidence of a corrupt file.
- **Net:** I would **not** close or fully defer this on "it's the XER" without the §5 single-activity check. It is *at least as likely* to be a Platform-side issue (Pattern A intangible-zero, or a Platform ingestion drop) as a malformed XER. The XER theory is a reasonable hypothesis; it has simply **not been verified**, and there is a competing hypothesis that shifts the fix from the customer back to us.

## 7. NEEDS HUMAN — attachments (5) + data/env

The ticket has **5 attachments** (brief said 4; the XER is a 5th, added 2026-07-10). **None are viewable in triage** — the Jira attachment-content API returns **HTTP 403 "You do not have permission to view attachment"** for this MCP token (a genuine Atlassian permission scope, not a proxy fault; retrying will not help). Do **not** guess their contents.

| # | Attachment | id | Type / size | Why it matters |
|---|---|---|---|---|
| 1 | `2026.07.09_EQX-AT10x_Dashboard-error.xlsx` | 60494 | xlsx, 3.1 MB | ⚠️ **Decisive & highest-value.** Almost certainly the client's **per-activity export** of old-vs-new — i.e. the broken-vs-working data the comparison skill's Step 1/2 needs. **If a human can open it (or re-fetch with proper Jira auth), it likely settles Pattern-A vs true-absence directly, incl. the `EL1031000` row.** |
| 2 | `2026.07.09_Install Temp Power.png` | 60495 | png | Screenshot of the flagged `EL1031000` mismatch — confirms which widget/number. |
| 3 | `2026.07.09_Line Side Feeders.png` | 60493 | png | Second example activity. |
| 4 | `2026.07.09_MUW Tank Northside Installation.png` | 60492 | png | Third example activity. |
| 5 | `EQIX_AT10x-A11x_Rev_02_updated20260427.xer` | 60531 | P6 XER, 4.3 MB | ⚠️ The schedule Mostafa blamed. **A human/BE can grep it for `EL1031000`** to answer the crux: *is the activity present in the XER (→ Pattern-A/Platform bug) or actually absent (→ real schedule gap)?* |

Also **NEEDS HUMAN / dev+data:**
- ⚠️ Run the **§5 single-activity query** on AT10x DuckDB (dev console) for `EL1031000` (+ the other two example activities) — the one step that turns this from hypothesis to confirmed cause and settles XER-vs-Platform.
- ⚠️ **"Why now / what changed"** (BE/ops): was AT10x re-ingested / schedule re-synced recently, and does the parquet-generator version on AT10x include or exclude the Pattern-A intangible fix?

## 8. Confidence (per `xyz-platform-context/CLAUDE.md` scale)

- **Mechanism understood (two pipelines; tangible vs intangible per-activity actual; Editor-Progress match is expected):** **8/10** — from `progress-tab.md`, `data-pipeline.md`, and the comparison skill.
- **That the operative cause is Pattern A (Platform bug) rather than a bad XER:** **5/10** — Pattern A is the strongest documented match for the symptom + direction + magnitude and would move the fix back to us, but it is **not confirmed against AT10x data**, and a genuine XER/ingestion gap remains a live alternative. Environment-dependent; needs the §5 step or the xlsx.
- **That "it's the XER" is not yet safe to rely on / re-upload may not fix it:** **7/10.**

**Overall triage confidence: ~6/10.** Clear direction and a strong, testable leading hypothesis that contradicts the current "customer's XER" framing; final attribution needs one data step or the unopened xlsx.

## 9. Doc / KB references
- `dashboard/progress-tab.md` — Actual % roll-up, weighting, zero-weight exclusion, calculation modes.
- `dashboard/data-pipeline.md` — Pipeline A (V2 Progress Outputs parquet → `project_progress` / `category_groups`) vs Pipeline B.
- `dashboard/schedule-tab.md` — how the schedule/activities feed SCH + PRG (the XER-derived side).
- **Skill `dashboard-progress-comparison`** — Platform-vs-PBI architecture; **Pattern A** (intangible actual = 0 on Platform), Common Root Cause #6/#11/#13; the leaf-level comparison queries.
- Sibling incidents (background on the *opposite* direction / stale-link mechanism — **not** the cause here): `PLT-2385-groupB-data-pipeline/context.md`, `PLT-2874-groupA-viewer-and-model/context.md`, `PLT-2882-groupA-progress-tracking/context.md`.
- `incidents/live-incident-playbook.md` — question structure + message craft for the recommended reply.
