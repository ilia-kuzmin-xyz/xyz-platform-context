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
