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
- **As of the 2026-07-29 run:** Group B tickets are skipped entirely (no deep
  dive, no context update) — only a folder group-tag rename if a ticket's
  status moved A→B. Revisit once the Group B action scenario is defined.
- Actions are **drafted only** — a human reviews `recommended-action.md` and
  executes any Jira comment / transition manually.

---

## Run: 2026-07-29 — 7 Group A tickets re-triaged (1 new), Group B skipped by design

Board re-queried (`project = PLT AND issuetype = "Live Incident"`), filtered per
scope rules above → 8 in-scope tickets: 7 Group A (deep re-check/new) + 1 Group B
(PLT-2874, housekeeping rename only — Group B deep dives are out of scope this
run per updated instructions, see scope rules above).

### Group A (7) — 1 brand-new, 6 re-checked (4 materially changed, 2 confirmed unchanged)

| Ticket | Domain | Status | One-line finding | Drafted action | Conf. |
|---|---|---|---|---|---|
| PLT-2923 | viewer-and-model | With Customer (**new**) | Web viewer only supports `rvt`/`nwd`/`nwc` (`model-mapping-service.ts:296`); an unsupported format (e.g. IFC) throws and fails **silently** on initial load — no toast on that path. Second possible variant: supported file + missing element metas → every node hidden (PLT-2574 shape). 6 days silent, 3 unanswered client questions | (a) comment — mechanism + one closed Q ("do other WI1 models load?") + move **With Customer → In Analysis** (we are the blocker, not the client) | 7/10 |
| PLT-2917 | progress-tracking | Open (**re-scoped under us**) | Ticket's actual scope changed mid-flight since 07-22: now about milestone `PMILE5030` (ELN03) — 100% in editor, missing from the **PowerBI portfolio's activity parquet**. Third instance of the "two surfaces disagree, FE is a faithful renderer" family (with PLT-2884, PLT-2874). 3 client questions still unanswered; Pietro silent 8 days | (a) split the two signals, answer Mostafa with schema evidence, run one parquet query — internally, not back to the client | 6-7/10 |
| PLT-2884 | data-pipeline | With Customer | Still no re-upload — **16 days silent on a Critical ticket**, 20 days open. New: XER filename metadata shows **Rev 02, data-dated 27 Apr** (~2.4mo stale) and a combined AT10x-A11x export — both fit "missing source activities" better than "bad export" | (a) **escalate With Customer → With Technical Support** (now the recommendation, not an option) + ask internally "is there a Rev 03?" | 8/10 diag, 9/10 next-step |
| PLT-2858 | quality-management | In Analysis | **Prior 2 runs (07-13, 07-22) missed two 07-14 comments**: customer withdrew the configure-zones ask for a Location dropdown/removal; Mostafa's real blocking question to Darminder ("what's the difference between location and location details?") went **unanswered 15 days** — the stall is an unanswered dev question, not a withheld PO decision as assumed | (a) post the code-derived answer to Mostafa's question + the two customer options with cost attached; loop Pietro directly (escalation trigger from 07-22 has now fired) | 8/10 |
| PLT-2815 | quality-management | With Customer | Confirmed **pure process gap** — nothing technical pending, 23 days silent since Freshdesk closed, nobody acted on 2 prior close recommendations. New: ran the cohort sweep Paolo asked for — **18 of 37 package series show inverted Cat3/Cat4 costs**, 12 of which the "different lookup rules" explanation does **not** cover (worst: Mechanical/VESDA, 2.2×) | (c) short direct close-nudge → Yash naming the 23/36-day figures; split the 18-inversion sweep into its own product ticket for Mostafa/Pietro | 9/10 |
| PLT-2649 | 360-captures | With Customer | **Root cause pinned** (was mistakenly carried as "parked" — it was skipped, not re-checked, on 07-22): level "DC-0G-FFL" mis-datumed at **+50.4m** instead of ≈0 in one federation-link source model → ~101 rooms / ~1870 captures float ~50m high. Fix = one source-model value + re-upload; **no capture re-upload needed**. 5 days parked — legitimately customer-side now | (a) internal comment disambiguating V1-vs-V14 model naming + stating "no regression, wrong since 2025-12-04 upload"; split Pietro/Jason's 360-editor UX thread into its own ticket | 9/10 cause |
| PLT-2619 | other | With Customer | Still **mis-filed** (demo relink request) — **89 consecutive days of zero activity**, 97 days old, 93 days with the pivotal decision open. Yash's 07-27 nudge misrouted to FE (Ilia) instead of product | (c) reclassify off the PLT board to PBD (precedent: PLT-2891→PBD-2111); point at the existing open decision **PBD-1298** instead of re-asking Pietro from scratch | 9/10 |

