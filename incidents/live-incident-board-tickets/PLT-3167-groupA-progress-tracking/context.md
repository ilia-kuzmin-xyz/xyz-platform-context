# PLT-3167 — "Ghost elements preventing 100% progress on activity ID" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3167
- **Issue type:** Live Incident · Software Area: Model Viewer · **Status: Open** (Group A — brand
  new, never triaged before) · **Priority: Medium** · **Project: FAR01**
- **Reporter (Jira):** Yash Patel, relaying a client (Freshdesk #8065, "Waiting on 3rd line") ·
  **Assignee:** Rishi Bhugobaun
- **Created:** 2026-09-23 16:16 · **Last updated:** 2026-09-23 17:04 (3 comments, all same-day)
- **Domain slug chosen:** `progress-tracking` (PRG), matching `PLT-2882`/`PLT-2909`/`PLT-2931` —
  see §2, this is a Pattern 1 candidate, not a pure viewer/selection bug.
- **Triage date:** 2026-09-24 · first pass, no prior folder existed for this ticket.

---

## 1. What was reported

Client, via Yash's summary comment (`112846`):

> Customer reports that they are unable to select all elements linked to certain activities,
> preventing the activities from being reported as **100% complete**.
>
> Affected activities: `FAR01UGD14640` — ~5,444 linked elements (Yash's own attempt selected only
> 5,443); `FAR01ELE3590` — similar behaviour observed.
>
> After using "Select All Linked Elements", the number of selected elements does not match the
> total number of linked elements. The customer attached screenshots. All linked models were loaded
> except the **FED model**, which crashes the customer's computer when loaded.
>
> This issue has been encountered in past also in **PLT-2931**. Can we look to have a permanent fix
> for this?

A third activity was added the same afternoon (`112849`, 17:00): **`FAR01UGD4130`**, "same issue as
before." Yash has asked the customer to sweep the whole project for further affected activities —
no reply yet.

## 2. Domain doc check — this is Pattern 1, fourth confirmed project-instance, second time on FAR01 specifically

`incidents/recurring-defect-patterns.md` **Pattern 1 — "Dead activity links (element metadata
diverges from model geometry)"** is an exact mechanism and signature match, not a loose analogy:

- **Recognition signature** (pattern doc, verbatim): *"Select or isolate linked elements appears to
  do nothing, while a non-zero count is displayed"* and *"An activity is claimed complete on site
  but the dashboard shows it short of 100%, and `installed / linked` reproduces the displayed
  percentage exactly."* PLT-3167's report — 5,444 linked, only 5,443 selectable, activity stuck
  short of 100% — is the same shape at smaller scale (1 missing element instead of hundreds).
- **Mechanism** (pattern doc §Mechanism): an activity's links point at `modelElementId`s that still
  exist in the model's **element metadata** (`client-element-metas` parquet,
  `project_element_list`) but no longer exist in the model's **translated geometry**. Selection
  needs geometry — `model.elementId2dbId` is the *intersection* of loaded geometry externalIds and
  the metadata parquet (`model-mapping-service.ts:372-384`) — so dead elements silently drop out of
  "Select All Linked" with no error (`use-linked-element-actions.ts:24-63`).
- **Yash's own citation, checked against the pattern table, is the wrong ticket — but the right
  family.** Yash names **PLT-2931** (ELN03, package stuck at 97%) as the precedent. The pattern
  doc's own table lists three confirmed instances: PLT-2882 (**FAR01** — same project as this
  ticket), PLT-2909 (ATL08), PLT-2931 (ELN03). **PLT-2882, not PLT-2931, is the project match** —
  FAR01 already had this exact defect once (see `PLT-2882` folder — not yet cross-referenced in
  this repo's folder list; check `dashboard/pitfalls.md` and `recurring-defect-patterns.md` for its
  detail). Worth a one-line correction when replying: this is FAR01's *second* occurrence, not its
  first via ELN03's ticket.
- **Which of the two named triggers applies is not yet known.** The pattern doc distinguishes
  **re-upload/re-version** (PLT-2882's own trigger, content removed/re-exported with new handles,
  metadata keeps the dead generation) from **PC-EXCEL import cross-write** (PLT-2909, Excel import
  writing element rows into the wrong building). Given this is the *same project* as PLT-2882, the
  re-upload/re-version trigger is the leading candidate, but FAR01 has had multiple model
  re-uploads since PLT-2882's remediation and nothing here yet narrows it to a specific one.

