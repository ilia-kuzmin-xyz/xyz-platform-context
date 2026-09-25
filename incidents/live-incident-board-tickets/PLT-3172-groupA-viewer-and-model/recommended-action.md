# PLT-3172 — recommended action (2026-09-25, first pass)

## Classification: **3 — resolvable in-session, but needs a visual/console check before a fix**

Not class 2: there are two live hypotheses (empty `aggregateSelection` vs. a Forge-rendering-only
gap) and writing a fix for either without discriminating them first risks the exact mistake
`live-incident-run-instructions.md`'s 2026-09-09 entry warns against — a code-read conclusion
posted as a diagnosis without the failure observed. Not class 1: Rishi already has a live repro
(he reproduced it same-day, per Yash), so there is nobody to chase for reproduction. Not class 4:
nothing here is a product/scope disagreement, it's one console check.

**Who does the check:** Rishi — assignee, and already has the repro open.

## Draft — to Rishi Bhugobaun, on PLT-3172 — DRAFT ONLY, not posted (64 words)

> Rishi — this looks time-coincident with your own PLT-3165 merge this morning (`fe43628`,
> `selection-service.ts`): it's the only change in the selection path in 30 days, landed hours
> before Yash's report. Before touching anything: **can you log `aggregateSelection` right before
> the `setAggregateSelection` call in `use-linked-element-actions.ts:63` and confirm whether it's
> empty or populated when you repro?** Empty points upstream (id resolution/filters); populated
> points at Forge's own rendering, and the PLT-3165 timing is probably coincidence.

**Assumption this rests on, one line, not in the message:** that `fe43628`'s removal of the
Shift-gated `_manageMultipleSelection` branch cannot affect a programmatic (non-Shift) selection
call — reasoned from the diff, not traced through the full blast radius of the removed branch.
If the console check comes back "populated" this assumption stops mattering; if it comes back
"empty," it's worth re-checking directly before ruling `fe43628` out for good.

## What would follow from each answer (for whoever picks this up, not for the message)

- **Empty at the point of failure** → bug is in `use-linked-element-actions.ts:16-51` (activity→
  element resolution or the filter-exclusion step) or in `viewerService.elementId2DbId`/
  `elementId2ModelId` population for AEX01's models — check whether AEX01 has an unusual model mix
  (NWD/Navisworks, multiple linked models, active filters) that this session cannot see.
- **Populated but nothing highlights** → look at Forge's own selection theming/extension layer,
  and whether anything project-wide (not just this feature) changed recently — check whether a
  *plain* manual click-selection (not via this menu) still highlights blue on the same project,
  which would confirm the bug is specific to this code path rather than global.

## Also worth doing, not blocking

Open attachment `65180` (the 90 MB screen recording) — needs a human, session-wide 403 (confirmed
pattern, not re-tested this run). It would settle at a glance which of the two branches above is
live, likely faster than the console check.

## What this session did NOT do

No Jira action of any kind — no comment, no transition, no assignment. Read-only calls only
(`getJiraIssue`) plus read-only source-code research in the local `hc-frontend` checkout. No code
was written, nothing was built or run (this environment cannot build `hc-frontend` — `npm ci` 401s
on the private `@xyzreality/dhtmlx-gantt` package).
