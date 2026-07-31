# PLT-2911 — Validate project weighting is Labour Hours before enabling Portfolio

**Type:** Task · **Project:** PLT
**Jira status (2026-07-25 run):** **Dev In Progress** → implemented.
**Confidence:** HIGH (self-contained, frontend-only, data already in-form).
**Branch:** `PLT-2911` off `origin/master`. Draft PR opened.

## What the ticket asks
When a user enables "Show in Portfolio" ("Included in Portfolio Dashboard") for a project,
check the project's progress weighting type. Only allow if weighting = **Labour Hours**
(`PLANNED_LABOUR_HOURS`). If not (e.g. Element Count), block the enable and show a clear
message telling the user to change the weighting first. Portfolio-enabled state must stay
unchanged when the check fails.

## Domain (verified in hc-frontend)
Top-level domain = **PortfolioPage → ProjectSettings modal → General tab (edit view)**.
- Editable toggle: `src/main/webapp/app/pages/PortfolioPage/components/ProjectSettings/GeneralTab/GeneralTabEdit.tsx`
  - portfolio `Checkbox` field `isPortfolioEnabled` (~L442-, behind `Portfolio-Dashboard` FF `getFeatureFlagValue`).
  - weighting radio field `progressWeightingMethod` in the SAME `useForm` (`FormRadioGroup`, ~L434).
  - save is batched on the "Save" button → `onSubmit` → `useUpdateProjectMutation` → `ProjectApiV2.updateProject`.
- Weighting enum: `app/types/progress-weighting-types.ts`
  - `ProgressWeightingType.PLANNED_LABOUR_HOURS` ("Budgeted labour units" label) vs `LINKED_ELEMENT_COUNT` ("Model element count").
  - **Default when unset = `LINKED_ELEMENT_COUNT`** (`useProjectQuery.ts`, form default L96-97) → such projects are blocked (correct per AC).
- Reused: `useToastService().showToast` (already imported), `Badge variant='warning'` (already imported), `useWatch` (RHF).

## Implementation (this run)
All in `GeneralTabEdit.tsx` (+ new test). No new deps / API / components.
1. `PORTFOLIO_WEIGHTING_WARNING` message constant (references the `PLANNED_LABOUR_HOURS` UI label).
2. `useWatch` on `progressWeightingMethod` → `isLabourHoursWeighting` (reads LIVE form value so a same-session weighting change is honoured — avoids false block).
3. Portfolio checkbox `onChange`: if enabling & not Labour Hours → `showToast(warning)` + early return (leaves toggle unchanged). Else normal `field.onChange`.
4. Inline warning `Badge` in the genuine conflict state only (`field.value && !isLabourHoursWeighting`) — avoids noise, since element-count is the default for many projects.
5. `onSubmit` guard: block save if `isPortfolioEnabled && weighting !== PLANNED_LABOUR_HOURS` (covers switching weighting away AFTER enabling).
6. New test `GeneralTabEdit.test.tsx`: blocks + warns on element-count; allows on labour-hours.

## AC → coverage
- check on attempt → onChange guard ✓
- labour hours proceeds → else branch ✓
- non-labour blocked/not added → early return ✓
- clear message + change weighting first → toast + badge ✓
- portfolio state unchanged on fail → early return (no field.onChange) ✓

## Notes / decisions
- Message uses the exact radio label ("Budgeted labour units") the user must change — more actionable than the biz term "Labour Hours".
- Non-destructive: switching weighting away while portfolio is on is NOT auto-unchecked; badge + submit guard handle it. If product prefers auto-uncheck, easy follow-up.
- Purely FE guard; no backend endpoint enforces it (matches the ticket's UI-behaviour framing).

## Next run
- If CI/build is green and PR approved, nothing more. If reviewers want auto-uncheck on weighting change or a different message tone, adjust in `GeneralTabEdit.tsx`.
