# PLT-2906 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — post an internal status update, with ONE closed repro/version step and ONE routed "why now" question

Post an internal update that (1) states the code-verified mechanism, (2) records what the code *rules out* as the trigger (no FE change, immutable viewer pin, no flag, backend-only lib bump), (3) names the leading external-trigger hypothesis, and (4) hands off **one closed next step** (repro with the model file Yash already provided + capture the live viewer version) plus **one routed question** for the "why now" owner. Keep **Ilia Kuzmin** as investigation owner (mechanism interrogator, already engaged); loop **Darminder** (assignee/FE-lead) for the mitigation; route the Autodesk-release-timeline question to **Yash**.

## Why this and not the others

- **Not (b) Ready For Development — yet.** Mechanism is clear (9/10) but the **trigger is unconfirmed (3-4/10)** and it likely lives **outside our code** (Autodesk APS/LMV push). We don't yet know whether the fix is "re-pin/roll the viewer version", "harden the unsupported `refPointTransform`/`setSectionFromState` patches", or "nothing — Autodesk will roll back". Routing to Dev before viewing the screenshot and pinning the live viewer version risks scoping the wrong fix. The playbook is explicit: confirm the trigger (with an owner) before closing/routing. One repro + version check flips this to (b) with a precise scope.
- **Not (c) With Technical Support / client question.** We already have everything we need from the customer: detailed answers (all models, dated onset, model not updated), the screenshot, and — as of 2026-07-16 — the model file. The decisive next steps are **internal** (repro, DevTools version check, Autodesk release timeline), not a customer ask. Going back to the client now just re-loops the ticket. (One *optional* client question — "did the affected tab also open a Canvas view?" — is minor and can ride along, not worth parking the ticket for.)
- **Not (d) Blocked.** Nothing external blocks us; the next move (repro with the supplied model file + live-version check) is entirely in our hands.

## Draft — internal reply (author: Ilia Kuzmin; @ Yash Patel, cc Darminder Atker)

Playbook style: status = state + so-far + evidence quality; mechanism stated once; one closed next step with an owner; one routed question; explicit scoping; hypotheses phrased as questions.

> @Yash Patel — update on PLT-2906 (Section Box "misaligned / new style" on FAR01, FAR02 + others). Thanks for the model file.
>
> **Mechanism (confirmed in code):** the Section Box is **Forge's `Autodesk.Section` extension** (we don't draw the box ourselves), loaded at a **pinned** viewer build `7.117.0`. On top of it we run an **orientation patch** that mutates Forge-internal data (`refPointTransform`), unloads/reloads the extension, and monkeypatches one of its methods (`section-tool-orientation.ts:88-129`, `section-tool-service.ts:274-288`). Those patches are tied to Forge's *internal* implementation — if Forge's Section internals change under us, the box can mis-orient **and/or** stop rendering. That matches both halves of the report ("no longer aligns" + "doesn't display the rectangular box").
>
> **What our code rules OUT as the cause:** section-tool code unchanged since 17 Jun; viewer version pinned (immutable) at 7.117.0; the orientation patch isn't flag-gated (so no toggle flip); PAPI-3226 was backend-only. So **nothing we shipped explains a July-14 onset across all models and multiple projects with no model update.**
>
> **Leading hypothesis (unconfirmed):** an **Autodesk-side (APS/LMV) change** landed ~13-14 Jul that broke our patch. A pinned viewer still fetches sub-modules/workers and derivatives at runtime, so an Autodesk push hits every project at once. (Secondary: our Canvas page loads a **non-pinned `7.*`** viewer — `ForgeViewerStatic.ts:30` — and the SDK is a global singleton, so a Canvas visit could pull a newer 7.x that a later ViewerPage reuses.)
>
> **One step to confirm (owner: me, needs the model file + an affected session):** reproduce with the model you sent, and in DevTools read `Autodesk.Viewing.VERSION_STRING` in an affected session — if it isn't `7.117.0`, that's the trigger. I'll also test an axis-aligned model: if that's broken too, it exonerates our orientation patch and points squarely at Forge.
>
> **@Yash — one for the "why now":** can we find out whether Autodesk released a new 7.x viewer or changed the model-derivative service around 13-14 Jul (APS release notes / BE-ops)? That's the missing piece.
>
> Scoping: this is the web viewer's Section Box tool (ViewerPage + Forge), not a dashboard/data issue; and it's a regression of prior behaviour, not a feature request.

## The evidence steps to run (owner: Ilia; needs the model file + an affected/dev session)

The playbook's temporal broken-vs-working diff (working <14 Jul vs broken after) turned into concrete checks:

1. **View `section_box.png`** — pin the exact failure mode: no box / degenerate box / tilted box / plane-only. Each implicates a different layer of the mechanism (NEEDS HUMAN in `context.md`).
2. **Repro with the supplied model file** and read `Autodesk.Viewing.VERSION_STRING` in an affected session. **Expected if the hypothesis holds:** version ≠ `7.117.0` (i.e. Autodesk served something other than the pin), or the box mis-renders even at 7.117.0 (⇒ derivative/sub-module change).
3. **Axis-aligned control model:** if an axis-aligned model (where the orientation patch should be a no-op) is *also* broken, the patch is exonerated and the cause is Forge/Autodesk-side, not our orientation math.

## Follow-through the human should own (not executed here)

- **After the checks:** move to **Ready For Development** with the confirmed scope — most likely one of: (i) **re-pin / roll the viewer version** (fastest mitigation if Autodesk changed 7.x under us); (ii) **harden the unsupported patches** (guard the `refPointTransform`/`setSectionFromState`/`_transform` assumptions against the new Forge shape, or fall back to the plain axis-aligned box when they don't hold); (iii) if Autodesk-side and transient, monitor/roll-back on their side. Owner: **Darminder** (FE), backup **Rishi**.
- **Fix the Canvas `7.*` footgun regardless** — pin `ForgeViewerStatic.ts` to the same version as `init-autodesk.tsx` so the two loaders can't skew the shared global (`ForgeViewerStatic.ts:30,34`).
- **Answer "why now" with an owner** (playbook #5): Yash/BE-ops to establish the Autodesk release/derivative timeline for 13-14 Jul — don't let it drop; an unexplained trigger means it recurs.
- **Cohort sweep** (playbook #6): if Autodesk-side, the affected set is *every web-viewer Section Box user* — coordinate a single client-facing status via Yash rather than per-ticket.
- **Post-close:** add a `dashboard/pitfalls.md` (or viewer/section pitfalls) entry: "Section Box uses Forge's `Autodesk.Section` patched via **unsupported internal mutations** (`refPointTransform`, extension reload, `setSectionFromState` monkeypatch) — an Autodesk viewer/derivative change can break it with no deploy on our side; the pinned `7.117.0` in `init-autodesk.tsx` does not fully insulate us (runtime-fetched sub-modules/derivatives), and Canvas's `7.*` loader is an additional skew risk."
