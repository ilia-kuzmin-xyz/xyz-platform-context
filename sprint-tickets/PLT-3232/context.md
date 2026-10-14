# PLT-3232 — Infinity Canvas, remaining work for the Beta release

**Domain:** Canvas (`canvas/`), the report build flow. Sibling context: `sprint-tickets/PLT-3117/context.md`.

## 2026-10-10 — first context file; the ticket came back from QA

PLT-3232 left the sprint on 10-08 as merged (#2286) and **returned Reopened on 10-09** when
Gennaro failed it in QA on staging 26.3.7:

> Whilst generating the report, the timer and the spinning icon are displayed, but steps do not
> trigger. The reports cannot be generated. Test run multiple times.

A HAR (`staging.xyzreality.com.har`) and a screenshot are attached. **Neither is fetchable from an
agent session** — Jira attachment content needs an authenticated download that the MCP tools do not
expose and `WebFetch` cannot do. Plan around that; do not burn a run trying.

### The release question, settled: the frontend half IS on 26.3.7

The ticket description still says "Built on PLT-3117, not merged yet", and its Remaining item 1 is
"merge PLT-3117 in hc-frontend and the agent pipeline, and release both together". **Both halves of
the hc-frontend side are released.** From the `release-image.yaml` workflow runs:

| commit | what | built |
|---|---|---|
| `9e92dde2f` | PLT-3117 (#2212) | 2026-10-08 12:19, success |
| `9049f1ab1` | PLT-3232 (#2286) | 2026-10-08 12:59, success |

both on branch `release/Platform26.3.7`. So QA tested the right frontend, and the earlier guess
("26.3.7 predates the merge") is **wrong** — `git tag` is misleading here, because no *tag*
contains either commit (latest tag `v26.3.6` is 2026-09-24). The release branch is the source of
truth in this repo, not tags.

### What could not be established

The pipeline half lives in `XYZReality/XYZ_InfiniteCanvasAgentPipeline`, which **this session cannot
access** — `add_repo` returns "not found, or this session's GitHub credential doesn't have access".
#2212 needed pipeline #17; #2286 pairs with pipeline #22. Whether staging runs either is unknown.

Network probe from the sandbox (read-only GET of `/api/version`):

| host | result |
|---|---|
| `infinite-canvas.holosite.dev` (dev) | **200** `{"version":"2.1.0","build":"262955b","opensReportsFrom":"2.1.0"}` |
| `infinite-canvas-staging.xyzreality.com` | DNS ok (4.231.90.216), **reset at TLS ClientHello** |
| `infinite-canvas.xyzreality.com` | DNS ok (52.149.102.215), **reset at TLS ClientHello** |

**Do not over-read this.** The reset happens before any HTTP request, which is equally consistent
with an IP allowlist excluding the sandbox as with nothing being deployed. The dev host answering
through the same proxy only proves the proxy is not the blocker. It is a 10-second check for
someone on the VPN, not a finding.

### Two candidate stalls — and the HAR tells them apart in one look

Both produce exactly "timer and spinner, no steps, no report":

- **A — the stall is in the browser, before the pipeline is ever called.** `useCanvas.ts` awaits
  `turnData().summary` *before* `realStream()`. PLT-3117 moved report data into the browser
  (DuckDB), and this ticket's own Remaining item 2 records 30–80 s freezes on ~920k-element
  projects. During that wait the UI already shows "Building the report" with a timer and no steps.
- **B — the builder was reached and went quiet** (wrong/undeployed pipeline version, or unreachable).

**The discriminator: does the HAR contain a POST to `/api/chat`?** Present → B. Absent → A, and
then this is the existing performance item, not a release miss. Asked on the ticket 10-10.

## The two code defects found while reading (real whichever stall it was)

Fixed in **#2298** (`PLT-3232`, draft, off master `108e66b`).

1. **The `/chat` request was never bound to the turn's `AbortController`.** `realStream` took no
   signal and the fetch had no `signal:`. The controller was only consulted by
   `if (controller.signal.aborted) break` *inside* the `for await` loop — and that body never runs
   while `reader.read()` is pending. So Stop updated the UI optimistically while the request and its
   read stayed alive. Repeated attempts leak connections; browsers cap ~6 per host, so after a few
   tries new requests queue behind dead ones. That matches "Test run multiple times" getting worse.

2. **No timeout of any kind on the `/chat` stream.** `reportVersion.ts` gives `/version`
   `AbortSignal.timeout(10_000)`; `/chat` had nothing. A builder that accepts the POST and then
   sends nothing leaves the UI on "Building the report" indefinitely — no error, nothing in chat.

### The design decision worth not re-arguing: time-to-FIRST-event, not inactivity

`FIRST_EVENT_TIMEOUT_MS = 45_000` bounds only the wait for the **first** event. It is deliberately
**not** an overall cap and **not** a between-events cap:

- a build is legitimately long — #2286 raised the first-render budget to 90 s on its own — so any
  cap that can fire mid-build would kill healthy reports;
- the pipeline's silent stretches during compose **cannot be measured from an agent session**, so
  no inactivity window can be chosen responsibly here;
- silence from the very start is unambiguous: nothing has begun.

Once any event arrives the deadline is dropped and the stream is trusted indefinitely. It clears on
a **parsed event**, not on the response headers — an SSE response can open and then stay silent,
which is the case a timeout on the fetch alone would miss. `readEvents` has a test pinning this.

Also: the generator's `finally` aborts the request however it was closed (normal end, stop, or the
consumer throwing mid-turn), and `chatEvents` cancels the reader first so a pending read resolves
rather than rejecting unobserved.

### Validation

`tsc --noEmit` clean, eslint **10 warnings on `useCanvas.ts` vs 11 on master** (the extraction into
`chatEvents` / `readEvents` / `parseSseLines` lowered the cognitive-complexity warning). 328 tests
green across `CanvasPage/`, 4 of them new in `useCanvas.stream.test.ts`. Each new test
mutation-checked: dropping the signal fails 3, never arming the timer fails 2, never clearing it
fails 1.

**Trap hit this run, worth recording:** `npx prettier --write useCanvas.ts` reformatted the whole
file — 431 insertions / 220 deletions across regions the change never touched. The file is not
Prettier-clean on master. Revert and re-indent by hand; do not run Prettier across a whole legacy
file in this repo.

## Open items

- **The actual blocker is unowned:** why staging's builder is silent. Needs the pipeline repo or
  staging access. The HAR question on the ticket is the cheapest route.
- Ticket moved **Reopen → Analysis In Progress** 10-10 with that question.
- Remaining items 2–6 of the ticket (performance, filters, definitions, panel edits, QA plan) are
  untouched and still open.

## 2026-10-12 — the HAR is confirmed unreachable; stop trying

Second independent attempt, from a different session. Recording it as a **hard constraint** so no
future run spends time here again:

- `mcp__Atlassian-Rovo__fetch` only accepts an ARI (`ari:cloud:jira:{cloudId}:issue/{id}`). It
  fetches issues and pages. It does **not** fetch attachment content, and there is no other
  Atlassian MCP tool that does.
- A direct `curl` of
  `.../rest/api/3/attachment/content/66072` is refused by the sandbox before it leaves — the harness
  classifier blocks it. Not a 401 to work around; the request is never made.

So the discriminator question (is there a `POST /api/chat` in the HAR?) **cannot be answered from an
agent session at all**. It needs Gennaro, or anyone who can open the attachment. The question has
been on the ticket since 10-10 and is still unanswered as of 10-12.

Nothing else on the ticket moved: status still `Analysis In Progress`, no new comments since the
10-10 clarification, #2298 still draft.

### Why this ticket did not advance this run

It is blocked on a human read of a file, not on analysis. The honest options were:

1. Wait for the HAR answer — chosen.
2. Start Remaining item 2 (the 30–80 s filter freeze on ~920k elements) on the theory that it is
   also candidate A, and would fix QA's symptom if so. **Rejected**: it is a performance change to
   the DuckDB path that cannot be profiled or even run in this environment, started on an unproven
   hypothesis. That is exactly the "implement before you are confident" the run instructions warn
   against, and a wrong guess here is a large diff through the canvas data build.

If the HAR answer comes back *absent* (`/api/chat` never sent), item 2 stops being a performance
nice-to-have and becomes the QA blocker — size it accordingly then, with profiling access.

## 2026-10-13 — correction: the "10-10 HAR comment" does not exist

The 10-11 run log records that a comment was posted on 10-10 asking Gennaro to check his own HAR
for a `POST /api/chat`, and treats the lack of a reply as the thing blocking this ticket.

**Re-read the ticket this run: it carries exactly two comments.** Ilia's how-to-test (10-08) and
Gennaro's partial-verification failure (10-09). There is no 10-10 comment. It was either never
posted or went to another ticket (PLT-3229 is the likely candidate — it was in the same sweep).

So this ticket is **not** waiting on a reply to a question that was asked. It is waiting on
somebody to act on Gennaro's 10-09 finding, which still stands unanswered:

> Verified partially implemented on 26.3.7:
> * Whilst generating the report, the timer and the spinning icon are displayed, but steps do not trigger.
> * The reports cannot be generated, hence the rest of the test cases are blocked. Test run multiple times.

The two hypotheses from 10-10 are still the live ones and still unsplit — pipeline reached but
silent, vs. the browser-side 920k-element stall. The HAR attached to the ticket would split them,
and is still not reachable from an agent session: the attachment endpoint returns
`403 You do not have permission to view attachment with id: 66072` unauthenticated, and the
Atlassian MCP exposes no attachment-download tool.

PR #2298 (draft) was brought onto master `221d571` this run → head `b1706c8`. No open threads.

## 2026-10-14 — #2298 closed; the FE change now lives in #2324

**Do not go looking for #2298 — it is closed without merging, and that is correct.** Ilia folded it
into **#2324** ("one canvas PR in hc-frontend") as commit **`91a0f5520`**, and the react-jhipster
build fix stays in **#2299** rather than riding along.

Verified the fold rather than trusting the note, because stranded work is this repo's recurring
failure mode. `91a0f5520` carries exactly the original change and nothing else:

| file | status | lines |
|---|---|---|
| `CanvasPage/useCanvas.stream.test.ts` | added | +122 |
| `CanvasPage/useCanvas.ts` | modified | +210 / −75 |

+332 / −75 total, matching the original commit, with the author date preserved from 10-10 — a clean
cherry-pick. Nothing was lost and nothing needs redoing.

Splitting the CVE fix back out is **better than what I had done**: #2298 had been carrying #2299's
`blob-open.ts` / `CompanyLogo` / `.trivyignore` change only because porting it was the way to get CI
green without waiting. Once the two are separate PRs again, each reviews on its own merits.

Last CI state on #2298 before it closed: **green** (build success 08:08 on 10-14, SonarCloud
passed), 0 review threads, no conflict. So it closed from a healthy state, not an abandoned one.

### What is still open on this ticket

Unchanged and still the real blocker: **why staging's canvas builder never answers.** The
`/api/chat` question put to Gennaro on 10-10 is unanswered, the pipeline repo
(`XYZ_InfiniteCanvasAgentPipeline`) remains outside this session's GitHub access, and the
staging/prod hosts still cannot be probed from here. The timeout work only makes that failure
legible; it does not fix it. Remaining items 2–6 of the ticket are untouched.
