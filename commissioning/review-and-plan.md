# Commissioning — skeptical senior review + remediation plan

**Branch under review:** `feature/Commissioning` (143 commits, ~260 files, ~51k insertions vs `master`).
**Working branch for fixes:** `claude/compassionate-hypatia-q1x1fd` (based on the above).
**Persistence:** `localStorage` only (accepted MVP trade-off — no backend yet).
**Gating:** the `Commissioning` feature flag gates all entry points (routes, ProjectMenu nav, viewer Assets button, Project Settings tabs, dashboard tab). Verified comprehensive — nothing leaks with the flag off.

> **Resuming this work?** This file is the source of truth. Findings below are ranked; C‑items are correctness bugs, D‑items design-legacy, R‑items refactors. Each says whether it was **verified first-hand** or **carried from the initial review pass** (needs re-verify before fixing).

---

## What the feature is (product intent)

Handover/commissioning workflow: (1) catalogue physical **assets** (asset register, `.xlsx` import), (2) attach reusable **checklists**/tasks (library + FacilityGrid import), (3) **link** assets and asset-types to 3D elements (per-asset instance links + type-level rule links), (4) track **readiness** on a dashboard tab and in the viewer. See the PO docs in `docs/commissioning/` for intended behaviour.

## Sub-domains & where the code lives (`src/main/webapp/app`)

- **Assets** — `pages/AssetListPage/`, `AssetImportPage/`, `AssetDetailPage/`, `AssetTypePage/`; services `assetRegisterService`, `assetElementLinkService`, `assetTypeRuleService`/`assetTypeMappingService`, `assetAttachmentsService`; hooks `useAssetRegister`, `useAssetElementLink`, `useAssetTypeRules`, `useAssetTypeMapping`.
- **Checklists** — `pages/ChecklistLibraryPage/`, `ChecklistCreatePage/`, `ChecklistDetailPage/`, `ChecklistImportPage/`; service `checklistLibraryService`, `elementChecklistStatusService`, `readinessTaskService`, `elementTagService`; hooks `useChecklistLibrary`, `useElementChecklistStatus`, `useReadinessTasks`.
- **Viewer panels** — `ViewerPage/components/viewer-x/components/blocks/assets-panel/` (+ isolation hooks), `element-linking-list/` (element-properties linking), `viewer-bar/tools/assets-button`.
- **Dashboard tab** — `ViewerPage/components/dashboard-panels/commissioning-panel*` (the **real** one) and `commissioning-dashboard/cx-*` (the **prototype**). Project Settings: `PortfolioPage/components/ProjectSettings/{AssetsTab,TaskLibraryTab}`.

---

## Findings

### C1 — Live dashboard tab renders a hardcoded sample-data prototype; the real panel is orphaned. **[VERIFIED first-hand]**
`dashboard-resizer/resizable-layout.tsx` wires the Commissioning tab to `CommissioningSystemsPanel` (`cx-systems-panel`) + `CommissioningMain` (`cx-main`), fed by `commissioning-dashboard/cx-data.ts` — **hardcoded sample data**: `ORG = "Danny's Data Centres"`, `PROJECT = 'DUB-12 Data Centre'`, fake chillers `CH-01/02/03`, "4h ago" timestamps. The file itself says *"this is the design's own sample data — a faithful visual build."*
The **real** data-driven, tested `commissioning-panel.tsx` (documented in `PLT-2838-dashboard-handoff.md`, backed by `use-commissioning-summary` over viewer checklist statuses) is imported **only by its own tests** — orphaned.
**Impact:** any project that enables the flag sees fake "Danny's Data Centres" data instead of its own. This is the headline defect to fix before merge.
**Fix:** wire the real `CommissioningPanel` into the dashboard tab; delete or clearly quarantine the `cx-*` prototype (keep its visual design as the target styling for the real panel). Re-verify the real panel renders the states in the handoff doc (Loading→Error→Unavailable→Empty→Body).

