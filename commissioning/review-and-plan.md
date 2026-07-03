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

### C2–C10 — Carried findings, each re-verified first-hand. **The initial review was systematically pessimistic — most did not reproduce.**

| # | Finding | Verdict | Action |
|---|---------|---------|--------|
| C2 | Asset import "partial re-import drops assets" | **OVERSTATED** — `applyImport` (`asset-register-service.ts:57-69`) preserves all existing assets. Real behaviour: matched rows merge `{...asset, ...changes}`, so an omitted column / empty cell **clears that field** (serial-only sheet blanks manufacturer/model/location). Comments call it intentional ("spreadsheet is source of truth"). | **Product decision, not a bug.** Safer default (if wanted): drop `undefined`/empty fields from `changes` before merge. Not changed. |
| C3 | Two `localStorage`-corruption crashes | **NOT CONFIRMED** — both `asset-register-service` and `checklist-library-service` wrap `JSON.parse` in `try/catch` + `Array.isArray`, degrade to `[]`, and have adversarial tests. | none |
| C4 | Checklist import: token-only custom-row drop | **CONFIRMED** — `ChecklistImport.utils.ts:278` returned `cleanLabel(text)` even when it collapsed to `''`, never falling through to a valid `customText`; row dropped as `missingText`. | **FIXED** — fall through when `cleanLabel(text)` is empty. |
| C5 | Mis-link during linking mode | **CONFIRMED** (different mechanism) — the `armedRef` guard covers a stale start selection, BUT clicking an already-linked asset's chip (`selectLinkedElement`) fires the same selection pipeline and the armed effect commits *that* element to the asset being linked. | **FIXED** — `selectLinkedElement` returns early when `linkingAssetId` is set. |
| C6 | Linking mode leaks on panel close | **CONFIRMED** — `linkingAssetId` lives in ViewerProvider context; close button never cancels it and there's no unmount cleanup → re-arms on reopen and can commit a stale pick. | **FIXED** — unmount cleanup clears `linkingAssetId`. |
| C7 | `ChecklistStatusChip` crash on unknown status | **NOT CONFIRMED** — the status pipeline (`sanitiseStatuses` + `assertKnownStatus` + hook default) makes an invalid value unreachable. Defensive-nit only (a fallback would future-proof). | note only |
| C8 | RuleBuilder rule-wipe | **NOT CONFIRMED** — the wipe mechanism exists but is unreachable via the single always-mounted call site (shared React-Query key resolves before the dialog can open). Fragile coupling — re-check if a 2nd call site is ever added. | note only |
| C9 | Falsy-id filtering | **NOT CONFIRMED** — link stores key off non-empty UUIDs / viewer selection keys; no `.filter(Boolean)` drops a valid id. | none |
| — | Isolation-restore leak | **NOT CONFIRMED** — both isolation hooks use a correct `hasIsolated`-ref + `return restore` cleanup. | none |
| — | `mapAnswerType` uses `value.includes('custom')` (substring, no word boundary) | **LATENT FRAGILITY** — a future FG Answer Type containing "custom" as a substring would be misclassified. Rides on an unverified FG-schema invariant. | note — consider an allow-list |

**Net:** of 9 carried findings, **3 confirmed & fixed (C4, C5, C6)**, 1 is a product decision (C2), 5 did not reproduce. The PO's code was more robust and better-tested than the initial pass implied.

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
