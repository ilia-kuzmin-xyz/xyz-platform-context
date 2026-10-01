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

## 2026-09-15 — scheduled review run: only #2190 (PLT-3086) eligible; held for Ilia

Scope filter (Rishi/Darminder/Tom, non-draft): only **#2190** qualified — Darminder's #2211
(PLT-3112) is draft, no open PRs by Tom.

**#2190 (PLT-3086, membership-impact modal)** — up to date with master (merge base = master tip,
no conflicts; "blocked" = approvals only). Sonar quality gate passed 09-15; build on the
merge-commit head was in progress at review time, but the identical-content parent commit
(`f6b19b3`) built green 09-14. Jira ticket read in full — AC matches the PR's member-remove +
rejoin scope; the other doors are ticketed follow-ups (PLT-3130 etc.). Note the later commits
(rejoin screens, activity-log tab, master merge) were pushed by **Ilia's own account**
(Claude-assisted) on top of Rishi's base — so an approval from Ilia's account would be
part-self-review, one more reason this run posted nothing and deferred.

Copilot's two 08-27 threads, both still unresolved on GitHub:
- endMembership-no-op → **addressed in code** (thread outdated): `useMembershipImpactAction` reads
  the membership first and bails when already deleted; disposition deliberately runs BEFORE
  `endMembership` (ordering rationale in `use-membership-impact.ts`).
- fetch-all instances on panel render → partially stale: `select()` paginates past the 1000-row
  cap since #2171, and `useAllTaskInstances` is a shared react-query key. Still eager on render —
  perf nit, non-blocking.

**Findings this run (code-level, not posted to the PR — Ilia to arbitrate):**
1. **Major — multi-system rejoin drops prompts.** `add-asset-systems-modal.tsx` collects per-system
   `awaitingChoice` but calls `rejoin.ask` only for `pending[0]`; systems 2..n with archived work
   get no restore-or-fresh prompt, and nothing re-asks later (`reconcileProject` and the
   requirement-config backfill both discard `awaitingChoice`). Asset stays silently short of those
   tasks; only recovery is the Activity-tab Restore, which has no "fresh" option.
2. **Major — Activity-tab Restore can violate the one-set invariant.** `asset-activity-log.tsx`
   restores the recorded ids unconditionally. If the asset rejoined and chose "Start fresh", a
   later Restore un-archives the old set beside the fresh one → two live sets, the exact §09
   duplicate the rest of the PR prevents. `restoreInstances`' own docstring puts the duplicate
   check on the caller; this caller has none. Also un-archives onto a system the asset may no
   longer be a member of (design intent unclear — the card exists for never-rejoins).
3. **Medium — actor never populated.** `applyMembershipImpact` accepts `actor` but no door passes
   it; every log entry renders "system · <date>" in the Activity tab. Provenance is a stated
   purpose of the log.
4. Minor: sequential awaits (per-membership `readPriorWork`, per-instance discard `remove`) — fine
   at MVP scale.

Held rather than approved/changes-requested: 3.3k-line flag-gated feature, visual walkthrough
(dev Supabase env) explicitly required by the PR's own testing steps, plus the self-review angle.

### Scoping-rule reminder that cost time this run

`.claude/commissioning-active` could not be created because **`.claude/` itself did not exist** in a
fresh checkout. `mkdir -p .claude && touch .claude/commissioning-active` — without it, five of the
six eligible sprint tickets are out of scope by the repo's own rule.

## 2026-09-25 — scheduled review run over Rishi's six open PRs

Scope filter (Rishi/Darminder/Tom, non-draft) matched six PRs, all Rishi's; Darminder's #2211
(PLT-3112) is still draft, none by Tom. CI (build + Sonar) green and no merge conflict on all six
heads. No prior review from Ilia's account on any of them.

**Approved this run** (comment left on each):
- **#2239 (PLT-3127, Blocker)** — one-line `disablePortal` removal on the asset-type FormSelect;
  matches the system modals' portal-by-default selects; verified no other FormSelect caller passes
  the prop.
- **#2234 (PLT-3142)** — system dimming via per-fragment transparent material clones
  (`system-ghost.ts`), deliberately off the visibility bit so filters/section box/isolate compose.
  Darminder had approved after visual check. Noted (non-blocking): module-level `ghostByMaterialId`
  outlives a viewer teardown — small leak, no collision risk.
