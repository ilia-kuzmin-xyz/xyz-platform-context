# Recurring defect patterns — live incidents

The technical counterpart to `live-incident-playbook.md`. That file covers *how to run* an
incident (roles, questions, message craft). This one covers *what the incidents keep turning out
to be*, so a new report can be matched against a known shape in minutes instead of re-diagnosed
from scratch.

Add a pattern once the same mechanism has been confirmed on **two or more** projects. One
occurrence is a ticket; two is a pattern.

---

## Pattern 1 — Dead activity links (element metadata diverges from model geometry)

**Confirmed on three projects, three different surfaces, two different triggers.** This is the
most expensive pattern found so far: roughly two weeks of investigation across three tickets
before it was recognised as one thing.

| Ticket | Project | Surface it presented as |
|---|---|---|
| PLT-2882 | FAR01 | Select/isolate linked elements does nothing, panel still shows a count of 418 |
| PLT-2909 | ATL08 | Activity lists models that contain none of its elements (ghost model) |
| PLT-2931 | ELN03 | Progress % permanently capped below 100%, package stuck at 97% |

### Mechanism

An activity's links point at `modelElementId`s that still exist in the model's **element metadata**
(`client-element-metas` parquet, `project_element_list`) but no longer exist in the model's
**translated geometry**. The two artefacts are produced separately and can diverge for the same
model version.

Everything downstream reads one side or the other, which is why the symptom looks different
depending on where you happen to be looking:

- **Counts and model lists** come from metadata, so they include the dead elements.
  `ElementEntity.models` is populated purely from each model's metadata parquet
  (`model-entity.ts:255-280`); the panel groups by `element.getModels()` with no geometry check
  (`useGroupedLinks.ts:30`); the isolation tree adds a model node even when it resolves zero dbIds
  (`useLinkedElementsTreeData.ts:114-116`).
- **Selection needs geometry.** `model.elementId2dbId` is the *intersection* of loaded geometry
  externalIds and the metadata parquet (`model-mapping-service.ts:372-384`), so dead elements
  simply aren't there and selection silently resolves to nothing
  (`use-linked-element-actions.ts:24-63`).
- **Progress is computed backend-side** as `InstalledElements / LinkedElements` at parquet
  generation. Dead links inflate the denominator, so the activity can never reach 100% regardless
  of what site claims.

### Recognition signature

Any one of these should make you check for this pattern:

- An activity is claimed complete on site but the dashboard shows it short of 100%, and
  `installed / linked` reproduces the displayed percentage exactly.
- Select or isolate linked elements appears to do nothing, while a non-zero count is displayed.
- An activity lists models that visibly don't contain its work.
- A package sits a few points below 100% with no identifiable outstanding work.

**The decisive test is arithmetic:** if the displayed percentage equals installed ÷ linked to two
decimals, the denominator is the bug and you are in this pattern. That single check settled
PLT-2931 in minutes.

### Two distinct triggers, same downstream symptom

Do not assume one backend fix closes both.

- **Re-upload / re-version** (PLT-2882). Content inside a federated model was removed or
  re-exported with new handles; metadata retained the dead generation. Source file `bb85941b` was
  decisive there: present in geometry with 18,908 elements, yet none of its 141 linked handles
  existed, which kills the simpler "a file was deleted" story.
- **PC-EXCEL import cross-write** (PLT-2909). The Excel import path appears to write the same
  element rows into several buildings' metadata, so a building claims elements belonging to a
  sibling. Open with Ali.

### Diagnostic recipe, cheapest first

**1. Arithmetic check (seconds, dashboard DuckDB).** Does installed ÷ linked equal the displayed
percentage?

```sql
SELECT a.userItemId,
       COUNT(al.modelElementId) AS linked,
       SUM(CASE WHEN es.installationStatus = 'INSTALLED_ACCURATELY' THEN 1 ELSE 0 END) AS installed
FROM api_activities a
JOIN activity_links al ON al.activityId = a.itemId
LEFT JOIN element_status es ON es.modelElementId = al.modelElementId
WHERE a.userItemId IN ('<ids>')
GROUP BY a.userItemId
```

**2. Geometry oracle (seconds, same place).** `element_base_data` is materialised from
element_status + activity_links + api_activities + svf2_object_id_map, so absence of a row means
absence of geometry mapping:

```sql
SELECT a.userItemId, al.activityId, al.modelElementId
FROM api_activities a
JOIN activity_links al ON al.activityId = a.itemId
LEFT JOIN element_base_data ebd ON ebd.modelElementId = al.modelElementId
WHERE a.userItemId IN ('<ids>')
  AND ebd.modelElementId IS NULL
```

