# PLT-2931 — "Containment package should be 100% but is not on dashboard" — triage context

- **Domain slug:** `progress-tracking` (same defect family as PLT-2882 / PLT-2909 — sorts with its siblings)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2931
- **Type:** Live Incident · **Priority:** Major · **Status:** **Open**
- **Assignee:** Ilia Kuzmin · **Reporter (Jira):** Yash Patel (support) · original client reporter: **Thomas** (same reporter as PLT-2917)
- **Project:** ELN03 (APLD) · **Software Area:** Dashboard
- **Created:** 2026-07-24 · **Freshdesk:** #7509 "Waiting on 3rd line" (back on us)
- **Affected activities (customer's list):** `KUPSB21200`, `JSCOR1060`, `JUPSA21030`, `KUPSD21420`, `JUPSC21480` — all in the **Containment** package
- **Attachments:** 2 screenshots (dashboard Packages panel; Yash's editor investigation) — **read this run** via the operator's re-share, contents transcribed below
- Triage date: 2026-07-24

---

## One-line symptom

The **Containment** package on the ELN03 dashboard shows **97% / 100% (variance −3%)** even though the
customer has "claimed at 100%" every activity in it. Per-activity, the dashboard shows e.g.
**KUPSB21200 at 72% actual**, **JSCOR1060 at 98%**, **JUPSA21030 at 49%** — while the editor shows all
of them fully claimed.

## The smoking gun (arithmetic, from the two screenshots)

Yash's editor screenshot shows, for **KUPSB21200** on ELN03:
- Schedule row: **122 linked elements** (the raw `activity_links` count the schedule panel displays)
- Selecting the activity's linked elements in the viewer: **Selected: 88** — all 88 showing
  INSTALLED in element properties

**88 / 122 = 72.13% — exactly the 72% the dashboard shows for this activity.** The dashboard's
Actual % denominator is the raw linked count (122); its numerator is installed elements (88); the
**34 missing elements are links whose elements no longer resolve to geometry** — they can never be
selected, never be claimed, never be installed. The activity is mathematically incapable of
reaching 100% until those dead links are removed.

Same shape implied for the others: JSCOR1060 98% ⇒ ~1 dead link in ~50; JUPSA21030 49% ⇒ roughly
half its links dead. (Exact counts per activity to be confirmed by the queries below.)

---

## Mechanism (verified via skill docs + PLT-2882's confirmed RCA — no new code reading needed)

1. **Per-activity Actual % is computed on the backend at parquet-generation time**, not in the FE:
   for tangible activities (`LinkedElements > 0`), `ActualProgress = InstalledElements / LinkedElements`
   (dashboard-progress-comparison skill, § "How ActualProgress and PlannedProgress Are Computed").
   The dashboard's Gantt/Packages panel just reads `activity_progress` parquet values — the FE is a
   faithful renderer (recurring theme: PLT-2917, PLT-2874, PLT-2884).
2. **The denominator (`LinkedElements`) comes from the `activity_links` bridge**, which — per
   PLT-2882's confirmed root cause — **retains links to elements that no longer exist in the current
   model geometry** after a re-upload/re-version (and per PLT-2909, the same staleness also arises
   from PC-EXCEL imports cross-writing metadata).
3. **The editor's "claim at 100%" flow can only claim what geometry can select** — the customer
   claimed all 88 selectable elements; the 34 ghost links stay `NOT_SET` forever.
4. **Package roll-up** weights the depressed activities into the Containment package → 97%.

So: **same root-cause family as PLT-2882 (FAR01) and PLT-2909 (ATL05-08), third project family
(ELN03), new surface** — this time it's not "select does nothing" (2882) or "wrong model list"
(2909) but **"progress % permanently capped below 100%"**. This is the exact user-visible harm the
PLT-2882 investigation predicted when it flagged that stale links "inflate % / hours".

### History makes this a recurrence, not a novelty

- **`JUPSC21480` — one of this ticket's five activities — is literally the exemplar activity of
  PLT-2675 "Ghost items 1 - JUPSC21480" (closed May 2026).** Whatever cleanup closed PLT-2675
  either didn't remove these dead links or they re-appeared with a later re-upload.
- Yash himself linked PLT-2658 (May, Done) as similar — ELN03's sister project family has a
  documented ghost-element history.
- **PLT-2882's cohort sweep (playbook Q6) was never run** — the investigation log records the
  working sweep tooling (`scripts/console-geometry-harvest.js` + `scripts/orphaned-links-sweep.mjs`)
  but ends with "project-wide sweep pending harvest run or BE query". PLT-2931 is the predictable
  cost of that pending sweep: the same defect surfacing project-by-project, ticket-by-ticket
  (FAR01 → ATL08 → ELN03).

---

## Playbook six-questions status

1. **Observed & reproducible?** ✅ Yes — Yash reproduced in the editor (screenshot); the dashboard %
   and the editor selection counts are both in our hands, and their ratio matches to the percent.
2. **Expected, on whose authority?** Customer's claim "I claimed them at 100%" is **verified** by the
   editor: everything selectable IS installed. The reference is sound; the denominator is not.
3. **Smallest broken-vs-working pair?** In the same package, same screenshot: JUPSA21070 and
   KUPSD23090 show 100/100 (no dead links) vs KUPSB21200 at 72/100. Same package, same schedule,
   same date — the only variable is dead-link count.
4. **Mechanism?** ✅ Above — 9/10, backed by two confirmed sibling RCAs plus the arithmetic match.
5. **Why now (trigger)?** Unconfirmed for ELN03 specifically — was a containment model re-uploaded/
   re-versioned (or re-imported via Excel) recently? Same question as both siblings; needs the
   model lineage for the models these 5 activities link into. Note PLT-2675 (May) proves ELN03 had
   ghost items at least once before — trigger may be that cleanup was partial, not a new event.
6. **Cohort?** The 5 listed activities are a sample. The honest cohort is **every ELN03 activity
   whose links don't fully resolve to geometry** — and, given three projects are now hit, arguably
   **every project**. The sweep tooling from PLT-2882 exists and has never been run in anger.

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

- **Mechanism (dead links inflate the backend-computed denominator; dashboard renders faithfully):**
  **9/10** — arithmetic from the customer's own screenshots (88/122 = 72%) + two confirmed sibling
  RCAs + skill-documented computation formula.
- **That all 5 activities are this and nothing else:** **7/10** — verified visually for KUPSB21200;
  JSCOR1060/JUPSA21030 percentages fit the pattern; KUPSD21420/JUPSC21480 not yet inspected
  (JUPSC21480's PLT-2675 history raises, not lowers, the odds).
- **Overall triage confidence: ~8/10** — one confirmation run (queries below) turns this into a
  precise per-activity dead-link list ready for the same remediation as PLT-2882's 418.

---

## Confirmation runs (owner: Ilia; ~20 min total; no customer input needed)

### A. Dashboard-side — DuckDB Explorer on the ELN03 dashboard (2 queries, no trailing semicolons)

**A1 — what the parquet actually says per activity:**
```sql
SELECT a.userItemId, a.itemName, a.activityStatus, a.linkedElementCount,
       ROUND(p.max_actual * 100, 2) AS dashboard_actual_pct,
       p.parquet_linked
FROM api_activities a
LEFT JOIN (
  SELECT ActivityId, MAX(ActualProgress) AS max_actual, MAX(LinkedElements) AS parquet_linked
  FROM activity_progress
  GROUP BY ActivityId
) p ON a.itemId = p.ActivityId
WHERE a.userItemId IN ('KUPSB21200','JSCOR1060','JUPSA21030','KUPSD21420','JUPSC21480')
```
Expected: KUPSB21200 → `dashboard_actual_pct ≈ 72`, `parquet_linked = 122`.

**A2 — installed vs linked from the dashboard's own element tables (per-activity dead-link count):**
```sql
SELECT a.userItemId,
       COUNT(al.modelElementId) AS linked,
       SUM(CASE WHEN es.installationStatus = 'INSTALLED_ACCURATELY' THEN 1 ELSE 0 END) AS installed,
       COUNT(al.modelElementId)
         - SUM(CASE WHEN es.installationStatus = 'INSTALLED_ACCURATELY' THEN 1 ELSE 0 END) AS never_installable_candidates
FROM api_activities a
JOIN activity_links al ON al.activityId = a.itemId
LEFT JOIN element_status es ON es.modelElementId = al.modelElementId
WHERE a.userItemId IN ('KUPSB21200','JSCOR1060','JUPSA21030','KUPSD21420','JUPSC21480')
GROUP BY a.userItemId
```
Expected: KUPSB21200 → linked 122, installed 88, candidates 34. (If `activity_links` column names
differ, `SELECT * FROM activity_links LIMIT 1` first — the skill doesn't pin its schema.)

### B. Editor-side — geometry proof (reuse PLT-2882's branch, NO new branch needed)

Branch **`PLT-linked-selection-diagnostics`** is still on origin. Editor on ELN03, load the
containment models, select each of the 5 activities → `window.__linkDiagnose()` → the
`parquetVsGeometryByMongoModelId` block gives `inParquet` vs `inGeometry` per model. Expected for
KUPSB21200: 34 elements `inParquetNotInGeometry`. This is the artifact that makes the dead-link
list deletable with the same audit trail as PLT-2882's 418-row CSV.

### C. Cohort — run the ELN03-wide sweep (finally)

`scripts/console-geometry-harvest.js` → `scripts/orphaned-links-sweep.mjs --geometry <file>`
(both prod-safe/read-only, from PLT-2882's investigation log). Given this is the **third project**
hit by the same family, an ELN03 sweep now — and a decision on sweeping remaining projects — beats
a fourth ticket later.

---

## NEEDS HUMAN

- ⚠️ The 2 Jira attachments are the same screenshots transcribed above (re-shared by the operator
  this run) — no gap.
- ⚠️ **Query outputs A1/A2 + one `__linkDiagnose` JSON** — needs a dev session on ELN03 (Ilia).
- ⚠️ **Trigger question for BE/ops:** which containment model(s) do these 5 activities link into,
  and were they re-uploaded/re-imported since the PLT-2675 cleanup (May)?
- ⚠️ **Remediation approval:** deleting the dead links needs the same product sign-off loop as
  PLT-2882's 418 (Pietro/Mostafa), and should reuse its soft-delete endpoint + CSV audit pattern.

---

## Roster / ownership notes

- **Ilia Kuzmin** (assignee) — owns confirmation runs A/B; already owns the identical tooling.
- **Yash Patel** — coordinator; his editor investigation was exactly right and saved a full
  diagnosis cycle (his comment: "activities have elements that are still linked but don't have
  geometry", citing PLT-2658).
- **BE/data (Ali Seyedof / David Webb / Sachin)** — the pipeline question ("why does metadata
  retain dead generations") is already open on PLT-2909/PLT-2882; **add ELN03 as the third
  confirmed project** to that thread rather than opening a new one.
- **Pietro/Mostafa** — remediation approval (dead-link deletion), as with PLT-2882.

## Doc / KB refs

- **`PLT-2882-groupA-progress-tracking/investigation-log.md`** — confirmed RCA, `__linkDiagnose`
  tool, sweep scripts, deletion endpoint + audit pattern. PLT-2931 is procedurally a re-run of it.
- **`PLT-2909-groupA-progress-tracking/context.md`** — PC-EXCEL variant + Ali Seyedof's open BE question.
- **dashboard-progress-comparison skill** — per-activity Actual % formula (`InstalledElements /
  LinkedElements`, backend-computed at parquet generation; DuckDB is a reader, not a computer).
- PLT-2675 ("Ghost items 1 - JUPSC21480", Done, May 2026) — prior ELN03 ghost-item cleanup covering
  one of this ticket's activities; PLT-2658 — Yash's cited precedent.
- `incidents/live-incident-playbook.md` — Q6 cohort discipline; this ticket is the cost of the
  sweep not having run.
