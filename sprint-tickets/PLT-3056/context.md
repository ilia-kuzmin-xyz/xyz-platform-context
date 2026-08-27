# PLT-3056 — env-provided Supabase URL/anon key at runtime

**Type:** Task · **Domain:** Commissioning data layer (Supabase bridge) + docker entrypoint
**Jira:** https://xyzreality.atlassian.net/browse/PLT-3056 · linked to PAPI-3627 (DOPS env keys)
**PR:** https://github.com/XYZReality/hc-frontend/pull/2189 (branch `PLT-3056`) — replaced #2145
(same tree, was on an auto-generated `claude/*` branch; #2145 closed, its 4 review threads resolved)

## 2026-08-27 — state after the rebuild + adversarial review round

- **Sprint 51, assigned Ilia, In Code Review.** CI green on `97bb09e` (build/Sonar/Copilot);
  4 human reviewers requested, none reviewed yet. Manual DEV pass still owed (real deploy,
  Network tab — steps in the PR body).
- A 10-agent adversarial review of the diff confirmed 4 defects (0 claims refuted); all fixed in
  `97bb09e`:
  1. **(high)** entrypoint served ANY `SUPABASE_ANON_KEY` into browser-facing
     `/management/info` — SPA's `sb_publishable_` check stops a privileged key being *used*,
     not *served*. Now gated server-side (`case ... sb_publishable_*)`).
  2. **(med)** userinfo sed (`s|//[^/@]*@|//|`) bypassed by `/` in a password or a mangled
     scheme → credentialed URL reached public JSON + pod logs. Now: any `@` drops the pair.
  3. **(med)** lockstep spec's env-var half was vacuous — whole-file `toContain('SUPABASE_URL')`
     is satisfied by comments/WARN strings. Now pins the `${VAR:-}` read sites + the key gate.
  4. **(med)** junk-body test never asserted the documented warn. Now counts warns per value.
  Plus: `https://.supabase.co` (unresolved template ref) rejected; `getCommissioningConnection`
  docstring corrected (it resolves the COMMITTED pair, ignores the runtime override — its
  sibling getters are the live ones).
- **Accepted risk, on record:** an actor with pod env/secret write access can point the app at
  their own genuine `*.supabase.co` tenant; host pinning can't distinguish tenants and that
  actor is already inside the trust boundary.

## Pitfalls for the next run

- **`npm ci` fails 401 in the remote sandbox** — `@xyzreality/dhtmlx-gantt` needs a
  `read:packages` token that `GITHUB_TOKEN` lacks; no vitest/eslint locally. Validate instead by
  (a) executing entrypoint section 3b directly with adversarial env shapes, and (b) running
  `supabase-config.ts` via `node --experimental-strip-types` (it is import-free by design).
  CI is the arbiter for the vitest side.
- The lockstep spec reads `docker/entrypoint.sh` from disk — if you touch the emit line or the
  env reads, keep `${SUPABASE_URL:-}` / `${SUPABASE_ANON_KEY:-}` / the shell-escaped JSON keys /
  `sb_publishable_*` present or the suite fails.
- Two gates on purpose, don't "simplify" one away: SPA-side validation controls *use*,
  entrypoint gates control what gets *served*. The SPA falling back safely is NOT protection
  against publishing a secret.
