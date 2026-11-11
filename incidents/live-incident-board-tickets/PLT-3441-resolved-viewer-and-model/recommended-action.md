# PLT-3441 — recommended action (drafted, NOT executed)

## 2026-11-10 — supersedes the 11-09 drafts. Do not post those.

**Class 1 (Rishi owes a reply to Darminder), class 3 shape on the overshoot.** Nothing owed by Ilia in Jira. Ticket is In Code Review behind PR #2466; Rishi already found the cause (child-node geometry, `recursive` false to true), so the question to Rishi about `getAggregateSelection()` is void.

Assumption, one line: that the overshoot Darminder saw comes from including descendants is inferred from the diff, not observed.

**Optional, only if Ilia reviews #2466 (31 words):**

On a single selected element the box should stop at that element. **Is the box still too big when you select a leaf node of that same family, rather than the group?**

(31 words, one question)

**Transition:** none. Stays In Code Review until Darminder's change request is cleared. After the merge, Yash should ask the customer to retest on the ELN04 East model once released.

## 2026-11-11: optional pointer to Rishi (GitHub PR review thread, not Jira); supersedes nothing posted. Class 1 (Rishi).
Assumption, one line: the mechanism is a code read, never observed.

### Draft to Rishi on PR #2466 (author Ilia) (51 words)

> Rishi, on Darminder's drag-select finding: the box filter in selection-service only drops an element when its whole world bounding box is past one plane, so with a tight rotated box neighbours whose bounds cross it still pass. **Does the same drag over-select on master with a box of the same size?**

No Jira or GitHub action was taken.
