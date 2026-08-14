# PLT-3025 — Infinite Canvas: cold load time + published reports as dashboard tabs

**Status when first seen (2026-08-07): `Dev In Progress`, assigned to Ilia, no PR, no branch.**
Not eligible for routine kick-off (Dev In Progress). This file exists so the next run does not
re-derive the framing from scratch.

## What the ticket asks for (two independent halves)

**1. Caching / cold load.** Nothing survives a pipeline restart, so users repeatedly pay for work
already done. Measured on API 2 FULL PROJECT -xv2 (1.4M elements, 502 rooms):

| phase | cold | warm |
|---|---|---|
| Availability discovery | 2–3 s | <1 s |
| Domain hydration | 30–50 s | ~2 s |
| Room rollup (~60 MB parquet) | ~60 s | 2.4 s |

Asks: persist T1/T2 server-side keyed on project + artefact id (artefacts are immutable per model
version, so no TTL); pre-warm on project open rather than on first report; move MCP reads onto the
faster schema.

**2. Published reports as dashboard tabs.** A published canvas report should appear as a tab on the
project dashboard beside Progress / Quality / 360. Publishing adds the tab, unpublishing removes it;
renders read-only, hydrated from live data via the same path as the canvas library viewer; tab
order/visibility manageable so many reports don't push built-in tabs off screen.

## Domain context that already exists in this repo — read these first

This ticket spans **two** documented domains; do not start from the code.

- `agent-pipeline/caching.md` — T1/T2/T3 tiers, which is the half-1 target
- `agent-pipeline/README.md`, `phases.md` — 0a resolve / 0b profile / 0c clarifier / 1+2 compose+hydrate
- `canvas/project-data-cache.md` — the frontend T2 cache (5 min, per-project)
- `canvas/artifact-and-hydration.md` — Sandpack, mount gate, dashboard switcher (directly relevant
  to half 2 — a saved report already carries TSX, `domainsRead` and viewer config)
- `dashboard/README.md` — the tab bar that half 2 wants to extend

## Traps stated in the ticket itself (do not re-discover these)

- The blob link runs at **~1.1 MB/s** and parallel range requests do **not** raise it. 64 MB is ~60 s
  however it is fetched — **the fix is to stop re-fetching, not to fetch faster.**
- `xyz_get_projects_project_id_schedules_schedule_revision_id` intermittently returns
  `request_failed`; planned %, variance and target dates then go null and the attention list
  *silently* loses its ordering. Needs an explicit failure state.
- MCP is slow in itself — ~3.5 s just to list artefacts.
- A saved report hydrates from project files, so **a dashboard tab does not need the agent pipeline
  running.** Half 2 is therefore not blocked on half 1.

## Open product questions — unanswered as of 2026-08-07

Carried verbatim from the ticket description; these are Ilia's/product's to answer:

1. Who can publish to the dashboard — anyone, or admins?
2. Are the tabs per-user or shared across the project?
3. Cap on tab count, or does the bar overflow/scroll?

**Recommendation for whoever picks this up:** the two halves are independently shippable and have
different risk profiles (half 1 is backend caching with measurable before/after; half 2 is FE + three
open product questions). Split them rather than carrying one branch. Half 2 should not start until
questions 1–3 are answered, since all three change its data model.

## Acceptance criteria (from the ticket)

- Cold generation reduced to `<target>` — **note the target is literally unspecified in the ticket**
- A pipeline restart no longer re-downloads parquet or re-runs discovery
- Warm timings do not regress
- A published report appears as a dashboard tab and renders with live data

---

## 2026-08-14 — PR #2142 in review; five Copilot threads addressed (3 of them security)

**State:** PR [#2142](https://github.com/XYZReality/hc-frontend/pull/2142) open, not draft, CI green
before this run's push, four reviewers requested (TomMasdinXYZ, DarminderA, rishib-xyz,
SergiuszXYZ), **no human review yet**. Supersedes #2141, which auto-closed when the head branch was
renamed to `PLT-3025` — its Copilot threads and resolutions live on the closed PR, so don't hunt
for them on #2142.

### The architecture changed since the 08-07 notes above — read this before re-planning

Half 2 shipped, and half 1's viewer problem was solved by **deleting the payload**, not by caching
it. Concretely, on this branch:

