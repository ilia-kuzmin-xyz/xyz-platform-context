# PLT-3172 — "Linked element not showing as blue when selected via 'Select Linked Elements' on an activity" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3172
- **Issue type:** Live Incident · Software Area: Model Viewer
- **Status:** **In Analysis** → Group A (brand new, never triaged before)
- **Priority:** Major · **Project:** AEX01
- **Reporter (Jira):** Yash Patel, relaying a customer via Freshdesk #8087 ("Waiting on 3rd line")
- **Assignee:** Rishi Bhugobaun
- **Created:** 2026-09-24 16:20 · **Last updated:** 2026-09-24 17:03 (2 comments)
- **Domain slug chosen:** `viewer-and-model` (VWR) — this is 3D-viewer selection/highlight
  behaviour, not schedule data or progress calculation.
- **Triage date:** 2026-09-25 · first pass.

---

## Description (customer, via Yash)

> When I select an activities with elements. -> I can right click and choose Select linked
> element. We used to see the Linked element to this activity. Element in blue. Why this option
> doesn't work anymore???

## Comments (2, both 2026-09-24)

**`112979`** (Yash Patel, 16:22): relays the report, adds — **"I reproduced it on my end as well."**
Includes a screenshot (inline, not a separate attachment — see Unopenable media).

**`112981`** (Yash Patel, 16:29): Freshdesk automation, "Waiting on 3rd line." No further human
comment since.

**Verified: this is not a customer-only repro.** Yash reproduced it independently the same
afternoon, before assigning it to Rishi. That rules out client-side causes (browser extension,
local cache) as the sole explanation — whatever broke it is broken for us too.

## Unopenable media

One attachment: `65180`, `Screen Recording 2026-09-24 204718.mp4`, 93,897,674 bytes (~90 MB),
uploaded by Yash 2 minutes after his comment. Per this folder's standing finding (confirmed
2026-09-08, not re-tested this run — the session-wide gap is structural, not object-specific):
this session's Jira credentials get **HTTP 403** on `attachment/content/<id>` for any attachment,
image or video. **A human needs to open this video.** It would settle, at minimum: whether the
selection highlights nothing at all vs. highlights the wrong colour vs. highlights nothing visible
but the element-count/stats panel still shows a selection (i.e. a rendering-only vs. a
data/selection-state bug).

## Code investigation

**The feature.** Right-click an activity in the Gantt scheduler → "Select Linked Elements" →
`activity-context-menu.tsx` → `useLinkedElementActions().selectLinkedElements()`
(`use-linked-element-actions.ts:25-64`).

**What it does, read in full:**
1. Resolves the activity's linked element ids via `linkingService.getElementsForActivity()` (:16-23).
2. For each loaded model, filters those element ids to the ones mapped to that model
   (`viewerService.elementId2ModelId`) and converts to Forge `dbId`s
   (`viewerService.elementId2DbId`) (:41-51).
3. If filters are active, further restricts to `filterService.allowedDbIdsByModel` (:47-51).
4. Pushes non-empty per-model groups into `aggregateSelection` as `{ model, ids, selection }`,
   tags each `selectionType = Autodesk.Viewing.SelectionType.REGULAR`, and calls
   `viewer.impl.selector.setAggregateSelection(aggregateSelection)` directly (:53-63).

**Shape check against known-working call sites — verified, not the cause.** The `{model, ids,
selection}` shape (no `dbIdArray`) matches `model-browser-service.ts`'s "select whole model"
right-click action (:184-188, :204) and its `selectMultiple` path (:295-309), both of which call
`viewer.setAggregateSelection(selection)` (top-level, not `.impl.selector.`) after
`selectionType = REGULAR` — same pattern, same `Selection` type
(`viewer-x/impl/selection/selection.types.ts`). `selection-service.ts`'s drag-box selection
(`_handleButtonUp`, :150) calls the identical low-level `viewer.impl.selector.setAggregateSelection`
that `use-linked-element-actions.ts` does. **So neither the object shape nor the low-level- vs.
top-level-API choice distinguishes this call site from ones presumed still working.** This rules
out two plausible-looking hypotheses without needing the app.

**Forge's own highlight rendering is not app code.** `setAggregateSelection` with
`SelectionType.REGULAR` is expected to trigger Forge's native highlight colour with no further
app-side theming step — nothing in `selection-service.ts` or elsewhere in this tree was found
applying a *separate* highlight-colour pass keyed off `selectionStore` (the store update in
`_handleSelectionChange`, :412, is one-way: viewer→store, for UI panels/counts, not store→viewer
colour). **Inferred, not verified against Forge's SDK source** — this session has no access to
Autodesk's Viewer3D internals beyond what this repo imports.

**One candidate lead, timing-based and NOT confirmed as causal.** The only file in the
click/selection path touched in the last 30 days is `selection-service.ts`, in commit `fe43628`
("PLT-3165: Stop Shift+click deselected elements from being linked", merged **2026-09-24 08:37**
— **~8 hours before** Yash's report). The diff removes the `_multipleSelection` flag and the
`_manageMultipleSelection(event)` call from `_handleSelectionChange` (the `AGGREGATE_SELECTION_
CHANGED_EVENT` listener), leaving it to consume `event.selections` unmodified. Two reasons this is
a lead, not a conclusion:
- It is the only change in the whole selection subsystem in the report's plausible window, and the
  gap between merge and report is hours, not days.
- But `use-linked-element-actions.ts` triggers this event *programmatically* (not via Shift+click),
  and the removed branch was gated on `this._multipleSelection` (Shift held) — a programmatic
  "Select Linked Elements" click should never have taken that branch even before `fe43628`, so the
  causal chain from this diff to this symptom is **not established**, only coincident in time.

**What would falsify or confirm the lead, cheaply, without the video:** in the browser console
during a repro, log `aggregateSelection` just before the `setAggregateSelection` call
(`use-linked-element-actions.ts:63`) — if it is non-empty and the highlight still doesn't show,
`fe43628` and the whole selection pipeline are cleared and the bug is in Forge's own rendering
(theme/extension conflict) instead. If it is empty, the bug is upstream in step 2/3 (id resolution
or filter exclusion), and `fe43628` is very likely unrelated — that path doesn't touch id
resolution at all.

## Verified vs. inferred

**Verified (code read, this session):** the four-step mechanism above; the shape/API match against
two other working call sites; `fe43628` is the only selection-path file changed in 30 days and its
timing relative to the report.

**Inferred, not verified:** that Forge's native rendering needs no app-side colour step (no access
to Forge SDK source to confirm); that `fe43628` is unrelated to this symptom (plausible from the
Shift-gate reasoning, but the removed code's full blast radius on `_handleSelectionChange` was not
traced beyond the diff itself).

**Not verified at all, and cannot be from this session:** whether the customer's project (AEX01)
has anything unusual (NWD/Navisworks vs. Revit models, active filters, multiple linked models) that
narrows the four-step mechanism; the actual on-screen behaviour in the video.

## What remains unverified

- The video (`65180`) — session-wide 403, needs a human.
- Whether `aggregateSelection` is empty or non-empty at the point of failure (the one console check
  that discriminates the two remaining hypothesis classes).
- Whether reverting/bisecting past `fe43628` locally restores the highlight — not attempted; this
  environment cannot build or run `hc-frontend` (`npm ci` fails on the private
  `@xyzreality/dhtmlx-gantt` package, per the standing environment note in
  `live-incident-run-instructions.md`).
