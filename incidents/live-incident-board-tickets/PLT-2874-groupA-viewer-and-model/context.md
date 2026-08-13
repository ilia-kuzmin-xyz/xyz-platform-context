# PLT-2874 — "differences between fed file linked elements and dashboard elements number"

- **Domain slug:** viewer-and-model (justification in §6)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2874
- **Type:** Live Incident · **Priority:** Minor · **Status:** Open
- **Assignee:** Darminder Atker (fullstack lead)
- **Reporter (Jira):** Mostafa Kamel Hussien (product owner) — internal report, not a client ticket
- **Project / model:** **Far01** (federated file)
- **Created:** 2026-07-07 · **Comments:** none · **Attachments:** 2 PNG screenshots (see §7 Needs human)
- Triage date: 2026-07-13

---

## 1. What is observed — and can we observe it? (playbook Q1)

The two numbers **and** the project name are stated in the ticket text (verbatim from the
description), so the single most important fact is *not* trapped only in the screenshots:

> "On the federated file in the editor on **Far01**, you can see that there's around
> **628,000** linked elements. However, in the dashboard, it shows that there are **695
> thousand** linked elements when you take the scrubber to the end of the project."

- **Editor (federated file, Far01):** ~628,000 "linked elements"
- **Dashboard (scrubber/date-slider at end):** ~695,000 "linked elements"
- Gap: dashboard is **higher** by ~67,000 (~+10.7%).

Both figures are approximate ("around", "thousand"). The two attachments
(`image-20260707-142150.png` 3012×1000, `image-20260707-142256.png` 1177×690) are
almost certainly the side-by-side screenshots of each number, but they are binary/staging
media I **cannot view** — see §7. The core facts (project + both numbers + direction of the
gap) are in text, so triage is not blocked on the images; they would only *confirm exact
figures and which on-screen widget each number comes from*.

I could not observe Far01 myself (no runtime/env access). This is a code-and-docs diagnosis.

## 2. The two code paths — they are different counters (mechanism, playbook Q4)

The two numbers are produced by **two independent counters that measure different things over
different identity units, scopes, pipelines and filters.** They are not the same metric read
twice.

### 2a. Editor "linked elements" (~628k)
Displayed in the **Model Details panel** under the heading **"Elements linked to Latest
Program"**:
- `ViewerPage/components/viewer-x/components/blocks/model-details-panel/ModelDetailsPanel.tsx:381` heading; `:389` renders `Linked: {linkedCount.toLocaleString()}`.
- Source A (DuckDB): `ViewerPage/services/duckdb/duckdb-element-store.ts:330-379` `getElementCountsForModel(modelId)` →
  `linkedCount = COUNT(DISTINCT pel.modelElementId)` from `project_element_list pel INNER JOIN activity_links al ON pel.modelElementId = al.modelElementId WHERE pel.modelId = '<modelId>'` (`:360-363`).
- Source B (in-memory refinement, overrides A): `ModelDetailsPanel.tsx:202-224 updateFromLinks()` →
  `linkedCount = new Set(forModelActiveSchedule.map(l => l.modelElementId)).size` (`:222`), where links are filtered to this `modelId` **and to the active/latest schedule's activity IDs** (`:218-219`).
- **Identity unit:** distinct `modelElementId` (PostgreSQL UUID).
- **Scope:** a **single `modelId`**, restricted to the **active/latest program's** links only.

