# PLT-3081 — recommended action

**Status: Group A, needs data from Ilia before it can be called.** Not dev-ready as a *root cause*
fix. But see §3 — three of the five defects are dev-ready right now and do not depend on the answer.

---

## §1 The diagnostic ladder — ordered by information per unit of effort

Each rung is a falsifiable prediction. Stop as soon as one of them lands.

### Rung 0 — watch 30 seconds of the video already attached (free, no new work)

`Screen Recording 2026-08-20 110903.mp4` is on the ticket. Two things to read off it:

1. **Which spinner** — the whole left panel replaced by a spinner, or a small green spinner next to
   the panel header with the numbers still visible underneath?
   - Whole panel → `isLoading` stuck → **H2**, look at the loaders, not the filter query.
   - Small green only → `isQuerying` stuck → **H1 or D3**.
2. **Is the rest of the dashboard still alive** — does the date slider move, does the Quality tab
   respond, does the 3D viewer still orbit?
   - Everything frozen → single-connection starvation (D2) confirmed, which means the stuck thing is
     a DuckDB query and not React state.
   - Only the left panel frozen → the query completed and something downstream is stuck.

### Rung 1 — Ctrl+Shift+D, before and after the click (30 seconds, no SQL)

**The dashboard ships a hidden DuckDB monitor overlay: Ctrl+Shift+D** (`resizable-layout.tsx:586-587`).
It shows DuckDB memory usage against the memory limit, plus per-table row counts.

Open it, note memory usage, click the failing package, watch.

| Observation | Reading |
|---|---|
| Usage climbs toward the limit, then **the monitor itself stops updating** | H1 confirmed, and D2 confirmed — the monitor's own polling queries are queued behind the stuck one |
| Monitor keeps updating happily, memory flat, panel still spinning | H1 dead. The query is not the stuck thing — move to H3/H4 |
| Usage already near the limit *before* the click | explains the "~15 minutes" variant directly; the package is the last straw, not the cause |

Also worth capturing from that panel: the row counts for `element_base_data`, `activity_links`,
`activity_categories_flat`, and the memory limit value it reports.

### Rung 2 — the console, at the moment it hangs

Looking for exactly three strings:

- `Query failed` — `_queryAllData`'s catch (`dashboard-progress-service.ts:1300`). Means it **threw**.
- `Query execution failed:` — `duckdb-service.ts:604`. Means DuckDB rejected it.
- **Neither, and no error at all** — means the promise **never settled**: worker dead or wedged (D1).
  This is the prediction H1 makes.

An unhandled promise rejection mentioning `_queryAllData` instead would point at **D3** (the
throw-outside-try window), which is only reachable if a room or level filter was also active — so
please also say whether any other filter was applied when you clicked.

### Rung 3 — the SQL, once the exact package pair is confirmed

**First, settle the naming discrepancy** (`context.md` §1). Yash's ticket says *Underground - CSA*,
you said *Electrical - CSA*. The panel label is `` `package — discipline` `` and only appears in that
form when the package name collides across disciplines. So I need the two raw strings:
`discipline = ?` and `package = ?`. If both labels are real, we have two failing packages and that is
itself a finding.

Then, substituting `<D>` and `<P>`:

```sql
-- (a) fan-out entering the DISTINCT for the FAILING package.
--     This is the number that decides H1.
SELECT COUNT(*)                        AS joined_rows,
       COUNT(DISTINCT base.objectId)   AS distinct_objects,
       COUNT(DISTINCT base.modelElementId) AS distinct_elements
FROM element_base_data base
JOIN activity_links al  ON base.modelElementId = al.modelElementId
JOIN activity_categories_flat cat ON al.activityId = cat.activityId
WHERE cat.discipline = '<D>' AND cat.package = '<P>';

-- (b) the SAME query for a package that works fine, as the control.
--     Without (b), (a) is a number with nothing to compare it to.

-- (c) duplicate links — H1b. If total >> distinct_pairs there is gratuitous fan-out.
SELECT COUNT(*) AS total_links,
       COUNT(DISTINCT (modelElementId || '|' || activityId)) AS distinct_pairs
FROM activity_links;

-- (d) worst-case links per element, project-wide.
SELECT MAX(c) AS max_links_per_element, AVG(c) AS avg_links_per_element
FROM (SELECT modelElementId, COUNT(*) c FROM activity_links GROUP BY 1);

-- (e) sanity: how many activities does the failing package even have?
SELECT COUNT(*) AS activities
FROM activity_categories_flat
WHERE discipline = '<D>' AND package = '<P>';
```

