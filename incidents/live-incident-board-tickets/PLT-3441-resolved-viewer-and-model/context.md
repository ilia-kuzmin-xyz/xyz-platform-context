# PLT-3441 — (ELN04) "Section box selected" not working reliably in web editor

## 2026-11-09 (scheduled) — first read. New ticket, Open, assigned to Rishi, 3 days with no dev reply

**Ticket (fetched live with comments, 2026-11-09).** Created 2026-11-06 12:56 by Yash (Freshdesk 8220), priority Minor, status **Open**, assignee **Rishi Bhugobaun**. Two comments, both Yash, both 11-06 12:58: (1) the hand-off to Rishi, (2) "Freshdesk status changed to: Waiting on 3rd line". Nobody has replied since. Today is Monday, so 1 working day plus a weekend.

**Customer words (ELN04, "Is the device still usable: Not usable" is a form default, ignore):** the "Section box selected" tool "doesn't function reliably. Sometimes it works and other times it doesn't." Page refresh and cache clear did not help. A screen recording is attached.
**Yash added:** it works with every other model, even the *West* version of the same model set. Failing model: `PC-F_HUNT_ELN04_OH EAST_Hanger and Supports.rvt` (SharePoint link in the ticket, not opened).

**Media (403 from this routine, not retried per 09-08 rule):** Jira attachment `67081` `Screen Recording 2026-10-06 134504.mp4` (15 MB), plus one inline image in comment 117880 (blob URL, not fetchable). The recording settles three things: what is selected when it fails, whether the click does nothing or draws a wrong box, and which app version it was recorded on. **Note the filename date: 2026-10-06, a month before the ticket.** It may predate the 10-29 PLT-3370 section-tool change, so ask which version.

## What "Section box selected" does (verified by reading, not run)

- Right-click menu item, `viewer-context-menu.tsx:130-131`, always enabled (`disabled: false`).
- Handler `sectionBoxSelected` at `use-context-menu-actions.tsx:169-185`: takes `viewerService.getAggregateSelection()`; returns silently if exactly one selected model is 2D (`:174`); otherwise builds a box with `calculateBoundingBoxForAggregateSelection` (`:178`) and calls `activateSectionTool('box', bbox)` (not awaited, no catch) if no section is active, else `setSectionBox(bbox)`.
- The box helper `section-box-helper-functions.ts:304-333` unions `fragList.getWorldBounds` over `instanceTree.enumNodeFragments(dbId, cb, false)`. **The third argument is `recursive = false`**, so only a node's *own* fragments count.
- If the selection yields no fragments the result is an empty `THREE.Box3` (min = +Infinity, max = -Infinity). **Nothing checks for that before it is handed to the Section extension** (`section-tool-service.ts:326-343`: `setSectionBox(totalBBox)` with `defaultBBox` taken as given because an empty Box3 is truthy).
- The codebase already knows parents can have no mesh: `selection-service.ts:~250-256` ("Parent has no mesh — children are the visible geometry"), `select-same-family.ts:90-100` `hasOwnGeometry`.
- Call sites checked live: `sectionBoxSelected` is wired (menu item, `viewer-context-menu.tsx:131`); `calculateBoundingBoxForAggregateSelection` has exactly one caller (`use-context-menu-actions.tsx:178`).

## Hypotheses (all INFERRED, none observed)

| | prediction one read can falsify | status |
|---|---|---|
| **H1** the failing selection is a parent node with no own fragments (nested Revit families: hangers and supports are assemblies of rod, clamp, plate) so the box is empty | on a failing selection `viewer.getAggregateSelection()` returns dbIds for which `enumNodeFragments(id, cb, false)` yields 0 fragments, and `enumNodeFragments(id, cb, true)` yields > 0 | **open, leading.** Fits "works on other models" (flat families) and "sometimes" (depends which node the click lands on). Does NOT yet explain why West works, unless West is flatter. |
| **H2** nothing is selected when the menu item is used (right-click does not select under the cursor in some paths), so the aggregate selection is empty | `getAggregateSelection().length === 0` at the moment of the click | open, cheap to rule out |
| **H3** fragments not yet streamed in (large model, `getWorldBounds` of unloaded fragments) | works on second try after waiting; fragment count rises | open, weak: the recording is the discriminator |
| **H4** a section is already active and `setSectionBox` is rejected for the current frame | fails only when a box was already on screen | open; `section-tool-service.ts:373` notes `setSectionBox` rejects a box that does not match the frame, and PLT-3370 touched this area on 10-29 |

Not killed, not confirmed. **No prior run had this ticket**; `PLT-2651` and `PLT-3401` are different section-box problems (orientation, S-curve), related only by area. `dashboard/viewer-and-model.md` has no entry for this menu item. Pattern check against `recurring-defect-patterns.md`: no matching pattern identified; not exhaustively searched.

## Who owes what

Yash is waiting on Rishi (hand-off 11-06). Nothing is owed by Ilia. Group A (Open). **Class 1 (stale, unresponded), with a class 3 shape** once the failing element is known: the fix, if H1, is one line (`recursive = true`) plus an empty-box guard, but must not be written before the failure is observed (09-09 rule).

## Not verified

Everything about the model (never loaded here), the video, which app version the customer runs, whether the failing click selects a parent, and all four hypotheses. hc-frontend master `1ebae59` (2026-11-05); shallow clone, so no release-tag check was possible.

## 2026-11-10 (scheduled) — Rishi's PR #2466 found the cause; ticket left scope (In Code Review); changes requested by Darminder

