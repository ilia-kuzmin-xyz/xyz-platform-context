# PLT-3081 — LVN1-2 — Dashboard Crash / Reset

**Created** 2026-08-21 09:05 · **Status** Open · **Priority** Medium · **Assignee** Ilia Kuzmin
· **Reporter** Yash Patel · **Project** LVN1-2 · **Freshdesk** #7729 (Waiting on 3rd line)
· **Session id from Yash's repro:** `platform-web-4d72a647-c1da-4f87-9296-3ef58a8e8e5e`

Folder opened 2026-08-21 on Ilia's direct request (not the scheduled triage run). Domain:
progress-tracking (the left-hand Progress panel's discipline/package list), with the DuckDB layer as
the actual suspect.

---

## 1. What was reported

**Customer (via description):** after ~15 minutes of normal dashboard use, twice, the dashboard went
"from fully functional into this view" — a perpetual loading/blank state. It does not recover on its
own. Only a full page refresh restores it.

**Yash (comment 110140, 09:11):** tagged Ilia at Mostafa's request. Adds the trigger the customer
identified — **selecting the "Underground - CSA" package**. Yash reproduced it himself.

**Ilia (this session, verbally):** clicking **"Electrical - CSA"** in the left-hand panel
immediately produces a spinner on the left-hand side that never ends. **All other packages work
fine.** Has DuckDB query access and offered to pull data.

### ⚠️ Naming discrepancy to resolve before running any SQL

Yash says *Underground - CSA*; Ilia says *Electrical - CSA*. These are not obviously the same thing,
and both are label-shaped rather than raw names. The panel renders a package as
`` `${packageName} — ${disciplineName}` `` **only when the package name collides across disciplines**
(`use-progress-panel-data.tsx:297-304`, em dash, not hyphen). So:

- "Electrical — CSA" parses as package **Electrical** under discipline **CSA**.
- "Underground — CSA" parses as package **Underground** under discipline **CSA**.

Either both are collision-suffixed labels and there are two distinct failing packages, or one of the
two reports is a paraphrase. **Do not write the `discipline = ... AND package = ...` predicate until
the exact pair is confirmed** — the whole diagnostic ladder in `recommended-action.md` keys off it.
This is a live instance of the pitfall the code comments themselves warn about: *"Package names
aren't guaranteed unique across disciplines (e.g. two 'UG Electrical' packages, one under 'CSA' and
one under 'Electrical')"* (`use-progress-panel-data.tsx:229-232`).

---

## 2. Which spinner is it — matters, and narrows the cause by itself

The Progress panel has **two** independent spinners, driven by different state:

| Spinner | Condition | Source |
|---|---|---|
| Full-panel (replaces the whole panel) | `!hasError && !hasNoProgressData && (isLoading \|\| !hasReceivedData)` | `progress-panel.tsx:179`, `:192` |
| Small inline green, next to the header | `isQuerying` | `progress-panel.tsx:271-273` |

`hasReceivedData = maxActualProgress !== null` (`use-progress-panel-data.tsx:32`) and
`isLoading = isInitializing \|\| isLoadingFiles` (`use-dashboard-progress.ts:93-104`).

**Verified:** `_queryAllData` never resets `_maxActualProgress$` back to `null` — it is only
`next()`-ed with a value (`dashboard-progress-service.ts:1103`, `:1140`, `:1230`) and initialised to
`null` once at `:135`. So once data has arrived, `hasReceivedData` cannot go false again.
**Therefore a permanent full-panel spinner after a successful first load requires `isLoading` to be
stuck true (a re-initialisation that never finishes), whereas a permanent inline green spinner means
`isQuerying` is stuck true.** These are different bugs. Asking which spinner is a one-second question
that eliminates half the search space, so it is question 1 in `recommended-action.md`.

---

## 3. Four structural defects, all code-verified, all independent of the trigger

These explain **why it never recovers and why only a refresh helps**. They are worth fixing
regardless of what the per-package trigger turns out to be.

