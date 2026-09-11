# PLT-2968 — Asset details, readiness tag **override** context menu

**Type:** Task (Critical) · **Domain:** Commissioning / viewer Assets panel
**Jira:** https://xyzreality.atlassian.net/browse/PLT-2968 · **Sibling:** PLT-2967 (same kebab menu)

**Status after 2026-08-24 run: `Analysis In Progress`. Genuinely not built. No branch, no PR.**

---

## 2026-08-24 — real work, but blocked on three decisions

### Where it goes

`assets-panel/readiness-ladder.tsx`. The kebab (`:178`) and its `StyledMenu` (`:242`) already
exist with one item, `View tasks`. **Adding a second menu item is trivial. Everything behind it
is not.**

### Blocker 1 — no override exists in the model

Grepped the app: nothing readiness-shaped uses "override" (only test-fixture `overrides` params).
The commissioning table census in `commissioning/data-layer.md` (verified 12 Aug 2026, 14 tables
on both `dev` and `stable`) has **no override table and no override column**:

`asset`, `asset_type`, `asset_element_link`, `task_template`, `task_item`, `task_instance`,
`task_instance_item`, `task_folder`, `tag`, `workflow`, `workflow_tag`, `workflow_tag_task`,
`readiness_task_link`, `element_task_status`.

So persistence is undecided: a new `readiness_override` table (asset × workflow step + who/when/
why), columns on an existing row, or client-only for the MVP — which carries the standing
commissioning caveat that it is per-browser and invisible to teammates.

### Blocker 2 — an override changes the readiness cascade, and that reaches far

`use-readiness-steps.ts:52-56` derives everything from task instances alone:

```
achieved  ⇔  the step has ≥1 instance AND every instance is complete
active    =  the FIRST non-achieved step
locked    =  neither achieved nor active
```

The moment a tag can be achieved by fiat, that rule changes — and the same rule (or a copy) drives:

- the tag chip on the asset list and asset cards — `use-asset-current-tag.ts`
- the "Affects Systems" step rows on the detail panel (the reason `use-readiness-steps` was
  extracted in the first place — see its docblock: two copies of the rule would drift)
- the viewer's readiness colouring and legend — PLT-2990 / PLT-2991 (PR #2170)
- whatever the Commissioning dashboard counts as complete

If an override is meant to be **cosmetic only**, that has to be said explicitly, because
"the tag status should update with override" reads as "counts as achieved".

### Blocker 3 — the modal's fields are unknown

The three screenshots don't come through the Jira API and
`Commissioning Platform (standalone).html` is 403 to `WebFetch` and rejected by the `Artifact`
tool. "Complete details" could be a reason, free text, evidence, a signatory, an explicit date.

### Questions posted on the ticket

1. Does an overridden tag count as **achieved** (unlocking the next tag, changing chip/colour) or
   is it annotation only?
2. What fields, and which are mandatory?
3. Persistence — BE/Supabase ticket needed, or client-only MVP?
4. Can it be revoked? What if the underlying tasks later complete or re-open?
5. Permission-gated, or any project member?

1–3 unblock implementation.

### Next run

Once answered, the build order is: extend the ladder's `StyledMenu` → override modal → thread the
override into `use-readiness-steps` so `achievedOf()` consults it → then check every consumer in
Blocker 2. Do **not** patch `achieved` in the ladder component only; the rule was deliberately
centralised in the hook.

---

## 2026-08-25 — second run: still blocked, no new information

Re-checked at the start of the scheduled run. **No answer posted; the 08-24 analysis stands.**

- Ticket is still `Analysis In Progress`; the only comment is our own 08-24 clarification.
- **Did not re-comment** — re-asking the same questions would only bury the original ask.
- **The design screenshots are unreachable from this environment, confirmed twice.** Jira's
  `/rest/api/3/attachment/content/<id>` is **403** without a bearer token and the MCP `fetch` tool
  takes an ARI, not a URL. The `claude.ai/design/p/...` share link is equally closed. Don't retry.
- Blockers 1 and 2 (no override anywhere in the data model; the readiness cascade in
  `use-readiness-steps.ts:52` reaches the asset chip, Affects Systems, the viewer legend and the
  dashboard) are **design/persistence decisions, not research gaps**. More code reading will not
  resolve them, which is why this run did not attempt it.

This one is the riskier of the pair — it is `Critical` priority but needs a persistence decision
and touches the readiness cascade app-wide. Worth raising verbally rather than waiting on Jira.

### 2026-08-25 — verified the 08-24 claims independently, and one of them was too optimistic

Re-read the code rather than trusting the previous run's summary. Three corrections/refinements
that change the blast radius, all confirmed by grep on `PLT-2953` (post-merge with master):

1. **The achieved rule is duplicated across two hooks, not centralised.**
   `use-readiness-steps.ts:53-56` computes `achievedOf` (`list.length > 0 && list.every(isInstanceComplete)`),
   and its own doc comment (`:32-35`) says it was extracted precisely so that "two copies of the
   achieved/locked rule would [not] drift". But `use-asset-current-tag.ts:120` still has its own
   independent copy — `statuses.every(entry => isInstanceComplete(entry.status, entry.type))`.
   So an override has to be threaded into **both**, or the ladder and the asset card/viewer colour
   will disagree about the same asset. The 08-24 note's "the rule was deliberately centralised in
   the hook" is only half true — believe the grep, not the comment.

2. **Two different hooks are both called `useReadinessSteps`.** `app/hooks/useReadinessSteps.ts:23`
   takes `(projectId)` and returns the project's **tag catalogue**;
   `assets-panel/use-readiness-steps.ts:37` takes `(projectId, assetId, assetTypeId)` and returns
   **one asset's ladder**. `use-asset-current-tag.ts` imports the *former*. Easy to wire the wrong
   one — check the import path, not the name.

3. **The viewer legend does not add a third copy.** PLT-2990/PLT-2991 merged to master today
   (`e296a98`) and `legend/use-legend-items.ts` only maps the tag catalogue to label+colour rows
   (`:34-44`); it derives no achieved state. Element *colouring* goes through the
   `use-asset-current-tag` path, so it is covered by correction 1 rather than being separate.

Net effect: the override has **two** derivation sites to change, not one, and the second one feeds
the viewer. That makes "client-only for the MVP" noticeably less attractive — two hooks reading a
per-browser override is where drift will show up first.

## 2026-08-26 — IMPLEMENTED. Draft PR hc-frontend #2186 (branch `PLT-2968`), Jira → In Code Review

Supersedes the open questions above: the override lives in Supabase **`asset_readiness`** (the
table already existed on dev — full DDL, constraint and write-shape rules in
`commissioning/data-layer.md` §2026-08-25). No new table, no schema change.

**What was built** (all in hc-frontend):
- `services/assetReadinessService/` — `listOverrides` / `setOverride` / `clearOverride`.
  Upsert on `project_id,asset_id,readiness_step_id` with a **literal body**; `is_achieved` is
  NEVER sent (a test pins that); clear resets flag+reason but keeps rows.
- `hooks/useAssetReadiness.ts` — one project-wide query (`useAssetReadinessOverrideMap` →
  assetId → readinessStepId → override) + set/clear mutations invalidating it.
- Both derivation sites threaded (this resolves correction 1 above — the two copies were each
  given the same OR): `use-asset-current-tag.ts` (`overridden || tasksDone`, plus a new required
  `overridden: boolean` on `IAssetCurrentTag`) and `assets-panel/use-readiness-steps.ts`
  (LadderStep gains `readinessStepId` + `override` metadata).
- UI: ladder kebab → "Override readiness level" modal (radio per level + required reason; writes
  the target level AND every level below), "Clear override" item (whole asset, shown only while
  one exists), yellow "Overridden" badge on step rows with reason/author tooltip.

**Semantics chosen** (product defaults, flagged in the PR): any project member can override
(UI-level only — RLS is permissive anyway); overrides roll up to systems automatically via
`getCurrentTag`; override-DOWN is not supported by this model. "Overridden at" displays
`modified_at ?? created_at` (modified_at is NULL until first update — trigger-stamped).

**Ship blocker:** table absent on `stable` → QA above dev waits on XYZ_Supabase promotion PR #5.
Fresh projects can't seed on dev (target-model breakage, see the re-point plan) → QA on an
already-seeded project.

**Cost of the `overridden: boolean` being required:** 5 test files carried `IAssetCurrentTag`
literals/helpers that only the PROD BUILD typechecks (vitest does not typecheck) — two CI failures
before all were found. Pitfall recorded in `commissioning/pitfalls.md` (2026-08-26).

## 2026-08-27 — Copilot round after un-draft: override-DOWN is now supported (semantics change)

Supersedes the "override-DOWN is not supported by this model" line above. Copilot (on #2186,
post-un-draft) found the reachable hole: the modal lets any level be picked, so Green-then-Yellow
left Green's row `is_overridden=true` — the asset kept reading Green while the toast reported
success. Fixed in `e77df8c`:

- `setOverride` is now **set-then-clear**: upsert the new contiguous set, then select the asset's
  still-overridden rows and clear any not in the set (flag+reason reset, `modified_by` records
  who, rows kept for history — same patch shape as `clearOverride`, still never `is_achieved`).
- Order rationale: clear-first (Copilot's literal suggestion) would leave the asset with NO
  override if the second call failed; set-then-clear can only leave the OLD override standing,
  and a retry converges. Client has no `not.in` op (`eq`/`in`/`is` only) — hence select + `in`.
- Unchanged: an override still cannot un-achieve a task-complete level (derivation ORs).

Same round: task-row buttons in step-tasks-modal got explicit `type='button'` (`d5366fd`;
default is submit inside a form), and a spurious "import useEffect" finding was refuted (the
initial-sync is deliberate render-phase adjust-during-render; no useEffect in the file).

Branch note: another session merged master (incl. **PLT-3058 target-model re-point**, #2150 —
`workflowStepTaskService` deleted) into PLT-2968 as `3a5ba9d`; my fixes merged cleanly on top
(`6f6de2e`), 385 panel tests green on the combined tree. #2186 is un-drafted (by Ilia,
2026-08-27) and now carries BOTH tickets — PLT-2967's #2187 was merged INTO this branch on
2026-08-26 and #2186's body covers both.

## 2026-08-28 — scheduled-run checkpoint

Still `In Code Review`; not eligible for kick-off. Checkpoints 1–3 all clean on the PR —
build + Sonar green, branch already contains master head `70451f7`, no conflict
(`mergeable_state: blocked` = awaiting approvals, not a merge problem). Full run log and the
ticket→PR map: `sprint-tickets/README.md` § 2026-08-28 (morning).

## 2026-09-01 — scheduled-run checkpoint + PR-body correction

Still `In Code Review`; not eligible for kick-off. Checkpoints 1–3 clean (3/3 threads resolved,
build + Sonar green on `71d79d0`, base already at master head `70451f7`, no conflict).

**Corrected #2186's description.** It still carried #2187's "**Branched off `PLT-2968` (#2186)** —
… Merge #2186 first; GitHub will retarget this to master" paragraph, pasted in when #2187 was
merged into this branch on 2026-08-26. Inside #2186 all three claims are false: #2186 *is*
`PLT-2968`, it sits directly on master (verified `git merge-base --is-ancestor origin/master
71d79d0`, 14 commits ahead), and it carries both tickets rather than only the 2967 delta. Replaced
with an accurate provenance note stating there is nothing to merge ahead of it. Body only — no
code, no CI re-run, no review dismissal.

Worth knowing for the next run: this PR has **never had a human review**, so a misleading
"merge something else first" line in its own description was a live cost, not cosmetic.

## 2026-09-02 — master merged in; no engineering work outstanding

Run found the ticket still **In Code Review** (not eligible for kick-off) and PR #2186 with **zero
open review threads** and a **green `build`**. Only action taken: `master` had moved to
`ac0c63b` (PLT-3022 — built-in roles remapped to the Custom Permissions authority mapping), leaving
this branch 1 commit behind, so master was merged in (`5cca6eb` → `f81c1cc`).

The merge is clean and carries none of our own code: the file-set intersection between `ac0c63b`
and this branch is **empty**, and a trial `merge --no-commit` reported no conflicts. PLT-3022 does
not touch this branch's files.

Still gated on **human approval only** — see the 09-02 entry in `sprint-tickets/README.md` for the
full triage, the `copilot-pull-request-reviewer`-vs-`build` red-check trap, and the open product
question PLT-3022 raises about authority-gating the commissioning surfaces.

## 2026-09-03 — the review bot's *suppressed* comments were never being read

Sprint run found **0 eligible tickets** (PLT-2968, PLT-2967, PLT-2896 all In Code Review),
so the whole run was checkpoints 1–3. Checkpoint 1 turned up something structural.

> ### Standing lesson: `get_review_comments` does NOT show everything Copilot found
> Copilot files some findings as **suppressed comments** — they live inside the *review body*
> (`get_reviews`) and never become review threads. So they are invisible to a thread listing,
> invisible to the "open threads" count, and every prior run on this PR reported "all threads
> resolved" while three real findings sat unread. **Read `get_reviews` bodies, not just the
> thread list.** The 08-04 run already learned to call `get_reviews` for `CHANGES_REQUESTED`;
> the same call carries the suppressed findings and that half was being skipped.

Three suppressed findings on #2186. Two were real and are fixed in `7017211`:

**1. `StepTasksModal` could open for a tag that no longer exists.** It rendered on
`tasksModalStepId` alone (`readiness-ladder.tsx`), and the kebab stores only an id:
- `AssetDetailPanel` is **not keyed by `asset.id`** (`asset-detail-right-panel.tsx:96`), so
  `ReadinessLadder` keeps its state across an asset selection change;
- `steps` re-derives on every readiness refetch — and the override mutations invalidate it.

So the id can stop resolving while the modal is open → `title = step?.label ?? ''` and a
disabled query → **untitled dialog reporting "No tasks yet" for a tag that isn't there.**
Fixed by resolving the step in a `useMemo` and rendering on that — which is exactly what
`TaskInstanceModal` **on the next line** already does with `openInstance`, so this was an
inconsistency, not a design choice. `StepTasksModalProps.step` is now non-nullable, making the
invariant a compile error rather than a convention.

**2. Neither new dialog had an accessible name — and this one is repo-wide.**
`common/modal/modal.tsx:19,27` generates `const titleId = useId()` and sets
`aria-labelledby={title ? titleId : props['aria-labelledby']}`. **Nothing ever renders an
element with that id** — `modal-title.tsx` neither receives nor applies it. So every caller
that passes `title` gets a dangling `aria-labelledby` and a dialog a screen reader announces
with no name at all. **64 call sites pass `title`.**

Fixed *locally only*: each new modal owns its own `useId()`, passes it as `aria-labelledby`,
and lands it on the rendered title via `ModalTitle TypographyProps={{ id }}`. That uses the
passthrough `Modal` already exposes, so zero blast radius.

