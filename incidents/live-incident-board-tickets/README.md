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

## Run: 2026-08-03 — repo hygiene pass + 3 tickets with real movement, 3 confirmed unchanged

**Board re-queried** with the corrected scope rule (`With Customer` in-scope, per this file's own
settled rule above — a first pass this run mistakenly excluded it, matching the same near-miss the
07-24 run flagged; corrected before writing anything). **6 tickets in scope**, same set as 07-30
minus PLT-2884 (now **Done**) plus PLT-2909 (back in scope — see hygiene note below on why it had
dropped out of the run log without actually leaving the board).

### Repo hygiene (done this run, before any triage)

Two structural problems, both from the branch-merge history this file's CLAUDE.md warns about:

1. **A second, stale `live-incident-board-tickets/` existed at the repo root** (outside `incidents/`),
   last touched by the same commit that merged 31 branches into main (`862d276`, 07-30) and never
   updated since — a single-file-per-ticket structure superseded entirely by this folder. **Removed.**
   If a future run finds ticket folders directly under `xyz-platform-context/live-incident-board-tickets/`
   again, that's this same mistake recurring — the canonical location is `incidents/live-incident-board-tickets/`.
2. **PLT-2909 had three duplicate folders** (`-progress-tracking`, `-data-pipeline`,
   `-viewer-and-model`) — three different runs independently triaged it and none of the merges
   deduplicated them. Two were stale early-stage passes (07-16/07-17) with no content not already
   superseded in the third; one (`-data-pipeline`) had literal corrupted tool-call fragments baked
   into its file content, indicating a bad write during a prior merge. **Consolidated into
   `PLT-2909-groupA-progress-tracking`** (kept for the deliberate sibling-sort pairing with
   PLT-2882 that a prior run's cross-ticket note already explains), the other two deleted. This is
   very likely why PLT-2909 silently dropped out of the 07-30 run's table despite still being
   Open/In-Analysis the whole time — worth checking whether other duplicated tickets (**PLT-2884**
   and **PLT-2892** each still have 2 folders per a folder listing this run didn't have budget to
   fully resolve) have caused the same silent-drop failure mode. **Flagging for a dedicated
   cleanup pass**, not fixed this run.
3. **PLT-2917 and PLT-2858's `context.md`/`recommended-action.md` still had unresolved git
   merge-conflict markers** (`<<<<<<<`/`=======`/`>>>>>>>`) baked into the committed file content
   — readable by a human skimming, but a landmine for any tool that greps/diffs these files
   expecting clean markdown. **Resolved** (kept the later/more-complete side in both cases; the
   earlier side's unique content was already recapped in the later side, so nothing was lost).

### Tickets with real movement this run

| Ticket | Domain | Status | What changed | Drafted action | Conf. |
|---|---|---|---|---|---|
| **PLT-2917** | progress-tracking | Open | **Materially resolved on the mechanism.** Pietro + Rishi worked out and are implementing the actual fix in-thread on 07-31 (a missing PBI-side join onto `xyz."ActivityProgress"`/`vw_CurrentUserDefinedProgress"`) — independently of, but consistent with, this file's own Actual-Finish-Date-never-written diagnosis. The 07-30 draft's two routed BE questions are now moot; superseded. Two new open items: what "the remaining task with Darminder's designs" is (unspecified, guess = the already-flagged UX defect, unconfirmed), and whether to drop the `Editor-Progress` feature flag | replace the 07-30 draft with 2 targeted questions (confirm PBI fix against client's own xlsx; what's the remaining task) — see `recommended-action.md` §08-03 | 8/10 mechanism, 4/10 on the guessed remaining-task |
| **PLT-2858** | quality-management | In Analysis | **No diagnostic change — but the stall got worse and a cost assumption was wrong.** Fourth unanswered nudge (Yash, 07-31); 18-21 days of silence across three separate threads; two prior runs' "escalate to Pietro" recommendation still hasn't been posted. Also: the customer's "dropdown" option was mis-costed as "real FE+BE work" — it's actually ~10-15 lines of FE (the API/form plumbing already exists), so the product decision is cheaper than previously scoped on both branches | same escalation as 07-24/07-30, now flagged as urgent-to-actually-post rather than urgent-to-draft | 8/10 diag. (unchanged); this is now a "just post it" situation |
| **PLT-2909** | progress-tracking | Open | Ali engaged with the file + a corrected element sample (07-28); Yash's follow-up ("move this to DPL?") to Ali has sat unanswered **3 days** — not yet stale enough to escalate, first genuinely new development is the folder consolidation above, not the ticket itself | none yet — 3 days is not stale; revisit past ~1 week per this ticket's own established pattern | 9/10 root cause (unchanged) |

### Tickets confirmed unchanged (verified via live `updated` timestamp match, not a rubber stamp — each timestamp matches exactly what the 07-30 pass already recorded as the last activity)

- **PLT-2815** (quality-management, With Customer) — `updated` still 07-06; 28 days stale; 07-30's "recommend direct close-out" stands, still not executed.
- **PLT-2649** (360-captures, With Customer) — `updated` still 07-24; root cause fully pinned per 07-30; still waiting on Yash confirming the Freshdesk hand-off named the model/level/elevation.
- **PLT-2619** (other, With Customer) — `updated` still 07-27; still waiting on the PLT-2619/PLT-2935 duplicate-project question.

### Group B

Empty this run (same as 07-30) — no ticket currently sits in `Ready For Development` / `Dev In Progress`. **PLT-2874** advanced further, Dev In Progress → **Ready For QA**, now out of scope entirely (not just out of Group B).

### Cross-ticket notes

- **The pattern flagged 07-30 continues: analysis is not the bottleneck on this board, posting is.**
  PLT-2858's escalation has been "recommended" three runs running without being executed once.
  PLT-2917's case shows the opposite of that failure mode working correctly elsewhere in the org —
  Pietro/Mostafa/Rishi solved a hard problem over Jira comments in about 3 hours once they actually
  engaged with it (07-31 13:54 → 16:49). The difference is not analysis quality, it's whether the
  thread gets a reply at all.
- **Duplicate ticket folders are a live risk, not just a historical one.** This run found and fixed
  one 3-way duplication (PLT-2909) that appears to have caused a ticket to silently vanish from a
  run's own tracking table despite remaining open the whole time. At least two more (PLT-2884,
  PLT-2892) are known to exist unresolved.

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

## Run: 2026-07-24 — 1 new ticket (missed initially, then corrected), 5 re-checked with 3 real updates, 1 escalation fired

**Scope correction this run:** the run's own filtering pass initially (wrongly) treated Jira status
**"With Customer" as excluded**, conflating it with the actually-excluded **"With Technical
Support"** (no ticket currently holds that status). This folder's own scope rules above already
settled this in a prior run ("With Customer = judgment call... treated as in-scope-but-parked") —
corrected before writing anything, but flagging the near-miss: it would have silently dropped
**PLT-2923**, created the day before this run, from Group A entirely.

Board re-queried (`project = PLT AND issuetype = "Live Incident"`) and filtered per the corrected
scope rules. Of the 7 in-scope Group A tickets, **6 already had folders from prior runs** (re-checked
against fresh Jira data) and **1 is brand new**. Group B (PLT-2918, PLT-2874) is out of scope for
this run's action-drafting per this run's own instructions — noted, not re-investigated.

### Group A (7) — 1 new, 3 with real new findings, 2 unchanged, 1 escalation triggered

| Ticket | Domain | Status | What changed this run | Drafted action | Conf. |
|---|---|---|---|---|---|
| **PLT-2923** | viewer-and-model | With Customer (**new**, created 07-23) | IFC model loads on-device but not in web viewer. Ilia already asked exactly the right 3 questions same-day (source file, export origin, Revit check) | none — correctly waiting on customer, 1 day old | 3/10 (honest research-phase) |
| PLT-2909 | progress-tracking | In Analysis | **ATL08 diagnostic (recommended 07-22) was actually run 07-23** — CONFIRMED ghost model, different trigger family (PC-EXCEL import, not Revit re-upload); routed question now sits with **Ali Seyedof** | none — await Ali's answer (1 day old, not yet stale) | 8/10 (**up from 6/10**) |
| PLT-2649 | 360-captures | Open (⚠️ reverted from In Analysis) | **Missed entirely in the 07-22 run** (not touched). 4 real comments surfaced: Pietro answered the 06-30 ownership question (07-13), Jason Fingland gave product input (07-13), and **Ilia found the precise root cause** (07-16) — one named level (`f0f4d409`), wrong elevation 50.4 (should be 0). Yash's very next question ("which model?") has sat **unanswered 7 days** | **answer Yash's question** — the only missing fact is which model, not new analysis | 9/10 (**up from 8/10**) |
| PLT-2858 | quality-management | In Analysis | No new comments; **the 07-22 run's own escalation trigger fired** — 8 days since Mostafa's last reply, 17 days since the customer's "we don't know how" | escalate to **Pietro directly** (named by both Darminder and the customer already) instead of a 3rd Mostafa nudge | 8/10 unchanged |
| PLT-2917 | progress-tracking | Open | No unaddressed gap — real reply *was* posted 07-22 (3 questions to the customer, different from the drafted "ask Pietro" draft). A related PowerBI-export symptom Mostafa flagged (activity `PMILE5030`) was investigated: **hc-frontend does not own that pipeline**; ties back to the *same* Actual-End-Date mechanism already diagnosed, not a new bug | none — correctly waiting on the customer (Thomas) | 6/10 unchanged (corroborated) |
| PLT-2906 | viewer-and-model | Open | No new comments — still stalled on **our own** unanalysed True-North screenshots, now ~4 days (was ~2) | unchanged: Ilia analyses the screenshots + runs the in-repo diagnostic | 6-7/10 unchanged |
| PLT-2882 | progress-tracking | In Analysis | No new comments on the ticket itself; cross-referenced sibling PLT-2909's new finding (two distinct trigger hypotheses — Revit re-upload here vs Excel-import cross-write there — same downstream symptom) | none — deletion still on hold pending peer alignment (already resolved in-thread) | 9/10 unchanged |

### 2026-07-28 session — outcomes

Three tickets moved materially. Full detail in each folder's `investigation-log.md`.

| Ticket | Outcome |
|---|---|
| **PLT-2931** (ELN03) | **RESOLVED.** 193 dead links deleted and verified (572,591 → 572,398), parquet refreshed, all five activities at 100%, Containment cleared 97% → 100%. |
| **PLT-2882** (FAR01) | **Remediated.** 418 dead links deleted and verified (799,259 → 798,841). Activity has no `activity_progress` rows so no percentages moved, as predicted before approval. Root-cause and FE-guard follow-ups still open. |
| **PLT-2909** (ATL08) | **Cross-write proven without backend help.** Nine non-federated sibling models of incompatible system types claim one identical `sourceFileElementId`. Scope is 366,840 elements (53% of the project), not the six in the ticket. Not remediable by link deletion — the generated metadata itself is wrong, so it is a backend fix. |
| **PLT-2918** (AUS01) | **FE fix raised**, PR [#2078](https://github.com/XYZReality/hc-frontend/pull/2078) on branch `PLT-2918`. Sachin confirmed mappings are hard-deleted with no history, so the backend restore option is closed and the data recovery must be a re-apply from the client's export. Not started. |

**Two new reference docs** came out of this session, both worth reading before the next incident of
this family: `../recurring-defect-patterns.md` (what these keep turning out to be) and
`../data-remediation-runbook.md` (how to execute a bulk data fix safely, including the traps that
nearly caused wrong conclusions — elements vs links, mongo vs postgres ids, `isDeleted` history,
parquet lag).

---

### Late addition (same day, operator-requested): PLT-2931 — third project hit by the stale-links family

| Ticket | Domain | Status | One-line finding | Drafted action | Conf. |
|---|---|---|---|---|---|
| **PLT-2931** | progress-tracking | Open (**new**, created 07-24) | ELN03 Containment package capped at 97%: dashboard Actual % = installed ÷ linked (backend-computed), and dead links inflate the denominator — **88/122 = 72.1% matches the shown 72% exactly**. Third project in the PLT-2882/PLT-2909 family; JUPSC21480 was PLT-2675's exemplar (May), so the earlier cleanup was partial or regressed | (a) 2 DuckDB queries + `__linkDiagnose` on ELN03 (existing branch, no new tooling), then same deletion-approval loop as PLT-2882's 418; **finally run the project-wide sweep** | 8-9/10 |

- **PLT-2931 ↔ PLT-2882 ↔ PLT-2909:** three projects (FAR01, ATL08, ELN03), three surfaces
  (select-does-nothing, wrong model list, % capped below 100), one family. The un-run cohort sweep
  from PLT-2882's log is now the single highest-leverage open item on this board.

### Cross-ticket notes (this run)

- **Pattern across this run: "the ball is on our side and we haven't noticed."** Three of seven
  Group A tickets (PLT-2906, PLT-2649, and — until this run — PLT-2909's diagnostic) share the
  same failure shape: the customer or a teammate supplied exactly what was asked for, and it then
  sat unactioned for days because no one closed the loop. Per the playbook's "evidence requests
  without owners sat idle all day" anti-pattern — worth naming as a recurring team habit to watch
  for, not just three isolated stalls.
- **PLT-2909 ↔ PLT-2882:** now confirmed same defect *family* (stale element-metadata parquet vs
  re-versioned/re-imported geometry) but **two distinct trigger mechanisms** — Revit re-upload
  (PLT-2882) vs Excel/PC-EXCEL import cross-writing buildings (PLT-2909). Keep the BE questions
  (David Webb's thread vs Ali Seyedof's) separate until each is answered; don't assume one fix
  closes both.
- **PLT-2858 escalation:** this is the second consecutive run flagging the same stall on the same
  owner (Mostafa). The escalation candidate named in the 07-22 pass ("loop Pietro directly") is
  now the active recommendation, not a contingency.

### ⚠️ Attachments needing human (unviewable behind Atlassian auth) — this run

**PLT-2923** (1 screenshot — would show the exact web-viewer failure mode before the source file
even arrives). All other Group A tickets' attachments were already flagged in prior runs and
remain unviewed (True-North screenshots on PLT-2906 are the most decisive still-unread artifact
across the whole board, now ~4 days stale on our side).

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