- **#2230 (PLT-3141)** — viewport context menu System actions. All threads carried real fixes or
  reasoned reverts; Darminder approved at head after confirming multi-system element links with
  Jason. Noted (non-blocking): an element already in a system via its asset's membership still
  gains a redundant bare link (deliberate per `use-add-elements-to-system` docstring).

**Held for Ilia** (no PR comments left, per the run's own rule):
- **#2221 (PLT-3136, backend seam, 5.5k lines)** — no human review yet; **3 Copilot threads open
  at head**: readiness-step `setOrder` validates ids against ALL workflows (medium, defensive), and
  two `clear()` partial-failure findings that only affect test-reset paths (no production caller of
  `clear()` — verified by grep). Manual api-v2 walkthrough in the PR body is the real gate.
- **#2229 (PLT-2901, portfolio roles)** — code-level clean; all 6 Copilot threads resolved with
  real fixes (403-only fallback in `usePortfolioAuthorities`, strongest-grant override compare,
  new tests). Needs live IAM verification with two accounts (Admin + Editor/Viewer) — body-level
  Copilot leftovers are medium/minor (order-dependent unrankable custom grants, missing
  `project-authorities` invalidation after own-role change, raw portfolioId in the invite session
  log, service contract tests).
- **#2240 (PLT-3123/PLT-3171, feedback fixes)** — no human review yet, testing steps are heavily
  visual across the shared Properties pane. Code itself reads well: asset/system details become
  `lastSelectedEntity` types routed by `Properties`, shared System workflow via convergent
  `ensureSystemWorkflow` (setOrder keeps foreign steps, so adopting a user workflow named "System"
  is non-destructive). One unresolved Copilot thread (collapsed pane stays collapsed on new
  selection) answered by Rishi as parity-with-master. PLT-3171 Issue 6 (slow notifications) is NOT
  covered by this PR — the ticket can't close on it alone.

### Cross-PR interlock found this run (the important one)

**#2240 deletes `systemDetailId`/`assetDetailId` from `viewer-provider`, while #2230 (approved,
likely to land first) adds `use-system-context-menu-actions.ts`, which reads `systemDetailId`.**
`git merge-tree` of the two branches produces a CLEAN tree — no textual conflict — so whichever
lands second silently carries a `useViewer()` destructure of a property that no longer exists.
Runtime-wise the menu's "Add to selected system" would just never enable; the prod build's
typecheck (fork-ts-checker, pitfalls §12) is what will actually catch it, at merge time. The
context-menu hook needs rewiring to `lastSelectedEntity({type:'system'})` as part of the second
merge. Flagged on #2230's approval comment.

## 2026-09-27 — scheduled review run: six eligible PRs, nothing posted, three held

Scope filter (Rishi/Darminder/Tom, non-draft) matched #2244 (Darminder), #2243, #2242, #2240,
#2229, #2221 (Rishi); none by Tom; #2211 still draft. **No PR comments or reviews posted this
run** — two PRs already carried Ilia's approval at head, the rest are held on gates only a human
can clear, and no developer had acted on the previously-held three since the last run.

**Already approved by Ilia at current head (respected, untouched):**
- **#2243 (PLT-3126, Critical)** — the invisible discard-dialog Back button was `variant='outlined'`
  with no `outlinedSecondary` override → text #1a1a1a on #1a1a1a. The one-line deletion falls back
  to the theme's `containedSecondary` (light text). Covers all 4 dialog call sites; Darminder
  verified visually. CI green, mergeable clean.
- **#2244 (PLT-3150, Critical)** — all five AC delivered; 13 of 14 threads resolved with real
  commits. **The one unresolved Copilot thread is a real medium defect**:
  `checklist-library-service.ts:468`/`:550` wraps a multi-column item insert in
  `withOptionalColumn('require_witness', …)`, but `missingColumnNamed` only matches the wrapper's
  own column and `sign_off_role` precedes it in payload order — on an env missing the migration,
  PGRST204 rethrows and template create/edit fails outright instead of falling back. Fix: guard all
  four columns. Approval stands; worth a follow-up nudge to Darminder. Hard schema dependency on
  xyz-supabase #46 (task_item columns, signing_slots, task_execution_signature, two RPCs) — dev
  must carry it before merge, stable before flag promotion (pitfalls §3/§4 class).

