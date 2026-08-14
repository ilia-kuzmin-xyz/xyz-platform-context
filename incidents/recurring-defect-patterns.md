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

Seen on PLT-2884 (progress % vs PowerBI), PLT-2917 (milestone status and dates), PLT-2931
(package percentage).

**PLT-2874 is the counterexample, and it was listed here for three weeks.** Two surfaces
disagreed about an element count, the reflex said "upstream", and it was wrong: the data was
fine and the dashboard was mislabelling a geometry-object count as an element count
(`dashboard-element-stats.tsx:49`). Apply the reflex, but confirm it — establish *what unit*
each surface is counting before concluding the frontend only renders. See the candidate pattern
below.

**The shape:** two surfaces disagree about a number, and the instinct is to look for a rendering
bug. In every case so far the frontend performed no computation at all. Examples confirmed by
reading the code: milestone status is passed through raw from `reporting.vw_KeyMilestone` with no
date logic anywhere in the marker (`milestoneStatus.ts:14-30`, `MilestoneMarker.tsx:100/122`);
per-activity progress is computed backend-side at parquet generation and DuckDB only reads it.

**The reflex:** before investigating the display, find where the value is computed. If the frontend
just renders it, the ticket belongs to whoever produces the data, and time spent in the FE repo is
wasted. State this explicitly in the ticket, because "the dashboard is wrong" naturally reads as a
frontend bug to everyone else.

**2026-08-14 addition — PLT-3044 (CH08x) is the cleanest occurrence yet, and it resolved in a day.**
Client reported the dashboard showing disciplines they don't track (Procurement, Design, Milestone)
under the **Project Area** filter. Product (Mostafa) called it same-day: *"it's about how they map the
schedule. nothing from our side."* Code agrees — dynamic (non-core) category sections are populated
from the distinct values in the client's own schedule data with **no allow-list**
(`dashboard-filter-utils.ts:238-306`, values via `activity_categories_flat` /
`dashboard-schedule-service.ts:68-73`). Worth noting as the **inverse of Pattern 3**: there the panel
silently *hides* categories the client expects; here it shows everything the schedule carries and the
complaint is that it shows too much. Same panel, no editorial layer in either direction — so when a
filter panel's *contents* are disputed, check what populates the list before treating it as a display
bug. Full notes: `live-incident-board-tickets/PLT-3044-groupA-filter-system/context.md`.

**The trap inside the trap:** faithful rendering is not the same as blameless. The frontend's real
failing in Pattern 1 was showing a count the user could never act on and then doing nothing
visible when they tried. That silence is what turned a lookup into a multi-day investigation.

---

## Pattern 3 — Check the dashboard's settings before you debug its data

Promoted on a single occurrence, deliberately. This is not a defect mechanism, it is a triage
checklist item, and the cost of skipping it is a full investigation. PLT-2941 took a day of
querying and four wrong hypotheses before the answer turned out to be a dropdown.

**Ask these before writing a single query.** They are cheap, and each one silently changes what
the dashboard shows without saying so anywhere in the UI:

| Setting | What it silently changes |
|---|---|
| **Progress weighting** (Budgeted labour units / Model element count) | Which categories exist in the filter panel at all |
| **XYZ Tracked toggle** | Restricts everything to activities with ≥1 linked element |
| **Date range / scrubber position** | Which elements are coloured and counted |
| **An activity selected in the Gantt** | Switches the whole page to a different query path and data source |
| **Calculation mode** (project / package / mix) | Same — different query, different table |

### The one that has actually bitten us: progress weighting

`getCategorySummaryV2API` builds the discipline/package **filter option list** from
`category_groups` and ends with `AND ${weightColumn} > 0`
(`progress-queries-v2-api.ts:577`). `weightColumn` follows the project's weighting, and the
default is `PLANNED_LABOUR_HOURS` (`app/types/progress-weighting-types.ts:17-23`).

**So by default, any discipline or package with no budgeted labour units vanishes from the filter
panel, however many elements are linked to it.** On the PLT-2941 staging project that hid 2 of 3
disciplines and 3 of 4 packages, including a pre-existing discipline carrying 162 activities.

Selecting an activity switches the page to activity level
(`dashboard-progress-service.ts:311-349`), where the weight is floored at 1
(`progress-queries-v2-api.ts:970`), so the same category reappears. Same data, same setting,
opposite outcome.

### Recognition signature

