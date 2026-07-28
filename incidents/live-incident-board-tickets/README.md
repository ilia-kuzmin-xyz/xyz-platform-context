# Live Incident Board — triage context

Per-ticket context + drafted recommended actions for tickets on the PLT
**Live Incident** board. This folder is the durable memory of the triage
routine — each run reads existing sub-folders before re-investigating, and
appends/updates them.

## Layout — flat list, tags in the folder name

One folder per ticket, directly under this directory. No group/domain
sub-directories — the group and domain are **tags in the folder name**:

```
live-incident-board-tickets/
  README.md
  PLT-XXXX-<group>-<domain>/
    context.md            ← ticket + comments + code refs + hypothesis + confidence
    recommended-action.md ← ONE drafted next step (comment / move / block) — NOT executed
```

- **`<group>` tag:** `groupA` (evaluate/clarify — Open/In Analysis/With Customer),
  `groupB` (in dev pipeline — Ready For Development/Dev In Progress), or
  `relocated` (moved off the PLT board — historical).
- **`<domain>` tag:** `filter-system`, `viewer-and-model`, `quality-management`,
  `360-captures`, `progress-tracking`, `data-pipeline`, `access-permissions`, `other`.

Example: `PLT-2892-groupA-viewer-and-model/`. When a ticket's status changes group
(e.g. Open→Ready-For-Dev), rename the folder's group tag on the next run.

## Scope rules (this routine)

- **Included:** board tickets in `Open`, `In Analysis`, `With Customer` (→ Group A);
  `Ready For Development`, `Dev In Progress` (→ Group B).
- **Excluded:** `With Technical Support`, `Ready For QA`, `In Code Review`,
  release/`Done`/`Archived`, `Blocked`.
- **`With Customer` = judgment call.** Not in the exclusion list, so treated as
  in-scope-but-parked (ball with the client).
- **Group B** context is now captured (per "populate context for all"), but the
  Group B *action* scenario is still TBD — so their `recommended-action.md` files
  are short (dev-readiness note + fix ownership), not full drafted actions.
- Actions are **drafted only** — a human reviews `recommended-action.md` and
  executes any Jira comment / transition manually.

---

## Run: 2026-07-28 — 2 new tickets, 10 re-checked, 3 Group B, 2 closures confirmed

