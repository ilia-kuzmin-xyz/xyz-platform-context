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

## 2026-08-24 (later) — why it works on dev and fails on prod, on the same Friday release

Ilia's question: same build, different behaviour. That is not a paradox here — it is a prediction
of D1. **None of the three defects is reachable by code alone; all three need a runtime event to
fire, and the events are data- and scale-dependent.** A small dev project never fires them; a
large federated production project fires them constantly.

### The mechanism, and it is specific

`ViewerService._clearHistory()` (`viewer-service.ts:427-439`) resets the global undo cursor, and it
is wired to **`MODEL_ROOT_LOADED_EVENT`** (`:136`, `:144`, handler `:423-425`) and to the
model-unloaded handler (`:601`). So the cursor is reset **once per model load, every time, for the
life of the session** — not once at startup.

Models are loaded one at a time in a loop (`viewer-service.ts:822-824`) and, crucially, **more can
be loaded at any point afterwards** via `addExtraDocument` (`:840-845`).

**And one of its callers is the linking UI itself.** `activity-linking-list/components/linked-node.tsx:67-76`
offers a **"Load model"** menu item on any unloaded model node, sitting in the same context menu as
"Select element(s)" and "Unlink from activity" (`:47-66`). Other callers:
`scene-properties/other-models-section.tsx:90`, `issue-model-element-details.tsx:44`,
`upload-panel.tsx:74`.

So the reported workflow — link elements to activities across a federation where not every model is
open — routes through model loading **in the same panel, between the link and the Ctrl+Z**.

### Why that maps exactly onto dev vs prod

| | dev | prod (AT10X) |
|---|---|---|
| models in the federation | one, or a handful | many |
| are models still being opened mid-session | no, all loaded at startup | **yes — the ticket says so** |
| `_clearHistory()` fires | once, before anyone can press Ctrl+Z | every time a model is opened or closed |
| `syncActivityLinks()` duration | milliseconds on a tiny link table | paginated at 20k links (`linking-service.ts:49`) |

**The ticket contains its own evidence for the middle row.** Yash's comment says the *other*
symptom — select-linked-elements missing elements — "has been resolved and is working as expected
**when all relevant models are open**". That is a direct statement that the user was working with
models not yet open, i.e. opening them, i.e. firing `MODEL_ROOT_LOADED_EVENT` mid-session. On dev
nobody does that because there is nothing to open.

### Checked and ruled out as the environment difference

- **No periodic sync exists.** Grepped every `setInterval` under `ViewerPage/`: viewer FPS sampling
  (`viewer-service.ts:379`), upload-panel polling, capture-360, the DuckDB monitor panel, the
  dashboard-logger tick (disabled), session-expiry warnings. **Nothing re-syncs links on a timer**,
  so D2 is event-driven only — a schedule save or a failed link — and cannot fire spontaneously.
- **No environment-conditional code on this path.** No feature flag gates the history service, the
  linking service or the hotkey binding.

### So the answer to "how come"

The build is identical and the bug is in the code on both. What differs is **how often the trigger
fires**. On dev the cursor is reset once, before the user touches anything, so it is invisible. On
prod every model the user opens — including from the linking panel they are working in — resets it
again, and any undo they had performed is silently re-armed while redo dies. That is why reusing
Friday's release changes nothing: the release was never the variable.

**Falsifiable, on prod, no branch build needed:** ~~link elements → open any model from the linking
panel's "Load model" menu → press Ctrl+Z. Predicted: the link does not revert and Ctrl+Shift+Z is
dead. Then repeat without opening a model. Predicted: works. If both behave the same, D1 is wrong
and the cause is D2 or the selection-on-the-same-stack behaviour.~~

⚠️ **SUPERSEDED — this protocol is not executable as written.** It reads as "link with no model
open", which cannot be done: selecting elements to link requires a loaded model. See the
2026-08-24 third pass at the end of this file for the corrected protocol, which uses the model
tree checkbox as the trigger and the Edit menu's Redo state as the oracle.

## 2026-08-25 — no change since the 08-24 investigation

Live fetch: status `In Analysis`, priority Medium, assignee Ilia Kuzmin, 2 comments — same as
recorded, newest still 110242-adjacent (08-24 08:59). No reply yet to the "why dev vs prod" answer
posted in this file's 08-24 (later) section (that answer was written here, not posted to Jira — no
comment has actually gone out on the ticket beyond Yash's original two). The 142 MB screen recording
remains the one load-bearing attachment, still unopenable here. Nothing re-derived.

