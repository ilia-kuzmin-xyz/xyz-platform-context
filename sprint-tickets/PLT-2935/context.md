# PLT-2935 — [Dashboard] Freeze planned progress % for sales project `69e232b2c222e55fa039eab2`

**Type:** Task · **Priority:** Minor · No parent epic.
**Jira status (as of 2026-07-30 run):** **In Code Review** — implemented.
**PR:** XYZReality/hc-frontend#2080 (draft), branch `PLT-2935` off master `7e243fe`.
**Local decision:** IMPLEMENTED via date-cap. Awaiting CI + review.

## What the ticket asks
Sales/demo project. The **planned progress %** keeps creeping up; Mostafa wants it fixed
in the state he demoed. Actual + other widgets stay live. FE-only, hidden, keyed on
project id `69e232b2c222e55fa039eab2`. No attachments on the ticket.

**Requester's own words (Mostafa, via chat — supplied 2026-07-30):**
> "For a sales dashboard I'm building. Is there a way to freeze it? I don't want the
> planned percentage to keep increasing." → link to `/projects/69e232b2c222e55fa039eab2/dashboard`
> → "i want to freeze it in this state"

## MECHANISM — verified in code 2026-07-30 (this is the important bit)
Planned % is **not** a stored value that a refresh overwrites. It is **recomputed as a
delta resolved at a moving end date**:

- Every planned query: `WHERE CalendarDate <= '${endDate}' ORDER BY CalendarDate DESC LIMIT 1`
  → `planned = (EndPlannedProgress − StartPlannedProgress) * 100`
  (`utils/progress-queries-v2-api.ts:128-147`, project-level; same shape in the
  package-level, trend, category-summary and activity-level variants)
- `endDate` originates from `_dataDateRange$`:
  `endDate: toISODate(result[0].maxDate)` — the max `CalendarDate` in the refreshed
  parquet (`dashboard-progress-service.ts:290`)
- and is then capped at today:
  `const cappedEndDate = range.endDate < today ? range.endDate : today`
  (`dashboard-progress-service.ts:296-300`)

**So planned climbs for two compounding reasons:** each backend refresh appends newer
`CalendarDate` rows (advancing `maxDate`), and `today` advances. Either way the end date
walks further up the baseline S-curve → planned delta grows.

## Resolution of the 3 questions I raised 2026-07-28
1. **What value to freeze to — DISSOLVED.** No magic number needed. Pin the *date* the
   planned series resolves at; the value he saw falls out of the data automatically,
   because historical `CalendarDate <= D` rows are immutable. Hardcoding e.g. `45%` would
   have been the wrong shape (brittle, and wrong the moment weighting/filters change).
2. **Scope — planned everywhere, not actual.** "Only the planned percentage" is a contrast
   with *actual*, not with the other planned representations. Freezing the headline while
   the trend chart's planned line kept climbing would look broken in the very demo he's
   building, so the cap applies to the planned series consistently.
3. **Variance & SPI — automatic.** Derived from planned, so they inherit the frozen value
   and on-screen maths stays self-consistent.

## Implementation approach (agreed)
Add a hidden, project-keyed **frozen-date cap**, layered on the existing cap idiom:

- `plannedEndDate = MIN(FROZEN_DATE, endDate)` for project `69e232b2c222e55fa039eab2`.
- **Must be a cap (MIN), not a replacement.** A replacement would keep showing the full
  frozen planned even when the user drags the date slider *backwards* — wrong. A cap
  freezes forward while preserving slider behaviour backwards.
- The same `MIN(cap, endDate)` shape already exists in this file
  (`dashboard-progress-service.ts:296-300`, and `refDate` at lines 1772, 2127, 2560) —
  reuse it, don't invent a new mechanism.
- Actual keeps using the live `endDate`, so only planned freezes.
- Frozen date default: **2026-07-24** (when the request was raised) as a single named
  constant. If his screenshot shows a different figure it's a one-constant change.

**Surface note:** planned is resolved in several query functions (project-level,
package-level, trend, category summary, activity-level). Thread an optional
`plannedEndDate` (defaulting to `endDate`) rather than duplicating the constant per query.

## Known side effect — must go in the PR description
Planned frozen at July while actual stays live means **variance and SPI will drift
flatteringly** over time (actual climbs against a fixed planned). Acceptable for a sales
demo, but it should be stated explicitly, not buried.

