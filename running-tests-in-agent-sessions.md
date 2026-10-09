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
