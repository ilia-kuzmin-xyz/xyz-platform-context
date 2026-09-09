# Block Inspector — per-block data lineage (PowerBI-style field well)

> **Status: BUILT — draft PRs open 2026-09-10.** See the dated section at the
> foot of this file for what shipped and where it differs from the plan below.
> Ticket: **PLT-3117**. Branch `PLT-3117` on both repos.
> - pipeline: XYZReality/XYZ_InfiniteCanvasAgentPipeline#17
> - frontend: XYZReality/hc-frontend#2212
>
> Plan agreed 2026-09-09. Prototype: Claude Design "Report Tool Prototype".

## Problem

A finished report shows blocks (KPI tiles, tables, bars, viewer) but nobody — planner or
developer — can tell which entity, table or columns fed a given block. When a number looks
wrong there is no way to check the binding short of reading the generated TSX.

Desired UX (from the prototype): click a block → a sidebar opens showing its **source**
(entity · table), the **columns** it uses with types, its **filter / sort / limit**, and the
fields available on that source but unused. Later: re-bind fields in place.

**Priority order agreed with product (09-09):**
1. Detect and *show* the data schema per block (this plan).
2. Re-bind / tweak in the sidebar — later.
3. "Ask about this block" — not a priority; the existing chat edit already covers it.

## Why the frontend cannot do it alone (verified 2026-09-09)

- The composer emits one self-contained `App.tsx`; the sandbox hands it the whole hydrated
  payload as `data.json` → `props.data` (`ArtifactSandpack.tsx:34-55`, `:419-445`).
- A block's numbers come from free-form JS inside that TSX (`data.issues.issues.filter(...)`).
  Generated TSX never writes SQL — the DuckDB bridge (`canvas-sql-request`) is used only by
  the prebuilt ForgeViewer (`viewer_queries.py`).
- Block identity is a `data-panel="<kebab>"` attribute (`artifact_composer.py:967-971`),
  text inside the TSX string — never parsed server-side, never sent as data
  (`PanelSelectionOverlay.tsx:64-77` reads it from the iframe DOM).
- Provenance today: `domainsRead` per **report**, `hydrationProvenance` per **domain**.
  Nothing per block. The composer envelope is a hard-coded 5-key dict
  (`parse_artifact_output`, `artifact_composer.py:1993-2001`); any extra key is dropped.
- The room-readiness template artefact (`reference/room-readiness-artifact.tsx`) has **zero**
  `data-panel` attributes — not even selectable today except via the DOM heuristic.
- Reverse-engineering field usage from generated JS (destructuring, aliases, computed values)
  is brittle and gives nothing to re-bind against. The lineage must be **authored at compose
  time**. Precedent: the pre-TSX v1 `WidgetQuery {tool, params, transform.fields…}`
  (`canvas.types.ts:13-28`).

## Decision

The composer declares a **per-block binding manifest** alongside the TSX. The frontend renders
it and verifies it against the payload it already holds. Pipeline change is small and additive;
the report itself renders exactly as before.

### Manifest shape (per `data-panel`)

```json
{ "id": "top-issues", "kind": "table", "source": "issues.issues",
  "fields": [ {"path":"title","as":"Title"}, {"path":"severity","as":"Severity"},
              {"path":"category","as":"Area"}, {"path":"assignee","as":"Owner"},
              {"path":"days_open","as":"Age"} ],
  "filter": [ {"field":"status","op":"neq","value":"Closed"} ],
  "sort": {"field":"days_open","dir":"desc"}, "limit": 5 }
```

- `source` is a name from a fixed **source catalogue** (below). A block may list several
  sources (`sources: [...]`) — narrative/verdict blocks mix progress + issues + media; the
  manifest must adapt to the design, never the reverse.
- `kind` is descriptive (table / kpi / bars / chart / viewer / narrative), not a constraint.
- Put `blocks` **before** `tsx` in the envelope so a truncated response never loses the
  manifest silently.

### Source catalogue (static, no LLM)

Three levels of "where from", for different readers:

| Level | Example | Shown |
|---|---|---|
| Entity (planner vocabulary) | Issues · Schedule activities · Progress · Rooms · 360 captures · Photos · Model elements | big, like PowerBI's table name |
| Table within entity — raw rows vs rollup | `issues.issues` (rows) vs `issues.by_severity` (hydrator aggregate) | sub-line — the thing people get wrong |
| Origin | `xyz_get_projects_project_id_issues`, `element-status.parquet`, DuckDB view `activity_links` | collapsed / hover, for developers |

The catalogue is a transcription of the profiler's existing `schema` dicts
(`profiler.py:222-238` progress, `:366-384` issues, `:478-496` schedule, `:716-739` media) plus
the rooms payload documented in `report_templates.py:102-120`. Types and enum values
(`severities[]`, `categories[]`) come from the same profile.

