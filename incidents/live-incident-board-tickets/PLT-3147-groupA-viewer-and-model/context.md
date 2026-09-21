# PLT-3147 — Problem in Appearance of FED model in Web View as well as Dashboard for ADL2

**Raised** 2026-09-18 10:12 BST by Yash Patel (customer: Amgen ADL2, via Freshdesk 8021)
**Status** Open · **Critical** · assignee Darminder Atker · Live Incident
**First triaged here** 2026-09-21 (this file). Group A, brand-new ticket, no prior folder.
**Project** ADL2 (Amgen). First and only PLT ticket mentioning ADL2 — verified by
`text ~ "ADL2"` JQL across the whole site, one hit, this ticket.

**One-line symptom, in the playbook's form:** the customer, looking at the federated (FED)
Navisworks model on ADL2, sees it render differently in our **Web Viewer** and in the **Dashboard**
than it does in the source **`.nwd`** opened in Navisworks.

---

## Description (verbatim)

> Issue Type: Software ,
>
> Software Area: Web Viewer ,
>
> Software Component:,
>
> Device Serial Number software: ,
>
> Device Serial Number Hardware: ,
>
> Is The Device Still Usable?: Usable ,
>
> Project: ADL2
>
> Description: Hello,
> We are facing problem in appearance of FED model after exporting in web viewer in ADL2. Here is
> the snap of dashboard of web view and nwd file.
>
> [two inline images]
>
> Please look into the matter and help us to solve the issue treating it as high priority.
>
> Thanks.

**Note what the description does *not* say.** It never states *how* the appearance differs — not
"parts are missing", not "it is in the wrong place", not "the colours are wrong", not "the geometry
is distorted". The entire discriminating content of this ticket is in the two screenshots, and this
session cannot open them (§ Media). Every hypothesis below is therefore constrained by that gap,
and §"What remains unverified" leads with it.

**"FED" = federated.** The SharePoint link in comment 112497 resolves to
`…/08-Amgen ADL2/03-MODELS/03-FED/02-XYZ/ADL2.nwd` — i.e. the artefact in question is a single
Navisworks `.nwd` federation living in the project's `03-FED` folder. This matters twice over:
Navisworks models take a materially different code path in our Web Viewer from Revit ones
(§ Code trace, `model-mapping-service.ts:405-427`), and the Dashboard loads exactly one model,
picked by a folder name containing "federated" (§ Code trace, `dashboard-project-service.ts:165-168`).

---

## Comment timeline (who owes what, to whom)

| When (BST) | Who | id | What |
|---|---|---|---|
| 09-18 10:15 | Yash Patel | 112497 | Restates the report for Darminder: the model "appears differently in the Web Viewer and dashboard compared to the source NWD". Attaches two screenshots and a SharePoint link to `ADL2.nwd`. Asks to "compare the Web Viewer output against the source NWD model, and advise on the cause". Flags customer's "high priority" request. |
| 09-18 10:18 | Yash Patel | 112498 | Freshdesk 8021 → **Waiting on 3rd line**. |
| 09-18 10:27 | Darminder Atker | 112499 | First hypothesis: *"I suspect this a problem on Autodesk side just investigating with the viewer. For the user it is imporatnt they have followed the standard export settings when they upload a model"*. |
| 09-18 10:58 | Darminder Atker | 112502 | Second hypothesis, after discussing with **Ilia**: *"a problem like this appeared previously with PBP and model was quite far, in this case autodeks viewer breaks model geometry"*. Asks Yash to have the user **check the PBP or model global offset**. |
| 09-18 11:14 | Ali Seyedof | 112505 | ⚠️ Guardrail, unprompted and important: *"please beware changing project PBP will impact previously prepared and exported models, including Revit ones. I mean the PBP in Project Settings on platform. If changed, all incoming models will be checked against the new PBP and rejected if not matching."* |
| 09-18 11:20 | Yash Patel | 112506 | Freshdesk → **Waiting on customer**. |
| 09-18 12:56 | Darminder Atker | 112516 | **The one piece of hard evidence on the ticket.** *"Loading this model on DEV, the converter it fails due to project base points not being set. It appears this is the problem"* + screenshot `64895`. |
| 09-18 13:11 | Yash Patel | 112518 | Freshdesk → **Open**. |
| 09-18 13:12 | Yash Patel | 112519 | **Customer's reply, and the live open question:** *"We have checked the PBP which are same. If you could please help us to identify the name of the model which causing this effect, so we can work on that particular model for good appearance."* |
| 09-18 13:26 | Yash Patel | 112522 | Freshdesk → **Waiting on customer**. |

