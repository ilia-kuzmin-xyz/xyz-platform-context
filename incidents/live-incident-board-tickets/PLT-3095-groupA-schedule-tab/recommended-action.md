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


---

# 2026-09-03 (later) — the draft to Sachin. The earlier one is WITHDRAWN, its ids are stale.

The 09-03 draft gave `9f13d821` and four ids from it. **That revision was deleted on 09-02 13:04**, so
those ids resolve to nothing — which is exactly the `count(*) = 0` Sachin reported back. Do not send it.

## Draft to Sachin — 79 words, UNPOSTED

> My ids were from revisions you've since deleted — that's why your count came back 0, not because the
> rows are missing. Sorry.
>
> The active revision `d505f075` is broken the same way. Four WBS parents referenced by children but
> never returned:
>
> ```
> 78a3bf1a-3591-4935-b7ee-9b00a58d7098    (2 WBS children)
> 94cce902-c576-4149-a03b-5b0f2fbf8a61    (4 — this is Core & Shell's branch)
> a673c5f2-f51f-4dbd-a7aa-cd5218b12ab5    (10)
> 49d1ce1e-3acc-4124-b1ef-d3778dadcb85    (11)
> ```
>
> Sequence the viewer uses: `GET /schedules` → pick `isCurrent` → `GET
> /schedules/{id}?deviceType=WEB`. That's all, no unfiltered variant.
>
> Your 232 matches what the API returns, so nothing's being filtered. Could you check those four ids
> in `ScheduleWbs` with no filters at all?

Owns the stale-id mistake in the first line, because he spent a query on it and will otherwise assume
the rows are fine. Answers his question exactly. Ends on the one query that separates "never written"
from "written and flagged".

## Optional additions — only if he asks, they are not needed to unblock him

- **`GET /schedules/{id}` does not filter deleted revisions**, while `GET /schedules` does. Proven at
  11:20 today: 1,818 rows returned for `9f13d821`, deleted since 09-02 13:04. Harmless for the viewer
  (it only requests the id the list handed it) but it is what made his count-0 confusing, and it is a
  small real inconsistency worth a ticket of its own.
- **A fresh re-upload reproduced the defect exactly** (new GUIDs, identical child-count fingerprint
  2/4/10/11, identical 638 unreachable). Stronger evidence than the two-revision determinism we had.

## If his query confirms the rows do not exist

Then this is an **importer defect**, not an API one, and the owner changes. The importer wrote child
WBS rows whose parent it never wrote — and it did so again on a brand-new upload yesterday. Two things
worth raising then:

1. **A ticket against schedule ingest**, not api-v2. It will recur on any schedule with whatever shape
   AUS02 has at those four positions (all four are mid-tree WBS nodes, 2-11 WBS children each, none a
   root).
2. **The importer should not publish a revision whose parent references do not resolve.** 35 % of this
   schedule has been invisible since 08-31 and every surface downstream trusted the payload. A
   referential check at ingest would have failed the upload instead of shipping a third of it dark.

**Still unanswered from 09-02:** Yash asked whether he should change boards and flagged it urgent on
the user end.
