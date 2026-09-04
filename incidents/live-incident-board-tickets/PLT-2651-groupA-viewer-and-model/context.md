# PLT-2651 — "Section box misaligned with BIM models" (ATL08) — triage context

## 2026-09-01 — confirmed unchanged, delta-checked against live Jira

Status still **Open**, assignee Ilia. Last comment is still 110665 (Yash, 08-28 14:53, "Waiting on
3rd line" Freshdesk sync) — no new comment since the 08-31 run recorded this ticket. Nothing to
re-investigate this run.

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2651
- **Type:** Live Incident · **Priority:** **Critical** · **Status:** **Open**
- **Project:** SWITCH ATL08 · **Reporter:** Masum Ahmed · **Assignee:** **Ilia Kuzmin**
- **Created:** 2026-05-06 · **`updated`:** **2026-08-28T14:53:44+0100** · **Comments:** 29 · **Attachments:** 4
- **Fix Version (historic):** 26.2.3 (released 2026-05-26) — see §3, this did *not* close it
- **Linked:** `relates to` **PLT-2756** (Done). Also same-family: **PLT-2771** (Done, same project),
  **PLT-2906** (FAR01/FAR02, `PLT-2906-groupA-viewer-and-model/`)
- **Domain slug:** `viewer-and-model` — ViewerPage section tool + Forge `refPointTransform`, same
  slug and same code as PLT-2906/PLT-2771/PLT-2756
- **Group tag:** `groupA` — status Open, assigned to Ilia, most recent comment is a question pointed
  at us. **Not** `resolved`: this is *not* a duplicate of an already-shipped fix (§4).

---

## 2026-08-31 — first triage pass by this routine. The ticket is 117 days old and has never been in a run table.

**Why it was never picked up before.** It sat in Freshdesk-closed states for most of its life
(Closed 06-04 → reopened 08-28) and this routine's board query only sees it in `Open`. It re-entered
scope on **2026-08-28 13:31**, three hours before that day's run wrote its README entry, and was
missed. It is now the **oldest and highest-priority (Critical) viewer-and-model item on the board.**

**The headline finding, and it inverts how the ticket reads:** PLT-2651 is not a new instance of the
PLT-2906 mechanism. **PLT-2651 is the ticket that created the whole feature.** Per PLT-2906's own
verified GitHub archaeology (`../PLT-2906-groupA-viewer-and-model/context.md` §2026-08-04),
`SectionToolOrientation` was introduced by **PR #1871 / PLT-2651** (merged 2026-05-08, PCA-based),
then rewritten by **PR #1933 / PLT-2756** (2026-06-05, min-area-rect + tightness), then repaired by
**PR #2069 / PLT-2906** (threshold 5° → 0.5°, `compose` instead of `makeRotationZ`). This ticket is
incident #1 of four on its own feature, and it has now reopened as incident #5.

---

## 1. What is reported

**Original (2026-05-06, Masum Ahmed, from Freshdesk 6294):**

> The section box in the web viewer looks to be misaligned with the BIM models for ATL08. Could you
> please check if it can be rotated?

**The live report — Yash Patel, comment 110664, 2026-08-28 14:53, tagging Ilia and Rishi:**

> Customer requested an adjustment to the **section box alignment** for models in the Web Viewer, as
> incorrect section boxes are significantly slowing down the linking workflow.
>
> Following previous fixes, the customer believes the correction was only applied to models that were
> already present in the Web Viewer at the time. They report that **newly imported models continue to
> have their own rotated/misaligned section boxes**, resulting in inconsistent clipping and navigation
> behaviour.
>
> The customer has provided screenshots with two example models demonstrating the issue.
>
> Could we please investigate whether newly imported models are inheriting incorrect section box
> orientations and confirm whether the section box correction is only being applied to existing models
> rather than newly processed ones?

Freshdesk 6294 went Open → Waiting on customer → Open → **Waiting on 3rd line** across 08-28
13:31–14:53. **The ball is squarely on us, and has been since 08-28.**

## 2. Comment timeline (the parts that carry information; Freshdesk status-echo comments omitted)

| When | Who | What |
|---|---|---|
| 05-06 12:13 | Yash | routed to Ali Seyedof (DPL) |
| 05-06 12:50 | **Ali Seyedof** | *"it's likely the WebEditor/WebViewer issue, front-end team can look into that (DPL doesn't touch transformations or section-box operations in WebEditor)"* — **backend explicitly ruled itself out on day one and has never been re-involved** |
| 05-11 11:03 | Yash | *"Any update? field guys are having hard time due to this."* |
| 05-11 12:08 | **Pietro Desiato** | *"true north angle of this model is indeed **0**. However, we have multiple models in other projects with the same angle"* + screenshot |
| 05-11 12:15 | Yash | confirmed from project details, TN = 0 + screenshot |
| 05-11 12:18 | **Rishi Bhugobaun** | *"I believe this affects how the viewer internally handles the section box. However enforcing all projects to set this (especially after starting) could be risky for alignment, so **a workaround fix has been created**."* → this is PR #1871 |
| 05-19 15:57 | **Gennaro Boccia** | *"Verified fixed as CNR on Staging 26.2.3. Tested on 3 different projects: AMS Clone, Pietro's EL project and HoloSite 3.3.4rc1."* — ⚠️ **none of the three is ATL08** |
| 05-26 | — | 26.2.3 released; Freshdesk → Waiting on customer → Open → **Closed** same day |
| **06-03 09:23** | Yash | customer: *"It seems the section box is **still not fully aligned** with the building in ATL08. Could you please have a look if it can be resolved?"* |
| 06-03 09:34 | **Rishi** | *"Could we also ask for specific models as well? **From my end the few I've tried seem okay**"* |
| 06-04 11:33 | — | Freshdesk **Closed** — **the 06-03 report was never answered.** No technical comment between 06-03 and 08-28. |
| **08-28 14:53** | **Yash** | the reopening comment above, + screenshot `Screenshot 2026-08-28 154905.png` |

**Who is waiting on whom:** the customer has been waiting since **2026-06-03** (89 days) for an answer
that never came, and Yash has been waiting on Ilia/Rishi since **2026-08-28** (3 days). Nothing is
owed by the customer. Nothing is owed by backend — Ali ruled DPL out on 05-06 and nothing since
contradicts that.

## 3. The QA/close-out gap that let this run for three months

Two verified process facts worth recording separately from the mechanism, because either alone would
have caught this in May:

1. **The 26.2.3 verification never touched the reporting project.** Gennaro tested AMS Clone, an EL
   project, and HoloSite 3.3.4rc1 (110086-equivalent comment 102812). ATL08 is the only project in
   this ticket, and its footprint is the one the algorithm has to get right. "Verified fixed as CNR"
   on three other projects is not evidence about ATL08.
2. **A live "still broken" report was closed without a reply.** 06-03 the customer said it was still
   misaligned; 06-04 the Freshdesk ticket was closed. The only intervening engineering message was
   Rishi's *"from my end the few I've tried seem okay"* — which is a **non-reproduction**, not a
   resolution, and non-reproduction is the single most diagnostic fact on this whole ticket (§5).

## 4. Prior-run check + duplicate screening (playbook step 0 and step 3)

**Screened against the two near-identically-titled siblings. Neither makes this a duplicate.**

| Ticket | Project | What it was | Why PLT-2651 is not it |
|---|---|---|---|
| **PLT-2906** "Section box misaligned form model" | FAR01/FAR02 | `existingRotZ` = 87.7086° (real surveyed TN 272.2914°), folds to **2.29°**, was swallowed by the old 5° dead-band, so the patch **fired when it should not have** and wrote a −20.46° estimate over a correct transform. Fixed by PR #2069 (threshold → 0.5°). | **Opposite sign.** ATL08's True North is **0** (Pietro, verified twice on 05-11). The patch is *supposed* to fire here — that is the case the feature was built for. Lowering the dead-band 5° → 0.5° changes nothing for a model at exactly 0°. **PR #2069 neither caused nor fixes ATL08.** |
| **PLT-2771** "Section box misaligned again" | **ATL08 — same project** | 06-09: *"was working for a week or two but now is aligned with true north instead of project north."* Rishi 06-15: *"I'm not seeing this issue my side"* + screenshot, asked for a repro video. Freshdesk closed 07-10. **No fix, no fixVersion, no diagnosis — it was closed on silence.** | Not a duplicate but **the same incident**: same project, same symptom, same non-repro, filed 6 days after PLT-2651's 06-03 "still not aligned" went unanswered. Effectively PLT-2651 continuing under a second key. Its "worked for a week or two, then stopped" is a *session/state* signature, not a data one. |

**Checked against `recurring-defect-patterns.md`: no existing pattern matches.** The closest is
**Pattern 7** ("a stored snapshot that everyone reads as a live derivation") — same reasoning error,
different scope: there the snapshot was a DB column, here it is an in-memory value memoized for the
lifetime of the viewer session (§5, V1). Candidate wording for a shared-doc addition is in §9;
**not written to `recurring-defect-patterns.md` by this pass** — this slice was scoped to ticket
folders only.

## 5. Mechanism — code-verified against the current `hc-frontend` checkout

Checkout: `master`-derived working tree at `70451f7` (PLT-3060 merge). All paths relative to
`src/main/webapp/app/pages/organisation/ViewerPage/`. **The PLT-2906 fix is present and confirmed in
this tree** (`section-tool-orientation-math.ts:11` = `0.5 * (Math.PI / 180)`;
`section-tool-orientation.ts:123` = `refPointTransform.compose(pos, quat, scale)`), so nothing below
is stale-branch reasoning.

### V1 — the box angle is computed ONCE PER SESSION and never recomputed. (VERIFIED)

`SectionToolOrientation.patchIfNeeded()` memoizes on `_patchPromise`
(`components/section-tool/section-tool-orientation/section-tool-orientation.ts:57-63`). The promise is
cleared **only** on failure (`:58-61`). `_theta` is assigned exactly once, inside `_doPatch`
(`:114`), and read forever after by `calculateFittedBoundingBox()` (`:73-86`).

**Nothing resets it on model load or unload.** Exhaustively checked: the only two places in the
codebase where the model lifecycle touches the section tool are
`viewer-x/components/services/viewer-service.ts:597-598` and `:883-884`, both of which call
`sectionToolService.deactivateSectionTool(true)` **and only when zero models remain**. That clears
`SectionToolService._previousPlanes` / `_preservedSection`
(`components/section-tool/section-tool-service.ts:312-345`); it never touches
`SectionToolOrientation`. There is no `MODEL_ROOT_LOADED` / `MODEL_UNLOADED` listener anywhere near
the orientation service.

`SectionToolService` (and its single `SectionToolOrientation`) is constructed once per `ViewerService`
(`viewer-service.ts:113`), which is constructed once per `ProjectService`
(`project-x/project-service.ts:170`) — i.e. **once per Editor page load**. So the box angle is frozen
at the moment the user first switches the section box on, for the rest of that page's life.

> **This is a mechanical, exact match for the customer's sentence** — *"the correction was only applied
> to models that were already present in the Web Viewer at the time."* They are describing session
> scope and reading it as model scope.

### V2 — the angle comes from ONE model, not the federation. (VERIFIED)

`_doPatch` takes `viewer.getVisibleModels()` and uses **`models[0]` only** (`:90-93`). Both halves of
the decision come from that single model: the gate reads its `refPointTransform` (`:94-102`) and the
footprint is `collectFragmentXYCorners(m)` — again `m = models[0]` (`:104`). `minAreaRect` then
returns that one model's orientation (`:105`, `section-tool-orientation-math.ts:60-78`).

The asymmetry that follows is the important bit: `calculateFittedBoundingBox()` **does** union the
fragments of *every* visible model (`:76-77`, `collectVisibleFragmentAabbs` at `:167-185`) — but
rotates them all by the **first model's** `theta` (`:77`, `:84`). So the box's *extent* tracks new
models while its *rotation* does not. A box that covers the right volume at the wrong angle is
precisely *"inconsistent clipping and navigation behaviour."*

`getVisibleModels()[0]` is load-order dependent, so **the same project can produce a different box
orientation on two different days** depending on which model finished loading first. That is the
mechanism behind PLT-2771's *"was working for a week or two but now is aligned with true north."*

### V3 — the algorithm genuinely gives a different angle per model. (VERIFIED for ATL08 specifically)

The feature's own design doc records ATL08 in its verified-cases table
(`section-tool-orientation/section-tool-orientation.md` §Verified cases):

| Project | `applyRefPoint` | `existingRotZ` | off-axis | tightness | Action |
|---|---|---|---|---|---|
| **SWITCH-ATL08** | true | **0°** | **~17°** | ≪ 0.9 | **patch** |

So on ATL08 the patch fires and rotates by ~17°, derived from one model's footprint. A newly imported
model covering one wing, one building of a multi-building site, or a single MEP discipline has a
*different* footprint and therefore a different min-area-rect angle. **"Newly imported models
continue to have their own rotated/misaligned section boxes" is a literal description of what this
algorithm does** — one angle per whichever model happens to be first.

This is also exactly the hazard **PR #2069 explicitly deferred to follow-up**, recorded verbatim in
`../PLT-2906-groupA-viewer-and-model/context.md`: *"The gate/footprint is computed from
`getVisibleModels()[0]` only — load-order-dependent on multi-model sessions"* and *"the compound-
footprint min-area-rect estimate is unreliable on multi-building/site footprints."* **Both deferred
items are now the live customer-facing symptom on a Critical ticket.**

### V4 — we mutate one model's transform; Forge reads a possibly different one. (INFERRED, worth checking, not load-bearing)

Our patch writes to `getVisibleModels()[0].getData().refPointTransform` (`:95`, `:123`). Forge's
`SectionTool.getDefaultTransform()` reads **`_viewer.get3DModels()[0]`** — transcribed verbatim from
Forge internals in `section-tool-orientation.md` §"Why this exists". `getVisibleModels()` and
`get3DModels()` are different lists and can name different models once a project holds more than one
model and any of them is hidden or loaded later. In that case the transform we mutate is never the one
Forge reads. **Not verified** — it needs a live viewer with a multi-model ATL08 session, which cannot
be run here. Listed because it is cheap to check alongside V1/V2 and would be an independent third
defect in the same 40 lines.

### V5 — the customer's causal premise is wrong, and correcting it matters. (VERIFIED)

All three fixes in this chain (PR #1871 / #1933 / #2069) are **pure frontend runtime code**. The
orientation is recomputed in the browser from live geometry at the moment the section box is switched
on; nothing is ever written to a model, a translation, or any artefact. **There is no such thing as a
model that "received the correction" and a model that did not.** Newly imported models go down the
identical code path.

This matters beyond pedantry. If we answer Yash's question as asked — *"confirm whether the correction
is only being applied to existing models rather than newly processed ones"* — we implicitly endorse a
model-data story and the next step becomes a re-export request to the client's BIM team. That is the
exact failure shape `recurring-defect-patterns.md` names under *"A customer-facing instruction shipped
on a premise nobody verified"* (PA12/PLT-2649, Hutto2/PLT-3034), only inverted: here the unverified
causal clause is in the **customer's** message rather than ours, and accepting it silently is the same
mistake. **Correct the premise in the first sentence of the reply.**

## 6. Hypotheses, each stated as a prediction one action falsifies

**H1 (leading) — stale session angle.** The user switches the section box on, then imports/opens more
models in the same page session. `theta` stays frozen at the first model's value (V1), so every model
opened afterwards is clipped at the wrong angle.
*Prediction:* **load every model first, hard-refresh the page, then switch the section box on → the
box is correct.** One refresh falsifies or confirms it, and if it confirms, it is also an immediate
workaround the customer can use today.

**H2 — wrong angle for the federation even on a clean load.** Even with a fresh page, `models[0]`'s
footprint is not representative of ATL08's whole federation (multi-building site), so the ~17° estimate
is wrong for most of what is on screen.
*Prediction:* the refresh in H1 does **not** fix it. Then the fix is to compute the footprint across
all visible models, not `models[0]`.

**H1 and H2 are not mutually exclusive and share one file.** The refresh test tells us which one to
fix first; both live in `section-tool-orientation.ts:90-114`.

**H3 (secondary, cheap to check while in there)** — V4's `getVisibleModels()[0]` vs `get3DModels()[0]`
divergence.

### Killed this pass — do not re-run these

- **"PR #2069 (PLT-2906) regressed ATL08."** Dead. ATL08's `existingRotZ` is **0°** (Pietro, 05-11,
  confirmed twice). The change was 5° → 0.5° on the *upper* bound of the dead-band; 0° passes both.
  The `makeRotationZ` → `compose` change only *preserves* translation/scale that was previously wiped.
  Neither can alter ATL08's behaviour in either direction.
- **"It's a backend/DPL transform problem."** Ali Seyedof ruled DPL out on 2026-05-06 (*"DPL doesn't
  touch transformations or section-box operations in WebEditor"*) and every line of the mechanism
  above is frontend runtime code. Do not route this to api-v2.
- **"The customer needs to fix True North in Revit."** ATL08's True North is already 0, which is the
  input this feature is *designed* for. `section-tool-orientation.md` §Pitfalls also records "don't
  update our DB `angleToTrueNorth`" as a verified do-not-retry. Rishi already reasoned past this on
  05-11 (*"enforcing all projects to set this... could be risky"*) and built the workaround instead.
- **"It's not reproducible, so it may be resolved."** Twice now (Rishi 06-03 and 06-15) non-repro has
  been treated as reassurance. Under V1/V2 non-repro by a developer is the *expected* result: opening
  one or two models in a fresh tab is the one path that produces a correct box. **Non-reproduction is
  evidence for the hypothesis, not against it.**

## 7. NEEDS HUMAN — media

| File | Added | Status here | What it would settle |
|---|---|---|---|
| **`Screenshot 2026-08-28 154905.png`** (id 63521, 229 KB) | 2026-08-28, Yash | **HTTP 403** on `/attachment/content/63521` (verified this pass) | ⚠️ **the one decisive artefact.** Yash says it shows *"two example models"*. It would show whether the two boxes are tilted by *different* angles (⇒ per-model footprint, H2) or by the *same* wrong angle (⇒ one stale session angle applied to both, H1) — which is the entire H1/H2 fork, readable from one image without any repro. |
| `Screenshot 2026-04-07 155611.png` (id 57277) | 2026-05-06, reporter | **HTTP 403** | the original May visual; largely superseded, but would confirm the misalignment axis is the same one three months later |
| `image-20260511-110821.png` (id 57467) | 2026-05-11, Pietro | not opened | the True-North = 0 reading; **moot** — the value is stated in text in comment 101940 and corroborated by Yash in 101944 |
| `image-20260511-111404.png` (id 57468) | 2026-05-11, Yash | not opened | same, from project details; moot for the same reason |

Attachment binaries need an authenticated Atlassian session; the read-only MCP tools here expose
fields and comments only. Do not guess at contents.

## 8. Verified vs inferred

**Verified by reading code / Jira this pass:**
- `patchIfNeeded()` memoizes `_patchPromise` and `_theta` for the life of the service, cleared only on
  failure (`section-tool-orientation.ts:57-63`, `:114`).
- No model-load or model-unload path resets the orientation service; the only lifecycle touch is
  `deactivateSectionTool(true)` at zero remaining models (`viewer-service.ts:597-598`, `:883-884`),
  which touches `SectionToolService` state only (`section-tool-service.ts:312-345`).
- One `SectionToolOrientation` per page session (`viewer-service.ts:113`, `project-service.ts:170`).
- Gate and footprint both read `getVisibleModels()[0]` (`section-tool-orientation.ts:90-93`, `:104`).
- The fitted box unions all visible models' fragments but rotates by the single stored `theta`
  (`:76-77`, `:84`, `:167-185`).
- The PLT-2906 fix is present in the current tree (`section-tool-orientation-math.ts:11`;
  `section-tool-orientation.ts:123`), and cannot affect a 0° model.
- ATL08 is in the feature's own verified-cases table at `existingRotZ` 0°, off-axis ~17°, action
  **patch** (`section-tool-orientation.md` §Verified cases).
- ATL08's True North is 0 (Pietro 101940 + Yash 101944, 2026-05-11).
- Every fix in this chain is frontend runtime code that writes nothing to model data.
- PLT-2771 (same project, same symptom) was closed with no fix, no fixVersion and no diagnosis.
- 26.2.3 QA (comment 102812) covered three projects, none of them ATL08.

**Inferred, not verified:**
- That H1 (stale session angle) rather than H2 (unrepresentative `models[0]` footprint) is the
  operative cause on ATL08 right now. Both fit every fact available; the refresh test separates them.
- V4 — that `getVisibleModels()[0]` and `get3DModels()[0]` actually diverge on an ATL08 session.
- That the customer's "newly imported models" were imported *within* an existing viewer session rather
  than between sessions. H1 requires the former; the screenshot or one question settles it.

**Cannot be verified from here at all:**
- The screenshot contents (403), which hold the H1/H2 fork.
- Any live measurement. This environment cannot build or run the app — `npm ci` fails on the private
  `@xyzreality/dhtmlx-gantt` package. Nothing above was compiled, type-checked or executed.
- Which models ATL08 actually loads, in what order, and their individual footprint angles.

## 9. Follow-ups this pass did NOT write (out of slice scope — for whoever owns the shared docs)

1. **`dashboard/viewer-and-model.md:62-67`** documents `applyRefPoint` / `refPointTransform` and says
   *"The section tool reads this transform to orient cutting planes."* It still says nothing about the
   `SectionToolOrientation` override, its two thresholds, or the now **five**-incident history
   (PLT-2651 → PLT-2756 → PLT-2771 → PLT-2906 → PLT-2651 again). PLT-2906's folder flagged this doc
   gap on 2026-08-04 and it is still open.
2. **Candidate pattern for `recurring-defect-patterns.md`** — *"A once-per-session memoized derivation
   that everyone reads as live."* Sibling of Pattern 7 at runtime scope rather than DB scope. The
   recognition signature is distinctive and cheap: **the customer reproduces it reliably and the
   developer cannot** (here: Rishi twice, 06-03 and 06-15), because a developer's clean single-model
   tab is the one path that recomputes correctly. Promote when a second memoized viewer service shows
   the same shape.
3. **A standing safety rule this ticket earns twice over:** a QA verification that does not include the
   *reporting project* is not evidence about the reporting project (26.2.3 / ATL08, §3.1), and a
   customer's "still broken" reply must not be closed out by a developer's non-reproduction
   (§3.2, §6).

---

## 2026-09-01 — live ATL08 model data pulled. New evidence, and one investigation route closed.

Read-only GETs against `cloud.xyzreality.com` with a browser token. ATL08 projectId
`cd1bf432-92c0-43af-b482-6139f469aed3`. Ilia also supplied a live screenshot of the ATL08 Editor with
the section tool active, which substitutes for the unfetchable attachment 63521 in part.

### The screenshot names the two models, and the dates are the point

Two model layers are checked in Ilia's screenshot. From `GET /api/v2/projects/{id}/models`:

| model | `modelVersionInsertDate` |
|---|---|
| `PC-EXCEL_SWITCH_ATL8_ELEC_BracketsAndSupports_Bld1-V1` | **2026-07-08** |
| `PC-NAP08_MEC ELEC_Bld 8.1-R23_ConduitsInternal-V1_` | **2026-08-28** |

**2026-08-28 is the same day the customer reopened this ticket** (comment 110664, 14:53). So the
reported session is a **July model and an August model open together** — two models roughly seven
weeks apart, from two different source families (`PC-EXCEL_SWITCH_ATL8_*` vs `PC-NAP08_MEC ELEC_*`).

That is a direct, dated instance of the V2 scenario: `getVisibleModels()[0]` decides `theta` for both.
It does **not** by itself separate H1 from H2 — but it does establish that the reported case is
multi-model, which neither the ticket nor any prior comment had confirmed.

### Model census — supports V5 with data, not just code reading

144 models, none deleted, **only 2 federated**. Insert dates:

| month | models |
|---|---|
| 2026-03 | 13 |
| 2026-04 | 33 |
| 2026-05 | 7 |
| 2026-06 | 13 |
| 2026-07 | 45 |
| 2026-08 | 33 |

**91 models were imported after 26.2.3 shipped (2026-05-26).** The customer's theory is that the
correction only reached models present at fix time; if that were how it worked, those 91 would be the
broken cohort and the 53 earlier ones fine. Nothing in the code creates such a cohort (V5 — all three
fixes are browser-runtime), and the continuous import cadence means almost any session mixes
pre- and post-fix models anyway. **The premise correction in `recommended-action.md` now has data
behind it as well as code.**

### Incidental: an apparent double import on 2026-08-28

`PC-NAP08_MEC ELEC_Bld 8.1-R23_ConduitsInternal-V1` and
`PC-NAP08_MEC ELEC_Bld 8.1-R23_ConduitsInternal-V1_` — identical but for a trailing underscore, both
inserted **2026-08-28**. Ilia's screenshot has the underscore variant enabled. Not this ticket's
defect, and not investigated. Flagged because it is the kind of thing that confuses a repro ("which
one did you have on?") and may be worth its own look.

### Route CLOSED — do not retry: per-model footprint angles cannot be computed from artefacts

Attempted, to settle H2 with data rather than a customer test. It cannot be done from any reachable
artefact:

| artefact | why it does not help |
|---|---|
| `project-element-list` | columns are `modelId, modelElementId, sourceFileElementId, ProjectId, RunId` — **ids only, no coordinates** |
| `client-element-metas` (319 files, one per user file) | has `extentsX/Y/Z`, but these are element **sizes** (e.g. `0.048264`), **not positions**. No origin, no placement. |
| `GET /api/v2/projects/{id}/models` | no `refPointTransform`, no bounding box, no transform of any kind |

Element **positions** exist only inside the SVF2 geometry the browser loads, which is exactly why
`collectFragmentXYCorners()` runs in the viewer. **So H1 vs H2 cannot be separated from the API.** The
two discriminators named in `recommended-action.md` stand as the only options: the customer's
load-all-then-refresh test, or reading attachment 63521.

### Status unchanged

Open, Critical, assigned Ilia, Waiting on 3rd line since 2026-08-28. **Still no reply from our side.**
118 days old.

---

## 2026-09-01 (later) — REPRODUCED ON PROD, and PLT-2756 read directly for the first time

### PLT-2756 is causally linked, not merely thematically. Read in full (10 comments).

`PLT-2756` "Scope Box Alignment Issue Switch ATL5–7", created 2026-06-02, Critical, assignee Rishi,
status **Done**, **`fixVersions: []`**, `resolution: null`. Links to PLT-2651 as `relates to`.
**No notes folder existed for it** — this is the first time its content has been read into this repo.

Yash's opening comment (104050, 06-02):

> **Following the release 26.2.3**, user have experienced the misaligned section box on SWITCH ATL5,
> SWITCH ATL6, SWITCH ATL7.

26.2.3 is **PLT-2651's own fix** (released 05-26). The customer added: *"Previously, the scope boxes
were aligned with the model orientation, but they are now offset at an angle."* So **PLT-2651's fix
regressed three sibling projects seven days after it shipped.** The chain is:

`fix ATL08 (26.2.3) → break ATL5/6/7 (PLT-2756) → rewrite (PR #1933) → tune for FAR01 (PR #2069,
26.3.4) → ATL08 reopens (08-28)`

### ⚠️ The design fact that was not in this repo: on ATL08 a tilted box is INTENDED

Rishi's comment 104360 (06-05) is the acceptance criteria for the PR #1933 rewrite:

> **Switch ATL07 (regression):** the box is aligned with the building, not tilted a few degrees.
> **Switch ATL08 (diagonal building):** the box orients to the building's **diagonal footprint as a
> tight oriented box**.

ATL08 is a diagonal building and the feature **deliberately** rotates the box to hug it. That was
signed off in June. **Any "fix" that makes ATL08's box axis-aligned re-breaks what #1933 delivered.**
This must be stated in any reply, and it was missing from every prior pass on this ticket.

### Prod reproduction — Ilia, 2026-09-01. First reproduction in 118 days.

Two screenshots from prod ATL08 with the section tool active. **This ends the non-repro history**
(Rishi 06-03 on this ticket, 06-15 on PLT-2771, both treated as resolution).

What they show:

- The box edges sit roughly on **world axes** while the geometry runs **diagonally inside**, with a
  large empty margin. **The box is not hugging the diagonal footprint.** So #1933's intended ATL08
  behaviour is *not* occurring on prod.
- **Box orientation looks identical across two different element counts (5,037 and 12,922).** If the
  angle tracked the visible model set it should have changed. Suggestive of a frozen or near-zero
  `theta`, not of a per-model angle.

**This kills the "expectation mismatch" reading** raised earlier the same day: the customer is not
complaining about an intentional diagonal box, because there isn't one.

**Caveat, stated because it matters:** both screenshots are **perspective** views, not top-down
orthographic. Apparent angles are distorted, so the tilt was **not** measured, only judged as
"clearly not hugging". Two things still outstanding: whether the two shots were one session or two
page loads (one session ⇒ H1 confirmed), and a top view.

### Revised reading of the mechanism

`theta` is either **~0°** (the patch is not firing at all on prod) or **~17°** (firing, per the
feature's own verified-cases table, but wrong for this federation). **These need different fixes**,
and one console line separates them. Guessing between them would be the fifth guess on this feature.

Next step: an instrumented branch off `master` logging `theta` in degrees, which model was
`getVisibleModels()[0]`, that model's `refPointTransform` rotation, the min-area-rect tightness, and
whether the memo short-circuited. **Not yet written.** No PLT-2651 branch exists; only
`origin/PLT-2906-section-box-true-north` and `origin/bug/PLT-2756-scope-box-alignment-switch-atl`.

### Deployment status — both fixes ARE live, verified

| fix | version | released |
|---|---|---|
| PLT-2651 workaround | 26.2.3 | **2026-05-26** |
| PLT-2906 / PR #2069 | 26.3.4 | **2026-08-17** |

Both `released: true` in Jira; PLT-2906 is Done. Master carries #2069
(`ORIENTATION_MISMATCH_THRESHOLD_RAD = 0.5 * (Math.PI / 180)`, `compose` at `:123`). PLT-2651
reopened **11 days after 26.3.4 shipped**, so nothing is pending deployment — this is an unfixed
defect needing new code. **PLT-2756's release is unrecorded** (no fixVersion), so which build carried
PR #1933 is still unknown.

---

## 2026-09-04 — MEASURED ON PROD. H1, H2 and V2 all confirmed. The fix is named.

**First hard measurement in 120 days.** Method: `enableGlobalWebViewerAPI` set as a **browser
cookie** on prod, then a read-only console script. Script:
`scratchpad/plt-2651-diagnose.js` (this session).

### ⚡ The method matters as much as the result — no branch, no build, no deploy

The 09-01 next step recorded here was *"an instrumented branch off `master` logging theta …
**not yet written**"*. **That was unnecessary.** Feature flags in hc-frontend are resolved from
a **cookie**, not a server-side rollout (`helpers/getFeatureFlagValue/getFeatureFlagValue.ts`):

```ts
const cookie: string = cookies.get('feature-flags')
const flagsFromCookie = cookie ? JSON.parse(cookie) : featureFlags
// flags absent from the cookie fall back to the compiled defaults
```

So it is per-browser and self-service. One line, then reload:

```js
document.cookie = 'feature-flags=' + encodeURIComponent(JSON.stringify(
  [{ name: 'enableGlobalWebViewerAPI', value: true }]
)) + ';path=/'
```

That exposes `window.projectService` (`project-x/project-provider.tsx:91-95`). The whole chain
to the angle is reachable, and `theta` has a **public getter**:

`window.projectService` → `.viewerService` → `.sectionToolService` (**public field**,
`viewer-service.ts:73`) → `._orientation` → `.theta` (**public getter**,
`section-tool-orientation.ts:47-49`)

**Generalise this:** any viewer-internals question on prod is a cookie and a console paste, not
a build. Recorded in `live-incident-run-instructions.md`.

### Result 1 — theta IS firing and IS applied. The "patch not firing" branch is dead.

```
thetaRad -0.4372627309507484   thetaDeg -25.053
patchHasRunThisSession true    sectionActive true
```

Cut planes measured independently via `viewer.getCutPlanes()`:

| plane | nx | ny | nz | yaw |
|---|---|---|---|---|
| 0 | 0.9059 | −0.4235 | 0 | **−25.053°** |
| 1 | 0.4235 | 0.9059 | 0 | 64.947° |
| 3 | −0.9059 | 0.4235 | 0 | 154.947° |
| 4 | −0.4235 | −0.9059 | 0 | −115.053° |

The four vertical planes are a clean orthogonal set offset by exactly **−25.053°** — agreeing
with `theta` to three decimals. **Our computed angle is the box's actual orientation.**

> **This corrects the 09-01 screenshot reading in this file.** That pass judged the box to be
> "roughly on world axes with geometry diagonal inside", while flagging that the shots were
> perspective views so the tilt was *"not measured, only judged"*. It is measured now: the box
> **is** rotated, by 25°. The caveat was right to be there; the judgement was wrong.

### Result 2 — H2 confirmed. The angle comes from a single-discipline sub-model.

Only **one** model was visible, and it drove the angle:

```
getVisibleModels()[0] = 1  PC-EXCEL_SWITCH_ATL8_ELEC_BracketsAndSupports_Bld1-V1
  fragments 6605 · refPointTransform present · refPointYawDeg −25.053
```

An **electrical brackets-and-supports sub-model of Building 1** set the orientation for the
whole session. The feature's design doc records ATL08's off-axis as **~17°**; in force is
**−25.05°** — roughly **42° out**.

`refPointYawDeg` equalling `theta` exactly is consistent with `_doPatch` composing its computed
angle into that model's `refPointTransform` (`:123`), i.e. the value is ours, not the model's.

### Result 3 — H1 confirmed, bit-identical, and V2's asymmetry measured

Second run after loading another model **without reloading the page**:

```
thetaRad -0.4372627309507484   ← IDENTICAL to the first run, to the last digit
```

Not "about the same" — the same double. Meanwhile every plane distance moved:

| plane | run 1 `d` | run 2 `d` |
|---|---|---|
| 0 | −139.676 | −326.803 |
| 1 | −215.306 | +44.424 |
| 3 | −103.123 | −94.162 |
| 4 | −257.518 | −497.753 |
| z pair | −15.059 / −15.059 | −12.65 / +3.825 |

**The box grew to cover the new model and kept the old model's angle.** That is exactly the
asymmetry V2 predicted from code reading — extent unions all visible models, rotation is the
first model's `theta`. Now measured rather than inferred.

*Caveat: the `d` changes are consistent with extent tracking but a manual box nudge between
runs cannot be excluded. The bit-identical `theta` is the load-bearing proof and needs no such
assumption.*

### ⚠️ Retracted same-day: "hard-refresh is a workaround the customer can use today"

Stated in the 08-31 recommendation and repeated by me this session. **Do not offer it yet.**
A refresh gives a *fresh* angle, not a *correct* one — `getVisibleModels()[0]` is load-order
dependent, and if the brackets sub-model still lands first, the refresh changes nothing. The
clean-load test below decides whether it is offerable at all.

### The fix — named from measurement, not guessed

Both changes are in `components/section-tool/section-tool-orientation/section-tool-orientation.ts`:

1. **Compute the footprint across every visible model, not `getVisibleModels()[0]`** (`:90-114`).
   This is the deferred item from PR #2069, quoted in `../PLT-2906-.../context.md`:
   *"the compound-footprint min-area-rect estimate is unreliable on multi-building/site
   footprints"* and *"load-order-dependent on multi-model sessions"*. Both are now the measured
   live defect.
2. **Invalidate the memo when the visible model set changes** (`:57-63`). Nothing resets
   `_patchPromise` / `_theta` today except a patch failure; there is no model-lifecycle listener
   anywhere near this service.

**Guard rail for whoever writes it:** Rishi's acceptance criteria for PR #1933 (comment 104360,
06-05) state that on ATL08 — a diagonal building — the box is *supposed* to hug the diagonal
footprint as a tight oriented box, while ATL07 must stay axis-aligned. **A fix that makes
ATL08 axis-aligned re-breaks what #1933 delivered and will reopen PLT-2756.** The target is the
right angle for the federation, not zero.

### Still outstanding — two console lines

1. **Clean-load test.** Hard-refresh, load **every** model, *then* switch the box on, and record
   `thetaDeg`. Decides whether the refresh workaround is offerable, and gives the federation's
   angle for comparison against −25.05° and the documented ~17°.
2. **V4 / H3.** `typeof window.projectService.viewerService.viewer.get3DModels`. The run showed
   `all3dCount: 0` while one model was visible — but the script does `?? []`, so a **missing
   method looks like an empty list**. If it reports `"function"`, Forge genuinely sees no 3D
   models and V4 is worse than divergent; if `"undefined"`, ignore that row. **Do not cite the
   `all3dCount: 0` reading until this is answered.**