**Predictions.** H1 lives if (a)'s `joined_rows` is an order of magnitude above (b)'s. H1b lives if
(c) shows `total_links` materially above `distinct_pairs`. If (a) ≈ (b) and (c) is clean, **H1 is
dead** and the cause is not fan-out — go to H4 (the colour/viewer path), which this run has not
examined at all.

⚠️ **Run (a) in a fresh tab, not the wedged one** — on the wedged connection it will simply queue
behind the stuck query and never return, which would look like a result rather than a symptom.

---

## §2 What to say on the ticket now

Nothing is posted by this session. Draft, one owner, answerable:

> Picked this up. Two things before I can call the cause.
>
> First, a naming check. The ticket says Underground - CSA and I'm seeing it on Electrical - CSA. In
> that list a package only shows with a discipline after it when two disciplines both have a package
> of that name, so I want to be sure whether we're looking at one package or two. Could you confirm
> from the customer which one they clicked, and ideally the exact discipline and package names rather
> than the label?
>
> Second, whoever can reproduce it: press Ctrl+Shift+D on the dashboard before clicking the package.
> That opens a DuckDB monitor with a memory reading. If the memory climbs and then the monitor itself
> stops updating, that tells us the database worker has run out of memory and taken every later query
> with it, which would explain why nothing recovers without a refresh. A screenshot of that panel just
> before and just after the click would settle it.
>
> Separately, and regardless of what the trigger turns out to be: there is no timeout on any dashboard
> database query, and they all share one connection. So one query that never comes back freezes the
> whole dashboard with no error, which is exactly what the customer is describing. That part I can fix
> without waiting for the data.

**Do not** ask the customer for the video — it is already attached.

---

## §3 Dev-ready now, independent of the root cause

These do not need the data and are worth raising as their own ticket(s). They convert an unrecoverable
freeze into a recoverable error, which is most of the customer's complaint.

1. **Timeout + worker supervision on `DuckDBService`** (`duckdb-service.ts:590-608`, worker at `:101`).
   Wrap `query()` in a `Promise.race` with a generous ceiling (30-60s), and attach `onerror` /
   `onmessageerror` to the worker so a dead worker rejects in-flight promises instead of stranding
   them. Highest value of the five: it is what makes every other failure mode recoverable.
2. **`try`/`finally` around `_queryAllData`** (`dashboard-progress-service.ts:1013` → `:1302`). Move
   `_isQuerying$.next(true)` inside the try, or better, clear it in a `finally`. Removes the
   permanent-spinner class of bug outright.
3. **Surface query errors** — write to `errors$` in the catch at `:1300`, and widen `hasError`
   (`use-dashboard-progress.ts:113`) to include it, so the panel can render "couldn't load" instead of
   spinning. Needs a small design call on the empty/error state, so worth a word with Jason.
4. **Set an explicit `memory_limit`** at init (`duckdb-service.ts:110-119`, next to `SET threads = 1`)
   so DuckDB spills or errors cleanly instead of taking the wasm heap down with the viewer. Needs a
   number chosen against real projects — do this *after* the Rung 1 reading, not before.
5. **Escape `filteredPackageIds`** (`progress-queries-v2-api.ts:176`, `:392`, `:398`, `:558`) to match
   the escaping already used for activity ids at `:663`. Pure hardening, no behaviour change.

Items 1-3 and 5 are small, local, and testable. Item 4 is the only one that wants data first.

---

## §4 Disposition

**Keep as Group A / Open for now.** It is not With-Technical-Support (we need a reading from our own
dev overlay, not information from the customer), not Blocked (the next step is ours), and not
Ready-For-Dev *as a root-cause fix* — but §3 items 1-3 could be split out as Ready-For-Dev
immediately without prejudging the trigger, and doing so would materially improve the customer's
experience of this class of failure even if H1 turns out to be wrong.

**Confidence.** The five structural defects: **9/10** — read directly on current HEAD, with the
negative greps run rather than assumed. H1 as *the* trigger: **5/10** — it is the only cost path that
varies by package, which is suggestive, but the strongest version of it was disproved this run
(`activity_categories_flat` is one row per activity), and no data has been seen. The 15-minutes /
immediate reconciliation: **4/10**, plausible and unverified.

---

## §5 2026-08-21 update — pair confirmed, H1 falsified, next asks