## What shipped (PR #2080, draft)
- **NEW** `dashboard-progress/utils/frozen-planned-progress.ts` — project→date map plus
  `resolveFrozenPlannedEndDate` (returns null when no freeze applies, so other projects
  skip the extra queries entirely) and `mergeFrozenCategoryPlanned` (overlays frozen
  planned per `ActivityCategoryId`, leaves actual live).
- `dashboard-progress-service.ts` — `_buildFrozenPlannedFilters()`; planned re-resolved
  with the capped filters at the overview + per-package sites in BOTH the activity-level
  and project/package-level paths.
- `dashboard-project-service.ts` — exposed `mongoProjectId` getter (was private).
- Unit spec `frozen-planned-progress.test.ts` (matches jest `testMatch`, not regression-ignored).

**Frozen surfaces:** overview Planned, per-package planned, and (derived) variance/SPI.
**Left live, deliberately:** actual, the trend-chart planned line (each point is date-stamped
and historically accurate — the line extends rather than inflates; clamping would make the
curve stop dead mid-chart), and the unfiltered category summary (feeds filter options only).

## Gotchas found while implementing (do not relearn these)
- `DashboardProgressService.projectId` returns the **Postgres UUID**, not the Mongo id.
  Keying the freeze on it would have silently never fired. The Mongo id lives on
  `DashboardProjectService._mongoProjectId` (`params.project_id` from the URL). There's a
  regression test pinning this.
- `node_modules` is absent in the scheduled-run container and **`npm ci` cannot complete** —
  401 from `npm.pkg.github.com` for the private `@xyzreality/dhtmlx-gantt`. So jest and a
  full tsc cannot run locally; CI is the first real run. Workaround used: compile the pure
  helper standalone with a throwaway tsc and execute the spec's cases directly in node.
- Prettier `printWidth` is 100 but is NOT wired into eslint, and master already carries 75
  over-long lines in `dashboard-progress-service.ts` — so long lines don't fail CI.

## Testing on dev (XYZ Rewind) — two traps
The project is prod-only, so it must be replayed onto dev with XYZ Rewind
(Confluence: XSHW/2027552771; repo `XYZReality/xyz-rewind-chrome-extension`).
- **The freeze does not fire in replay.** It is keyed on the URL project id, and replay
  puts you on a *dev* project id. Rewind's automatic prod→dev path mapping rewrites the
  API calls, not the route param the app reads. Verify by temporarily adding the dev
  project id to `FROZEN_PLANNED_PROGRESS_BY_PROJECT` (local only, never commit).
- **Replay serves a fixed snapshot**, so planned cannot advance in replay even without the
  change — "refresh and watch it not move" proves nothing on dev. The real check is an A/B
  against the constant (frozen planned should read LOWER than live, actual identical).
- The "does not increase across refreshes" AC is only observable on prod once the live end
  date has moved past the frozen date.

## Open assumption
Frozen date = `2026-07-24` (when raised), one named constant. If it doesn't match the
screenshotted figure it's a one-constant change.

---

## Run log — 2026-08-01

- Jira: **In Code Review**. PR #2080 still **draft**. No review threads opened (0 comments from humans/Copilot).
- CI: `build` red **only** on the repo-wide Trivy CVE (`brace-expansion 5.0.7`, CVE-2026-14257) read
  out of `package-lock.json` on master — not this diff. Maven build + Sonar quality gate both green.
- Checkpoint 3: merged `origin/master` (`28e03c3`) in — branch was 3 behind. Clean auto-merge.
  Master's PLT-2874 also touched `dashboard-progress-service.ts`, but only inside
  `getElementsWithDynamicStatus` (~L1725+, element/objectId counting). The frozen-planned code sits
  in the planned-query path (~L973–1258). **Disjoint regions, no semantic interaction** — verified
  both sides survived the merge by grep.
- No code change needed this run. Frozen date still `2026-07-24`, still unconfirmed against Mostafa's
  screenshot (see Open assumption above).

## Next run
- Blocker to clear is **not in this PR**: #2072 (lockfile bump) must land on master for CI to go green.
- Once green, PR is ready to come out of draft — needs Ilia's call on the frozen-date constant first.
