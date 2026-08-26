# PLT-3059 — "Hutto2 - Activities should be reading 100% in dashboard as all elements in Webviewer are installed" — triage context

## New ticket, first pass — 2026-08-25

Created 2026-08-17 13:59, never previously in this folder set. Same project as PLT-3034
(Hutto2), reported three days before that ticket's Fork A/B analysis existed, and linked to it
in Jira itself (issue link "Discovery - Connected" → PLT-3034) and in-thread by the assignee. This
file treats it as the same mechanism until proven otherwise, per the routine's own rule not to
re-derive a hypothesis a sibling ticket already carries — but flags one thing neither ticket has
checked yet (below).

## Ticket

| Field | Value |
|---|---|
| **Jira** | https://xyzreality.atlassian.net/browse/PLT-3059 (id 119890) |
| **Status** | With Customer · **Priority** Major |
| **Project** | Hutto2 |
| **Assignee** | Yash Patel · **Reporter/customer contact** Thiago Santos (Freshdesk #7658) |
| **Created** | 2026-08-17 13:59 · **Updated** 2026-08-21 15:21 (6 comments) |
| **Domain slug** | `progress-tracking` — same family as PLT-2882/2909/2931/2946/3034 |
| **Linked issue** | "connects to" PLT-3034 (Jira issue link, not just a comment cross-reference) |

## What was reported

Nine Electrical-discipline activities read below 100% in the dashboard despite the customer
stating every linked element shows installed in the Web Viewer:

| Activity ID | Name | Dashboard actual % (11-Aug) |
|---|---|---|
| DH2.15.1100 | Install Feeders PMDC-Generator 15 | 98% |
| DH1.3-4.1070 | Install Feeders PMDC-Chillers 3-4 | 78% |
| DH1.5-6.1070 | Install Feeders PMDC-Chillers 5-6 | 88% |
| DH1.1-2.-1080 | Install Feeders PMDC-Chillers 1-2 | 90% |
| DH2.15.1110 | Install Feeders PMDC-Chillers 15 | 91% |
| DH2.13-14.1130 | Install Feeders PMDC-Chillers 13-14 | 88% |
| DH1.7-8.1070 | Install Feeders PMDC-Chillers 7-8 | 88% |
| DH1.9-10.1070 | Install Feeders PMDC-Chillers 9-10 | 88% |
| DH1.11-12.1070 | Install Feeders PMDC-Chillers 11-12 | 91% |

Nine activities is a materially bigger cohort than PLT-3034's two — this may be the closest thing
the board has to the "who else" cohort sweep Pattern 1/6 tickets usually never get.

## Thread, condensed

1. **Yash (109780, 08-17 14:04)** — relays the customer, cites the exact discrepancy shape as
   Pattern 1 ("ghost/orphaned element links from older schedule or model versions"), and reports
   independently checking `DH2.15.1100` in the Web Viewer: total linked count vs. total installed
   count disagree, "suggests there may be additional linked elements... not visible when reviewing
   installed elements." Screenshot attached (`Screenshot 2026-08-17 183619...png`).
2. **Darminder (109784, 08-17 14:24)** — *"I think this is the same in reference to my comment in
   PLT-3034... They are not ghost elements because these elements still exist in the project and
   are linked to the schedule it seems under the QA model."* This is the same QA-model finding he
   made on PLT-3034 for `DH2.29-30.1100` that same day, extended here by inference rather than
   re-checked per activity.
3. **Yash (109843, 08-18 10:01)** — *"What would be the further course of action on user side?"*
4. **Darminder (109878, 08-18 15:50)** — points at PLT-3034 comment 109877 instead of answering
   directly. That comment is the consolidated Hutto2 workaround: *"suggest users with QA models
   unlink elements that are not part of a PC model... The other option is setting status as
   installed but unsure how this would affect user reports at end of a project."*
5. **110171/110172 (08-21 15:20-15:21, Yash)** — Freshdesk auto-sync noise only (`Closed` then,
   60 seconds later, `Waiting on customer`). Not a real reply from anyone; this is why the ticket's
   `updated` timestamp is 08-21 while the last substantive content is 08-18.

**No comment on this ticket has ever addressed Yash's own 08-17 finding independently** (linked
count vs. installed count disagreeing) — Darminder's answer assumed it was the same PLT-3034 shape
without re-running the check here.

## Why this is not simply "PLT-3034, again"

PLT-3034's own folder (`PLT-3034-groupA-progress-tracking/context.md`, § 2026-08-20) found
something **after** Darminder's 08-17/08-18 comments on *this* ticket: seeing a linked element
listed under a QA-model heading in the editor does not prove a link was made to that model. A link
is keyed on `modelElementId`, which is process-wide unique — `ProjectService.elements` is a single
global map (`model-entity.ts:277`, verified again this pass on current checkout:
`const existing = this._projectService.elements.get(element.modelElementId); if (existing)
existing.models.add(this.id)`) — and the linking panel derives its model headings at render time
from every model an element id happens to appear in
(`useGroupedLinks.ts:59-78`, `getElementsForActivity` at `linking-service.ts:684-689` resolves
purely by element id, no model filter). Status is read per element, not per (element, model)
(`useGroupedLinks.ts:66`), so the same "not installed" badge repeats under every heading a shared
element id has.