- A category is missing from the left panel but appears the moment you click an activity that
  carries it.
- Or: the panel lists implausibly few disciplines for the project.

### Two-minute check, before anything else

```sql
-- Does the category exist in the parquet with a usable weight?
SELECT CategoryName, TypeName, TotalLinkedElements, TotalPlannedLaborUnits
FROM category_groups
WHERE CategoryName = '<the missing one>'
ORDER BY CalendarDate DESC LIMIT 5;
```

Zero in `TotalPlannedLaborUnits` plus labour-hours weighting is the whole answer. Then switch the
weighting in the UI and watch it come back.

**Resolution on PLT-2941 was to switch the method, no code change.** The frontend gap is still
real — the panel hides categories with no explanation and no empty-state hint — but it was not
worth a Blocker fix, which is exactly why it belongs here instead. Full analysis and the fix
options if it recurs: `planning/PLT-2941-dashboard-filter-list-hides-zero-weight-categories.md`.

**Generalise the reflex:** when a dashboard number or list looks wrong, the first question is not
"what is wrong with the data" but "what is this surface configured to show". Two surfaces
disagreeing is usually two different configurations, not two different truths. Compare with
Pattern 2, which is the same instinct applied one layer down.

### 2026-08-05 addition — second occurrence, a different manifestation of the same setting

**PLT-3010** (EQX-AT11x, resolved 08-04): platform dashboard Plan 10.15%/Actual 10.48% vs the
customer's own Power BI Plan 11.42%/Actual 10.05%. Ranked hypothesis list (scope mismatch,
stale XER revision, data-date mismatch, weighting basis) took most of a day; the answer was
**AT11x was configured on element weighting while Power BI computes on labour weighting** — the
same setting named in this pattern's table above, but here it changes the *headline progress
percentage itself*, not which categories appear in a filter panel. Resolution was identical in
kind to PLT-2941: a project-settings change (Pietro: "users change it from project settings"),
no code fix. Full arc in
`live-incident-board-tickets/PLT-3010-resolved-progress-tracking/context.md`.

**Refined recognition signature, now that there are two:** any "our number disagrees with a
comparison source" ticket should check progress weighting **before** checking which activities/
categories are in scope — cheaper than a scope diff, and this pattern now has two independent
occurrences (filter-list visibility, headline %) from the same one setting.

---

## Pattern 4 — Two surfaces disagree about a number (and the method that resolves it)

The most common report we get, and the one most often mis-triaged. PLT-2874 is the worked
example: the editor said ~628,000 linked elements, the dashboard said ~695,000, and it ran for
three weeks classified as a data problem before turning out to be a labelling one.

**The resolution turned out to be layered, and every layer has to be separated:**

| Layer | On PLT-2874 |
|---|---|
| Different **unit** | Dashboard counted geometry objects, editor counted elements. ~9%, the whole complaint. |
| Different **source artefact** | `svf2-object-id-map` vs `project-element-list`. 1,364 elements for the same model version. |
| Different **scope** | Editor drops elements with no loaded geometry; dashboard needs a dated activity in the current schedule. |

Only the first was fixable in the frontend. Reporting all three as one number is what made it
look unresolvable.

### The method

1. **Pin each number to a query before comparing anything.** If your query is off by even a
   little, you do not understand that surface yet and any diff built on it is worthless. Both
   PLT-2874 numbers were eventually reproduced exactly, which is what made the conclusion safe.
2. **Check the unit before the value.** `COUNT(*)` against `COUNT(DISTINCT <id>)` on each side.
   If they differ on one side, that side is counting a different unit and nothing else matters
   until it is fixed. This is a two-minute check and it was the whole answer here.
3. **Name the source artefact behind each surface.** Two artefacts generated by different
   pipeline steps will disagree, and that disagreement is not a bug in either consumer.
4. **Quantify each layer separately.** "9% unit, 0.2% artefact, the rest scope" is actionable.
   "3,119 out" is not.
5. **Stop when the residual is explained in kind, not to the unit.** Chasing the last 0.5%
   across 600,000 ids in two DuckDB instances that cannot join is hours of work with a known
   answer.

### The habit that made it fast

Every hypothesis was stated as a **prediction testable in one query**, then killed by the query.
Four died this way in an afternoon: the pigeonhole bound against geometry count, the PLT-2909
cross-write shape, the `HAVING SUM(delta) != 0` clause, and the arbitrary federated-model pick.
None survived, and none cost more than one round trip. Being wrong quickly and in public beats
being careful and slow — but only if the prediction is specific enough to fail.

