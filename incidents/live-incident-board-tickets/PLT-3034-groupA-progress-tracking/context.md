# PLT-3034 — "Hutto2 - Wrong actual percent showing on dashboard (75% instead of 100%) (99% instead of 100%)" — triage context

## ⚠️ First triage pass for this ticket, 8 days late

Created 2026-08-10 11:35, never picked up by this routine before today (last run to cover the board,
08-17, listed 8 in-scope tickets and this was not one of them, despite already being `Open` with
Major priority since creation). Cause not investigated — noting the gap rather than guessing at it,
per the standing "don't silently patch over a process miss" rule. By the time of this pass the
engineering team had already run a substantial investigation in-thread (12 comments, 08-10 through
08-17) with no involvement from this routine; this file is a record of that thread plus the FE code
check it was missing, not a from-scratch diagnosis.

## Ticket

| Field | Value |
|---|---|
| **Jira** | https://xyzreality.atlassian.net/browse/PLT-3034 (id 119285) |
| **Status** | Open · **Priority** Major |
| **Project** | Hutto2 |
| **Assignee** | Darminder Atker · **Reporter** Yash Patel (Freshdesk #7611) |
| **Created** | 2026-08-10 11:35 · **Updated** | 2026-08-17 18:08 (12 comments) |
| **Domain slug** | `progress-tracking` — same family as PLT-2882/2909/2931/2946 (dashboard Actual % vs installed-element reality) |

## What was reported

Two activities read below 100% though the customer says everything is installed:
- **Mech.144.1260** ("Install DOAS Units and Final Tie-Ins") — 75% shown, editor "Select All Linked
  Elements" returns **3** elements against **4** linked.
- **DH2.29-30.1100** ("CHW Chiller Connections & Insul. 29-30") — 99% shown, 2,308 selected against
  **2,322** linked.

## What the team already found (verbatim thread, condensed)

1. **Darminder (08-10 13:14, 13:41, 14:27)** — asked whether the user's progress-calculation setting
   is "Model element count"; suspected a parquet-regeneration lag; found the last `progress-outputs`
   calc timestamp was Fri 07-Aug 15:28.
2. **Ali Seyedof (08-11 13:36)** — artefacts refresh every 15 min or on schedule ingest; asked
   Darminder to re-import the schedule to force a refresh.
3. **Darminder (08-11 13:43)** — can't touch schedules on a production project; re-checked, artefacts
   *were* updated that day but values still didn't reflect it.
4. **Darminder (08-11 15:02, @Yash/@Pietro/@Mostafa)** — looped in product: "the parquets are
   returning these values (75 and 99) as shown in FE as expected... in the editor both activities show
   actual at empty" — i.e. the FE is a faithful renderer of the parquet; the question becomes why the
   parquet itself holds 75%/99%, not an FE bug. No reply from Pietro/Mostafa yet.
5. **Yash (08-17 10:06)** — independently found a **discrepancy between "linked elements" count and
   "Select All Linked Elements" result** (4 vs 3, 2322 vs 2308) and asked if this is **ghost/stale
   links from a previous schedule or model version** — i.e. re-proposed Pattern 1 (dead links inflate
   the denominator), the mechanism already confirmed on PLT-2882/2909/2931/2946.
6. **Darminder (08-17 14:15)** — ruled this out directly: loading all non-federated models shows every
   element selectable; not ghost/dead links.
7. **Darminder (08-17 14:22)** — instead found: for `DH2.29-30.1100`, one of the linked elements sits
   in a model named **`QA-SBX2-FU-FO_ME_MDL_DSI_R23-V74_X`** and is marked **"late"** (not installed).
   This explains why the activity can't reach 100% — a non-production model's element is dragging the
   real percentage down.
8. **Yash (08-17 18:05)** — "a element from QA model should not be considered for the progress
   calculations. Why is it counting the elements from QA model?"
9. **Darminder (08-17 18:08, last comment)** — "I think on the backend calculations there is not a
   way for it to identify if a element is part of QA or not so it does not exclude it if its been
   linked to an activity. @Ali Seyedof one to be aware of and if you can confirm." **Unanswered as of
   this pass** (<24h old, not yet stale).

**Two symptoms may not share one cause.** Mech.144.1260 (4 vs 3 elements) has no QA-model finding on
record yet — only DH2.29-30.1100 does. Nobody has said whether the same QA-model element also
explains Mech.144.1260's gap, or whether it's a second instance of the same shape, or something else
entirely (e.g. genuinely stale/dead links, which Darminder's 08-17 14:15 check addressed for
DH2.29-30.1100 but not explicitly for Mech.144.1260).

## Domain context

- `dashboard-progress-comparison` skill / `PLT-2946` context: progress = `installed/linked` for
  tangible activities (`linkedElementCount > 0`), backend-computed, FE renders it as-is.
- **Pattern 1** (`recurring-defect-patterns.md`): dead/ghost links inflating the denominator,
  confirmed on PLT-2882 (FAR01), PLT-2909 (ATL08), PLT-2931 (ELN03). Darminder's 08-17 14:15 check is
  the right falsification test for this pattern and it came back negative for DH2.29-30.1100 (all
  elements load and select correctly) — **this is a new, distinct mechanism, not a 4th Pattern-1
  sighting.**
- **No existing "QA/reference model" concept in hc-frontend — code-verified, not inferred.** Grepped
  `src/` for `isQA`, `sandbox`, `test-model`, `modelType`, `excludeFromProgress`,
  `isProgressContributing` and equivalents: no hits relate to model provenance. `ModelEntity`
  (`.../ViewerPage/components/project-x/entities/model-entity.ts`) carries no such field — just `id`,
  `urn`, `name`, `fileType`, `modelVersionId`. `ProjectService.getProjectModelList`
  (`project-service.ts:722-723`, comment *"Add all models initially (including those without URN
  details)"*) loads every model the API returns, no name-based or type-based exclusion.
- **Model membership is irrelevant to whether an element counts toward an activity — code-verified.**
  `LinkingService.getElementsForActivity` (`linking-service.ts:684-689`) resolves purely by
  `modelElementId`, no model filter. `ElementEntity.getModels()` returns every model a `modelElementId`
  was seen in (`model-entity.ts:274-280`, additive `existing.models.add(this.id)` across every loaded
  model). `useGroupedLinks.ts:59-83` buckets an activity's linked elements under every model they
  belong to, dropping a model bucket only when it has zero elements — no allow-list of "real" models
  anywhere in the chain.
- **Consequence:** if `QA-SBX2-FU-FO_ME_MDL_DSI_R23-V74_X` is loaded/activated for this project and
  shares a `modelElementId` with the activity's link, the FE treats it identically to a production
  model. This is a real, verifiable gap, not speculation — but it is a **gap that spans FE and BE
  both**, not a BE-only blind spot as Darminder's phrasing suggests: **the FE itself has no concept of
  "QA model" to hand the backend in the first place.** There is nothing broken to point at; this is an
  absent safeguard, not a bug in existing logic.
- **No exclusion mechanism exists to reach for.** The closest candidate UI, Project Settings' Models
  tab (`ModelsTabDetails.tsx`), has no "exclude from progress" / "reference only" field today. Building
  one is net-new scope, not a targeted fix.

## Diagnosis

**Verified:** the FE renders the backend's parquet numbers faithfully (Darminder's 08-11 finding);
DH2.29-30.1100's shortfall traces to a linked element inside a QA/sandbox-named model
(`QA-SBX2-FU-FO_ME_MDL_DSI_R23-V74_X`) that is marked "late"; the FE has no model-provenance concept
anywhere in the linking/grouping chain that could exclude such a model even if asked to.

