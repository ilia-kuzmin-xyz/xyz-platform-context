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

## Run: 2026-07-21 — 8 in-scope Group A tickets (Group B not deep-dived, per task scope)

Query: `project = PLT AND issuetype = "Live Incident" AND status NOT IN ("With Technical
Support", "Ready For QA", "In Code Review", "READY FOR RELEASE", "Customer Release Check", "Done",
"Archived", "Blocked")` — 14 hits, 5 of which are `ARCHIVED (NOT RELEASED)` (treated as archived,
excluded) → **9 truly in scope**, 8 Group A + 1 Group B.

### Since last run (2026-07-13 → 2026-07-21) — moved out of scope or resolved
- **PLT-2892, PLT-2879** → **Done.**
- **PLT-2742, PLT-2759** → **Done** (backend PAPI-3344 shipped + backfill landed).
- **PLT-2890** → **Ready For QA** (advanced past Group B scope).
- **PLT-2649** → **With Technical Support** — excluded from this routine's scope by the status
  list, **but flag this one**: the last comment on it (07-17) is **Yash asking Ilia "which model
  do they need to change the level in?"** in response to Ilia's own 07-16 ask (correct level
  `f0f4d409` elevation 50.4→0) — that question is still unanswered as of this run. The status
  transition reads as "handed to technical support to relay to the BIM team," not as "we no longer
  owe an answer." Worth a direct reply even though it's technically out of this routine's scope.

### Group A (8) — evaluate / clarify

| Ticket | Domain | Status | One-line finding | Drafted action | Conf. |
|---|---|---|---|---|---|
| PLT-2909 | progress-tracking | In Analysis (**new**) | ATL05-08: activity linking-list shows wrong/extra models. Code-verified: **different, opposite-direction defect from PLT-2882** — `ElementEntity.getModels()` over-claims model membership from un-deduped `client-element-metas` parquet rows (no geometry filter), vs. PLT-2882's under-resolution/orphaning. Related pipeline family, not a duplicate — a PLT-2882 fix won't fix this. | (a) scoping-correction reply + one parquet-dedup data query | 8/10 mech, 5/10 same-family |
| PLT-2906 | viewer-and-model | Open (**new**) | Section box misalignment, FAR01/FAR02 + others, no re-upload. Code-verified: our own **unconditional `SectionToolOrientation` patch** rotates the box to fit diagonal building footprints — **not** driven by Revit True North (which the assignee had asked the customer to check). True North only explains *which* projects are hit; the actual trigger is a **deploy** of this feature. This overturns the on-ticket hypothesis. | (a) internal course-correction — stop chasing customer True-North data, confirm deploy date instead | 9/10 mech, 8/10 trigger |
| PLT-2884 | data-pipeline | With Customer (**new**) | EQX-AT10x dashboard % variance already attributed to a bad source XER file (product/Mostafa); customer asked to re-upload 07-10, no confirmation since. Purely a stale status-check now. | (c) nudge → Yash → customer | 8/10 |
| PLT-2882 | progress-tracking | In Analysis (unchanged since 07-15) | Root cause confirmed (element-metadata parquet vs SVF geometry disagree after model re-version); 418-link deletion **on hold pending peer alignment**; BE question re: why pipeline leaves stale metadata still open. See `investigation-log.md`. | carried forward — awaiting BE answer, no new action this run | 9/10 root cause |
| PLT-2858 | quality-management | In Analysis (stalled 07-16→07-21) | Root cause unchanged (ML9 has no configured zones). **New this run:** thread hit a circular stall — Mostafa's 07-14 question to Darminder ("difference between Location and Location Detail") was never answered, and Mostafa is citing that silence as blocking his own "leave it with me." Code gives the answer directly (`issue-details.tsx:139-140`) — unblocking it is now the highest-leverage move. Customer also proposed two concrete fallback options (dropdown, or remove the field). | (a) **revised**: post the 2-line unblocking answer first, then the original 3-question message | 8/10 diagnosis, 9/10 on the unblock |
| PLT-2815 | quality-management | With Customer (unchanged since 07-06) | Rework-cost variance reproduced to the cent as a reference-data artifact; code correct; "as intended." | carried forward — nudge → accept/close still stands | 9/10 |
| PLT-2619 | other | With Customer (unchanged since 04-29) | Mis-filed as incident — demo relink request, stale, internal product blocker. | carried forward — hand off to product still stands | 8/10 |
| PLT-2874 | viewer-and-model | In Analysis (unchanged since 07-13) | Editor vs dashboard element-count gap — dashboard "Total" is a non-DISTINCT row count. Unchanged; no new Jira activity this run. | carried forward — `COUNT(*) vs COUNT(DISTINCT)` explainer still stands | 6/10 |

### Group B (1) — not deep-dived this run (scope TBD, per task instructions)
- **PLT-2385** — unchanged, `Ready For Development`. Context from 2026-07-13 run still stands
  (folder: `PLT-2385-groupB-data-pipeline/`).

### Cross-ticket notes (this run)
- **PLT-2882 + PLT-2909 are now a confirmed two-member cohort** of the same metadata-pipeline
  weakness (stale `client-element-metas` after model re-upload/re-version), manifesting in
  **opposite directions** — orphaning (2882) vs. over-claiming (2909). Worth surfacing to BE as one
  pipeline-hardening ask rather than two independent bugs.
- **PLT-2906 is a reminder to verify a hypothesis in code before asking the customer for data** —
  the assignee's own on-ticket ask (Revit True North) turned out to be unable to explain or fix the
  symptom; the actual trigger (a deploy) was internal all along.
- **PLT-2858 is a reminder that "leave it with me" can silently mask a dependency** — the real
  blocker was a small unanswered question, not the big product decision it looked like.

### ⚠️ Attachments needing human (unviewable behind Atlassian/Freshdesk auth) — this run
- **PLT-2906**: `FAR01.png`/`FAR02.png` (True North screenshots, 07-20) and `section_box.png` — per
  the code findings, these will confirm *scope*, not deliver a fix; don't block the internal
  deploy-date check on reading them.
- **PLT-2909**: `image-20260716-112218.png`, `image-20260716-112527.png` — would confirm which UI
  surface + disambiguate the two separate bugs reported in one ticket.
- **PLT-2884**: `.xlsx` variance export + `.xer` schedule file — not needed for the current
  decision (nudge only); relevant only if the customer disputes the diagnosis after re-upload.

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
