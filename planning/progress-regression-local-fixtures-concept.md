# Progress Regression Testing — Local Fixtures Concept (DONE: PLT-2664)

> **Status:** Implemented and merged. See `docs/dashboard/progress-regression-testing-plan.md` for the canonical reference and `src/.../dashboard-progress/__test-fixtures__/` for the harness.

---

## Original concept

every time user goes to the dashboard page -> progress tab he observe following interface
1. left hand panel with progress overall and list of dsiciplines and packages
2. 3d viewer
3. schedule panel with activtiies which also displays actual / planned values
4. filter panel with affect on first 3 components data

let's say we make regression test and take ELN03 project as an example
I expect that we should make a snapshot of how data looks when we open the interface, date range initially gets 
start date: [project start date activities] - end date [project end date based on schedule activities]
and set up a following date range:
start date: [project start date activities] - end date [TODAY: 11/06/2026 (let's take as a fixed day)]

and for the following date range we get the snapshot
1. left hand panel displays certain values for overall and list of dsiciplines / packages
2. schedule panel displays certain activities with certain actual / planned values
3. 3d viewer displays certain statuses: installed / installed early / .... for X amount of elements

we make certain snapshot / "screenshot" of values and keep it in fileA

all this outputs happen due to: 
- gather data from paruetf files and arrange in duckdb tables
- use Query A, query B, query C..... to display

so, we somehow avoid replicating, and re-import all this logic into test files.
So later,  if a developer change anything in them, out tests file immedaitely gets updated with new queryes and other logic

now, let's say that a developer changed some logic in the way it gathers data, also he tweaked queries
then he pushes these changes into PR.
- Using our test files we reproduce a "screenshot" of updates values across all left hand panel, schedule panel, 3d viewer
- we compare new screenshot with the old one and check mismatch by certain criteras
- given mismatch threshold, we decide whether to fail or not

---

## Review summary (Claude, 2026-06-11)

Verdict: implementable without overengineering, with three adjustments.

**What already holds**
- "Snapshot vs baseline + threshold" is exactly the golden-master pattern; the
  PLT-2664 branch already does this for the left panel queries.
- "No logic duplication" is already solved: tests import the production query
  functions and only inject a test DuckDB. Developer changes flow into tests
  automatically — nothing to re-import or sync.

**Adjustment 1 — snapshot data, not UI.** All three panels are projections of a
few service functions. Snapshot their JSON outputs, not screenshots:
- Left panel  -> project/package/activity query outputs (overall %, per-package rows)
- Schedule    -> activity-level rows (actual/planned per activity)
- 3D viewer   -> getElementsWithDynamicStatus output reduced to status counts
  (planned / installed / installed-early / late / late-start) — no viewer needed.
One baseline JSON per panel area, compared with exact match for counts and
±0.1pp tolerance for percentages.

**Adjustment 2 — fixed end date works for free.** Production caps
refDate = MIN(dateRangeEnd, today). With dateRangeEnd frozen at 2026-06-11,
every test run after that date is fully deterministic — no Date mocking.

**Adjustment 3 — fixture size is the only real risk.** Measured (dev project
OPFS cache, 2026-06-11): activity-progress 40.9 MB, svf2-object-id-map 33.5 MB,
activity-links 18.8 MB, element-status 9.1 MB; the rest (project-progress,
category-groups, project-rooms, project-levels) are all under 200 KB.
Total ~102 MB — cannot commit verbatim. All four heavy files scale with
element/activity count, so trimming to a subset (1-2 packages or one floor)
via a one-off DuckDB capture script (`COPY (SELECT ... WHERE ...) TO parquet`)
brings the full fixture set to roughly 5-10 MB — committable.

**Drop from previous iteration:** per-environment baselines (dev/staging/prod)
and all CI auth/tunnelling — one committed fixture set, one baseline, runs
anywhere with plain `npx jest --config jest.regression.conf.js`.

**Pipeline becomes:**
```
capture once:  ELN03 parquets (trimmed) + baseline JSONs  ->  committed
every PR:      fixtures -> DuckDB -> production queries -> snapshot
               snapshot vs baseline  ->  pass / fail (threshold)
intentional change:  re-run capture in update mode -> new baseline in same PR
```