## Agent pipeline changes (MVP only)

**Only one agent changes: the composer.** Profiler, hydrators, resolver, clarifier, viewer
mapper, rooms — untouched. No new agent; the catalogue is data.

| Where | Change |
|---|---|
| `artifact_composer.py` §1 output format (`:167-186`) | envelope gains `blocks: [...]`, placed before `tsx` |
| `artifact_composer.py` §8 panel rule (`:967-971`) + self-check (`:985`) | every `data-panel` has a `blocks` entry; `source`/`fields` must be catalogue names |
| `artifact_composer.py` EDIT prompt (`:1334-1348`) | inject prior `blocks` with prior TSX; require the full updated manifest back |
| `parse_artifact_output` (`:1993-2001`) | accept `blocks`; validate each entry against the catalogue; drop invalid entries with a warning; **never fail the artifact because of the manifest** |
| `server.py` `artifact_skeleton` (`:1565-1573`) | carry `blocks` next to `domainsRead` |
| `thread_store.py` `last_artifact` | keep `blocks` so EDIT turns stay consistent |
| `report_templates.py` + `reference/room-readiness-artifact.tsx` | add `data-panel` ids; hand-written `blocks` manifest served with the artefact (composer is skipped on the template path) |
| profile → FE | ensure the per-domain `schema` dicts ride the `data_profile` event unstripped |

Deliberately **not** in the pipeline: row counts and binding verification (FE, against the
payload it already holds); any re-bind logic; side fixes found on the way (`tokens_css` never
emitted over SSE; dead `viewerConfig` read at `server.py:1593`; `rooms` missing from the
`ProjectData` contract) — tracked separately.

### Chain

1. Profiler → `data_profile` SSE → FE holds field types + enum values per source (unchanged).
2. Composer prompt: allowed sources + "every `data-panel` has a `blocks` entry".
3. Composer streams `{summary, title, domains, blocks, tsx}`.
4. Parser validates `blocks`; invalid entries dropped with a warning; artifact unaffected.
5. Server emits `artifact_skeleton {…, blocks, tsx}`; thread store saves `blocks`.
6. Hydrators stream payloads exactly as today.
7. FE: click a `data-panel` → `blocks[id]` → sidebar; counts computed locally.
8. Template path: composer skipped, static manifest served with the artefact.

### Loading-time assessment

- Composer: +600–1,000 output tokens per report (~10 blocks), no extra call → ≈ +5–10 % of
  compose time (~10 s on a 2–3 min run). Thinking cost marginal — it already chooses these
  fields, it now writes them down.
- EDIT turns: +~1k input tokens. Negligible.
- Parser / server / thread store: ~0. Templates: 0 (no LLM). Hydration and compose∥hydrate
  parallelism unchanged; nothing new on the critical path before compose starts.
- FE sidebar: client-side filter over the payload, milliseconds.

### Report-quality assessment

- Design freedom untouched — the manifest describes bindings, not layout.
- Likely improvement: declaring `source`/`fields` is "show your work"; hallucinated paths that
  render silently as empty/`NaN` today get caught by the parser.
- Risk 1 — a rigid single-source manifest nudging simpler blocks → allow multiple sources per
  block and a `derived` note.
- Risk 2 — manifest and TSX disagreeing → the report stays right, the inspector lies; FE
  row-count verification flags it; fully closed later when blocks render *from* the binding.
- Truncation: +~1k tokens on a 96k budget — negligible; `blocks` before `tsx` regardless.
- Prompt-regression risk as with any prompt change: run the same ~10 prompts before/after,
  compare layouts, count manifest/TSX mismatches.

## Frontend changes (MVP)

**Data plumbing**
- `canvas.types.ts`: `BlockBinding {id, kind, sources[], fields[{path, as}], filter[], sort,
  limit}`; `blocks?: BlockBinding[]` on `ArtifactState` and `DashboardEntry`; `schema` typed
  on `DataProfile`.
- `useCanvas.ts`: read `blocks` off `artifact_skeleton`; keep the profile `schema`; carry
  `blocks` into the dashboard entry, session save and publish payload so restored and
  published reports keep their lineage.
- New `lib/sourceCatalog.ts`: `source key → entity label, table label, raw vs rollup, origin`;
  types/enums resolved from `dataProfile.<domain>.schema`.

**Interaction**
- `PanelSelectionOverlay.tsx`: clicking a `data-panel` opens the inspector (hover highlight,
  no dim, no comment popover); join id → `blocks[id]`; missing entry → "no data binding
  declared". Existing edit/comment mode untouched.

**UI**
- New `components/BlockInspector.tsx`, third column between canvas and chat: header (title,
  kind) · **Source** (entity · table · raw/rollup; origin collapsed) · **Columns** (field,
  shown as, type, enum values) · **Filter / Sort / Limit** · **Not used** · **Counts** (in
  payload → after filter → shown) · warning chip on mismatch.
