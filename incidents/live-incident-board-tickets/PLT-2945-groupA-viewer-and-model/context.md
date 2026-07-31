# PLT-2945 — "Elements missing in the Dashboard for DUB7x" — triage context

## Ticket

| Field | Value |
|---|---|
| Key | PLT-2945 |
| Summary | Elements missing in the Dashboard for DUB7x |
| Status | With Customer |
| Priority | Minor |
| Project | DUB7x |
| Freshdesk | #7556 |
| Reporter | Conan Abrahams (customer), relayed by Murray Hendriksen / Yash Patel |
| Assignee | Rishi Bhugobaun |
| Awaiting | Confirmation from Ilia Kuzmin / Mostafa Hussien (asked 2026-07-30T14:01, still unanswered as of 2026-07-31) |
| Verdict (this analysis) | **Expected behaviour — not a bug.** Claim #1 confirmed in code; claim #2 unverified |
| Confidence | 8/10 |

## Description + comments

**Customer report (Conan Abrahams, via Freshdesk #7556):** elements are visible, linked and captured correctly in the Web Viewer, but some elements are missing / not visible in the Dashboard. Two example elements given:
- Floor [3122319], Element ID `80a61e7f-a5b8-48ff-9203-d390bb98b462-002fa48f`
- Floor [1482819], Element ID `1b9fe7c4-b330-4ef8-8aa0-e9ab6aba3b1e-0016a043`

Both IDs independently verified as consistent Revit `sourceFileElementId`s — the hex suffix decodes to the bracketed number in each label (`002fa48f → 3122319`, `0016a043 → 1482819`). So both reported elements really are Floors and the IDs are trustworthy. **They are Revit-path external IDs, not `modelElementId` UUIDs** — anyone doing a live lookup must map through `project_element_list` on `sourceFileElementId` first; querying `element_base_data` with these strings directly returns nothing and would look like a false confirmation of "missing".

**Rishi Bhugobaun, 2026-07-30T14:01 (verbatim — this is the crux):**

> "as far as I can tell this is expected behaviour and an intended difference between Editor and Dashboard [link: Confluence 'Dashboard Progress Tab Explained' §3 'The "reference date" and the date slider']. The elements in question have planned start date of 14/08/26. The Editor does not hide elements based on their planned date. The Dashboard only shows planned elements once the 'End date' slider reaches the planned start date — if you drag it to the 14th these elements appear. The top-left arrow on the screenshots is indicating different elements — the Dashboard shows a Basic Roof, whilst the Editor shows a Floor — the Roof element is not in the loaded model."

He then @-mentioned Ilia Kuzmin and Mostafa Hussien asking for confirmation. **No reply yet.** Yash then set the Freshdesk status to "Waiting on customer" — not established whether the customer has already been given this explanation, or whether that was queue management only; do not assume either.

**Two independent claims are bundled in that comment and are judged separately below:**
- **Claim #1 — date-slider mechanism:** the Dashboard hides not-yet-planned elements; the Editor does not.
- **Claim #2 — different element:** the arrows in the two screenshots point at different underlying elements (Basic Roof vs Floor), and the Roof "is not in the loaded model".

## Attachment/media inventory

| File | Source | Status |
|---|---|---|
| `Dashboard.png` | Jira attachment-content URL | ❌ Not openable here — auth-gated. Contents not inspected, not guessed. |
| `Web Viewer.png` | Jira attachment-content URL | ❌ Not openable here — auth-gated. Contents not inspected, not guessed. |

Consequence: the "top-left arrow" in claim #2 cannot be checked from here. Claim #2's resolution depends on these two images or on a live element lookup.

## Domain context

| Reference | What it gives |
|---|---|
| `dashboard/viewer-and-model.md` § `displayDate` (:188-197) | The mechanism, documented, including that inclusion uses the raw slider end date while status classification uses the capped `refDate` |
| `dashboard/viewer-and-model.md` § Selective fragment loading, § Element colouring, § Element tooltips | Dashboard builds its visible set from status and hides the rest; tooltip resolution is selection-driven |
| `dashboard/viewer-and-model.md` § Viewer contexts (:7-11) | Dashboard vs ViewerPage differ deliberately by design — see Code references for a flagged discrepancy on the "Selection DISABLED" row |
| `planning/dashboard-progress-tab-explained.md` §3 (:58-69) | Local copy of the Confluence page Rishi cited — confirms his wording nearly verbatim |
| `planning/dashboard-progress-tab-explained.md` §6 FAQ, §8.4 (:122, :147) | Already documents the **project-level** version of this exact confusion: *"Future-dated projects show a blank/all-yellow model by default if the date slider's end sits before the schedule starts"* |
| `dashboard/progress-tab.md` § Filter → recalculation flow (:61-74) | `_visible_elements` is shared, so this also scopes Quality and 360 tabs |
| `dashboard/flt-filter-system.md` | `dateRange` is a global filter affecting all tabs |
| `incidents/recurring-defect-patterns.md` Pattern 2 + candidate patterns | Classification — see Diagnosis below |
| `dashboard/pitfalls.md` | svf2-object-id-map is Navisworks-only; dashboard loads exactly one federated model — both bear on claim #2 |

## Code references

All paths relative to `hc-frontend/`. Branch `claude/vigilant-franklin-q3mayf`, HEAD `8d8db2d`.

### Claim #1 — date-slider hides not-yet-planned elements: CONFIRMED, both halves

**a) The Dashboard filters elements by planned start against the slider's end date.**
`.../ViewerPage/components/services/dashboard-progress/dashboard-progress-service.ts:1909-1924`:
```
displayDateExpr = CASE WHEN installed AND checkDate IS NOT NULL
                    THEN LEAST(checkDate, startDate) ELSE startDate END
dateRangeConditions.push(`${displayDateExpr} <= '${dateRangeEnd}'`)
```
Comment at `:1920-1923`: *"Use the raw dateRangeEnd (NOT refDate) so dragging the slider past today reveals yellow Planned elements... The refDate cap is only for status classification, not for inclusion."* That is the exact fact behind "if you drag it to the 14th these elements appear" — inclusion is deliberately uncapped. `dateRangeEnd` sourced from `filters.dateRange.endDate` (`dashboard-color-service.ts:511`, `:755-757`). `startDate` for an element = `MIN(activity startDate)` over linked activities (`:2451`) — matches "planned start date".

