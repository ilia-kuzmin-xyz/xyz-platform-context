# PLT-2918 — "HITT - AUS01 WBS Location Mapping Removed automatically on web viewer" — triage context

> **Update 2026-07-23.** The mechanism analysis below was posted to the ticket 07-22 and Ilia then
> independently confirmed it against live data: WBS Location mappings are genuinely **deleted** (not
> hidden) for 19/21 Precast, 37/40 Roof, 52/196 Earthworks, 34/410 Painting + some Partitions/L1
> commissioning on AUS01; Discipline/Package/Phase are intact everywhere. Working theory: a July-12
> re-upload surfaced ~2,119 unmapped activities, then a mapping-panel session to fix them triggered
> the destructive per-type Save (§Mechanism B). **Yash has asked directly what to do next — see the
> `recommended-action.md` Update 2026-07-23 for the drafted reply, the two-ticket split (BE recovery /
> FE prevention fix), and the fileable fix (file:line) for the FE Save merge bug.**

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2918
- **Issue type:** Live Incident · Software Area: **Web Viewer**
- **Status:** **Open** (status when this context.md was first written — see update above for what's changed since)
- **Priority:** Major
- **Project (site):** **HITT — AUS01**
- **Reporter (Jira):** Yash Patel (support/coordinator) · **Assignee:** Ilia Kuzmin
- **End user:** Paddy Dennison (client-side, doing the AUS01 report)
- **Created:** 2026-07-21 · **Freshdesk:** #7461, status "Waiting on 3rd line" (i.e. back on us)
- **Attachments:** 4 image attachments (screenshots) — **all unreadable** here (Atlassian binary media behind auth). See NEEDS HUMAN. Do not guess contents.
- **Domain slug chosen:** `progress-tracking` (deviates from the obvious "web viewer" area — justified in §Domain slug)
- **Confirmed sample activity:** **`A4300`** — export (last week) shows WBS Location = **AREA G/H**; web viewer now shows **no mapping**.
- **Affected package:** **Precast** (client says the whole package's WBS Locations were removed / "changed into sequences").

---

## One-line symptom

On **AUS01**, every activity in the **Precast** package that had a **WBS Location** classification (e.g. `A4300` = "AREA G/H") now shows **no WBS Location** in the web viewer, whereas last week's export shows them fully mapped. The client also reports the values appear "changed into sequences" — a classification that "should only be for the steel frame." No manual change is acknowledged; this is reported as an automatic/silent regression.

**"WBS Location" here is not a viewer geometry concept — it is one of the project's activity *category types*** (the same family as Phase / Discipline / Package / Sequence). This is the activity→category classification layer, not the 3D model. Confirmed in code below.

---

## Playbook questions applied

**1. What exactly is observed — can we observe it right now?**
We have one concrete, currently-broken instance from Yash's own check: activity **`A4300`**, WBS Location **AREA G/H** in last week's export, **empty** in the web viewer now. That is a live-broken sample (playbook's most valuable artifact), *not* a self-healed one — good. What we cannot yet see ourselves: whether the mappings are **deleted** (rows gone) or **overwritten/re-pointed** (e.g. re-classified to a "Sequence" category). The client's two phrasings — "removed" and "changed into sequences" — describe two different failure modes; we must not assume which. Needs the DB/data check in NEEDS HUMAN.

**2. What did we expect — on whose authority?**
Reference = **last week's export** ("all packages 100% mapped with phase, discipline and package"). This is a **dated artifact the client still holds** — stronger than folklore, but per the playbook "it worked last week" is a **claim to verify**, not a fact: we have not seen the export ourselves (it is one of the 4 unreadable attachments) and we have not confirmed the export was pulled from the same environment/schedule version now in the viewer. The export is the diff anchor once we can read it.

**3. Smallest broken-vs-working pair.**
Two axes are available and both should be diffed:
- **Within AUS01, same day:** Precast activities (broken — WBS Location gone) vs steel-frame / other-package activities (client implies still mapped, "sequences should only be for steel frame"). If other packages are intact, the cause is scoped to the Precast branch — pointing at a per-subtree cascade/edit, not a global load failure.
- **Across time, same activity:** `A4300` in the export (AREA G/H) vs `A4300` in the viewer now (empty). This is the row-level diff that tells us delete-vs-overwrite.

**4. What decides the behavior? (mechanism)** — see §Mechanism. In short: WBS Location is an activity **category mapping** persisted via Activity API v2; the schedule data-mapping panel's **Save is a destructive diff** that *deletes* any category type left null on the in-memory activity, across **all** category types (not just the one edited), and category edits **cascade to every descendant** and **clear descendant category types**.

**5. Why now? (trigger)** — **Not established.** No deploy, re-upload, or manual action is named on the ticket. The leading candidates to ask about (playbook Q5, must be dated and owned): (a) a **schedule re-upload/re-import on AUS01** in the last week; (b) someone **editing the data-mapping panel** for the steel-frame "sequences" whose change cascaded into Precast; (c) a **deploy** touching category hydration. See recommended-action for the exact closed question.

**6. Who else? (cohort)** — At minimum, **every Precast activity on AUS01** that previously had a WBS Location (`A4300` is one sample). If the cause is the cross-type destructive save, the blast radius is **every category type on every activity touched in the same Save/cascade** — potentially phase/discipline/package on the same activities too, not just WBS Location. Not yet enumerated; enumerate once mechanism is confirmed.

---

## Mechanism (code-verified) — how WBS Location is assigned, and how it can silently disappear

All paths in `hc-frontend/src/main/webapp/app/`. The classification is **activity ↔ category mappings** (Activity API v2), *not* a parsed WBS string.

### A. What "WBS Location / Phase / Discipline / Package / Sequence" actually are
They are **category types** ("project-level attributes"), each with categories, mapped to activities:
- `pages/organisation/ViewerPage/services/categories/category-mapping-service.ts:22-24` — doc comment: *"Category Type — the logical group … e.g. Discipline, Package, Phase … Category types are synonymous with project level 'attributes'."* Dynamic types beyond the hardcoded three exist — **"WBS Location" and "Sequence" are exactly such dynamic types**, confirmed by the loader comment at `components/services/dashboard-schedule/loaders/api-categories-loader.ts:224-226` (*"WBS Location values going into Sub-Test category column"*).
- Mappings are loaded from the API and indexed by activity: `category-mapping-service.ts:143-175` (`loadMappings`, `_mappings: activityId → Set<mapping>`).
- On schedule build, each activity's in-memory `activityItem` is **hydrated** with `category-{categoryTypeId}` fields from those mappings: `components/scheduler-service/utils.ts:41` (`getCategoryMapForActivity(item.itemId)`) and `:67-68` (writes `activityItem[getCategoryFieldKey(categoryTypeId)] = activityCategoryId`). Source of the map: `category-mapping-service.ts:655-661`.

### B. Save is a destructive per-type diff — the primary data-loss vector
`CategoryMappingService.saveDataMapping()` — `category-mapping-service.ts:237-292`:
- It iterates **`changedActivityIds`** and, for **every category type** returned by `getCategoryTypes()` (i.e. *all* types, including ones the user never touched), reads the in-memory value `getCategoryId(activityItem, categoryTypeId)` (`:258`).
- If that value is present → it's an **update** (`:259-264`). **If it is null → it collects the existing persisted mapping(s) of that type into `deletes`** (`:265-271`) and issues `deleteMappings` (`:285-287`).
- **Consequence:** the in-memory `activityItem` is treated as the *complete source of truth*. If WBS Location is missing from `activityItem` for a changed activity — for *any* reason — Save **deletes the persisted WBS Location mapping**, even though the user only edited some other column. There is no merge, and no "only delete types the user edited" guard.

### C. Edits cascade to all descendants and clear descendant category types
Two amplifiers make a single edit wipe a whole package subtree:
- **Descendant-type clearing:** `computeCategoryMapUpdates()` (`category-mapping-service.ts:618-653`) — when a category selection changes it (2) auto-sets ancestors and **(3) clears all descendant category types** (`:643-650`, `updates[descendantTypeId] = null`). If the type hierarchy places WBS Location (or Sequence) **below** the edited type, editing the parent **nulls the WBS Location on the activity in memory** → then §B deletes it on Save. This is the most direct route to the client's "changed into sequences / removed" description if the Precast branch's type hierarchy differs from steel frame's.
- **Propagation to every descendant activity:** the dropdown save calls `mappingService.updateGanttData` → `activeSchedule.updateActivityMapping` → `_updateRecursively` (`components/project-x/entities/schedule-entity.ts:935-972`, esp. `:967-971`) which applies the change to the activity **and every child in the activity tree**, adding each to `_localChangedIds` (`mapping-service.ts:498-501`). A single edit at a Precast WBS/parent node therefore marks the **entire Precast subtree** as changed, so §B's destructive diff runs against every Precast activity at once. This matches "the whole package had all been removed."
- Save wiring: dropdown → `data-mapping-dropdown.tsx:85-105`; "Done" → `blocks/progress-bar/progress-bar.tsx:71` → `mapping-service.ts:1016-1047` → `categoryMappingService.saveDataMapping(...)`.

### D. Secondary vector — hydration keyed on itemId vs mappings keyed on activityId
Hydration (§A) calls `getCategoryMapForActivity(item.itemId)` — the internal **itemId** — while mappings are stored under **`mapping.activityId`** (`category-mapping-service.ts:156-161`). The loader itself flags this ID ambiguity, testing whether `mapping.activityId` is a Postgres UUID vs a P6-style code (`api-categories-loader.ts:104-111`). If the two ID spaces diverge for some activities (e.g. after a re-import that re-keys tasks), hydration returns `{}`, the `activityItem` has **no** category fields, and any subsequent Save (§B) deletes all their mappings. This is a plausible route if a re-upload occurred (trigger candidate a), but on its own it would tend to affect *all* activities, not just Precast — so it is secondary to the cascade in §C given the Precast-only scope.

### "WBS" the parser concept is unrelated
`schedule-upload-service/schedule-parser/schedule-parser.ts:200-322` parses the P6 **WBS hierarchy** (`PROJWBS`, `wbs_short_name`) into the activity tree and sets `wbsCode: null` on every activity at import (`:338`). This is the *structural* WBS (parent/child grouping), **not** the "WBS Location" category the ticket is about. Do not conflate them: re-import rebuilds the tree and carries **no** category values (`mapToActivity` sets discipline/phase/wbsCode all null, `:327-345`), which is exactly why a re-import is a credible trigger for category loss.

---

## Bug vs data vs by-design

**There is a genuine frontend data-loss bug vector here, independent of the trigger:** a Save that only edited one column can **delete persisted mappings of every other category type** whenever those types are null in memory (§B), and edits cascade destructively across a whole package subtree (§C). Even if the immediate trigger turns out to be a re-upload (a data/pipeline event), the FE's destructive non-merging diff is what converts "in-memory value missing" into "persisted mapping deleted." That is worth its own fix regardless.

**What is *not* yet established:** which vector fired for AUS01/Precast, and whether the values were *deleted* vs *re-pointed to Sequence*. That is data/repro-dependent (see NEEDS HUMAN). So this is **not** confidently a pure "data artifact / working-as-intended" like PLT-2815, nor confidently a single FE line — it is a real destructive-save vector whose exact instantiation needs one data diff to confirm.

---

## Domain slug — why `progress-tracking`, not the "web viewer" area or `data-pipeline`

The Jira "Software Area" is Web Viewer, but that names the *surface*, not the domain of the fix. The mechanism is the **activity → category (WBS Location / Phase / Discipline / Package) classification** layer:
- The failing feature is the **schedule data-mapping panel** (`gantt-x/scheduler/scheduler-data-mapping*`) and `services/categories/*`, which produce the discipline/package/WBS breakdowns that **drive progress reporting** (`dashboard/progress-tab.md` documents the discipline/package breakdown; `dashboard/schedule-tab.md` documents the dynamic category columns; `activity_categories_flat` feeds PRG filters per `dashboard/data-pipeline.md:46`).
- This is the **same domain as PLT-2882** (activity↔category/link mapping on the ViewerPage), which was deliberately filed `progress-tracking` for the same reason — keeping the sibling consistent.
- **Not `data-pipeline`:** the parquet/artefact ingestion is downstream; the destructive mutation is in the FE mapping-save, not the pipeline. (`data-pipeline` would fit only if the confirmed trigger is a re-import re-keying activities — flag for re-file if so.)
- **Not `filter-system`:** the dashboard filter panel merely *consumes* category values; it is not where the loss happens.

**Caveat:** if the confirmed trigger is a schedule re-upload/re-import re-keying activities, a human may prefer to re-file under `data-pipeline`. Flagging so the board can move it.

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

- **WBS Location is an activity category mapping (not a parsed WBS string), and Save is a destructive per-type diff that deletes null types across all types, amplified by descendant cascade + descendant-type clearing:** **8/10** — read directly from source with file:line (`saveDataMapping:265-271`, `computeCategoryMapUpdates:643-650`, `_updateRecursively:967-971`, hydration `utils.ts:41,67-68`).
- **That this destructive-save-plus-cascade is the operative cause for AUS01/Precast specifically:** **5/10** — it fits the Precast-only scope, the "removed"/"changed into sequences" wording, and `A4300` being empty, but is **not confirmed against data** (no mapping-history query, no repro) and the **trigger is unknown**. Environment/data-dependent.
- **That it is a real bug (not working-as-intended / pure data artifact):** **7/10** — the non-merging destructive diff is a genuine defect vector regardless of trigger; whether it was the cause here is the 5/10 part.

**Overall triage confidence: ~5-6/10.** Clear mechanism and a real FE defect identified; the specific cause on AUS01 and the trigger need one data/history check + the trigger question answered.

---

## NEEDS HUMAN (media I cannot read / data I cannot query)

- ⚠️ **4 image attachments on the Jira ticket** — screenshots (per the description: last-week's export showing Precast WBS Locations, and the web-viewer view with them removed). **Binary media behind Atlassian auth — not viewable here. Do not guess contents.** They are the fastest way to confirm (i) whether the viewer shows the WBS Location column *empty* vs *populated with Sequence values* (delete vs re-point), and (ii) the exact set of affected Precast activities.
- ⚠️ **Data / history check (needs Activity API v2 or DB access on AUS01):** for `A4300` and a few other Precast activities, do the persisted category mappings for the WBS Location type **still exist** (and just not render) or were they **deleted**? If there is an audit/lastModified trail on `activity_category_mapping`, when and by whom were the WBS Location rows for Precast last changed? This is the delete-vs-overwrite + "who/when" diff.
- ⚠️ **Trigger (needs BE/ops + PM):** was the **AUS01 schedule re-uploaded/re-imported** between the export date and now? Was anyone **editing the data-mapping panel** for steel-frame "sequences" in that window? Any **deploy** touching category hydration/save? (playbook Q5 — dated cause, assign an owner.)
- ⚠️ **Verify the "it worked last week" reference:** confirm the export was pulled from the same project/environment/schedule version currently loaded in the viewer (not a different revision).

---

## Roster / ownership notes

- **Ilia Kuzmin** (assignee, ilia.kuzmin@xyzreality.com) — playbook "mechanism interrogator"; owns the code investigation and the one data-diff step.
- **Yash Patel** (reporter/coordinator) — owns client comms to Paddy Dennison (Freshdesk #7461); owns relaying the trigger question to the client/PM.
- If confirmed as a re-import re-keying activities → hop to **BE/data** for the mapping-integrity / re-import-merge behaviour. If confirmed as the destructive FE save → **Darminder Atker** (fullstack lead, owns the mapping panel) for the merge fix.

## Doc / knowledge-base refs
- `xyz-platform-context/dashboard/progress-tab.md` — discipline/package breakdown that the category mappings feed (why this is progress-tracking domain).
- `xyz-platform-context/dashboard/schedule-tab.md` — dynamic category columns (discipline/package/phase, "etc." = WBS Location/Sequence) in the Gantt data-mapping panel.
- `xyz-platform-context/dashboard/data-pipeline.md:46` — `activity_categories_flat` (Activity Categories API) feeds PRG filters; the flat table is rebuilt by `api-categories-loader.ts`.
- `incidents/live-incident-board-tickets/PLT-2882-groupA-progress-tracking/context.md` — sibling in the same activity↔category domain; slug precedent.
- `incidents/live-incident-playbook.md` — tone/pattern for the recommended reply (treat "worked last week" as a claim; get one live-broken sample; ask "why now" with an owner).