### D1 — `DuckDBService.query()` can never time out, and a dead worker is indistinguishable from a slow one

`duckdb-service.ts:590-608` is `await this.conn.query(sql)` with a try/catch and nothing else. Grep
across `services/duckdb/` and `components/services/` found **zero** occurrences of `Promise.race`,
`setTimeout` around a query, `AbortController`, or any cancellation path. The worker is constructed
bare at `:101` (`new Worker(worker_url)`) with **no `onerror` and no `onmessageerror` handler**.

Consequence: if the DuckDB-Wasm worker aborts (the usual outcome of a wasm OOM) or wedges on a
pathological query, the `postMessage` round-trip never resolves and the promise **never settles** —
no throw, no rejection, no log. Every `await` upstream hangs forever. This is a complete match for
"perpetual loading that only a page refresh fixes."

### D2 — one connection, serialized, so a single stuck query starves the whole dashboard

`this.conn` is a single connection and `SET threads = 1` (`:112`). All dashboard services — progress,
quality, colour, schedule, and the dev monitor — share it. So one unsettled query blocks every
subsequent one. That is why the customer sees the *whole* dashboard drop into loading rather than
just the Progress panel, and it predicts a specific tell: **the Ctrl+Shift+D monitor will itself
freeze**, because its own polling queries queue behind the stuck one.

Also verified: **`memory_limit` is never set anywhere in the app.** The only references are the dev
monitor *reading* `current_setting('memory_limit')` (`use-duckdb-monitor.ts:94-99`). So DuckDB-Wasm
runs on its default ceiling with no headroom reserved for the viewer's own geometry.

### D3 — `isQuerying` is set true outside the try that clears it

`dashboard-progress-service.ts:1013` does `this._isQuerying$.next(true)`. The `try` does not open
until `:1056`, and the `catch` that clears the flag is at `:1299-1302`. **There is no `finally`.**

Lines 1015-1054 therefore run unguarded, and they include real work — `getCurrentFilters()`,
an **awaited** `_resolveRoomLevelToActivityIds(filters)` (`:1026`), `_getEffectiveDataLevel`,
`_buildFilteredPackageIds` (`:1040`), `_buildFrozenPlannedFilters` (`:1054`). Anything throwing in
that window leaves `_isQuerying$` true **permanently** and propagates an unhandled rejection out
through the filter subscription. `_buildFilteredPackageIds` (`:538-614`) and `_getEffectiveDataLevel`
(`:320-359`) were both read in full this run and are defensively written (they warn-and-skip on
unknown ids rather than throwing), so the realistic candidate in that window is the awaited
`_resolveRoomLevelToActivityIds` — but only if a room/level filter is also active.

### D4 — a failed query can never surface as an error state

`_queryAllData`'s catch (`:1299-1302`) logs `'Query failed'` and clears `isQuerying`. It never writes
to `errors$`. And `hasError` is `Boolean(errors.initialization || errors.v2Progress)`
(`use-dashboard-progress.ts:113`) — query errors are not in that set. So the only user-visible
outcomes of a failed query are a spinner or silently stale numbers. There is no path to an error
message. This is why the incident reads as a "crash/reset" rather than an error.

### D5 (minor, hardening) — unescaped SQL interpolation of package ids

`filteredPackageIds` is interpolated raw: `AND ActivityCategoryId IN ('${filteredPackageIds.join("','")}')`
(`progress-queries-v2-api.ts:176`, and the same shape at `:392`, `:398`, `:558`), while `activityIds`
in the same file *are* escaped (`:663`, `.replace(/'/g, "''")`). Package ids are UUIDs from the API so
this is latent rather than live, and it is **not** the cause here. Worth closing while the file is
open. Note the colour path does escape its name pairs correctly (`dashboard-progress-service.ts:1948`).

---

## 4. Leading hypothesis for the per-package trigger (H1) — fan-out in the `_visible_elements` build