The counter-habit to avoid: three separate reproduction procedures on PLT-2918 were stated
confidently from source reading alone, without a falsifiable prediction attached. All three
failed and cost days. See that ticket's log.

### Recognition signature

- Two surfaces both say "elements", "activities", "issues" and give different totals.
- The gap is a stable *percentage* rather than a fixed count, which points at a unit.
- One surface changes its answer when you click something, which points at a different query
  path (see Pattern 3).

---

## Pattern 5 — Surface-scoped visibility rule mistaken for missing data (2026-08-07, promoted from candidate)

**Confirmed on three occurrences now** (was a two-occurrence candidate as of the PLT-2945 run;
PLT-3024 is the third and first at *model* granularity rather than *element* granularity — same
shape, different gate). One surface applies a deliberate scoping/visibility rule that a comparison
surface doesn't, the customer diffs the two, and reports the discrepancy as data loss.

| Ticket | Project | Gate | Comparison surface with no gate |
|---|---|---|---|
| `dashboard-progress-tab-explained.md` §8.4 | (docs, pre-dates board) | Future-dated projects show blank/all-yellow by default | — (documented product FAQ) |
| PLT-2945 | DUB7x | Dashboard hides elements whose planned start is later than the date-range slider's end (`dashboard-progress-service.ts:1909-1924`), fragment hidden via `dashboard-color-service.ts:488` | Editor/Web Viewer has no equivalent hide anywhere in the codebase (exhaustive `setVisibility(` grep — two call sites total, both Dashboard/Canvas) |
| PLT-3024 | ML9 | **Model-level, not element-level:** the Dashboard loads exactly one model — the first model in the first folder whose name contains "federated" (`dashboard-project-service.ts:143-205`) — and builds `element_base_data` from that one model's `svf2_object_id_map` only (`dashboard-progress-service.ts:2548-2559`); everything outside it is absent, not merely uncoloured | Web Viewer loads whatever the user has activated, which is typically a much larger set (`viewer-y.tsx:290-294`) |

### Mechanism

The Dashboard is deliberately narrower than the Editor/Web Viewer on more than one axis — by time
(date-range slider), and by model membership (federated-folder-only). Both narrowings are correct,
specified behaviour, not bugs. But neither narrowing surfaces on screen: there is no "N elements
hidden by date filter" or "this model isn't in your federation" indicator anywhere in the Dashboard
UI. The silence is what generates the ticket, not the gate itself.

### Recognition signature

*"Visible in the Editor/Web Viewer but not the Dashboard, with no numeric discrepancy on the
overlapping elements that ARE shown."* Before investigating as a defect, check in order:
1. The date-range slider (Pattern 5 / PLT-2945) — does the missing thing have a future planned
   start relative to the slider's end?
2. Federated-model membership (Pattern 5 / PLT-3024) — is the missing model actually inside the
   folder named "federated" in the Editor's model tree? The Dashboard cannot show a model that
   isn't.
3. Progress-weighting / zero-activity filters (Pattern 3) if the missing thing is a discipline or
   package rather than a model or element.

**Product observation, both occurrences:** the fix that would prevent recurrence is a UI indicator
("N elements/models hidden by current filters"), not a code change to the gates themselves, which
are working as specified. Worth a standing low-priority UX ticket independent of any single
incident.

---

## Candidate patterns (one occurrence, watch for a second)

- **Viewable-name fallback vs on-device client** (PLT-2923). A model renders on the headset but
  not in the browser. The web viewer picks its viewable by name from a fallback chain, `Navis` then
  `XYZ` then `EXPORT TO HOLOSITE` then `{3D}`, and renders nothing at all, with no error, if none
  matches (`viewer-service.ts:1052-1065`, `:945-946`). Promote to a pattern if a second IFC-sourced
  model does the same.
- **Same word, different unit** (PLT-2874, and LVN1/Freshdesk 7514 pending confirmation). Two
  surfaces both say "elements" and count different things. The editor counts distinct
  `modelElementId` (`ModelDetailsPanel.tsx:222`); the dashboard counts `objectId`s, because
  `coloredDbIds` is built for painting geometry and then reused as a statistic
  (`dashboard-color-service.ts:679-698`). A federated file holds more objects than elements — on
  FAR01, 9.24% more — so the two can never agree. **Diagnostic:** before diffing two counts, run
  `COUNT(*)` against `COUNT(DISTINCT <id>)` on each side. If they differ on one side, that side
  is counting a different unit and the comparison is meaningless until it is fixed. Promote to a
  pattern if a second surface pair does the same.
