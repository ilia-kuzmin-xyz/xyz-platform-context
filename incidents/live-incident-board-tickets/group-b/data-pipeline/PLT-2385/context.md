# PLT-2385 — "HITT - DC10 Activities are retaining links to both PC and QA Models" — triage context

> **Group B ticket** — already **Ready For Development** / has in-thread dev
> context. This file **captures** that context for the dev record; it does **not**
> re-triage from scratch.

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2385
- **Issue type:** Live Incident ("To track live incidents on site.") · Software / Web Viewer
- **Status:** **Ready For Development** (statusCategory `To Do` / blue-gray)
- **Priority:** **Critical**
- **Project (site):** HITT — DC10 -V2x
- **Reporter & Assignee:** **Masum Ahmed** — support/Freshdesk agent. ⚠️ **Off dev roster** (not one of the named dev/PO/QA contributors). A support agent holding an assignment on a Ready-For-Dev ticket usually means no engineer currently owns the code work here — see recommended-action.
- **Created:** 2026-01-28 · **Last updated:** 2026-05-06
- **Components / Labels:** none
- **Domain slug chosen:** `data-pipeline` (deviates-toward from the alternative `progress-tracking` — justified at the bottom)
- **Linked follow-up tickets (created from this thread):**
  - **PLT-2650** — feature work to handle links on model deletion (created by Rishi Bhugobaun, 2026-05-06)
  - **UX-1109** — design for the "delete model with shared linked elements" warning modal (Jason Fingland)

---

## One-line symptom

On HITT **DC10-V2x**, one schedule activity is linked to **59** model elements, but
only **48** belong to the current PC (progress) model; the other **11** resolve only
via the **QA model** (they share the same Revit unique IDs). The PowerBI export
**counts all 59**, inflating the element count → inflates **XYZ % Complete** →
inflates **XYZ Hours Complete**. The client was told repeated-unique-ID QA elements
would be *ignored* by the export; they are not. Data accuracy is business-critical
(client is accepting XYZ data as 100% accurate for HITT/subcontractor reporting).

---

## Description (tight)

Reviewing variances, the client found many activities linked to **both** QA and PC
models because element unique IDs match between the two models. XYZ install progress
is only updated for PC models, not QA — so the persisted QA links do not carry real
progress but *are* counted, skewing the % and the derived hours. Three screenshots in
the description show the 48-vs-59 selection counts and the PowerBI export counting the
elements.

---

## Key comments (chronological, author + date)

1. **Pietro Desiato (PO) — 2026-01-28:** asks Rishi to prioritise the investigation.
2. **David Webb — 2026-01-28:** *"If they don't want to track progress of those
   elements, why are they linked? QA vs PC is not really relevant, the element is
   either installed or not installed."* (⚠️ **David Webb is not on the provided
   roster**; from his comments he owns the BE/data-pipeline / dagster side.)
3. **Mostafa Kamel Hussien (PO) — 2026-01-28:** client claims these elements are
   **not in the PC model** and don't know how they got linked.
4. **Rishi Bhugobaun (senior fullstack) — 2026-01-28 — the diagnosis:**
   - 59 unique elements linked to the activity; QA shows 59, PC shows 48 → **11
     missing** from PC. Lists the 11 missing Revit unique IDs verbatim
     (`4e1e1efa-11d8-48c6-95fe-5a8e1a439afc-00d213e6 …`).
   - Those 11 IDs are **not in the exported Navis view** of the `.RVT`, so they are
     not expected to appear in the viewer.
   - **Root cause:** *"If these elements were present in a previous model version, and
     had been linked, the link will have persisted as **links are not yet removed when
     a model or its elements are** [removed]."*
   - **Interim solution:** *"unlink these elements from the QA model where they are
     visible."* (i.e. a **manual data fix**, not a code change.)
5. **Rishi → Masum — 2026-01-28:** is this the only project affected?
   **Masum:** only 1 so far. **Mostafa:** heard it's on **lon1x2** too, but *no ticket*
   (cohort is under-quantified — see gap).
6. **Pietro — 2026-02-16:** reframes toward a **requirement**: when deleting a model
   whose elements are also linked in *other* models, **notify the user** (name the
   other models) and let them confirm whether to break the links — breaking silently
   could be wrong (e.g. the other model is another PC model).
7. **Ilia Kuzmin — 2026-02-18 → 2026-04-27:** chases status; proposes (with Pietro) a
   **warning modal on model deletion with shared linked elements**; asks Jason for a
   **UX ticket**.
