# PLT-2923 — "QA STRUCTUAL FAB MODEL NOT LOADING ON WEB VIEWER" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2923
- **Issue type:** Live Incident
- **Status:** With Customer (→ Group A, in-scope-but-parked per this folder's README scope rules)
- **Priority:** Major
- **Project (site):** WI1
- **Software Area (report form):** Web Viewer · **Device still usable?:** "Not Usable"
- **Reporter / Assignee:** Yash Patel (support coordinator)
- **Created:** 2026-07-23
- **Freshdesk:** #7494 (Open → Waiting on customer, 2026-07-23)
- **Session id (Yash's own repro):** `platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3`
- **Model:** `QA-WI11-SFI-ZZ-ZZ-M3-S-000001_STRUCTURAL FAB MODEL.ifc-V19`
- **Domain slug:** `viewer-and-model`

---

## One-line symptom

On project **WI1**, the model `…_STRUCTURAL FAB MODEL.ifc-V19` **does not load in the web viewer**, but **does load in the field on the Atom helmet / HoloSite**. Yash reproduced the web-viewer failure on his own machine.

---

## Description (verbatim, trimmed of empty form fields)

> Issue Type: Software, Software Area: Web Viewer. Is The Device Still Usable?: Not Usable. Project: WI1.
> Description: The model QA-WI11-SFI-ZZ-ZZ-M3-S-000001_STRUCTURAL FAB MODEL.ifc-V19 does not load on web viewer. It does load in the field when using the atom helmet.
> Ticket attachments: 1. Screenshot 2026-07-23 072317.png

## Comments (chronological, 2026-07-23)

1. **14:53 — Yash Patel:** "user has reported that model QA-WI11-SFI-ZZ-ZZ-M3-S-000001_STRUCTURAL FAB MODEL.ifc-V19 does not load in web viewer where as it successfully loads in holosite. **I tried to load it on web viewer on my end and failed.** Session id - `platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3`. Have asked user to upload model file." (+ screenshot)
2. **14:53 — Yash Patel:** Freshdesk #7494 → "Waiting on customer"
3. **15:13 — Ilia Kuzmin:** "Thanks, Yash. Yes, the source model would be helpful. Can we also ask the customer where they exported it from? Also, does the model look fine in Revit?"
4. **15:18 — Yash Patel:** Freshdesk → "Open"
5. **15:38 — Yash Patel:** Freshdesk → "Waiting on customer"

**Reading of the thread:** the ticket is parked correctly. Ilia's three asks (source file / where exported from / does it look fine in Revit) are genuinely customer-side, and the Freshdesk flip Open→Waiting-on-customer 20 minutes later is the ask going out. Ball is legitimately with the client — this is **not** a stalled internal question (contrast PLT-2906, where the ball was silently on us). **But** see §"Parallel track" — there is decisive evidence available *now* that does not need the customer at all.

---

## Attachments — ⚠️ NEEDS HUMAN

- ⚠️ **`Screenshot 2026-07-23 072317-20260723-135245.png`** (167 KB, Yash Patel, 2026-07-23) — **not readable by this agent** (binary behind Atlassian auth). Do not guess its contents. A human must confirm **which UI state is on screen**, because it forks the diagnosis sharply (see §Mechanism, "Which branch"):
  - the **full-screen "Loading model…" spinner, never resolving** → this is what the leading hypothesis *predicts exactly* (see §3 below — the failure leaves `isModelLoaded=false` with no error path, so the loader never dismisses);
  - the toast **"Model not loaded - no geometry found. Please check the model and try again."** → this is the **only** load-failure toast the web viewer can produce on initial load (`viewer-service.ts:1013-1016`, gated on `error.message.includes('Fragment list')`). If the screenshot shows *this* text, the failure is the **fragment-list/no-geometry** branch and the format-gate hypothesis below is **wrong** — re-diagnose;
  - the toast **"Model not loaded due to an error… get in touch"** (`model-layers/model-load-error.tsx:1-13`) → Yash loaded the model via the **layers checkbox**, not initial page load. That path *does* surface the error (see §3, "the one path that does report"), and strongly supports Branch A;
  - **"Failed to load the Editor / Refresh the page…"** (`viewer-loader/viewer-error.tsx:4-24`) → unrelated: `viewerFailed` is set **only** on ACC access-token failure after 3 retries (`viewer-y.tsx:170-181`), not on model-load failure.

---

## Smallest broken-vs-working pair (playbook Q3 — the decisive clue)

**Same model, same backend data, same model version (V19); two clients — web viewer FAILS, Atom helmet / HoloSite WORKS.**

This is the strongest fact in the ticket and it constrains the diagnosis hard:

- It **argues against** a corrupt/malformed source model or a wholesale Forge translation failure as the *complete* story — if the geometry were unusable or the derivative absent, the headset would have nothing to render either. (It does *not* fully exclude a translation problem, because the two clients may consume *different derivatives* of the same upload — see below.)
- It **argues for** something in the **web-viewer-specific** code path — i.e. code that runs on the browser client and does not run on the headset.
- The FE's own code names the split: the web viewer's viewable search explicitly looks for a viewable literally called **`'EXPORT TO HOLOSITE'`** (`viewer-service.ts:1061`), alongside `'Navis'`, `'XYZ'` and `'{3D}'`. That string is direct in-repo evidence that a **HoloSite/headset-specific derivative or viewable exists** for these models and that the two clients are not consuming the same thing.

---

## Mechanism — the web viewer has a hard-coded 3-format allow-list, and the rejection is silent (file:line)

All paths below are in `hc-frontend`, under
`src/main/webapp/app/pages/organisation/ViewerPage/`.

### 1. Load entry point and where `fileType` comes from

The "Web Viewer" surface is the route `:project_id/editor` (`app/pages/project/routes.tsx:35-44`) → `ViewerPage` → `viewer-x.tsx:174-185` → `viewer-y.tsx:157-311` `_initializeViewer()`, which creates the Forge `AggregatedView` (`:240-242`, env `AutodeskProduction2` / `api: 'streamingV2'`, i.e. **SVF2**, at `:162-165`) and then calls `await this._viewerService.loadDocuments(activatedModels)` (`viewer-y.tsx:306`).

`ViewerService.loadDocuments()` → `_loadModel()`
(`components/viewer-x/components/services/viewer-service.ts:797-838`, `:939-1024`).

The URN itself resolves as `model?.cdeUrn ?? model?.accUrn ?? determineUrn(model) ?? null` (`components/project-x/entities/model-entity.ts:48`), from the V2 model payload (`app/services/modelService/FormattedV2ModelList.ts:22`). **That payload carries no file-type or extension field at all** (`FormattedV2ModelList.ts:18-50`) — which is why the format has to be read back out of Forge, below.

`_loadModel` first calls `_loadAggregatedDocument()` (`:1030-1076`), which runs
`Autodesk.Viewing.Document.load('urn:' + urn)` (`:1042-1043`) and, **on success**, derives the model's format **from Forge's own derivative manifest**:

```ts
// viewer-service.ts:1046-1047
const inputFileType = doc?.myData?.children?.find(child => child?.inputFileType)
model.fileType = inputFileType?.inputFileType
```

This is the **only** writer of `ModelEntity.fileType` in the repo (`components/project-x/entities/model-entity.ts:165-171` is a plain setter/getter over `_fileType`, declared `string | null` at `:20`, and **never initialised in the constructor**, `:46-65`). So `fileType` is not a platform DB field — it is whatever **Forge reports as the source format of the translated file**. For a model translated from an IFC source, Forge's manifest reports `inputFileType: "ifc"`.

**Consequence worth noting for the console diagnostic:** if the manifest has no child node carrying `inputFileType` at all, `fileType` stays `undefined` and the thrown message reads `Unsupported or unknown model file type: **undefined**` rather than `… ifc`. Both are the same Branch A; don't let the wording throw anyone off.

The viewable is then picked at `:1050-1065`: `'Navis'` → `'XYZ'` → `'EXPORT TO HOLOSITE'` → `'{3D}'` → else `viewables?.[0]`; if none at all, it `resolve(null)` (`:1066-1068`).

### 2. The gate — ViewerPage only, never the dashboard

```ts
// viewer-service.ts:967-969
if (!this._isDashboard) {
  await this.modelMappingService.applyMappings(modelData, modelElementIds, model)
}
```

**The dashboard skips this step entirely.** The ID-mapping step is exclusive to the ViewerPage — i.e. the "Web Viewer" surface named on this ticket.

`applyMappings` (`services/model-loaders/model-mapping-service.ts:35-61`) → `_getDbIdsForElementIds` (`:337-450`) → `getExternalIdMappingWithCache` (`:276-305`), which ends in:

```ts
// model-mapping-service.ts:291-297
if (this.isRevitModel(modelEntity)) { … }
else if (this.isNavisworksModel(modelEntity)) { … }
else {
  throw new Error(`Unsupported or unknown model file type: ${modelEntity.fileType}`)
}
```

with the allow-list defined as literal string comparisons:

- `isRevitModel` → `model.fileType?.toLowerCase() === 'rvt'` (`:312-314`)
- `isNavisworksModel` → `'nwd' || 'nwc'` (`:321-324`)

**`ifc` matches neither → hard throw.**

Note the asymmetry that makes this reachable: the *other* consumer of the same check, `createExternalIdMappings` (`:213-217`), **guards** it — `console.warn('Skipping model with unsupported file type:', …)` then `continue`. But `_getDbIdsForElementIds` calls the **throwing** path unguarded at `:344`, and `applyMappings` calls `_getDbIdsForElementIds` first (`:44-49`), before `createExternalIdMappings` (`:53`). So the throw wins.

### 3. The throw is swallowed — no error UI, loading state never cleared

```ts
// viewer-service.ts:1006-1023
} catch (error) {
  model.isActivated = false
  model.isFailed = true
  log.error('Error in _loadModel:', error)

  if (error.message.includes('Fragment list')) {
    ToastService.show({ severity: 'error',
      message: 'Model not loaded - no geometry found. Please check the model and try again.' })
  } else {
    throw error          // ← :1019 — our message, no toast
  }
} finally {
  model.isLoading = false
}
```

The user-visible toast is **message-sniffed** on the literal substring `'Fragment list'`. `Unsupported or unknown model file type: ifc` does not contain it → **re-thrown with nothing shown to the user.**

The re-throw lands in `loadDocuments`:

```ts
// viewer-service.ts:812-837
try {
  for (const model of models) { await this._loadModel(model) }   // :822-824
  this._isModelLoading = false                                   // :826  ← never reached on throw
  if (!this._isDashboard) { this._viewerY.IsObjectTreeLoaded = true }  // :827-829
  …
} catch (error) {
  log.error('Error loading documents:', error)                   // :835-837 — and nothing else
}
```

There is **no `finally`** on `loadDocuments`, and both `_isModelLoading = false` (`:826`) and `IsObjectTreeLoaded = true` (`:828`) sit **inside the `try`, after the loop**. On a throw they are skipped, with two concrete consequences:

- **`IsObjectTreeLoaded = true` (`:828`) is the only caller of `setIsModelLoaded(true)`** (setter `viewer-y.tsx:375-378`, wired at `viewer-x.tsx:180`). Skipped ⇒ `isModelLoaded` stays `false`. With `needsURNs` already forced `false` (`:819`) and `viewerFailed` never set (it is set **only** on ACC token failure, `viewer-y.tsx:170-181`), `viewer-loader.tsx:12-35` falls through to its default branch: **the full-screen "Loading model…" spinner, forever.** Not a blank viewport with a missing model — an indefinite spinner. On top of that, `viewer-loading.tsx:7-11` holds an opaque `#1a1a1a` cover over the canvas while nothing is loaded.
- **`_isModelLoading` stays `true` permanently.** Any subsequent `loadDocuments` call short-circuits at `:805-807` with `Promise.reject('Models are already loading.')` ⇒ **the session cannot recover without a page refresh.**

Net user experience: **a permanent "Loading model…" spinner with no error text, no toast, and no retry** — precisely what the ticket reports. Note also that `model.isFailed = true` (`:1008`) is **dead state — no UI reads it anywhere.**

**The one path that *does* report the error.** `addExtraDocument()` (`:840-845`) — the "turn a model on via the layers-panel checkbox" path — has **no try/catch of its own**, so the same throw propagates to `use-node-actions.tsx:66-72`, which shows the toast *"Model not loaded due to an error… get in touch"* (`model-layers/model-load-error.tsx:1-13`). **This is a testable prediction and the cheapest diagnostic in the ticket:** if the model fails silently on page load but produces that toast when toggled on via the layers checkbox, the throw is real and Branch A/B/C is confirmed as a *thrown* error — no console access required. (Three other `addExtraDocument` callers — `upload-panel.tsx:75`, `other-models-section.tsx:90`, `linked-node.tsx:77` — have no catch at all and produce silent unhandled rejections.)

### 4. Corroboration that rvt/nwd/nwc is a platform-wide FE assumption, not a local quirk

- **The platform will not even accept an IFC upload.** `components/model-upload/model-upload.constants.ts:1` — `ACCEPTED_FILE_TYPES = ['.rvt', '.nwd', '.nwc']`; enforced by `validateFileType` (`model-upload-validation.ts:20-23`) which returns `ModelUploadErrorCode.UNSUPPORTED_MODEL` (`:46-48`). ⇒ **This `.ifc` cannot have arrived through the platform's own upload dialog.** It reached WI1 some other way (ACC/BIM360 folder sync, or a direct upload into ACC). That is itself a routed question worth asking.
- **The product already owns the exact right error copy — the viewer just never shows it.** `upload-panel/shared/model-upload-error-codes.config.tsx:69-78` defines `UNSUPPORTED_MODEL` as *"Unsupported model format — This model format isn't supported yet. Please export it as a compatible Revit or Navisworks file."* That string is **upload-only**; the whole error-code config is never consulted by the viewer load path. Had it been, this ticket would have been self-answering on 07-23. (The config also has a `SVF_CONVERSION_ERROR` code at `:14, 93-97` — likewise upload-only.)
- **Nothing in the frontend ever inspects Forge translation status.** There is no `manifest.status === 'failed' / 'inprogress'` check anywhere in the repo; the only manifest touch at all is the `doc.myData.children` traversal at `viewer-service.ts:1046` to grab `inputFileType`. So the FE **cannot** distinguish "translation still running / failed" from "translated fine" — which is exactly why Branch C has to be settled from the backend manifest, not from the client.
- **A second, independent gate** exists on the dashboard's runtime-mapping mode: `components/services/dashboard-progress/dashboard-model-mapping-service.ts:25-53` throws `Unsupported model type: ${fileExt}` (`:52`), with the same rvt / nwd / nwc test at `:282-293` (read off `model.getData().loadOptions.fileExt` rather than the manifest).
- **Only two mappers exist.** `services/model-loaders/` contains exactly `revit-model-mapper.ts` and `navisworks-model-mapper.ts` (plus `base-model-mapper.ts`, whose `getExternalIdMapping` is a stub that throws `Method not implemented.` at `:11-13`).
- **The frontend has no IFC support whatsoever.** A case-insensitive grep for `ifc` across `src/main/webapp` returns exactly one hit — the string `'aifc'` in an audio-file icon list (`app/components/FileBrowser/util/icon-helper.ts:255`). A wider sweep across `src` **and** `docs` (`.ts/.tsx/.md/.java/.yml`) returns **zero** meaningful hits for `ifc`, and **zero** for `sourceFileType`. There is no IFC handling, no IFC detection, and no IFC rejection message anywhere in the repo.

### 5. Important nuance for the fix shape — the gate is a string check, not a capability limit

`RevitModelMapper.getExternalIdMapping` (`services/model-loaders/revit-model-mapper.ts:22-36`) is **format-agnostic**: it just calls Forge's built-in `model.getExternalIdMapping()`, which works for **any** Forge-translated model, IFC included (it would return IFC `GlobalId`s as external IDs). So the `else → throw` at `model-mapping-service.ts:296` rejects IFC on a *string comparison*, not because the machinery can't handle it.

**Caveat before anyone calls that an easy fix:** relaxing the gate only helps if the external IDs Forge returns for the IFC (IFC GlobalIds) actually match the platform's stored `sourceFileElementId` values for that model. If they don't, the model would render but every element would be unlinked/grey — a *different* symptom, not a fix. Note the Navisworks mapper reads specifically `UniqueId` / `GUID` properties (`navisworks-model-mapper.ts:384-392`), neither of which is the IFC property name — the same mismatch class.

### Which branch — three candidates, one symptom

All three produce the identical user-visible outcome (permanent "Loading model…" spinner, no error message), because §3's swallow is common to all:

| # | Branch | Where it fails | Console signature | Layers-checkbox toast? |
|---|---|---|---|---|
| **A** *(leading)* | `fileType = 'ifc'` → format gate | `model-mapping-service.ts:296` | `Error in _loadModel: Unsupported or unknown model file type: ifc` (or `… : undefined`) | ✅ yes |
| **B** | Derivative has no `type:'geometry', role:'3d'` viewable | `viewer-service.ts:1066-1068` → `resolve(null)` → `_loadModel` returns null at `:946` | *silent* — no error line at all, model just absent | ❌ no (returns, doesn't throw) |
| **C** | Forge translation failed/incomplete for this URN | `Document.load` error callback, `viewer-service.ts:1071-1073` | `Error loading document: <errCode> - <errMessage>` | ✅ yes |

**One console line separates all three; the layers-checkbox toast separates B from A/C with no tooling at all.** Both are obtainable internally — see `recommended-action.md`.

---

## Playbook six-question status

1. **Observed / can we see it?** ✅ **Yes** — Yash reproduced the failure himself with session `platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3`. This is not a client rumour. The gap is *what the console said*, not *whether it happens*.
2. **Expected / on whose authority?** The headset. The customer's reference is "it loads on the Atom helmet, so it should load in the web viewer" — a reasonable but **unverified** parity expectation. Per §4, IFC is not a format the web platform ever claimed to support (it isn't even an accepted upload type), so the "expected" here may be **product expectation, not spec** — worth stating plainly rather than treating as a regression.
3. **Smallest broken-vs-working pair?** ✅ **Present and strong** — same model/version, web viewer vs Atom helmet. See §above. A **second** pair is available and currently unexploited: **V19 vs earlier versions** (the `-V19` suffix implies 18 predecessors). Did any earlier version of this model load in the web viewer, and was it `.rvt`/`.nwd` at the time? That diff would settle Branch A almost on its own.
4. **Mechanism?** ✅ Established in code (§Mechanism) for the *class* of failure — a non-rvt/nwd/nwc `fileType` throws in a ViewerPage-only step and the throw is swallowed with no UI. ❓ **Not confirmed** that *this* model takes that branch.
5. **Why now (trigger)?** ❌ **Unknown — not asked on the thread.** Two forks: (i) this model has *never* loaded in the web viewer and the customer only just noticed / only just started using it there (most likely, if the model has always been IFC); or (ii) it used to load and V19 changed the source format or export route. Fork (ii) would be a real regression; fork (i) is a never-supported gap wearing an incident label. **This question has no owner on the ticket — assign one** (playbook anti-pattern #4).
6. **Cohort?** ❌ Not checked. One model, one project (WI1). The mechanism predicts a precise cohort shape: **every non-rvt/nwd/nwc model in every project fails in the web viewer the same way, silently.** Cheap to sweep once someone can query source formats across projects.

---

## Doc references (xyz-platform-context)

- `dashboard/viewer-and-model.md:5-11` — viewer contexts table (ViewerPage / Dashboard / Canvas, `isDashboard` flag). That flag is exactly what gates `applyMappings` (`viewer-service.ts:967`) and therefore what makes this failure **web-viewer-only**. The doc does not currently draw that consequence.
- `dashboard/viewer-and-model.md:99-118` — "The three-ID mapping chain": documents `sourceFileElementId` as "Revit GUID or Navisworks element ID". This is where the rvt/nwd/nwc assumption is baked in, **but the doc never states that other source formats are unsupported**. Gap to fill on close.
- `dashboard/viewer-and-model.md:85-95` — "Model resolution (Dashboard only)"; notes *"If any step fails, the viewer stays blank — no fallback."* Same silent-blank philosophy, documented for the dashboard but not for the ViewerPage path that this ticket hits.
- `dashboard/pitfalls.md` — **no entry** for "unsupported source format → silent blank web viewer". Add one on close.
- `incidents/live-incident-playbook.md` — six-question frame; tone/routing for the drafted comment.

---

## Working root-cause hypothesis

**Leading (Branch A):** `…STRUCTURAL FAB MODEL.ifc-V19` is translated from an **IFC** source, so Forge's manifest reports `inputFileType: "ifc"` and `ModelEntity.fileType` is set to `'ifc'` (`viewer-service.ts:1046-1047`). The ViewerPage-only ID-mapping step then rejects it on a hard-coded three-format allow-list — `throw new Error('Unsupported or unknown model file type: ifc')` (`model-mapping-service.ts:296`) — and because the surrounding handler only toasts on the substring `'Fragment list'`, the error is **re-thrown and swallowed** (`viewer-service.ts:1011-1019` → `:835-837`), leaving the web viewer blank with no message. The Atom helmet is unaffected because it never runs this code and does not need the Revit-UniqueId / Navisworks-GUID external-ID bridge — consistent with the FE's own `'EXPORT TO HOLOSITE'` viewable (`viewer-service.ts:1061`) indicating a separate headset derivative.

**Alternative (Branch C — the Forge-translation-failure theory):** the SVF/SVF2 derivative for this specific IFC is missing, incomplete or failed (unsupported IFC schema version, malformed geometry, translation size/complexity limit), and the headset works because it consumes a different derivative that translated fine. **This cannot be excluded from the frontend** and produces an identical symptom. It is *less* favoured only because Branch A requires no assumption about Forge misbehaving and explains the web-vs-headset asymmetry directly, whereas Branch C needs the extra premise that the two clients consume different derivatives (plausible — `'EXPORT TO HOLOSITE'` suggests exactly that — but unverified).

**Alternative (Branch B):** derivative translated but exposes no 3D geometry viewable → `resolve(null)` → silent return. Lowest prior, but free to rule out from the same console line.

**Orthogonal but real, whatever the trigger:** on initial page load the web viewer **cannot report a model-load failure to the user** unless the error message happens to contain the substring `'Fragment list'`. Every other failure — unsupported format, translation error, missing viewable — produces a permanent "Loading model…" spinner and a console line nobody sees. Three compounding defects:

1. **Substring-sniffed error handling** (`viewer-service.ts:1011`) — the toast is gated on `error.message.includes('Fragment list')` rather than on an error type/code.
2. **No `finally` on `loadDocuments`** (`:812-837`) — so `_isModelLoading` is never reset, the loader never dismisses, **and the session can't retry** (`:805-807` rejects all subsequent loads).
3. **Dead error state** — `model.isFailed` is set at `:1008` and read by no UI anywhere; and the product's own ready-made copy for exactly this case (*"Unsupported model format — … Please export it as a compatible Revit or Navisworks file."*, `model-upload-error-codes.config.tsx:69-78`) is wired only to the upload panel.

This is an FE resilience gap worth its own ticket **regardless of how PLT-2923 resolves**, and it is *why* this ticket needed a customer round-trip at all: the correct message already exists in the codebase — showing it would have answered the ticket on 07-23 without involving the client.

### Confidence (per CLAUDE.md scale)

| Claim | Score | Basis |
|---|---|---|
| FE mechanism — a non-rvt/nwd/nwc `fileType` throws in the ViewerPage-only mapping step, and the throw is swallowed → silent blank viewer, no error, loading state never cleared | **9/10** | Every link read in code; no inference |
| The web viewer has **no** IFC support anywhere in the frontend | **9/10** | Allow-list, two independent gates, only two mappers, whole-repo grep |
| That **this model's** `fileType` resolves to `'ifc'` and therefore hits that gate (Branch A) | **6/10** | Depends on what Forge's manifest reports for this URN — unverified; no console evidence in-thread |
| Branch C (Forge translation failed) as the actual cause instead | **3/10** | Plausible, identical symptom, cannot be excluded from FE code alone |
| **Overall root cause for PLT-2923** | **6/10** | Direction is clear and code-grounded; the specific branch is environment-dependent and needs one console line |

---

## ⚠️ NEEDS HUMAN

1. **The screenshot** `Screenshot 2026-07-23 072317-20260723-135245.png` — unreadable here. Decisive fork: if it shows the toast *"Model not loaded - no geometry found…"*, the diagnosis above is **wrong** (that is the `'Fragment list'` branch, `viewer-service.ts:1011-1017`). Anything else — blank viewport, stuck loading, model absent from the layers list — is consistent with Branch A/B/C.
2. **Console / client logs for session `platform-web-63303495-4a12-4a9e-bcd0-70ae28a348f3`** — needs Grafana / MS Clarity / log-store access this agent does not have. **This single artefact distinguishes Branch A vs B vs C** (see the signature table in §"Which branch"). Cheaper substitute if logs are awkward: **re-run the repro and toggle the model on via the layers-panel checkbox** — that path surfaces a toast where initial load does not (§3).
3. **Forge/APS derivative manifest for this model version (V19)** — `inputFileType`, the list of viewables and their names, and the translation job status/progress. Needs backend or APS API access; not obtainable from the frontend repo. This confirms Branch A (`inputFileType: "ifc"`) or Branch C (translation `failed`/`inprogress`) directly, and it does **not** require the customer's file.
4. **Provenance:** how did an `.ifc` enter project WI1 at all, given `ACCEPTED_FILE_TYPES = ['.rvt','.nwd','.nwc']` (`model-upload.constants.ts:1`)? ACC/BIM360 sync? Direct ACC upload? This is the same question as Ilia's "where did they export it from", but answerable **internally** from the model's ingest record.
5. **Version history for this model** — did any earlier version (V1–V18) load in the web viewer, and what was its source format? This is a broken-vs-working pair available without the customer, and it answers "why now".
6. **Cohort sweep** — list all models across all projects whose source format is not rvt/nwd/nwc. Mechanism predicts they all fail in the web viewer identically and silently.

---

## Cross-ticket notes

- **Domain sibling, different mechanism:** PLT-2892 (`viewer-and-model`) is also a "model never appears" incident, but on the **dashboard**, caused by a timeout-less artefact/colour pipeline. PLT-2923 is the **ViewerPage** and a format gate. Both, however, share the same underlying FE shape as PLT-2892's third-pass finding: **a model-load failure with no terminal error state and no watchdog**, so the user sees a blank/spinning viewer instead of a message. If a resilience ticket is opened for either, it should cover both surfaces.
- **`PLT-2864` "Webviewer not showing correct elements"** (commit `c09e924`, 2026-07-08, Darminder) is the most recent change to `viewer-service.ts`. Reviewed for trigger relevance: it added element-count / layer-selection code (`model-browser-service`, `get-selectable-dbids-for-model`, `ModelDetailsPanel`), **not** the load or mapping path. **Not a candidate trigger** — noted so the next run doesn't re-check it.
