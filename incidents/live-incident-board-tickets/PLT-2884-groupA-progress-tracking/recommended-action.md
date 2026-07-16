# PLT-2884 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — internal reply that opens a parallel in-house verification track, ticket **stays With Customer**

Post an internal comment that (1) does **not** dispute the customer relationship or reverse the re-upload request, but (2) flags that the "it's the XER file" attribution is **unverified**, and (3) launches the one **in-our-hands** check that decides between the three hypotheses — using artefacts we **already hold** (the attached XER + activity code `EL1031000`). Owner: **Ilia Kuzmin** (mechanism interrogator; this is the `dashboard-progress-comparison` skill's job). cc **Mostafa** (made the XER call) and **Yash** (client channel).

**Do not transition the ticket.** With Customer is correct while the re-upload is outstanding — but that must not be the *only* live track on a **Critical** ticket, because if the cause is Pattern A (a known platform-side parquet bug) the re-upload will fail and the ticket bounces back after days of client effort.

## Why this and not the others

- **Not (b) Ready For Development.** No front-end bug exists in any hypothesis — the FE query layer faithfully reads pre-computed parquet (`context.md` § Mechanism). If a fix is needed it is **backend** (parquet generator, H2) or **customer data** (H1) or **none** (H3, PowerBI wrong). Routing to FE dev now would be wrong. Confirm the layer first.
- **Not (c) new With-Technical-Support / customer ask.** We do **not** need anything further from the customer to progress: we have the XER, the error xlsx, and the activity code `EL1031000`. The decisive check is an **internal** XER-parse + parquet/DAX diff. Going back to the client would re-loop a Critical ticket.
- **Not (d) Blocked.** Nothing external blocks us — the verification is entirely in our own hands right now (open the attached XER; query AT10x DuckDB; query PowerBI). "Blocked" would wrongly imply we're waiting on someone.

## Draft — internal reply (author: Ilia Kuzmin; @ Mostafa, @ Yash)

Playbook style: one owner, one closed next step, hypotheses as questions, explicit scoping, "does the evidence support that?"

> @Mostafa @Yash — before we lean on the customer's re-upload for PLT-2884 (Critical), one check I want to run our side first, because the fix owner differs completely depending on the answer.
>
> **Mechanism (confirmed in code):** the new dashboard reads *pre-computed* `ActualProgress` from the activity parquet and does no labour-based recompute; it's scoped to one schedule revision and drops zero-weight rows. So an activity reads 0 on the new dashboard in **two different ways that look identical**: (a) it's **absent** from the uploaded schedule/revision, or (b) it's **present but the parquet actual is 0** — the known intangible-activity bug (`LinkedElements=0`, `PlannedLaborUnits>0`), which we've already seen on ELN03. `EL1031000` = "Install Temp Power" is exactly the intangible shape.
>
> **Why it matters:** if it's (b), re-uploading the XER won't change anything and we've sent them round a loop on a Critical ticket. And the customer noting the activity *does* show progress in the web-viewer editor points more at (b) than at "missing from source".
>
> **One check, our side (~15 min), I'll take it:** the attached XER is text — I'll grep it for `EL1031000` to confirm whether the activity is even in the schedule, then diff one activity across both dashboards (Platform `activity_progress` actual/linked/labour vs PowerBI `[Actual%]` + `ActualLaborUnits`/`PlannedLaborUnits`). That tells us in one shot: missing-from-XER (their fix), intangible-actual bug (backend parquet fix), or PowerBI over-counting from stale rows (their 27.37% is the wrong number, ours is right).
>
> @Mostafa — when you traced it to the XER, did we confirm `EL1031000` is actually absent from `EQIX_AT10x-A11x_Rev_02_updated20260427.xer`, or was that inferred from the % gap?
>
> Scoping: this is a progress-comparison / data question — no front-end bug is in play either way. Keeping the ticket With Customer for now; this runs in parallel so we're not idle if the re-upload doesn't land it.

## The one evidence step to run (owner: Ilia; ~15 min)

The skill's Step-1 single-activity diff — turns three hypotheses into one answer:

1. **Open the attached XER** (`EQIX_AT10x-A11x_Rev_02_updated20260427.xer` — tab-delimited P6 text). Search for `EL1031000`.
   - **Not present** → H1 confirmed (missing from schedule). Re-upload is the right fix; also identify *why* it was dropped from the P6 export.
   - **Present** → check its `TASK`/resource rows for actual dates and labour units, then go to step 2.
2. **Platform (AT10x DuckDB console):**
   `SELECT a.userItemId, ap.ActualProgress, ap.PlannedProgress, ap.LinkedElements, ap.PlannedLaborUnits FROM activity_progress ap JOIN api_activities a ON a.itemId = ap.ActivityId WHERE a.userItemId = 'EL1031000' ORDER BY ap.CalendarDate DESC LIMIT 1`
3. **PowerBI (DAX Studio):** `CALCULATETABLE(SUMMARIZECOLUMNS('Latest Programme MV'[activity_id], "PlannedLaborUnits", SUM('Latest Programme MV'[PlannedLaborUnits]), "ActualLaborUnits", SUM('Latest Programme MV'[ActualLaborUnits]), "linked", SUM('Latest Programme MV'[linked_elements_calc]), "PBI_Actual", [Actual%]), 'Latest Programme MV'[activity_id] = "EL1031000")`
4. **Decision:**
   - Platform `LinkedElements=0`, `PlannedLaborUnits>0`, Platform actual `=0`, and `PBI_Actual ≈ ActualLaborUnits/PlannedLaborUnits` → **H2 / Pattern A** (backend parquet-generator bug — re-upload will NOT fix). Route to the progress-outputs team; link to the ELN03 Pattern-A finding.
   - Activity absent from XER → **H1** (customer-data; re-upload correct).
   - Platform values correct, PBI inflated by stale/legacy fact rows (skill Patterns F/H) → **H3** (PowerBI wrong; explain to client, new dashboard is right).

## Follow-through the human should own (not executed here)

- **Read the XER + xlsx + PNGs** (NEEDS HUMAN in `context.md`) — get the other two activity codes ("Line Side Feeders", "MUW Tank Northside Installation") and confirm they share EL1031000's intangible shape (would strongly indicate Pattern A over a one-off XER omission).
- **If H2:** open/attach a backend parquet-generator ticket; this is **cohort-wide** — every project with intangible activities under the new dashboard undercounts vs PowerBI, a **new-dashboard rollout / client-trust risk**, not an AT10x one-off. Sweep other rolled-out projects.
- **Confirm the "Hussein" identity** — is the customer's "checked with Hussein in Power BI" our Mostafa Kamel Hussien, or a customer-side person? Changes who owns the PowerBI-side answer.
- **Answer "why now"** (playbook #5): is the new dashboard rendering a *different schedule revision* than PowerBI's source? Compare `ScheduleRevisionId` on both sides.
- **Close discipline:** do not close on the customer's re-upload "looking fine" — close on cause (H1/H2/H3 named) + trigger + cohort.
- **Post-close:** add a `dashboard/pitfalls.md` entry — "New-dashboard Actual < PowerBI: before blaming the client's XER, run the single-activity diff — an intangible activity (LinkedElements=0) reading 0 on Platform is the parquet-generator Pattern A bug, not missing source data; and PowerBI can be the wrong side (stale fact rows)."
