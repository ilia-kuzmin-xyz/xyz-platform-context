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
  `groupB` (in dev pipeline — Ready For Development/Dev In Progress),
  `resolved` (fix identified/owned elsewhere — e.g. moved to In QA behind a named fix ticket, or
  root-caused to "as designed" — still trackable but no longer needs our evaluation), or
  `relocated` (moved off the PLT board — historical).
- **`<domain>` tag:** `filter-system`, `viewer-and-model`, `quality-management`,
  `360-captures`, `progress-tracking`, `data-pipeline`, `access-permissions`, `other`.

Example: `PLT-2892-groupA-viewer-and-model/`. When a ticket's status changes group
(e.g. Open→Ready-For-Dev), rename the folder's group tag on the next run.

## Scope rules (this routine)

- **Included:** board tickets in `Open`, `In Analysis`, `With Customer` (→ Group A);
  `Ready For Development`, `Dev In Progress` (→ Group B).
- **Excluded:** `With Technical Support`, `Ready For QA`, `In QA`, `In Code Review`,
  release/`Done`/`Archived`, `Blocked`.
- **`With Customer` = judgment call.** Not in the exclusion list, so treated as
  in-scope-but-parked (ball with the client).
- **Group B** context is now captured (per "populate context for all"), but the
  Group B *action* scenario is still TBD — so their `recommended-action.md` files
  are short (dev-readiness note + fix ownership), not full drafted actions.
- Actions are **drafted only** — a human reviews `recommended-action.md` and
  executes any Jira comment / transition manually.

---

## Run: 2026-08-19 — 12 in-scope tickets (up from 9): 2 brand-new (PLT-3063, PLT-3061), 1 advanced to Group B (PLT-3060 → Dev In Progress), 2 reappeared after a silent Technical-Support round trip (PLT-3033, PLT-3024), 1 left scope (PLT-3034), new Pattern 6 promoted

**Board re-queried** (`project = PLT AND issuetype = "Live Incident" AND status IN ("Open", "In
Analysis", "With Customer", "Ready For Development", "Dev In Progress") ORDER BY created DESC`, cross-
checked by paging around the tool's known 5-node-per-call quirk with `key NOT IN (...)` follow-ups
until `remainingCount` hit 0 — same workaround the 08-18 run used). **12 tickets in scope**, up from
9 on 08-18: **11 Group A** (`Open`/`In Analysis`/`With Customer`) + **1 Group B** (PLT-3060, `Dev In
Progress`) — the first non-empty Group B entry this board has ever had.

### PLT-3063 — new this run (quality-management)

**"Dashboard issue numbers are not listed correctly web viewer," DC5, Medium, assigned Darminder,
created 08-18.** Two complaints: (A) dashboard issue numbers don't match the editor's and look
"reversed"; (B) issues #155-158 visible in the editor but absent from the dashboard. **(B) is already
reported resolved** by Yash in the ticket's one comment. **(A) is a verified, specific frontend bug,
not a sort-direction issue:** the dashboard's Quality-panel card renders `#{index + 1}` — list
position — instead of the real `issueNumber`, which is never carried through the dashboard's own
API-to-UI mapper at all (`issue-item.tsx:425`, `use-quality-data.ts:24-105`); the editor renders the
real field correctly (`issue-item.tsx:123`). Both surfaces sort newest-first identically — no inverted
sort exists. Dev-ready, no customer clarification needed. New single-occurrence candidate pattern
added to `recurring-defect-patterns.md`. Full findings: `PLT-3063-groupA-quality-management/context.md`
+ `recommended-action.md`.

### PLT-3061 — new this run (quality-management), and directly related to a long-stalled board ticket

**"CAT2 Rework cost not auto populating," ML9, Medium, assigned Darminder, created 08-17.** Same
code, same file, same reference table as **PLT-2815** (also on this board, quality-management,
44 days stale) — `use-rework-cost-calculation.ts` + `rework_reference.json`. Darminder had already
guessed the right shape in-thread ("it might be values that we don't have set in the reference
table") before any code was read. Verified: the error text the customer saw
(`getEstimatedReworkCostHelperText:203`) only fires on a total lookup miss (Rule 3), and the table
covers exactly three Discipline strings (`CSA`, `Electrical`, `Mechanical`) at any Category — the
working hypothesis is that ML9's issue #1125 carries a Discipline outside those three, a coverage gap
one level coarser than PLT-2815's. Falsifiable in one step (pull the issue's own Discipline/Package
strings), not yet confirmed. **This is the second occurrence of the same underlying shape as
PLT-2815 — promoted to `recurring-defect-patterns.md` as new Pattern 6** ("product-owned reference
table with unbounded coverage"). Full findings: `PLT-3061-groupA-quality-management/context.md` +
`recommended-action.md`.

### PLT-3060 — advanced straight to Group B, skipping Ready For Development

Yesterday's fully-diagnosed ticket (model vanishing from the switcher under an active filter) is now
**Dev In Progress** — Darminder transitioned it directly 08-18 15:31, with no intermediate "Ready For
Development" stop and no comment (our drafted mechanism handoff was never posted; he appears to have
picked it up from the description's own repro). Folder renamed `PLT-3060-groupA-viewer-and-model` →
`PLT-3060-groupB-viewer-and-model` — first-ever non-empty Group B entry on this board. No further
input needed from us.

### PLT-3033 and PLT-3024 — both reappeared after a Technical-Support round trip, one substantive, one empty

Both tickets had left scope earlier this month (→ With Technical Support) and are back `With
Customer` — but the two round trips could not be more different:

- **PLT-3033** (data-pipeline, WI1 B11) — **substantive.** The original blocker (broken description
  images) cleared 08-17 when 4 real attachments landed; Darminder then posted his first real technical
  reply, naming a specific suspect node (`'WI-1_W_WT_B11_2026-8.2 - LIVE - DRAFT'`) and asking for the
  previous + current B11 schedule to compare — a sharper, concrete refinement of the existing H1
  hypothesis, not a new mechanism. That new ask has sat ~2 days unanswered. Confidence up marginally
  (4/10 → 5/10) on sharper framing, not new evidence. Updated draft asks Yash to relay the specific
  schedule-file request rather than repeating the generic "send the XER" ask.
- **PLT-3024** (viewer-and-model, ML9) — **empty.** Zero comments were posted during the ~17-hour
  Technical-Support window (08-17 17:00 → 08-18 10:17, both transitions by Darminder) — no diagnosis,
  no reply to Rishi's now-13-day-old federation question. Reads as a queue bounce that added nothing,
  which if anything strengthens the case (unchanged since 08-14) for telling Yash the mechanism now
  rather than continuing to wait for a volunteer answer. Draft updated with one added line noting the
  round trip added nothing.

### PLT-3034 — left scope this run, naming why per the standing rule

| Ticket | Status now | What happened |
|---|---|---|
| **PLT-3034** | With Technical Support (was Open) | Transitioned 08-18 15:50, **with** a comment this time — but it is Darminder and Yash converging on their own customer-facing workaround (unlink QA-linked elements, or mark as installed), not our drafted answer to Darminder's own FE/BE-taxonomy question. **Different from the usual "our draft landed off-Jira" pattern** — this is a genuinely separate resolution path, recorded as such rather than folded into that pattern. Both our drafted points (the taxonomy answer, the Mech.144.1260 cross-check) remain unaddressed by anyone. Folder kept `-groupA-` per standing precedent. |

### Tickets confirmed unchanged (verified via live JQL fetch, `comment` field included, counts and
timestamps checked verbatim against the 08-18 record — not a rubber stamp)