**Validate before trusting it.** Its counts must match the uninstalled counts from step 1 on
activities the customer says are fully claimed, and `objectId` should never be null-but-present.
`svf2-object-id-map` is emitted for **Navisworks-path models only**
(`navisworks-model-mapper.ts:277`); Revit models get their mapping from Forge's property DB at
load time (`revit-model-mapper.ts:22`), so on a Revit project this query flags everything and is
useless. The mismatch itself tells you which world you're in.

**3. Editor diagnostic (minutes, only if step 2 is unavailable).** Branch
`PLT-linked-selection-diagnostics`, `window.__linkDiagnose(activityIdOrUserItemId)`. Read
`parquetVsGeometryByMongoModelId`: `inParquet > 0` with `inGeometry = 0` is the confirmation.
Requires the correct schedule selected **and** the relevant models loaded, or it returns an empty
shell that looks like a failure.

**4. Project-wide sweep.** Step 2 with the activity filter removed. On Revit-mapped projects fall
back to `scripts/console-geometry-harvest.js` plus `scripts/orphaned-links-sweep.mjs`.

### Remediation

Soft-delete the dead links. See `data-remediation-runbook.md` for the safe procedure. On ELN03
this moved five activities from 72/49/73/97/98 to 100 and cleared the Containment package to 100%,
exactly as predicted.

Cleanup treats the symptom. Until the pipeline stops producing the divergence, it recurs.

### Approaches that did not work

- **`__linkAudit()` viewer-based sweep** — needs every model rendered, and silently counted
  unresolvable elements as unresolved, reporting zero orphans while the target models were
  unloaded. Retired.
- **Artefact-based sweep alone** — only 22 of FAR01's 101 models have an `svf2-object-id-map`, for
  the Revit reason above. The 705k "orphans" it produced were false positives.
- **Assuming the auto-unlink on upload protects you** — it reads the element list, which still
  contains the dead elements, so it passes them as valid every time. This is exactly why they
  accumulate.

### Root cause, still open

Why metadata retains elements the geometry doesn't have. Open with Dave and Ali. The highest-value
fix is not the cleanup but making the unlink step on upload compare against **geometry** rather
than the element list, which would make the whole family self-correcting.

Related but separate: model deletion does not remove links unless a user ticks a checkbox, and the
plain delete path hardcodes it off (`confirm-model-deletion.tsx:103-112`), which is an independent
source of orphans that we own.

---

## Pattern 2 — The frontend is a faithful renderer, so "wrong number" is usually upstream

Weaker than Pattern 1 (no single mechanism), but it recurs often enough to be worth a reflex.

Seen on PLT-2874 (element counts), PLT-2884 (progress % vs PowerBI), PLT-2917 (milestone status
and dates), PLT-2931 (package percentage).

**The shape:** two surfaces disagree about a number, and the instinct is to look for a rendering
bug. In every case so far the frontend performed no computation at all. Examples confirmed by
reading the code: milestone status is passed through raw from `reporting.vw_KeyMilestone` with no
date logic anywhere in the marker (`milestoneStatus.ts:14-30`, `MilestoneMarker.tsx:100/122`);
per-activity progress is computed backend-side at parquet generation and DuckDB only reads it.

**The reflex:** before investigating the display, find where the value is computed. If the frontend
just renders it, the ticket belongs to whoever produces the data, and time spent in the FE repo is
wasted. State this explicitly in the ticket, because "the dashboard is wrong" naturally reads as a
frontend bug to everyone else.

**The trap inside the trap:** faithful rendering is not the same as blameless. The frontend's real
failing in Pattern 1 was showing a count the user could never act on and then doing nothing
visible when they tried. That silence is what turned a lookup into a multi-day investigation.

---

## Candidate patterns (one occurrence, watch for a second)

- **Viewable-name fallback vs on-device client** (PLT-2923). A model renders on the headset but
  not in the browser. The web viewer picks its viewable by name from a fallback chain, `Navis` then
  `XYZ` then `EXPORT TO HOLOSITE` then `{3D}`, and renders nothing at all, with no error, if none
  matches (`viewer-service.ts:1052-1065`, `:945-946`). Promote to a pattern if a second IFC-sourced
  model does the same.
- **Source-data elevation errors presented as viewer bugs** (PLT-2649). 360 pins placed wrongly
  because one level's elevation was wrong in the source model; the transform was provably correct
  and the same fault reproduced in PowerBI.