### C2–C10 — Correctness bugs from the initial review pass. **[CARRIED — re-verify each before fixing]**
The first review fan-out (assets / checklists / viewer / dashboard sub-agents) surfaced these; the detailed write-ups were lost with the sandbox, so re-confirm each against the code before editing:
- ~~**Asset import partial re-import data loss** — drops existing assets.~~ **[VERIFIED — CLAIM OVERSTATED]** `asset-register-service.applyImport` (`:57-69`) does `existing.map(...)` + writes `[...next, ...created]`, so whole assets are **preserved**. The *real* issue: matched assets merge as `{...asset, ...changes}`, so a re-import that **omits a column / has empty cells clears those fields** (e.g. a serial-only sheet blanks manufacturer/model/location on matched assets). The code comments call this intentional ("spreadsheet is source of truth"). **This is a dangerous UX default, not an unambiguous bug — needs a product decision** (preserve-on-empty vs clear-on-empty), so NOT silently changed. If we want the safer default: in `applyImport`, drop `undefined`/empty fields from `changes` before merging (`{...asset, ...definedOnly(changes)}`).
- **Two `localStorage`-corruption crashes** — malformed/legacy stored JSON throws instead of degrading to empty. (asset register / checklist library services.)
- **Checklist import token-only custom-row drop** — custom rows whose prompt is only an input-slot token (`#_#`/`###`) get dropped. (`ChecklistImport.utils.ts`.)
- **Mis-link during linking mode** — a stale pre-existing selection can auto-link the wrong element. (`use-asset-element-linking.ts` — note the `armedRef` guard exists; confirm it fully covers.)
- **Linking mode not cancelled on panel close** — leaves the viewer in linking state. (assets-panel.)
- **`ChecklistStatusChip` crash** — on an unknown/absent status value. (`checklist-status-chip.tsx`.)
- **RuleBuilder rule-wipe** — editing/saving can clear an existing rule set. (`RuleBuilderDialog`.)
- **Falsy-id filtering** — `.filter(Boolean)`-style drops of legitimately falsy ids, or the reverse (keeping empty ids). (various link stores.)

### D1 — Design-legacy reinvention. **[VERIFIED first-hand]**
`commissioning-dashboard/cx-tokens.ts` (and a second CX token set) hardcode colours/spacing that the file comments admit "mirror theme.ts darkColors". The app already exposes design tokens via MUI `theme.palette.base.*` + shared components (as used across Editor `/projects/:id/editor` and Dashboard `/projects/:id/dashboard`). See [design-legacy.md](./design-legacy.md).
**Fix direction:** map the CX tokens to `theme.palette.base.*`, reuse shared field/toggle/chip components, and standardise spacing/typography units to the app's scale rather than bespoke px.

### R1–R4 — Refactors (document now, fix in a controlled pass — no e2e harness to catch regressions).
- **Big-file decomposition** — several 500–1000+ line files (`AssetListContent.tsx`, `ChecklistImport.utils.ts`, `commissioning-dashboard/cx-*`).
- **Dashboard domain-model reconciliation** — the real panel keys viewer statuses by mongoId (V2); align once the prototype is removed.
- **Isolation-restore memory** — viewer isolation hooks restore via `showAll`; verify no leak across tab switches.
- **Service-organisation parity** — ensure Commissioning services mirror the Editor/Dashboard `service + hook + types` folder convention (mostly do; audit stragglers).

---

## Fix plan (order)

1. **C1** (headline, verified) — wire real `CommissioningPanel`, retire `cx-*` prototype from the live path. *Do first.*
2. **C2** (asset-import data loss) — re-verify, then fix; it's test-backed.
3. **C3–C10** — re-verify each, fix the unambiguous crashes/data-loss ones; defer anything sweeping.
4. **D1 / R1–R4** — document (done here); schedule as a controlled follow-up pass.

## Testing (no Playwright harness in hc-frontend yet)
Rely on the existing co-located Jest suites (the PO added many, incl. adversarial) + typecheck + lint. Manual browser verification needed for: the real dashboard panel states, asset↔3D linking/isolation, `.xlsx` imports, and design-token parity.

## Current state (as of resume)
- ✅ Working branch `claude/compassionate-hypatia-q1x1fd` created off `feature/Commissioning`.
- ✅ Feature-flag gating verified comprehensive.
- ✅ C1 and D1 verified first-hand.
- ✅ This domain doc set written (README, review-and-plan, design-legacy).
- ⏳ **No code fixes committed yet.** Next: C1.
- ⚠️ The `xyz-platform-context` repo push was **403 (policy denial)** in the sandbox — these docs may need to be committed from a local checkout with write access.
