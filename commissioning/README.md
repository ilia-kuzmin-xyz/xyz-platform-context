# Commissioning (domain)

**Flag-gated MVP** on hc-frontend: catalogue a project's physical assets, attach commissioning
checklists, link assets/asset-types to 3D elements, and track handover readiness. Started by the
product owner as a workable MVP, now being hardened ticket by ticket.

Everything is gated by the **`Commissioning`** feature flag
(`src/main/webapp/app/config/constants.ts`, default `false`). With the flag off, master behaviour
is unchanged and **no Supabase requests are made at all**.

**Persistence is a standalone Supabase (Postgres) project** reached over PostgREST — see
[data-layer.md](./data-layer.md). *(Earlier versions of this domain said "localStorage only, no
backend". That was true at the 2 Jul 2026 review and is now superseded — PLT-2862 moved it onto
Supabase.)*

## Docs

| Doc | Covers |
|-----|--------|
| [data-layer.md](./data-layer.md) | **Start here for anything data-related.** The Supabase bridge: the client seam, the two environments and how one is picked at runtime, the RLS/security posture, and a verified table + row census. |
| [pitfalls.md](./pitfalls.md) | Gotchas that have already cost time — build-time vs runtime env, PostgREST renames as breaking changes, lazy connection resolution, the un-importable template. |
| [planning/glossary-rename-and-systems.md](./planning/glossary-rename-and-systems.md) | The in-flight Cx glossary rename and the Systems layer stacked on it, with the deploy-lockstep risk. |
| [design-legacy.md](./design-legacy.md) | The design-token reinvention problem and the reuse plan (align with Editor/Dashboard token usage). |
| [review-and-plan.md](./review-and-plan.md) | **Historical (2 Jul 2026).** The skeptical senior review of the original `feature/Commissioning` branch and its remediation checklist, since completed. Useful for intent and for why things are shaped as they are; its persistence and branch details are out of date. |

The **product owner's** own feature docs live in the app repo at `docs/commissioning/` and
describe intended behaviour.

## Scoping rule in the app repo

`hc-frontend/CLAUDE.md` treats Commissioning as **out of scope by default** — don't read, review,
refactor or pull it into context for unrelated work. Recognise it by the
`Asset*` / `Checklist*` / `readiness` / `commissioning` naming; the full file map is in
`docs/commissioning/README.md` (§ Code scope).

It switches **on** when either signal is present:
- the current git branch name contains `commission` (case-insensitive), or
- the marker file `.claude/commissioning-active` exists (git-ignored, per checkout).

## Sub-domains & where the code lives (`src/main/webapp/app`)

- **Assets** — asset register, import, detail, asset types. Services `assetRegisterService`,
  `assetTypeService`, `assetElementLinkService`; Project Settings → `AssetsTab`.
- **Checklists / tasks** — reusable library, form-builder editor, FacilityGrid `.xlsx` import.
  Services `checklistLibraryService`, `checklistInstanceService`, `taskInstanceSync`;
  Project Settings → `TaskLibraryTab`.
- **Readiness & workflow** — `readinessTaskService`, `workflowService`, `workflowTagTaskService`,
  `tagService`, `defaultWorkflowSetup`, `elementChecklistStatusService`;
  Project Settings → `WorkflowTab`.
- **Data layer** — `services/commissioningApi/` (see [data-layer.md](./data-layer.md)).
- **Viewer panels** — the in-viewer **Assets** left panel (link/unlink/focus, isolation modes) and
  the element-properties linking sections.
- **Dashboard tab** — the **Commissioning** dashboard tab (readiness rollup).

---

## Current state — 12 Aug 2026

