# PLT-3034 — "Hutto2 - Wrong actual percent showing on dashboard (75% instead of 100%) (99% instead of 100%)" — triage context

## ⚠️ First triage pass for this ticket, 8 days late

Created 2026-08-10 11:35, never picked up by this routine before today (last run to cover the board,
08-17, listed 8 in-scope tickets and this was not one of them, despite already being `Open` with
Major priority since creation). Cause not investigated — noting the gap rather than guessing at it,
per the standing "don't silently patch over a process miss" rule. By the time of this pass the
engineering team had already run a substantial investigation in-thread (12 comments, 08-10 through
08-17) with no involvement from this routine; this file is a record of that thread plus the FE code
check it was missing, not a from-scratch diagnosis.

## Ticket

| Field | Value |
|---|---|
| **Jira** | https://xyzreality.atlassian.net/browse/PLT-3034 (id 119285) |
| **Status** | Open · **Priority** Major |
| **Project** | Hutto2 |
| **Assignee** | Darminder Atker · **Reporter** Yash Patel (Freshdesk #7611) |
| **Created** | 2026-08-10 11:35 · **Updated** | 2026-08-17 18:08 (12 comments) |
| **Domain slug** | `progress-tracking` — same family as PLT-2882/2909/2931/2946 (dashboard Actual % vs installed-element reality) |

## What was reported

Two activities read below 100% though the customer says everything is installed:
- **Mech.144.1260** ("Install DOAS Units and Final Tie-Ins") — 75% shown, editor "Select All Linked
  Elements" returns **3** elements against **4** linked.
- **DH2.29-30.1100** ("CHW Chiller Connections & Insul. 29-30") — 99% shown, 2,308 selected against
  **2,322** linked.

## What the team already found (verbatim thread, condensed)

1. **Darminder (08-10 13:14, 13:41, 14:27)** — asked whether the user's progress-calculation setting
   is "Model element count"; suspected a parquet-regeneration lag; found the last `progress-outputs`
   calc timestamp was Fri 07-Aug 15:28.
2. **Ali Seyedof (08-11 13:36)** — artefacts refresh every 15 min or on schedule ingest; asked
   Darminder to re-import the schedule to force a refresh.
3. **Darminder (08-11 13:43)** — can't touch schedules on a production project; re-checked, artefacts
   *were* updated that day but values still didn't reflect it.
4. **Darminder (08-11 15:02, @Yash/@Pietro/@Mostafa)** — looped in product: "the parquets are
   returning these values (75 and 99) as shown in FE as expected... in the editor both activities show
   actual at empty" — i.e. the FE is a faithful renderer of the parquet; the question becomes why the
   parquet itself holds 75%/99%, not an FE bug. No reply from Pietro/Mostafa yet.
5. **Yash (08-17 10:06)** — independently found a **discrepancy between "linked elements" count and
   "Select All Linked Elements" result** (4 vs 3, 2322 vs 2308) and asked if this is **ghost/stale
   links from a previous schedule or model version** — i.e. re-proposed Pattern 1 (dead links inflate
   the denominator), the mechanism already confirmed on PLT-2882/2909/2931/2946.
6. **Darminder (08-17 14:15)** — ruled this out directly: loading all non-federated models shows every
   element selectable; not ghost/dead links.
7. **Darminder (08-17 14:22)** — instead found: for `DH2.29-30.1100`, one of the linked elements sits
   in a model named **`QA-SBX2-FU-FO_ME_MDL_DSI_R23-V74_X`** and is marked **"late"** (not installed).
   This explains why the activity can't reach 100% — a non-production model's element is dragging the
   real percentage down.
8. **Yash (08-17 18:05)** — "a element from QA model should not be considered for the progress
   calculations. Why is it counting the elements from QA model?"
9. **Darminder (08-17 18:08, last comment)** — "I think on the backend calculations there is not a
   way for it to identify if a element is part of QA or not so it does not exclude it if its been
   linked to an activity. @Ali Seyedof one to be aware of and if you can confirm." **Unanswered as of
   this pass** (<24h old, not yet stale).

**Two symptoms may not share one cause.** Mech.144.1260 (4 vs 3 elements) has no QA-model finding on
record yet — only DH2.29-30.1100 does. Nobody has said whether the same QA-model element also
explains Mech.144.1260's gap, or whether it's a second instance of the same shape, or something else
entirely (e.g. genuinely stale/dead links, which Darminder's 08-17 14:15 check addressed for
DH2.29-30.1100 but not explicitly for Mech.144.1260).

## Domain context

- `dashboard-progress-comparison` skill / `PLT-2946` context: progress = `installed/linked` for
  tangible activities (`linkedElementCount > 0`), backend-computed, FE renders it as-is.
- **Pattern 1** (`recurring-defect-patterns.md`): dead/ghost links inflating the denominator,
  confirmed on PLT-2882 (FAR01), PLT-2909 (ATL08), PLT-2931 (ELN03). Darminder's 08-17 14:15 check is
  the right falsification test for this pattern and it came back negative for DH2.29-30.1100 (all
  elements load and select correctly) — **this is a new, distinct mechanism, not a 4th Pattern-1
  sighting.**
- **No existing "QA/reference model" concept in hc-frontend — code-verified, not inferred.** Grepped
  `src/` for `isQA`, `sandbox`, `test-model`, `modelType`, `excludeFromProgress`,
  `isProgressContributing` and equivalents: no hits relate to model provenance. `ModelEntity`
  (`.../ViewerPage/components/project-x/entities/model-entity.ts`) carries no such field — just `id`,
  `urn`, `name`, `fileType`, `modelVersionId`. `ProjectService.getProjectModelList`
  (`project-service.ts:722-723`, comment *"Add all models initially (including those without URN
  details)"*) loads every model the API returns, no name-based or type-based exclusion.
- **Model membership is irrelevant to whether an element counts toward an activity — code-verified.**
  `LinkingService.getElementsForActivity` (`linking-service.ts:684-689`) resolves purely by
  `modelElementId`, no model filter. `ElementEntity.getModels()` returns every model a `modelElementId`
  was seen in (`model-entity.ts:274-280`, additive `existing.models.add(this.id)` across every loaded
  model). `useGroupedLinks.ts:59-83` buckets an activity's linked elements under every model they
  belong to, dropping a model bucket only when it has zero elements — no allow-list of "real" models
  anywhere in the chain.
- **Consequence:** if `QA-SBX2-FU-FO_ME_MDL_DSI_R23-V74_X` is loaded/activated for this project and
  shares a `modelElementId` with the activity's link, the FE treats it identically to a production
  model. This is a real, verifiable gap, not speculation — but it is a **gap that spans FE and BE
  both**, not a BE-only blind spot as Darminder's phrasing suggests: **the FE itself has no concept of
  "QA model" to hand the backend in the first place.** There is nothing broken to point at; this is an
  absent safeguard, not a bug in existing logic.
- **No exclusion mechanism exists to reach for.** The closest candidate UI, Project Settings' Models
  tab (`ModelsTabDetails.tsx`), has no "exclude from progress" / "reference only" field today. Building
  one is net-new scope, not a targeted fix.

## Diagnosis

**Verified:** the FE renders the backend's parquet numbers faithfully (Darminder's 08-11 finding);
DH2.29-30.1100's shortfall traces to a linked element inside a QA/sandbox-named model
(`QA-SBX2-FU-FO_ME_MDL_DSI_R23-V74_X`) that is marked "late"; the FE has no model-provenance concept
anywhere in the linking/grouping chain that could exclude such a model even if asked to.

