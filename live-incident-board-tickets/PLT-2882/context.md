# PLT-2882 — "We can't filter retired activity - FAR01"

> Prep-only context file. Populated by Claude for Ilia to act on. **No Jira action taken** (read-only).

## Ticket metadata

| Field | Value |
|-------|-------|
| Key | PLT-2882 · https://xyzreality.atlassian.net/browse/PLT-2882 |
| Summary | We can't filter retired activity - FAR01 |
| Issue type | **Live Incident** |
| Status | **Open** (To Do) · statuscategorychangedate 2026-07-09 13:58 |
| Priority | Major |
| Project | PLT — XYZ SW Platform : Platform |
| Reporter / Creator | Yash Patel |
| Assignee | Darminder Atker (FE lead) |
| Software Area | **Web Viewer** (per description) — this is the ViewerPage, NOT the Dashboard |
| Client project | APLD - FAR01 |
| Freshdesk | Ticket 7379 — status "Waiting on 3rd line" |
| Created / Updated | 2026-07-09 13:58 / 14:26 (BST) |
| Watchers | 1 · Votes 0 · no issue links, no subtasks |

## Full description (verbatim)

```
Issue Type: Software,
Software Area: Web Viewer,
Software Component:,
Device Serial Number software: ,
Device Serial Number Hardware: ,
Is The Device Still Usable?: Not Usable,
Project: APLD - FAR01
Description:We are trying to isolate Retired Activity; however, we are not able to
isolate or select the linked elements in the web viewer.
We have uploaded a video of the issue.
Session ID: platform-web-1d4edbe3-d91d-4fa6-a1c3-1fd956f33468
Ticket attachments :
1. [2026-07-09 .mp4](https://support.xyzreality.com/helpdesk/attachments/103330758172)
```

## Comments (chronological)

