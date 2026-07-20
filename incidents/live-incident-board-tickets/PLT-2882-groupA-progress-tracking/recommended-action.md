# PLT-2882 — recommended action (DRAFT ONLY — execute nothing)

> Superseded 2026-07-20. The 07-13 draft (status update + one data-diff) is
> archived at the bottom. The situation has moved on: the mechanism is now
> code-adjudicated, and the ticket is **stuck on an unresolved Ilia-vs-David-Webb
> technical disagreement carrying a pending, irreversible destructive-action
> approval** (delete 418 prod links). The action must (1) unstick the disagreement
> with one decisive check owned by one person, and (2) **hold the delete** until
> that check lands. See `context.md` § Update — 2026-07-20 for the code evidence.

## Headline: HOLD the 418-link deletion; settle Ilia-vs-David with one Layer-2 membership check owned by David Webb

## Chosen action: (a) — one routed message that (i) converges the disagreement and (ii) freezes the destructive action

Neither approve nor reject the delete. Post one message that names the single
closed check which decides who is right, routes it to **David Webb** (pipeline
owner, who made the falsifiable counter-claim and can query both layers), and
explicitly scopes the delete as **on hold** until the answer is in.

## Why this, not the alternatives
- **Not "approve the delete."** It is irreversible, the pipeline owner dissents,
  and Ilia's own two comments imply two different root causes with two different
  correct fixes (delete stale links **vs** re-translate/regenerate metadata). If
  the cause is metadata/geometry drift on the *current* version, deleting links
  destroys linkages a corrected re-translation would need. Confidence that delete
  is the right remedy is only ~4/10 (`context.md`).
- **Not "reject the delete."** We don't have the evidence to reject it either —
  Ilia's mechanism is the one the frontend code supports. Rejecting now would be
  as unearned as approving.
- **Not "route to Dev / Ready For Development."** The disagreement is about data
  cause, not a code change; there is no FE ticket to write until the layer is agreed.
- **Not "go back to the client."** Nothing is needed from the customer; the
  decisive check is an internal data lookup.

## The disagreement, stated fairly (both positions)
- **David Webb:** the element resolves in the **current client-element-metas**
  (verified for example `bcb3fc02-…` in both version parquets), and drag-and-drop
  already unlinks elements missing from current model versions — so the
  "orphaned links" root cause is wrong.
- **Ilia Kuzmin:** agrees the element is in current metadata (all 418), **but** its
  `sourceFileElementId` is absent from the current translation's **forge property
  DB / externalId map**; select/isolate resolves against *that* map, not metadata,
  so it correctly finds nothing.
- **Code says (see `context.md`):** these are **two independent layers**. The count
  and metadata check use Layer 1 (`client-element-metas` → `projectService.elements`);
  select/isolate uses Layer 2 (forge externalId→dbId, `model.getExternalIdMapping`
  for Revit → `model-entity.ts:342-380`, `useLinkedElementsTreeData.ts:82-119`).
  David checked Layer 1; the failure is in Layer 2, which he did not check. So they
  are describing different layers, and the failing operation lives in the one Ilia
  named. **Ilia's refined claim is the code-consistent one — but the deciding fact
  (all 418 metadata-present + geometry-absent) has not been posted by either side.**

## Draft — internal reply (author: Ilia Kuzmin; @ David Webb; cc Pietro Desiato, Mostafa Kamel Hussien)

Playbook style: one owner, one closed/answerable question, explicit scoping, no
hedging, destructive action frozen in the same message.

