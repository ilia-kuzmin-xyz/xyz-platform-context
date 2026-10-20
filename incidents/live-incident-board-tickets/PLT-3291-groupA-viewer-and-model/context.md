# PLT-3291 — "Wrong number of linked elements" (ATL08, activity MV-1350) — triage context

First folder for this ticket (2026-10-16 scheduled run). Group A (status **Open**, no dev reply yet), domain **viewer-and-model**
(count and model list shown by the web viewer for a schedule activity). Likely **Pattern 1** (`incidents/recurring-defect-patterns.md`),
a possible fifth sighting and the second on ATL08. **Not measured: no prod access from this session.**

## Ticket (fetched live 2026-10-16, 2 comments, newest `115484`)

- Jira: https://xyzreality.atlassian.net/browse/PLT-3291. Live Incident, Major, created 10-15 15:09, assignee **Darminder**, reporter Yash.
  Freshdesk 8300, set to *Waiting on 3rd line* by Yash at 15:11.
- Customer (Kyriakos, project **ATL08**, area Web Viewer): activity **MV-1350** "shows 6350 linked elements on it when it is not the case.
  The actual number of elements linked to it are much lower and there are no elements linked to it from the several models shown on the
  right side of the snip."
- `115482` Yash to Darminder: customer clarifies it is **not automatic linking**, the displayed count and the model list are wrong.
  A video is on SharePoint (`kyriakos_krestas_xyzreality_com`, "XYZ Cloud Platform and 5 more pages - Microsoft Edge 2026-10-15 10-02-17.mp4").
- Who waits on whom: customer on us, since 10-15 (1 day). Nobody on the ticket has answered Yash. Nothing owed by anyone else.

## Unopenable media (what a human must open)

- Screenshot `Screenshot 2026-10-14 103207.png`: lives on Freshdesk (`support.xyzreality.com/helpdesk/attachments/103356286320`), not a Jira
  attachment (the Jira `attachment` list is empty), so not fetchable from here. **It would settle:** which models the pop-up lists and what the
  activity header says (a count of 6,350 vs the per-model rows).
- The SharePoint video: private link, not fetchable. **It would settle:** whether the user is looking at the activity header count, the
  Gantt/schedule "elements" column, or the Linked Elements panel, and what "select linked elements" does for MV-1350.
- Per the 09-08 note, Jira attachment bytes are 403 from this routine; do not retry. Ilia can drop both files into this folder.

## What the code says the number is (read on hc-frontend master `049c25819`, 2026-10-16)

The three things on the customer's screen come from different sources, all of them metadata, none checked against geometry:

| surface | source | where |
|---|---|---|
| "N linked elements" on the activity | backend `linkedElementCount` on the schedule item, summed for the selection | `schedules.service.ts:443` (platform-api, `row.LinkedElementCount`) to `scheduler-service/utils.ts:78` to `activity-properties.tsx:56` |
| list of elements in the Linked Elements panel | `getElementsForActivity` maps link ids to loaded element entities, drops unknown ones | `services/linking/linking-service.ts:684-688` |
| models listed in the panel | `element.getModels()`, built from every model's **metadata parquet**, no geometry check | `useGroupedLinks.ts:68`; `element-entity.ts:38-42`; `model-entity.ts:277` |

So the header count is **not computed in the frontend at all** (Pattern 2: the frontend renders what the backend says). Where the DB function
`LinkedElementCount` counts from is **not in any repo this session can read** (`PostgreSQLDatabase` is out of scope), so whether it includes
soft-deleted links is **unverified**.

## Hypotheses, each as a prediction one query can falsify