**That means Fork A (shared element id with a production model — one real link, QA heading is a
display artifact) is exactly as live here as it was on PLT-3034, for all nine activities, and
nobody has run the one-minute discriminator check on any of them.** Darminder's 08-17 finding for
this ticket was an inference from the PLT-3034 pattern, not an independent per-activity check —
he said "it seems under the QA model," not "I confirmed it's under the QA model only."

**This also means the workaround pointed to here (109878 → PLT-3034's 109877, "unlink" or "mark
installed") carries the same risk PLT-3034's own folder already flagged**: under Fork A, unlinking
would sever a genuine production link and marking installed would falsify an element that is truly
not installed yet. That workaround was pointed at this ticket on 08-18 15:50 — **before** the
Hutto2 customer on PLT-3034 rejected its premise on 08-19 12:25 (*"As I never link anything to a QA
model I havent even considering checking it"*). Nobody has revisited whether the same objection
applies to Thiago's nine activities. (Thiago Santos here and "Matthew" on PLT-3034 read as two
different individuals at the same Hutto2 client, so this is not necessarily the same person's
objection — but it is the same project, and the same unverified assumption underlies both.)

## Cohort angle (Question 6 of the playbook, more answerable here than on PLT-3034)

Nine activities, all Electrical discipline, all "Install Feeders PMDC-..." naming, is enough
activities that a single project-wide query — rather than nine one-off editor checks — would
likely answer Fork A/B for all of them at once: does any of the linked element ids for these nine
activities also resolve inside a non-QA model for Hutto2? If yes for all nine, this is Fork A at
cohort scale (a systematic display artifact, not nine separate bad links). If the answer varies
per activity, that itself is worth knowing before generalising the fix.

## Confidence

- **Same code mechanism as PLT-3034 applies (model grouping is element-id-keyed, not
  link-keyed): 9/10** — re-verified directly against the current `hc-frontend` checkout this pass
  (`model-entity.ts:274-277`, `linking-service.ts:684-689`, `useGroupedLinks.ts:59-78,66`), not
  carried over on trust.
- **These specific nine activities are actually in the same QA-model shape Darminder found on
  DH2.29-30.1100: 5/10** — asserted by inference in-thread, never independently checked per
  activity here.
- **Fork A vs Fork B undecided for any of the nine: unknown** — no evidence either way, same as
  PLT-3034's own unresolved fork.
- **The workaround already pointed at this ticket (unlink / mark installed) is safe to act on: LOW,
  actively in question** — it inherits PLT-3034's own Fork-A risk, plus it was given before the
  Fork A/B distinction was documented anywhere.

## NEEDS HUMAN

- ⚠️ Run the Fork A/B discriminator (does a linked element id for any of the nine activities appear
  under more than one model heading in the editor) — same one-minute check as PLT-3034, not yet
  done for this ticket specifically.
- ⚠️ Whether Thiago has already acted on the workaround pointed at via 109878 (unlink / mark
  installed) — if so, and if Fork A holds, some of these nine activities may now have a
  production link severed or a real defect masked as installed.
- ⚠️ Attachments not opened here (no authenticated Jira media fetch available): `image-20260817-130424.png`
  (dashboard screenshot, description) and `Screenshot 2026-08-17 183619...png` (comment 109780,
  Yash's own linked-vs-installed count check for DH2.15.1100). Neither is load-bearing for the
  code-side mechanism above, but the second may show the exact count discrepancy Yash described in
  text.

## What is verified vs. inferred (per the routine's own discipline)

- **Verified:** the code mechanism (element-id-keyed model grouping, no per-link model concept) on
  the current checkout; the Jira thread content and timing verbatim; the issue link to PLT-3034.
- **Inferred, not yet checked:** that these nine activities are actually the QA-model shape at all
  (Darminder said "it seems"); that Fork A (vs B) applies here the same way it's suspected on
  PLT-3034; that the pointed-at workaround has or hasn't already been acted on by the customer.

## 2026-08-26 — no change, stall clocks updated

Live fetch: status `With Customer`, priority Major, assignee Yash Patel, 6 comments (109780,
109784, 109843, 109878, 110171, 110172), same ids/authors/timestamps/bodies verbatim, newest still
109878 (Darminder, 08-18 15:50) — byte-identical to the 08-25 snapshot. `updated =
2026-08-21T15:21:39+0100` is unchanged (still the 08-21 Freshdesk auto-sync noise, not a real
reply). Attachments unchanged, still unopened.

Checked PLT-3034's folder (not re-fetched live this pass): its own 08-26 entry still records Fork
A/B as genuinely undecided. The one-minute discriminator remains unrun on both tickets.

**Clocks:** 8 days since the disputed workaround was pointed at this ticket (109878, 08-18 15:50)
with no correction; 7 days since PLT-3034's customer disputed that workaround's premise (08-19
12:25, still unrelayed here). Nothing re-derived.
