# PLT-2884 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — one internal comment that does two things: nudge the stale customer **and** kick off an independent platform-side check in parallel

Post a single internal comment that (1) re-pings **Yash** to chase the customer (6 days silent on a **Critical**, "With Customer" ticket — the **PLT-2815 stale-nudge** precedent), and (2) states that we will **not** stay 100% dependent on the XER re-upload: Ilia will run the **Pattern-A check on `EL1031000`** in parallel, because the one fact on the ticket that the "bad XER" explanation does not account for — **Editor-Progress matching the OLD dashboard** — points at a possible platform-side parquet bug we would otherwise miss. Owner: **Ilia** (mechanism/data check) with **Yash** owning the customer chase; loop **Mostafa** to reconcile his XER finding.

## Why this and not the others

- **Not a pure stale-nudge alone.** A nudge is warranted (Critical, 6 days quiet), but nudging *only* accepts the premise that the sole cause is the customer's XER. The playbook's rigor-guardian rule applies: **do not close/park on the convenient explanation while an unexplained fact is on the table.** Editor-Progress agreeing with the old dashboard means the actuals *exist* — a bad/missing-source XER cannot produce that, but **Pattern A can**. So we chase the customer *and* verify internally.
- **Not straight-to-Dev (b).** We have a strong pattern-match (Pattern A) but **zero AT10x data confirmation** — attachments unreadable, no DuckDB query run. Routing to Dev before the single-activity diff would be guessing which of two disciplines (backend parquet-generator vs "customer data") owns it. One query decides.
- **Not Blocked (d).** Nothing external blocks the internal check; the customer silence only blocks the *H1* branch, not the *H2* branch — which is exactly why we run H2 now.

## Draft — internal comment (author: Ilia Kuzmin; @ Yash Patel, cc Mostafa Kamel Hussien)

Playbook style: status = state + so-far + evidence quality; one owner per thread; explicit scoping; question routed to one person.

> @Yash Patel — PLT-2884 (AT10x, new 23.85% vs old 27.37%, −3.52%). Two things:
>
> **1. Customer chase (yours):** it's been ~6 days since we asked them to rectify and re-upload the XER, no reply, and this is Critical. Could you re-ping them for the re-uploaded schedule (or a "still working on it")? If we can't get it this week I'd suggest we agree a fallback rather than leave it parked.
>
> **2. I'm going to verify one thing on our side in parallel, so we're not 100% dependent on their re-upload.** The detail that doesn't fit "the XER was just bad": you noted these activities (e.g. `EL1031000` Install Temp Power) show the **correct old numbers in the web-viewer Editor-Progress**. If the Editor can see the actuals, the data exists — so the new dashboard being low looks like it could be a *known* platform pattern where **labour-based ("intangible") activities with no linked 3D elements come out as 0% actual in the new dashboard's data while Power BI shows them correctly** (same shape we saw on ELN03; matches the −3.52% direction). "Install Temp Power" / "Line Side Feeders" are exactly the kind of non-modelled electrical activities that hit this.
>
> I'll check `EL1031000` on AT10x directly: is it linked-elements = 0 with labour hours > 0, and does its actual read 0 in our data while the editor shows earned hours? If yes, this is on our side (parquet generation), not the customer's file — and re-uploading won't fix it.
>
> @Mostafa Kamel Hussien — when you traced it to the XER, was it that these activities were **missing / had no actuals in the file**, or something else? Trying to reconcile that with the Editor showing the old numbers. Thanks.
>
> Scoping: this is the new-dashboard Actual %, and the check above is about how *we* compute actuals for intangible activities — separate from whether the customer's XER also had issues; both can be true.

## The one evidence step to run (owner: Ilia; ~15 min, needs dev/DuckDB on AT10x `6808f6afae311c4f8409624f`)

The playbook Step-1 "reproduce on one activity" move, using the `dashboard-progress-comparison` skill's Pattern-A diagnostic:

1. Resolve `EL1031000`: `SELECT itemId, userItemId, linkedElementCount, activityStatus FROM api_activities WHERE userItemId = 'EL1031000'`.
2. Pattern-A check on the cohort:
   ```sql
   WITH am AS (
     SELECT ActivityId, MAX(ActualProgress) max_actual,
            MAX(PlannedLaborUnits) labor_units, MAX(LinkedElements) linked
     FROM activity_progress GROUP BY ActivityId)
   SELECT COUNT(*) affected, SUM(labor_units) unrecognised_labor
   FROM am WHERE linked = 0 AND labor_units > 0 AND max_actual = 0
   ```
   and confirm `EL1031000` is in that set (join on its `itemId`).
3. **Expected if Pattern A holds:** `EL1031000` = `linked = 0, labor_units > 0, actual = 0`, while the Editor shows earned hours → platform-side (backend parquet generator), re-upload won't fix it. **If instead** `EL1031000` is absent from `activity_progress` / `api_activities` entirely → supports Mostafa's missing-from-source / XER reading.
4. Run the skill's **weighting-detection** query first (Pattern A only bites labour-weighted rollups).

## Follow-through the human should own (not executed here)

- **After the diff — split cleanly into two tracks and don't let the XER story absorb both:** (i) if Pattern A confirmed → hop to the **backend parquet-generator team** with `EL1031000` as the specimen (per the skill's "upstream parquet generator caveat" — ask what `ReportedLaborUnits` the generator reads for it); this is **not** a frontend fix and is the **same class as PLT-2385/PLT-2874**. (ii) whatever the customer's corrected XER shows on re-upload stays its own track.
- **Read the `.xlsx`** (NEEDS HUMAN) — it is the ready-made cohort list of every differing activity; parse it and cross-check against the Pattern-A query output.
- **Parse the `.xer`** (NEEDS HUMAN) — extract `EL1031000`'s `% Complete Type`, `target_work_qty` / actual labour, and confirm it is present; that directly tests Mostafa's H1.
- **Answer "why now"** (playbook #5): was the new dashboard recently switched on for AT10x, and did Rev_02 (2026-04-27) regenerate parquets differently from PBI's path? Assign an owner.
- **Cohort sweep** (playbook #6): if Pattern A, enumerate all AT10x intangible activities reading 0 actual and quantify the true project-level impact vs the reported −3.52%.
- **If neither branch resolves and the customer stays silent:** consider a decision point rather than leaving a Critical ticket parked indefinitely (escalate to product / agree an interim answer with the customer).
