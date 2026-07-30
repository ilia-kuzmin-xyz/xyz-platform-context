# Data remediation runbook — deleting activity links safely

Written from the PLT-2882 / PLT-2931 cleanup (611 dead links across two projects, zero
over-deletion). Use for any bulk change to production link data. The traps listed here each cost
real time or nearly caused a wrong conclusion.

---

## Before anything: is deletion even the right fix?

Not every instance of Pattern 1 is a deletion. On PLT-2909 the elements **exist** in geometry
(in a sibling building) and selection works; the defect is metadata claiming them in the wrong
model. Deleting there would unlink working elements. Confirm the elements are genuinely
unreachable before treating links as dead.

---

## 1. Produce the list, with an audit trail

Export the exact rows to be deleted as CSV: `userItemId, activityId, modelElementId`. This is both
the payload and the record. Attach it to the ticket before deleting, not after.

Validate before use:
- row count matches the diagnosed count
- per-activity counts match what was diagnosed, not just the total
- every id is a well-formed UUID, no duplicates
- plain LF, no BOM, exactly three fields

## 2. Check for progress side-effects

Per-activity progress uses `InstalledElements / LinkedElements` when the activity has linked
elements, and falls back to `ReportedLaborUnits / PlannedLaborUnits` when it has none. **An
activity that loses all of its links flips from tangible to intangible**, which changes how its
percentage is computed and can move rollups.

```sql
SELECT (SELECT itemId FROM api_activities WHERE userItemId = '<id>') AS api_item_id,
       COUNT(*) AS rows_in_activity_progress,
       MAX(PlannedLaborUnits) AS labor_units
FROM activity_progress
WHERE ActivityId = '<activity uuid>'
```

- **Zero rows** → the activity is not in the progress data at all, so deletion cannot move any
  number. This was the case for FAR01UGD1220, and it is what let us tell Pietro that FAR01 was
  risk-free.
- **Rows, and it keeps some links** → normal case, percentage rises, no mode change.
- **Rows, and it loses all links** → it will flip to the labour path. Check `PlannedLaborUnits`
  before proceeding.

Also confirm `api_item_id` matches the UUID in your CSV. A mismatch means the progress data does
not recognise the activity you are about to modify.

## 3. Get approval, in writing, on the ticket

State the count, the projects, what changes, what does not, and that it is reversible. Give
per-activity before and after percentages if the change is user-visible. Approval belongs on the
ticket, not only in chat.

## 4. Snapshot the current state

Non-negotiable for anything irreversible-looking. Paginate the whole project's links, keep the live
ones, save as CSV:

```js
const PAGE = 50000;
let cursor, live = [], total = 0;
for (;;) {
  await fetch('/api/account', { credentials: 'include' });      // api2 token lives ~60s
  const qs = new URLSearchParams({ size: String(PAGE) });
  if (cursor != null) qs.set('lastFetchedIndexId', String(cursor));
  const page = await (await fetch(`/api/v2/projects/${PID}/elements/activity-links?${qs}`,
                                  { credentials: 'include' })).json();
  const recs = page.records ?? [];
  total += recs.length;
  for (const r of recs) if (!r.isDeleted) live.push(`${r.activityId},${r.modelElementId}`);
  if (recs.length < PAGE) break;
  cursor = page.lastFetchedIndexId;
  if (cursor == null) break;
}
console.log(`${total} rows, ${live.length} live`);
```

**Record `live.length`.** This baseline is what makes step 6 meaningful.

## 5. Delete

`POST /api/v2/projects/{postgresProjectId}/elements/activity-links/delete` with a plain array of
`{ modelElementId, activityId }`, max 500 per batch. Soft delete: rows persist with `isDeleted`,
and the client sync removes them locally when it sees the flag (`linking-service.ts:213-236`).

Guard the script so it throws before sending if the project id is not a UUID, the row count is
unexpected, the per-activity breakdown does not match the approved set, or the file contains
duplicates. Print the breakdown and require a confirm.

## 6. Verify with the same measurement

Re-run step 4 and diff the live count. **It must drop by exactly the number you sent.** Anything
larger means over-deletion and the snapshot is your restore source.

Measured on the real run: FAR01 799,259 → 798,841 (exactly 418), ELN03 572,591 → 572,398
(exactly 193).

## 7. Confirm the user-visible fix after the parquet regenerates

Percentages do not move until the Progress Outputs parquet regenerates. Until then everything will
look unchanged, which is expected and worth telling the coordinator so nobody reports "fixed" early.

After the refresh, check the denominators dropped, not just that the percentages rose. Denominators
falling to exactly the installed counts is what proves the parquet picked up the deletion rather
than something else moving the numbers.

## 8. Restore, if needed

Same pairs to `POST /api/v2/projects/{id}/elements/activity-links` (`element-api-service.ts:20-25`).
**Untested caveat:** it is confirmed the endpoint exists and the in-session undo uses it, but it has
not been verified that it revives an already soft-deleted link rather than rejecting a duplicate.
Keep the CSVs somewhere durable, attached to the ticket, not in Downloads.

---

## Traps

**Elements are not links.** Immediately after the FAR01 deletion the schedule showed 798,751, which
looked like 508 removed instead of 418. That number counts distinct elements; an element linked to
two activities is one element and two links. Always verify against the same API-side link count you
used for the baseline, never against an element count in the UI.

**Postgres id, not Mongo id.** api-v2 takes the 36-character Postgres UUID. The 24-hex value in the
dashboard URL is the legacy Mongo id (`project-service.ts:638`). The app converts between them via
an axios interceptor (`api-instance.ts:134`) that does **not** fire for raw `fetch`. Get the right
one from any `/api/v2/projects/<uuid>/...` request in the Network tab.

**The links GET returns history.** One FAR01 activity returned 10,316 rows of which 9,898 were
`isDeleted`. Always filter `!isDeleted` or your counts will be nonsense.

**Token expiry mid-run.** The api2 access cookie lives about 60 seconds. Refresh with
`GET /api/account` before each page or a long paginated run dies halfway.

**DuckDB Explorer rejects trailing semicolons.** It wraps your query in a subquery, so a trailing
`;` is a parse error.

**Client cache.** The dashboard keeps parquet in OPFS. If numbers look stale after a refresh, hard
reload, then clear the `duckdb-cache` OPFS store. During PLT-2882 a cold-cache re-run was used to
prove a finding was not a caching artefact.

---

## What made this run go cleanly

Worth repeating rather than rediscovering:

- **The arithmetic proof came first.** Showing that 88/122 equals the displayed 72.13% turned a
  hypothesis into a fact before anyone touched data, and made the approval conversation short.
- **Before-and-after on the same measurement.** Not "it looks right now", an exact expected delta,
  computed in advance and checked.
- **Predictions written down before execution.** Per-activity targets of 100 and specific
  denominators of 88/53/111/111/110 were stated up front, so verification was a comparison rather
  than an interpretation.
- **The riskier project was checked separately.** FAR01 could have flipped to intangible; asking
  that question before deleting is what made "both are safe" an honest statement.
- **Guards that throw.** Every check in the deletion script failed closed, before the request.