### Group B (1) — housekeeping only, deep dive skipped by design

| Ticket | Domain | Status | Note |
|---|---|---|---|
| PLT-2874 | viewer-and-model | Dev In Progress (moved from In Analysis) | Folder retagged `groupA`→`groupB`. First of the three "two surfaces disagree" tickets (2874/2884/2917) to actually reach dev — worth a `dashboard/pitfalls.md` entry once its fix lands. No action drafted; Group B action scenario still TBD per scope rules. |

### Closed / moved out of scope since last run (informational — no action)

- **PLT-2882** → **Done** (root cause confirmed: stale parquet vs superseded model geometry).
- **PLT-2892** → **Done**. **PLT-2879** → still Done (unchanged).
- **PLT-2906**, **PLT-2918** → **In Code Review** (fixes landed; out of this routine's scope now).
- **PLT-2909** → **With Technical Support** (was `groupA-progress-tracking`; now excluded).
- **PLT-2890** → **Ready For QA** (was Group B).

### Cross-ticket notes (this run)

- **The "two surfaces disagree, FE is a faithful renderer" theme is now 3-for-3** (PLT-2874 in Dev In Progress, PLT-2884 progress-%, PLT-2917 milestone status) plus a first fix in flight — this is the moment to write the named pattern into `dashboard/pitfalls.md` per the 07-22 note's own trigger condition.
- **PLT-2858 and PLT-2815 share the same bottleneck shape**: a Mostafa/product decision question asked once and left unanswered for 2+ weeks while the ticket ages on "With Customer"/"In Analysis". Worth raising as one coordinator item to Yash rather than two separate nudges.
- **PLT-2649's mis-datumed federation link is a new defect class**, distinct from the stale-parquet family (PLT-2882/2909) — candidate for a cohort sweep across other federation-linked models once confirmed.
- **PLT-2815 surfaced a latent regression risk**: PLT-2561 (Dev In Progress, unassigned, 69 days stale) would remove floating-point rounding from the exact cost hook PLT-2815's numbers depend on (`740×1.14 = 843.5999999999999`) — flagged loudly as *not* a fix for 2815, but worth a heads-up to whoever eventually picks up PLT-2561.
- **Process observation, this run:** of the 6 re-checked tickets, 4 (PLT-2884, PLT-2858, PLT-2815, PLT-2619) are stalled purely on **our own** unanswered internal question or un-actioned recommendation, not on the customer. Only PLT-2649 (customer re-upload) and part of PLT-2917 (Pietro) are genuinely customer/product-side waits. Worth a standing reminder that "With Customer" does not always mean the ball is actually with the customer.

### ⚠️ Attachments needing human (unviewable behind Atlassian auth) — this run

**PLT-2923** (1 screenshot — decisive: disambiguates error-toast vs empty-viewport, i.e. which failure variant), **PLT-2917** (`ELN03 Milestones Dashboard.xlsx` — decisive, 403-confirmed unread), **PLT-2884** (3 screenshots + `.xlsx` + `.xer` — the `.xer` is the single most decisive unread artifact across this run), **PLT-2858** (4 screenshots, 1 new from 07-14 — decisive for which UI surface), **PLT-2815** (2 PNGs + inline blobs — corroborative only, cause already confirmed), **PLT-2649** (2 PNGs — corroborative only now that root cause is pinned). **PLT-2619**: none (zero media on the Jira side).

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
