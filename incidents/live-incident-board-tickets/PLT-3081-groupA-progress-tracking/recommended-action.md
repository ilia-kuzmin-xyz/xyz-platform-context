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
