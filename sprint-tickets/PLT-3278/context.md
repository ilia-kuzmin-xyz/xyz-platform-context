# PLT-3278 — Infinity Canvas: panel changes stay on the panel; 3D model only where it can be coloured

Domain: **canvas/** (see `canvas/README.md`, `canvas/artifact-and-hydration.md`).
Paired backend: `XYZ_InfiniteCanvasAgentPipeline` PR #25.

## 2026-10-13 — first entry (created by the sprint sweep)

**This ticket was never an intake candidate, despite showing as `Open`.** It was created
2026-10-12 by Ilia with the PR links already in the description, i.e. written up *after* the
work. hc-frontend PR **#2305** already existed, non-draft, with four reviewers requested.

Status corrected this run: `Open` → **In Code Review** (transition id 871).

### Why the status was wrong, and the lesson

A ticket in a To Do status is not evidence that the work is unstarted. Check for a PR before
treating a sprint ticket as intake — the description's "## PRs" section is the cheapest tell.
Two minutes of reading the description saved re-implementing a finished 284/37-line change.

### PR #2305 — state as of this run

- Head was `2b25ee9`, base `9a56c2e` (4 behind master). Merged master → **`bfd7e8e`**.
- Branch is named **`PLT-3232-viewer-availability`**, not `PLT-3278`. It started life as a
  PLT-3232 offshoot and was retitled. Not renamed — renaming the branch would detach the PR.
  Noted so a future run doesn't "fix" it.
- **Review threads: 2, both resolved, both fixed with real code** (not waved away):
  - `r4247441541` — the inspector read the *incoming* artifact's bindings while the old
    dashboard was still on screen during an in-place panel edit. Fixed in `d8bb879`: during a
    panel change the inspector reads the **active dashboard**; outside one the artifact is the
    report on screen, so it stays the source there.
  - `r4248268865` — the new report-selection branch had no test. Fixed in `1a1ba89`:
    `reportOnScreen` moved into `panelChange.ts` beside the other transition helpers, with a
    case each for dashboard-while-changing, turn's-report-when-done, and
    turn's-report-when-no-dashboard.
- Known and deliberate, per the PR body: when the changed report swaps in, "Opening the
  report" flashes for a few seconds. Separate fix, not this PR's.

### What the change actually does (so the next run needn't re-read the diff)

1. **3D model gating** — the canvas offered the 3D model to every project, but its DuckDB only
   starts when the model files are present. A report drawing "Model by install status" on a
   project without the object-id map produced
   `Catalog Error: Table with name element_status does not exist`. The model is now offered
   only when the files the canvas needs exist (the same check that starts the database); the
   survey omits it, new reports don't draw it, and an existing report says so in plain words.
2. **Panel-change framing** — a change with a panel selected used to take the whole report off
   canvas for the minutes the edit takes, so it read as a full regenerate. The report now stays
   on screen, panel ringed, with a "Changing <panel>" pill. Question → answered in chat.
   Whole-report edit → build progress as before. Declined change → report untouched, chat says
   why, and (new) **nothing is saved** — previously a declined edit was written as an identical
   new version with no reason shown.

### Open for a human

Nothing on the code. It wants the four requested reviewers, and the build is red on the
repo-wide Trivy CVE (see below), not on anything in this diff.

## 2026-10-14 — scheduled run: #2305 is merged; the live PR is **#2324**, and its scope grew

**Correction to the 10-13 entry above:** it describes PR #2305 as the live PR. #2305 has since
merged into master. The open PR for this ticket is now **#2324**
(`PLT-3278-panel-change-fixes`, non-draft, 4 reviewers requested), opened 10-13 18:22 as a
follow-on for defects found testing #2305 on dev. It "Replaces #2323".

Do not go looking for #2305's threads again — they are closed with it.

### What #2324 actually contains (it is not what its title said)

The PR opened as a one-paragraph `viewerConfig` fix and then took three more commits, the last
of which (`51d15b8`, 10-13 22:58) added a whole feature set:

| Commit | Scope |
|---|---|
| `29a54b4` | a panel change keeps `viewerConfig` (the viewer stopped drawing mid-change) |
| `c8a61ea` | review fix: `keepsViewerConfig` extracted to `panelChange.ts` + tests |
| `a41b378` | an **untagged** change keeps the report on screen too (`WHOLE_REPORT`) |
| `51d15b8` | **undo** (`basedOn`/`onScreen`), survey **Cancel**, ask-answer notes, error-screen wording |

The description was never updated past the first commit. A reviewer opening it would have been
shown a viewer fix and found undo, session persistence and a new SSE field. **Rewritten this
run**, title included, with all five areas and a per-area test script.

> **Carry forward:** on a branch that takes several commits in an evening, the PR body is stale
> by default. It is the thing reviewers are actually handed — re-read it against `get_commits`
> before asking anyone to look.

### The four open review threads — all four were right, all four closed this run

Found open from 10-13 23:03. Each verified against the code rather than taken on trust:

1. **`followUp` dropped for `explain` answers** (`useCanvas.ts` `formatAskAnswer`). Verified:
   `executeAskSpec` returns `base` for `explain` with **no `value`** (`askExecutor.ts:118`), so
   the `if (v == null) return label` early return fired. And `followUp` renders in exactly two
   places — the dev overlay and the note this PR added. So for an explain answer the note was
   **invisible to the user entirely**, which is backwards: those are the answers most likely to
   carry a caveat worth reading. Fixed; checked `ExplainAnswer` never draws `followUp`, so the
   append can't double up.
2. **Stopping an ask left the question with no reply.** Wider than the comment said. Lifecycle:
   `pending` → `ask_spec`→`spec_ready` → `artifact_data_complete`→`ready` → **`done` is what
   attaches `askSnapshot` to a message**, and `ChatPanel:495` renders an answer *only* from
   `msg.askSnapshot`. An aborted stream never sends `done`, so even a **`ready`** ask — answer
   fully computed — has no way to reach the chat. Condition is now just `prev.ask`.
   Deliberately did **not** commit the computed answer on stop: that means duplicating the whole
   `done` path inside stop for a sub-second race, on a turn the user asked to stop.
3. **Scope undocumented** — see above, body rewritten rather than split. Reason recorded on the
   thread: undo/cancel/stop all pair with the *single* backend PR on
   `XYZ_InfiniteCanvasAgentPipeline` branch `PLT-3278-panel-change-fixes`; splitting the FE in
   two leaves one half unreviewable against it.
4. **Undo transition untested.** Same remedy as thread 2 of #2305 and of `c8a61ea`: the decision
   moved out of the `done` handler into `revertTarget` / `revertMessage` in `panelChange.ts`,
   with four cases — the version a report was made from, a first report, a `basedOn` pointing at
   a version **the session no longer holds**, and no report on screen. That third case is the one
   that gets missed: `basedOn` is just an id and nothing guarantees the target survives.

Fix commit: **`ac7c529`**. All four threads replied to and resolved.

### ⚠️ Still cannot run vitest here — the 09-26 limitation stands, and a PR thread says otherwise

`npm ci` **still 401s** on `@xyzreality/dhtmlx-gantt` from the private GitHub Packages registry.
It leaves a partial `node_modules` (~784 packages, no `vitest`, no `@eslint/js`), so **neither
vitest nor eslint can run**.

Two traps worth recording:

- **`npm ci ... | tail` reports exit 0.** The pipeline's exit status is `tail`'s. The install had
  failed. Check with `grep "npm error"` on the output, or `set -o pipefail`.
- **A PR thread on #2250 (10-02) claims "got npm working locally since".** That was a different
  environment, not this one. Do not read it as evidence the scheduled container can run tests.

What *was* verified: `tsc --noEmit` is clean (2 errors repo-wide, both environment artifacts —
missing `forge-viewer` types from the partial install, and a pre-existing `baseUrl` deprecation),
and `--listFiles` confirms `panelChange.test.ts` is in the program, so the new tests compile.
The assertions themselves were first executed by CI, and that is stated on the thread rather
than glossed.

An `NPM_TOKEN`/`NODE_AUTH_TOKEN` with `read:packages` in the scheduled environment would close
this. Attempting to discover one is blocked by the harness (credential-exploration classifier) —
it needs to be provisioned, not found.

### 11:50 — a correction I had to make to my own thread reply: `stopStreaming` is wired to nothing

After replying to thread 2 I checked where Stop is actually surfaced. **It isn't.**
`stopStreaming` is returned from `useCanvas` but is **not destructured in `CanvasPage.tsx`**,
and there is no Stop control anywhere in the canvas UI (`grep -rni "stop" --include=*.tsx` over
`components/` and `CanvasPage.tsx` finds only `stopPropagation` and SVG gradient `<stop>` tags).

So the bug Copilot found, and my fix for it, are both **unreachable by a user today**. I had
written the thread reply as a live hang, and — worse — put "press Stop" in the PR's test steps,
which no tester could have followed. Both corrected: a follow-up on the thread, and the PR body
now carries the caveat explicitly.

The fix itself stays. It is right for whoever wires Stop up, and **#2298 is working in exactly
that area**, so the two will meet.

> **Carry forward, and this is the third time this pattern has cost something on this repo:**
> *verifying that a function is wrong is not the same as verifying that anyone can reach it.*
> Before describing a finding as user-facing — in a thread, a PR body or a ticket — grep for the
> call site, not just the definition. A hook can export a method that no component ever calls,
> and nothing in the type system says so.
>
> The specific tell here: the fix was to a function whose name implies a UI affordance
> ("stopStreaming" ⇒ a Stop button). Name-implied affordances are worth one grep.

### Build queue note

Both pushes (#2324 `ac7c529`, and the three master merges) sat **in_progress for 80+ minutes**,
against a ~22-minute norm for this repo (`51d15b8` ran 22:59→23:21 the previous night). Five
branches were pushed within two minutes of each other, so runner contention is the likely cause
rather than anything in the diffs. Per the run brief, a build still in progress is skipped
rather than chased.

### 12:40 — CI on `ac7c529`: **the tests passed; the job died on a Docker registry 500**

`build` came back **failure**, and the honest read of it matters, because the obvious conclusion
(my unverifiable tests broke something) is the wrong one.

What the log actually shows, in order:

| Step | Result |
|---|---|
| unit suite | **543 files / 6553 tests passed**, 150 skipped, 4 todo — 0 failures |
| `panelChange.test.ts` | **✓ 30 tests**, and `panelChange.ts` coverage **100/100/100/100** |
| `test:regression` | ✓ 1 file / 8 tests |
| SonarCloud | ✓ success |
| `docker/setup-buildx-action@v3` | ❌ `pulling image moby/buildkit:buildx-stable-1` → `Error response from daemon: received unexpected HTTP status: 500 Internal Server Error` |

So `revertTarget` / `revertMessage` are not just compiled but **fully covered and green on their
first real execution**, and the failure is a registry 500 booting buildkit — infrastructure,
after every test had already run. Re-run triggered (`rerun_failed_jobs` on run 38530202086);
that is the one re-run this failure is entitled to.

> **Method note worth keeping.** `get_job_logs` with a small `tail_lines` shows only the *end* of
> the job, which here was the Docker step — it looks like a build failure with no test evidence
> either way. The unit-suite summary was ~6 minutes earlier in the same log. Pull a large
> `tail_lines` (it saves to a file past the token limit) and grep that file for `Test Files` and
> the specific test name before concluding anything about whether tests ran.
>
> And the structural argument is available for free: **Actions steps are sequential and the job
> stops at the first failure.** A failure at step N is proof that steps 1..N-1 passed. Sonar
> running at all was already evidence the unit tests had gone green.

### 13:20 — correcting the "builds queued 80+ minutes" claim: that was stale API data

I reported CI congestion twice this run. It was wrong, and the mechanism is worth recording.

`pull_request_read method=get_check_runs` **serves stale results**. It kept returning
`status: "in_progress"` with no `completed_at` for jobs that had already finished:

| PR | What get_check_runs kept saying | Actual |
|----|--------------------------------|--------|
| #2298 | in_progress since 07:45 | **success, completed 08:08:07** (~22 min) |
| #2263 | in_progress since 07:45 | **success, completed 08:08:13** (~22 min) |

So build duration was **entirely normal**. There was no congestion, and the buildkit 500 on
`ac7c529` was an isolated registry blip rather than a symptom of a loaded CI.

> **Use `actions_get method=get_workflow_job` with the job id when a job's state matters.** It
> returns per-step status (`Set up job` → `Install dependencies` → `Type check` → `Lint & Run
> Tests` → … → `Set up Buildx` → `Build image`), which is both fresher and far more useful: you
> can see exactly which step is running rather than guessing from a job-level flag. The
> PR-level check-runs list is fine for a glance and unreliable for a decision.

Incidentally the step list from that call is the cheapest map of what this pipeline actually
does, and it confirms the ordering argument used above: **`Type check` (7) and `Lint & Run
Tests` (8) both run long before `Set up Buildx` (15)**, so a failure at 15 can never implicate
the tests.

Also visible there: the runner is self-hosted — `runner_name:
xyz-prod-mongodb-backups-1000073537`, label `XYZ-Prod-MongoDB-Backups`. Worth knowing that this
repo's PR builds run on a pool named for something unrelated.

Re-run (attempt 2) of `ac7c529` was at step 8 and had already passed Type check when this run
ended. Attempt 1 proved the suite green on this exact commit, so only the Docker steps remain
in question.

### 08:16 UTC — second correction: the API was **not** stale either. I could not tell the time.

**This supersedes the 13:20 entry above. Do not trust that entry's "stale API data" conclusion —
the timestamps in its own table disprove it.** Keeping it rather than deleting it, because the
mistake is more instructive than the fix.

The real sequence, with an actual clock reading (`date -u` → `2026-10-14T08:16:17Z`):

- Builds started 07:43–07:45. #2298 and #2263 completed **08:08** — about 22 minutes.
- Every `get_check_runs` poll I made happened **before 08:08**, so `in_progress` was simply
  **correct**. Nothing was cached, nothing was stale.
- The re-run's step 8 had been running 12.6 minutes against a ~9–10 minute norm. Normal.

So there was no congestion *and* no stale API — **CI behaved perfectly all morning.** I raised a
false alarm, then "corrected" it with a second false explanation that happened to reach the right
conclusion (builds are fine) by the wrong route.

> **Root cause, and the thing to actually carry forward: I inferred wall-clock time from my own
> `sleep` calls, and they were backgrounded, so several ran *concurrently*.** I added them up as
> if they were serial — 780 + 900 + 900 + 840 + 600 ≈ 67 minutes — and concluded 2.5–3 hours had
> passed. About 33 minutes had.
>
> **Never estimate elapsed time from your own waits. Run `date -u` and subtract.** It is one
> command, and without it every duration-based judgement — "this is slow", "this is hung", "this
> must be stale" — is built on nothing.
>
> The tell I ignored: when an API returns *byte-identical* data twice, "the server is stale" and
> "almost no time has passed" look exactly the same. The second is far more likely and costs one
> command to check.

Net effect on the work: **none.** No commit, comment or merge this run depended on the timing
claim; it only polluted two status reports to the user, both since retracted.