> **Follow-up worth a ticket (candidate #4, ahead of the tldraw upgrade):** wire the generated
> id down through `ModalProvider` and have `ModalTitle` apply it — fixes all 64 dialogs with no
> caller changes. Deliberately NOT done on #2186: it touches every modal in the app and that PR
> is green and waiting on approval. Recorded on the PR too.

**3. setState-during-render in `override-readiness-modal`** — already answered on a thread on
08-27 (deliberate compare-and-set during render, React's documented alternative to an effect
for derived-state resets). Copilot re-suppresses it on every review. **No change; do not
"fix" it on a future run.**

### Verification constraint (unchanged from 09-02)
`npm ci` cannot complete here — `@xyzreality/dhtmlx-gantt` is on the private GitHub Packages
registry and there is no `NPM_TOKEN`. **No `node_modules`, so no local vitest.** Two
consequences that shaped the diff:
- CI is `npm run test-ci` = `eslint` + `vitest run`, plus the docker image build (webpack prod,
  which typechecks). **Prettier is NOT in CI** — `prettier:check` exists but nothing calls it.
  Formatting cannot turn the build red; eslint can, and `eslint.config.mjs` has **no
  `import/order` and no `max-len`**, and `lint` runs without `--max-warnings 0`.
- The new label assertions are written at DOM level (does some `aria-labelledby` resolve to an
  element carrying the title?) rather than with `toHaveAccessibleName` on a testid, because
  **MUI Dialog destructures `aria-labelledby` out of props and applies it to the Paper, not to
  the root that carries `data-testid`** — an assertion on the testid node would have failed and
  there was no way to catch that locally.

## 2026-09-03 (07:55 UTC) — i18n review finding, and a reasoning error worth not repeating

Copilot on #2186: `step-tasks-modal.tsx` had three hardcoded English strings — "Loading tasks…",
"No tasks yet", and the two aria-labels added on 09-02. **Correct, and it exposed a bad inference
rather than just a missing call.** Fixed in `bc7e9cc`.

**The reasoning error:** when adding the aria-label on 09-02 I checked *that file*, found no i18n
imports, and concluded "hardcoded English is the local convention here". I inferred a convention
from the single file I was editing. The siblings in the same folder say the opposite:

| File | `translate()` calls |
|---|---|
| `linked-element-section.tsx` | 20 |
| `asset-systems-section.tsx` | 18 |
| `readiness-ladder.tsx` | 6 |
| `asset-open-issues-section.tsx` | 5 |
| `step-tasks-modal.tsx` | **0** |

> **Rule: infer a convention from the folder, never from the one file you are editing.** The file
> you are in is exactly as likely to be the outlier as the norm, and if it is the outlier you will
> copy the defect and then defend it.

Worse: **`hc.commissioning.assetDetail.noTasks` already existed with the exact string "No tasks
yet"** — so the empty state duplicated a key rather than reusing it, directly against the
reuse-what-exists instruction. Now reused; `loadingTasks`, `openTaskLabel` and
`openUntitledTaskLabel` added.

**Test-mock trap worth remembering:** the suite mocks `translate` as `key => key`. Routing the
aria-labels through `translate` would have left `toHaveAccessibleName` assertions *passing* while
no longer proving a task's name reaches the label — the whole point of those cases. The mock now
appends interpolated values. **A key-only translate mock silently voids any assertion about
interpolated content.**

**Scope call — same class of defect left alone, on purpose.** `readiness-ladder.tsx` has hardcoded
"No tasks yet" (201, 231) and `` aria-label={`Open task ${instance.templateName}`} `` (240) — the
exact empty-name bug fixed in the modal on 09-02 — and `tasks-panel.tsx` has both too (222, 281).
Verified with `git diff origin/master...HEAD` that **all of them pre-exist on master and are not
introduced by this PR**, so fixing them would widen a readiness-override PR into unrelated i18n
debt. Flagged on the PR with an offer to take it if the reviewer prefers. *Checking whether a
neighbouring defect is yours before fixing it is the difference between a ported fix and scope
creep.*

### Parallel run collided again — merged, not forced

`7017211` (07:49, parallel run: "gate the tasks modal on a resolved step, and name both new
dialogs") landed while this was being written, so the push was rejected. **Merged rather than
force-pushed** — `f814c78`, clean, no conflicts. The changes are compatible: their gating makes
`step` non-nullable so the modal reads `step.label` directly, and the three `translate()` calls sit
unchanged around it. Verified after merging that `en/main.json` has no duplicate keys and that their
commit added no new hardcoded strings (their dialog "naming" is `aria-labelledby` pointed at the
rendered title — data, not a literal).

**Third collision on this repo in two days.** The habit that keeps working: fetch before assuming a
push will land, and when it is rejected read *their* commit before merging, never force.

### 08:19 UTC — merged head green; i18n fix and the parallel gating change coexist

`build` **success** on `f814c78`, verified per-step: `Install dependencies`, `Lint & Run Tests`
(8m29s), Sonar (gate passed, 1 pre-existing issue), `Build image`, `Vulnerability scanner`,
`Scan built image` — all green, nothing skipped.

That confirms the two things the merge put at risk: the reworked `translate` mock still lets the
accessible-name cases pass (they assert `<key> <interpolated value>` now), and the parallel run's
non-nullable `step` gating sits fine alongside the three `translate()` calls.

**#2186 state:** green, current with master, **1 open review thread** — the i18n-fallback product
call, left open on purpose. Awaiting human approval.

### Second round the same day — the bot came back on my own fix, and was right (`b9313e3`)

Applying the new rule immediately paid: the review of `7017211` filed **another suppressed
comment**, on the very line I had just written.

Gating the render on a resolved step **hides** the modal but leaves `tasksModalStepId` set —
and hidden is not closed. I had considered clearing it and waved it off, reasoning a tag
realistically never comes back. **Wrong, and the mechanism is one hook away:**

`useAssetWorkflowSteps` → `useWorkflowSteps(projectId, workflowId)`, and **the query key
includes `workflowId`**, which is resolved from `assetTypeId`. So:

1. open View tasks on tag X for an asset of type 1;
2. select an asset of type 2 → new query key → `workflowSteps` is `[]` while loading →
   `steps.length === 0` → the ladder returns null **but stays mounted**, id still set;
3. select an asset of type 1 again → the key returns to a **cached** entry → steps resolve
   instantly → **the modal pops open on its own, showing tag X's tasks for a different asset.**

That is *more* reachable than the untitled-modal path the first commit fixed. Fixed with an
effect that clears the id whenever it stops resolving; the test walks the full open → other
type → back path rather than just asserting the guard.

> **Two lessons, both about my own reasoning rather than the code:**
> 1. "This state can't realistically come back" is a claim about a **query key**, not a
>    feeling — go read the key before dismissing it. `useWorkflowSteps` is keyed on the
>    workflow, so a type switch empties it and a switch back restores it *from cache*.
> 2. Hooks run before `if (steps.length === 0) return null`, so a component rendering null is
>    still mounted and still holding all its state. An early return is not an unmount, and
>    "the ladder disappeared" never resets anything.

**Related, deliberately not done:** `ReadinessLadder` is mounted without a `key`, so
`expandedId`, `openInstanceId`, `overrideForStepId` and `kebab` all survive an asset change too.
`key={asset.id}` at `asset-detail-panel.tsx:150` would reset the whole class in one line — but it
also discards the accordion `open` state and changes behaviour well beyond the reported finding,
so it belongs in its own ticket, not in a PR waiting on approval.

### 15:45 UTC — the same line became in-scope, because the branch moved

Copilot escalated the i18n finding to `readiness-ladder.tsx:227` — **the exact line ruled
out-of-scope at 07:55 that same morning.** The reversal is correct and the reason is worth keeping:

- At 07:55 the literal was a **context** line — it existed on master, this PR did not add it, so
  fixing it would have widened a readiness-override PR into unrelated i18n debt.
- Since then the parallel run's `7017211` and `b9313e3` rewrote that block, so
  `git diff origin/master...HEAD` now shows it as an **added** line.

> **Rule: an in-scope/out-of-scope call has a shelf life on a branch other actors are pushing to.**
> Re-run `git diff origin/master...HEAD -- <file> | grep '^+'` before reusing an earlier scope
> answer. "I checked this morning" is not a check.

Fixed in `192156d` with **no new keys** — all three already existed and are used elsewhere:
`assetDetail.noTasks` (also in `AssetWorkflowStepTasks.tsx`), `assetDetail.taskCount`
(`{{done}}/{{total}} tasks`) and `assetDetail.taskCountOne`. Singular keyed on the total, matching
`asset-systems-section.tsx:502`. **Searching for an existing key before writing one paid off twice
today** — this morning's `noTasks` duplication was the same mistake caught by the same check.

**Reuse exposed a latent plural bug the literal was hiding:** `` `${step.done}/${step.total} tasks` ``
rendered *"1/1 tasks"* for a single-task step; `taskCountOne` gives "1/1 task". The existing test
asserted `'1/1 tasks'`, i.e. it **encoded the bug** — so that expectation changed meaning, not just
format. Worth flagging as a pattern: *a test asserting a hardcoded string can be pinning a defect
rather than a contract.*

Also upgraded this suite's `translate` mock to append interpolated values (same as
`step-tasks-modal.test.tsx`) — key-only would have left four task-count assertions green while no
longer proving `done`/`total` reach the label.

**Still out of scope, each re-verified as a context line:** the second `No tasks yet` (now 258) and
`` aria-label={`Open task ${instance.templateName}`} ``. Both are real defects — the aria-label is
the same empty-name bug fixed in the modal — and belong to the follow-up ticket.

**Both #2186 threads replied to and resolved.** Fifth parallel push on this branch today; this one
required no merge (remote had not moved at push time).

### 16:01 UTC — self-review: the i18n fix had made the code worse to read

`192156d` completed **green** (full suite passed in 8m15s, so the five reworked task-count
assertions and the interpolating mock all hold). But reviewing my own diff afterwards, routing that
label through `translate()` had left a **ternary nested inside a ternary, inline in JSX** — arguably
worse than the hardcoded string it replaced. Sonar's new-issue count on this PR also went **1 → 3**
on that commit; treated as corroborating, not proof (the gate passed, and the issue list is not
queryable from here).

Extracted in `27c52ed` to a flat module-level `stepTaskCountLabel(done, total)` with an early return
for the zero case: one ternary, no nesting. Behaviour identical, so the existing assertions still
cover it — no test churn.

**Documented in the code why `components/WorkflowStep/task-count.ts` is not reused:** it renders a
bare count ("4 tasks") from the `AssetTypePage.readiness` keys, not the done/total pair these rows
need. Put that in the comment rather than only here, because *twice today* this run wrote something
before checking for an existing helper (the `noTasks` duplication, then this). A note in the file is
read by whoever edits next; a note in these docs is only read by a run that thinks to look.

> **Lesson: fixing a review finding can introduce a worse defect than the one it fixes.** Re-read
> your own diff after satisfying a reviewer, not just before. "The reviewer's point is addressed" is
> not the same as "the code is better than it was."

### 16:20 UTC — three more findings on `27e62be`: two real (one a regression), one false

**A correction to this run's own earlier report first:** I told the user `192156d` was "green". It
was **cancelled** — only `Lint & Run Tests` completed; `Build image` was killed at 16:01 by my own
`27c52ed` push. `27c52ed` was then cancelled too, during `Lint & Run Tests`, by the parallel run's
`27e62be`. **Neither had typechecked.** Two cancelled runs in a row, both of which the
`check_suite.completed` notice described as nothing-failed.

> **This is now three times in two days that a rollup or a suite notice would have let this routine
> report an unverified commit as green.** The step list is the only trustworthy source. Also worth
> knowing: `Lint & Run Tests` does NOT typecheck (eslint + vitest only) — the typecheck lives in the
> prod webpack run inside `Build image`. A green test step proves nothing about TypeScript.

**1. `React.InputHTMLAttributes` "will fail compilation" — FALSE.** Rejected, with the argument
*rebuilt* rather than reused: the 08-27 answer to a similar claim leaned on builds having already
passed with the file unchanged, and that leg was gone (the line arrived in `78c1726` today, and both
subsequent runs cancelled before typechecking). New evidence instead — **23 files in this repo
reference `React.<Type>` in type positions with no React import**, including `Button.tsx`,
`LoginForm.tsx`, `CheckBox.types.ts`, `header-components.tsx`, `project-private-route.tsx`, all
shipping on this exact tsconfig (`"jsx": "react-jsx"`, no `allowUmdGlobalAccess`). `TS2686` fires on
**value** uses only. Said on the thread that if `f63236e` does fail on it, I add the import and say
so.

**2. Glyph `aria-label` hardcoded — RIGHT, and a REGRESSION.** `assetDetail.overriddenBadge` =
"Overridden" existed from `c238d94` (08-26); `78c1726` replaced the translated badge with a glyph,
**deleted the key**, and hardcoded `'Overridden'`. Localisation that previously worked stopped.
*Design changes that swap one component for another are a soft spot for silently dropping a
translation — worth checking the key census when a component is retired.*

**3. "View tasks" menu label hardcoded — RIGHT**, no key existed.

Fixed in `f63236e`: `stepAchieved` **reused** (already existed), `stepOverridden` added (named for
the glyph, not resurrecting the retired badge key), `viewTasks` added. Test updated for the glyph's
accessible name, and the suite's key strings now derive from one `KEY_PREFIX`. All three threads
replied to and resolved.

## 2026-09-03 (late afternoon) — the `React.` question, settled locally; and a CI blind spot

**Supersedes the "if `f63236e` fails on it" wager above — that build never ran.** It was cancelled
at 16:29 when a parallel run pushed `09c7a52`, with `Build image` **skipped**. So the empirical leg
I promised did not arrive, and waiting again would not have produced it.

### `React.InputHTMLAttributes` with no React import — MEASURED, not asserted

Built a minimal repro instead (`typescript@5.7.3` + `@types/react@18.0.18`, this repo's flags:
`jsx: react-jsx`, `moduleResolution: bundler`, no `allowUmdGlobalAccess`), in a file with no React
import alongside a sibling module that does import react:

| use | result |
|---|---|
| `… as React.InputHTMLAttributes<HTMLInputElement>` (type position) | compiles, **exit 0** |
| `React.createElement('div')` (value position) | **`error TS2686`**, exit 2 |

**The second row is the whole point: it is the positive control.** A clean run on the first row
alone proves nothing — it is indistinguishable from a repro too weak to catch anything. The value
case firing the *exact* predicted error shows the setup is capable, so the type case not firing is a
real negative. Copilot's finding is wrong; the line stands. Confirmed still present at line 171 on
`09c7a52`.

*Rule worth keeping: when disproving a predicted compile error, always include a case that MUST
fail. A green result without a positive control is not evidence, it is an untested harness.* This
also replaces a bad habit from earlier today — rejecting the same finding by citing 23 files that do
the same thing. That is good corroboration but it is inference from precedent; it would not have
caught a config difference specific to this file's directory.

### `Build image` has never run on PLT-2968 — four pushes in a row

`192156d`, `27c52ed`, `f63236e` cancelled; `27e62be` likewise. Pushes land faster than the job's
~18 min, so the workflow concurrency group kills each run before step 15.

**Consequence: this branch's prod build is unverified.** `Lint & Run Tests` keeps passing (it did on
`f63236e`, 16:20:41→16:28:52) and that is genuine signal for the test changes — but **it does not
typecheck**. The webpack production build in `Build image` does, and it has not completed once.

*Rule: on a branch with parallel actors, "nothing failed" is not "it passed". Read the step list.
A cancelled run reports no failures and skips everything after the kill point, so a rollup or a
check-suite-completed webhook will present it as unremarkable.* This is the fourth time today that
reading the rollup instead of the steps would have let an unverified commit be called green.

Neither problem is mine to fix from here: I must not push an empty commit to kick CI, and I cannot
stop the parallel pushes. Flagged on the PR thread and to the ticket owner instead — the branch
needs one quiet window with no push for ~20 min before it merges.

## 2026-09-03 (evening) — `Build image` finally ran; and the asset-switch state bug

### The React UMD question is now settled twice over

**`Build image` PASSED on `09c7a52`** (16:40:21→16:46:03) — the first time that step has completed
on this branch. It runs the production webpack build, i.e. the real typecheck, over
`override-readiness-modal.tsx` with the bare `React.InputHTMLAttributes` still at line 171. Combined
with the controlled repro recorded above, the rejection stands on both a measured local result and a
real CI run. *Supersedes the "unverified" framing in the earlier entry — that was accurate when
written and is no longer.*

Note the job still reported `cancelled` overall, because `Scan built image` (step 20) was killed at
16:46:41 by the next push. **A job conclusion of `cancelled` does not mean nothing useful ran** — 19
of 21 steps had already succeeded. Reading only the conclusion would have thrown away the exact
evidence I had been waiting all day for. Read the steps.

### The npm-install blocker, tested rather than assumed

`GITHUB_TOKEN`/`GH_TOKEN` **are** present in this environment, so `NPM_TOKEN="$GITHUB_TOKEN" npm ci`
looked like the unlock for local test runs. It is not: GitHub Packages returns
`401 unauthenticated: User cannot be authenticated with the token provided` for
`@xyzreality/dhtmlx-gantt`. So no local vitest or `tsc` for the whole of this branch's work, and CI
stays the only verifier. Worth retrying if a real `NPM_TOKEN` ever appears — but don't re-derive
this; it's tested.

### Asset-switch state bug — two findings that were one bug from two ends

Copilot on `09c7a52`, both correct, fixed in `62ec0df`.

