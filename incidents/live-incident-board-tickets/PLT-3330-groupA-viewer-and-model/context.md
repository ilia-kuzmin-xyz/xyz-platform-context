# PLT-3330 — "SIN02 - Dashboard does not show some installed items while there are marked as installed in web viewer" — triage context

First folder for this ticket (2026-10-21 scheduled run). **Open**, assignee Ilia, reporter Yash, Major, created 10-20 14:11 BST, Freshdesk 8353 (Waiting on 3rd line).
Group A, domain viewer-and-model (dashboard element colouring). Same customer and project as PLT-3275 (rework cost) and PLT-3156 (schedule "Draft" WBS, Done 10-06).

## Ticket (fetched live 10-21, 2 comments, newest `115993`)

- Description: facade-model elements are installed in the Editor but "not visible in the dashboard". The customer already asked Root BIM, who could not resolve it.
- `115992` Yash to Ilia, 10-20: same report; Yash found one element marked installed that shows **orange**: element `507688b3-2503-434e-b2a7-e3a239e80457-000560a0`, model `PC-SIN0201-GAR-DC-ZZ-M3-AQ-00001-FacadeClading-V2`. Asks why installed facade elements do not appear.
- `115993` Freshdesk 8353 Waiting on 3rd line. No reply from anyone since (about 1 working day at run time).
- Waiting on: Yash on Ilia (since 10-20 14:21). Nobody on us otherwise.

## Unopenable media (what a human must open)

Jira attachments `66651`, `66652`, `66653`, `66654` (two editor/dashboard screenshots from the customer, two images Yash pasted). Bytes are 403 from this routine (standing note, not retried).
**They would settle:** (a) whether "not visible" means grey/uncoloured or missing from the count, (b) what the dashboard colours the element and the status filter selection, (c) the date range / scrubber end on the dashboard shot. Ilia can drop them into this folder.

## What the code says (hc-frontend origin/master `9699aa5`, unchanged since the 10-20 run; nothing in it touches this)

Colour of an element on the dashboard is one CASE, `buildInstallationStatusCaseSql` (`.../services/dashboard-progress/utils/installation-status-sql.ts:35-70`), evaluated "as of" a reference date:

| result | when |
|---|---|
| 2 Installed (green) | `installationStatus = 'INSTALLED_ACCURATELY'` and check date null or on/before the reference date |
| 1 Installed Early | same, and check date before the activity start |
| 4 Late (red) | not installed (as of ref date), activity end before ref date |
| **3 Late Start (orange)** | not installed (as of ref date), activity start before ref date (`status-colours.ts:41`, `dashboard-color-service.ts:959`) |
| 0 Planned | not installed, has a start or end date, not yet started |
| NULL (no colour, hidden) | no dates at all, i.e. not linked to a *current* dated activity |

So **orange on an element the editor calls installed means the dashboard's copy of the status says "not installed as of the reference date"**, not that the status is missing. Two ways that happens, both stale-copy or date shaped:

- **H1 (leading, Pattern 7 flavour): the dashboard's status copy is behind the editor.** The dashboard loads `element_status` from a nightly parquet and merges a live delta on fresh load, but the merge is **capped at the progress `calculatedOn`** (`dashboard-progress-service.ts:684`, `:856-858`; `dashboard/data-pipeline.md` 2026-09-17 and 09-18 sections). An install edit made after the last progress recalculation is excluded however often the page reloads. The cap is shown on screen as the Progress panel's **"Last updated"** (`progress-panel.tsx:288`).
  *Prediction one look can falsify:* "Last updated" is older than the time the element was marked installed. *Falsified by:* "Last updated" is newer than the install time and the element is still orange.
- **H2: the reference date is earlier than the check date.** An install judged "as of" a scrubber/date-range end earlier than its check date falls through to Late Start (`installation-status-sql.ts:48-51`, the docstring says so). *Prediction:* the date range end on the dashboard is before the install date. Pattern 3 checklist item.
- **H3 (for the "not visible at all" half): linked to a non-current schedule revision or an undated activity.** `api_activities` holds only the current revision and the CASE has no linkage input, so such links resolve to NULL and the element is hidden (`dashboard/pitfalls.md` "Is linked must not be inferred from schedule-date presence"; same shape as the ML9 candidate on PLT-3024). **SIN02's schedule was re-imported recently** (PLT-3156, `Update August26` XER, "re-export without the DRAFT project" asked 09-21, closed Done 10-06), so a facade batch linked to the earlier revision is plausible. *Prediction:* `SELECT COUNT(*) FROM activity_links al LEFT JOIN api_activities a ON al.activityId = a.itemId WHERE a.itemId IS NULL` is large for SIN02. Not measured. Note this one yields uncoloured, not orange.
- **H4 (Pattern 3):** XYZ Tracked toggle, a package/discipline filter or a status filter hiding the facade elements. Cheapest to rule out.

H1 and H2 explain Yash's orange element; H3 and H4 explain "not visible". One report may hold both. **Not enough to say which**: three hypotheses are live and none was measured.

## Relationship to other tickets

- PLT-2874 (editor 628k vs dashboard 695k): different units and scope, see `dashboard/editor-vs-dashboard-element-counts.md`. Do not treat "editor shows installed, dashboard does not" as the same unit problem; this one is about status, not counts.
- PLT-3133 (Done, 10-13): same freshness cap, "changes take hours to show". If Last updated is old, this is that ticket's mechanism, working as designed.
- PLT-3306 / PR #2348 (`d3f17f7`, 26.4.1): progress weighting, different surface; not related to colouring.

## Verified vs inferred

Verified: ticket text and comments; the CASE and the colour mapping; the capped merge and where "Last updated" is rendered; master has no relevant change.
Inferred: that the customer's "not visible" and Yash's orange element are the same cause; that SIN02 uses the dynamic (Pipeline B) colouring; that Root BIM is the customer's BIM consultant.

## Not verified / needs a human

- The four screenshots (403).
- "Last updated" value and the install time of the orange element (one look on SIN02, Yash or Ilia can do it).
- The dashboard's date range end and filters when the screenshot was taken.
- Whether SIN02's facade links point to the current schedule revision (DuckDB console on the page, query in H3).
- Whether the facade model was re-uploaded as V2 recently and whether its element ids changed (status is keyed by `modelElementId`).
No Jira action was taken.

---

## 2026-10-26 run: unchanged in substance; 6 days, nobody has answered Yash (additive)

Re-fetched, 2 comments. `115992` shows `updated` 10-23 13:38 (Yash edited his own comment; text matches what is recorded above, nothing new that I can see, so the edit is not a new fact). Status Open, assignee Ilia, Freshdesk 8353 still Waiting on 3rd line. hc-frontend master `16b41bb`; commits since 326e1f5 (#2300 image markup, #2328, #2329 measure tool, #2382 quality sort, #2385 Linked/Un-linked filter on the Gantt) do not touch the status CASE or the capped merge. H1 to H4 untouched, still unmeasured. Attachments `66651` to `66654` still unopened (403). No Jira action was taken.
