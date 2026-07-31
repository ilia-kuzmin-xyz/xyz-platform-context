# PLT-2923 — "QA STRUCTUAL FAB MODEL NOT LOADING ON WEB VIEWER" — triage context

<<<<<<< HEAD
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
=======
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2923
- **Issue type:** Live Incident ("To track live incidents on site.") · Software Area (report form): **Web Viewer** · "Is The Device Still Usable?: Not Usable"
- **Status:** **With Customer** (category: In Progress / yellow) — status set 2026-07-23 16:33 (+0100). Group A, parked with the client.
- **Priority:** Major
- **Project (site):** **WI1** (model name says **WI11**)
- **Reporter / Assignee:** Yash Patel (both) — coordinator/support per roster. No dev assignee.
- **Created:** 2026-07-23 14:50 · **Last updated:** 2026-07-23 16:33 → **6 days with no movement** as of 2026-07-29.
- **Components / Labels / issue links:** none
- **Freshdesk:** #7494 — status walked Waiting-on-customer → Open → **Waiting on customer** (last, 15:38 on 07-23)
- **Model in question:** `QA-WI11-SFI-ZZ-ZZ-M3-S-000001_STRUCTURAL FAB MODEL.ifc-V19`
  (source file name ends **`.ifc`**; `-V19` is the platform's version suffix ⇒ 19 versions exist)
- **Our own repro session id (Yash):** `platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3`
- **Domain slug chosen:** `viewer-and-model` (rationale below — *not* `quality-management`)
>>>>>>> origin/main

---

## One-line symptom

<<<<<<< HEAD
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
=======
In the **web viewer (ViewerPage)** for project **WI1**, the model
`QA-WI11-SFI-ZZ-ZZ-M3-S-000001_STRUCTURAL FAB MODEL.ifc-V19` **does not load**, while the
**same model loads fine on the Atom helmet in the field (HoloSite)**. **Reproduced internally by
Yash Patel** on his own machine — so we own a live repro and a session log.

---

## Ticket content (verbatim, trimmed of empty form fields)

> Software Area: Web Viewer, … Is The Device Still Usable?: Not Usable, Project: WI1
> Description: The model QA-WI11-SFI-ZZ-ZZ-M3-S-000001_STRUCTURAL FAB MODEL.ifc-V19 **does not
> load on web viewer. It does load in the field when using the atom helmet.**
> Ticket attachments: 1. Screenshot 2026-07-23 072317.png (Freshdesk `helpdesk/attachments/103334611867`)

### Comments (chronological)

1. **Yash Patel, 07-23 14:53** — "Hi @Ilia Kuzmin, user has reported that model `QA-WI11-…​.ifc-V19`
   **does not load in web viewer whereas it successfully loads in holosite**." + inline ticket image
   (1697×823). "**I tried to load it on web viewer on my end and failed. Session id -
   platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3**". "have asked user to upload model file."
2. **Yash, 14:53** — Freshdesk #7494 → *Waiting on customer*.
3. **Ilia Kuzmin, 15:13** — "Thanks, Yash. Yes, the **source model** would be helpful. Can we also ask
   the customer **where they exported it from**? Also, **does the model look fine in Revit**?"
4. **Yash, 15:18** — Freshdesk #7494 → *Open*.
5. **Yash, 15:38** — Freshdesk #7494 → *Waiting on customer*.

**Nothing since.** Three open questions to the customer (source file / export origin / Revit check),
zero answers in 6 days, on a Major incident.

**No "it worked before" claim anywhere** — neither the customer nor Yash asserts a regression. That
materially shapes playbook Q5 (below): there is no dated trigger to hunt, and "never supported on
web" is fully consistent with the report as written.

---

## Attachments — ⚠️ NEEDS HUMAN

- ⚠️ **`Screenshot 2026-07-23 072317-20260723-135245.png`** (163 KB PNG, Yash, 07-23 14:53,
  attachment id 61262) — the customer's screenshot, mirrored inline in comment 1. **Not viewable
  here** (binary behind Atlassian auth). Do **not** guess its contents. It is the one artifact that
  disambiguates *which* of the two failure presentations below the user hit:
  - a red toast **"Model not loaded due to an error. If the problem persists please get in touch."**
    (`model-load-error.tsx:1-13`, shown by the model-tree checkbox handler) ⇒ the load **threw**
    (mechanism **variant A**);
  - the model checkbox ticked / no error but an **empty or unchanged viewport** ⇒ geometry loaded but
    every node was hidden, or the initial page-load path swallowed the error (**variant B** / silent path);
  - a **spinner that never clears** ⇒ a different failure again (that is PLT-2892's shape, not this one).
- ⚠️ **Freshdesk #7494** (`support.xyzreality.com/helpdesk/tickets/7494`) and its attachment
  `103334611867` — not reachable from here.
- ⚠️ **Session log `platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3`** — *this is not a
  customer-side artifact*: the FE auto-uploads per-tab session logs to blob storage
  (`Logs/<service>/{sessionId}_t{tabId}_{logDate}.log`, `services/logService/log-file-service.ts:5-10`;
  "Support lists a whole session by the base `{sessionId}_` prefix"), and `createLogger`'s default
  `minLevel` is `debug` so **info-level lines are in the file even in production**
  (`services/logService/logger.ts:15-19, 76`). A human with support/blob access can therefore settle
  this ticket **without the customer** — see recommended-action.

---

## Playbook six questions applied

**1. What exactly is observed — and can we observe it now?** ✅ **Yes, we can.** One named model in
one project fails to load in the web viewer; Yash reproduced it himself the same day and captured a
session id. This is the strong position the July playbook asks for (a currently-broken instance in
our own hands), and it is being under-used — the ticket is parked on the customer while the decisive
evidence sits in our own log store.

**2. Expected behaviour, on whose authority?** The reference given is **the Atom helmet /
HoloSite**: same model, loads there. That is a real reference, but a **weak** one for this
comparison — the helmet and the web viewer are different consumers with different asset pipelines;
the web viewer additionally requires a Forge/APS derivative **plus** an external-ID ⇄ dbId mapping
that only exists for Revit and Navisworks sources (see Mechanism). "Loads on the helmet" therefore
does **not** establish that the web viewer ever could load it.

**3. Smallest broken-vs-working pair.** Given: this model (broken, web) vs this model (works,
helmet) — a *cross-platform* pair, which is the weaker diff. The pair that would actually diagnose it
is **same-surface**: this `.ifc` model (broken) vs **another model in the same WI1 project that loads
fine in the web viewer** (and its source file type). Not in the ticket; cheap for Yash to produce
from the repro he already has.

**4. Mechanism.** Established in code, with a caveat about which of two variants applies — see next
section. Short form: **the web viewer supports exactly three source formats — `rvt`, `nwd`, `nwc`.
There is no IFC support anywhere in the frontend.** A model whose Forge manifest reports any other
`inputFileType` throws inside the mapping step; and a model whose element metadata does not match
gets every unmatched node hidden.

**5. Why now? (trigger)** **No regression is claimed** — no "it worked last week", no date, no
deploy correlation to chase. If variant A holds, "why now" is answered by *"it never worked on web;
the customer only just tried"*, and the real question becomes **when/how an `.ifc` entered a project
at all** (19 versions deep). Note the web upload path could not have accepted it: the uploader
whitelist is `['.rvt', '.nwd', '.nwc']` (`model-upload/model-upload.constants.ts:1`,
enforced by `validateFileType`, `model-upload-validation.ts:20-23`) → so it arrived by another route
(ACC/CDE-linked item, or the HoloSite/field pipeline).

**6. Cohort.** Untested and cheap: **every model in every project whose source is not
rvt/nwd/nwc** is in the same shape. A single question settles the local blast radius — do the *other*
WI1 models load in the web viewer? If WI11's fabrication models are habitually published as IFC, this
is a whole-package gap, not one model.

---

## Mechanism (code-verified) — how ViewerPage loads a model, and the two ways this ends in "not loading"

Path: model tree checkbox / initial page load → `ViewerService._loadModel` → Forge document → element
mapping. All paths in `hc-frontend/src/main/webapp/app/pages/organisation/ViewerPage/`:

1. **URN → Forge manifest → `fileType` is discovered here, not before.**
   `viewer-service.ts:1030-1076` (`_loadAggregatedDocument`): `Autodesk.Viewing.Document.load('urn:'+urn)`,
   then **`model.fileType = doc.myData.children.find(c => c?.inputFileType)?.inputFileType`** (`:1046-1047`).
   The viewable is then picked by name — `'Navis'` → `'XYZ'` → `'EXPORT TO HOLOSITE'` → `'{3D}'` →
   first available (`:1052-1065`); **if none is found it `resolve(null)`** and `_loadModel` returns at
   `:946` — *no error, no toast, nothing rendered.* (Silent path #1.)
   Note the model **list** API carries no file type at all and hard-codes `status: 'READY'`
   (`services/modelService/FormattedV2ModelList.ts:19-49`) — so the model browser cannot warn about an
   unsupported format before you click it.

2. **Geometry is loaded BEFORE the mapping step.** `_loadModel` (`viewer-service.ts:939-1024`):
   `show(bubble)` + `aggregatedView.load(bubble)` + `model.getSourceElementIds()` +
   `getAecModelData` in a `Promise.all` (`:947-958`), and only then, for ViewerPage
   (`!_isDashboard`), `await this.modelMappingService.applyMappings(...)` (`:967-969`).

3. **⚠️ VARIANT A — unsupported source format throws.**
   `services/model-loaders/model-mapping-service.ts:276-305` (`getExternalIdMappingWithCache`):
   Revit ⇒ `revitMapper`, Navisworks ⇒ `navisworksMapper`, **else
   `throw new Error(\`Unsupported or unknown model file type: ${modelEntity.fileType}\`)` (`:296`)**.
   Type predicates are literal: `isRevitModel` = `fileType === 'rvt'` (`:312-314`);
   `isNavisworksModel` = `'nwd' | 'nwc'` (`:321-324`). **`ifc` matches neither.**
   The throw propagates out of `applyMappings` → caught at `viewer-service.ts:1006-1020`, which sets
   **`model.isActivated = false`, `model.isFailed = true`**, logs
   **`log.error('Error in _loadModel:', error)`** (`:1009`) and **re-throws** (`:1019`) for anything
   whose message doesn't contain `'Fragment list'`. Then:
   - loaded via the **model-tree checkbox** → the throw is caught in
     `model-layers/model-tree/hooks/use-node-actions.tsx:64-71` → red toast **`<ModelLoadError/>`**
     ("Model not loaded due to an error…", `model-layers/model-load-error.tsx:1-13`);
   - loaded on the **initial page-load set** → `loadDocuments` catches and only does
     `log.error('Error loading documents:', error)` (`viewer-service.ts:835-837`) — **no UI at all.**
     (Silent path #2.)
   A second, quieter instance of the same rule sits in `createExternalIdMappings`:
   non-Revit/non-Navis models are skipped with `console.warn('Skipping model with unsupported file
   type:', …)` (`:213-217`).

4. **⚠️ VARIANT B — supported format, but no matching element metadata ⇒ everything gets hidden.**
   `model-entity.ts:237-296` (`loadElementMetadata`) needs a `client-element-metas` (or
   `legacy-element-meta`) artefact; if absent it throws `'No element metadata found for model'`,
   which is caught internally, sets `_isFailed = true` (`:292`) and returns an **empty** element map —
   so `getSourceElementIds()` (`:216-229`) yields an empty set. In
   `_getDbIdsForElementIds` (`model-mapping-service.ts:337-450`) every dbId whose externalId isn't in
   that set is pushed into `disabledDbIds` / `disabledLeafDbIds` (`:372-384`), and
   `hideDisabledNodes` (`:68-172`) then calls `visibilityManager.setNodeOff(dbId, true)` on all of
   them (`:169-171`). With an empty metadata set that hides **every leaf** ⇒ geometry is loaded but
   **invisible**, `isLoaded = true`, **no error, no toast** — indistinguishable, to a user, from
   "the model doesn't load".

5. **Why the helmet is unaffected.** Both variants live in the **Forge external-ID ⇄ dbId mapping**
   that the web viewer needs to bridge platform element IDs to Forge `dbId`s
   (`dashboard/viewer-and-model.md:99-118` — "External ID (sourceFileElementId) — **Revit GUID or
   Navisworks element ID**"). The field/HoloSite client consumes its own assets and needs none of
   this. So "loads on the helmet, not on web" is exactly the signature this mapping layer produces —
   and it is *not* evidence that the web path is regressed.

### Corroborating evidence that IFC is simply not supported on web

- **Zero IFC support in the codebase:** a case-insensitive grep for `ifc` across
  `src/main/webapp/app` returns only `'aifc'` (an audio icon extension) and unrelated
  `describeIfConfigured` test identifiers. No IFC mapper, no IFC branch, nothing.
- **The product's own copy says so.** `ModelUploadErrorCode.UNSUPPORTED_MODEL` → *"Unsupported model
  format — This model format isn't supported yet. **Please export it as a compatible Revit or
  Navisworks file.**"* (`viewer-x/.../upload-panel/shared/model-upload-error-codes.config.tsx:69-79`).
- **Upload whitelist:** `ACCEPTED_FILE_TYPES = ['.rvt', '.nwd', '.nwc']`
  (`model-upload/model-upload.constants.ts:1`).
- **IFC is an unstarted epic:** **PLT-353 "[WEB] IFC Importer Integration" — Epic, status Backlog**,
  created 2024-05-16, still unassigned (updated 2026-04-22). Also **PLT-1876** "Benchmark large IFC
  file on Fragments against Forge" — **Open** since 2025-07-18. IFC on web is a roadmap item, not a
  shipped capability.
- **Export-view convention** the platform requires of source models (`XYZ` / `Navis` /
  `EXPORT TO HOLOSITE` named views — `ModelUploadDialog/ModelViewDialog.tsx:37`, error code
  `VIEWSHEETSETS_NOT_FOUND`) is a Revit/Navisworks concept; an IFC export has no such view to publish.

### Prior art — the same layer has broken before (PLT-2574, Apr 2026, Done)

*"I can't load some models in the web viewer"* (ATL08, then FAR02, PH4, FAR01) — Darminder,
2026-04-16: *"Have found the root of the problem… a change that has gone in place with the **external
mapping**"*; Ilia, same day: *"when we load nwd models, we rely completely on **object_id-map parquet
files**… is it true that to get the earlier loaded nwd models added to object_id-map, they all need to
be reuploaded?"*; fixed and verified on 26.2.1.1, customer workaround = **re-export/re-upload**.
That incident is variant **B**'s exact shape (mapping inputs missing ⇒ model appears empty/invisible)
and is the reason variant B cannot be dismissed here on the code alone.

---

## Which variant is it? — the one line that decides

Both variants are already written to Yash's uploaded session log for
`platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3`:

| Signal in the session log | Verdict |
|---|---|
| `[ViewerService] Error in _loadModel:` with `errorMessage: "Unsupported or unknown model file type: ifc"` (`viewer-service.ts:1009` + `model-mapping-service.ts:296`) | **Variant A** — IFC genuinely unsupported. Product/roadmap answer (PLT-353) + an FE honesty fix. No customer input needed. |
| `[ModelMappingService] applyMappings started {sourceElementIdCount: 0}` / `applyMappings completed {mappedDbIdCount: 0}` (`model-mapping-service.ts:36-39, 60`), and/or `Failed to load element metadata for <modelId>` (`model-entity.ts:293`) | **Variant B** — format *is* rvt/nwd/nwc (name is cosmetic) but element metas/ID-map are missing ⇒ all nodes hidden. Same family as PLT-2574; likely a data/ingest fix + possible re-upload. |
| `Error loading document: <code> - <msg>` (`viewer-service.ts:1072`) or no viewable found (`:1066`) | **Neither** — the APS derivative itself is missing/failed for this URN; hop to the ingest/DPL side. |

The three are mutually exclusive and all three are one grep away in a log we already own.

---

## Domain slug — why `viewer-and-model`, not `quality-management`

The `QA-` prefix in the model name is **client naming convention, not a code concept**. The platform
has **no** QA-vs-PC model classification: links and metadata are keyed on element/model ids only —
established on **PLT-2385** (*"The links are keyed on element ID only — there is no model-type ('QA'
vs 'PC') classification anywhere in the FE"*,
`PLT-2385-groupB-data-pipeline/context.md:113,135`). Nothing in this ticket touches the Quality module
(no issues, no zones, no rework, no QA statuses). The failing surface is **ViewerPage model loading**
and the mechanism is the **Forge external-ID mapping / source-format support** — squarely
`viewer-and-model` (the same slug as PLT-2892 and PLT-2906).

---

## Bug vs feature-gap (this matters for routing)

- **If variant A:** this is a **feature gap, not a bug** — IFC has never been supported on web
  (PLT-353 Backlog). But it hides a **real FE bug of its own**: the platform lets you tick an
  unsupported model in the tree and answers with a generic *"Model not loaded due to an error"*
  (or, on the initial-load path, **absolutely nothing**), when it already knows the exact reason
  (`fileType: ifc`) and already owns precise copy for it (*"export it as a compatible Revit or
  Navisworks file"*). Surfacing that string, plus a badge/disabled state on unsupported models in the
  model browser, is a small, self-contained FE ticket.
- **If variant B:** it is a **bug/data defect** in the same family as PLT-2574 — and the
  hide-everything-when-nothing-matches behaviour (`hideDisabledNodes`) is itself a latent FE trap: a
  model with zero metadata matches renders as an empty scene with no diagnostic.

Either way, **the "silent failure" half is ours to fix regardless of what the customer replies.**
>>>>>>> origin/main

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

<<<<<<< HEAD
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
=======
- **Mechanism family — the web viewer supports only `rvt`/`nwd`/`nwc`, and both the throw path and
  the hide-everything path exist as described: 9/10.** Read directly from source with file:line;
  corroborated by the product's own error copy and the uploader whitelist.
- **That IFC-on-web is unsupported-by-design (i.e. no regression to find): 9/10** — PLT-353 Epic in
  Backlog, PLT-1876 Open, zero `ifc` references in the app code.
- **That *this specific model* is failing via variant A rather than B or a failed derivative:
  6-7/10.** The filename says `.ifc`, which is strong but not proof — the platform's *own* file name
  is client-supplied text, and only the Forge manifest's `inputFileType` (or the session-log line
  above) establishes what APS actually translated. PLT-2574 proved this exact symptom can also come
  from missing mapping inputs on a perfectly supported `.nwd`.
- **Overall triage confidence: 7/10.** Not the ~95% asked for, and the gap is precisely nameable:
  **one grep of a log we already have.**

### What is missing for ~95%
1. The `Error in _loadModel` / `applyMappings` lines from session
   `platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3` (blob log store — needs support/dev access).
   Equivalently: the Forge manifest `inputFileType` for that model's URN.
2. The customer screenshot (⚠️ above) — tells us whether a toast appeared (throw) or the viewport was
   just empty (hidden nodes).
3. Whether **other** WI1 models load in the web viewer (cohort + the same-surface broken/working pair).
4. Answers to Ilia's 07-23 questions (source file, export origin, Revit check) — **nice to have, not
   blocking** once (1) is in hand.
>>>>>>> origin/main

---

## Roster / ownership notes

<<<<<<< HEAD
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
=======
- **Yash Patel** (reporter, assignee, coordinator) — owns the client channel and Freshdesk #7494;
  also owns the internal repro. Currently the only person on the ticket.
- **Ilia Kuzmin** — already engaged 07-23 (mechanism interrogator); the session-log check is his
  natural next move and needs nobody else.
- **Darminder Atker** (fullstack lead) — owner of the FE half either way; he personally diagnosed
  PLT-2574's external-mapping regression, so he is the right reviewer for the variant A/B call.
- **Mostafa / Pietro** (product owners) — own the *answer to the customer* if variant A holds: IFC on
  web is PLT-353 (Backlog). This is a roadmap/expectation question, not a dev-queue question.
- **Sachin / Ali** (api-v2) — if the derivative/ID-map artefacts for this model are the problem
  (variant B or a failed translation), the ingest side is theirs; Ali owns the `svf2-object-id-map`
  extension referenced in PLT-2574.
- **Gennaro / Radu** (QA) — a 10-minute check ("does any IFC-sourced model load in the web viewer on
  staging?") would confirm the general rule independently of WI1.

## Doc / knowledge-base refs

- `dashboard/viewer-and-model.md:99-118` — the three-ID mapping chain; explicitly *"External ID
  (sourceFileElementId) — **Revit GUID or Navisworks element ID**"*. **Gap: no doc anywhere states
  which source formats are supported**, or that unsupported ones fail silently. Worth adding.
- `dashboard/pitfalls.md` — no entry for unsupported source formats / hide-all-on-empty-metadata.
  Add one when this closes.
- `incidents/live-incident-board-tickets/PLT-2385-groupB-data-pipeline/context.md:113,135` — "QA" vs
  "PC" is client naming, no code concept (basis for the domain slug).
- `incidents/live-incident-board-tickets/PLT-2892-groupA-viewer-and-model/context.md` — the *other*
  model-load failure shape (never-clearing spinner, dashboard). **Different mechanism — do not merge.**
- `incidents/live-incident-playbook.md` — tone/pattern for the drafted reply.
>>>>>>> origin/main
