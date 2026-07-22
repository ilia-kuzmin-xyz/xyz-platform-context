# PLT-2884 — "EQX-AT10 New dashboard error"

- **Domain slug:** data-pipeline (justification in §7)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2884
- **Type:** Live Incident · **Priority:** Critical · **Status:** With Customer
  (Group-A-in-scope-but-parked per this board's convention — ball is with the
  client)
- **Assignee / Reporter:** Yash Patel (support)
- **Project:** EQX-AT10x (ID `6808f6afae311c4f8409624f`) · **Software Area:** Dashboard
- **Created:** 2026-07-09 · **Last updated:** 2026-07-20
- Triage date: 2026-07-22

---

## 1. What is observed (playbook Q1)

Client (via Yash) reports a progress mismatch between the **old** and **new**
dashboards for AT10x, stated verbatim in the ticket:

- **Old DB Actual: 27.37%** · **New DB Actual: 23.85%** · **Variance: 3.52%**
  (new dashboard is **LOWER** by 3.52 pp).
- Customer exported the data and found "some activities on the old dashboard
  have progress, but the new dashboard doesn't show it" — cited example
  *Install Temp Power* (Act **EL1031000**), delivered as a screenshot
  `Install Temp Power.png`.
- Some of those same activities "have the same numbers as in the old dashboard
  when I check the web viewer Editor-Progress."
- Customer + Hussein checked in **Power BI** and found **"some activities were
  missing from the source data."**

We could not observe AT10x ourselves (no runtime/env access); this is a
code-and-docs + ticket-thread triage. The decisive facts (both numbers,
direction, the "activities missing from source data" finding, one example
activity code) are in the ticket **text**, so triage is not blocked on the
unviewable attachments (see §8).

## 2. Reference / expectation (playbook Q2)

"Old DB and New DB should match" is the implicit expectation. Naming the
reference matters here because **the two dashboards are not the same system
reading the same data** — see §3. The customer's own reference ("old dashboard
+ Editor-Progress agree, new dashboard disagrees") is what makes this look like
a new-dashboard defect, but the two surfaces source progress differently.

## 3. "Old DB" vs "New DB" = the Power BI → Platform migration (playbook Q4 context)

**Confirmed against docs:** "Old DB" = the **Power BI dashboard**; "New DB" =
the **new native Platform dashboard** (DuckDB/parquet). This is the documented
migration, not two copies of one system:

- `dashboard/README.md:5` — the Dashboard Page "**replaces PowerBI reports with
  native data visualization**."
- The `dashboard-progress-comparison` skill is entirely a **Platform (DuckDB/
  parquet, V2 API) vs Power BI (DAX/tabular model)** comparison guide — i.e. the
  two surfaces in this ticket.
