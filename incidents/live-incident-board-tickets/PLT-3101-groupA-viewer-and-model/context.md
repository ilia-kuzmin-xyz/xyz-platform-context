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
