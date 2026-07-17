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

---

## Run: 2026-07-17 — 8 in-scope Group A tickets (Group B skipped this run, per instruction)

Board re-queried via `project = PLT AND issuetype = "Live Incident"`. Since 07-13:
**PLT-2892** → Ready For Release (out of scope, was viewer-and-model), **PLT-2815** → Done
(out of scope), **PLT-2649** → With Technical Support (out of scope — moved exactly per its
07-13 drafted action), **PLT-2890/2742/2759** → In Code Review / Ready For Release (Group B,
out of scope). Two brand-new tickets entered In Analysis (PLT-2909, PLT-2906) and one new
With-Customer ticket appeared (PLT-2884).

### Group A (8) — evaluate / clarify

| Ticket | Domain | Status | One-line finding | Drafted action | Conf. |
|---|---|---|---|---|---|
| PLT-2909 | viewer-and-model | In Analysis (new) | Linked-models panel lists one row per model returned by a non-DISTINCT, no-version-filter query on `project_element_list` — over-reports models for an element whose ID exists in >1 model (shared Revit ID or stale superseded metadata). Mirror-image of PLT-2882's under-report, opposite direction, same data condition. | (a) internal reply (Ilia→Yash, cc Darminder) — mechanism + one data-diff step; ask Yash re-version trigger; check if PLT-2864/26.3.2 already changes this | 7/10 |
| PLT-2906 | viewer-and-model | In Analysis (new) | **4th recurrence** of the fragile Forge-section-box + custom orientation workaround (after PLT-2651, PLT-2756, PLT-2771). PLT-2771 was closed 10 Jul on can't-reproduce/customer-silence — 5 days before this one opened. Symptom differs (no box gizmo at all, global across FAR01/FAR02, started ~14 Jul, no per-model trigger) — smells like a release/version trigger, not Revit data. Two code triggers in-window (PAPI-3226, PLT-2825) ruled out by inspection; no FE commit touches the section box. | (a) routed comment — Yash (gizmo-absent vs tilted, from repro), Rishi (which release FAR is on + why now), Darminder (assign a standing owner); flag recurrence so it isn't re-closed on no-repro again | 4/10 root cause, 8/10 on the recurrence/ownership finding |
| PLT-2882 | progress-tracking | In Analysis | Root cause now **confirmed** (element-metadata-vs-SVF-geometry disagreement from re-versioned source files) — but idle 2 days: David Webb (peer who challenged the RCA) hasn't replied to Ilia's rebuttal, Pietro/Mostafa haven't approved the 418-link deletion. Stuck on attention, not evidence. | (a) nudge + split — fork the uncontested FE-robustness fix into its own dev-ready ticket now; re-ping each of the 3 silent owners with their one closed question | 8/10 (up from 6/10) |
| PLT-2879 | access-permissions | With Customer | New comment (07-13 evening, missed by prior pass): Darminder reframes root cause as a legacy-role-mapping data issue (old-nav "dashboard only" role → should map to `viewer_role`), not the FE gate. Re-verified live: the `project-private-route.tsx` gate (moved 41→49) still lacks `DashboardView` — fix still not applied either way. "With Customer" flip still unexplained. | (a) closed-question status-check → Darminder + Yash: is With-Customer genuine or mis-parked, and is the plan a cohort role-remap? | 7/10 |
| PLT-2874 | viewer-and-model | In Analysis | No new activity except one comment the prior pass missed entirely: **Ilia himself** (07-13, same moment as last triage) already started the diff investigation ("30K-element difference"). Hypothesis (non-DISTINCT count inflation) neither confirmed nor refuted — nobody's run the query yet. | (a) hand Ilia the `COUNT(*)` vs `COUNT(DISTINCT)` query directly (he owns the diff, not Darminder); widget-clarify Q to Mostafa stands in parallel | 6/10 (unchanged) |
| PLT-2858 | quality-management | In Analysis | Pivoted since 07-13: customer now wants a Location **selector or field removal** (believes rooms can't be linked to models). Mostafa asked Darminder a one-line clarifying question (location vs location-detail) 07-14 — **unanswered** — and is now visibly waiting ("waiting on this since it was asked of me", 07-16). Not stuck on product; stuck on one unanswered question. | (a) unblock — draft Darminder's answer + tee up the two customer options, costed, for Mostafa to decide | 8/10 |
| PLT-2884 | progress-tracking | With Customer (new) | New-dashboard Actual 23.85% vs PowerBI 27.37% (3.52pp gap) for EQX-AT10x — schedule-derived PRG reads a stale/incomplete XER (`Rev_02_updated20260427.xer`) missing/under-progressing activities that the Editor (element-status-derived) still shows correctly. Confirms Mostafa's on-thread "it was the XER file" diagnosis independently. Parked ~7 days awaiting customer re-upload. | (a) nudge customer re-upload via Yash + closed Q to Mostafa on the exact XER defect, so the customer instruction is precise | 7/10 |
| PLT-2619 | other | With Customer | **Unchanged since 07-13** — byte-identical thread, still stale (~79 days), still not reclassified. The 07-13 "hand off to product + reclassify" recommendation was never actioned. | (c) hand off to product + reclassify — **repeat of prior action, now flagged as a process problem** (ignored for a second cycle) | 9/10 (up from 8/10) |

### Out of scope this run (moved off the tracked cohort since 07-13)

- **PLT-2892** → Ready For Release. **PLT-2815** → Done. **PLT-2649** → With Technical
  Support (the routine's own 07-13 recommendation was followed). **PLT-2890, PLT-2742,
  PLT-2759** → In Code Review / Ready For Release (Group B backend fixes landed/landing).
- **Group B (PLT-2385)** — status unchanged (Ready For Development); per this run's
  instructions, Group B action-scenario work is deferred, so it was not re-investigated.

### ⚠️ Process flag worth a human's attention

**PLT-2619** has now had the *same* "reclassify, it's not really a live incident" finding
sit un-actioned across two full triage cycles (07-13 → 07-17), 79+ days stale. Either action
the hand-off or explicitly decide it stays on the incident board and why — a third silent
cycle would suggest the recommendation itself isn't reaching anyone.

**PLT-2906**'s regression history (4 section-box incidents, the most recent of which was
closed on "can't reproduce" days before this one opened) suggests the fix from PLT-2651/2756
either didn't stick or has no standing owner — worth a decision independent of this specific
ticket's resolution.

### ⚠️ Attachments needing human (unviewable behind Atlassian/Freshdesk auth) — this run

**PLT-2909**: 2 Freshdesk screenshots + 2 Jira inline images (decisive — shows the
shared-ID-vs-stale-version variant). **PLT-2906**: `section_box.png` (decisive — gizmo-absent
vs merely-tilted) + a SharePoint model-file link. **PLT-2884**: a Jira-native `.xlsx` export
(decisive — itemised old-vs-new activity diff), 3 PNGs, and the `.xer` schedule file, plus 4
Freshdesk links (all confirmed auth-blocked). **PLT-2858**: one 07-14 attachment, still
unviewable. **PLT-2874**: the 2 original description images — re-confirmed inherently
unfetchable (`blob:` URLs).

### Off-roster names seen (new this run)

- **David Webb** — now confirmed as the "peer" who challenged the PLT-2882 RCA (BE/data).
