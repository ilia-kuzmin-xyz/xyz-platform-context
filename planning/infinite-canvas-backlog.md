# Infinite Canvas — remaining work

**Title:** `Infinite Canvas: speed up report generation and viewer data preparation`

**Description:**

Follow-up work after the Room Readiness template. Baselines measured on
API 2 FULL PROJECT -xv2 (1.4M elements, 502 rooms), 28 Jul 2026.

**1. Report generation is too slow (~7 min cold).** Most of it is data access,
not Claude: rooms rollup ~60s, viewer mapper ~55s, hydrators 30–50s, composer
4–7 min. All drop to ~2.4s warm. We have found a faster schema for reading the
same data from MCP — move the affected fetches onto it and re-measure per phase.

**2. The 3D viewer blocks first paint.** Opening a saved dashboard shows
"Loading 3D model data…" for up to ~55s cold, with nothing else on screen: the
whole report waits on the viewer mapping because Sandpack won't refresh a static
JSON import after mount. Options: pre-warm the fetch on project open, mount the
viewer separately from the rest of the report, or persist the mapping with the
session now it's 2.46MB (was 9.37MB).

**Also outstanding:**
- Activate a template from the user's prompt, not just the clarifier survey tick
- Serve a matched template artefact directly instead of regenerating it (this is
  what removes the token cost and the wait)
- Hydration records served from project storage have no max age — the `viewer`
  record was 27 days old and can't self-refresh, and it holds the model urn
- Room Readiness drill-down: GC actual % and handover milestones — blocked on
  where that data lives, not on code
- Rooms with ≤5 tracked elements (218 of 502) isolate to something that looks
  like a broken viewer

**Acceptance criteria:**
- Cold generation time reduced to <target>, with before/after timings per phase
- Restored dashboards paint non-viewer content in <3s cold; viewer fills in after
- Room isolation still works on restore
- Viewer mapping payload stays well under the ~9MB Sandpack ceiling

**Notes:** `xyz_get_projects_project_id_schedules_schedule_revision_id`
intermittently returns `request_failed`; when it does, planned %, variance and
target dates all go null and the attention list silently loses its ordering —
needs an explicit failure path.