**Inferred / unconfirmed:** whether Mech.144.1260 has the same QA-model cause (not checked in-thread
yet); whether the QA model *should* even be loaded/activated for this production project — that's a
project-configuration question (why does a QA/sandbox model exist inside a live project at all?),
which sits upstream of both FE and BE and hasn't been asked yet.

## Confidence

- **FE renders parquet faithfully, no FE-side arithmetic bug: 9/10** — code-verified across two
  independent checks (Darminder's in-thread finding + this pass's `linking-service.ts` /
  `model-entity.ts` read).
- **QA-model element inclusion is the mechanism for DH2.29-30.1100's 99%: 7/10** — directly observed
  by Darminder in the editor (screenshot), not yet cross-verified against a query, but consistent with
  the code read (no exclusion path exists, so inclusion is the only possible outcome).
- **Same mechanism explains Mech.144.1260's 75%: 3/10** — unconfirmed, nobody has looked.
- **This is a data-hygiene/model-taxonomy gap spanning FE+BE, not a pure BE blind spot: 8/10** —
  code-verified there is no FE-side concept to lean on either.

## NEEDS HUMAN

- ⚠️ Whether the QA model should be in this production project's model list at all (project-delivery/
  BIM question, not dev).
- ⚠️ Check Mech.144.1260 for the same QA-model pattern — nobody has yet.

## 2026-08-19 — left scope (→ With Technical Support), NOT our drafted answer landing

