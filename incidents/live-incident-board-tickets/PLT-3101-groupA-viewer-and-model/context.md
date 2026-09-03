# PLT-3101 — Elements reported as not installed but can't be found in web viewer

**Created 2026-09-02 13:52. Open, Major, assignee Ilia. Freshdesk 7819 → Waiting on 3rd line.**
Project **CH08 — Minooka**, mongoProjectId `699db456380af76aed84b728`. First pass: 2026-09-02.

## The report

Customer (via Yash, `111090`): activity **CH08-MY-41** — *UG Electrical - North - Mechanical Yard -
CH08* — has **3 elements not installed** that block the package, and neither they nor their site
engineers can find them in the Web Viewer. Their ask, verbatim from the description:

> "Can we mark them as installed or delete them or guide of where/how can I do it myself?"

Yash's own investigation, in the same comment, is the important part:

> "The activity currently shows **835 linked elements**, however only **819 elements are
> visible/selectable** in the Web Viewer, indicating a discrepancy of **16 elements**"

and he names the shape correctly — *"ghost elements retaining historical links or elements that were
removed during model updates but still retain activity mappings"*.

Note the description says activity `CH08-MY-4`; the comment says `CH08-MY-41`. **Treat `CH08-MY-41`
as canonical** — it carries the full activity name.

## Access: BOTH data routes are blocked for CH08. Verified today, not assumed.

| route | result |
|---|---|
| prod MCP, project-scoped read | **`project_id_not_allowed`** — *"project id `8a00ce8b-4f84-4559-87cc-fb052da09803` is not on the whitelist for env=prod"* |
| platform API v2 + browser token | **token expired** (`exp` 1788283442, ~24 h stale) |

CH08 **is** returned by `xyz_get_projects_user_projects` (34 projects) — so this is the
whitelist-vs-user-access split already recorded in `prod-mcp-access.md`, same as AUS02 on PLT-3095.
Platform ids resolved and worth keeping:

| field | value |
|---|---|
| platform `projectId` | `8a00ce8b-4f84-4559-87cc-fb052da09803` |
| `mongoProjectId` | `699db456380af76aed84b728` (matches the ticket exactly) |
| `mongoTenantId` | `6899a350ab993e97ec718f09` |
| platform name | `EQX - CH08X - Building -xv2` (customer calls it CH08 - Minooka) |
| region | NA |

**So the 16 have NOT been identified.** Nothing below claims otherwise.

## MECHANISM — verified in code, and it explains the 835/819 shape exactly

The two numbers are produced by two different populations, and one of them silently discards rows.

**835 = link rows.** `useSelectedActivityLinkCount` (`linking-provider/use-link-queries.ts:16-29`) is
`(await linkingService.getElementIdsForActivity(activityId)).size` — the link table, nothing else.

**819 = link rows that resolve to loaded Forge geometry.**
`gantt-x/scheduler/hooks/use-linked-element-actions.ts`, both actions:

```ts
const elementIdsForModel = elementIds.filter(
  elementId => viewerService.elementId2ModelId.get(elementId) === model.id,   // :43, :78
)
const dbIds = elementIdsForModel.map(elementId => viewerService.elementId2DbId.get(elementId))
```

An element with no entry in `elementId2ModelId` matches **no** model (`undefined !== model.id`), so it
is dropped from every group with no error, no warning and no count. That is the silent 16.

**Why an element ends up unmapped** — `model-loaders/model-mapping-service.ts:226-230`:

```ts
for (const [externalId, dbId] of extId2DbId.entries()) {
  const hasExternalIdInCloud = projectModel.elementId2dbId?.has(externalId)
  if (!hasExternalIdInCloud) continue
  ...
```

