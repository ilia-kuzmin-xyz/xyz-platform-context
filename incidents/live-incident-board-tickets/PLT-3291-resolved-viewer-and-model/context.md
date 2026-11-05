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

---

## 2026-10-21 run — back in scope as Open, Freshdesk Waiting on customer (additive)

Re-fetched, 6 comments, newest `115972` (Yash, 10-20 10:30). Freshdesk 8300 toggled Waiting on customer, Open, Waiting on customer (`115967`, `115968`, `115972`) between 10:14 and 10:30 on 10-20: Yash sent Ilia's explanation to the customer, who now owes a reply (unlinking the April links, or confirming they need them). **Jira status is Open again** (was With Technical Support on 10-20) although the ball is with the customer; it shows up in scope because of that.
Nothing new in kind. The residual from 10-20 stands (the customer saw 6,350, Ilia measured 6,995; not explained). No code or master change touches this (`9699aa5`).
Class 1, parked on the customer. See `recommended-action.md` 2026-10-21 note. No Jira action was taken.

---

## 2026-10-23 run: status now With Customer; no new comments (additive)

Re-fetched, 6 comments, newest `115972` (Yash, 10-20 10:30). Jira status moved to **With Customer** (`updated` 10-22 11:08), which is the housekeeping suggested on 10-21, so that note is done. Customer owes a reply to the "unlink the April links" suggestion; Freshdesk 8300 Waiting on customer for three days. The 6,350 versus 6,995 gap is still unexplained. Attachment list is empty in Jira (screenshot is a Freshdesk link, video is SharePoint; both unopenable). hc-frontend master `326e1f5`: #2369 (selection and link actions, 10-22) touches link query code (`use-link-queries.ts`) but not the activity header count; not read in depth and not relevant until the customer replies. Class 1, parked on the customer. No Jira action was taken.

---

## 2026-10-26 run: customer replied 10-23, count accepted, model list is the remaining complaint; ticket back at Open with Ilia (additive)

Re-fetched, 9 comments, newest `116307`. `116306` (Yash, 10-23 11:17): customer wrote *"Indeed the number of elements appears to be correct. However please have a look to the models that they appear once I click to linked elements. Several models such as, containment, security, data devices etc. appear even though there is no element in this model linked to the activity with ID: MV-1350."* Freshdesk 8300 reopened 10-23 11:14, then Waiting on 3rd line. **Jira status is Open again (the 10-22 With Customer was overwritten by the Freshdesk automation), so the ball is with us.** Supersedes the 10-23 note "parked on the customer".

**What this changes.** The 6,350 vs 6,995 residual is closed by the customer himself ("number appears correct"); drop it. The open question is now only the **model list**.

**Verified on master `16b41bb` (no change to these files since `326e1f5`):** `useGroupedLinks.ts:63-76` buckets each linked element under *every* model its entity belongs to (`element.getModels()`), with no geometry or loaded-model check; `element-entity.ts:38-42` resolves model ids from the element's metadata membership. So the list names a model whenever a linked element's metadata says it belongs there, whether or not that model draws it or is loaded.
**Not verified:** that this is what the customer sees (screenshot and video unopenable); whether the models he names are loaded in his viewer; whether the elements really have geometry in those models. That is Pattern 1 (ghost models) against "working as designed, same element in several models", and one yes/no from the customer separates them: were those models loaded.
Ilia's 10-19 explanation ("same elements sit in several models, those models are not loaded") predicts **not loaded**; Pattern 1 predicts **loaded and empty**.

Class 1 (Ilia owes Yash), with a class-4 tail: if the models are loaded and empty, it is the PLT-2882 / DPL-1684 ghost-model family and needs a product call on hiding models the geometry cannot back. No Jira action was taken.

## 2026-11-02 — parked With Customer (Yash, 10-30 14:01 UTC); nothing owed by Ilia
Last Ilia comment `116628` (10-27): the models do contain the MV-1350 elements (Containments and Data Devices each hold the same 800 conduits and fittings as the conduit model, Security holds 4), so the link shows in every model that element is in; suggestion to re-export those models without the conduits. Yash then set Freshdesk 8300 to Waiting on customer and the Jira status moved With Technical Support to With Customer. 11 comments, none new from the customer. Screenshot and SharePoint video still not openable. The 10-27 claim is Ilia's own reading of the data, not re-measured this run.

