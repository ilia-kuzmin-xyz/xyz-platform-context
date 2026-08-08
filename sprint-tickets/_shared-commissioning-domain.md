# Shared domain note — Commissioning / Project Settings (2026-08-08)

Written once for **PLT-2992, PLT-2993, PLT-2994, PLT-3000, PLT-3002**, which all live in the
same domain. Read this before any of those five ticket folders.

## Gating

Commissioning is **out of scope by default** per hc-frontend's root `CLAUDE.md`. To work these
tickets you must switch it on — either branch-name contains `commission` (ours don't; branches
must be named `PLT-XXXX`) or `touch .claude/commissioning-active` in the checkout. **Use the
marker file.**

Runtime gate: feature flag `Commissioning` in `app/config/constants.ts`, default off; toggled at
the in-app `/feature-flags` page.

## Where the code lives (master `4ad83a7`, verified 2026-08-08)

| Thing | Path |
|---|---|
| Settings modal + tab config | `PortfolioPage/components/ProjectSettings/ProjectSettings.tsx` |
| Asset Types tab | `.../ProjectSettings/AssetsTab/AssetsTab.tsx` |
| Task library tab | `.../ProjectSettings/TaskLibraryTab/TaskLibraryTab.tsx` |
| Folder grouping logic | `.../TaskLibraryTab/taskLibrary.utils.ts` → `groupChecklistsByType()` |
| Asset type / system group table | `pages/AssetListPage/AssetListContent.tsx` |
| Checklist model | `services/checklistLibraryService/*.types.ts` |
| Asset model | `services/assetRegisterService/asset-register-service.types.ts` |
| Domain docs | `docs/commissioning/` (README, checklist-library.md, asset-register-and-3d-linking.md, dashboard.md) |

Tab order today: General · Team · Integrations · Devices · Attributes · **Asset Types** ·
**Task library** · **Workflow** · Models. The last three are Commissioning-gated.

## Five facts that decided this run's triage — do not re-derive

1. **`AssetListContent` already renders the asset-types table with a Tasks column.**
   `useReadinessTaskCountsByType` feeds it; `groupColumns` adds the `tasks` column **only** for
   `view === 'assetTypes'`. This is what makes PLT-3000 look already-shipped.
2. **A `systems` view already exists** — `type ListView = 'assets' | 'assetTypes' | 'systems'`.
   It groups by the asset's flat `system: string` and deliberately has **no** Tasks column.
3. **There is no `System` entity and no "System type" concept.** An asset carries one flat
   `system` string. PLT-3002's two-level hierarchy has no data source.
4. **Task-library folders are derived, not authored.** `groupChecklistsByType()` buckets a
   checklist under the asset type(s) it's linked to via `readinessTaskService`; unlinked ones fall
   into a synthetic `__unassigned__` bucket. There is no folder entity, nothing to rename, and a
   checklist linked to two types appears twice. **PLT-2993/2994 collide with this.**
5. **`IChecklistDefinition` has no `type` field** — it is `{ id, name, description, items,
   version, createdAt }`. PLT-2992's Checklist / Functional Performance Test / Integrated System
   Test enum is a model change. Related: the FacilityGrid importer *reads* a `CHECKLIST TYPE`
   metadata cell and currently **discards it**.

## Two corrections to save the next run a wrong turn

- **`@dnd-kit/core` ^6.3.1 IS already a dependency**, and already used for a folder tree with
  drag-and-drop: `viewer-x/.../model-layers/model-tree/hooks/use-drag-and-drop.tsx`, and inside
  the settings modal itself at `ProjectSettings/AttributeTab/EditableAttributeList.tsx`.
  PLT-2994 needs **no new library** — copy the house pattern. (This run first wrote the opposite
  on the Jira ticket after grepping only for the words "drag"/"dnd" in a truncated view; the
  comment was corrected in place. Grep `package.json` for the actual package name.)
- **The builder is already in-modal.** PLT-2992 says "opens a new modal"; `ChecklistBuilderContent`
  already slides in over the tab (Team/Models slider pattern) without routing out. Don't rebuild it.

## Persistence caveat that applies to all five

Commissioning is **client-side first**: asset register, per-asset 3D links, type rules and the
checklist library all persist in **`localStorage`, keyed per project**. No REST backend. So any
new store (folders, system types, task type) is **per-browser and invisible to teammates** until
a BE lands. Flagged on PLT-2993; applies equally to PLT-3002.
