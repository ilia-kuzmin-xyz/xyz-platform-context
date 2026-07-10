# PLT-2874 — Context Pack

Prep-only research for Ilia. **Read-only on Jira — no comment/transition was made.**

## Ticket metadata

| Field | Value |
|-------|-------|
| Key | PLT-2874 |
| Summary | differences between fed file linked elements and dashboard elements number |
| Type | **Live Incident** (issuetype 10046, "track live incidents on site") |
| Status | Open (category To Do) |
| Priority | **Minor** |
| Project | PLT — XYZ SW Platform : Platform |
| Reporter / Creator | Mostafa Kamel Hussien (product owner — direct report, not client-relay) |
| Assignee | Darminder Atker (FE lead) |
| Created / Updated | 2026-07-07 15:23 BST (both — untouched since filing) |
| Affected project (customfield_10758) | **FAR01** |
| Comments | **0** (none) |
| Labels / components / links | none |
| webUrl | https://xyzreality.atlassian.net/browse/PLT-2874 |

## Full description (verbatim)

> On the federated file in the editor on Far01, you can see that there's around 628,000 linked elements. However, in the dashboard, it shows that there are 695 thousand linked elements when you take the scrubber to the end of the project.
> [image-20260707-142150.png] [image-20260707-142256.png]

Discrepancy: **dashboard 695k > editor 628k**, delta ≈ **67k (~10%)**, dashboard is the higher one.

## Comments (chronological)

None. Ticket has never been commented on or transitioned.

## Attachments / media inventory

Two PNGs, both uploaded by Mostafa at filing time. In the raw ADF the description embeds them as
`blob:https://media.staging.atl-paas.net/...` references (Jira internal media blobs — **not fetchable**).
`expand=renderedFields` DID resolve them to real Jira attachment content URLs:

| id | filename | size | resolved content URL |
|----|----------|------|----------------------|
| 60327 | image-20260707-142150.png | 914 kB | `.../rest/api/3/attachment/content/60327` (larger — likely the editor/viewer screenshot) |
| 60328 | image-20260707-142256.png | 158 kB | `.../rest/api/3/attachment/content/60328` (smaller — likely the dashboard stats overlay) |

**Both are INACCESSIBLE to this agent.** WebFetch on the resolved `xyzreality.atlassian.net` content URL
returned **HTTP 403** (attachment endpoints require an authenticated Jira session; WebFetch cannot auth).
The `api.atlassian.com` mirror URLs are equally gated. **→ Flag for human:** Ilia (already authenticated in
browser) should open both, or attach plain screenshots, so the exact labels on each number can be read.
The specific wording each surface uses for "linked elements" is load-bearing for diagnosis (see open questions).

## Relevant domain docs + takeaways

- **dashboard/viewer-and-model.md (VWR)** — the three-ID mapping chain is the crux:
  `PostgreSQL UUID (modelElementId) → External ID (sourceFileElementId) → Forge dbId`.
  Coloring/visibility is keyed on **dbId**. displayDate gating (`displayDate <= sliderEndDate`) means the
  scrubber-at-end shows all schedule-linked elements.
- **dashboard/pitfalls.md** — "Wrong artefact in multi-model projects": `svf2-object-id-map` fanout; one
  external ID → many dbIds is an established failure mode. Directly relevant to a count-inflation bug.
- **dashboard/data-pipeline.md (DAT)** — `element-status`, `project-element-list`, `svf2-object-id-map`
  are the three parquets JOINed to produce the colored set.

## Relevant hc-frontend code + findings (the two counting mechanisms)

**This is a broken-vs-working PAIR by construction: same FAR01 fed file, two independent count code paths.**

### Path 1 — Editor "linked elements" (the 628k)
- `services/linking/linking-service.ts:125-131` — `links$.next(allLinks)`; logs `linkCount: allLinks.length`.
  **`allLinks.length` counts element→activity LINK RECORDS, not unique elements** — an element linked to N
  activities contributes N.
- `getLinkedElementIds()` @ linking-service.ts:771 returns element ids for the current selection.
- Per-activity element counts surface in the gantt "elements" column via
  `gantt-x/scheduler/hooks/use-update-element-counts.tsx` (re-renders on `linkChanges$`) and
  `hooks/use-linked-element-actions.ts`.
- **Exact editor surface showing "628,000" not yet pinned** (ModelDetailsPanel has no total-linked string).
  Candidate = sum of gantt elements column, or an editor viewer stat. Needs the screenshot to confirm.

### Path 2 — Dashboard scrubber count (the 695k)
- Displayed by `dashboard-panels/viewer/dashboard-element-stats.tsx:41` →
  `displayTotal = stats.visible > 0 ? stats.visible : elsCount`. So the scrubber-driven number is **`visible`**.
- `visible` is set by `dashboard-color-service.ts:662` / `:835` → `setVisibleElements(this.coloredDbIds.length)`.
- `dashboard-color-service.ts:643` — `this.coloredDbIds = Array.from(elementsByStatus.values()).flat()`.
  **This is a flat list of Forge dbIds, NOT deduped to unique elements.**
