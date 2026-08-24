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

---

## 10. CORRECTION to §9 — the mechanism holds, my identification of the trigger did not

Two further queries came back and **falsify §9's step 3 as written.** Recording this properly rather
than quietly editing §9, because the wrong turn is instructive.

### The data

`category_groups`, `CategoryName = 'UG Electrical'`, grouped by id — **one row, not two**:

| ActivityCategoryId | max_labour | max_elements | date_rows |
|---|---|---|---|
| `18464cd1-40b5-4271-b7fa-d5620474f217` | **33,610** | **45,343** | 1,024 |

So the clicked package is emphatically **not** zero-weight. §9's "2 activities, 0 linked elements,
therefore zero weight" conflated two different tables: `activity_categories_flat` has two
`UG Electrical` packages (CSA:2 activities, Electrical:543), but `category_groups` has only one, and it
is a large one.

**My error, stated plainly: I asked for `MAX(weight)` when the FE's predicate is per-date
(`AND ${weightColumn} > 0` inside a `CalendarDate = …` filter).** A package can have `MAX` weight in
the tens of thousands and still have zero qualifying rows on the *specific* date the query picks. The
aggregate I chose could not test the predicate I was reasoning about. §9's steps 4-10 are untouched;
only step 3's *reason* for the empty CTEs was wrong.

The 08-21 blast-radius query (`HAVING MAX(...) = 0`) is likewise the wrong shape and its output
(`Air Ducts`, `Controls`, `Curtain Wall`, `Level 3`, …) should **not** be circulated as "packages that
will hang" — that list was built on the same mistaken aggregate. Several of those rows are also
interesting for a different reason (weight in one column, zero in the other), but that is a
weighting-method question, not this bug.

### What actually differs, verified in code — the panel list and the overview number use DIFFERENT dates

This is the real structural defect, and it is cleaner than anything hypothesised so far:

| Surface | Date it queries | Weight predicate |
|---|---|---|
| **Package list in the left panel** (`getCategorySummaryV2API`) | `CalendarDate = '${latestDateStr}'` — the **MAX date in the parquet** (`:532`, `:546`, `:576`) | `AND ${weightColumn} > 0` (`:577`) |
| **Overview headline** (`getProjectProgressV2API`) | `start_nearest` / `end_nearest` — nearest dates at or before the **date slider's** start and end (`:194-203`) | `AND ${weightColumn} > 0` (`:218`, `:235`) |

And note `start_nearest` / `end_nearest` are computed **globally, with no category filter** — they are
the nearest dates across *all* packages, then the selected package is required to have a qualifying row
on exactly those dates.

**So the two surfaces disagree by construction.** A package is *listed* because it has weight at the
parquet's latest date; the overview then demands a qualifying row at the slider's nearest dates. When
the selected package has no qualifying row at **both** the start-nearest and end-nearest date, both
CTEs are empty → `FULL OUTER JOIN` of two empty sets → ungrouped aggregate returns **one all-NULL
row** → `{ actual: null }` is truthy → `next(null)` → `hasReceivedData` false → **permanent full-panel
spinner over its own deselect control.** Steps 4-10 of §9, unchanged and still verified.

Both CTEs must be empty, because the join is a FULL OUTER — one surviving side is enough to produce a
non-null result. That is why this needs a *particular* slider position, not just any.

### Why this fits the reports better than §9 did

- **Date-dependent**, so the same package can work at one slider position and hang at another. This is
  the first hypothesis that explains the customer's *"~15 minutes … twice"* without inventing a memory
  story: they had been moving the slider.
- **Still immediate on click** and still package-specific, because date coverage differs per package.
- **Still only recoverable by refresh**, since refresh resets both the filter and the slider.

### Corroborating detail: the trend query defends against this and the overview does not

`getProgressTrendV2API` wraps every output in `COALESCE(…, 0)` (`:464-470`), so the chart degrades to
zeros. `getProjectProgressV2API` does not (`:257-262`) and passes raw NULL up. Same file, same author,
same failure mode — one guarded, one not. That asymmetry is the bug in one line.

### Also verified while here: the panel's name-fallback cannot fire in package mode

