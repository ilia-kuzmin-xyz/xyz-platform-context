# Infinite Canvas — remaining work (Jira-ready)

Titles and descriptions to paste straight into Jira. Baselines are measured on
the reference project **API 2 FULL PROJECT -xv2**
(`1a03eaf1-4fd3-4c5d-8d63-a4b7738b289f`, 1.4M elements, 502 rooms) as of
28 Jul 2026.

Order below is the order I'd do them in.

---

## 1. Speed up report generation by changing how we pull MCP data

**Title:** `Infinite Canvas: cut report generation time by fetching MCP data through the faster schema`

**Description:**

Generating a report currently takes **~7 minutes end to end** on a full
project. Most of that is data access, not Claude.

Measured breakdown of a cold run:

| Step | Cold | Warm (T2) |
|---|---|---|
| Profiler (parallel MCP probes) | 2–3 s | <1 s |
| Rooms readiness rollup (~60 MB parquet) | ~60 s | 2.4 s |
| Viewer mapper (parquet JOIN) | ~55 s | 2.4 s |
| Composer (Claude) | 4–7 min | — |
| Hydrators (parallel domain fetches) | 30–50 s | — |

We have identified a faster schema for reading the same data from MCP.
**→ Fill in: which schema/endpoints, and what it replaces.**

Scope:
- Move the affected fetches onto the faster path.
- Keep the T1/T2/T3 cache tiers behaving as they do now — the warm numbers above
  are already good; this is about the cold path.
- Re-measure each row of the table above before and after, and put the numbers
  in the ticket.

Watch out for:
- `xyz_get_projects_project_id_schedules_schedule_revision_id` intermittently
  returns `request_failed`. When it does, `planned_pct`, `variance` and
  `target_date` all go null and the "rooms requiring attention" list silently
  loses its ordering. Whatever replaces it needs a real failure path, not a
  silent degrade.
- The MCP auth-context flakiness is a separate, known, server-side issue — see
  `incidents/mcp-auth-context-investigation.md`. Don't let it get conflated with
  this work when measuring.

**Acceptance criteria:**
- Cold generation time reduced from ~7 min to **<target — fill in>**.
- Before/after timings recorded per phase.
- No regression in warm-cache timings.
- Schedule-fetch failure surfaces as an explicit degraded state rather than
  silently nulling the planned side.

---

## 2. Prepare viewer colouring/filter data faster on page load

**Title:** `Infinite Canvas: stop the 3D viewer mapping blocking first paint of a restored dashboard`

**Description:**

Opening a saved dashboard that contains a 3D viewer currently shows
**"Loading 3D model data…" for up to ~55 seconds** on a cold cache, with nothing
else on screen — the whole report is gated on the viewer mapping, even though
the room/progress/issue data is already available.

Why it's gated: the mapping is injected into the Sandpack VFS as
`/viewer-mapping.json`, and Sandpack does **not** refresh a static JSON import
after mount (a known pitfall — see `canvas/pitfalls.md`). So the runner is
deliberately mounted only once the mapping is present. Correct, but it means the
slowest input blocks everything.

Current numbers:

| | cold | warm (2 h T2) |
|---|---|---|
| `GET /api/viewer-mapping/{id}` | ~55 s | ~2.4 s |
| `…?rooms=1` (Room Readiness) | ~55 s | ~2.4 s |
| Payload size | 2.46 MB | (was 9.37 MB before delta+base36 encoding) |

Options worth evaluating:
- **Pre-warm on project open** — kick the mapping fetch when the canvas/gallery
  page loads, not when the dashboard mounts, so it is usually warm by the time
  someone opens a report.
- **Two-stage mount** — render the report immediately with everything except the
  viewer, and mount the viewer separately once its data lands. Requires solving
  the static-import refresh problem (e.g. fetch at runtime inside the component
  instead of importing).
- **Persist the mapping** rather than refetching it. It is deliberately not
  saved with the session because it used to be ~9 MB; at 2.46 MB that trade-off
  is worth revisiting.
- **Server-side warm** — keep the T2 entry alive for recently-opened projects so
  the 2 h TTL doesn't expire into a 55 s stall.

**Acceptance criteria:**
- A restored viewer dashboard paints its non-viewer content in **<3 s** cold.
- The viewer fills in progressively and still colours correctly.
- Room isolation (`?rooms=1`) still works on restore.
- No regression to the Sandpack payload ceiling (~9 MB — see
  `canvas/pitfalls.md`); measure the VFS size before and after.

---

## Also outstanding

Smaller, already-understood items. Worth their own tickets when picked up.

**Detect templates from the prompt, not the survey.**
`Infinite Canvas: activate a report template from the user's message`
Today the Room Readiness template only fires if the user ticks it in the
clarifier survey — skipping the survey gives a generic report however explicit
the request. Fix: have the clarifier return a `template` field (it already runs
on turn 1, already sees the raw message, already returns JSON), persist it on
`ThreadState`, read it on the compose turn, keep the survey tick as an override.
No extra LLM call. A keyword function was explicitly rejected. See
`agent-pipeline/report-templates.md`.

**Serve template artefacts directly instead of regenerating.**
`Infinite Canvas: render a matched template without a Claude generation pass`
The template currently constrains the composer but the composer still runs, so a
template request costs the same tokens and time as a fresh one.
`XYZ_AgentPipeline/reference/room-readiness-artifact.tsx` proves a fixed artefact
hydrates correctly through the normal data path. Wiring that in is what delivers
the "no tokens, seconds not minutes" outcome.

**Storage tier has no max age.**
`Canvas: expire hydration records served from project storage`
`runHydrate` serves any stored record with `_hydrated === true` regardless of
age. The `viewer` record on the reference project was **27 days old** and could
not self-refresh: it is only re-persisted from a pipeline profile fetch, which
storage keeps satisfying first. It holds the model `urn`, so a re-translated
model would pin the canvas to a dead one with no way to recover.

**Room Readiness drill-down: GC actual % and Milestones.**
`Room Readiness: source GC progress and handover milestones`
Both blocked on product decisions, not code — no field carries either, and the
design mockup fakes both. Needs Mostafa/Ali to say where GC-reported progress
lives and whether the five handover gates are modelled anywhere. Until then the
template deliberately omits them rather than inventing values.

**Small rooms read as a broken viewer.**
`Room Readiness: make single-element room isolation legible`
218 of 502 rooms hold ≤5 tracked elements (median 18). Isolating them frames the
camera on a handful of fittings in a ghosted building, which looks like the click
did nothing. Element counts on cards and ghosting help; a minimum zoom-out and a
clearer "this room has N tracked elements" affordance would help more.