## 2026-08-24 (third pass) — the repro protocol was not executable; corrected, and a better oracle found

**Supersedes the test protocol at the end of the 08-24 "why it works on dev" section. Do not use
that one.** Ilia's objection: it read as "link with no model open", which is impossible — you must
select elements in the viewer to link them, and that requires a loaded model. The intent was
"open a *second* model between the link and the Ctrl+Z", but that is not what it said, and it also
put the burden on finding an unloaded model to open. The diagnosis is unchanged; only the
instructions were wrong.

### NEW — the trigger is the model tree checkbox, not anything exotic

`model-layers/model-tree/hooks/use-node-actions.tsx:45-65` — **the checkbox next to any model in
the model tree loads and unloads it**:

```ts
if (item.isLoaded) await viewerService.removeExtraDocument(item.id)
else                await viewerService.addExtraDocument(item.id)
```

- tick on → `addExtraDocument` (`viewer-service.ts:840`) → `_loadModel` → `MODEL_ROOT_LOADED_EVENT`
  → `_modelLoadedHandler` (`:423-425`) → `_clearHistory()`
- untick → `removeExtraDocument` (`:913-922`) → `_performRemoval` → `MODEL_UNLOADED_EVENT` →
  `_modelUnloadedHandler` (`:555`) → `_clearHistory()` (`:601`)

Confirmed by grep that **`_clearHistory()` has exactly two call sites, both of them these**
(`viewer-service.ts:424`, `:601`). There is no third trigger, so any repro must go through a model
load or unload. Nothing else in the viewer resets the cursor.

### NEW — a visual oracle that does not require pressing Ctrl+Z at all

The viewer-bar menu's **Edit → Undo / Redo** items are disabled straight off the history service:
`menu-button.tsx:257,263` (`!historyService.canUndo()`) and `:275,281`
(`!historyService.canRedo()`).

They are live, because `clearHistoryOfType` always allocates a new array
(`history-service.ts:94`) and pushes it through `_updateHistory()` → `$setHistory` →
`HistoryProvider`'s `useState` (`history-provider.tsx:18-21`), so every consumer re-renders even
when the filter removed nothing.

**So D1 has a symptom you can see without touching the keyboard: Redo greys out after a model
toggle.** That removes every way to misread the result — no console, no judging whether a link
"looks" reverted, no race with an async undo.

Predicted on master, arithmetic from `clearHistoryOfType`: history `[Link]`, cursor `0`; after one
undo cursor is `-1` and `canRedo()` is `-1 < 0` = **true**; `clearHistoryOfType(HideIsolate)`
removes nothing but sets cursor to `length - 1` = `0`, so `canRedo()` is `0 < 0` = **false**. On
the fix branch the cursor stays at `-1` and Redo remains enabled.

### The corrected protocol

Setup: a project with at least two models. Open the viewer and **wait until nothing is still
loading** — a model still streaming fires the event by itself and contaminates the test.

**Step 1 — does link-undo work at all.** Select elements → link to an activity → **do not click
anywhere in the 3D view** → open Edit menu. Undo should be enabled. Press Ctrl+Z; the link should
revert. Reopen Edit; **Redo should now be enabled.**
*If the link does not revert here, D1 is not the cause and the answer is D2 or something else —
stop and say so.*

**Step 2 — the D1 test.** From step 1's end state (Redo enabled), **tick an unloaded model on in
the model tree** (or untick a loaded one), then reopen Edit.
**Predicted: Redo is greyed out.** A model toggle that has nothing to do with linking has silently
discarded the pending redo. That is D1, confirmed, with no console.

**Step 3 — the re-arm half, optional and more visible.** From step 2, press Ctrl+Z again.
Predicted on master: the cursor was pushed back onto the already-undone `Link` entry, so it runs
that undo a second time — either unlinking something already unlinked, or popping the next older
link action and reverting a link nobody asked about.

**Step 4 — separate the selection behaviour, which may be the whole of the customer's complaint.**
Fresh: select elements → link → **click any element in the 3D view** → Ctrl+Z.
Predicted: the first Ctrl+Z undoes the *selection*, the second reverts the link. By design
(`selection-service.ts:456-491` pushes a global `Select` entry on every non-empty selection). If
step 2 comes back clean but this reproduces the customer's experience, the code defects are real
but are not what they reported, and the conversation with product is about whether selection
belongs on the same stack as data edits.

