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
