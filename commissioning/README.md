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
