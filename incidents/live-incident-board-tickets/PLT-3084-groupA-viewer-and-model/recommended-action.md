# PLT-3084 — recommended action

## 2026-08-24 — answer Yash's question, ask for the one thing the video would settle

**Category:** technical debt, resolvable in a session. The mechanism is found and a fix branch
exists; what is missing is confirmation that it is the customer's mechanism.

**Proposed action:** comment on the ticket answering Yash's question directly, and ask him the one
question that discriminates. Keep it in Analysis; do not move to Ready for Dev until the video
question is answered, because the fix is right either way but the *scope* of the answer to the
customer depends on it.

### Draft comment (NOT posted)

> Yes, linking is meant to be undoable — the linking service registers undo and redo with the
> viewer's history and pushes an entry after every link and unlink, so this is a defect rather than
> a missing feature.
>
> I found three ways the undo entry gets dropped. The one I think you hit: the viewer clears part
> of its history every time a model finishes loading or closing, and that clear resets the undo
> cursor to the end of the list even when it removes nothing. So opening a model after linking
> leaves Ctrl+Z pointing at the wrong place, and Ctrl+Shift+Z stops working entirely. The second is
> that a failed link, or a schedule save, empties the linking service's own undo stack while
> leaving the matching entry in the shared history, so the next Ctrl+Z pops an empty stack and
> silently does nothing. Both are fixed on a branch, not yet raised as a PR.
>
> One thing worth flagging for the customer either way: selection sits on the same undo stack as
> linking. If they click anything in the model after linking, including using select linked
> elements to check it worked, the first Ctrl+Z undoes that selection rather than the link. That
> part is working as designed.
>
> Could you tell me whether a model finished loading, or a schedule was saved, between linking and
> pressing Ctrl+Z in your recording? That decides which of the two defects the customer is seeing.

### If it needs a nudge to the right person instead

Nothing to escalate. This is ours, the analysis is done, and the branch is the deliverable.

### What Ilia can check in the browser, if a build is available

Open the viewer with the console open, filter on `LinkingService`, then:

1. Select elements, link them to an activity, press Ctrl+Z. Expect the link to revert.
2. Repeat, but open another model after linking and before Ctrl+Z. **On master, expect Ctrl+Z to
   do nothing useful and Ctrl+Shift+Z to be dead.** That is D1.
3. Repeat, but save a schedule edit after linking and before Ctrl+Z. On the branch the console
   prints `Undo requested for a link action that is no longer on the stack`. On master it is
   silent. That is D2.

Step 2 on master is the cheapest confirmation of the whole diagnosis and needs no branch build.

## 2026-08-24 (third pass) — corrected repro steps

**Supersedes the "What Ilia can check in the browser" section above**, which asked for a model to be
opened "after linking and before Ctrl+Z" without saying you need a model open to link in the first
place, and which relied on judging whether a link had reverted.

Use the protocol in `context.md` § "2026-08-24 (third pass)". Two things changed:

- **The trigger is the model tree checkbox** (`use-node-actions.tsx:45-65`) — ticking any model on
  or off fires `_clearHistory()`. Those are the only two call sites in the codebase, so no other
  repro path exists.
- **The oracle is the Edit menu, not the keyboard.** Undo and Redo are disabled straight off
  `historyService.canUndo()`/`canRedo()` (`menu-button.tsx:257,263,275,281`) and re-render on every
  history change. **Redo greying out after a model toggle is D1, visible, with no console and no
  judgement call.**

Nothing about the draft Jira comment changes — it does not describe the repro steps.

## 2026-08-24 (RESOLVED) — supersedes every draft above

Root cause proven live on prod: the `HistoryType.Link` undo/redo callbacks are not registered,
because the deployed build predates **PR #2081 / commit `4ad83a7` (PLT-2743), merged 2026-08-07**,
which added the registration that had been lost when the V1 linking wrapper was deleted
(`3dd76091c`, PLT-2610/2611). Full evidence in `context.md`.

**Do not post the earlier drafts.** They ask about model loading and schedule saves, none of which
is relevant.

### Category

Not "technical debt resolvable in a session" as first classified. It is a **release/deploy gap**:
the fix has been on master for 17 days. Reclassify as such on the board.

### Draft comment (NOT posted)

> Found it, and there is nothing to build. The undo handler for element-to-activity linking is not
> registered on the deployed build, so every link entry goes into the viewer's history with nothing
> able to service it, and the first Ctrl+Z quietly discards them all. That is why it fails every
> time regardless of project or model size, and why it works on dev.
>
> The registration was lost when the old V1 linking wrapper was deleted, and was restored on master
> on 7 August in PR #2081. Prod is running something older than that. Confirmed on the live site by
> reading the history service directly and by re-attaching the handler by hand, after which undo
> worked immediately.
>
> So the fix is to ship a build containing #2081. The thing worth a wider look is how a release cut
> on the 21st does not contain a commit merged on the 7th.

