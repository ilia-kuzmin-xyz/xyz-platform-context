# PLT-3117 — Infinity Canvas: per-block data lineage inspector

**Domain:** Canvas (`canvas/`), specifically the artifact/report surface. Design notes live in
`canvas/planning/block-inspector.md`; the review round that followed is recorded in
`canvas/` (commit `929e034`).

## 2026-09-10 — first context file for this ticket

Created on the scheduled run. The ticket itself is only a day old (created 2026-09-09 23:46) and
**the PR predates it** (#2212 opened 23:14 the same evening), so there was never a kick-off to do
here — the implementation already exists.

**State:**

| | |
|---|---|
| PR | [#2212](https://github.com/XYZReality/hc-frontend/pull/2212) — **draft** |
| Branch | `PLT-3117`, base `master` @ `ed60719` (**current master, 0 behind**) |
| CI | `build` ✅ · SonarCloud ✅ (2026-09-10 01:02) |
| Review threads | **0** — nobody has reviewed it yet |
| Pipeline half | `XYZReality/XYZ_InfiniteCanvagentPipeline#17` — out of this repo's scope |

**Jira status corrected this run:** the ticket was sitting at `Open` while a green, fully
implemented PR existed. Moved to **Dev In Progress** (transition 1051) so the board matches
reality. It is *not* `In Code Review` because #2212 is still a draft — leave that move until the
draft is lifted.

## What is already built (so the next run doesn't re-derive it)

Two commits on the branch: the feature, then an adversarial self-review round that fixed seven
correctness bugs. Both are described at length in the PR body — read that rather than the diff if
you only need the shape.

The load-bearing design decision: **the bindings arrive from the pipeline, the counts do not.**
`lib/evaluateBinding.ts` recomputes source → filter → sort → limit against the payload the panel
actually rendered from, so the sidebar can contradict a wrong manifest instead of parroting it.
Everything else follows from that choice.

Two behaviours worth not breaking:
- missing values sort **last in both directions** (a "worst first" list must not open with rows
  that have no value at all);
- ordering comparisons against a missing value are **false**, as in SQL — never `0 < x`.

## Open items

- **Nobody has reviewed it.** Zero threads. The PR is draft, so that's expected, not a stall.
- **Needs a human eye on the visuals** — the 340px sidebar against a wide report, and whether
  "Sources · N" reads better than a plain "Inspect". Flagged in the PR body; can't be judged from
  here.
- **Repo ESLint can't run in this checkout at all** — `eslint-plugin-sonarjs` throws on load
  against ESLint 9.39.5, on untouched files too. Not caused by this branch. Worth its own ticket;
  it means no run can lint-check anything in this repo locally.

## Explicitly out of scope for the MVP

Re-binding from the sidebar, "Ask about this block", the inspector on dashboard-tab and library
views, and backfill for already-published reports.
