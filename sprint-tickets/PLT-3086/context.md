# PLT-3086 — System Edit/Move: impact modal for membership-ending actions

**Not this routine's code.** The work lives in **Rishi's** draft PR
[#2190](https://github.com/XYZReality/hc-frontend/pull/2190) (29 files, base
`task/PLT-3058-target-cx-data-model`). Nothing has been pushed to it by this routine, deliberately —
it is someone else's branch.

## 2026-09-09 — first local context file for this ticket

Created because the routine kept re-deriving the same three facts every run.

**State:** PR #2190 is **draft and has not moved since 2026-08-27**. Its base is
`task/PLT-3058-target-cx-data-model` (PR #2150), *not* `master`, so it is a stacked PR and #2150
has to land first. GitHub has been reporting it as blocked.

**Open question, unanswered since 2026-09-05:** the 09-05 run asked on the ticket whether #2190 is
ready to come out of draft or is waiting on something. **Rishi has not replied.** Do not re-ask —
one unanswered ping is enough; re-posting it every run is noise.

**Status churn:** moved Dev In Progress → Analysis In Progress on **2026-09-08 10:56:29 by Ilia's
account** (5 seconds after the same move on PLT-2999; the routine's token shares that account, so
human vs. run is indistinguishable). Moved back to **Dev In Progress** on 09-09 to match the fact
that a PR exists. **If it is in Analysis again next run, ask rather than move it.**

**Scope reminder from the ticket description** (Confluence + prototype are canonical, the
description defers to them): this ticket is the *membership-ending / "step gone"* case only. The
member-row → Remove-from-system door is the only membership-ending action with a live UI, and it is
the one #2190 wires. Cross-type + coarsen move doors, the batched bulk edit-session, the
element-removal door and the "step survives" variant are all explicitly **out of scope**
follow-ups, each with a cited source in the description.

**Blocks:** PLT-2989 (System Details — Activity Log) and PLT-2975 (Asset Details — Activity Log),
both still `Open`.
