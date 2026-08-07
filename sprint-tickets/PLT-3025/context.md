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