- **`viewer-mapping.json` no longer exists.** Zero references anywhere under `CanvasPage/`. Element
  data now comes from **browser DuckDB** (`canvas-duckdb-service.ts`, same engine + OPFS cache the
  dashboard uses), with the pipeline shipping a *catalogue of named SQL* in `viewer-config.json`
  instead of any element data. A new filter is a WHERE clause, not a pipeline release.
- **The whole-dashboard mount gate is gone.** `ArtifactPanel.tsx` used to withhold the entire report
  while `viewerMapping` was null; the condition is now just `needsViewer && !isActive`.
- Published reports render as dashboard tabs via `usePublishedReport`, shared by the standalone
  viewer and the tab panel.

⚠️ **This invalidates the "persist the mapping" line of thinking recorded in `PLT-2963/context.md`
(08-10 *and* the 08-13 correction).** There is no mapping to persist. Both entries are kept for the
record but neither should be acted on.

### Checkpoint 1 — five Copilot threads, all legitimate, all fixed in `afa2df70f`

Worth noting **the previous commit (`a8ee03336`) was itself titled "origin-checked bridges", and
Copilot reviewed that exact SHA and still flagged the bridges.** It was right to: the earlier fix
made replies go to `e.source`/`e.origin` instead of `'*'`, which stops *broadcast* — but does
nothing about **who is allowed to ask**. An opener or popup holding a handle on the page could post
`canvas-sql-request` and be answered at its own origin. **Lesson: "replies only to the asker" is not
an access control when the attacker is the asker.**

| # | Finding | Verdict | Fix |
|---|---------|---------|-----|
| 1 | SQL + CDE-token bridges accept from any window (`ArtifactSandpack.tsx`) | valid | `isOwnFrame()` — sender must be in this page's frame tree |
| 2 | `usePublishedReport` leaves `loading` true when inputs missing | valid | resets to idle; both consumers already gate on own resolution state, so no flash |
| 3 | No tests on `usePublishedReport` | valid | new spec, 16 cases |
| 4 | `CanvasDuckDBService.init` never disposes the old engine | valid | dispose deferred until outgoing init settles |
| 5 | ForgeViewer iframe accepts any message with the right id | valid | `e.source !== window.parent` guard |

**Implementation notes worth keeping:**

- `isOwnFrame` walks the `parent` chain (bounded 10 hops) rather than comparing to a single iframe
  ref. Deliberate: tying it to Sandpack's preview element means the day Sandpack nests that iframe,
  the 3D viewer silently stops getting rows — and it fails *looking like a slow query*, not like a
  broken bridge. `parent` is readable cross-origin so the walk works against the sandbox.
- **Copilot flagged only one of two identical response handlers.** `fetchCdeToken`
  (`ForgeViewerStatic.ts` ~:115) had the same hole and was fixed in the same commit. Always check
  for the twin.
- DuckDB disposal cannot happen before starting the new init: `_init` is async and disposing a
  service mid-`initialize()` races its own constructor. Capture order matters too — `this._init()`
  reassigns `this.service` synchronously before its first await, so the old ref must come off the
  field first.

### Checkpoint 2 — CI

Green (4/4) before this run, and **green again after it** — `build` succeeded on the merge commit
`b7e2265a2` at 08:15:34 UTC, SonarCloud passed. That is the only verification the new spec has, so
it matters: the 16 new cases compile and pass in CI. All five review threads resolved afterwards,
not before. ⚠️ **Local verification was impossible this run** — `npm ci` fails with 401 against
`npm.pkg.github.com` for `@xyzreality/dhtmlx-gantt`; the session's `GITHUB_TOKEN` has no
package-read scope. So **no local `vitest` or `tsc --noEmit` run**; CI is the only check on the new
spec. Future runs: don't burn time retrying the install, it is an auth boundary not a flake.

### Checkpoint 3 — master merged

`origin/master` moved to `b700eb31b` (PLT-3040, UG electrical duplicated in dashboard) and this
branch did not have it. Merged clean (`b7e2265a2`) — it touches `discipline-list.tsx` and
`use-progress-panel-data.tsx`, no overlap with canvas.

### Small thing noticed, deliberately not changed

In `ArtifactPanel.tsx` the `needsViewer && !isActive` branch renders
`{isActive && <ViewerLoading />}` inside a box with `display: isActive ? 'flex' : 'none'`. Inside
that branch `isActive` is false by construction, so **both are dead** — it renders an empty hidden
box, and `ViewerLoading` is now unreferenced in practice. Harmless, but it is leftover from when the
gate waited on the mapping. Worth a one-line cleanup next time this file is touched; not worth
churning a PR mid-review.
