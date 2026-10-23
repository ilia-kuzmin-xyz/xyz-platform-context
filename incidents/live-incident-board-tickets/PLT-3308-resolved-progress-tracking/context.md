# PLT-3308 — "TXE10 GC HP Filter Inaccurate Progress Metrics" — triage context

First folder for this ticket (2026-10-20 scheduled run). Group A (**In Analysis**, assignee Ilia), domain **progress-tracking**. The ticket was created and analysed by Ilia on 10-19,
so this run adds a code-side check of his finding and a list of what is still unmeasured; it does not replace his analysis.

## Ticket (fetched live 2026-10-20, 3 comments, newest `115934`)

- Jira: https://xyzreality.atlassian.net/browse/PLT-3308. Live Incident, Major, created 10-19 11:16, reporter Yash. Freshdesk 8333, *Waiting on 3rd line* since 10-19 11:18. Project **TXE10**.
- Customer (description): with the **GC filter set to HP**, the headline top-left "does not make sense": 160k elements, 133k installed, 27k pending, but "1% actual and 3% planned".
- `115875` Yash: expected actual about **83.13%** (133k of 160k), planned "90%+"; observed **1.07% actual vs 1.69% planned**; the numbers do not change when status filters change.
  Note the two sets of observed figures disagree (description 1% / 3%, comment 1.07% / 1.69%), probably two screenshots.
- `115934` Ilia (10-19 15:19), the analysis: not a calculation error. The headline is not based on element statuses, it is based on **progress of the schedule activities the elements are linked to**.
  With Gc = HP, **99.8% of elements are linked to 6 Level of Effort activities** (Interior Rough-in, PEMB Structure, Foundations, ...). LOE activities get no progress, so their installs count 0%.
  Only **346 elements** sit on normal milestones, showing 91 to 100%, hence about 1%. Status filters do not move the headline for the same reason.
  Asks **@Mostafa** to confirm LOE is excluded on purpose (as for custom progress in the editor), and suggests the customer link elements to Task or Milestone activities.
- **Who waits on whom:** Mostafa owes a confirmation since 10-19 15:19 (about one day). Yash waits for the answer to relay. The customer has had no explanation yet (as far as Jira shows).

## Unopenable media

- Three Freshdesk screenshots named in the description (`Screenshot 2026-10-16 173123 / 173001 / 172844.png`, ids `103357189841`-`103357189843`); the Jira attachment list is **empty**, so there is no Jira attachment id to fetch.
  **They would settle:** which filters were set (only GC = HP, or others too), whether the 1.07% / 1.69% pair or the 1% / 3% pair is what the panel shows, and whether the date range was the default.

## What the code does (hc-frontend `d69968e`, 2026-10-19 21:32)

Read only; nothing measured. This confirms the **shape** of Ilia's finding, not his numbers (those came from a prod read this session cannot repeat).

1. **The headline is an average of schedule-activity progress, weighted by the project's weighting method, not a count of installed elements.** `progress-queries-v2-api.ts:190-192` maps
   Budgeted labour units to `TotalPlannedLaborUnits` and everything else (Model element count, which TXE10 uses per PLT-3306) to `TotalLinkedElements`. The package-level aggregate is
   `SUM(weight * actual) / NULLIF(SUM(weight), 0)` (`:454-464`), restricted by `AND weight > 0` and by the category filter (`ActivityCategoryId IN (...)`, `:200-201`, `:417-422`).
   Weight is the count of linked elements, so **an activity with many linked elements and 0% progress dominates the average**, as Ilia says.
2. **Status filters are not in this query.** `progress-queries-v2-api.ts` contains no status predicate at all (grep for "status" returns nothing), so changing the installation-status filter cannot move
   this headline. This matches Yash's observation. Caveat: the service has a separate **activity-level** branch (`dashboard-progress-service.ts:1255-1280`) selected when activity ids are in play; which branch TXE10's
   GC = HP view takes was not traced.
3. **LOE progress arrives from the API already as 0 actual and blank planned.** Documented for PLT-3091 (`dashboard/progress-tab.md`, 2026-08-31 correction 2): the API blanks `plannedProgress` for `TT_LOE` and sends
   `actualProgress: 0`. Under the formula in point 1 a blank planned value drops out of the numerator while the element weight stays in the denominator, so **planned is dragged down too**, which fits planned (1.69%)
   being low but not zero. Inferred from that one document and the formula; the package-level aggregates are computed backend-side and were not read.
4. **Why "LOE excluded" is not the clean fix it sounds like (not in the message).** Excluding LOE from the weight would make the HP headline rest on the **346 elements** that are not on LOE, about 0.2% of 160k,
   and those show 91 to 100%. The headline would then read about 91 to 100% for a view where 99.8% of elements sit on activities that carry no progress. Neither the current 1% nor that 91-100% describes the
   project. This is why the practical answer (link elements to Task or Milestone activities) is the one that fixes the customer's number, and why a product question about a **warning** may be worth asking later.