> @David Webb — I think we're both right about different layers, and one check
> settles it.
>
> We agree all 418 elements are in the current `client-element-metas` (I confirmed
> against your two parquets). Select/isolate doesn't resolve against that, though —
> it resolves each element's `sourceFileElementId` through the **current
> translation's forge externalId → dbId map** (the property DB), and *that* is where
> they're missing: source file `bb85941b` has 18,908 elements in geometry but 0 of
> its 141 linked ones, while other activities in the same model select fine.
>
> **One question:** does the drag-and-drop "unlink elements not in current model
> versions" step compare links against `client-element-metas` / `project_element_list`
> (metadata), or against the **translated geometry externalId set** (the forge
> property DB)? If it's the metadata list, it would pass all 418 through — which is
> exactly why they weren't caught.
>
> To close it either way: I'll post membership of all 418 `sourceFileElementId`s in
> the current forge externalId map for versions `a3029b9f-…` and `55e72347-…`. If
> they're all metadata-present + geometry-absent, this is a metadata/geometry sync
> issue on the current version, not orphaned links.
>
> @Pietro Desiato @Mostafa Kamel Hussien — **please hold the 418-link deletion I
> proposed until David and I agree on the above.** Deleting the links is irreversible
> and, if the cause is a bad/stale translation rather than a genuinely removed scope,
> the correct fix is to re-translate / regenerate the metadata — deleting would then
> destroy valid links a corrected model needs. I'll come back with a clear
> delete-vs-re-translate recommendation once the check lands.
>
> Scope: this is the web-viewer activity-linking select/isolate, not the dashboard
> filter panel, and not a missing "retired filter."

## The one decisive check (owner: Ilia to post; David to confirm the pipeline side)
For all 418 `sourceFileElementId`s in `activity-7c4f2509-orphaned-418.csv`, test
membership in the **current translation's forge externalId set** for model versions
`a3029b9f-…` (PC) and `55e72347-…` (QA), alongside their (already-confirmed)
presence in the current `client-element-metas`.
- **If all 418 = metadata-present + geometry-absent** → Ilia confirmed; root cause
  is metadata/geometry desync on the current version. Fix decision then: re-translate
  / regenerate `client-element-metas` to match geometry (preferred, non-destructive)
  **vs** delete links (only if the scope is confirmed permanently removed).
- **If any resolve in the forge map** → the viewer/loaded-model path is implicated
  instead, and the delete is wrong; reopen the FE robustness angle.

## Follow-through the human should own (not executed here)
- **Do NOT action the delete** on the current thread state — it is the live
  destructive-action approval and it is unapproved + disputed.
- **Assign the backend question an owner** (David Webb): what the drag-and-drop
  auto-unlink compares against. An unanswered mechanism question here means the
  class of bug recurs on every re-translated Revit model.
- **"Why now" (playbook #5):** correlate the PC/QA re-upload timeline with when the
  translation dropped the deep-underground scope while metadata kept it.
- **Cohort (playbook #6):** once the layer is agreed, sweep all FAR01 activities
  whose links are metadata-present + geometry-absent — likely all "(Retired)"
  deep-underground items — and remediate in one pass.
- **FE robustness (still valid regardless of cause):** the Gantt shows a linked
  count from Layer 1 while select/isolate silently resolves to 0 in Layer 2 with no
  user feedback (`context.md` § Mechanism). Surface "N linked elements aren't in the
  loaded model's geometry" instead of doing nothing. Owner: Darminder. Split from the
  data question, don't conflate.
- **Watch the media / open the attachments** (NEEDS HUMAN): the two `.mp4`s +
  `client-element-metas` parquets + the 418-link CSV are the inputs to the decisive
  check.
- **Post-close pitfall entry:** metadata (`client-element-metas`) and translated
  geometry (forge externalId/property DB) are independent artifacts and can diverge
  for the same `modelVersionId`; select/isolate depends on the geometry layer, the
  count depends on the metadata layer — a count > 0 can select 0. Revit models have
  no object-id-map safety net (that is Navis-only) to catch the drift.

---

## Archived — 2026-07-13 draft (superseded)

> Kept for provenance. At 07-13 the mechanism was code-identified but the cause was
> the "orphaned links from a deleted/re-versioned model" hypothesis at 6/10, and the
> ticket was not yet blocked on a disagreement. The draft below answered Yash's
> "any update?" and proposed a single count-vs-selectable data diff owned by Ilia,
> plus a "was a model re-versioned?" question to the client/PM side. That diff has
> since been partly run on-ticket and has evolved into the Layer-1-vs-Layer-2
> question above; the "was it re-versioned" question was answered yes (both models
> re-uploaded). Full original text is in git history / the prior version of this file.
