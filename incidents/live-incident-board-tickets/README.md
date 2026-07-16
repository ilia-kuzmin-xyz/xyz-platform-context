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

## Run: 2026-07-16 (third pass) — 9 in-scope Group A tickets, 2 Group B (skipped)

Full re-query of `project = PLT AND issuetype = "Live Incident"` against the exclusion
list (With Technical Support / Ready For QA / In Code Review / release-family
(READY FOR RELEASE, Customer Release Check, Done, ARCHIVED) / Blocked). 3 brand-new
tickets triaged from scratch; 6 previously-triaged tickets delta-checked against fresh
Jira data (comments re-diffed against what was already recorded — only genuinely new
developments written up, per-file, append-only). Group B action scenario is still TBD
per the operator — **Group B tickets are context-noted only, not triaged this run.**

### Tickets that dropped out of scope since 07-13 (now excluded)

PLT-2892 → READY FOR RELEASE · PLT-2890 → In Code Review · PLT-2759 → READY FOR RELEASE ·
PLT-2742 → READY FOR RELEASE. All four progressed past the board stages this routine
covers — no action needed here.

### Group A (9) — evaluate / clarify

| Ticket | Domain | Status | New this pass? | One-line finding | Drafted action | Conf. |
|---|---|---|---|---|---|---|
| **PLT-2909** | data-pipeline | Open | 🆕 new ticket | ATL08 CY-5200 shows spurious extra "linked" models — activity_links spans multiple models (unique-PK modelElementId ⇒ can't be an FE bug). Likely **same family as PLT-2385**; client says it affects all ATL05-08 | (a) mechanism + confirming query → Ilia; dedupe question → Rishi | 7/10 |
| **PLT-2906** | viewer-and-model | In Analysis | 🆕 new ticket | Section Box mis-orients / stops rendering on FAR01/FAR02+ — our patches mutate **unsupported Forge internals**; no FE code changed since 06-17, so trigger is almost certainly an **Autodesk-side APS/LMV push** ~Jul 13-14, hitting every project | (a) mechanism + version-check repro → Ilia; "why now" (Autodesk release timeline) → Yash | 6/10 (mechanism 9/10, trigger 3-4/10) |
| **PLT-2884** | progress-tracking | With Customer | 🆕 new ticket, **Critical** | New-dashboard Actual% < PowerBI — 3 candidate causes (missing-from-XER / **Pattern A backend parquet bug** on an intangible activity, already seen on ELN03 / PowerBI over-counting) all look identical from outside. Team told the client "it's your XER" on an **unverified** guess | (a) parallel in-house verification (single-activity diff) → Ilia, without disputing the client ask | 5/10 |
| PLT-2882 | progress-tracking | In Analysis | No change (verified) | Root cause confirmed 07-14 (superseded model-content generation, parquet vs geometry mismatch); 418-element deletion still on hold pending peer alignment | unchanged — status-update pending peer + PO sign-off | 9/10 mech |
| PLT-2879 | access-permissions | With Customer | **Yes** — Darminder posted first in-ticket root-cause hypothesis (V1-deprecation/new-nav cutover) 07-13 18:27 | Trigger partially named but unpinned/unowned; **FE gate fix still not landed** — `project-private-route.tsx` was refactored since without adding `DashboardView`; recurrence risk is live | unchanged — status-check → Yash; pin trigger → Darminder | 6-7/10 |
| PLT-2874 | viewer-and-model | In Analysis | Minor — status Open→In Analysis, one comment (Ilia self-assigning the count diff) | 440K vs 470K gap still unexplained pending the COUNT(*) vs COUNT(DISTINCT) query; Darminder hasn't engaged | unchanged — explain + query, now likely run by Ilia not Darminder | 6/10 |
| PLT-2858 | quality-management | In Analysis | **Yes** — customer narrowed to 2 options (add Location dropdown vs remove field); Mostafa's clarifying question to Darminder has sat unanswered ~2 days | Blocker has a code-verified answer already (`format-issues.ts:87-88`, Location=zone vs Location Detail=free-text) sitting undelivered | updated — Darminder → Mostafa/Pietro reply answering the question + A/B decision ask | 8/10 |
| PLT-2815 | quality-management | With Customer | No change | Freshdesk closed 07-06, Jira still open 10 days later — pure hygiene gap | unchanged — nudge to close | 9/10 |
| PLT-2619 | other | With Customer | No change | Mis-filed demo-relink request, now ~78 days stale since last activity, 3 days since flagged mis-filed with still no reclassification | unchanged — hand off to product | 8/10 |

### Group B (2) — context only, NOT triaged this pass (scenario TBD)

| Ticket | Domain | Status | Note |
|---|---|---|---|
| PLT-2649 | 360-captures | Dev In Progress | Moved from In Analysis (07-13 pass) into dev pipeline — prior finding (source-data Revit elevation issue) still holds; not re-verified this pass |
| PLT-2385 | data-pipeline | Ready For Development | Unchanged since 07-13; **PLT-2909 (new, this pass) is a likely same-family duplicate** — see cross-ticket notes |

### Cross-ticket notes

- **PLT-2909 ↔ PLT-2385 (data-pipeline stale-link family):** both are `activity_links` rows surviving model re-versioning and pointing at content from the wrong/superseded model generation. PLT-2909's drafted action explicitly asks Rishi whether PLT-2385/PLT-2650's fix scope already covers ATL05-08 before any new dev ticket is cut — **do not duplicate the fix**.
- **PLT-2882 ↔ PLT-2909/PLT-2385:** all three are variations on the same underlying pattern (activity-linking data outliving the model version it was created against) but are three **distinct mechanisms** (geometry-vs-metadata desync for 2882; multi-model cross-links for 2909/2385) — do not merge, but worth one shared BE conversation about `activity_links` lifecycle hygiene generally.
- **PLT-2879** is the incident `live-incident-playbook.md` was written about. The FE gate fix is still outstanding after two passes — this is now the routine's longest-standing open recurrence risk on a **Blocker**-priority, client-facing ticket.

### ⚠️ Attachments needing human (unviewable behind Atlassian/Freshdesk auth) — this pass

- **PLT-2909** — 2 screenshots + inline blobs, one showing a separate "generate session id" error (split-off signal, needs exact text from Yash)
- **PLT-2906** — `section_box.png`, the single decisive artifact for which failure mode (no-box / degenerate / tilted / plane-only); customer's model file (SharePoint link) for repro
- **PLT-2884** — the attached XER (`EQIX_AT10x-A11x_Rev_02_updated20260427.xer`, decisive — grep for `EL1031000`), an xlsx, 3 PNGs
- **PLT-2858** — new screenshot `image-20260714-113920.png` (not load-bearing — ask is stated verbatim in text)

### 🚩 For the operator's attention (nothing executed, drafted only)

1. **PLT-2884 (Critical)** — client was told "it's your data file" on an unverified guess; the symptom matches a known backend bug (Pattern A) that a re-upload cannot fix, and nobody has opened the attached XER to check. Highest-value single action this pass: run the one 15-minute diff before the client burns days on a re-upload that may not help.
2. **PLT-2879 (Blocker)** — root-cause hypothesis now written down in-ticket, but the FE gate fix is still not in code (file was touched/refactored since without the fix), and no customer confirmation has been posted in 3 days. Recurrence risk from the original SWITCH incident is live.
3. **PLT-2858** — internally stalled ~2 days on a question (Location vs Location Detail) that's already answered in the codebase; a one-line reply from Darminder unblocks a customer-facing decision.
4. **PLT-2619 / PLT-2815** — both are cases where the routine keeps re-confirming the same verdict (mis-filed / needs-closing) every pass with no human action taken. Suggest just actioning these two directly rather than re-triaging again next run.

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