The maps are the **intersection** of two sources: `extId2DbId` (the currently loaded, translated
Forge geometry) and `projectModel.elementId2dbId` (the platform's element list for that model).
Anything present in one but not the other gets **no dbId at all**.

Two further whole-model wipeouts in the same loop:
- `:212-217` — a model whose `fileType` is neither Revit nor Navisworks is skipped
  (`console.warn('Skipping model with unsupported file type:', ...)`), contributing **zero** mappings.
- `:220-223` — a mapping fetch that throws is logged and `continue`d, same effect.

So there are **three** candidate causes for the 16, all producing this identical symptom:

| # | cause | discriminator |
|---|---|---|
| **a** | elements removed from the model geometry in an update, link rows survive — Yash's hypothesis | they never resolve, on any session, with every model loaded |
| **b** | a model skipped entirely (unsupported fileType, or a mapping error) | `console.warn('Skipping model with unsupported file type')` / `log.error('Error getting mapping for model …')` in the browser console |
| **c** | elements live in a sub-model not currently loaded or activated | they resolve once that model is loaded |

**(b) and (c) are configuration/session states, not data corruption, and neither has been ruled out.**
Do not present (a) as established — that is the mistake PLT-3099 made and had to retract.

Corroboration that the codebase already knows these are two populations:
`viewer-service.ts:~1155`, `getElementCountForModel()`, documented as *"Counts elements actually
present in the loaded Forge geometry … (i.e. elements with a valid dbId)"*.

## The customer CANNOT do what they asked, and that is a code fact

Their ask is to mark the 3 installed, delete them, or be shown how. **There is no route.**

- Unlinking an element from an activity happens **only** through `unlinkSelectedElements`
  (`services/linking/linking-service.ts:504-508`), which reads
  `getSelectedActivityAndElements()` — i.e. the **viewer selection**.
- The context-menu item is disabled while `selectedElements.size === 0`
  (`scheduler-context-menu/activity-context-menu.tsx:41-47`).
- An unmapped element cannot be selected (previous section). **Therefore it cannot be unlinked.**
- There is no unlink path anywhere that takes a list of element ids. The only other `unlink` in the
  viewer tree is the **assets panel** (`use-asset-element-linking.ts`), which is Commissioning — a
  different feature, a different entity, not applicable.
- The linked-elements list panel's own selection actions apply the same gate:
  `activity-linking-list/hooks/collectSelectableDbIds.ts:20` requires `typeof item.dbId === 'number'`.

**One genuine partial workaround, worth telling them:** the linked-elements *list* is built from
`getElementsForActivity` and grouped by `element.getModels()` — it does **not** consult
`elementId2DbId` (`activity-linking-list/hooks/useGroupedLinks.ts:52-79`). So the panel should list
all 835 with names and statuses, including the 16. They can **see** them there even though the 3D
view cannot select them. Unverified against a running app (this environment cannot build hc-frontend)
— worth one look before we tell the customer to go there.

## Relationship to other tickets — related, not duplicates

- **PLT-2874** (differences between fed-file linked elements and dashboard element counts) — same
  underlying truth, that two surfaces count different populations. 2874 is project-wide counters;
  3101 is one activity and a user-blocking consequence. Read `PLT-2874/prod-measured-2026-08-27.md`
  § C before re-deriving anything here.
- **PLT-3099** (wrong linking on ATL08) — the opposite direction: links created for elements the user
  could not see. 3101 is links surviving for elements that no longer resolve. Both are the linking
  layer trusting a set the viewer cannot reconcile.
- **PLT-3100** (linking writes a large selection with no count and no confirmation) — the same family:
  the link count and what the viewer can act on are never reconciled or surfaced.

## The FE defect worth fixing regardless of CH08's data

Whatever the 16 turn out to be, this is wrong today: **`selectLinkedElements` and
`isolateLinkedElements` discard unresolvable elements in silence.** The user is told 835 and given
819, with nothing naming the gap. A count of what could not be resolved — or any surfaced message —
would have let the customer and Yash skip this entire ticket. Small, self-contained, and independent
of the data question.

Second, smaller: `.map(... .get(elementId))` at `:45` and `:80` pushes `undefined` into `dbIds` for an
element that is in `elementId2ModelId` but missing from `elementId2DbId`. The `hasExternalIdInCloud`
gate makes the two maps populate together, so this should not happen today — but nothing enforces it,
and an `undefined` would go straight into `setAggregateSelection` / `aggregateIsolate`.

## What is needed to finish this

1. **A fresh `access_token`** from a logged-in browser session (or CH08 added to the prod MCP
   whitelist). Then: `getElementIdsForActivity` equivalent for CH08-MY-41 vs the project element list,
   which names the 16 and settles (a) vs (b) vs (c).
2. **One browser-console look** on CH08 for the two `model-mapping-service` messages in row (b). That
   is a 30-second check that either eliminates a whole cause or explains everything.
3. **Whether the 3 "not installed" are among the 16.** Yash has not said so and it does not follow —
   835-vs-819 is a 16-element gap; the blocking 3 are a separate claim. **Do not assume they are the
   same set.** This is exactly the arithmetic error PLT-3099 made.

## 2026-09-03 — MEASURED ON LIVE PROD. The 2 blocking elements are named, and a separate API bug found.

Ilia supplied a fresh browser `access_token` (2 h validity). Read-only GETs against
`cloud.xyzreality.com` with `xyz-execution-context: api2`. **The § Access section above is now
superseded** — the token route works; the prod MCP whitelist still refuses CH08 and that is unchanged.

### Identifiers, all confirmed against live data

| what | value |
|---|---|
| projectId | `8a00ce8b-4f84-4559-87cc-fb052da09803` |
| current revision (isCurrent + isBaseline) | `7574b43e-2264-4634-a146-65ab8ae00ac3` — `CHx-GC-18-R0-2026-07-29_updated`, dataDate 2026-07-29 |
| activity **CH08-MY-41** itemId | `65c1c3fd-32a5-4f29-ab25-888c619259c5` |
| its `itemName` | `UG Electrical - North - Mechanical Yard - CH08` — matches the ticket exactly |
| its `linkedElementCount` | **835** — matches what Yash and the customer see |
| activityStatus / type | `TK_Active` / `TT_Task`, `validForProgressCalculations: true`, `plannedProgress: 1`, `actualProgress: null` |

The revision holds 3,974 schedule rows. Note `CH08-MY-41` and `CH08-MY-411` are different activities —
`CH08-MY-411` carries 3,500 links. Do not confuse them.

### ⭐ FINDING 1 — `GET /activities/{activityId}/links` returns SOFT-DELETED mappings. Backend bug.

| measure | value |
|---|---|
| `/api/v2/projects/{pid}/activities/{aid}/links` returns | **3,035** distinct `modelElementId` |
| project feed `/elements/activity-links`, rows with `isDeleted: false` for this activity | **835** |
| same feed, `isDeleted: true` for this activity | **2,200** |
| 835 + 2,200 | **3,035 exactly** |
| elements holding both a live and a deleted row | **0** |

**So the per-activity links endpoint ignores `isDeleted` and over-reports by 3.6× on this activity.**

Ruled out before claiming it:
- **Not pagination.** Re-counted at `size=500` (7 pages), `1000` (4), `2000` (2) and `5000`
  (**1 page, unpaginated**) — 3,035 every time, 0 duplicates. Also note `recordCount` is the count of
  *that page*, not the total; reading it as a total is how a first pass wrongly stopped at 1,000.
- **Not an unscoped endpoint.** Two other activities return entirely different id sets, and
  `linkedElementCount` differs per activity (835 / 3,500 / 12).
- **The feed was read in full**, not sampled: 372,903 rows over 75 pages of 5,000, no sync-window
  parameters. (One page returned an empty body mid-run; retried and completed.)

**Why there are so many deleted mappings — confirmed, not inferred:** CH08 has **334 models, of which
258 are soft-deleted** (`GET /models?includeDeleted=true` vs `false` → 76 live). They are superseded
versions — `…STRU_R23_Vertical structure-V35`, `…PLMB_PipesCHW-V66`, and so on. Heavy model-version
churn, exactly the customer's "elements removed during model updates". Superseding a model version
soft-deletes its elements' activity mappings; `linkedElementCount` honours that and this endpoint
does not.

**Blast radius:** any consumer of `/activities/{id}/links` sees the union. On this activity that is
1,218 elements that look un-installed (748 `NOT_SET` + 470 with no status row) but are all attached to
superseded model versions. **This is a strong candidate for the customer's "3 not installed"** reading
differently in different surfaces, and it is worth checking what else calls that endpoint before
assuming it is only cosmetic.

### ⭐ FINDING 2 — the customer's blocker is **2** elements, not 3. Both named.

Of the **835 live** linked elements:

| installation status | count |
|---|---|
| `INSTALLED_ACCURATELY` | **833** |
| **no status record at all** | **2** |

Everything else on the activity is installed. The two are:

```
12398bf3-dae3-4c29-8275-a97e1cb64d5c
cad330b0-27b4-4b61-9bfe-1e80271775a5
```

Both confirmed individually: `GET /elements/{id}/status` →
`NotFoundError: No modelElement status found for modelElementId '…' in project '…'`. Not `NOT_SET` —
**no row exists.** Nothing to install-check and nothing to render, which is precisely why the customer
and their site engineers cannot find them.

**The customer says 3, the data says 2. Do not silently reconcile this — ask.** Plausible readings:
their count is approximate, or the third is one of the 2,200 deleted mappings still being counted in
whatever surface they are reading. Both are checkable and neither should be assumed. This is the
arithmetic discipline PLT-3099 was retracted for missing.

Full sets saved: `analysis/PLT-3101-CH08-MY-41-live-links.csv` (835 rows, with status) and
`analysis/PLT-3101-CH08-MY-41-deleted-links.csv` (2,200 rows, with status).

### FINDING 3 — Yash's 16 is NOT explained by any of the above

835 − 819 = 16 sits **entirely inside the live 835**, so the deleted mappings do not explain it and
neither do the 2. The § Mechanism section's code analysis still stands as the explanation (an element
in the platform's list but not resolvable to loaded Forge geometry), and 2 of the 16 are now
accounted for. **The other 14 are unmeasured** — 819 is Yash's observation and has not been reproduced
here, so it should be re-read before anyone tries to explain it.

### Correction to § Mechanism — the linked-elements LIST does not show unresolvable elements either

That section says the list panel "should list all 835 including the 16" because `useGroupedLinks.ts:52`
calls `getElementsForActivity`. **Wrong.** `linking-service.ts:684-689`:

```ts
const elementIds = await this.getElementIdsForActivity(activityId)
return Array.from(elementIds)
  .map(elementId => this.projectService.elements.get(elementId))
  .filter(Boolean)          // drops every id absent from the loaded element map
```

`.filter(Boolean)` discards them at the source, so the list drops them too. **There is no surface in
the app that shows the customer these elements.** That makes the class-2 fix (surface the count that
could not be resolved) more important, not less.

### Remediation

The 2 stale mappings should be removed from CH08-MY-41. Needs a platform-api write — read-only here,
and no owner lined up, same gap as PLT-3099's 1,239. The customer cannot do it themselves (§ The
customer CANNOT do what they asked). Marking them installed is not an option either: with no element
record there is nothing to attach a status to.

