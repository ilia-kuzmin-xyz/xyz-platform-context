# Hydration Data Persistence — Concept

> **Status: CONCEPT — needs design review before implementation.**
> Do NOT implement until concept is reviewed and approved.

## Problem

Every time a session is opened (or a dashboard's "View dashboard" is clicked), the frontend fires a `mode:'hydrate'` request to the pipeline, which calls MCP tools, waits for domain data, and streams it back. Even with the pipeline's T2 cache (60–900 s) and the frontend's PDC (5 min), reopening a session hours later always triggers full MCP re-fetches.

For sessions with many dashboards, this is the biggest perceived latency hit: user opens a session they worked on yesterday, waits 10–30 s before anything is populated.

---

## Current hydration path (baseline)

```
openSession()
  → rehydrateSession() → POST /api/chat { mode:'hydrate', domains }
  → Pipeline: resolve → profile → MCP fetches → artifact_data_partial × N
  → ~10–30 s cold, ~2–5 s warm (T2 cache hit within TTL)
```

Caches that help today:
- **Pipeline T2** (60–900 s): warms on the same pipeline process; wiped on restart
- **Frontend PDC** (5 min): warms within a browser session; wiped on reload

Neither survives a new browser session opened hours after the last save.

---

## Option A — Save hydration snapshots to server storage

**Concept**: after each hydration completes, save the full `ProjectData` payload as a separate file alongside the session file. On open: download snapshot first, populate immediately, skip the pipeline entirely (or use it only to refresh stale domains).

```
Files stored per session:
  canvas-session-{sessionId}.json        ← design (TSX, specs, messages) — existing
  canvas-hydration-{projectId}-{date}.json  ← domain data snapshot — NEW
```

Or alternatively, one shared snapshot per project (not per session — data belongs to the project):
```
  canvas-hydration-{projectId}.json       ← latest domain snapshot, newest-wins
```

### Pros
- Instant population on session open — no pipeline round-trip at all
- Works across browser restarts and days later
- Reduces pipeline load significantly for returning users

### Cons
- **Data staleness**: snapshot can be hours or days old. Issues/progress change daily. User sees stale numbers until a refresh triggers.
- **Storage cost**: each domain payload is 50–500 KB. A project hydration snapshot could be 1–3 MB. Every save creates a new file (append-only). This adds up fast.
- **Display complexity**: need to show clearly "loaded from snapshot (2h ago)" and offer a refresh
- **Write path**: when do we save the snapshot? On every hydration completion? Only on explicit save? Only if data is "fresh enough"?
- **Partial snapshots**: if only `issues` was hydrated (narrow dashboard), the snapshot is incomplete for other dashboards in the same session.

### Open questions
1. Should the snapshot be **per-project** (shared across sessions) or **per-session**?
   - Per-project is more natural (data belongs to the project, not the session) and deduplicated.
   - But the files API stores under the project, so both work.
2. What **TTL** is acceptable for the snapshot? 30 min? 2 h? 24 h?
   - Issues change every few hours; parquet progress is updated daily. Different domains have different freshness requirements.
3. Do we **skip the pipeline entirely** on snapshot hit, or still run a background refresh?
   - "Load instant from snapshot, silently refresh in background, replace when done" is the best UX but adds complexity.
4. How do we **handle partial snapshots** (some domains missing)?
   - Show available domains instantly; hydrate missing ones from pipeline.
5. Does saving domain data violate any **data residency / security** requirements?
   - Domain data (issues, schedules, photos) stored in project files is probably fine — same data is in the platform's own tables.

---

## Option B — Extend pipeline TTL / smarter cache warming

**Concept**: instead of persisting data client-side, extend the pipeline T2 cache TTL significantly (e.g. 2–4 h) and warm it proactively on session load. Combined with the frontend PDC, this covers same-session re-opens.

### Pros
- No data stored in files (no staleness visibility concern, no storage cost)
- Simpler — no new files, no new service code

### Cons
- Pipeline process must still be running — doesn't help across restarts or days later
- Doesn't solve the "open session tomorrow" case
- Increasing TTL increases staleness within the pipeline itself

---

## Option C — Lazy load with per-domain skeleton

**Concept**: don't change persistence. Instead, show the dashboard immediately with the profile stub data (counts, metadata — already available instantly from T1 cache), then fill in the real data progressively. The perceived latency drops because the user sees something useful immediately.

### Pros
- No new storage, no staleness
- Exploits data the pipeline already has instantly (T1 profile cache)

### Cons
- Profile stubs don't have row arrays — charts would show 0 bars until hydrated
- Could be confusing ("why is the chart empty?")
- Doesn't fix the actual wait time — just masks it

---

## Recommendation (needs human review)

**Likely best: Option A (per-project snapshot) + Option C (skeleton while refreshing)**

1. Save a `canvas-hydration-{projectId}.json` snapshot on every hydration completion (overwrite-append, newest-wins). Include a `savedAt` timestamp per domain.
2. On session open: download snapshot → populate immediately → show "Data from X hours ago" badge.
3. In background: fire `mode:'hydrate'` for domains older than a configurable threshold (e.g. 30 min for issues, 6 h for rooms/parquet).
4. When background refresh completes: replace data + remove the "stale" badge.

**But this needs human review on:**
- Acceptable staleness threshold per domain
- Storage growth: how many snapshot files will accumulate? Need a cleanup strategy.
- Security: is it OK to store raw issues/progress data in project files?
- UX for the "stale data" indicator — how prominent? Dismiss-able?

---

## Not implementing until

- [ ] Domain-by-domain staleness thresholds agreed
- [ ] Security/data residency confirmed
- [ ] Storage growth strategy agreed (cleanup on DELETE endpoint availability? periodic?)
- [ ] "Stale data" UX reviewed
- [ ] Confirmed snapshot size is acceptable (benchmark a real project)