| Ticket | Domain | Status | Last real activity | Note this run |
|---|---|---|---|---|
| [PLT-3044](PLT-3044-groupA-filter-system/context.md) | filter-system | Open | 08-13 (Mostafa: "nothing from our side... close the ticket") | **new comment 08-18** (Yash posted a bare link to external support ticket #7628, no text) — flagged for whoever executes the close to check first; disposition unchanged, move-to-Done still unposted, now **5 consecutive runs** |
| [PLT-2946](PLT-2946-groupA-progress-tracking/context.md) | progress-tracking | Open | 07-31 (Rishi's PLT-2874 follow-up) | unchanged; customer-status-update draft still unposted, now **20 days** |
| [PLT-2874](PLT-2874-groupA-viewer-and-model/context.md) | viewer-and-model | Open | 08-17 (Darminder: "fix still ongoing") | unchanged; this is now the **second** unqualified "ongoing" claim with no ship date or named mechanism — added a separate sanity-check line to Darminder alongside the existing Gennaro ask |
| [PLT-2858](PLT-2858-groupA-quality-management/context.md) | quality-management | In Analysis | 07-31 (Yash's 4th nudge to Mostafa) | 27 comments, unchanged; escalate-to-Pietro still unposted across **14 consecutive runs**, now **19 days** silent, board's only Critical ticket |
| [PLT-2815](PLT-2815-groupA-quality-management/context.md) | quality-management | With Customer | 07-06 (Freshdesk closed) | 13 comments, unchanged; **44 days stale**, direct close-out still unposted across **14 consecutive runs**; now directly relevant to new ticket PLT-3061 (same subsystem, see Pattern 6) |
| [PLT-2649](PLT-2649-groupA-360-captures/context.md) | 360-captures | With Customer | 07-24 (Ilia handed over the model/level/elevation fix) | 16 comments, unchanged; **26 days** silence on a fix that sits entirely with the client's project-delivery team |
| [PLT-2619](PLT-2619-groupA-dashboard-migration/context.md) | dashboard-migration | With Customer | 08-03 (Freshdesk → Waiting on customer) | 6 comments, unchanged; the two-branch drafted reply to Yash still unsent, question now **23 days** open |

### Cross-ticket notes

- **First non-empty Group B on record.** Every prior run's entire in-scope set was Group A; PLT-3060
  is the first ticket this board has ever tracked reaching Ready For Development / Dev In Progress
  while still being watched here. Per the standing rule, Group B tickets get a one-line status note,
  not a full pass — that's all PLT-3060 gets from here unless it stalls or bounces back.
- **Two reappearances this run, opposite in substance.** PLT-3033's round trip produced real new
  information (images arrived, a named hypothesis); PLT-3024's produced none at all. Worth keeping
  these visibly distinct rather than treating "left scope then came back" as one shape — conflating
  them would hide that PLT-3024's Technical-Support visit was pure queue friction.
- **PLT-3034's left-scope comment is a new shape too** — not our draft landing, not a silent bounce,
  but the team reaching its own separate resolution (a customer-facing workaround) that happens to
  route through the same status transition. Three distinct "leaves scope" shapes now exist on this
  board: silent bounce (PLT-3024 today, PLT-3051/3040/3033/2906 historically), draft landing off-Jira
  verbatim, and team-reached-its-own-answer (PLT-3034 today, PLT-2909 on 08-18). Worth a taxonomy note
  if a fourth shape ever appears.
- **New Pattern 6 promoted** (`recurring-defect-patterns.md`) — PLT-2815 + PLT-3061 are the same
  reference-table-coverage-gap mechanism, five weeks apart, meeting the two-occurrence bar for the
  first time since Pattern 5 was promoted on 08-07.
- **The "recommended but never posted" pattern is now fourteen runs deep on both PLT-2858 and
  PLT-2815** (dating to 07-24) — both drafts exist verbatim in each ticket's `recommended-action.md`;
  nothing further needs drafting, only sending.

### ⚠️ Attachments needing human — this run

- **PLT-3063** — 2 Freshdesk-hosted screenshots + 2 native Jira inline images, none opened (no
  helpdesk session / no authenticated binary fetch available here). Not load-bearing — the numbering
  mechanism is already code-confirmed end-to-end; these would only confirm the exact displayed
  numbers and the pre-fix type/status of issues 155-158.
- **PLT-3061** — 1 screenshot + 1 customer repro video, neither opened (binary media). These carry the
  one fact still needed (issue #1125's exact Discipline/Package strings) — but that fact is more
  reliably pulled directly from the issue record than transcribed from a video, per the drafted action.
- Prior gaps on the seven confirmed-unchanged tickets stand exactly as previously documented
  (PLT-2858's 4 images, PLT-2815's 2 images + inline blobs, PLT-2649's 2 images) — not re-listed here.
  PLT-3060's screen recording is now moot (ticket in Dev In Progress).

### Needing a human now

Ranked by tenure/urgency; unchanged items carried from 08-18 except where noted:

1. **PLT-2858** — post the decision-request to Pietro (cc Mostafa), plus the short answer-Mostafa's-
   question draft that goes with it (both in `recommended-action.md`). Top priority: Critical
   priority, **14 runs** unposted, **19 days** of silence on a decision only product can make.
2. **PLT-2619** — post the reply to Yash once the 30-second URL check is done (drafted, both
   branches ready, now **23 days** open).
3. **PLT-2649** — post the nudge to Yash confirming the 07-24 hand-off carried the detail (drafted,
   **26 days** silence).
4. **PLT-2874** — send Gennaro the two-question ask (project/model name + date-slider screenshot),
   plus the new sanity-check line to Darminder (drafted, unchanged in substance).
5. **PLT-2946** — send the customer status update referencing Rishi's 07-31 finding and the
   PLT-2874 dependency (drafted, unchanged) — **20 days** of unexplained customer silence on an
   internally-solved question.
6. **PLT-3033** — new ask this run: relay Darminder's specific schedule-file-pair request to Matthew
   via Yash (drafted) — the more valuable, more targeted successor to the original "send the XER"
   ask, which is now moot (images arrived).
7. **PLT-3024** — post the internal comment to Yash explaining the confirmed Pattern-5 mechanism,
   now with a line noting the empty Technical-Support round trip (drafted, unchanged in substance).
8. **PLT-3063** — new this run: post the numbering-bug mechanism to Darminder, dev-ready, no
   customer clarification needed (drafted).
9. **PLT-3061** — new this run: ask Darminder to pull issue #1125's Discipline/Package values
   directly rather than waiting on the video (drafted) — settles whether this is the same
   reference-table gap as PLT-2815 in one query.
10. **PLT-2815** — execute the close-out (drafted, 14 runs unposted). Lowest urgency — administrative.
11. **PLT-3044** — execute the move-to-Done (drafted, 5 runs unposted), after checking support ticket
    #7628 (new comment, not yet reviewed). Also administrative.

**Board assessment: the busiest run on record — 12 tickets in scope (up from 9), 2 brand-new, the
board's first Group B entry, and two reappearances of genuinely different character.** None of that
changes the standing bottleneck: analysis is not what's blocking this board, posting is. PLT-2858
crossing 19 days of silence at Critical priority on a ticket only product can unblock, plus the sheer
increase in in-scope volume this run, are both worth surfacing to Ilia.

---

## Run: 2026-08-18 — 9 in-scope tickets: 1 relocated off-board (PLT-2909 → DPL-1684, resolved), 1 left scope (PLT-3024), 1 new ticket (PLT-3060), 2 process gaps caught (PLT-3034 missed 8 days, PLT-2946 missed a same-day flip), Group B still empty

**Board re-queried** (same exclusion list as 08-17, plus a follow-up JQL to enumerate the full
9-ticket in-scope set since the tool paginated the first query oddly — cross-checked by key,
verified complete). **9 tickets in scope, all Group A** (`Open`/`In Analysis`/`With Customer`) —
Group B empty, same as every run to date.

### ✅ PLT-2909 — resolved via relocation, the actual headline this run

The nudge this board has carried unposted for 8 consecutive runs (08-10 through 08-17) turned out
not to need us: **Yash asked Ali directly on 08-17 14:30** ("any update on this? can I move this to
DPL?") and **Ali answered same day 14:33**, agreeing to take it on DPL. The ticket is now **DPL-1684**
on the Data Pipeline board — same content, out of scope here. Folder tag `groupA` → `relocated`
(`PLT-2909-relocated-progress-tracking/`). This is the first time one of this board's long-unposted
drafts got asked and answered without a human executing our draft verbatim — worth noting only
because the standing "needing a human" list has treated this exact item as blocked-on-a-human-sending-
a-message for over a week; it resolved through the team's own initiative instead.

### PLT-3024 — left scope this run, naming why per the standing rule

| Ticket | Status now | What happened |
|---|---|---|
| **PLT-3024** | With Technical Support (was Open) | Transitioned 08-17 17:00, no new comment attached — Rishi's 08-06 federation question is still unanswered (12 days), so unlike most "left scope" events on this board this reads as a genuine, if silent, hand-off rather than a resolved drafted-ask landing off-Jira. No re-investigation; folder kept `-groupA-` for reference. |

### PLT-3060 — new this run (viewer-and-model), and unusually far along for a same-day ticket

**"Model name disappears while Opening Models with Filter Active."** Yash's own numbered repro:
open a model, add a "Progress – Linked" model filter, try to open Model No. 2 — it fails to open and
vanishes from the switcher entirely; clearing the filter brings it straight back. **Traced to a
specific code guard, not a vague timing issue:** the switcher tree (`tree.tsx:79-119`) hides any
model absent from `allowedDbIdsByModel`; that map is only republished when a filter recompute runs
with `executedOutsideFilterPanel !== true` (`filter-service.ts:803-813`), but opening a new model
triggers the recompute through the *element-load* path, which explicitly sets that flag `true`
(`:1059-1073`) — so the newly-opened model's entries are never backfilled into the map until the
filter panel itself is touched again. Adjacent to, but distinct from, the `allowedDbIdsByModel`
staleness Pattern 1 already flagged for element selection (`PLT-2882.../investigation-log.md:29-42`)
— same cache, different consumer (switcher tree, not selection). Recommending **Ready For
Development** — nothing further is needed from the customer, the mechanism is code-confirmed. New
candidate defect pattern added to `recurring-defect-patterns.md`. Full findings:
`PLT-3060-groupA-viewer-and-model/context.md` + `recommended-action.md`.

### PLT-3034 — first triage pass, 8 days after creation (process gap, named plainly)

**"Hutto2 - Wrong actual percent showing on dashboard."** Created 08-10, `Open`/Major the entire
time, never on one of this routine's tables until today — a genuine miss, cause not investigated
rather than guessed at. By the time of this pass the engineering team had already run a 12-comment
investigation without us: ruled out dead/ghost links (Pattern 1) directly, then found one activity's
shortfall traces to a linked element inside a model named `QA-SBX2-FU-FO_ME_MDL_DSI_R23-V74_X` —
i.e. a QA/sandbox model's element counting toward production progress. Darminder's closing question
("can BE tell QA from production?") is answered from the FE side: **no, neither can it** —
`getElementsForActivity`/`useGroupedLinks` resolve purely by element id with no per-model allow-list
anywhere (`linking-service.ts:684-689`), and the project model loader has no name/type-based
exclusion (`project-service.ts:722-723`). This is an absent safeguard spanning FE+BE, not a bug in
existing logic on either side. Drafted comment answers Darminder's question and asks whether the
second affected activity (Mech.144.1260) shows the same shape — nobody has checked yet. New candidate
defect pattern added to `recurring-defect-patterns.md`. Full findings:
`PLT-3034-groupA-progress-tracking/context.md` + `recommended-action.md`.

### PLT-2946 — resurfaced (status flip, not a fresh report), and its own diagnostic was already overtaken

Flipped `With Technical Support` → `Open` at 08-17 11:10 with no new comment — the same "missed by a
few hours" shape as PLT-3024/3033/3040, not a multi-day gap like PLT-3034 above. More importantly,
**this ticket's existing `recommended-action.md` (a drafted DuckDB diagnostic to Rishi) was already
superseded by four comments this folder hadn't caught**: Rishi ran the equivalent check himself on
07-31 and found the displayed percentages match install/late counts, attributing the one real
discrepancy to the object-vs-element mismatch this board tracks as **PLT-2874** (itself still open,
"fix ongoing" as of 08-17 — see below). **18 days of silence to the customer on a ticket answered
internally on day one.** Recommended action changed from "send the diagnostic" to "tell the customer
what Rishi already found and that it's blocked on PLT-2874 shipping." Full update:
`PLT-2946-groupA-progress-tracking/context.md` + `recommended-action.md`.

### PLT-2874 — two new comments, neither answers what we asked

Since the 08-14 draft (asking Gennaro which project/model and to compare date sliders), two comments
landed 08-17: Yash asked Darminder if a fix shipped; Darminder said "fix still ongoing following QA
testing." Neither names the project/model or the slider state this folder's open questions need.
The 08-14 draft is unchanged and still the right message — now doubling as a sanity check on whatever
Darminder's team is testing, in case the fix under test targets the wrong one of the five live
hypotheses. Full update: `PLT-2874-groupA-viewer-and-model/context.md` § 2026-08-18.

### Tickets confirmed unchanged (verified via live JQL fetch, `comment` field included, counts and
timestamps checked verbatim against the 08-17/08-14 record — not a rubber stamp)

| Ticket | Domain | Status | Last real activity | Note this run |
|---|---|---|---|---|
| [PLT-3044](PLT-3044-groupA-filter-system/context.md) | filter-system | Open | 08-13 (Mostafa: "nothing from our side... close the ticket") | unchanged; **recommended move-to-Done still unposted, now 4 consecutive runs** |
| [PLT-2858](PLT-2858-groupA-quality-management/context.md) | quality-management | In Analysis | 07-31 (Yash's 4th nudge to Mostafa) | 27 comments, unchanged; escalate-to-Pietro still unposted across **13 consecutive runs**, now **18 days** silent, board's only Critical ticket |
| [PLT-2815](PLT-2815-groupA-quality-management/context.md) | quality-management | With Customer | 07-06 (Freshdesk closed) | 13 comments, unchanged; **43 days stale**, direct close-out still unposted across **13 consecutive runs** |
| [PLT-2649](PLT-2649-groupA-360-captures/context.md) | 360-captures | With Customer | 07-24 (Ilia handed over the model/level/elevation fix) | 16 comments, unchanged; **25 days** silence on a fix that sits entirely with the client's project-delivery team |
| [PLT-2619](PLT-2619-groupA-dashboard-migration/context.md) | dashboard-migration | With Customer | 08-03 (Freshdesk → Waiting on customer) | 6 comments, unchanged; the two-branch drafted reply to Yash still unsent, question now **22 days** open |

### Cross-ticket notes

- **First run where a long-unposted draft resolved itself through the team's own action rather than
  a human sending our exact draft** (PLT-2909, above) — worth watching as a pattern: some of the
  other long-stalled nudges (PLT-2858, PLT-2909's own former neighbours) may similarly resolve if the
  people involved are simply given enough time, though 8 runs / 18+ days is a long wait to bank on.
- **Two distinct "missed ticket" shapes this run, worth keeping separate.** PLT-3034 is a genuine
  8-day miss with no same-day excuse — flagged plainly rather than folded into the usual
  "missed-by-a-few-hours" note. PLT-2946 *is* the usual few-hours shape (status flipped back into
  scope right around a prior run's own snapshot). Conflating the two would hide that PLT-3034
  represents an actual gap in this routine's coverage, not just query timing.
- **The "recommended but never posted" pattern is now thirteen runs deep on both PLT-2858 and
  PLT-2815** (dating to 07-24) — unchanged, nothing further to draft, only to send.
- **No promotions to a confirmed (non-candidate) pattern this run** — PLT-3060 and PLT-3034 are each
  single-occurrence candidates added to `recurring-defect-patterns.md`.

### ⚠️ Attachments needing human — this run

- **PLT-3060** — one screen recording (88.8MB mp4), not viewed (no video playback here). Not
  load-bearing: the ticket's own text repro is a complete, unambiguous numbered sequence. Would only
  confirm secondary detail (e.g. a brief flash before the model vanishes).
- Prior gaps on the five confirmed-unchanged tickets stand exactly as previously documented
  (PLT-2858's 4 images, PLT-2815's 2 images + inline blobs, PLT-2649's 2 images) — not re-listed here.
  PLT-3024's 3 screenshots and PLT-2909's 2 images are now moot (left scope / relocated).

### Needing a human now

Ranked by tenure/urgency; unchanged items carried from 08-17 except where noted:

1. **PLT-2858** — post the decision-request to Pietro (cc Mostafa), plus the short answer-Mostafa's-
   question draft that goes with it (both in `recommended-action.md`). Top priority: Critical
   priority, 13 runs unposted, 18 days of silence on a decision only product can make.
2. **PLT-2619** — post the reply to Yash once the 30-second URL check is done (drafted, both
   branches ready, now 22 days open).
3. **PLT-2649** — post the nudge to Yash confirming the 07-24 hand-off carried the detail (drafted,
   25 days silence).
4. **PLT-2874** — send Gennaro the two-question ask (project/model name + date-slider screenshot),
   now also serving as a check on whatever fix is currently under QA testing (drafted, unchanged).
5. **PLT-2946** — new this run: send the customer status update referencing Rishi's 07-31 finding and
   the PLT-2874 dependency (drafted) — 18 days of unexplained customer silence on an internally-solved
   question.
6. **PLT-3060** — new this run: post the mechanism to Darminder and recommend Ready For Development
   (drafted) — unusually clean same-day diagnosis, worth moving quickly while it's fresh.
7. **PLT-3034** — new this run: post the answer to Darminder's own question plus the
   Mech.144.1260 check ask (drafted).
8. **PLT-2815** — execute the close-out (drafted, 13 runs unposted). Lowest urgency — administrative.
9. **PLT-3044** — execute the move-to-Done (drafted, 4 runs unposted). Also administrative.

**Board assessment: not quiet this run — one real resolution (PLT-2909), one new ticket, two process
gaps worth a human's attention (see below), and the long-stalled Critical ticket (PLT-2858) crossing
18 days.** Per the standing notification rule, PLT-2858 crossing this many runs unposted on a
Critical-priority ticket, plus the PLT-3034 coverage gap, are both worth surfacing to Ilia rather than
staying silent this time.

---

## Run: 2026-08-17 — 8 in-scope tickets, all 8 confirmed byte-for-byte unchanged since 08-14, one left scope (PLT-3051 → In Code Review), Group B still empty

**Board re-queried** (`project = PLT AND issuetype = "Live Incident" AND status NOT IN ("With
Technical Support", "With QA", "Ready For QA", "In QA", "In Code Review", "Awaiting Release / Done",
"READY FOR RELEASE", "Done", "Customer Release Check", "ARCHIVED (NOT RELEASED)", "Blocked") ORDER BY
created DESC`). **8 tickets in scope, all Group A** (`Open`/`In Analysis`/`With Customer`) — Group B
empty, same as every run to date. Set = the 08-14 run's 9 minus **PLT-3051** (→ In Code Review,
confirmed via direct fetch, out of scope).

This is the first run where **every single carried-over ticket** checked out identical to the prior
run's own record — same comment count, same last-comment timestamp and content, on all 8. Nobody
from the team has replied to anything on this board in the 3 days since 08-14. Read every
`recommended-action.md` before writing this entry (playbook step 0); none needed a new word — all
drafts below are unchanged from 08-14 and are simply re-confirmed as still the right, still-unsent
action.

### PLT-3051 — left scope this run, naming why per the standing rule

| Ticket | Status now | What happened |
|---|---|---|
| **PLT-3051** | In Code Review (was In Analysis) | Transitioned 2026-08-14 17:11, no new Jira comment attached — same "drafted action landed off-Jira" shape as PLT-3040 (08-12), PLT-3033 (08-11), PLT-2906 (08-05). Reads as Darminder having run the `getBulkProperties2` console check this folder handed him (§5 of its `context.md`), confirmed one of H0-H4, and written a fix. No re-investigation done; folder tag kept `-groupA-` per the standing precedent (transitioned out mid-flight, not resolved by us). Brief note added to its own `context.md`. |

### Tickets confirmed unchanged (verified via live JQL fetch, `comment` field included, counts and
content checked verbatim against what the 08-14 run recorded — not a rubber stamp)

| Ticket | Domain | Status | Last real activity | Note this run |
|---|---|---|---|---|
| [PLT-3044](PLT-3044-groupA-filter-system/context.md) | filter-system | Open | 08-13 (Mostafa: "nothing from our side... close the ticket") | 3 comments, unchanged; **recommended move-to-Done still unposted, now 3 consecutive runs** |
| [PLT-3024](PLT-3024-groupA-viewer-and-model/context.md) | viewer-and-model | Open | 08-06 (Rishi's federation question) | 10 comments, unchanged; question now **11 days** unanswered |
| [PLT-2909](PLT-2909-groupA-progress-tracking/context.md) | progress-tracking | Open | 07-31 (Yash → Ali, "move to DPL?") | 11 comments, unchanged; **now 17 days unanswered**; the 08-10-drafted one-line nudge to Ali is still unsent |
| [PLT-2874](PLT-2874-groupA-viewer-and-model/context.md) | viewer-and-model | Open | 08-12 (Gennaro's Staging undercount finding) | 4 comments, unchanged; the drafted ask to Gennaro (project/model name + date-slider screenshot) is still unsent, now **5 days** unanswered |
| [PLT-2858](PLT-2858-groupA-quality-management/context.md) | quality-management | In Analysis | 07-31 (Yash's 4th nudge to Mostafa) | 27 comments, unchanged; escalate-to-Pietro decision request still unposted across **12 consecutive runs** on the board's only Critical ticket, now **17 days** silent |
| [PLT-2815](PLT-2815-groupA-quality-management/context.md) | quality-management | With Customer | 07-06 (Freshdesk closed) | 13 comments, unchanged; **42 days stale**, direct close-out still unposted across **12 consecutive runs** |
| [PLT-2649](PLT-2649-groupA-360-captures/context.md) | 360-captures | With Customer | 07-24 (Ilia handed over the model/level/elevation fix) | 16 comments, unchanged; **24 days** silence on a fix that sits entirely with the client's project-delivery team; the "did the hand-off carry the detail" nudge to Yash is still unsent |
| [PLT-2619](PLT-2619-groupA-dashboard-migration/context.md) | dashboard-migration | With Customer | 08-03 (Freshdesk → Waiting on customer) | 6 comments, unchanged; the two-branch drafted reply to Yash (30-second URL check decides which) is still unsent, question now **21 days** open |

### Cross-ticket notes

- **First fully-static run on record.** Every prior run found at least one new ticket, one status
  change, or one new comment somewhere. This run found zero content changes across all 8 carried-over
  tickets — only the one ticket that left scope moved at all, and it moved without a comment. Worth
  watching whether this is a quiet week or whether posting has stalled even harder than the
  "recommended but never posted" pattern already describes.
- **The "recommended but never posted" pattern is now twelve runs deep on both PLT-2858 and
  PLT-2815** (dating to 07-24) — both drafts exist verbatim in each ticket's `recommended-action.md`;
  nothing further needs drafting, only sending. Every other in-scope ticket this run is in some stage
  of the same shape: a specific, owner-addressed draft sitting unsent while the underlying stall ages.
- **No new candidate defect patterns and no promotions this run** — there was no new investigation to
  produce one; `recurring-defect-patterns.md` is unchanged.

### ⚠️ Attachments needing human — this run

No new attachments on any of the 8 in-scope tickets. Prior gaps stand exactly as previously
documented in each ticket's own folder (PLT-3024's 3 screenshots, PLT-2858's 4 images, PLT-2815's
2 images + inline blobs, PLT-2649's 2 images, PLT-2909's 2 images, PLT-2874's 2 images) — not
re-listed here. PLT-3051's own two attachments (403, needed a human to settle H0-H4) are moot now
that the ticket has moved to code review.

### Needing a human now

Unchanged from 08-14 — the same five drafts, still unsent, ranked by tenure/urgency:

1. **PLT-2858** — post the decision-request to Pietro (cc Mostafa), plus the short answer-Mostafa's-
   question draft that goes with it (both in `recommended-action.md`). Top priority: Critical
   priority, 12 runs unposted, 17 days of silence on a decision only product can make.
2. **PLT-2909** — post the one-line nudge to Ali (drafted 08-10, now 17 days unanswered).
3. **PLT-2619** — post the reply to Yash once the 30-second URL check is done (drafted, both
   branches ready, now 21 days open).
4. **PLT-2649** — post the nudge to Yash confirming the 07-24 hand-off carried the detail (drafted,
   24 days silence).
5. **PLT-2874** — send Gennaro the two-question ask (project/model name + date-slider screenshot)
   before the console/DuckDB follow-up (drafted, 5 days unanswered).
6. **PLT-3024** — post the internal comment to Yash explaining the now-confirmed Pattern-5 mechanism
   (drafted, 11 days since the customer's federation question went unanswered).
7. **PLT-2815** — execute the close-out (drafted, 12 runs unposted). Lowest urgency — administrative,
   not a live customer wait.
8. **PLT-3044** — execute the move-to-Done (drafted, 3 runs unposted). Also administrative.

**Board assessment: quiet, not stuck.** No new customer reports, no new severity, no ticket gone
newly silent — every stall above was already known and drafted for as of 08-14. Per the standing
notification rule, this does not warrant paging Ilia; posting the drafts above is the only thing
that would move the board, and none of them are time-critical beyond what was already true three
days ago.

---

## Run: 2026-08-14 — full board sweep, 9 in-scope tickets, Group B empty, one new-since-last-run pair (PLT-3044, PLT-3051)

**Board re-queried**: `project = PLT AND issuetype = "Live Incident" AND status in ("Open", "With
Customer", "In Analysis", "Ready For Development", "Dev In Progress") ORDER BY created DESC` → 9
tickets, all Group A (Open/In Analysis/With Customer); Group B is empty this run, same as every
prior run. Each ticket was handed to a domain-grouped sub-pass (dashboard-family; viewer-and-model;
quality-management; 360-captures; progress-tracking handled inline) that read its existing folder
first, re-fetched fresh Jira comments, and updated additively. The "(partial)" heading directly
below this one is corrected here — that sub-pass's own write-up only knew about its own 2 tickets,
but this was one slice of a full 9-ticket sweep run in parallel, not a partial run; nothing below
should be read as "not re-checked this run".

**Per-ticket outcome, one line each — full detail in each ticket's own folder:**

- **PLT-3044** (new, filter-system) — conversationally resolved same-day by product; recommend
  **move to Done**.
- **PLT-3051** (new, viewer-and-model) — genuinely open; Darminder mid-investigation; we handed him
  a narrower next step (Forge `getBulkProperties2` with no `categoryFilter`) rather than duplicating
  his check. Attachments unopenable (403).
- **PLT-2619** (dashboard-migration) — the rollout gate is now identified in code (`404` from
  `getProjectDashboardInfo` ⇒ new dashboard, no per-org flag); collapses to a 30-second URL check,
  both reply branches drafted for Yash.
- **PLT-2874** (viewer-and-model) — Staging-only 52,458-element undercount, reopened 08-13; the
  `calculatedOn`-cap hypothesis was narrowed and partly walked back this run (see
  `recurring-defect-patterns.md` 08-14 amendment); asked Gennaro for project/model + a slider
  screenshot before going further.
- **PLT-3024** (viewer-and-model) — mechanism already confirmed (Pattern 5, federated-folder-only
  load); recommend telling Yash the mechanism now rather than continuing to wait on the customer's
  unanswered federation question.
- **PLT-2909** (progress-tracking) — no change; Ali's reply is now 14 days overdue, the 08-10 nudge
  draft is still unsent.
- **PLT-2858** (quality-management, **Critical**, 14 days silent) — most urgent item this run;
  Mostafa's month-old clarifying question turned out to be answerable from the code, so a full
  answer plus a proper decision-request are drafted instead of another nudge.
- **PLT-2815** (quality-management) — product decision already made 06-23, Confluence reference
  table confirmed unchanged since; recommend **move to Done**.
- **PLT-2649** (360-captures) — root cause and exact fix already fully specified 07-24, 3 weeks of
  customer silence since; also caught a bad reparent target in a prior run's stale-pins CSV before
  it could be handed to project delivery.

- **PLT-3044** — *new folder:* `PLT-3044-groupA-filter-system/`. CH08x, "Project Area" filter offers
  disciplines the client doesn't track (Procurement/Design/Milestone). **Already resolved on the
  ticket**: Mostafa said 08-13 it's the client's schedule mapping, already raised with Hussein,
  nothing our side, close it. Recommended action is **move to Done, no further action** (plus unassign
  off Darminder). Mechanism recorded for reference only — dynamic category sections are populated
  from the client's own schedule values with no allow-list (`dashboard-filter-utils.ts:238-306`).
  Deliberately kept separate from PLT-3040 (same client, same screen, different mechanism).
- **PLT-2619** — Jira unchanged (still `With Customer`, 6 comments, `updated` 08-03). What moved is
  ours: the **old-vs-new dashboard switch is now identified in code** —
  `resolveDashboardUrl` (`app/helpers/dashboardNavigation.ts:6-21`) routes to the legacy PowerBI page
  iff the backend still has a report mapped for that project (404 ⇒ new dashboard). **There is no
  per-org rollout flag**; `Dashboard-Mode` is a per-browser cookie. This collapses the long-standing
  "needs human, cohort unknown" step into a 30-second URL check, and both branches of the reply to
  Yash are now drafted. Partly amends the 07-30 "no FE toggle exists" note (conclusion stands,
  mechanism was incomplete).

## Run: 2026-08-13 — PLT-3040 left scope (→ In Code Review), PLT-2874 reopened with a QA-caught Staging regression, 6 confirmed unchanged, Group B still empty

**Board re-queried** (`project = PLT AND issuetype = "Live Incident" AND status NOT IN ("With
Technical Support", "With QA", "In QA", "Ready For QA", "In Code Review", "Awaiting Release / Done",
"READY FOR RELEASE", "Done", "Customer Release Check", "ARCHIVED (NOT RELEASED)", "Blocked") ORDER BY
created DESC`). **7 tickets in scope, all Group A** (`Open`/`In Analysis`/`With Customer`) — Group B
empty, same as every run to date. Set = the 08-12 run's 7 minus **PLT-3040** (→ In Code Review, out
of scope) plus **PLT-2874** (reopened — was out of scope since 07-30, now back as `Open`).

### PLT-2874 — reopened this run (viewer-and-model), the one that needs a human

**QA (Gennaro Boccia) commented 2026-08-12 10:44 on Staging 26.3.4: Editor 603,844 / Dashboard
551,386 — a 52,458-element undercount, on the same ticket where Ilia's own 07-31 "diagnosed and
fixed" comment closed the original overcount and PR #2084 shipped.** Prod, same rewind, shows Editor
603,844 / Dashboard ~604k — matching. Same editor number, two different dashboard numbers, only on
Staging does the pair disagree: this is a live-in-the-tree fix that a QA pass is now saying doesn't
hold on the pre-release build. **Verified the fix is genuinely in the codebase** (not "staging is
missing it" — that would overcount, not undercount, so it's ruled out by direction):
`element-count.ts`'s `countDistinctElements()` (named for PLT-2874 in its own header comment) is
wired into both `dashboard-color-service.ts` colour paths, and the query side now uses `SELECT
DISTINCT`. Git history in this checkout cannot date the fix or find a regression commit — the
50-commit history root is a squashed full-tree import with no PLT-2874 diff visible, and the only
two post-import commits touching this area don't change counts. **Five ranked hypotheses for the
Staging-only gap**, none excluded by code alone because they all differ on data-freshness/artefact
state between environments, invisible from a local checkout: leading (6-7/10) is that the
dashboard's element/link sync is capped at the progress artefact's `calculatedOn`
(`dashboard-progress-service.ts:672,829-858`) while the editor's isn't
(`linking-service.ts:101-104`) — a stale Staging progress calc would produce exactly this, direction
and asymmetry both matching, with zero code difference required between environments. Next are a
version-mismatched object-id-map artefact silently falling back to an older translation, a
progress-derived date-window pinch, silent OPFS staleness on a hash-less artefact, and a latent
null-`modelElementId` drop in the new counting helper itself. **All five are falsifiable from the
Staging browser console and DuckDB panel in about five minutes, no code change needed** — two log
lines plus three `COUNT(DISTINCT modelElementId)` queries at three points in the pipeline localise
exactly where the ~52,000 elements disappear. Full findings, ranked hypotheses and the drafted
comment to Gennaro: `PLT-2874-groupA-viewer-and-model/context.md` §"Reopened 2026-08-13" +
`recommended-action.md`. New candidate defect pattern added to `recurring-defect-patterns.md`
(single occurrence, unconfirmed — see below).

### PLT-3040 — left scope this run, naming why per the standing rule

| Ticket | Status now | What happened |
|---|---|---|
| **PLT-3040** | In Code Review (was Open) | Transitioned 08-12 17:43, no new Jira comment attached — same "drafted action landed off-Jira" shape as PLT-3033 on 08-11. Reads as Darminder having run the drafted category-mapping check, confirmed the mechanism, and written a fix. No re-investigation done; folder tag kept `-groupA-` per the PLT-2874/PLT-2906 precedent. |

### Tickets confirmed unchanged (verified via live JQL fetch, comment counts checked byte-for-byte
against what the 08-12 run recorded — not a rubber stamp)

| Ticket | Domain | Status | Last real activity | Note this run |
|---|---|---|---|---|
| [PLT-3024](PLT-3024-groupA-viewer-and-model/context.md) | viewer-and-model | Open | 08-06 (Rishi's federation question) | 10 comments, unchanged; question now **7 days** unanswered |
| [PLT-2909](PLT-2909-groupA-progress-tracking/context.md) | progress-tracking | Open | 07-31 (Yash → Ali, "move to DPL?") | 11 comments, unchanged; **now 13 days unanswered** |
| [PLT-2858](PLT-2858-groupA-quality-management/context.md) | quality-management | In Analysis | 07-31 (Yash's 4th nudge to Mostafa) | 27 comments, unchanged; escalate-to-Pietro still unposted across **11 consecutive runs** on the board's only Critical ticket |
| [PLT-2815](PLT-2815-groupA-quality-management/context.md) | quality-management | With Customer | 07-06 (Freshdesk closed) | 13 comments, unchanged; **38 days stale**, direct close-out still unposted across **11 consecutive runs** |
| [PLT-2649](PLT-2649-groupA-360-captures/context.md) | 360-captures | With Customer | 07-24 (Yash thanked Ilia) | 16 comments, unchanged; genuinely with the customer's project-delivery team, not a stall on us |
| [PLT-2619](PLT-2619-groupA-dashboard-migration/context.md) | dashboard-migration | With Customer | 08-03 (Freshdesk → Waiting on customer) | 6 comments, unchanged; identity question to Mostafa still the only open item in the family |

### Cross-ticket notes

- **PLT-2874 is a new shape for this board: a QA-caught regression on the run's own past "fixed"
  ticket, not a fresh customer report.** Every other reopening/left-scope event so far (PLT-3033,
  PLT-3040, PLT-2906) has been a forward move (ticket progressing through the pipeline); this is the
  first backward one — a ticket that had left scope as resolved coming back because the fix didn't
  hold everywhere. Worth watching whether "fixed on Prod, unverified on Staging" recurs as its own
  shape now that a QA pass has caught one.
- **The "recommended but never posted" pattern is now eleven runs deep on both PLT-2858 and
  PLT-2815.** Both drafts already exist verbatim in each ticket's `recommended-action.md`; nothing
  further needs drafting, only sending.
- **PLT-3040 leaving scope without a Jira comment continues the pattern from PLT-3033** (08-11) and
  PLT-2906 (08-05): drafted asks that land off-Jira and show up only as a status transition. Treat as
  a positive signal, not a stall, per the standing rule.

### ⚠️ Attachments needing human — this run

No new attachments this run. PLT-2874's investigation needed none — the decisive figures are in
Gennaro's comment text, not an image. Prior gaps on the six carried-over tickets stand exactly as
previously documented.

### Needing a human now

1. **PLT-2874** — new this run: send Gennaro the console/DuckDB check (drafted in
   `recommended-action.md`) before any dev work is guessed at. This is the freshest item on the
   board and the only one where the ball is genuinely on us right now, not parked with a customer.
2. **PLT-2858** — post the escalate-to-Pietro comment (drafted, unchanged, 11 runs unposted). Top
   priority by tenure: Critical priority, 30 days of customer silence on a decision only
   Pietro/Mostafa can make.
3. **PLT-2909** — post the one-line nudge to Ali (drafted 08-10, now 13 days unanswered).
4. **PLT-2619** — post the identity question to Mostafa (drafted, unchanged since 08-04, the only
   open item left in the family since the PR cleared).
5. **PLT-2815** — execute the close-out (drafted, unchanged, 11 runs unposted). Lowest urgency —
   administrative, not a live customer wait.

---

## Run: 2026-08-12 — 1 brand-new ticket deep-dived (PLT-3040), 1 left scope (PLT-3033 → With Technical Support), 6 confirmed unchanged, new candidate defect pattern

**Board re-queried** (`project = PLT AND issuetype = "Live Incident" AND status NOT IN ("With
Technical Support", "In QA", "Done", "READY FOR RELEASE", "Customer Release Check", "Blocked",
"ARCHIVED (NOT RELEASED)") ORDER BY created DESC`). **7 tickets in scope, all Group A**
(`Open`/`In Analysis`/`With Customer`) — Group B empty, same as every run to date. Set = the 08-11
run's 7 minus **PLT-3033** (→ With Technical Support, out of scope) plus **PLT-3040** (new, created
08-11 19:22, same evening as the 08-11 run but after its own JQL snapshot — same missed-by-a-few-
hours shape as PLT-3033 on 08-10 and PLT-3024 on 08-06/08-07).

### PLT-3040 — new this run (progress-tracking)

**"UG electrical displayed more than once in dashboard," CH08-Minooka, Major, assigned Darminder
Atker, reported same evening by Yash, zero human comments yet.** Customer reports a package "UG
electrical" listed twice — once under discipline CSA, once under Electrical — with "nothing mapped"
under the Electrical branch. **Verified this is not corrupt data on its own**: the package-id
resolver's own regression test uses this exact CSA/Electrical/"UG Electrical" shape as its fixture
(`dashboard-filter-service.resolver.test.ts:9-18`) — packages are keyed by id precisely because
names repeat, a design decided by PLT-2821. The real defect is that the *empty* branch is displayed
at all: the progress panel matches each category to its parquet row by id **or by bare
`CategoryName`, unscoped by discipline** (`use-progress-panel-data.tsx:253-259`); a package with
nothing mapped has no parquet row (`progress-queries-v2-api.ts:577`, zero-weight rows dropped at
`:601-606`), so it falls through the name fallback and renders wearing **CSA's own numbers** instead
of disappearing. An independent, structurally identical leak exists one layer over in the filter
panel via a flat, discipline-agnostic `mappedPackages` name set (`dashboard-filter-utils.ts:57,86`).
Both are the unfinished half of PLT-2821, which converted selection to ids but left the data joins
matching on names. Falsifiable in one look at the (currently unrecoverable) screenshot: H1 predicts
the two rows show identical planned/actual/variance figures. A documented alternate mechanism,
PLT-2918-style destructive category-mapping save (H4, 3/10), would mean the Electrical package once
had real mappings and lost them — re-map, don't delete, if so. **The discriminating check needs no
customer input at all**: count Package categories named "UG electrical" on CH08 and their mapping
counts via the Data Mapping panel — this can run in parallel with chasing the image, not gated on
it. Confidence 6/10 the mechanism above is what's actually happening (8/10 the defect itself is
real, whichever ticket it's found on). New candidate defect pattern promoted to
`recurring-defect-patterns.md` (single occurrence — see below). Full findings, five ranked
hypotheses, and the drafted internal comment (mechanism + the one check, addressed to Darminder,
plus a secondary re-send ask to the customer via Yash):
`PLT-3040-groupA-progress-tracking/context.md` + `recommended-action.md`.

### PLT-3033 — left scope this run, naming why per the standing rule

| Ticket | Status now | What happened |
|---|---|---|
| **PLT-3033** | With Technical Support (was Open) | Transitioned 08-11 15:22, no new Jira comment attached — the 08-11 run's own drafted ask (re-send the broken images and, more importantly, the XER file) was apparently acted on outside Jira (Freshdesk/direct contact), or the transition was made in anticipation of asking. Either way this now reads as the drafted action having landed, not as a stall. No re-investigation needed; folder left as `-groupA-` per the PLT-2874/PLT-2906 precedent (transitioned out mid-flight, not resolved). |

### Tickets confirmed unchanged (verified via live JQL fetch, `comment` field included, counts and
`updated` timestamps checked byte-for-byte against what the 08-11 run recorded — not a rubber stamp)

| Ticket | Domain | Status | Last real activity | Note this run |
|---|---|---|---|---|
| [PLT-3024](PLT-3024-groupA-viewer-and-model/context.md) | viewer-and-model | Open | 08-06 (Rishi's federation question) | 10 comments, unchanged; question now **6 days** unanswered |
| [PLT-2909](PLT-2909-groupA-progress-tracking/context.md) | progress-tracking | Open | 07-31 (Yash → Ali, "move to DPL?") | 11 comments, unchanged; **now 12 days unanswered** |
| [PLT-2858](PLT-2858-groupA-quality-management/context.md) | quality-management | In Analysis | 07-31 (Yash's 4th nudge to Mostafa) | 27 comments, unchanged; escalate-to-Pietro still unposted across **10 consecutive runs** on the board's only Critical ticket |
| [PLT-2815](PLT-2815-groupA-quality-management/context.md) | quality-management | With Customer | 07-06 (Freshdesk closed) | 13 comments, unchanged; **37 days stale**, direct close-out still unposted across **10 consecutive runs** |
| [PLT-2649](PLT-2649-groupA-360-captures/context.md) | 360-captures | With Customer | 07-24 (Yash thanked Ilia) | 16 comments, unchanged; genuinely with the customer's project-delivery team, not a stall on us |
| [PLT-2619](PLT-2619-groupA-dashboard-migration/context.md) | dashboard-migration | With Customer | 08-03 (Freshdesk → Waiting on customer) | 6 comments, unchanged; identity question to Mostafa still the only open item in the family |

### Cross-ticket notes

- **PLT-3040 is the third ticket in a row on this board (after PLT-3033, and PLT-3024 before it) to
  arrive with a broken, never-uploaded `blob:` description image** — `attachment: []` live via the
  API, not a permissions gap. This is now a recognisable intake defect (Jira/Freshdesk media
  upload), independent of any one incident's content, and worth flagging upstream if it keeps
  recurring — every new ticket on this board for the past week has needed a re-send.
- **PLT-3040's mechanism is a genuine, if partial, counterexample to Pattern 2** ("the frontend is a
  faithful renderer") — like PLT-2874, the FE here actively synthesises a displayed row (borrowing a
  sibling's parquet data) rather than just passing through an upstream number. Worth remembering
  that Pattern 2 is a reflex to check, not a rule to assume.
- **The "recommended but never posted" pattern is now ten runs deep on both PLT-2858 and PLT-2815.**
  Both drafts already exist verbatim in each ticket's `recommended-action.md`; nothing further needs
  drafting, only sending. Consistent with every run since 08-03: analysis is not this board's
  bottleneck, posting is.
- **PLT-3033 leaving scope without a visible Jira comment is a soft positive signal, not a gap to
  chase.** The 08-11 run's drafted ask evidently reached the customer through some channel (Freshdesk
  or direct), since the ticket moved to exactly the state that ask targeted. Nothing to do here
  unless it reopens without the XER file having actually been provided.

### ⚠️ Attachments needing human — this run

**PLT-3040** — same never-uploaded `blob:` failure mode as PLT-3033: the single description image
never finished reaching Jira (`attachment: []`, confirmed live). It would settle which of two
candidate surfaces (progress breakdown vs filter panel) the customer is looking at and whether the
two "UG electrical" rows show identical numbers — the single cheapest confirmation on the ticket,
but not the blocking one, since the category-mapping check needs no image at all. No new attachments
on the six carried-over tickets this run; prior gaps stand exactly as previously documented.

### Needing a human now

1. **PLT-2858** — post the escalate-to-Pietro comment (drafted, unchanged, 10 runs unposted). Top
   priority: Critical priority, 29 days of customer silence on a decision only Pietro/Mostafa can
   make.
2. **PLT-2909** — post the one-line nudge to Ali (drafted 08-10, now 12 days unanswered).
3. **PLT-2619** — post the identity question to Mostafa (drafted, unchanged since 08-04, the only
   open item left in the family since the PR cleared).
4. **PLT-2815** — execute the close-out (drafted, unchanged, 10 runs unposted). Lowest urgency —
   administrative, not a live customer wait.
5. **PLT-3040** — new this run: get Darminder to run the CH08 category-mapping check (no customer
   input needed), and separately have Yash ask the customer to re-send the broken screenshot; both
   drafted in `recommended-action.md`.

---

## Run: 2026-08-11 — 1 brand-new ticket deep-dived (PLT-3033), 6 confirmed unchanged, Group B still empty

**Board re-queried** (`project = PLT AND issuetype = "Live Incident" AND status NOT IN ("With
Technical Support", "Ready For QA", "In QA", "In Code Review", "READY FOR RELEASE", "Done", "Blocked",
"ARCHIVED (NOT RELEASED)", "Customer Release Check") ORDER BY created DESC`). **7 tickets in scope,
all Group A** (`Open`/`In Analysis`/`With Customer`) — Group B empty, same as every run to date. Set
= the 08-10 run's 6 (PLT-3024, PLT-2909, PLT-2858, PLT-2815, PLT-2649, PLT-2619) **plus PLT-3033**
(new, created 08-10 11:29 — same day as the 08-10 run but apparently after its own JQL snapshot, same
missed-by-a-few-hours shape as PLT-3024 on 08-06/08-07).

### PLT-3033 — new this run (data-pipeline)

**"Extra Parent WBS on Webviewer and inflation of unmapped activity count," WI1 B11, Major, assigned
Darminder Atker.** Customer re-uploaded a 2nd-Aug schedule and now sees (a) an extra parent WBS node
in the Web Viewer tree not present in the source XER, and (b) the "unmapped activities" warning count
jump from <1000 to >2,500, disproportionate to the "only a few hundred" real changes they made.
**Two separate WBS/schedule code paths exist in hc-frontend**: a client-side XER preview parser with a
real, untested bug — on a missing parent reference it silently promotes the orphan row to root
(`schedule-parser.ts:246-262`) and has **no `proj_id` scoping anywhere**, so a multi-project XER
export would merge every project's rows into one tree — but that parser's output has **no callers
into persistence** (`updateScheduleInDb` is dead code for the real upload flow), so it is an
architectural analog, not a proven culprit. The actual render path (`scheduler-service/utils.ts`)
is a faithful renderer with no synthesis logic (`recurring-defect-patterns.md` Pattern 2). The
"unmapped activity count" is a category-mapping concept (not model-linking), and WBS rows are
explicitly excluded from it (`schedule-entity.ts:322-324`) — so the two symptoms aren't directly
causal through the count formula, but a single upstream cause (multi-project merge, or parent-loss
breaking existing activities' mapping-identity match) could still produce both. **The real XER
ingest is backend-side, outside this repo** — this repo cannot go further without either the actual
XER file or the backend ingest code, and the investigation says so explicitly rather than guessing.
Confidence 4/10 overall (lower than most tickets on this board, specifically because the mechanism
sits outside this repository's reach, not from a shallow pass). **Attachments are broken for
everyone, not just this agent** — the assignee (Darminder) already confirmed in-thread that the
description's three images never loaded for him either; this needs a re-send, not different
credentials. Drafted action: ask the customer to re-attach the images **and** send the XER file they
offered but nobody took up — the file settles the leading hypothesis in one query. Full findings:
`PLT-3033-groupA-data-pipeline/context.md` + `recommended-action.md`.

### Tickets confirmed unchanged (verified via live JQL fetch, `comment`/`updated` checked against
what the 08-10 run recorded — not a rubber stamp)

| Ticket | Domain | Status | Last real activity | Note this run |
|---|---|---|---|---|
| [PLT-3024](PLT-3024-groupA-viewer-and-model/context.md) | viewer-and-model | Open | 08-06 (Rishi's federation question) | 10 comments (2 new, both confirmed Freshdesk auto-sync noise, no human reply); question now **5 days** unanswered |
| [PLT-2909](PLT-2909-groupA-progress-tracking/context.md) | progress-tracking | Open | 07-31 (Yash → Ali, "move to DPL?") | 11 comments, unchanged; **now 11 days unanswered** |
| [PLT-2858](PLT-2858-groupA-quality-management/context.md) | quality-management | In Analysis | 07-31 (Yash's 4th nudge to Mostafa) | 27 comments, unchanged; escalate-to-Pietro still unposted across **9 consecutive runs** on the board's only Critical ticket |
| [PLT-2815](PLT-2815-groupA-quality-management/context.md) | quality-management | With Customer | 07-06 (Freshdesk closed) | 13 comments, unchanged; **36 days stale**, direct close-out still unposted across **9 consecutive runs** |
| [PLT-2649](PLT-2649-groupA-360-captures/context.md) | 360-captures | With Customer | 07-24 (Yash thanked Ilia) | 16 comments, unchanged; genuinely with the customer's project-delivery team, not a stall on us |
| [PLT-2619](PLT-2619-groupA-dashboard-migration/context.md) | dashboard-migration | With Customer | 08-03 (Freshdesk → Waiting on customer) | 6 comments, unchanged; identity question to Mostafa still the only open item in the family |

### Cross-ticket notes

- **PLT-3024's "Freshdesk noise" pattern recurred exactly, on the same day PLT-3033 was created** —
  both tickets got a same-morning `Waiting on customer` → `Open` flip-pair from the automation with
  zero human content, right around 08-10 11:29-11:34. Reinforces the existing rule: treat these as
  noise, not as new activity, when judging staleness.
- **The "recommended but never posted" pattern is now nine runs deep on both PLT-2858 and PLT-2815.**
  Both drafts already exist verbatim in each ticket's `recommended-action.md`; nothing further needs
  drafting, only sending. Consistent with every run since 08-03: analysis is not this board's
  bottleneck, posting is.
- **PLT-3033 is a genuinely new incident shape for this board** — the first ticket whose root-cause
  investigation is structurally blocked by the mechanism living entirely outside this repository (no
  Java backend code for XER ingest exists in hc-frontend). Worth watching whether other
  schedule-re-upload tickets hit the same repo-boundary wall; if so, it may be worth a standing note
  in `recurring-defect-patterns.md` that schedule-ingest incidents need backend involvement earlier
  than most other domains on this board.

### ⚠️ Attachments needing human — this run

**PLT-3033** — a different failure mode from every prior ticket's "403/unreadable" gap: the three
description images never actually uploaded to Jira (`attachment: []`, broken `blob:` placeholders),
confirmed unreadable by the human assignee too, not just this agent. Needs a re-send, not different
credentials. The customer's offered-but-unclaimed XER file is the higher-value ask — see
`recommended-action.md`. No new attachments on the 6 carried-over tickets this run; prior gaps stand
exactly as previously documented.

### Needing a human now

1. **PLT-2858** — post the escalate-to-Pietro comment (drafted, unchanged, 9 runs unposted). Top
   priority: Critical priority, 28 days of customer silence on a decision only Pietro/Mostafa can
   make.
2. **PLT-2909** — post the one-line nudge to Ali (drafted 08-10, now 11 days unanswered).
3. **PLT-2619** — post the identity question to Mostafa (drafted, unchanged since 08-04, the only
   open item left in the family since the PR cleared).
4. **PLT-2815** — execute the close-out (drafted, unchanged, 9 runs unposted). Lowest urgency —
   administrative, not a live customer wait.
5. **PLT-3033** — new this run: get Matthew to re-send the broken images and, more importantly, the
   XER file he offered; drafted message in `recommended-action.md`.

---

## Run: 2026-08-10 — 6 tickets in scope (all Group A, Group B empty), 1 real update (PLT-2619/PLT-2935 blocker cleared), 5 confirmed unchanged, 1 corruption fix

**Board re-queried** (`project = PLT AND issuetype = "Live Incident" AND statusCategory != Done`,
then filtered against the standing exclusion list). **6 tickets in scope, all Group A** (`Open` /
`In Analysis` / `With Customer`) — Group B empty. Set = the 08-07 run's 7 minus **PLT-3018** (→
`With Technical Support`, out of scope) and **PLT-3023** (→ `READY FOR RELEASE`, out of scope) and
**PLT-2917** (→ `Customer Release Check` via `Ready For QA`, out of scope — Group B is genuinely
empty this run, not just unobserved). No brand-new tickets since 08-07.

### ⭐ PLT-2619 — the one real update this run

PR #2080 (PLT-2935, the sales-demo planned-% freeze) — flagged unresolved across every run from
08-04 through 08-07 as "green, zero human reviews" — **merged 2026-08-05T19:31:49Z** (Rishi
approved, Ilia merged). PLT-2935 itself is now `Ready For QA`, reassigned to Gennaro. Checked
directly against the GitHub API this run rather than carried forward. This clears the family's only
concrete engineering blocker; the one open item left in the whole PLT-2619/PLT-2935 family is the
still-unanswered identity question to Mostafa (is `69e232b2c222e55fa039eab2` the same asset as
"Mission Critical Dashboard"), unchanged since 08-04. Full detail:
`PLT-2619-groupA-dashboard-migration/context.md` §2026-08-10; `recommended-action.md` updated to
drop the now-moot PR-review nudge.

### Repo hygiene (small, this run)

`PLT-2909-groupA-progress-tracking/context.md` had two stray literal `</content>`/`</invoke>` lines
baked into it (tool-call fragments from a past bad merge, per the same class of corruption the
08-03 run found and partially cleaned elsewhere in this file's history) — removed; no content was
touched.

### Tickets confirmed unchanged (verified via live JQL fetch, `comment` field included, counts
checked against what the 08-07 run recorded — not a rubber stamp)

| Ticket | Domain | Status | Last real activity | Note this run |
|---|---|---|---|---|
| [PLT-3024](PLT-3024-groupA-viewer-and-model/context.md) | viewer-and-model | With Customer | 08-06 (Rishi's federation question) | 8 comments, unchanged; question now **4 days** unanswered; internal draft (code answer to Rishi) still unposted |
| [PLT-2909](PLT-2909-groupA-progress-tracking/context.md) | progress-tracking | Open | 07-31 (Yash → Ali, "move to DPL?") | 11 comments, unchanged; **now 10 days unanswered — crosses this ticket's own ~1-week revisit threshold**; nudge drafted this run |
| [PLT-2858](PLT-2858-groupA-quality-management/context.md) | quality-management | In Analysis | 07-31 (Yash's 4th nudge to Mostafa) | 27 comments, unchanged; escalate-to-Pietro still unposted across **8 consecutive runs** on the board's only Critical ticket |
| [PLT-2815](PLT-2815-groupA-quality-management/context.md) | quality-management | With Customer | 07-06 (Freshdesk closed) | 13 comments, unchanged; **35 days stale**, direct close-out still unposted across **8 consecutive runs** |
| [PLT-2649](PLT-2649-groupA-360-captures/context.md) | 360-captures | With Customer | 07-24 (Yash thanked Ilia) | 16 comments, unchanged; genuinely with the customer's project-delivery team, not a stall on us |

### Cross-ticket notes

- **The "recommended but never posted" pattern is now eight runs deep on both PLT-2858 and
  PLT-2815.** Both drafts already exist verbatim in each ticket's `recommended-action.md`; nothing
  further needs drafting, only sending. This is the most consistent finding across the whole
  routine's history — analysis has not been this board's bottleneck since at least 08-03.
- **PLT-2909 has now crossed the revisit threshold its own history set** (see table above) — first
  ticket this run where the light-pass finding itself changes the recommended action (confirm →
  nudge), not just the staleness count.
- **Review latency, flagged as an emerging pattern on 08-04, resolved itself on this one instance**
  (PR #2080) within a day of that flag — worth noting as a data point against generalizing it into
  a named pattern yet.

### ⚠️ Attachments needing human — this run

No new attachments on any of the 6 in-scope tickets. Prior gaps stand exactly as previously
documented (PLT-3024's 3 screenshots, PLT-2858's 4 images, PLT-2815's 2 images + inline blobs,
PLT-2649's 2 images, PLT-2909's 2 images — see each ticket's own §NEEDS HUMAN, not re-listed here).

### Needing a human now

1. **PLT-2858** — post the escalate-to-Pietro comment (drafted, unchanged, 8 runs unposted). Top
   priority: Critical priority, 27 days of customer silence on a decision only Pietro/Mostafa can
   make.
2. **PLT-2909** — post the one-line nudge to Ali (drafted this run, 10 days unanswered).
3. **PLT-2619** — post the identity question to Mostafa (drafted, unchanged since 08-04, now the
   only open item in the family since the PR cleared).
4. **PLT-2815** — execute the close-out (drafted, unchanged, 8 runs unposted). Lowest urgency of the
   four — administrative, not a live customer wait.

---

## Run: 2026-08-07 — 1 brand-new ticket deep-dived (PLT-3024), 1 left scope to QA (PLT-3023), 1 status-noise correction (PLT-3018), 5 confirmed unchanged, Pattern 5 promoted

**Board re-queried** (`project = PLT AND issuetype = "Live Incident" AND status NOT IN ("With
Technical Support", "Ready For QA", "In QA", "In Code Review", "READY FOR RELEASE", "Done",
"Blocked", "ARCHIVED (NOT RELEASED)") ORDER BY created DESC`). **8 tickets in scope**, 7 Group A + 1
Group B. Set = the 08-06 run's 8 minus **PLT-3023** (→ In QA, out of scope) plus **PLT-3024** (new,
created 08-06 08:17, same day as the previous run but missed by it — created after that run's JQL
snapshot). `In QA` added to the JQL exclusion list and to `live-incident-run-instructions.md` this
run (first sighting, distinct status from `Ready For QA`, same treatment).

### PLT-3024 — new this run (viewer-and-model)

**"Dashboards not showing models for some disciplines," ML9, Major, unassigned to an engineer yet.**
Customer verifying the new Non-PowerBI Dashboard found models with real, Web-Viewer-confirmed linked
elements missing from **both** dashboards (new and old/PowerBI). Rishi's reply already named the
right lead — "confirm these models are in the Federated model?" — unanswered since 08-06 09:16.
**Verified in code:** the Dashboard renders exactly one model (the first one inside a folder named
"federated," `dashboard-project-service.ts:143-205`), and every element-level figure derives from
that single file — this is a hard structural gate, not a heuristic, and independently corroborated
by two `dashboard/pitfalls.md` entries that pre-date this ticket. **What could kill Rishi's theory:**
the old dashboard is a bare PowerBI embed with zero frontend logic, so if it's genuinely missing the
same models, no hc-frontend mechanism explains that half. Second-ranked hypothesis if the models ARE
in the federation: links to a superseded schedule revision resolve to no dates and get hidden — an
**already-documented, still-unfixed** gap (Viewer side was fixed via #2081/PLT-2743, Dashboard was
not). A separate side detail in the same customer comment ("disciplines/packages missing a couple of
days ago") has one plausible dated trigger, **PLT-2918** (a destructive category-mapping save bug,
fixed 08-05 evening, confirmed to have deleted ~2k mappings on a different project) — unconfirmed on
ML9. Full findings, ranked hypotheses (H1-H4) and the drafted internal comment (answers Rishi's own
question with code evidence + flags the PowerBI caveat):
`PLT-3024-groupA-viewer-and-model/context.md` + `recommended-action.md`. **Recurring-defect pattern
promoted this run**: "Surface-scoped visibility rule mistaken for missing data" moves from a
two-occurrence candidate (PLT-2945 + a docs-only FAQ entry) to **Pattern 5**, PLT-3024 being the
third occurrence and the first at model granularity rather than element granularity — see
`incidents/recurring-defect-patterns.md`.

### Left scope this run, naming why per the standing rule

| Ticket | Status now | What happened |
|---|---|---|
| **PLT-3023** | In QA (was Open) | Rishi identified the fix as already tracked in **PLT-2794**, pending release — our drafted diagnostic comment is superseded, nothing further needed from this board. Folder tag `groupA` → `resolved`. Full note: `PLT-3023-resolved-360-captures/context.md` "2026-08-07." |

### PLT-3018 — status-noise correction, no re-investigation

Jira status flipped `With Customer` → `Open` (08-06 14:46), but the only new comment is a bare
Freshdesk auto-sync line with **no human content** — same automation pattern seen firing four times
in five minutes on PLT-3024 the same morning. Treated as sync noise, not a real reopen by Maritza.
**H1 stands confirmed** (Design-vs-Quality issue type, not a defect); no action taken. Full note:
`PLT-3018-groupA-quality-management/context.md` "2026-08-07."

### Tickets confirmed unchanged (verified via live JQL fetch, `comment` field included, counts checked
against what the 08-06 run recorded — not a rubber stamp)

| Ticket | Domain | Status | Last real activity | Note this run |
|---|---|---|---|---|
| [PLT-2909](PLT-2909-groupA-progress-tracking/context.md) | progress-tracking | Open | 07-31 (Yash → Ali, "move to DPL?") | 11 comments, unchanged; **now 7 days unanswered** |
| [PLT-2858](PLT-2858-groupA-quality-management/context.md) | quality-management | In Analysis | 07-31 (Yash's 4th nudge to Mostafa) | 27 comments, unchanged; escalate-to-Pietro still unposted across **7 consecutive runs** (07-24 through today) on a Critical ticket |
| [PLT-2815](PLT-2815-groupA-quality-management/context.md) | quality-management | With Customer | 07-06 (Freshdesk closed) | 13 comments, unchanged; **32 days stale**, direct close-out still unposted across **7 consecutive runs** |
| [PLT-2649](PLT-2649-groupA-360-captures/context.md) | 360-captures | With Customer | 07-24 (Yash thanked Ilia) | 16 comments, unchanged; genuinely with the customer's project-delivery team, not a stall on us |
| [PLT-2619](PLT-2619-groupA-dashboard-migration/context.md) | dashboard-migration | With Customer | 08-03 (Freshdesk → Waiting on customer) | 6 comments, unchanged |

### Group B — one line

- **PLT-2917** (progress-tracking, Dev In Progress) — unchanged since 08-05 (Pietro: "will be
  completed this week"; Yash flagged the client audience as senior). No new comments this run.

### Cross-ticket notes

- **Freshdesk auto-sync noise is now a recognised artefact of this board, not a one-off.** Both
  PLT-3024 (four Open↔Waiting-on-customer flips in 5 minutes) and PLT-3018 (one flip) this run
  produced bare "Freshdesk ticket status changed to: X" comments with no human content. Treat these
  as noise unless accompanied by an actual reply — do not count them as "new activity" when judging
  staleness.
- **The "recommended but never posted" pattern is now seven runs deep on both PLT-2858 and
  PLT-2815** (07-24/07-30/08-03/08-04/08-05/08-06/08-07) — both drafts already exist verbatim in
  each ticket's `recommended-action.md`; nothing further needs drafting, only sending. This is the
  fourth additional run confirming the 08-03 run's own diagnosis: analysis is not this board's
  bottleneck, posting is.
- **Pattern 5 promotion (see PLT-3024 above)** is the first defect-pattern promotion since Pattern 4
  — worth a glance at `recurring-defect-patterns.md` next time a "visible on one surface, not the
  other" ticket lands; the recognition signature now covers model-level and element-level gates.

### ⚠️ Attachments needing human — this run

**PLT-3024** (3 items — new dashboard, old dashboard, Web Viewer linked-models screenshots, all
unopened). The Web Viewer screenshot in particular may already show the missing model's
folder/name, which would answer the open federation question without waiting on the customer —
worth opening before anything else on this ticket. No new attachments on PLT-3018/PLT-3023 beyond
what prior runs already flagged.

---

## Run: 2026-08-06 — 1 brand-new ticket (PLT-3023), 1 left Group A (PLT-2917 → Dev In Progress), 1 resolved-on-inspection (PLT-3018), 5 confirmed unchanged

**Board re-queried** (`project = PLT AND issuetype = "Live Incident" AND status NOT IN ("With
Technical Support", "Ready For QA", "In Code Review", "READY FOR RELEASE", "Done", "Blocked",
"ARCHIVED (NOT RELEASED)") ORDER BY created DESC`). **8 tickets in scope**, 7 Group A + 1 Group B.
Set = the 08-05 run's 7 minus **PLT-2917** (→ Dev In Progress, now Group B) plus **PLT-3023** (new,
created 08-06 06:30, same morning as this run).

**Left Group A this run**, naming why per the standing rule:

| Ticket | Status now | What happened |
|---|---|---|
| **PLT-2917** | Dev In Progress (was Open) | Pietro committed "will be completed this week" (08-05); folder retagged groupA→groupB per the PLT-2874 precedent, bookkeeping note only, no fresh deep-dive — full detail in `PLT-2917-groupB-progress-tracking/context.md` §"2026-08-06 — left Group A scope." |

### PLT-3023 — new this run (360-captures)

**"Issues with 360 Photo Custom Capture Points in XYZ App, Dashboard and web viewer," LVN - BL1-2,
Major, assigned Rishi Bhugobaun.** Client used the mobile app's new "Add New Custom Capture Points"
feature; Web Viewer, Dashboard and mobile app now all disagree — Building 1's 10 external captures
collapsed into a single point in the Web Viewer and don't appear at all in the Dashboard; Building
2's points show 2-3 photos grouped per point and the Dashboard/Viewer positions disagree.
**Exhaustive code search found no "custom capture point" concept anywhere in hc-frontend** — the new
mobile flow writes into the exact same data model as the old room-based flow, and every surface
groups photos into a point purely by matching `roomCapturePointId`, with zero spatial-proximity logic
anywhere in the pipeline (9/10 confidence on that negative claim). Leading hypothesis for the
10-into-1 collapse: those ten capture records share one `roomCapturePointId` (or are all null),
almost certainly written by the new mobile flow — a single DB lookup on Building 1's captures settles
it. Secondary hypothesis for Building 2's Viewer-vs-Dashboard position mismatch: the two surfaces
break timestamp ties differently when picking a point's "representative" photo (Dashboard has a
deterministic secondary sort key; Web Viewer's plain-JS sort does not) — falsifiable by checking for
near-simultaneous `imageTakenOn` values with differing coordinates. A confirmed, unrelated asymmetry:
Web Viewer supports incremental capture refresh, Dashboard always does a full fetch, and the
in-memory sync clock resets on every reload (`LastSyncService`'s persistence methods are dead code) —
plausible but unconfirmed explanation for Building 1's Viewer-missing points, falsifiable with one
hard reload. No frontend mechanism was found for Building 1's points being fully absent from
Dashboard — flagged as likely backend/indexing, not guessed at further. Full findings, ranked
hypotheses and the drafted internal comment: `PLT-3023-groupA-360-captures/context.md` +
`recommended-action.md`. **New pattern candidate** (shared-key grouping with no spatial fallback,
colliding under a new high-volume creation flow) — not yet in `recurring-defect-patterns.md`, single
occurrence, not promoted.

### PLT-3018 — resolved on inspection, ball now with customer

Rishi independently watched the video attachment (08-05, after this ticket's first-pass `context.md`
was already drafted) and confirmed the leading hypothesis exactly: Maritza's first issue was `Design`
type, not `Quality` — Severity only renders for `Quality`-type issues, by design, not a bug. Status
moved Open → With Customer the same day. The drafted internal comment in `recommended-action.md` was
never needed and is now marked superseded; current recommended action is **none — correctly waiting
on the customer**. Second ticket in a row on this board (after PLT-2858) whose reported symptom
turned out to have no code defect behind it on inspection.

### Tickets confirmed unchanged (verified via live JQL fetch, `comment` field included, counts checked
against what the 08-05 run recorded — not a rubber stamp)

| Ticket | Domain | Status | Last real activity | Note this run |
|---|---|---|---|---|
| [PLT-2909](PLT-2909-groupA-progress-tracking/context.md) | progress-tracking | Open | 07-31 (Yash → Ali, "move to DPL?") | 11 comments, unchanged; **now 6 days unanswered** |
| [PLT-2858](PLT-2858-groupA-quality-management/context.md) | quality-management | In Analysis | 07-31 (Yash's 4th nudge to Mostafa) | 27 comments, unchanged; escalate-to-Pietro still unposted across **5 consecutive runs** on a Critical ticket |
| [PLT-2815](PLT-2815-groupA-quality-management/context.md) | quality-management | With Customer | 07-06 (Freshdesk closed) | 13 comments, unchanged; **31 days stale**, direct close-out still unposted across **6 consecutive runs** |
| [PLT-2649](PLT-2649-groupA-360-captures/context.md) | 360-captures | With Customer | 07-24 (Yash thanked Ilia) | 16 comments, unchanged; genuinely with the customer's project-delivery team, not a stall on us |
| [PLT-2619](PLT-2619-groupA-dashboard-migration/context.md) | dashboard-migration | With Customer | 08-03 (Freshdesk → Waiting on customer) | 6 comments, unchanged |

### Cross-ticket notes

- **Two tickets in a row (PLT-2858 family, now PLT-3018) whose customer-reported symptom resolves to
  "as designed" on inspection, not a code defect.** PLT-3018 is the second sighting of "QA/issue-form
  field editability mistaken for a bug" after PLT-2858 and PLT-3018-in-the-08-05-run's own note —
  worth promoting to a named shape in `recurring-defect-patterns.md` if a third sighting lands.
- **The "recommended but never posted" pattern is now five runs deep on PLT-2858 and six on
  PLT-2815** (07-24/07-30/08-03/08-04/08-05/08-06 and 07-30/07-31/08-03/08-04/08-05/08-06
  respectively) — both drafts already exist verbatim in each ticket's `recommended-action.md`;
  nothing further needs drafting, only sending. Per the 08-03 run's own diagnosis, analysis is not
  this board's bottleneck — posting is, and that has now held true for three additional runs.
- **PLT-3023 is a genuinely new incident shape for this board**: not a data/elevation error (PLT-2649)
  and not a config/type-gating non-bug (PLT-2858, PLT-3018) — a shared grouping key colliding under a
  new high-volume mobile creation flow, with a secondary tie-break asymmetry between Viewer and
  Dashboard layered on top. Worth watching whether "new mobile capture flow ships data the FE grouping
  contract wasn't written for" recurs as other new capture features ship.

### ⚠️ Attachments needing human — this run

**PLT-3023** (6 items — 2 mobile app, 2 web viewer, 2 dashboard, all unopened — corroborative given
the description is already detailed, but worth a look before the DB lookup in case a screenshot shows
a duplicate/label directly). No new attachments on the five unchanged tickets this run (prior gaps
stand as previously documented). PLT-3018's video is now lower priority since Rishi already resolved
the mechanism from it independently.

---

## Run: 2026-08-05 — 1 brand-new ticket (PLT-3018), 2 left scope (1 advanced, 1 resolved), 6 confirmed unchanged

**Board re-queried** (`project = PLT AND issuetype = "Live Incident" AND status NOT IN ("With
Technical Support", "Ready For QA", "In Code Review", "READY FOR RELEASE", "Done", "Blocked",
"ARCHIVED (NOT RELEASED)") ORDER BY created DESC`). **7 tickets in scope**, all Group A (Open/In
Analysis/With Customer) — Group B empty again, same as every prior run. Set = the 08-04 run's 8
minus **PLT-2906** (→ Ready For QA) and **PLT-3010** (→ Done) plus **PLT-3018** (new, created
08-05 05:57, same day as this run).

**Left scope this run, per the 08-04 run's own adopted rule** — naming why, not just dropping them:

| Ticket | Status now | What happened |
|---|---|---|
| **PLT-2906** | Ready For QA (was In Code Review) | PR #2069 merged — the 08-04 run's "11 days open, zero approvals" risk resolved itself. Kept `groupA` folder tag per the PLT-2874 precedent (advanced past scope but not yet Done); full detail in `PLT-2906-groupA-viewer-and-model/context.md` §"Left scope 2026-08-05". |
| **PLT-3010** | Done | Resolved as a **project weighting-basis mismatch** (element vs labour), not a data/calculation bug — second occurrence of `recurring-defect-patterns.md` Pattern 3 ("check settings before data"), first time that pattern has manifested as a headline-%-level disagreement rather than a hidden filter category. Folder renamed to `PLT-3010-resolved-progress-tracking`. |

### PLT-3018 — new this run (quality-management)

**"Unable to edit the severity of the QA report," LVN project, assigned Rishi Bhugobaun.** Customer
can edit Severity on coworkers' QA issues but not her own — an inverted-looking symptom that reads
like an ownership bug. **Exhaustive grep of the QA issue form found no ownership/role-based gate
anywhere in the frontend** (9/10 confidence on that negative claim) — so the `!==`/`===` inversion
theory Yash's own comment half-suggested is dead. Leading hypothesis instead: Severity only renders
when the issue's Type resolves to exactly `Quality` (`issue-form.tsx:423`); "her issues" and
"coworkers' issues" may simply be two different Type populations by habit, which would produce this
exact symptom with **zero code bug**. 5/10 on that mechanism specifically, deliberately not rounded
up — nothing confirmed yet against a real LVN issue. Full findings, alternates (status-gated
all-fields-disabled; empty per-project severity list) and the drafted routing comment to Rishi:
`PLT-3018-groupA-quality-management/context.md` + `recommended-action.md`. **This is a new
defect-shape candidate** (field absent due to a conditional render vs an actual permission) — not
yet in `recurring-defect-patterns.md`, single occurrence, not promoted.

### Tickets confirmed unchanged (verified via live JQL fetch, `comment` field included — not a
rubber stamp: comment counts checked, not just the `updated` timestamp)

| Ticket | Domain | Status | Last real activity | Note this run |
|---|---|---|---|---|
| [PLT-2917](PLT-2917-groupA-progress-tracking/context.md) | progress-tracking | Open | 08-03 (Darminder confirmed PLT-2524) | 17 comments, unchanged |
| [PLT-2909](PLT-2909-groupA-progress-tracking/context.md) | progress-tracking | Open | 07-31 (Yash → Ali, "move to DPL?") | 11 comments, unchanged; **now 5 days unanswered**, approaching the ~1-week revisit threshold |
| [PLT-2858](PLT-2858-groupA-quality-management/context.md) | quality-management | In Analysis | 07-31 (Yash's 4th nudge to Mostafa) | 27 comments, unchanged; escalate-to-Pietro still unposted across **4 consecutive runs** on a Critical ticket |
| [PLT-2815](PLT-2815-groupA-quality-management/context.md) | quality-management | With Customer | 07-06 (Freshdesk closed) | 13 comments, unchanged; **30 days stale**, direct close-out still unposted across **5 consecutive runs** |
| [PLT-2649](PLT-2649-groupA-360-captures/context.md) | 360-captures | With Customer | 07-24 (Yash thanked Ilia) | 16 comments, unchanged; genuinely with the customer's project-delivery team, not a stall on us |
| [PLT-2619](PLT-2619-groupA-dashboard-migration/context.md) | dashboard-migration | With Customer | 08-03 (Freshdesk → Waiting on customer) | 6 comments, unchanged |

### Cross-ticket notes

- **The "recommended but never posted" pattern is now on two tickets, not one.** PLT-2858's
  escalate-to-Pietro has stood unposted across 07-24/07-30/08-03/08-04 (four runs); PLT-2815's
  direct close-out has stood unposted across 07-30/07-31/08-03/08-04/08-05 (five runs, though this
  run only re-confirms rather than re-drafts). Per the 08-03 run's own diagnosis, analysis is not
  this board's bottleneck — posting is. Both drafts already exist verbatim in each ticket's
  `recommended-action.md`; nothing further needs drafting, only sending.
- **PLT-3018 is the second ticket in a row (after PLT-2858) whose customer-reported symptom turned
  out, on code inspection, to have no code defect behind it** — worth watching whether "QA form
  field editability" is becoming a recognizable shape (config/Type-gating mistaken for a bug) the
  way progress-% mismatches already are (Patterns 2-4).

### ⚠️ Attachments needing human — this run

**PLT-3018** (1 video + 3 screenshots, all unopened — the video is the single highest-value item on
the whole board right now: it would very likely settle the entire ticket by showing the Type and
Status on both the broken and working issues, which is exactly what the drafted Jira comment asks
for). No new attachments on the six unchanged tickets this run; prior gaps stand as previously
documented. PLT-2906's decisive unread artifact (the 07-31 "resolved" screenshot) is now lower
priority since the ticket independently reached Ready For QA.

---

## Run: 2026-08-04 — 1 brand-new ticket, PLT-2906 recovered (+2 corrections to prior runs), 2 with real movement, 4 confirmed unchanged, second duplicate-folder cleanup

**Board re-queried.** **8 tickets in scope**: same 6 as 08-03 (PLT-2917, PLT-2909, PLT-2858,
PLT-2815, PLT-2649, PLT-2619) **plus PLT-2906** (recovered — see below) **plus PLT-3010** (new,
created 08-03 17:06, after the 08-03 run's own commit). Group B empty again — nothing sits in
Ready For Development / Dev In Progress. Four tickets had a Jira `updated` timestamp that had
moved *after* the 08-03 run's own commit (08-03 07:13 UTC / 08:13 BST) — PLT-2917, PLT-2619,
PLT-2906, plus new-ticket PLT-3010 — and got a full fresh pass; the other four (PLT-2909, PLT-2858,
PLT-2815, PLT-2649) had `updated` bit-for-bit unchanged since the 08-03 run's own live check, so
were carried forward with a one-line confirmation rather than a full re-read.

**PLT-2906** (flagged because it vanished from the 07-30 and 08-03 tables). Full detail in
`PLT-2906-groupA-viewer-and-model/context.md` §2026-08-04. Three things other runs need:

| Ticket | Domain | Status | Finding | Drafted action | Conf. |
|---|---|---|---|---|---|
| **PLT-2906** | viewer-and-model | **Open** (back in scope 08-03 16:26) | **Not stalled — resolved on the mechanism and stuck on delivery.** Root cause **CONFIRMED** 07-24 by Ilia's live FAR01 diagnostic: TN 272.2914° folds to 2.29°, under the 5° "no rotation" dead-band, so the guard meant to defer to Revit shared coordinates didn't fire; tightness 0.8806 (< 0.9) let the patch run and overwrite the correct transform with a −20.46° footprint estimate — ~18° wrong across the whole federated model. Fix written: **PR [#2069](https://github.com/XYZReality/hc-frontend/pull/2069)** (5° → 0.5°, plus `compose` instead of `makeRotationZ` to stop wiping shared-coordinate translation/scale, plus pinned FAR01/FAR02 tests). ⚠️ **PR open 11 days, CI green, zero human approvals, `master` still unfixed — while Freshdesk #7424 was closed 08-03 on "it ships in 26.3.4"** | (a) one comment to Darminder: approve #2069 or name who should; (b) separate message to the release owner: is 26.3.4 cut, and is #2069 in it. No customer message needed | 9/10 root cause · 8/10 fix completeness · 4/10 on the 07-14 trigger (**down** from 6/10) |

### ⚠️ Two corrections to earlier runs in this file

1. **PLT-2906's disappearance was *not* the PLT-2909 silent-drop bug — and it was not a scope
   error either.** The ticket sat in **In Code Review** from 07-24 14:53 to 08-03 16:21, which
   this file's own scope rules exclude. Both the 07-30 and the 08-03 runs were **correct** to leave
   it out. **The failure is that neither run said so.** The exit was recorded only inside the
   ticket folder by an out-of-band 07-28 session, on a branch that did not reach `main` until
   07-31 — so the 07-30 run could not read it and the 08-03 run did not look. A Major incident with
   a customer promise attached went 10 days unexamined, and re-entered scope on 08-03 without
   anyone noticing. **Rule worth adopting: every run table gets an explicit "left scope this run"
   row naming the status that removed the ticket, and each run re-queries once without the status
   filter to catch returnees.**
2. **The 08-03 run's stated cause for PLT-2909's 07-30 drop is wrong.** Its two duplicate folders
   (`-data-pipeline`, `-viewer-and-model`) were **created by `862d276`, the 07-30 run's own
   consolidation commit** — at 07-30 run start `main` held exactly one PLT-2909 folder. The stale
   root-level `live-incident-board-tickets/` the 08-03 run removed was also created by `862d276`.
   Duplicate folders are a real hygiene problem but they are a *product* of that run, not a cause
   of anything before it. **Whatever dropped PLT-2909 from the 07-30 table is still unexplained —
   re-check it (start with its status history), and don't assume PLT-2884/PLT-2892's duplicate
   folders caused drops either.**

### Process note

The 07-30 run's opening claim, *"Same 7 tickets in scope as 07-22 — no brand-new tickets arrived,"*
is contradicted by the 07-22 table in this same file: the two sets overlap on only three tickets,
and PLT-2923 and PLT-2931 (both created before 07-30, both introduced in the 07-24 section that
`main` did not yet have) are absent from it. Continuity claims between runs are worth checking
against the previous table rather than asserted.

---

### Repo hygiene (second pass — the 08-03 run's own flagged cleanup debt)

The 08-03 run explicitly deferred two known duplicate-folder cases (PLT-2884, PLT-2892) citing
budget. Both resolved this run:

- **PLT-2892**: `-groupA-viewer-and-model` was a stale pre-resolution snapshot (still described the
  ticket as "freshly triaged, no analysis yet") superseded by its own `-resolved-viewer-and-model`
  sibling, which already contains the full arc through the shipped fix. **Deleted the stale one.**
- **PLT-2884**: the two folders (`-data-pipeline`, `-progress-tracking`) were **not** simple
  duplicates — they were two independent investigations from different runs that reached
  **different root-cause theories** on the same ticket (one accepted "customer's XER is bad" at
  face value; the other raised a specific, falsifiable competing hypothesis — Pattern A,
  intangible-activity `ActualProgress = 0` on the Platform side — that the other never addressed).
  Checking Jira to resolve which was consolidated into a discovery: **the ticket closed 2026-07-31
  via a bare Freshdesk auto-sync, with no human comment verifying anything and neither hypothesis
  ever tested.** Consolidated into one folder (`PLT-2884-relocated-data-pipeline/`, retagged
  `relocated` since the ticket is Done and out of scope), with the unresolved-hypothesis finding
  recorded in §10 for if the pattern recurs.

### PLT-3010 — new ticket (progress-tracking)

**EQX-AT11x figures discrepancy, created 08-03 17:06, assigned Rishi.** Client-reported Plan
11.42%/Actual 10.05% vs platform tile 10.15%/10.48% — the decisive fact is the **two legs disagree
in opposite directions** (Plan lower, Actual higher on the platform side), which flips SPI from
0.88 to 1.03 and rules out any shared-denominator/date-snapping/staleness mechanism, since those
would move both legs the same way. Sibling of PLT-2884 (same combined AT10-11x XER) but **not**
the same Pattern-A shape — there Platform read lower, here it reads higher on one leg only.
Confidence 5/10 (deliberately not rounded up — mechanism is well-scoped, single named cause is
not). Draft action: ask Rishi for the Baseline % value, which settles the larger of the two gaps
in one number.

### Tickets with real movement

| Ticket | Domain | Status | What changed | Drafted action | Conf. |
|---|---|---|---|---|---|
| **PLT-2917** | progress-tracking | Open | Darminder answered the "remaining task" question (08-03): it's **PLT-2524**, a data-freshness tooltip ticket — **not** the previously-guessed UX defect, so that defect is now known to be un-raised and unowned. PLT-2524 itself is Blocked/unassigned, blocked by another Backlog ticket — a second stall. Mechanism sharpened: Rishi's PBI fix covers the *percentage*, but milestone done/late status reads Actual End Date, which nothing in the FE ever writes — two fixes' worth of scope, only one confirmed in hand. PBI ship status still unconfirmed (Pietro's "ok we got it working" is 4 days old, no verification since) | 4 short one-question drafts: Pietro (did it ship / does it touch milestones), Mostafa (flag re-scoped, with recommendation), Darminder (is UX-1114 a real blocker) | 8/10 |
| **PLT-2619** | dashboard-migration (renamed from `other` this run) | With Customer | Pietro reassigned Masum→Yash (08-03, his first action since raising it 04-23); Freshdesk flipped Awaiting-release→Waiting-on-customer, **inverting** the prior close-out plan — Yash now has a live client question out whose content we can't see; PLT-2935 linkage firmed up via PR #2080 (confirms a demo project is already on the native `/projects/:id/dashboard` route), but **#2080 itself has been green with zero human reviews for 5 days** | ask Mostafa (named requester on PLT-2935) the project's name; separate review nudge on #2080 | 7/10 (down from 7.5 — Yash going *outward* to the customer is a counter-signal to "already superseded") |

### Cross-ticket notes

- **PLT-2906 turned out not to be a silent-drop bug — it's a silent-*exclusion* documentation gap.**
  Unlike PLT-2909 (genuinely dropped while in-scope), PLT-2906 was correctly out of scope (In Code
  Review, 07-24→08-03) both times it was "missing." The real failure was that no run said so, so a
  Major incident with a customer promise attached went unwatched for 10 days without anyone
  noticing it had left the board's exclusion filter rather than the board itself. See the two
  corrections above — the fix is an explicit "left scope this run, because X" line, not just a
  fresh JQL query (PLT-2909's actual drop cause is still unexplained).
- **PLT-2884's unresolved-hypothesis closure is a live risk, not just history.** If any EQX-family
  or other intangible-heavy-schedule project raises a "new dashboard % lower than old, but the
  activity's Editor-Progress matches" symptom, check the Pattern-A signature (0 linked elements,
  planned labor hours, 0 actual) before accepting "bad customer XER" — that exact framing shipped
  unverified once already.
- **A stalled-PR pattern is emerging across unrelated tickets**: PR #2080 (PLT-2619/PLT-2935
  family) green 5 days with zero reviews. Not yet a named pattern, but worth watching whether
  review latency — not diagnosis — becomes this board's actual bottleneck the way posting-latency
  was flagged on 08-03.

### ⚠️ Attachments needing human — this run

**PLT-2917** (both xlsx exports and both Darminder design PNGs — still HTTP 403, unread — the
design PNGs are the one artifact that could confirm/deny the milestone-UX-defect guess directly).
**PLT-2906** (all media still 403; the decisive unread one is Ilia's 07-31 "confirmation"
screenshot on the Freshdesk close-out — it would distinguish "tests pass" from "verified deployed
to the customer's model," which is exactly the gap behind the PR #2069 / 26.3.4 risk below).
**PLT-3010** (all 5 attachments 403; the 37KB dashboard PNG is the single highest-value item — it
would settle weighting basis, active filters, date-slider range, and Baseline % simultaneously).
No new attachments on the four unchanged tickets this run (prior gaps stand as previously
documented).

---

## Run: 2026-08-03 — repo hygiene pass + 3 tickets with real movement, 3 confirmed unchanged

**Board re-queried** with the corrected scope rule (`With Customer` in-scope, per this file's own
settled rule above — a first pass this run mistakenly excluded it, matching the same near-miss the
07-24 run flagged; corrected before writing anything). **6 tickets in scope**, same set as 07-30
minus PLT-2884 (now **Done**) plus PLT-2909 (back in scope — see hygiene note below on why it had
dropped out of the run log without actually leaving the board).

> ⚠️ **Retro-correction (added during the 2026-08-03 branch-reconciliation pass, after this entry
> was first written).** When this entry was written, the **07-31 run below did not exist in `main`** —
> it was sitting unmerged on branch `claude/blissful-mccarthy-q3mayf` and was therefore invisible.
> Two statements above are wrong as a result: the comparison baseline is **07-31, not 07-30**, and
> PLT-2945/PLT-2946 (deep-dived on 07-31, both since moved out of scope — Done / With Technical
> Support) were not accounted for. Their folders are now in `main`. The hygiene note below asking
> "why did PLT-2909 drop out of the 07-30 table" has the same answer: **it didn't drop out of the
> routine, it dropped out of `main`** — the 07-31 run did cover it. This is the branch-sprawl failure
> mode this repo's `CLAUDE.md` warns about, caught and fixed the same day. See the new
> `.claude/CLAUDE.md` branch policy.

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
