# Project Types: Full-Progress vs Quality-Only

The `progressProject` flag on the project record (read from V2 API) splits all dashboard behaviour into two fundamentally different modes. Everything from which tabs appear to how the loading bar dismisses depends on it.

## Detection and storage

```
DashboardProjectProvider
  reads projectResponse.progressProject from V2 getProjectDetails
    undefined → fallback to V1 Projects.get(mongoProjectId)
    still undefined → default true
  stored as isProgressProject: boolean | null
    (null = still loading; blocks rendering until resolved)
```

**Rule:** `isProgressProject = (progressProject !== false)`. Only an explicit `false` value makes a project quality-only. Everything else — including missing/undefined — is treated as a full-progress project.

## Side-by-side comparison

| Aspect | Full-progress (`isProgressProject = true`) | Quality-only (`isProgressProject = false`) |
|--------|-------------------------------------------|-------------------------------------------|
| Tabs shown | PRG + QLT + CAP (+ SCH, RPT, DEV) | QLT + CAP only |
| Default tab on load | PRG | QLT |
| PRG service | Initialized on page load | Never initialized |
| QLT/CAP services | Lazy — initialize on first tab open | Eager — both initialize on page load |
| Filter options source | Parquets (discipline/package) + SCH categories | Issues' own `activityCategories` tags |
| Date range source | `dataDateRange$` from PRG parquets | Min/max of issue dates + capture dates |
| `_visible_elements` table | Materialized by PRG on every filter change | Never exists |
| Spatial filters | Shown (level, room, status, tracking type) | Hidden |
| 3D element colouring | Enabled (element-status parquet → theming) | Skipped entirely |
| Loading bar dismissal | `onColorsApplied` callback from color service | `MODEL_ROOT_LOADED` viewer event directly |
| Gantt area | Shown (collapsible) | Hidden (display: none), height = 0 |
| DateRange component | Rendered inside Gantt area | Rendered separately below the viewer |

## Why loading dismissal differs

For progress projects, the loading bar is dismissed by the **color service** after it finishes applying element colours. This is a reliable data-driven gate: colours are applied only after both the viewer geometry and the element status view are ready.

For quality-only projects, the color service is skipped entirely. Instead the loader dismisses on `MODEL_ROOT_LOADED`. This path has a known fragility: if the event fires before the listener is registered (e.g. on fast loads or viewer reuse), nothing dismisses the loader and the screen stays black. A defence-in-depth guard checks `viewer.model` immediately after registering listeners and calls the handler directly if the model is already loaded.

## Where this flag is set

The `progressProject` field is set in the project creation modal ("Project controls" toggle in Step 2) and in project settings ("Progress Capture" toggle). The label differs between creation and settings but both write the same backend field.

## 2026-10-30 — the name-based "V1" rule (from PLT-3406)

Separate from `progressProject`: a project whose **name contains `v1`** (case-insensitive,
`helpers/V1Rules/v1ProductionRules.tsx:2-3`) is treated as a legacy V1 project. It hides Open Editor,
Edit, Copy, Leave and Archive on the portfolio card (`ProjectCardMenu.tsx:119-166`), opens the legacy
PowerBI dashboard (`PortfolioPage.tsx:90-96`), redirects the new dashboard route there
(`dashboard-project-provider.tsx:247`) and makes the user dashboard-only (`userAuthorityUtils.ts:42`).
A missing Open Editor on such a project is by design; rename the project to undo it. Pitfall: support
"turns the V1 flag on" by naming, so a rename silently changes menus, dashboard and authorities.
