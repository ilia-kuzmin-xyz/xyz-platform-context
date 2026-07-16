# PLT-2906 — "Section box misaligned [from] model — FAR01" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2906
- **Issue type:** Live Incident ("To track live incidents on site.") · Software / Dashboard
- **Status:** **In Analysis** (category: In Progress / yellow). Freshdesk #7424 last set **"Waiting on 3rd line" (2026-07-16 08:47)** — i.e. ball is back with **us**.
- **Priority:** Major
- **Project (site):** FAR01 (customer says it also affects FAR02 and "some other projects")
- **Reporter:** Yash Patel (coordinator/support) · **Assignee:** Darminder Atker (fullstack lead)
- **Created:** 2026-07-15 · **Last updated:** 2026-07-16
- **Components / Labels:** none
- **Attachments:** 1 × `section_box.png` (149 KB, image/png, attachment id 60808) — **unreadable here, see NEEDS HUMAN**. Plus a SharePoint model-file link in comment 107517.
- **Domain slug chosen:** `viewer-and-model` (justified below)
- **Summary typo:** "misaligned form model" = "misaligned **from** model".

---

## One-line symptom

On the **web viewer** (ViewerPage), when the user turns on **Section Box**, the box (a) **"no longer aligns the way it used to"** and (b) **"doesn't display the rectangular box"** — a *"new style"* the user finds unusable for adjusting/sectioning. The user asks to **revert Section Box to the previous behaviour**. Reported across **all models** in FAR01 and FAR02 and "**some other projects**"; **dated onset July 14 2026 ~08:00 Central (~14:00 UK)**; the **models were not updated** beforehand.

There are **two distinct complaints** in one sentence, and they must not be conflated:
1. **Misalignment** — the box orientation is wrong relative to the model (this is the recurring "section box misaligned" class: PLT-2651, PLT-2771, PLT-2756).
2. **Missing/changed gizmo** — "doesn't display the rectangular box" — the draggable rectangular box *itself* is gone or renders differently ("new style"). **This second symptom is NEW** — it is not what the prior orientation tickets described.

---

## Playbook questions applied

**1. What exactly is observed — can we observe it?** Not yet in our own hands. We have a screenshot (`section_box.png`, unviewable here) and, as of 2026-07-16, the customer's **model file** (comment 107517). No internal repro captured yet. The screenshot is the single decisive artifact for disambiguating the failure mode (no box at all / degenerate tiny box / tilted box / plane-only) — see NEEDS HUMAN.

**2. Expected — on whose authority?** "How it was before" — the customer's memory of the old Section Box (a visible axis-aligned rectangular wireframe box with face handles). This is a dated-regression claim ("started recently", "July 14 ~08:00"), i.e. a claim to verify with a deploy/version timeline, **not** a starting fact (playbook Q2). No spec/design token cited.

**3. Smallest broken-vs-working pair.** Not a within-model pair (the user says **all** models are affected). The meaningful diff here is **temporal**: working before ~July 14 vs broken after → diff what changed in that window (see Q5). Secondary diff worth running: an axis-aligned model (the orientation patch should be a no-op) vs a tilted one — if an axis-aligned model is *also* broken, the orientation patch is exonerated.

**4. Mechanism — what decides it?** See next section. The Section Box is **Forge's `Autodesk.Section` extension**, loaded from a **pinned** viewer build `7.117.0`, and **heavily patched by our `SectionToolOrientation` service using unsupported Forge-internal mutations** (mutating `refPointTransform`, unload/reload of the extension, monkeypatching `setSectionFromState`). Any change to Forge's Section internals breaks these patches → misalignment and/or a box that doesn't render.