Package pair is **`discipline = 'CSA'`, `package = 'UG Electrical'`** (one package; "UG" =
Underground, so Yash's and Ilia's labels were the same thing). Rung 3 query (a) returned
`joined_rows = 0, distinct_objects = 0`. See `context.md` §8 for the full reading.

### 5a — Validate the predicate FIRST. A wrong predicate returns 0 too.

`activity_categories_flat`'s columns are generated from the project's category **typeName** strings
(`api-categories-loader.ts:195-207`), so the column names are not guaranteed to be `discipline` /
`package` on this project, and the values could differ by case or whitespace. Until this comes back,
the `0` cannot be built on.

```sql
-- (i) real column names on THIS project
DESCRIBE activity_categories_flat;

-- (ii) the decisive one: exact strings AND activity counts in a single pass.
--      Also doubles as the control for (a) — every sibling package's count is right here.
SELECT discipline, package, COUNT(*) AS activities
FROM activity_categories_flat
WHERE package ILIKE '%electric%' OR discipline ILIKE '%electric%' OR discipline ILIKE '%csa%'
GROUP BY 1, 2
ORDER BY 3 DESC;

-- (iii) does the parquet the PANEL reads agree with the flat table the FILTER reads?
SELECT ActivityCategoryId, CategoryName, ParentDiscipline, TypeName
FROM category_groups
WHERE CategoryName ILIKE '%electric%'
GROUP BY ALL;
```

**Readings.** If (ii) shows `(CSA, UG Electrical)` with a healthy count → the `0` was a predicate
typo, H1 is back open, and (ii) has handed us the control numbers anyway. If (ii) shows **no such
pair** while (iii) shows the package present in `category_groups` → the `0` is real, H1 is dead, and
we have a source-disagreement finding (`context.md` §8) that is arguably worth its own ticket
regardless of the hang.

### 5b — The two zero-cost questions are now the critical path, not more SQL

Both have been asked once and are still unanswered. With size off the table they are now worth more
than any query:

1. **Which spinner** — whole left panel replaced, or the small green one beside the header with
   numbers still visible underneath? Splits H2 from H3/H4 outright (`context.md` §2).
2. **The console at the moment it hangs** — `Query failed` / `Query execution failed:` / **nothing**.
   Distinguishes "threw" from "never settled". An unhandled rejection naming `_queryAllData` would
   point straight at D3.
3. **Was any other filter active** (room, level, floor, status, XYZ Tracked, a Gantt selection) when
   you clicked? D3's only realistic throw site is the awaited `_resolveRoomLevelToActivityIds` at
   `:1026`, which is *only reached when a room or level filter is active*. A yes here would make D3
   the answer almost immediately.

### 5c — Unchanged

§3's dev-ready list is unaffected by any of this — those five defects are what turn a failure into an
unrecoverable freeze, whatever the trigger. Note that D1 also silently disables the three 60-second
guards in `dashboard-color-service.ts` (`context.md` §8, last note), which strengthens the case for
fixing it first.

---

## §6 2026-08-21 — ROOT CAUSE FOUND. This is now READY FOR DEVELOPMENT.

**Supersedes §1, §5a and §5b — do not run those diagnostics, they are answered.** Full trace in
`context.md` §9. One-line statement of the defect:

> A package with zero progress weight is filtered out of the progress query by
> `AND weightColumn > 0`, the surviving ungrouped aggregate returns a single all-`NULL` row, that
> `null` is pushed onto `maxActualProgress$`, and the panel reads `maxActualProgress === null` as
> *"the first query hasn't finished"* — so it renders the full-panel spinner forever, over the very
> list the user would need to deselect the package from.

`(CSA, UG Electrical)` on LVN1-2 is such a package: **2 activities, 0 linked elements.** Its sibling
`(Electrical, UG Electrical)` has 543 activities and works fine.

### 6a — One query to close the last 1/10 of doubt (optional, not blocking)

```sql
SELECT ActivityCategoryId, CategoryName,
       MAX(TotalPlannedLaborUnits) AS max_labour,
       MAX(TotalLinkedElements)    AS max_elements,
       COUNT(*)                    AS date_rows
FROM category_groups
WHERE TypeName = 'Package' AND CategoryName = 'UG Electrical'
GROUP BY ActivityCategoryId, CategoryName
```

**Prediction:** two rows. The Electrical one has weight > 0; **the CSA one has `max_labour = 0` and
`max_elements = 0`.** If the CSA row instead shows weight > 0, §9's step 3 is wrong and the trace needs
revisiting.

### 6b — The blast radius, and a falsifiable prediction worth running

