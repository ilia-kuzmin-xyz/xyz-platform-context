# 2026-10-06 — scheduled sprint sweep (Mon)

Master HEAD `959f1ad` (PLT-3223, #2264). Sprint JQL returns **6 tickets**.

## Intake: 3 in Code Review (out of scope), 3 in Analysis (in scope, all still blocked)

| Ticket | Status | State |
|---|---|---|
| PLT-2524 / PLT-2799 / PLT-2933 | In Code Review | out of dev intake; swept as PRs below |
| PLT-3015 | Analysis In Progress | blocked — BE authorities decision, unanswered since 10-03 |
| PLT-3152 | Analysis In Progress | blocked — QA 2/3/4 need Radu, unanswered since 10-03 |
| PLT-3184 | Analysis In Progress | blocked — **but escalated to top priority on 10-05** |

## The one thing that changed: PLT-3184 is now top priority and still cannot start

Pietro on 10-05: *"this is top prioritity please"*. An escalation, not an answer.

Rather than re-note the stall a third time, the backend blocker was **re-verified first-hand**
against `XYZPlatformApi` `origin/master` (`e904547`): `quantityType`, `packageType`, `coverage`
and `Volume` have **zero** occurrences in `src/`. The only weighting concept is still
`ProjectProgressWeightingMethod` = `PLANNED_LABOUR_HOURS | LINKED_ELEMENT_COUNT`
(`src/models/ingress.ts:44`), **GET-only** at `/:projectId/progress-weighting`
(`projects.routes.ts:754`). Project-level, single value, no write path.

So: confirmed backend-first, not assumed. Comment `114045` posted to Pietro with that evidence,
asking whether to raise the BE ticket + 10 mins with Jason, or size it BE-first and park the UI.
Re-asking was right here where it was wrong on 10-04/10-05 — the priority changed, three working
days passed, and the comment carries **new evidence** rather than repeating the question.

**The UI was deliberately not started.** No persistence API, no Length/Area/Volume field, and
"Coverage" undefined. A selector that saves nowhere plus an invented Coverage number looks like
progress and gets wholly rewritten later. PLT-3015 and PLT-3152 were **not** re-pinged: no
escalation and no new evidence on either, so a second ping is noise.

## Checkpoints 1–3 on the four sprint PRs

| PR | Ticket | Draft | CI on head | Open threads | Behind master | Merges clean |
|----|--------|-------|-----------|--------------|---------------|--------------|
| #2250 | PLT-2799 | no | **green** | **0** (6 resolved) | 2 | yes |
| #2251 | PLT-2524 | no | **green** | **0** (8 resolved) | 2 | yes |
| #2260 | PLT-3152 | yes | **green** | **0** | 2 | yes |
| #2263 | PLT-2933 | yes | **green** | **0** | 2 | yes |

- **Checkpoint 1: nothing to action.** Every review thread on all four is resolved.
- **Checkpoint 2: all green.** build + SonarCloud success on each head.
- **Checkpoint 3: the only outstanding item**, and it is low-stakes. All four are exactly 2 behind
  (`95e1003` PLT-2910, `959f1ad` PLT-3223). **File overlap with those two commits is zero for all
  four PRs**, and `git merge-tree` reports **no conflicts** on any of them. So being behind blocks
  nothing — no conflict, no contract collision.

Worth recording for whoever does merge master in: PLT-3223 reorders `project-service.ts` so
`fetchProjectDetails()` runs *before* the parallel loads ("schedules aggregate progress by the
project's weighting method"), and moves the `schedule_activity_dates` table creation ahead of the
artefact tables. Nothing any of these four PRs touches, but it is the progress-weighting path, so
it is the thing to look at first if a merged PLT-2524 ever goes odd.

## ⛔ The master merges were NOT pushed — commit identity is blocked, and this time it cost work

`git config user.name/user.email` to Ilia's identity was **refused by the sandbox classifier**
(`[Auto-Mode Bypass]`). The refusal is on the outcome, so it was not routed around.

This contradicts what the repo history shows is achievable: `b89b52d` and the merge commit
`89d7ef1` on `PLT-3152` are both **authored and committed** as
`ilia-kuzmin-xyz <ilia.kuzmin@xyzreality.com>` — i.e. the 10-05 run managed it. The 10-04 note
called this "the single thing most likely to stall a future run". **It has now stalled one.**

The standing instruction is "push commits on my behalf always". With identity blocked the only
alternatives were to push four merge commits authored `Claude <noreply@anthropic.com>` — directly
against that instruction, and permanently in the PR history — or not to push. **Not pushing was
chosen**, because the merges are provably zero-value-at-risk this run (clean, no conflicts, CI
green, no open threads) while wrong-identity commits are not undoable. That trade only holds while
the merges stay trivial; the moment a PR needs a real fix pushed, this blocker becomes expensive.

**This needs a decision from Ilia.** It is now the top operational risk on these runs.

## ⚠️ npm still unusable — fifth consecutive run

`NPM_TOKEN` is unset in the scheduled sandbox and `node_modules` is empty, so vitest,
`tsc --noEmit` and eslint could not run (09-29, 09-30, 10-01, 10-04, 10-06). Everything above is
static analysis plus CI. Note this did **not** bite this run — nothing needed verifying, because
nothing was written.

## For the next run

1. **PLT-3184 first.** If Pietro/Jason have replied, it is the sprint's top priority and the UI is
   small once placement, the quantity source and the Coverage definition are settled.
2. If PLT-3184 is still unanswered with "top priority" on it, escalate to Ilia directly rather than
   adding a third Jira comment — the ticket thread has stopped being the right channel.
3. **Do not push commits unless identity can be set to Ilia** (see above), or until Ilia says
   `Claude <noreply@anthropic.com>` authorship is acceptable.
4. The four PRs need a master merge whenever identity is available; all four were clean as of
   `959f1ad`.