### 2b. Dashboard "elements" number (~695k, grows with the scrubber)
Displayed in the viewer overlay **`DashboardElementStats`** — note the label is literally
**"Elements → Total"**, *not* "linked elements":
- `ViewerPage/components/dashboard-panels/viewer/dashboard-element-stats.tsx:46` label "Elements"; `:49` renders `Total: {displayTotal}`; `:41` `displayTotal = stats.visible > 0 ? stats.visible : (elsCount ?? 0)`.
- `stats.visible` comes from `visibleElements$`, set in `dashboard-color-service.ts:662` and `:835` to `this.coloredDbIds.length`.
- `coloredDbIds = Array.from(elementsByStatus.values()).flat()` (`dashboard-color-service.ts:643`, `:824`) — a **flat, non-deduplicated array of Forge `dbId` integers**, one entry per coloured `(element → dbId)` mapping row (built in the loop at `:604-643`).
- The colouring pipeline is `element_status ⋈ project_element_list ⋈ svf2_object_id_map → status CASE → Forge dbId` (documented in `dashboard/viewer-and-model.md` §"Element colouring" and §"three-ID mapping chain"), with elements included only when **`displayDate <= sliderEndDate`** — which is exactly why the number **grows as the scrubber advances** and peaks at the end.
- **Identity unit:** Forge `dbId` (the output of the 3-ID mapping, *after* UUID→ExternalID→dbId).
- **Scope:** the **entire federated model** (all sub-models coloured), status-bearing elements only.

### 2c. The team already knows these two count families disagree
`ModelDetailsPanel.tsx:190-198` compares `viewerElementCount` (Forge dbId count) against
`dbTotalCount` (DuckDB row count) for the *same* model and **logs a warning when they differ**,
then prefers the Forge count for "Total". This is direct in-repo evidence that Forge-dbId counts
and DuckDB element-row counts routinely diverge and are not expected to be equal.

## 3. Are these two numbers supposed to match? (playbook Q2 — name the reference)

**Finding: No documented or code-level reference states that the editor "Linked" figure and the
dashboard "Elements/Total" figure must be equal.** "They should match" is an *assumption in the
ticket*, not a named spec. The two counters differ on at least five axes, every one of which can
move the numbers apart on its own:

1. **Identity unit** — distinct `modelElementId` (UUID) vs count of Forge `dbId`s. The 3-ID
   mapping is explicitly **not 1:1** (`viewer-and-model.md` §"three-ID mapping chain" notes the
   two mapping modes have different *match rates*). One source element commonly maps to **several
   Forge dbIds** (geometry split across fragments; or the same External ID present in multiple
   federated sub-models). Because `coloredDbIds` is **not deduplicated by source element**, this
   inflates the dashboard count. **This alone predicts dashboard > editor — the observed direction.**
2. **Scope** — editor counts one `modelId` for the *active* program; dashboard counts across the
   *whole federated* model.
3. **Source pipeline** — editor uses `activity_links` / the linking service; dashboard uses
   `element_status` + `svf2_object_id_map` (the colour pipeline). Different backend artefacts,
   potentially different freshness (see caching note in §5).
4. **Filter** — dashboard applies the `displayDate`/status CASE/slider; editor uses raw active-schedule links.
5. **Label** — "Linked to Latest Program" vs "Elements / Total". The ticket *interprets* the
   dashboard "Total" as "linked elements"; the UI does not call it that.

**So the ~11% gap is plausibly fully explained by design (chiefly axis 1: dbId expansion of a
non-deduplicated count), with no bug at all.** It could *alternatively* be a genuine defect —
e.g. `coloredDbIds` ought to be deduplicated, or the overlay's "Total" is being mis-read as a
"linked" count. **Code reading cannot decide between these two** without (a) the exact widgets +
figures from the screenshots and (b) running the two queries against Far01's data.

## 4. Smallest broken-vs-working pair (playbook Q3)

We have the project (Far01) and both numbers, but **not yet a working reference** to diff against.
The decisive diff a dev can run on Far01 in-browser (DuckDB console / dev panel, Ctrl+Shift+D):
- `A = COUNT(DISTINCT modelElementId)` over the elements the dashboard colours at slider-end
  (distinct source elements), vs
- `B = coloredDbIds.length` (the raw dbId count the "Total" shows).
- If `A ≈ 628k` and `B ≈ 695k`, the gap **is** the dbId-expansion / non-dedup effect → expected,
  not a bug (fix, if wanted, is to count distinct source elements in the overlay).