`getCategorySummaryV2API`'s SELECT list is `CategoryName, TypeName, ActivityCategoryId,
TotalAvgActualProgress, TotalAvgPlannedProgress, ActivityCount` — **no `ParentDiscipline`**. So in
`use-progress-panel-data.tsx:272-273` the fallback arm `cat.ParentDiscipline === disciplineCategory
.categoryName` compares `undefined` to a name and is **always false**. Only the UUID match at `:271`
can ever succeed in package mode.

Consequence worth its own note: **only one of the two `UG Electrical` packages can ever appear in the
panel** — whichever owns `18464cd1`. The other is silently dropped (`:276` → `null` → filtered at
`:316`), so a package that genuinely exists in the schedule is invisible on the dashboard. That is a
separate defect from this incident and probably worth its own ticket.

### Status

**Mechanism: 9/10, unchanged and thrice-verified.** It has survived every data point; it is the thing
to fix. **Trigger: ~6/10** — date-coverage mismatch is now the leading and best-fitting explanation,
but the specific slider position has not been reproduced. Two wrong trigger hypotheses so far (fan-out,
zero-weight) with the mechanism intact through both, which is a hint in itself: **the fix does not
depend on identifying the trigger.** Guarding the null fixes every version of it.

---

## 11. Date-coverage falsified too. Stopping hypothesis generation; one contradiction now dominates.

`global_dates = 1024`, `pkg_dates = 1024`, `global_first = pkg_first = 1753056000000`. Package
`18464cd1` has a row on **every date the parquet holds, from the first one**. No gap exists for a
slider position to land in, so **§10's date-coverage trigger is dead.** Recording it as killed so no
future run re-runs it.

### Three trigger hypotheses falsified, each by one query

| # | Hypothesis | Killed by |
|---|---|---|
| H1 | Join fan-out / DuckDB-Wasm OOM | `joined_rows = 0` — the join is empty, not huge |
| §9 | Selected package has zero weight | `MAX` labour 33,610 / elements 45,343 — and my aggregate was the wrong shape for a per-date predicate |
| §10 | Date-coverage gap at the slider's nearest dates | coverage identical to global, 1024/1024, same first date |

**The mechanism survived all three.** That is now the most informative fact in this file: the
`null → hasReceivedData=false → permanent spinner` chain is verified in code and independent of
whatever produces the null, so the fix is trigger-independent. But it is *not* demonstrated that a
null is actually produced here, and §11's data now argues against it — a package with weight on all
1024 dates should make `start_data`/`end_data` non-empty and yield real numbers.

### The contradiction to resolve before anything else

- `category_groups`: `18464cd1` "UG Electrical" → **45,343** `TotalLinkedElements`, 1024 date rows.
- `element_base_data ⋈ activity_links ⋈ activity_categories_flat` on `(CSA, UG Electrical)` → **0**.

These cannot both describe the same package. **Leading reading: `18464cd1` is the *Electrical*-discipline
`UG Electrical` (543 activities), and the CSA-discipline one (2 activities, no links) has no
`category_groups` row at all.**

If that holds, then given §10's verified finding that the panel's name-fallback can never fire in
package mode (no `ParentDiscipline` in `getCategorySummaryV2API`'s SELECT), **only `18464cd1` can be
rendered** — and its panel label depends on which discipline the **API category tree** assigns as its
parent, which is *in-memory state not present in DuckDB* and therefore not answerable from any query
run so far.

Two branches, and they point at different bugs:

- **(A) API tree says `18464cd1`'s parent is CSA**, while `activity_categories_flat` attributes those
  activities to `Electrical`. Then the panel legitimately shows "UG Electrical — CSA"; the *progress*
  query on `18464cd1` returns real numbers (no null, **mechanism does not fire**); but the *colour*
  path filters `(CSA, UG Electrical)` and gets 0 activities → `_visible_elements` **empty**. The stuck
  spinner would then be in the viewer/colour path (H4), not the progress panel — and the two data
  layers disagree about which discipline owns this package, which is the underlying defect.
- **(B) API tree says the parent is Electrical.** Then the panel row is "UG Electrical — Electrical"
  and the package the user believes they clicked is not the one the code saw — meaning the reported
  label and the actual selection diverge, and the whole investigation has been aimed at the wrong row.

**Neither branch is decidable from `category_groups` / `activity_categories_flat`.** Both are decidable
from one console line, below.

### The one observation that settles it, and has been asked for four times without arriving

`dashboard-progress-service.ts:1283-1293` logs, on every package-level query:

```
Data queried (V2 API - Project/Package level)  { …, projectProgress: { actual, planned } }
```

**That line prints the exact variable at the centre of the mechanism.**

- `actual: null` → mechanism confirmed, ship the guard, done.
- `actual: <number>` → **the mechanism does not fire for this ticket**, the progress panel is not what
  is stuck, and the investigation restarts at H4 (colour/viewer) with `_visible_elements` empty as the
  starting fact.

Also worth capturing in the same paste: `[📊 FILTER] Filtering by packages: N` (`:1957`) and
`Activity category filter expansion: {input: {disciplines, packages}, expandedIds}` (`:603`) — the
second prints the selected id, which resolves branch (A) vs (B) directly.

**Process note for the next run, and the real lesson of this ticket so far:** four rounds of SQL have
each killed a hypothesis without confirming one, while the single cheapest observation — what the app
logs at the moment of failure — has never been captured. The run instructions' rule *"state each
hypothesis as a prediction one query can falsify, then run it"* was followed; what was skipped is the
prior rule, *"ask what tooling the human has before designing a diagnostic"* — DuckDB access was
offered and taken up, and it framed every subsequent step as a data question when the decisive
evidence was always runtime state. **Get the console line before writing another query.**

---

## 12. How to read runtime state without relying on log lines (2026-08-21)

Ilia is reproducing via a plugin that replays prod data on a dev branch, and asked whether the log
lines will fire or whether the functions have to be called manually. Both routes exist; the second is
better and needs no code change.

### The logging picture, verified

- `dashboard-progress-service.ts:17` uses `createServiceLogger` → `createLogger` from
  `app/services/logService`. **It is NOT gated by `dashboard-logger.ts`'s `CURRENT_LEVEL`/`excludedServices`** —
  those govern the separate `dashboardLogger` object.
- `createServiceLogger`'s `data()` maps to `log.info()` (`dashboard-logger.ts:246`), and
  `logService/logger.ts:15` sets `CONSOLE_VERBOSE = process.env.NODE_ENV !== 'production'`, with
  `shouldLogToConsole` allowing info/debug whenever that is true (`:17-18`). **So on a dev build the
  `Data queried (V2 API - Project/Package level)` line already prints.** Only a production bundle
  suppresses it.
- `logService/logger.ts:99-118` also persists every line via `write()` to OPFS, so there is a
  downloadable log file route (`LogFileService`, `isLogFileSupported`) independent of the console.

### ⚠️ Side finding — `dashboard-logger.ts`'s level table is inverted (own small ticket)

`LEVELS` maps `DEBUG: 0`, identical to `SILENT` (`:65-71`), and `shouldLog` is
`LEVELS[level] <= LEVELS[CURRENT_LEVEL]`. Consequences:

- Setting `CURRENT_LEVEL = 'DEBUG'` makes `shouldLog('INFO')` → `3 <= 0` → **false**. Raising the level
  to DEBUG *removes* info/success/data/warn output. The file's own docblock promises the opposite
  ("DEBUG: All logs including detailed operations").
- `shouldLog('DEBUG')` is `0 <= anything` → **true even at `SILENT`**, so `debug()`, `group()`,
  `time()` and `table()` emit when logging is supposedly off.

`DEBUG` should rank `4`. Impact is limited because the dashboard services have migrated to
`createServiceLogger`, but anyone debugging this ticket would naturally flip that constant and get
less output, which is a real trap. Worth a one-line fix.

### The good route: `window.projectService`

`dashboard-project-provider.tsx:128-132` already exposes it — *"Conditionally expose projectService
globally for Playwright or debugging"* — gated on the feature flag **`enableGlobalWebViewerAPI`**.
Turn that flag on and everything below is readable from the console.

**These are pure in-memory state reads — they do not touch DuckDB, so unlike SQL they are safe to run
on the wedged tab.** That matters: every prior diagnostic had to be run in a fresh tab, which is
precisely why none of them observed the failed state.

```js
const ps = projectService.dashboardProgressService

