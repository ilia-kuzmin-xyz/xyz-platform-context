# 2026-10-03 — scheduled review sweep over team PRs (Rishi / Darminder / Tom)

Scope: open non-draft PRs on hc-frontend authored by Rishi, Darminder or Tom. Found three:
#2262 (rishib-xyz), #2221 (rishib-xyz), #2211 (DarminderA). No open non-draft PR by Tom.

## #2262 — PLT-2910 re-login error toasts (Rishi) → APPROVED this run

- Ticket: Medium bug, QA repro unreliable; two toasts after re-login ("Schedule could not be
  loaded", "Failed to authenticate with the viewer").
- Fix verified against the diff and domain notes: `project-service.ts` awaits
  `fetchProjectDetails()` before the models/structure/schedules `Promise.all`, so `ScheduleEntity`
  never reads `progressWeightingMethod` from absent details (per-project server-side setting —
  consistent with PLT-2911/PLT-3109 notes). `viewer-y.tsx` gains `_isUnmounted` + a 401 classifier
  (`helpers/isUnauthorizedError.ts`): no retries, no toast on 401 or after unmount.
- All 4 Copilot threads resolved with pushed fixes on head `1ff751e`; CI + Sonar green; new
  `viewer-y.test.tsx` and two MSW scenarios (`editor-slow-project-details`,
  `editor-viewer-token-401`) make the repro deterministic.
- Approved with two non-blocking notes on the review: startup now pays details latency ahead of
  models/structure (deliberate failsafe, Rishi answered Copilot's thread), and the
  schedule-ordering half has only the MSW scenario, no unit test.

## #2221 — PLT-3136 commissioning backend seam (Rishi) → NO ACTION, conditions unchanged

- The 09-26 review from Ilia's account already set the bar: merge master (conflicts in
  checklist-instance-service / checklist-library-service / commissioning-request-error),
  scope the `setOrder` `known` map to the requested workflow, then approve.
- Head `0b45ea4` unchanged since; still `mergeable_state: dirty`, 3 Copilot threads open
  (setOrder + two latent `clear()` partial-clear ones). Jira status: Blocked.
- Per the no-repeat rule (no developer action since last comment), nothing was posted.

## #2211 — PLT-3112 viewer linked-element counts (Darminder) → NO ACTION, waiting on author

- Live Incident (Medium). Rishi requested changes 09-30 (open panel doesn't refresh counts when
  the model finishes loading). 3 Copilot threads open, the real one being: an empty id set means
  both "not loaded yet" and "loaded, zero mappings", so stale DB links pass the filter permanently.
- `build` check is red on head `2afb31a` (Sep 9). Darminder said on the Jira (10-02) it will be
  actioned by Monday. Nothing posted — review already requested, ball with the author.

## Constraints noted (carried from 10-01)

- Committing/posting as Ilia himself is not possible from scheduled runs (identity change refused
  10-01); GitHub posts from this environment carry the Claude Code footer. The #2262 approval and
  this note follow that — flagged to Ilia in the run summary.