**b) Excluded elements are hidden, not just uncoloured.** `dashboard-color-service.ts:679-690 → :453-491`: `_applyFragmentVisibility` sets `fragList.setVisibility(fragId, false)` (`:488`) for anything not in the date-filtered set. **This favours the customer's wording** — "missing" is literally accurate, the geometry disappears, it isn't merely uncoloured. A reply implying otherwise would be contradicted by their own screenshot.

**c) Default slider end = today**, so a 14/08/26 element is hidden by default. `dashboard-progress-service.ts:299-301` (`cappedEndDate = min(scheduleMax, today)`); `date-range.tsx:140-144` (initial selection: end = min(today, data end)). Today is 2026-07-31 → `14/08/26 <= 31/07/26` is false → excluded. Consistent with the report, no residual gap.

**d) The Editor has no equivalent hide.** Exhaustive negative check: `setVisibility(` appears in exactly two places app-wide — `dashboard-color-service.ts:479/488` (the Dashboard) and `CanvasPage/.../ForgeViewerStatic.ts:308/454` (Canvas, unrelated surface). **No fragment-hiding code exists on the ViewerPage/Editor path.** Positive check: the Editor colours every element in every loaded model unconditionally (`services/linking/linking-service.ts:838-859`), and its status resolution (`installation-status-utils.ts:48-100`) falls through to `PLANNED_STATUS` for anything schedule-linked regardless of how far out (`:94-96`). So a 14/08/26 Floor is yellow and visible in the Editor.

**Net: claim #1 is real, intended, documented, correctly described.** Two caveats for any customer wording: (i) there's a second condition `endDate >= dateRangeStart` (`:1918`) — moving the *start* forward can re-hide it; (ii) `_visible_elements` is shared with Quality/360, so those tabs are affected too. Useful detail: `date-range.tsx:364-379` has a **"Next 2 weeks"** preset (button `:540`) that sets end = today+14 = exactly 14/08/26 — reproduces Rishi's fix in one click.

### Claim #2 — Basic Roof vs Floor: NOT VERIFIED — three candidate mechanisms, cannot discriminate without the screenshots

1. **Most parsimonious — a consequence of claim #1, not a separate finding.** Hidden fragments drop out of hit-testing, so a click lands on whatever's visible behind the hidden Floor — plausibly a Roof. Dashboard tooltips are selection-driven (`dashboard-element-tooltip.tsx:112-157`), not hover.
   *(Aside, not material to this ticket but worth a docs fix: `viewer-and-model.md:10` records Dashboard selection as `DISABLED`, but the model-loader path actually feeding the current Dashboard route — `use-model-loader.tsx:28-52` — sets no selection mode at all, while a separate, older `viewer-service.ts:167` still does gate it behind an `_isDashboard` flag via the shared `viewer-y.tsx` component. **Which of these two paths the live `/projects/:id/dashboard` route actually uses was not resolved in this pass** — flagging as an open question rather than editing the doc on unconfirmed evidence.)*
