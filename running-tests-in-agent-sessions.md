# Running the hc-frontend test suite in an agent session

## 2026-10-02 — the `npm ci` 401, and the way round it

**Symptom.** `npm ci` in `hc-frontend` dies with:

```
npm error code E401
npm error 401 Unauthorized - GET https://npm.pkg.github.com/download/@xyzreality/dhtmlx-gantt/8.0.8
```

`.npmrc` points `@xyzreality` at GitHub Packages and authenticates with
`${NPM_TOKEN}`. Cloud agent sessions have no `NPM_TOKEN`, and neither
`GH_TOKEN` nor `GITHUB_TOKEN` carries `read:packages` — both return 401 against
that registry. So **no token available in-session can install that package.**

**Why it matters.** This blocked verification entirely, and it compounded: at
least three review findings across PRs #2250 and #2251 were deferred with
"can't run the suite" rather than fixed, and one sibling PR earned a red build
from a test written blind. "I can't run tests" quietly becomes "I don't fix
things".

**The way round.** Only **7 files** import `@xyzreality/dhtmlx-gantt`, all under
`gantt-x/` and `dashboard-panels/gantt/`, and the named imports (`GanttStatic`,
`GridColumn`) are types, erased at runtime. So stub it:

```bash
S=/tmp/gantt-stub && mkdir -p $S
cat > $S/package.json <<'JSON'
{ "name": "@xyzreality/dhtmlx-gantt", "version": "8.0.8",
  "main": "index.js", "types": "index.d.ts" }
JSON
cat > $S/index.js <<'JS'
const gantt = new Proxy(function () {}, {
  get: (t, p) => (p === 'default' ? gantt : (t[p] !== undefined ? t[p] : function () {})),
  apply: () => undefined,
})
module.exports = gantt
module.exports.default = gantt
JS
printf 'export type GanttStatic = any\nexport type GridColumn = any\ndeclare const gantt: any\nexport default gantt\n' > $S/index.d.ts

cd hc-frontend
cp package.json /tmp/pkg.bak && cp package-lock.json /tmp/lock.bak
node -e "const fs=require('fs');const p=require('./package.json');p.dependencies['@xyzreality/dhtmlx-gantt']='file:$S';fs.writeFileSync('package.json',JSON.stringify(p,null,2))"
npm install --no-audit --no-fund --legacy-peer-deps
cp /tmp/pkg.bak package.json && cp /tmp/lock.bak package-lock.json   # DO THIS
```

**Restore `package.json` and `package-lock.json` immediately after installing.**
`node_modules` survives; the stub must never be committed. Verify with
`git status --short package.json package-lock.json` — it must print nothing.

Then everything works:

```bash
npx vitest run --config vitest.config.ts <path>
npx tsc --noEmit -p tsconfig.json      # clean
npx eslint <files>
```

Verified on 2026-10-02: 522 ClientReport tests, 329 systems/commissioning tests,
212 task-runner tests, all green, plus a full clean `tsc --noEmit`.

**Caveat.** Tests that genuinely exercise dhtmlx behaviour would be meaningless
against the stub. Nothing under `gantt-x/` currently does — `gantt-tooltip`
mocks the viewer provider anyway — but check before trusting a green run in
that folder specifically.

**Worth doing properly:** give the session a `NPM_TOKEN` with `read:packages`,
and the stub is unnecessary.

## Mutation-check anything you add

Cheap and worth it every time: break the thing the test covers, confirm the test
goes red, restore. Caught nothing vacuous on 2026-10-02 but took about a minute
per suite, and it is the difference between a test and a comment.

## 2026-10-09 — procedure re-verified, plus a trap worth knowing

The stub procedure above worked exactly as written, unchanged. Re-verified: 511 tests across
`ClientReportPage/` + `clientReportService/`, 377 across `ProjectSettings/` + `DashboardPage/`,
`tsc --noEmit` clean, `eslint` 0 errors. Manifests restored and `git status --short package.json
package-lock.json` confirmed empty before committing.

**New trap: `tsc --noEmit` reports success while checking nothing** when `node_modules` is absent.
`tsconfig.json` sets `types: ["webpack-env", "forge-viewer"]`; with neither installed, tsc fails
both entries with `TS2688` and exits *without type-checking a single file*:

```
error TS2688: Cannot find type definition file for 'forge-viewer'.
error TS2688: Cannot find type definition file for 'webpack-env'.
tsconfig.json(18,5): error TS5101: Option 'baseUrl' is deprecated ...
```

Three lines of config noise and no file diagnostics, which reads like a clean run if you only skim
the tail. It is not: a genuinely broken type error in the diff produces the *same* output. This run
nearly accepted a change on that basis. **Install first, then trust `tsc`** — and if its output
mentions `TS2688`, the typecheck did not happen.

