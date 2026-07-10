# PLT-2884 — EQX-AT10 New dashboard error (context pack)

> Read-only prep for a human (Ilia). No Jira action taken. Compiled 2026-07-10.

## Ticket metadata

| Field | Value |
|---|---|
| Key | PLT-2884 (id 116483) · https://xyzreality.atlassian.net/browse/PLT-2884 |
| Type | **Live Incident** · Priority **Critical** |
| Status | **Open** (To Do category) · unassigned resolution |
| Project | PLT — XYZ SW Platform : Platform |
| Reporter/Creator | Yash Patel (relaying client) |
| Assignee | Darminder Atker |
| Created | 2026-07-09 18:55 · Updated 2026-07-10 10:47 |
| Freshdesk | Ticket 7384 → currently "Waiting on customer" |
| Client project | EQX-AT10x, project id `6808f6afae311c4f8409624f` |

## Full description (verbatim, key part)

> Software Area: Dashboard … Project: EQX-AT10 ID: 6808f6afae311c4f8409624f
> I'm having some issues with the new dashboard for the AT10x project. The progress shown on the new dashboard doesn't match that shown on the old one:
> **Old DB Actual: 27.37% / New DB Actual: 23.85% / Variance: 3.52%**
> I exported the data and found that some activities on the old dashboard have progress, but the new dashboard doesn't show it (e.g. Install Temp Power.png – **Act: EL1031000**).
> Some of these activities also have the same numbers as in the old dashboard when I check the **web viewer Editor-Progress**.
> We checked with **Hussein in Power BI** and found that **some activities were missing from the source data**. Could you please help me resolve this issue?

(Description also lists 4 Freshdesk attachment links on support.xyzreality.com + "Freshdesk could not scan… download at your own risk".)

## Comments (chronological, all authored by Yash Patel)

1. **2026-07-09 18:58** — @Ilia Kuzmin: "user reported differences between data in new and old dashboard. old one shows latest data whereas new one doesn't." Embeds the 3 PNGs inline. "Have asked for XER file also. Can you please look into this."
2. **2026-07-09 19:01** — Freshdesk 7384 → "Waiting on 3rd line".
3. **2026-07-10 09:25** — @Yash (self): "XER file -" attaches `EQIX_AT10x-A11x_Rev_02_updated20260427.xer`.
4. **2026-07-10 10:46** — Freshdesk 7384 → "Waiting on customer" (posted twice, dup).
5. **2026-07-10 10:47** — @Ilia Kuzmin: **"Please wait for now as Mostafa has identified the issue. It was with the XER file. We have recommended user to rectify that and come back to us if the issue still persists."**

> **State of play:** Mostafa has already attributed the cause to the client's XER (Primavera P6 schedule export) file and bounced it back to the customer to fix. Ticket is effectively parked "waiting on customer". No verification evidence (which activity, why missing) was posted in-thread.

## Attachments / media inventory

**All Jira attachment content URLs are `api.atlassian.com/.../attachment/content/{id}` and returned HTTP 403 to WebFetch — auth-gated, NOT fetchable by me.** A human/authenticated session can open them:

| id | filename | size | mime | note |
|---|---|---|---|---|
| 60494 | 2026.07.09_EQX-AT10x_Dashboard-error.xlsx | 3.1 MB | xlsx | client's exported diff data — **inaccessible to me** |
| 60495 | 2026.07.09_Install Temp Power.png | 117 KB | png | activity EL1031000 evidence — **inaccessible** |
| 60493 | 2026.07.09_Line Side Feeders.png | 176 KB | png | **inaccessible** |
| 60492 | 2026.07.09_MUW Tank Northside Installation.png | 144 KB | png | **inaccessible** |
| 60531 | EQIX_AT10x-A11x_Rev_02_updated20260427.xer | 4.3 MB | xer | the source schedule Mostafa blamed — **inaccessible** |

- **Inline comment media** (`mediaInline`/`mediaSingle`, ids e80981bc…, 1b0496b8…, etc.) = Jira internal media, not fetchable without an authenticated session.
- **Freshdesk links** (support.xyzreality.com/helpdesk/attachments/…) = customer-support portal, auth-gated, not fetchable.
- **Flag for human:** every piece of evidence (xlsx diff, 3 screenshots, XER) is behind auth. None was independently inspected here. The .xlsx and .xer are the two artefacts a dev needs and both are attached to the Jira — a human with access can pull them.

## Relevant domain docs consulted

- `dashboard/progress-tab.md` — new dashboard = **schedule-derived parquets**. Actual% formula: `SUM(weight × progress_delta)/SUM(weight)×100`; packages with 0 weight excluded from denominator (:53-55). Modes project/package/activity all read from parquet tables, not from live editor status.
- `dashboard/data-pipeline.md` — Pipeline A (V2 Progress Outputs parquets: `category_groups`, `project_progress`) is the backend-computed progress source. Editor status changes sync into `element_status` separately (:81-97) — **a different table/path** from the progress parquets.
- `dashboard/pitfalls.md` — no existing entry for "progress mismatch / missing source activities". Closest is multi-model artefact mismatch (:14-18), not this.

## Relevant hc-frontend code + findings

New-dashboard progress numerator/denominator (the % the client compares):
- `…/services/dashboard-progress/utils/progress-queries-v2.ts`
  - denominator `TotalWeight = SUM(PlannedWeight) FROM discipline_packages` (:58-65)
  - actual% = `SUM(ActualWeight)/TotalWeight*100` from same table (:84-91)
  - **`getDisciplinePackageSummary` drops any row where both actual & planned are 0** (:366-369) — an activity absent from the schedule source contributes nothing to numerator **and** is filtered from the discipline/package list → invisible on new dashboard.
