# PLT-2932 — Imperial units for Observed Discrepancy on issues

**Type:** Task · **Domain:** Web viewer → Issues
**Jira:** https://xyzreality.atlassian.net/browse/PLT-2932 · **Origin:** DIGP-1397 (customer, FAR01/FAR02)

**Status after 2026-08-24 run: `Analysis In Progress`, clarification comment posted. Not started.**

---

## 2026-08-24 — investigation, parked on design

### What the field is today

`observedDiscrepancy` is a single **unitless `number`**, end to end. There is no unit column
anywhere — mm is hard-coded into the UI in exactly two places:

| Layer | File | Note |
|---|---|---|
| Domain model | `shared/model/project/issue.model.ts:158` | `observedDiscrepancy?: number` |
| V2 API DTO | `services/issueService/issue-api-service.types.ts:90,128` | same |
| View model | `services/issueService/issue-view-model.ts:66` | same |
| Form ↔ API | `services/issueService/format-issues.ts:107,159` | straight pass-through |
| **Create/edit form** | `.../issue-properties/blocks/issue-form.tsx:592-600` | label **`Observed Discrepancy (mm)`** |
| **Details panel** | `.../issue-properties/blocks/issue-details.tsx:147` | renders **`${v} mm`** |
| Quality dashboard | `dashboard-quality/utils/quality-sql-queries.ts:217,285`, `quality-data-mappers.ts:72`, `types.ts:31` | parquet column `observedDiscrepancy DOUBLE` |

### The precedent that almost certainly decides it

The app **already has** a project-level unit system, used for coordinates:

- `IProject.measurementType?: IMeasurementType` — `'Metric' | 'Imperial'`
  (`shared/model/project/project.model.ts:9,66`), set in the project-create wizard
  (`ProjectCreateModal/Step2Content.tsx`) and Project Settings → General.
- `helpers/coordinateUnitConversion/coordinateUnitConversion.ts` — **DB is always metric**, the
  UI converts at the edge. Exact constants via `decimal.js` (`FEET_TO_METERS = 0.3048` exact),
  plus `getCoordinateUnitLabel` / `getCoordinateUnitAbbreviation` for the label swap.
- Consumers show the pattern: `coordinates/coordinate-edit.tsx:29` reads
  `projectService.getProjectDetails().measurementType` and converts.

**`projectService` is already in scope in the issue form** — `use-issue-form.ts:105` destructures
it from `useProject()`. So the project-level option is a small, well-precedented FE-only change.

### Why it was parked rather than built

Two readings of the ticket, and they differ by *whether backend work is needed at all*:

- **Option A — follow `measurementType`.** Imperial project → label `(in)`, input in inches,
  convert to mm on save / back on load. FE only, no BE, no parquet change, Quality dashboard
  keeps one unit. **Recommended.**
- **Option B — a per-issue mm/in picker.** Needs the unit stored → PAPI field + parquet/DuckDB
  schema change + a decision on what Quality aggregates. **No PAPI ticket exists for this.**

The ticket description is literally `"See designs   "` and both design sources are unreachable:
the attachment `Observed Discrepancy Imperial (standalone).html` (1.4 MB, attachment id 61324)
needs Jira auth the MCP does not expose, and the DIGP-1397 link
`https://claude.ai/design/p/7b76b4cb-…` returns **403** to `WebFetch` and is rejected by the
`Artifact` tool (`not an artifact URL` — it wants `…/code/artifact/<uuid>`).

### Questions posted on the ticket

1. Project `measurementType` (A) or per-issue picker (B)?
2. If B — who raises the PAPI ticket, or is the entered unit display-only?
3. Imperial format: decimal inches, feet+inches, or fractional inches? (Match the Atom's output.)
4. Does the change follow to the details panel / Quality dashboard / exports / BIM360, or only
   the create-edit form?

### Next run

If someone has answered: A is roughly a day — swap the label via a
`getDiscrepancyUnitAbbreviation`-style helper beside the coordinate one, convert in
`format-issues.ts` (both directions), and mirror the label in `issue-details.tsx:147`. Watch the
Quality dashboard: it reads the **stored** number, so if storage stays mm, nothing there changes.
