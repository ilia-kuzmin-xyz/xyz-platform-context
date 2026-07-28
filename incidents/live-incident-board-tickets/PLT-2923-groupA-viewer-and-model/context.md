# PLT-2923 — "QA STRUCTUAL FAB MODEL NOT LOADING ON WEB VIEWER" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2923
- **Type:** Live Incident · **Priority:** Major · **Status:** **With Customer**
- **Reporter / Assignee:** Yash Patel (both)
- **Project:** WI1 · **Software Area (form):** Web Viewer · **Device still usable?:** Not Usable
- **Created:** 2026-07-23 14:50 (+0100) · **Last updated:** 2026-07-23 16:33 (+0100) — same-day, fresh
- **Freshdesk:** #7494, currently "Waiting on customer"
- **Model:** `QA-WI11-SFI-ZZ-ZZ-M3-S-000001_STRUCTURAL FAB MODEL.ifc-V19` (an **IFC** file, structural fabrication discipline)
- **Session id (Yash's own failed attempt):** `platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3`
- **Attachment:** `Screenshot 2026-07-23 072317-20260723-135245.png` — ⚠️ NEEDS HUMAN, binary PNG behind Atlassian auth, cannot view.
- No existing folder — this is the first triage pass.

---

## One-line symptom

The IFC structural-fab model **fails to load in the web viewer** ("Model not loaded" class of failure) but **loads successfully on the field device** (HoloConstruct atom helmet / HoloSite). Support (Yash) **reproduced the web-viewer failure himself**, on his own machine — this is not a client-environment-only report.

---

## Comment timeline (verbatim, chronological)

1. **Yash (14:53):** reports the model fails in web viewer, works in HoloSite; attaches screenshot; states *"I tried to load it on web viewer on my end and failed. Session id - platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3"*; asked user to upload the model file.
2. **Yash (14:53):** Freshdesk #7494 → "Waiting on customer"
3. **Ilia (15:13):** *"Yes, the source model would be helpful. Can we also ask the customer where they exported it from? Also, does the model look fine in Revit?"*
4. **Yash (15:18):** Freshdesk #7494 → "Open" (customer replied/updated)
5. **Yash (15:38):** Freshdesk #7494 → "Waiting on customer" again (final state — status matches Jira "With Customer")

No comments since 15:38. **Status accurately reflects reality: genuinely parked on the customer** for the model file + export/Revit answers Ilia asked for. This is a correctly-parked ticket, not a stalled one (contrast PLT-2906, where the ball was on our side).

---

## Playbook six-question pass

**1. Observed / can we see it?** Partially, and unusually well for a fresh ticket: Yash reproduced the exact failure himself (`platform-web-63303495-…`), so this is not "rumor" — it is a confirmed, our-side-reproducible defect, not a client-specific permission/environment issue. The screenshot would show the exact on-screen failure mode (silent blank viewport vs. an explicit "Model not loaded" toast vs. a translation-still-processing state) but is unviewable here.

**2. Expected / on whose authority?** The model loads correctly on the HoloConstruct field device (atom helmet/HoloSite) — a same-file, same-day, working reference, stated directly by the customer and not yet disputed. This is a real broken-vs-working pair, not folklore (see Q3).

**3. Smallest broken-vs-working pair?** **Same IFC file** (`…STRUCTURAL FAB MODEL.ifc-V19`), same day: **works on-device, fails in web viewer.** This is the single most useful fact in the ticket — it isolates the defect to something specific to the *web-viewer's* loading path (Autodesk Forge Model Derivative translation + AggregatedView geometry load), since the on-device pipeline reads the same source file successfully. It does **not** yet tell us whether the cause is (a) the IFC's translated Forge derivative producing no/partial geometry, or (b) something else entirely (URN resolution, permissions, network) — the screenshot/console would disambiguate.

**4. Mechanism — what decides this? (code-verified)**
- ViewerPage model load: `_loadModel()`, `hc-frontend/src/main/webapp/app/pages/organisation/ViewerPage/components/viewer-x/components/services/viewer-service.ts:939-1024`.
  - `_loadAggregatedDocument()` (`:1030-1076`) calls `Autodesk.Viewing.Document.load('urn:'+urn, onSuccess, onError)`. `onError` rejects with `Error loading document: ${errCode} - ${errMessage}` (`:1071-1073`) — this is the URN/permission/translation-not-found failure class.
  - If the document loads, it searches for a 3D viewable bubble by name (`Navis` / `XYZ` / `EXPORT TO HOLOSITE` / `{3D}` / first match, `:1052-1065`). If none found, resolves `null` and the caller silently returns (`:946` `if (!bubble) return null`) — **a second, silent failure mode with no toast at all.**
  - If a bubble is found, `aggregatedView.load(bubble)` (`:952-953`) downloads/parses the SVF2 fragment list. The `catch` block (`:1006-1020`) has a **specific, named failure path**: if `error.message.includes('Fragment list')`, it shows a toast — *"Model not loaded - no geometry found. Please check the model and try again."* (`:1011-1017`) — otherwise it rethrows.
- **This "Fragment list" branch is exactly the shape of the reported symptom.** It fires when Forge's translated derivative (SVF2) for the chosen viewable has an empty/invalid fragment list — i.e. the model *translated* (so `Document.load` succeeds, a viewable bubble is found) but produced **no renderable geometry**. This is a known Autodesk Model Derivative limitation class for IFC inputs: fabrication-discipline exports (dense proxy geometry, non-standard IFC entity types, e.g. structural steel connections) can translate "successfully" per Forge's manifest status while yielding zero fragments in the 3D viewable — while a native/on-device reader (not going through Forge SVF2 translation at all) renders the same file fine. That asymmetry matches "works on atom helmet, fails on web viewer" precisely.
- **Cannot yet confirm** which of the three failure shapes actually fired (Document.load errCode / silent no-bubble / Fragment-list toast) without console output from Yash's own repro session or the screenshot.

**5. Why now (trigger)?** Not established — this looks like a **per-model** issue (one specific IFC export), not a regression: no other project/model is reported affected, and nothing in the ticket suggests a recent deploy. The natural trigger candidate is the **specific IFC export** (this V19 version, or the exporter/settings used to produce it) rather than a platform-wide change. Needs the export-tool/Revit answer Ilia already asked for.

**6. Who else (cohort)?** Not established — single model, single project (WI1), reported by one user. No evidence yet of a broader pattern; nothing to sweep until the mechanism is confirmed.

---

## Doc references (xyz-platform-context)

- `dashboard/viewer-and-model.md` — documents the shared `viewer-y.tsx` / AggregatedView loading pipeline, `applyRefPoint`/`applyScaling`, and dashboard-specific selective fragment loading, but has **no existing entry for the "Fragment list / no geometry" failure class** described in `viewer-service.ts:1006-1020`, nor for IFC-specific translation limitations. Worth adding once this closes (candidate `pitfalls.md` entry: "IFC exports can translate with an empty fragment list — Forge manifest 'success' does not guarantee renderable geometry").
- No prior PLT ticket in `incidents/live-incident-board-tickets/` covers this exact "Fragment list" / empty-geometry failure mode. PLT-2892 (dashboard model "syncing forever") is a related-but-distinct failure — that one is a translation *stall* with no error surfaced at all (infinite spinner); this ticket, if it is the "Fragment list" branch, is a translation that *completes* but yields zero geometry (explicit toast). Different symptom, same broad "Forge derivative doesn't behave as expected for this model" family.
- `incidents/live-incident-playbook.md` — followed for tone/format; this ticket is the good case (Q1-Q3 largely already answered by the reporter without an unreadable screenshot being load-bearing).

---

## Confidence (per `xyz-platform-context/CLAUDE.md` scale)

- **FE loading mechanism (`_loadModel` / Document.load / Fragment-list toast), code-verified:** 8/10.
- **That this specific ticket is the "Fragment list / empty geometry" branch specifically (vs. a URN/silent-no-bubble failure):** 4/10 — strongly suggested by the works-on-device/fails-on-web contrast and by IFC-fabrication-model translation being a known Forge limitation class, but **not confirmed** without console output from Yash's own repro session or the source IFC file.
- **Overall triage confidence: 5/10** — mechanism and next steps are clear and code-grounded; the specific cause on this model needs either (a) Yash's own console/session evidence (available now, no customer wait) or (b) the customer's source file + Revit/export answers (already requested, in progress).

## Needs human

- ⚠️ **NEEDS HUMAN:** `Screenshot 2026-07-23 072317-20260723-135245.png` — binary PNG behind Atlassian auth, cannot view. Would confirm which of the three failure shapes is on screen (explicit "Model not loaded - no geometry found" toast vs. blank/silent viewport vs. something else).
- ⚠️ **NEEDS HUMAN (fast, no customer wait):** Yash's own session `platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3` — he reproduced the failure on his own machine, so a look at his browser console (or re-running the repro with DevTools open) would immediately tell us whether the "Model not loaded - no geometry found" toast fired (confirms Fragment-list/empty-geometry branch) or whether it was a different error entirely. This does not require the customer and can happen in parallel with waiting for the uploaded model.