**This is the only path whose cost depends on *which* package is selected, and it is skipped entirely
when no category filter is active** — which matches "all other packages work fine" and "it only
breaks once I click".

Verified shape (`dashboard-progress-service.ts:2019-2024`, `:2067-2092`):

```sql
CREATE OR REPLACE TEMP TABLE _visible_elements AS
WITH computed_status AS (
  SELECT DISTINCT base.objectId, base.modelElementId, <status CASE> as status_code
  FROM element_base_data base
  INNER JOIN activity_links al ON base.modelElementId = al.modelElementId      -- only when a filter is active
  INNER JOIN activity_categories_flat cat ON al.activityId = cat.activityId    -- only when a CATEGORY filter is active
  WHERE <date range> AND (cat.discipline = '…' AND cat.package = '…')
)
SELECT DISTINCT objectId, modelElementId, status_code FROM computed_status
WHERE status_code IN (…) AND status_code IS NOT NULL
```

- `needsActivityLinksJoin = hasCategoryFilters || hasActivityFilter` (`:1983`) — with no filter there
  is **no join at all** (`:2035-2038`). So the unfiltered dashboard never pays this cost.
- `activity_categories_flat` is **one row per activity** (`activityId VARCHAR PRIMARY KEY`,
  `api-categories-loader.ts:203-207`), so it is *not* a fan-out multiplier. Verified, and it kills the
  first version of this hypothesis.
- The multipliers that remain are **objects-per-element** (`element_base_data` is keyed by `objectId`;
  PLT-2874 established one element can own many geometry objects) **and activities-per-element**
  (`activity_links`). Both feed a `SELECT DISTINCT`, i.e. a hash aggregate over the full fan-out.
- Then the **entire materialized table is read back into JS** (`:2097-2101`) and mapped into one
  object per row (`:2104+`). So peak cost is paid twice: once in wasm, once on the JS heap.

**Prediction that falsifies it in one query:** the failing package's joined row count (before DISTINCT)
is an order of magnitude larger than any package that works. If it is comparable, H1 is dead. SQL in
`recommended-action.md`.

**Sub-hypothesis H1b, cheap and independently interesting:** duplicate rows in `activity_links`
multiply the fan-out for free. PLT-3034 has an open, unexplained observation of exactly this shape on
a different project — an activity reporting 4 linked elements where "Select All Linked Elements"
returns 3, and 2,322 vs 2,308 — which Darminder attributed to QA-model links rather than duplicates.
If LVN1-2 has duplicated `(modelElementId, activityId)` rows concentrated in one package, that package
alone would blow up the DISTINCT while its neighbours stay fine. One query settles it.

### Why "~15 minutes" fits without being a separate cause

Nothing in the code needs 15 minutes to break. But the wasm heap has no `memory_limit` (D2) and shares
its ceiling with viewer geometry, Arrow buffers and OPFS-cached parquets that only accumulate. So the
same query that survives on a fresh page can tip over later in a session. That makes the customer's
"after 15 minutes" and Ilia's "immediately, on this one package" the *same* defect at two different
heap pressures, rather than two bugs — **inferred, not verified.**

---

## 5. Other hypotheses, kept live and unranked below H1

- **H2 — re-initialisation stuck.** If the stuck spinner is the *full-panel* one, `isLoading` is stuck
  true, which means `isInitializing$`/`isLoadingFiles$` never went false. That is a different code path
  from H1 and would point at the artefact/parquet loaders, not the filter query. Question 1 discriminates.
- **H3 — the throw-outside-try window (D3).** Only reachable if a room/level filter is also active at
  the time of the click. Worth asking whether Ilia had any other filter applied.
- **H4 — the colour path, not the data path.** A package click also re-colours the 3D model and fires
  `elementVisibility$` → QLT + CAP re-query (`progress-tab.md` § filter flow). Not yet examined this
  run. If the console shows the viewer erroring rather than a query hanging, this moves up.
- **H5 — genuinely slow, not hung.** Not yet excluded, and cheap to exclude: leave it 10 minutes.
  Nothing in the code would ever surface completion differently, so this needs wall-clock, not code.

