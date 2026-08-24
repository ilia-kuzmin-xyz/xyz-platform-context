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
