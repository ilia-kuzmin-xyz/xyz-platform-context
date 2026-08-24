# PLT-2896 — `/canvas/library` renders a blank page with the InfinityCanvas flag off

**Type:** Bug · **Domain:** app-wide routing (surfaced by Canvas)
**Jira:** https://xyzreality.atlassian.net/browse/PLT-2896
**Related:** PLT-2869 (Gate Infinity Canvas behind a feature flag — Released)

---

## 2026-08-24 — investigation + fix

### The report

QA: with the `InfinityCanvas` flag **off**, `/projects/<id>/canvas/library` shows a blank
screen instead of a 404. Repro 5/5.

### Root cause — it is not a Canvas bug

Routing is two-level:

| Level | File | Behaviour on no match |
|---|---|---|
| root | `app/routes.tsx` | had its own `<Route path='*' element={<NotFoundPage />} />` |
| nested | `app/pages/{project,viewer,organisation,company,admin,account}/routes.tsx` | **nothing** |

`app/routes.tsx` mounts `<Route path='projects/*' element={<Project />} />`. That wildcard
matches *any* URL under `/projects`, so the root-level `*` is never reached — the nested
`<Routes>` inside `pages/project/routes.tsx` takes over. **A nested `<Routes>` never falls
through to its parent**, so when none of its children match, React Router renders `null`.
Blank page.

The canvas routes in `pages/project/routes.tsx` are wrapped in
`{isInfinityCanvasEnabled && (<>…</>)}` — flag off means they are not registered at all,
so `/canvas/library` matches nothing and lands in exactly that hole.

**This was never Canvas-specific.** Every flag-gated route in that file has the same
behaviour today — with `Commissioning` off, `/projects/:id/assets`,
`/projects/:id/checklists` etc. are all blank too. So is any typo'd URL under `/projects`,
`/viewer`, `/organisation`, `/company`, `/admin`, `/account`.

### Fix shipped

Put the fallback in the **shared wrapper** every route module already uses —
`app/shared/error/error-boundary-routes.tsx` — rather than copy-pasting a `*` route into
six files:

```tsx
{children}
<Route path='*' element={<NotFoundPage />} />
```

Declared **after** `{children}` on purpose. React Router ranks equally-specific siblings by
declaration order (`rankRouteBranches` → `compareIndexes`, ascending on the last child
index), so a module that wants its own `*` — a redirect, say — still wins over the default.

The explicit `*` in `app/routes.tsx` became redundant (same element, and it wins the tie
anyway) and was removed, leaving one source of truth.

### Files

- `src/main/webapp/app/shared/error/error-boundary-routes.tsx` — the fallback
- `src/main/webapp/app/routes.tsx` — dropped the now-duplicate `*`
- `src/main/webapp/app/shared/error/error-boundary-routes.test.tsx` — new, 5 cases

### Facts worth not re-deriving

1. `getFeatureFlagValue` reads a **cookie synchronously** (`js-cookie`, key
   `feature-flags`, falling back to `featureFlags` in `config/constants.ts`). There is no
   async load window, so a route module cannot flash-404 while flags resolve. The
   `isDevEnv` "avoid flash-of-404" dance in `app/routes.tsx` exists because
   `applicationProfileSelector` *is* async — flags are not.
2. `ErrorBoundaryRoutes` has exactly 7 consumers, all of them top-level route modules
   (`grep -rl ErrorBoundaryRoutes app/`). There is no partial/embedded usage where an
   automatic 404 would be wrong.
3. `NotFoundPage` needs the redux store (`authenticationSelector`) to pick its "homepage"
   link target. Tests that only care about *which route matched* should
   `vi.mock('app/pages/NotFoundPage')` rather than stand up a store.
4. Local `npm ci` **cannot complete in a sandbox**: `@xyzreality/dhtmlx-gantt` lives on
   `npm.pkg.github.com` and needs `NPM_TOKEN` (the session's `GITHUB_TOKEN` is rejected).
   Workaround that works: strip that one dep from `package.json`, `npm install`, then
   restore `package.json`/`package-lock.json` from git — `node_modules` survives and
   vitest/eslint/tsc all run. The only residual `tsc` errors are the six
   `Cannot find module '@xyzreality/dhtmlx-gantt'` lines.
5. `check-types` (`tsc --noEmit --noUnusedLocals --noUnusedParameters`) is **not** a CI
   gate and currently reports ~hundreds of pre-existing `TS6133` unused-symbol errors.
   CI runs `npm run lint && npm run test -- --coverage` plus a webpack build. Do not treat
   a red `check-types` as a regression you caused.