- If `A` is also ~695k, the divergence is upstream (scope/pipeline/link-set difference) and needs
  a different fix. **The diff is the diagnosis** — this is the one experiment that resolves it.

## 5. What the docs say (do they flag this as expected?)

- `dashboard/viewer-and-model.md` documents the 3-ID mapping chain and the colour pipeline but
  **does not** state whether the editor "Linked" and dashboard "Total" counters should agree — a
  doc gap. It does establish the mapping is not 1:1 (parquet vs runtime "match rate").
- `dashboard/pitfalls.md` "Wrong artefact in multi-model projects" shows the mapping can silently
  drop to *zero* matches if the wrong `svf2-object-id-map` is picked — i.e. mapping-count drift is
  a known failure class, though that pitfall would make the dashboard *lower*, not higher.
- `dashboard/caching.md`: `element_status` / `project-element-list` / `svf2-object-id-map` parquets
  are OPFS-cached and only re-downloaded when `artefactHash` changes. A **stale cached parquet** on
  one surface but not the other is a *secondary* candidate for a count gap, but it would not produce
  a *systematic* UUID-vs-dbId difference and is not the leading hypothesis.
- No `pitfalls.md` / `roadmap.md` entry already documents this specific mismatch as known/expected.

## 6. Domain slug justification — viewer-and-model

The divergence is rooted in (a) the **3-ID mapping chain** (UUID→ExternalID→Forge dbId) and (b)
the **colour service** counting non-deduplicated `dbId`s — both squarely documented in and owned by
`dashboard/viewer-and-model.md`. `data-pipeline` is *secondary* (both counts flow through the
pipeline, but the specific mechanism is the viewer/colour layer). `caching` is a *fallback*
hypothesis only (stale parquet) and does not explain a systematic unit mismatch. → **viewer-and-model.**

## 7. Hypothesis, confidence & needs-human

**Hypothesis (moderate confidence):** Not clearly a bug. The editor "Linked" (~628k) counts
**distinct source elements (UUID)** linked to the active program on one model; the dashboard
"Total" (~695k) counts **Forge dbIds** coloured across the whole federated model, a non-deduplicated
figure that is expected to be *larger* because one source element maps to multiple dbIds. The
observed direction and rough magnitude are consistent with expected drift. Whether the gap is
"working as designed" or a count-inflation defect (`coloredDbIds` not deduplicated / overlay label
mismatch) **cannot be settled from code alone** — it needs the Far01 query diff in §4 plus
confirmation of which widgets the reporter compared.

**Confidence: 6/10** (per `xyz-platform-context/CLAUDE.md` scale: "approach is clear but behaviour
is environment-dependent"). Both code paths are traced end-to-end (high confidence they are
*different* counters); the specific cause of *this* gap on Far01 is a strong but unverified
hypothesis, and it is genuinely unresolved whether any fix is warranted.

**Needs human:**
- ⚠️ **NEEDS HUMAN:** The 2 Jira attachments (`image-20260707-142150.png`,
  `image-20260707-142256.png`, both by Mostafa) are binary/staging media I **cannot view**. They
  are the side-by-side screenshots of the two numbers. The exact figures and the project are already
  in the ticket text, so nothing load-bearing is missing — **but** the images are the fastest way to
  confirm (i) the exact figures (text says "around"/"thousand") and (ii) *which* dashboard widget
  shows the 695k (the "Elements/Total" viewer overlay per §2b, vs a Progress-panel or Gantt figure).
  Do not guess their contents.
- ⚠️ **NEEDS HUMAN / dev:** Run the §4 query diff on Far01 (distinct source-element count vs
  `coloredDbIds.length` at slider-end) to confirm whether the gap is dbId-expansion (expected) or an
  upstream link-set difference (bug). Requires env access to Far01.

---

## Deep-dive: why the two counts differ even with the full project date range (2026-07-13, second pass)

