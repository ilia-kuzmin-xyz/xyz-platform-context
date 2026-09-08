# PLT-3109 — "Meta - LVN - BL1&2 Elements in exports from power bi not matching dashboard" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3109
- **Issue type:** Live Incident · Software Area: Dashboard
- **Status:** **Open** → Group A ("needs evaluation" — brand new, never triaged before)
- **Priority:** Major · **Project:** META - LVN - BLD1 & 2
- **Reporter (Jira):** Yash Patel, relaying client **Paddy Dennison** (Freshdesk #7841, "Waiting on 3rd
  line") · **Assignee:** Darminder Atker
- **Created:** 2026-09-07 11:26 · **Last updated:** 2026-09-07 11:31 (2 comments, both same-day)
- **Domain slug chosen:** `progress-tracking` (PRG) — the mismatch is between two *percent-complete*
  computations, not schedule import or element linking. Closest sibling by mechanism is
  **PLT-3010** (resolved) and **PLT-2941**, not PLT-2874 (which was an element-*count* labelling bug).
- **Triage date:** 2026-09-08 · first pass, no prior run has touched this ticket.

---

## 0. Prior-run check (playbook step 0)

No existing folder. `recurring-defect-patterns.md` **Pattern 3** ("check the dashboard's settings
before you debug its data") already documents this exact shape twice — see §4, this is very likely
its third occurrence, not a new mechanism.

## 1. What was reported

Client (Paddy Dennison, via Yash's summary comment):

> The element is shown as **installed** in the Dashboard. Dashboard values show approximately **46%
> Planned and 45% Installed**. The reporting/export dataset returns **46% Planned but only 0.3%
> Installed**. Verification at source indicates the activity exists in **Combined_Programme**, but is
> missing from **Combined_Percent Complete**. The customer notes that **15,000+ Activity IDs** appear
> to be affected by the same issue.

One concrete example given: element `a1cd1043-b6b5-4b63-8331-37eb0fb72838`, activity
`DC1.NW.STR.6122` ("Install - Auger Cast Pile - DCB1 - A/C - Zone 9 - Seq 1").

The customer's own framing, verbatim from the original description, is the single most important
sentence in the ticket: *"We are using element based percentages as the schedule does not have
proper labour units included."* That is the customer stating, unprompted, which weighting basis
their project uses — see §4.

Yash's comment adds a backend-sounding formula: *"the installed element calculation is derived from
**linked_element_calc × Actual %**"* — this is Yash's own paraphrase (or the customer's), not a
string found anywhere in `hc-frontend` or `XYZPlatformApi` (checked both repos, no hits). Treat it as
a plain-language gloss, not a verified formula name.

## 2. Domain doc check

No existing `xyz-platform-context` doc covers a Dashboard-vs-PowerBI-export percent-complete
mismatch directly, but `recurring-defect-patterns.md` **Pattern 3** (below) is exactly on point and
was written from two prior, independently-confirmed occurrences of the identical mechanism.

## 3. Code findings (hc-frontend + XYZPlatformApi)

**VERIFIED — progress weighting is a per-project, user-editable setting with two mutually exclusive
bases, and it changes which raw column the FE queries:**
- `app/types/progress-weighting-types.ts:1-31` — `ProgressWeightingType` is `PLANNED_LABOUR_HOURS`
  ("Budgeted labour units from the schedule define how much an activity contributes to the overall
  progress") or `LINKED_ELEMENT_COUNT` ("An activity's contribution ... is determined by the number
  of elements linked to it") — **this second description is a near-verbatim match for the customer's
  own words** ("element based percentages").
- `dashboard-progress-service.ts:480-481` — the FE reads `config.plannedProgressColumnName` /
  `config.actualProgressColumnName` from the API-returned `ProgressWeightingConfig` and queries
  DuckDB by *that* column name (e.g. `LaborWeightedActualProgress` under the labour-hours default,
  `DEFAULT_PROGRESS_WEIGHTING`, `progress-weighting-types.ts:16-22`). The column name for
  `LINKED_ELEMENT_COUNT` is **not** hardcoded on the FE — it comes from the backend response, so this
  repo cannot show its literal name.
- `XYZPlatformApi/src/services/projects.service.ts:38,115-127` —
  `fn_GetProjectProgressWeighting($1)` is a per-project DB-backed setting (`ProjectProgressWeightingDTO`
  / `ProjectProgressWeightingMethod`), confirming the setting lives server-side per project, matching
  the FE enum.
- **`Combined_Programme` and `Combined_Percent Complete` do not appear anywhere in either
  `hc-frontend` or `XYZPlatformApi`** (checked both repos, case-insensitive). These read as the
  customer's own Power BI dataset/table names, built on top of a raw export we provide — i.e. this
  is the customer's reporting layer, not our code, consistent with Pattern 2 ("the frontend is a
  faithful renderer, wrong number is usually upstream" — here, upstream of *both* systems, in whatever
  produces the raw feed the customer's Power BI model ingests).

## 4. The matching pattern — `recurring-defect-patterns.md` Pattern 3, third occurrence (candidate)

Two prior, **confirmed-by-product**, no-code-fix resolutions of the identical shape:

- **PLT-2941** — a project on `PLANNED_LABOUR_HOURS` weighting hid disciplines/packages with zero
  budgeted labour units from the filter panel entirely (`progress-queries-v2-api.ts:577`,
  `AND ${weightColumn} > 0`).
- **PLT-3010 (EQX-AT11x, resolved 08-04)** — platform dashboard Plan 10.15%/Actual 10.48% vs the
  customer's own Power BI Plan 11.42%/Actual 10.05%. Root cause: **AT11x was on element weighting
  while the customer's Power BI computed on labour weighting** — same setting, changing the headline
  percentage itself. Resolution was a project-settings change, explained to the customer; no code fix.

**PLT-3109 looks like the mirror image of PLT-3010**, and the customer has effectively told us the
answer already: their schedule "does not have proper labour units included," which under
`PLANNED_LABOUR_HOURS` weighting drives an activity's `actualProgressColumnName` value toward zero
regardless of true physical completion — exactly the 46% → 0.3% collapse reported, and exactly the
kind of thing that would hit **every** activity project-wide (matching "15,000+ Activity IDs"),
because it is a basis mismatch, not a per-activity data fault.

**What is NOT yet verified (the one gap):**
- **Which weighting the META-LVN-BLD1&2 *dashboard* project is actually set to.** If it is already on
  `LINKED_ELEMENT_COUNT` (as the customer's own words imply it should be, and as the correct 45%
  Dashboard figure is consistent with), then the dashboard side is fine and the mismatch is entirely
  in whatever computes "Combined_Percent Complete" for the customer's Power BI model — most likely
  that export/report is (a) still defaulting to a labour-hours basis regardless of the project's
  dashboard setting, or (b) is a customer-built Power BI model with its own independent calculation
  that never picked up the project's weighting choice at all.
- **No prod DB or Power BI access was available this session** (`incidents/prod-mcp-access.md`
  requires per-session credentials not present here) — this conclusion rests on the code paths and
  the customer's own stated configuration, not a live query. Rated inferred, not verified.
- Whether "Combined_Programme" / "Combined_Percent Complete" are tables in an XYZ-maintained export
  service outside these two repos (a reporting pipeline / data-warehouse layer neither `hc-frontend`
  nor `XYZPlatformApi` contains) or are wholly customer-authored Power BI objects. Either way, the
  same one question below settles it.

## 5. What remains unverified

- The project's live `ProgressWeightingMethod` for META-LVN-BLD1&2 (the single decisive fact).
- Whether the raw export feed powering the customer's "Combined_Percent Complete" table is itself
  weighting-aware, or hardcoded to one basis regardless of the dashboard setting — if the latter,
  this is a genuine gap (the export ignoring a per-project setting) rather than a pure
  misunderstanding, and would need a product/backend decision, not just an explanation.
- Contents of the 5 screenshot attachments (see §6) — not opened this session.

## 6. NEEDS HUMAN — attachments not opened this session

5 PNG screenshots are attached (ids 63983-63987, all Yash Patel, 2026-09-07 10:29-10:30), plus 3
more broken inline `blob:...UNKNOWN_MEDIA_attachment` image refs in the original description that
never finished uploading (same known Freshdesk-relay failure mode seen on PLT-3033/PLT-2890/PLT-2918
— these need a re-send, not different credentials). This routine has no image-reading tool wired to
Jira attachment content this run; a human should open the 5 real PNGs and confirm whether they show
the project's Progress Weighting setting (Project Settings → General tab) or just the Dashboard/Power
BI number comparison already quoted in text. If one of the 5 already shows the weighting setting,
§4's one open gap is answered for free.

## 7. Confidence

- **A per-project weighting-basis setting exists and changes which raw column feeds "Actual %": 9/10**
  — read directly in both repos, cross-checked FE enum against BE DTO.
- **This ticket is the same mechanism as PLT-3010/PLT-2941 (Pattern 3), not a new defect: 7/10** — very
  strong textual match (customer's own words name the FE setting's exact description), but the
  decisive fact (LVN's actual weighting value, and whether the PowerBI feed is weighting-aware) is
  unverified.
- **hc-frontend and platform-api do not compute or store "Combined_Programme"/"Combined_Percent
  Complete": 8/10** — a clean grep miss in both repos is a good but not perfect negative result (a
  third repo or a customer-side model is not ruled out).
- **Overall triage confidence: 6/10.** High-confidence pattern match, held back one point short of
  higher because the one fact that would make it 9/10 — the project's actual weighting setting — is a
  five-minute check nobody has run yet.
