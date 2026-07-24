# PLT-2923 — "QA STRUCTUAL FAB MODEL NOT LOADING ON WEB VIEWER" — triage context

- **Domain slug:** `viewer-and-model`
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2923
- **Type:** Live Incident · **Priority:** Major · **Status:** **With Customer** (in-scope per this
  folder's scope rules — "With Customer" ≠ the excluded "With Technical Support")
- **Assignee/Reporter (Jira):** Yash Patel (support) · **Investigation lead:** Ilia Kuzmin
- **Project:** WI1 · **Software Area:** Web Viewer
- **Created:** 2026-07-23 — **the newest ticket on the board this run.** Missed in this run's
  first pass because "With Customer" was initially (wrongly) treated as excluded — corrected
  against this folder's own README scope rules, which explicitly carve it in-scope. See the run's
  README entry for the correction note.
- **Attachments:** 1 screenshot (unreadable here — see NEEDS HUMAN)
- **Freshdesk:** #7494, currently "Waiting on customer"

---

## One-line symptom

The model **`QA-WI11-SFI-ZZ-ZZ-M3-S-000001_STRUCTURAL FAB MODEL.ifc-V19`** (an **IFC**-derived
model, project WI1) does **not load in the web viewer** (browser). The customer reports the same
model **loads fine on-device** ("in the field when using the atom helmet" — the on-site AR
headset / "holosite" client, a separate product surface not in this repo). Yash reproduced the
web-viewer failure independently (session `platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3`).

**This is a genuinely useful broken-vs-working pair (playbook Q3):** same model, same underlying
translated geometry presumably, one client renders it and one doesn't. That strongly points at
something **specific to the web viewer's Forge-derivative loading path** (or to how that
derivative was produced for this specific IFC file) rather than the source model being wholesale
corrupt — a wholesale-corrupt model would more plausibly fail everywhere.

---

## Comment timeline (verbatim, chronological)

1. **Yash (07-23 14:53):** relays the report, confirms he reproduced the load failure himself on
   web viewer, and states he's **"asked user to upload model file."**
2. **Yash (07-23 14:53):** Freshdesk → "Waiting on customer."
3. **Ilia (07-23 15:13):** *"Thanks, Yash. Yes, the source model would be helpful. Can we also ask
   the customer where they exported it from? Also, does the model look fine in Revit?"* — three
   good, closed, playbook-style questions: (a) get the source file, (b) export origin/tool, (c)
   sanity-check in the authoring tool.
4. **Yash (07-23 15:18 / 15:38):** Freshdesk flips Open → Waiting on customer again (routine status
   churn, not new information).

**No comments after 07-23 15:38.** The ticket is one day old and already in the *correct* state:
we've asked the right questions and are waiting on the customer to answer them. **This is not a
stall** (contrast PLT-2906/PLT-2649 in this same run, where our own analysis is the open loop) —
the very next fact needed (the source IFC file) can only come from the client.

---

## Mechanism (code-verified, 2026-07-24) — a concrete, testable lead

hc-frontend does **not** run any IFC→SVF/SVF2 translation itself, and has **no translation-status
polling anywhere** (`getManifest`/`translationStatus`/`derivativeStatus` — zero matches). The web
viewer only **consumes a pre-existing Forge derivative by URN**; translation happens upstream
(ACC/backend), out of this repo.

- Load entry point: `_loadAggregatedDocument`, `viewer-x/components/services/viewer-service.ts:1030-1076`
  → `Autodesk.Viewing.Document.load('urn:' + urn, ...)`.