Customer scenario re-stated: whole-project date range set, same federated model visible in dashboard and editor; editor shows 440K "linked elements", dashboard shows 470K. Even in this setup the two numbers are structurally different measures — verified in code:

**Dashboard "Total" = raw row count, not element count.**
- `dashboard-color-service.ts:604-621` — each row from the status query is pushed into per-status arrays with **no dedup** (plain `push`, no `Set`); `:643` `coloredDbIds = flat()`; `:661-662` that `.length` feeds the stats tile.
- The feeding query `dashboard-progress-service.ts:2515-2531` is `SELECT objectId, statusCode FROM element_base_data WHERE statusCode IN (…)` — **no DISTINCT**.
- `element_base_data` grain (`:2392-2406`): `GROUP BY objectId, modelElementId, installationStatus, installationCheckDate`. Three inflation vectors vs the editor's `COUNT(DISTINCT modelElementId)`:
  1. **UUID→dbId expansion** — `svf2_object_id_map` can map one authored element to multiple Forge objectIds; each is a separate row (by-design).
  2. **Status-history duplication** — grain includes `installationStatus, installationCheckDate`: if `element_status` holds >1 row per element (re-checked elements / status history), the SAME objectId appears multiple times and is **counted twice**. This one is a genuine defect vector, not by-design.
  3. **Scope** — `LEFT JOIN activity_links` means elements **with captured status but no activity link** still get rows and statuses; the editor's number counts only *linked* elements. Dashboard "Total" ≠ "linked elements" by definition.

**Date range is a red herring**: with the full project range, `buildInstallationStatusCaseSql` classifies essentially everything with data, so the whole gap (440K→470K, +6.8%) is explained by vectors 1-3, not by date filtering.

