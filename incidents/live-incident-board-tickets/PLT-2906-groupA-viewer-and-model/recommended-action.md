# PLT-2906 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — Ilia analyses the True-North data he already has + runs one in-house diagnostic, then posts an internal status update

The ticket is **stalled on our own side**: the customer answered Ilia's True-North question on **2026-07-20** and no one has responded or analysed it in ~2 days. The highest-leverage move is **not** another routing transition — it is for **Ilia to close his own open loop**: read the two True-North screenshots, run the shipped DevTools diagnostic against FAR01/FAR02, and post the finding. Everything needed is already in our hands (model file shared 07-16; screenshots delivered 07-20; the debug snippet is in the repo).

## Why this, and explicitly NOT the other routing options

- **NOT (c) With Technical Support / back to the customer.** We **already got exactly what we asked for** — the True-North values Ilia requested. The ball is squarely in *our* court. Bouncing it back to TS/the client now would re-loop a ticket that is waiting on *our* analysis, and would compound a 2-day internal stall into a longer one. This is the specific trap the playbook flags ("state-now ≠ state-then" and "evidence requests without owners sat idle all day"): the data exists; it needs an owner to *act on it*, not to re-request it.
- **NOT (b) Ready For Development — yet.** We have not confirmed the orientation patch even fires on FAR geometry, nor whether it's mis-firing (a bug) or firing-as-designed (a UX decision). Routing to dev now presumes a fix (threshold change) that the evidence doesn't yet support — and the wrong fix if it turns out to be working-as-designed and the real ask is a product decision (axis-aligned toggle). One DevTools reading flips this to (b) with a precise scope, or to a product decision.
- **NOT (d) Blocked.** Nothing external blocks us — the two confirming checks are both in-house (a DevTools session on the shared model; a release-timeline lookup).

**Owner:** **Ilia Kuzmin** (he holds the investigation and asked the question). Coordinator **Yash Patel** only needs a heads-up that we're analysing, not an action.

---

## What Ilia should do now (concrete, in priority order)

### Step 1 — Read the 07-20 screenshots; record the actual True-North angles
For **FAR01** and **FAR02**, note the Revit **True North angle** value and whether it is the **same across all exported files** (this was Ilia's own question). What to look for:
- **Both ≈ 0°** → True North barely rotated → building shouldn't be diagonal → the orientation patch *shouldn't* fire → misalignment is something else (re-open the mechanism question).
- **Nonzero and equal across exports** (the expected case) → building is rotated; the question becomes *how* the rotation is encoded (baked into geometry vs shared coordinates), which Step 2 answers directly.
- **Different between FAR01 and FAR02, or inconsistent across exports** → explains why the box looks wrong on some models and not others; feeds the cohort question.

### Step 2 — Run the shipped DevTools diagnostic against FAR01 and FAR02 (the decisive diff)
Load each federated model (file shared 07-16) and run the **debug snippet from `section-tool-orientation.md`** (§"Debug snippet"). It prints `{ existingRotZ, angleDeg, tightness }`. Decision map (thresholds from `section-tool-orientation-math.ts:7,12`, `shouldApplyOrientationPatch` at `:141-152`):
- **`|existingRotZ| < 5°` AND `tightness < 0.9`** → the patch **fires** → the box is being rotated to `angleDeg` → **this is the "new style" the customer dislikes.** Then decide bug-vs-by-design: is `angleDeg` a sensible building orientation (working-as-designed, unwanted → product/UX) or a spurious tilt on an L-shaped/sprawling footprint (bug, same class as **PLT-2756/SWITCH-ATL07** → threshold fix)?
- **`tightness ≈ 1`** (or `|existingRotZ| ≥ 5°`) → the patch **should not fire** → box stays axis-aligned → the misalignment is **not** this feature; pivot the investigation.

This is the smallest broken-vs-working pair (patch fires vs doesn't), read directly, ~10 minutes.

### Step 3 — In parallel, get the release-timeline correlation (the "why now")
Ask release/ops what shipped to **FAR01/FAR02 production around 2026-07-14 ~08:00 CT** — specifically whether the `SectionToolOrientation` feature or a Forge-viewer-library bump rolled out then. The customer's "**model not updated + sudden + all models / both projects / others too**" is a textbook deploy signature; this pins the trigger the playbook insists we assign an owner to. (I could not date it: the checkout is a shallow clone and the feature predates the visible window.)

---

## Draft — internal status update (author: Ilia Kuzmin; @ Yash Patel)

*Playbook style: state + so-far + evidence quality; one owner; closed next steps; explicit scoping. DRAFT — do not post.*

> @Yash Patel — picking up PLT-2906 (section box "misaligned" on FAR01/FAR02), and thanks for the True-North screenshots — that's what I needed, the ball's on our side now.
>
> **Mechanism (confirmed in code):** the section box takes its orientation from the model's Forge transform (`refPointTransform`). We have a service (`SectionToolOrientation`) that, when a building's rotation is baked into geometry rather than shared coordinates, **rotates the section box to fit the building footprint** instead of leaving it axis-aligned. That rotated box is almost certainly the **"new style"** the user is describing — the old one was the plain axis-aligned rectangle. Important nuance for my earlier note: the tool does **not** read our DB True-North field, so the True-North *value* is evidence (it tells us the building is rotated), but the actual switch is this footprint-orientation patch.
>
> **Why it appeared on 07-14 with no model change:** consistent with a **platform release** reaching FAR prod around then (the behaviour is code, not data — which is exactly why it hit all models across both projects at once). I'm confirming the rollout date with release/ops.
>
> **What I'm doing now (no customer input needed):** loading the FAR01/FAR02 models and running our diagnostic to confirm the box is being auto-rotated (reads the transform rotation + footprint tightness). If it is: we decide whether to (a) restore the axis-aligned box for these projects / add a toggle, or (b) fix the orientation threshold if it's mis-firing (same class as PLT-2756 on SWITCH-ATL07). I'll post numbers today.
>
> Scoping: this is the ViewerPage section tool, not the dashboard; and the fix is on our side (Forge transform / our patch), **not** a change to the Revit True-North data.

---

## Follow-through the human should own (not executed here)

- **After Step 2:** if the patch is confirmed firing → split into (i) a **product/UX decision** (restore axis-aligned box or add an "axis-aligned / oriented" toggle — the customer explicitly asked to "change it back to how it was before"), and (ii) if `angleDeg` is spurious, a **threshold/bug fix** in `section-tool-orientation-math.ts` (PLT-2756 sibling). Then move to **Ready For Development** with that scope.
- **Cohort sweep (playbook #6):** once confirmed, enumerate every project whose federated model qualifies for the patch (`existingRotZ ≈ 0`, `tightness < 0.9`) — the customer already says "some other projects" are affected; don't wait for the next ticket.
- **Answer "why now" with an owner (playbook #5):** don't let the release-timeline question drop — assign it, confirm the 07-14 rollout, or record "trigger unknown" explicitly.
- **Doc gap:** add a `dashboard/viewer-and-model.md` / `pitfalls.md` entry once confirmed: "the section box is not always axis-aligned — `SectionToolOrientation` rotates it to the building footprint when `refPointTransform` lacks the rotation; the DB `angleToTrueNorth` field does not affect it." (Not edited here per task scope.)
- **Watch the artifacts (NEEDS HUMAN):** `section_box.png` and the two True-North screenshots — confirm the visual is a *rotated* box (not a box that fails to draw at all) and record the angle values.