## 2026-09-03 (later) — ⚠️ THIS IS PATTERN 1, OCCURRENCE #4. Read that before anything above.

Ilia asked whether we had seen ghosted linking before. **We had, extensively**, and this folder was
written without checking. `recurring-defect-patterns.md` § **Pattern 1 — Dead activity links
(element metadata diverges from model geometry)** — *"the most expensive pattern found so far:
roughly two weeks of investigation across three tickets before it was recognised as one thing."*

| Ticket | Project | Presented as |
|---|---|---|
| PLT-2882 | FAR01 | select/isolate does nothing, panel still shows 418 |
| PLT-2909 | ATL08 | activity lists models containing none of its elements |
| PLT-2931 | ELN03 | progress capped below 100%, package stuck at 97% |
| **PLT-3101** | **CH08** | **elements reported not installed, cannot be found in the viewer** |

Pattern 1's recognition signature already covers this ticket almost verbatim: *"Select or isolate
linked elements appears to do nothing, while a non-zero count is displayed"*.

### What I re-derived that was already written down

The § Mechanism section above traces the intersection gate at `model-mapping-service.ts:226-230`
(`hasExternalIdInCloud`) as though it were new. **Pattern 1 states the same thing** — *"`model.elementId2dbId`
is the intersection of loaded geometry externalIds and the metadata parquet
(`model-mapping-service.ts:372-384`)"* — with different line numbers because the file has moved
since. Same gate, same consequence. The § Mechanism analysis is correct; it is just not new.

