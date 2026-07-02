# Commissioning — design-legacy & token reuse

## The problem
The PO built the Commissioning UI from a legacy Figma design and, in places, **reinvented the design system** instead of reusing the app's. Verified first-hand:
- `commissioning-dashboard/cx-tokens.ts` (and a second bespoke CX token set) **hardcode** colours/spacing, with comments admitting they "mirror `theme.ts` darkColors". So the same palette exists twice, drifting independently.
- Bespoke px spacing/typography rather than the app's scale.

Meanwhile the app already exposes a coherent system used consistently across **Editor** (`/projects/:id/editor`) and **Dashboard** (`/projects/:id/dashboard`):
- **Colour:** MUI `theme.palette.base.*` tokens (e.g. `grey700/800/900`, `brandPortland`, `detection500`, `secondaryGlow`). Panels reference these, not raw hex.
- **Components:** shared MUI wrappers + reactstrap + the in-repo `components/` (checkboxes, filter groups, chips, drawers). Dashboard panels reuse `theme.palette.base.*` in `sx`.
- **Typography/spacing:** Roboto, consistent font-size/line-height/letter-spacing patterns; spacing via the theme scale.

## Goal
Consistent, reusable design legacy: the Commissioning surfaces should look native to the app and inherit theme changes automatically — no parallel token set.

## Reuse plan
1. **Map CX tokens → theme.** Replace `cx-tokens.ts` colour constants with `theme.palette.base.*` references; delete the bespoke set once the dashboard tab is on the real panel (see review-and-plan C1). Where a CX colour has no theme equivalent, add it to the theme, not a local file.
2. **Standardise spacing/typography** to the app scale (match the Dashboard panels' `sx` conventions — Roboto, the existing size/line-height steps, theme spacing units) instead of bespoke px.
3. **Reuse shared components** for fields, toggles, chips, drawers, and list rows rather than one-off CX equivalents — the same primitives the Dashboard/Editor panels use.
4. **Keep the CX visual design as the target**, but implement it with app tokens/components. The prototype's *look* is fine; its *implementation* (hardcoded tokens + sample data) is the problem.

## Reference — where to copy patterns from
- Dashboard panels: `ViewerPage/components/dashboard-panels/*` (token usage in `sx`, panel scaffolding, scrollbar styles).
- Shared filters/components: `app/shared/components/filters/*`, `ViewerPage/components/common/*`.
- Theme: `theme.ts` / `theme.palette.base.*`.

> Do this as a **controlled pass** — there's no Playwright harness, so token/spacing sweeps can regress visuals silently. Change one surface at a time and verify in a real browser.
