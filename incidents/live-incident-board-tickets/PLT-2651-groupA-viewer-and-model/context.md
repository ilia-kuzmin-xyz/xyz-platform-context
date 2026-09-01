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
