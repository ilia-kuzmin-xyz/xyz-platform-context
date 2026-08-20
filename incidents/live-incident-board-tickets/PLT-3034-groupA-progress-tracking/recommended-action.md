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

## 2026-08-20 — the draft above is superseded as the *first* message. Reordered, not discarded.

**Nothing above is retracted.** The FE/BE taxonomy answer is still correct and still unposted, and the
Mech.144.1260 ask is still open. What changed is **priority**: the customer replied on 08-19 denying he
ever links to QA models, so the leading question is no longer "can we distinguish QA models" (a scoping
question for a fix nobody has committed to) but **"is this element actually in a QA model at all, or is
that a display artifact of the linking panel?"** — because the answer decides whether the workaround
already sitting with the customer is safe to follow.

See `context.md` § 2026-08-20 for the Fork A/B mechanism and the code trail.

### Chosen action: (c) stay Group A — one internal question to Darminder, before anything else goes to the customer

**Owner: Ilia Kuzmin. Addressee: Darminder Atker (single owner, single question).**

- **Not to the customer.** He has already answered; sending him anything now would be asking him to
  re-confirm something he just denied. The ticket sits "With Customer" on a question he cannot answer.
- **Not Ready For Development.** No mechanism is settled, and under Fork A there may be no defect at all.
- **Not Blocked.** The deciding check needs nobody outside the team and no new tooling.

### Draft message 1 — post this one first (internal, on PLT-3034)

> Darminder, on the customer saying he never links to QA models: that may well be true and still match
> what you saw. A link is stored against an element id, not against a model. The linking panel works out
> the model headings at render time by looking at every model that element id was found in, so one link
> made in a production model will still show up under a QA model heading if the QA model contains the
> same element id. The late badge is per element too, so it repeats under every heading.
>
> So the question that decides this: in the linked elements panel for DH2.29-30.1100, does that element
> appear under more than one model heading, or only under QA-SBX2-FU-FO_ME_MDL_DSI_R23-V74_X?
>
> If it appears under more than one, nobody linked anything to QA, the element is just not marked
> installed, and unlinking it would break the production link as well. If it only appears under QA, then
> the link really is QA only and the customer's question about how it got there is a fair one. Your
> screenshots from 17 Aug might already show this.

Code trail if he wants it: `element-entity.ts:9,14,16-18`, `model-entity.ts:274-277`,
`linking-service.ts:684-689`, `useGroupedLinks.ts:59-78` (grouping) and `:66` (per-element status).

### Draft message 2 — only after message 1 is answered

If **Fork A** (element appears under more than one model heading):

> That settles it then. Nobody linked to the QA model, the element is just not marked installed, and the
> QA heading is how the panel displays element ids that exist in more than one model. Worth telling
> Matthew that directly, since he was right to say he never linked to QA. It also means we should pull
> back the unlink suggestion, unlinking would drop the production link too, and mark as installed would
> be recording an element as installed when it isn't.

If **Fork B** (QA heading only):

> Then the link is genuinely QA only and the customer's question stands. Before we spend anything on
> working out who created it, worth asking BIM or project delivery why a QA sandbox model is in a
> production project's model list at all. If it shouldn't be there, removing the model is faster than
> either unlinking element by element or building an exclusion mechanism.

### Draft message 3 — the taxonomy answer, unchanged, still worth posting

The draft in the section above this one ("@Darminder Atker — answering your question directly…") is
**still accurate and still unposted**. Post it once the fork is decided, since it is the answer to
"should we build an exclusion mechanism", and that question only becomes real under Fork B.

### Draft message 4 — Mech.144.1260, still unaddressed after 3 days

> Separate one: has anyone checked Mech.144.1260 the same way as DH2.29-30.1100? Only one of the two
> activities on this ticket has a QA model finding against it. If it's the same shape that's two of two;
> if it isn't, we have two mechanisms behind one symptom.

### Standing caution for whoever picks this up

Darminder's advice flipped between 08-18 13:24 (mark installed safest, unlink risky) and 08-18 15:50
(unlink recommended, mark installed caveated), with no stated reason. Under Fork A **both** are harmful.
Worth confirming which one, if either, has actually reached Matthew before more advice is added on top.

### Follow-through a human should own (additions to the list above)

- Look at `image-20260817-132030/132133/132204.png` — the fork may already be visible in them.
- If the provenance question survives (Fork B), Darminder's 08-19 12:39 "limited resource" reply needs a
  yes or no from someone who can prioritise it, rather than being left conditional. Right now nobody owns
  it and the ticket is parked on the customer.
