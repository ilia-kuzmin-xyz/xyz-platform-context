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

## 2026-09-15 — #2190 left draft overnight, and grew a lot

**Not my PR** (Rishi's, `rishib-xyz`), but it delivers PLT-3086, so it is watched rather than worked.
Head `f5f8712`, **out of draft**, CI **green** (build 07:22:39→07:41:24, Sonar ✅, Copilot ✅).

Yesterday it had 2 unresolved findings dating from 08-27. It now has **19**, nearly all posted
06:50–07:26 today, **none replied to**. The PR grew well past the original impact modal: rejoin /
restore flows, an asset activity log, task dispositions (park / discard / archive).

> **Green CI does not clear any of these.** Every one is a logic finding — orderings, races, a
> membership-ending path that skips the new modal entirely. The build passing says the code compiles
> and the existing tests pass, which is not the question these raise.

The four worth a human's attention first, in severity order:

1. **`system-asset-list.tsx:96` — a fail-open.** The task query defaults to `[]` while loading and is
   excluded from `isLoading`, so Remove can run against an incomplete task list, conclude nothing is
   affected, and end the membership **without ever showing the impact modal**. Same shape as the
   family fixed all through #2203 yesterday: a decision taken over the wrong set.
2. **`use-membership-impact.ts:69` — a door outside the modal.** `AssetSystemsSection` still calls
   `useEndSystemMembership` directly, so removing a direct membership from the asset panel bypasses
   the disposition, the activity log and the completed-work protection this whole PR exists to add.
3. **`membership-impact.ts:119`** — `isInstanceComplete` means "readiness-acceptable", not "the
   execution can be deleted". A **failed** functional test reads incomplete here but its execution is
   closed, and `remove` refuses instances with completed runs — so Discard on a failed test throws
   mid-disposition rather than applying it.
4. **`use-membership-impact.ts:46` / `:74`** — the disposition and the membership end are two writes
   with no atomicity, and the membership check is separate from the commit, so two clients can both
   archive and log the same tasks before either is refused.

**One finding checked and NOT repeated:** `r4012923864` claims the unused `NO_PRIOR_WORK` constant
fails `tsc --noEmit --noUnusedLocals`. The build on this exact head ran *after* that comment and
passed, so it is either already fixed or wrong. Same genre as yesterday's react-jhipster
"can fail the type check" claim, which the build had likewise already disproved.

> **Bot findings assert compile-time facts with the same confidence as logic facts, and the
> compile-time ones are cheap to check against a build that has already run. Check them.**

**Action taken: none on the PR.** It is not mine and I was not asked to drive it — so this goes to
Ilia, not into Rishi's review threads.
