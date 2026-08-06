# Infinite Canvas — remaining work

Baselines measured on API 2 FULL PROJECT -xv2 (1.4M elements, 502 rooms), Aug 2026.

---

## Ticket 1 — Caching, performance and load time

**Title:** `Infinite Canvas: cut cold load time — cache what we already paid for`

**Description:**

Nothing survives a pipeline restart, so users repeatedly pay for work already
done. Measured cold vs warm:

| | cold | warm |
|---|---|---|
| Availability discovery (profiler) | 2–3 s | <1 s |
| Domain hydration | 30–50 s | ~2 s |
| Room rollup (~60 MB parquet) | ~60 s | 2.4 s |
| Report generation (Claude) | 4–7 min | — |

Every cache is in memory or per-browser:

| tier | where | survives restart |
|---|---|---|
| T1 profile / T2 domains / T3 dedup | pipeline RAM | no |
| FE project cache | browser RAM | no |
| FE hydration | project files API | yes |
| Element parquets | browser OPFS | yes |

Scope:
- **Persist T1/T2 server-side** (disk or shared storage) so a restart or a
  second replica does not re-fetch. Key on project + artefact id — artefacts
  are immutable per model version, so no TTL is needed.
- **Pre-warm on project open** rather than on first report, so the cold path
  overlaps the user reading and typing.
- **Move MCP reads onto the faster schema** — see notes.

**Notes / traps:**
- The blob link runs at **~1.1 MB/s** and parallel range requests do not raise
  it. 64 MB of parquet is ~60 s however it is fetched, so the answer is to stop
  fetching it repeatedly, not to fetch it faster.
- `xyz_get_projects_project_id_schedules_schedule_revision_id` intermittently
  returns `request_failed`. When it does, planned %, variance and target dates
  all go null and the attention list silently loses its ordering — it needs an
  explicit failure state, not a silent degrade.
- MCP itself is slow: ~3.5 s just to list artefacts.

**Acceptance criteria:**
- Cold generation reduced to `<target>`; before/after timings recorded per phase.
- A pipeline restart no longer re-downloads parquet or re-runs discovery.
- Warm timings do not regress.
- Schedule-fetch failure surfaces explicitly.

---

## Ticket 2 — Published reports as dashboard tabs

**Title:** `Show published canvas reports as tabs alongside Progress, Quality and 360`

**Description:**

Canvas reports currently live only in the canvas library. A published report
should appear as a first-class tab on the project dashboard, next to Progress,
Quality and 360, so people find it where they already work instead of having to
know the canvas exists.

Scope:
- Publishing a canvas report adds it as a dashboard tab (title from the report).
- Tab renders the saved report read-only, hydrated from live data — the same
  path the canvas library viewer uses.
- Unpublishing removes the tab.
- Tab order and visibility are manageable; a project with many published
  reports must not push the built-in tabs off screen.

**Open questions for product:**
- Who can publish to the dashboard — any user, or project admins only?
- Are these tabs per-user or shared across the project?
- Is there a cap, or does the tab bar scroll/overflow?

**Notes:**
- The saved report already carries everything needed (TSX, `domainsRead`,
  viewer config); no new storage format.
- Reports hydrate from the project files API, so a dashboard tab does not need
  the agent pipeline to be running.
- Viewer-bearing reports need DuckDB on the page — already the case on the
  dashboard, which is where this data path came from.
