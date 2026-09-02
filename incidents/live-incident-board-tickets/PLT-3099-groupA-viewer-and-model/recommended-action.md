# PLT-3099 — recommended action (drafted, not sent)

**Action class: 3 — resolvable in-session, needs Ilia's own visual/console check first.** The
leading hypothesis for the "Ctrl+Z didn't work" half is the exact mechanism already root-caused on
PLT-3084 (AT10X, closed 08-26): a deployed build missing the linking-undo registration. That is
settled by one console line against ATL08 directly, the same way PLT-3084 was settled, with no
code change and no customer input needed:

```js
window.projectService.linkingService.constructor.toString()
```

(enable `window.projectService` via the `feature-flags` cookie, appended not replaced, per
PLT-3084's notes). An empty constructor rules the same defect back in; a constructor that already
registers the link undo/redo callbacks rules it out and points at the still-open D1/D2 candidates
or the by-design selection-sharing behaviour, all described in `context.md`.

**Assumption this rests on:** that ATL08's symptom is the same mechanism as AT10X's. Not confirmed
— both produce "linked fine, Ctrl+Z did nothing," but that is also what selection sharing the same
undo stack looks like from the outside.

**Second, separate action:** the "linked all elements in the area" half isn't explained by
PLT-3084 at all and needs its own check once the model can be opened against ATL08's data — see
`context.md`'s selection-expansion hypothesis. Not ready to draft anything customer-facing on that
half yet.

**Proposed action if a human is available to send something now:** a short reply to Yash asking
the one detail that helps regardless of which hypothesis is right.

---

**Draft (to post as a comment, addressed to Yash):**

> Could you ask the customer one thing: after the link happened, did they click on anything else in
> the model, even just to look at the result, before pressing Ctrl+Z, or did they press it right
> away? That tells us whether the undo failure is a real bug or the viewer correctly undoing
> something else instead.
>
> **Did the customer click anything in the model between linking and pressing Ctrl+Z?**

(67 words)