- `CanvasPage.tsx` / `ArtifactPanel.tsx`: host the column; "Sources · N" pill in the canvas
  bar = distinct entities across `blocks`.

**Verification**
- New `lib/evaluateBinding.ts`: pure `source → filter → sort → limit` over `artifact.data`;
  returns counts + sample rows; flags missing source/field. Makes the inspector trustworthy
  rather than decorative.

**Tests**
- `evaluateBinding` unit tests; inspector render with a fixture manifest; overlay join;
  `artifact_skeleton` ingestion in `useCanvas.test.ts`; session save/restore round-trip.

**Not in the FE MVP:** re-binding, "Ask about this block", per-block source badges on the
canvas, inspector on dashboard-tab and library views, ask-mode results (not blocks).

## Worked example (real block, report `reports-debug/2026-08-14_17-03-52_620d`)

`data-panel="top-issues"` — `IssueTable` "Longest-running open issues". Code
(`artifact.tsx:63-67`): `data.issues.issues`, drop `status == Closed`, sort `days_open` desc,
keep 5, rename `category→Area`, `assignee→Owner`, `days_open→Age`.

```
BLOCK · TABLE                                   top-issues
SOURCE   Issues · issue rows · xyz_get_projects_project_id_issues
         1,274 in payload · 812 after filter · 5 shown
COLUMNS  title→Title str · severity→Severity enum · category→Area enum
         assignee→Owner str · days_open→Age int (computed at hydration)
FILTER   status ≠ Closed      SORT days_open ↓      LIMIT 5
NOT USED id · status · date · position · model_room_id · model_element_id
```

Contrast `severity-breakdown`: source `issues.by_severity` — a hydrator rollup (one row per
severity: `label,total,open,pending,resolved`); the sidebar says so, and shows `pending`/
`resolved` as available but unused.

## Rollout

1. Pipeline first — additive and backward compatible: an old FE ignores the `blocks` key.
2. FE against a fixture manifest in parallel; switch to live once the pipeline deploys.
3. Template manifest with the FE work (no deploy dependency on the composer prompt).
4. Reports generated before the manifest (restored sessions, already-published) show "no data
   binding declared" — no backfill in the MVP.

## Acceptance criteria

- Every `data-panel` in a fresh report has a valid `blocks` entry (target ≥ 90 % on the
  10-prompt check set; misses are dropped with a warning, never a failed artifact).
- Clicking any block opens the sidebar within 100 ms with source, columns + types, filter /
  sort / limit, unused fields, counts.
- `evaluateBinding` counts agree with what the block visibly shows on the check set; any
  mismatch is flagged in the sidebar.
- Room-readiness template: all panels selectable and inspectable.
- Before/after on the same 10 prompts: no layout regression, compose time within +10 %.

## Open questions

- Tweak scope for phase 2: columns/filters only, or also source, aggregation, chart type?
- Backfill for already-published reports — "no lineage" (MVP) or regenerate on demand?
- Is the pipeline deployable again (deploys were frozen from 2026-08-19)? Decides pipeline-first
  vs FE-first-with-stub.
- Ticket number → rename this file and the branch.

## Confidence

**8/10.** Pipeline side is three localised touchpoints plus the template; FE side reuses the
existing overlay and hydration plumbing. Unknown: how consistently the composer keeps manifest
and TSX in agreement — measured, not assumed, on the check set.

**Needs human:** visual before/after on the 10 prompts (I cannot judge layout regressions
from a terminal); confirmation of the pipeline deploy status; the ticket.

---

## 2026-09-10 — what was actually built (PLT-3117)

Both halves are on draft PRs: pipeline #17, frontend #2212. The plan above is
unchanged in substance; this section records where the build differs from it
and what was learned on the way.

### Differences from the plan

- **Multi-source blocks from the start.** `sources` is a list, not a single
  `source`, and the composer prompt explicitly forbids flattening a mixed
  panel (a verdict banner reading progress + issues + media) to make its entry
  tidier. The plan flagged this as a risk to mitigate; it was cheaper to build
  it in.
- **Unresolved fields are kept, not dropped.** A declared field the catalogue
  does not know becomes `unresolvedFields` on the entry and shows in the
  sidebar as unverified. Dropping it would have hidden the interesting case —
  a hydrator that gained a field the catalogue has not caught up with.
- **Edit carry-forward** (not in the plan). An edit re-emits the whole page and
  the composer sometimes describes only the panel it changed, which would blank
  the inspector for the rest of the report. `carry_forward_blocks()` keeps prior
  entries for ids still present as a `data-panel` in the new TSX; a freshly
  declared entry always wins. Without it the feature would look broken in the
  most common flow.