### Who is waiting on whom — read this before anything else

**The customer is waiting on us, and has been since 09-18 13:12 — three days.** The last
substantive message on the ticket is the customer asking *us* a direct question ("identify the name
of the model which is causing this effect"). Nobody has answered it. Nothing has touched the issue
since 13:26 on 09-18: `updated` is still `2026-09-18T13:26:31.578+0100`, status still Open,
comment count still 10.

**And the Freshdesk status says the opposite.** It was moved to *Waiting on customer* at 13:26,
fourteen minutes after the customer answered our question and asked their own. On the board this
reads as "ball in their court", which it is not. On a Critical ticket, that mislabel is the single
most likely reason three days have passed with no reply — it is the same failure mode as the
playbook's *"evidence requests without owners"*, one level up: a correctly-asked customer question
filed under the wrong owner.

**Also unreconciled:** Darminder said at 12:56 the converter fails because project base points are
not set; the customer said at 13:12 the PBPs are the same. Both statements are still standing on
the ticket, unaddressed, and they cannot both be describing the same quantity (§ Code trace
"The two-PBP ambiguity").

---

## Media — all three attachments unopenable from this session

Re-tested directly this run against `rest/api/3/attachment/content/<id>`, per the standing rule
recorded on 2026-09-08 (which says *confirm, don't assume*, and then don't retry):

```
64889 → HTTP 403 {"errorMessages":["You do not have permission to view attachment with id: 64889"]}
64888 → HTTP 403
64895 → HTTP 403
```

So this is not "unopened", it is **confirmed unopenable for this session's credentials**, on all
three. A human with Jira access opens them in seconds.

| Id | Filename | Size | Author | What it would settle |
|---|---|---|---|---|
| `64895` | `image-20260918-115604.png` | 21 KB | Darminder, 09-18 12:56 | **The decisive one, by a wide margin.** It is Darminder's DEV converter failure. At 21 KB it is almost certainly a cropped error banner, i.e. it carries the *error code string*. Our own error catalogue has **two different codes** that a human would paraphrase as "project base points not being set", and they have **opposite owners** — `NO_PBP_OR_TRUE_NORTH` (the *model* lacks PBP/true north → customer's export) and `INCONSISTENT_PBP` (the model's PBP ≠ the *project's* PBP → depends entirely on which project he uploaded into, and DEV is not ADL2). See § "The two-PBP ambiguity". Everything downstream — including whether the customer was sent on a wasted errand at 10:58 — hangs on which string is in this image. |
| `64889` | `image-20260918-091416.png` | 127 KB | Yash, 09-18 10:15 | One half of the customer's side-by-side. Would answer the question the ticket never states in words: **in what way** does the appearance differ — missing geometry, flat/grey colours, displaced or distorted geometry, or wrong scale. The § Code trace below lists a distinct, verified mechanism for each of those four, and they have different owners; without this image the ticket cannot be routed. |
| `64888` | `image-20260918-091421.png` | 206 KB | Yash, 09-18 10:15 | The other half (the description says one is "dashboard of web view" and one is the "nwd file"). Also: if one of the two is the **Dashboard** rather than the Web Viewer, then the Dashboard's deliberate narrowings (§ Code trace, Dashboard section) are in play and a large part of the complaint may be specified behaviour. |

**Not in the ticket and needed:** the ADL2 **project id** (neither mongo nor postgres), the
**model/version id** of the FED model, and the **DEV project** Darminder uploaded into. None of the
three appears anywhere in the description or the ten comments.

---

## Domain cross-reference

`dashboard/viewer-and-model.md` is the relevant domain doc and it frames three of the four candidate
mechanisms directly.