8. **David Webb — 2026-04-15 — current V2 behaviour:** *"Based on the screenshots,
   what they are seeing is expected behavior in V2. When a model is deleted, after a
   couple of minutes **dagster will regenerate project-element-list.parquet**. Any
   links to elements no longer in that list are removed. **QA/PC is not considered
   specifically.**"*
9. **Pietro — 2026-04-15:** the user *need* is to **choose** at delete time whether
   links/status are preserved (because present in another/QA model); otherwise they
   won't know the deleted elements are still linked and counted.
10. **Jason Fingland (designer) — 2026-04-22:** created **UX-1109**; **2026-04-28:**
    designs added, validated with a few users.
11. **Rishi — 2026-05-06:** created **PLT-2650** to handle the feature work.

---

## Attachments (⚠️ media)

Six PNG screenshots. All are referenced in the ADF as `blob:` media URLs, **not
machine-readable in this triage environment**:

| Attachment | Author / date | Shows |
|---|---|---|
| image-20260128-090636.png (id 51022) | Masum, 2026-01-28 | selection counts (per description) |
| image-20260128-090645.png (id 51023) | Masum, 2026-01-28 | 48-vs-59 element counts |
| image-20260128-090654.png (id 51021) | Masum, 2026-01-28 | **PowerBI export counting the elements** |
| image-20260128-114145.png (id 51092) | Rishi, 2026-01-28 | QA model — 59 linked elements |
| image-20260128-114307.png (id 51093) | Rishi, 2026-01-28 | PC model — 48 linked elements |

⚠️ **NEEDS HUMAN:** visual confirmation of the **PowerBI-export screenshot**
(id 51021) — it is the decisive evidence that the export *counts* (not ignores) the
QA-side elements. **Mitigant:** the load-bearing numbers are already transcribed in
text — Rishi's comment states 59 (QA) vs 48 (PC) and lists the 11 missing Revit IDs
verbatim, so the diagnosis does **not** hinge solely on the unreadable images. The
PowerBI-count image is the one artifact not otherwise captured in text.

---

## Mechanism / root cause (code-verified where possible)

**The links are keyed on element ID only — there is no model-type ("QA" vs "PC")
concept anywhere in the frontend, and no cross-model de-duplication when counting.**

1. **Links are element↔activity, not model↔activity.**
   `LinkingService.loadLinks()` streams the DuckDB `activity_links` table into memory
   as `{ modelElementId, activityId }` pairs —
   `hc-frontend/.../ViewerPage/services/linking/linking-service.ts:106-118`. The link
   carries **no model reference**; a link is to a `modelElementId`.
2. **Link accessors return the raw ID set — no de-dup, no model filter.**
   `getElementIdsForActivity()` returns `activityToElements.get(activityId)` as-is —
   `linking-service.ts:753-755`; `getElementsForActivity()` maps IDs through the
   project registry and `.filter(Boolean)` — `:757-761`. Nothing distinguishes which
   *model* an element belongs to.
3. **One `modelElementId` can belong to multiple models — this is a known, handled
   concept.** `shared-asset-impact.ts:70-95` self-joins `project_element_list` on
   `modelElementId` where `modelId` differs (and `:109-118` uses
   `HAVING COUNT(DISTINCT modelId) > 1`) to find elements shared across models. This is
   exactly the QA↔PC "same unique ID in both models" situation — and it is the query
   that powers the **shared-asset warning** (the PLT-2650 / UX-1109 feature).
4. **No QA/PC model-type field exists in the FE.** `grep -i` for `modelType` finds only
   Revit/Navisworks *format* detection
   (`dashboard-progress/dashboard-model-mapping-service.ts:28`) and test-data scaffolding
   — never a QA/PC/progress classification. So the FE **cannot** "ignore QA-model
   elements"; it has no way to tell them apart.
5. **The count the client sees comes from the backend pipeline, not the FE.** Progress
   weighting uses `TotalLinkedElements` from the `category_groups` parquet
   (`dashboard/progress-tab.md` § Progress weighting); the PowerBI export is a separate
   backend export. Both count whatever links exist in the link data. The FE faithfully
   reflects the count; it does not compute or de-dup it.