Also note `npx tsc` and `npx vitest` will cheerfully download their own copies and appear to work.
`npx vitest` then dies with `Cannot find package 'vite'`; `npx tsc` is the dangerous one, because it
runs and "passes".

## 2026-10-10 — procedure re-verified; and do NOT run Prettier over a whole file

Stub procedure above worked unchanged. Re-verified across five branches: 328 tests (`CanvasPage/`),
515 (`ClientReportPage/` + `clientReportService/`), 377 (`ProjectSettings/`), 409 (`PortfolioPage/`),
2,214 (`progressOutputsService/` + `ViewerPage/`), 410 (`AssetWorkflowStepTasks/` + checklist
services). `tsc --noEmit` clean on every merged head. Manifests restored and verified empty before
each commit.

**The `tsc` TS2688 trap was checked positively this time, not assumed.** After installing, append a
deliberate type error to the file under change, run `tsc --noEmit`, and confirm it is *reported*:

```bash
printf '\nconst __probe: number = "nope"\n' >> path/to/file.ts
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "file.ts"   # must be >= 1
```

A clean exit means nothing on its own; a reported probe does. One line, ~40 s, and it is the
difference between a typecheck and a no-op.

**New trap: `npx prettier --write <file>` reformats the whole file.** `useCanvas.ts` is not
Prettier-clean on master, so writing it produced **431 insertions / 220 deletions** across regions
the change never touched — unreviewable noise that buries the actual diff. Caught on diff review,
reverted, re-applied by hand.

If a change needs re-indentation (wrapping a block in a `try`, for instance), indent it yourself and
check the result with `git diff --stat`. Only `prettier --check` is safe to run across a legacy file
here. The same caution applies to any whole-file formatter in this repo.

## 2026-10-15 — a *pre-populated* `node_modules` is the new trap, and the 401 pattern recurred

Two things this run, both about trusting a checkout you did not install.

**The container can start with `node_modules` already present — and stale.** No `npm ci` ran
in this session, yet `npx vitest` worked straight away. That is pleasant and misleading: the
tree was baked when the image was built, so it drifts from `package.json` as master moves.
Concretely, `package.json` said `react-jhipster: 1.1.0` (upgraded in `347217067`, PLT-3260),
while the installed copy was still **0.22.0**, and `@xyzreality/dhtmlx-gantt` was **not
installed at all** — the 401 below means it never can be.

What that produces is worse than an obvious failure: `tsc --noEmit` type-checks normally and
reports **11 errors in files nobody touched** — six under `gantt-x/` + `dashboard-panels/gantt/`
(the unresolvable private package), `entity-utils.ts(1,10): '"react-jhipster"' has no exported
member named 'getPaginationState'` (the stale version), and some commissioning test files.
None are real; CI runs `npm ci` and is green on all of them. But they look exactly like a
branch that broke the build, and the temptation is either to "fix" them or to assume the whole
run is untrustworthy.

Telling artefact from real takes one command — compare installed against declared:

```bash
node -p "require('./node_modules/react-jhipster/package.json').version"   # 0.22.0
grep '"react-jhipster"' package.json                                      # 1.1.0  → stale
ls node_modules/@xyzreality/dhtmlx-gantt                                  # absent → the 401
```

An error naming a package whose installed version disagrees with `package.json`, or one of the
7 files importing the private gantt package, is an artefact. An error in the files your diff
touches is yours. This run checked that all 11 fell in the first group before pushing, and
`git diff origin/master --stat` confirmed the diff was 3 files, none of them among the 11.

This does **not** replace the TS2688 probe from 10-09/10-10 — that catches "tsc checked
nothing". This catches "tsc checked a tree that isn't master's". Different failures, both
silent.

**The 401 recurred, and the predicted consequence with it.** `npm view @xyzreality/dhtmlx-gantt
version` still returns `E401 ... unauthenticated` against `npm.pkg.github.com`, unchanged from
10-02. A *parallel* session on PR #2299 the same morning declined to push a fix to a real
Copilot finding, reasoning in the thread: *"`npm ci` still 401s on the private
`@xyzreality/dhtmlx-gantt` in this checkout, so I can't run the suite — a test I haven't
executed is not coverage."* The reasoning is sound in isolation; the conclusion was wrong,
because this file has carried the way round it since 10-02 and the baked `node_modules` meant
no install was needed at all. That is the 10-02 warning — *"I can't run tests" quietly becomes
"I don't fix things"* — recurring verbatim, two weeks on, against a documented workaround.

So, before concluding a suite cannot run: **try `npx vitest run <path>` first.** It may simply
work. Only if it fails for a missing module is the stub procedure above needed.

**Also: parallel sessions now collide on the same PR.** Two runs posted to the same review
thread on #2299 within six minutes, one declining to fix and one pushing the fix. Nothing broke
— the second reply supersedes the first and says so — but a human reading that thread sees the
author argue both sides. If a thread already carries a reply from this morning, read it before
writing: continue it, don't restate it.
