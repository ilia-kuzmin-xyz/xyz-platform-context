# PLT-2906 — recommended action (DRAFT — not executed)

**Status:** Open (group A). Ball is currently with the customer/BIM team for Ilia's
True North ask (07-17), but that thread chases a **precondition**, not the trigger.
The highest-leverage next step we **own internally** — and that isn't blocked on the
customer — is to nail the **why-now**, because the customer ruled out a model update
and the symptom hit all models at once on 07-14, which points squarely at **our own
`SectionToolOrientation` heuristic shipping/changing**, not at True North.

## Single drafted next step: internal comment, routed, one closed question

**Type:** Jira comment (internal), tagging the FE/viewer owner. Do **not** transition
the column — keep it Open; this runs in parallel with the pending BIM data.

**Owner to tag:** the FE viewer owner (Darminder Atker is FE/viewer lead on sibling
viewer tickets PLT-2874/PLT-2892; adjust if the section-tool code has a clearer owner).

**Drafted text:**

> @[FE viewer owner] — on PLT-2906 the section box "lost its rectangular shape" for a
> client across **all** FAR01/FAR02 models from **~2026-07-14**, and they confirmed the
> **models were not re-uploaded**. That rules out True North changing (it's a static
> model property) and points at our `SectionToolOrientation` auto-patch
> (`section-tool-orientation.ts`), which rotates/fits the box instead of Forge's
> axis-aligned default. **One question:** did that orientation patch — or its thresholds
> (`MIN_RECT_TIGHTNESS_RATIO` / `ORIENTATION_MISMATCH_THRESHOLD_RAD`) or the fitted-box
> path — ship or change in a release deployed around 2026-07-14? (This is the same
> heuristic that over-fired on SWITCH-ATL07 / PLT-2756.)

**Why this shape (per playbook message-craft):** one question, one owner, answerable in
one line ("yes, shipped in vX on <date>" / "no"). It assigns the **why-now** an owner
(the playbook's cardinal miss in the July incident), and it does so without waiting on
the customer.

## Parallel / already in flight (do not duplicate)

- **Ilia → BIM team (True North), pending.** Keep it — it establishes whether
  `refPointTransform` carries rotation (the precondition the heuristic reads). But frame
  it explicitly as *precondition, not trigger*: even if True North is non-zero, it did
  not change on 07-14, so it cannot explain the onset.
- **Repro on FAR01** (needs env): run the `section-tool-orientation.md` debug snippet to
  read `existingRotZ` / `tightness` and confirm the patch is firing. This is what lets
  the fix be scoped (retune threshold / per-project opt-out / restore axis-aligned
  default) — likely a follow-up dev ticket once the deploy correlation is confirmed.

## Do NOT

- Do **not** propose changing the DB `angleToTrueNorth` field as a fix — it never reaches
  Forge's `refPointTransform` / the section box (confirmed in code; explicit pitfall in
  `section-tool-orientation.md`).
- Do **not** close on "reverted / looks fine" without stating **cause + trigger (deploy)
  + cohort sweep** (all projects the patch predicate now matches).
