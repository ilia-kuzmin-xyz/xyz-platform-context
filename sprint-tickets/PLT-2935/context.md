# PLT-2935 — [Dashboard] Freeze planned progress % for sales project `69e232b2c222e55fa039eab2`

**Type:** Task · **Priority:** Minor · No parent epic.
**Jira status (as of 2026-07-30 run):** **Ready For Development** — clarifications resolved.
**Local decision:** UNBLOCKED. Approach agreed (date-cap, see below). Next run: branch `PLT-2935` off master and implement.

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

## Next run
- Branch `PLT-2935` off latest hc-frontend master; implement the cap; draft PR.
- Do NOT hardcode a percentage. Do NOT freeze actual. Do NOT replace the date (cap it).
