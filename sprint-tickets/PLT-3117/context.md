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

## 2026-10-08 — the three findings the 10-07 PM sweep escalated were already fixed; two new ones closed

Correction to `runs/2026-10-07-own-prs-checkpoint-sweep.md`, which listed #2212 as carrying an
**unresolved HIGH** sandbox-frame finding and two MEDs needing Ilia. All three were in fact fixed
and resolved in `1c832cc` at 23:07 on 10-07 — *after* that sweep ran, so the escalation was already
stale when written. Do not re-raise it:

- **HIGH `lib/sandboxFrame.ts`** — `isOwnFrame` now accepts only a direct child
  (`source.parent === window`) and `isFrameIn` compares the iframe's `contentWindow` against the
  source itself, so a frame nested inside a report is no longer answered. The descendant-trust gap
  is closed.
- **MED ×2 case-sensitivity** — `normaliseHierarchyLevel` was extracted into
  `services/progressOutputsService/hierarchy-level.ts` (so the canvas does not import the parquet
  reader) and both `outputType` and `level` go through it.

### Two new findings from the 23:13 re-review, both fixed in `6defbde`

1. **`lib/filterProgress.ts` cached its own failures.** `prepare(projectId).catch(() => false)`
   stored `false` in the module-level `prepared` for the lifetime of the page, so a single transient
   API / download / DuckDB failure meant filtered progress stayed permanently unavailable for that
   project — no recovery short of a reload. The rejection handler now evicts the entry so the next
   request retries; a *resolved* `false` ("this project genuinely has no activity-level progress")
   still caches, because that is a real answer.

   The eviction is guarded with `prepared === entry`: a slow failure can settle after the cache has
   moved to a different project, and clearing unconditionally would throw away that project's good
   work. Keep the guard if this is ever refactored.

2. **`services/project-get.ts` shared requests across different timeouts.** The cache key was
   `projectId + path + query` with no `timeoutMs`, so the schedule loader (short, retry-oriented
   bound) and report-data (60s default) could share one in-flight request and whichever started
   first dictated the other's deadline — a "bounded" load could silently wait a minute.

   Fixed by putting the timeout in the key rather than standardising the callers, because the
   differing bounds are deliberate: the schedule loader wants a short timeout *precisely so it can
   retry*. Cost is slightly less sharing between callers that want the same path on different
   deadlines; sharing that changes request semantics is worse.

Validated on the branch: `tsc --noEmit` clean (bar the known gantt-stub artifacts), **319 CanvasPage
tests pass**, lint exit 0. Both threads replied to and resolved. The branch is 5 behind master and
merges clean — not merged, per the standing rule that being behind is neither a conflict nor red CI.

### Version-gate decision (2026-10-08) — kept the floor-only window, deliberately

A later re-review asked for `reportVersion.ts` to also require `builtBy <= support.version`, so an
older runtime refuses a report built by a newer pipeline. **Declined, and the test at
`reportVersion.test.ts:16` pinning `opens(support, '2.4.0') === true` is deliberate, not an
oversight.** Recording the reasoning so it is not re-argued from scratch:

- `opensReportsFrom` is a **floor the pipeline declares**; the module comment and the user-facing
  "opens reports from X on" message both state a one-sided window. A ceiling makes that copy wrong.
- The real cost is **rolling deploys**: while two pipeline versions are live, anyone landing on the
  older one would be refused every report the newer one built — broad transient breakage from
  something that is usually not actually incompatible.
- What a ceiling prevents is a report erroring on a missing module: visible and recoverable.
- The lever for a genuine breaking change already exists — the pipeline bumps `opensReportsFrom`.

The argument flips if reports start moving between environments routinely. Thread resolved with
that reasoning and an explicit offer to reopen.
