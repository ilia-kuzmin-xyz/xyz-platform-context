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

## 2026-09-26 — scheduled run: master catch-up, no new review work

Checkpoint sweep only; no code change needed on this ticket.

- **Checkpoint 1 (feedback):** all review threads on this PR are resolved. Nothing outstanding.
- **Checkpoint 2 (build):** green on the previous head before the merge below.
- **Checkpoint 3 (master drift):** the branch was **4 commits behind** master
  (`e94611c` PLT-3141, `5bf2509` PLT-3142, `8bebb79` PLT-3127, `ff81032` PLT-3138).
  Merged `origin/master` in — **no conflicts** — and pushed. CI re-running on the new head.

Still in **In Code Review**; waiting on human reviewers, not on us.

### The one thread deliberately left open — position sharpened, not dropped

`asset-register-service.ts:356`: PostgREST answers a DELETE matching nothing with a success, so two
people deleting the same asset gives the second one a toast and a false `asset_deleted` activity
entry.

**Correcting my own 09-25 reply.** I said the blast radius was "every service that calls `remove`".
That is overstated *on the type side*: widening `CommissioningDataClient.remove()` from
`Promise<void>` to `Promise<T[]>` breaks none of the **29 call sites across 12 services** — they
simply keep ignoring the return.

What does stand is the **behaviour**: putting `Prefer: return=representation` on the shared client
makes every commissioning DELETE start returning a body, which is a runtime change across the whole
feature and not something to slip into an asset-delete ticket.

So the proposal now on the thread is opt-in rather than global:

```ts
remove<T = unknown>(table, filters, opts?: { returning?: boolean }): Promise<T[]>
```

— header only when asked for, other 28 call sites byte-identical. Small enough to sit in this PR.
Ceiling is unchanged either way: the read-back narrows the race, it cannot close it (someone can
still delete between the statement and the log write).

**Left open on purpose**, asked of @DarminderA / @rishib-xyz: take the opt-in version here, or raise
it across the client and its callers as its own PR. Not a blocker on the rest of the PR.

## 2026-09-27 — the last open thread closed: DELETE now reports what it removed

