# PLT-2385 — recommended action (Group B — DRAFT / for dev reference only)

**This is a Group B ticket:** already **Ready For Development** with a diagnosis in
thread. Context is captured for the dev picking it up. **No Jira transition and no
client comment is drafted here** (action-scenario is TBD per current instructions).
Nothing is to be executed.

## Is it genuinely dev-ready?

**Partially — the root cause is clear, but the code work is not scoped in this ticket
and does not live in this repo.**

- ✅ **Root cause is clear:** activity↔element links persist for elements that left the
  PC model but still exist in the co-loaded QA model under the same Revit unique ID;
  nothing (link model, FE, or backend export) distinguishes QA from PC, so the stale
  links are counted into % complete / hours. The only existing prune (dagster on model
  **delete**, regenerating `project-element-list.parquet`) does not fire for this
  shared-ID / re-version case. (Rishi 2026-01-28; David Webb 2026-04-15; verified in
  code — see context.md § Mechanism.)
- ⚠️ **The fix is not in hc-frontend.** It is a **backend / data-pipeline** link-lifecycle
  change (prune stale links when an element leaves a model version, not only on model
  delete) plus a **product/UX** decision. A frontend dev opening this ticket would find
  nothing FE to build — the only FE-side asset is `shared-asset-impact.ts`, the query
  behind the warning modal.
- ⚠️ **The dev work has already been forked out:** **PLT-2650** (feature: handle links on
  model deletion, Rishi) and **UX-1109** (design, Jason). This live-incident ticket is
  effectively a **parent/duplicate** of those; keeping it in Ready-For-Dev alongside them
  risks double-tracking.

## Gaps a dev would hit

1. **Scope mismatch vs the fork.** PLT-2650 / UX-1109 target the model-**deletion** flow
   (warn before breaking shared links). This incident's trigger is **not a deletion** —
   it is shared unique IDs across two **live** models + orphans from a **prior model
   version**. A delete-time warning would not have prevented DC10. The dev needs the PO
   to confirm whether PLT-2650 is meant to cover the re-version / shared-live-model case
   too, or whether a separate link-lifecycle fix is required.
2. **Ambiguous product intent (unresolved for ~3 months).** David Webb: silently prune
   links (current V2 on delete). Pietro: give the user a **choice** (warn, name the other
   models, preserve/break). This is a genuine product decision, not a code detail — and
   it was still being negotiated at the last comment (2026-05-06).
3. **Owner vacancy.** Assignee is **Masum Ahmed (support, off dev roster)**; no engineer
   is assigned to the code work on *this* ticket. Real owners live on PLT-2650 (Rishi) /
   UX-1109 (Jason).
4. **Cohort under-quantified.** lon1x2 mentioned as possibly affected (Mostafa) with no
   ticket; DC10 confirmed. No query has enumerated all activities with links to elements
   shared across a QA + PC model — the natural cohort sweep.
5. **Decisive evidence unreadable here.** PowerBI-export screenshot (attachment id 51021)
   confirms the export *counts* the QA-side elements; not machine-readable in triage
   (numbers are transcribed in Rishi's comment, so not blocking).

## Where the fix most likely belongs

**Backend / data-pipeline (primary)** — link lifecycle around `activity_links` /
`project-element-list.parquet` regeneration (dagster): prune stale activity↔element links
when an element leaves a model version even if the model is not deleted, and/or make the
export/count aware of which model tracks an element's progress.
**Plus product/UX (secondary, already forked):** the shared-link warning modal —
**PLT-2650** + **UX-1109**. **Not the frontend** beyond the existing
`shared-asset-impact.ts` query.