- **§ "Model resolution (Dashboard only)"** (`:142-152`) — the Dashboard does not render "the
  project"; it renders exactly one model, auto-picked as the first model in the first folder whose
  name contains "federated". So a Dashboard-vs-NWD comparison is a comparison against a
  deliberately narrower set. This is `recurring-defect-patterns.md` **Pattern 5**, third occurrence
  (PLT-3024, ML9), and it is the *same folder convention* the customer's own `03-FED` path uses.
- **§ "Shared profile (ViewerPage + Dashboard)"** (`:31-51`) — the `XYZ` profile turns
  `lineRendering` off, `ghosting` off, `envMapBackground` off, `edgeRendering` on, and forces a dark
  grey background. A model will not look like Navisworks under this profile, by construction.
- **§ "2026-09-09 — true north does NOT orient anything in the viewer"** (`:104-124`) — the
  `applyBasePointTransform` call site is commented out, and the only live consumer of
  `angleToTrueNorth` is PBP/pinpoint coordinate conversion. **This directly constrains Darminder's
  10:58 hypothesis:** no project-level PBP or true-north value we hold is applied to model placement
  in the browser. If the FED model is displaced or rotated in our viewer, the cause is in the
  translation, not in anything the frontend does with the project's PBP.
- **§ "applyScaling"** (`:126-127`) — `applyScaling: 'm'`. A units mismatch is the classic cause of
  a model that "looks wrong" at a glance, and PLT-2144 (Blocker, Nov 2025, *"Webviewer — subsequent
  models loading at different scale"*) is the precedent.

`dashboard/data-pipeline.md` is **not** the primary domain here — its two pipelines are progress
parquets and element status, neither of which affects geometry appearance. It becomes relevant only
if the complaint turns out to be about *colours* on the Dashboard (status colouring) rather than
geometry.

### Does this match a known pattern in `recurring-defect-patterns.md`?

Checked the whole file before investigating, per the 2026-09-03 rule. **Answer: partially — it is a
likely new instance of Pattern 5, and it is NOT a new instance of anything else. Nothing in the file
diagnoses it.**

| Pattern | Applies? | Why |
|---|---|---|
| **5 — surface-scoped visibility rule mistaken for missing data** | **Likely, for the Dashboard half.** Would be the fourth *visibility*-flavoured occurrence (after PLT-2945 DUB7x, PLT-3024 ML9) and the first where the comparison surface is the customer's own authoring tool rather than another of our screens. | The Dashboard loads one federated model and shows only fragments carrying a status (`dashboard-color-service.ts:692`, `:868` → `:454-500`). Against a full `.nwd` that is a guaranteed visible difference with no on-screen explanation — exactly Pattern 5's stated mechanism ("the silence is what generates the ticket, not the gate itself"). **Not confirmed**: requires knowing that one of the two screenshots is the Dashboard. |
| **2 — the frontend is a faithful renderer** | **Applies as a reflex, with an explicit exception.** | Geometry, materials and placement all arrive pre-baked in the SVF2 translation; the FE does not compute them. *But* the reflex must not be applied blindly here, because the FE demonstrably **does** mutate appearance on the ViewerPage: it recolours and hides geometry (§ Code trace). PLT-2874 is the standing warning against the lazy "upstream" reflex; this ticket has a real FE-side half. |
| **7 — a stored snapshot read as a live derivation** | Not yet, but **watch it.** | If anyone proposes "fix the PBP and re-export and it will propagate", that is Pattern 7's exact shape and PLT-2649's exact mistake. Nothing on this ticket has been checked for a propagation path. |
| *"A customer-facing instruction shipped on a premise nobody verified"* (promoted candidate) | **Already fired once on this ticket.** | At 10:58 the customer was asked to check the PBP/global offset on the strength of a remembered earlier incident. They did it, at their own cost, and came back at 13:12 saying the PBPs match. The premise — that the project-level PBP is what makes a model render wrongly — is contradicted by our own code (`viewer-service.ts:974-983`, dead call site). One round of the customer's time has already been spent this way; a second must not be. |
| 1 (dead activity links), 3 (dashboard settings), 4 (two surfaces, one number), 6 (reference table), 8 (sync feed), 9 (duplicated helper), 10 (two id spaces), 11 (null test) | No | None involves geometry appearance; 1/3/4 are all about counts and percentages. |

**Verdict: genuinely new as a whole.** No entry in `recurring-defect-patterns.md` explains
"federated Navisworks model renders differently from its source `.nwd`". The Pattern 5 overlap is
real but covers only the Dashboard half, and only if the Dashboard is actually one of the two
screenshots.

---

## Code trace (read this run; `file:line` on every behavioural claim)

Paths below are relative to `hc-frontend/src/main/webapp/` and
`XYZPlatformApi/` respectively. Line numbers are from the checkout at
`d83664c` (`claude/loving-ramanujan-bhlqta`, which is `master` plus unrelated work).

### A. The Web Viewer deliberately does not render the model as authored

This is the part of the ticket that is *ours*, and it is not written down in any domain doc. Four
separate, independently verified mutations are applied to a loaded model on the ViewerPage. Any one
of them alone makes a side-by-side against Navisworks differ.

**A1 — every Navisworks node is painted flat grey.** In `_getDbIdsForElementIds`
(`app/pages/organisation/ViewerPage/services/model-loaders/model-mapping-service.ts:337-445`), each
successfully mapped dbId is themed `THREE.Vector4(0.5, 0.5, 0.5, 0.9)` (`:386-400`). Then, **for
Navisworks models only**, a second pass enumerates *every* node in the instance tree and themes it
the same grey (`:405-427`), gated on `isNavisworksModel(modelEntity)` (`:405`), which is
`fileType === 'nwd' || fileType === 'nwc'` (`:321-323`). `fileType` is read off the Forge bubble at
load (`viewer-x/components/services/viewer-service.ts:1052-1053`). Alpha `0.9` is Forge's blend
intensity, so this is very close to an opaque override of the authored material.

*Live call site, checked per the 2026-09-09 rule:* `applyMappings` (`model-mapping-service.ts:35-61`)
calls `_getDbIdsForElementIds` at `:44-50`, and `applyMappings` is called from
`viewer-service.ts:968`, inside `if (!this._isDashboard)` at `:967`. Not commented out, not
flag-gated. **A `.nwd` opened in our Web Viewer is grey where Navisworks shows it in colour, and
that is current, live behaviour.** Status colours are then painted over it by
`repaintElementStates(modelElementIds)` at `viewer-service.ts:996`.

**A2 — geometry with no element metadata is hidden outright.** `hideDisabledNodes`
(`model-mapping-service.ts:68-171`, called from `applyMappings` at `:56`) hides every dbId in
`disabledLeafDbIds`, and then, **for Navisworks models** (`:78`), walks every leaf node and hides
any leaf whose dbId has no elementId *and* none of whose ancestors has one (`:102-138`), then hides
any parent all of whose children were disabled (`:140-166`), via
`model.visibilityManager.setNodeOff(dbId, true)` (`:169-171`).

The set is built at `:365-384`: an external id survives only if `elementIds.has(externalId) &&
validDbIds.has(dbId)`. `elementIds` is `model.getSourceElementIds()`
(`viewer-service.ts:955`), which resolves from the model's **`client-element-metas` parquet**
(`components/project-x/entities/model-entity.ts:216-229`, `:237-241`).

**So: any sub-model inside the FED federation whose elements are absent from our element metadata is
invisible in the Web Viewer while being fully visible in the `.nwd`.** That is precisely the shape
the customer describes when they ask us to *"identify the name of the model which causing this
effect"* — they have evidently concluded that one constituent model is the problem. It is also the
same artefact (`client-element-metas`) that sits at the centre of Pattern 1, here driving *viewer
visibility* rather than link resolution — a use of that parquet not recorded anywhere in the notes.

**A3 — lines and points are hidden, and the render profile is not Navisworks'.**
`configureSceneAppearance()` (`viewer-service.ts:608-633`) calls `hideLines(true)` and
`hidePoints(true)` (`:621-622`) and forces background `26,26,26`, no env map, no ground shadow, no
ground reflection, no ghosting. It is called at `:565` and `:800`. The viewer-wide `XYZ` profile
(`viewer-x/viewer-y.tsx:215-238`, applied at `:246`) additionally sets `lineRendering: false`,
`edgeRendering: true`, `antialiasing: false`, `ambientShadows: false`.

**A4 — load options are fixed, and the project base-point transform is dead.**
`getCustomLoadOptions` returns `{ applyRefPoint: true, applyScaling: 'm' }`
(`viewer-y.tsx:209-214`) — Forge's shared-coordinate origin is used as world origin and units are
asserted as metres. The project-survey placement transform is **not** applied: the only call site of
`applyBasePointTransform` is inside a comment block at `viewer-service.ts:974-983`
(*"Using endpoint for project base point turned off due to bug with misalignment of models"*).

**New this run — that comment block now has a name and a date.** `applyBasePointTransform` was
introduced for **PLT-2112** *"Same model with different PBPs appears in same place"* (2025-11-04),
and eight days after release it caused **PLT-2250** *"AMS1 — Editor — Models appear on different
locations"* (2025-12-10, **Blocker**), which spread across AMS1, PA12, Hutto2, ELN03, ML8 and Roots
BIM inside four hours. Darminder, comment 90352: *"This issue occurs because of the change added in
PLT-2112. Change is being reverted and a updated build is being added to Production"*, and at 15:44
*"updated build is on Production with change reverted"*. The dead code at `:974-983` is that revert.
This is not recorded in `dashboard/viewer-and-model.md` and should be — see § Domain doc proposals.

**Consequence for this ticket, stated as a falsifiable claim:** *if* ADL2's FED model is displaced,
rotated or wrongly scaled in our Web Viewer, changing the project's PBP or true-north setting in
Project Settings **cannot** move it, because nothing reads those values into model placement. The
prediction that falsifies this: set ADL2's `angleToTrueNorth` to an absurd value and reload the
Editor — the model must not move. (Not run; needs a non-production project.)

### B. The Dashboard narrows further, on two axes, silently

**B1 — one model, chosen by folder name.** `DashboardProjectService._initializeModel()`
(`components/dashboard-provider/dashboard-project-service.ts:144-220`) lists project folders, takes
`folders.find(f => f.folderName?.toLowerCase().includes('federated'))` (`:165-168`), takes the first
model whose `parentModelFolderId` matches (`:174-177`), reads `versions[0].accUrn` (`:183-196`), and
loads that. No picker, no fallback: missing folder, empty folder, no current version or no `accUrn`
each log an error and leave the viewer blank (`:169-171`, `:178-181`, `:186-196`).

**B2 — only fragments carrying a status are visible.** `_applyFragmentVisibility`
(`dashboard-panels/viewer/dashboard-color-service.ts:454-500`) iterates *every* fragment and calls
`fragList.setVisibility(fragId, true)` only when its dbId is in the supplied set, `false` otherwise
(`:478-492`). It is invoked with `this.coloredDbIds` at `:692` and `:868`. Elements with no schedule
link produce no status and are therefore **absent**, not merely grey.

**B3 — the Dashboard skips A1/A2 entirely, so the two surfaces are wrong in different ways.**
`applyMappings` is gated on `!this._isDashboard` (`viewer-service.ts:967`), and the dashboard's
model entity returns empty sets for `disabledDbIds` / `disabledLeafDbIds`
(`dashboard-provider/entities/navisworks-model-entity.ts:37-43`). The dashboard runs its own
`configureViewerAppearance` (`dashboard-panels/viewer/use-model-loader.tsx:28-52`, called at `:304`)
with the same `hideLines`/`hidePoints` (`:40-41`) plus a 30 fps cap (`:46-50`), and loads with
`skipPropertyDb: true, applyScaling: 'm', applyRefPoint: true` (`:239-246`).

**Why this matters for triage:** the ticket's title says the problem is in "Web View **as well as**
Dashboard", which reads as one fault on two screens. The code says the two screens share almost
nothing in this area — one hides by *element metadata*, the other by *installation status*; one
paints everything grey, the other paints by status. **If both screens are wrong in the same way,
the cause is upstream of both (the translation).** If they are wrong in different ways, there are
two findings, and they should be split, per the playbook's Phase 2.

### C. The upload/conversion contract — where a PBP actually gets checked

**C1 — the error catalogue exists in the frontend and names four coordinate faults.**
`viewer-x/components/blocks/upload-panel/shared/model-upload-error-codes.config.tsx` declares 18
codes (`:7-26`), of which four are coordinate-related (`:146-205`):

| code | title | message (verbatim) | whose problem |
|---|---|---|---|
| `NO_PBP_OR_TRUE_NORTH` (`:146-155`) | Project base point or true north not specified | *"Project base point and/or true north values are not specified for the Navisworks converter. Please ensure these values are set in **your model**."* | the model / its export |
| `NOT_USING_SHARED_COORDS` (`:156-165`) | Shared coordinates not used | *"**At least one model in the Navisworks federation** is not using shared coordinates."* | one sub-model of the FED |
| `NOT_SAME_TRUE_NORTH` (`:166-175`) | Inconsistent true north angles | *"Some models are not following the same true north angle as the project-wide true north angle."* | one sub-model of the FED |
| `INCONSISTENT_PBP` (`:196-205`) | Inconsistent project base point | *"The model's project base point does not match **the project's** base point."* | the model *relative to the project it is uploaded into* |

Two of these four name a *single offending model inside the federation* in their own message text.
**That is the customer's question, already answered in principle by our own error catalogue** — if
the converter emitted `NOT_USING_SHARED_COORDS` or `NOT_SAME_TRUE_NORTH`, the converter knows which
sub-model, even if the message does not print the name.

**C2 — the two-PBP ambiguity, and why Darminder's DEV test may prove nothing about ADL2.**
There are two distinct quantities both called "the PBP":

- the **model's** own project base point, baked into the `.nwd` by the exporter — `NO_PBP_OR_TRUE_NORTH`;
- the **platform project's** base point, held on our project record and editable at
  `PortfolioPage/components/ProjectSettings/GeneralTab/SurveyBasePoint/SurveyBasePoint.tsx`, written
  by `updateProjectBasePoint` → `PATCH /projects/{projectId}/base-point`
  (`app/services/projectService/project-api-service.ts:117-126`, called from
  `PortfolioPage/hooks/useProjectQuery.ts:76`) — `INCONSISTENT_PBP` compares the model against *this*.

Ali's 11:14 warning is explicitly about the second (*"I mean the PBP in Project Settings on
platform… all incoming models will be checked against the new PBP and rejected if not matching"*).
Darminder's 12:56 phrasing — *"the converter it fails due to project base points not being set"* —
does not distinguish them, and **the two have opposite owners**:

- if the code was `NO_PBP_OR_TRUE_NORTH`, the fault is in the customer's export and the DEV result
  transfers to ADL2;
- if it was `INCONSISTENT_PBP` (or a missing project base point on his DEV project), the result is a
  property of **the DEV project he uploaded into**, not of the model, and says nothing about ADL2 —
  where, per the customer at 13:12, the PBPs match.

The customer's *"We have checked the PBP which are same"* is only coherent as a statement about the
model-versus-project comparison, i.e. the second quantity. So as the ticket stands, Darminder's
evidence and the customer's reply may not be about the same thing at all, and nobody has said so.
**Attachment `64895` resolves this in one glance, and it is the single highest-value action on this
ticket.**

**C3 — a unit trap, checked and ruled out.** The settings UI displays and accepts the PBP in
**millimetres** while the backend stores **metres** (`SurveyBasePoint.tsx:18-19, 28-38` via
`convertSurveyToMillimeters`, `app/helpers/coordinateUnitConversion/coordinateUnitConversion.ts:211-227`;
inverse at `:230-250`). A 1000× confusion here would be a textbook cause of "the model is nowhere
near where it should be". **But the fields are explicitly labelled `Eastings (mm)`,
`Northings (mm)`, `Elevation (mm above sea level)` (`SurveyBasePoint.tsx:28-38`), so this is
mitigated in the UI and is not a live suspect.** Recorded because it is the obvious next guess and
someone will make it.

*Latent, not this ticket:* `convertSurveyToMeters` coerces each missing coordinate with `?? 0`
(`coordinateUnitConversion.ts:241-244`) before dividing, so saving the form with a blank field
stores `0` rather than null — i.e. "not set" and "set to the origin" are indistinguishable
downstream. Unverified against any project; noted as a latent trap only.

### D. Backend — `XYZPlatformApi` only relays the code, and only on a hard failure

`getIngestStatus` (`src/api/v2/projects/userfiles/userfiles.controller.ts:40-62`) looks up the
status and, **only when `ingestStatus === "Failed"`** (`:47`), calls `getUserFileError`
(`src/services/userfiles.service.ts:91-104`, `SELECT * FROM xyz."fn_GetUserFileError"($1, $2)`) and
returns `{ userFileId, ingestStatus, errorCode }` (`:52`). Any other status returns
`{ userFileId, ingestStatus }` with **no `errorCode` field at all** (`:55`).

The frontend mirrors that: `getFileIngestStatus`
(`app/services/webViewerService/userfile-api-service.ts:11-16`) types the response as
`{ ingestStatus: string; errorCode?: string }`, `checkUploadStatus`
(`app/store/slices/projectModels/projectModelsActions.ts:122-137`) stores it, and
`UploadErrorMessage.tsx:10-11` renders a message only `if (upload.errorCode)`.

**Consequence, and it is the most likely *product* finding on this ticket:** if the ADL2 conversion
completed with a coordinate problem short of a hard failure, **no code was ever returned and the
user was told nothing** — the model simply appears, looking wrong, with no warning anywhere in the
UI. That is Pattern 5's "the silence is what generates the ticket" in its upload-time form.
**Stated as an inference, not a fact:** it depends on whether the converter has a non-fatal
severity for these codes at all, which is decided in the ingest pipeline (Dagster — `DagsterRunId`
at `src/services/userfiles.service.ts:45`), **a repository this session cannot see**.

`ignoreTrueNorthAngle: true` is hardcoded on both upload paths
(`projectModelsActions.ts:63` upload, `:185` retry), with no FE surface setting it false —
unchanged from the 2026-09-09 reading recorded in `dashboard/viewer-and-model.md:115-118`.

### E. One domain-doc correction found in passing (PLT-2923 candidate)

`recurring-defect-patterns.md` § Candidate patterns carries *"Viewable-name fallback vs on-device
client (PLT-2923) … renders nothing at all, with no error, if none matches
(`viewer-service.ts:1052-1065`, `:945-946`)"*. **That is now out of date.** The chain at
`viewer-service.ts:1058-1071` is `Navis` → `XYZ` → `EXPORT TO HOLOSITE` → `{3D}` → **`viewables?.[0]`**
(`:1071`, commented *"Otherwise use the first viewable as a fallback. This is usually `3D` but is not
always the case."*). A model with none of the four named viewables now renders the *first* viewable
rather than nothing. **For this ticket that is a live candidate in its own right:** if ADL2's `.nwd`
has no `Navis`/`XYZ` viewable, we are silently rendering whatever viewable came first, which can
legitimately be a different view of the model — and that would look exactly like "wrong appearance"
with no error anywhere. Not checked against ADL2.

---

## Verified vs inferred

**Verified — read in Jira or in source this run:**

- Every Jira fact above: 10 comments with ids/authors/timestamps, 3 attachments with
  ids/sizes/authors, status Open, priority Critical, assignee Darminder, reporter Yash,
  created 09-18 10:12, `updated` 09-18 13:26 (nothing since).
- All three attachments return **HTTP 403** on `attachment/content/<id>` — tested, not assumed.
- PLT-3147 is the only issue on the site matching `text ~ "ADL2"`.
- ADL2's FED artefact is `…/03-MODELS/03-FED/02-XYZ/ADL2.nwd` (from the SharePoint URL in 112497).
- Navisworks models get a whole-tree grey theming pass on the ViewerPage
  (`model-mapping-service.ts:405-427`), with a live call site at `viewer-service.ts:968`.
- Navisworks leaf nodes with no element metadata, and their fully-disabled parents, are hidden
  (`model-mapping-service.ts:68-171`, set built at `:365-384` from `getSourceElementIds()` →
  `client-element-metas`, `model-entity.ts:216-229`).
- Lines/points hidden and the `XYZ` profile's settings (`viewer-service.ts:608-633`,
  `viewer-y.tsx:215-246`).
- `applyRefPoint: true, applyScaling: 'm'` on both surfaces (`viewer-y.tsx:209-214`;
  `use-model-loader.tsx:239-246`).
- `applyBasePointTransform`'s only call site is commented out (`viewer-service.ts:974-983`), and the
  revert traces to PLT-2112 → PLT-2250 (Darminder, comment 90352, 2025-12-10).
- The Dashboard's one-federated-model resolution (`dashboard-project-service.ts:144-220`) and
  status-only fragment visibility (`dashboard-color-service.ts:454-500`, invoked `:692`, `:868`).
- The four coordinate error codes and their exact message text
  (`model-upload-error-codes.config.tsx:146-205`).
- `errorCode` is returned only when `ingestStatus === "Failed"`
  (`userfiles.controller.ts:47-55`), and rendered only when present (`UploadErrorMessage.tsx:10-11`).
- The PBP is stored in metres and displayed/edited in millimetres, with the fields labelled `(mm)`
  (`SurveyBasePoint.tsx:18-38`, `coordinateUnitConversion.ts:211-250`).
- The viewable fallback chain now ends in `viewables?.[0]` (`viewer-service.ts:1058-1071`).

**Inferred — reasoning on top of the above, not observed:**

- That the customer's complaint is about geometry presence/placement rather than colour. Suggested
  by their own follow-up ("identify the name of the model"), which implies *something is
  attributable to one constituent model*; **not established** — the screenshots are 403.
- That A1 (grey theming) and A2 (metadata-gated hiding) contribute to what the customer sees. They
  are live and unconditional on a `.nwd`, so they *must* make our render differ from Navisworks;
  whether that difference is the one being complained about is unknown.
- That Darminder's DEV failure may be a property of his DEV project rather than of the model. This
  follows from the two codes' definitions, not from reading his screenshot.
- That the ADL2 prod conversion completed (the model is in the viewer, so something rendered) and
  therefore returned no `errorCode` to the UI. Consistent with §D but not checked against the
  project's upload history.
- That the converter has a non-fatal severity for coordinate faults. Required for §D's product
  finding; the pipeline repo is not in this session's access.
- That "FED" means federated. Very strongly implied by the `03-FED` path and by Yash's own
  "FED model" phrasing, but never spelled out by the customer.

---

## What remains unverified

1. **What "wrong appearance" actually means.** The single largest gap. Missing geometry, flat
   colour, displacement, rotation, scale and wrong-viewable each have a different owner and a
   different fix, and §C/§E give a verified mechanism for each. Attachments `64889` / `64888`
   settle it; both are 403 here.
2. **Which error code DEV actually showed.** `NO_PBP_OR_TRUE_NORTH` vs `INCONSISTENT_PBP` decides
   whether Darminder's evidence transfers to ADL2 at all. Attachment `64895`, 403 here.
3. **Which project Darminder uploaded into on DEV**, and whether that project has a base point set.
   Not stated anywhere on the ticket.
4. **ADL2's own project base point**, and whether any model has ever been rejected against it.
   Readable in Project Settings → Survey base point by anyone with access; not readable here.
5. **Whether ADL2's `.nwd` contains a `Navis` or `XYZ` viewable.** If not, §E says we are rendering
   whichever viewable happens to be first, silently.
6. **Whether the converter can warn rather than fail** on the four coordinate codes. Decided in the
   Dagster ingest pipeline, which is not in this session's repo access. Ali or Sachin can answer it
   in one line.
7. **Whether the FED model's constituent sub-models all produced element metadata.** This is the
   mechanism behind §A2 and is the literal answer to the customer's question if geometry is missing
   — it needs the `client-element-metas` parquet for the model version, or a live console read.
8. **Whether the two screenshots are Web Viewer + NWD, or Dashboard + NWD.** Determines whether the
   Dashboard's deliberate narrowings (§B) are part of the complaint or a red herring; the
   description says "snap of dashboard of web view and nwd file", which is ambiguous.
9. **Whether anything changed on ADL2 in the window** — a re-upload, a PBP edit, a new model
   version. The playbook's question 5 ("why now?") has not been asked by anyone on this ticket, and
   it is the one that decides whether this can recur.
10. **The ADL2 project id and the FED model/version id.** Absent from the ticket; needed before any
    live check.
