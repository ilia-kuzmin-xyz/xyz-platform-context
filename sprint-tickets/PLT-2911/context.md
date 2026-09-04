# PLT-2911 — Validate project weighting is Labour Hours before enabling Portfolio

**Type:** Task · **Project:** PLT
**Jira status (2026-07-25 run):** **Dev In Progress** → implemented.
**Confidence:** HIGH (self-contained, frontend-only, data already in-form).
**Branch:** `PLT-2911` off `origin/master`. Draft PR opened.

## What the ticket asks
When a user enables "Show in Portfolio" ("Included in Portfolio Dashboard") for a project,
check the project's progress weighting type. Only allow if weighting = **Labour Hours**
(`PLANNED_LABOUR_HOURS`). If not (e.g. Element Count), block the enable and show a clear
message telling the user to change the weighting first. Portfolio-enabled state must stay
unchanged when the check fails.

## Domain (verified in hc-frontend)
Top-level domain = **PortfolioPage → ProjectSettings modal → General tab (edit view)**.
- Editable toggle: `src/main/webapp/app/pages/PortfolioPage/components/ProjectSettings/GeneralTab/GeneralTabEdit.tsx`
  - portfolio `Checkbox` field `isPortfolioEnabled` (~L442-, behind `Portfolio-Dashboard` FF `getFeatureFlagValue`).
  - weighting radio field `progressWeightingMethod` in the SAME `useForm` (`FormRadioGroup`, ~L434).
  - save is batched on the "Save" button → `onSubmit` → `useUpdateProjectMutation` → `ProjectApiV2.updateProject`.
- Weighting enum: `app/types/progress-weighting-types.ts`
  - `ProgressWeightingType.PLANNED_LABOUR_HOURS` ("Budgeted labour units" label) vs `LINKED_ELEMENT_COUNT` ("Model element count").
  - **Default when unset = `LINKED_ELEMENT_COUNT`** (`useProjectQuery.ts`, form default L96-97) → such projects are blocked (correct per AC).
- Reused: `useToastService().showToast` (already imported), `Badge variant='warning'` (already imported), `useWatch` (RHF).

## Implementation (this run)
All in `GeneralTabEdit.tsx` (+ new test). No new deps / API / components.
1. `PORTFOLIO_WEIGHTING_WARNING` message constant (references the `PLANNED_LABOUR_HOURS` UI label).
2. `useWatch` on `progressWeightingMethod` → `isLabourHoursWeighting` (reads LIVE form value so a same-session weighting change is honoured — avoids false block).
3. Portfolio checkbox `onChange`: if enabling & not Labour Hours → `showToast(warning)` + early return (leaves toggle unchanged). Else normal `field.onChange`.
4. Inline warning `Badge` in the genuine conflict state only (`field.value && !isLabourHoursWeighting`) — avoids noise, since element-count is the default for many projects.
5. `onSubmit` guard: block save if `isPortfolioEnabled && weighting !== PLANNED_LABOUR_HOURS` (covers switching weighting away AFTER enabling).
6. New test `GeneralTabEdit.test.tsx`: blocks + warns on element-count; allows on labour-hours.

## AC → coverage
- check on attempt → onChange guard ✓
- labour hours proceeds → else branch ✓
- non-labour blocked/not added → early return ✓
- clear message + change weighting first → toast + badge ✓
- portfolio state unchanged on fail → early return (no field.onChange) ✓