- **The catalogue is session-scoped, not per report.** ~9KB of JSON; a session
  holds many dashboards, and the vocabulary describes the project, not one
  report. Saved once at the top of the session file.
- **Entry point is a "Sources · N" button in the canvas bar** (as in the
  prototype), where N is the count of distinct entities across the report's
  bindings. It toggles inspect mode.
- **Inspect is a separate picking mode** from panel editing — the two share the
  overlay but are mutually exclusive, because one report cannot serve two
  meanings of a click. Inspect does not dim the report and shows no comment
  popover.

### Two bugs the tests caught during the build

- `get_template_artifact()` cached and returned the *same dict* every call.
  Harmless while the payload was flat strings; with a nested `blocks` list a
  caller could edit the manifest the next request would get. It now hands out
  copies. The old test asserted identity (`is first`) — rewritten to assert
  what actually matters, that the file is read once.
- The frontend row-sorter put missing values **first** in descending order, so
  a "worst first" list would have opened with the rows that have no value at
  all. Blanks now sort last in both directions, and ordering comparisons
  against a missing value are false as in SQL.

### Verified numbers

- Source list injected into the composer prompt: **3,780 chars (~945 tokens)**
  of input for a project with every capability.
- Catalogue JSON on `artifact_skeleton`: **8.9 KB**.
- Pipeline suite: 342 pass. Canvas frontend suite: 187 pass.
- `tsc --noEmit` adds no new errors (the three pre-existing CanvasBar
  styled-system errors are unrelated).

### Found on the way, deliberately not fixed here

- **Repo ESLint cannot run in this checkout at all**: `eslint-plugin-sonarjs`
  throws `TypeError: Cannot read properties of undefined (reading
  'FunctionType')` at plugin load against ESLint 9.39.5, including on untouched
  files. The pre-push lint gate is therefore not actually running for anyone in
  this state. Worth its own ticket.
- `tokens_css` is in the composer spec but never emitted over SSE, so the
  sandbox always falls back to `FALLBACK_TOKENS_CSS` (`useCanvas.ts` reads
  `a.tokens_css` and always gets `undefined`).
- Dead read of a `viewerConfig` key at `server.py:1593` that
  `parse_artifact_output` can never return.
- `rooms` is missing from the `ProjectData` TypeScript contract in the composer
  prompt — only the room-readiness template documents it.

### Still open

- The 10-prompt before/after check (layout regressions, and how often manifest
  and TSX disagree) — needs a human with the UI.
- Tweak/re-bind scope for phase 2.
- Backfill for already-published reports: today they read "no data binding
  declared".
- Inspector on the dashboard-tab and library views.

### 2026-09-10 (later) — what an adversarial review round found

Both halves were reviewed line by line after the first push. 15 findings, all
fixed on the branch. Recording the pattern because it will recur in anything
that reports numbers about other numbers.

**Every serious finding was the same failure: the sidebar stating a confident
number that the panel beside it contradicts.** A lineage view that is
occasionally wrong is worse than none, because it is consulted precisely when
someone already distrusts a figure.

The three that would have shipped visibly broken:

1. **The template's panel ids were invisible to a static reader.** The
   artefact passed ids through a `panel` prop the `Panel` wrapper expanded at
   render time, so `panel_ids()` — which reads the TSX as text — found one of
   seven. The first edit of any room-readiness report would have dropped six
   bindings, and the frontend would then have saved the shortened manifest.
   Fixed by making the attribute literal and spreading it through the wrapper.
   **Lesson: anything a build-time or server-side reader has to find must be
   literal in the source, not assembled at render time.**
2. **Edits on a restored session lost the manifest permanently.** The
   frontend's `prior_artifact` payload (used when thread memory is gone) never
   carried `blocks`, so `carry_forward_blocks` had nothing to work with — and
   the save path then wrote the loss to the session file, which is the only
   copy.
3. **Unevaluatable filters produced invented counts.** `in` handed a bare
   string, or `contains` with no value, both survived validation; on the
   frontend the first reported *0 rows* beside a panel full of them and the
   second matched everything. Now dropped at validation, and the frontend
   treats a filter it cannot evaluate as narrowing nothing rather than
   everything.

Smaller ones worth remembering: presence of a declared field was sampled from
the first 20 rows (sparse columns like an issue's `position` were accused of
being absent); an empty second source counted as vouching for every field,
silencing a real warning on the first; the session catalogue was *replaced*
per report, so switching project mid-session stripped the earlier dashboards'
field types **and the `rooms` caveat about not reconciling with project-level
progress** — a caveat disappearing from a panel whose numbers still need it.

Two crash paths from malformed persisted bindings (bare `.sources.map` during
render; a source key resolving to a primitive reaching the `in` operator) —
both from trusting the shape of data written by an older build.
