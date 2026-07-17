# PLT-2909 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — post one internal status update; keep status **In Analysis**

Reply on-thread with (1) the **code-verified** mechanism (the model list over-reports because it maps the activity's `modelElementId`s to *every* model whose `project_element_list` metadata contains them, with no dedup/version/QA-PC filter), (2) the **single closed data/repro step** that decides the data variant, and (3) two routed questions to Yash — the "why now" trigger and whether the PLT-2864 fix (26.3.2, Ready for Release) already changes this. Keep **Ilia Kuzmin** as owner (assignee, owns PLT-2882 and PLT-2531); loop **Darminder** for the FE-robustness half. **Split off** the "generate session id gave an error" signal as a separate track.

## Why this, not the others

- **Not (b) Ready For Development — yet.** The FE over-report path is fully traced and there *is* a clean FE robustness fix (don't render a model node for a loaded model where the element resolves to 0 dbIds; dedup / scope membership). **But** two things must be pinned first, or we risk mis-scoping: (i) which **data variant** feeds it — shared Revit IDs across live federated models (PLT-2385, a data/product call, links legitimately in two models) vs stale superseded-version metadata (PLT-2882, a data-lifecycle cleanup) — they route to different owners; (ii) whether **PLT-2864 (26.3.2, Ready for Release)** — which fixes a *load-state-dependent* "Elements linked to Latest Program" count on the same property panel — already alters this. One screenshot + one query flips this to (b) with precise scope. The July playbook: confirm mechanism with required-vs-actual evidence *before* routing.
- **Not (c) With Customer / With Technical Support.** We need nothing from Kyriakos to progress — Yash reproduced it and gave the activity (`CY-5200`), schedule (`29475-16-RL3`), project (ATL08) and the model. The next step is an internal data/repro diff, not a client ask.
- **Not Blocked.** Nothing external blocks us; the next move is in our own hands (DuckDB/dev on ATL08, plus checking the 26.3.2 diff).

## Draft — internal reply (author: Ilia Kuzmin; @ Yash Patel, cc Darminder Atker)

Playbook style: status = state + so-far + evidence quality; one owner; one closed next step; explicit scoping; hypotheses as questions.

> @Yash Patel — update on PLT-2909 (models over-listed for an activity's linked elements; e.g. `CY-5200` on ATL08).
>
> **Mechanism (confirmed in code):** the "models on the right" panel takes the activity's linked element IDs and lists **every model whose element metadata contains those IDs** — it reads `project_element_list` matched on `modelElementId` only, with **no de-duplication, no current-version filter, and no way to tell one model type from another**. It even keeps a model in the list when that model is loaded but the element isn't actually in its geometry. So one element that truly lives in one model will show several models whenever its ID also appears in other models' metadata. This is the display-side twin of PLT-2882 (there select/isolate *drops* those elements; here the panel *keeps* the model) — so yes, same family as you thought.
>
> **Two ways the ID ends up in several models' metadata (this decides the fix owner):**
> - *(a) shared Revit unique IDs* across co-loaded federated models (e.g. QA + PC, or multiple disciplines) — same as PLT-2385; the links are legitimately in two models and there's no dated trigger; or
> - *(b) stale metadata* left in a superseded version after a **re-upload/re-version** — same as PLT-2882.
>
> **One step to confirm (mine, ~15 min on ATL08):** for a linked element of `CY-5200`, `SELECT modelId, COUNT(*) FROM project_element_list WHERE modelElementId = '<id>' GROUP BY modelId`, and check whether the extra models are QA/other-discipline (→ variant a) or older versions of `PC-EXCEL_..._Bld2` (→ variant b). Diff against one activity whose model list looks right.
>
> **@Yash — two for you:** (1) were the ATL05–08 models **re-uploaded/re-versioned recently**, or do these projects just co-load QA + PC (and multi-discipline) models? (2) Can we confirm whether the fix in **PLT-2864 / 26.3.2** (Ready for Release, same property panel) changes this once it ships?
>
> Scoping: this is the web-viewer activity-linking **model list**, not the dashboard, and separate from the "generate session id gave an error" you hit — I'll raise that on its own so it doesn't muddy this.

## The one evidence step to run (owner: Ilia; needs DuckDB/dev on ATL08)

Smallest broken-vs-working diff (playbook move #3), turning hypothesis into confirmed variant:

1. Take a `modelElementId` linked to `CY-5200`. `SELECT modelId, sourceFileElementId FROM project_element_list WHERE modelElementId = '<id>'` → list the models attributed.
2. For each attributed model, is the element **actually in that model's current geometry** (`getDbIdsWithChildren(sourceFileElementId)` > 0), or metadata-only? Loaded-but-0-dbIds models are the over-report.
3. Classify the extra models: QA/other-discipline (shared-ID, variant a) vs older versions of the same PC model (stale, variant b).
4. Repeat for one **working** activity in the same project as the control.
   - Reuse the PLT-2882 `__linkDiagnose` harness (branch `PLT-linked-selection-diagnostics`, console-only) — it already walks the parquet-vs-geometry layers per model.

## Follow-through the human should own (not executed here)

- **After the diff — route by variant:**
  - variant (a) shared IDs → **data-pipeline / product** (PLT-2385 territory: PLT-2650 / UX-1109; David Webb / Rishi) — the links are in two models by design; decision is how membership should be scoped.
  - variant (b) stale metadata → **BE/data** link-and-metadata lifecycle (why the current version's `client-element-metas` retains dead-generation IDs — the same open BE question as PLT-2882).
  - **FE robustness (ours, real either way):** in `useLinkedElementsTreeData.collectV2`, stop listing a **loaded** model whose element resolves to 0 dbIds (and/or dedup + prefer the model that actually has the geometry). Owner: Darminder / FE. Fold into **PLT-2531** (the in-progress "show all models an element belongs to" feature) rather than a fresh ticket — this is a correctness gap in exactly that feature.
- **Check PLT-2864/26.3.2 first** — if that release already scopes linked-element resolution to loaded/current-version, re-test PLT-2909 on 26.3.2 before committing FE work; it may shrink or move the bug.
- **"Why now" (playbook #5):** get the ATL05–08 re-version/upload timeline from ops/PM — assign an owner, don't drop it.
- **Cohort (playbook #6):** reporter says all ATL05–08, various activities — once the variant is known, enumerate activities whose linked elements map to >1 model and remediate in bulk.
- **Split the session-id error** into its own ticket/track (playbook Phase 2) — needs its own repro; the 2nd screenshot in comment 107527 is the only evidence and is unreadable here.
- **Watch the media (NEEDS HUMAN):** the models-panel screenshot shows *which* extra models appear — the fastest way to tell variant (a) from (b).
- **Post-close:** add a pitfall — "activity linked-element **model list** (`collectV2`) lists one node per `project_element_list` model match, no dedup/version filter, and keeps loaded models even at 0 resolvable dbIds → over-reports models; mirror of the PLT-2882 under-report."