**Inferred / unconfirmed:** whether Mech.144.1260 has the same QA-model cause (not checked in-thread
yet); whether the QA model *should* even be loaded/activated for this production project — that's a
project-configuration question (why does a QA/sandbox model exist inside a live project at all?),
which sits upstream of both FE and BE and hasn't been asked yet.

## Confidence

- **FE renders parquet faithfully, no FE-side arithmetic bug: 9/10** — code-verified across two
  independent checks (Darminder's in-thread finding + this pass's `linking-service.ts` /
  `model-entity.ts` read).
- **QA-model element inclusion is the mechanism for DH2.29-30.1100's 99%: 7/10** — directly observed
  by Darminder in the editor (screenshot), not yet cross-verified against a query, but consistent with
  the code read (no exclusion path exists, so inclusion is the only possible outcome).
- **Same mechanism explains Mech.144.1260's 75%: 3/10** — unconfirmed, nobody has looked.
- **This is a data-hygiene/model-taxonomy gap spanning FE+BE, not a pure BE blind spot: 8/10** —
  code-verified there is no FE-side concept to lean on either.

## NEEDS HUMAN

- ⚠️ Whether the QA model should be in this production project's model list at all (project-delivery/
  BIM question, not dev).
- ⚠️ Check Mech.144.1260 for the same QA-model pattern — nobody has yet.
