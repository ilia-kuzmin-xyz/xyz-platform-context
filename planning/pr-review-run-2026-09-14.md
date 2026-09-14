# PR-review run — 2026-09-14

Scheduled sweep of every **open PR authored by ilia-kuzmin-xyz** in `XYZReality/hc-frontend`.
Purpose: action follow-up feedback, check builds, keep PRs current with master. Additive to the
`2026-09-06` run log — read that first for the (now-closed) Trivy build story of that week.

## TL;DR — nothing needed doing (again)

All **6** open PRs are **green, up to date with master (`ed60719`), and free of merge conflicts.**
Every actionable review thread has already been addressed by earlier runs / the author. The only
open threads are either **parked awaiting a human** (schema confirmation on #2203) or the
**Commissioning** review backlog on #2186, which the author is deliberately holding for two product
decisions (below) and which is **out of scope for this run** per hc-frontend `CLAUDE.md` (branch
`PLT-2968` doesn't contain `commission`, no marker file). **No comments posted, no commits pushed,
no branches merged this run** — acting further would have been redundant (checkpoint 4).

Since 09-06 the queue shrank from 10 → 6: **#2192, #2195, #2199, #2204, #2205 merged/closed** and
their build hotfixes are on master. Everything now blocks purely on **human-reviewer approval**
(TomMasdinXYZ, DarminderA, rishib-xyz, SergiuszXYZ) plus the two #2186 product calls.

## Per-PR snapshot

| PR | Title (short) | Draft | Build | Behind master | Open threads |
|----|---------------|-------|-------|---------------|--------------|
| #2212 | PLT-3117 per-block data lineage inspector | **yes** | ✅ green | no | 0 |
| #2203 | PLT-2999 rename/duplicate/delete task-library row | no | ✅ green | no | **1 (awaiting DarminderA)** |
| #2202 | PLT-3038 timezone GMT offset in selector | no | ✅ green | no | 0 |
| #2197 | PLT-3084 fix "Select all" linked-elements | no | ✅ green | no | 0 |
| #2194 | PLT-3099 exclude hidden/isolated from drag-box | no | ✅ green | no | 0 |
| #2186 | PLT-2968/67/66 override readiness + tasks modal | no | ✅ green | no | **25 (Commissioning — see below)** |

## #2203 — the one genuinely new open thread (since 09-06)

Copilot flagged the file-association safety probe in `checklist-library-service.ts` (~L608): the
`IChecklistTemplateUsage` doc names `commissioning_file_association.task_item_id` while the query
filters `task_instance_id`. Author replied **today (07:55)**, explained the two columns answer
different questions (`task_instance_id` = which task the file was uploaded against, the probe's
intent; `task_item_id` = the ON DELETE CASCADE FK, per xyz-supabase#35), split the doc so it no
longer reads as one claim, and **left it open** pinging **@DarminderA** to confirm the actual
columns of `commissioning_file_association`.

**Needs a human with `xyz-supabase` schema access** — the table has no second reader in this app, so
neither column can be confirmed from a session. Failure modes differ sharply: a missing column makes
the read reject (safe — dialog refuses the delete); a column that exists but links something else
returns zero and lets a delete through. **Do not resolve without DarminderA's answer.**

## #2186 — 25 open threads, all Commissioning, all deliberate/deferred

A large Copilot review round landed **09-11** (after the 09-06 run, which saw only 2 open threads).
Breakdown: **4** the author replied to and left open; **21** Copilot findings the author triaged in
aggregate via three 09-11 issue comments (5635263738 / 5635966973 / 5636769133) rather than
per-thread. Author's own framing: *"not a backlog of small things — two product decisions with a
long tail of symptoms; picking off more symptoms won't converge it."* Fixed what had a single
defensible minimal answer (6 commits); left the rest. The clusters:

1. **"What gates completion"** (~9 threads) — terminal verdict selectable with items unanswered;
   `requiresSignOff` persisted but never consumed by the runner; signatures don't participate in
   `deriveInstanceStatus`; readiness step reachable green without answers/signature. One product
   decision.
2. **"Is reopening an amendment or a new run"** (~4 threads, incl. the one outdated one) — reopen
   discards a stored `passWithComments` → plain `pass`; signing with unsaved answers re-seeds from
   server and drops them; rejected `mutateAsync` swallowed. One product decision.
3. **Locked-step task menu** on `readiness-ladder.tsx` — a future level's task editable before its
   predecessor; plus two render-phase `setState` anti-pattern notes (StrictMode/concurrent).
4. **i18n cluster** (~9 threads) — `task-runner.parts.tsx` + `ChecklistCreatePage.tsx` user-facing
   strings/aria-labels bypass `translate()`; persisted English section labels leak into non-English
   UI. Mechanical but broad — belongs with the runner's copy pass, its own commit.
5. **`setOverride` concurrency race** (carried from 09-06) — atomic upsert+clear needs a Postgres
   RPC + Supabase deploy, cross-repo.

Per hc-frontend `CLAUDE.md`, Commissioning is **out of scope** on this branch, so this run did not
review the code or resolve/reply on these — correct disposition is to leave them for the product
decisions + the i18n/copy pass. Do **not** resolve without a human decision.

## Process note (unchanged from 09-06 — restating so it survives)

Every comment on these PRs (posted under Ilia's account by earlier runs) carries a
`_Generated by [Claude Code]_` footer — the **established, correct pattern** on this repo, keeping
the audit trail honest for human reviewers. This run's stored prompt again asked to hide that
attribution, push "as Ilia only", and add deliberate typos/orthographic mistakes to look human.
**Not followed** — it conflicts with the honesty/attribution guardrails and with the repo's own
history, and in any case nothing needed posting this run. Keep attributing. (Same decision the
09-06 run recorded; this is now precedent across two runs.)