**Held for Ilia (recommendations, strongest first):**
- **#2242 (PLT-3172, live incident, Major) — recommend APPROVE.** Root cause verified: NWC linked
  dbIds are geometry-less containers; the editor-only simple-highlight patches
  (`selection.patch.ts:21-39`, `:72-87`) suppress child descent, so highlight draws nothing. Fix
  expands linked dbIds with descendants (Navis-gated on `isNavisworksModel`, Set-deduped), mirroring
  `get-selectable-dbids-for-model.ts:43-56`; non-Navis path untouched; `_handleSelectionChange`
  already maps unmapped children up to the elementId-bearing parent. New test on a 6k-line fixture
  from the customer model. Both Copilot threads resolved; CI green; not behind master. Held only
  because the ticket's acceptance is visual on a customer NWC and confidence (~90%) sits under the
  run's 95% bar for waiving that.
- **#2240 (PLT-3123/PLT-3171)** — PLT-3123 and PLT-3171 items 1-5 covered (item 6, slow
  notifications, is NOT — ticket can't close on this PR). **The 09-25 interlock is RESOLVED
  in-branch**: `use-system-context-menu-actions.ts` is rewired from `systemDetailId` to the new
  `selectedSystemId`, tests updated (verified by diff; #2230 is in the PR's base). **Build is RED
  on an unrelated Trivy scan** — image-size 1.2.1, CVE-2025-71329/-71330, lockfile untouched by
  this PR; #2244's branch already carries the lockfile override for exactly this, so port that
  bump. One medium to arbitrate: `ensureSystemWorkflow` adopts any workflow display-named
  "System" and ends with an unconditional `setSteps(projectId, target.id, [blue, white])` — this
  run's read says that can rewrite a user-authored "System" workflow's ladder; the 09-25 run read
  setOrder as keeping foreign steps. The two claims conflict — check `setSteps`/`setOrder`
  semantics once, authoritatively, before flagging to Rishi. Manual viewer QA per the PR's own
  checklist remains the gate (isolation moved from material-swap ghosting to theming knock-back;
  `system-ghost.ts` deleted).
- **#2229 (PLT-2901)** — unchanged since the 09-25 hold (no push since 09-19, no author response).
  Deepened findings this run, still medium: `ROLE_DEPENDENT_QUERY_KEYS` omits
  `'project-authorities'` (stale project-team gating after a portfolio role change);
  role-change/invite gated only on `PortfolioInvitePerson` so anyone with invite rights can assign
  Admin — project side gates Admin behind `canChangeProjectAdmin`, no portfolio equivalent exists
  in constants.ts (possible privilege escalation, needs IAM role-definition confirmation); the
  unrankable-grant compare is order-dependent. Base ≥9 commits behind master (no overlap, low
  conflict risk). Still needs the two-account IAM walkthrough.
- **#2221 (PLT-3136)** — Ilia's 09-26 conditional review stands unanswered; head unchanged since
  09-23; mergeable_state now **dirty** (3 content conflicts: checklist-instance-service,
  checklist-library-service, commissioning-request-error). **New major-at-merge fact this run**:
  master's PLT-3138 default-assignee fields (`assignee_id`/`assignee_type`,
  `checklist-library-service.ts:89-129`, verified) have ZERO counterpart in the branch's
  `checklist-library-api-service.ts` — under `CommissioningPlatformApi` a template's default
  assignee is silently dropped on read and never written, and resolving the textual conflicts
  won't surface it (the api-v2 file doesn't conflict). The interface + api-v2 port (and possibly
  the backend contract) must gain the field during the master merge. Also confirms the ticket
  can't close on this PR alone: `currentReadinessGateId` read model absent (blocked on PAPI-3998).

**Open unresolved review threads across the six: 4** — 1 on #2244 (the withOptionalColumn defect),
3 on #2221 (setOrder cross-workflow reassignment; two clear() partial-failure findings — no prod
caller, test-reset only). #2229's leftovers are Copilot review-body items, not threads.

## 2026-09-30 — scheduled review run: three new PRs, all held for Ilia, nothing posted

