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

---

## 2026-09-02 — SUPERSEDED by live-prod data. Do not post the draft above.

Live-prod check (`context.md` § 2026-09-01 root-cause) found **0 duplicate `ItemId`s** — this
draft's premise is falsified. Use the draft below instead, which merges that check with the
independent XER-collision finding (`context.md` § 2026-09-02 reconciliation). Both point at the
same importer path from different data, so this is now one merged recommendation, not two.

**Proposed action:** route the (now better-evidenced) importer defect to Sachin, and hand the
customer a workaround they can use today without waiting on a fix. Keep status Open.

### Draft comment (author: Ilia; @ Yash, @ Sachin) — (91 words)

> Found the cause. AUS02's schedule has two pairs of WBS branches whose P6 codes collide once
> combined with their parents — "Milestones" collides with a small Procurement branch, and "Core &
> Shell Construction" collides with another. On import, both sides of each pair go missing, not
> just one. 415+ activities sit in the two lost branches.
>
> @Yash — quick unblock, no release needed: in P6, rename the two Procurement children so their
> codes stop colliding, then re-export and re-upload.
>
> **@Sachin — can the importer key WBS nodes on `wbs_id` instead of the concatenated code?**

### If Sachin confirms the mechanism

Give him the exact node names, task counts and both artefacts (`.xer` file, schedule-revision API
dump) already in this folder — see `context.md` § 2026-09-02 for the one thing still worth him
checking himself (whether the 4 missing live `itemId`s are exactly the 4 collision participants).

**Status suggestion unchanged:** stays with us until Sachin confirms ownership; customer gets the
workaround now via Yash.

