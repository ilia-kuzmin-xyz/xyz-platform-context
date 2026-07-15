# PLT-2906 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — internal reply that (1) names the prior art, (2) pins the trigger, (3) forks bug-vs-product

This is a **recurring** incident with a known code cause-family, so the highest-leverage move is not to
re-investigate from scratch but to route two closed questions against the specific suspect (PR #1933) and
explicitly separate the two ways it can resolve (FE bug vs. product/UX decision). Keep it in-house — no
client ask is needed yet; we already have the model file coming and the internal levers to reproduce.

## Why (a), not the others
- **Not (b) Ready For Development yet.** The mechanism is understood, but we have **not** confirmed whether
  FAR01/02 being oriented is a *bug* (b1: the `tightness<0.9` gate mis-fires) or *by-design-but-unwanted*
  (b2: correct oriented box, customer preferred the old one). Sending to dev before the screenshot + the
  `existingRotZ`/`tightness` check risks either a wrong fix or "fixing" intended behaviour. The prior art
  is the warning: 26.2.3 shipped a heuristic change without multi-orientation QA and regressed ATL5–7.
- **Not (c) With Technical Support / client question.** We don't need new info from the client to progress
  — Yash already offered the model file and Ilia accepted it; the screenshot is already attached (just
  needs a human to open it). The next steps are internal (repro + deploy-date check).
- **Not (d) Blocked.** Nothing external blocks us; the levers are in our hands.

**Owner routing:** mechanism/repro → **Rishi** (authored #1871 + #1933) with **Darminder**; trigger
(deploy date of #1933 to FAR01/02) → release/Darminder; if it lands on (b2), the keep-vs-revert decision
→ **product** (Pietro/Mostafa, Jason on UX).

---

## Draft — internal reply (⚠️ DRAFT — do NOT auto-post; a human reviews and posts)

Playbook style: reference prior art briefly, one closed question per owner, explicit bug-vs-product scoping.

> This is the section-box orientation feature again — same family as **PLT-2651** (fixed in 26.2.3) and
> **PLT-2756** (reworked in PR #1933, merged 5 Jun). #1933 is the **only** section-box change in the last
> ~6 weeks: it swapped the orientation heuristic to a min-area-enclosing-rectangle gated on
> `tightness = minRectArea/worldAabbArea < 0.9`, which changes *which* projects get an oriented (rotated)
> box vs. the old world-aligned one. FAR01/FAR02 likely just crossed that gate. Two things to pin it down:
>
> **@Rishi / @Darminder — is this the #1933 gate firing on FAR01/02?** Fastest check (DevTools snippet in
> `section-tool-orientation.md`) on a FAR01 model: what are `existingRotZ` and `tightness`, and does it now
> take the oriented-box branch? That tells us bug vs. by-design in ~10 min.
>
> **@Darminder (release) — when did #1933 (PLT-2756) reach FAR01/FAR02's environment?** The customer dates
> onset to ~14 Jul across several projects with no model changes — if the release lands there, that's our
> trigger.
>
> Scoping — two different outcomes, don't conflate: **(bug)** the gate wrongly rotates FAR01/02 that should
> be world-aligned → FE fix + multi-orientation QA (this is the exact class that regressed ATL5–7 last
> time). **(product)** the oriented box is technically correct for their footprint but the customer wants
> the old rectangle back → that's a product/UX call (keep / revert / make it toggleable), not a bug fix.
> The screenshot (`section_box.png`) settles which — can someone who can open it confirm: is the box
> **rotated/tilted** to the building, or genuinely **not drawn**?

*(Two closed questions with named owners + one explicit fork; no client round-trip needed.)*

---

## The evidence steps to run (small, internal — do these before any dev decision)
1. **Open `section_box.png`** — rotated/oriented box (family b) vs. absent box vs. old true-north tilt
   (family a). Decisive, one click.
2. **`existingRotZ` / `tightness` on a FAR01 (and FAR02) model** via the `section-tool-orientation.md`
   DevTools snippet — confirms whether they now cross the `<0.9` oriented-box gate.
3. **Deploy date of #1933 to FAR01/02** vs. the ~14 Jul onset — confirms the trigger (playbook Q5).
4. **Broken-vs-working pair:** a project still showing the old world-aligned box vs. FAR01/02 — diff their
   `tightness` to see exactly what the gate now decides differently.

## Follow-through the human should own (not executed here)
- **If (bug):** tune the #1933 gate so FAR01/02 stay world-aligned; **QA across multiple orientations
  (0° true north AND diagonal footprints like ATL08) before release** — the 26.2.3→ATL5-7 regression is
  the cautionary tale. Then Ready For Development with that scope. Owner: Rishi.
- **If (product / b2):** route the keep-vs-revert-vs-toggle decision to Pietro/Mostafa (+ Jason UX). The
  customer explicitly wants the old behaviour — consider a user toggle (oriented vs. world-aligned) so both
  the ATL08-diagonal need and the FAR01 preference are served, rather than another global heuristic flip
  that just moves the regression to a different project.
- **Cohort (playbook Q6):** once confirmed, enumerate every project whose box behaviour changed at the
  #1933 release — remediate/communicate in bulk, don't wait for the next ticket. The customer already says
  "some other projects" are affected.
- **Don't let it die like PLT-2771:** that recurrence closed un-reproduced. Secure the model file + repro
  now while the customer is engaged.
- **Post-close:** add a `dashboard/pitfalls.md` (or viewer) entry documenting the section-box orientation
  heuristic and its regression history (PCA → min-area-rectangle → gate tuning), so the next recurrence
  starts from this chain instead of re-deriving it.

## STILL A DRAFT — nothing here is posted
No comment above has been or should be auto-posted. A human reviews and posts. No Jira status change, no
Jira write, no git action beyond committing these triage notes to the context repo.

**Confidence in diagnosis-family: 7/10. Confidence this is the right next step: 8/10** — a screenshot
check + one DevTools reading + a deploy-date lookup is the low-cost move that decides bug-vs-product before
committing dev effort, and it directly answers the user's "how were the similar ones resolved" question by
grounding 2906 in the #1871/#1933 chain.