## 2026-08-24 (fourth pass) — D1 FALSIFIED for the reported repro; re-ranked

**Ilia reproduced it on prod with a very small model that opens instantly, no model toggling.**
That kills D1 as the explanation for *that* repro, and it should be said plainly rather than
defended: with the model already loaded before any linking, `_clearHistory()` fired once on an
empty history, and **nothing else in the codebase moves the cursor** — `_clearHistory()` has
exactly two call sites (`viewer-service.ts:424`, `:601`), both model load/unload.

D1 is still a real defect and the fix still stands. It is no longer the leading explanation.

### Ruled out this pass, by reading rather than by argument

- **Callbacks not registered.** `HistoryService` is constructed at `project-service.ts:168`,
  `LinkingService` at `:174`, so `historyService` is defined when
  `registerHistoryCallbacks(HistoryType.Link, …)` runs (`linking-service.ts:56`). The `?.` never
  short-circuits. Not the cause.
- **A hotkeys-js scope change.** Grepped `setScope` / `deleteScope` / `hotkeys.filter` across
  `ViewerPage/` — **no occurrences**. Nothing reassigns the scope, so a scope mismatch cannot be
  swallowing the key.
- **`selection-service`'s catch-all binding interfering.** `hotkeys('*', …, this._manageHotkeys)`
  (`selection-service.ts:43`) — `_manageHotkeys` (`:72-77`) only tracks Shift/Ctrl state. It does
  not preventDefault and does not return false. Harmless.
- **A `linkChanges$` subscriber re-selecting elements** (which would push a `Select` entry on top
  of the `Link` one). All subscribers refresh trees, panels and element state
  (`use-link-queries.ts:40`, `linking-provider.tsx:20`, `scene-properties.tsx:61`,
  `useLinkedElementsTreeData.ts:29`, `ModelDetailsPanel.tsx:216`,
  `services/element-state/element-state-changes.ts`). None touches viewer selection.
- **A periodic sync firing `invalidateLinks`.** Already established: no `setInterval` anywhere
  under `ViewerPage/` re-syncs links.

### Re-ranked candidates for the small-model repro

**H-A — the keystroke never reaches the service.** The binding goes through `hotkeys-js`
(`hotkey-service.ts:43`), whose **default filter drops keydown originating in `INPUT`, `SELECT` or
`TEXTAREA`**. To link on a real project you must find an activity, which generally means typing in
a search field or clicking into the Gantt; if focus is left there, Ctrl+Z never arrives and the
browser's own text-undo takes it instead. On dev, with few activities, you can pick one without
typing. **This explains prod-vs-dev without needing any scale or timing difference, which is
exactly what the small-model repro demands.** Currently the strongest candidate.

**H-B — the top of the stack is `Select`, not `Link`.** Every non-empty selection change pushes a
global entry (`selection-service.ts:456-491`), so any click in the 3D view after linking — including
"select linked elements", the other half of this very ticket — means the first Ctrl+Z undoes the
selection. By design, but indistinguishable from a broken undo to the user.

**H-C — D2, an orphaned `Link` entry over an empty private stack.** Still live; needs a schedule
save or a failed link earlier in the session.

**D1** — demoted. Real, fixed, but not this repro.

### The decision tree, no build required

The viewer-bar **Edit menu** is the instrument, because its Undo item calls
`historyService.undo()` **directly** (`menu-button.tsx:76`) and therefore **bypasses `hotkeys-js`
entirely**. After linking, open Edit:

| What you see | What it means |
|---|---|
| Undo **greyed out** | no entry on the stack — the link never registered one |
| Undo enabled, **menu Undo works, Ctrl+Z does not** | **H-A confirmed** — the keystroke is being filtered, focus is in an input |
| Undo enabled, menu Undo **changes the selection** instead of reverting the link | **H-B** — `Select` is on top |
| Undo enabled, menu Undo **does nothing at all** | **H-C** — entry live, private stack empty |

Cheapest first move: **click in empty 3D space (not on an element) to move focus out of any input,
then press Ctrl+Z.** If it works then and not otherwise, H-A is the answer and none of D1/D2/D3 is
what the customer is hitting.

### Branch

