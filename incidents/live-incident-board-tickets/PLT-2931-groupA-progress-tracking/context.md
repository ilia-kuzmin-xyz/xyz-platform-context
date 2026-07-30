# PLT-2931 — "Containment package should be 100% but is not on dashboard" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2931
- **Issue type:** Live Incident · Software Area: **Dashboard**
- **Status:** **In Analysis** · **Priority:** Major
- **Project (site):** **ELN03**
- **Reporter (Jira):** Yash Patel (support/coordinator) · **Assignee:** Ilia Kuzmin · original client reporter: **Thomas**
- **Freshdesk:** #7509, status "Waiting on 3rd line" (i.e. back on us)
- **Created:** 2026-07-24 13:28 · **Last activity:** 2026-07-24 20:12 (comment) · **Triage date:** 2026-07-28 (this check)
- **Attachments:** 1 CSV (`_query_result_3_2026-07-24.csv`, readable-in-spirit — it's Ilia's own exported evidence, described in the comment text below) + 2 inline screenshots in comment 1 (⚠️ unreadable blob URLs — see NEEDS HUMAN)
- **Domain slug chosen:** `progress-tracking` — matches sibling tickets in the same defect family (see below)

This is a **brand-new folder** — no prior triage pass exists. However, the ticket itself is **not** fresh: the assignee (Ilia Kuzmin — same identity as this triage operator) already ran a full root-cause investigation and posted a confirmed-with-data comment **4 days before this check**, requesting approval to fix. **Nothing has moved since.** This write-up's job is mostly to capture that already-complete analysis and flag the stall.

---

## One-line symptom

On the Dashboard's Progress (PRG) discipline/package breakdown for **ELN03**, five **Containment**-package activities that the client claims were installed 100% on site show **below 100%** (49–98%). Client-named activities: `KUPSB21200`, `JSCOR1060`, `JUPSA21030`, `KUPSD21420`, `JUPSC21480`.

---

## Root cause — already CONFIRMED on-ticket (comment 2026-07-24T20:10, Ilia Kuzmin)

Ilia queried the data directly and attached a CSV. Per-activity breakdown (Linked = total elements linked to the activity; Installed = elements marked installed; Dead links = linked elements no longer present in current model geometry; Dashboard % = what the dashboard shows):

| Activity | Linked | Installed | Dead links | Dashboard % |
|---|---|---|---|---|
| KUPSB21200 | 122 | 88 | 34 | 72.13 |
| JUPSA21030 | 225 | 111 | 114 | 49.33 |
| KUPSD21420 | 152 | 111 | 41 | 73.03 |
| JUPSC21480 | 113 | 110 | 3 | 97.35 |
| JSCOR1060 | 54 | 53 | 1 | 98.15 |

In every row: `Installed / Linked == Dashboard %` exactly, and **every element that still has geometry is installed**. The claiming was correct — the 100% install status is real. The activities read below 100% purely because their `Linked` denominator is inflated by dead links (elements the metadata still lists but whose geometry no longer exists in the current model version). **193 dead links total across the 5 activities.**

This is **the same defect family, third confirmed occurrence**, as two prior tickets in this same board:
- **PLT-2882** (FAR01) — root cause CONFIRMED 2026-07-14 with `9/10` confidence via a diagnostic tool (`__linkDiagnose`): `client-element-metas` parquet retains elements from a superseded model generation after re-upload; SVF geometry doesn't have them; `model.elementId2dbId` (the intersection of loaded geometry externalIds and parquet) yields 0 hits for those elements. See `PLT-2882-groupA-progress-tracking/investigation-log.md`.
- **PLT-2909** (ATL08) — same family, one layer earlier in the pipeline (stale parquet inflates the *model membership list*, not just the selection count).
- **PLT-2931 (this ticket, ELN03)** — same family again, now manifesting as a **progress-percentage** symptom rather than a viewer-selection symptom, because PRG's per-activity/per-package progress is literally `installed / linked` — see mechanism below.

### Why this hits the *dashboard percentage*, specifically (mechanism, code-verified)