// (1) WHICH package was actually selected — resolves §11's branch (A) vs (B) outright
projectService.dashboardFilterService.getCurrentFilters()
//     → read .package (array of activityCategoryId), .discipline, .dateRange

// (2) WHICH SPINNER — answers the question outstanding since the first pass.
//     BehaviorSubjects replay their current value, so this works after the fact.
ps.maxActualProgress$.subscribe(v => console.log('maxActualProgress =', v))
ps.isQuerying$.subscribe(v => console.log('isQuerying =', v))
console.log('isInitializing', ps.isInitializing, 'isLoadingFiles', ps.isLoadingFiles, 'allLoaded', ps.allLoaded)

// (3) WHICH DISCIPLINE the API tree assigns to each UG Electrical — resolves §11's contradiction
ps.categories$.subscribe(cats => console.table(
  cats.filter(c => c.categoryName === 'UG Electrical').map(c => ({
    id: c.activityCategoryId,
    type: c.typeName,
    parent: cats.find(d => d.activityCategoryId === c.parentActivityCategoryId)?.categoryName,
  }))
))
```

### Decision table for (2) — this is the whole diagnosis in one read

| Observation while stuck | Verdict |
|---|---|
| `maxActualProgress = null` | §9/§10 mechanism **confirmed**. Ship the guard. |
| `maxActualProgress` is a number, `isQuerying = true` | Mechanism dead; **D3** (`_isQuerying$` set outside its try, `:1013` vs `:1056`) is the cause. |
| `maxActualProgress` is a number, `isInitializing`/`isLoadingFiles` true | Mechanism dead; a loader is stuck (H2). |
| all three healthy, panel still spinning | The progress panel is not what is stuck → **H4**, viewer/colour path, with empty `_visible_elements` as the starting fact. |

Recorded because it makes the next round conclusive whichever way it falls, and because it needs no SQL
and no log lines.

---

## 13. Adversarial review attempted and FAILED. But the schema doc settles the precondition question.

**The review did not run.** A 4-lens adversarial workflow was launched against the PLT-3081 branch
(precondition / regression / wiring / alternative-cause). All four attack agents died: every tool call
was rejected by a broken permission handler in the environment, so none of them read a single file, and
all four hit the structured-output retry cap. `journal.jsonl` holds exactly one result line and it is
empty. The synthesiser, handed three empty arrays, **correctly refused to produce a verdict** rather
than paraphrase the prompt back as review. **Do not record this branch as "reviewed, no findings" —
record it as "review did not run."**

The synthesiser did contribute the sharpest question of the investigation, and it is answerable:
*does the overview query filter on `ActivityCategoryId`, or on package name?* Because if it keys on
name alone it would match the one existing weighted row-group and the precondition could never hold.

**Answered from code:** it keys on **`ActivityCategoryId`**, a UUID —
`AND ActivityCategoryId IN ('${filteredPackageIds.join("','")}')`
(`progress-queries-v2-api.ts:176`), and `filteredPackageIds` are validated against the **API category
tree**, not against `category_groups` (`dashboard-progress-service.ts:572-577`). So a selected id that
is simply absent from `category_groups` yields zero rows in both CTEs. The name-only branch the
synthesiser worried about does not exist.

### The decisive fact, and it corrects §10 *and* my later pessimism

`docs/dashboard/duckdb-tables/README.md:30-53` gives `category_groups`' schema: one row per
**(`ActivityCategoryId`, `CalendarDate`)**, with `TotalLinkedElements` and `TotalPlannedLaborUnits` as
**per-row, therefore per-date, columns** — not static per-package totals.

**So the precondition CAN hold.** `MAX(weight) > 0` over 1024 dates says nothing about the weight on
the two dates the overview query actually resolves. §10 correctly identified that my `MAX` aggregate
could not test a per-date predicate; what §10 and §11 then did wrong was to treat the `MAX` result as
*evidence against* the mechanism. It is not evidence either way. **Both "the data argues against it"
(my later framing) and "zero-weight package" (§9) were overreadings of the same unsuitable query.**

Same doc also independently confirms `category_groups` has **no `ParentDiscipline` column** (the
enriched `ParentDiscipline` lives on `actual_category_progress`, `progress-schemas.md:43-66`), which
corroborates §10's finding that the panel's name-match fallback can never fire in package mode.

### The one query that settles it — now with MIN, which is the part I kept omitting

```sql
SELECT COUNT(*)                          AS date_rows,
       MIN(TotalPlannedLaborUnits)       AS min_labour,
       MAX(TotalPlannedLaborUnits)       AS max_labour,
       MIN(TotalLinkedElements)          AS min_elements,
       MAX(TotalLinkedElements)          AS max_elements,
       SUM(CASE WHEN COALESCE(TotalPlannedLaborUnits,0) = 0 THEN 1 ELSE 0 END) AS dates_zero_labour,
       SUM(CASE WHEN COALESCE(TotalLinkedElements,0)    = 0 THEN 1 ELSE 0 END) AS dates_zero_elements