- **H1 (leading, Pattern 1, ghost models):** MV-1350 holds links to elements that exist in metadata but not in geometry, and the models listed are
  ones whose metadata claims them (the PC-EXCEL cross-write seen on ATL08 under PLT-2909/DPL-1684, 07-23). *Prediction:* the geometry oracle
  (`element_base_data` anti-join on the activity's links, recipe in Pattern 1) returns a large number of links with no geometry row, and the
  models in the pop-up show `inParquet > 0, inGeometry = 0`. *Falsified by:* the oracle returns about zero.
  Caveat from Pattern 1: ATL08 is a Revit-mapped project, so the artefact oracle can flag everything; use the viewer diagnostic or the harvest
  script there (Pattern 1, "Validate before trusting it").
- **H2 (count includes soft-deleted links):** PLT-3101 measured `GET /projects/{id}/activities/{activityId}/links` returning live plus deleted
  (835 + 2,200 = 3,035). If `LinkedElementCount` has the same blind spot, a heavily relinked activity shows an inflated count. *Prediction:* live
  `isDeleted = false` rows for MV-1350 are far fewer than 6,350 and live plus deleted is near 6,350. *Unknown* whether the DB function filters; only a read of
  that function or the query settles it.
- **H3 (the links are real, over-linked by a selection expansion):** the 09-10 note on PLT-3099 found `selection-service.ts:380-393` expands unmapped
  parent nodes to all their children with no model-type gate. If MV-1350 was linked in a bulk action the 6,350 are real links. *Prediction:*
  live links equal 6,350 and `createdAt` clusters in one action. *Against H3:* the customer says several listed models hold **none** of the elements,
  which a real over-link would not produce (the elements would sit in those models). Treat H3 as the weak one.
  The 09-09 lesson on PLT-3099 applies: code reading is not evidence, nothing here has been observed failing.

## Relationship to other tickets

- **PLT-2909 / DPL-1684** (ATL08, CY-5200, ghost model `DistributionBoardsPanels_Bld1-V1`, PC-EXCEL cross-write, same customer). Moved to the DPL
  board 08-18 on Ali's "not sure about the root cause but will investigate". **DPL-1684 now shows Done** (Jira `updated` 10-14 22:02; assignee
  Pavithra Nagaraju; last comment 09-04 is Yash's Freshdesk "Closed"). **No comment on it ever states a root cause or a fix.** So the cross-write
  question put to Ali on 07-23 appears unanswered in writing. This is the most important fact in this folder: a same-project, same-customer, same-symptom
  report arrives one day after the earlier ticket reads Done with no recorded cause.
- **PLT-2882** (FAR01, Done 09-24): the frontend half ("hide models the geometry cannot back") was meant to ride on it. Not verified that it
  shipped; the code above still builds the model list from metadata with no geometry filter, so **if it shipped it did not touch these call sites**.
- **PLT-3112** (HITT AUS01, In Code Review): the Model Details panel counts, fixed by PR #2211 (`86d9be042`, merged 10-07) which bounds link counts to
  elements loaded in the viewer because "`project_element_list` can hold stale/extra rows for a model". Same family, **different surface** (per-model
  panel, not the activity header), and not in any release tag (`git tag --contains` empty; latest tag `v26.3.7`). It will not change MV-1350's header.
- **PLT-3099 / PLT-3100** (ATL08 CY-1300 over-link, Done): different symptom (links moved between activities).

## Verified vs inferred

Verified: ticket text and comments; the three code paths above; DPL-1684 status and its comment history (read live); #2211 contents and that it is untagged.
Inferred: that this is Pattern 1; that the DB count is not geometry-bounded.

## What remains unverified

- The actual live and deleted link counts for MV-1350, and how many have no geometry. **One prod read decides H1 vs H2 vs H3.** Needs the prod MCP
  (`prod-mcp-access.md`, credentials per session, none in this routine) or the editor diagnostic on ATL08.
- Whether MV-1350 is one of the activities touched by the ATL08 PC-EXCEL cross-write.
- Whether anything changed in ATL08 metadata when DPL-1684 went Done.
- The DB function behind `LinkedElementCount`.
- Which of the three surfaces the customer's "6350" is read from (video).

No Jira action was taken.

---

## 2026-10-20 run — left scope: moved to With Technical Support after Ilia's reply (additive)

Re-fetched, 3 comments, newest `115960` (Ilia, 10-19 18:37): not a calculation error; **MV-1350 has 6,995 linked elements, most linked in April, only 851 on 14 Oct**; the models look empty because the same
elements sit in several models and those are not loaded; suggestion: unlink the April links if the customer does not need them. Status is now **With Technical Support** (out of scope), so the customer owes the answer.
**Not verified here:** the 6,995 / 851 figures (Ilia's prod read) and the "models not loaded" explanation. The customer's own claim was 6,350, so 6,995 is also a *higher* number than the customer reported;
the reply explains the cause but not why the customer saw 6,350. Minor, worth one line if the customer pushes back. No Jira action was taken.