Transitioned **Open → With Technical Support at 2026-08-18 15:50**, accompanied by a comment from
**Darminder Atker at the same timestamp**: *"Have discussed with Yash and would suggest users with QA
models unlink elements that are not part of a PC model... The other option is setting status as
installed but unsure how this would affect user reports at end of a project."*

**This is not the drafted action sitting in this folder.** It doesn't answer the FE/BE taxonomy
question ("can BE tell QA from production models? no, neither can FE") and doesn't ask about
Mech.144.1260 — both remain genuinely unaddressed on the ticket. Darminder and Yash instead converged
on their own customer-facing workaround (unlink QA-linked elements, or mark them installed) and handed
it to Technical Support to relay. Unlike the usual "our draft landed off-Jira" pattern seen elsewhere
on this board, this is a **different, unrelated resolution path** — record it as such, not as a
positive-signal repeat of that pattern. Folder kept as `-groupA-` per this routine's standing precedent
(transitioned out mid-flight, not resolved by us); the drafted answer in `recommended-action.md` is
still valid and unposted if the ticket reopens or if Darminder's workaround doesn't hold.

## 2026-08-20 — back in scope. The customer rejected the premise of the workaround.

Status re-fetched today: **With Customer**, last updated **2026-08-19 12:48**. The
With-Technical-Support window recorded on 08-19 lasted **under 24 hours** (08-18 15:50 → ~08-19 12:2x).
It came back not because the workaround was tried and failed, but because **the customer answered and
denied the premise it rests on**.

### Full reconstruction of the window (comments the 08-19 snapshot did not have)

| When (BST) | Who | What |
|---|---|---|
| 08-18 10:01 | Yash Patel | *"What would be the further course of action on user side?"* — asks Darminder for a customer-facing instruction. |
| 08-18 13:24 | Darminder Atker | *"I think safest option would be to mark QA element as installed. The other option is unlinking the QA element from activity but unsure how this affects their reports."* — **mark-installed is primary, unlink is the risky fallback.** |
| 08-18 15:50 | Darminder Atker | The consolidated comment already recorded on 08-19. **Note the reversal:** unlink is now the recommendation and mark-installed is the caveated fallback — the opposite ordering from 13:24, ~2.5h earlier. No stated reason for the flip. Ticket transitions Open → With Technical Support here. |
| 08-19 12:23 | Yash Patel | Freshdesk #7611 → **Open** (customer has replied). |
| 08-19 12:25 | Yash Patel | Relays the customer verbatim: *"As I never link anything to a QA model I havent even considering checking it. Would be nice to understand why those went being linked to those QA models."* |
| 08-19 12:39 | Darminder Atker | *"This would require investigating who updated links of those QA models. At this stage we have limited resource and if is highly critical to find the source then this can be checked."* — declines the provenance investigation on capacity grounds, offers it conditionally. |
| 08-19 12:48 | Yash Patel | Freshdesk → **Waiting on customer**. Jira lands on **With Customer**. |

**What this changes.** The 08-18 workaround assumes a human linked elements into a QA model. The
customer says he never links to QA models at all. Nobody has reconciled those two statements, and the
ticket is now parked "With Customer" **on a question the customer cannot answer** — he is being asked
to confirm behaviour he has just denied. That is a stall, not a wait.

### NEW code finding — the customer's denial is fully consistent with the code

This is the substantive addition of this pass, and it **does not contradict** any earlier finding; it
refines what "linked to a QA model" can mean.

**A link has no model. The model heading in the linking panel is derived at render time.**

- Element identity is `modelElementId`, and `ProjectService.elements` is a **single global map keyed by
  that id** — `element-entity.ts:16-18` only registers an entity if the id is not already present.
- When a model loads its element metadata, an element id already seen in another model does **not**
  create a second entity; the existing one simply gains a model:
  `model-entity.ts:274-277` — `const existing = this._projectService.elements.get(element.modelElementId)`
  … `if (existing) existing.models.add(this.id)`. `ElementEntity.models` is an additive `Set<string>`
  (`element-entity.ts:9,14`).
- Links resolve by element id only, never by model — `linking-service.ts:684-689`
  (`getElementsForActivity` maps element ids through `projectService.elements`).
- The linking panel then **buckets each linked element under every model in that set** —
  `useGroupedLinks.ts:59-78`, `for (const model of element.getModels())`, one row per (element, model)
  pair.
- Status is read **per element, not per (element, model)** — `useGroupedLinks.ts:66`,
  `elementStateService.getElementState(element.id)`. The same "late" badge is therefore rendered under
  *every* model heading the element appears in.