## The arithmetic does not close yet (found this run, important before anything reaches the customer)

Ilia's figures reproduce to roughly **0.2%, not 1.07%**, under the element-count weighting of point 1:

- 346 elements on normal milestones at 91 to 100% (say 95%) and the other 99.8% at 0%: `346 x 0.95 / ~173,000 = ~0.19%`. With the customer's 160k: `346 x 0.95 / 160,000 = ~0.21%`.
- Observed actual is **1.07%** (comment `115875`; the description says "1%"). That is about **5x** the prediction. Needed to get 1.07% from a 95% slice: a slice of about 1,100 elements-equivalents of weight
  out of 160k, or a total weight of about 31k.
- So at least one input is not what the explanation assumes. Candidates, each a prediction one read can falsify: (a) **weight counts links, not distinct elements** (an element linked to several activities contributes
  once per link, `TotalLinkedElements` is per package/activity row), which would inflate the non-LOE slice; (b) the HP slice is about 31k elements and the customer's "160k" is the whole project or the unfiltered total;
  (c) the headline averages **package** progress not weighted purely by elements; (d) some LOE-linked activities do carry a non-zero progress.
- The qualitative explanation (LOE carries no progress, so the headline is dominated by zeros) survives all four. **What does not survive yet is "hence about 1%".** The reconstruction mechanism is the same
  family as the 09-09 PLT-2874 lesson (a number reproduced from a join, not from the predicate that produces it): the formula here is read from source, but not yet reproduced against the surface's own figure.

**Cheapest closing test (one read):** for Gc = HP, list activities with `TotalLinkedElements`, actual progress and activity type; compute `SUM(w x actual) / SUM(w)`. If it returns 1.07%, the explanation is complete and the
figures can be quoted. If it returns about 0.2%, the surface is doing something the formula above does not describe, and (a) to (d) say where to look.

## Cross-reference: PLT-3306 (same project, same day, same filter, now Ready For QA)

PLT-3306 (TXE10, disciplines with no linked elements listed under a filter) was diagnosed by Ilia as filtered queries counting activities with no linked elements as if they had one; hotfix goes in **26.4.1**
("planned to go to QA today"). It concerns the **category list**, and 3308 concerns the **headline**; no shared mechanism is established. But both are TXE10 with a Gc filter on the same screen.
**Cheap check, falsifiable:** after 26.4.1 reaches prod, re-read the HP headline. Prediction if the two are independent: still about 1%. If it moves, 3306's fix touched this path and the explanation to the customer
needs rewriting before it is sent.

## Verified vs inferred

Verified: ticket text and order; weighting-method mapping; aggregate formula; absence of any status predicate in the V2 query file.
Inferred: that TXE10 is on the package/project-level branch for this view; that planned is dragged down by the blank-planned-in-denominator effect; Ilia's 99.8% / 6 LOE / 346 elements figures (his prod read, not repeated).

## What remains unverified

- **The 1.07% itself: the figures above predict about 0.2% (see the section on arithmetic).**
- The 99.8% / 6 / 346 figures, by an independent source. Per the 09-03 rule a number the customer will act on gets a second source before it is sent; the customer would be asked to relink a very large share of 160k elements.
  Cheapest second source: the Gc = HP elements grouped by activity type, read from the project's schedule export.
- Which of 1% / 3% and 1.07% / 1.69% the panel shows (screenshots 403).
- Whether the customer's schedule really treats these 6 activities as LOE in P6, or the API's LOE flag is wrong (api-v2 has not confirmed the rule; 10,961 of 10,961 on ATL05 and ATL08 agree).
- What Mostafa decides.

No Jira action was taken.

---

## 2026-10-23 run: LEFT SCOPE, In Code Review (10-22 17:33). Folder renamed `resolved` (additive)

Re-fetched, 5 comments. New: `116157` Ilia (10-22 12:08): **a warning will be added when linking to Level of Effort activities (PLT-3355); until then the customer should link the HP elements to Task or Milestone activities.** `116158` Yash: will ask the user.
**PLT-3355 is open PR #2378** in hc-frontend ("Warn when linking elements to Level of Effort activities", not draft, updated 10-22 17:17); not merged, in no tag. Mostafa never replied in the ticket; the LOE-excluded-on-purpose call was taken by Ilia (`116157`), so it is a decision recorded, not a product-owner confirmation.
**Still unverified (carried from 10-20, unresolved by this exchange):** the panel showed 1.07% but Ilia's own figures predict about 0.2%. The ticket was closed out on the LOE explanation without that gap being measured, so the customer-facing number remains "about 1%, in kind". The warning does not change the headline for existing links; it only prevents new ones. Customer now owes the relinking to Task or Milestone activities. No Jira action was taken.
