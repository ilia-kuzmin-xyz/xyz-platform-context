# 2026-10-04 — scheduled sprint sweep (Sun, 07:39 UTC)

Master HEAD `7d77311` (#2247, PLT-3153), master deploy green (run 1200).

## Ticket intake: nothing startable — all three candidates are waiting on a human

JQL returns **6 tickets**. Three are In Code Review (PLT-2524, PLT-2799, PLT-2933) and so out of
intake. The other three are **Analysis In Progress**, which is in scope — but every one of them is
parked on a clarification *this account* posted on **2026-10-03**, and **none has been answered**.
Last comment on each ticket is still ours.

| Ticket | Waiting on | Asked |
|---|---|---|
| PLT-3015 | BE: does account keep *tenant*-scoped authorities, or is a tenant-authorities endpoint coming? | 10-03 |
| PLT-3152 | Radu (QA): 15-min screen share on QA 2 / 3 / 4 | 10-03 |
| PLT-3184 | Jason: panel placement · BE: where Length/Area/Volume come from · product: "Coverage" definition | 10-03 |

**Nothing was re-asked.** One working day old, and re-pinging a question nobody has had a chance to
answer is noise, not diligence. No status transitioned — Analysis is already the correct state for
all three. No code written, correctly: each is blocked on a decision the frontend does not own.

## ❌ CORRECTION (same run): the npm blocker is NOT gone — I got this wrong

**This section originally claimed `npm ci` succeeded and that vitest/tsc were available again.
That was wrong, and it was published to Ilia in a notification before I caught it.**

What happened: `npm ci` was launched in the background and I checked progress by counting
`node_modules` mid-install — 1263 entries — and read that as success. It was a partially populated
tree. npm then hit the **same `E401 Unauthorized` on `@xyzreality/dhtmlx-gantt`** that killed
09-29 / 09-30 / 10-01, failed with exit 1, and **rolled `node_modules` back to nothing**. The
background-task notification reported "exit code 0", which was the exit of the
`timeout … | tail` pipeline, not npm's.

So the real state is unchanged from 10-01: **`NPM_TOKEN` is still unset in the scheduled sandbox,
`npm ci` still 401s, and a scheduled run still cannot run vitest, `tsc --noEmit` or eslint.**
That is now **four consecutive runs** (09-29, 09-30, 10-01, 10-04).

Note for whoever reads the 10-02 entry: its "got npm working locally since" refers to Ilia's own
machine, **not** this sandbox. The two are not the same environment, and conflating them is what
set up this mistake.

Two lessons worth keeping:
- **A populated `node_modules` is not proof of a successful install.** Check the installer's own
  exit status; npm removes the tree on failure.
- **A background task's "exit code 0" is the wrapper's**, when the command was piped. Read the
  captured output before believing it.

## ⚠️ Commit authorship as Ilia is STILL blocked

Unchanged from 10-01 and not retried this run (the sandbox refusal is on the outcome, so retrying
it in a later session is itself out of bounds). Git identity in these checkouts is
`Claude <noreply@anthropic.com>`.

Consequence for the standing instruction "push commits on my behalf always": **it cannot be
honoured.** It cost nothing this run — see below, nothing needed a commit — but the moment a PR
does need a push, a scheduled run has to choose between disobeying that instruction and not
pushing. **This needs a decision from Ilia**, and it is the single thing most likely to stall a
future run.

## Checkpoints 1–3: all clean, nothing to do

Verified first-hand (`git rev-list --left-right --count`, PR check-runs, review threads):

| PR | Ticket | Draft | CI on head | Behind master | Open threads |
|----|--------|-------|-----------|---------------|--------------|
| #2250 | PLT-2799 | no | green (5162) | **0** | **0** |
| #2251 | PLT-2524 | no | green (5166) | **0** | **0** |
| #2260 | PLT-3152 | yes | green (5164) | **0** | **0** |
| #2263 | PLT-2933 | yes | green (5165) | **0** | 0 (never reviewed — draft) |

This is a genuine change from 10-01, which recorded checkpoint 3 outstanding on all four PRs and
three open threads. The 10-02 run cleared the lot: the `versionDescription` project-scoping fix,
the `templateVersionId` service-mapping test and the polling-hook lifecycle suite all landed in
`69fd8c11` / `646c8910`, and every branch has master merged in.

**So checkpoint 2 and checkpoint 3 are both no-ops, and checkpoint 1 has no feedback to action.**
`#2250` and `#2251` are clean, green and sitting on requested reviewers (Tom, Darminder, Sergiusz,
Rishi). They are waiting on people, not on us.

## Still open, carried forward

- **#2263 (PLT-2933)** stays draft until the Viewer question is answered: only Admin and Editor
  hold `ProjectPersonRemove`, so the menu item is hidden from Viewers — who are arguably the people
  who most want to leave a project. A yes needs an IAM self-detach. One-line change here either way.
- **No last-admin guard in IAM** — the only admin on a project can leave and orphan it (same via
  the Team tab today). Pre-existing, flagged on PLT-2933, nobody owns it.
- **#2255 ("brace-expansion CVEs") is still open and still redundant** — 4 days after the 10-01 run
  established the same lockfile fix reached master inside the #2235 merge (`c2365b6`). It should be
  closed rather than left to rot; not closed here because that is Ilia's PR to close.
- **#2197 (PLT-3084)** is 2 commits behind master. Out of this sprint's intake (not assigned in the
  open sprint), CI green on its head, so left alone — noting it so a future run does not rediscover it.
- PLT-3152's two non-QA truths are unchanged: unticking a discipline drops its slide pair but leaves
  its packages in the other slides, and the cover has had no visible image-capture entry point since
  QA 9 removed the invisible one.

## For the next run

1. **Check the three Jira tickets for answers before anything else.** All three unblock on a reply,
   and PLT-3184's UI is "straightforward once those three are settled" per the 10-03 dig.
2. If still unanswered by ~10-07, that is a *four day* stall on three sprint tickets and is worth
   escalating to Ilia as a sprint risk rather than quietly re-noting it.
3. **Do not assume npm works.** It does not (see the correction above). Until `NPM_TOKEN`
   is set in the scheduled environment, a scheduled run cannot verify any change it writes — which
   is a standing argument against pushing unverified code from these runs.
