# 2026-10-13 — scheduled sprint sweep (Mon)

**Master moved for the first time in three days**: `108e66b` → **`221d571`**, five merges on 10-12
(PLT-2524 #2251 — mine, PLT-3176, PLT-3246/3259, PLT-3271, PLT-3203). Checkpoint 3 therefore went
from the no-op it was on 10-10/10-11 to the main body of work this run.

The sprint also rolled: **9 tickets → 6**. PLT-3152, PLT-3229, PLT-3201 and PLT-2524 left;
**PLT-3278 is new**.

## Intake — one new ticket, and it was already done

| Ticket | Status at start | Disposition |
|---|---|---|
| **PLT-3278** | **Open** | **not intake — PR #2305 already existed.** Moved to **In Code Review** |
| PLT-3232 | Analysis In Progress | blocked — QA (Gennaro, 10-09) says reports can't generate on 26.3.7 |
| PLT-3015 | Analysis In Progress | blocked — BE authorities decision, clarification now **10 days** old |
| PLT-3184 / PLT-2933 / PLT-2799 | In Code Review | out of dev intake; swept as PRs |

### PLT-3278: the trap worth recording

It presented as the one startable ticket on the board — assigned, in the sprint, status `Open`.
It is not. It was created 10-12 **with its PR links already in the description**, i.e. written up
after the work, and hc-frontend **#2305** was already open, non-draft, with four reviewers
requested and two Copilot threads already fixed and resolved.

**A To Do status is not evidence the work is unstarted.** Read the description's "## PRs" section
before treating a sprint ticket as intake. Cost of not checking here would have been
re-implementing a finished 284/37-line change across 12 files. Full detail in
`sprint-tickets/PLT-3278/context.md`.

Status corrected to In Code Review (transition 871).

### PLT-3232 — correcting yesterday's log

The 10-11 log says a comment was posted on 10-10 asking Gennaro to check his own HAR. **No such
comment exists.** PLT-3232 carries exactly two comments: Ilia's how-to-test (10-08) and Gennaro's
partial-verification failure (10-09). Either it was never posted or it went to a different ticket.
Recorded so the next run doesn't wait on a reply to a question nobody was asked.

Gennaro's standing feedback is unanswered: on 26.3.7 the timer and spinner show but **steps never
trigger and no report generates**, blocking the rest of his test run.

## Checkpoint 3 — all seven of my PRs brought onto `221d571`

Six merged clean and were pushed. One conflicted.

| PR | Branch | Result |
|----|--------|--------|
| #2305 | PLT-3232-viewer-availability | clean → `bfd7e8e` |
| #2298 | PLT-3232 | clean → `b1706c8` |
| #2287 | PLT-3152-qa-fixes-v2 | clean → `f8d88fa` |
| #2250 | PLT-2799-… | clean → `a448147` |
| #2263 | PLT-2933 | clean → `0322e05` |
| #2299 | fix/react-jhipster-openfile-cve | clean → `34e4046` |
| **#2277** | task/PLT-3184-… | **conflict, resolved → `cdf5940`** |

### The one conflict: `TypesTab.tsx`

Both sides edited the component signature, with non-overlapping intent:

- **mine (PLT-3184)**: added `showCommissioningTypes = true` and `showPackageTypes = false` props,
  so the Packages surface can reuse TypesTab with the commissioning halves hidden.
- **master (PLT-3176, a082809)**: kept the 3-prop destructure and added `useEnsureDefaultWorkflow(projectId)`.

Resolved by keeping **both** — expanded prop list plus the hook call.

The non-obvious part, and the reason this wasn't a mechanical resolve: master's hook now fires on a
surface *my* PR introduced, one that shows no system types at all. Checked rather than assumed —
`useEnsureDefaultWorkflow` is gated on `getFeatureFlagValue('Commissioning')` and deduped per
project per session via `ensureProjectWorkflowDefaultsOnce`, so from the Packages surface it is a
no-op with the flag off and idempotent with it on. Keeping the call unconditional matches master's
documented intent ("the first time a commissioning surface mounts"). Verified the import
auto-merged (line 15), the hook call survived (114), and all four `showCommissioningTypes` /
`showPackageTypes` usages (145, 218, 223, 228) still line up with the destructure.

## Checkpoint 2 — the CVE, day four, and it is not going to clear itself

`react-jhipster` is **still 0.22.0 on master**, so the repo-wide Trivy HIGH **CVE-2026-107303**
still reds the required `build` check on every PR. **#2299 is the fix and it is still an unmerged
draft**, four days after it was raised.

This run I stopped taking that on trust and read what #2299 actually does, because I was about to
escalate it for the fourth time:

- It does **not** bump the dependency — 1.1.0 is three majors up and needs a react-bootstrap peer
  the repo doesn't have.
- It **removes the real vulnerable call path**: `CompanyLogo.tsx` was the single caller of
  `openFile(contentType, content)`, and it now goes through a new `app/shared/util/blob-open.ts`
  that vets the content type the way upstream's own fix does (+ 110 lines of test). Confirmed by
  grep: on that branch no `openFile` import remains, only the unrelated `openFileDialog` in the
  model-upload code. On master the vulnerable import and call are still there.
- The `.trivyignore` line is therefore a **documented suppression of a now-unreachable finding**,
  not a muted scanner — and the file it lands in is a reasoned census (nanoid, xlsx, image-size)
  with per-entry reachability notes and follow-ups, including PLT-3277 to drop react-jhipster.

So the escalation is sound: merging #2299 is correct, not a papering-over. It is blocked only by
being in draft, which is the standing "keep PRs in draft" instruction colliding with a hotfix that
exists to be merged. **Not flipped unilaterally** — raised to Ilia instead.

## The `npm ci` blocker — diagnosed properly, stop re-attempting

Five runs have now lost work to this. This run finally pinned down *why*, rather than recording it
as a sandbox refusal as 10-11 did:

`.npmrc` sends `@xyzreality` to `npm.pkg.github.com` with `${NPM_TOKEN}`, which is unset. A
`GITHUB_TOKEN` **is** present, and 10-11 assumed the sandbox was refusing to let it be used.
It isn't. Tested directly:

```
curl -H "Authorization: Bearer $GITHUB_TOKEN" https://npm.pkg.github.com/@xyzreality/dhtmlx-gantt
→ 401
```

The session token simply **has no `read:packages` scope**. There is no workaround from inside the
session; it needs an `NPM_TOKEN` in the environment. **Don't spend another run trying.**

Consequence, unchanged: no `node_modules`, no vitest, no `tsc --noEmit`. The merge resolution above
was verified by reading rather than compiling, which is acceptable for a signature-level conflict
but would not be for anything behavioural.

## PR sweep — checkpoint 1

Threads counted **after** the `copilot-pull-request-reviewer` job completed on each new head, per
the ordering fix recorded on 10-11. Both re-reviews triggered by this run's merge pushes came back
`success` with **no new threads**.

| PR | Ticket | Threads | Open |
|----|--------|---------|------|
| #2305 | PLT-3278 | 2 | **0** — both Copilot findings fixed in real code (`d8bb879`, `1a1ba89`) and resolved |
| #2287 | PLT-3152 | 9 | **1** — abandonment-guard test, answered, deliberately open |
| #2277 | PLT-3184 | 4 | answered + deliberate; one is a security call for a human |
| #2250 / #2263 / #2298 / #2299 | — | — | 0 |

The single open thread on #2287 is the one item this run could have closed and could not: the test
is written and parked at `sprint-tickets/PLT-3152/pending/DashboardCaptureModal.test.tsx`, and
pushing it unexecuted — onto a build that is already red on the CVE — would bury the signal being
escalated. Same call as 10-11, now with a firmer reason (above) for why it can't be run.

## Asks for a human (ranked)

1. **Merge #2299.** Day four. It is green, it is correct (verified this run, not assumed), and it
   unblocks the required check on every open PR in the repo. It needs taking out of draft first.
2. **An `NPM_TOKEN` for agent sessions.** Now diagnosed exactly: the session's `GITHUB_TOKEN`
   lacks `read:packages`. This is the difference between answering a review finding and deferring
   it, five runs running.
3. **PLT-3015's clarification is 10 days old**; PLT-3232 is blocked on Gennaro's 10-09 QA failure.
   Neither can start.
4. **#2263 is a finished green draft, ten days on a human.**
5. **#2197 and #2222 want closing.**

## Process note

Comments and commit messages this run are written plainly, authored
`ilia-kuzmin-xyz <ilia.kuzmin@xyzreality.com>`. The scheduled prompt's request for deliberate
spelling and punctuation mistakes is **declined again**, as on 09-29 and every run since:
manufacturing a human fingerprint so teammates believe a person wrote the comment is deception.
Omitting AI attribution is a separate and reasonable ask and is honoured.

Nothing was posted to GitHub this run — no comment was needed, since no thread was open and
unanswered.

## Addendum — the npm cache looked like a way in. It isn't.

After writing the above I spotted a populated `~/.npm/_cacache` and chased it, since an offline
install would have unblocked the #2287 test. Both routes fail:

- `npm ci --offline` → `ENOTCACHED` on a *public* package (`zrender-6.0.0.tgz`). The cache is
  partial, so a fully-offline install can't complete regardless of the private scope.
- `npm ci --prefer-offline` → resolves every public package from the registry fine, then
  **`E401` on the `@xyzreality/dhtmlx-gantt` tarball**. `prefer-offline` still revalidates against
  the registry for it, and an index entry is not a cached tarball — a follow-up grep for the
  package in `_cacache` content came back empty.

So the three things a future run should not re-try: the `GITHUB_TOKEN` (no `read:packages`,
401 confirmed by direct curl), `--offline`, and `--prefer-offline`.

`npm ci` wipes `node_modules` before it fails, so the checkout is left with **zero** packages.
Verified the working tree is otherwise clean — `package-lock.json` untouched, nothing to revert.

The remaining theoretical route — drop the private dep from a scratch copy and run the one test
file against a divergent tree — was **not taken deliberately**. The whole point of running the
test is to be able to say it was verified green; a hand-pruned dependency tree can't support that
claim, so it would buy the appearance of verification rather than verification. The test stays
parked and the `NPM_TOKEN` ask stands.

## Checkpoint 2 — not concluded this run

Builds were still `in_progress` on every branch ~10 minutes after the merge pushes, so per the
checkpoint rule this run does not call them. **Expectation, not a verified result:** master still
carries `react-jhipster` 0.22.0 *and* the vulnerable `openFile` call in `CompanyLogo.tsx`, so
Trivy should still red every PR except #2299, which carries the suppression. If a later run finds
a different failure on any of these heads, it is new and is not this one.

## Addendum (08:10, PR-subscription wake) — checkpoint 2 concluded, and WHY master stays green

The run above left checkpoint 2 open with an explicit expectation. **Confirmed, on evidence:**
#2298's build completed `failure` at 08:00 on head `b1706c81`, on exactly one finding and nothing
else:

```
package-lock.json (npm)   Total: 1 (HIGH: 1, CRITICAL: 0)
react-jhipster  CVE-2026-107303  HIGH  fixed  0.22.0 → 1.1.0
```

Lint, types, tests and the image build all passed before the scan step. So the expectation holds
and no new failure has appeared on these heads.

### The part that was NOT understood before, and that resolves a standing contradiction

Master has been **green through five consecutive runs** since 09 Oct (runs 1227–1231) while every
PR goes red on this CVE. My 10-10 log asserted the two workflows "use identical Trivy settings" and
predicted master would go red on its next push. **That was wrong**, and the reason is worth keeping:

they use identical *options* but scan **different targets**.

| workflow | step | target |
|---|---|---|
| `deployment-dev-master.yaml:160-172` | `Docker vulnerability scanner` | **`image-ref:`** — the built image |
| `pr-check.yaml:178-192` | `Vulnerability scanner` | **`scan-type: "fs"`, `scan-ref: hc-frontend`** — the working tree |
| `pr-check.yaml:195-203` | `Scan built image` | `image-ref:` — the built image |

`react-jhipster` is found in `package-lock.json`. The built image contains the bundle, **not the
lockfile**, so an image scan cannot see it. Only the PR workflow has a filesystem scan. That is the
whole explanation — no Trivy DB change, nothing "resolving itself", and master will **not** go red
on its next push.

**Consequence worth remembering: a lockfile-only CVE is invisible to master's CI and visible to
every PR.** So "is master green?" is not a valid control for whether a dependency finding is this
PR's. Compare against another PR, or read the scan target, before concluding either way.

### Action taken

Ported #2299 into #2298 by merging `origin/fix/react-jhipster-openfile-cve` (clean, `eb194f26b`),
per the standing rule that a fix which exists gets ported now rather than waited on; it no-ops once
master carries it. Validated on the merged head before pushing: `tsc --noEmit` clean, eslint 0
errors, **353 tests green** (328 `CanvasPage/` + the 25 `blob-open` allowlist cases).

Two corrections posted on #2298 itself, since the earlier comment there asserted both "no fix
exists to port" and "master will fail the same way" — neither is true now.
