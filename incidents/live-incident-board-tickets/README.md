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

## Run: 2026-07-16 — 9 in-scope tickets (2 new, 1 resolved out, 1 further along)

JQL: `project = PLT AND issuetype = "Live Incident" ORDER BY created DESC` (100
tickets returned, plus a targeted status query to confirm nothing else currently
sits in Ready-For-Development/Dev-In-Progress/With-Technical-Support/Ready-For-QA/
Needs-Evaluation). Compared against the 2026-07-13 run.

### What changed since 07-13
- **PLT-2892** (was Group A, In Analysis) → **resolved**: Ilia found + hotfixed the
  bug same day (07-13), Gennaro verified on Staging 26.3.2 (07-15), now READY FOR
  RELEASE → **out of scope**, folder retagged `PLT-2892-resolved-viewer-and-model`.
  Under 48h triage-to-verified-fix — a good pattern to bank.
- **PLT-2890 / 2759 / 2742** (were Group B) all progressed further along the
  pipeline (In Code Review / READY FOR RELEASE) → now excluded by scope rules.
  **Group B is effectively empty this run** except **PLT-2385** (still Ready For
  Development, unchanged since 07-13 — context already captured, no new comments,
  skipped this run per instruction).
- **PLT-2906** and **PLT-2884** are **new** tickets, not seen on 07-13 — full
  triage below.
- **PLT-2882, PLT-2858, PLT-2649, PLT-2879** all got substantive new Jira activity
  since 07-13 — docs updated in place (see per-ticket notes below).
- **PLT-2874, PLT-2815, PLT-2619** — no new comments since 07-13; docs unchanged
  and still accurate (2815, 2619 remain stale — see "Cross-ticket notes").

### Group A (9) — evaluate / clarify