**PR #2235, head `4c8e96d`.** The one thread left open on this PR (the `Prefer:
return=representation` question, raised 25 Sep, escalated to Darminder/Rishi on 26 Sep) had gone
unanswered for ~2 days. Took the opt-in version rather than leave a known false audit entry in the
one change whose premise is an honest audit trail. Replied on the thread and resolved it, noting
it is one commit and trivial to revert if they would rather it were its own PR.

### The defect

PostgREST answers a DELETE that matches **nothing** with a success and an empty body, so it is
indistinguishable from one that removed everything asked for. `useDeleteAssets` wrote its
activity-log entry off the *selection*, so two people deleting the same asset gave the second one
a toast naming them and an `asset_deleted` entry for work they did not do.

### The shape of the fix (carry this forward — it generalises)

- `CommissioningDataClient.remove` is now
  `remove<T>(table, filters, options?: { returning?: boolean }): Promise<T[]>`.
  **Opt-in, deliberately.** Putting `Prefer: return=representation` on the shared client
  unconditionally would hand all ~25 DELETE call sites a response shape they have never had —
  a *runtime* change, not a type one. Without the flag the request goes out byte for byte as before.
- `AssetRegisterService.remove` returns the ids the database actually deleted; the mutation logs
  and toasts off those. Nothing deleted → no entry at all, and a new toast
  (`assetDelete.alreadyGone{One,Many}`) saying the assets had already gone.

### The trap that nearly turned CI red — worth knowing for ANY client-interface change

The 09-26 reply on the thread claimed widening `Promise<void>` → `Promise<T[]>` "breaks none of
the 29 call sites". That is true of **call** sites and false of **implementation** sites:
**8 test doubles declare `implements CommissioningDataClient`** with `async remove(): Promise<void>`,
and a void method does not satisfy the new signature, so `check-types` would have failed. They are
updated. **Corrected 546bc7d — `return []` was NOT enough:** see the amendment below.

Files: `commissioning-execution-service.test.ts`, `task-instance-file-service.test.ts`,
`reference-document-service.test.ts`, and the `*-wire-contract.test.ts` doubles for
checklist-instance, checklist-library, readiness-step, system-readiness and workflow.

### Not verified locally

**`npm ci` cannot complete in the scheduled-run container**: `@xyzreality/dhtmlx-gantt` comes from
`npm.pkg.github.com` and returns **401** without a token the environment does not carry. So no
`tsc --noEmit` and no vitest run this session — the push leans on CI. Any future run hitting the
same wall should expect this and say so rather than claim a green local suite.

### Known ceiling

The read-back narrows the race, it does not close it: someone can still delete between the
statement and the log write. "Log what the database said it deleted" is as honest as this gets
without a server-side transaction.

## 2026-09-27 (same run, later) — amendment: widening a client method needs the doubles to go GENERIC

The 4c8e96d entry above said the eight `implements CommissioningDataClient` doubles were fixed by
widening them from `Promise<void>` to `Promise<CommissioningRow[]>`. **That was wrong, and
check-types would still have failed.** Copilot caught it on the push (8 High findings, all
correct). Fixed in `546bc7d`.

**The actual rule — worth keeping, it is not obvious.** Making an interface method generic
(`remove<T = CommissioningRow>(...): Promise<T[]>`) means a *non-generic* implementation no longer
satisfies it, whatever concrete type it returns. Relating the signatures leaves `CommissioningRow[]`
checked against a **naked type parameter** `T`, and nothing except `never` is assignable to a naked
type parameter. So the double must itself be generic:

```ts
async remove<T = CommissioningRow>(table: string, filters: CommissioningFilter[]): Promise<T[]> {
  this.calls.push({ method: 'remove', table, filters })
  return []            // fine: never[] IS assignable to any T[]
}
```

The default (`= CommissioningRow`) does not rescue a non-generic implementation — defaults do not
participate in assignability.

**So the blast radius of "make a shared-client method generic" is three-layered**, and the first two
are easy to miss:
1. *call* sites — unaffected (they can keep ignoring the return);
2. *implementation* sites — every `implements CommissioningDataClient` double must become generic;
3. runtime — unchanged here only because the flag is opt-in.

### One review finding that was wrong, and why the spot still mattered

Copilot's ninth finding claimed the trailing comma after `adminsOnly` made `main.json` invalid
JSON. It does not — that property is followed by two more, so the comma is required, and `json.load`
parses the file clean. But it was pointing at a real defect two lines away: the two new
`assetDelete.alreadyGone*` strings went in at **6 spaces where the block uses 8**, because the
python anchor matched as a *substring* of the more-indented real line. Valid JSON, would have
failed `format:check`. Fixed in the same commit.

**Carry this forward:** when patching a file by string anchor, an under-indented anchor silently
matches the correctly-indented line and leaves the insertion misaligned. `assert count == 1` does
not catch it, because substring counting still finds exactly one. Anchor on the full line including
its leading whitespace.

### Outcome — `546bc7d` is green

`build`, `SonarCloud Code Analysis` and `copilot-pull-request-reviewer` all **success** on
`546bc7d`; Sonar's quality gate passed. All **16** review threads on #2235 are resolved. The PR
sits on current master with no conflicts, `mergeable_state: blocked` only because the four
requested human reviewers have not approved yet.

**One precision, so the record is honest:** the build on `4c8e96d` (the non-generic doubles) was
**cancelled**, not failed — the push of `546bc7d` superseded it. So nobody ever observed it go red.
The claim that it would have is reasoning (a concrete return type checked against a naked type
parameter) corroborated by the review's eight independent findings, not an observed CI failure.
What IS observed is that the generic version passes.

## 2026-09-28 — scheduled run: checkpoint sweep, nothing to do

PR **#2235**, head `546bc7d`.

- **Checkpoint 1 (feedback):** every review thread resolved. Nothing outstanding.
- **Checkpoint 2 (build):** `Build & Test - frontend service [PR Check]` **success** on the
  current head.
- **Checkpoint 3 (master drift):** none. `origin/master` is still `ff81032` (PLT-3138), the
  same commit this branch was brought up to on 09-26 — master has not moved in two days, so no
  merge was needed.

Still **In Code Review**, `mergeable_state: blocked` purely on the four requested human
reviewers. Waiting on people, not on us — no push can clear it.

## 2026-09-28 — a master merge broke the branch; two stale assertions, fixed in `d31a058`

Someone merged master into the PR branch (`70b087d`), bringing in #2240/#2244/#2246. The merge left
`assets-panel.test.tsx` referencing **`mockSetAssetDetailId`**, which nothing declares — the
selection store was renamed to `setLastSelectedEntity` upstream, the mock at the top of the file
was renamed with it, and two assertions (lines 228 and 276) were not. An undeclared identifier, so
the module does not compile and neither test can run. Copilot caught it; correct finding.

- **228** — `not.toHaveBeenCalled()`, meaning unchanged (ctrl-click must not open the detail), so a
  straight rename.
- **276** — now asserts the entity payload the setter actually receives,
  `{ type: 'asset', logId: 'a2' }`, matching the assertions ~10 lines below, not the bare id of the
  old API.

**Swept for the rest of the same half-finished rename** rather than fixing only the two flagged
lines: the other `assetDetailId` names in `assets-panel.tsx` are a local derived from
`lastSelectedEntity` (the merge's own correct adaptation), and `systemDetailId` is gone from the
branch. Those two were the only leftovers.

**Also re-verified this PR's own change against the merged tree:** all **ten**
`implements CommissioningDataClient` doubles are generic, so the opt-in `remove()` signature still
holds after master came in. Worth repeating on any future master merge — a newly-landed service
double with a non-generic `remove` is the thing that would silently break it.

`d31a058` is green (build, Sonar gate, Copilot reviewer). PR remains `blocked` only on the four
requested human reviewers.

### Pattern worth noting for the next run

This is the second time on this PR that the *type-check* was the failing gate and the defect was
invisible to a reading of the diff hunk alone (the first was the non-generic doubles; see the
09-27 amendment). Both were caught by review rather than by a local run, because `npm ci` cannot
complete in this container (private `@xyzreality/dhtmlx-gantt`, 401). Until that token exists,
assume type-level breakage is the most likely way a push here goes red, and re-read renames and
interface changes across *implementation* sites specifically.

## 2026-09-29 — two Medium review findings; one real bug, one split. `07ad926` green

Another master merge landed on the branch (`a53f230`) — this one clean. Copilot then raised two
Medium findings on the merged head. Both were verified against the source before acting.

### 1. The admins-only gate could not tell "no" from "not yet" — REAL, fixed

`projectAuthoritiesQueryConfig` (`hooks/useProjectAuthorities.ts`) sets **`placeholderData: []`**,
and `selectHasProjectAuthorities` maps that to `[false]`. So while the request is in flight,
`canDelete === false` is indistinguishable from a genuine refusal, and an admin clicking **Remove**
on a cold load was shown *"Only admins can delete assets"* — a refusal a user would reasonably
believe and stop at. The gate is code this ticket added, so the bug is this PR's.

Fix: read the query directly (`useProjectAuthorities` + the exported selector) instead of
`useHasProjectAuthorities`, because that helper discards `isPlaceholderData` — the one bit saying
whether the answer is known. A click before it resolves now does nothing rather than refusing.

**Deliberately did NOT disable the button**, which is what the finding asked for: **six** suites mock
`useAssetDeletion` as `{ request, dialog }`, so a `disabled` driven off a new return field arrives
`undefined`, disables the control in all of them and breaks every test that clicks Delete. Said so
on the thread and offered it as a follow-up. *Generalise this:* adding a field to a widely-mocked
hook's return is not free — check the mocks before wiring it into rendering.

### 2. Multi-select accessibility — split; perceivability done, semantics left open

The selection was only `data-in-selection`, invisible to assistive tech, so a screen-reader user
could not tell which cards *Delete N* was about to take. Now carried in the accessible name
(`View details for X, selected`).

**Why not `aria-selected`:** the card is `role='listitem'`, and `aria-selected` is only valid on
option/row/tab/gridcell/treeitem. Setting it on a listitem is ignored by AT while *looking* handled
— worse than not doing it.

The full ask (container → `role='listbox' aria-multiselectable`, cards → `role='option'`, plus a
keyboard path for building a selection) was **not** done and the thread was **left unresolved on
purpose**. It is a shared-component change carrying a real design question: this panel has two
distinct states — the open card (`aria-current`) and the delete selection — and listbox semantics
model only one cleanly. Worth its own ticket.

`07ad926` is green (build, Sonar gate, reviewer). **One open thread by design** (the a11y keyboard
half); everything else on #2235 is resolved.

## 2026-09-29 — scheduled run: master catch-up, nothing else outstanding

PR **#2235**, head `a53f2309`.

- **Checkpoint 1 (feedback):** **17 threads, 0 unresolved.** Verified this run.
- **Checkpoint 2 (build):** green before and after the merge (build, SonarCloud, Copilot all
  success on the new head).
- **Checkpoint 3 (master drift):** was **1 behind** (`a4f6044`). Merged in — no conflicts — and
  pushed.

Merge **verified locally before pushing** this time: full suite green (474 files / 5824 tests)
plus `tsc --noEmit`. This is the branch whose 09-28 entry ends "assume type-level breakage is the
most likely way a push here goes red, *until that token exists*" — the token still does not exist,
but the constraint is gone: see PLT-3139's 09-29 entry for the stub that makes the suite runnable.

Still `blocked` purely on the four requested human reviewers. Nothing here is waiting on us.