- **The decisive detail: viewable selection is by NAME, with a fallback chain**
  (`viewer-service.ts:1052-1065`): `'Navis'` → `'XYZ'` → **`'EXPORT TO HOLOSITE'`** → `'{3D}'` →
  `viewables[0]`. This directly matches the symptom's shape: **holosite (the on-device client)
  most plausibly consumes the `EXPORT TO HOLOSITE` named viewable**, while the web viewer walks the
  *same* fallback list looking for a bubble by name. **If this IFC derivative's manifest carries
  only an `EXPORT TO HOLOSITE`-named viewable and no `Navis`/`XYZ`/`{3D}` bubble the web path
  actually renders from** (or that viewable's own geometry is empty/incomplete for the web
  consumer), the two clients would diverge exactly as reported: on-device works (reads the bubble
  meant for it), browser doesn't (no matching earlier-priority bubble, or an empty one).
- **If no bubble matches at all: silent no-op.** `_loadModel` (`:939-1024`) does `if (!bubble)
  return null` at `:945-946` — **no toast, no error, nothing surfaces to the user.** This would look
  exactly like "does not load" with no explicit error, which is consistent with the ticket
  containing no quoted error message from the customer (only a screenshot, unread — see NEEDS
  HUMAN).
- **No IFC-specific branch exists anywhere in the load path.** `model.fileType` is captured
  (`:1046-1047`) but never used to alter loading logic — IFC gets no special handling, good or bad.
- **Error surfacing, if any does fire:** only a `'Fragment list'` substring match produces a
  specific toast ("Model not loaded - no geometry found..."); anything else re-throws to a generic
  `"Failed to load the Editor"` boundary (`viewer-error.tsx:16`). **The FE cannot currently
  distinguish "translation still processing" from "translation failed" from "incomplete
  derivative"** — all three would look the same or silent to the user.

**This reframes Ilia's three customer-side questions as still exactly right, but adds a concrete,
checkable hypothesis that doesn't require the source file at all:** once the model's Forge
manifest/viewables are inspectable (dev/BE access, not customer-side), check whether an
`EXPORT TO HOLOSITE` viewable exists **without** a matching `Navis`/`XYZ`/`{3D}` one, or whether the
web-priority viewable's geometry is empty. That would confirm mechanism (b) below without waiting
on the customer at all — worth doing in parallel with the customer ask, not instead of it.

No IFC precedent exists elsewhere on this board or in `dashboard/pitfalls.md` /
`viewer-and-model.md` (checked) — closest prior incident is PLT-2892 ("model syncing forever"),
a different symptom shape (never-completes vs never-starts) and not IFC-attributed.

---

## Playbook six-questions status

1. **Observed & reproducible?** ✅ Yes — Yash reproduced the web-viewer failure himself
   (session id given). Not yet reproduced *in our hands* against the actual source file, though —
   that's what's being requested.
2. **Expected, on whose authority?** The model loading successfully **on-device (holosite/atom
   helmet)** is the reference — a same-model, same-day, cross-client working comparison, not
   folklore.
3. **Smallest broken-vs-working pair?** ✅ Already handed to us: same model, web viewer (broken) vs
   on-device viewer (works). **Mechanism section above names the likely diff:** the viewable-name
   fallback chain (`Navis`/`XYZ`/`EXPORT TO HOLOSITE`/`{3D}`) may resolve to a different, and for
   the web path empty or missing, bubble than the one holosite reads.
4. **Mechanism?** ✅ Code-verified lead above (viewable-name fallback + silent-null-bubble path);
   **not yet confirmed against this specific model's actual manifest** — that requires either the
   source file (Ilia's ask) or direct Forge-manifest inspection (dev/BE, doesn't need the customer
   at all — see the parallel check above). Two live hypotheses, not yet distinguished: (a) the
   source IFC export is malformed in a way that produces an incomplete/wrong-named-viewable
   derivative; (b) the web-viewer's fallback-by-name logic is itself brittle for whatever viewable
   names *this* IFC pipeline actually emits (a gap that could affect other IFC-sourced models too).
5. **Why now (trigger)?** Not established — no claim of "it used to load." Treat as a first
   encounter with this specific file, not a regression, until told otherwise.