**Pattern 1's decisive arithmetic test, which I did not run and should have:** *"if the displayed
percentage equals installed ÷ linked to two decimals, the denominator is the bug."*
For CH08-MY-41: **833 / 835 = 99.76%**. Consistent with the measured finding, and it would have got
there in one query.

### ⚠️ CORRECTION — "needs a write and no owner is lined up" is WRONG. A runbook exists.

Both this folder and PLT-3099's say remediation needs a platform-api write with no owner. **There is
an established, already-used procedure:** `incidents/data-remediation-runbook.md`, 8 steps — produce
the CSV with an audit trail, check progress side-effects, **get approval in writing on the ticket**,
snapshot the live links, delete, verify the live count dropped by exactly the number sent, restore if
needed. The delete call is:

```
POST /api/v2/projects/{postgresProjectId}/elements/activity-links/delete
[{ modelElementId, activityId }, ...]      // max 500 per batch, soft delete
```

It has been run successfully — on ELN03 it moved five activities to 100% and cleared the Containment
package, exactly as predicted. **This correction applies to PLT-3099's 1,239 as well**, where the same
false blocker is recorded.

Also from the runbook, and directly relevant here: *"Before anything: is deletion even the right
fix?"* On PLT-2909 the elements existed in a sibling building and deleting would have unlinked working
elements. **Confirm the 2 are genuinely unreachable before treating them as dead.**

