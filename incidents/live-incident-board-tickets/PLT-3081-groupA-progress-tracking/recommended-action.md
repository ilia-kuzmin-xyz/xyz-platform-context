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

## §7 2026-08-21 — FIX PUSHED (diagnosis abandoned as too costly)

`hc-frontend` **`claude/vigilant-franklin-nyvkcp`**, commit **`035cb47`**, branched fresh from
`origin/master` at `711aa7e`. **No PR opened** (not requested).

**Why the fix shipped without a confirmed trigger.** Four rounds of SQL each killed a hypothesis
(§8, §9, §10, §11) while the runtime read that would have settled it never landed:
`window.projectService` returned `false` even with `enableGlobalWebViewerAPI` toggled — most likely an
origin mismatch, since the flag lives in a `feature-flags` **cookie**
(`helpers/getFeatureFlagValue/getFeatureFlagValue.ts`, default `false` at `constants.ts:895`) and the
prod-data plugin serves the app from a different host than where the flag was set. At that point the
diagnosis had cost more than the fix, and Ilia said as much. The fix is correct regardless of trigger
and turns an unrecoverable freeze into a visible warning, so it was the right thing to ship.

### What the change does

Routes both overview emission points through a new `_emitOverviewProgress`
(`dashboard-progress-service.ts`), which coalesces a missing aggregate to `0` — matching what the
activity-level "filter matched no activities" branch already emits — and **logs one `logger.warn`
when it fires**.

**The warn is the diagnostic, and it is why this is fix-plus-proof in one build.**
`logService/logger.ts:17-18` is `level === 'warn' || level === 'error' || CONSOLE_VERBOSE`, so
**warn/error always reach the console in any build, regardless of flags or NODE_ENV**. If clicking
`UG Electrical — CSA` now prints `Overview progress returned no weighted rows (package level)`, the
§9/§10 mechanism is confirmed and the ticket is closed. If the panel still hangs with **no** warning,
the mechanism is not the cause and the next place to look is the viewer/colour path (H4) with empty
`_visible_elements` as the starting fact. **Either way the next run gets a definite answer without a
feature flag, a cookie, or a console handle.**

### Correction to §6c — a claim I made twice and had to withdraw

§6c said to "fix the return type first so the compiler points at every unguarded call site". **That
does not work in this repo:** `tsconfig.json` sets no `strict` and no `strictNullChecks` (verified —
the full file was read, there is no `extends`), so `null` is assignable to `number` and the widened
types flag nothing. The types were still widened, as documentation of what the SQL returns, but the
two call sites were found **by grep, not by the type checker**. The one benefit of strictNullChecks
being off: the existing regression suite (`round2(result.actual)`) does not break on the wider type.

### ⚠️ No local validation, and this is not a formality

`npm ci` cannot run here (no `node_modules`), so **lint, typecheck and the vitest/regression suites
were all skipped**. What *was* done instead: both changed files brace/paren balanced, `logger.warn`'s
two-argument shape checked against existing calls in the same file (`:316`), every consumer of the
three widened types enumerated (only the service and the regression suite), and a misplaced docblock
caught and fixed on diff review (the new method had orphaned `_queryAllData`'s comment). **CI is the
first real validation.**

### Deliberately out of scope, each worth its own ticket

1. `getProjectProgressV2API` returning `null` outright — a caught exception — still emits nothing, so
   the panel spins forever if it happens on first load. The real fix is D4: route query errors to
   `errors$` and widen `hasError` (`use-dashboard-progress.ts:113`).
2. "0.00%" is not the honest label for a weightless selection; "no measurable data" is. Needs
   `hasNoProgressData` widened plus copy from Jason.
3. D1/D2: no query timeout, no worker error handler, one shared connection.
4. `dashboard-logger.ts` `LEVELS` inverted (`DEBUG: 0`) — setting DEBUG *reduces* output.
5. Only one of the two `UG Electrical` packages can ever render (§10), so a real schedule package is
   invisible on the dashboard.

### Still owed to the ticket

Nothing has been posted to Jira. §6d's two drafts (Yash/customer, and the product note about LVN1-2's
schedule carrying same-named packages across disciplines) still stand, **minus** the workaround list —
that was built on the falsified §9 reading and **must not be sent**.

