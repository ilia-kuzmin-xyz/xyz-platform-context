# PLT-2931 — "Containment package should be 100% but is not on dashboard" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2931
- **Issue type:** Live Incident · **Status:** **In Analysis** · **Priority:** Major
- **Project (site):** **ELN03**
- **Reporter (client):** **Thomas**, relayed by **Yash Patel** (support/coordinator) · **Assignee:** **Ilia Kuzmin**
- **Created:** 2026-07-24 · Freshdesk **#7509**, set "Waiting on 3rd line" (i.e. back on us)
- **Attachments:** 2 × PNG (Yash) + 1 × CSV query output (Ilia) — none readable here, see NEEDS HUMAN
- **Domain slug chosen:** `progress-tracking` — deliberately the **same slug as PLT-2882 and PLT-2909** so the family sorts together (README § Cross-ticket notes convention). Justified below: unlike its siblings the failing surface here really *is* the Progress dashboard, not the viewer.
- **Activities named:** `KUPSB21200`, `JSCOR1060`, `JUPSA21030`, `KUPSD21420`, `JUPSC21480`

---

## One-line symptom

On the **ELN03 Progress dashboard**, the **Containment** package does not read 100% even though the client (Thomas) has claimed all five of its outstanding activities at 100% and all five are linked to models. Five activities sit between **49.33%** and **98.15%** and will not move.

**This is the first member of the PLT-2882 family whose symptom is a wrong *number on the dashboard*, not a broken *interaction in the viewer*.** PLT-2882 = "select/isolate returns nothing"; PLT-2909 = "wrong models listed"; PLT-2931 = "progress % capped below 100". Same defect, third surface.

---

## What makes this ticket procedurally different from PLT-2882 / PLT-2909

**PLT-2931 arrives pre-diagnosed, with data.** PLT-2882 needed root-causing over six days and a purpose-built console diagnostic; PLT-2909 needed a code-read to decide whether it was even the same family. PLT-2931 was reported at 13:32 and root-caused with a per-activity query output the same evening (20:10). The mechanism is **not in question** here.

The consequence for triage: **the only open question on this ticket is an approval, not a diagnosis.** Ilia has requested @Pietro Desiato / @Mostafa Kamel Hussien sign-off to soft-delete 193 dead links, and as of the comments available there is **no reply**. See `recommended-action.md` — the drafted action is a **status nudge / approval chase**, which is a different *kind* of action from the two siblings (both of which drafted a diagnostic step).

---

## Chronology

| When | Who | What |
|---|---|---|
| 2026-07-24 | Thomas (client) | *"Activities KUPSB21200, JSCOR1060, JUPSA21030, KUPSD21420, JUPSC21480 all linked to models. I have claimed them at 100%. Not showing completed."* |
| 07-24 13:32 | Yash Patel | Reproduces and pre-attributes: *"the activities … have elements that are still linked but don't have geometry. **Similar to PLT-2658**."* Attaches ticket screenshot + his own investigation screenshot. |
| 07-24 13:33 | Yash Patel | Freshdesk #7509 → "Waiting on 3rd line". |
| 07-24 20:10 (ed. 20:12) | **Ilia Kuzmin** | *"Confirmed with data"* — posts the per-activity dead-link table (below) + CSV, states installed/linked == dashboard % exactly, names PLT-2882 / PLT-2909 as the same family, **requests approval from Pietro + Mostafa** to soft-delete the 193 links. |
| 07-24 20:12 → now (07-27) | — | **No approval reply visible. ~3 days silent.** |

Note Yash reached the correct mechanism *before* Ilia's data run, and cited **PLT-2658** — a ticket **not** in this board folder and not previously seen by this routine. Worth pulling; it may be an earlier instance of the same family than FAR01 (see NEEDS HUMAN).

---

## Ilia's data — independently re-checked (arithmetic verified here)