- **Source-data elevation errors presented as viewer bugs** (PLT-2649). 360 pins placed wrongly
  because one level's elevation was wrong in the source model; the transform was provably correct
  and the same fault reproduced in PowerBI.
  - *Amended 2026-08-14 (still one occurrence, not promoted).* **Recognition signature:** one pin
    type wrong while another pin type on the same model is right, plus the same fault in PowerBI.
    Quality issue coordinates are recorded per issue; 360 capture coordinates are derived upstream
    from the hosting room's level. So "Quality fine, 360 wrong" points at the model, never at the
    viewer, and no FE change can correct it (the FE reads `zMeters` verbatim and never applies an
    elevation). **Second half of the pattern, new this run:** the wrong level was not a lone bad
    value but one member of a whole family of misaligned linked files. In PA12, ~15 source files
    and ~44 levels sit in a 45-73 m band while their same-named twins sit at datum; only the one
    level hosting 360 capture points produced a visible symptom. **So when this shape appears, ask
    how many other levels share the offset before accepting a one-value fix** — the rest are latent
    until someone takes a capture there. Diagnostic that works: use a correctly-placed pin type as
    the valid vertical envelope and classify the other type against it
    (`live-incident-board-tickets/PLT-2649-groupA-360-captures/analysis/detect_stale_360.py`).
- **Name-based fallback join across an id-keyed hierarchy, 2026-08-12** (PLT-3040, CH08-Minooka).
  Two Package categories sharing a display name under different disciplines is a supported, tested
  shape (PLT-2821 keyed selection by `activityCategoryId` precisely because names repeat), but the
  progress panel's parquet-to-category join still falls back from id to bare `CategoryName` when no
  id match is found (`use-progress-panel-data.tsx:253-259`), unscoped by discipline. A package with
  nothing mapped has no parquet row (`progress-queries-v2-api.ts:577`, zero-weight rows dropped at
  `:601-606`), so instead of disappearing it matches on name and renders wearing a same-named
  sibling's numbers — a Pattern 2 counterexample (the FE synthesises a row here, it does not just
  render one). A structurally identical, independent leak exists in the filter panel via a flat
  discipline-agnostic `mappedPackages` name set (`dashboard-filter-utils.ts:57,86`). Both are the
  unfinished half of PLT-2821, which fixed selection but not the data joins. **Recognition
  signature:** a duplicated-looking name across two parent categories, where the report specifically
  says one branch has "nothing mapped" yet still shows numbers — check for an id→name fallback in
  the join before assuming the duplicate itself is the defect. Single occurrence — promote if a
  second project reports the same "phantom sibling shows real numbers" shape. Full findings:
  `live-incident-board-tickets/PLT-3040-groupA-progress-tracking/context.md`.
- **Dashboard element-sync capped at the progress artefact's `calculatedOn`, editor's sync isn't,
  2026-08-13** (PLT-2874, reopened — Staging-only, unconfirmed, leading hypothesis not yet tested
  against the environment). After the "same word, different unit" fix above shipped, QA (Gennaro)
  found Prod now matches the editor (~604k vs 604k) but Staging shows the dashboard **52,458 below**
  the same editor figure — undercounting, the opposite direction from the original defect. Candidate
  mechanism: `dashboard-progress-service.ts:672,829-858` caps the dashboard's element/link delta-sync
  at `this._v2Loader.getCalculatedOn()` ("coloring never runs ahead of the figures"), while the
  editor's equivalent sync (`linking-service.ts:101-104`) has no such cap — so elements linked after
  the last progress calculation are invisible to the dashboard and visible to the editor. On an
  environment whose progress-artefact refresh lags (plausible on a QA/Staging build that isn't
  recalculated daily like Prod), this alone would produce exactly this signature with **no code
  difference between environments**, only data freshness — which is why the same editor number can
  pair with two different dashboard numbers. Two sibling hypotheses not yet excluded: a
  version-mismatched `svf2-object-id-map` artefact silently falling back to an older translation
  (`artefact-loader.ts:238-241`), and a progress-derived `dateRangeStart` landing later on a slower
  Staging load (`dashboard-progress-service.ts:254-300`). **Recognition signature:** a "totals now
  differ between environments" report where the *editor's* figure is identical between environments
  and only the *dashboard's* figure moves — that asymmetry points at the dashboard's own sync/cache
  layer, not at the underlying data. **Diagnostic, no code change:** read the environment's console
  for the `calculatedOn` timestamp and the artefact-selection log line, then run
  `COUNT(DISTINCT modelElementId)` at each of `_visible_elements` / `element_base_data` /
  `activity_links` to localise which layer drops the count. Single occurrence, unconfirmed — promote
  only once one of the three hypotheses is actually verified against Staging, and note here which
  one it was. Full findings: `live-incident-board-tickets/PLT-2874-groupA-viewer-and-model/context.md`
  §"Reopened 2026-08-13".