`PLT-3084-undo-ctrl-z-linking`, commit `d0c919c`. `HistoryService.undo/redo` now emit one warn line
per press naming cursor, depth, the whole stack by type, the type dispatched, whether it has a
callback, and which types are registered. **Absence of that line after a Ctrl+Z press is itself the
H-A verdict.** Warn so it survives a production build and lands in the session log.

## 2026-08-24 (RESOLVED) — root cause: prod runs a build predating PR #2081. Nothing to fix in code.

**Proven live on prod by Ilia, not inferred.** Every hypothesis in the sections above — D1, D2, D3,
H-A, H-B — is superseded. They are real defects (D1/D2/D3 are still worth the fix branch) but none
of them is this incident.

### The evidence, in order

Using `window.projectService` (enabled on prod by setting the `feature-flags` cookie to
`[{"name":"enableGlobalWebViewerAPI","value":true}]` — `getFeatureFlagValue.ts` reads flags from
that cookie, so no build is needed):

```
{ stack: "link", cursor: 0,
  registered: ["section","status","hideIsolate","select"],
  undoStack: 3, redoStack: 0 }
```

- **`registered` contains no `link`.** The `HistoryType.Link` callbacks are not on the history
  service at all.
- `undoStack: 3` and growing — the LinkingService instance is alive and recording actions.
- `linkingService._isDisposed === false` — so `dispose()` (the only code that deregisters `Link`)
  never ran. The registration therefore **never happened**.
- Re-registering by hand in the console made undo work immediately:
  `p.historyService.registerHistoryCallbacks('link', { undo: () => l.undo(), redo: () => l.redo() })`

That last step converts the diagnosis into proof: the undo machinery is entirely sound, the handler
was simply not attached.

### Why: the deployed build predates the fix

`git log -S "registerHistoryCallbacks(HistoryType.Link"` finds it added in **`4ad83a7`,
PLT-2743 / PR #2081, merged 2026-08-07**. Before that commit `LinkingService`'s constructor was
literally `constructor(private readonly projectService: ProjectService) {}`. The commit message
describes this incident exactly, a fortnight before it was reported:

> LinkingService has undo() and redo(), pushes addHistoryAction(HistoryType.Link) at three sites
> and deregisters on dispose — but never registered. The registration lived in the V1 wrapper,
> which registered the V2 service's methods, and went with it when that file was deleted in
> 3dd76091c (PLT-2610/2611).
>
> Undo after a link operation therefore found no callback, logged an error and called
> clearHistoryOfType('link'), silently discarding every link entry from the history.
>
> Pre-existing on master, not introduced by this branch.

So the regression was introduced when the V1 linking wrapper was deleted (PLT-2610/2611,
`3dd76091c`) and fixed on master on 08-07. **Prod is running something older than 08-07.**

### This explains every observation that made the earlier hypotheses look wrong

- **Fails 100% of the time on prod, on any project, any model size, one element or ten.** No
  callback ever exists, so no link is ever undoable. Scale, timing and model loading are all
  irrelevant — which is why the small-model repro falsified D1.
- **Works on dev.** Dev runs a build containing #2081.
- **Undo appears enabled for multi-element links, then does nothing and greys out.** The `Select`
  entries from the selection are serviceable; the `Link` entry is not, so `undo()` hits the
  no-callback branch and `clearHistoryOfType('link')` purges every link entry at once.
- **Undo greyed out immediately for a single-element link.** Same purge, with no `Select` entry
  left behind.

### One-line confirmation of the deployed build, from any browser

```js
window.projectService.linkingService.constructor.toString()
```

An empty constructor body (only the parameter assignment) means the build predates #2081. Terser is
configured without property mangling (`webpack/webpack.prod.js:65-90`), so this reads cleanly on the
production bundle.

### Action

**Ship a build that includes PR #2081.** There is no code to write for this ticket. The open
question is why a release cut on 2026-08-21 does not contain a commit merged on 2026-08-07 — that is
a release-process question, and it is the more important finding: **a fix sat on master for 17 days
while the bug it fixed was reported as a live incident.**

### Status of the fix branch

`PLT-3084-undo-ctrl-z-linking` remains valid and unmerged. D1 (cursor reset on every model load),
D2 (orphaned Link entries after `invalidateLinks`) and D3 (double cursor move in the no-callback
branch) are all still real on master and all still worth fixing — **D3 in particular is what turned
this bug from a visible console error into a silent purge.** But they are a separate piece of work
and must not be described as the fix for PLT-3084.
