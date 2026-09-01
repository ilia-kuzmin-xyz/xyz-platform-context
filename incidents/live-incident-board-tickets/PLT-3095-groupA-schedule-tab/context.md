# PLT-3095 — AUS02: some WBSs not coming through on Web Viewer

New ticket, created 2026-08-31 12:17, no prior folder. First pass 2026-09-01.

## Ticket

- **Project:** AUS02. **Reporter:** customer, via Yash. **Assignee:** Ilia. **Priority:** Major.
  **Status:** Open.
- **Symptom:** several WBS branches, including "Core & Shell Construction", are present in the
  AUS02 P6 schedule (.XER) but do not appear in the Web Viewer Schedule tab.
- **Customer's own troubleshooting (comment 110852, Yash, 2026-08-31 12:20):**
  - Toggling "Show WBS" did not resolve it.
  - Customer confirmed the .XER contains only the AUS02 schedule (no stray extra projects mixed
    in from a multi-project export).
  - Customer verified the affected WBS **codes** are unique and don't conflict with other
    branches.
  - Re-importing the schedule did not resolve it.
- No second comment from the dev side yet — only the Freshdesk status-sync comment (110853).

## Media — unopenable, flag for human

Five attachments on the ticket: `AUS02-60-Schedule-L1-.xer` (the actual P6 export, 1.0 MB),
`image-20260831-111944.png`, `image-20260831-111953.png`, `image-20260831-112007.png`,
`image-20260831-112012.png` (P6 vs Web Viewer screenshots per Yash's comment). All are Jira
attachments behind Atlassian auth; this environment has no authenticated fetch path for Jira
attachment content (`WebFetch` explicitly refuses authenticated services, and no Atlassian MCP
tool here exposes attachment bytes). **None were opened.**

What each would settle if a human pulls them:
- **The .xer file** is the one artefact that could directly answer the falsifiable prediction
  below — pull `wbs_id`/`parent_wbs_id` for the missing branches and check for a P6-side
  duplicate `wbs_id` (distinct from the WBS **code**, which the customer already checked and is
  a different field — see "what remains unverified").
- **The screenshots** would show exactly which WBS names/codes are missing and their expected
  position in the hierarchy (top-level vs nested), which would confirm or rule out the
  "does the missing branch have a duplicate/collision at all" line of inquiry without needing
  the raw file.

## Code read (hc-frontend) — verified

The Web Viewer schedule tree is built by `ScheduleEntity` (frontend), not by the client-side XER
preview parser used at upload time (`schedule-upload-service/schedule-parser/schedule-parser.ts`
— confirmed by its own header comment, "used to preview the schedule before uploading it to the
server"; not the render path for an already-uploaded, already-viewed schedule).

- `ScheduleEntity._createActivityMap()` builds `this._activities` as a
  `Map<string, ScheduleItemDto>` keyed by `activity.id`, via a plain
  `activityMap.set(activity.id, activity)`
  (`app/pages/organisation/ViewerPage/components/project-x/entities/schedule-entity.ts:292-306`).
  **A `Map.set` on a repeated key silently keeps the last write and drops the earlier one** — no
  warning, no merge.
- `_buildActivityTree()` (`schedule-entity.ts:398-444`) then walks `this._activities` (i.e. only
  the survivors of the above) to build parent→children edges. A WBS row that lost the Map
  collision is simply absent from `_activities` and therefore never appears as a tree node,
  however many activities point at it via `parent`.
- WBS rows and Activity rows are not visually or structurally separated in this map — both share
  one `ScheduleItemDto` shape and one `id` keyspace (`type: 'WBS'` is just a field on the same
  object, used elsewhere to exclude WBS from mapping counts, e.g. `schedule-entity.ts:322-324`).

**Backend (XYZPlatformApi), read for the origin of `id` — verified, then genuinely incomplete:**
`schedules.service.ts`'s `queryAndMapScheduleData` calls one Postgres function,
`xyz."fn_GetScheduleRevision"` (`schedules.service.ts:14,128-137`), and `mapRowScheduleVersion`
(`schedules.service.ts:391-440`) maps **both WBS and Activity rows** from that single result set,
keyed by `row.ItemId` → `itemId`, distinguished only by `row.ItemType` → `itemType`. So WBS and
Activity items are already one `ItemId` namespace at the database layer, for whatever that
function does internally.

**Not found in this checkout:** the SQL body of `fn_GetScheduleRevision`, and the exact frontend
adapter step that turns the API's `itemId` into `ScheduleEntity`'s expected `id` field (grepped
`itemId` under both `ViewerPage/components/project-x` and `app/services/webViewerService` — no
hits in either). The DB function lives in a separate database-functions repo/path not present in
this checkout (see XYZPlatformApi `CLAUDE.local.md`, not readable here), so I could not read the
ID-generation logic itself.

## Hypothesis (inferred, NOT verified — falsifiable)

**If AUS02's current schedule-revision API response contains two `ScheduleItemDto`-shaped rows
with the same `id`, one of the two Map entries above wins silently and the loser's WBS branch
disappears from the Web Viewer exactly as reported — no error, no console warning, nothing to
toggle back on.** This would explain "Show WBS toggle didn't help" (toggling doesn't rebuild the
map, it just changes what's already there) and "re-import didn't help" (if the DB function
regenerates the same colliding ids deterministically from the same source data, re-running it
reproduces the same collision).

This is a prediction one query can falsify: **pull the Web Viewer's network response for AUS02's
current schedule revision (or query `fn_GetScheduleRevision` directly) and check for duplicate
`ItemId`/`id` values.** I have not run this — no DB or network access to AUS02 from this
environment.

**Why this is still speculative, stated plainly:** I have not established that `id` in the FE's
`ScheduleItemDto` is `ItemId` unchanged (there may be a normalizing/prefixing step I could not
locate — see above), and the customer's own check ("WBS codes are unique") is about the
human-readable WBS **code** field, not the internal P6 `wbs_id`/database `ItemId` that this
hypothesis is actually about. Those are different fields; the customer's check does not rule this
out, but it also doesn't confirm it — worth being precise about that distinction if this goes back
to the customer.

## Possible link to PLT-3033

PLT-3033 (B11, opened 2026-08-10, still open With Customer) reports the same top-level shape from
the other direction: an unexpected **extra** parent WBS appearing after a schedule import, plus an
inflated unmapped-activity count. This ticket (3095) is the mirror symptom — WBS branches
**missing** rather than an extra one appearing. Both are unconfirmed on mechanism and on different
projects; not claiming they're the same defect, just noting both point at the WBS-import path and
a human working either should know about the other. Darminder was still waiting on the previous
and current XER files for PLT-3033 as of 08-17; no update since.

## Possible link to PLT-3096

PLT-3096 (ATL05, same day, same reporter path via Yash, also a WBS-tree defect — collapse/expand
misbehaving) traces to a structurally similar hypothesis: two schedule items sharing one `id`
would also explain DHTMLX gantt tracking one open/closed state for two rows. Two different
projects, same day, same shape (a WBS item-identity collision) is suggestive but **not
established** — I have not confirmed either ticket's root cause yet, so this is a candidate link,
not a finding. If the duplicate-id hypothesis is confirmed on either ticket, check the other
before assuming they're unrelated. See PLT-3096's `context.md` for its own version of this.

## What remains unverified

- Whether AUS02's current schedule revision actually contains any duplicate `ItemId`/`id` — the
  central open question. Needs DB or authenticated API access to AUS02, which this environment
  does not have.
- Whether the FE's `id` is literally `ItemId` or passes through an adapter that could itself be
  the source of a collision (e.g. two different `ItemId`s coerced to the same string).
- The internals of `fn_GetScheduleRevision` — whether it could produce duplicate `ItemId`s for
  two logically distinct WBS/activity rows (e.g. a join fan-out, or two `ItemId` sequences that
  aren't actually guaranteed globally unique).
- Whether the missing WBS branches share any structural trait (all children of one parent, all at
  one WBS level, etc.) — would need the screenshots or the .xer file, neither opened this run.
- Whether this is new (a recent deploy changed `fn_GetScheduleRevision` or the ingestion path) or
  has always been possible — no deploy-timeline correlation attempted.

---

## 2026-09-01 — ROOT CAUSE FOUND against live prod. The earlier hypothesis is DEAD.

Run with a browser `access_token` against `cloud.xyzreality.com`, GET only. AUS02 projectId
`f862c969-fb32-428a-aa34-ff83d3677b51`. Note the **prod MCP refuses AUS02**
(`project_id_not_allowed`, not on the prod whitelist) — inviting the user to the project does not
help; the platform API with a browser token is the working route.

### The duplicate-`ItemId` hypothesis is falsified

**0 duplicate `itemId`s in 1,818 rows.** The `Map.set` collision theory in the section above is
wrong. Do not pursue it. Keeping it on the record because the reasoning was sound and the check was
cheap; it just wasn't the cause.

### What is actually wrong

`GET /api/v2/projects/{id}/schedules/{revisionId}` returns 1,818 rows (1,586 Activity, 232 WBS).
Only **1,180 are reachable** from the single root by following `parentItemId`.

**638 rows (134 WBS + 504 activities, 35% of the schedule) are unreachable**, because **4 WBS rows
are referenced as `parentItemId` but are absent from the response entirely**:

| missing parent id | implied P6 path | subtree lost |
|---|---|---|
| `c9993475-41a8-4961-ad6f-34ab0a66b10a` | `.1.1.1` | 2 WBS + 2 activities |
| `f0788984-97a8-44af-871f-390dd5e596ce` | `.1.1.2` | 11 WBS + 87 activities |
| `b0b44f2f-8521-470e-9492-a7675d3f806a` | `.1.1.1.1.1` | 13 WBS + 101 activities |
| `501f596d-5279-4110-9603-1aa9e1556799` | `.1.1.2.1.2` | 108 WBS + 314 activities |

A parent that isn't in the payload can never become a tree node, so its children have nothing to
attach to and the whole branch is invisible. No error, nothing to toggle.

### The customer's reported branch, traced

`Core & Shell` (id `740cb0f1`) is present in the response. Its ancestry:

```
WBS:Core & Shell  <-  WBS:Construction Milestones  <-  *** MISSING b0b44f2f ***
```

So the row exists and is still invisible. That is exactly the reported symptom.

### The shape rules out a filter rule

Under `.1.1` (`Procurement`), the siblings present are `.1.1.3` Parking & Landscape, `.1.1.4`
Mechanical Yards, `.1.1.5` Electrical Yards, `.1.1.6` Interior Build-Out. **`.1.1.1` and `.1.1.2`
are absent.** A depth limit or an empty-branch filter cannot produce "3, 4, 5, 6 present but 1 and 2
missing" — this is a gap in the data, not a rule being applied.

### Deterministic across imports

Both AUS02 revisions were pulled (`9f13d821` current/baseline, and `c07665dd`). **Identical:**
1,818 rows, 1,180 reachable, 638 unreachable, the same 4 missing parent ids, absent in both. The
`itemId`s are stable across imports of the same source, which is why the customer's re-import
changed nothing.

### Why each of the customer's four checks was a dead end

| customer check | why it could not have helped |
|---|---|
| toggling "Show WBS" | the rows are not in the tree at all; the toggle only filters what is |
| WBS **codes** are unique | true and irrelevant; nothing collides, rows are missing |
| .XER holds only AUS02 | irrelevant to a missing-parent reference |
| re-import | deterministic, so it reproduces exactly |

### What is still unknown — one question, for the backend

Are those 4 WBS rows **absent from the database**, or **present but not returned** by
`xyz."fn_GetScheduleRevision"`? That function's SQL is not in the platform-api checkout (separate
database-functions repo), so this cannot be answered from here. The attached
`AUS02-60-Schedule-L1-.xer` would settle the upstream half: if P6 exported those `wbs_id`s, the loss
is ours; if it did not, the export itself is short.

This is a **backend/import defect, not frontend.** The frontend renders exactly what it is given.

### Supersedes

- The "PRIME SUSPECT" `Map.set` collision section above — falsified, 0 duplicates.
- The PLT-3096 link theory in that section — it rested on the shared-`id` idea, which is dead.
  PLT-3096 has its own separate suspect (`useShowWBS.ts:33`). Treat them as unrelated.