**Landed on master**
- **PLT-2862** — off `localStorage`, onto Supabase.
- **PLT-3035** (#2118, 10 Aug) — environment resolved at runtime from the platform profile;
  `prod`/`preprod`/`staging` → `stable`, everything else → `dev`. Schema parity between `dev` and
  `main` verified at the same time.
- **PLT-2947** (#2120, 12 Aug) — create a new asset from the viewer Assets panel.
- **PLT-2914** (#2129, 12 Aug) — CX UI feedback round 2: task types, default workflow, readiness
  and a broad Project Settings polish pass. Added an override hook to
  `element-state-theming.ts` / `project-service.repaintElementStates` — **shared surface on
  PLT-2743's architecture**, so it affects non-commissioning viewer colouring too.

**Open, mine**
- **#2115** PLT-3000 — Project Settings Types tab. Its base (`PLT-2914-cx-ui-feedback-round-2`)
  has now merged, so it needs retargeting to master.
- **#2116** PLT-2993 — task library folders. **Conflicting with master.** The remaining work is to
  merge the folder model *into* the redesigned `TaskLibraryTab` rather than replacing it —
  `groupChecklistsByFolder` supersedes `groupChecklistsByType`. Keep `folderId` **optional**;
  making it required breaks ~17 fixtures for no runtime gain.
- **#2117** PLT-2994 — drag and drop into folders; rebase once #2116 settles.

**Open, Rishi's** — a seven-PR Systems stack rooted on the glossary rename. Root PR conflicts with
master and no backing schema is deployed. See
[planning/glossary-rename-and-systems.md](./planning/glossary-rename-and-systems.md).
*(16 Aug update: stack consolidated into one PR, #2140; the rename and the Systems tables are now
applied on `dev` — `stable` still bare. Details in the planning doc's dated notes.)*

**Blockers before the flag can be enabled above `dev`**
1. `stable` holds **0 rows in every table** — the feature would load empty.
2. **Mobile still pins `dev`** while web resolves from the profile, so the two clients would
   disagree in protected environments.
3. **Permissive anon RLS** — no server-side tenant isolation (`data-layer.md`).

**Open decisions**
- Should the checklist import template ship a placeholder name, or should the error name the cell
  to fix? (`pitfalls.md` §8)
- Should the design's left-rail task-type cards replace the type dropdown?
- Do the commissioning tabs adopt the Project Settings house style, or the reverse?

## 2026-08-20 — type edit mode shipped on #2147; Rishi PR conflict map

- **Type edit session (PLT-3001/PLT-3003 scope-extension, pushed to #2147, head `1c359c09`)**:
  both type details (AssetTypeDetailContent, TypesTab/SystemTypeDetail) now carry the prototype's
  edit mode — **view mode is read-only** (the stray read-mode "+ Add task" buttons are gone),
  Edit stages adds (New badge) / removals (strikethrough + Undo), Save confirms via the new
  `AssetTypePage/TypeChangesReview.tsx` page, applies retry-safely (an `applied` set skips landed
  mutations on retry). Asset side applies via `ReadinessTasks.link/unlink` (+ optional
  `removeTemplateInstancesOnType` behind a review-page checkbox); system side via the per-step
  `WorkflowStepTasks.setForStep` replace-set. Shared pieces (DiscardChangesDialog, NewBadge,
  addTaskButtonSx) extracted to `AssetTypePage/typeEditShared.tsx`; both create pages import them.
  **Scoped out of v1** (stated in the PR): rename (name-keyed register/links, no cascade), sysreq
  add/remove in edit (no delete route), deep Impact aggregation on the review page.
  ReadinessLevelsSection's API changed: add/remove is now driven by an optional
  `edit: ReadinessEditController` prop; without it the section is read-only (RemoveTaskDialog no
  longer lives there — the instance decision moved to the review page).
- **No type-edit anywhere else**: checked Rishi's open PRs. **#2149** (PLT-2984/82/83/85, viewer
  system detail panel, ready for review) touches our surface only in SystemTypeDetail's ladder
  memo (adds an `appliesToSystemType` filter) + serviceProvider/commissioningApi index — small,
  resolvable conflicts with #2147. **#2150** (PLT-3058 target data model, draft, stacked on #2149,
  blocked on xyz-supabase #16) re-plumbs ReadinessLevelsSection/SystemTypeDetail onto
  `asset_type_task`/`system_type_task` and rewrites `ensureDefaultWorkflow` — deeper overlap with
  both our edit session and `createSystemTypeWorkflow`; whoever lands second re-keys the edit
  session's staging (step ids move from `workflow_step` to per-type mappings).
- Two new pitfalls recorded (§10 react-jhipster `<Translate>` ignores contentKey changes;
  §11 `defaultOpen` is initial-only) — both reconciliation-keeps-state bugs found while
  browser-verifying the edit session.

### 2026-08-20 (evening addendum) — #2147 review round + sysreq schema path

- Rishi requested changes on #2147: footer button misalignment (fixed — every ghost
  Cancel was 36px beside the 32px yellow CTA; one shared `ghostButtonSx` in
  `typeEditShared.tsx` now covers 6 footers, commit `4251e8e8`) and a "search bar
  missing its icon" screenshot that does NOT reproduce — all four search inputs on the
  PR's surfaces carry icons at every relevant commit; asked him which screen he meant.
- System prerequisites don't persist on any env: the two tables exist on neither dev
  nor stable (probed both via PostgREST — PGRST205). The schema doc
  (`docs/commissioning/asset-type-system-requirements-schema.md`) now carries TWO
  variants: the dev stopgap (tag-keyed `step_id`) and a PLT-3058-aligned variant
  (`step_id` FK → workflow-owned `readiness_step`) meant to land via xyz-supabase,
  stacked on xyz-supabase #16. The schema was designed in-session, no backend review
  yet — Rishi asked to look. Nobody runs the stopgap on stable.
- Someone merged master into PLT-3003 remotely mid-evening; pulled+merged clean.

## 2026-08-25 — scheduled review run over Rishi/Darminder's open PRs

Reviewed all 7 non-draft PRs by Rishi and Darminder (none by Tom were open):

- **Approved**: #2167 (PLT-3060 live incident, Darminder — filter/isolation fix, Forge
  omission-vs-empty-ids semantics; Rishi had approved too), #2171 (PLT-2965 critical asset
  toggle), #2170 (PLT-2990/91 legend by readiness tags), #2149 (PLT-2984/82/83/85 system
  detail panel — Darminder approved 08-24 at head after his visual round), #2160
  (PLT-2970/71/73 affects-systems — lands after #2149; Darminder's "how does blocked get
  set" question sits with Jason).
- **Still blocked**: #2157 (PLT-3068/70 bundle+artifact) — my 08-20 changes-requested
  stands; Rishi fixed the logo conflict + body, but master's prettier reformat of
  routes.tsx conflicts again (trivial: keep his Swagger comment, take master's
  formatting), and the sign-in visual check vs the generic SSO button is unconfirmed.
  #2158 (PLT-3069) approved but stacked on #2157; its only real risk is a deployed-env
  ChunkLoadError pass, per the ticket's own "not verified".

**New finding, verified by PostgREST probe**: `asset.critical` (PLT-2965) exists on **dev
only** — stable answers 42703 "column asset.critical does not exist". Reads stay safe
(`select=*` + `?? false` mapping) but creates/edits would fail on stable. Same
deploy-lockstep class as the systems tables; must reach stable before the flag goes above
dev. Also verified all 18 commissioning tables carry `id`, so #2171's paged `select()`
(new `order=id.asc` tiebreak, PAGE_SIZE 1000) cannot 42703 anywhere — that pagination fix
is the root cause of Darminder's "asset disappears" repro (project had 1999 assets against
PostgREST's silent 1000-row cap).

Note for future runs: #2171 changes `select()` to always order by `id` — previously
unordered reads followed PostgREST's physical order, so any UI relying on insertion order
may re-order once it merges.

## 2026-08-27 — scheduled review pass over Rishi's open PRs

- **#2183 (PLT-2948/2978, import wizard)**: CI green, all 13 review threads resolved by Rishi
  (real fixes + reasoned no-changes). Code pass found no critical/major — classification/commit are
  server-side RPCs (`classify_import`/`commit_import`), commit re-classifies before writing, cache
  invalidation covers register + types + systems + readiness. Held for Ilia's visual walkthrough
  (5-step wizard, dev Supabase env). Its own additions treat `asset.system_label` as deprecated —
  aligned with the target model.
- **#2150 (PLT-3058, target Cx model)**: CI green, Darminder approved, grep confirms no FE reads of
  dropped tables (`workflow_step_task`, `readiness_task_link`, `element_task_status`,
  `system_label`) outside negative-assertion tests. Held: blocked on xyz-supabase PR #16, and 4
  unanswered Copilot threads — the real one is `typeTaskService.workflowOfStep` returning null for
  an unknown step id, after which `linkAssetType`/`setForSystemTypeStep` write `workflow_id: null`
  with a non-null `readiness_step_id` (composite FK passes on NULL member → silent bad row).
- **#2183 vs #2150 overlap**: both touch `asset-register-service.ts`, assets-panel and
  systems-panel; each merges clean with master but whichever lands second needs a real merge.
- Durable fact (Copilot keeps flagging it wrong on PRs like #2184): the IAM authorities endpoint
  `GET /account/projects/{id}/authorities` is keyed by the **mongo** project id —
  `useEditorAuthorities` passes `projectIdForToken` (raw mongo id) by design.

## 2026-09-05 — three PRs raised; two schema gaps and one stale doc found

**Raised this run** (all draft, all on current master except where noted):
- **#2203 PLT-2999** — Rename / Duplicate / Delete on a task-library row. Adds `rename`,
  `duplicate` and `remove` to `checklistLibraryService`, which had none of them.
- **#2204 PLT-2966** — completion date-time on an achieved readiness tag. **Based on `PLT-2968`,
  not master.**
- (#2202 PLT-3038 is non-commissioning.)

### Two schema facts worth carrying

1. **`asset_readiness` has `is_achieved` that nothing writes, and no `achieved_on`** — while
   `system_readiness` has **both** `isAchieved` and `achievedOn`. So there is no stored moment for
   "this asset reached this level"; PLT-2966 derives it from the latest save across the level's task
   instances. **Candidate ticket: add `achieved_on` to `asset_readiness`** and the derivation
   collapses to a read.
2. **`asset_element_link` has no user column** (`id, project_id, asset_id, element_id, created_at`),
   so nothing that attributes a link to a person can be built client-side. This is what blocks
   PLT-2952's "per-user linking progress".

Also: **no asset↔element matching or scoring exists anywhere in the repo** (`matchStrength`,
`autoMatch`, `fuzzy` → 0 hits). PLT-2952's "match strength" is entirely net-new, algorithm and
storage both.

### Stale doc, corrected

`hc-frontend/docs/commissioning/asset-register-and-3d-linking.md` §55-105 describes an
"Isolate in 3D" toggle and `use-asset-type-element-isolation.ts` /
`use-asset-link-element-isolation.ts`. **Those files no longer exist.** Related: the viewer's asset
left panel is **`assets-panel/assets-panel.tsx`**, not `AssetListContent` — the latter survives only
in `AssetListPage` and `TypesTab`, and its `panel-mode` / `enableElementLinking` props have no
caller left. PLT-2953 (#2148) is what moved linking to selection-first and deleted the panel-owned
mode.

### Scoping-rule reminder that cost time this run

`.claude/commissioning-active` could not be created because **`.claude/` itself did not exist** in a
fresh checkout. `mkdir -p .claude && touch .claude/commissioning-active` — without it, five of the
six eligible sprint tickets are out of scope by the repo's own rule.