- The dbIds come from `dashboard-progress-service.ts` `_visible_elements` temp table
  (built @ :1947 primary path w/ activity_links; :2193 simplified path). JOIN chain @ :2151-2164:
  `runtime_id_mapping.dbId → project_element_list.sourceFileElementId → element_status.modelElementId`.
  A one-external-id→many-dbId (or many-pel-row) fanout multiplies rows → inflates the dbId count.

### Mechanism hypothesis (the diff = the diagnosis)
The two numbers count **different units on different keys**:
- Editor 628k ≈ unique linked **elements** (or link records) keyed on `modelElementId`.
- Dashboard 695k = colored **Forge dbIds** keyed on `dbId`, flattened without dedup.

Because one `modelElementId` can map to multiple `dbId`s (geometry split / svf2 map fanout — a documented
pitfall), and because `coloredDbIds` is `.flat()` with no `DISTINCT`, the dashboard number is expected to run
**higher** than the editor's element count — matching the observed 695k > 628k. Alternatively/additionally the
JOIN in `_visible_elements` can emit duplicate dbId rows if `project_element_list` has multiple rows per element.
Both point to the same class: **dashboard counts non-deduped dbId rows; editor counts elements.**

## Playbook-frame analysis (six questions)

1. **Observed / can we see it?** Numeric discrepancy 628k vs 695k on FAR01. We CANNOT see the screenshots (403).
   The numbers are legible from text; the *labels* are not.
2. **Expected + authority?** Reporter's implicit reference: the two surfaces should agree. **Not yet
   established that they are even counting the same thing** — this is the half of the ticket to resolve first
   (playbook Q2: "half of data incidents die here — the reference was never what people remembered").
3. **Smallest broken-vs-working pair?** Built in: identical fed file, two count paths. Diff the two paths →
   Path 1 (link records / modelElementId) vs Path 2 (flat dbId list). The diff IS the diagnosis.
4. **Mechanism?** Identified above: dbId-fanout + non-deduped `coloredDbIds.flat()` vs element-keyed editor count.
   Confirmable in code + one FAR01 query (`COUNT(DISTINCT modelElementId)` vs `COUNT(dbId)` on `_visible_elements`).
5. **Why now / trigger?** Unknown and probably N/A — this reads as a long-standing definitional mismatch a
   product owner just happened to notice, not a regression. No deploy correlation implied. (Ask anyway before closing.)
6. **Who else / cohort?** If confirmed as dbId-vs-element, EVERY multi-model/federated project shows the same
   gap. FAR01 is a sample, not the population.

## Confidence score + reasoning

**5 / 10.** (CLAUDE.md: "approach clear but behaviour is environment-dependent / has edge cases.")
Two distinct count code paths located with file:line; a coherent mechanism (dbId fanout + non-deduped
`coloredDbIds`) that predicts the observed direction (dashboard higher). BUT: cannot see the screenshots
(403) so the exact label/units of each number are unconfirmed; the editor "628k" surface isn't pinned to a
line; and confirming which basis each uses needs one query against live FAR01 data. Cannot cross 6 without
the screenshots or a data pull.

## Recommended next action (do NOT execute)

**Clarify with Mostafa first, then it becomes dev-ready — do NOT send straight to development.** The ticket
may not be a bug at all but a units mismatch (elements vs dbIds vs link records). One closed, answerable
question to the reporter, one owner:

> Draft comment (playbook tone — closed, one owner):
> "@Mostafa — to pin this down: on the FAR01 **editor**, is the 628k figure the count of *linked elements*
> or the count of *element→activity links* (an element on multiple activities counted once vs many)? And on
> the **dashboard**, that 695k is the 'Total' in the bottom-left element stats overlay at scrubber-end —
> correct? We suspect the two surfaces count different units (unique elements vs Forge geometry ids), which
> would fully explain the ~10% gap. A screenshot of each number with its label would confirm it in minutes."

Routing: keep **Darminder** as assignee (FE lead, owns both surfaces). If Mostafa confirms it's the stats
overlay 'Total', hand to a FE dev with the hypothesis "add `DISTINCT modelElementId` / count elements not
dbIds in `coloredDbIds`" to verify against FAR01. Priority Minor is appropriate for a definitional/labeling
gap; escalate only if it turns out actual progress % is computed off the inflated count.

## Open questions for a human

- [ ] **Screenshots (blocking):** open attachments 60327 & 60328 (403 for the agent) — read the exact label
      under each number.
- [ ] Which editor surface displays "~628,000"? (gantt elements-column sum? a viewer stat?) Not found in code.
- [ ] Is 628k unique linked *elements* or *link records* (`allLinks.length` counts records)?
- [ ] Is 695k the `dashboard-element-stats` bottom-left "Total" (= `coloredDbIds.length`)? Confirm.
- [ ] Run on FAR01: `SELECT COUNT(*) AS dbids, COUNT(DISTINCT modelElementId) AS elems FROM _visible_elements`
      at scrubber-end — does `dbids ≈ 695k` and `elems ≈ 628k`? That single query confirms/kills the hypothesis.
- [ ] "Why now" — ask before closing (likely just first-noticed, not a regression, but confirm no recent
      svf2-map / linking deploy).
