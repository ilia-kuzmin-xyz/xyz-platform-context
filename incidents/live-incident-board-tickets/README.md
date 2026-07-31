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

## Run: 2026-07-31 — 2 brand-new tickets deep-dived, 6 re-verified with zero delta, Group B still empty

Board re-queried (`project = PLT AND issuetype = "Live Incident" AND status NOT IN ("With Technical
Support", "Ready For QA", "In Code Review", "READY FOR RELEASE", "Done", "Blocked", "Customer Release
Check")`). 13 rows returned; 5 are `ARCHIVED (NOT RELEASED)` (PLT-1822/1787/1767/1456/457) — treated as
out of scope, same as `Done`, not re-litigated. **8 tickets in scope, all Group A** (`Open`/`In
Analysis`/`With Customer`) — no ticket in `Ready For Development`/`Dev In Progress` this run, so Group
B stays empty, same as 07-22 and 07-30.

**2 tickets are brand new** (created 07-30, after last run's board query) and got a full deep-dive —
description, comments, domain docs, hc-frontend code, confidence score, drafted action. **6 tickets are
carried over from 07-30 with a real re-fetch confirming zero new comments** — re-verified per the
playbook's "light re-verify still needs a real fetch" rule, not rubber-stamped; their `context.md` /
`recommended-action.md` are unchanged since the last run and are not repeated here.

### Group A — new this run (2)

| Ticket | Domain | Status | One-line finding | Drafted action | Conf. |
|---|---|---|---|---|---|
| [PLT-2946](PLT-2946-groupA-progress-tracking/context.md) | progress-tracking | Open | Hutto2 Cable Trays: two symptoms, likely **two different mechanisms** — DH1/B1 undersstates (candidates: FE Gantt `MAX−MIN` window-delta bug found by comparing against a sibling path the repo already fixed; dead-link denominator inflation, Pattern 1's 4th project; count-vs-length unit mismatch) vs DH2/E3 overstates ("25% while nothing installed" — most likely an intangible/labour-based activity being read as a tangible install %, 2nd sighting of PLT-2917's mechanism). Zero technical investigation existed on-ticket before this run; a single DuckDB query (drafted) discriminates all candidates | (a) one internal diagnostic comment + ready-to-run SQL → Rishi Bhugobaun, cc Yash — **not** to the customer yet, no facts established | 5/10 (split; see context.md) |
| [PLT-2945](PLT-2945-groupA-viewer-and-model/context.md) | viewer-and-model | With Customer | DUB7x "missing" elements: Rishi's own in-thread diagnosis (unanswered ask to Ilia/Mostafa) is **confirmed correct in code** — Dashboard hides elements whose planned start is after the date-slider's end (`dashboard-progress-service.ts:1909-1924`, fragments actually hidden not just uncoloured, `dashboard-color-service.ts:488`), Editor has no such gate anywhere. Working as intended, not a bug. His second claim (Roof vs Floor, different loaded geometry) is unverified and self-contradictory as worded — recommend dropping it from the customer reply | confirm mechanism to Rishi (with one wording correction: "hidden" not "uncoloured") + draft customer reply once he confirms the planned dates + recommend **Done**, no dev work | 8/10 |

### Group A — carried over, re-verified, zero delta (6)

No new comments found on any of these six since the 07-30 run (confirmed by live re-fetch, not by
timestamp alone). Existing folders stand unchanged:

| Ticket | Domain | Status | Last real activity |
|---|---|---|---|
| [PLT-2917](PLT-2917-groupA-progress-tracking/context.md) | progress-tracking | Open | 07-27 (customer "little update" comment, already reflected) |
| [PLT-2884](PLT-2884-groupA-data-pipeline/context.md) | data-pipeline | With Customer | 07-20 (Freshdesk → Waiting on customer) |
| [PLT-2858](PLT-2858-groupA-quality-management/context.md) | quality-management | In Analysis | 07-16 (Mostafa "waiting on this since it was asked of me") |
| [PLT-2815](PLT-2815-groupA-quality-management/context.md) | quality-management | With Customer | 07-06 (Freshdesk → Closed; 25 days stale now) |
| [PLT-2649](PLT-2649-groupA-360-captures/context.md) | 360-captures | With Customer | 07-24 (Yash "thanks for the info", after Ilia's model/level/elevation hand-off) |
| [PLT-2619](PLT-2619-groupA-other/context.md) | other | With Customer | 07-27 (Yash "can we update this to new dashboard") |

### Cross-ticket notes (this run)

- **New candidate pattern added to `recurring-defect-patterns.md`**: *"Surface-scoped visibility rule
  mistaken for missing data"* (from PLT-2945), with a documented sibling occurrence already sitting in
  `dashboard-progress-tab-explained.md` §8.4 (project-level version of the same confusion). Two
  occurrences — a human may want to promote it to a numbered pattern next run.
- **Pre-existing data-hygiene issue found, not fixed this run**: `PLT-2884` and `PLT-2909` each have
  **two divergent, never-reconciled context folders** (`PLT-2884-groupA-data-pipeline` +
  `PLT-2884-groupA-progress-tracking`; `PLT-2909-groupA-{data-pipeline,progress-tracking,viewer-and-model}`),
  left over from the "consolidate 31 unmerged context branches into main" merge. Both PLT-2884 folders
  contain substantive, non-duplicate analysis — this run treated `PLT-2884-groupA-data-pipeline` as
  canonical (it matches the domain tag already used in the 07-30 run-log table) and left the
  `-progress-tracking` folder untouched rather than silently merging or deleting it. **Needs a human
  decision**: merge the two into one folder, or explicitly retire one as historical.
- **Open question, not resolved this run**: PLT-2945's investigation surfaced a possibly-stale doc row
  at `dashboard/viewer-and-model.md:10` ("Dashboard selection: DISABLED") — the model-loader path that
  seems to back the current `/projects/:id/dashboard` route (`use-model-loader.tsx:28-52`) sets no
  selection mode at all, but a separate, older path (`viewer-service.ts:167`) still does gate selection
  behind an `_isDashboard` flag via the shared `viewer-y.tsx` component. Which path is actually live was
  not established — left as an open question rather than editing the doc on unconfirmed evidence.
- **PLT-2946 may be the 4th Pattern-1 sighting, or the 2nd sighting of PLT-2917's "faithful-renderer
  of unlabelled intangible progress" mechanism, or an unrelated FE window-delta bug this repo already
  fixed once elsewhere and missed on a sibling code path** — genuinely three live hypotheses, not
  resolved by design (no one has opened the two screenshots or run the drafted query yet). Flagging so
  next run doesn't re-derive this from scratch if it's still open.

### ⚠️ Attachments needing human (unviewable behind Atlassian auth) — this run

**PLT-2946** (2 screenshots, both full-window captures ~1900×900px — almost certainly show the date
range and filter chips in frame, which is the single most load-bearing unknown in the diagnosis; attempts
returned HTTP 503 on the attachment-content endpoint). **PLT-2945** (`Dashboard.png`, `Web Viewer.png` —
needed to settle claim #2, the Roof-vs-Floor discrepancy; claim #1, the actual diagnosis, does not
depend on them). No new attachments on the 6 carried-over tickets this run.

No Jira writes were made this run (no comments, no transitions, no status changes) — every
"recommended action" above is a draft in the ticket's `recommended-action.md` for a human to review
and execute manually.

---

## Run: 2026-07-30 — 6 Group A tickets re-verified, 1 moved to Group B, Group B otherwise empty

Board re-queried (`project = PLT AND issuetype = "Live Incident" AND status NOT IN (...)`) against
the same scope rules. **Same 7 tickets in scope as 07-22 — no brand-new tickets arrived.** Every
ticket already had a folder from a prior run; this was a full re-verification pass, calibrated by
staleness (deep re-investigation where the Jira `updated` timestamp moved past 07-22; light
re-verify otherwise — one of the "light" tickets, PLT-2858, still surfaced a real miss from the
prior run, so light passes are not a rubber stamp).

### Group A (6)

| Ticket | Domain | Status | One-line finding | Drafted action | Conf. |
|---|---|---|---|---|---|
| PLT-2917 | progress-tracking | Open | **Rescoped 07-22** by Mostafa/Yash from FAR01/ELN04/ELN03 to ELN03/`PMILE5030` specifically. Root cause now unified: a milestone has no linked elements, so the Gantt lets you type 100%, but that only `POST`s progress with today's date — **nothing in the platform ever writes Actual Finish Date** (it only arrives via XER), and Actual End Date is exactly what the milestone widget/PowerBI read for "complete". Mostafa's "is it because it's a milestone?" and Pietro's "Actual End Date is missing" are one root cause, not two | (a) one internal comment answering Mostafa directly, routing one closed question each to David Webb (parquet), Sachin (one `api_activities` row), Pietro (still-outstanding: what did his undocumented fix touch?); keep **Open**, reassign Yash→Ilia; spawn DPL + small UX tickets rather than retitling this one | 8.5-9/10 |
| PLT-2858 | quality-management | In Analysis | **Prior run's read was incomplete** — two 07-14 comments were missed: Mostafa asked Darminder a question that's sat unanswered 16 days (likely *why* Mostafa looked stalled — it's a two-way deadlock, not one-sided), and the customer already moved past "teach us how" to asking for a Location dropdown or field removal, mooting the old draft question | (1) Darminder answers Mostafa's 07-14 question — cheapest unblock; (2) escalate directly to **Pietro** now (14 days silent on a Critical, threshold crossed); (3) Yash acknowledges the customer (unanswered 16 days) | 8/10 diag, 7/10 next step |
| PLT-2884 | data-pipeline | With Customer | Confirmed unchanged (root cause: incomplete source XER + PowerBI/Platform sourcing difference, stands). Silence recounted: 20 days since fix handed to customer, 17 since last substantive human update | escalation posture **upgraded from "consider" to a positive recommendation**: move With Customer → With Technical Support and actively chase the re-upload (flagged: that status is on this routine's exclusion list, so the folder must be re-tagged `relocated` once it moves) | 9/10 next step |
| PLT-2815 | quality-management | With Customer | Confirmed unchanged, third consecutive no-delta run. Root cause (reference-data artifact, "as intended") was already 9/10; the underlying Freshdesk ticket has been closed since 07-06 and the JIRA ticket is just sitting open with no one closing it — 24 days stale, the 07-13 "nudge" was in fact never sent | drafted action changed from "(c) nudge" to a **direct close-out**: closing comment (reproduces the €684 vs €843.60 figures, cites the product-owned reference table and Mostafa's decision, cites the closed Freshdesk parent) + recommended `With Customer → Done` transition, as-designed/not-a-bug resolution | 9/10 diag, 8/10 next step |
| PLT-2649 | 360-captures | With Customer | **Root cause now fully pinned** (was 8/10 "wrong Revit elevations, direction TBD" on 07-13): one linked-model level (`"DC - 0G - FFL"`) in the PA12 federation sits at +50.4m instead of ~0, floating all 360 pins in 101 rooms (~1870 captures). Ilia self-served the full model+level ID on 07-24 after Pietro deflected to a feature idea on 07-13. FE transform re-verified unchanged/correct — no FE fix possible or needed | **stay With Customer** — one message to Yash verifying the 07-24 Freshdesk hand-off actually named the model/level/target elevation (a vague hand-off would come back unfixed); pre-agreed close-out check once the corrected model lands | 9/10 root cause |
| PLT-2619 | other | With Customer | **89 days stale, finally moved** — Yash's 07-27 comment ("can we update this to new dashboard") flips the open action onto **us**, and a same-day board sweep found the likely successor, **PLT-2935** (opened 2h31m later by Ilia, targeting a demo project already on the new dashboard) — i.e. the migration this ticket asks for may already be done under a different ticket | one reply to Yash: is the PLT-2935 project the same "Mission Critical Dashboard"? Same → close PLT-2619 into PLT-2935 + close Freshdesk #6492; different → get the project id. Either way: this isn't a live incident (no defect/repro) — recommend taking it off the board | 9/10 classification, 7.5/10 "already superseded" |

### Moved to Group B this run

- **PLT-2874** (was `groupA-viewer-and-model`) — status advanced Open/In Analysis → **Dev In Progress**
  since 07-22; the clarifying-question step drafted in its `recommended-action.md` evidently landed.
  Folder tag renamed to `groupB` per the rename convention. **Bookkeeping only** — per this run's
  scope (Group B action scenario still TBD, "skip those tickets" per the standing instruction), no
  fresh deep-dive was done. Next run: light dev-readiness/fix-ownership check, same as the other
  Group B tickets, rather than a full re-investigation.

### Cross-ticket notes (this run)

- **Process note — light re-verify passes still need a real fetch, not a rubber stamp.** PLT-2858 was
  flagged "light" because its `updated` timestamp predated 07-22, but the live fetch surfaced two
  comments (07-14) that both the 07-13 and 07-22 runs had missed. Staleness-by-timestamp is a good
  *prioritization* signal, not a substitute for actually reading the thread.
- **Two tickets converged on the same shape as PLT-2917 from earlier runs**: "the frontend is a
  faithful renderer of a backend value that was never populated/joined" — now confirmed on milestones
  (PLT-2917, Actual End Date), model counts (PLT-2874, historical), and progress % (PLT-2884,
  historical). Worth the named `pitfalls.md` pattern flagged in the 07-22 run once one of these lands
  a shipped fix.
- **PLT-2619 and PLT-2935 should be looked at together** by whoever picks up the reply — closing
  PLT-2619 without first getting an answer on PLT-2935's open questions would just move the same
  ambiguity to a different ticket number.
- **Escalation posture shifted upward across the board this run**: three tickets (PLT-2884, PLT-2858,
  PLT-2815) moved from "consider escalating" to "recommend escalating/closing now" purely because of
  elapsed silence (17-24 days) crossing thresholds the prior runs had already flagged as approaching.
  None of these are new diagnoses — they're the same findings with the "wait and see" runway used up.

### ⚠️ Attachments needing human (unviewable behind Atlassian auth) — this run

**PLT-2917** (4 items — description's 3 images are broken in Jira for everyone, never re-sent;
decisive one is `ELN03 Milestones Dashboard.xlsx` from 07-27, 403 for the agent — if the client's own
export shows Actual End Dates populated, the diagnosis inverts from "never written" to "dropped on
ingest"). **PLT-2649** (2 PNGs — now corroborative only, the decisive numbers are in the ticket text;
Freshdesk #6622's actual message content is invisible here and is the real gap — did the hand-off
name the model/level/elevation?). **PLT-2858** (new attachment `image-20260714-113920.png` returns
HTTP 403). **PLT-2884**, **PLT-2815**, **PLT-2619** — no new attachments this run; prior gaps stand
as previously documented (2619 has none at all on the Jira side; only Freshdesk #6492 is opaque).

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