**The one query that settles bug-vs-by-design** (run against the project's DuckDB / parquet):
```sql
SELECT COUNT(*)                        AS rows_counted_by_dashboard,
       COUNT(DISTINCT objectId)        AS distinct_dbids,
       COUNT(DISTINCT modelElementId)  AS distinct_source_elements
FROM element_base_data
WHERE statusCode IS NOT NULL;   -- apply same status filter as the tile
```
- `rows > distinct_dbids` → status-history double-counting → **real bug** (fix: `COUNT(DISTINCT objectId)` or dedupe grain).
- `distinct_dbids ≈ 470K` and `distinct_source_elements ≈ 440K` → UUID→dbId expansion → by-design, but the tile label ("elements") is misleading → labelling/definition decision for product.
- `distinct_source_elements > editor's 440K` → scope difference (unlinked-but-statused elements included) → definition decision.

**Revised position:** "not a bug" was too strong. Correct statement: *the dashboard number was never a count of linked source elements, so equality with the editor is not the right expectation — but vector 2 (duplicate status rows) would be a genuine counting defect and is cheaply testable with the query above.* Recommended action file still stands: clarify + run the diff query before any dev work.

---

## Reopened 2026-08-13 — QA finds Staging still broken, in the opposite direction

Board re-query shows PLT-2874 back in scope as **Open** (was Ready For QA per the 08-05/07-30
progression below). Folder tag renamed groupB → groupA accordingly.

**New comment, 2026-08-12 10:44, Gennaro Boccia (QA), on Staging 26.3.4:**
> Editor: 603,844. Dashboard: 551,386.
>
> On Prod, same rewind: Editor 603,844, Dashboard ~604k.

So Prod now agrees with the editor (consistent with PR #2084 — see "Current: ship PR #2084" in
`recommended-action.md` — having shipped and worked). Staging, on the **identical editor figure**,
shows a dashboard number **52,458 below** it — undercounting, the opposite direction from the
original bug (which overcounted by object-expansion). Same code, same editor number, different
dashboard number between environments → the defect is environmental (build/data freshness), not a
fresh code regression on this evidence alone.

**Verified in the current checkout (`hc-frontend`, branch `claude/vigilant-franklin-iikevd`,
no PLT-2874 commit is separately visible — see caveat below):**

- The PR #2084 fix **is** in the tree and matches what "Diagnosed and fixed" described: the tile
  reports `visibleElements$`, fed by `countDistinctElements()` (new helper,
  `dashboard-panels/viewer/element-count.ts:10-20`, header comment names PLT-2874 explicitly),
  called from both colour paths — `dashboard-color-service.ts:697-703` (initial paint) and
  `:874-879` (`reApplyColors`, i.e. after any filter/scrubber change; the comment notes this second
  call site is what PLT-2874's own fix-round added, "missing it here left the total reverting to
  the object count after any filter change"). `coloredDbIds` still holds objectIds and is unchanged,
  used only for painting (`:681,692,865,868`).
- The query side also carries it: `dashboard-progress-service.ts:2069` and `:2083` now
  `SELECT DISTINCT …`, materialised at `:2092` into `_visible_elements`; a unit test guards it
  (`element-count.test.ts:3-43`).
- **What did NOT change:** `element_base_data` is still built with `LEFT JOIN element_status /
  activity_links / api_activities` and no `DISTINCT`, `GROUP BY map.objectId, map.modelElementId,
  es.installationStatus, es.installationCheckDate` (`dashboard-progress-service.ts:2548-2560`) —
  byte-for-byte the shape this file's 07-13 pass described. The fix landed at the *reporting* layer
  only, as `investigation-log.md` proposed; vectors 2/3 (status-history duplication, unlinked-but-
  statused scope) are structurally still there, just no longer the live symptom.
- **Git history cannot date the fix or find a regression commit.** This checkout has 50 commits;
  the root `ca87f65` (2026-08-03) is a squashed full-tree import — `element-count.ts`,
  `dashboard-color-service.ts` and `dashboard-progress-service.ts` all trace to it with no earlier
  history, so **no PLT-2874 diff/blame exists in this repo** and `git log --grep=PLT-2874` returns
  nothing. Only two post-import commits touch this path and neither changes counts: `4ad83a7`
  (08-07, PLT-2743, comment-only) and `b440537` (08-05, PLT-2935, adds frozen-planned-progress
  filtering for one hardcoded project id, unrelated). **Ruling out "Staging is missing the fix":**
  that would produce an *over*count, not the observed undercount, so it's ruled out by direction,
  not by finding a counter-commit. `changelog.md` is stale since 2022; app version is per-environment
  via `.github/actions/sync-version` and not visible from this checkout, so build skew between
  Staging and Prod is real but unverifiable here.

**Ranked hypotheses for the Staging-only undercount** (dashboard vs editor pull from genuinely
different sync chains — dashboard: `ModelDetailsPanel.tsx` "Linked" via
`linking.getLinksForModel` → `linking-service.ts:680-681`, no date filter, no object-id map at all;
editor: the PLT-2874-fixed `_visible_elements` path, gated by object-id-map presence, a dated
schedule link, and the date window):

1. **H1 (leading, 6-7/10): dashboard link-sync is capped at the progress artefact's
   `calculatedOn`; the editor's isn't.** `dashboard-progress-service.ts:672` derives
   `endSyncDateTime` from `this._v2Loader.getCalculatedOn()`, passed into
   `syncElementStatusDeltaFromAPI` / `syncActivityLinksDeltaFromAPI` (`:831,858`) — comment at
   `:829-830`: "capped at the progress calculatedOn so coloring never runs ahead of the figures".
   `linking-service.ts:101-104`'s equivalent sync sends no such cap. **Falsifiable in one look**: if
   Staging's progress artefact `calculatedOn` is weeks stale (check the Pipeline B console log at
   `dashboard-progress-service.ts:742`) while Prod's is ~today, elements linked after that date are
   invisible to the dashboard and visible to the editor — direction and asymmetry both match, and
   no code/config difference between environments is required, only data freshness.
2. **H2 (4/10): silent OPFS cache staleness when an artefact carries no hash / zero size.**
   `duckdb-service.ts:154-158` warns and falls through to a size-only check when `artefactHash` is
   absent; `opfs-cache-manager.ts:164` skips that check when `fileSizeBytes` is falsy (`:430`
   documents this can legitimately be 0). A Staging pipeline emitting hash-less/zero-size artefacts
   could serve a stale cached parquet indefinitely on a QA browser specifically.
3. **H3 (4/10): wrong `svf2-object-id-map` version selected.** `artefact-loader.ts:238-241` — if no
   artefact matches the active model *version*, it silently falls back to
   `matchingByModel[0]`, an older translation with a smaller element universe. Logged at
   `artefact-loader.ts:258,273` (model-matched vs version-matched, row count) — falsifiable from the
   Staging console directly.
4. **H4 (2-3/10): a progress-derived `dateRangeStart` pinches the window even at scrubber-end.**
   `dashboard-progress-service.ts:2011,2017` filter on `endDate >= dateRangeStart` /
   `displayDate <= dateRangeEnd`; `_queryDataDateRange` (`:254-300`) falls back to a narrower
   progress-parquet-derived start when `api_activities` isn't populated yet, and pipeline
   ordering makes which branch wins timing-dependent — a slower Staging load could settle on a later
   start than Prod on identical code. Logged at `:300` ("Data date range: X to Y").
5. **H5 (background risk, not the leading cause): `countDistinctElements` silently drops rows with a
   falsy `modelElementId`** (`element-count.ts:14-19`) and only uses the object-count fallback when
   the resulting set is *entirely* empty — a partially-NULL `modelElementId` column in a map parquet
   would silently undercount with no error. Worth hardening regardless of which hypothesis above is
   the trigger.

**Ruled out:** the alternate `INNER JOIN`-based runtime-mapping query
(`dashboard-progress-service.ts:2246-2249,2312-2313`), which would genuinely undercount, cannot be
active — `DASHBOARD_FEATURES.USE_VIEWERPAGE_ID_MAPPING` is a hardcoded `false`
(`dashboard-provider/dashboard-project-service.ts:25-40`). No staging-only feature flag exists
anywhere near this code (`config/constants.ts:876-893`).

**The three-query discriminator, on Staging, no code change needed:**
```sql
SELECT COUNT(DISTINCT modelElementId) FROM _visible_elements;   -- what the tile shows
SELECT COUNT(DISTINCT modelElementId) FROM element_base_data;   -- pre-date/status filter
SELECT COUNT(DISTINCT modelElementId) FROM activity_links;      -- pre-object-id-map
```
Whichever step is where the ~52,458 disappear identifies the vector directly, per the playbook's
"state a prediction, then run the query" discipline. Pair it with reading the Staging browser
console for the `calculatedOn` timestamp (H1) and the artefact-selection log line (H3) — both free,
no query needed.

**Needs human:** none of H1-H5 can be settled without Staging environment access (console + DuckDB
panel). This is a QA-owned environment; Gennaro already has it open. The fastest path is asking
Gennaro to paste the two console lines above and run the three queries, not re-deriving from code.

## Group move: 2026-07-30 — folder re-tagged groupA → groupB

Board re-check (`project = PLT AND issuetype = "Live Incident"`, JQL filter) shows PLT-2874 is now
**Dev In Progress** (was In Analysis on 07-13/07-22). The clarifying-question step in
`recommended-action.md` evidently landed and the ticket progressed into the dev pipeline — folder
tag renamed accordingly, per the README's group-rename convention. Per this run's scope
(Group B action scenario still TBD, "skip those tickets"), no fresh deep-dive was done this run —
this is a bookkeeping-only update. Next run: if this stays in Group B, do a light dev-readiness/
fix-ownership check like the other Group B tickets rather than a full re-investigation.