Board re-queried (`project = PLT AND issuetype = "Live Incident"`), scope rules
applied as written above (this run corrected a mistake made mid-run: an early
draft JQL wrongly excluded `With Customer` — the scope rules above were already
correct, the query just hadn't matched them yet). **13 tickets in scope.**

### Group A (10)

| Ticket | Domain | Status | One-line finding | Drafted action | Conf. |
|---|---|---|---|---|---|
| PLT-2931 | progress-tracking | In Analysis (**new**) | 193 dead links (superseded geometry) cap 5 ELN03 Containment activities below 100% — **3rd confirmed occurrence** of the same defect family as PLT-2882/2909 | (a) nudge Pietro/Mostafa, bundle with PLT-2882's identical stalled ask | 8/10 |
| PLT-2923 | viewer-and-model | With Customer (**new**) | QA structural-fab IFC model fails in web viewer, loads fine on-device — hypothesis: Forge/IFC translation yields zero renderable fragments (named failure branch in `viewer-service.ts:1006-1020`), unconfirmed | (a) ask Yash to re-repro his own failing session with DevTools console open — evidence available now, doesn't need the customer | 5/10 |
| PLT-2917 | progress-tracking | Open | Assignee flipped Ilia→Yash; new client screenshot (actually rendered, unlike prior blobs) pins the bug to 4 named ELN03 activity IDs, all Actual%=100 but shown "Missed" — matches `dashboard-progress-comparison` skill's known "Pattern A" | (a) comment to Pietro with the 4 named IDs — narrower/cheaper than the old "pull the whole payload" ask | 7/10 (↑ from 6) |
| PLT-2909 | progress-tracking | In Analysis | ATL08 diagnostic run confirmed ghost model membership; trigger differs from PLT-2882 (suspected PC-EXCEL import-time row duplication, not re-upload); BE (Ali Seyedof) tagged, **5 days unanswered** | (a) nudge `@Ali Seyedof` + status update to Yash | 8/10 (↑ from 6) |
| PLT-2884 | data-pipeline | With Customer | Zero delta since 07-22 — **15 days silent** since re-upload was requested, 18 since root cause, Critical priority | (a) **escalate now** (upgraded from "consider"): With Customer → With Technical Support + nudge to Yash stating the move as decided | diag 8/10, next-step 10/10 |
| PLT-2882 | progress-tracking | In Analysis | Still no deletion of 418 dead links, **14 days** unanswered approval; scope now **3 tickets** (2882/2909/2931) on the same gate; ⚠️ a 07-27 follow-up comment is visible in the Jira changelog but **absent from the live comment list** — possible deletion, needs a human to check | (a) escalation nudge to Pietro/Mostafa citing all 3 tickets + the vanished-comment anomaly | 9/10 root cause |
| PLT-2858 | quality-management | In Analysis | Zero technical delta, but escalation trigger from 07-22 is now met: Mostafa 12 days silent, Pietro tagged 3× with no reply; customer's dropdown-vs-remove-field proposal also unanswered | (a) redirected: comment goes to **Pietro directly** now, Mostafa cc'd, explicit day-counts | 8/10 |
| PLT-2815 | quality-management | With Customer | **22 days** stale since Freshdesk #7126 closed on the customer side; nothing left to verify | (a) **direct close**: move to Done citing root cause + Freshdesk closure — no further customer nudge | 9/10 |
| PLT-2649 | 360-captures | With Customer | Major delta: Pietro answered the 07-13 question same-day; Ilia then pinpointed exact cause — Revit level `f0f4d409` sits +50.4m off datum, floating ~1870 captures ~50m high; status flip is a genuine customer wait (Yash relayed the ask 07-24), not silence | (a) no status change needed (already correct); internal nudge to close a now-moot side-thread | 9/10 (↑ from 8) |
| PLT-2619 | other | With Customer | **~90 days** stale across 3 rechecks; still mis-filed as an incident (it's a demo relink request); new comment (07-27) just re-asks the same unanswered question a 3rd time | (a) hardened: force reclassify Live Incident→Task + reassign Masum→Pietro/Mostafa now, with a Won't-Do/archive fallback if no owner in 5 business days | 9/10 (↑ from 8) |

### Group B (3) — context capture + dev-readiness only

| Ticket | Domain | Status | One-line finding | Fix owner / readiness | Conf. |
|---|---|---|---|---|---|
| PLT-2918 | progress-tracking | Dev In Progress (flipped from Open) | 07-22 hypothesis (destructive per-type diff in `saveDataMapping()`, category-mapping-service.ts:265-271) **confirmed against live data** — ~10k mappings checked, WBS Location genuinely wiped across 5 disciplines, not just Precast | Data remediation in progress (Sachin, backend restore/script); the actual FE code fix has **no filed/linked ticket yet** — owner likely Darminder | 8/10 (↑ from 5-6) |
| PLT-2874 | viewer-and-model (folder tag corrected — was mistakenly `data-pipeline` in a prior run) | Dev In Progress | Scope grew: Yash linked Freshdesk #7514 (project LVN-BL1) showing the same dashboard-vs-editor count mismatch independently of Far01, plus a 3rd/4th counter (schedule tab, "996 un-mapped activities") | Query-diff (§4 in context.md) needed on Far01 + LVN1; Darminder/Ilia (fix), Yash (customer), product flag if it's a real defect vs a labelling call | 6/10 |
| PLT-2385 | data-pipeline | Ready For Development | Forks shipped/progressed (PLT-2650 **Released**, UX-1109 **Ready For QA**) but both explicitly exclude DC10's actual trigger (upload-time stale link, not delete) — root fix still **unticketed** on the BE side | Whoever picks this up should file the missing "BE-2 upload-path" ticket first, then resolve PLT-2385 pointing to it | 6/10 |

### Closed since last run (informational — no action)

- **PLT-2892** ("model syncing forever") — now **Done**. Real root cause differed
  from the 07-13 hang/Promise.all hypothesis: projects with linked elements but no
  applied statuses broke the dashboard's colouring fallback. Self-resolved same-day
  by Ilia, hotfix verified on Staging by Gennaro (07-15), Freshdesk #7399 closed
  07-17. Darminder/Sachin/Ali were never actually needed. The timeout/watchdog gap
  flagged in 07-13 is still a real, separate follow-up worth tracking independently.
- **PLT-2906** (section-box rotation) — now **In Code Review**. The 07-22
  hypothesis (angle-folding bug substituting an estimate for small True-North
  angles) is confirmed — Ilia analysed the customer's screenshots (07-24) and a fix
  was coded, but **no PR is linked from Jira**, so whether it's a general threshold
  fix or a narrow FAR01/FAR02 patch can't be verified from here — worth a PR-diff
  check before this ships.

### Cross-ticket notes (this run)

- **The parquet/geometry cluster is now 3 tickets deep and the single most
  actionable item this run:** PLT-2882 (FAR01), PLT-2909 (ATL08), PLT-2931 (ELN03)
  are the same stale-metadata-vs-superseded-geometry defect family, and all three
  are gated on the **same unanswered Pietro/Mostafa approval** (oldest ask now 14
  days). One product decision unblocks all three.
- **Two Group A tickets crossed their own stated escalation threshold this run**
  (PLT-2858, PLT-2884) — both had a "nudge once, escalate if still silent" plan
  from 07-22, and both got silence, so both actions are now framed as decisions
  rather than requests this time.
- **PLT-2882's vanished comment** is the one item this run that isn't a triage
  finding so much as a data-integrity flag: a comment visible in the issue
  changelog is not in the current comment list. Could be an accidental delete,
  could be a permissions/visibility quirk — a human should check Jira's audit log
  directly rather than take our word for it.
- **PLT-2649 is this run's good-news story:** a vague "re-upload and see" question
  became a named, precise, one-line fix (single elevation correction) once Pietro
  actually answered — worth noting as a pattern: With Customer isn't always
  "stalled," sometimes it's "we did our job and now genuinely wait."

### ⚠️ Attachments needing human (unviewable behind Atlassian/Freshdesk auth) — this run

**PLT-2931** (2 blob screenshots — low priority, CSV data already confirms the
mechanism independently), **PLT-2923** (1 screenshot), **PLT-2917** (an `.xlsx`
attachment — 403, needs a human Jira session; note the *new* inline screenshot on
this ticket DID render and was read — not everything is stuck), **PLT-2858** (1
new image, `image-20260714-113920.png`), **PLT-2874** (original 2 Jira blob
screenshots still stuck, but 2 Freshdesk-hosted screenshots on a linked ticket
WERE successfully read this pass — Freshdesk links are sometimes viewable even
when Jira's own blob URLs never are).

---

## Run: 2026-07-22 — 7 fresh/updated Group A tickets, Group B currently empty

Board re-queried (`project = PLT AND issuetype = "Live Incident"`) and filtered per the
scope rules above. **Group B is empty this run** — every ticket that was Group B on
07-13 (PLT-2890, PLT-2759, PLT-2742, PLT-2385) has since moved to `Ready For QA` or
`Done`, i.e. out of this routine's scope; nothing to skip, nothing new arrived in
`Ready For Development`/`Dev In Progress`.

### Group A (7) — 4 brand-new tickets, 1 With-Customer added, 2 re-checked (no change)

| Ticket | Domain | Status | One-line finding | Drafted action | Conf. |
|---|---|---|---|---|---|
| PLT-2918 | progress-tracking | Open (new) | AUS01 Precast WBS Location wiped: category-mapping Save is a **destructive per-type diff** that deletes any category type left null across ALL types, cascading to every descendant activity — a single edit can wipe a whole package's WBS Location | (a) comment — mechanism + one data check on `A4300` + dated trigger Q → Yash | 5-6/10 |
| PLT-2917 | progress-tracking | Open (new) | Progress-Dashboard milestones (FAR01 empty / ELN04 inverted-looking / ELN03 Actual-End-Date missing): Milestone widget is a **faithful renderer** of `reporting.vw_KeyMilestone` with no FE date logic — root cause is backend/data, not FE, on all 3 symptoms | (a) ask Pietro exactly what his earlier (undocumented) fix touched, before re-diagnosing; then pull the `/milestones` payload for the 3 projects | 6/10 |
| PLT-2909 | progress-tracking | In Analysis (new) | Same root-cause **family** as PLT-2882 (stale `client-element-metas` parquet vs re-uploaded geometry) one layer earlier — "linked models" list is built purely from parquet membership, no geometry check → ghost models. ATL08 attribution unconfirmed (Yash's on-ticket skepticism honored) | (a) run PLT-2882's existing `window.__linkDiagnose('CY-5200')` diagnostic on ATL08 | 6/10 |
| PLT-2906 | viewer-and-model | Open (mid-flow) | Section-box "new style" = the `SectionToolOrientation` service rotating the box to the building footprint via Forge's `refPointTransform` (not our `angleToTrueNorth`); trigger pattern (07-14, all models, both projects, no model update) matches a **code-deploy regression** — this exact patch tilted boxes before (PLT-2756). ⚠️ **Stalled ~2 days on OUR side**: customer's True-North screenshots (07-20) still unanalyzed by Ilia | (a) Ilia analyses the screenshots + runs the repo's own orientation diagnostic on FAR01/FAR02 — NOT back to the client, we asked for and got the data | 6-7/10 |
| PLT-2884 | data-pipeline | With Customer (new) | EQX-AT10x progress % mismatch (27.37% vs 23.85%) — root cause already **product-diagnosed** (bad/incomplete source XER, corroborated by customer's own PowerBI check); "Old DB"=PowerBI (keeps stale activities across schedule revisions) vs "New DB"=Platform (current schedule only) explains the direction; New DB may be the more-correct number. 9+ days silent, waiting on customer re-upload | (c) coordinator nudge → Yash: chase the re-upload, consider With-Customer → With-Technical-Support since it's Critical and silent 9 days | 8/10 |
| PLT-2882 | progress-tracking | In Analysis (re-checked, **no change**) | Still current — root cause confirmed 07-14/15 (superseded model geometry vs retained parquet metadata); deletion of the 418 dead links on hold pending peer (David Webb) alignment, now resolved in-thread. `investigation-log.md` already reflects the latest (07-15) comments | — (recommended-action.md unchanged) | 9/10 root cause |
| PLT-2858 | quality-management | In Analysis (re-checked, **updated**) | Still stalled on Mostafa's zone-config-ownership decision — 07-16 nudge got only "waiting on this since it was asked of me"; now 9 days since the customer said "we don't know how" | (a) unchanged draft; escalation note added — consider looping Pietro directly if no answer soon | 8/10 |

### Closed since last run (informational — no action)

- **PLT-2879** (SWITCH access, the playbook incident) — now **Done**. Folder
  `PLT-2879-groupA-access-permissions/` kept as historical context per the folder-rename
  convention above; the still-open FE-gate-doesn't-honor-`DashboardView` recurrence risk
  noted in the 07-13 cross-ticket notes is worth re-checking independently of this ticket's
  closure.
- **PLT-2815**, **PLT-2619** — unchanged (no new comments since 07-13); still parked as
  documented then.

### Cross-ticket notes (this run)

- **PLT-2909 ↔ PLT-2882 pairing:** deliberately kept the **same domain slug**
  (`progress-tracking`) so the sibling pair sorts together — both are the same
  stale-parquet-metadata defect family in the activity-linking code, one layer apart
  (element selection vs model-membership list). Do not treat as fully confirmed-identical
  until the ATL08 diagnostic runs; treat as "same family," not "same ticket."
- **PLT-2917 ↔ PLT-2874/PLT-2884 theme:** a third instance this run of "two dashboard
  surfaces disagree on a number, and the FE is a faithful renderer of a backend
  computation" — PLT-2874 (element counts), PLT-2884 (progress %), PLT-2917 (milestone
  status/dates). Recurring shape worth a named pattern in `pitfalls.md` once one of the
  three lands a confirmed backend fix.
- **PLT-2906** is the one ticket in this batch where **we, not the customer, are the
  open action** — flagging for the coordinator (Yash) explicitly, since the board can
  otherwise read "With — Customer-ish" when it is actually on us.

### ⚠️ Attachments needing human (unviewable behind Atlassian auth) — this run

**PLT-2918** (4 screenshots — disambiguate empty-column vs Sequence-values), **PLT-2917**
(1 screenshot), **PLT-2909** (2 screenshots), **PLT-2906** (⚠️ decisive: the customer's
True-North screenshots from 07-20 — the single most load-bearing missing artifact this
run), **PLT-2884** (3 screenshots + `.xlsx` + `.xer` — none parseable here).

---

## Run: 2026-07-13 (updated, second pass) — 12 in-scope tickets

### Group A (8) — evaluate / clarify

| Ticket | Domain | Status | One-line finding | Drafted action | Conf. |
|---|---|---|---|---|---|
| PLT-2892 | viewer-and-model | In Analysis | Model "syncing forever": most likely the **element-status parquet load hangs** (no timeout on download or DuckDB-wasm materialize), blocking the timeout-less `Promise.all` → colours never apply → spinner never clears. (project-rooms error is unrelated noise.) | (a) comment — hang-vs-skip diagnostic to Darminder + artefact-size Q to Sachin/Ali | 9/10 mech, 5/10 which-variant |
| PLT-2882 | progress-tracking | In Analysis | Not a "retired filter" — Select/Isolate silently drops orphaned links for a re-versioned activity | (a) reply + one data-diff step | 6/10 |
| PLT-2879 | access-permissions | With Customer | SWITCH access. PR #2030 shipped; FE gate **still doesn't honor `DashboardView`** → legacy cohort still lockable; trigger + cohort-sweep still open; flipped to With-Customer with no comment | (a) status-check → Yash | 6-7/10 |
| PLT-2874 | viewer-and-model | In Analysis | Editor 440K vs dashboard 470K: dashboard "Total" is a **non-DISTINCT row count** of `element_base_data` (3 inflation vectors); the whole gap is structural, not date-range. One query settles bug (dup status rows) vs by-design | (a) explain + `COUNT(*) vs COUNT(DISTINCT)` query → Darminder | 6/10 |
| PLT-2858 | quality-management | In Analysis | QA "Location" empty = zones never configured on ML9 → product/process (Mostafa owns). Latent FE gap: detail panel shows raw location GUID | (a) decision message → Mostafa | 8/10 |
| PLT-2815 | quality-management | With Customer | Rework cost Cat3 €684 < Cat4 €843.60 reproduced to the cent = reference-**data** artifact; code correct; "as intended"; Freshdesk closed | (c) nudge → Yash to accept/close | 9/10 |
| PLT-2649 | 360-captures | In Analysis | 360 pins too high = source **data** (wrong Revit elevations); transform proven identical to Quality pins | (a) decision Q → Pietro (re-upload vs XYZ remap) | 8/10 |
| PLT-2619 | other | With Customer | **Mis-filed** as incident — demo relink request, stale ~75d, internal product blocker | (c) hand off to product + reclassify | 8/10 |

### Group B (4) — context captured, in dev pipeline (action scenario TBD)

| Ticket | Domain | Status | One-line finding | Fix owner / readiness | Conf. |
|---|---|---|---|---|---|
| PLT-2890 | filter-system | Ready For Development | Contractor filter **genuinely absent** on new (non-BI) dashboard = PowerBI-migration parity gap | Dev-ready once product confirms "dropped on purpose or forgotten?" (Mostafa/Pietro) | 8/10 |
| PLT-2759 | filter-system | Dev In Progress | Contractor **company entity** not displaying, login-type dependent | Backend PAPI-3344 (Sergey), **released** v59.14.1 — but 129 orphaned companies need a **data backfill**. No FE work | 9/10 attr |
| PLT-2742 | filter-system | Dev In Progress | Same cluster as 2759 (tenant-vs-personal is the decisive signal) | Backend PAPI-3344 (Sergey), released — **verify Far02 with a personal login post-backfill**, not admin. No FE work | 9/10 attr |
| PLT-2385 | data-pipeline | Ready For Development | DC10 activities keep links to both PC & QA models (shared Revit unique IDs); stale links inflate % / hours. Links keyed on `modelElementId` only, no QA/PC dedup | Backend/data-pipeline (link lifecycle) + product/UX; forked to **PLT-2650 / UX-1109**. Not FE | 6/10 |

### Out of scope / relocated

- **PLT-2891** ("Contractor filter not working on the Dashboard") — **moved to the
  Power BI Dashboard project as `PBD-2111`, status Done**. It was the current/PowerBI
  dashboard sibling of PLT-2890. Folder kept at `group-a/filter-system/PLT-2891/`
  as historical context; no action on the PLT board.

### Cross-ticket notes

- **Contractor cluster (4 tickets, 2 clusters):**
  - Cluster 1 — **PLT-2742 + PLT-2759** (Group B): contractor *company entity*
    not displaying, login-type dependent → backend tenant/company assignment,
    **PAPI-3344** (Sergey, released; **129-orphan backfill outstanding**).
  - Cluster 2 — **PLT-2890 (Group B) + PLT-2891→PBD-2111 (Done)**: contractor
    *filter control* across new (non-BI) vs old (PowerBI) dashboards.
  - **Do NOT merge the two clusters** — different surface, layer, owner.
- **PLT-2879** is the incident `incidents/live-incident-playbook.md` was written
  about; the still-open FE gate fix (`project-private-route.tsx:41`, `DashboardView`
  not honored) is the recurrence risk.
- **PLT-2874 & PLT-2385** both surface **count/linking correctness** in the
  data-pipeline (non-dedup counts / stale cross-model links) — related theme,
  different mechanisms.

### ⚠️ Attachments needing human (unviewable behind Atlassian/Freshdesk auth)

Screenshots/media could not be opened by the agents — populate the relevant
`context.md` when you can. Decisive gaps: **PLT-2649** (how-high / which captures / %),
**PLT-2892** (which UI state), **PLT-2385** (PowerBI export counts — mitigated by
Rishi's transcription). Corroborative-only on the rest (2874, 2879, 2882, 2815,
2858, 2759, 2742, 2619).

### Off-roster names seen

- **Masum Ahmed** — reporter/assignee on 2649, 2619, 2385 (support/Freshdesk agent).
- **David Webb** — BE/data-pipeline/dagster owner (commenter on 2385).
