# PLT-3096 — recommended action (drafted, not sent)

**Proposed action:** comment on the ticket (addressed to Darminder, already assignee) with the one
diagnostic check that would confirm or kill the hypothesis, and move the ticket to **Ready to
Dev** — it's already reproduced twice (customer + Yash himself) and doesn't need any further
customer clarification; what's missing is just the id-collision check, which Darminder can run
directly.

**Assumption this rests on:** the duplicate-id hypothesis in `context.md` is inferred from reading
`schedule-entity.ts` and the `gantt-x` event wiring, not confirmed against ATL05's actual data —
say this if posting, don't drop the caveat.

---

**Draft (to post as a comment, addressed to Darminder):**

> Hi Darminder — couldn't find any code in the gantt-x tree that would explain this (no custom
> open/close handler exists; it's all native dhtmlx). My best guess is two WBS rows in ATL05's
> schedule sharing the same item id, so dhtmlx ends up tracking one open/closed state for both —
> collapsing the second one would then look like it reopened the first.
>
> **Can you check ATL05's schedule data for duplicate ids before digging into dhtmlx itself?**

