# PLT-3441 — recommended action (drafted, NOT executed)

**Class 1 (stale, unresponded, Rishi owes), class 3 shape.** Nothing owed by Ilia; optional pointer only.

Assumption, one line: H1 (selected node is a parent with no own geometry, so the box is empty) is inferred from code, never observed. Do not post it as a cause.

**Optional comment to Rishi (62 words):**

Rishi, one cheap check on this before anything else. On the East model, when the tool fails, run `viewer.getAggregateSelection()` and tell me whether the selected ids are parent nodes with no geometry of their own. The box helper only counts a node's own fragments, so a parent would give an empty box. **Is the selection on a failing click a parent node?**

(62 words)

**Ask for Yash (20 words), only if Rishi cannot reproduce:**

Yash, the recording is dated 6 October. **Which Editor version was the customer on when they made it?**

(20 words, one question)

**Transition:** none. Stays Open with Rishi; moves to Ready for Dev only once a failing selection is observed.