Any zero-weight package hangs the panel identically. This is not a one-package bug.

```sql
SELECT ActivityCategoryId, CategoryName,
       MAX(TotalPlannedLaborUnits) AS max_labour,
       MAX(TotalLinkedElements)    AS max_elements
FROM category_groups
WHERE TypeName = 'Package'
GROUP BY ActivityCategoryId, CategoryName
HAVING MAX(TotalPlannedLaborUnits) = 0 OR MAX(TotalLinkedElements) = 0
ORDER BY CategoryName
```

**Prediction: every package this returns will strand the panel when clicked** (those with
`max_labour = 0` under labour-hours weighting, which is the default; those with `max_elements = 0`
under element-count weighting). Clicking one other package off that list is the cheapest possible
confirmation of the whole diagnosis — and it also tells the customer which packages to avoid until the
fix ships. Likely candidates from the activity census, to sanity-check the output against:
`CSA / Wet Utilities` (1 activity), `Electrical / Earthing` (1), `CSA / Site Set Up` (2),
`Electrical / Containment` (2), `Electrical / Install Elec Equip` (3).

⚠️ Activity count is **not** weight — a package with many activities can still have zero linked
elements. Trust the query, not the census.

### 6c — The fix

**Primary, minimal, ships now.** Treat a null aggregate as "no measurable data for this selection"
instead of letting it masquerade as "not loaded yet". The file already contains the intended
behaviour for the sibling case — the activity path's explicit "filter matched nothing → emit zeros"
branch at `dashboard-progress-service.ts:1099-1114`. Mirror it:

- At `:1229-1233` (package/project path) and `:1139-1143` (activity path — **same defect, second call
  site**, via the identical `NULLIF(SUM(u.Weight), 0)` at `progress-queries-v2-api.ts:729-730`), stop
  forwarding a possibly-null `actual` straight onto the subject. Emit `0` when the aggregate came back
  null, as the activity-empty branch already does.
- **Fix the type lie that hid this**: `duckdb.query<{ actual: number; planned: number; … }>`
  (`progress-queries-v2-api.ts:265-270`, and `:154`, `:738`) should declare `number | null`. Doing this
  *first* makes the compiler point at every unguarded call site, which is how to be sure both are
  found rather than just the two named here.

**Follow-up, needs a design call.** Emitting `0` renders "0.00%", which is defensible but not
informative — the honest state is "this package has nothing measurable in it". The right fix is to
widen the `hasNoProgressData` concept (`use-progress-panel-data.tsx:37`) so it also covers "the
current filter resolves to no weighted data", and show the empty state instead of zeros. Worth a word
with Jason on the copy. **Do not let this hold the primary fix** — the primary fix already restores the
user's ability to deselect, which is the whole incident.

**Regression test.** This is exactly what the hermetic golden-master suite exists for
(`docs/dashboard/progress-regression-testing-plan.md`, `npm run jest:regression`). A fixture package
with zero weight, asserting a non-null emission on `maxActualProgress$`, would have caught this and
will stop it returning.

### 6d — Disposition and what to tell whom

**Move to Ready For Development.** Root cause identified, fix is small and local, two call sites named,
no product decision required for the primary fix.

Two things worth saying on the ticket, and they have different owners:

1. **To Yash, for the customer** — there is a real workaround now, which is better than "refresh and
   hope": the packages that do this are the ones with no linked elements and no planned labour hours,
   they are stub rows in the schedule, and 6b lists them exactly. Until the fix ships, avoiding those
   avoids the freeze. Also worth correcting the ticket's framing: it is not a crash, it is not
   time-based, and it is not "after 15 minutes" — it is one specific click, and it will reproduce on
   the first click every time.
2. **To Mostafa / Pietro, separately and lower priority** — LVN1-2's schedule carries packages with
   zero linked elements and zero labour (`CSA / UG Electrical` has 2 activities and no links, while
   `Electrical / UG Electrical` has 543). That is arguably a data-quality question for project
   controls independent of our bug. **Do not bundle this with the fix** — the dashboard must not hang
   on a legitimately empty package regardless of whether the schedule should contain one.

### 6e — What is no longer relevant

The five structural defects in §3 are **still worth fixing** but are **no longer the story of this
ticket**. Of them, D4 (query errors can never surface) is the one that made this present as a crash
rather than an error, so it is the natural companion PR. H1/fan-out, the memory-limit item, and the
Ctrl+Shift+D diagnostic are all off the critical path — do not spend more time on them here.