### Second action, separate ticket

Raise the release-process question with Darminder: a fix merged 08-07 was absent from a release cut
08-21, and the incident it fixes was reported 08-24. That is the finding with the longest tail.

### Third action, keep the branch

`PLT-3084-undo-ctrl-z-linking` still fixes three genuine defects (D1, D2, D3). **D3 is why this
incident was silent rather than loud** — the no-callback branch purges the entries and moves the
cursor twice, so the user sees nothing at all. Worth landing on its own merits, described as
hardening rather than as the fix for this ticket.

## 2026-08-26 — left scope, no further action from this routine

Status moved In Analysis → Ready For QA. Consistent with the 08-24 RESOLVED finding (ship a build
containing PR #2081); the fix is presumably now in the release pipeline behind QA rather than
requiring new code. Nothing further to draft — see `context.md` 2026-08-26 for the scope note.

## 2026-09-04 — REOPENED, class 3: repro steps for Ilia, no draft to Radu yet

**Category:** class 3 — the fix (if any) is within reach but must be seen in the app first. Do not
draft a Jira reply yet; a reply now would either restate the obvious (asking to see the video, which
Radu already offered) or guess at a fix for a two-step flow that may be working as designed.

**What would resolve it without the video** (three-step repro, no build needed beyond current
master or whatever environment QA used):

1. Open the activity-linking-list panel for any activity with several linked elements. Open the
   panel's `...` menu and click **"Select all"**. Watch the 3D view. Predicted: nothing changes
   there; only the tree rows show as checked.
2. From that state, open the menu again and click **"Show selected in 3D view"**. Predicted: this
   is the step that actually selects elements in the model.
3. If step 1 alone was expected (by Radu, or by the customer in the video) to select in 3D, this is
   a naming/UX gap, not a functional regression — the fix is either renaming "Select all" to
   something like "Check all" to stop implying a 3D effect, or folding "Show selected in 3D view"
   into it as one click. **If step 1 already does nothing at all — no tree rows check, an error, or
   the app doesn't update the checked count — this is a different, real regression** and the
   hypothesis in `context.md` is wrong; stop and re-investigate rather than proposing the rename.

**If it needs a nudge to the right person instead:** none yet. Watching the video (or running the
3-step repro above once) is the only thing that unblocks this, and it needs Ilia's own eyes on the
running app per this routine's hard rule against unverified visual claims.

**No draft to Radu.** Nothing to tell QA yet that isn't already implied by "we're looking into it" —
premature until one of the two branches above is confirmed.

## 2026-09-04 (later) — class **2** delivered: draft PR #2197. Supersedes "class 3, no draft" above for what to do next.

The entry above is not withdrawn — its 3-step repro is still the right thing to run, and its
"stop and re-investigate" branch is still the right instinct. But its premise was that no fix was
within reach without seeing the app. That premise was wrong: **three code defects were found by
reading current master and the pinned react-arborist source, and they are fixed and tested.** Full
mechanism in `context.md` § 2026-09-04 (later).

So the class moves 3 → 2 for the code, while staying 3 for *confirming this is what Radu saw*.

**Prediction change, and it matters for step 1 of the repro above.** That entry predicts step 1
leaves the 3D view unchanged but *"only the tree rows show as checked"*. Two corrections:

- On a **freshly opened panel**, a **row right-click → "Select all"** does nothing at all — that is
  defect 1 (the panel handed the hook a null tree ref), and it is the branch the entry above calls
  *"a different, real regression"*. It is real, and it is now fixed.
- The `...` menu's "Select all" only checks rows that are **open**. With everything expanded
  (the default) it looks complete; after "Collapse all" it silently misses collapsed children.

**Revised repro, for whoever has the app** — same three steps, plus:

0. Open the panel **fresh** (select an activity for the first time), right-click a row, choose
   "Select all". If nothing highlights in the model, defect 1 is confirmed. Then change the search
   box or the sort order and try again — if it now works, that is conclusive.

**No draft to Radu, and no draft to anyone.** Still nothing to say that a merged fix will not say
better, and the routine's no-Jira-comment rule stands regardless. The ticket was moved to
**In Code Review** (see the run log for why that transition was authorised and why comments were not).

**What a reviewer of #2197 should push back on, if anything:** "Select all" now expands the tree,
which the user did not ask for. The alternative leaves `unlinkSelected` broken after a collapse,
because react-arborist cannot hold a selection of collapsed rows — the trade-off is argued in the
PR body. And defect 4 (stale selection across an activity switch) has no unit test; it needs the
panel rendered with its providers, which no spec in that directory does.