### ⚠️ CORRECTION — Finding 1 (the links endpoint) is REAL but I OVERSTATED it

Two things were wrong in how it was written up.

**1. Soft-deleted link history is not news.** PLT-2882's investigation log, line 176:
*"10,316 rows total → 9,898 `isDeleted` (link/unlink history) → 418 live"* and line 178: *"always
filter `!isDeleted`, and paginate"*. The runbook says the same: *"Always filter `!isDeleted` or your
counts will be nonsense."* FAR01's ratio was 24×; CH08's 2.6× is mild by comparison. What is
genuinely unremarked is narrower: **`/activities/{activityId}/links` returns only `modelElementId`
with no `isDeleted` field at all**, so a caller cannot filter even knowing to — while
`linkedElementCount` on the schedule row gets it right. No prior note mentions that endpoint.

**2. RETRACTED: "a strong candidate for the customer's 3 reading differently in different surfaces."**
Checked, and it is not. The endpoint's **only** frontend caller is
`serviceProvider.Activity.getSelectedActivityLinks`, invoked from
`scheduler-service/schedule-service.tsx:217` — **inside `if (this._debugMode)`**, feeding a
duplicate-link debug check. No production surface reads the unfiltered 3,035. The FE's real link data
comes from `Element.getActivityLinks` → `/elements/activity-links`, which carries `isDeleted`.

So the endpoint issue is a latent trap for the next consumer plus a corrupted debug diagnostic —
worth reporting, **not** urgent, and not this customer's problem. Draft B should be re-scoped
accordingly.

### Likely root cause of CH08's 2 dead live links — already named in Pattern 1

Pattern 1's closing note: *"model deletion does not remove links unless a user ticks a checkbox, and
the plain delete path hardcodes it off (`confirm-model-deletion.tsx:103-112`), which is an independent
source of orphans that we own."*

**CH08 has 258 soft-deleted models out of 334.** That is the highest-volume model churn seen on any
project in these notes, against a delete path that leaves links behind by default. It fits without
requiring anything new.

Pattern 1's own view of the highest-value fix is also worth quoting, because it is not the fix this
folder proposed: *"the highest-value fix is not the cleanup but making the unlink step on upload
compare against **geometry** rather than the element list, which would make the whole family
self-correcting."* The class-2 FE fix proposed in `recommended-action.md` (surface what could not be
resolved) is complementary — transparency, not prevention — and should be described that way rather
than as *the* fix.

### Process note, for the run instructions

This folder was written, and a full prod measurement run, before anyone checked
`recurring-defect-patterns.md`. The pattern file exists precisely to stop that. **Check it first when
a ticket smells like links, counts, or "can't find the element".** The measurement was still worth
doing — it named the 2 elements — but the mechanism, the arithmetic test, the remediation procedure
and the likely root cause were all sitting in one file the whole time.