---

## 6. Verified vs inferred

**Verified by reading current code on `claude/vigilant-franklin-nyvkcp` (HEAD `f2d8dcb`) this run:**
no query timeout / abort / worker error handler anywhere (D1); single serialized connection and
`threads = 1` (D2); `memory_limit` never set, only read by the dev monitor (D2);
`_isQuerying$.next(true)` outside the try, no `finally` (D3); query errors never reach `errors$` and
`hasError` excludes them (D4); unescaped package-id interpolation alongside escaped activity-id
interpolation in the same file (D5); the category-filter joins exist only when a filter is active
(H1); `activity_categories_flat` is one row per activity (H1, and it disproved the stronger version of
H1); `_maxActualProgress$` is never reset to null (§2); package filters resolve by UUID → name pair so
the same-name collision is *not* misrouted in the colour path (`:429-446`, `resolvePackagePairs`);
the DuckDB monitor overlay is **Ctrl+Shift+D** and ships in the normal build
(`resizable-layout.tsx:586-587`, `duckdb-monitor-panel.tsx:85-106`).

**Inferred, NOT verified:**
- That this package's element/link set is actually large enough to exhaust the heap. No data yet.
- That the worker dies rather than the query merely being slow. D1 makes these indistinguishable from
  the outside, which is itself the finding.
- The 15-minutes-vs-immediate reconciliation in §4.
- Nothing in the attached video or screenshot has been seen (see §7), so the customer's exact visual
  state is taken from the text description only.

**No repro was attempted.** This environment cannot build or run the app (`npm ci` fails on a private
package), so every claim above is source-reading plus one live Jira fetch. Nothing here is compiled or
executed.

---

## 7. Attachment gap

- ⚠️ `Screen Recording 2026-08-20 110903.mp4` (20.6 MB, Yash, 08-21 09:11) — **not opened.** No tool
  here fetches authenticated Jira media, and no tool here reads video. **This is load-bearing for
  question 1 in `recommended-action.md`**: the recording would show *which* spinner appears and
  whether the rest of the dashboard is still responsive, which is exactly the discriminator between
  H1 and H2. A human watching 30 seconds of it can answer that faster than any query.
- ⚠️ `image-20260821-081116.png` (Yash, 08-21 09:11) — not opened. Would show the stuck state.
- ⚠️ The two inline `blob:` screenshots on comment 110140 — not opened, same reason.

Do not guess their contents.

---

## 8. 2026-08-21, later the same day — package pair confirmed, and the first data came back `0`

### The naming discrepancy is resolved: it is ONE package, not two

Ilia confirmed: **package `UG Electrical`, discipline `CSA`.** So "UG" = Underground — Yash's
"Underground - CSA" and Ilia's "Electrical - CSA" are the same thing, each a partial reading of the
panel label `UG Electrical — CSA`. §1's open question is closed. **No second failing package.**

Worth recording because it is not a coincidence: `UG Electrical` under `CSA` vs under `Electrical` is
the *literal example* written into the code comment at `use-progress-panel-data.tsx:229-231`. Whoever
wrote that comment was looking at real data of this shape. So the collision is real and known.

### The collision is NOT the trigger — verified and set aside

Traced the selected-package id all the way through the colour/visibility path this run:
`combinedPackageIds = [...packages]` for a package-only selection (`:1923-1924`) →
`Array.from(new Set(...))` (`:1929`) → `resolvePackagePairs` (`:1930`), which is a straight
UUID→pair `Map.get` (`dashboard-filter-service.ts:163-171`). **One id in, one pair out. Selecting the
CSA copy does not pull in the Electrical copy.** The doubling sub-hypothesis is dead.