## Notes / decisions
- Message uses the exact radio label ("Budgeted labour units") the user must change — more actionable than the biz term "Labour Hours".
- Non-destructive: switching weighting away while portfolio is on is NOT auto-unchecked; badge + submit guard handle it. If product prefers auto-uncheck, easy follow-up.
- Purely FE guard; no backend endpoint enforces it (matches the ticket's UI-behaviour framing).

## Next run
- If CI/build is green and PR approved, nothing more. If reviewers want auto-uncheck on weighting change or a different message tone, adjust in `GeneralTabEdit.tsx`.

---

## Run log — 2026-08-01

- Jira: **In Code Review**. PR #2071, reviewers requested (TomMasdinXYZ, DarminderA, rishib-xyz, SergiuszXYZ).
- Copilot raised 2 review threads on 2026-07-30, **both already addressed and resolved**:
  1. submit-time guard ran even with the `Portfolio-Dashboard` flag off (a legacy portfolio-on +
     element-count project would have had *all* edits blocked with no way to clear the conflict)
     → guard gated behind `isPortfolioDashboardEnabled` in `df96d85`.
  2. submit guard + conflict badge untested → test added covering badge render, blocked save, and
     `mutateAsync` never called.
- **0 open review threads.**
- CI: red only on the repo-wide Trivy `brace-expansion` CVE (master's lockfile). Sonar green.
- Checkpoint 3: merged `origin/master` (`28e03c3`) in — was 1 behind. Clean, no overlap
  (master touched dashboard viewer/progress files; this PR touches `GeneralTabEdit.*` only).

## Next run
- Nothing to do until reviewers respond or #2072 lands. Do not re-address the two resolved Copilot threads.

## Run log — 2026-08-05: requirement changed by PM (Pietro), PR reworked

Pietro's Jira comment (2026-08-05, ticket also renamed) supersedes the original AC: the check is
**consistency with the portfolio's current members**, not a fixed Labour-Hours rule. Empty
portfolio → anything joins (first project sets the basis); all-element-count portfolio accepts an
element-count project; only a mismatch blocks. Per Ilia: no reply to Pietro on Jira.

**Reworked in `cc6511b` on PR #2071** (title + description updated):

- `portfolio-weighting-guard.ts` (new, pure): `getPortfolioWeightingConflict(candidate, members[])
  → message | null`. Mixed-weighting legacy portfolio blocks everything with a dedicated message.
- `usePortfolioWeightings.ts` (new): members' distinct weightings derived from the `['projects']`
  list (has `isPortfolioEnabled`, NOT weighting) + per-member `projectQueryOptions` details
  (HAS weighting, cached 5 min). Cached under `['portfolio-weightings', id]`; invalidated in
  `useUpdateProjectMutation.onSuccess`. **Excludes the edited project** — so a sole member can
  change weighting freely; a member with peers is compared against peers.
- Eager fetch only when flag on && already portfolio-enabled; checkbox path awaits
  `ensurePortfolioWeightings()` on demand (zero requests for non-portfolio projects).
- Lookup failure → **block** with retryable "couldn't verify" toast (consistency over convenience).
- Unticking never guarded.
- `useProjectsQuery` now exports shared `projectsQueryOptions` (fetchQuery hits the same cache).

Data-shape facts worth keeping: `user-projects` list (`TransformedProject`) has `isPortfolioEnabled`
+ `postgresProjectId` but **no weighting**; details via `projectQueryOptions` default missing
weighting to LINKED_ELEMENT_COUNT; `PortfolioSummaryDto` has **no member projects at all**.

Known gap (stated in PR): frontend-only guard — a racing edit from another browser can still create
inconsistency; server-side enforcement would be a backend ticket.

### Self-review addendum (same day) — found and fixed before human review

Adversarial pass after pushing `cc6511b` caught one real bug + two limitations:

1. **Tenant scoping (fixed, `d1c83cf`).** `getUserAssignedProjects` spans every tenant the user is
   assigned to; portfolios are per-tenant. Unfiltered, a portfolio-enabled project in another tenant
   joined the comparison set → wrong block/allow. Now filtered by `project.mongoTenantId`; rows with
   unknown tenant are KEPT (over-blocking safe, dropping a member not).
2. **Members invisible to the editing user can't be compared** — lookup sees only the user's own
   assigned projects. Documented in PR; real fix is server-side.
3. **Mid-click radio race** — weighting read at click time; submit guard re-validates with final
   form values, so nothing inconsistent persists. Documented.

PR "Known limitations" section added; test steps gained the multi-tenant check (step 8).

---

## Run log — 2026-08-06: Darminder's "can't turn it on at all" was `Promise.all` (fixed, `2accb3b`)

**Darminder left a second `CHANGES_REQUESTED` on #2071 (2026-08-05 15:51, commit `fc37f36`):**
*"Thanks for making that change. I am now finding no matter the option I select I am unable to
turn on Portfolio Dashboard for project"* — with a video.

### The deduction that pinned it without needing the video

Under the members-consistency rule, if the other portfolio members share **one** distinct
weighting W, then exactly one of the two radio options (namely W) **must** be allowed. So
"blocked no matter which option I select" is only possible in two states:

1. `portfolioWeightings.length > 1` → the mixed-portfolio hard block, or
2. `ensurePortfolioWeightings()` **rejected** → `PORTFOLIO_WEIGHTING_CHECK_FAILED`.

That narrowing is pure logic on the guard's own truth table — worth redoing rather than guessing
from a screen recording next time.

### Root cause (state 2), and why it was permanent

`usePortfolioWeightings` fanned the member-details reads out with **`Promise.all`**. And
`projectQueryOptions.queryFn` (`PortfolioPage/hooks/useProjectQuery.ts:19`) **throws on any HTTP
error**. So a single unreadable member rejected the whole lookup:

- a portfolio can legitimately contain a project the editing user is **not a member of** → the
  details endpoint 403s;
- or a member row's `postgresProjectId` no longer resolves → 404.

One such member ⇒ every enable attempt blocked, for **either** weighting, and the message says
*"Please try again"* — which for that state can never succeed. Indistinguishable from "the feature
is broken", which is exactly how it was reported.

**Fix:** `Promise.allSettled`, decide on the members that could be read. The safety argument is
what makes this sound rather than just lenient: **acting on the readable subset cannot introduce a
NEW inconsistency** — if an unreadable member's weighting differed from the readable ones, the
portfolio is *already* mixed, and blocking the candidate would not make it consistent. A portfolio
where **no** member could be read still rejects, so it is never mistaken for an empty portfolio
(which accepts anything).

Mirrors the established pattern in `services/modelService/element-types-service.ts:116`
("Only the healthy artefact contributes; 404 is silenced via allSettled") — reuse, not invention.

### ⚠️ The stale-cache commit `7a48281` did NOT fix this

The previous run pushed `7a48281` ("must read fresh membership, not a 5-minute cache") 25 min after
Darminder's report, hypothesising he had emptied the portfolio and hit a warm cache. That is a real
robustness improvement but **addresses neither state 1 nor state 2**, and it wouldn't survive a page
reload anyway — Darminder tested repeatedly. Do not treat that commit as the answer to this review.

### Still open, and it is a product question not a bug

If Darminder was in **state 1** (genuinely mixed portfolio), the guard is behaving as written and
the result is a **dead end**: a portfolio that already contains mixed weightings blocks every new
project, and the only escape is aligning the other projects — which the user may not have access to
do. That rule is Pietro's (2026-08-05 reframing), so it was **not** changed unilaterally. Asked
Darminder on the PR which of the three messages he saw, since they discriminate the states exactly.

### Verification — tests actually ran locally this time (see PLT-1770 log for the recipe)

- 3 suites / **17 tests** green (`usePortfolioWeightings`, `portfolio-weighting-guard`, `GeneralTabEdit`).
- The new regression test **fails against `Promise.all`** and passes with `allSettled` — confirmed by
  reverting only the source file and re-running. A test that passes both ways proves nothing.
- `tsc --noEmit` clean for both changed files.

### Also this run — a parallel session left `portfolio-weighting-guard.test.ts` on the old signature

Three sessions pushed to `PLT-2911` during this run (`bb56c59`, `fe82300`, `2a9b45d` — naming the
conflicting projects in messages, a checking state while the guard runs, spinner sizing). Those
commits changed `getPortfolioWeightingConflict`'s second argument from `ProgressWeightingType[]` to
**`PortfolioMemberWeighting[]`** (`{ name, weighting }`) so a blocked user can see *which* project
holds the portfolio to a different weighting.

The production call sites were all updated consistently. **`portfolio-weighting-guard.test.ts` was
not** — it still passed bare enum values, so it failed three ways: labels rendered as `"undefined"`,
the matching-weighting case reported a conflict, and the mixed case fell through to the mismatch
branch. `tsc` flagged it at six sites too. Fixed in `ffb2079`, and extended to cover what the new
shape is *for*: both offenders named in the mixed case, and the `MAX_NAMED_PROJECTS = 5` cap with
`"N more"`.

**Two lessons, both cheap:**
1. **A signature change is not done until its test file compiles.** `tsc --noEmit` catches this in
   seconds and would have caught it before the push.
2. **Re-run the suite on `origin/<branch>` after pulling a parallel session's work**, not just on
   your own commits. This break existed only on the *combined* head — neither session's own change
   was wrong in isolation. Running tests locally (recipe in the PLT-1770 log) is what surfaced it;
   inferring from "my diff is fine" would have shipped it to CI.

Final state: `2488648`, **19 tests green** across the three portfolio-weighting suites, tsc clean.

## 2026-08-07 — APPROVED by Darminder, then dismissed by our own gap fix

**Darminder approved #2071 on 2026-08-06 21:30 (`d33a39e`)** — *"Thanks for making those changes.
Approved!"*. Both prior `CHANGES_REQUESTED` rounds are cleared; the `Promise.allSettled` diagnosis
was right. The open product question from the last entry (mixed-weighting portfolio dead end) was
never raised by him, so it stays a latent design question, not a blocker on this PR.

**Jira has moved on:** PLT-2911 is now **Ready For QA, reassigned to Gennaro Boccia**, so it no
longer appears in the sprint JQL. The PR is still open and still ours.

### The "big gap in project settings" — diagnosed, and it was pre-existing

His approval carried one note: *"there is now a big gap in the UI for project settings, it is in DEV
as well"*. A parallel session pushed `9f9f3a2` two minutes later; this run **verified it instead of
trusting it**:

- Two back-to-back `<ModalDivider width='inherit' marginLeft='0' />` sat between the Country field
  and the Timezone section in `GeneralTabEdit.tsx`.
- `ModalDivider` (`ViewerPage/components/common/modal/modal.styles.tsx:65`) is a **zero-height div
  whose only paint is `border-bottom`** — no height, no margin of its own.
- Its parent `Details` (`GeneralTab.styled.tsx:58`) is `display:flex; flex-direction:column;
  **gap:24px**`.
- ⇒ the duplicate was **not** a second visible line, it was **an extra 24px of flex gap**. That is
  the whole explanation for "big gap" rather than "double border", and it is why it looked like a
  layout bug rather than a stray rule.
- **Pre-existing on master** — both dividers are at `origin/master` lines **332/334**, verified by
  reading the blob, which matches his "it is in DEV as well". Not caused by this PR.

He explicitly said *"if its a quick change would be good to get in"*, so keeping the 2-line fix on
this branch is sanctioned, not scope creep.

### ⚠️ Lesson: fixing a reviewer's drive-by note costs you their approval

`9f9f3a2` landed **after** the approval, so GitHub auto-dismissed it (review state `DISMISSED`) and
**nobody is notified**. The PR then looks unreviewed while actually being approved-and-superseded.
If a reviewer approves *with* a minor note, either batch the fix into a follow-up PR or expect to ask
for a re-click — and always ask explicitly, because the dismissal is silent.

### Checkpoint 3 — master merged, re-verified

2 commits behind (`5cb9f8b`). Checked the 7 npm deps removed by `d9e8515` against this branch first:
**zero imports**, so safe. Merged clean → `bccd37c`; **22 tests / 4 files green** on the merged tree
(GeneralTabEdit, portfolio-weighting-guard, usePortfolioWeightings), run under **vitest**, not jest.
CI green (`build` + SonarCloud).

## 2026-09-04 — Radu's "i can see it included": it's the BADGE, and the message is wrong for that state

Reported from QA with a screenshot: the **mixed-weightings** message rendered directly under a
**ticked** "Included in Portfolio Dashboard" checkbox. Radu: *"i can see it included"*.

**He is right, and the guard is behaving exactly as written.** What he is looking at is the inline
conflict **badge**, not a failed enable — three independent confirmations:

1. **DOM order.** The screenshot reads: checkbox → message box → "Included in portfolio metrics.
   Access permissions still apply." → "Updates may take up to 15 minutes" (clipped). That is the
   JSX order in `GeneralTabEdit.tsx` exactly (checkbox → spinner → `<Badge variant='warning'>` →
   the two helper `Typography` lines). A toast would not sit inside that stack.
2. **The badge's render condition REQUIRES the project to be enabled** —
   `GeneralTabEdit.tsx:139-142`: `liveWeightingConflict = isPortfolioEnabledLive &&
   portfolioMembers ? getPortfolioWeightingConflict(...) : null`. So a ticked box is a
   *precondition* of the badge, not a contradiction with it.
3. The enable path cannot produce this: `onChange` shows a **toast** and returns *without*
   `field.onChange(true)`, so a blocked tick leaves the box **unticked**.

### The actual defect: one message serving two different states

`getPortfolioWeightingConflict` (`portfolio-weighting-guard.ts:57-64`) is phrased for the **add**
path — *"This project **can't be added** to the Portfolio Dashboard…"* — and the badge reuses it
**verbatim** for the **already-added** state. Hence "can't be added" printed next to a ticked box.
Not a logic bug; a state-wording bug. The badge needs its own copy, e.g. *"This project is in the
Portfolio Dashboard, but the portfolio contains projects with mixed progress weightings … aggregate
figures may be inconsistent until they are aligned."*

### The data is confirmed BY THE MESSAGE — no API call needed

The rendered string is a faithful serialisation of the lookup result, so it can be read backwards:

| Evidence in the string | What it proves |
|---|---|
| 5 project names, **no "and N more"** | exactly **5** readable other members (`MAX_NAMED_PROJECTS = 5`; 6+ would print "and N more") |
| `"Budgeted labour units vs Model element count"` — from `distinctWeightings.map(label).join(' vs ')` | **both** weightings present among those 5 ⇒ `distinctWeightings.length === 2` ⇒ the mixed branch fired |

So the portfolio in that tenant genuinely holds 5 members spanning both weightings. **This is the
branch the code itself labels "Legacy state from before this guard"** — those projects were
portfolio-enabled before #2071 merged (2026-08-07), and the guard is frontend-only, so it never had
a chance to prevent them. Expected on any environment with pre-existing portfolio members.

### ⚠️ The consequence that matters more than the wording: Save is blocked for the WHOLE tab

While that badge shows, `onSubmit` (`GeneralTabEdit.tsx:199-216`) re-runs the guard on **any** save
where `isPortfolioEnabled` is true and aborts on conflict. So the user cannot save **name, country,
timezone — anything** on that project's General tab. The only escape is to **untick Portfolio and
save** (unticking is never guarded, so that path works), or align/remove the 5 legacy members.

This is the dead end flagged as a "latent design question" on 08-07. **It is no longer latent — QA
has hit it.** Two follow-ups, and the first is Pietro's call not ours:
1. **Product:** should an already-mixed portfolio hard-block every project? Pietro's 08-05
   reframing never covered the already-mixed case; the hard block was our reading of it.
2. **Engineering, independent of (1):** give the badge its own already-in wording, and narrow the
   submit guard so a pre-existing portfolio conflict doesn't block unrelated field edits.

### Test steps did not cover this, on purpose — the precondition was never met

Both my Jira steps (09-02) and the PR's "How to test" **require the portfolio to start empty**
("No other project in the tenant portfolio-enabled — untick any that are"). Radu's tenant had 5
enabled with mixed weightings, so he never entered the scripted path at all — he landed straight in
the legacy-mixed branch, which **none of the 6 steps exercises**. Worth adding a step 7 for it.

### API verification was blocked at the network edge (for the record)

Tried to confirm the 5 members' weightings with a QA bearer token via
`GET /api/v2/projects/user-projects` + `GET /api/v2/projects/{postgresProjectId}`:
- `cloud.xyzreality.com` (prod) → genuine platform-api **401 "The attached token was not valid"** —
  the token is for a non-prod environment.
- `staging.xyzreality.com` → **403 `RBAC: access denied`, `server: istio-envoy`** — the staging
  cluster's own Istio authorization policy rejects it **at the edge, before platform-api sees the
  token**, because this sandbox isn't on an allowed source network. Not a token problem.
- `dev.*` / `cloud-dev.*` / `cloud-qa.*` etc. → no DNS.

**So the token cannot be used from this environment**, and the message-serialisation reasoning above
is what settles the data question instead. To confirm by hand from an allowed network:
`curl -H "Authorization: Bearer $TOK" $HOST/api/v2/projects/user-projects | jq '[.[]|select(.isPortfolioEnabled)]|map({name,postgresProjectId})'`
then `GET /api/v2/projects/<postgresProjectId>` per row and read `progressWeightingMethod`.
