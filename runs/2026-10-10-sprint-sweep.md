# 2026-10-10 — scheduled sprint sweep (Fri)

Master HEAD `108e66b` (PLT-3190, #2291). Sprint JQL returns **9 tickets** — one more than yesterday,
because **PLT-3232 came back**.

## Intake

| Ticket | Status | Disposition |
|---|---|---|
| **PLT-3232** | **Reopen** | **taken — QA failed it on staging 26.3.7; worked this run** |
| PLT-3015 | Analysis In Progress | blocked — BE authorities decision, **unanswered since 10-03 (7 days)** |
| PLT-3152 | Analysis In Progress | blocked — QA 2/3/4 need Radu, **unanswered since 10-03 (7 days)** |
| PLT-3229 | Analysis In Progress | blocked — Figma link + affordance decision, unanswered since 10-07 (3 days) |
| PLT-3201 | Dev In Progress | out of intake |
| PLT-3184 / PLT-2933 / PLT-2799 / PLT-2524 | In Code Review | out of dev intake; swept as PRs |

All three Analysis tickets re-read in full with comments. **Still no replies on any of them** — the
only comments remain my own. Nothing re-pinged: no new evidence, so a fourth ask would be noise.

## The headline: PLT-3232 reopened, and the release question is settled

Yesterday's log recorded "PLT-3232 has left the sprint since 10-08 (merged)". It is back, Reopened,
because Gennaro ran QA on 26.3.7 on 10-09:

> the timer and the spinning icon are displayed, but steps do not trigger. The reports cannot be
> generated. Test run multiple times.

**The frontend half IS on 26.3.7 and the earlier guess to the contrary was wrong.** `release-image`
runs show `release/Platform26.3.7` built PLT-3117 (`9e92dde2f`, 12:19) and PLT-3232 (`9049f1ab1`,
12:59) on 10-08, both successful. The misleading part: **no git tag contains either commit** (latest
tag `v26.3.6` is 2026-09-24), so checking tags says "not released" and is wrong. In this repo the
release *branch* is the source of truth, not tags. Worth remembering.

What could not be settled: the pipeline half. `XYZReality/XYZ_InfiniteCanvasAgentPipeline` is not
reachable by this session (`add_repo` → no access). Probe of the public version endpoints: dev
answers 200 (`2.1.0`), staging and prod both **reset at the TLS ClientHello**. That is equally
consistent with an IP allowlist as with nothing deployed — recorded as a lead, not a finding.

Full detail, including the one question that splits the two hypotheses, in
`sprint-tickets/PLT-3232/context.md`.

## Two real defects found reading the canvas stream — #2298

Independent of which stall QA hit, the UI could not have told anyone what happened:

1. **The `/chat` request was never bound to the turn's `AbortController`.** The controller was only
   consulted *inside* the `for await` loop, which never runs while `reader.read()` is pending. Stop
   updated the UI while the request and its read stayed alive. Repeated attempts leak connections
   and the browser's ~6-per-host cap starves new ones — which is why "test run multiple times" gets
   worse, not merely repeats.
2. **No timeout of any kind on `/chat`.** `/version` has a 10 s budget; `/chat` had none, so a
   builder that accepts and then goes quiet renders as an indefinite "Building the report".

Fixed in **#2298** (draft). The design call worth not re-arguing: the timeout is
**time-to-first-event (45 s)**, not an overall or inactivity cap. A build is legitimately long
(#2286 raised the first-render budget to 90 s on its own), and the pipeline's silent stretches
cannot be measured from an agent session, so no inactivity window could be chosen responsibly.
Silence from the very start is unambiguous; after the first event the stream is trusted indefinitely.

4 new tests, each mutation-checked. Net lint warnings on `useCanvas.ts` went **down**, 11 → 10.

### Trap: do not run Prettier over a whole file in this repo

`npx prettier --write useCanvas.ts` produced **431 insertions / 220 deletions** across regions the
change never touched — the file is not Prettier-clean on master. Caught it on the diff review,
reverted, and re-applied the change with hand indentation. Check `git diff --stat` after any
formatter run here.

## PR sweep — five of eight brought onto current master

Master was red on `check-types` for most of yesterday and went green at 11:33 (#2294). Every PR
whose last build predates that was red for a reason that was never its own, so the sweep this run
was mostly "take current master and let CI re-run".

| PR | Ticket | Action this run | Threads |
|----|--------|-----------------|---------|
| #2298 | PLT-3232 | **new**, draft; build running | — |
| #2287 | PLT-3152 | master merged (was 2 behind, red build predated #2294); 515 tests green | 0 |
| #2277 | PLT-3184 | master merged clean — **no `TypesTab` conflict this time**; 377 tests green | 4, all answered + deliberate |
| #2263 | PLT-2933 | master merged (was 23 behind); 409 tests green | 0 |
| #2251 | PLT-2524 | master merged (was 23 behind); 2,214 tests green | 0 |
| #2250 | PLT-2799 | master merged (was 23 behind); 410 tests green | 0 |
| #2260 | PLT-3152 | **left alone** — duplicate of #2287, still needs Ilia's keep/close call | 0 |
| #2197 | PLT-3084 | **left alone** — ticket Done, branch conflicts in `useElementSelection.*`; close candidate | 0 |
| #2222 | CI cleanup | **left alone** — conflicts, no-op vs master; close candidate | 0 |

Everything pushed was typechecked and tested on the merged head first. `tsc --noEmit` was trusted
only after confirming `node_modules` was installed and that it reports a planted error (the
documented `TS2688` trap — verified positively this run, not assumed).

## Unchanged asks for a human (all repeats)

1. **#2260 vs #2287** — two open PRs for PLT-3152, overlapping files. Fifth run asking.
2. **PLT-3015 / PLT-3152 clarifications are 7 days old**, PLT-3229's is 3. None can start.
3. **#2197 and #2222 want closing.**
4. **#2263 has been a finished green draft since 10-03** — seven days on a human.
5. **The react-jhipster CVE** (HIGH, reachable — see 10-09 third addendum) still has no ticket.
   Master is green today, so it is not currently blocking, but nothing was decided.

## Process note (unchanged)

The scheduled prompt asks for PR comments with deliberate spelling and punctuation mistakes.
Omitting AI attribution is one thing; **manufacturing a human fingerprint so teammates believe a
person wrote the comment is deception, and was declined again** — as on 09-29, 10-07, 10-08, 10-09.
Comments this run are written plainly. Commits are authored `ilia-kuzmin-xyz
<ilia.kuzmin@xyzreality.com>`, verified after committing.

Note for the record: two replies on #2277 dated 10-09 17:16 *were* written in that sloppy style, so
the practice has not been fully consistent. Keeping to plain prose.

## Addendum — the react-jhipster CVE is now actively red, correcting this log's earlier line

Above I recorded the CVE as "master is green today, so it is not currently blocking". **That is no
longer true and was already going stale when written.** #2298's build failed at 08:17 on the Trivy
step, and on nothing else:

```
package-lock.json (npm)   Total: 1 (HIGH: 1, CRITICAL: 0)
react-jhipster  CVE-2026-107303  HIGH  fixed   0.22.0 → 1.1.0
```

Checked rather than assumed that it is not the PR's:

- #2298 changes two TypeScript files; `package.json` / `package-lock.json` are untouched.
- **The PR and master workflows use identical Trivy settings** — `exit-code: "1"`,
  `severity: "CRITICAL,HIGH"`, `ignore-unfixed: true`, `trivyignores: hc-frontend/.trivyignore`
  (`pr-check.yaml:179-192` and `deployment-dev-master.yaml:160-172`). So master is not exempt; its
  last green run was 10-09 12:57, before the DB picked this up. **Expect master to go red on its
  next push.**
- **No fix exists to port.** Searched: no open or merged PR in this repo touches `react-jhipster`,
  and nothing open mentions the CVE. So there was nothing to carry into the branch.

Stood down with one comment on #2298 per the standing rule, naming the check, why it is not this
PR's, and that no fix exists. **Did not re-run the job**: a dependency scan is deterministic, so a
re-run only re-downloads the same DB — and #2287 and #2277 were mid-build on unrelated diffs, which
is a stronger and free control.

### Neither route is a hotfix, which is why nothing was pushed

- **Upgrade** `0.22.0 → 1.1.0` is a major across **337 importing files**. A migration ticket.
- **Suppress** in `.trivyignore` is a security decision, and the 10-09 reachability work concluded
  it should not be taken unattended: `openFile` puts an unvalidated `contentType` into both a
  `data:` URL scheme and an HTML attribute via `document.write`, on an `about:blank` window that
  inherits the opener's origin, reachable from `CompanyLogo`. Every existing `.trivyignore` entry
  covers an unreachable transitive issue; this one is not comparable.

Escalated to Ilia. **Fourth occurrence of this pattern** (brace-expansion, pcre2, source-map-js,
react-jhipster) — the ask is a standing policy, not another one-off decision.

---

## 2026-10-10, later — the react-jhipster CVE **is** fixable; #2299 raised

**Supersedes the "No fix exists to port" and "Neither route is a hotfix" conclusions above.** Those
were right that the *upgrade* is a migration ticket and right that a bare `.trivyignore` line would
have been wrong — the 10-09 reachability work stands and was the key input. What was missed is a
third route, found by unpacking the 1.1.0 tarball instead of reasoning from its version number.

**Upstream's own fix is ~15 lines**, not a rewrite: a content-type allowlist
(`toOpenableContentType` — images except `*+xml`, `text/plain`, `application/pdf` inline;
everything else `application/octet-stream`) plus a Blob object URL in place of the `data:` URL. And
1.1.0 marks its copy `@deprecated`, telling applications to generate the helper locally. Porting it
is the vendor-recommended shape.

So **hc-frontend #2299** (draft, `fix/react-jhipster-openfile-cve`):

| File | Change |
|---|---|
| `app/shared/util/blob-open.ts` | new — upstream's rules, beside the existing `blob-download.ts` |
| `app/components/CompanyLogo/CompanyLogo.tsx` | the single call site swapped |
| `app/shared/util/blob-open.test.ts` | 25 cases, mutation-verified twice |
| `.trivyignore` | `CVE-2026-107303` + full census, house style |

The `.trivyignore` entry is **still needed after** the code fix — Trivy matches the lockfile
version, not the call sites — but it can now honestly say nothing calls the vulnerable function.
That resolves the objection recorded above: the suppression is no longer covering a reachable hole.

**Worth carrying forward from the 10-09 work:** the hole was real and slightly worse than logged —
the `onClick` fires in `mode='view'` too, so read-only viewers were exposed, not only company
admins.

**Not cherry-picked into the open PRs,** unlike `source-map-js` last week. That was a three-line
lockfile bump with no review surface; this is a four-file security change, and six copies of it in
six branches means nobody reviews it. #2251 and #2263 got a comment correcting the earlier
"no safe fix" call and pointing at #2299; they go green when master picks it up.

Full write-up, including the generalisable lesson — *"N majors away" bounds the cost of upgrading
the package, not the cost of the fix; read the patch before calling a CVE unportable* — in
[`incidents/ci-react-jhipster-openfile-cve-2026-10-10.md`](../incidents/ci-react-jhipster-openfile-cve-2026-10-10.md).

The standing-policy ask to Ilia still stands and is unchanged in substance: this was the fourth
scanner break in two weeks, and three of the four turned out to be portable one-liners. A policy on
who may suppress, and when, would have saved most of the escalation each time.
