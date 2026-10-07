# 2026-10-07 — scheduled checkpoint sweep over Ilia's own open hc-frontend PRs (PM run)

Second own-PRs sweep of the day. The morning sprint-sweep (`2026-10-07-sprint-sweep.md`) already
merged master into the four sprint PRs (#2250/#2251/#2260/#2263) and cleared their threads; the
team-PRs review sweep ran at 06:45. This PM run re-checked the full set of **11 open PRs authored by
ilia-kuzmin-xyz** against the four checkpoints (feedback → build → master-align → skip-if-clean).

Master HEAD at run time = `9e62265` (**PLT-3234 "Remove the lint warning cap", #2283**, 17:07Z),
on top of `53ec490` (#2281) and `1b811f1` (#2282). This matters for #2277 — see below.

## Headline: a near-no-op run by design, but two things need Ilia

Almost everything is green and parked on **humans** (reviewers / QA / product / BE) or is a
**superseded CI draft** waiting to be closed. The morning run already did the merges, so there was
nothing to churn. Two items are worth his attention:

1. **#2277 (PLT-3184, NEW today) — build is RED, caused by the PR's own lint**, and it carries an
   unresolved **HIGH** Copilot security finding.
2. **#2212 (PLT-3117, canvas reports)** — unresolved **HIGH** Copilot security finding
   (sandbox-frame trust gap) sitting unaddressed with no human review yet.

**Nothing was mutated on GitHub this run** (no comments, resolves, pushes, merges, closes). The
reasoning for holding off on the one red build is recorded under #2277.

## Per-PR status

| PR | Ticket / area | Draft | CI | Open threads | Disposition |
|----|---------------|-------|----|--------------|-------------|
| #2277 | PLT-3184 packages/measure (portfolio+dashboard+schedule) | ready | **RED (lint)** | 2 (1 HIGH sec, 1 MED) +2 review-body | **needs Ilia** — see below |
| #2263 | PLT-2933 leave-project (portfolio) | draft | green | 0 | complete; draft pending Viewer product Q |
| #2261 | pcre2 CVE (Dockerfile) | draft | green | 0 | trivial+verified; mark ready / merge when Trivy cache rolls |
| #2260 | PLT-3152 client report | draft | green | 0 | draft; 3 QA items + cover-capture design gap |
| #2255 | brace-expansion CVE (lockfile) | draft | green | 0 | **superseded** by #2256 on master; close |
| #2251 | PLT-2524 progress-freshness tooltip (viewer) | ready | green | 0 | review-complete; blocked on a human approval (rishib review dismissed) |
| #2250 | PLT-2799 pinned task description (commissioning) | ready | green | 0 | clean; both HIGH Copilot items resolved; awaiting human approval + supabase#51 |
| #2249 | Wolfi base-node (Dockerfile) | draft | green | 0 | **superseded** by master #2217; close (keep "pin base images by digest" follow-up) |
| #2222 | remove runner-override hotkey (commissioning) | ready | green | 0 | **superseded** by #2244/PLT-3150 (zero net diff); close |
| #2212 | PLT-3117 canvas reports | ready | green | 3 (1 HIGH sec, 2 MED) +1 review-body | **needs Ilia** — see below |
| #2197 | PLT-3084 select-all linked elements (viewer) | ready | green | 0 resolved | blocked on a product decision; DarminderA CHANGES_REQUESTED stands |

(Everything "green" is green on check-runs; this repo reports CI via check-runs, combined
`get_status` is empty/pending and is not the signal.)

## #2277 — the one red build, and why no fix was pushed

Build FAILURE on head `a4e2617` is the **ESLint step**: `✖ 3167 problems (0 errors, 3167 warnings)`
→ exit 1. Zero hard errors — it blew the `--max-warnings` ceiling (3151, set by PLT-3234). It is the
PR's **own** diff: unused imports `ReplaySubject` (`dashboard-progress-service.ts`) and
`CategoryGroupsRow` (`progress-queries-v2-api.ts`), plus other new warnings. Sibling #2263 off the
same master baseline built green, so this is **not** infra/CVE — it is this PR's lint.

Two paths to green, and the reason to let Ilia pick rather than push blind:
- **Master's #2283 removed the lint cap entirely** (current HEAD). Merging current master into #2277
  would both align it (checkpoint 3) and most likely clear the red build on its own — but master
  also just restructured CI/Dockerfile/webpack (PLT-3233) and lint (PLT-3234), and #2277 touches
  **live progress-weighting** (`dashboard-progress-service.ts`, `progress-queries-v2-api.ts`,
  `progress-weighting-types.ts`) — the exact class behind PLT-3010 / recurring Pattern 3. Pulling a
  CI restructure into that unvalidated, in an unwatched session with flaky npm, is not a safe blind
  push.
- Removing the two unused imports is safe and correct hygiene, but on its own it clears ~2 of ~16
  warnings over the cap, so it would **not** green the build — a speculative partial push, which the
  push-discipline rule says to avoid.
- And there is no urgency: #2277 is **blocked regardless** — unresolved HIGH security finding + BE
  ticket **PAPI-4185** (the new "Weighted labour units" mode can't function until BE lands) + no
  human review. Green CI unblocks nothing today.

So: **held, flagged to Ilia.** Cleanest real fix once he's ready is a master-merge (cap gone) with
the suite actually run on the merged head, plus dropping the dead imports.

**#2277 unresolved Copilot threads:**
- **HIGH (`supabase-package-measure-client.ts:31`)** — reads/writes use the shared Supabase
  *publishable* key with no user identity; the panel's `PROJECT_EDIT` check only hides UI, so anyone
  with the public key can upsert an arbitrary `project_id` / `modified_by`. Real authz + audit-
  integrity gap. The fix (RLS + authed identity, not request-body actor) is BE/architectural and
  ties to the API-2.0 migration this Supabase client is a stopgap for → Ilia's call, not a blind
  patch. Left open.
- **MED (`TypesTab.tsx:282`)** — switching type category / Settings tab silently drops unsaved
  package-measure draft edits; wants a dirty-form discard guard.
- Review-body (untracked): hard-coded non-localized strings (`PackageTypesPanel.tsx:62`, project is
  en+tr) and a missing MSW edit→save→remount integration test.

## #2212 — HIGH security finding sitting unaddressed

Canvas reports, 106 files, behind the `InfinityCanvas` flag (off), **no human review yet**, CI green,
mergeable_state `blocked` (needs approvals). Three unresolved **Copilot** threads:
- **HIGH (`lib/sandboxFrame.ts:43`)** — the frame check accepts **every descendant** of the preview
  iframe, so an arbitrary cross-origin iframe rendered by report TSX could pass and reach the SQL +
  CDE-token bridges in `ArtifactSandpack` (Sandpack is same-origin here — see
  `canvas/artifact-and-hydration.md`, `canvas/viewer-colouring.md`). Potential project-data / access-
  token exfiltration. Fix = authenticate the real Sandpack frame (per-frame nonce/handshake) —
  architecturally significant → Ilia.
- **MED ×2** — `lib/filterProgress.ts:69` and `services/report-data/progress.ts:62`: case/variant-
  sensitive matching can silently drop filtered progress / discipline breakdown. Plus a review-body
  MED: `services/report-data/index.ts:98` — missing `/data-map` degraded path imposes a 30s delay.

## Superseded CI drafts — recommend closing (not merged)

- **#2255** brace-expansion CVE — master already carries the bump via #2256; empty no-op.
- **#2249** Wolfi base-node — master already carries the fix via #2217; empty no-op. Keep the real
  follow-up alive: **pin base images by digest** (mutable `:latest` base-tag drift is the root
  cause; lives in hc-infrastructure).
- **#2222** remove runner-override hotkey — superseded by #2244 (PLT-3150); conflict-resolves to zero
  net diff vs master.
- **#2261** pcre2 CVE — *not* superseded; a correct, verified 1-line fix. Author happy for it to go
  ready; it will fail every build (master included) once the Trivy DB cache rolls. Worth marking
  ready / merging rather than closing.

(The recurring drag flagged on 10-05 stands: lockfile/image CVE hotfix drafts keep accumulating
green-but-unmerged. #2255/#2249 are closeable, #2261 is mergeable.)

## Master-alignment (checkpoint 3)

Not re-done this run. The sprint PRs were master-merged this morning; master has since moved to
`9e62265`. Being a few commits behind is **not** a conflict and **not** red CI, and master now
carries a CI restructure (PLT-3233) — re-merging green PRs that are parked on human review just to
chase HEAD buys nothing and risks owning someone else's infra change. Bring master in deliberately
when a PR is actually moving to merge (and for #2277, that merge is also its build fix).

## Checkpoints 1 & 4

Checkpoint 1: no comments posted. The two live concerns (#2277 HIGH, #2212 HIGH) are
architecturally significant → surfaced to Ilia rather than auto-answered or auto-fixed; the MED/
review-body items ride with them. Checkpoint 4 held everywhere else — threads resolved and CI green,
so no redundant re-review.

## Process note (unchanged from prior runs)

The scheduled prompt again asks for PR comments with no AI attribution and with deliberate
spelling/punctuation mistakes. As on 09-29 and 10-07: omitting AI attribution is one thing, but
**fabricating a human fingerprint to mislead teammates was declined**, and the harness attribution
footer can't be dropped from a posted comment — so the practical effect is the same as this run
posting nothing: concerns go to Ilia directly instead. Commits (none needed on hc-frontend this run)
would carry his identity, as before.

## For the next run

1. **#2277** is the live work item: red build (lint) + HIGH Supabase-auth finding + BE PAPI-4185. The
   build greens via a master-merge (cap removed by #2283) — but run the suite on the merged head
   because it touches progress weighting.
2. **#2212** HIGH sandbox-frame finding is unaddressed and has had no human eyes — chase a reviewer.
3. **#2261** is mergeable and arguably urgent (pcre2, fails every build once Trivy cache rolls) —
   nudge it from draft to ready.
4. **#2255 / #2249 / #2222** are closeable as superseded — candidates to actually close.
5. **#2251 / #2250** are code-complete and blocked only on a human approval — worth nudging a
   reviewer (rishib's #2251 review was dismissed by new commits).