- PRG's package-level formula weights by `TotalLinkedElements` and divides by that same linked count (`xyz-platform-context/dashboard/progress-tab.md` § Progress weighting: `SUM(weight × progress_delta) / SUM(weight) × 100`; `hc-frontend/docs/dashboard/progress-calculation-modes.md` — package-level formula divides by `SUM(TotalLinkedElements)`). The **frontend does not compute install status or the linked-element set** — it consumes whatever `category_groups` / `activity_progress` parquets already contain (`dashboard/prg-progress.md` § Data flow, § Key service `DashboardProgressService`). Exactly the same "FE is a faithful renderer, the defect is upstream data" pattern documented for PLT-2917 (milestones).
- The upstream `Linked` count for an activity is sourced from the **same `activity_links` bridge** whose staleness PLT-2882 diagnosed to the byte (`activity_links` retains rows after a model re-upload leaves elements' geometry superseded/removed, while the element-metadata parquet — `client-element-metas` — still lists them). PLT-2882's root cause is not FE-side; it is a **data/pipeline** defect: re-uploads don't clean up `activity_links` rows or the parquet for elements whose geometry generation changed.
- Net effect for ELN03: 193 of the elements linked to these 5 Containment activities are **dead** (metadata says linked, geometry says gone) → they still count in the `Linked` denominator → percentage is suppressed even though every *live* linked element is installed.

### The proposed fix (already drafted on-ticket, not yet approved)

Ilia's comment proposes: **soft-delete the 193 dead links**, via the same endpoint and audit trail used for PLT-2882's proposed fix — confirmed to exist in the FE codebase:
- `ElementApiService.deleteActivityLinks()` → `POST /projects/{projectId}/elements/activity-links/delete` — `hc-frontend/src/main/webapp/app/services/elementService/element-api-service.ts:39-41`.
- Soft-delete is reversible (link history preserved via an `isDeleted` flag — same flag PLT-2882's investigation log used to filter live vs deleted links, `linking-service.ts:180-222`); evidence parquets are untouched. After the next data refresh, the 5 activities and Containment package read 100%.

**Approval was explicitly requested from Pietro Desiato and Mostafa Kamel Hussien in the same comment (2026-07-24T20:10). As of this check (2026-07-28, +4 days), there has been no reply on the ticket** — no approval, no rejection, no question back.

---

## Playbook read on the stall

- **Cause:** confirmed (data-backed, matches a mechanism already proven twice). Not in question.
- **Trigger ("why now"):** still not answered *anywhere* across all three tickets in this family (PLT-2882, PLT-2909, PLT-2931) — the pipeline-side question ("why do re-uploads leave `activity_links` / `client-element-metas` pointing at dead generations") has been open since 2026-07-14 with no BE owner confirmed. Ilia's comment here explicitly punts it to "the PLT-2882 / PLT-2909 backend thread."
- **Cohort:** ELN03 is stated as "the third confirmed project" — but there is no evidence anyone has swept *all* projects for the same defect shape. Each ticket has been handled as a one-off soft-delete request rather than a systemic fix or a bulk cohort remediation, which is exactly the anti-pattern the playbook warns about ("don't wait for the next ticket").
- **Precedent for the stall:** PLT-2882's identical soft-delete proposal has been **on hold since 2026-07-15** pending "peer alignment" (a developer's pushback on the RCA, per its `investigation-log.md`) — 13+ days with no recorded resolution as of this check. PLT-2931 risks the same fate: a correct, evidence-backed, low-risk fix stuck behind an unanswered approval ask.

---

## Domain slug — why `progress-tracking`

The symptom surface is the Dashboard PRG (Progress) tab's discipline/package breakdown (`dashboard/progress-tab.md`), and the fix (soft-delete dead `activity_links`) is scoped to the same activity↔element linking domain as sibling tickets PLT-2882 and PLT-2909, both filed `progress-tracking` for consistency. Not `data-pipeline`: the operative defect is the same `activity_links`/`client-element-metas` staleness already homed there by precedent, and the fix path (FE-callable delete endpoint + dashboard % consumer) sits in the progress-tracking surface area.

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

- **Root cause (dead links inflating the Linked denominator; installed/linked ratio suppressed):** **9/10** — confirmed with real per-activity query data (CSV), consistent across all 5 activities (`installed/linked == dashboard %` exactly in every row), and matches a mechanism already proven to `9/10` in PLT-2882.
- **Proposed fix (soft-delete via existing endpoint) is safe and sufficient:** **8/10** — endpoint verified to exist in code (`element-api-service.ts:39-41`), reversible, same audit trail as a precedent already reviewed once (PLT-2882). Residual uncertainty is only the peer-alignment concern raised on PLT-2882, not this ticket's own data.
- **Overall triage confidence: 8/10.** This is not a research-stage ticket — it is a **decision-stage** ticket. The only open item is a yes/no from product owners that has sat unanswered for 4 days.

---

## NEEDS HUMAN

- ⚠️ **2 inline blob screenshots in comment 1** (Yash Patel, `media.staging.atl-paas.net` blob URLs) — unresolvable placeholder URLs, cannot open. Likely just the client's dashboard screenshot showing sub-100% Containment; not decision-blocking given the CSV data already confirms the mechanism independently.
- ⚠️ **The CSV attachment** (`_query_result_3_2026-07-24.csv`, 16 KB) — not fetched (Jira attachment API auth); the table above is transcribed from the comment text, which already states the same numbers, so this is low-risk, but a human should eyeball the raw CSV before executing any delete.
- ⚠️ **Approval decision itself** — needs Pietro Desiato and/or Mostafa Kamel Hussien to actually answer on-ticket. This is the one blocking action; no further investigation is needed to unblock it.
- ⚠️ **Trigger ("why now") and cohort sweep** — still unanswered across the whole PLT-2882/2909/2931 family; needs a BE/data owner (Sergey / Sachin+Ali / David Webb per the sibling tickets) to explain why re-uploads leave `activity_links`/parquet pointing at dead-generation elements, and whether other projects beyond FAR01/ATL08/ELN03 are silently affected.

---

## Roster / ownership notes

- **Ilia Kuzmin** (assignee) — already did the investigation and drafted the fix; the operator role here is to escalate, not re-investigate.
- **Pietro Desiato**, **Mostafa Kamel Hussien** — approval requested from both 4 days ago, no response; correct people to nudge.
- **Yash Patel** — coordinator; owns the Freshdesk #7509 thread back to Thomas; should be looped on the nudge for visibility/status continuity.
- If/when approved: this is an operational data action (soft-delete via existing endpoint), not new FE development — no dev ticket needed for the fix itself. A dev ticket **would** be warranted for the still-open systemic question (why re-uploads leave dead links/stale parquet) — that's the BE/data thread already referenced on PLT-2882.

## Doc / knowledge-base refs

- `xyz-platform-context/dashboard/progress-tab.md` — PRG data flow, weighting formula (`SUM(weight × progress_delta) / SUM(weight) × 100`), `TotalLinkedElements` weighting mode.
- `hc-frontend/docs/dashboard/progress-calculation-modes.md` — package-level formula dividing by `SUM(TotalLinkedElements)`, confirming the denominator this bug inflates.
- `hc-frontend/src/main/webapp/app/services/elementService/element-api-service.ts:39-41` — `deleteActivityLinks()`, the proposed fix's endpoint.
- Sibling `PLT-2882-groupA-progress-tracking/` (`context.md`, `investigation-log.md`) — full root-cause confirmation of the same defect family (`9/10`), the `__linkDiagnose` diagnostic, and the still-open "peer alignment" stall on the same kind of soft-delete approval.
- Sibling `PLT-2909-groupA-progress-tracking/context.md` — same family, one layer earlier (stale parquet inflates model membership list).
- `incidents/live-incident-playbook.md` — "why now" / cohort-sweep discipline; "evidence requests without an owner sit idle" applies equally to *approval* requests without a chaser.