**Jira (fetched live with comments).** Status now **In Code Review** (moved 11-09 12:05). Still only Yash's two comments from 11-06; Rishi wrote nothing in Jira. Out of scope by status, folder renamed `resolved` (same convention as PLT-3308 behind PR #2378).

**PR #2466 "Section box selected fits models with geometry on child nodes"** (Rishi, branch `bug/PLT-3441-section-box-selected-nested-geometry`, open, not draft; requested reviewers TomMasdinXYZ, ilia-kuzmin-xyz, SergiuszXYZ). Diff, read from GitHub today:
- `section-box-helper-functions.ts:~321`, `enumNodeFragments(..., false)` becomes `true`. This is **exactly the one-line change H1 predicted** (the 11-09 note said "recursive = false, so only a node's own fragments count"). PR body says NWC exports keep geometry on child nodes, so the box came out empty and "it looked like the tool did nothing". The failing file in the PR is the source `.nwc` of the ELN04 East model.
- Orientation sampling budget 4000 to 8000 fragments (`section-tool-orientation.ts`), because one stray survey point skewed the footprint, a ~6 degree tilt on the same model. **A second defect that was not in my hypotheses.**
- No empty-box guard was added; my 11-09 observation that nothing checks for an empty `Box3` stands.

**Status of hypotheses.** H1 (parent node with no own geometry gives an empty box): **now supported by the author's own investigation, still not observed by us**. Rishi's PR body describes the failure as observed on the model, so treat it as his confirmation, not ours. H2, H3, H4: not needed by the PR; not killed, not tested. The "sometimes works" part is consistent with H1 (works when the click lands on a node with own geometry) but nobody has said so.

**Review state.** Copilot twice "approval recommended". **Darminder, CHANGES_REQUESTED 11-09 18:09:** with Section box selected on a single element the box "seems to include others around the element which have not been selected" (video in review). **Inferred, not verified:** `recursive = true` on a selected node adds all descendants, and on these models a single clicked element may be a node with children that are, or sit near, other elements; the fit then overshoots. Whether that is the fix's cost or a second effect of the orientation change is unknown. Rishi owes a reply or a revision, 1 day.

**Who owes what.** Rishi (answer Darminder). Ilia is a requested reviewer but Darminder already reviewed; no review from Ilia visible. Nothing owed by Ilia in Jira. **Class 1 (Rishi owes), with a class 3 shape on the overshoot**: it needs one look at the video and one run on the NWC model.

**Superseded:** the 11-09 optional comment asking Rishi to run `getAggregateSelection()` (see recommended-action.md). Do not post it.
**Not verified:** the model, Darminder's video, whether the overshoot is from `true` or from the orientation change, which app version the customer's October recording was made on (`67081` still 403, not retried).

## 2026-11-11 (scheduled) — PR #2466 reworked; Darminder's first finding gone, second CHANGES_REQUESTED on drag-select

**Jira:** unchanged (`updated` 11-09 12:05, still In Code Review). Not in scope; residual only.

**PR #2466, head `94b99fe` (was `52d219a` on 11-10).** Rishi pushed two commits on 11-10 (10:09 "Fit the selection's section box in the section tool's frame", 10:32 "Re-read the section frame before refitting an active box"). The approach changed: the one-line `recursive = true` in `section-box-helper-functions.ts` is **gone**; `calculateBoundingBoxForAggregateSelection` is deleted. Instead `SectionToolOrientation.fitBoxToSelection` (new, `section-tool-orientation.ts`) walks descendants (`enumNodeFragments(..., true)`), fits every vertex in the frame SectionTool uses (rotation of the first 3D model's `refPointTransform`) and returns `null` on an empty box, so the 11-09 "no empty-box guard" note is now answered by the PR. `SectionToolService.sectionToSelection` replaces `setSectionBox` and calls `tool.activate()` before `setSectionBox` (H4 shape, Copilot's finding, resolved).

**Darminder, CHANGES_REQUESTED 11-10 18:39:** single element plus Section box selected **now works**, but a group (drag) select made inside that box selects elements outside it, which show as selected on exiting the box. The 11-10 overshoot finding is therefore superseded by this one.

**Inferred mechanism, not observed (code read only, master `72f1a7e`, unchanged by the PR):** drag select ends in `selection-service.ts:110` `_handleButtonUp`, which filters by the box at `:131` via `getElementsInsideSectionBox(..., strict = false)`. Non-strict uses `containsBox` (`section-box-helper-functions.ts:104`): an element is **kept unless all eight corners of its world-axis AABB lie beyond one single plane**. That is a conservative test: an element whose AABB crosses the box, or sits near a corner/edge, passes although its geometry is outside. Two things in the PR make it bite harder than before: the box is now fitted tightly to one element, and it is rotated into the building frame while element AABBs stay world-axis. The comment at `:129-130` says Forge would do this itself but `useGeometricIntersection` breaks it, so this test is the only cut filter.
Falsifiable: if this is the cause, (a) every wrongly selected element's world bounding box intersects the section box, and (b) the same drag on master with a hand-sized box of the same size and rotation over-selects too (pre-existing, made visible by the PR). If (b) does not over-select on master, the cause is in the PR, not here.

**Who owes:** Rishi (second round). Ilia still a requested reviewer. Class 1 (Rishi), class 3 shape. Nothing posted.
**Not verified:** all of the above mechanism; Darminder's video (GitHub user-attachment, not opened); whether the strict path (`allInsideBox`) would be the right fix or too strict for partly-cut elements.
