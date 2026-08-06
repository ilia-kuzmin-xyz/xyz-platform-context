# Infinite Canvas — remaining work

**Title:** `Infinite Canvas: fix cold load time, and surface published reports as dashboard tabs`

**Description:**

Two things, both about getting reports in front of people faster.

### 1. Caching and load time

Nothing survives a pipeline restart, so users repeatedly pay for work already
done. Measured on API 2 FULL PROJECT -xv2 (1.4M elements, 502 rooms):

| | cold | warm |
|---|---|---|
| Availability discovery | 2–3 s | <1 s |
| Domain hydration | 30–50 s | ~2 s |
| Room rollup (~60 MB parquet) | ~60 s | 2.4 s |

Every cache is in memory or per-browser — T1/T2/T3 in pipeline RAM, the project
cache in browser RAM. Only hydration (project files) and the element parquets
(browser OPFS) persist.

- Persist T1/T2 server-side, keyed on project + artefact id. Artefacts are
  immutable per model version, so no TTL is needed.
- Pre-warm on project open, not on first report, so the cold path overlaps the
  user reading and typing.
- Move MCP reads onto the faster schema.

### 2. Published reports as dashboard tabs

A published canvas report should appear as a tab on the project dashboard,
beside Progress, Quality and 360 — found where people already work, instead of
requiring them to know the canvas exists.

- Publishing adds the tab, unpublishing removes it.
- Renders the saved report read-only, hydrated from live data (same path as the
  canvas library viewer).
- Tab order/visibility manageable; many published reports must not push the
  built-in tabs off screen.

**Acceptance criteria:**
- Cold generation reduced to `<target>`, with before/after timings per phase.
- A pipeline restart no longer re-downloads parquet or re-runs discovery.
- Warm timings do not regress.
- A published report appears as a dashboard tab and renders with live data.

**Notes / traps:**
- The blob link runs at **~1.1 MB/s** and parallel range requests do not raise
  it. 64 MB is ~60 s however it is fetched — the fix is to stop re-fetching, not
  to fetch faster.
- `xyz_get_projects_project_id_schedules_schedule_revision_id` intermittently
  returns `request_failed`; planned %, variance and target dates then go null
  and the attention list silently loses its ordering. Needs an explicit failure
  state.
- MCP is slow in itself — ~3.5 s just to list artefacts.
- A saved report already carries TSX, `domainsRead` and viewer config, and
  hydrates from project files, so a dashboard tab does not need the agent
  pipeline running.

**Open questions for product:**
- Who can publish to the dashboard — anyone, or admins?
- Are the tabs per-user or shared across the project?
- Cap on tab count, or does the bar overflow/scroll?