### 2026-08-14 additions to the candidate list

- **Amendment to the PLT-2874 `calculatedOn`-cap candidate above (does not retract it).** Re-reading
  the code this run narrowed the mechanism materially, so the entry above **overstates what the cap
  does** and should not be quoted verbatim. Two verified constraints: (i) `endSyncDateTime` bounds a
  **delta** whose *start* is the activity-links parquet's own watermark
  (`artefact-loader.ts:579,601,624-625`) — it can never remove rows already in the parquet, so its
  magnitude ceiling is only the links created after that snapshot; and (ii) the delta is skipped
  outright when the parquet watermark is under five minutes old (`artefact-loader.ts:604-612`), which
  nullifies the cap entirely on a freshly-published artefact. If the links parquet and the progress
  calc ship together, "capped sync" collapses into the plainer "Staging's parquet is stale".
  **The three-query ladder gains a decision table**, because `element_base_data` is built
  `FROM svf2_object_id_map` with a **LEFT** JOIN onto links (`dashboard-progress-service.ts:2547-2560`)
  and so does not move when links are missing: links-short ⇒ `activity_links` short only;
  wrong-map-version ⇒ `element_base_data` short; date-window ⇒ only `_visible_elements` short.
  Calibration trap worth carrying: a *healthy* `element_base_data` reads slightly **above** the
  editor's number (1,364 higher on FAR01), not equal to it. **New cheaper rung, no console needed:**
  the date slider is seeded entirely from the progress-derived data range and re-seeded on every
  emission (`date-range.tsx:133-162`, fed by `dashboard-progress-service.ts:254-300`, emitted from
  both `:771` and `:876`), so *comparing the slider's start/end dates between the two environments*
  tests the date-window hypothesis from a screenshot. Still a single unconfirmed occurrence; still
  not promotable. Details: `live-incident-board-tickets/PLT-2874-groupA-viewer-and-model/context.md`
  § 2026-08-14.

- **Hardcoded display whitelist between a rich upstream source and the panel, 2026-08-14**
  (PLT-3051, LVN BL1-2 — unconfirmed against the project, mechanism verified in code). Revit element
  metadata reported as missing in the Web Viewer while present in Revit. The Forge property database
  *is* loaded on the Editor (`viewer-service.ts:948-953` — only the Dashboard passes
  `skipPropertyDb: true`, `use-model-loader.tsx:239-244`), but the panel filters properties down to
  five hardcoded parameter groups — `['Constraints','Identity Data','Phasing','Dimensions','Other']`
  (`element-properties-service.ts:7`) — applied **twice**, once as Forge's `categoryFilter` (`:171-173`)
  and again as a receive-side discard (`:200`). Anything in another group is dropped with no log and
  no UI hint, and all five sections render regardless of content (`:216-233`), so the failure appears
  as five empty accordions rather than as an error. **Recognition signature:** "the source system has
  this data and our viewer doesn't", where the panel shows correctly-named but empty containers — look
  for a hardcoded allow-list before assuming the upstream fetch failed. Sibling shape to Pattern 5
  (a deliberate narrowing that is invisible on screen), but the narrowing here is a *display*
  whitelist rather than a scope gate, and unlike Pattern 5's gates this one does not look like
  specified behaviour. Promote if a second panel is found dropping upstream data against a hardcoded
  name list. Full findings, plus the four sibling hypotheses not yet excluded (wrong surface,
  Navisworks category renaming, multi-select empty-by-design, unguarded `getInstanceTree()` blanking
  the panel): `live-incident-board-tickets/PLT-3051-groupA-viewer-and-model/context.md`.