6. **Why the stale links survive V2's cleanup.** Per David Webb (2026-04-15), V2 prunes
   links only when a **model is deleted** — dagster regenerates
   `project-element-list.parquet` and drops links to `modelElementId`s no longer in that
   list, **without** considering QA/PC. In this incident the QA model was **not
   deleted**, and the 11 elements' IDs **still exist** in `project_element_list` via the
   QA model, so the links are neither orphaned nor pruned — they persist and are
   counted. (Rishi: the elements came from a **previous model version**; links persist
   because links are not removed when a model/its elements are removed.)

**Net root cause:** activity↔element links persist for elements that left the PC model
(via re-versioning) but still exist in the co-loaded QA model under the **same Revit
unique ID**. Nothing in the link model, the FE, or the backend export distinguishes QA
from PC, so those stale links are counted into % complete / hours. The only lifecycle
prune that exists (dagster on model-**delete**) does not fire for this shared-ID /
re-version case.

**Where the fix belongs:** **NOT the frontend.** Two tracks:
- **Backend / data-pipeline (primary):** link lifecycle — prune stale
  activity↔element links when an element leaves a model version even if the model is
  not deleted; and/or make export/count logic aware of which model an element's
  progress is tracked in. This is the `project-element-list.parquet` / `activity_links`
  regeneration territory (dagster, BE).
- **Product feature (secondary, already spun off):** the **delete-time warning modal**
  for shared linked elements — **PLT-2650** (code) + **UX-1109** (design). Note this
  addresses the model-**deletion** case, which is a *different* trigger from this
  incident (shared IDs across two live models + prior-version orphans); it would not by
  itself have prevented DC10.

The FE piece that *does* exist and is relevant is `shared-asset-impact.ts` — the query
backing the warning modal (how many other models share these element IDs).

---

## Doc references

- `dashboard/data-pipeline.md` — Pipeline B: `project-element-list` artefact
  (`modelElementId → sourceFileElementId`); delta-sync of link/status into DuckDB. Does
  **not** document QA-vs-PC linking or the shared-ID pitfall (gap — see below).
- `dashboard/progress-tab.md` § Progress weighting — `TotalLinkedElements` weight and
  `SUM(weight × delta)/SUM(weight)` formula; confirms element count is a backend parquet
  input, not an FE computation.
- `dashboard/viewer-and-model.md` — three-ID mapping chain
  (`modelElementId → sourceFileElementId → Forge dbId`) and element colouring; confirms
  no QA/PC model-type dimension in the mapping.
- **Not documented anywhere:** the QA-vs-PC shared-unique-ID link-persistence pitfall.
  Worth adding to `dashboard/pitfalls.md` once the fix lands (do **not** edit here —
  outside PLT-2385 folder).

---

## hc-frontend file:line references

| Path | What it does |
|---|---|
| `src/main/webapp/app/pages/organisation/ViewerPage/services/linking/linking-service.ts:106-118` | Streams `activity_links` (DuckDB) into memory as `{modelElementId, activityId}` — links carry **no model reference** |
| `…/linking/linking-service.ts:753-761` | `getElementIdsForActivity` / `getElementsForActivity` — return raw element-ID sets, **no model-type filter, no de-dup** |
| `…/linking/linking-service.ts:763-777` | `getActivitiesForElement` / `getActivityIdsForElement` — reverse map, element→activities |
| `…/ViewerPage/services/shared-asset-impact/shared-asset-impact.ts:70-95, 109-118` | Detects a `modelElementId` present in **multiple models** (self-join on `project_element_list`) — the QA↔PC shared-ID case; powers the warning-modal feature |
| `…/dashboard-progress/dashboard-model-mapping-service.ts:28-29` | Only `modelType` in the FE = Revit/Navisworks **format**, not QA/PC |

---

## Confidence

**6 / 10.** The mechanism and root cause are well-established: diagnosed in-thread by
the senior fullstack (Rishi) and the BE/data owner (David Webb), and independently
corroborated in code (links keyed on `modelElementId` with no model-type field; shared
IDs across models are a known, handled concept; the only prune fires on model-delete).
Held below 7 because: (a) the actual fix is **backend/data-pipeline + a product-UX
decision**, not something implementable or fully testable from this FE repo; (b) the
fix scope was debated for ~3 months (Jan→May) and split into PLT-2650/UX-1109 whose
delete-time-warning approach does **not** obviously cover this incident's shared-ID /
re-version trigger; (c) the decisive PowerBI-export screenshot is unreadable here
(mitigated by transcribed numbers); (d) cohort is under-quantified (lon1x2 mentioned,
no ticket).
