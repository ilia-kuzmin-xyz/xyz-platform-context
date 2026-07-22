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

## 2026-07-22 (later) — Dev-panel results, rounds 1–2: selective loss; orphans found

Ilia ran queries 1–7 on AUS01 (current revision `AUS01-260712-C_updated1`):

**Round 1 (queries 1–4):**
| check | result |
|---|---|
| WBS Location rows existing project-wide (Q1) | **7,879** — NOT deleted wholesale |
| Sampled WBS rows keyed to current revision (Q2, n=20) | all `true` — NOT orphaned wholesale; values like `S27 - TFO`, `S12 - Data Hall`, `Flex 18` (steel-frame/data-hall "sequence"-style locations) |
| A4300/A4290/A4160 current rows (Q3) | discipline=CSA, package=Precast present; `wbs location = NULL` |
| Coverage (Q4) | activities 11,115 · with_discipline 9,878 · with_package 9,878 · **with_wbs_location 7,848** → ~2,030-activity hole ≈ the "2,119 un-mapped" banner |

**Round 2 (queries 5–7):**
- **Q5 (hole by package):** spans **51 packages** — dominated by non-physical work:
  Procurement 1,028 · Key milestone 217 · Design 152 · Retired 88 · Earthworks 52 ·
  UG Telecom 47 · Preconstruction 40 · Partitions 38 · Roof 37 · Painting 34 …
  **Precast 19** … long tail to 1. → NOT one wiped subtree; most of the hole is
  plausibly **never-mapped non-physical activities** (locations don't apply to
  Procurement/Design/Milestones), with a smaller set of genuinely-lost physical
  packages inside it — Precast (≈100% of its ~19-21 activities) is the reported one.
- **Q6 (A4300 full row):** columns are exactly `discipline, package, phase,
  wbs location` — **AUS01 has NO "Sequence" category type.** The client's "changed
  into sequences" therefore refers to **S-prefixed WBS Location *values*** (steel-frame
  sequence-style locations like `S12 - Data Hall`) appearing on Precast rows — i.e.
  a mis-assignment episode before the blanking, not a type re-point.
- **Q7 (orphans):** **9,878 mapping rows match current itemIds; 255 do NOT** —
  orphaned rows keyed to old-revision itemIds exist. **Prime suspect:** the
  re-upload's mapping carry-over missed a subset (Precast's dates DID change between
  revisions), stranding their WBS Location mappings on old IDs — possibly holding the
  lost `Area A/B…G/H` values, recoverable by re-keying.

**Revised mechanism ranking:**
1. **Partial carry-over miss on re-upload (BE)** — most of the project's mappings
   (incl. 7,848 WBS values) carried fine; a subset (Precast among them) did not, and
   their rows are candidates for the 255 orphans. → Queries 8/9 below decide.
2. **Destructive FE save** — demoted from primary cause to **standing risk**: any
   mapping-panel Save purges orphans permanently (and may already have, for some).
3. Blanket dynamic-type carry-over failure — **refuted** (7,848 carried).

**Next queries (issued to Ilia):**
```sql
-- Q8: per-package coverage — separates "wiped" (total=missing) from "never mapped"
SELECT f.package, COUNT(*) AS total, COUNT(f."wbs location") AS with_wbs,
       COUNT(*) - COUNT(f."wbs location") AS missing
FROM api_activities a JOIN activity_categories_flat f ON f.activityId = a.itemId
GROUP BY f.package ORDER BY missing DESC;

-- Q9: smoking gun — do the 255 orphans hold the lost Precast "Area ..." values?
SELECT f.activityId, f.discipline, f.package, f.phase, f."wbs location"
FROM activity_categories_flat f
LEFT JOIN api_activities a ON a.itemId = f.activityId
WHERE a.itemId IS NULL ORDER BY f.package LIMIT 40;

-- Q9b: orphan summary by package
SELECT f.package, COUNT(*) AS orphan_rows, COUNT(f."wbs location") AS with_wbs
FROM activity_categories_flat f
LEFT JOIN api_activities a ON a.itemId = f.activityId
WHERE a.itemId IS NULL GROUP BY f.package ORDER BY orphan_rows DESC;
```

## 2026-07-22 (round 3) — VERDICT: deleted, not orphaned; destructive FE save re-crowned as primary

**Q8 (per-package coverage, 91 packages) — the loss is single-type, subtree-shaped,
sharp-bounded:**
| package | total | with_wbs | missing |
|---|---|---|---|
| Procurement | 1,043 | 15 | 1,028 |
| Key milestone | 219 | 2 | 217 |
| Design | 152 | 0 | 152 |
| Retired | 88 | 0 | 88 |
| Earthworks | 196 | 144 | 52 |
| UG Telecom | 47 | 0 | 47 |
| Partitions | 680 | 642 | 38 |
| Roof | 40 | 3 | 37 |
| Painting | 410 | 376 | 34 |
| Level 1 (Comm.) | 344 | 324 | 20 |
| **Precast** | **21** | **2** | **19** |
| …long tail… | | | |
| dozens of packages | | | **0 missing** (BMS 434/434, Ext. Wire Pulls 591/591, Containment-current, EPMS 108/108…) |

**Q9/Q9b (orphan inspection) — orphan theory REFUTED for Precast:** the 255 orphans
are dominated by General Preconstruction (59), Exterior Wire Pulls (54), Procurement
(38), Painting (23), Design (14) — i.e. **activities dropped from the new schedule
version** (normal re-upload debris; several carry old yard-phase values like
`Elec Yard`, and only 31/255 have any WBS value). **Precast has just 2 orphan rows,
0 with WBS values.** The lost `Area A/B…G/H` values exist in NEITHER current rows NOR
orphans → **deleted from the mappings data outright.** Corollary: itemIds are stable
across re-uploads for surviving activities — carry-over is NOT the failure mode.

**Verdict (mechanism ranking, final):**
1. **FE destructive save + descendant cascade (context.md §B+§C) — PRIMARY, 8/10.**
   Selective single-type deletion across specific subtrees with survivors at cascade
   boundaries (Precast 2/21, Roof 3/40) while discipline/package/phase remain intact
   everywhere is exactly the fingerprint `saveDataMapping` + descendant-type-clearing
   produces. Plausible session: re-upload surfaces "2,119 un-mapped" → someone opens
   the mapping panel to fix (incl. steel-frame S-value work — the client's
   "sequences" sighting on Precast) → Save(s) delete WBS Location across every
   cascaded subtree.
2. Re-upload carry-over miss — refuted (stable itemIds, mappings survived).
3. Wholesale deletion / wholesale orphaning — refuted earlier.

**Remaining to confirm:** the BE audit (deletion timestamps + user) — turns 8/10 into
a dated, attributed fact and enumerates the restore set.

**Recovery paths:**
- BE audit/soft-delete restore (if available) — cleanest.
- Else: client's **full** last-week export (the attachment covers only the Precast
  filter) diffed against current state = complete restore list. Q8 implies losses
  beyond Precast (Roof, Earthworks, Painting, Partitions, Level 1…) the client hasn't
  reported yet — proactively enumerate (playbook Q6 cohort), don't wait for the next
  ticket.
- **Guard stands:** no mapping-panel Saves on AUS01 until restoration completes.

**FE fix (Darminder, own ticket):** make `saveDataMapping` merge instead of mirror —
never delete types the user didn't explicitly clear (`category-mapping-service.ts:265-271`);
review the descendant-type-clearing cascade (`:643-650`) for a confirm/undo. Now a
confirmed real-world data-loss bug, not a theoretical vector.

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
