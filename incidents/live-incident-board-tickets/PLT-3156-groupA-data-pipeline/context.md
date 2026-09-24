# PLT-3156 — "SIN02 - Webviewer showing 2 paths for the schedule" — triage context

**Raised** 2026-09-21 16:29 BST by Yash Patel (project SIN02, Freshdesk `#8023`)
**Status** With Customer · Major · assignee Yash Patel
**First triaged here** 2026-09-22 (this file, new folder). Group A — brand-new ticket.
**Domain slug chosen:** `data-pipeline` — this is an XER schedule-import question (an extra WBS root
appearing in the tree), the same mechanism family as `PLT-3033-resolved-data-pipeline/` ("Extra Parent
WBS on Webviewer"), not a viewer-rendering or model-geometry issue.

---

## Description (verbatim)

> Issue Type: Model Viewer, Project: SIN02
>
> Hi Guys,
> Draft section is coming up on SIN02 schedule.
> That seems to be a similar problem that the meta projects are facing I was told.
> Is there a way of you guys delete that from the webviewer?
> [screenshot]
> I am also attaching the schedule used.
> 1. SIN0201-TSL-SIN02 Update August26 (Act. IDs).xer

The ticket **title** ("2 paths for the schedule") and the **description** ("Draft section... coming
up") are describing the same symptom two ways: a second, unwanted top-level branch in the schedule
tree, labelled/associated with "Draft".

## Comment timeline

| When (BST) | Who | id | What |
|---|---|---|---|
| 09-21 16:34 | Yash Patel | 112646 | Restates the report for Rishi. Adds: Darminder asked whether a *previous* schedule version also had the Draft section — checked, it does **not**, so the Draft entry isn't inherited from an earlier import. |
| 09-21 16:34 | Yash Patel | 112647 | Freshdesk → Waiting on 3rd line. |
| 09-21 16:42 | Rishi Bhugobaun | 112648 | Diagnosis + fix, on the first reply: *"We cannot delete any section from the schedule in Editor - the importer converts from what is present in the file. A manual removal is a last resort. However I can see that the DRAFT project is referenced in the provided xer file for the current schedule, so the use will need re-export without it the DRAFT project in the same manner as the previous one. Re-importing this should then remove this parent and its children and maintain the other activites."* Asks Pietro/Mostafa whether they know an existing resolution from the "Meta" precedent Yash mentioned — **unanswered**. Also asks Yash for a project invite. |
| 09-21 16:59 | Yash Patel | 112650 | Confirms invite sent; will ask customer to re-export without the DRAFT reference. |
| 09-21 17:03 | Yash Patel | 112651 | Freshdesk → Waiting on customer. |

**Read literally, this ticket is already answered.** Rishi's first reply correctly diagnoses the
mechanism and gives the customer an actionable fix (re-export without the DRAFT project). The two
open threads are administrative/confirmatory, not diagnostic:
1. Rishi's question to Pietro/Mostafa about the "Meta" precedent — unanswered, and not blocking
   (see below, the precedent is a different ticket but the same mechanism family).
2. Whether the customer actually re-exports and re-uploads, and whether that clears both symptoms
   (the extra WBS branch *and* whatever the screenshot shows as "2 paths" — see § Media).

## Media — unopenable from this session, per the standing session-wide 403

| Id | Filename | Size | What it would settle |
|---|---|---|---|
| `65014` | `image-20260921-153355.png` | 58 KB | The actual "2 paths" screenshot — confirms whether this is literally two root nodes in the schedule tree UI, or something else (e.g. two Gantt bars per activity). Not opened this session (HTTP 403, consistent with every other ticket's attachment gap on this board). |
| `65015` | `SIN0201-TSL-SIN02 Update August26 (Act. IDs).xer` | 2.7 MB | The current schedule export — would let us confirm directly whether it contains a second top-level `PROJWBS` root named/associated with "Draft", rather than relying on Rishi's read. Binary attachment, same 403. |
| `65016` | `SIN02.TSL.WIP-BL.xer` | 2.2 MB | Per Yash's `112646`, the *previous* schedule version, confirmed by Yash not to contain the Draft section — corroborating evidence for "this was introduced in the August26 re-export," not a long-standing import artefact. Same 403. |

**Not load-bearing for the diagnosis** — Rishi's mechanism is independently confirmed from source
(§ Code trace) without needing to open these. They would matter only to double-check the screenshot
literally shows two tree roots (very likely, given the code trace) and to see exactly which WBS node
in the XER carries the "Draft" label.

## Domain cross-reference and duplicate screening

**`PLT-3033-resolved-data-pipeline/`** ("Extra Parent WBS on Webviewer and inflation of unmapped
activity count", B11, reached Done 2026-09-21) is the same mechanism family: an unexpected extra
top-level WBS node appears in the Web Viewer's schedule tree after a schedule re-upload, and the
fix in that case was also "re-upload the correctly formatted schedule" (Darminder, PLT-3033
`111661`). **Not the same ticket, not the same project** (B11 vs SIN02), and PLT-3033's own extra
node was never confirmed by name to be a second `PROJECT`/`DRAFT`-style branch (Darminder's guess
there was a mis-imported *sequence* revision, `'WI-1_W_WT_B11_2026-8.2 - LIVE - DRAFT'` — note this
also has "DRAFT" in the name, which is a real point of similarity worth flagging to whoever answers
Rishi's question). **Likely the "Meta" precedent Yash refers to** is one of the Meta LVN tickets in
this board (`PLT-3109-groupA-progress-tracking/`), but that ticket's mechanism (a client-side Power BI
`WHERE` filter dropping zero-labour-unit activities) is unrelated to a schedule-tree WBS root —
**Yash's "similar problem" framing is not established as the same mechanism**, only as a recalled
verbal comparison. Worth a one-line correction if anyone repeats it as fact.

`recurring-defect-patterns.md` and `dashboard/schedule-tab.md` have no existing entry for a
DRAFT/second-project WBS root (checked via grep, no hits) — this is either a new pattern instance or
the second occurrence (after PLT-3033) of one not yet promoted to that file.

## Code trace — verifying Rishi's claim against source, not just trusting it

Research delegated to a sub-agent this session (read-only, both repos already local checkouts).
Findings, with file:line citations:

**XER parsing is entirely client-side, in `hc-frontend`.** No XER/Primavera ingest exists in
`XYZPlatformApi` or any separate pipeline reachable from either repo (`grep -ri` for "xer"/"primavera"
across `XYZPlatformApi` returns zero hits). The parser is
`app/.../schedule-upload-service/schedule-parser/schedule-parser.ts` — its own docstring says it
"Parses a Primavera XER file into a list of ScheduleActivityDto objects... to preview the schedule
before uploading it to the server." It reads exactly two XER tables: `TASK` (`:358`) and `PROJWBS`
(`:367`) — **it never reads the `PROJECT` table at all.**

**Rishi's claim — "the importer converts from what is present in the file" — is verifiably true, and
there is no name-based filtering to add it to.** `getWBS()` (`:202-215`) maps every `PROJWBS` row
unconditionally into a `Task`, `parent = item.parent_wbs_id`. `aggregateWBS()` (`:240-269`) builds
the tree purely from `wbs_id`/`parent_wbs_id` linkage: **any node whose parent isn't found becomes a
root** (`:248-260`, "Parent not found, treat as root"). No `proj_id` filtering, no name-based
exclusion, no reference to "DRAFT" anywhere in the parser or its types.

**"2 paths" = two root WBS nodes, mechanically.** Not "one root per XER `PROJECT` record" (the parser
never reads that table) but **one root per orphan `PROJWBS` node** — any `wbs_id` whose
`parent_wbs_id` is null or unresolved. If the customer's August26 XER export contains both the main
project's WBS tree and a separate DRAFT project's WBS tree, each has its own top-level `wbs_id` with
no valid parent inside the file, so `aggregateWBS()` pushes **both** into `roots[]`
(`:246-262`), and both render as separate top-level paths in the schedule tree. Yash's Aug-version XER
(`65016`, confirmed by Yash not to contain the Draft section) presumably lacks that second orphan
root — consistent with "this was introduced in the August26 re-export."

**No partial-delete capability exists anywhere in either repo**, corroborating Rishi's "manual removal
is a last resort" and "cannot delete any section from the schedule in Editor." The only backend delete
operation is whole-revision: `XYZPlatformApi/src/services/schedules.service.ts:230-249`
(`deleteScheduleRevisionById` → `usp_DeleteScheduleRevision`) — deletes an entire schedule revision's
activity/WBS data, never a single branch. No UI affordance to hide/exclude one WBS branch from the
tree without a re-upload was found (checked dashboard-schedule loaders, `scheduler-wbs/wbs-service.ts`,
model-layer context menu, category-mapping code).

## Verified vs inferred

**Verified — read in Jira or in source this run:**
- All five Jira comments, ids/authors/timestamps; 3 attachments, all HTTP 403 on content.
- `schedule-parser.ts` reads only `TASK`/`PROJWBS`, never `PROJECT` (`:358`, `:367`).
- `getWBS()`/`aggregateWBS()` build the tree unconditionally from parent/child linkage, with no
  name-based filtering anywhere (`:202-269`).
- Any orphan `PROJWBS` node (no resolvable parent) becomes its own tree root (`:248-260`).
- No partial-branch delete exists; only whole-revision delete (`schedules.service.ts:230-249`).

**Inferred, not verified:**
- That the screenshot (`65014`, 403) literally shows two tree roots rather than something else — very
  likely given the code trace, but not seen directly.
- That the "DRAFT project" Rishi identified in the XER is a second orphan `PROJWBS` root specifically
  (rather than, say, a child node whose parent id happens to not resolve for some other reason) — the
  mechanism supports this reading but the XER file itself (`65015`) was not opened to confirm which
  `wbs_id` is orphaned.
- That this is the same underlying defect family as PLT-3033, not merely a similar-sounding symptom.

## What remains unverified

1. **Whether the customer has re-exported yet.** Freshdesk is "Waiting on customer" as of `112651`;
   no reply since.
2. **Rishi's question to Pietro/Mostafa about the "Meta" precedent** — unanswered, and per the domain
   cross-reference above, likely conflates two different tickets/mechanisms; worth a correction if
   anyone builds on it uncorrected.
3. **Whether re-exporting without the DRAFT project actually clears both symptoms** (the extra WBS
   root and whatever "2 paths" specifically shows) — Rishi's fix is well-supported by the code trace
   but not yet confirmed against the customer's own result.

## 2026-09-24 (scheduled) — confirmed unchanged

Live `getJiraIssue` re-fetch (full fields incl. `comment`): status still **With Customer**,
assignee still **Yash Patel**, still **5 comments**, newest still `112651` (09-21 17:03, Freshdesk
"Waiting on customer"). No reply from the SIN02 customer yet on the DRAFT-project re-export ask.
No re-investigation performed.