**5. Why now? (trigger) — the central question for this ticket.** **Not established; this is the crux.** What we can rule out from code:
   - **Not a frontend section-tool deploy.** All section-tool files (`section-tool-service.ts`, `section-tool-orientation.ts`, `section-box-helper-functions.ts`, `init-autodesk.tsx`) were last modified **2026-06-17** (commit `18655bc`, PLT-2811) and are unchanged since. (Caveat: this checkout's git history is shallow/squashed — treat "unchanged since 17 Jun" as best-available, not absolute.)
   - **Not a viewer-version bump in our code.** `init-autodesk.tsx` has pinned `7.117.0` throughout available history (Autodesk versioned viewer URLs are immutable).
   - **Not the orientation patch being newly enabled.** It is **not feature-flagged** — it runs unconditionally on every box activation (`section-tool-service.ts:246`), so no July-14 flag flip is possible; and it is **selective by geometry** (only tilted buildings, `tightness < 0.9`), so it cannot explain "all models, incl. axis-aligned ones".
   - **Not PAPI-3226.** The 2026-07-15 "update libs versions" commit touched only `build.gradle`/`gradle.properties` (backend Java libs) — no frontend viewer impact.
   The cohort breadth (**all models, multiple projects**) + **single dated onset** + **no model update** + **no relevant deploy** is the classic signature of an **external / global change** — most plausibly an **Autodesk APS/LMV server-side push** (viewer sub-modules, workers, or the SVF2/OTG model-derivative service are fetched at runtime even by a pinned bundle) landing ~July 13-14. **Leading hypothesis, UNCONFIRMED** — needs the version/release-timeline check in NEEDS HUMAN.

**6. Who else? (cohort)** Per the customer: every model in FAR01 + FAR02 and "some other projects" — i.e. effectively **every project that uses Section Box on the web viewer**. If the trigger is Autodesk-side, the cohort is *all users of the web viewer's section tool*, not a data subset. Not yet enumerated by us.

---

## Mechanism (code-verified) — how "Section Box" is produced and patched

Path: viewer-bar button → `SectionToolService` → our `SectionToolOrientation` patch → Forge `Autodesk.Section`. All refs under `hc-frontend/src/main/webapp/app/pages/organisation/ViewerPage/`.

1. **Entry point.** "Section box" menu item / **Shift+B** → `activateSectionBox()` → `viewerService.sectionToolService.toggleSectionTool()` — `components/viewer-bar/tools/section-tool-button.tsx:45-48` (hotkey registered `:27`). `toggleSectionTool` defaults to `'box'` and calls `activateSectionTool('box')` — `components/section-tool/section-tool-service.ts:202-239`.

2. **The viewer + Section extension are Autodesk/Forge, loaded at a PINNED version.** The ViewerPage loads the SDK via `hooks/init-autodesk.tsx:9-16` — hard-pinned **`.../viewers/7.117.0/viewer3D.min.js`** (+ `style.min.css`). The viewer is initialised with `env: 'AutodeskProduction2'`, `api: 'streamingV2'` (SVF2) — `components/viewer-x/viewer-y.tsx:164-165,196`. The Section Box gizmo and its cut-planes are rendered entirely by Forge's `Autodesk.Section` extension; we do not draw the box ourselves.

3. **We patch Forge's Section extension with UNSUPPORTED internal mutations** (`components/section-tool/section-tool-orientation/section-tool-orientation.ts`, `_doPatch` `:88-129`):
   - Decompose the model's `refPointTransform` and measure `existingRotZ` (`:98-102`).
   - Compute the building's true orientation via min-area-rectangle of the footprint (`:104-109`); patch only if `shouldApplyOrientationPatch({existingRotZ, tightness})` (`:110`).
   - **`refPointTransform.makeRotationZ(rect.angle)`** — *mutates Forge-internal `ModelData`* (`:115`).
   - **`viewer.unloadExtension('Autodesk.Section')` then `await viewer.loadExtension(...)`** — reloads the extension so its constructor-time `getDefaultTransform()` re-reads the mutated transform (`:117-123`); strips re-added Forge hotkeys (`:126`).
   - Notifies the parent via `onExtensionReloaded` (`:128`) → `SectionToolService._applySectionExtensionOverrides()`.
4. **We also monkeypatch a Section-extension method.** `_applySectionExtensionOverrides()` overwrites `this._sectionExtension.setSectionFromState` and reaches into Forge internals — `this.enableSectionTool(true)`, `this.mode = 'box'`, `this.buttons[this.mode]?.setState(...)`, `this.activeStatus` — `section-tool-service.ts:274-288`.
5. **Box activation.** After the patch, `_activateBoxSectionTool` computes the box (`defaultBBox || orientation.calculateFittedBoundingBox() || _calculateTotalBoundingBox()`), then `this._sectionExtension.activate('box')` and `this._sectionExtension.setSectionBox(totalBBox)` — `section-tool-service.ts:241-266`. `calculateFittedBoundingBox()` returns a **tight, rotated** box carrying a `.transform` so SectionTool skips its own inverse-transform step (`section-tool-orientation.ts:73-86`).

**Why this matters for the symptom.** Every one of the mutations in (3)-(4) is coupled to the *internal* implementation of Forge's Section extension (`getDefaultTransform`, `_transform`/`_inverseTransform`, `setSectionFromState`, `this.buttons`, `this.mode`). The `section-tool-orientation.md` doc says as much ("There is no public API to update `_transform` after construction. The only runtime fix is to mutate `refPointTransform` before the extension loads"). **If Forge's Section internals change under us — new viewer sub-bundle, changed method shape, changed derivative metadata — these patches silently break, which produces exactly the two reported symptoms: a box in the wrong orientation and/or a box that does not render ("new style, no rectangular box").**

### Second viewer loader uses a NON-pinned channel (latent footgun)
The **Canvas** page loads the SDK from a **wildcard `7.*`** channel — `pages/CanvasPage/components/ForgeViewerStatic.ts:30,34` (`.../viewers/7.*/viewer3D.min.js`). `7.*` resolves to Autodesk's **latest** 7.x. The SDK is a **global singleton** (`window.Autodesk.Viewing`); the Canvas loader early-returns if `window.Autodesk?.Viewing` already exists. In a single tab, whichever loader runs first defines the global. This is a real cross-page version-skew risk (a Canvas visit could pull a newer 7.x that a later ViewerPage reuses), and independently means Autodesk *did* have a moving-target 7.x channel wired into this app. **Flagged as a hypothesis to check, not asserted as the cause** — the reported surface is ViewerPage, which is pinned.

---

## Regression vs new

**Mixed — best read as a NEW incident that resembles the old class.** The prior "section box misaligned" tickets (**PLT-2651** "misaligned with BIM models", **PLT-2771** "misaligned again", both Done; **PLT-2756** SWITCH-ATL07, documented in `section-tool-orientation.md`) were all about **orientation** and were addressed by the `SectionToolOrientation` patch. This ticket's **alignment** half is that same class and *could* be a regression of the patch. But the **"doesn't display the rectangular box / new style"** half is a **new symptom** not described in the prior tickets, and the cohort (all models incl. presumably axis-aligned ones, all projects, one dated onset) does not fit the selective, geometry-gated orientation patch. The evidence points to an **external trigger** (Autodesk-side) that both breaks our orientation patch (→ misalignment) and changes the box rendering (→ "new style"). Confirm by pinning the live viewer version and viewing the screenshot.

---

## Bug vs feature-gap

**This is a BUG (regression of working behaviour), not a feature request.** Section Box demonstrably worked before ~July 14; the user is asking to restore prior behaviour. If the trigger is Autodesk-side, the *fix* may be an emergency mitigation on our side (e.g. re-pin/roll the viewer version, harden or bypass the unsupported patches), not necessarily new product work.

---

## Domain slug — why `viewer-and-model`

The Section Box is a **ViewerPage 3D-viewer tool**; all implicated code is under `ViewerPage/components/section-tool/`, `viewer-bar/tools/`, `viewer-x/` and `hooks/init-autodesk.tsx`, and the rendering owner is Forge's `Autodesk.Section` extension. This is squarely the `viewer-and-model` (VWR) domain (`dashboard/viewer-and-model.md`). No other tag (filter/quality/360/progress/data-pipeline/access) is even close.

---

## Confidence (per xyz-platform-context CLAUDE.md scale), by claim

- **Mechanism — how the Section Box is produced and patched** (Forge `Autodesk.Section` at pinned 7.117.0; patched via unsupported `refPointTransform` mutation + extension reload + `setSectionFromState` monkeypatch; box built by `calculateFittedBoundingBox`): **9/10** — read directly from source with file:line; not flag-gated; entry point confirmed.
- **Root-cause attribution — the "why now" trigger** (external Autodesk APS/LMV-side change ~July 13-14, breaking our internal patches): **3-4/10** — strongly *implied* by elimination (no FE change, immutable pin, no flag, backend-only lib bump) and by the cohort/onset shape, but **not confirmable from this repo** — needs the live viewer-version check + Autodesk release timeline + the screenshot. Environment/vendor-dependent.
- **Regression vs new** (new incident resembling the old misalignment class; the "no rectangular box" symptom is novel): **6-7/10** — the alignment half could still be a patch regression; can't fully separate without a repro.

**Overall triage confidence: ~6/10.** Mechanism is solid; the decisive gap is the *trigger*, which is external and needs one internal repro/version step + the (currently unreadable) screenshot.

---

## NEEDS HUMAN (unreadable media / vendor-side data / env access)

- ⚠️ **`section_box.png`** (attachment id 60808, 149 KB, image/png, uploaded by Yash Patel 2026-07-15) — **the single decisive artifact**, unviewable here (binary behind Atlassian auth). It disambiguates the failure mode: **no box rendered** vs **degenerate/tiny box** vs **tilted/mis-oriented box** vs **plane-only**. Each points at a different layer of the mechanism above. **Do not guess its contents.**
- ⚠️ **Customer model file** — SharePoint link in comment 107517 (`https://xyzrealityltd.sharepoint.com/:u:/s/TechnicalSupport/...`), provided 2026-07-16. Use it for the internal repro. (Ilia asked for it — comment 107459 "yes, please"; Yash delivered it.)
- ⚠️ **Live viewer version in an affected session** — in DevTools on an affected project run `Autodesk.Viewing.VERSION_STRING` (and note whether the tab had visited **Canvas** first, which loads the `7.*` channel). Confirms/kills the "Autodesk pushed a new viewer" and "Canvas 7.* global contamination" hypotheses. **Env access needed.**
- ⚠️ **Autodesk APS/LMV release timeline** — did a new 7.x viewer or a model-derivative/SVF2 service change land ~July 13-14 2026? (Check APS release notes / ask BE-ops.) This is the owner-assigned "why now".
- ⚠️ **BE/derivatives** — any change to model translation / `refPointTransform` / bounding metadata on FAR01/FAR02 around July 14 (customer says the *model* wasn't updated, but the *derivative service* could have changed independently).

---

## Roster / ownership notes

- **Darminder Atker** (assignee, fullstack lead) — correct owner for any FE mitigation (re-pin/roll viewer version; harden the unsupported patches).
- **Ilia Kuzmin** (mechanism interrogator, ilia.kuzmin@xyzreality.com) — already engaged on-ticket ("yes, please" to the model file); natural owner of the repro + live-version check.
- **Yash Patel** (reporter/coordinator) — owns client comms; already secured the model file. Best-placed to own the Autodesk release-timeline "why now" question and to ask the customer, if needed, whether affected tabs also use Canvas.
- **Rishi** (senior FE) — backup for the FE mitigation.
- Expect a hop to **BE-ops / Sergey / Sachin+Ali** only if the trigger turns out to be the SVF2/derivative service.

## Doc / knowledge-base refs
- `hc-frontend/.../section-tool/section-tool-orientation/section-tool-orientation.md` — documents the unsupported-mutation approach and prior misfire **PLT-2756** (SWITCH-ATL07); confirms the patch is coupled to Forge internals (`getDefaultTransform`, `_transform`).
- `xyz-platform-context/dashboard/viewer-and-model.md` — VWR domain: `applyRefPoint`/`refPointTransform` shared-coordinate origin ("The section tool reads this transform to orient cutting planes in world coordinates"), viewer profiles/contexts.
- `xyz-platform-context/incidents/live-incident-playbook.md` — six-question frame; "why now needs an owner"; "close on cause + trigger + cohort, never on works-now".