## 3. Code findings (hc-frontend) — re-confirms the pattern doc's citations are current

Spot-checked rather than re-deriving from scratch, since the pattern doc's code citations are from
prior sessions on this same checkout family:

- `use-linked-element-actions.ts` still drives "Select All Linked Elements" off
  `model.elementId2dbId`, the geometry∩metadata intersection described in the pattern doc — not
  re-read line-by-line this pass (no reason to expect drift; the mechanism is orthogonal to any
  recent PR in this area per the file's last-touch history, not checked this run).
- **Not re-verified this pass:** `model-mapping-service.ts:372-384`, `useGroupedLinks.ts:30`,
  `useLinkedElementsTreeData.ts:114-116` — carried forward from the pattern doc as still-current
  citations; a fresh `git log`/grep on these three would be the first thing to do before writing
  any fix, per this repo's own re-verification discipline (do not trust a citation silently).

## 4. The diagnostic recipe already exists and is cheap — this does not need new tooling

`recurring-defect-patterns.md` §"Diagnostic recipe, cheapest first" gives a ready-to-run arithmetic
check and a geometry oracle, both DuckDB queries against the dashboard, no new branch or script
needed:

```sql
-- 1. Arithmetic check: does installed / linked reproduce the displayed %?
SELECT a.userItemId,
       COUNT(al.modelElementId) AS linked,
       SUM(CASE WHEN es.installationStatus = 'INSTALLED_ACCURATELY' THEN 1 ELSE 0 END) AS installed
FROM api_activities a
JOIN activity_links al ON al.activityId = a.itemId
LEFT JOIN element_status es ON es.modelElementId = al.modelElementId
WHERE a.userItemId IN ('FAR01UGD14640','FAR01ELE3590','FAR01UGD4130')
GROUP BY a.userItemId

-- 2. Geometry oracle: which linked elements have no geometry mapping at all?
SELECT a.userItemId, al.activityId, al.modelElementId
FROM api_activities a
JOIN activity_links al ON al.activityId = a.itemId
LEFT JOIN element_base_data ebd ON ebd.modelElementId = al.modelElementId
WHERE a.userItemId IN ('FAR01UGD14640','FAR01ELE3590','FAR01UGD4130')
  AND ebd.modelElementId IS NULL
```

**Caveat carried from the pattern doc, applies directly here:** `svf2-object-id-map` (query 2's
oracle) is Navisworks-path only; FAR01 is known from `PLT-2874`'s own investigation log to be a
Navisworks-federated project (`svf2_object_id_map` was the artefact used there), so query 2 should
be valid on this project — but confirm before trusting a zero result, per the pattern doc's own
warning about Revit-mapped projects making this query useless.

## 5. NEEDS HUMAN — attachments not opened this session

Two PNG screenshots (`65127`, `65128`, both Yash, 2026-09-23 16:24) show "date/time of issue" and
the total-vs-selected element counts on FAR01UGD14640. A third image is referenced inline in
comment `112849` (FAR01UGD4130) as an external Freshdesk-hosted URL, not a Jira attachment — same
non-Jira-attachment shape flagged on PLT-2651's `112736` and PLT-2918's chat screenshots, needs
Freshdesk access this routine does not have. None of the three is load-bearing for triage — the
text already gives project, activity IDs, and both counts for the lead example — but a human should
open them to confirm they show the selection-count mismatch and nothing else (e.g. a second,
unrelated symptom riding along).

## 6. Confidence

- **This is Pattern 1 (dead activity links), not a new defect: 8/10.** Textbook recognition
  signature (non-zero linked count, selection under-resolves by a small number), same project as a
  confirmed prior instance (PLT-2882), diagnostic recipe already proven on three other projects.
  Held below 9 only because the arithmetic/geometry queries in §4 have not actually been run against
  FAR01's current data — the match is on symptom text, not yet on a query result.
- **Yash's own precedent citation (PLT-2931) is the wrong specific ticket but the right pattern
  family: 9/10** — directly checked against `recurring-defect-patterns.md`'s own table.
- **Overall triage confidence: 7/10.** One 30-second query away from either fully confirming
  (installed/linked reproduces a sub-100% display somewhere, or the geometry oracle returns exactly
  the 1 missing element for FAR01UGD14640) or ruling out Pattern 1 in favour of something new.
