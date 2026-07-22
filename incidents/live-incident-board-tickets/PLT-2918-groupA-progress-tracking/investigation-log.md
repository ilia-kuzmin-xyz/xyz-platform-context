# PLT-2918 — investigation log

Owner: Ilia Kuzmin (assignee) + Claude (this log). Continues `context.md` — read its
§Mechanism first (destructive save §B, cascade §C, ID-space ambiguity §D).

## 2026-07-22 — attachments decoded; trigger evidence-backed; mechanism refined

### What the images changed (full decode in context.md §NEEDS HUMAN → RESOLVED)

- Trigger found: viewer runs schedule **`AUS01-260712-C_updated1` (Current)** and
  `A4300`'s dates differ from last week's export (18–24 Nov vs 13–19 Nov 2026) →
  **a schedule re-upload/new revision landed in the window**. Plus a
  **"2119 un-mapped activities"** banner → mass unmapping, not a targeted edit.
- The differential to explain: **Discipline/Package/Phase (hardcoded types) survived;
  WBS Location (dynamic type) is "-" everywhere** in the viewer, while the export has it
  fully populated for Precast.
- The export xlsx itself is the **recovery source** (activity-ID → WBS Location for all
  of Precast) if rows turn out to be deleted.

### Refined leading hypothesis — mixed ID-space orphaning composed with destructive save

Code facts (all verified):
- Mappings are fetched **per project**, not per revision
  (`category-mapping-service.ts:143-149` `listMappings(projectId)`), keyed by
  `mapping.activityId` (`:156-161`).
- The ID-space of `mapping.activityId` is ambiguous enough that the loader **logs a
  runtime UUID-vs-P6-code check** (`api-categories-loader.ts:104-111`) — the team already
  knows both occur in the wild.
- Schedule hydration looks mappings up by the **current revision's `item.itemId`**
  (`scheduler-service/utils.ts:41,67-68`). Api-v2 schedule itemIds are
  **revision-scoped** — a re-upload mints new ones.
- There is **no FE carry-over logic** for mappings across revisions (grep: none); if any
  carry-over exists it is backend-side (unconfirmed — ask api-v2).

Composition that explains the differential AND the mass unmapping:
1. **Orphaning (data):** if the WBS Location mappings were created under a flow that
   stored the **old revision's activity UUIDs**, the re-upload orphans them — new itemIds
   find nothing → viewer shows "-" and the unmapped count explodes. If
   Discipline/Package/Phase rows are keyed to a **stable ID space** (P6 code) — or were
   carried over/re-created backend-side — they survive. This cleanly produces
   "hardcoded types live, dynamic type dead".
2. **Permanent loss (FE destructive save, context.md §B):** once WBS Location is null
   in-memory for the whole subtree, **any** mapping-panel Save marks descendants changed
   and **deletes the persisted WBS Location rows** while updating the types that are
   present in memory. The client's "changed into sequences… should only be for the steel
   frame" hints someone WAS doing Sequence mapping work post-re-upload — exactly the kind
   of save that would fire it. (1) makes the data recoverable-by-re-key; (2) converts it
   into a real delete. **Which state AUS01 is in is THE open question** → queries below.

### Dev-panel queries (AUS01, new dashboard `/projects/<aus01-id>/dashboard`, Ctrl+Shift+D)

```sql
-- 0) discover the exact dynamic column names (expect a "WBS Location" column)
SELECT * FROM activity_categories_flat LIMIT 3;

-- 1) DELETED vs ORPHANED: do ANY WBS Location values still exist in project mappings?
SELECT COUNT(*) AS wbs_rows
FROM activity_categories_flat
WHERE "WBS Location" IS NOT NULL;

-- 2) if wbs_rows > 0: are they keyed to current-revision itemIds or orphaned old IDs?
SELECT f.activityId, f."WBS Location",
       (a.itemId IS NOT NULL) AS matches_current_revision
FROM activity_categories_flat f
LEFT JOIN api_activities a ON a.itemId = f.activityId
WHERE f."WBS Location" IS NOT NULL
LIMIT 20;

-- 3) the A4300 sample end-to-end on the current revision
SELECT a.itemId, a.userItemId, f.discipline, f.package, f."WBS Location"
FROM api_activities a
LEFT JOIN activity_categories_flat f ON f.activityId = a.itemId
WHERE a.userItemId IN ('A4300','A4290','A4160');

-- 4) per-type coverage differential across the whole current revision
SELECT COUNT(*)                 AS activities,
       COUNT(f.discipline)      AS with_discipline,
       COUNT(f.package)         AS with_package,
       COUNT(f."WBS Location")  AS with_wbs_location
FROM api_activities a
LEFT JOIN activity_categories_flat f ON f.activityId = a.itemId;
```

Notes: if query 0 shows `activityId` values shaped like `A4300` (P6 codes), swap the
joins to `ON a.userItemId = f.activityId`. Quote the "WBS Location" column exactly as
query 0 reveals it.

**Interpretation map:**
- Q1 `wbs_rows = 0` → rows **deleted** project-wide → destructive save already fired →
  recovery = re-import from the client's export xlsx (attachment 1) + BE audit for
  when/who; FE merge-fix becomes urgent.
- Q1 `> 0` but Q2 `matches_current_revision = false` → **orphaned by re-key**, not yet
  deleted → recovery = re-key/re-map; freeze mapping-panel saves on AUS01 until fixed
  (any Save would convert orphaned → deleted).
- Q1 `> 0` and matches current → mappings fine, defect is FE hydration/display →
  different (smaller) track.
- Q4: if `with_discipline ≈ activities` while `with_wbs_location ≈ 0`, the
  hardcoded-vs-dynamic differential is confirmed at data level.

## ASK LIST (information / debugging needed)

| # | What | Owner | Why |
|---|---|---|---|
| 1 | Run queries 0–4 above on AUS01; paste outputs | Ilia (5 min) | Decides deleted vs orphaned vs display-only — the whole routing hinges on it |
| 2 | Exact re-upload timeline: when was `AUS01-260712-C_updated1` uploaded, what revision was the client's export cut from | Yash → Paddy / BE logs | Dates the trigger (playbook Q5) |
| 3 | Did anyone open + Save the schedule mapping panel on AUS01 after the re-upload (steel-frame Sequence work)? | Yash → Paddy | The destructive-save firing event; also explains "changed into sequences" |
| 4 | What ID does `activity_category_mapping.activityId` store (P6 code or revision UUID), per category type / creation flow; any BE carry-over job on upload; any audit/soft-delete on mappings | Sachin / Ali (api-v2) | Confirms the mixed-ID mechanism + restorability |
| 5 | ⚠️ Interim guard: advise nobody Saves the AUS01 mapping panel until Q1/Q2 are known | Ilia → Yash → client | If rows are orphaned-not-deleted, a Save destroys them permanently |
| 6 | Client's report deadline pressure | Yash | Recovery via the export xlsx can be offered as a stopgap re-mapping regardless of root cause |

## Status

Trigger: evidence-backed (schedule re-upload). Mechanism: composed hypothesis 7/10 on
the FE half (all code paths verified), 5/10 on which data-state AUS01 is in
(deleted vs orphaned) — settled by ask #1. Cross-ticket: same mapping screen as
PLT-2917's screenshot (ELN03 showed its own "2530 un-mapped activities" banner) —
if ELN03's schedule was also re-uploaded recently, the orphaning may be a **cohort
across projects**, not an AUS01 one-off. Check ELN03/FAR01/ELN04 unmapped counts while
running PLT-2917 queries.
