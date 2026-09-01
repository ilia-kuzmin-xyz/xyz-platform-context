# PLT-3095 — recommended action (drafted, not sent)

**Proposed action:** comment on the ticket routing a specific, closed technical question to
whoever owns schedule ingestion (Sachin or Ali, api-v2 — `fn_GetScheduleRevision` is called from
`schedules.service.ts`, not attributed to v1 anywhere read this run). Keep status as-is (Open)
until that answer comes back; this isn't ready for "With Technical Support" because the ask is
internal (backend), not something the customer needs to do.

**Assumption this rests on:** the hypothesis in `context.md` (duplicate item ids collapsing one
Map entry) is inferred from code reading only, not confirmed against AUS02's actual data.

---

**Draft (to post as a comment, addressed to Sachin/Ali):**

> Hi — AUS02 is missing some WBS branches in the Web Viewer even though the customer confirms
> they're in the .XER with unique codes. Could one of you check whether AUS02's current schedule
> revision has any duplicate `ItemId` across WBS and activity rows? The frontend keys everything
> by that id in a plain map, so a duplicate would silently drop one row with no error anywhere.
>
> **Can you run that duplicate check on AUS02's latest schedule revision?**