- Sibling board tickets confirm the migration framing: PLT-2890 ("PowerBI-
  migration parity gap"), PLT-2891 relocated to the **Power BI Dashboard project
  (`PBD-2111`)**.

**Why two dashboards can legitimately differ even from the "same" schedule** —
they read from **different upstream pipelines** (skill, §"Upstream parquet
generator caveat" + Known Bug Patterns F & H):

- **Platform (New DB)** computes from the **V2 parquet generator**, which filters
  by the **current `scheduleRevisionId`** — it reflects only the *current* schedule.
- **Power BI (Old DB)** reads from a SQL tabular model whose element-loading
  (`fn_GetLegacyModelElement`, Pattern H) and `Fact_Progress` rows (Pattern F,
  stale rows from prior schedule revisions) are known to **retain activities/
  elements from old, removed schedule revisions**.

This predicts exactly the observed direction and the customer's finding:
activities present in a *prior* schedule but **missing from the current (re-
exported) XER** still contribute progress in Power BI (Old DB, higher 27.37%)
but drop out of the Platform (New DB, lower 23.85%). On this reading the New DB
is arguably the *more* correct figure (honest to the current schedule); the Old
DB over-reports by holding stale activities. Either way the resolution is the
same — a complete source schedule.

## 4. Root cause — already diagnosed (product), customer-side data quality

**This is not primarily a code bug.** Root cause was identified by **Mostafa
(product)** within one day and independently corroborated by the customer's own
Power BI check:

> **Bad / incomplete source XER schedule file** — activities are **missing from
> the customer's own schedule export**. The customer was asked to rectify the XER
> in P6 and re-upload.

The example activity **EL1031000 (Install Temp Power)** fits: it exists with
progress in the old data but is absent/zero in the current schedule → missing
from the source XER.

## 5. Comment timeline (verbatim-sourced, chronological)

1. **Yash 07-09 18:58** — relayed the report; attached screenshots; "Have asked
   for XER file also."
2. **Yash 07-09 19:01** — Freshdesk → Waiting on 3rd line.
3. **Yash 07-10 09:25** — posted the XER file attachment link.
4. **Yash 07-10 10:46 (x2)** — Freshdesk → Waiting on customer.
5. **Yash 07-10 10:47** — "Please wait for now as **Mostafa has identified the
   issue. It was with the XER file.** We have recommended user to rectify that
   and come back to us if the issue still persists." ← root cause established.
6. **Ilia 07-13 10:50** — "Do you know if the customer had a chance to re-upload
   the schedule?"
7. **Yash 07-13 10:56** — "have asked customer to reupload after rectify it on
   their end. still waiting for them to get back with outcome."
8. **Yash 07-20 09:22** — Freshdesk → Closed, then **07-20 09:23** → Waiting on
   customer again (Jira status remains "With Customer").

**Net state:** cause + fix known since 07-10; **9+ days stalled purely waiting on
the customer to re-upload a corrected XER, with silence on their end.** That
stall is the actionable finding, not a code mystery.

## 6. FE / pipeline robustness gap re: silent-incomplete-XER ingestion (secondary)

**Investigated (task item 1).** There *is* a frontend schedule-upload/migration
path, and it does more validation than "silently ingest whatever is given" — but
it has a real, PLT-2882-style **secondary robustness gap** around *missing*
activities. Findings:

- **XER parser** `schedule-upload-service/schedule-parser/schedule-parser.ts`
  validates: whitespace in column names, column-count mismatch (`UnreadableFormat`),
  missing-actual-start, future actual dates, actual dates exceeding the data date,
  invalid (finish < start) date ranges, and (labour-weighted projects only) a
  non-zero total of planned labour units. Error codes in
  `schedule-parser-errors.ts`. **None of these detect "the file is missing
  activities that existed before"** — they are per-row/whole-file sanity checks,
  not a completeness check.
- **A version diff *does* exist** — `schedule-upload-service.tsx:222
  prepareScheduleChanges()` computes `added` / `removed` / `updated` by matching
  on `activityId` (XER `task_code`) against the previously stored schedule.
  Missing activities surface as **`removed`**. So the pipeline is **not** fully
  silent when a previous version exists.
- **But the surfacing is weak (the gap):**
  - The review UI (`changes-panel.tsx`) shows only a bare **count** ("REMOVED:
    N") plus a flat table (`schedule-changes.tsx`) — **no warning severity, no
    statement that removed activities carry linked elements / recorded progress
    that will be discarded**, and it is **not blocking** (single "OK" button →
    `updateScheduleInDb()` deletes them).
  - `schedule-upload-service.tsx:280 completeChange` — if `removed ≈ the entire
    previous schedule`, it silently switches to deleting the **whole** schedule
    and re-adding, i.e. a near-total drop is handled *more* silently, not less.
  - The diff needs a **previous** schedule to compare against — a **first/only**
    upload that is already incomplete produces **no `removed` signal at all**.
- **Important scope caveat:** the *authoritative* progress numbers on the New DB
  come from the **backend V2 parquet generator**, not this FE preview. This FE
  path is the in-editor upload/migration tool. **I cannot confirm which ingestion
  path AT10x actually used** (in-editor FE upload vs a support/backend ingestion
  of the XER Yash collected). So the gap above is a genuine product-hardening
  candidate but its causal role in *this* incident is unconfirmed.

**Suggested logging (separate from this ticket, do not conflate):** a completeness
warning on schedule re-upload — when `removed` activities have linked elements or
non-zero recorded progress, block-or-warn explicitly ("N activities with progress/
links will be removed") rather than showing a bare count. Mirrors PLT-2882's
"silently drops orphaned links, no warning" pattern.

## 7. Domain slug justification — data-pipeline

The **symptom** is a progress-% number (progress-tracking surface), but the
**root cause and the only code gap** both live in **schedule/XER ingestion + the
two-pipeline (Power BI SQL model vs Platform V2 parquet) sourcing** — squarely
`data-pipeline` (`dashboard/data-pipeline.md`, and the FE `schedule-upload-service`).
The board README already files count/linking-correctness themes (PLT-2385, PLT-2874)
under the data-pipeline theme. `progress-tracking` is the *surface* only. →
**data-pipeline.**

## 8. Confidence & needs-human

**Confidence: 8/10** (per `xyz-platform-context/CLAUDE.md` scale — high confidence,
minor unknowns). The root cause is product-diagnosed **and** independently
corroborated by the customer's own Power BI finding; the Old-vs-New = Power-BI-vs-
Platform framing and the "different upstream pipeline retains stale activities"
mechanism are documented. The two residual unknowns: (a) whether AT10x's ingestion
touched the FE path in §6, and (b) confirmation from the re-uploaded XER — both
depend on the customer, not on code.

**Needs human:**
- ⚠️ **NEEDS HUMAN — all attachments unviewable** (binary / Atlassian-auth; I
  cannot parse them and must not guess contents):
  - 3 screenshots (incl. `Install Temp Power.png`) — the old-vs-new comparison
    and the EL1031000 example.
  - the `.xlsx` data-breakdown export (the customer's activity-level diff).
  - the `.xer` schedule file Yash collected (07-10) — parsing this against a prior
    revision would *directly* confirm which activities are missing, but requires a
    human/backend with file access.
- ⚠️ **NEEDS HUMAN / support** — confirm with the customer whether the corrected
  XER has been re-uploaded (open item since 07-13; see recommended-action.md).