6. **Cohort?** Unknown — single model reported so far. **Now a sharper question given the
   mechanism finding:** do other IFC-sourced models (this or other projects) also lack a
   `Navis`/`XYZ`/`{3D}`-named viewable and only carry `EXPORT TO HOLOSITE`? That would make this a
   systemic IFC-pipeline gap, not a one-off bad export — worth a manifest-name audit across a few
   other IFC models once one is confirmed, independent of whether *this* customer's file turns out
   malformed.

---

## Bug vs feature-gap

Unknown / too early to call. Two live hypotheses, both consistent with the facts so far and not
yet distinguished:
- **(a) Source file defect** — the IFC export itself has a structural issue that Revit or the
  on-device parser tolerates but the web-viewer's translation pipeline does not.
- **(b) Web-viewer translation/derivative bug or gap** — something specific to how this repo's
  ViewerPage loads/expects a Forge-style derivative fails for this file even though the source is
  fine, in a way the on-device client's separate pipeline doesn't hit.

Ilia's three questions are exactly the ones that would distinguish these — no premature call made
here.

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

- **That this is a genuine broken-vs-working pair worth investigating (not user error):** 8/10 —
  Yash independently reproduced the web-viewer failure; on-device success is stated by the
  customer, not yet independently confirmed by us, but is a specific, checkable claim.
- **Root cause / which hypothesis (a) source-file-malformed vs (b) web-viewer viewable-fallback
  gap:** 4/10 (up from a bare guess) — the viewable-name fallback chain and silent-null-bubble path
  are real, code-verified mechanisms that fit the symptom shape precisely, but **not yet confirmed
  against this model's actual manifest**; still needs either the source file or a direct
  Forge-manifest check.
- **Overall triage confidence: ~4/10** — mechanism now has a concrete, testable lead (up from pure
  research-phase), but final attribution is still environment-dependent (needs the file or manifest
  access), matching CLAUDE.md's "3–4… needs human to reproduce/test; implementation direction
  uncertain" band honestly.

---

## NEEDS HUMAN

- ⚠️ **1 screenshot attachment** (`Screenshot 2026-07-23 072317...png`) — unreadable here (binary,
  Atlassian auth). Would show the exact failure mode (blank viewer? spinner stuck? explicit error
  toast?) — decisive for narrowing hypothesis (a) vs (b) before the source file even arrives.
- ⚠️ **The source IFC file itself** — requested from the customer (Ilia, 07-23); this is the
  correctly-identified next artifact, not something this pass can substitute for.
- ⚠️ **Export origin + Revit sanity-check** — Ilia's other two questions, also customer-side.
- ⚠️ **Forge manifest inspection for THIS model** (needs dev/BE access, does NOT need the customer)
  — check whether the translated derivative has a `Navis`/`XYZ`/`{3D}`-named viewable at all, or
  only `EXPORT TO HOLOSITE` (see §Mechanism above). This could confirm/kill hypothesis (b) in
  parallel with waiting on the customer's file — it's the one step in this ticket that doesn't
  require the customer.

---

## Roster / ownership notes

- **Yash Patel** — coordinator, reproduced the failure, correctly requested the source file.
- **Ilia Kuzmin** — asked the three decisive follow-up questions same-day; correct playbook style
  (closed, one-message-per-question, routed).
- No BE/product involvement yet — appropriately, since this hasn't been narrowed past "waiting on
  the source file."

## Doc / KB refs

- `xyz-platform-context/dashboard/viewer-and-model.md` — general ViewerPage/model-loading context;
  no existing IFC-specific section noted (to be added once mechanism is known).
- Sibling ticket **PLT-2909** (this same run) — established that different model-authoring
  origins (Revit vs Navisworks/Excel-import) take different mapper code paths
  (`revit-model-mapper.ts` vs `navisworks-model-mapper.ts`) with different available artefacts —
  relevant precedent for "check the model's authoring origin before assuming one mapper's
  behaviour applies," which is exactly what Ilia's Revit-sanity-check question is probing.
- `incidents/live-incident-playbook.md` — six-questions frame; this ticket is a clean example of
  Phase 1 ("facts before theories") being followed correctly from message one.
