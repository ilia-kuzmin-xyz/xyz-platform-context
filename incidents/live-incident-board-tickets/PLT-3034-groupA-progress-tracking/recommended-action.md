# PLT-3034 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) one internal comment answering Darminder's own open question, plus one narrow ask

**Owner: Ilia Kuzmin. Addressee: Darminder Atker, cc Ali Seyedof and Yash Patel.**

Rationale, per `incidents/live-incident-playbook.md`:
- **Not to the customer.** Nothing here is customer-actionable yet — this is an internal
  model-taxonomy question, not something Thiago can answer.
- **Not Ready For Development.** Darminder's question ("can BE tell QA from production?") is
  answerable now from the FE code, without waiting on Ali — worth giving that answer before scoping
  a fix, since the fix shape depends on where the safeguard belongs.
- **Not Blocked.** Nothing external blocks the next check (Mech.144.1260).
- **Correcting the frame, gently.** Darminder's phrasing puts this entirely on "the backend
  calculations" — code reading shows the frontend has exactly the same blind spot (no model-provenance
  concept anywhere in the linking chain), so the answer isn't "BE is missing something FE already has,"
  it's "neither side has ever needed to know a model's provenance." Worth saying plainly so the fix
  isn't scoped as BE-only when it may need an FE-visible flag too.

## Draft comment (internal, on PLT-3034)

> @Darminder Atker — answering your question directly: the frontend can't tell QA/sandbox models from
> production ones either. I checked `ModelEntity` and the project model loader
> (`project-service.ts:722-723`) — every model the API returns gets loaded, no name pattern or type
> flag distinguishes a `QA-SBX2-...` model from a real one. And once an activity is linked to an
> element, model membership doesn't matter at all to whether it counts —
> `getElementsForActivity`/`useGroupedLinks` resolve purely by element id, across every model that id
> appears in (`linking-service.ts:684-689`, `useGroupedLinks.ts:59-83`). So this isn't a BE blind spot
> next to an FE one that already works — neither side has a concept of "exclude this model" today.
> Building one (a flag in Project Settings' Models tab, or a naming-convention guard where models get
> loaded) is new scope, not a fix to something broken.
>
> Before scoping that: **has anyone checked Mech.144.1260 the same way you checked DH2.29-30.1100?**
> Only one of the two symptoms has a QA-model finding on record. If it's the same shape, that's two of
> two and worth a project-wide check for any other model named like a QA/sandbox build inside a live
> project; if it isn't, we may be looking at two different mechanisms wearing the same 100%-shortfall
> symptom.
>
> Separately — worth asking BIM/project-delivery why a QA/sandbox model is loaded into a production
> project's model list at all. If it shouldn't be there, removing it from the project may be the
> faster fix than building an exclusion mechanism on either side.

## Why this and not the others

- **Not closing or downgrading.** Two real, distinct-looking symptoms on the ticket, only one
  explained; premature to treat this as understood.
- **Not escalating to product yet.** Darminder already looped in Pietro/Mostafa on 08-11 for the
  parquet-values question; no need for a second parallel escalation before the QA-model thread is
  finished.

## Follow-through a human should own (not executed here)

- **Check Mech.144.1260 for the QA-model pattern** — cheapest next step, no tooling beyond what
  Darminder already used for DH2.29-30.1100.
- **If confirmed on both:** decide with BIM/project-delivery whether the fix is "remove the QA model
  from the project" (data/process fix, fast) vs. "build a model-exclusion flag" (product + FE + BE
  scope, slow) — don't default to the slow one without asking the fast one first.
- **If Ali confirms no BE-side taxonomy either:** this becomes a small product decision (does XYZ want
  a "reference/QA model" concept at all, given it's never been needed before) rather than a bug fix —
  frame it that way rather than as a defect to schedule.
- **Software Area field** is set to "Dashboard" on the intake but the actual defect surface (if any)
  is model/element linking, shared with Web Viewer — not blocking, just noted for board hygiene.