Scope filter (Rishi/Darminder/Tom, non-draft) matched #2254 (Darminder, PLT-3144), #2252 (Rishi,
PLT-3093), #2247 (Rishi, PLT-3153) — all created 09-28/29 — plus the long-standing #2221. None by
Tom; #2211 still draft. CI (build + Sonar) green on all three new heads; all three merge clean
with master (#2254 is 0 behind, #2252 is 3, #2247 is 7). **No reviews or comments posted**: each
new PR's own testing steps are visual/manual gates under the run's 95% bar, and #2221 had no
developer action since the 09-27 hold.

- **#2254 (PLT-3144, folder delete + first-upload fix) — cleanest of the three; recommend Ilia's
  visual pass then approve.** All 8 Copilot threads resolved (real fixes or reasoned no-changes).
  The branch's own unlink-and-archive folder flow (`useFolderDelete`/`RecordedWorkModal`) was
  REMOVED in the master merge (d43b6165); head builds on master's PLT-2999 dialog with three folder
  outs: move-to-Unassigned (FK `ON DELETE SET NULL`), archive-all-then-delete-folder, and
  archive-N-delete-M (re-reads usage, unions with what the user saw, archives before deletes —
  `TaskLibraryTab.tsx` `archiveAndDeletePendingFolder`). Archive semantics deliberately match
  master: applied tasks stay applied (guarded by `liveDefinitionsById` + xyz-supabase #37 trigger).
  Known gap, acknowledged in-thread as a follow-up: multi-call delete is not atomic (needs an RPC).
  The upload fix is pitfall-clean: new `commissioningFiles/platform-environment.ts` resolves at
  runtime (profile first: prod/preprod→null fail-closed, staging→staging, dev/local→dev; entrypoint
  `COMMISSIONING_PLATFORM_ENVIRONMENT` only fills a profile gap, whitelisted to dev|staging), setter
  runs after the profile dispatch, binding keyed by mongo id (refuses postgres ids) exactly as
  mobile keys it. Held only for the manual dev-project first-upload check + destructive-flow QA the
  PR itself asks for; the binding is permanent per project, so a wrong env write is uncorrectable.
- **#2252 (PLT-3093, offline conflict handler) — hold.** 10 of 11 Copilot threads fixed same-day
  (incl. the real ones: conflicted task openable with `paused=false` during lookup; readiness
  projected from unloaded inputs; multi-challenger archive-unseen-runs). **1 thread open at head**,
  posted after Rishi's last replies: `readValue` (`useConflictCases.utils.ts:181`) joins table cells
  with `' | '`/`'; '`, so differing cell boundaries can render identical and unhighlighted. Display
  fidelity only — flagging, `differing_item_count` and identical-answer auto-supersede are
  server-side (`commissioning_conflict_case_v1`, xyz-supabase #53 RPC contract) — medium, worth a
  nudge. Hard dependency: **xyz-supabase #53 must be applied to the env the FE points at**
  (pitfall §3/§4 lockstep class; couldn't verify — that repo is outside this session's scope).
  Testing needs two tabs + Admin/Editor roles; entirely manual.
- **#2247 (PLT-3153, Issues from failed checklist items) — hold.** All 14 threads resolved; the
  permission story took two rounds (render gating, then the `useTaskIssueLinks` query itself gated
  on `PROJECT_ISSUES_VIEW`). Rishi browser-verified the disputed `isIssuePlaced` claim (Copilot's
  "cannot save without pin" was wrong — position fields nest as one array). Copilot body leftovers,
  both medium UX, unaddressed: chip click doesn't expand a collapsed Open Issues card (selected
  card invisible), and Raised-from → Item is a no-op when the item is filtered/collapsed
  (`use-task-issue-binding.tsx:97`). Link storage `task_execution_issue` (xyz-supabase #50, PR says
  merged; unverifiable this session). Ticket AC is a page of visual detail + prototypes.
- **Interlock found this run**: #2252 ↔ #2247 textually CONFLICT in all three runner modals
  (`TaskInstanceModal`, `ManagedTaskInstanceModal`, `TaskExecutionModal`) + `i18n/en/main.json`.
  Both are Rishi's; whichever lands second is a real merge, and the semantics interact (#2252 gates
  runner opening on conflict lookup; #2247 rewires the same modals' layout/actions). #2254 merges
  clean with both.
- **#2221 (PLT-3136) — degrading.** Head unchanged since 09-23, Ilia's 09-26 conditional review
  still unanswered, and the conflict set vs master has grown from 3 files (09-27) to 8+ (both
  panels, `use-asset-detail-from-selection`, checklist services, `task-instance-file-service` —
  the last now also collides with #2254's upload fix). The 09-27 findings (PLT-3138 assignee-field
  gap in the api-v2 port) still stand.

**Open unresolved review threads across the four: 4** — 1 on #2252 (readValue), 3 on #2221
(unchanged). #2247's and #2254's leftovers are review-body items, not threads.

## 2026-10-01 — scheduled review run: four eligible PRs, nothing posted, all four waiting on someone

Scope filter (Rishi/Darminder/Tom, non-draft) matched #2252, #2247, #2221 (Rishi) and — for the
first time — **#2211 (Darminder, PLT-3112), now out of draft**. None by Tom. No reviews or
comments posted: the two live Rishi PRs stay under the 95% visual-gate bar, #2211 already carries
Rishi's changes-requested (respected, not duplicated), #2221 has had no developer action since
Ilia's 09-26 conditional review.

- **#2252 (PLT-3093) — materially advanced since 09-30; now the closest to mergeable.** Rishi's
  `4dc1350c8` fixed the last open thread (value items keep their pass/fail verdict in the
  comparison, counted like the server does); all 14 threads now resolved, Copilot's final pass
  lists zero findings, build+Sonar green, HoloSight 19/19 ACs. **New blocker: branch went dirty vs
  master — verified by merge-tree to be a single trivial conflict in `i18n/en/main.json`** (7
  commits behind; #2254 and PLT-2999 both touched that file). Remaining gates unchanged: two-tab
  Admin/Editor manual walkthrough, xyz-supabase #53 applied to the target env. Semantic note for
  the merge: master now carries PLT-3140 asset delete from the viewer — same assets-panel surface
  as the conflict strip; conflict cases for a deleted asset are a server-side question (RPC
  contract), nothing client-side guards it.
- **#2247 (PLT-3153) — unchanged since 09-28 head `d2eb656`; hold stands.** Still merges clean
  ("blocked" = approvals only). The two Copilot body mediums (chip click with collapsed Open
  Issues card; Raised-from → Item no-op on filtered/collapsed items) remain unaddressed and remain
  the right size for a follow-up rather than a block. Interlock with #2252 in all three runner
  modals still live — whichever lands second is a real merge.
- **#2221 (PLT-3136) — stale 8 days, degrading further.** Head still `0b45ea4` (09-23); Ilia's
  09-26 conditional review unanswered; 3 threads open; conflict set keeps growing as master moves.
  The 09-27 finding stands: the api-v2 port lacks master's PLT-3138 assignee fields, invisible to
  textual conflict resolution. Needs a decision: Rishi rebases it or it gets re-scoped.
- **#2211 (PLT-3112, live incident) — first review round done, ball with Darminder.** The fix
  direction is right (bound DB-derived link counts by `getLoadedModelElementIdsForModel`), but the
  loaded-set is captured once per effect run with no re-trigger on viewer load completion — which
  is exactly what Rishi hit manually (counts don't refresh while the panel is open) and the root
  of Copilot's 3 open threads (stale drill-down; loaded-empty-set vs not-loaded ambiguity — the
  `!size ||` fallback treats a legitimately empty loaded model as "not loaded" and accepts every
  stale link; no tests). **Build check is also red on the head** (Sep 9; Sonar green — likely the
  Trivy/base-image era, re-push will tell). Jira repro (Yash, 09-08) notes total count drops
  2,319/4,545 → 2,310/2,299 after load — the fix bounds the linked count but does not explain the
  total-count drop; worth keeping the DPL ticket Rishi suggested.

**Open unresolved review threads across the four: 6** — 3 on #2221 (unchanged), 3 on #2211 (all
Copilot, 09-30). #2252 and #2247: zero.

**Domain fact from master this run (supersedes the flag framing above for non-prod): PLT-3181
(#2253, merged 09-30) stops gating Commissioning behind the flag outside production.** Dev/staging
now expose commissioning surfaces without the cookie; the flag remains the gate in prod only. The
"flag off = zero Supabase requests" safety line in this README's header now holds only in prod —
the permissive-RLS blocker (§ Blockers) got more exposed, not less.
