# PLT-2884 — "EQX-AT10 New dashboard error"

- **Domain slug:** data-pipeline (justification in §7)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2884
- **Type:** Live Incident · **Priority:** Critical · **Status:** With Customer
  (Group-A-in-scope-but-parked per this board's convention — ball is with the
  client)
- **Assignee / Reporter:** Yash Patel (support)
- **Project:** EQX-AT10x (ID `6808f6afae311c4f8409624f`) · **Software Area:** Dashboard
- **Created:** 2026-07-09 · **Last updated:** 2026-07-20 (unchanged as of 2026-07-29)
- Triage date: 2026-07-22 · **Re-checked: 2026-07-29 (§9 — no movement)**

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

---

## 9. Re-check 2026-07-29 — no movement; stall is now the whole story

Re-queried `getJiraIssue` (fields incl. comment/attachment/status) plus
`getJiraIssueRemoteIssueLinks` and a project-wide JQL sweep for AT10x/EQX siblings.
**Nothing has changed on this ticket since the 07-22 triage.**

### What was verified as unchanged

| Field | 07-22 triage | 07-29 re-check |
|---|---|---|
| Status | With Customer | **With Customer** (unchanged) |
| Priority | Critical | **Critical** (unchanged) |
| Assignee / Reporter | Yash Patel | Yash Patel (unchanged) |
| `updated` | 2026-07-20 | **2026-07-20 09:35** (unchanged) |
| Comment count | 10 | **10 — no new comments** |
| Attachments | 5 | **5 — no new upload** |
| Resolution | null | null |
| Remote issue links | — | **none** (no Freshdesk/PBD link on the Jira side) |

- **Did the customer re-upload? No.** The decisive negative evidence is the
  **attachment list**: still exactly 5 items, the newest of which is Yash's
  `EQIX_AT10x-A11x_Rev_02_updated20260427.xer` from **2026-07-10 09:25**. A
  corrected re-export would almost certainly have arrived here (or as a comment)
  as it did the first time. Nothing since.
- **No new ticket supersedes it.** JQL over `project = PLT` for AT10x/EQX returns
  only historical/closed siblings (PLT-2694 Done, PLT-2554 Ready-For-Release,
  PLT-2551 Closed, PLT-1787 Archived) — none related to this progress mismatch.
  So the incident was not quietly re-raised elsewhere; it is simply parked.

### Silence clocks (to 2026-07-29)

| Measured from | Event | Days |
|---|---|---|
| 2026-07-09 18:55 | Ticket created | **20 days** open |
| 2026-07-10 10:47 | Root cause established; customer asked to rectify + re-upload | **19 days** with no fix delivered |
| 2026-07-13 10:56 | **Last substantive human comment** (Yash: "still waiting for them to get back") | **16 days** |
| 2026-07-20 09:23 | Last activity of any kind — an **automated Freshdesk status echo**, zero new information | **9 days** |

The 07-22 run reported "9+ days silent" measured from the 07-13 nudge. On the same
basis that figure is now **16 days**. The only thing that has happened in between is
a Freshdesk state bounce (Closed 09:22 → Waiting-on-customer 09:23 on 07-20), which
carries no information about the customer — if anything it suggests someone nearly
closed a Critical incident that was never verified fixed (playbook Phase 6:
"remission, not resolution"), then reverted.

### One new hard fact — the XER is labelled Rev 02 / 27 Apr 2026

The attachment metadata (readable even though the file content is not) gives a
filename that was not exploited in the 07-22 pass:

```
EQIX_AT10x-A11x_Rev_02_updated20260427.xer   (4.35 MB, uploaded 2026-07-10 09:25)
```

Three inferences, **all from the filename only** — flagged as inference, not
verified content (the file itself remains unreadable here, see §8):

1. **`Rev_02` / `updated20260427`** — the schedule the Platform was working from is
   labelled revision 02, data-dated **27 April 2026**, i.e. **~2.4 months stale**
   relative to the 09 July report. Anything the customer added or progressed in
   May–June would legitimately be absent from it. That is a *cleaner and more
   specific* form of "activities missing from the source data" than "bad export":
   the New DB may simply be honestly reporting an old revision.
2. **`AT10x-A11x`** — this is a **combined, multi-project XER** covering two
   projects. Multi-project exports are a classic source of partial-activity loss
   (filtered project selection in P6 at export time), which fits the customer's own
   Power BI finding.
3. It sharpens §3's mechanism: Power BI (Old DB) retaining activities from *prior*
   revisions vs Platform (New DB) honouring only the current revision produces
   exactly the observed direction (27.37% > 23.85%) if the current revision is a
   stale/partial Rev 02.

**This converts the coordinator question from vague to checkable** — instead of
"has the customer re-uploaded?", ask "**is Rev 02 (27 Apr) still the current
schedule on AT10x, and has a Rev 03 been issued in P6 since?**" A human with file
or DB access can answer that in minutes without the customer (see
recommended-action.md).

### Hypothesis & confidence — unchanged, marginally reinforced

Root cause (incomplete/stale source XER; Old-DB-vs-New-DB = Power BI vs Platform
sourcing) stands, now with the Rev-02/April date-stamp as corroborating detail.
**Confidence stays 8/10** — the reinforcement is filename-level inference, which
does not clear the two residual unknowns (§8: which ingestion path AT10x used, and
confirmation from a corrected XER). No re-diagnosis warranted; the actionable
finding continues to be the **stall**, and it has roughly doubled in length.

### Cross-ticket movement noted this run (informational)

- **PLT-2882 → Done** (was In Analysis). The sibling stale-metadata ticket closed;
  its `context.md §6` "silently drops without warning" pattern reference still
  stands as the analogy for the §6 hardening candidate here.
- **PLT-2874 → Dev In Progress** (was In Analysis). This is the first of the three
  "two dashboard surfaces disagree on a number, FE is a faithful renderer" tickets
  (PLT-2874 element counts / PLT-2884 progress % / PLT-2917 milestones) to reach
  dev — the board README flagged that as the trigger for writing the pattern up in
  `dashboard/pitfalls.md`. Worth doing on the next run.
- **PLT-2917** still Open; **PLT-2385** still Ready For Development; **PLT-2890**
  now Ready For QA (out of this routine's scope).
- **Domain slug kept:** `data-pipeline` (§7 reasoning unaffected).