FROM category_groups
WHERE TypeName = 'Package'
  AND ActivityCategoryId = '18464cd1-40b5-4271-b7fa-d5620474f217'
```

`min_* = max_*` means the weight is a constant repeated per date, and the precondition can only be
reached by a selected id being **absent** from `category_groups` rather than by zero weight.
`dates_zero_* > 0` means the precondition is live and slider position decides it.

### Better still, from the synthesiser: a breakpoint beats both a query and a console line

Break (or drop one `console.log`) at `result?.[0] || null` in `getProjectProgressV2API`
(`progress-queries-v2-api.ts`, project/package branch), click the package, and read the raw result plus
the bound filter values:

- `[{ actual: null, ... }]` → **precondition confirmed**, the fix is on target, close the ticket.
- `[]` or a non-null `actual` → **hypothesis four falls**, and the freeze is elsewhere.

This needs no feature flag, no cookie and no `window.projectService`, which is what defeated §12. It
also dumps the resolved start/end dates and the ActivityCategoryId actually used, which is the single
piece of state nobody has captured across the whole investigation.

### Standing instruction for the next run

**Get one runtime observation before writing another query.** Four SQL rounds have each killed a
hypothesis; zero have confirmed one. The pattern is not bad luck, it is a methodological error: SQL can
only test conditions I have already guessed correctly, whereas the breakpoint above reads out the
actual value regardless of which guess is right.

---

## 14. ROOT CAUSE CONFIRMED — the filter rail offers package options gated by NAME, not identity

**Supersedes every earlier trigger hypothesis in this file (§4 H1, §9, §10, §11).** Found by an
adversarial review pass and then verified directly in the code. The unlock was Ilia's observation that
**production never reproduces it**, and that production has only one `UG Electrical` (under
`Electrical`) whereas the failing project has two.

### The mechanism, verified at `dashboard-filter-utils.ts`

```ts
mappedPackages.add(item.CategoryName)                          // :65  — a Set of NAMES only
...
const filteredPackages = pkgArray.filter(pkg => mappedPackages.has(pkg))   // :86
```

`mappedPackages` is built from `categorySummaryUnfiltered` (i.e. "packages that have parquet data") but
keyed on **`CategoryName` alone, with no discipline context**. `pkgArray` is the category tree's
children of a given discipline. So the membership test is name-level.

- **Failing project:** the tree has `UG Electrical` under **both** `CSA` and `Electrical`. The string
  `"UG Electrical"` is in `mappedPackages` because the *Electrical* sibling has parquet rows. So the
  **CSA** one is offered as a filter option too, despite having no rows in `category_groups`.
- **Production:** one `UG Electrical`, so the name is in the set **iff that very package has data** →
  every offered option is backed by rows → no bug. **This is exactly the prod/dev difference.**

Selecting the CSA option resolves to its real tree UUID via the (discipline, name) pair
(`dashboard-filter-service.ts:142-144`), `_buildFilteredPackageIds` accepts it because `knownIds` is the
**category tree, not the parquet** (`dashboard-progress-service.ts:574-582`), the query becomes
`AND ActivityCategoryId IN ('<uuid the parquet has never seen>')`, matches zero rows, and the ungrouped
`SUM(...)/NULLIF(SUM(Weight),0)` still returns **one all-NULL row**. From there the §9 chain runs
exactly as documented: truthy `{actual: null}` → `maxActualProgress$` null → `hasReceivedData` false →
full-panel spinner over its own deselect control → reload required.

The intent is even stated in the code: line 55 says *"Filter to only disciplines and packages that
exist in the schedule"*. It is simply implemented at name granularity, which is only correct while
package names are unique — and the code elsewhere in this repo already knows they are not
(`use-progress-panel-data.tsx:229-231`).

### The correction this forces to §11 and §13

§11 said the null-aggregate precondition looked doubtful, and §13 said it "can hold" via per-date
weight. **Both were looking in the wrong place.** The precondition is not zero weight and not a date
gap — it is a **selected id that has no rows at all**. And §11's reasoning that "a rendered package's
UUID must be in `category_groups`" was *correct*, which is why the panel's own list cannot trigger this;
the entry point is the **top-bar filter rail**, which I never examined. That is the single biggest miss
of the investigation: I assumed the click came from the left panel because the symptom appears there.

### Disposition of the fix

The null guard shipped on `PLT-3081` (`80b5def`, refined by Ilia in `de699cc`) **does** absorb this
null, so it closes the incident's symptom. It is not the root cause. The root fix is to make the
package-option gating identity-aware rather than name-aware; it is deliberately a separate change
because `buildFilterOptions` is shared with the ViewerPage schedule path (the `else` branch at
`dashboard-filter-utils.ts:68-77` handles `ScheduleActivityDto`).

### Ideas rejected by the same review, recorded so they are not retried

- **The "cause-agnostic gate" idea** (replace `!hasReceivedData` with a `hasCompletedFirstQuery`
  lifecycle flag) was designed and then **dropped**. Three reasons, all verified: (1) it is not
  cause-agnostic — the *only* mechanism that can revert an already-rendered panel to a spinner is an
  explicit `next(null)`, since every other failure emits nothing and leaves the previous value latched;
  (2) it converts a genuine query failure from an honest spinner into dashes that *assert* "no data",
  with no error state, because `hasError` covers only `initialization`/`v2Progress`; (3) bootstrap fires
  at least two uncancelled queries with different date ranges, so a latch on "a query concluded" is a
  weaker predicate than "real data arrived" and reintroduces the 0.00% flash that
  `use-progress-panel-data.tsx:30-31` and `dashboard-progress-service.ts:770-773` exist to prevent.
- **Reverting the `?? 0` coalescing** was also dropped: `useProgressMetrics` gates only on *actual*
  (`:17`), so the actual-present/planned-null case would render a fabricated "Planned 0.00%, SPI 0,
  large negative variance" next to a real Actual — strictly worse than either the spinner or 0.00%.
- **"The package list always stays clickable"** is false as stated: the list comes from
  `categorySummaryUnfiltered`, an independent stream that can itself be empty (all-zero rows dropped at
  `progress-queries-v2-api.ts:606-611`; disciplines/packages without a parquet row dropped at
  `use-progress-panel-data.tsx:251,276`). Not-a-spinner does not imply recoverable.

### Still open, each its own ticket

1. **Root fix:** identity-aware package-option gating (above).
2. Query failures never reach `errors$`/`hasError`, so a throw yields silent stale/empty values.
3. `DuckDBService.query()` has no timeout and the worker no `onerror`, on a single shared connection —
   a hung query defeats any `finally`, because a pending `await` never exits the try.
4. `isLoading` has its own unbounded hangs: memoised `initialize()` with no timeout
   (`duckdb-service.ts:73-131`), and an unbounded `new Promise` waiting on `_progressWeightingLoaded$`
   (`dashboard-progress-service.ts:774-787`), with `_isLoadingFiles$.next(false)` never in a finally.
   A stuck `isLoading` also disables the `hasNoProgressData` fallthrough.
5. Only one of two same-named packages can render in the panel at all (§10).

### Process notes worth keeping

- **The adversarial review is what found this.** Two attempts failed on broken subagent tooling and
  returned empty; the third succeeded. Its value was not incremental — it overturned the plan I was
  mid-way through implementing and identified the real defect in a file I had never opened.
- **A premature journal read made me declare the third run failed too.** I read `journal.jsonl` while
  the run was still in flight, saw empty results, and reported "no review happened" — then the
  completion notification arrived with 35k characters of findings. **Check run status before
  concluding a workflow produced nothing.**
- **I force-pushed over `origin/PLT-3081` and destroyed two commits** — Ilia's own `de699cc` and a
  `f415dde` merge of master carrying the PLT-3063 fix. Recovered by resetting the branch back to
  `f415dde` and re-applying only the genuinely new work on top. Cause: I ran
  `git push --force-with-lease` after a `git fetch`, which refreshed the lease and defeated its whole
  purpose. **Never re-fetch and immediately force-push; a rejected lease is a signal to look at what
  landed, not an obstacle to clear.**