- Service orchestrator: `…/dashboard-progress/dashboard-progress-service.ts`; parquet loader `…/loaders/progress-outputs-v2-loader.ts`.
- **Editor "Editor-Progress" path is separate:** `…/viewer-x/components/blocks/activity-properties/activity-progress.tsx` reads `activityItem.actualProgress` directly off the schedule entity (:45-57) via `use-actual-progress-mutation`. This is why the editor can show progress for an activity the new dashboard omits — different data source.

**Key inference:** the new dashboard reads progress that the **backend** aggregates from the uploaded schedule (XER) → parquet. Frontend has no bug surface here for "missing activities"; if an activity (e.g. EL1031000) is absent/unlinked/zero-weight in the XER-derived parquet, the FE correctly shows nothing. The divergence is upstream (XER → parquet pipeline / schedule linkage), consistent with Mostafa's XER attribution and Hussein's "missing from source data".

## Playbook-frame analysis (six questions)

1. **Observed / can we see it?** Old 27.37% vs New 23.85%, variance 3.52%; activity EL1031000 has progress in old+editor, none in new. Evidence exists (xlsx + PNGs) but is **auth-gated — not reproduced in our hands**.
2. **Expected, on whose authority?** Reference = old PowerBI dashboard + web-viewer Editor-Progress. Note: "old DB shows latest data, new doesn't" is the client's framing — the *new* pipeline may actually be the more-correct one (an activity genuinely missing from the schedule source *should* be absent). Which number is "right" is not yet established.
3. **Smallest broken-vs-working pair.** Present: **EL1031000 (Install Temp Power)** — visible in editor/old, absent in new. This is the diff to walk. **Unknown:** is EL1031000 absent from the XER, present-but-unlinked, or zero-weight? Not confirmed in-thread.
4. **Mechanism.** New dashboard = XER→parquet `discipline_packages` aggregate (progress-queries-v2.ts); editor = live `activityItem.actualProgress`. Missing/zero-weight source rows vanish from the dashboard aggregate and list (filter at :366-369). Mechanism is a **lookup once the XER/parquet is inspected** — but nobody has posted that lookup.
5. **Why now / trigger.** XER file `…Rev_02_updated20260427.xer` is implicated. Likely a schedule revision that dropped/renamed/unlinked activities. **Not verified** — no diff of prior vs current XER, no deploy correlation.
6. **Who else / cohort.** Unknown. If it's the XER, cohort = all activities missing from that revision (variance is 3.52%, so likely several beyond EL1031000) — and potentially other projects on the same upload flow. No cohort sweep done.

## Confidence score

**6/10** — that the *context is complete enough for a developer to act.*

Reasoning: the mechanism and both data paths are well understood and cited; the likely-cause (XER source) is already named by Mostafa and matches the code + Hussein's finding. But three things keep it out of 7-8: (a) **no evidence is independently verifiable** — xlsx/XER/PNGs are all auth-gated; (b) the diagnosis "it's the XER" was **asserted, not shown** — nobody posted whether EL1031000 is missing vs unlinked vs zero-weight, so the smallest broken-vs-working pair is stated but not closed; (c) **no cohort/trigger** work. Per the playbook this is remission-risk: bounced to the customer on an unverified cause. A dev opening this today could *investigate* but can't yet *fix-or-close* with certainty.

## Recommended next action (do NOT execute — for human)

**Option (a): post a routed mechanism-confirmation comment before the ticket closes on "customer will fix their XER".** Rationale (playbook): convert Mostafa's assertion into a verified smallest-pair + cohort so this doesn't reopen. It is not yet safe to move to Ready-for-Dev (no confirmed FE defect) nor to fully close (cause unverified). Route the mechanism question to **Mostafa** (he holds the XER diagnosis); keep client comms with **Yash**.

Draft comment (Ilia's voice, one owner, closed questions):

> @Mostafa — before we close this on the XER, can you confirm the mechanism so it doesn't bounce back? Two specifics:
> 1. For **EL1031000 (Install Temp Power)** — is it *absent* from `EQIX_AT10x-A11x_Rev_02_updated20260427.xer`, or *present but unlinked / zero labour-weight*? (That decides whether "rectify the XER" is even the right fix.)
> 2. Is EL1031000 the only one, or do the other missing activities (the 3.52% gap) share the same shape? A one-line count from the .xlsx export would let us confirm the cohort.
>
> Context: new dashboard reads XER→parquet aggregate (`discipline_packages`), editor reads live activity progress — so a source-missing activity is expected to show in the editor but not the dashboard. If that's confirmed, the FE is behaving correctly and this is a schedule-data fix; if EL1031000 *is* in the XER, it's a pipeline bug and needs a dev, not the customer.

If the human prefers a status move instead of a comment: **"With Technical Support" / leave Waiting-on-customer** is defensible (missing piece is client-side XER rectification) — but only *after* Q1 above is answered, otherwise we risk closing an unverified cause.

## Open questions / what a human must attach or clarify

- [ ] Open the .xlsx (60494) and .XER (60531) — confirm EL1031000's status in the source (missing / unlinked / zero-weight). **Needs auth.**
- [ ] Establish which number is authoritative: is the *new* 23.85% actually correct (activities legitimately not in schedule) and the *old* 27.37% stale? Client framing assumes old is right.
- [ ] Cohort: how many activities make up the 3.52% gap; do they share a discipline/package or an unlinked state?
- [ ] Trigger: diff Rev_02 XER vs the previously-loaded revision — what changed in the upload window.
- [ ] Confirm no FE/pipeline defect: verify the backend XER→`discipline_packages` parquet build didn't silently drop linked activities (would make it a dev fix, not a customer fix).
