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
