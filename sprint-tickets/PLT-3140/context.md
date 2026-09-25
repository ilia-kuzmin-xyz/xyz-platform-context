# PLT-3140 — Delete Assets

**Priority:** Major · **Epic:** PLT-435 [WEB] Commissioning Web work Q3
**Reporter:** Darminder Atker · **Domain:** commissioning

---

## 2026-09-22 — first pick-up. Moved Open → Analysis In Progress

Whole description, verbatim: *"Need to add delete assets option"*. No attachments, no comments, no
linked design, no acceptance criteria. Posted a clarification (comment 112747) and transitioned to
**Analysis In Progress**. Did not implement.

### Why this is not a small ticket

An asset in the commissioning model is the hub of the readiness graph. Deleting one has to decide
what happens to, at minimum:

- **task instances** generated onto it from the type's readiness levels (`task_instance`),
- **recorded executions** against those instances — the actual signed work,
- **file associations** (`commissioning_file_association`),
- its **readiness state** and its place in the ladder,
- the **system tag / affects-system** links (see PLT-2972, same area).

This is the same question PLT-2999 answered for task templates, and it was not answered cheaply
there. The landing there was: **refuse the delete once work has been recorded, offer Archive
instead**; `task_instance.task_template_id` is `ON DELETE SET NULL` so already-generated tasks keep
their snapshotted name and version, while the type-link tables cascade.

**There is still an open thread from PLT-2999 with Darminder and Jason on the delete-cascade
semantics, plus an undocumented `asset_type_task` FK.** Whatever is decided for assets should be
consistent with that, so this ticket is genuinely downstream of an answer that is already pending —
starting it before that answer lands risks building the opposite policy.

### Other unknowns

- Where the action lives: asset list row ⋮ menu, asset detail page, or both.
- Single delete or multi-select / bulk.
- Permissions — is delete role-gated, and if so by which authority.
- Whether "delete" should actually be **archive** (as it became for tasks), which would change the
  ticket title.

**Confidence to implement: 3/10.** Direction uncertain until the cascade policy is decided.

### Open — needs a human

- **Darminder**: blocked-when-runs-exist (archive instead, like tasks) vs hard delete that takes the
  runs with it? Asked in comment 112747.
- Depends on the same PLT-2999 cascade answer already with Darminder / Jason.

## 2026-09-25 — both review threads closed (PR #2235)

**1. Activity-log failure was swallowed — fixed.** `useDeleteAssets` caught the
`ActivityLog.append` rejection with a bare `log.warn`, so a delete could land with no audit
row and the user saw the normal success toast. That matters here more than it looks: the
confirm dialog's own copy (`assetDelete.logNote`) **promises** "This deletion will be logged
against {{ by }} · {{ at }}".

Did *not* take copilot's suggested outbox/retry — there is nowhere durable to queue it
(the commissioning client talks straight to PostgREST, no queue behind it). Took the other
half of the suggestion: `mutationFn` now returns `{ logged }`, and an unlogged delete gets a
`severity: 'warning'` toast naming the gap. The delete still stands — it has already
happened and failing the mutation would report a success as a failure.

Note the divergent precedent on master: `membership-impact.ts:203` `await`s its
`activityLog.append` with **no** catch, so a log failure there fails the whole operation
*after* the writes landed. Neither extreme is obviously right; this PR sits between them.

**2. Client-side `PROJECT_EDIT` is not an authorization boundary — correct, not actionable
here.** Every commissioning table has a permissive anon policy (`using (true) with check
(true)`), project separation is client-side `project_id` filtering only, and the anon key
ships in the bundle by design (`commissioning/data-layer.md` § Security posture). So *every*
write in the feature is unprotected, not just delete, and there is no Supabase↔platform
identity bridge to hang a server-side check off. Fixing it per-endpoint would leave ~20 other
tables open while implying this one is safe. Replied and resolved as out of scope; the real
fix stays "tighten the policies or front it with api-v2 before real tenant data".

Also merged `origin/master` in (was 4 behind, no conflicts). Commit `120bbf6`.

## 2026-09-25 (second round) — three more from Copilot after the push

**Fixed — dialog had no accessible name.** `DeleteAssetsDialog` carried `role="dialog"` with
nothing naming it. The obvious fix does **not** work: `Modal` (`common/modal/modal.tsx`) takes a
`title` prop but only sets `aria-labelledby={titleId}` from a `useId` that **nothing ever
renders**, so passing `title` points the label at a non-existent element. Named with
`aria-label` instead.

> ⚠️ **That dangling `titleId` affects every dialog using `Modal`'s `title` prop**, not just
> this one. Not fixed here (out of scope), flagged on the PR. Worth its own ticket.

**Fixed — log level.** The missed activity-log write was `log.warn`. Once the toast told the
user the audit trail had a hole, it became an operational failure someone must act on, so it is
`log.error(message, cause)` now — note that signature takes a *cause*, not a data bag, so the
count moved into the message.

**Left OPEN deliberately — DELETE discards affected rows.** `CommissioningDataClient.remove()`
is `Promise<void>` and PostgREST answers a DELETE matching nothing with a success. So two people
deleting the same asset means the second gets a success toast and a **false `asset_deleted`
entry** for work they did not do — the wrong kind of bug in a PR whose point is an honest audit
trail.

Not fixed because the honest fix is `Prefer: return=representation` plus a return type on the
**shared** client's `remove`, which every commissioning service deletes through. Doing it for
this one call site creates a second delete path with different semantics. It also only narrows
the race rather than closing it. Put to the author on the PR as its-own-PR vs take-it-here;
**needs a decision.**

Commit `4774e0c`.