| Ticket | Domain | Status | One-line finding | Drafted action | Conf. |
|---|---|---|---|---|---|
| **PLT-2906** 🆕 | viewer-and-model | Open | Section Box lost its rectangular-cage rendering **across all models, FAR01+FAR02+other projects**, precise trigger 2026-07-14 ~13:00 UTC, no model change. Box style is 100% Forge `Autodesk.Section` (no custom gizmo), viewer pinned to `7.117.0` — no hc-frontend commit correlates with the trigger, pointing at a **Forge viewer-version/deploy change**, not our source. Different symptom class from the 3 historical alignment tickets (2651/2756/2771), same underlying fragility. | (a) self-repro + deploy/version-pin diff → Darminder; treat as fleet-wide | 8/10 mechanism, 5/10 specific trigger |
| **PLT-2884** 🆕 | data-pipeline | With Customer | AT10x new-dashboard Actual% (23.85%) vs old/PowerBI (27.37%), −3.52pp. Mostafa blamed the customer's XER file (6 days silent since re-upload ask) — but the customer's own fact that **web-viewer Editor-Progress matches the OLD numbers** is unexplained by a bad-XER theory and is the signature of **Pattern A** (intangible/labour activities reading 0% actual in the new dashboard's parquet), same class as PLT-2385/2874. | (a) nudge Yash to re-chase customer **+** independent `EL1031000` Pattern-A query in parallel, don't wait on the XER alone | 8/10 known-pattern-class, 5/10 Pattern-A specifically, 4/10 XER-only |
| PLT-2882 | progress-tracking | In Analysis | **Updated.** Root cause confirmed 9/10 (dead links point at elements dropped from SVF geometry but retained in metadata, from a model re-version). Peer (David Webb) pushback raised and answered by Ilia (07-15) — **no reply yet**; 418-link deletion on hold pending his alignment. | (a) two short closed follow-ups: @David for RCA sign-off, @Mostafa/@Pietro to ticket the BE metadata-sync question + FE robustness fix | 9/10 RCA, 8/10 next-step |
| PLT-2879 | access-permissions | With Customer | Darminder's 07-13 comment (new since last run) independently corroborates the legacy "Dashboard Only"/`viewer_role` root cause this file already derived from code. Trigger + cohort sweep still open; "waiting on customer for what" still undocumented. | (a) status-check → Yash (unchanged) | 6-7/10 |
| PLT-2874 | viewer-and-model | In Analysis | No change since 07-13. Editor vs dashboard count gap is plausibly by-design (dbId non-dedup) with one genuine defect vector (status-history double-counting) still worth a query. | (a) explain + `COUNT(*) vs COUNT(DISTINCT)` query → Darminder | 6/10 |
| PLT-2858 | quality-management | In Analysis | **Updated.** Customer now explicitly wants a Location **dropdown or field removal** (07-14); Mostafa asked Darminder "location vs location details?" (07-14) — **unanswered 2 days**, directly answerable from this file's own §2a. | (a) answer Mostafa first (documented answer ready), then the original 3-question zone-workflow draft | 8/10 diagnosis |
| PLT-2649 | 360-captures | In Analysis | **Updated.** The 2-week ownership stall broke 07-13: Pietro asked for the pin list (still not produced) and Jason Fingland gave a real design response (detect-and-flag vs allow-editing via Editor X/Y/Z). Root cause unchanged: source-data elevation defect, not FE. | (a) produce the pin list (same query this file already scoped) + surface the detect-vs-edit decision | 8/10 cause, 4/10 trigger/remediation |
| PLT-2815 | quality-management | With Customer | No change. Rework cost Cat3€684<Cat4€843.60 reproduced to the cent = reference-data artifact; code correct; "as intended"; Freshdesk already Closed, Jira orphaned open ~3 weeks. | (c) nudge → Yash to accept/close | 9/10 |
| PLT-2619 | other | With Customer | No change. Mis-filed as incident — demo relink request, now **~85 days** stale, internal product blocker (Pietro's question never answered). | (c) hand off to product + reclassify | 8/10 |

### Group B (1) — in dev pipeline, skipped this run per instruction

| Ticket | Domain | Status | Note |
|---|---|---|---|
| PLT-2385 | data-pipeline | Ready For Development | Unchanged since 07-13 (context already captured that run); no new comments. Not re-triaged this run. |

### Resolved / out of scope this run

- **PLT-2892** — hotfixed + QA-verified, READY FOR RELEASE. Folder retagged
  `PLT-2892-resolved-viewer-and-model` (historical, same convention as PLT-2891).
- **PLT-2890, PLT-2759, PLT-2742** — all progressed past Group B into In Code
  Review / READY FOR RELEASE; no folders needed this run (2759/2742/2890 already
  have folders from 07-13, left as historical — not re-triaged).

### Cross-ticket notes

- **New "count/linking correctness in the data pipeline" sibling:** PLT-2884 joins
  **PLT-2385** and **PLT-2874** in this recurring theme — old-vs-new dashboard
  disagreeing because the two pipelines compute the same metric differently. Worth
  a single upstream ticket against the parquet generator's intangible-actual
  fallback (Pattern A) rather than fixing each site report individually.
- **PLT-2882 and PLT-2906 are both "we ride something we don't fully control"
  stories** — 2882 is a metadata/geometry desync from model re-versioning; 2906 is
  a dependency (Forge) version change outside our commit history. Different
  domains, same shape: the bug isn't in code we wrote, it's in an assumption about
  data/dependency freshness that silently broke.
- **PLT-2906 is the most urgent open item this run** — Major, but the *shape*
  (cross-project, simultaneous, precise timestamp, zero data variable) argues it
  should be treated as higher urgency than its label, per playbook Q6 (cohort).
- Still true from 07-13: **PLT-2879** is the incident `live-incident-playbook.md`
  was written about; the FE gate fix (`project-private-route.tsx:41`) is still
  unshipped — recurrence risk stands.

### ⚠️ Attachments needing human (unviewable behind Atlassian/Freshdesk auth)

Unchanged pattern — screenshots/media still not directly viewable by the agents.
**New this run:** PLT-2906's `section_box.png` (decisive — shows the exact "new
style"); PLT-2884's `.xlsx` (the customer's own old-vs-new activity list — HTTP
403, not even a generic auth wall) and `.xer` schedule (also 403) — both are
genuinely parseable file formats once a human pulls the bytes, unlike the PNGs.

### Off-roster names seen

- **Masum Ahmed** — reporter/assignee on 2649, 2619, 2385 (support/Freshdesk agent).
- **David Webb** — BE/data-pipeline/dagster owner (commenter on 2385, and now the
  peer-pushback voice on 2882).
- **Hussein** (customer-side, PLT-2884) — do not confuse with **Mostafa Kamel
  Hussien** (product owner) — different people, same-sounding name.
- **Jason Fingland** — product designer, first appearance this run (PLT-2649).

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
