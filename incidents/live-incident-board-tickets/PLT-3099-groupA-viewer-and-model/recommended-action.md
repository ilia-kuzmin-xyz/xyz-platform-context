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


---

## 2026-09-02 — revised. Two of the four questions are now answered; the draft changes accordingly.

Supersedes the draft above. That draft asked Yash to find out whether the customer clicked anything
between linking and pressing Ctrl+Z, in order to separate a real undo bug from the by-design
selection-sharing behaviour. **That question is now moot:** PLT-2743's fix is in `master` but its
release (**26.3.6**) has never shipped, so linking-undo is non-functional for everyone on prod. Do
not ask it.

Also do not run the `linkingService.constructor.toString()` console check — the Jira release state
answers it.

### Draft comment — to Yash Patel, on PLT-3099 — DRAFT ONLY, not posted (98 words)

> @Yash Patel traced it on prod. Nothing extra was linked. 1,239 elements were **moved** off activity
> **CY-1250** onto CY-1300, in one action at 16:55 UK on 1 September. An element holds only one
> activity link, so linking one that already belongs elsewhere moves it, silently.
>
> So there is a second problem they have not seen: **CY-1250 lost 1,239 links.**
>
> On Ctrl+Z: that is the AT10X issue, fixed under PLT-2743 but waiting on the 26.3.6 release.
>
> Fully reversible, I have the exact 1,239 ids.
>
> **Can they confirm CY-1250 should get all 1,239 back?**

### Why that question, and why not simply restore

Some of the 1,239 may genuinely belong on CY-1300 — the customer *was* trying to link something.
Restoring all 1,239 to CY-1250 would undo their intended work along with the accident. Asking is
cheaper than doing it twice.

### Before it goes out

- **Line up who performs the restore.** It needs a platform-api write, so Sachin or Ali. Do not tell
  the customer it is reversible without knowing who will do it.
- **Do not mention PLT-3100 or the missing-confirmation defect.** That is our engineering problem,
  not part of a reply about their data.
- **Consider whether to volunteer the 26.3.6 delay.** Naming PLT-2743 is honest and shows the undo
  failure is known, but it also tells the customer a fix has been sitting unreleased for over a week.
  Ilia's call.


---

## 2026-09-02 (later) — ⛔ the draft above is WITHDRAWN. Do not post it.

It states that 1,239 elements were moved off `CY-1250` and asks the customer to confirm `CY-1250`
should get them back. **Both are false** — see the retraction in `context.md`. `CY-1250` never lost
anything; the 1,239 were *added* to `CY-1300`.

### Corrected draft — to Yash Patel, on PLT-3099 — DRAFT ONLY, not posted (92 words)

> @Yash Patel traced it on prod. One action created **1,239** links on CY-1300 at 16:55 UK on
> 1 September, which matches what they described. Their own activities were not affected, nothing was
> removed from anywhere, so the only thing wrong is the 1,239 extra links on CY-1300.
>
> On Ctrl+Z: that is the AT10X issue, fixed under PLT-2743 and waiting on the 26.3.6 release.
>
> We can remove those 1,239 links and put CY-1300 back to what it was.
>
> **Shall we go ahead and remove them?**

### Why this version is better than the withdrawn one

- It does not invent a second problem for the customer to worry about.
- The question is answerable yes/no, rather than asking them to arbitrate which of 1,239 elements
  belonged where.
- The remediation is one operation on one activity, with no restoration step.

### Still true before it goes out

- **Line up who performs the removal.** It needs a platform-api write, so Sachin or Ali. Do not
  promise it without knowing who executes.
- **Do not mention PLT-3100.** That is our engineering problem.
- **Naming PLT-2743 / 26.3.6 is Ilia's call** — honest, but it tells the customer a fix has sat
  unreleased for over a week.
