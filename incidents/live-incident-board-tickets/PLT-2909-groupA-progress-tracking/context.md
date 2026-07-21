# PLT-2909 — "Models/Elements linked to an activity appear wrong" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2909
- **Type:** Live Incident · **Priority:** Medium · **Status:** In Analysis
- **Software Area:** Web Viewer · **Projects affected:** **ATL05, ATL06, ATL07, ATL08** (customer's
  words: "present for all ATL05-08 projects") · **Reporter:** Yash Patel · **Assignee:** Ilia Kuzmin
- **Created:** 2026-07-16 · **Last updated:** 2026-07-17
- **Domain slug:** `progress-tracking` (same slug as its sibling PLT-2882 — activity↔linked-element
  domain, not a dashboard filter)
- **Cohort of / related to:** PLT-2882 (`progress-tracking`) — related root family, **not the same
  defect** (see below). Do not merge the tickets.

---

## One-line symptom

Customer: several activities show the **wrong set of linked models** — elements exist only in one
model, but the UI lists several models as containing them. Yash's own repro: Project ATL08,
schedule `29475-16-RL3`, activity `CY-5200` — elements actually live in
`PC-EXCEL_SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2-V1`, but "other models that doesn't contain
elements linked to activity CY-5200" also show up.

**Secondary, separate report in the same ticket:** Yash also hit an error trying to "generate
session id" — confirmed (code-verified, see below) to be an **unrelated** feature (support
session-log sync), not connected to this linking bug. Track separately if it recurs.

## Thread

1. Yash relays customer report + repro (CY-5200 / ATL08), plus the unrelated session-id error.
2. Ilia (07-17): *"I assume this issue is very similar to PLT-2882, where elements no longer exist
   in the current model version after a re-upload... hopefully the solution can be applied to this
   ticket as well."*
3. Yash (07-17): *"I am not too sure about both these tickets having same root cause, but I hope
   its same."* — correctly skeptical; see deep-research verdict below.

## Deep-research findings (Opus agent, code-verified)

**This is a different UI surface and the opposite failure direction from PLT-2882 — related
cohort, not a duplicate.**

- PLT-2909's symptom comes from the **activity-linking-list panel** (`useGroupedLinks.ts:22-51`,
  `.../viewer-x/components/blocks/activity-linking-list/hooks/`), which groups an activity's
  linked elements **by model** for display. For each element it calls `ElementEntity.getModels()`
  (`.../project-x/entities/element-entity.ts:39-43`) — this returns model membership derived
  **purely from `client-element-metas` parquet rows**, with **no filter for whether that model's
  geometry is actually loaded/current**. Contrast the sibling accessor `dbIds` two lines below
  (`:50-55`), which *does* filter to loaded models with a real geometry `dbId` — `getModels()`
  conspicuously skips that filter.
- **Where the over-claim comes from:** `ModelEntity.loadElementMetadata()`
  (`.../project-x/entities/model-entity.ts:237-296`) reads a model's `client-element-metas`
  parquet and, for each row, does `existingElement.models.add(this.id)` (`:277`) — i.e. an
  `ElementEntity`'s `models` set **accretes every model whose metadata parquet mentions its
  `modelElementId`**, across the whole project, with no dedup/supersession logic.
  `projectService.addModel()` (`project-service.ts:297-314`) also keys purely by `modelId`, with
  no logic to recognize "this model is a superseded version of that one."
- **Consequence:** if the same `modelElementId` (a Postgres UUID, not a per-file id) appears in
  more than one model's `client-element-metas` parquet — e.g. an old and a re-uploaded version of
  `...Bld2` both still present as separate model records — the element over-claims membership in
  both, and the linking-list panel renders it under every model that claims it, even ones whose
  geometry doesn't actually contain it. **This exactly matches the reported symptom.**

### Same-cause-as-PLT-2882? Related family, opposite direction, different fix
- **Shared root:** both trace back to the `client-element-metas` metadata pipeline not being
  pruned/deduplicated correctly across model re-uploads/re-versions — a systemic pipeline weakness,
  not a one-off.
- **Opposite manifestation:**
  - PLT-2882 = **under-resolution / orphaning** — parquet resolves fine, but geometry
    (Forge propertyDb / `elementId2dbId`) no longer has the element → count > 0, select/isolate → 0.
  - PLT-2909 = **over-resolution / duplicate membership** — the element DOES exist with real
    geometry in its one current model, but the metadata layer *additionally* claims it belongs to
    other (stale/superseded) models too.
- **Different code path, different fix:** PLT-2882's fix is pruning/regenerating stale metadata so
  orphaned handles disappear (BE/data). PLT-2909's fix is either deduping superseded model
  versions out of `projectService.models`, or making `getModels()` filter to loaded/current models
  the way `dbIds` already does (FE, `element-entity.ts`). **A PLT-2882 fix will not automatically
  fix PLT-2909.**

### Scope (1 project vs. 4) — supports the pipeline reading
ATL05-08 reads as one customer/campus program (sequential building numbering) ingested through the
same pipeline, plausibly re-uploaded as a batch. A pipeline-level metadata-pruning gap hitting all
four simultaneously is the more parsimonious explanation than four independent coincidences — this
strengthens (not weakens) the shared-root-family hypothesis, and argues for escalating at the
pipeline/BE level rather than only patching PLT-2882's single activity.

### Secondary session-id bug — confirmed unrelated
Maps to the **support session-log sync** feature, not linking:
`app/shared/layout/appbar/components/HelpMenu/SyncLogModal.tsx` ("Sync session logs" button →
`LogFileService.syncSessionLogs()`, `:44-51`; "Copy session ID" is a separate localStorage-backed
id from `session.tsx`). No shared code with the linking/model-membership path. Needs its own
investigation if it recurs — not pursued further here.

## Confidence (xyz-platform-context CLAUDE.md scale)

- Mechanism identified in code (`getModels()` over-claims via un-deduped parquet accretion): **8/10**.
- Same-root-family-as-PLT-2882, different defect: **5/10** — plausible and code-consistent, but not
  confirmed against real ATL08 parquet data (would need to see the same `modelElementId` actually
  duplicated across two models' metadata).
- Bug vs. an inherent "legitimately shared element across federated models" case: **6/10** — the
  missing geometry-filter in `getModels()` looks bug-shaped, but only data can rule out a
  legitimate multi-model share.

## NEEDS HUMAN

- ⚠️ **Two screenshots** (`image-20260716-112218.png`, `image-20260716-112527.png`) — unreadable
  here; need a human to confirm the wrong-model-list is indeed the activity-linking panel (not
  some other surface), and that the second image is the session-id error.
- ⚠️ **Model-versioning check (BE/env access):** are `...Bld2-V1` etc. separate model records
  (separate `modelId`s, both live in the project) or in-place re-versions of one `modelId`? This
  decides whether the over-claiming path is even reachable.
- ⚠️ **Data check:** query ATL08's `client-element-metas` parquets for CY-5200's linked
  `modelElementId`s — do any appear in more than one model's parquet? This is the one step that
  confirms or refutes the mechanism (playbook's broken-vs-working diff, done in data).
- ⚠️ **PLT-2882 diagnostic reuse:** its `__linkDiagnose()` tool targets geometry-orphaning, not
  duplicate-membership — likely NOT directly reusable here; a different query is needed.

## Doc refs
- `xyz-platform-context/incidents/live-incident-board-tickets/PLT-2882-groupA-progress-tracking/`
  — the sibling investigation this ticket was compared against.