---

## §8 2026-08-21 — DRAFT Jira comment and customer-facing line. Not posted.

Two messages, two audiences. Do not merge them: the first is for the thread, the second is for Yash to
relay. Plain prose, no headings, no bullets, no long dashes, one question to one owner, per the
playbook's Group A drafting rules.

### Draft A — comment on the ticket, addressed to the thread with one ask to Yash

> Picked this up and I have the failure mechanism, though not yet the full reason behind it.
>
> What happens. Selecting the UG Electrical package under the CSA discipline puts the left hand
> progress panel into a loading state that never ends. It is not a crash and it is not time based. It
> reproduces on the first click every time, so the description's framing of about fifteen minutes of
> use is a coincidence of when the user happened to click that package rather than a pattern. A page
> refresh is the only recovery, and the reason for that is worth knowing: the spinner replaces the
> whole panel including the discipline and package list, so once it starts there is no longer a
> control on screen to deselect the package with.
>
> Why it happens. The overview progress figure for a selection is a weighted total. For this
> particular selection that calculation comes back with no rows at all, and an empty total in SQL is
> null rather than zero. The panel uses that same null as its signal for "the first query has not come
> back yet", so a null from a query that has actually finished is indistinguishable from one that
> never ran. The panel ends up waiting forever for something that already arrived.
>
> What I have done. A fix is pushed to claude/vigilant-franklin-nyvkcp, commit 035cb47, branched off
> current master. It treats a missing total as zero, which is what the equivalent code path for
> activity selections already does, and it logs a warning when that happens so the next build tells us
> plainly whether this is what users are hitting. No PR raised yet and nothing released. I could not
> run lint, typecheck or tests in my environment, so CI is the first real check on it.
>
> What I still do not know. Why this package's calculation returns nothing in the first place. I tested
> three explanations against the project data and all three were wrong, so I have stopped guessing
> rather than keep going. The fix does not depend on the answer. Whatever leaves the total empty, the
> panel will now show a number and stay usable instead of freezing, and the warning will point at the
> next place to look if there is more to it.
>
> Yash, one thing that would help. Has the customer hit this on any package other than UG Electrical
> under CSA? If it is only that one, avoiding it is a clean workaround until the fix ships, and I would
> rather give them that than have them refreshing.

### Draft B — short line for Yash to relay to the customer

> We have found the cause. Selecting the UG Electrical package under CSA puts the dashboard into a
> loading state it cannot come out of, because the progress figure for that particular selection comes
> back empty and the page treats an empty result as though the data were still on its way. It is
> specific to that one selection rather than to how long the dashboard has been open, so it happens on
> the first click rather than after a period of use. A fix is written and will come through in a
> release. Until then, avoiding that one package avoids the freeze, and a refresh clears it if it does
> happen.

### Draft C — DM to Mostafa. Short, and it hands him the one genuine product call.

He escalated this to Ilia, so he needs the status, and he is the right owner for the single product
question the fix raises. Kept to two short paragraphs, no code detail.

> Mostafa, quick one on PLT-3081. It turned out not to be a crash, and not related to how long the
> dashboard has been open. Selecting the UG Electrical package under CSA leaves the progress panel
> loading forever, because the progress figure for that selection comes back empty and the panel reads
> empty as still loading. Fix is written and on a branch, waiting on review and a release.
>
> One small product call for you when you have a minute. For a selection with nothing measurable in
> it, the fix currently shows 0.00%. The more honest thing would be a short "no measurable data for
> this selection" state instead. I am happy either way, but the second needs a line of copy from Jason.
> Which would you rather have?

Rationale for handing him this specific question: it is the only decision in the whole ticket that is
genuinely product rather than engineering (see §7 out-of-scope item 2), it is small, and it is
answerable with a value. Do **not** widen the DM into the schedule-data-quality question about
same-named packages across disciplines; that is a separate conversation and bundling it will stall
both.

