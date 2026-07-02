# Commissioning (domain)

New **flag-gated MVP** feature on hc-frontend: catalogue a project's physical assets, attach commissioning checklists, link assets/asset-types to 3D elements, and track handover readiness. Built by the product owner (workable MVP, not senior-reviewed). **Persistence is `localStorage` only** — no backend yet, and that's an accepted MVP trade-off.

Everything is gated by the **`Commissioning`** feature flag (`src/main/webapp/app/config/constants.ts`, default `false`) — with the flag off, master behaviour is unchanged.

## Docs

| Doc | Covers |
|-----|--------|
| [review-and-plan.md](./review-and-plan.md) | **Start here.** Skeptical senior review: verified defects, findings by confidence, the fix plan/checklist, and the current branch state. The durable record for resuming this work. |
| [design-legacy.md](./design-legacy.md) | The design-token reinvention problem and the reuse plan (align with Editor/Dashboard token usage). |

The **product owner's** own feature docs live in the app repo at `docs/commissioning/` (`README.md`, `asset-register-and-3d-linking.md`, `checklist-library.md`, `PLT-2838-dashboard-handoff.md`) — describe intended behaviour. This domain folder is the **review + remediation** layer on top.

## Sub-domains

- **Assets** — asset register (`/assets`, import, detail), asset types, asset↔3D linking (per-asset instance links + type-level rule links).
- **Checklists** — reusable checklist/task library, form-builder editor, FacilityGrid `.xlsx` import, Task Library tab in Project Settings.
- **Viewer panels** — the in-viewer **Assets** left panel (link/unlink/focus, isolation modes) and element-properties linking sections.
- **Dashboard tab** — the **Commissioning** dashboard tab (readiness rollup). ⚠️ see review-and-plan.md C1.