## 2026-11-03 — customer replied again (11-02); ownership is now Rishi's; back In Analysis
Changelog: Yash set Freshdesk 8300 Open (`117334`, 11-02 15:23), then tagged **Rishi** (`117341`): the customer sent a new video and wrote *"I cannot identify the elements you mentioned in several models after selecting or isolating based on the activity."* Freshdesk Waiting on 3rd line. Assignee is Rishi, status In Analysis. 14 comments. New video is a SharePoint link, not openable here (403 class).
**Reading.** Ilia's 10-27 answer (`116628`) was a statement about *membership* (Containments and Data Devices hold the same 800 conduits and fittings, Security holds 4). The customer's reply is about *geometry*: when he isolates by activity he sees nothing in those models. Both can be true: `useGroupedLinks.ts:63-76` lists a model for every model the element's metadata belongs to, with no check that the model draws it. That is Pattern 1 (ghost model) against "as designed", and it is now **the same open question as 11-02**, with a customer who does not accept the explanation. Not re-measured here. Not verified: whether the models were loaded in his session; whether those elements have geometry in those models.
hc-frontend master `df10c33` (11-03): no change to `useGroupedLinks.ts` or `element-entity.ts` in the last commits (Vite migration, CI sharding, docs).
Class 1 (Rishi owes the next move), class-4 tail if the models are loaded and empty (product call on hiding models the geometry cannot back; DPL-1684 / PLT-2882 family). Ilia owes nothing; an optional hand-off is in `recommended-action.md`. Nothing posted or moved in Jira.

## 2026-11-04 — ANSWERED by Rishi (11-03 14:18 UTC, `117428`); fix PR #2446 open; moved to Group B (Dev In Progress). Supersedes the "loaded and empty, Pattern 1" prediction as the explanation
Re-fetched, 15 comments, assignee Rishi, status **Dev In Progress** (was In Analysis). Rishi to Yash: the count is right; the real cause is the **model converter, DPL-1708**. When Containments, DataDevices and Security were converted, the conduits from the conduit model were included in their *data* although their 3D views do not draw them, so the models are listed under MV-1350 but selecting or isolating shows nothing. Interim: **hc-frontend #2446**; re-exporting those models without the conduits also clears it.
**How it maps to the earlier readings.** Ilia's 10-27 membership figures (800 / 800 / 4) were right and are reproduced in the PR text ("Containments and DataDevices each show 800 under Not in this model version"). The customer's geometry observation (11-02 video) is also right: the data holds the elements, the geometry does not draw them. So the model *was* "loaded and empty", but the mechanism is the converter (property data without geometry), not a stale link; it is the DPL-1684 / PLT-2882 ghost-model family, now with a named root-cause ticket (DPL-1708, also the cause cited on PLT-3112).
**PR #2446 (open, not draft, labels ready/l, 559 added / 155 deleted, 17 files, CI green on `f3120af9`, mergeable_state blocked = awaiting review).** `resolveLinkedDbIds` (`linking-provider/resolve-linked-db-ids.ts`, new) resolves each linked element through its own model's mapping; the panel (`useLinkedElementsTreeData.ts`) and the schedule's Select / Isolate (`use-linked-element-actions.ts`) now share it; a loaded model's linked elements that it does not draw are listed under a greyed "Not in this model version" group with an amber count, Unlink only (`linked-node.tsx`, `undrawnGroup.ts`). It also deletes `ViewerService.elementId2ModelId` / `elementId2DbId`, the global maps where "last model mapped wins"; the PR says that made Select linked elements select nothing when models sharing element ids were loaded. That is a **second defect** nobody had raised on this ticket. **Ilia is a requested reviewer** (with Tom, Darminder, Sergiusz); no review from Ilia yet. Copilot's three medium findings were resolved by 16:09 on 11-03; one low finding open (F14, `buildUndrawnGroup` has no test).
**Not verified here:** the PR was read, not run; "Select linked elements selects 1,694 on MV-1350" is the PR author's claim; that the customer will accept "Not in this model version" as the answer; whether DPL-1708 has a date.
Group B: one line. Owed by Ilia: **the review of #2446** (a GitHub action, not Jira). Nothing posted or moved in Jira.

## 2026-11-05 — hc-frontend #2446 MERGED 11-04 11:58 UTC (Rishi); Jira now Ready For QA (11-04 12:00). Left scope. Folder renamed `resolved`
Verified from GitHub: #2446 `merged: true`, merged by rishib-xyz, 2 commits, 17 files, requested reviewers at merge were Tom, Darminder and Sergiusz (Ilia not among them). Merge commit on master `8058537`. **The "review #2446" item owed by Ilia (11-04 note) is therefore void**; nothing is waiting on him. The PR itself says it does not make the un-drawn elements draw: root cause stays converter DPL-1708. Not in a release tag yet (not checked with tags unshallowed; master only). Residual for QA: the PR's repro needs XYZ Rewind and the SWITCH ATL08 project; whether QA has it is not known. No Jira action was taken.