`ReadinessLadder` is not keyed by asset. **The guard I wrote earlier only catches a step id that
stops resolving, which requires the new asset to be of a DIFFERENT type** (`useAssetWorkflowSteps` is
keyed on the type's workflow). A same-type switch keeps every `readinessStepId` valid, so the
override modal, tasks modal, expanded tag and task editor all stayed open while `assetId` changed
underneath them.

For the override modal that is a **wrong write**: it takes `assetId` as a prop and `submit()` writes
with it, so a reason typed for asset A records the override against asset B, with a success toast.

*Lesson, and it is about my own work: a fix that is narrower than the bug can read as general.* I
wrote that resolution guard with a comment explaining the asset-change case, which made it look
handled. It only ever covered the cross-type half.

**The two findings are ordered, not independent.** The second (modal resets `reason`/`acknowledged`/
`formError` only in its local `close()`) was *latent* — the only parent close path went through
`close()`. The asset-change reset is a close that skips it, so **fixing finding 1 makes finding 2
live.** Copilot had filed 2 as a suppressed "previously missed" note; taking 1 alone would have
shipped a new bug. *Check whether a review comment you're deferring is a prerequisite of one you're
acting on.*

Fix, with two deliberate calls:
- Reset all selection-scoped state on `assetId` change — **not** `key={assetId}`, which would also
  reset `open` (the accordion state), a panel-level user preference rather than per-asset state.
- **During render** (React's "adjusting state when a prop changes"), not in an effect: an effect runs
  after commit, so the modal paints one frame already carrying the new `assetId`. The first draft was
  the effect; the render-phase form has no such window and avoids an `exhaustive-deps` complaint
  about a dependency the body never reads.
- Override modal now mounted only while open, matching `StepTasksModal` — fresh state per open
  instead of a reset every future close path must remember.

## 2026-09-03 17:20 — first fully green run on the branch, and both PRs synced to master

**`73560fb` is green end to end** — every step, `conclusion: success`, no cancellation. This is the
first complete run PLT-2968 has had. It carries `62ec0df` (the asset-switch fix), so:

| step | result |
|---|---|
| `Lint & Run Tests` | success 16:59:26→17:07:43 — **my two new tests pass, lint clean** |
| `Execute SonarQube Scan` | success; Quality Gate passed |
| `Build image` (prod webpack typecheck) | success 17:09:32→17:15:21 |
| `Scan built image` (Trivy) | success |

That closes the verification gap this branch had all day. The asset-switch fix was written with **no
local test run possible** (see the `401` finding above), so CI was the only proof — and it holds.

**Sonar: 2 new issues before my commit (`09c7a52`) and 2 after (`73560fb`)** — so `62ec0df` added
none. They pre-date it in this PR's leak period and are not mine to chase; noting the two data points
rather than the single reading, because one number alone would not have shown that.

### Both open PRs brought up to date with master

`#2180` merged at 17:07, so master moved one commit ahead of both branches. Merged it into each,
authored correctly (identity set via `git config` once, which is the fix for the earlier slip where a
merge commit came out authored as `Claude`):

- **`3a494f2`** → `PLT-2968` (#2186). No conflicts — #2180 is confined to routing modules, this
  branch to the commissioning assets panel.
- **`6a19bf8`** → `fix/trivy-nanoid-cve-2026-73086` (#2192). No conflicts; verified after merging
  that `shortid` is still absent from **both** `package.json` and `package-lock.json`.

*Judgement call worth recording:* syncing #2192 re-runs Trivy on a PR that was green and only
awaiting approval, which risks turning it red if the CVE DB moved again. Did it anyway — a new CVE
would be red on master too and would surface at merge time regardless, so learning it now is strictly
better than learning it later. Watch that run.

### One thing NOT done, deliberately

**#2186 is `draft: false`.** The session instruction was to keep PRs in draft. It has four requested
reviewers and several completed review rounds, so a human (or the parallel run) marked it ready.
Converting it back would withdraw it from reviewers already engaged and undo someone's deliberate
action — reported to the ticket owner instead of reverted.

## 2026-09-03 17:35 — two more review findings: one fixed, one ticketed

### `sx` forwarded onto a DOM node in the menu test stub — FIXED (`2c9678d`)

The nested-menu `MenuItem` stub spread every prop onto a `<div>`, and the real items do carry `sx`
(the override item's colour, the view-tasks item's icon rule), so an object was reaching a DOM
attribute on every render. Dropped by name (`sx: _sx, ...props`) so a future DOM-valid prop still
passes through without editing the stub.

*Honesty note worth keeping:* the finding quoted a specific React warning string. I could not
reproduce it (no local install — see the `401` above), so I confirmed the **mechanism** and said on
the thread that I hadn't seen the message rather than echoing it as if I had. Don't restate a
reviewer's observed output as your own verification.

Lint check before pushing: `@typescript-eslint/no-unused-vars` is `'warn'` in `eslint.config.mjs:66`,
not `'error'`, and `ignoreRestSiblings` defaults true — so destructure-to-omit cannot fail the build.
Checked rather than assumed, because a lint failure is a wasted CI cycle.

### `setOverride` read-modify-write race — REAL, ticketed, NOT fixed here

`setOverride` is upsert → select → conditional update, three round trips, no transaction. Verified
interleaving: X overrides to Yellow `[red,yellow]`, Y to Green `[red,yellow,green]`; X's select sees
all three, computes `stale={green}`, clears it — **final state is X's intent though Y acted last**,
and reversing the order flips the winner, so it is nondeterministic rather than last-writer-wins.

**This PR introduced it.** The read-modify-write arrived in `e77df8c`, the fix for the earlier
finding about lower levels not being retracted. Fixing that one created this one — the same
"a review fix can introduce a worse defect" pattern already recorded above, now twice on this branch.

Why it is a follow-up and not a change here:
- `client.rpc()` **does** exist (`postgrest-client.ts:211`, typed + tested) — but **no production
  code calls it**; this would be the feature's first Postgres function.
- The applied schema is not in this repo. `docs/commissioning/PLT-2862-supabase-schema.sql` states in
  its header that the service `*_TABLE` constants are the source of truth and the file merely reflects
  them. The function must be created in the Supabase project.
- That path is already blocked: the table 404s on `stable` until XYZ_Supabase promotion PR #5 lands.

**Cheap alternative evaluated and rejected** — replace select-then-update with a server-evaluated
`readiness_step_id NOT IN (kept)` update (3 round trips → 2, no stale read). Rejected for two
reasons: the client filter union is `eq | in | is` only
(`commissioning-data-client.types.ts:21-23`), so the client needs extending too; and **it does not
fix the bug** — X's clear still wipes Y's green, because the predicate is still X's intent. *It would
have looked like a fix while leaving the race.* Only atomicity closes it.

Severity for prioritisation: needs two engineers overriding the same asset inside one round trip; an
override is a deliberate act with a written reason, and the damage is a visibly wrong readiness level
that repeating the action corrects. Real, low-likelihood. **Thread left open deliberately** — the fix
is not in this PR and should not vanish from the reviewer's view on my say-so.

## 2026-09-03 17:42 — missing-relation leniency: a convention I'd missed, for the second time

Fixed in `07474a1`. `listOverrides` threw when `asset_readiness` was absent, and the table is not
promoted to every env — it 404s on `stable`, which this PR's own description says. That read backs
`useAssetReadinessOverrideMap` → asset chips, filters, model colouring, so one unpromoted migration
became a **retried failing query behind several viewer surfaces at once**.

**`isMissingRelation` already existed** — `commissioningApi/commissioning-request-error.ts`, with
`UNDEFINED_TABLE` (`42P01`) / `POSTGREST_MISSING_TABLE` (`PGRST205`) and its own tests. Only one
production caller before this (`CreateAssetTypePage/CreateAssetTypeContent.tsx:81`), which is why it
was easy to miss.

> **This is the same mistake as the `noTasks` i18n key, and that makes it a pattern, not an
> accident.** Both times I wrote a new file, checked *that file*, and never looked at how its
> neighbours handle the same condition. The earlier lesson was recorded as "infer a convention from
> the folder, not the file you're editing" — it clearly wasn't operationalised. **Concrete practice
> for a new service against an existing client: grep the client's own error module for exported
> helpers BEFORE writing the first method, and check who calls them.** One `grep -rn isX --include
> '*.ts'` would have caught both.

Three deliberate limits, because "degrade gracefully" over-applies easily:
- **Reads only.** Writes still throw — a silent no-op write would show a success toast and record
  nothing, worse than an error.
- **Missing relation only.** A 500 still propagates; swallowing it would render a broken read as
  "no overrides", indistinguishable from the truth, hiding an outage behind plausible UI.
- **Not the `select` inside `setOverride`** — it runs after the upsert, which would already have
  thrown, and continuing a half-done write would be wrong.

Tests: empty on missing relation, still throws on anything else, and writes don't inherit the
leniency. Used `vi.spyOn(client, 'select')` rather than subclassing `InMemoryCommissioningClient`
**specifically because an override-signature error is the kind of mistake I cannot catch without a
local run** — verified `select`/`upsert` exist as real async methods first.

## 2026-09-03 17:53 — Sonar new-issue count moved 2 → 5, and I cannot see which

`Lint & Run Tests` passed on `07474a1` (Sonar runs at step 12, so reaching it proves step 7 succeeded)
— the three new `asset-readiness-service` tests are green. But Sonar now reports **5 new issues**,
up from 2, and Quality Gate still passes.

**The delta is partly mine.** Commits between the 2-reading (`73560fb`) and the 5-reading
(`07474a1`): `3a494f2` (master merge, no code), `2c9678d` (sx stub, mine), `3eba287` (parallel run),
`07474a1` (missing-relation, mine). Two of four are mine.

*Process note against myself:* the run started at 17:40:49 and I first reasoned "that predates my
push, so these issues aren't mine". Then I checked the head sha — `07474a1`, pushed 17:39:47. **The
convenient inference was wrong and one call disproved it.** Check the sha; do not date-reason about
which commit a run covers.

**Could not enumerate them.** SonarCloud's API refuses anonymous reads for this project —
`api/components/show` returns `"Project doesn't exist"`, i.e. private. Note that
`api/issues/search` did NOT error for the same request: it returned `{"total":0}`. **A private
project yields a false-empty rather than a 403 on that endpoint**, so a zero from it is not evidence
of zero issues. Anyone re-treading this needs a token.

Ranked hypotheses for the three, from reading my own diff (unverified):
1. `console.warn` in `listOverrides` — a new `console` use in a service. Matches the existing
   precedent (`CreateAssetTypeContent.tsx` uses warn+error), but precedent code is outside the leak
   period while mine is inside it.
2. `sx: _sx` unused destructured binding in the menu test stub.
3. Cognitive complexity / try-catch shape on the touched functions.

**Deliberately did NOT guess-push a fix.** The gate passes, all three candidates are intentional
choices (2 was the reviewer's own suggested form; 1 matches area convention), and a speculative push
costs a CI cycle and risks a real defect — the exact pattern that already bit this branch twice
today (the i18n fix that took Sonar 1→3, and the review fix that introduced the `setOverride` race).
Flagged for whoever has SonarCloud access instead; one click resolves what I cannot.

## 2026-09-03 18:00 — `07474a1` fully green; all three fixes CI-validated

Every step success on `07474a1` (still the head — no further parallel push): `Lint & Run Tests`
17:41:49→17:50:18, `Execute SonarQube Scan` success, `Build image` 17:52:06→17:57:51,
`Vulnerability scanner` + `Scan built image` success. So all three of this session's fixes are
verified by CI despite no local test run being possible:

| commit | fix | verified by |
|---|---|---|
| `62ec0df` | asset-switch closes the ladder's modals (the wrong-write) | green on `73560fb` and again here |
| `2c9678d` | `sx` no longer forwarded onto a DOM node in the menu stub | green here |
| `07474a1` | missing `asset_readiness` reads as no overrides | green here, incl. its 3 new tests |

`state` from the combined-status endpoint reads `"pending"` with `total_count: 0` — that is **no
legacy commit statuses at all**, not a pending check. This repo reports via check-runs; do not read
that endpoint as PR health.

### Open on #2186 at hand-off
- **One review thread open by design**: the `setOverride` concurrency race (needs an RPC + Supabase
  deployment; see the 17:35 entry).
- **Sonar 5 new issues, gate passing, unattributable without a token** (17:53 entry).
- **`draft: false`** despite the session instruction to keep PRs in draft — flagged, not reverted,
  because reviewers are engaged (17:20 entry).
- Waiting on **approval** — four reviewers requested, none has approved.

## 2026-09-03 23:16 — fourth i18n finding, deferred on timing not merit

A parallel run built a **task runner** into `TaskInstanceModal.tsx` after 18:00 (`3eba287` 18:31,
`87b9c82` 23:09). Copilot flagged its copy as hardcoded English. **Verified in scope** —
`git diff origin/master...HEAD` shows every one as an ADDED line (filter array 124-128,
`placeholder='Search items'` 732, `aria-label='Search items'` 744, empty state 771). *Checked rather
than assumed: "it was already like that" has been wrong on this PR in both directions.*

Wider than the comment listed. The file is at **1 `translate()` call** against ~12 added literals,
including `aria-label='Back'|'Close'|'Filter items'|'Loading task'` and `label='Complete'` — the
aria-labels being the ones a screen-reader user actually depends on and the easiest to miss.

**Deliberately not fixed now.** `87b9c82` landed ~7 minutes before the review and its subject
("preconditions, units, notes and the overall verdict") says more runner copy is still coming. An
i18n pass now would cover a subset, collide with in-flight edits to the same file, and need redoing.
Right moment is one sweep once the runner is feature-complete. *This is the same call as the morning
PLT-2953 decision — publish the diagnosis rather than race a mid-flight file — which was validated
when the parallel run implemented it identically an hour later.*

### The pattern is the finding

**Four i18n findings on this branch**, each fixed individually: modal loading/empty states, ladder
task counts, glyph + menu labels, now the runner. That is not four mistakes; it is new commissioning
UI being written with literals and caught afterwards in review, every time.

Restating the systemic half, because it keeps being the better answer: **the app has no i18n
fallback at all.** A key missing from `tr` renders the literal `translation-not-found[...]` — 820
keys today. Adding runner keys to `en` alone does not make the runner work in Turkish, it only moves
the failure. One change to how a miss resolves fixes all 820 and makes every future en-only addition
harmless.

Thread left **open**. CI on `87b9c82` in progress at time of writing; `07474a1` was the last head I
verified fully green.

## 2026-09-03 23:21 — Sonar 5 → 8, cleanly attributable to the runner work

Unlike the 2→5 step (which I could not attribute), this one is unambiguous: **I pushed nothing after
`07474a1`**, which is the head that read 5. `87b9c82` reads 8, and the only commits between them are
the parallel run's `3eba287` + `87b9c82` — the task runner. So **+3 new Sonar issues come from the
runner**, on top of its ~12 hardcoded strings.

Gate still passes and `Lint & Run Tests` succeeded (Sonar runs at step 12, so reaching it proves
step 7 passed). Nothing is red.

**Why this matters for the ticket owner rather than for CI:** the runner is landing with a quality
tail — hardcoded copy including aria-labels, plus three Sonar issues — and it is being built in the
last hours before review. Recommend a single quality sweep of `TaskInstanceModal.tsx` once the runner
is feature-complete, covering the i18n pass and whatever the three Sonar issues turn out to be, rather
than a series of individual review-comment fixes. That sweep is the natural home for the deferred
i18n work in the 23:16 entry.

*Method note: attribution was possible here only because the interval between the two readings
contained no commits of mine. When it does, and the project is private, the count alone cannot be
apportioned — see 17:53.*

## 2026-09-03 23:27 — first real CI failure, and it proves the typecheck gap

`87b9c82` failed at **`Build image`** (step 15) with exactly one error:

```
TS2741: Property 'supports' is missing in type '{...}' but required in type 'IChecklistInstance'
  systems-panel/edit-system-modal.test.tsx:65
```

The runner work made `IChecklistInstance.supports` **required**, and a test fixture in an unrelated
panel didn't set it. **`Lint & Run Tests` passed on that same commit** (23:10:41→23:18:56) — vitest
does not typecheck, so the error could only surface in the prod webpack build, ~10 minutes later in
the job.

**Already fixed at the current head, not by me.** `a4eb1ea` makes it `supports?: TaskColumnSupport`
again, with a comment explaining why optional is right (an instance can reach a consumer without one
— a cached row from before the probe existed, or a list assembled without its items). Verified by
diffing the declaration across the two heads: required at `87b9c82:123`, optional at `a4eb1ea:144`.
The run on `a4eb1ea` was already in flight, so the correct action was to verify, not to push — and
not to comment on the PR about a failure that had already been resolved.

*Method note: my local checkout was NOT at the failing head when I first read the type — it had
already fast-forwarded to `a4eb1ea`, and the file said "optional", contradicting the CI error. I
noticed the contradiction and checked `git show 87b9c82:<file>` rather than assuming CI was stale or
that I was reading the right thing. **When local source contradicts a CI error, suspect the checkout
first.***

### The systemic finding, worth a ticket

**This repo typechecks only inside `Build image`, at step 15 of an ~18-minute job.** Consequences seen
today on one branch:
- A type error survives a fully green-looking `Lint & Run Tests` and is reported ~10 minutes later.
- **Five consecutive runs were cancelled before reaching step 15**, so between roughly 16:19 and
  17:15 the branch had NO typecheck at all while looking healthy on the fast steps.

A `tsc --noEmit` step placed next to `Lint & Run Tests` would surface these in ~1 minute instead of
~18, and would survive the cancellation pattern that repeatedly starved step 15. That is a small CI
change with a large feedback-loop payoff, and it is the third distinct problem today traceable to
this gap.

## 2026-09-03 23:35 — branch is currently unverifiable; local-typecheck attempt abandoned deliberately

**Push cadence now exceeds the build.** `87b9c82` 23:09, `a4eb1ea` 23:26, `e990fd3` 23:28,
`7cfd9e0` 23:30 — roughly every 2 minutes against an ~18-minute job. `a4eb1ea`'s run was cancelled
at 23:29:17 during `Lint & Run Tests`. So the head that FIXED tonight's type error has itself never
been verified, and neither has anything after it.

### The local-typecheck attempt, and why I stopped it

Idea: `npm ci` fails only on `@xyzreality/dhtmlx-gantt` (401). It is the **only** private dependency,
and only **7 files import it**, all under `gantt-x/` and `dashboard-panels/gantt/` — completely
disjoint from the commissioning work. So: drop that one dep, install from the public registry, stub
the module, `tsc --noEmit`, and ignore errors from those 7 files. **The approach is sound and worth
keeping for a future run** (imports needed: default `Gantt`, named `GridColumn`, `GanttStatic`, and a
`/codebase/dhtmlxgantt.css` subpath).

Stopped it for two reasons, in order of weight:
1. **The head changes every ~2 minutes.** A typecheck of `7cfd9e0` would describe an already-
   superseded commit by the time it finished. *Racing a branch under active development is the same
   mistake I twice declined today (PLT-2953 this morning, the runner i18n at 23:16) — declining it
   there and then doing it here would have been inconsistent.*
2. **It dirties a tracked file.** Removing the dep edits `package.json`, which tripped the
   uncommitted-changes stop hook. Manifests were restored from backup immediately and the tree
   verified clean; `node_modules` removed. **If a future run tries this, do it on a copy of the tree
   in the scratchpad, never in the checkout.**

### What this leaves

Nothing for an agent to push. The branch needs a **quiet window** — one ~20-minute gap with no push —
before it can be called verified. Last head verified fully green: **`07474a1`** (17:58). Everything
after it is unverified, including the fix for tonight's TS2741.

## 2026-09-03 23:40 — MERGE BLOCKER: `SCHEMA_PREVIEW` is committed as `true`

**The most important finding of the session. `7cfd9e0` sets `SCHEMA_PREVIEW = true` deliberately
("turn the schema preview on while the MVP is reviewed"). It must go back to `false` before merge.**

The constant's own docstring says the preview *"changes what is DRAWN, never what is sent"*. **That
understates it.** `TaskInstanceModal.tsx:423-444`:

```ts
if (preview && split.preconditions.length === 0) {
  return { preconditions: PREVIEW_PRECONDITIONS, rest: split.rest }
}
const preconditionsMet = preconditions.every(item => isAnswered(...))
const itemsReadOnly = !editMode || !preconditionsMet
```

Stand-in preconditions are injected for any template lacking real ones, and they feed
`preconditionsMet` → `itemsReadOnly`. So a user must confirm **invented** preconditions before the
real items become editable, and those confirmations persist nowhere. That is a change to what someone
can DO, not merely what they see. No bad data is written — the write gating is genuinely sound — but
"display only" is the wrong mental model to merge on.

Scope: bounded by the `Commissioning` flag (off by default), so it cannot reach a general user. But
flag-on users are exactly the commissioning pilots, i.e. the people most likely to mistake a stand-in
gate for the real thing.

**Deliberately NOT flipped.** It was turned on on purpose, the PR is under review right now, and the
preview is what reviewers are meant to be looking at. Switching it off mid-review would remove that
and silently undo the author's intent. Flagged on the thread as a merge blocker instead — a one-line
change that is very easy to lose in a 34-file diff, whose post-merge failure mode is quiet.

## Same review — O(n²) row numbering, and why the suggested fix is wrong

`number={rest.indexOf(item) + 1}` is O(n) per row → O(n²) per render. Real, but the suggested
replacement (`item.position`) is **not equivalent**: `position` orders across ALL items, `rest`
excludes preconditions, so with 3 preconditions the first runner item would renumber 1 → 4.
*Verified the field exists and then checked what it means — a bot's suggested fix is a hypothesis,
not a patch.*

Correct O(n) fix preserving the numbering:
```ts
const numberByItemId = useMemo(() => new Map(rest.map((i, n) => [i.id, n + 1])), [rest])
```
Severity is low (tens of items, not thousands). Deferred to the same `TaskInstanceModal.tsx` quality
sweep as the i18n work — four commits landed in that file in the last half hour.

## 2026-09-03 23:49 — `7cfd9e0` fully green; the local-typecheck attempt did NOT work

**The branch got its quiet window and used it.** No push between 23:30 and 23:49, so the run on
`7cfd9e0` finally completed: every step success, `Lint & Run Tests` 23:32:26→23:40:42, **`Build image`
23:42:27→23:48:12**, Trivy success. The current head typechecks, and tonight's TS2741 is confirmed
resolved. Sonar steady at 8 new issues, gate passing.

**The local typecheck I attempted did not succeed — stating that plainly rather than leaving the plan
looking like a result.** The approach was sound and worth recording for next time: only **7 files**
import the sole private dep (`@xyzreality/dhtmlx-gantt`, all in `gantt-x/` and
`dashboard-panels/gantt/`, disjoint from commissioning), so removing it from `package.json`,
installing from the public registry and stubbing that one module would give a `tsc --noEmit` the
branch could not otherwise get. In practice the `npm install` was **killed** before finishing and
`node_modules` is empty. It also became unnecessary the moment CI completed.

*If retried:* the plan is right, but budget for the install being long, and back up
`package.json` + `package-lock.json` first — which was done here, and mattered, because the
manifests must not be left modified. Both are restored and verified identical to HEAD; the gantt
dependency is back; the working tree is clean.

### Where PLT-2968 / #2186 stands at end of session

- **Green on the current head** (`7cfd9e0`), verified by step list.
- **MERGE BLOCKER outstanding:** `SCHEMA_PREVIEW = true` must go back to `false` (23:40 entry).
- **Two threads open by design:** the `setOverride` concurrency race, and the runner i18n +
  O(n²) numbering, both belonging to the single `TaskInstanceModal.tsx` quality sweep once the
  runner is feature-complete.
- **Waiting on humans:** approval on #2186 and #2192; and whether #2186 should return to draft.

## 2026-09-04 10:50 — MERGE BLOCKER RESOLVED; and the i18n sweep de-risked

**`SCHEMA_PREVIEW` is now `false`** — `fb67dcc` ("schema preview off — the columns are real now").
Verified at head rather than trusting the subject line: `task-runner.preview.ts:17` reads `false`. So
the stand-in preconditions can no longer be injected and the `preconditionsMet` → `itemsReadOnly`
path is gone. Thread replied to and resolved.

*Caveat stated on the thread:* the commit claims the migration has landed. **The Supabase repo is
outside this session's access scope**, so that is taken at face value, not checked. If the columns
are NOT actually live, turning the preview off is still safer than leaving it on, but the previewed
parts simply stop drawing — a quieter wrong outcome. Flagged for a reviewer.

### The runner i18n sweep: specified, de-risked, still not pushed

Both deferred items remain at head (1 `translate()` call vs ~12 literals; `rest.indexOf(item)` at
716). Two findings from working it out properly:

**1. The obvious fix is a worse bug.** `FILTERS` is a module-level `const`. Putting `translate()`
inside it evaluates once at import — react-jhipster resolves `TranslatorContext` at CALL time, so the
label freezes at the import-time locale, and if the bundle isn't loaded yet it is permanently
`translation-not-found[…]`. **That looks localised and isn't**, which is worse than visible English.

**2. This folder already has the answer.** Line 520 does
`translate(TASK_TYPE_BY_ID[...]?.labelKey)`, and `task-status.config.ts` / `task-type.config.ts` both
store a `labelKey` rendered via `translate(config.labelKey)`. So `FILTERS` carries `labelKey`,
resolved at the render site (795), namespaced `hc.pages.TaskRunner.*` to match
`hc.pages.TaskStatus.*` / `hc.pages.TaskType.*`. *Third time this session that the answer was already
in the folder — and the first time I looked for it BEFORE writing anything.*

**3. Cost is lower than I assumed.** `TaskInstanceModal.test.tsx:35` already mocks
`translate: (key) => key` and asserts on none of the English strings, so **no test changes needed**.
I had been treating test churn as the reason it was expensive; it isn't.

Not pushed: two commits landed in that file within the hour, and a build was in flight — pushing
would cancel it, the exact anti-pattern recorded at 23:27. Full site list is on the PR thread so the
sweep can be done in one pass by whoever gets there first.

## 2026-09-04 11:07 — `0ee00ef` typecheck green; runner still under active development

`0ee00ef`: `Lint & Run Tests` success, **`Build image` success 10:59:52→11:05:34**, `Vulnerability
scanner` success. Only `Scan built image` (step 20) was cancelled at 11:06:05 by the next push, so
the job conclusion reads `cancelled` while **19 of 21 steps, including the typecheck, passed.** Same
reading trap as 23:27 — the conclusion is not the story; read the steps.

**The i18n sweep stays deferred, and that is now clearly right rather than cautious.** `c2a42a7`
(11:06) touched `TaskInstanceModal.tsx` *again*, plus `task-runner.parts.tsx` and both
`checklist-instance-service` files — so the runner is still being built, and its service types are
still moving. A sweep landing now would conflict and be partly obsolete. The full site list and the
module-scope `translate()` trap are on the PR thread, which is where they are useful.

### Session close-out for PLT-2968 / #2186

| item | state |
|---|---|
| `SCHEMA_PREVIEW = true` merge blocker | **RESOLVED** (`fb67dcc`), verified at head, thread resolved |
| Typecheck / tests / Trivy | green on the last three heads by step list |
| `setOverride` concurrency race | open by design — needs a Postgres RPC + Supabase deploy |
| Runner i18n + O(n²) numbering | open by design — one sweep once the runner settles; spec on thread |
| Sonar | 8 new issues, gate passing, unattributable without a token |
| #2186 draft status | `draft: false` against the session instruction — flagged, not reverted |
| Approvals | **still none** on #2186 or #2192; four reviewers requested on each |

Nothing further an agent can drive here without a human decision.

## 2026-09-04 11:15 — logger reuse miss (mine, fixed); two runner nits deferred

### `console.warn` → `createLogger` — FIXED (`d620568`)

Copilot flagged the `console.warn` I added in `listOverrides`. Right, and **`createLogger` from
`app/services/logService` is used in 51 files** with a module-scope
`const log = createLogger('Name')` convention. A bare `console.warn` kept the line out of the OPFS
session logs — exactly where someone asking "why does this env show no overrides" would look — and
dumped the whole error object.

Verified before pushing, since no local test run is possible:
- `createLogger` is a **pure factory**, no import-time side effects → safe at module scope in tests.
- `warn`/`error` always reach the console, so **nothing is lost from DevTools**; the session log is
  additive.
- Its OPFS append is wrapped in `void chain.catch(() => {})`, so a jsdom env without OPFS **cannot
  throw** — the three tests that hit this path need no change.
- Payload trimmed to `{ table, projectId }`: `isMissingRelation` already established the error kind.

> **This is the FOURTH reuse miss this session** (i18n `noTasks`, `isMissingRelation`, the folder's
> `labelKey` pattern, now `createLogger`). The rule I wrote at 17:42 was too narrow — "grep the
> client's error module before writing a service". **Generalised: before writing any cross-cutting
> call — logging, i18n, error mapping, formatting — grep for the app's existing helper first. The
> tell is that the thing you're about to write by hand is infrastructure, not domain logic.**

### Not fixed, deliberately

- **"Your username" label** shows `firstName lastName` (`override-readiness-modal.tsx:209-210`).
  Mismatch is real, but the copy may come from the design and the PR already carries an open
  design-questions list — reworded silently, it would be an unreviewed design change. Flagged in the
  commit message; needs the design owner.
- **O(n²) numbering, new form** at `TaskInstanceModal.tsx:762`. **My earlier advice is now obsolete
  and I said so on the thread:** the group refactor replaced `rest` with `group.items`, so the `Map`
  I proposed no longer fits, and Copilot's "carry the index through from where the visible list is
  built" is the better fix. *A superseded suggestion left standing on a thread is worse than none —
  it sends the next reader the wrong way.*
- **Orphaned JSDoc** at `checklist-instance-service.types.ts:58-69`. Two doc blocks in a row, so the
  first attaches to nothing — and `TaskColumnSupport` has since moved below `ITaskSignature`, so the
  prose now sits above the wrong interface. Worth keeping, not deleting: it records that column
  presence is inferred from the keys of fetched rows (PostgREST returns every column, so a missing
  key IS a missing column) — the reasoning that stops someone "fixing" the probe with a catalogue
  query. Location given on the thread; it should ride the author's next commit rather than earn a
  conflict for a comment move.

## 2026-09-04 11:34 — `d620568` COMPLETE clean run; PLT-2968 work is green and handed off

First fully-green, uncancelled, end-to-end run on a head carrying every fix from this session.
Verified by step list, not by the rollup: `Lint & Run Tests` 11:17:04→11:25:26, Sonar success,
**`Build image` 11:27:13→11:33:04 — ran, not skipped** — `Vulnerability scanner` and `Scan built
image` both success. Only `Download fixtures` skipped (conditional on a cache hit). All three checks
green: build, SonarCloud, Copilot reviewer.

*Why the step list still mattered here:* a job conclusion of `success` would also be reported if
`Build image` were **skipped** rather than run — the same blind spot that hid the typecheck for an
hour yesterday. Checking cost one call and is the difference between "nothing failed" and "the
typecheck passed".

### Fixes shipped this session, all CI-verified

| commit | what |
|---|---|
| `62ec0df` | asset-switch closes the ladder's modals — the wrong-write bug |
| `2c9678d` | `sx` no longer forwarded onto a DOM node in the menu stub |
| `07474a1` | missing `asset_readiness` reads as no overrides (+3 tests) |
| `d620568` | that skip logs via `createLogger`, not `console` |
| `3a494f2`, `6a19bf8` | master merged into both open PRs after #2180 landed |

### Handed off — nothing further an agent can drive

- **Approvals**: #2186 and #2192 both green, four reviewers requested each, **none approved**.
- **#2186 draft status**: `draft: false` against the session instruction — flagged, not reverted.
- **Open by design, fully specified on their threads**: the `setOverride` concurrency race (Postgres
  RPC, cross-repo, Supabase deploy); the runner i18n sweep (site list + the module-scope
  `translate()` trap + the `labelKey` pattern to reuse); the O(n²) numbering (Copilot's
  carry-the-index fix, which supersedes my earlier `Map` advice); the orphaned `TaskColumnSupport`
  JSDoc (needs moving below `ITaskSignature`, not deleting).
- **Tickets worth raising**: the i18n fallback (820 keys, one change); `tsc --noEmit` beside
  `Lint & Run Tests` so type errors surface in ~1 min rather than at step 15 of 18; postcss nanoid
  → 3.3.17; the tldraw 2.4.6 → 5.x upgrade holding two suppressed CVEs.

## 2026-09-04 17:40 — master merged again; it RESTORED a fix the branch had reverted

`#2200` (PLT-2992 hotfix: task-template item inserts omit the template id) merged to master.
Merged into PLT-2968 as **`4e1c70b`**, and this was **not** routine hygiene:

**`66e0120` on this branch had deliberately reverted its own copy of that fix** ("it ships as its
own hotfix") — correct, since shipping it twice would collide. But it means the branch had been
carrying the bug since, and **would have merged without it**. The master merge restores it from the
canonical source.

*Git reported no conflict — and that was not sufficient evidence.* Both sides had modified
`checklist-library-service.ts`, which is exactly where a clean textual merge can drop a fix. So the
merged result was checked against the hotfix's three specific changes rather than trusted:

| hotfix change | present after merge |
|---|---|
| `draftItemRows` takes `templateId: string` | yes |
| item rows carry `task_template_id: templateId` | yes |
| both call sites pass it (create + new version) | 2 of 2 |

> **Rule worth keeping: "no conflict markers" is not "the merge is correct."** When both sides
> touched the same file — especially when one side reverted something — verify the specific change
> you expect to be there, by name. Git merges text; it does not know what a fix is.

## Same window — #2192 has a second Claude session driving it

**#2192's description was rewritten by a different session** (`session_01PAGxsQHRAC6ZSXjgCp8rKg`)
and its head moved `6a19bf8` → `c6acf12`. Checked rather than assumed: **my `6a19bf8` is still an
ancestor**, `shortid` is still absent from **both** `package.json` and `package-lock.json`, and the
only new commit is that session merging master (#2200) in — the same thing I would have done. The
rewritten description also preserves the `.trivyignore` census work.

So nothing was lost, and nothing there needs me. **Recording it so a future run does not assume sole
ownership of #2192** — two sessions pushing one branch is how the collisions in this repo's history
started. It remains `mergeable_state: blocked`, Sonar 0 new issues, waiting only on a required
approval.

## 2026-09-04 17:50 — real numbering bug in `groupItems` — FIXED (`e9ca3ca`)

`groupItems` numbered a group `groups.length + (header ? 1 : 0)`. Items appearing **before any
header** build a leading group — it has to hold them — which carries no number of its own but still
lands in `groups`, so it advanced the count. **Wherever such items existed, the first HEADED group
was numbered 2 and its items read `2.1.1`.** Confirmed in both paths: `byParent` opens the loose
group via `if (loose.length > 0) open(null)`, the positional branch via `current ?? open(null)`.

Fixed with a dedicated `headed` counter — the thing `groups.length` could not express. Leading group
keeps `number: 0`, already inert because `itemNumber` renders an unheaded group's items as a bare
index.

**Pushed into an actively-moving file, unlike the O(n²) and i18n nits on the same file.** The
distinction that justified it: this produces *wrong output a user sees*, the fix is two lines, and no
restructuring is involved.

### Two checks that could each have gone the other way

**1. Did the suite encode the bug?** It asserts `1.1.2` and `2.1.1`. If those described a *first*
headed group, the fix would have had to change them — the signature of a test written around a
defect (exactly what happened with `'1/1 tasks'` yesterday). **It didn't:** the `GROUPED` fixture
opens with a header and gives every item a `parentItemId`, so no leading group is built and
`groups.length` coincidentally agrees. Those assertions describe a genuine second group and are
untouched. *Read the fixture before concluding either way — the same assertion text can mean
"correct" or "bug enshrined".*

**2. My own new test was initially worthless.** I first wrote
`expect(getByTestId('task-group-h1')).toHaveTextContent('1')`, mirroring the suite's style. But the
header also renders an item count, so with one item in the group **that assertion passes off the
"(1)" even with the number wrong** — a regression test that proves nothing. Changed to assert
`1.1.1` on the *item*, which cannot pass with the bug present.

> **Rule: for an off-by-one, assert on a value that changes when the bug is present.** A substring
> assertion against a string that contains other numbers is not a test, it is decoration. Ask "would
> this fail on the unfixed code?" — and if you cannot answer yes immediately, it wouldn't.

## 2026-09-04 18:07 — `e9ca3ca` fully green: numbering fix + master merge verified

Complete uncancelled run, verified by step list: `Lint & Run Tests` 17:49:34→17:58:22, Sonar
success, **`Build image` 18:00:14→18:06:08 (ran, not skipped)**, `Vulnerability scanner` and `Scan
built image` success. All three checks green. Sonar steady at 8 new issues.

Two things this confirms specifically, beyond "it's green":
- **The existing `1.1.2` / `2.1.1` assertions still pass** — evidence for the reading that they
  describe a genuine second headed group, rather than the bug enshrined. Had that reading been
  wrong, this step would have gone red.
- **The new leading-group test passes**, so the fix corrects the case it was written for.

`4e1c70b` (master merge restoring the #2200 hotfix) is inside this head, so that is verified too.

### Cumulative session tally on #2186 — all CI-verified

`62ec0df` asset-switch wrong-write · `2c9678d` `sx`-on-DOM stub · `07474a1` missing-relation read
(+3 tests) · `d620568` `createLogger` reuse · `3a494f2` + `4e1c70b` master merges (the second
restoring a reverted hotfix) · `e9ca3ca` `groupItems` numbering (+1 test).

Still open by design and specified on their threads: `setOverride` race, runner i18n sweep, O(n²)
numbering, orphaned JSDoc. Still waiting on humans: approvals on #2186 and #2192, and the #2186
draft-status decision.

## 2026-09-05 08:10 — all three deferred items closed by another session, using the published analysis

`a9baf04` ("close the three open review threads on #2186") — pushed by a **different session** under
the same author identity — closes every item I deferred rather than raced. **Verified rather than
taken on trust:**

| item | verification at head |
|---|---|
| runner i18n | `FILTERS` carries `labelKey`, and **zero `translate()` calls inside any module-level const** — the freeze-at-import trap avoided |
| O(n²) numbering | `indexOf(item)` gone (0 occurrences); `.map((item, index) => ({ item, index }))` at 755 → `number={itemNumber(group, index)}` at 776 — index carried through the filter, so numbering still means the item's real place |
| orphaned JSDoc | block at 75 now sits directly on `TaskColumnSupport` (87); `ITaskSignature` (65) has its own at 58 |

**This validates the deferral, and is worth keeping as a practice.** Three times I declined to patch
a file another actor was rewriting, and instead published on the thread: the exact site list, the
module-scope `translate()` trap, the `labelKey` pattern to reuse, and why `position` was NOT
equivalent to the index. The other session then implemented all three *correctly and in one commit* —
their own comments cite the `position` reasoning explicitly ("done your way rather than mine"). Had I
raced the edits I would have bought merge conflicts in a file taking a commit every few minutes, and
delivered no more.

> **Specify, don't race, when another actor owns the file — but specify completely.** A deferral is
> only legitimate if it leaves behind everything needed to do the work: locations, the trap, the
> pattern to reuse, and the rejected alternative with its reason. "Worth a follow-up" is a punt;
> this was not.

### Also recorded: a false zero I nearly reported as verification

While checking, a `git show | grep -c` returned **"indexOf occurrences: 0"** — but the `cd` had not
persisted and git had errored with `fatal: not a git repository`. The count was zero because the
pipeline produced nothing, not because the code was clean. Re-run from the right directory it was
genuinely 0, so the conclusion held — **but it held by luck**. Same shape as the SonarCloud
`{"total":0}` on a private project (17:53 on 09-03). *A zero from a pipeline whose first stage failed
is not evidence. Check the command succeeded before believing its count.*

## 2026-09-05 09:1x — the two schema-gating findings on #2186, and why the write path was the gap

Two Copilot findings on `checklist-library-service.ts` (threads `…fh0DU` at :102, `…fh0Df` at :203)
turned out to be the **same defect stated twice**, and both were right.

**The defect.** `task_template.requires_sign_off` and `task_item.section_type` are newer than the
tables they sit on. The evidence they may be absent is *in the file itself*: both row interfaces mark
them optional (`requires_sign_off?`, `section_type?` with the comment "Absent until the migration
that adds it"), and `rowToItem` already guards the read (`if (row.section_type)`). But every WRITE
sent them unconditionally. PostgREST rejects a payload naming a column the table does not have
(`PGRST204`), so on an environment behind on the migration **template create and edit failed
outright** — a broken feature, not a degraded one, even though every other field in the payload was
storable.

**Why "just confirm the migration is promoted" was not available.** Copilot's option (1). The only
promotion evidence in reach is `fb67dcc`'s message — *"xyz-supabase#23 is applied **on dev**"* — and
`data-layer.md` records `dev` and `stable` as **two separate databases**, with the census (12 Aug,
table-level only) predating that migration. The `xyz-supabase` repo is outside this session's access
scope, so column-level parity on `stable` is unknowable from here. Same caveat already flagged on the
SCHEMA_PREVIEW thread on 09-04. So option (2), gating, was the only one I could actually deliver.

**The design, and the alternative rejected.** Not the `columnPresent` probe
`ChecklistInstanceService` uses (`checklist-instance-service.ts:180`) — that reads the column list
off a row already fetched, and **a create has no row to judge by**. On an empty project the probe
returns "column absent" and silently discards a value the database *could* hold. So: write
optimistically, and on `isMissingColumn` write again without the column
(`withOptionalColumn` in `checklist-library-service.ts`). Zero extra requests wherever the column
exists — which is `dev` today and everywhere post-migration — and one extra round-trip where it
doesn't.

`isMissingColumn` is new, added beside `isMissingRelation` in `commissioning-request-error.ts`
(`PGRST204` / Postgres `42703`), matched **by code only** for the same reason the table predicate is:
a bare 400 is some other rejection (constraint, bad filter, unparseable body) and must stay fatal.

**The trade-off a reviewer should push back on if they disagree:** the degrade *silently loses* the
ticked "requires sign-off" — it writes, it's dropped, it reads back false. A `log.warn` is the only
trace. I took that over failing the save because the read path can't surface the flag on such an
environment anyway, and because it is the house posture already (`isMissingRelation` → "read as no
overrides"). Stated on the threads so it can be argued with rather than discovered.

### The reusable bit

> **When a row shape marks a column optional, check the WRITE path too.** Both interfaces here
> already said the column might be absent, and the read path already coped. The gap was that
> "optional" had been applied to the type and to reads and never to the payload — which is the one
> place absence is fatal rather than merely empty.

### Same session, one more of the same shape: `listSignatures`

A third finding landed while the above was being written, and it is the identical defect a third
time: `ChecklistInstanceService.listSignatures` read `task_execution_signature` with no
`isMissingRelation` guard, while `AssetReadinessService.listOverrides` has had one for its own table
since PLT-2968. **This one was worse than it looks**: `TaskInstanceModal` calls `useTaskSignatures`
on *every* open, so a missing signature table did not cost you sign-off history — it took down the
whole task runner, over history that environment cannot have yet.

Fixed in `ba31e80` with the same reading (`[]` + `log.warn`). **Reads only** — `addSignature` still
throws, and the comment at the catch says why, so nobody "finishes the job" by degrading the write:
a signature that cannot be stored must not look as though it was. That line — degrade the read,
never the write — is the one that also separates this from the column case, where the row still
lands and only the new field drops.

Three findings in one review, all the same shape. Worth a sweep of every commissioning read/write
against the "is this table/column newer than what it sits on?" question rather than waiting for the
next review to find the fourth.

### Verification note: how these were actually run

`npm ci` is impossible here (`@xyzreality/dhtmlx-gantt` on npm.pkg.github.com → 401). Workaround that
worked: install into the scratchpad with the `@xyzreality/*` deps stripped and no lockfile, then
symlink `node_modules` into the repo. **Two traps found doing it:**

1. `node_modules` is **not** in this repo's `.gitignore` — the symlink showed up as untracked in
   `git status`. A `git add -A` would have committed it. Staged explicit paths instead and removed
   the link before committing.
2. A whole-project `tsc --noEmit` returned **237 errors** — all pre-existing noise from the unpinned
   install resolving different styled-components/styled-system type versions than the lockfile, and
   the same mismatch fails unrelated component suites. *So the whole-project signal is worthless in
   this setup;* filtering to the touched paths (clean) and running the service suites (417 pass, 29
   files) is the real one. Do not read a red full-suite here as a repo problem.

## 2026-09-05 09:3x — the precondition vocabulary bug (the most serious finding of the review round)

Fourth finding of the same review round, and the only one that broke user-visible behaviour outright
rather than only on an un-migrated environment.

**The defect.** `ChecklistCreatePage.addPrecondition` creates preconditions as `passFailNa` items
("A precondition is a thing you confirm, so it is a pass/fail/N-A item"). The runner's precondition
panel confirmed one by writing `ITEM_COMPLETE` (`'complete'`). But `isItemComplete`
(`task-status.tsx:155`) accepts `'complete'` only for *non*-`passFailNa` types; a `passFailNa` item is
complete only on `pass|fail|na`.

The two halves of the UI then disagreed:
- `isAnswered` is just `status !== 'incomplete'`, so the panel lit the confirm button green, counted
  it in `n/m confirmed`, and **unlocked the test steps** — everything looked right;
- `deriveInstanceStatus` filtered the same item as an unanswered response item and returned
  `inProgress`.

So **a task carrying any precondition could never reach `completed` / `pass` / `signedOff`**, however
much was answered — and `TaskInstanceModal`'s self-heal wrote `inProgress` back to the stored status
on every open. Because a readiness tag is achieved only when every instance on it is complete, the
tag could never be achieved either. That is the whole PLT-2967/2968 feature dead-ended by one
vocabulary mismatch.

**The fix, and why not the other option offered.** The reviewer offered (a) toggle to `'pass'`, or
(b) author preconditions as a non-passFail type. **(b) fixes only new templates** — existing ones keep
their `passFailNa` preconditions and the runner would go on writing `complete` onto them. (a) fixes
both, so (a).

One refinement on (a) though: **not a flat `'pass'`**. The panel renders whatever sits under a
`PRECONDITIONS` header, which need not be `passFailNa` — an `inputField` precondition would then break
the other way. So `confirmedStatusFor(type)` (`pass` for `passFailNa`, `complete` otherwise), placed
directly beside `isItemComplete` as its documented inverse so the two cannot drift apart again.

### The bit worth keeping

> **A test was asserting the bug, and its own name said so.** The existing case read *"confirming is
> answering: the confirmation saves as the item it is"* and asserted `status: 'complete'` — the exact
> thing it claimed to check was the thing it was getting wrong. A test name that describes the right
> contract is not evidence the assertion encodes it.

> **Positive control before believing a regression test.** Both new tests were run against the
> *unfixed* line first (2 failed / 52 passed) before being trusted. The third — the toggle-back
> path — passes either way and was kept knowingly, as a guard rather than a bug-catcher. Same
> discipline as the `groupItems` numbering test on 09-04, where the obvious assertion would have
> passed with the bug present.

Four findings, one review round, three of them the same "two representations of the same fact allowed
to disagree" shape: type says optional / write says required (×2), panel says confirmed / derivation
says unanswered. Worth a deliberate sweep for the pattern rather than waiting for a fifth.

## 2026-09-05 09:5x — I was wrong about #2205, and the way I was wrong is the lesson

**Correction, publicly posted on #2205 and on the #2186 Dockerfile thread.** Earlier today I wrote,
in this file and on a PR thread, that the libuuid upgrade "cleared all seven findings" and that
#2205's green `Scan built image` proved it. **It does not, and it did not.**

### The facts, verified directly

`apk --no-cache upgrade libuuid` upgrades **nothing** in this image:

| branch | libuuid / util-linux / libblkid / libmount |
|---|---|
| **v3.24** (image is `alpine 3.24.1`) | **2.42.1-r0** — the only version published |
| edge | 2.42.3-r0 |

Two independent lines of evidence agree: the v3.24 `APKINDEX` has no 2.42.3-r0 to install, **and** the
Trivy scan of the built image reports `2.42.1-r0` *installed* after the RUN line has executed. The
image is unchanged by the line.

**Why Trivy flags it anyway, and why `ignore-unfixed: true` doesn't cover it.** Alpine's *v3.24
secdb* already carries the advisory — `util-linux -> {'2.42.3-r0': [CVE-2026-53612, -53614,
-78410, …]}` — published **ahead of the package**. Trivy reads secdb, sees a fixed version, sees
2.42.1-r0 installed, reports `Status: fixed`. apk reads the index and finds nothing newer. Advisory
says fixed; repo says nothing to install.

**Why #2205 went green.** Date-keyed Trivy DB cache. #2205's run: `Cache hit occurred on the primary
key cache-trivy-2026-09-05` (snapshot saved before the advisory landed). #2186's run 30 minutes
later: `Cache hit for restore-key: cache-trivy-2026-09-04` → `Need to update DB` → downloaded a fresh
110.94 MiB DB → 7 HIGH. **Same Dockerfile, same base image, opposite verdicts, decided entirely by
which DB snapshot the cache handed back.** (Index and secdb: verified. This last step: inference from
the two logs — but nothing else differs.)

### The lesson, which is not "check alpine versions"

> **A green check proves the check passed. It does not prove your change is why.** I had a
> *mechanism* claim ("upgrading libuuid removes these findings") and I accepted a *correlation*
> (the job went green after I changed that line) as proof of it. The scanner's Library column told
> me which package was being flagged; I read it as also telling me a fixed version was installable.
> Those are two different facts and I merged them.

The tell was available and I walked past it: **I wrote the disproof myself.** #2205's description
says *"if the scan is still red on this PR, the index hasn't caught up and the answer is a base-image
bump instead."* I had the failure mode exactly right, then treated one green run as having ruled it
out — when a single green run is precisely what a stale-DB false negative looks like.

> **Corollary, for CI evidence specifically: a date-keyed cache makes two runs of the same commit
> non-comparable.** Before concluding anything from "it passed here and failed there", check whether
> the two runs used the same scanner DB / fixture / index snapshot. Here the entire difference was a
> cache key.

### Where it stands

#2205 moved back to **draft** and retitled `[does not work — see comment]`, so nobody approves a
no-op described as unblocking the repo. Three options written up on it: wait for v3.24 to publish
(line starts working with no code change); time-boxed `.trivyignore` for the seven CVEs (**this is
the nanoid "no reachable fix" case after all — the exact bar that file already sets, and the opposite
of what I argued in the description**); or bump `xyz-base-nginx`, which is `hc-infrastructure` and
outside this session's repo scope. Did **not** push the suppression: seven HIGH CVEs is a person's
call.

Mitigating fact for whoever decides: the runtime ships only `libuuid`, no `mount`/`nsenter` binaries,
so real exploitability is ~nil — which also makes this a candidate for a VEX statement rather than an
ignore list.

**PLT-2968 / #2186 is red on this repo-wide blocker, not on its own diff** — its lint, full test
suite and image build all passed.

## 2026-09-06 07:5x — alpine v3.24 published the fix; the "wait it out" option resolved itself

**`v3.24` now ships `libuuid` / `util-linux` `2.42.3-r1`** (verified against the live APKINDEX this
morning), past the `2.42.3-r0` the secdb advisory names. Yesterday it was `2.42.1-r0` with the fix
only in edge.

So the advisory-ahead-of-repo window closed overnight, which is **option 1 from the #2205 write-up
resolving on its own**: `apk --no-cache upgrade libuuid` now has something to install, and the line
in #2205 / PLT-2968 becomes effective with no code change. The `.trivyignore` suppression (option 2)
is no longer needed and should NOT be applied — good outcome from not having pushed it unilaterally
yesterday.

A `build` re-run of the same workflow run (`33958155116`) was started at 07:41 on the unchanged
commit. Whatever it returns is informative: green means the fresh `apk` index carried the new
package; still-red would mean a BuildKit layer cache served the pre-fix layer.

**Do not repeat yesterday's mistake in the other direction:** if it goes green, that is only
attributable to the alpine publication *because the index change was verified independently first*.
The green alone still proves nothing about mechanism — check that the scan no longer lists `libuuid`
at all, rather than inferring it.

Also now stale and needing a touch-up before merge: the Dockerfile comment says `2.42.1-r0 ->
2.42.3-r0` (actual is `2.42.3-r1`) and asserts "the fixed version is already in alpine" — true today,
was false when written.

### 08:00 — #2186 is fully green, and what the green does / does not prove

Re-run of the unchanged `2b5c046` completed 08:00: every step green, `Scan built image` included
(07:59:51→08:00:11), on a real 6.7-minute `Build image`.

**Guarding against the mirror of yesterday's error.** The log shows `Cache saved with key:
cache-trivy-2026-09-06` — no same-day cache existed, so it downloaded a *current* DB before scanning.
That rules out "passed because the DB was stale", which is the failure mode that produced the false
green on #2205 yesterday. Combined with the independently-verified index change, the mechanism holds.

**What is still not provable from here:** whether the clean image is because the apk line installed
2.42.3-r1, or because `xyz-base-nginx` was rebuilt overnight and already carries the fix (making the
line a harmless no-op). Both give the same result. The next master push decides it, since master does
not carry these lines. *Stated as unknown on the PR rather than asserted either way* — the whole
lesson of yesterday.

**No code change was needed anywhere.** Also: the reworded Dockerfile comment says "the fixed version
is already in alpine", which was false when written and is true today — so it needs no touch-up, and
re-running CI on a green PR to change `2.42.3-r0` to `-r1` in a comment would cost more than it's
worth.

### The `.trivyignore` that never got written

Option 2 — suppressing the seven HIGH CVEs — would have been live in the repo for roughly **18
hours** before becoming both unnecessary and wrong, left for someone to notice and remove.

> **When a scanner blocks everything and a suppression looks like the pragmatic call, the question is
> "how long is this window?", not "how do I get green now?".** An advisory published ahead of its
> package is a window measured in hours, not a permanent state. Escalating and waiting cost one day
> of red CI; suppressing would have cost a stale security exception of unknown lifetime. The
> instinct to not push a security suppression on my own judgement was right for a better reason than
> I had at the time.

## 2026-09-08 07:5x — #2205 answered by experiment; and a review finding whose premise didn't exist

### #2205 should be CLOSED, not merged — the base image caught up

The question I flagged on 09-06 as unresolvable ("is the clean image from the apk line, or from a
rebuilt base?") got answered for free, by a natural experiment already running:

**#2192's branch does NOT carry `RUN apk --no-cache upgrade libuuid`** (it is based on master, which
never had it). Its build passed on 09-07 with a real 6-minute `Build image` (08:03:44→08:09:42) and
**`Scan built image` green** (08:10:16→08:10:34).

So an image built from master's Dockerfile, with no libuuid upgrade line at all, now scans clean →
**the base image `xyz-base-nginx:latest` carries the fix itself**, exactly as the Dockerfile comment
anticipated ("drop once the base image catches up"). #2205's line is now a no-op. Recommend closing
it rather than merging.

**And this pass is not another stale-DB artefact** — I checked, having been burned once. The Trivy DB
cache in play was `cache-trivy-2026-09-06` or newer, and that DB provably *contains* the libuuid
advisory: it is the same DB that failed #2186 on 09-05/06. A clean scan against a DB that holds the
advisory can only mean the installed package is fixed.

> **The cheapest way to answer "which of two causes was it?" is often a run already in flight for
> another reason.** No extra CI, no extra push: one branch happened to differ in exactly the one
> variable in question. Look for that before declaring something unknowable.

### The `projectId` logging finding: the cited policy does not exist

Copilot flagged both of my `isMissingRelation` degrade warnings for logging `projectId`, "per the
session-logging guidance". **I could not find any such guidance** — no hits in `docs/`, `.claude/`,
`CLAUDE.md`, or `logService/`.

What the log service *does* have is an enumerated redaction policy, and it is narrow and deliberate:
`redactPathKeys` (`log-utils.ts:60`) strips **invite / reset-finish secret tokens** from URLs, and
`maskEmail` masks **emails**. Credentials and personal identifiers. Project ids are not on the list —
and are logged at info/warn from ~10 existing sites into these same OPFS logs (`PortfolioPage` ×3,
`duckdb-service`, `opfs-cache-manager` ×3 incl. a `warn`, `ProjectInviteCompletePage`).

Declined, with the evidence, and named the two things that would change my mind (a written policy
elsewhere, e.g. Confluence, which a grep can't see; or a decision that project ids *are*
tenant-identifying here — in which case the fix is repo-wide plus a `redactProjectId` helper, not two
lines).

> **A review bot citing a policy is not evidence the policy exists.** Check for it before complying:
> the cost of complying wrongly here would have been ~10 call sites made inconsistent and the one
> genuinely diagnostic field removed from a degrade warning whose whole purpose is to say *which*
> environment is behind.

### Also fixed: "Task steps" persisted under a section titled "Task items" (`4bb7aa3`)

`SECTION_LABELS.TEST_STEPS` was `'Task steps'`, but the label is **persisted** and the runner renders
a group by its stored label — and `splitBySection` drops only the PRECONDITIONS header, so the
TEST_STEPS one renders *inside* a section `TaskInstanceModal` titles "Task items". Users saw a group
"Task steps" nested under "Task items". "Task items" is the settled term (page heading, page
docstring, runner section title); the persisted string was the outlier.

> **The existing test could never have caught it.** It asserted the same constant the source writes,
> so both moved together. The mismatch lived *across two files*. Added a case that compares the
> persisted label to the i18n heading directly — and verified it fails on drift before trusting it.

*Caveat recorded on the PR:* only newly written headers change; stored rows keep "Task steps".
`splitDefinition` routes on `sectionType`, not the label, so old templates still edit fine. The
deeper fix (render the title from `sectionType`, never persist display copy) would fix existing rows
and allow localisation, but changes rendering for user-authored headers too — flagged for a decision,
not done.

### 08:0x — #2205's whole delta is the dead line; and a stale local ref nearly misled me

Verified against current master (`c7c96b0`): **#2205's entire delta is `Dockerfile`, 12 insertions** —
the no-op `RUN apk --no-cache upgrade libuuid` and its comment. Nothing else. Posted a correction on
the PR, because my 09-06 comment had offered "merge it to protect master" as a legitimate option and
that is now known to be pointless; leaving it would invite someone to merge a no-op on my own earlier
advice.

Both #2186 and #2192 have also had master merged in by the parallel session, and both merges verified
clean in **both** directions (my files byte-identical across the merge; master's files intact; zero
overlap between the two sets, which is *why* it was clean rather than luck holding).

> **Check your local refs before believing a diff.** `git diff origin/master...branch` reported **9
> changed files** for #2205 and I nearly wrote that down. The branch had been fetched; `origin/master`
> had not, so the merge base was stale by two commits and master's own newer work showed up as the
> branch's. After `git fetch origin master` the real answer was one file. The tell was that the number
> looked wrong for a branch whose only purpose is one Dockerfile line — *the sanity check on a
> surprising diff is the refs, not the diff.* Third instance of this family in this run, after the
> false `grep -c` zero and the SonarCloud `{"total":0}` on a private project.

## 2026-09-09 07:5x — the setOverride race is a storage-model mismatch, not a locking problem

The parallel session added a good analysis on the `setOverride` thread, ruling out the three obvious
client-side fixes. **Verified its two load-bearing claims rather than trusting them, and both hold:**

- `asset-readiness-service.test.ts:43` is genuinely `it('never writes is_achieved')`, asserting
  `'is_achieved' in row === false` at :46 and :78, under a comment calling the written columns "a
  deliberate, closed set". So the whole-ladder upsert would break a *pinned* invariant — its inserts
  would materialise `is_achieved` at the DB default and make this service the owner of a column it
  deliberately never writes.
- The client filter union really is `eq | in | is` only (`commissioning-data-client.types.ts:21-23`),
  so a negated predicate needs the client extended — **and would not fix the race anyway**, since the
  predicate still encodes one writer's intent.

### What I added: the root cause, not a fourth workaround

This PR's own description states the domain rule — **one override per asset**, expressed across
levels. But it is **stored as N rows, one per readiness step**. So one logical write ("override this
asset to Yellow") must touch N rows, and N rows cannot be written atomically without a transaction or
a function. *The race is the inevitable consequence of storing one fact in many rows.*

Store it as one row per asset naming the target level, and derive the per-step ladder at read time:
one upsert on one row, last writer wins by definition, no read-modify-write, no RPC — and the
`is_achieved` problem disappears rather than being worked around, because no step rows need
materialising at all.

> **When every available fix for a race is a locking mechanism, check whether the race is really a
> normalisation bug.** Three workarounds were evaluated and rejected on their own terms before anyone
> asked why a single logical fact required N writes. The schema is the thing making atomicity
> expensive here.

Recorded on the thread as the option the follow-up should weigh *against* "add a Postgres function",
since only this one makes the defect impossible rather than serialised. Thread stays **open** — a
real defect being carried forward, and the thread is the only place that is visible.

### Correction: I posted that analysis on the wrong thread first

The root-cause comment above went onto the **`useAssetReadiness.ts` hook-tests thread**
(`3906622631`) instead of the `setOverride` race thread (`3927007011`). Reposted on the right one and
left a one-line pointer on the wrong one.

**The galling part: that same thread already contained a "Wrong anchor — replying on the right
thread" note from 09-02.** So this is the second time a reply has landed on that exact thread by
mistake, and I had read its history earlier in this run.

> **`add_reply_to_pull_request_comment` takes a comment id, and a comment id carries no visible hint
> of which thread it belongs to.** `3906622631` and `3927007011` look equally plausible. The only
> safe habit is to re-read the target comment's `path` immediately before replying, not to trust an
> id copied from an earlier listing — the listing that produced it may have been for a different
> thread entirely. The wake notification's own `file` field is what caught it, after the fact.

## 2026-09-09 07:5x — two more findings; the libuuid layer is now DELETED from #2186

**"Your username" labelling a display name** (`override-readiness-modal.tsx:209`). The value is
`` `${firstName} ${lastName}`.trim() `` — and that same string is what persists as `modifiedBy`. On a
dialog that records who authorised a safety-relevant override, calling it a "username" invites
reading it as an auditable login identity. Fixed by making the label follow the value: **"Your
name"**, key renamed `overrideUsernameLabel` → `overrideUserLabel` so the key doesn't keep the lie.
Checked first: not in the `tr` bundle (whole `assetDetail` block untranslated → nothing orphaned) and
the tests assert the `-value` testid, not the label. 515 assets-panel tests green.

Declined the reviewer's *other* option (show a real username): there is no username on the account
object, and inventing one for an audit field changes what the override records — product decision,
not a copy fix.

### The libuuid layer is gone from #2186, not reworded

The reviewer asked me to reword the comment because an unpinned `apk upgrade` cannot promise
`2.42.1-r0 -> 2.42.3-r0`. Right — and **the comment had gone wrong twice over**: alpine v3.24 has
since published `2.42.3-r1` (not r0), and its claim that the base image hadn't caught up is now false
too.

So instead of rewording a comment on a dead layer, **the layer is deleted** (`c0bbbfe`). Justified by
the #2192 experiment (see 09-08 entry). **The Dockerfile on PLT-2968 is now byte-identical to
master's** — verified by `diff` — so this PR no longer diverges from master on image hardening at
all. #2205 remains unmerged if it is ever needed again.

> **A comment that states a prediction as a fact will rot silently.** "2.42.1-r0 -> 2.42.3-r0"
> described what an unpinned upgrade *would* land on; nothing fails when that stops being true. The
> `libssl3`/`libcrypto3` line above has exactly the same shape and was left alone because it is still
> doing real work — but its version numbers are the part to drop if it is ever touched.

> **The right answer to "reword this misleading comment" can be "delete the code it describes".**
> Twice now on this PR the reviewer asked for a wording change and the real defect was underneath it
> (the `SECTION_LABELS` copy was a persisted-value bug; this was a dead layer). Worth asking what the
> comment is defending before improving its prose.

### Process note: checked the comment `path` before replying this time

After yesterday's wrong-thread reply, I fetched both target comments and confirmed `3965943058` →
`i18n/en/main.json` and `3965943131` → `Dockerfile` *before* posting. The habit works; it cost one
extra read.

## 2026-09-09 08:1x — the fourth repo-wide Trivy blocker: js-yaml CVE-2026-84375

`Vulnerability scanner` (step 19, the **npm/fs** scan — not the image scan) went red on #2192:

```
package-lock.json (npm)   js-yaml 4.3.1 → fixed 4.3.2   CVE-2026-84375 (HIGH, DoS in YAML parsing)
```

Fresh DB immediately beforehand (`[vulndb] Need to update DB`, 112 MiB download). Fourth instance of
this shape: nanoid 09-02, libuuid 09-05, this now.

**Ruled out that it was #2192's own doing**, which mattered because #2192 is the PR that *rewrites*
`.trivyignore`: its delta is three files and only **removes** dependencies, and its suppressed-id set
is **identical** to master's (compared sorted id lists — 21 each, no adds, no drops).

### A hotfix already existed — checked before opening one

**#2209** (`Force js-yaml 4.3.2`), opened by the parallel session ~8 minutes earlier. The standing
instruction is to open a hotfix PR for a global build failure *while avoiding a duplicate*; the check
is what made the difference between helping and forking the fix.

**What I contributed instead: verified its hand-edited lockfile against `registry.npmjs.org`.**
Integrity hash character-identical, `resolved` correct, and — the part that makes a hand-edit *safe*
rather than merely plausible — `dependencies` identical between 4.3.1 and 4.3.2 (`argparse ^2.0.1`),
so no new transitive entry is needed and the tree does not restructure. A wrong hash fails late, at
`Install dependencies`, after a runner is spent.

### Declined to port the fix into #2192, against the usual rule

The reason porting an existing fix into a red PR is normally free is that it **no-ops** once the base
carries it. **That is true of source edits and false of lockfiles.** #2192 already edits
`package-lock.json`, and #2209 edits the same `node_modules/js-yaml` node — porting would *guarantee*
a textual conflict for whichever merges second, in the file where hand-resolving is most dangerous.

> **"Port the fix so the PR goes green" has a file-type exception.** For a lockfile, port ⇒ conflict,
> not no-op. Merge the hotfix first and let the feature branch pick it up from master.

### My own error this round, caught before it went anywhere load-bearing

I claimed `js-yaml` was a **direct dependency** at `package.json:313`. It is **only** in `overrides` —
`dependencies`, `devDependencies`, `resolutions`, `peerDependencies` all have no entry. I had grepped
`'"js-yaml"'`, got a line number, and assumed the enclosing block.

> **A grep hit gives you a line, not a structure.** Third time this run that a bare
> grep/diff has produced an unverified structural claim (the false `grep -c` zero; the stale-master
> 9-file diff; this). For JSON, parse it — `python3 -c "json.load(...)"` and check the actual key —
> rather than inferring the block from a line number.

## 2026-09-09 16:12 — #2205 CLOSED without merging. Loop closed cleanly.

Someone acted on the recommendation. Verified the repo is left uniform rather than assuming it:
`master` has no `upgrade libuuid` line, `PLT-2968` has none (removed in `c0bbbfee`), and the two
Dockerfiles are now **identical**. Nothing anywhere still carries the dead layer, and nothing was
left needing a port.

Unsubscribed from #2205 by the harness; per its notice, not to be reopened and no replacement PR.

### The arc, worth keeping as one story

1. **09-05** — 7 HIGH libuuid CVEs blocked every build. Opened #2205 with `apk upgrade libuuid`, and
   claimed its green scan proved it worked.
2. **09-06** — **that claim was wrong.** Alpine v3.24 had no fixed package (only edge did), so the
   command was a no-op; the green came from a stale date-keyed Trivy DB. Corrected publicly, moved
   #2205 to draft, retitled it, and put three options to the team rather than pushing a
   `.trivyignore` suppression on my own judgement.
3. **09-06, later** — alpine published `2.42.3-r1`. Option 1 ("wait") resolved itself. **The
   suppression I nearly pushed would have been live ~18 hours before becoming both unnecessary and
   wrong.**
4. **09-08** — a natural experiment already in flight settled the remaining question: #2192's branch
   has no libuuid line and its image scanned clean → the **base image** carries the fix → #2205 was
   redundant. Recommended closure.
5. **09-09** — removed the dead layer from #2186 too (a reviewer had asked me to *reword* its
   misleading comment; the right answer was to delete the code the comment described), leaving
   #2186's Dockerfile identical to master's. Then closed the loop here.

> **The load-bearing decision was refusing to suppress on my own judgement at step 2.** Every later
> step vindicated waiting, and none of them were foreseeable at the time. What made waiting safe was
> not prescience but *saying plainly what I could and could not verify*, and putting the options in
> front of a person.

## 2026-09-09 16:2x–16:3x — resolved: #2192 MERGED, blocker cleared, #2205 closed

Four things landed within twenty minutes, and the sequence matters:

| time | event |
|---|---|
| 16:12 | **#2205 closed** without merging — the recommendation acted on |
| 16:19 | **#2209 closed** without merging |
| 16:29 | **#2192 approved** by DarminderA ("following discussion with Ilia") and **merged** — master tip `ed60719` |
| 16:22 | #2186 had master merged in (`87c1386`), carrying `js-yaml ^4.3.2`; build running |

**master now has `overrides: js-yaml ^4.3.2` and lock `4.3.2`** — verified directly. The repo-wide
blocker is gone, and #2192's shortid removal is on master.

### The resolution took the path I argued against, and it was the better one

I declined to port #2209's js-yaml fix into #2192 on the grounds that porting a **lockfile** edit
guarantees a textual conflict for whichever PR merges second — unlike a source edit, which no-ops.
What actually happened: the fix was folded **into** #2192, #2209 was closed as redundant, and #2192
merged carrying both. One PR instead of two, and the conflict I was avoiding never existed *because
#2209 never merged*.

> **The conflict risk was real; my conclusion from it was too conservative.** "Port ⇒ conflict" holds
> only if *both* PRs land. Folding the hotfix into an already-approved PR and closing the hotfix
> removes the second lander — which is strictly simpler than sequencing two merges. Next time the
> options are "port into the feature PR" vs "merge the hotfix first", the third option —
> **port and close the hotfix** — deserves to be on the list.

Not a wrong call (it avoided a genuine failure mode) but a narrower reading of the options than the
situation allowed.

### Still open

- **#2186** — build in flight on `87c1386`. This is the run that finally exercises **step 20 `Scan
  built image`**, which has been *skipped* on every run since `c0bbbfee` removed the libuuid layer —
  so the claim "this image scans clean without the layer" gets its first direct test here. Flagged as
  unproven on the PR; about to be resolved either way.
- #2186 still needs human approval. Two threads open by design (the `setOverride` normalisation
  question; the `requires_sign_off` degrade preference).

## 2026-09-09 (late) — step 20 passed, and the branch head caught up with master

### The unproven claim is now proven

The `87c1386` build completed **green on every step**, including the two that mattered:

- **step 19 `Vulnerability scanner`** ✅ (16:41:37 → 16:42:05) — js-yaml cleared.
- **step 20 `Scan built image`** ✅ (16:42:05 → 16:42:24) — **the decisive one.** It had been
  *skipped* on every run since `c0bbbfee` removed the libuuid layer, so "this image scans clean
  without the layer" was inference. It is now a direct observation on a real build.

That closes the caveat left on the PR earlier in the day. Confirmation posted as comment
`5605454007`.

### Merged master in — and the reason was better than routine hygiene

Superseding the "Still open" note above: `origin/master` had moved to `ed60719` (#2192, *Drop
shortid, an unused dependency holding a vulnerable nanoid in the tree*), leaving PLT-2968 one commit
behind. Merged it as `beed07e`.

The non-obvious part, and worth carrying forward:

> **A green PR check does not mean the branch head is clean.** PR CI builds the **merge commit**, not
> the head. #2186's scans were green because the merge commit already had master's `shortid`
> removal — while `origin/PLT-2968` itself still carried `shortid 2.2.16` and, under it,
> `shortid/node_modules/nanoid 2.1.11`, the third and most vulnerable nanoid copy. Green CI, dirty
> head. Merging master in is what made the two agree.

This is the same shape as the 09-05 libuuid mistake (*a green check proves the check passed, not
that your change is why*), arriving from the opposite direction: there the green was stale, here the
green was real but about a different tree than the one I was reasoning over.

Merge specifics, verified before pushing:
- Clean automatic merge, **no conflicts**. Exactly 3 files, all of them master's: `package.json`
  (−`shortid`, −`@types/shortid`), `package-lock.json` (−24 lines), `.trivyignore` (nanoid census
  rewritten around the removal).
- `git grep shortid -- src webpack scripts test` → **no hits**, so nothing on this branch imported
  the dependency master dropped as unused. Checked *before* merging, not after.
- Nothing this branch owns moved: `Dockerfile` still byte-identical to master's, `js-yaml ^4.3.2`
  override intact, lockfile parses (2206 packages).
- **No human approval existed to lose** — all 25 reviews on the PR are Copilot's or my own replies,
  so the push cost nothing. Checked first; the answer is what made the merge free.

### Review threads: 0 open

Superseding "Two threads open by design" above — that was true when written; it is not now.
**All 32 review threads on #2186 are resolved** (`is_resolved: true`, 32/32; 20 also outdated).
The two design concerns behind those threads still stand as *things a reviewer should weigh*, they
just no longer sit as open threads:

1. **`setOverride` concurrency race** — structural, not a locking bug. One logical fact (one override
   per asset) stored as N rows means N writes. The fix is normalisation — one row per asset, ladder
   derived at read time — which makes the race impossible rather than serialised. Carried-forward
   defect, not introduced here.
2. **`requires_sign_off` degrade preference** — the column-missing fallback silently drops a ticked
   flag rather than failing the save. Deliberate, and a one-line flip if a reviewer prefers loud
   failure.

### State at end of run

| PR | State |
|----|-------|
| #2192 | **merged** — master tip `ed60719` |
| #2205 | **closed** unmerged, as I recommended (libuuid layer did nothing) |
| #2209 | **closed** as redundant (folded into #2192) |
| #2186 | `beed07e`, build re-running on the merge; `mergeable_state: blocked` = **awaiting human approval only** |

Subscribed to #2186 activity, so a red build wakes the session rather than being discovered late.

**Unchanged and still worth raising as tickets:** i18n fallback (820 keys missing from `tr`);
`tsc --noEmit` beside `Lint & Run Tests` (prod webpack is currently the only typecheck); postcss
nanoid → 3.3.17 (the one genuinely fixable row in the `.trivyignore` census); tldraw 2.4.6 → 5.x
(what actually clears all three nanoid CVEs); `achieved_on` on `asset_readiness`; and "render section
title from `sectionType`, never persist display copy".

### 2026-09-09 (later) — `beed07e` verified green, step by step

The merge build completed. Checked the **step list**, not the job conclusion, because a green
`build` job does not imply every step ran — step 20 was *skipped* on earlier runs while the job
still reported success:

| Step | Result |
|------|--------|
| 7 `Lint & Run Tests` | ✅ 16:50:21 → 16:59:03 |
| 15 `Build image` (prod webpack — the only typecheck in CI) | ✅ 17:00:54 → 17:06:43 |
| 19 `Vulnerability scanner` | ✅ 17:06:44 → 17:07:10 |
| **20 `Scan built image`** | **✅ 17:07:10 → 17:07:28 — ran, not skipped** |

Step 9 `Download fixtures` reads `skipped`, correctly — step 8 restored the fixtures cache, so the
download is the cache-*miss* path. Every other step is `success`. SonarCloud quality gate passed
(8 new issues, non-blocking; 0 security hotspots; 47.0% coverage on new code). No legacy commit
statuses on the head (`get_status` → `total_count: 0`).

Re-verifying step 20 mattered rather than being ceremony: **the merge changed the image's dependency
tree** (shortid gone from the lockfile), so 09-09's earlier step-20 pass on `87c1386` did not
transfer to this content. Same principle as the note above — a green check is about one specific
tree, not about the branch in general.

**#2186 is now as far as I can take it:** green on `beed07e`, no merge conflict, 0 of 32 review
threads open. `mergeable_state: blocked` is the required-review gate and nothing else, so the only
remaining input is a human approval.

## 2026-09-10/11 — the PR grew to three tickets; and a scope-gate trap worth knowing about

### What landed while I was idle

A parallel session folded PLT-2966 in and rebuilt the runner. Head moved twice:

| Head | What |
|------|------|
| `beed07e` → `919ccdc` | PLT-2966 folded in from **#2204**, which was **closed unmerged** 09-10 09:16:53. Two commits, 252 insertions over 7 files, 183 of them tests. |
| `919ccdc` → `0ed23b5` | `PLT-2967: sign-off follows the task kind, and preconditions are not a setting` — a **simplification**, net −43 lines. |

Both heads verified green **per step**, not by job conclusion: `919ccdc` had step 19 ✅ 09:33:45→09:34:12 and step 20 ✅ 09:34:12→09:34:32. Branch is `0` behind master throughout, so the 09-09 merge held.

**Review threads: still 32/32 resolved** across both heads. SonarCloud gate passed each time (8 → 9 → 10 new issues as the diff grew; 0 security hotspots throughout).

### My own work survived the rewrite — checked, not assumed

`0ed23b5` deleted 85 lines from `ChecklistCreatePage.tsx` and 4 keys from the en bundle, both files I had changed, so I verified rather than trusted:

- `SECTION_LABELS` still at `ChecklistCreatePage.tsx:100`, still `{ PRECONDITIONS: 'Preconditions', TEST_STEPS: 'Task items' }`, still used at both call sites (`:294`, `:296`).
- The cross-file guard test is intact and still asserts against `mlt/en/main.json`.
- The 4 removed keys are the settings-rail ones (`taskSettings`, `preconditionsHint`, `requireSignOff`, `requireSignOffHint`). The two the guard depends on — `preconditions` and `taskItems` — **survive with values still equal to `SECTION_LABELS`**, so the guard holds rather than merely not-failing.

### Copilot's `SCHEMA_PREVIEW` finding does not hold against current code

It reported `SCHEMA_PREVIEW` as "enabled by default (production-impacting preview behavior)".
`task-runner.preview.ts:17` reads `export const SCHEMA_PREVIEW = false`. Nothing to do — recorded so the
next run doesn't re-chase it.

### ⚠️ The commissioning scope gate can never fire for these tickets

`hc-frontend/CLAUDE.md` puts Commissioning **out of scope by default**, switched on when *either*:
the branch name contains `commission` (case-insensitive), **or** `.claude/commissioning-active` exists.

On this repo, as checked out fresh, **neither can be true**:

- the branch naming convention for this work is **`PLT-xxxx`** — `PLT-2968` contains no `commission`,
  and never will for any ticket number;
- **`.claude/` does not exist in the repo at all** — it is untracked, and `.gitignore:183` lists
  `.claude/commissioning-active` explicitly, so the marker cannot arrive with a clone.

So a fresh session that checks out `PLT-2968` and reads CLAUDE.md is instructed to **skip the very
code the ticket is about** — "do NOT read, review, flag, refactor, or edit it". Nothing has broken
yet only because these sessions have been long-lived and carried the context forward. A short session,
or a new developer, would stop at the gate.

**Worth raising as a ticket:** either add a third signal CLAUDE.md can actually see (a `PLT-` ticket
allow-list, or a tracked marker rather than a git-ignored one), or say plainly in CLAUDE.md that
commissioning tickets are named `PLT-xxxx` and the branch-name signal will not fire for them.

### Open, and mine to fix once the build settles

`0ed23b5` removed the sign-off and preconditions toggles, but the PR body's **How to test step 1**
still says *"switch on Preconditions and add one, and switch on Require sign-off"* — controls that no
longer exist. Verified against the code (`TASK_TYPE_REQUIRES_SIGN_OFF` in `task-type.types.ts` derives
it from the kind), not inferred from the commit subject. A reviewer following step 1 would hunt for a
missing toggle. Not touched yet: a build was in flight on that commit and the body is edited
wholesale, so racing the session that just pushed would clobber it.

## 2026-09-11 — two verified bugs fixed off a Copilot review, and a process mistake

A Copilot review landed 8 inline findings on the runner rebuild. Two were real, severe and had
clean minimal fixes; I took those. The rest are answered or deliberately left, below.

### Fixed 1 — the self-heal destroyed a verdict nobody derives (`4419e04`)

`TaskInstanceModal` heals a stored status that disagrees with what the items derive to. Sound for
drift; wrong for one status, because **`task-status.tsx` documents that `passWithComments` is never
derived**:

> (`passWithComments` is a human judgement on the run as a whole, so nothing here derives it.)

If nothing derives it, it disagrees with the items *by construction*, so a heal asking only "do
these differ?" can never leave it alone. Reproduced: a `functionalTest` stored `passWithComments`
with both items `pass` fires the heal with `{status: 'pass'}`. The verdict is destroyed on open —
and the same effect does `setVerdict(null)`, so the UI shows nothing to say what was lost.

Fix: `NEVER_DERIVED_STATUSES` + `isDerivableStatus` next to `deriveInstanceStatus`, gating the heal.

### Fixed 2 — grouped items rendered nowhere once a run opened (`f9f1825`)

`rowToItem` took `id` from the **execution** row and `parentItemId` from the **template** row.
`groupItems` groups by `item.parentItemId === header.id` — comparing the two id spaces, so no child
ever matched.

> **The part the review undersold:** the child does not fall back to ungrouped. `groupItems` treats
> an item as loose only when it has *no* `parentItemId` (`task-runner.parts.tsx:153`), and these have
> one that simply matches nothing. So the child is in neither bucket — it renders **nowhere**, and
> its header sits empty. In the headline feature of PLT-2967.

Fix: translate parent through **position**, already the item's identity in both tables (`rowToItem`'s
own docstring says so, and `shapeByPosition` beside it relies on it). An unresolvable parent now
yields *no* `parentItemId` rather than a stale template one, so the child comes out ungrouped rather
than invisible — the visible failure mode of the two. `getInstance()` and `listForStep()` both go
through `itemsOf()`, so one call site covers both.

Both fixes carry a test that fails when the fix alone is reverted while its file's other tests stay
green. 879 tests across 53 files pass.

### ⚠️ My own mistake: I built and tested a fix against a stale checkout

I made the whole first fix — edits, tests, "155 passed" — on a working tree **3 commits behind
origin**. I had `git reset --hard origin/PLT-2968` days earlier and never re-synced, so "the current
head" in my head was `beed07e`, not `0ed23b5`.

What exposed it was a contradiction I nearly explained away: Copilot said `Switch` was an unused
import, my grep found it used at lines 385 and 410, and an earlier `git show origin/PLT-2968` of the
*same file* had shown only the import. Two greps of "the same file" disagreeing is only possible if
they are not the same file.

> **Rule for next time: `git fetch && git status` against the remote BEFORE reading code to verify a
> review finding, not just before pushing.** A stale tree does not announce itself — every command
> succeeds and every test passes, they are just answering a question about the wrong commit. I got
> lucky: the three files happened to be byte-identical between the two commits, so the verification
> still held once moved across. That was luck, not method.

### Answered, not fixed — and why

- **`verdict` never seeded from the stored instance** (2 threads, left OPEN deliberately). Real: the
  effect restores `outcomeNote` and sets `verdict` to `null` on the very next line. Not a one-liner
  though — it needs a mapping decision (seed from `status` or `outcome`? what does a `signedOff` run
  show? does re-save preserve or re-derive?). Guessing would be worse than leaving it visible.
  **Consequence flagged on the thread:** until it is seeded, reopening a `passWithComments` run and
  saving any edit still sends the derived `pass` with no note — the heal guard does not cover the
  save path.
- **`parent_task_item_id` never written by the library service** — the other half of grouping. A
  builder-authored template has no parent links to translate. Needs parent *and* unit threaded
  through the builder's item model; bigger than a review fix.
- **Terminal verdict selectable with unanswered items**, and **`requiresSignOff` persisted but never
  enforced** — both real-looking, both about what should gate completion. Design calls.
- **`projectId` in degraded-path logs** — Copilot repeating a finding already refuted with evidence
  on this PR (no such convention exists in `docs/`, `.claude/`, `CLAUDE.md` or `logService/`; the
  implemented redaction policy is narrow and enumerated). Not re-litigated.
- **`SCHEMA_PREVIEW` "enabled by default"** — does not hold; `task-runner.preview.ts:17` is `false`.
- **"unused `Switch` import will fail lint"** — half right. The import was dead (removed), but the
  build was **green on that exact commit**, so it was never lint-fatal. Net warnings on the touched
  files went 29 → 28.

### Rebuilding the local test environment

The container had been reclaimed, so `node_modules` was gone. Rebuilt it: copy `package.json` to a
scratchpad, strip `@xyzreality/*` (private registry, 401), `npm install --ignore-scripts
--legacy-peer-deps` (**the plain install now fails on a `@hookform/resolvers` peer conflict — it did
not before**), then symlink the result in. ~3 min. Note `node_modules` is NOT gitignored here, so
stage files explicitly and never `git add -A` in this repo.

### 2026-09-11 (later) — a third fix, and the two grouping bugs were a pair

A second review round landed on my push. One more real finding, fixed in `7dcb228`.

**Grouping was broken twice over, and either fix alone leaves it broken.**

| | |
|---|---|
| `f9f1825` | parents that **existed but pointed into the wrong id space** — template id vs execution id |
| `7dcb228` | grouping by parents **that are not there at all** |

The second: `byParent` comes from `supports.groups`, which is `columnPresent(shapes,
'parent_task_item_id')` — and `columnPresent` is literally `column in rows[0]`. It reports that the
**schema can express** parent links, never that this template uses any. Our own builder writes none,
so "column present, no parent ids anywhere" is the *common* case on a migrated database, not an edge
one. Every item then matched the loose filter, every header opened a group nothing joined, and the
positional read the docstring promises as a fallback was skipped. Now the parent branch is taken
only when some item actually names a parent.

`task-runner.parts.tsx` had **no test file at all**; added one (4 cases, 2 fail without the guard).
Also added the requested `requiresSignOff` mapping coverage — the builder only exercises 2 of the 3
kinds, which is exactly how the third would drift.

887 tests across 54 files pass.

### Checked-before-claiming, twice, and it changed the answer both times

- **`splitDefinition` drops unknown sections.** Real: it drops a header on *any* `sectionType`, and
  save re-emits only `PRECONDITIONS`/`TEST_STEPS`, so `DETAILS`/`OVERVIEW` (both in
  `CHECKLIST_SECTIONS`) round-trip to nothing. **But**: the only `sectionType` values written
  anywhere in this repo are those same two (`ChecklistCreatePage.tsx:293,295`), so such a template
  can only arrive from api-v2 or seeded rows. Latent, not live — which changes the fix from "urgent"
  to "product call about what the builder is for". Left open with three options costed.
- **My own PR-body wording was wrong.** I had written that a builder-authored template "comes out as
  one flat list". It comes out as a flat list *plus dangling empty headers*, which is worse. The
  review's phrasing was more accurate than mine.

### Where it stands

`7dcb228`, build running. **6 threads open, all deliberately** — verdict seeding (×2), terminal
verdict / `requiresSignOff` gating (×2, one question), the library write side of grouping+units, and
the section round-trip. Every one is a design decision rather than a defect with an obvious fix, and
each has my proposal on the thread.

Three pushes in ~25 min each superseded the previous CI run. Verified each before pushing, but worth
noting: batching two of them would have cost one less build.

### 2026-09-11 (evening) — a fourth data-loss bug, and the finding that keeps repeating

A third review round. Twelve threads now open. Two things worth separating out.

**1. Reopening a completed task discards every unchanged answer.** Verified in the code, not taken on
trust: `openExecution` inserts the template's items with `response: DEFAULT_ITEM_RESPONSE` and never
carries the prior run's answers across. So editing one field on a completed task opens a *new* run
with everything blank, writes only the changed position, then `setInstanceStatus` writes a status
derived from the **old in-memory** answers. A run holding one answer is stored `completed`, and since
`getInstance` reads the current run, the rest are gone from view.

Not fixed, and the reason is semantics rather than size — the fix is small either way. The code reads
as *both* histories at once:

| Reading | Then |
|---|---|
| reopen = **amendment** | `openExecution` should clone the prior responses; one seeding change |
| reopen = **genuine re-run** | blank items are correct (the docstring says exactly this), and the bug is that a field edit opens a run at all |

> Whichever is chosen, one part is wrong under **both**: the status written must describe the run it
> is written onto. Deriving it from answers that live on a superseded execution is indefensible
> either way — and fixing just that turns silent data loss into a task that visibly reads
> `inProgress`. That is the piece to do first if someone wants a safe partial fix.

**2. The same finding has now arrived five times in different clothes** — terminal verdict selectable
with items unanswered; `requiresSignOff` persisted but never consumed; the sign-off card shown for
checklists that don't need it; signatures not participating in status; completion reachable with no
execution at all. They are one gap: **nothing gates completion**, so a readiness level can go green on
a task that was never answered or signed.

> In a commissioning product that is not a nit. Recording it as one finding rather than five so it
> does not get triaged as five small ones.

### Where my judgement landed on fix-vs-flag

Fixed today (3): each had **one** defensible minimal fix and no product question — a guard, an id
translation, a branch condition. Flagged (4 areas): each needs someone to choose what the product
*means* — what gates completion, what reopening is, what the builder does with a section it cannot
show, how verdict maps to stored status.

That line held up better than "severity" would have. The reopen bug is more severe than two I fixed,
and it is still the right one to leave, because guessing the history model would be a worse outcome
than the bug being visible and owned.

### 2026-09-11 (close) — green on `7dcb228`, verified per step

All three fixes are on a green head. Checked the step list, not the job conclusion:

| Step | |
|------|--|
| 7 `Lint & Run Tests` | ✅ 13:47:05 → 13:55:46 |
| 15 `Build image` (the only typecheck in CI) | ✅ 13:57:40 → 14:03:25 |
| 19 `Vulnerability scanner` | ✅ |
| **20 `Scan built image`** | **✅ 14:03:56 → 14:04:15, ran not skipped** |

`copilot-pull-request-reviewer` reads **cancelled** — the bot superseding its own run, not a gate
failing. Worth knowing because the wake event's "nothing is still running or failed" explicitly does
**not** cover cancelled suites, so it cannot be taken as proof on its own; the build was read
directly instead.

State: head `7dcb228`, **0 behind master**, 68 ahead, `mergeable_state: blocked` = required reviews
only. SonarCloud gate passed (duplication 0.9% → 1.6%, from my new test fixtures; well inside).

### Corrected my own PR-body claim — my fix had outdated it

Earlier today I wrote in the description that a builder-authored template "comes out as one flat
list". True when written; **false after `7dcb228`**, which made grouping fall back to position when
no parent links exist — so those templates now group under their headers properly. The remaining gap
is narrower than I had stated: the builder cannot author an *explicit parent link* (or a unit), not
that grouping fails.

> Second time today my own prose about this area was wrong in the direction of overstating breakage —
> first understating the empty-headers symptom, now understating the fix. Re-read descriptions after
> changing the behaviour they describe; a PR body is not write-once.

**Nothing further from me without a decision.** 12 threads open, each carrying analysis and a
proposal. Every remaining item needs someone to choose what the product means.

### 2026-09-11 (round 3) — `9fd7b13`, and a finding that indicted my own morning's work

Two more fixed, **batched into one push** after noticing I'd spent three CI cycles in 25 minutes
earlier for no good reason.

- **`row.section_type as ChecklistSection`** asserted what the column never promised — it is plain
  text, so a newer writer's value or a typo reached callers as a valid section. New
  `isChecklistSection` guard; unrecognised values left unset, reading as "no section". Test fails
  when the guard is reverted.
- **`groupItems` re-filtered per header** → one pass bucketing by parent. Recorded honestly in the
  commit: at one task's worth of items this was never a measured cost. The real gain was noticing
  that **child order within a group** had no coverage, and it *is* the procedure's reading order.

### ⚠️ The SECTION_LABELS finding argues against a test I added this morning

Copilot flagged that `SECTION_LABELS` persists English strings which then leak into non-English UI.
Correct — and sharper than it put it: **I added a test today asserting those persisted strings equal
the English UI headings.**

> The guard was right about the bug in front of it (the runner renders a group by its STORED label,
> so persisting "Task steps" while the UI said "Task items" showed two names for one thing). But the
> fix pinned the two together **in English**, when the real answer is not to persist display copy at
> all — store `sectionType`, translate at render. **That test is a stopgap to be deleted, not
> extended.** Said so on the PR so nobody later reads it as the intended design.

This is the same follow-up already listed in this file as "render section title from `sectionType`,
never persist display copy" — it now has independent corroboration and a concrete blocker: a
migration story for templates already carrying English labels.

> Worth generalising: a test that pins two things together is only as good as the relationship being
> right. Mine made a wrong relationship harder to change. Ask whether the invariant should exist
> before making it machine-checked.

### Not taken

- **i18n cluster** (4 comments, `task-runner.parts.tsx`): one piece of mechanical work, broad enough
  to be its own commit, belongs with the runner's copy pass.
- **Orphan children in `groupItems`** — a child naming an absent header still lands in no group.
  Same shape as `f9f1825` and I'd rather it degrade to ungrouped, but that is a behaviour change
  nobody asked for; smuggling one into a refactor is how refactors get a bad name. Flagged only.

### 2026-09-11 (round 4) — I had to revert my own fix from an hour earlier

`d179b83`. The more useful half of this entry is the mistake.

**The `isChecklistSection` guard (9fd7b13) was wrong, in the direction it was meant to protect.**

Copilot suggested applying the same guard to the instance read path. Checking whether to, rather than
just doing it, is what exposed that the original was a defect. Both splitters use a header's section
to **end the run of items before it**:

```ts
if (item.type === 'header' && item.sectionType) { section = item.sectionType; continue }
```

Drop an unrecognised value to `undefined` and that branch stops firing, so:
- the header **stops dividing** — a `PRECONDITIONS` run bleeds into everything after it;
- in the builder it stops being skipped and becomes an ordinary **editable row**.

Strictly worse than the bogus-union-value it prevented, and landing on exactly the templates the
guard existed for.

> **The lesson is about the shape of the fix, not the bug.** The cast *was* a real lie. But faced
> with "this value might not fit the type", I reached for **discard the value** when the honest move
> was **widen the type** — the column is text, and every consumer only ever asks whether it equals
> `PRECONDITIONS`. Discarding data to satisfy a type is almost always the wrong end of that trade:
> the type was the thing that was wrong.

Second-order damage worth noting: **the test I wrote asserted the defect.** It pinned "unknown
sections are dropped", so it would have defended the bug against anyone who later fixed it. That is
now the second time today a test of mine entrenched something wrong (the other being SECTION_LABELS
pinned to English).

> Both have the same root: I wrote the test to describe *what my change did*, not *what the system
> should guarantee*. A test written from the change is a change-detector. Write it from the
> invariant, and it survives the change being wrong.

**Also fixed:** the orphan child in `groupItems` — a child naming an absent header belonged to no
group at all and rendered nowhere; now ungrouped, in list order. I had explicitly declined this last
push on the grounds that nobody had asked for a behaviour change. A reviewer then asked, which
retired the reason. Worth remembering that "nobody asked" is a reason with a short shelf life.

891 tests across 54 files. Reverting the orphan rescue fails exactly its 2 cases, the other 5 pass.

### State

Head `d179b83`, 0 behind master. The parallel session is active again (it pushed `6ad3410`, a
styling change, on top of my work) — **all five of my earlier commits verified as ancestors and my
changes verified present in the head's working files**, not just in history. From here the feature
work is theirs; I am not pushing further into the same files.

### 2026-09-11 (round 5/6) — `ad1bba3`, and the review loop is not converging

**`blocked` was missing from my own `NEVER_DERIVED_STATUSES`** (`ad1bba3`). The set had one member
where the derivation block names two, and the second was two lines above the one I quoted when I
added it:

```
//   • blocked          — never derived, and nothing in the app writes it yet
```

I read "nothing in the app writes it yet" as "so it cannot occur". *Yet* was the operative word — the
column is shared with api-v2, so a blocked row can arrive from outside and the heal quietly unblocked
it. Same shape as the bug the set was created for.

> **The test for that set is "can `deriveInstanceStatus` return it", not "is this status unusual".**
> I had applied the right principle to one status and not checked whether it applied to others, in a
> comment that listed them.

**A false comment in `completedAtOf`** (PLT-2966, not mine — reported, not pushed, since that file is
being actively worked):

```ts
// …a malformed value cannot skew a max the way `new Date(...)` returning NaN would.
```

Verified by running it rather than reasoning:

```
'not-a-date' > '2026-09-11T10:00:00.000Z'  →  true
```

`'n'` sorts above `'2'`, so a malformed value doesn't fail to be excluded — it **reliably wins** the
max and becomes the tag's completion time. The `new Date(...)` approach the comment dismisses is the
*safer* one here, because `NaN > x` is false and could never win. The property is exactly backwards.

### The thing worth carrying forward

Five review rounds. One finding has arrived **about eight times** in different clothes — terminal
verdict with items unanswered, `requiresSignOff` never consumed, sign-off card on checklists,
signatures not in status derivation, completion with no execution. All one question: **what gates
completion.** A second cluster (reopen loses answers, signature written to a frozen run, outcome-note
edit mutating history) is one more: **is reopening an amendment or a new run.**

> **Picking off symptoms does not converge a loop whose cause is an unmade decision.** Six commits of
> mine landed because each had a single defensible minimal answer. What remains is not a backlog of
> small things; it is two product decisions with a long tail. Said so on the PR rather than keep
> fixing around the edges — that is the more useful thing a reviewer can do at this point.

State: head `ad1bba3`, 0 behind master, build running. The parallel session is active in the feature
files (`6ad3410` styling, `7c6c03d` a genuine ordering fix — an unordered execution-item read let row
id decide what counted as a precondition, which is the ordering assumption my `7dcb228` fallback
depends on). My six commits all verified as ancestors with changes present in the working files.

### 2026-09-11 (round 7) — `2551a47`: a failed precondition was unlocking the steps

The best find of the day, and the contract it broke was one I had written.

`confirmedStatusFor` — which the preconditions panel's toggle writes through — states it plainly:

> Confirming a pass/fail item is a `pass`; there is no way to express the other two from a toggle,
> and **a precondition that failed is one you leave unconfirmed.**

But the gate, the panel's confirmed count and the toggle's on-state all asked `isAnswered`, which is
true of anything but `incomplete`. A precondition stored `fail` therefore read as confirmed and
**unlocked the test steps it exists to hold back.** On a commissioning gate that is the wrong
direction to fail in.

New `isConfirmed(type, status)`, the inverse of `confirmedStatusFor`, at all three precondition
sites. The genuine "answered" counts are untouched — those do mean answered.

> **The pattern across today's three self-inflicted ones is the same.** `confirmedStatusFor` (mine)
> stated a contract; `NEVER_DERIVED_STATUSES` (mine) named a rule; `deriveInstanceStatus`'s comment
> listed what it never produces. Each time the *prose was right* and a caller asked a near-miss
> question instead — `isAnswered` for confirmed, one status for two, "nothing writes it" for "cannot
> occur". **Writing the invariant down is not the same as having anything enforce it**; a docstring
> cannot fail a build. Where an invariant matters, give it a predicate callers must route through —
> which is what `isConfirmed` and `isDerivableStatus` now are.

`na` is treated as unconfirmed too, deliberately: the toggle can only write `confirmedStatusFor` or
`incomplete`, so a stored `na` came from elsewhere, and a gate should not open on a value its own
control cannot produce. Flagged on the thread as a product call rather than settled quietly.

894 tests across 54 files; the two new cases fail when the gate is reverted, the other 56 pass.

### Running total

Seven commits from me on this PR: verdict self-heal, `blocked` in the same guard, two grouping bugs,
an orphan rescue, a revert of my own over-eager section guard, and this. Every one had a single
defensible minimal answer. Everything still open needs a product decision.

### 2026-09-11 (round 8) — `50e9a42`: the one part of the sign-off cluster that was not a decision

`TASK_TYPE_REQUIRES_SIGN_OFF` says `checklist: false`, but `SignOffCard` was mounted for every
instance — so a checklist offered a signature control and could persist one against a kind the model
says has none. The verdict card **two lines above it** was already gated; the sign-off card was not.

Gated on `requiresSignOff(normalizeTaskType(instance.type))` rather than reusing the neighbouring
`showVerdict`. Same kinds today, different questions — *does this score a verdict* vs *does this need
a signature* — and a kind that scored a verdict without needing a signature would otherwise silently
get both.

> **Worth separating from the cluster it looks like it belongs to.** Eight of the nine sign-off /
> completion findings need a product decision. This one did not: the contract had already decided,
> and the code simply didn't ask it. Being able to tell those apart is what let this ship while the
> rest correctly stays open.

### ⚠️ Three existing tests were pinning the defect

Gating the card broke three sign-off tests — they rendered the **default `checklist` fixture** and
asserted the card was present. They were not testing sign-off; they were testing that sign-off
appeared where it shouldn't. Now they render a `functionalTest`, and a new case pins that a checklist
does not get the card.

> **Third time today on this PR.** The `SECTION_LABELS` guard pinned English persistence; the
> section-drop test asserted "unknown sections are dropped"; these asserted a checklist has sign-off.
> The tell is the same each time: **a fix makes tests fail in the direction of the fix.** That is not
> a signal to reconsider the fix — it is a signal that the tests encoded the old behaviour rather
> than a requirement. Worth a moment's suspicion every time, and worth asking of a test being
> written: *would this still be right if the code were wrong?*

895 tests across 54 files; the new case fails when the gate is removed, the other 58 pass.

**Eight commits from me now.** Everything still open needs a product decision — including the other
half of this one (whether a signature should gate completion), which is untouched.

### 2026-09-11 (round 9) — `f38d68e`: took the timestamp fix I had deferred

Earlier I reported the `completedAt` comment as having its safety property backwards and *offered*
to fix it, declining to push because `use-readiness-steps.ts` was "being actively worked". Two things
changed: the finding was raised again, and `git log` shows the file untouched since **09-05** — my
reason had expired. Took it.

```
'not-a-date' > '2026-09-11T10:00:00.000Z'   →  true
```

`'n'` sorts above `'2'`, so a malformed stamp did not fail to be excluded — it reliably **won** the
max and became the completion time on the tag. `new Date(...)` was the *safe* behaviour the comment
dismissed, because `NaN > x` is false. Now compares parsed instants, skips unparseable values, and
returns the stored ISO string so the display is still exactly what the row holds.

> **"Not mine to touch" is a claim with a shelf life.** I was right to defer at the time — two
> sessions in one file makes conflicts — but a deferral is a bet on someone else picking it up, and
> it needs re-checking rather than standing forever. `git log` on the file answered it in one
> command; I should have checked that before deferring the first time rather than inferring activity
> from the branch as a whole.

897 tests; both new cases fail when the string comparison is restored.

### Nine commits, and the shape of what is left

| Fixed (9) | Each had one defensible minimal answer |
|---|---|
| verdict self-heal destroying `passWithComments` | `blocked` missing from the same guard |
| parent ids in the wrong id space | grouping by parents that do not exist |
| orphaned children rendering nowhere | a failed precondition unlocking the steps |
| sign-off card offered on checklists | completion stamps compared as strings |
| (plus a revert of my own over-eager section guard) | |

Everything still open is one of three things: **a product decision** (what gates completion; is
reopening an amendment or a new run; what the builder does with a section it cannot show), **the
runner's i18n copy pass** (one mechanical commit, belongs with whoever owns the strings), or
**error-state handling** across the query consumers (a consistent pattern to apply once, not nine
patches).