**Consequence:** seeing a linked element listed under `QA-SBX2-FU-FO_ME_MDL_DSI_R23-V74_X` in the editor
**does not prove anyone linked anything to a QA model.** It is equally consistent with someone linking
one element in a production model whose `modelElementId` also exists in the QA model. The
`if (existing)` branch at `model-entity.ts:277` exists precisely because one `modelElementId` can appear
in more than one loaded model — if ids were per-model unique that branch would be dead code.

### The fork this opens, and the one check that decides it

- **Fork A — shared element id.** The QA model contains an element with the *same* `modelElementId` as a
  PC-model element. There is then **one** link and **one** element. "Unlink the QA element" is
  meaningless (unlinking it removes the production link too), and the element is genuinely not marked
  installed — the QA model is a **red herring** and the real answer to the customer is "this element
  simply is not marked installed; the QA heading is a display artifact."
- **Fork B — QA-only element id.** The element id exists *only* in the QA model, which is what
  Darminder asserted on 08-18 15:50 (*"elements in QA model that does not have a PC model with the same
  element"*). Then a link genuinely does point at a QA-only element, someone or something created it,
  and the customer's "why?" is a legitimate, answerable provenance question.

**Discriminator, one check, no customer involvement, no new tooling:** in the editor's linked-elements
panel for `DH2.29-30.1100`, does the offending element id appear under **more than one** model heading?
More than one → Fork A. Only under the QA heading → Fork B. Darminder already had this panel open on
08-17 (attachments `image-20260817-132030/132133/132204.png`); the answer may already be visible in
those screenshots.

**Why this matters more than it looks:** under Fork A, both workarounds Darminder offered are wrong —
unlinking would break the production link, and marking installed would be marking a genuinely
uninstalled element as installed, which is the reporting risk he himself flagged at 08-18 13:24.

### What is still true, stale, and new

- **Still true.** FE renders backend parquet faithfully (9/10, unchanged). No model-provenance concept
  anywhere in FE (`project-service.ts:722-723`, `linking-service.ts:684-689`) — reconfirmed, unchanged.
  Mech.144.1260 still has **no** QA-model finding on record; still nobody has looked.
- **Stale.** The 08-19 framing that the ticket had "left scope" — it is back, and the workaround it left
  on is now contested by the customer.
- **New.** The customer's denial (08-19 12:25); Darminder's capacity-based decline of the provenance
  question (08-19 12:39); the derived-model-grouping code finding above; the Fork A/B discriminator.
- **Not superseded.** Nothing in this file above is retracted. The 08-19 entry's characterisation of the
  08-18 workaround as "a different, unrelated resolution path" stands and is now better evidenced.

### Confidence (this pass)

- **FE renders parquet faithfully, no FE arithmetic bug: 9/10** (unchanged).
- **Model grouping in the linking panel is derived from element→model set membership, not stored on the
  link: 9/10** — read directly across four files, no inference.
- **"Linked to a QA model" is therefore not established by the editor screenshots alone: 8/10.**
- **Fork A vs Fork B: genuinely undecided, ~50/50** — Darminder asserts B but has not shown the check
  that distinguishes them. This is the single highest-value open question on the ticket.
- **Same mechanism explains Mech.144.1260's 75%: 3/10** (unchanged — still nobody has looked).

### NEEDS HUMAN (updated)

- ⚠️ **Run the Fork A/B discriminator** (does the element id appear under more than one model heading).
  Editor-only, ~1 minute, decides whether the advice already given to the customer is safe.
- ⚠️ **Do not let the "mark as installed" advice go out unqualified.** If Fork A holds, it marks a real
  uninstalled element as installed and corrupts end-of-project reporting — Darminder's own 08-18 13:24
  caveat, now with a concrete mechanism behind it.
- ⚠️ Whether the QA model belongs in this production project's model list at all (unchanged, still
  unasked).
- ⚠️ Check Mech.144.1260 for the same shape (unchanged, still nobody has).

### Attachment note

All 12 attachments on this ticket are real Jira attachments (no `blob:` placeholder problem here, unlike
PLT-3033) but **this routine cannot open image content**. The three from 08-17 14:22
(`image-20260817-132030.png`, `-132133.png`, `-132204.png`) are the ones that would likely settle Fork
A vs Fork B without any new work, since they show the linked-elements panel for `DH2.29-30.1100`. A
human glancing at them may be able to close this question immediately.

## 2026-08-21 — no change

Live fetch: status `With Customer`, 19 comments, `updated = 2026-08-19T12:48:11` — identical to the last
run. No new comment since Yash's relay of the customer's pushback ("As I never link anything to a QA
model..."). Fork A/B question, the three standing drafts and the Mech.144.1260 follow-up all stand
unchanged.