2. **Genuinely different loaded geometry — makes Rishi's literal words true.** The Dashboard loads exactly one federated model (`use-model-loader.tsx:307-317`, `activatedModels[0]`, first model in the first folder named "federated", no ordering guarantee — `pitfalls.md`), with geometry restricted at download time to `element_base_data` dbIds (`:249-250`). The Editor loads whatever the user has activated, which can differ. "Present on one surface, absent on the other" is real in both directions here.
3. **Lower-probability mislabel, flagged not asserted.** `dashboard-element-tooltip-service.ts:226` resolves the display name via `SELECT modelElementId FROM element_base_data WHERE objectId = ${dbId} LIMIT 1` with no `ORDER BY` — if any `objectId` maps to >1 `modelElementId`, the shown name is arbitrary. Not established to occur on DUB7x; the known federated-model duplication (PLT-2874) runs the harmless direction (one element → many objects). Cheap to rule out with one query; do not put in front of the customer.

As phrased, claim #2 is internally inconsistent — the Dashboard cannot be *displaying* a Roof that is "not in the loaded model". Most likely (1), or Rishi meant "not in the **Editor's** loaded model" (2).

### Regression check

`git log -S "displayDateExpr"` returns one commit (2026-07-07) but the checkout is shallow (50 commits, oldest 2026-07-07) — introduction date cannot be established from this repo. Code comments describe it as "PowerBI parity", matching the documented Confluence design; recent commits touching these files (PLT-2736/2795/2821/2892) don't touch the date filter. Best available evidence: long-standing and intentional, not a regression.

## Diagnosis

**Claim #1 is correct, and slightly understated.** The Dashboard applies a deliberate `displayDate <= sliderEndDate` gate and then hides the geometry of everything outside it; the default slider end is today, so 14/08/26-planned elements are invisible on a 31/07/26 default view. The Editor applies no such gate anywhere and renders those elements yellow/Planned. **This is PowerBI-parity behaviour, documented in the Confluence section Rishi cited. Not a bug, no dev work needed.**

Two corrections before this reaches the customer:
1. Say "hidden", not "not coloured yet" — the geometry is genuinely removed from view.
2. **Claim #2 is not established** and is internally inconsistent as phrased — recommend dropping it from the customer-facing reply and keeping it internal until the screenshots settle it. Claim #1 alone fully explains the customer's report.

**One unverified data premise:** that these two elements actually have a planned start of 14/08/26. Reasonable to trust (Rishi presumably read it off the Editor/schedule) but it's the one load-bearing fact not independently checked here, and it's one query away from certain.

**Pattern classification — new shape, not Pattern 1 or 2.** Not Pattern 2 ("frontend faithful renderer, wrong number upstream") — there's no wrong number and nothing to route to a data owner; the frontend is doing exactly what it was specified to do. Not Pattern 1 (dead links) — the elements resolve fine and appear when the slider moves.

**Proposed candidate pattern** (added to `recurring-defect-patterns.md` this run): *"Surface-scoped visibility rule mistaken for missing data"* — one surface applies a deliberate visibility filter (temporal here) that a comparison surface doesn't; the customer diffs the two and reports data loss. Already has a sibling occurrence: the project-level version in `dashboard-progress-tab-explained.md` §8.4. Recognition signature: *"visible in the Editor/Web Viewer but not the Dashboard" with no numeric discrepancy* — check the date slider before anything else.

**Product observation:** the mechanism is correct but silent — the Dashboard gives no indication that N elements are hidden by the slider. Every recurrence of this ticket class is generated by that silence, not a defect. Worth a low-priority UX ticket; not a blocker for closing PLT-2945.

## Confidence

**8/10** — high confidence, minor unknowns. Claim #1 confirmed line-by-line on both halves (Dashboard hides; Editor demonstrably has no hiding path anywhere in the app), matches the cited Confluence section, and the default-today slider makes the dates fit with no residual gap. Held below 9 because the elements' planned-start date is Rishi's observation rather than independently verified, and claim #2 is unverified/self-contradictory as worded. Neither weakens the core verdict.

## Recommended action (drafted, not executed)

See `recommended-action.md` in this folder.
