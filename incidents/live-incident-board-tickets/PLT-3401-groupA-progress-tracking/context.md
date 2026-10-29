# PLT-3401 — S-Curve not functioning as intended (TXE2, Baseline figure "does not make sense")

First folder 2026-10-29. Live Incident, **Blocker**, assignee Ilia, reporter Yash. Created 10-28 17:20 UTC, status **Open**. Fetched live, 1 comment, 2 attachments. **Nobody has replied since Mostafa's comment at 17:22 on 10-28 (about 14 hours at run time). The ball is with Ilia.**

## What the ticket says
- Description: Issue type Dashboards, project **TXE2**, "The Baseline figure does not make sense in the S-Curve", two screenshots.
- Mostafa (`116891`, tags Ilia): "they have set the baseline to be the same schedule as the baseline [sic, most likely *active*] and it's not showing correctly on the s curve. Project is txe2". Two inline screenshots (the attachments `66919`, `66920`, uploaded by Mostafa).
- Not yet clear: whether the customer ticked **Baseline** and **Set as active** on the same schedule revision, what the Baseline line looks like against Planned, and what "does not make sense" means in numbers. All of that is probably in the unreadable screenshots.

## Domain
S-curve = the Progress panel trend chart (Baseline, Planned, Actual series). `dashboard/progress-tab.md` (Baseline line "optional third series"), `dashboard/schedule-tab.md` § 2026-09-03 (Baseline vs Active; `isBaseline` drives only the baseline curve, baseline numbers are a backend artefact). Known family: Pattern 2 (frontend renders what the backend gives) and Pattern 3 (check settings before data).

## Code facts (verified by reading hc-frontend `2790229`, 2026-10-28; call sites checked)
1. The Baseline series is a pass-through of one backend column, **`LaborWeightedBaselineProgress`**, in `project_progress`: project-level trend `dashboard-progress/utils/progress-queries-v2-api.ts:363` (`COALESCE(NULLIF(LaborWeightedBaselineProgress, 0), 0)`), overview delta `:143,:153,:162`. The Planned and Actual series use **the weighting config's columns** (`config.plannedProgressColumnName`, `:361-362`, `:141-152`).
2. The config default is the labour columns (`types/progress-weighting-types.ts:33-34`) but the project can be on `LINKED_ELEMENT_COUNT` ("Model element count"), where the planned/actual columns come from the weighting API (`progress-weighting-types.ts:2-5,24-25`). **Inference:** on a project using element-count weighting, Baseline (labour-weighted) and Planned (element-weighted) are on different weighting bases, so two lines from the same schedule would not coincide. In package-level mode the baseline uses the same weight column as planned (`:235-255`, `:456-464`), so the two modes may disagree with each other too.
3. The legend only gets a Baseline entry when `hasBaselineSchedule` (`use-progress-panel-data.tsx:53-66`), which is `schedules.find(isBaseline)` (`shared-data-loader.ts:59`). No activity-level baseline exists (`progress-queries-v2-api.ts:656,790`).
4. The chart normalises bars to the maximum daily increment across the three series (`use-progress-panel-data.tsx:89-113`), so a baseline with a large spike flattens the other bars. That is display behaviour, not a data fault.

## Hypotheses, each as a prediction (none measured)
- **H1: weighting mismatch.** If TXE2 is on Model element count, Baseline differs from Planned even though both come from one schedule. Prediction: Progress weighting settings for TXE2 say "Model element count" (or Weighted labour units) and the Baseline curve matches the Planned curve once the project is switched to Budgeted labour units. One settings look settles it.
- **H2: the backend baseline parquet does not follow the flagged revision** (`dashboard/schedule-tab.md` flagged exactly this as unverified). Prediction: Baseline differs from Planned while the weighting is labour-based and the two flags sit on one revision. Backend question (Ali/Sachin), only after H1 is ruled out.
- **H3: the customer re-flagged the baseline after the last calculation**, so the parquet has not been regenerated. Prediction: `calculatedOn` (Progress panel "Last updated", which is not a reliable freshness test, `recurring-defect-patterns.md` 10-08) is older than the flag change.
- **H4: expectation, not defect.** Two lines on one schedule overlap by design and the customer reads the overlap as "baseline missing/wrong".
None is killed. No earlier run saw this ticket.

## Not verified
TXE2's weighting method, schedule flags and last calculation time; what the screenshots show; whether the baseline parquet is built from the flagged revision; whether the issue appears at package level too.

## Unopenable media (403 from this routine, confirmed 09-08)
Attachments `66919` (`image-20261028-172125.png`, 98 KB) and `66920` (`image-20261028-172213.png`, 15 KB), both by Mostafa, plus the two inline images in the description. Would settle: what "does not make sense" means (flat, above Planned, going down, wrong start date) and whether the second image is the schedule-flags form. **Ilia: drop both PNGs into this folder.**

## Class
Class 1 with a class-3 shape. Ilia owes the first response. Nothing proven, so no Ready for Dev and no code branch.