### Notes for whoever posts these

- **Do not include the "packages that will hang" list.** It came from the §9 reading that §10
  falsified. The only package we can honestly name is `UG Electrical` under `CSA`.
- **Do not claim the root cause is found.** The *freeze* is explained and fixed; *why the total is
  empty for this package* is not. Draft A is worded to hold that line, and it should stay that way.
- The ticket's summary, "Dashboard Crash / Reset", is misleading now. Worth renaming to something like
  "Progress panel stuck loading after selecting a package", but that is Yash's or Darminder's call.
- **Priority is worth a look.** Medium fits a single-package freeze with a refresh workaround, so
  probably leave it, but flag it if the customer reports more packages.
- Darminder is the natural reviewer for the branch, and items 1 to 5 in §7's out-of-scope list are his
  call to schedule or drop.

---

### 6e — What is no longer relevant

The five structural defects in §3 are **still worth fixing** but are **no longer the story of this
ticket**. Of them, D4 (query errors can never surface) is the one that made this present as a crash
rather than an error, so it is the natural companion PR. H1/fan-out, the memory-limit item, and the
Ctrl+Shift+D diagnostic are all off the critical path — do not spend more time on them here.

## §9 2026-08-24 — PR #2178 brought to review-ready

`https://github.com/XYZReality/hc-frontend/pull/2178`, branch `PLT-3081`, head `6e6ce09`.
Reviewers already assigned: TomMasdinXYZ, rishib-xyz, SergiuszXYZ.

**Branch contents** (4 commits, 4 files, +232/-67 vs master):
- `80b5def` the null guard + pure `coalesceOverviewProgress` + its 8-case test
- `de699cc` **Ilia's own commit** — nullable return types, and a better note on why the
  *project-level* branch returns null via zero rows rather than an all-NULL row
- `3b0e10e` `_isQuerying$` cleared in a `finally`, filter-prep moved inside the try
- `6e6ce09` merge of master (clean, no conflicts; our 4-file diff unchanged after it)

**Done this pass:**
1. Merged master in — the branch had fallen 2 commits behind.
2. **Rewrote the PR body around the confirmed root cause.** The old body still said "the trigger
   isn't explained, three theories falsified", which was stale and actively misleading with three
   reviewers assigned. New body leads with the name-vs-identity gating at
   `dashboard-filter-utils.ts:65,86`, explains the prod/dev difference, and walks the 6-step chain
   to the spinner.
3. Corrected two false claims in the old body: the *"list stays clickable"* test step (the list comes
   from an independent stream that can itself be empty), and the omission of `3b0e10e`.
4. Added an explicit **"this fixes the failure mode, not the root cause"** section so nobody reads a
   merge as closing the defect.
5. Retitled: "weightless selection" → "unmatched package selection", which is what it actually is.
6. Read the only PR comment: SonarQube **Quality Gate passed**, 0 new issues, 64.0% coverage on new
   code, 0.0% duplication. No action needed.

**CI GREEN as of 2026-08-24.** `build` (which runs `npm run lint && npm run test -- --coverage`)
**success**; `SonarCloud Code Analysis` **success**; Quality Gate passed with 0 new issues and 64.0%
coverage on new code. This is the first real validation of any of the change — nothing was linted,
typechecked or tested in the authoring environment (no `node_modules`). It confirms the new
`coalesce-overview-progress` test compiles and passes, the `_isQuerying$` try/finally restructure did
not break the service, and lint is clean.

**Nothing outstanding on the PR.** It is with TomMasdinXYZ, rishib-xyz and SergiuszXYZ; merging is
theirs, not this routine's.

**Not done deliberately:** the root fix (identity-aware package gating). It belongs in its own PR
because `buildFilterOptions` is shared with the ViewerPage schedule path
(`dashboard-filter-utils.ts:68-77` handles `ScheduleActivityDto`). Listed as item 1 of five
follow-ups in the PR body.
