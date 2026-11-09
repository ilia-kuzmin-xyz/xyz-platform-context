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
