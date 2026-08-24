# PLT-3084 — "AT10X - undo/ Ctrl Z not working properly in web viewer"

- **Domain slug:** viewer-and-model
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3084
- **Type:** Live Incident · **Priority:** Medium · **Status:** In Analysis
- **Assignee:** Ilia Kuzmin · **Reporter/relay:** Yash Patel
- **Project:** AT10X · **Software Area:** Web Viewer · **Freshdesk:** #7743 (Waiting on 3rd line)
- **Created:** 2026-08-24 08:53 · New folder, first investigation.

## 2026-08-24 — first pass: mechanism found in code, three defects, fix branch pushed

### The report

Two symptoms were raised together. Yash's comment (110242, 08-24 08:58) says the first is closed:

1. **Select linked elements** did not select everything linked to the activity. **Resolved** —
   works once all relevant models are open. Not investigated further here.
2. **Ctrl+Z does not undo element-to-activity linking.** Still open. Yash reproduced it himself,
   session id `platform-web-4d72a647-c1da-4f87-9296-3ef58a8e8e5e`. The question put to us is
   whether linking is meant to be on the undo stack at all, and if so why Ctrl+Z does not revert it.

**Answer to the question as asked: yes, linking is on the undo stack by design.**
`LinkingService` registers `HistoryType.Link` undo/redo callbacks in its constructor
(`linking-service.ts:56-59`) and pushes an entry after every link
(`:401-408`), unlink-by-pair (`:476-484`) and unlink-selected (`:522-530`). So the feature exists
and the report is a defect, not a missing capability.

### Architecture, because the bug lives in the seam

Undo has **two sources of truth**:

- `HistoryService` (`components/history-service/history-service.ts`) — one global ordered list of
  `{id, type}` plus a cursor `_historyIndex`. Ctrl+Z is bound to it in `viewer-bar.tsx:36-37`.
- **A private stack inside each service that registered callbacks** — `LinkingService.undoStack`
  (`linking-service.ts:42-43`), `SelectionService._selectHistory`, `ViewerService._viewerHistory`,
  `SectionToolService`. `HistoryService.undo()` only reads the *type* at the cursor and calls that
  service's callback; the service pops its own stack.

Five types share the one global list: `HideIsolate`, `Link`, `Status`, `DataMap`, `Select`,
`Section` (`history-service.ts:126-133`). Nothing keeps the global cursor and the private stacks
in step, and every way they fall out of step swallows an undo silently.

### VERIFIED — three defects, all read in the current checkout

**D1 — the cursor jumps to the end of the list on every model load. This is the leading cause.**

`clearHistoryOfType` (`history-service.ts:93-97`) does
`this._historyIndex = this._history.length - 1` unconditionally, discarding wherever the user was.
It is called from `ViewerService._clearHistory()` (`viewer-service.ts:427-439`), which is wired to
**`MODEL_ROOT_LOADED_EVENT`** (`:423-425`, registered `:136,144`) and to the model-unloaded handler
(`:601`) — so **every model open and every model close**, whether or not a single `HideIsolate`
entry exists to drop.

Consequences, both matching "not working as expected":
- An action the user already undid is **re-armed**. Undo the link, open a model, press Ctrl+Z
  again and it re-runs against the same global entry.
- **Redo dies.** After a model load `canRedo()` is false, so Ctrl+Shift+Z does nothing.

This ties directly to symptom 1 being about models not all being open: the user was opening models
during the session, which is exactly what fires this.

**D2 — `invalidateLinks` drops the private stacks and leaves the global entries behind.**

`linking-service.ts:70-74` empties `undoStack`/`redoStack` and tells nobody. The `Link` entries stay
in the global list. Each orphan then costs one Ctrl+Z that pops an empty stack and
`return`s with no message (`:639-641`) — **a silent no-op**, one per press.

It fires on `syncActivityLinks()` (`:146`), which runs on `reloadSyncData` after a schedule save
(`use-schedule-form.tsx:135,226` → `project-service.ts:330`) and on model deletion; and on **every
failed link or unlink** (`:413`, `:497`, `:535`).

**D3 — the no-callback branch moves the cursor twice.**

`history-service.ts:51-54` calls `clearHistoryOfType(type)`, which recomputes the cursor, and then
`:56` decrements it again. One live entry is stepped over. Reachable whenever a type has entries but
no registered callback.

### Also true, not changed, and worth knowing before we answer the customer

**Selection shares the same stack.** Every non-empty selection change pushes a global `Select`
entry (`selection-service.ts:456-491`). So if the user clicks anything in the model after linking —
including using "select linked elements" to check the link worked — **the first Ctrl+Z undoes that
selection, not the link.** Working as designed, and almost certainly part of what the customer
experienced. Whether selection belongs on the same undo stack as data edits is a product question,
not a bug.

**Ctrl+Z is swallowed inside form fields.** The binding goes through `hotkeys-js`
(`hotkey-service.ts:43`), which by default ignores keydown from `INPUT`/`SELECT`/`TEXTAREA`. If
focus is in a Gantt inline editor or a search box, the viewer never sees the key. Unverified as a
contributor here; cheap to check in the video.

**`LinkingService.undo()` is async and nobody awaits it** (`history-service.ts:50` calls it and
moves on; `:639` is `async`). Held Ctrl+Z advances the cursor at keyboard speed while the link
stack unwinds at network speed. Not fixed on the branch — it needs a re-entrancy decision, not a
one-liner.

### Fix branch

`PLT-3084-undo-ctrl-z-linking` (hc-frontend, off `origin/master`, commit `2867a3a`), **not raised
as a PR**. D1: the cursor now lands after the last surviving entry that was already at or before
it. D2: `invalidateLinks` clears the global `Link` entries too. D3: return instead of decrementing
again. Both stack-empty paths in `LinkingService` now log instead of going quiet, so the console
says why Ctrl+Z did nothing. Five characterising tests in
`history-service.test.ts` (new file) pin each behaviour.

**Nothing was built, type-checked or run.** `npm ci` fails in this environment on the private
package `@xyzreality/dhtmlx-gantt` (401). CI is the first validation.

### What remains UNVERIFIED

- **Which of D1/D2 the customer actually hit** — both produce "Ctrl+Z did nothing", and the video
  would separate them (did they open a model, or save a schedule, between linking and pressing
  Ctrl+Z?).
- Whether the `Select`-on-the-same-stack behaviour is the whole of what they saw, in which case the
  code defects are real but not their complaint.
- Whether the fix resolves it on AT10X. Needs a build.

### Attachment gap

- ⚠️ **`Screen Recording 2026-08-24 132158.mp4`** (142 MB, Yash) — not openable by this agent, no
  tool to fetch authenticated Jira media. **This one is load-bearing.** Watching the 20 seconds
  before the Ctrl+Z press decides between D1, D2 and the selection-on-the-stack explanation: what
  is needed is whether a model finished loading, or a schedule was saved, in that window.
- ⚠️ `image-20260824-075819.png` (Yash) — not opened. Low value; the description is in text.
