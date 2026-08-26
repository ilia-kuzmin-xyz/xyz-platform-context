# PLT-2874 — Recommended action

> **2026-08-18: two new comments (Yash asking if a fix shipped; Darminder confirming a fix is under
> QA testing) — neither answers the project/model or slider question below. The 08-14 draft to
> Gennaro is unchanged and still the right message to send; see `context.md` § 2026-08-18 for why
> it's now also a sanity check on whatever Darminder is testing, not just a diagnostic ask.**

> **2026-08-13: reopened. The 07-31 "close the incident" position below is superseded by QA finding
> Staging still broken, in the opposite direction. See "Current: get Staging's own numbers" below —
> read that first.**

> **2026-07-31: superseded by the 08-13 reopening above. Resolved in diagnosis, fix in review.**
>
> Everything below is the 07-24 position and is kept because its reasoning held up. Its outcome
> map called this correctly: *"A ≈ 628k and B ≈ 695k → gap is dbId expansion of a
> non-deduplicated count → optional polish is to display `COUNT(DISTINCT modelElementId)` in the
> overlay so it reconciles with the editor."* That is exactly what PR #2084 does. The one thing
> it got wrong was the disposition, "working as designed / close as not-a-bug": showing an object
> count under the label "Elements" is a defect, and once corrected the two surfaces agree to 0.5%.
>
> **Current position below.**

## Current (2026-08-13): get Staging's own numbers before guessing at a fix

**Chosen action: (a) internal comment to Gennaro asking for two console lines + three queries —
not a Jira status change yet.**

