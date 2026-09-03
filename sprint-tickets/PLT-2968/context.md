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