The top-bar filter panel is also safe: `setCategoryMaps` builds `_uniqueNameToPackageId` with an
explicit `null`-sentinel for ambiguous names (`dashboard-filter-service.ts:126-134`), so
`resolvePackageIdByName('UG Electrical')` returns `undefined` rather than guessing, and the only
caller (`dashboard-filters.tsx:258-268`) treats `undefined` as "no id". An `undefined` reaching
`filters.package` would be dropped with a warning by `_buildFilteredPackageIds` (`:573-577`) and by
`resolvePackagePairs`. **Collision handling is correct throughout. Keep it as a latent-risk note, not
a cause.**

### The fan-out hypothesis (H1) is dead — CONDITIONAL on the predicate being right

Ilia ran query (a) and returned `joined_rows = 0, distinct_objects = 0`.

If that predicate is correct, **H1 is falsified outright**: there is no fan-out, no large intermediate,
nothing to exhaust memory. The query is empty and therefore fast. Whatever hangs, it is not the size
of this join.

⚠️ **But a `0` is exactly what a slightly-wrong predicate also returns, and the run instructions are
explicit about this** ("Before comparing two numbers, reproduce each exactly. If a query is off even
slightly, that surface is not understood yet and anything built on the comparison is worthless").
`activity_categories_flat`'s columns are generated dynamically from category **typeName** strings
(`api-categories-loader.ts:195-207` — `coreColumns` + `extraColumns`, each quoted `VARCHAR`), so the
real column names are whatever the API's category types are called on this project; and the literal
values could differ by case or whitespace. **Two readings of the same `0`, and they point opposite
ways:**

1. **Predicate wrong** → the `0` carries no information at all, and H1 is still open.
2. **Predicate right** → H1 is dead, *and* we have a genuine new finding (below).

A discovery query settles it in one round trip; drafted in `recommended-action.md` §5. **Do not build
on this `0` until that comes back.**

### If the `0` is real, it is itself the more interesting finding

The panel only renders a package when `categorySummaryUnfiltered` (from the `category_groups`
parquet) has a matching row — packages with no data return `null` and are filtered out
(`use-progress-panel-data.tsx:268-277`, `:316`). **Ilia sees `UG Electrical — CSA` in the list with
progress numbers on it.** So the parquet has data for that ActivityCategoryId while
`activity_categories_flat` (built from the API, one row per activity) has no activity carrying that
(discipline, package) pair.

That is a **disagreement between the two sources the dashboard uses for the same concept** — the same
class of defect as PLT-2874 (two surfaces counting different things) and adjacent to PLT-3034's
unexplained link-count mismatch. Consequence in this code: `hasCategoryFilters` is `true` (a pair
resolved), so the early "no known pairs" bail at `:1937-1944` is skipped, the real SQL runs, and
`_visible_elements` is materialised **empty**. The panel shows numbers for a package the element layer
believes has nothing in it.

**Not yet established:** that an empty `_visible_elements` *hangs* anything. Searched for a
retry-until-non-empty loop that would spin on a legitimately empty result and did not find one — the
three `while` loops in `dashboard-color-service.ts:287,320,352` poll for *table existence* and all
carry 60s caps, and `dashboard-quality-service.ts:184`'s `while (true)` is a paginator with a
`break` at `:193-195`. So no infinite loop was found on the empty path. **The hang mechanism is
currently unexplained.**

### New observation on the three colour-service wait loops

They are not a cause but they are an amplifier worth noting: each iteration `await`s
`duckdb.query(...)`, and the elapsed-time check happens only at the top of the iteration
(`:288`, `:321`, `:353`). On a wedged connection the `await` never returns, so **the 60-second
timeout never fires** — the loop cannot reach its own guard. Any fix to D1 (query timeout) makes
these guards effective; without it they are decorative.

### Where this leaves the hypothesis set

- **H1 (fan-out / OOM)** — dead if the predicate holds, otherwise still open. Blocked on the
  discovery query.
- **H2 (`isLoading` stuck, i.e. the full-panel spinner)** — untested, and now the cheapest live lead.
  Still blocked on the one question nobody has answered: **which spinner is it.**
- **H3 (throw in the unguarded window, D3)** — still live, and relatively more likely now that size
  is off the table. Needs the console, and needs to know whether any room/level filter was active.
- **H4 (colour/viewer path)** — still live, still unexamined beyond the loop audit above.
- **H5 (slow, not hung)** — effectively dead: with `joined_rows = 0` there is nothing slow to do,
  *if* the predicate holds.
- **H6 (new) — the empty-`_visible_elements` path does something pathological downstream.** Opened by
  this result, not yet investigated. No infinite loop found so far.

**Confidence: the five structural defects stay at 9/10** (independently verified, unaffected by this
result). **Root cause: down from 5/10 to "unknown"** — the leading hypothesis was falsified and no
replacement has evidence yet. Saying so plainly rather than promoting the next-most-plausible guess.

---

## 9. ROOT CAUSE FOUND — a zero-weight package makes the panel emit `null` progress, and `null` is the spinner's own "still loading" signal

**Superseded: §8's "hang mechanism is currently unexplained" and H6.** The mechanism is now traced
end to end in code, and the predicate question from §8 is also answered — Ilia's `0` was **real**, not
a typo.

### The data that settled it

Census of `activity_categories_flat` (`discipline`, `package`, activity count) came back with **both**
`UG Electrical` packages present:

| discipline | package | activities |
|---|---|---|
| Electrical | UG Electrical | **543** |
| CSA | UG Electrical | **2** |

Confirmed columns on this project: `activityId, discipline, package, phase, wbs location`. So the §8
predicate was correct after all, and `(CSA, UG Electrical)` genuinely joins to **zero elements** — its
2 activities have no `activity_links` rows. **It is a stub package: 2 activities, 0 linked elements,
therefore zero weight.**

### The chain, every step verified in code

1. Panel renders the package because `category_groups` has a row for its `ActivityCategoryId`
   (`use-progress-panel-data.tsx:268-277`). It is clickable like any other.
2. Click → `filters.package = ['<CSA/UG Electrical uuid>']` (`discipline-list.tsx:223` passes the id)
   → `dataLevel = 'package'` (`dashboard-progress-service.ts:351-357`) →
   `filteredPackageIds = ['<uuid>']` (`:1040`).
3. `getProjectProgressV2API` builds `start_data` / `end_data` with
   **`AND ${weightColumn} > 0`** (`progress-queries-v2-api.ts:218`, `:235`) plus the
   `ActivityCategoryId IN (...)` filter. Weight is `TotalPlannedLaborUnits` (labour-hours, the
   default) or `TotalLinkedElements`. **Zero weight → both CTEs return zero rows.**
4. `delta_by_package` is a `FULL OUTER JOIN` of two empty sets (`:254-255`) → **empty**.
5. The final `SELECT SUM(ActualDelta) / NULLIF(SUM(Weight), 0) * 100 as actual … FROM delta_by_package`
   (`:257-262`) is **an ungrouped aggregate over an empty table, so it still returns exactly one row**
   — with every column `NULL`.
6. `return result?.[0] || null` (`:272`) — the row is a truthy object, so it returns
   **`{ actual: null, planned: null, baseline: null, date: … }`**, not `null`.
7. `if (projectProgress)` (`:1229`) is therefore **true**, and `:1230` runs
   `this._maxActualProgress$.next(projectProgress.actual)` → **`next(null)`**.
8. `hasReceivedData = maxActualProgress !== null` (`use-progress-panel-data.tsx:32`) → **false**.
9. The escape hatch does not fire: `hasNoProgressData = !hasError && !isLoading && !allLoaded &&
   !hasReceivedData` (`:37`) requires **`!allLoaded`**, but the files *are* loaded, so it is `false`.
10. `progress-panel.tsx:179` → `!hasError && !hasNoProgressData && (isLoading || !hasReceivedData)`
    → **true** → the whole panel is replaced by `CircularProgress` (`:192`).

**And it cannot recover.** The full-panel spinner replaces the discipline/package list itself, so the
user cannot click the package again to deselect it. The filter stays applied, `maxActualProgress` stays
`null`, and nothing will emit a non-null value again. **A page refresh is the only exit** — which is
precisely what the customer reported.

### Why this matches every reported detail

- *"All other packages work fine"* — every other package has weight > 0, so step 3 returns rows.
- *"Immediately"* — the query is trivially fast; there is nothing large about it. This is why H1 was
  wrong: the failure is an empty result, not a big one.
- *"Have to refresh the entire page"* — the deselect control is inside the spinner.
- *Customer's "~15 minutes, twice"* — no memory story needed after all. They were clicking around and
  hit a zero-weight package (twice). The §4 heap-pressure reconciliation is **superseded and should
  not be quoted**; it was a plausible story for a symptom that has a simpler cause.
- *Reads as a "crash/reset" rather than an error* — D4: there is no error path, so an unrenderable
  state can only look like loading.

### Why it was never caught

`duckdb.query<{ actual: number; planned: number; … }>` (`progress-queries-v2-api.ts:265-270`) declares
the columns as **`number`** when the SQL can return `NULL`. The type is a lie, so TypeScript could not
flag `next(null)` into a `BehaviorSubject<number | null>` (`:135`) — a subject whose `null` the panel
reads as *"first query hasn't finished yet"*. The two meanings of `null` (never-loaded vs
no-measurable-data) collide on the same channel.

The author of `use-progress-panel-data.tsx:34-37` **anticipated exactly this failure** — *"Data will
never arrive, so the panel must show an empty state rather than wait on hasReceivedData forever"* —
but keyed the guard on `!allLoaded`, which only covers "this project has no progress outputs at all",
not "the current filter selects something with no measurable data".

### Same defect, second call site

The activity-level path has the identical shape:
`SUM(...) / NULLIF(SUM(u.Weight), 0) * 100 as actual` (`progress-queries-v2-api.ts:729-730`) feeding
`this._maxActualProgress$.next(projectProgress.actual)` at `dashboard-progress-service.ts:1140`. So a
Gantt/room selection resolving to only zero-weight activities should strand the panel the same way.
**Not reproduced, but the code shape is the same — any fix must cover both call sites.**

Note the package path is the *only* one missing this handling: the activity path already has an
explicit "filter matched nothing → emit zeros" branch (`:1099-1114`, which emits `0` and returns
early). That is the precedent for the fix and shows the intended behaviour.

### Confidence

**9/10 on the mechanism.** Every step read on current HEAD; the data confirms steps 1-3 independently.
The residual point: I have not seen `category_groups` confirm both weight columns are 0 for this
`ActivityCategoryId` (inferred from the 0-element join plus the observed symptom), and I have not run
the app. One query closes it — `recommended-action.md` §6.

### Corrections to earlier sections of this file

- **§4 / H1 (fan-out, OOM): falsified.** Not the cause. The `_visible_elements` fan-out concern
  remains a legitimate *scalability* observation but has nothing to do with this incident.
- **§4's "15 minutes" heap-pressure story: withdrawn.** Superseded by §9.
- **§8's "hang mechanism unexplained" and H6: resolved by §9.**
- **§8's doubt about the predicate: resolved — the predicate was right.**
- **§5's H2/H3/H4/H5: all moot.** The spinner is the full-panel one (H2's family) but stuck via
  `!hasReceivedData`, not via `isLoading` — so even H2 as written was wrong about the state.
- **The five structural defects (§3) stand unchanged**, and D4 in particular is why this presented as
  a crash. They are still worth fixing, but they are no longer needed to explain this ticket.
- **The `UG Electrical` name collision is not implicated.** Verified correct in §8. Keep as latent risk.
- **Query C in the 08-21 chat was my error**, not a finding: `ParentDiscipline` is an alias the FE's own
  query creates (`progress-queries-v2-api.ts:943`, `cat.discipline as ParentDiscipline`), not a raw
  `category_groups` column. The Binder Error is expected and means nothing.
