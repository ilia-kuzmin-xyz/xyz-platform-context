# PLT-2906 — recommended action (DRAFT ONLY — execute nothing)

## 2026-07-17 refresh — action revised after Teams input (Rishi/Tom) + True-North analysis

**New chosen action:** ask **Yash to have the delivery/BIM team verify-and-report the
True-North + export-coordinate facts** for FAR01/FAR02 (Ilia's proposal, validated
against Revit behaviour in `context.md` §2026-07-17 — the assumption is mechanically
sound), **plus** two parallel internal facts. Explicitly *report, don't change*: a
non-zero TN is normal and usually correct; zeroing or re-exporting changes
georeferencing (federation alignment, survey coordination, on-site AR) and is a
decision, not a hygiene fix. TN also cannot explain the July-14 onset by itself
(customer says models weren't updated), so the release-trigger question from the
07-16 draft stays open in parallel.

### Draft for Yash (relay to delivery/BIM team) — shortened per Ilia, 07-17

> Hi Yash — follow-up on the section box (PLT-2906 / FD #7424). We suspect this is
> tied to the models' **True North angle**, so as a first step could you ask the
> delivery/BIM team to **check the True North angle in Revit** (Manage ▸ Position ▸
> Angle to True North) for the FAR01/FAR02 models and report the actual value(s) —
> and whether it's the same across all exported files? **Please don't change
> anything yet** — a non-zero angle is normal; we just need the exact number to tell
> whether the fix is on our side or the export side.

(Longer variant with the export-coordinate + July-14 questions kept below in the
07-16 history section, if the thread needs the full detail later.)

### Parallel internal facts (not for the customer)

1. **Exact FAR01 TN angle from our side** (viewer console on FAR01: decompose
   `viewer.model.getData().refPointTransform`, read the Z rotation). This one number
   decides the code branch: **folded ≥ 5°** → our gate trusts Revit and never corrects
   (`section-tool-orientation-math.ts:149`); **folded < 5° but non-zero** → our gate
   silently **overrides** the real TN (Rishi's "incorrectly overrides the model").
   Don't wait on delivery for this — it's a 2-minute console check.
2. **Which release FAR01/FAR02 are on and what shipped ~13–14 Jul** (Rishi / release
   owner) — carried over from the 07-16 draft; TN explains susceptibility, the release
   explains timing. Both are needed to close per playbook Q5.

**Status: keep In Analysis.** The 07-16 draft's Q1 (gizmo-absent vs merely-tilted, from
the screenshot Yash has) also still stands — it's the cheapest disambiguator we have.

---

## 2026-07-16 draft (kept as history — superseded by the 07-17 refresh above)

## Chosen action: (a) — post ONE routed comment that pins the observation, asks the deploy trigger, and explicitly links the recurrence

This is a **Major incident that is the 4th recurrence** of the same feature, where the
**decisive evidence is still missing**: we cannot read the screenshot (403), we do not
know whether the box is *tilted* (same class as before) or *has no rectangular gizmo at
all* (a new break), and we have not correlated the July-14 onset to any release. The
playbook is explicit — **facts before theories** (Phase 1) and **close on cause + trigger
+ cohort, never on "looks fine now"** (which is precisely how PLT-2771 was mis-closed 5
days ago). So the right move is a tight, closed, one-owner-per-question comment that also
**names the recurrence and asks for a fix owner** — not a status change and not a
speculative dev hand-off. Keep status **In Analysis**.

## Why this and not the others

- **Not Ready For Development.** There is no confirmed FE defect isolated yet — the
  leading hypothesis (the oriented-box "new style" reaching FAR, or a Forge release
  change) is unproven, and the two obvious code triggers were ruled out. Sending to dev
  now would bounce for lack of repro/root cause, exactly as PLT-2771 did.
- **Not close / "as intended."** The customer is asking to revert a behaviour change; we
  must first confirm *what* changed and *when it shipped* before deciding revert vs fix.
- **Not Blocked.** Nothing external blocks us — the screenshot, a repro on the supplied
  model file, and FAR's release version are all gatherable now.

## Draft comment to post on PLT-2906 (playbook style — closed, one owner each)

> This is the **4th section-box ticket** in ~10 weeks — same feature as **PLT-2651**
> (the oriented-box workaround, shipped 26.2.3), **PLT-2756** (that fix over-tilting
> SWITCH ATL5–7) and **PLT-2771** ("misaligned again," closed on *no-repro + customer
> silence*, 10 Jul — no engineering fix). Flagging it as a **recurrence up front** so we
> don't close it on "can't reproduce" again. Three quick facts, each answerable with a
> value:
>
> 1. @Yash Patel — from `section_box.png` / your own repro on the model file you shared:
>    is there **still a draggable rectangular box just tilted/rotated** (like 2651/2756),
>    or is there **no rectangular box gizmo at all** to grab (matching the user's "doesn't
>    display the rectangular box")? The screenshot isn't legible to me and this decides
>    whether it's the old orientation class or a new break.
> 2. @Rishi Bhugobaun — you built `SectionToolOrientation` (the oriented-box workaround).
>    The user reports this started **~14 Jul 08:00 Central, across all FAR01/FAR02 models
>    with no model change**, and calls it a "new style" they want reverted. **Which
>    release are FAR01/FAR02 on, and did the oriented-box behaviour (or any Forge/LMV
>    viewer upgrade) land on their channel around 13–14 Jul?** (I checked the FE repo:
>    PAPI-3226 "update libs versions" is backend Gradle only — no Forge change — and
>    PLT-2825's "reference-point" removal is room-capture, not Forge `refPointTransform`;
>    neither is the trigger.)
> 3. @Darminder Atker — as assignee/FE owner: given three prior "fixes" and one silent
>    close, can we assign a **standing owner** for the section-box feature so this stops
>    recurring? If Q1 shows the gizmo is genuinely gone (not just tilted), it likely needs
>    a code fix in the `activate('box')` / extension-reload path
>    (`section-tool-service.ts:241-266`, `section-tool-orientation.ts:88-129`), not
>    another per-model orientation tweak.
>
> Scope: the user says "other projects too" — if anyone can confirm the section box is
> broken **right now** on a non-FAR project, that pins global-vs-FAR. Working theory
> (unconfirmed): the oriented-box "new style" reached FAR via a release and doesn't
> render a usable rectangular gizmo on their models — but Q1+Q2 decide it.

**Tag:** Yash (Q1 — screenshot/repro), Rishi (Q2 — mechanism owner + release timeline),
Darminder (Q3 — assignee + ownership). **Keep status In Analysis.**

## What each answer unlocks

- **Q1 = tilted box present** → same class as 2651/2756/2771 → per-model orientation
  heuristic; check `shouldApplyOrientationPatch` firing/not-firing on FAR's `refPointTransform`.
- **Q1 = no gizmo at all** → new break in the box-mode/extension-reload path; a code fix,
  and the customer's "revert it" is literally satisfiable by disabling the oriented-box
  workaround for FAR while it's fixed.
- **Q2 = a release landed 13–14 Jul** → confirms the trigger (why-now answered, unlike
  2771); decide revert-the-feature-for-FAR vs forward-fix.
- **Q2 = no release in window** → pivot to a Forge/LMV server-side viewer change or a
  data change on FAR's federated model.

## Follow-through for a human (not executed here)

- **Do not let this close on "can't reproduce"** — that is how PLT-2771 recurred here.
  It closes only on cause + trigger (which release) + cohort (FAR + any other project).
- **Link PLT-2906 ↔ 2651/2756/2771 in Jira** and assign a **named section-box owner**
  (Rishi is the natural mechanism owner). Recurring regression on one feature with no
  standing owner is the core risk this triage exists to catch.
- **On close, add docs** (this saga is currently undocumented):
  - `dashboard/pitfalls.md` — new entry: *"Section box orientation is a fragile
    reverse-engineered Forge workaround (`SectionToolOrientation`): it mutates
    `refPointTransform` + unload/reloads `Autodesk.Section`. It has mis-fired 4× —
    over-tilting aligned buildings (PLT-2756), reverting to true-north (PLT-2771), and a
    'no rectangular box / new style' report on FAR (PLT-2906). Any change near the box
    activate/reload path or a Forge upgrade must be regression-tested on both an aligned
    building (SWITCH-ATL07) and a diagonal one (SWITCH-ATL08)."*
  - `dashboard/viewer-and-model.md` §"applyRefPoint" — cross-reference the
    `SectionToolOrientation` workaround and its in-repo design note.

## Runner-up

**(c) With Technical Support / client** — only if Yash cannot answer Q1 from the
screenshot + the model file already supplied. Since he has both, an internal repro should
answer Q1 without re-looping the customer.