1. **Yash Patel — 2026-07-09 14:15** (the substantive one)
   - "user is not able to select elements linked to an activity. they have attached a video." (@Darminder Atker)
   - Embeds video `2026-07-09 .mp4`.
   - **Activity name:** `Nw - Underground Electrical - Deep - Ug Elec Deep - Summary (Retired)`
   - **Activity ID:** `FAR01UGD1220`
   - **Session ID (client):** `platform-web-1d4edbe3-d91d-4fa6-a1c3-1fd956f33468`
   - **Broken-vs-working pair (key):** "I tried to replicate this and had same issue. **but when i tried to select elements from other activity from same model, it worked.**"
   - Embeds second video `Screen Recording 2026-07-09 184405.mp4`.
   - **Session ID (Yash's repro):** `platform-web-1a50c359-c4fd-4c77-947f-5cbfd9061a1b`
   - **Model in question:** `PC-APLD-FAR01-UND-AKS_REV1-V23`
2. **Yash Patel — 14:26** — "Ticket ID: 7379 - Freshdesk ticket status changed to : Waiting on 3rd line"
3. **Yash Patel — 14:26** — duplicate of #2 (identical body).

## Attachments / media inventory

| Item | Location | Accessible? |
|------|----------|-------------|
| `2026-07-09 .mp4` (4.9 MB, video/mp4, attId 60483) | Jira attachment `.../attachment/content/60483` | ⚠️ **Not retrievable by me** — binary video behind Atlassian auth; MCP/WebFetch cannot stream/interpret video. **Human must watch.** |
| `Screen Recording 2026-07-09 184405.mp4` (63 MB, attId 60484) | Jira attachment `.../attachment/content/60484` | ⚠️ **Not retrievable by me** — same. This is Yash's own repro recording; likely the clearest evidence of the exact click sequence. **Human must watch.** |
| Freshdesk mirror of video | support.xyzreality.com/helpdesk/attachments/103330758172 | ❌ **Inaccessible** — confirmed 302 → Freshworks OAuth login. Auth-gated. |
| Session replay `platform-web-1d4edbe3-…` (client) | Unknown observability tool (session-replay/logging id) | ❌ **Human with system access must pull.** Per playbook, obs theme = MS Clarity / similar. |
| Session replay `platform-web-1a50c359-…` (Yash repro) | Same | ❌ Same — this is the internal repro session; highest-value replay. |

## Relevant domain docs + takeaways

- `dashboard/viewer-and-model.md` (VWR): describes 3-ID mapping chain (PostgreSQL UUID `modelElementId` → externalId → Forge `dbId`) and per-model dbId maps. Note: doc is Dashboard-centric; **this ticket is the ViewerPage viewer**, where selection is enabled (`LEAF_OBJECT`), unlike Dashboard (selection DISABLED). Same underlying id-mapping concern applies.
- `dashboard/flt-filter-system.md` (FLT): `activityId` is a *selection* filter. Active filters can gate which elements are eligible for selection (mirrored in ViewerPage `filterService.allowedDbIdsByModel`, see code below).
- `dashboard/pitfalls.md`: "Wrong artefact in multi-model projects" → wrong `svf2-object-id-map` yields **zero UUID matches → elements stay grey / unmapped**. Relevant: if the retired activity's elements map into a model/version whose id-map isn't the loaded one, `elementId2DbId.get()` returns undefined → nothing selectable. No pitfall documents "filter/activity state not propagating to viewer selection" specifically.
- Playbook (`incidents/live-incident-playbook.md`): six-question frame applied below.

## Relevant hc-frontend code + findings

Branch `claude/vigilant-franklin-op2yys` — no "commission" in name, no `.claude/commissioning-active` marker → **Commissioning out of scope** (ignored Asset*/Checklist*/readiness matches).

**Finding 0 — "retired" is NOT a frontend concept.** Case-insensitive grep for `retired` across the entire repo = **zero matches**. The FE does not special-case, filter, or branch on retired activities anywhere. Therefore "can't filter/select retired activity" is a **data-level divergence**, not FE retired-handling logic. The `(Retired)` suffix is part of the activity's name string from the schedule (P6/backend).

**The code path that decides selection/isolation of an activity's linked elements** (ViewerPage):
`components/gantt-x/scheduler/hooks/use-linked-element-actions.ts`
- `resolveLinkedElementIds()` (L16-22): `linkingService.getElementsForActivity(activity).map(e => e.elementId)`. Returns `null` **only** when no/many activities selected; an activity with zero resolvable elements returns `[]` (not null).
- `selectLinkedElements()` (L24-63): `elementId → viewerService.elementId2DbId.get(elementId)` per model (L44); if `hasActiveFilters`, dbIds are intersected with `filterService.allowedDbIdsByModel` (L46-50); builds `aggregateSelection`; empty → `setAggregateSelection([])` = **silent no-op** (nothing selected).
- `isolateLinkedElements()` (L65-91): same resolution; empty `aggregateIsolation` → falls to `viewer.showAll()` + `onIsolatedSelectedThroughMenu([])` = **isolation does nothing visible**.
- **Guard gap:** `if (!elementIds) return` (L17,25,66) catches only `null`, never `[]`. An empty-but-non-null result flows through and produces a no-op with no user feedback — exactly matching "not able to isolate or select."

**Where the elements come from:** `services/linking/linking-service.ts`
- `getElementsForActivity(activityId)` (L757-761): `Array.from(activityToElements.get(activityId) || []).map(id => projectService.elements.get(id)).filter(Boolean)`.
  → **Two ways this returns `[]`:** (a) `activityToElements` has no entry for the retired activityId (no links loaded for it), or (b) links exist but the linked `elementId`s are **absent from `projectService.elements`** (`.filter(Boolean)` drops them) — e.g. elements belonging to a superseded model version, since the model is a specific revision `..._REV1-V23`.
- `activityToElements` is built purely from the `IElementActivityLink[]` link set in `updateInMemoryMaps()` (L255-268) — no status filtering; whatever the backend returns.
- Even if `getElementsForActivity` returns elements, selection still needs `elementId2DbId.get(elementId)` (viewer-service.ts L1134) to resolve — undefined if that element's geometry/id-map isn't loaded.

**Net:** three candidate failure points, all producing the same silent no-op: (1) backend returns no element-activity links for the retired activity; (2) links point to elements not in the loaded model version (`projectService.elements` / `elementId2DbId` miss); (3) an active viewer filter excludes those dbIds (`allowedDbIdsByModel`, L46-50).

## Playbook-frame analysis (six questions)

1. **Observed & can we see it?** Yes — Yash reproduced internally (2nd video + session `1a50c359`). Symptom: selecting/isolating linked elements of retired activity `FAR01UGD1220` does nothing.
2. **Expected & on whose authority?** Selecting a scheduled activity should highlight/isolate its linked model elements (works for non-retired activities — the reference).
3. **Smallest broken-vs-working pair — already provided.** Same model `PC-APLD-FAR01-UND-AKS_REV1-V23`: retired activity `FAR01UGD1220` = broken; another (non-retired) activity = works. **The diff is the retired status.** This is the diagnosis lever.
4. **Mechanism (which code path decides).** `getElementsForActivity` → `elementId2DbId` → `setAggregateSelection` (files above). An empty element/dbId set = silent no-op. Question: does the empty set come from (a) missing links, (b) elements not in loaded model version, or (c) active-filter exclusion?
5. **Why now / trigger.** Not investigated. No confirmation whether retired-activity linking ever worked. Unknown — flag as open (playbook: don't drop it).
6. **Who else / cohort.** Likely **all retired activities** on FAR01 (and possibly other projects), if root cause is systemic (no links returned for retired activities). Needs cohort query once mechanism confirmed.

## Confidence score + reasoning

**6 / 10.** The FE code path is identified with high confidence and the repro is unusually strong (exact activity id + name, exact model, explicit broken-vs-working pair, two session ids, two videos). What blocks a dev from *acting to a fix today*: the actual divergence is data-level and needs one lookup I can't do — whether the backend returns element-activity links for the retired activity, and/or whether those elements exist in loaded model version V23. That fork (missing-links vs missing-elements vs active-filter) is answerable in minutes with a breakpoint/log on the repro, but not from static context alone. Not a repro-vagueness problem; the videos/session replays (inaccessible to me) very likely already show the exact steps.

## Recommended next action (draft — NOT posted)

**One action:** post a routed mechanism question to the assignee (Darminder, FE lead + already reproduced-capable), forking the diagnosis with the existing repro. Closed, one owner, answerable with a value. Keep status Open until the fork is answered (do not move to Ready For Development yet — root cause not confirmed).

Draft comment:
> @Darminder Atker — the FE has no "retired" logic anywhere (grep = 0 hits), so this is data-level. The whole path funnels through `getElementsForActivity('FAR01UGD1220')` in `linking-service.ts:757` → `elementId2DbId` in `use-linked-element-actions.ts:44`. Using Yash's repro (session `platform-web-1a50c359-c4fd-4c77-947f-5cbfd9061a1b`, model `PC-APLD-FAR01-UND-AKS_REV1-V23`), can you confirm which of these is empty:
> 1. `linkingService.getElementIdsForActivity('FAR01UGD1220')` — is the link set empty (backend returns no links for the retired activity)?
> 2. If non-empty, do those elementIds resolve in `projectService.elements` and `viewerService.elementId2DbId` (i.e. are the linked elements part of the loaded V23 model)?
> 3. Are any viewer filters active during the repro (`filterService.getModelActiveFilterCount() > 0`)?
> That single check tells us whether this is a backend-linking gap or an FE model-version/filter mismatch. Compared against a working non-retired activity in the same model, the empty one is the diagnosis.

If step 1 is the culprit → re-route to backend linking-data owner (**Sergey / api-v1** or **Sachin/Ali / api-v2** depending on which service serves element-activity links — confirm ownership).

## Open questions for a human

- [ ] **Watch both videos** (attId 60483, 60484) — confirm exact click sequence (context-menu "Select/Isolate linked elements" vs a filter dropdown) and whether any error/toast shows.
- [ ] **Pull session replays** `platform-web-1d4edbe3-…` (client) and `platform-web-1a50c359-…` (Yash) from the observability tool.
- [ ] Confirm the fork (Q1/Q2/Q3 above) on the repro.
- [ ] **Which backend service owns element-activity links** for FAR01 (api-v1 vs api-v2)? Determines re-routing.
- [ ] Does linked-element selection work for **non-retired** activities generally, and did it ever work for retired ones? (trigger / "why now" — currently unknown).
- [ ] Cohort: are all retired activities affected, on FAR01 and other projects?