**Why not straight to dev.** Five candidate mechanisms are live (`context.md` §"Reopened
2026-08-13"), all consistent with the direction and magnitude observed, and none excluded. Code
reading alone cannot separate them — they differ on data freshness/artefact state, which is
Staging-environment-specific and invisible from this checkout. Sending this to dev now would be
guessing which of five things to fix.

**Why not back to the customer / With Technical Support.** This is an internal QA finding on a
pre-release build, not a customer report. Nothing here needs a client.

**Why not Blocked.** The three-query discriminator and the two console log lines are cheap and
Gennaro already has the Staging session open — this is a five-minute ask, not a wait on anything
external.

### Draft internal comment (addressed to Gennaro Boccia) — DRAFT ONLY

> Gennaro, thanks for catching this on Staging. Since Prod now matches (~604k vs 604k) but Staging
> doesn't (603,844 vs 551,386) on the same editor number, this looks like a Staging-side data
> freshness issue rather than a code regression — the fix from July is still in the code. Could you
> open the browser console on Staging and paste two lines: the one with "calculatedOn" near
> Pipeline B's progress load, and the "Artefact selected" line for the object-id map? And if you
> have the DuckDB panel open, three quick counts would settle exactly where the ~52,000 elements
> disappear:
>
> ```sql
> SELECT COUNT(DISTINCT modelElementId) FROM _visible_elements;
> SELECT COUNT(DISTINCT modelElementId) FROM element_base_data;
> SELECT COUNT(DISTINCT modelElementId) FROM activity_links;
> ```
>
> Whichever query first shows the number instead of ~604k tells us which layer to look at. No need
> to touch Prod or the customer, this is entirely a Staging-side check.

### Follow-through, not executed here

- If H1 (stale `calculatedOn`) confirms: this is a Staging pipeline/data-refresh issue, not a
  frontend bug — no code change, just re-run Staging's progress calc and recheck.
- If H3 (wrong object-id-map version) confirms: worth checking whether Staging has an extra model
  version whose map artefact hasn't been generated yet — again pipeline-side, not FE.
- If none of H1/H3/H4 explain it and the `_visible_elements` count itself is short of
  `activity_links`, that lands back on H5 (`element-count.ts:14-19` dropping falsy
  `modelElementId` rows) and **would** be a frontend fix — add a warning log there regardless, it is
  currently silent.
- Do not close or comment on the customer-facing thread until Staging is understood; Prod is fine,
  so there's no urgency to explain anything externally yet.

---

## Superseded 2026-07-31 position (still correct for Prod, not for Staging)

## Current: ship PR #2084, close the incident, spin out the rest

https://github.com/XYZReality/hc-frontend/pull/2084 on branch `PLT-2874`. Full mechanism,
figures and verification in `investigation-log.md`.

### Actions, in order

1. **Post the resolution comment.** Draft in `drafts.md`, not posted.
2. **Get #2084 deployed and verified.** Blocked on an image promotion, not on code. Test steps
   are on the PR; step 3, that the total stays element-based after a filter change, matters most
   because that was a real bug in the first cut.
3. **Confirm LVN1** (Freshdesk 7514) with one query. Expect the fix to cover the dashboard number
   there but **not** the schedule root row, which is a third unit again.
4. **Close the incident** once #2084 is on prod.

### Spun out, none blocking

| Item | Why separate |
|---|---|
| Schedule Elements column sums per-activity counts with no dedup (`schedule-entity.ts:786-810`) | Third unit, own defect, is the extra number in the LVN1 report |
| `Selected` in the viewer stats box is still a dbId count (`dashboard-statistics-service.ts:128`) | Product decision, raised by another dev, his call |
| Dashboard picks an arbitrary model from the federated folder | Latent; FAR01's two are 2,540 elements apart so impact is 0.4% here. Draft ticket in `drafts.md` |
| `svf2-object-id-map` vs `project-element-list` disagree by 1,364 for one model version | Backend question for Ali or Dave, one message not an investigation |
| Extra Navisworks dbIds unreachable in the editor for selection and isolation | Consequence of the editor's one-dbId-per-element map, not this ticket |

### Product decision taken

Asked Pietro and Mostafa whether both pages should move to one shared source so the numbers match
exactly. Recommendation given and accepted as the proposal: **not now.** 0.5% will not be noticed
and does not affect progress figures. Log the source alignment as tech debt.

### Doc gap from the 07-24 note, now closed

`dashboard/pitfalls.md` has entries for the object-vs-element count, the silent dashboard logger,
and the arbitrary federated model pick.

---

# Superseded 07-24 position

## Chosen: (a) Draft a clarifying question — establish the reference and pin the exact widgets before any dev work

**Why (a), not the others:**
- **Not (b) Ready For Development.** The *mechanism* (why two counters differ) is understood, but
  whether this is a **genuine bug is not established** — the two numbers are different metrics by
  construction (distinct-UUID "Linked" on one model vs non-deduplicated Forge-`dbId` "Total" across
  the federated model; see `context.md §2–§3`), and the ~11% gap in the observed direction is
  *plausibly fully expected*. The repo even warns on this class of Forge-vs-DuckDB count mismatch
  (`ModelDetailsPanel.tsx:190-198`). Sending it to dev now presumes a defect the evidence does not
  yet support — the playbook's Q2 trap ("the reference was never valid").
- **Not (c) With Technical Support.** The reporter is **Mostafa (internal PO)**, not a client, and
  he captured the screenshots himself on **Far01** (an internal-accessible project). Nothing needs a
  *client* to confirm; the open questions are answerable in-house.
- **Not (d) Blocked.** Nothing blocks investigation — we have the project, both numbers, and both
  code paths. The next step is a cheap question + a one-off query, not a wait.

**Owner:** reporter **Mostafa Kamel Hussien** for the observation questions; assignee **Darminder
Atker** for the one-off verification query. One question per owner, phrased to be answered with a
value (playbook message-craft).

---

### Draft clarifying comment (for the assignee/coordinator to post — do NOT auto-post)

> Thanks Mostafa — before we treat this as a defect, two quick checks, because the editor and the
> dashboard count *different things* and may not be meant to match:
>
> 1. **Which dashboard number is the ~695k?** Is it the small **"Elements → Total"** overlay in the
>    bottom-left of the 3D viewer, or a figure in the Progress panel / Gantt? (The overlay counts
>    coloured Forge objects, not "linked elements" — the labels differ.)
> 2. **Which editor number is the ~628k?** Is it the **"Linked"** figure under **"Elements linked to
>    Latest Program"** in the Model Details panel — and was that panel showing the **federated
>    model's** entry, or one sub-model?
> 3. If handy, the **exact** two figures from your screenshots (the description says "around" /
>    "thousand").
>
> Context for why they can differ legitimately: the editor "Linked" counts **distinct source
> elements** linked to the active program on one model; the dashboard "Total" counts **Forge object
> IDs** across the whole federated model, and one source element can map to several Forge objects — so
> the dashboard being ~10% higher is a plausible by-design effect rather than a bug.

*(Closed, routed, answerable with values. Q1/Q2 pin which widgets are actually being compared; Q3
gets exact figures. This directly tests whether "they should match" is even a valid expectation.)*

---

### One-off verification for Darminder (resolves bug vs by-design)

Run the diff from `context.md §4` against **Far01** (DuckDB dev panel, Ctrl+Shift+D):
- `A =` count of **distinct `modelElementId`** among the elements coloured at slider-end, vs
- `B = coloredDbIds.length` (what the "Total" overlay shows).

Outcome map:
- `A ≈ 628k` and `B ≈ 695k` → gap is **dbId expansion of a non-deduplicated count**
  (`dashboard-color-service.ts:643`) → **working as designed**; optional polish is to display
  `COUNT(DISTINCT modelElementId)` in the overlay so it reconciles with the editor. Close as
  not-a-bug / minor-enhancement.
- `A` also ≈ 695k → divergence is upstream (scope: federated-vs-single-model, or a different
  link-set / stale `element_status` parquet per `caching.md`) → **then** promote to Ready For
  Development with that specific root cause.

---

## Notes for the coordinator

- **Trigger ("why now") is unasked (playbook Q5).** This is a Minor, no-comment ticket; there is no
  evidence it is a regression. Worth a one-line check with Mostafa: did these numbers used to match on
  Far01, or is this the first time anyone compared them? "It used to match" would change the analysis.
- **Doc gap to close after resolution:** neither `viewer-and-model.md` nor `pitfalls.md` documents
  that the editor "Linked" and dashboard "Elements/Total" are different counters — add a pitfall entry
  once the query diff confirms the mechanism. (Not editing outside this folder per task constraints —
  noting only.)

**Confidence in diagnosis: 6/10** (both code paths traced; specific cause of the Far01 gap is
environment-dependent). **Confidence in this being the right next step: 8/10** — a clarifying question
+ one query is the low-cost move that decides bug-vs-by-design before any dev effort is committed.

---

## 2026-08-14 — same action, cheaper first rung (amends the 08-13 position, does not replace it)

**The 08-13 chosen action stands: an internal comment to Gennaro, no Jira status change.** Still not
dev-ready (four live hypotheses, `context.md` § 2026-08-14 adds a fifth, H6), still not a customer
matter (internal QA on a pre-release build), still not Blocked (Gennaro has the environment open).

What changed is the *order of the ask*. The 08-13 draft led with a console line and three DuckDB
queries. This run found two checks that need no dev tools at all and one fact we are missing
outright:

1. **Which project and model.** Gennaro's editor figure, 603,844, matches neither FAR01 number this
   folder recorded on 07-31. We may not be looking at FAR01, which means the magnitude argument that
   ruled out the arbitrary-federated-model defect (H6) does not currently apply. This is the single
   highest-value missing fact and it costs one word to answer.
2. **The date slider's start and end dates on each environment** — a screenshot. If they differ,
   H4 is live (`date-range.tsx:133-162` seeds the slider entirely from the progress-derived data
   range). Free, and it is the only hypothesis with a symptom visible without a console.
3. *Then* the console lines and the DuckDB ladder from the 08-13 draft, unchanged and still
   decisive — but now with a decision table for reading it (`context.md` § 2026-08-14), including
   the calibration that a healthy `element_base_data` reads slightly **above** the editor number,
   not equal to it.

### Draft internal comment (to Gennaro Boccia) — DRAFT ONLY, supersedes the 08-13 draft above

> Gennaro, thanks for catching this. Prod matching and Staging not, on the same editor number, points
> at Staging's own data rather than the code, so before we dig: which project and model were you on?
> The editor figure doesn't line up with the one we measured in July, so I want to make sure we're
> comparing the same file. And if you still have both tabs, a screenshot of the date slider on each
> would help — if Staging's slider ends on an earlier date than Prod's, that alone explains it.

## 2026-08-19 — add a separate sanity-check line to Darminder, not a rewrite of the Gennaro ask

Darminder's "fix still ongoing following QA testing" has now been said twice (08-14, 08-17) with no
ship date and no named mechanism. Worth a short, separate one-liner to Darminder alongside (not
replacing) the Gennaro ask above, since a fix could pass QA while targeting the wrong one of H1/H3/H4/H6:

> Darminder — which of the ranked hypotheses is the fix under test actually targeting, and does it
> touch Staging specifically or just Prod? Want to make sure QA passing confirms the Staging undercount
> is actually gone, not just that Prod stayed fine.

This is a process/communication gap, not a new diagnostic fact — it doesn't change the hypothesis
ranking in `context.md`.

*(One owner, two things that can be answered with a value and a screenshot, no jargon, no console.
The 08-13 console-and-queries ask is held back as the follow-up once the project is named — sending
both at once buries the cheap question under the expensive one.)*

### Follow-through, not executed here (extends the 08-13 list, none of which is retracted)

- If the project is **not** FAR01: re-check H6 (arbitrary federated-model pick,
  `dashboard-project-service.ts:164-176`) on magnitude for that project before anything else — the
  model id is readable straight off the Network tab.
- If the sliders differ: H4, and the question becomes why Staging's data date range is shorter —
  most likely `api_activities` losing the race to `project_progress` (`dashboard-progress-service.ts:771`
  vs `:876`), which is again a Staging data-freshness story, not a code fix.
- If both are identical: fall through to the 08-13 console + three-query ask verbatim, and read it
  against the decision table in `context.md` § 2026-08-14.
- **Independent of the outcome:** the H1 mechanism is narrower than we wrote on 08-13 — the
  `calculatedOn` cap can only withhold links created *after the activity-links parquet snapshot*,
  and is skipped entirely when that parquet is under five minutes old
  (`artefact-loader.ts:604-612`). Do not describe it on the ticket as "the dashboard is capped at
  the last progress calculation" without that qualifier; it overstates what the code does.
- Still worth doing whatever the answer: add a warning log to `element-count.ts:14-19`, which
  silently drops rows with a falsy `modelElementId` and only falls back to the object count when the
  set is *entirely* empty. Unchanged from 08-13 (H5).

---

## 2026-08-20 — Gennaro ask unchanged; the Darminder line is re-pointed at a checkable question

**Chosen action: unchanged — two short internal comments, no Jira transition.** The 08-14 draft to
Gennaro (project/model name + the two date-slider screenshots) is still the right first message and
is **still unsent, now 6 days**. Nothing in the comment thread moved this run, so nothing in the
diagnosis moved either.

Two facts from `context.md` § 2026-08-20 change the framing, not the plan:

1. **The ticket was reassigned to Ilia by Darminder on 08-19 19:52, with no comment.** So the ask to
   Gennaro is no longer something to hand to a coordinator — it is the assignee's own next action.
2. **There is no fix in flight for PLT-2874 in `hc-frontend`.** PR #2084 (merged 07-31) is the only PR
   under this key, and none of the 17 open PRs touches element counting. That does not mean no work
   is happening — an H1/H3 remedy would be a Staging pipeline or artefact refresh with no frontend
   diff at all — but it does mean "fix still ongoing", said twice with no specifics, cannot currently
   be pointed at anything reviewable.

### Draft 1 — to Gennaro Boccia — DRAFT ONLY, unchanged from 08-14, still unsent

> Gennaro, thanks for catching this. Prod matching and Staging not, on the same editor number, points
> at Staging's own data rather than the code, so before we dig: which project and model were you on?
> The editor figure doesn't line up with the one we measured in July, so I want to make sure we're
> comparing the same file. And if you still have both tabs, a screenshot of the date slider on each
> would help — if Staging's slider ends on an earlier date than Prod's, that alone explains it.

### Draft 2 — to Darminder Atker — DRAFT ONLY, replaces the 08-19 wording below

The 08-19 line asked which hypothesis the fix targets. **Better question, same purpose, answerable
with a link instead of an explanation** (and it is the question the GitHub check this run left open):

> Darminder, where does the fix for this live? I can't find a branch or PR against PLT-2874 beyond
> the one that merged on 31 July, so I want to make sure I'm not about to redo work you already have
> in progress.

*(One owner, one question, answerable with a URL or a one-line "it's a Staging data refresh, not
code". Non-accusatory: the likeliest true answers are that it sits under another key or is a pipeline
re-run, both of which are useful to know and neither of which is a criticism. Supersedes the 08-19
draft's wording; that draft is kept below for the record and should not also be sent.)*

**Send order:** Draft 1 first. Draft 2 can go the same day — different owner, different question, so
it does not bury the cheap ask.

### If Draft 2 comes back "there is no fix, it's a data refresh"

Then the ticket is not a frontend defect at all and the disposition changes: it becomes a Staging
environment/data-freshness item, the three-query ladder in `context.md` § "Reopened 2026-08-13" is
run once to confirm which layer was short, and PLT-2874 itself can close against the Prod behaviour
that already matches. **Do not close it before the ladder is run** — H5
(`element-count.ts:14-19` silently dropping rows with a falsy `modelElementId`) would survive a data
refresh and stay latent.

### Follow-through, unchanged from 08-14

All items in the 08-14 follow-through list stand, including the standing hardening item: add a
warning log to `element-count.ts:14-19`, which currently drops falsy-`modelElementId` rows in silence
and only falls back to the object count when the set is entirely empty. Worth doing whichever
hypothesis turns out to be the trigger.

**Confidence in the next step: 8/10.** Two cheap questions to two named owners, neither of which
presumes a mechanism. **Confidence in the diagnosis: unchanged, 6/10** — five hypotheses live, none
excluded, all still discriminated only by Staging environment state.

## 2026-08-21 — unchanged; drafts now 7 days unsent

Both drafts still stand exactly as written. This ticket is assigned to Ilia, so both are his own next
action rather than a nudge to someone else. Nothing in the GitHub re-check (`context.md`, 2026-08-21)
changes the plan. **No Jira action was taken by this run.**

## 2026-08-24 — the 08-14 drafts are still right; add the diagnostic branch as the unblocking move

The 08-14 drafts to Gennaro and Darminder are unchanged and still unsent, now 10 days. Post them.
But the thing that actually breaks the deadlock is shipping the diagnostic to Staging, because it
turns "please run three queries" into "open the dashboard and paste the line".

### Draft comment to Gennaro (NOT posted, supersedes nothing — same two questions)

> Gennaro, two things on the Staging numbers from the 12th, both quick.
>
> Which project and model were you on? The editor figure of 603,844 does not match anything we have
> recorded for FAR01, so I cannot rule out that Staging is loading a different federated model than
> Prod — the dashboard picks the first model it finds in the federated folder with no ordering
> guarantee, so two environments can legitimately land on different files.
>
> And do the date sliders show the same start and end dates on Staging and Prod? If they differ,
> that alone explains the gap and nothing else needs investigating.

### Draft comment to Darminder (NOT posted)

> Darminder, on the fix that is still ongoing — which of the causes is it targeting? I ask because
> the Staging undercount and the original Prod overcount have different mechanisms, and the
> analysis so far points at Staging data freshness rather than frontend code, so a fix that passes
> QA on Prod could still leave Staging short. Also, is it in hc-frontend? I could not find an open
> PR there under this key.

### Action on the board

Leave in `Open`. Ask Darminder to get `PLT-2874-dashboard-element-count-diagnostics` onto Staging,
or merge it into whatever is in flight — it is log-only apart from a warn in
`countDistinctElements`, so it is cheap to carry. Once it is there, the next dashboard load on
Staging answers H1 vs H3 vs H4 without anyone running a query.

## 2026-08-26 — drafts unchanged, now 12 days unsent

Both drafts (to Gennaro: project/model name + the two date-slider screenshots; to Darminder: where
does the fix live) remain unposted and unchanged, now **12 days** since first drafted (08-14). Status
moved `Open` → `In Analysis` on 08-25 with no comment attached (see `context.md`) — a bookkeeping
change, not a decision, and it does not alter the recommended action. The diagnostic branch
(`PLT-2874-dashboard-element-count-diagnostics`) still has not been pushed to Staging; that remains
the single move that would answer H1/H3/H4 without anyone running a manual query.