| Activity | Linked | Installed | Dead links | Dashboard % | `installed/linked` recomputed | `linked − installed` |
|---|---|---|---|---|---|---|
| KUPSB21200 | 122 | 88 | 34 | 72.13 | 88/122 = **72.131%** ✓ | 34 ✓ |
| JUPSA21030 | 225 | 111 | 114 | 49.33 | 111/225 = **49.333%** ✓ | 114 ✓ |
| KUPSD21420 | 152 | 111 | 41 | 73.03 | 111/152 = **73.026%** ✓ | 41 ✓ |
| JUPSC21480 | 113 | 110 | 3 | 97.35 | 110/113 = **97.345%** ✓ | 3 ✓ |
| JSCOR1060 | 54 | 53 | 1 | 98.15 | 53/54 = **98.148%** ✓ | 1 ✓ |
| **Total** | **666** | **473** | **193** | — | 473/666 = 71.0% | **193** ✓ |

Every row is internally consistent: the dashboard % is exactly `installed / linked` to 2 d.p., and `dead links = linked − installed` in all five rows, summing to the stated **193**. The table is self-corroborating even without the CSV — the CSV is the audit record, not the load-bearing evidence. (Confidence in the table's internal consistency: **9/10**; in the underlying query being correct: see NEEDS HUMAN.)

---

## Mechanism (code-verified) — why a dead link caps an activity below 100% forever

All refs under `hc-frontend/src/main/webapp/app/`.

### 1. The per-activity % on the dashboard is read verbatim from a backend parquet — the FE computes nothing

The Gantt/schedule row's actual % is `ActualProgress` **selected straight out of the `activity_progress` parquet**, aliased to `ActualPercent`:

- `pages/organisation/ViewerPage/components/services/dashboard-schedule/dashboard-schedule-service.ts:455-495` — `COALESCE(p.ActualProgress, 0) as ActualPercent`, joined from a `progress_delta` CTE over `FROM activity_progress` (`:460`).
- The activity-level aggregate query does the same: `components/services/dashboard-progress/utils/progress-queries-v2-api.ts:689-735` — weights and progress both come out of `activity_progress` columns (`ActualProgress`, `LinkedElements`, `PlannedLaborUnits`).

**There is no frontend code that divides installed elements by linked elements.** The `installed/linked` ratio Ilia measured is computed **backend-side** (progress pipeline / dagster) and shipped as `ActualProgress`. The FE is a **faithful renderer** — the recurring shape the board README already names for PLT-2874 / PLT-2884 / PLT-2917.

### 2. The Containment package % is a weighted mean of those activity numbers

- `progress-queries-v2-api.ts:511-590` (`getCategorySummaryV2API`): reads `category_groups`, picks the **single latest `CalendarDate`** in range (`:531-551`, `:577`), then
  `SUM(weight × actualProgressCol) / NULLIF(SUM(weight), 0)` (`:565-570`), `× 100` at `:585`.
- Weight column: `TotalPlannedLaborUnits` (default) or `TotalLinkedElements` when the user picks element-count weighting — `:511-517`. Default method is **`PLANNED_LABOUR_HOURS`** with `actualProgressColumnName = 'LaborWeightedActualProgress'` (`types/progress-weighting-types.ts:17-23`).
- Row types confirming those parquet columns: `progress-queries-v2-api.ts:33-51` (`CategoryGroupsRow`).
- Guard: `AND ${weightColumn} > 0` (`:578`) — a category with zero weight is dropped, not shown as 0.
- Matches `xyz-platform-context/dashboard/progress-tab.md` § Progress weighting (`SUM(weight × progress_delta) / SUM(weight) × 100`) and § Calculation modes (package mode ← `category_groups`). **Docs and code agree; no doc correction needed.**

Because it is a weighted mean, **Containment reads 100% iff every contributing activity reads 100%** — see the caveat below.

### 3. The denominator counts *link rows*, and nothing in the read path checks geometry

- `LinkedElements` (parquet, `progress-queries-v2-api.ts:655-661`) and `linkedElementCount` (Activities API, `services/scheduleService/schedule-api-service.types.ts:36`, loaded at `dashboard-schedule/loaders/api-activities-loader.ts:105,128`) are both **backend counts of link rows**, surfaced unmodified.
- No geometry intersection exists anywhere on this path. The only geometry-aware structure in the product is the viewer's `elementId2DbId` map, which PLT-2882's log documents as the **intersection** of loaded SVF externalIds and the `client-element-metas` parquet (`model-mapping-service.ts:372-384`) — and it is used for **selection/colouring**, never for progress arithmetic.
- The element→installed side is judged purely from `installationStatus` + schedule dates: `dashboard-progress/utils/installation-status-sql.ts:38-68` (`buildInstallationStatusCaseSql`). An element with **no geometry can never be marked installed** — nobody can click it in the viewer to set `INSTALLED_ACCURATELY`.

**Net mechanism:** a link row pointing at an element that exists in metadata but not in geometry is **counted in the denominator and can never enter the numerator**. Each such link permanently subtracts `1/linked` from the activity's %. 193 of them cap Containment below 100% no matter how correctly Thomas claims the work. Ilia's "the claiming was correct, the links are dead" is exactly right, and the code path supports it end to end.

**This is the same PLT-2882 defect (metadata parquet retains a generation of elements the geometry no longer has) expressed through the progress denominator instead of the viewer selection.**

### 4. Corollary — no frontend change can fix the number

Since the % is a backend parquet value, **there is no FE fix for this ticket**. The data fix (delete the dead links → pipeline recomputes) is the only thing that moves the number. The FE robustness item inherited from PLT-2882 ("surface N of M linked elements are not in the loaded model") remains real but is **cosmetic with respect to PLT-2931** — it would explain the shortfall to the user, not remove it.

---

## The soft-delete fix — what actually exists in the codebase today

Ilia's phrase *"same endpoint and audit trail as PLT-2882"* resolves to **pre-existing product code**, not to a PLT-2882 deliverable. Verified:

- **Endpoint:** `services/elementService/element-api-service.ts:39-41` —
  `deleteActivityLinks(projectId, links)` → `POST /projects/{projectId}/elements/activity-links/delete`, body = `IElementActivityLinkPayload[]` (`{ modelElementId, activityId }`).
- **Caller / batching:** `ViewerPage/services/linking/linking-service.ts:305-320` (`removeLinks`) chunks into batches of `batchSize = 500` (`:59`). This is where PLT-2882's "≤500/batch as the FE does" comes from.
- **Soft-delete confirmed in code:** the sync path receives links back with an `isDeleted` flag and routes them to `linksToDelete` rather than dropping the row (`linking-service.ts:209-242`, flag test at `:222`, applied via `elementStore.syncActivityLinks(...)` at `:242`); the bulk load path filters them out client-side (`:110`). **Link history is retained server-side** — which is what makes Ilia's "reversible" claim credible.
- **Authority required:** `AUTHORITIES.ELEMENT_DELETE = 'ElementDelete'` (`config/constants.ts:232`), granted in the role bundles at `:338` and `:428`.

### ⚠️ Explicitly: PLT-2882's fix is NOT in the codebase

`grep` across `hc-frontend` for `PLT-2882`, `PLT-2909`, `PLT-2658`, `PLT-2931`, `__linkDiagnose`, `linkAudit` returns **zero matches**, and the branch `PLT-linked-selection-diagnostics` named in PLT-2882's investigation log is **not present in this checkout** (branches: `master`, `claude/vigilant-franklin-qw197j`). `git log` on master shows no PLT-2882/2909 commit.

**Do not read "same endpoint and audit trail as PLT-2882" as "the PLT-2882 fix shipped and we're reusing it."** PLT-2882's own log ends with *"deletion pending peer alignment"* — its 418 links were exported to CSV but, on the evidence available, **never deleted**. The reusable asset is the *method* (call the existing unlink endpoint with a verified list, keep the CSV as the audit record), not shipped remediation code. This matters for the approval ask: **Pietro/Mostafa are being asked to approve the family's first actual deletion, not to rubber-stamp a repeat of one already done.** That alone plausibly explains three days of silence.

---

## Relationship to the family — ELN03 is the third confirmed project

| Ticket | Project | Surface | Status of attribution |
|---|---|---|---|
| **PLT-2882** | APLD / **FAR01** | Viewer: select/isolate linked elements → 0 | **Confirmed** 07-14 by `__linkDiagnose` (418 links, `inParquet: 418 / inGeometry: 0`, twice, cold cache) |
| **PLT-2909** | **ATL05-08** (repro ATL08) | Viewer: linked-models list inflated ("ghost models") | Same family, **8/10 on mechanism, 5/10 on ATL08 attribution** — diagnostic not yet run |
| **PLT-2931** | **ELN03** | **Dashboard: progress % capped** | **Confirmed with data** 07-24 (193 dead links, per-activity, ratio matches to 2 d.p.) |

Two things this adds to the cohort picture:

1. **Attribution quality is now higher on the third ticket than the second.** PLT-2909 was written up as "same family, needs its own data confirmation." PLT-2931 *has* its own data confirmation. A reasonable consequence: PLT-2931's evidence **does not retroactively confirm ATL08** (different project, different model family), but it does move the family from "one confirmed project + one suspected" to **"two confirmed projects on two different sites + one suspected"** — which strengthens the systemic reading considerably.
2. **The failure surfaces are now three, spanning two pages.** FAR01 and ATL08 broke *interactions* in the ViewerPage; ELN03 breaks a *reported number* on the Dashboard. That escalates the business impact class: a broken viewer interaction is annoying, a wrong % on a package the client reports upward is a data-trust problem (the same category PLT-2385 flagged as "business-critical … client is accepting XYZ data as 100% accurate").

### The fourth relative nobody has connected yet — PLT-2385 / PLT-2650

`PLT-2385-groupB-data-pipeline/context.md` (HITT DC10, **Critical**, Ready For Development since Jan) is the **same consequence** — *stale links inflating the element count → inflating XYZ % Complete → inflating XYZ Hours*. Its own thread already contains the mechanism statement that explains why the PLT-2882 family exists at all:

- **Rishi Bhugobaun, 2026-01-28:** *"If these elements were present in a previous model version, and had been linked, the link will have persisted as **links are not yet removed when a model or its elements are** [removed]."*
- **David Webb (BE/dagster), 2026-04-15:** *"When a model is deleted, after a couple of minutes **dagster will regenerate `project-element-list.parquet`. Any links to elements no longer in that list are removed.**"*

**Those two comments, read against PLT-2882's confirmed data, are the whole systemic bug in one line:** an automatic dead-link cleanup **does** exist, but it decides what is dead by consulting **`project-element-list.parquet` — the metadata artefact that PLT-2882 proved still lists the dead generation**. The cleanup therefore cannot see geometry-side removals, which is precisely PLT-2882's `inParquet: 418 / inGeometry: 0`. PLT-2882's log reached the same conclusion from the other direction (*"his auto-unlink point supports the RCA: that step reads the element list, which still contains the 418 — exactly why auto-unlink missed them"*), but it was framed as answering one developer's pushback, not as identifying the defective component. **It is the defective component.** Also note PLT-2385's interim remedy was *"unlink these elements … a manual data fix, not a code change"* — i.e. exactly what Ilia is asking approval for, already precedented and accepted on another project six months ago.

---

## Should these be one cross-cutting backend defect rather than N incident tickets?

**My take: yes for the *cause*, no for the *tickets*. Split the family into one backend defect ticket plus per-project remediation tasks — do not merge the incidents.**

**The case for one defect (strong).** Four projects across three clients (FAR01/APLD, ATL05-08, ELN03, DC10/HITT), one mechanism: *link lifecycle is reconciled against the element-metadata artefact, which is not itself reconciled against geometry on re-upload/re-export.* Two of those are now data-confirmed. Every per-ticket remedy so far has been the same manual soft-delete, each needing its own approval round — that is a cleanup process being re-litigated per project, which is the definition of a missing systemic fix. The two open questions the family keeps deferring are identical everywhere and are **both backend**: (i) why does the metadata artefact retain elements the geometry dropped on re-export, and (ii) why does the auto-cleanup trust that artefact. Neither is answerable per-ticket. There is also already a home for it — **PLT-2650** ("handle links on model deletion", Rishi, 2026-05-06) — though PLT-2650 as scoped covers *model deletion*, and this family's cases are *re-upload/re-export with the model retained*, so it likely needs widening rather than reuse.

**The case against merging the incidents (also strong).** Each PLT ticket carries a named client, a Freshdesk thread, and a distinct user-visible symptom on a distinct surface; folding ELN03 into a backend defect ticket would strand Thomas's Containment package behind a pipeline fix that has no ETA and, in FAR01's case, has been open 18 days. The three symptoms also need different verification (viewer selection / model list / dashboard %) — one ticket cannot hold three acceptance criteria against three clients. And the remediation is genuinely per-project: each needs its own verified deletion list.

**Concrete recommendation:** raise **one backend defect** — *"dead-link cleanup and `client-element-metas` / `project-element-list` are both blind to geometry-side element removal on model re-upload"* — owned by BE/data (David Webb / Sergey), linked as `causes` from PLT-2882, PLT-2909, PLT-2931 and cross-referenced to PLT-2385/PLT-2650. Keep the three incidents open as per-project remediation, closing each on *its own* deletion + refresh. Add a **project-wide cohort sweep** as an explicit child of the backend ticket — the five activities Thomas happened to notice are a **sample, not the population** (playbook #6), and nothing so far has enumerated ELN03's full dead-link set.

**Confidence in this recommendation: 7/10.** The technical case that it is one defect is strong (two confirmed projects, one code-read mechanism, one named blind spot in the cleanup). The 3-point deduction is process judgment, not evidence: how XYZ wants Live Incidents split versus backend defects is a Pietro/Mostafa call, and I cannot see whether a backend ticket for this already exists outside the PLT board (PAPI-*, or a dagster-side tracker).

---

## Caveats and open ends — things Ilia's comment asserts that I could not verify

1. ⚠️ **"After the next data refresh all five activities read 100% and Containment clears to 100%"** — the first half follows from the mechanism; **the second half does not follow automatically.** The package % is a weighted mean over **every** activity in Containment on the latest `CalendarDate` (`progress-queries-v2-api.ts:565-570`), not over the five. It clears to 100% only if all *other* Containment activities are already at 100%. Thomas's report implies they are, but nobody has stated it. **One extra column in the same query settles it** — see `recommended-action.md`. This is the single highest-value thing to add before the fix lands, because "we deleted the links and it still isn't 100%" is the worst possible outcome of an approved change.
2. **Weighting method on ELN03 is unverified.** Default is labour-hours (`progress-weighting-types.ts:20`); if ELN03 is set to element count, deleting 193 links also changes the **weights** (`TotalLinkedElements`), so the package number will move for two reasons at once. Harmless for the endpoint state (all-100% → 100% either way) but it will make before/after attribution muddier. Worth reading the Progress Weighting API value for ELN03 first.
3. **Client-cache gotcha on verification.** Progress parquets are cached in OPFS and only re-downloaded when the backend's `artefactHash` changes (`xyz-platform-context/dashboard/data-pipeline.md:26`). If the pipeline regenerates with a new hash this is a non-issue; if anyone verifies before that, they may read a stale 72.13% and conclude the fix failed. Verify with a hard refresh / cleared `duckdb-cache`, exactly as PLT-2882's cold-cache re-run did.
4. **Trigger (playbook #5) is still unanswered for ELN03**, as it is for FAR01 and ATL08. Ilia explicitly parks it — *"Why re-uploads leave dead links behind stays with the PLT-2882 / PLT-2909 backend thread."* That is the correct routing, but per the playbook an unanswered "why now" means **ELN03 will re-accumulate dead links on its next re-upload**. The deletion is remission, not resolution, until the backend question lands. Say so when the fix is announced.
5. **PLT-2658** (Yash's reference) has not been read by this routine and is not in this folder. It may be the earliest known instance and may already contain a BE answer.

---

## Playbook six questions — status

1. **Observed:** Containment package < 100% on the ELN03 Progress dashboard; five named activities capped between 49.33% and 98.15%. **In our hands** — Yash reproduced, Ilia queried. ✅ Strongest evidence position of any ticket in this family.
2. **Expected, on whose authority:** Thomas's own claiming — he set all five to 100% and the work is done. Corroborated structurally: *"every element that has geometry is installed"*, so on the elements that physically exist the claim is complete. ✅
3. **Smallest broken-vs-working pair:** better than a pair — a **five-row dose-response**. Dead links 1 → 114 map monotonically onto shortfall 1.85pp → 50.67pp, and `installed/linked` reproduces the displayed % to 2 d.p. in all five rows. That *is* the diagnosis. ✅
4. **Mechanism:** confirmed in code (above) — backend-computed `installed/linked`, denominator counts link rows, no geometry check on the progress path, no FE arithmetic at all. ✅
5. **Why now (trigger):** ❌ **unanswered** — deferred to the PLT-2882/2909 backend thread. Same gap as both siblings.
6. **Cohort:** ⚠️ **partially answered.** Cross-project cohort is now three projects (four with PLT-2385). *Within* ELN03 the cohort is **not enumerated** — only the five activities Thomas noticed. No sweep has been run for other ELN03 activities or packages carrying dead links.

---

## Confidence (per `xyz-platform-context/CLAUDE.md` scale)

- **Mechanism — dead links inflate the progress denominator, are computed backend-side, and no FE code participates:** **9/10.** Read directly from source with file:line on every hop (`dashboard-schedule-service.ts:455-495`, `progress-queries-v2-api.ts:511-590` and `:689-735`, `installation-status-sql.ts:38-68`, `schedule-api-service.types.ts:36`).
- **That this is what the five ELN03 activities actually hit:** **9/10.** Confirmed against project data by the assignee; the table is arithmetically self-consistent and reproduces the displayed % exactly in five independent rows. Deduction only for the CSV being unreadable here and the query itself unseen.
- **Same root-cause family as PLT-2882:** **8/10** — one notch above PLT-2909's 7/10, because ELN03 has its own data confirmation whereas ATL08 does not.
- **That the soft-delete will make the five activities read 100%:** **8/10.** Follows directly from the mechanism; residual risk is operational (pipeline refresh, OPFS cache) rather than logical.
- **That it will make the *Containment package* read 100%:** **6/10** — depends on all other Containment activities already being 100%, which is asserted but not evidenced (caveat 1).
- **That PLT-2882's soft-delete was never actually executed and this is the family's first deletion:** **7/10** — grep-negative in code and PLT-2882's log ends "pending peer alignment"; but a manual prod action wouldn't necessarily leave a trace in either place.
- **Treat as one cross-cutting backend defect + per-project remediation:** **7/10** (reasoning above).

**Overall triage confidence: ~8/10** — the highest in this family. The diagnosis is settled; what is unresolved is a **decision**, not a fact.

---

## NEEDS HUMAN

- ⚠️ **`_query_result_3_2026-07-24.csv`** (16 KB, Ilia Kuzmin) — the raw query output behind the table. Not readable here (Jira attachment, not local). It should contain the per-activity breakdown and, critically, **the 193 individual `(activityId, modelElementId)` pairs** that form the deletion list and its audit record. **Do not guess its contents.** Two things a human should check when they open it: (a) that it is the *deletion list* and not just the summary counts — if it is only the summary, the 193 pairs still have to be re-derived before anything can be deleted; (b) that it carries the query text, so the "installed" definition can be matched against `buildInstallationStatusCaseSql`.
- ⚠️ **`image-20260724-123204.png`** (61 KB, Yash Patel) — the client-side screenshot from the ticket. Not viewable here.
- ⚠️ **`Screenshot 2026-07-24 160132-20260724-122721.png`** (219 KB, Yash Patel) — Yash's "my investigation" screenshot. Not viewable here. Likely shows the linked-but-no-geometry elements; would independently corroborate the mechanism from the UI side.
- ⚠️ **Has Pietro or Mostafa replied?** The comment stream available to this routine ends at Ilia's 07-24 20:12 request. **Confirm no approval arrived out-of-band** (Slack/Teams/Freshdesk) before sending the nudge in `recommended-action.md` — nudging an approval that already happened is the one way this action misfires.
- ⚠️ **Is every *other* Containment activity on ELN03 already at 100%?** (Caveat 1.) One extra query, same shape as Ilia's. Needed *before* the deletion, not after.
- ⚠️ **ELN03 progress weighting method** (labour hours vs element count) — one API read; affects before/after attribution (caveat 2).
- ⚠️ **PLT-2658** — Yash's cited precedent. Not in this folder, not read. Pull it: it may be the family's earliest instance and may already carry a BE answer on the re-upload question.
- ⚠️ **ELN03 cohort sweep** — the five activities are a sample. Nobody has enumerated all ELN03 activities whose links resolve to missing geometry. Needs the BE-side query (PLT-2882's log concluded a BE query beats the console-harvest tooling).

---

## Roster / ownership notes

- **Ilia Kuzmin** (assignee, `ilia.kuzmin@xyzreality.com`) — diagnosed it, holds the data and the CSV, and is the family's mechanism interrogator across all three tickets. **Blocked on an approval, not on work.**
- **Pietro Desiato** (PO) and **Mostafa Kamel Hussien** (PO) — the approval holders, asked 07-24, silent since. Note Mostafa is *also* the unresponsive decision-holder on **PLT-2858** (9+ days per the 07-22 board run) — a second approval stalled on the same person is a pattern worth naming to the coordinator rather than nudging twice in isolation.
- **Yash Patel** (coordinator) — owns the client channel to Thomas and the Freshdesk #7509 thread; correctly pre-attributed the mechanism before the data run.
- **David Webb** (BE/data-pipeline/dagster, off the dev roster) — authored the auto-cleanup behaviour statement on PLT-2385 that identifies the systemic blind spot. **The right owner for the cross-cutting backend defect.**
- **Rishi Bhugobaun** (senior fullstack) — raised PLT-2650 (links on model deletion); the natural place to widen scope to re-upload.
- **Darminder Atker** (FE lead) — owns the PLT-2882 FE robustness item. **Not needed for PLT-2931** (no FE fix moves this number).

---

## Doc / knowledge-base refs

- **Sibling `PLT-2882-groupA-progress-tracking/`** — `investigation-log.md` is the load-bearing prior: confirmed `inParquet` vs `inGeometry`, the 418-link verification (10,316 rows → 9,898 `isDeleted` → 418 live), the `POST …/activity-links/delete` deletion path, and the "deletion on hold pending peer alignment" state PLT-2931 inherits.
- **Sibling `PLT-2909-groupA-progress-tracking/`** — the "same family, different manifestation" verdict template; PLT-2931 is the third manifestation.
- **`PLT-2385-groupB-data-pipeline/context.md`** — the fourth relative and the source of the two BE quotes that name the systemic blind spot (Rishi 2026-01-28; David Webb 2026-04-15). Forked into **PLT-2650** / **UX-1109**.
- `xyz-platform-context/dashboard/progress-tab.md` — PRG calculation modes and the weighting formula; **verified against code, no correction needed**.
- `xyz-platform-context/dashboard/data-pipeline.md` — Pipeline A parquets and the OPFS `artefactHash` cache rule (caveat 3).
- `xyz-platform-context/dashboard/viewer-and-model.md` — confirms selection/linking is a ViewerPage concern, which is why PLT-2931's dashboard-% surface is a genuinely new face of the family.
- `xyz-platform-context/incidents/live-incident-playbook.md` — six questions; "close on cause + trigger + cohort, never on works-now" (caveat 4); "the reported sample is not the population" (cohort gap).
