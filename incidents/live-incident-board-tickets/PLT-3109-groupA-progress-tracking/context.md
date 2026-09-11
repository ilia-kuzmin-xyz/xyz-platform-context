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

## 2026-09-08 (later) — Ilia opened the 5 screenshots. §4's one gap is answered, from the other side.

The morning entry said the decisive fact was the project's weighting setting. It was decisive — but
the screenshots show the mismatch is not in *our* setting at all. It is a **hardcoded labour-hours
assumption in the customer's Power BI query.**

**Screenshot 4 — Power Query, `Combined_Percent Complete (2)`, Source step.** The tail of the SQL:

```sql
WHERE TotalPlannedLaborUnits IS NOT NULL
  AND TotalPlannedLaborUnits <> 0
```

Every activity with no labour units is dropped **before any percentage is computed**. Meta's schedule
has none on most activities (Paddy's own words). Query hits `Warehouse_Schema (META)` / `PG_Tenant`;
columns `ActivityId, LinkedElements, TotalPlannedLaborUnits, PlannedProgress, ActualProgress,
ProjectId, UserItemId`. Applied steps: DB → SafeSchema → Source → RenamedColumns → AddedEarnedValue.

**Screenshot 5 — the counts.** `Combined_Percent Complete (2)` distinct Activity ID = **4,003**;
`Combined_Programme` activity_id = **19,598**. Gap 15,595 = "15,000+ Activity IDs".

**Screenshot 2 — the example.** `DC1.NW.STR.6122` in Paddy's export: Planned Elements 7, Installed
Elements blank, Intangible % Complete blank, Duration 1 — labour units absent, so it fails the WHERE.

**Screenshot 1 — dashboard.** Element `a1cd1043…` shows **Installed 07/27/26**, activity linked,
940 elements in Piling. Dashboard is consistent with itself; nothing to debug there.

**Screenshot 3 — Paddy's pivot.** Piling: 946 planned, 940 in-period, 940 expected, installed blank.
Installed only populates for disciplines whose activities carry labour units (Concrete 30, UG Telecom
50, Underground Services 79) — exactly the filter's fingerprint.

### Classification (revised): Pattern 3, third occurrence — **confirmed**, report-side, no platform code change

Same disease as PLT-3010, different organ: there it was our project setting, here it is the report's
own SQL. The dashboard (element weighting, 45%) is right. The fix is to delete the two WHERE lines.
Safe for all tenants: under labour weighting a zero-labour activity already contributes zero weight,
so the filter was redundant there and only ever broke element-weighted projects.

### Why the platform-api export is not the culprit

`GET /schedules/{rev}?deviceType=BI` (`schedules.service.ts:133-141`, `:396-445`) returns **both**
bases per activity — `linkedElementCount`, `plannedLaborUnits`, `actualProgress`, `physCompletePct` —
and the progress-output schemas carry `LaborWeighted*` **and** `ElementWeighted*` columns side by side
(`swagger.components.schemas.json:2806-2849`). The feed is weighting-agnostic; the report picked one.

### Confidence 8/10 → the Power BI refresh makes it 10

Held off 10 because only the tail of the Source SQL is visible (a second filter or join could also
drop rows), the project's weighting setting is still inferred from the 45%, and removing the filter
could surface a null `ActualProgress` for zero-labour rows in the warehouse. All three resolve in one
refresh with the WHERE removed: expect ~19.6k activities and `DC1.NW.STR.6122` present with progress.

### Access

Ilia has **no Power BI / DAX Studio access** (corrected mid-session). The check therefore goes to
whoever owns the report. The screenshots are Paddy's own Power Query, so the report is client-side →
route via Yash to the client. Dashboard DuckDB can still confirm the gap size independently:
count activities with `COALESCE(TotalPlannedLaborUnits,0)=0` in the activity-level table; expect ~15.6k.

### Draft to Yash (SHORT rule; UNPOSTED — Ilia posts) — supersedes the morning's Darminder draft

> Hi Yash — good news, this isn't a data problem on the dashboard; it's a filter in the client's
> Power BI report.
>
> In the `Combined_Percent Complete (2)` query, the source SQL has `WHERE TotalPlannedLaborUnits IS
> NOT NULL AND TotalPlannedLaborUnits <> 0`. Paddy's schedule has no labour units on most activities,
> so that filter throws out about 15,600 of the 19,600 activities before any percentage is
> calculated. Those activities then count as 0% installed, which is where the 0.3% comes from. The
> dashboard uses element counts, not labour units, so it isn't affected and the 45% is correct.
>
> **Could you ask Paddy to remove those two WHERE lines from the query and refresh?**
> `Combined_Percent Complete` should then hold ~19,600 activities and DC1.NW.STR.6122 will appear
> with its installed progress. The filter is safe to drop even for labour-based projects, since
> activities with zero labour units already carry zero weight.
>
> If the number still doesn't match after that, send us the full query text and we'll take it from there.

## 2026-09-09 — the 09-08 draft was posted, the ticket moved to With Customer, and the ball is now Paddy's

Live Jira check this morning. **Everything below is new relative to the 09-08 entries above; nothing
above is retracted.**

### Board state now (was: Open / Darminder / 2 comments)

| field | 09-08 entry above | live, 09-09 |
|---|---|---|
| Status | Open | **With Customer** (id 10711, category "In Progress") |
| Assignee | Darminder Atker | **Yash Patel** |
| Priority | Major | Major (unchanged) |
| Comments | 2 | **5** |
| Last updated | 2026-09-07 11:31 | **2026-09-08 14:32** |
| Freshdesk #7841 | Waiting on 3rd line | **Waiting on customer** |

### The three new comments (all 2026-09-08, none today)

1. **`111645` · Ilia Kuzmin · 14:19** — the drafted reply from the 09-08 entry above, **posted**. So
   the "UNPOSTED — Ilia posts" label on that draft is now stale; treat that draft as delivered.
   It went out near-verbatim, with two edits worth knowing about:
   - the opening "good news" was dropped;
   - **the safety sentence was dropped** — *"The filter is safe to drop even for labour-based
     projects, since activities with zero labour units already carry zero weight."* That reassurance
     is therefore **not** on the ticket. If Paddy hesitates to delete the two lines, or asks whether
     removing them will break other projects, that answer has not yet been given to him. Held as a
     ready-to-paste draft in `recommended-action.md`.
2. **`111647` · Yash · 14:31** — Freshdesk #7841 moved to "Waiting on customer".
3. **`111648` · Yash · 14:32** — *"@Ilia Kuzmin Thanks For help."*

**Nothing has arrived on 09-09.** ~21 hours of customer silence, which is normal turnaround and not
yet a chase. Nobody on our side owes anything; the next event is Paddy's refresh.

### New code evidence on the one follow-up left open on 09-08

The 09-08 `recommended-action.md` left one non-blocking item: *"find out whether that Power Query is
an XYZ-supplied template. If it is, every element-weighted tenant's export has the same defect."*
Not answered — that needs someone who knows what we hand customers — but two facts that bear on it
were verified in `hc-frontend` this session:

- **VERIFIED — `TotalPlannedLaborUnits` is our own column name, not the customer's invention.** It is
  a column in our progress-output schema (`docs/dashboard/duckdb-tables/progress-schemas.md:59`,
  `docs/dashboard/api-progress-outputs-mapping.md:39,113`) and is referenced by name across the
  dashboard query layer (`progress-queries-v2-api.ts:41,178,388,533`;
  `dashboard-progress-service.ts:478`; `progress-data.types.ts:14`; `types.ts:86`). So the client's
  Power Query is reading a warehouse table that mirrors our schema — which makes "did this SQL start
  life as something we supplied?" a real question rather than an idle one.
- **VERIFIED — our own dashboard applies the *same* `> 0` filter idiom, but weighting-aware, which is
  exactly why the dashboard is right and the report is wrong.** `progress-queries-v2-api.ts:176-179`
  picks the weight column from the project's setting:

  ```ts
  const weightColumn =
    config.method === ProgressWeightingType.PLANNED_LABOUR_HOURS
      ? 'TotalPlannedLaborUnits'
      : 'TotalLinkedElements'
  ```

  and then filters `AND ${weightColumn} > 0` (`:230`, `:247`, `:438`, `:460`, `:592`). On an
  element-weighted project the guard is `TotalLinkedElements > 0`, so a zero-labour activity survives.
  The client's SQL is the same shape **with the switch removed** — the labour branch hardcoded.
  That is the whole defect in one sentence, and it strengthens (does not prove) the template theory.

**Refinement to §3 above, not a retraction.** §3 said the element-weighting column name "is **not**
hardcoded on the FE — it comes from the backend response". That is right for the two *progress*
columns (`config.plannedProgressColumnName` / `config.actualProgressColumnName`,
`dashboard-progress-service.ts:479-480`) but wrong for the *weight* column: `TotalLinkedElements` is
hardcoded at `progress-queries-v2-api.ts:176-179` and `dashboard-progress-service.ts:476-478`. Minor,
and it does not change any 09-08 conclusion — but it means this repo *can* show the element-weighted
weight column's literal name, which §3 said it could not.

### What remains unverified (unchanged from 09-08, plus one)

- Whether the client's Power Query is XYZ-supplied or client-authored. **This is now the only
  follow-up with cohort implications** — if it is ours, every element-weighted tenant has the same
  broken export sitting unreported. Nobody has been asked.
- Whether removing the two WHERE lines surfaces a null `ActualProgress` for zero-labour warehouse
  rows. Still resolves in the same single refresh.
- The project's live `ProgressWeightingMethod` remains inferred from the 45% figure, never read.
  It stopped being decisive on 09-08 and still is not, but it is still not a *read* fact.
- Attachment bytes: still not fetchable from this routine (confirmed 403, run-instructions 09-08).
  Not a blocker here — Ilia opened all 5 PNGs on 09-08 and their contents are recorded above.

## 2026-09-11 (scheduled) — new comment: Darminder reassigns to Pietro Desiato, "waiting for further input following Ilias comment"; Paddy still silent

Live Jira fetch (`comment` + `attachment` + `status` + `assignee`, full thread). **Everything below
is new relative to the 09-09 entry above; nothing above is retracted.**

### Board state now (was: With Customer / Yash Patel / 5 comments, 09-09)

| field | 09-09 entry above | live, 09-11 |
|---|---|---|
| Status | With Customer (Freshdesk "Waiting on customer") | **Open** — Freshdesk auto-reopened 2026-09-09 11:01 (comment `111765`, automation only, already noted in the board README's 09-10 row) |
| Assignee | Yash Patel | **Pietro Desiato** |
| Comments | 5 | **7** |
| Attachments | 5 PNGs, ids 63983-63987 | unchanged — same 5 ids, no new attachments |

### The one new comment (not seen by any prior run)

**`111944` · Darminder Atker · 2026-09-10 13:53** — *"Assigned to @Pietro Desiato waiting for
further input following Ilias comment."* Verbatim, no more text than that. This reassigns the Jira
issue from Yash to Pietro Desiato; it does **not** answer the 09-08/09-09 side question ("is the
client's Power Query an XYZ-supplied template?") — it routes the ticket to product (Pietro is the
product lead per the run-instructions role table) rather than answering it. Read plainly: Darminder
saw Ilia's 111645 explanation and wants Pietro's input before whatever happens next, but does not
say on what — could be the template-reuse cohort question, could be a general sign-off on the
diagnosis, could be something else entirely. **Inferred, not verified**, which reading is intended.

This is worth flagging distinctly from the side question this folder has been tracking: the
09-08/09-09 draft to Darminder was written for **chat, deliberately kept off the ticket** ("Keep it
off PLT-3109 so the customer thread stays clean," `recommended-action.md`). It was never sent
(hard rule: draft only). Darminder's 111944 is an independent action — he raised his own
"further input" need, on the ticket itself, unprompted by anything we sent. So the side question
remains exactly as open as before; what changed is that the ticket now visibly names a second person
(Pietro) who may end up answering it, or something adjacent to it.

### Customer side: unchanged, now past the chase's hold date

No comment from Paddy Dennison. The 09-09 `recommended-action.md` chase draft to Yash was written
"hold until 2026-09-11" — **that date is today.** Nothing about 111944 bears on whether Paddy has
run the refresh; that is still a pure customer-side unknown, unrelated to the internal reassignment.
See `recommended-action.md` for whether the chase should go out now, held, or adjusted for the new
assignee.

### What remains unverified (unchanged from 09-09, plus one)

- Whether the client's Power Query is XYZ-supplied or client-authored — still nobody has been asked
  (the chat-draft to Darminder was never sent, and 111944 does not answer it).
- **New:** what "further input" Darminder is waiting on from Pietro — not stated in the comment,
  not inferable from anything else on the ticket. If a human is following this up in person, that is
  the one clarifying question worth asking directly ("further input on what, specifically?").
- Whether removing the two WHERE lines surfaces a null `ActualProgress` for zero-labour warehouse
  rows. Still resolves in the same single refresh, still unrun.
- The project's live `ProgressWeightingMethod` remains inferred from the 45% figure, never read.
- Attachment bytes: still not fetchable from this routine; not a blocker (see 09-08 entry).
