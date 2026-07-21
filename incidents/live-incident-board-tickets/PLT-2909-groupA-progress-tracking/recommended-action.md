# PLT-2909 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — post a scoping correction + the one data step, keep as related-not-duplicate of PLT-2882

Yash was right to be skeptical (07-17: "not too sure about both these tickets having same root
cause"). The highest-leverage move is to confirm his instinct with the code-level reason, so the
ticket doesn't quietly get closed-by-association once PLT-2882 resolves, and to hand over the one
data query that would confirm the mechanism.

## Why this and not the others

- **Not (b) Ready For Development yet.** Two candidate fixes exist (dedup superseded model
  versions in the metadata pipeline — BE; or filter `getModels()` to loaded models like `dbIds`
  already does — FE) but which is right depends on whether ATL05-08's versioning is
  separate-model-records or in-place re-versions (unconfirmed) — sending to dev now risks the
  wrong fix.
- **Not (c) With Technical Support / needs the client.** Nothing further is needed from the
  customer — we have the exact repro (ATL08, CY-5200). The next step is an internal parquet query.
- **Not (d) Blocked.** The data check is ours to run; nothing external blocks it.

## Draft — internal reply (author: Ilia; @ Yash, cc whoever owns the data-pipeline query access)

> Update on PLT-2909. @Yash — your instinct was right to hold off equating this with PLT-2882.
>
> **Confirmed in code:** this ticket's symptom (activity shows several models, but the elements
> only live in one) comes from a *different* code path than PLT-2882 — the linking-list panel's
> `getModels()` derives model membership purely from each model's element-metadata parquet, with
> no check for whether that model's geometry is actually current/loaded. If the same element ID
> shows up in more than one model's parquet — e.g. an old and a re-uploaded version of the same
> file both still on record — it gets listed under both.
>
> **Related to PLT-2882, not the same bug:** both point at the metadata pipeline not being
> cleaned up after re-uploads, but PLT-2882 is elements *disappearing* (orphaned links), this is
> elements *over-claimed* (duplicate membership). A fix for one won't fix the other.
>
> **One step to confirm:** for ATL08 / activity CY-5200, check whether the linked elements'
> `modelElementId`s appear in more than one model's `client-element-metas` parquet — e.g. both an
> old and current version of `...SWITCH_ATL8_ELEC_XYZ_EquipmentOthers_Bld2`. If yes, that's the
> mechanism confirmed, and it points at either deduping superseded model versions on the BE side,
> or filtering `getModels()` to loaded models on ours.
>
> Given this shows up across all four ATL05-08 projects at once, it's worth treating as a pipeline
> question rather than a one-activity fix — likely the same batch re-upload hit all four.
>
> Separately, the "generate session id" error you hit is unrelated — that's the support session-
> log-sync feature, not the linking code. Worth its own ticket if it recurs; not chased further
> here.

## The one evidence step to run (owner: Ilia or BE/data; needs parquet/DB access)

1. For ATL08, pull the `modelElementId`s linked to activity `CY-5200` (via `activity_links`).
2. For each, check which models' `client-element-metas` parquets contain that `modelElementId`.
3. **Expected if hypothesis holds:** at least one such id appears in **two** models — the current
   `...Bld2-V1` (or whatever tag is current) and a stale/superseded record. That confirms
   over-claiming via un-deduped metadata, and tells whether the fix is BE (prune superseded model
   records from contributing metadata) or FE (`getModels()` should filter like `dbIds` already
   does).

## Follow-through the human should own (not executed here)

- **Cohort sweep once confirmed:** enumerate other ATL05-08 activities hitting the same
  duplicate-membership pattern, not just CY-5200 — this is reported as widespread, not isolated.
- **Cross-link:** once PLT-2882's BE-side "why does the pipeline leave stale metadata behind"
  question gets an answer, check whether the same answer also explains PLT-2909's duplication —
  they may share a BE root cause even with different symptoms.
- **Session-id bug:** file separately if the customer hits it again; not investigated beyond
  confirming it's unrelated.
