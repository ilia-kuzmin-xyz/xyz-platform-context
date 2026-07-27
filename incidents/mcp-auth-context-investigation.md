# MCP auth-context — canvas domains randomly "pending"

**Status:** OPEN — mitigated on our side, real fix owned by BE (Ali Seyedof).
**Last updated:** 2026-07-20.

Living note so we can resume without re-deriving. Update the status line when it moves.

---

## Symptom

On `/canvas`, a **random** subset of data domains never delivers — tiles stuck on
"pending" while others show data. The stuck set changes every run:

- run A: schedule ready · issues + progress pending
- run B: issues 7534 ready · schedule + progress pending
- run C: issues + media ready · progress + schedule pending

The data itself is fine — issues 7534, activities 109,952, photos ~2–4k all fetch
when a call reaches the right server. So this is **auth/routing, not missing data**.

## Root cause (current best understanding)

**NOT** what we first thought. Corrected twice:

1. ❌ First guess: "MCP keeps one context per account, every `xyz_login` kills the
   previous." **Wrong** — re-tested: two logins both stay valid; MCP supports
   concurrent contexts (confirmed by BE and by our probe).
2. ✅ Actual: **multiple MCP replicas (k8s) with in-memory, pod-local auth
   contexts and no shared/sticky store.** Our single `auth_context_id` lives on one
   pod; the profiler fires ~10 concurrent calls that round-robin across pods, so
   only those hitting the context-holding pod succeed (~1/N). This exactly matches
   our probe: 8 rapid contexts → 4 survived, scattered. BE's independent hunch:
   "more than 1 instance of MCP running, causing the login issue."

## How our pipeline authenticates (answers BE's question)

- **One** `xyz_login` at startup (`server.py:109`), **one** module-global
  `auth_context_id` shared by all agents/coroutines, passed as a tool arg on every
  call (`mcp_client.py`, `params["auth_context_id"]`).
- Re-login **only** on rejection, in exactly one place (`mcp_client._relogin`),
  serialised by a lock so N concurrent failures cause **one** login, not N.
- Profiler fans out ~10 concurrent calls on that same context
  (`profiler.py:721`, nested `asyncio.gather`).
- So: agents **share** one session; we do **not** log in per-agent; we are **not**
  the source of session pile-up.

## What we shipped (mitigation, not cure)

**PR: XYZReality/XYZ_InfiniteCanvasAgentPipeline#6** (merged) —
`fix/mcp-auth-context-contention` on `XYZ_AgentPipeline`:

- Re-login + retry on `invalid_auth_context_id`, `_MAX_AUTH_ATTEMPTS = 3`, jittered
  backoff.
- `_relogin` compare-and-swap on the rejected context (not a timer) → collapses the
  stampede to one login.
- `login_args()` shared by startup + relogin (prod needs user/pass; dev doesn't).
- Fixed 4 pre-existing `test_mcp_client.py` failures (leaking global tool cache).

Caveat proven by live test: **3 attempts is not always enough** under contention —
a slow call (activities ~48s) can be killed on every attempt. Bumping the budget
(6–8) + per-domain retry would raise success today at a latency cost. Not yet done.

## The real fix (BE owns)

Sticky sessions / shared context store across k8s replicas, or a single instance.
Once contexts are shared/sticky, one login suffices and retries are irrelevant.
BE also found + fixed a "dead sessions pile up over time" bug; deploying via k8s.

## Open items

- [ ] **BE to confirm**: does the k8s deploy make contexts sticky/shared across
      replicas? (decides whether our retry becomes reliable) — asked, awaiting.
- [ ] Optional stopgap on our side: raise `_MAX_AUTH_ATTEMPTS` to 6–8 + per-domain
      retry, if pending domains keep blocking testing.
- [ ] Future / separate: per-user auth via `xyz_set_bearer_token` — forward the
      end user's bearer token frontend→pipeline. Correctness/security win (per-user
      scoping), does NOT fix the pod-routing issue.

## Reference

- MCP server repo + login docs: `github.com/XYZReality/XYZ_MCPServer#login`
  (tools: `xyz_login`, `xyz_set_bearer_token`, `xyz_clear_auth_context`;
  "multiple concurrent auth contexts").
- Prod MCP: `http://52.149.102.215:8080/mcp` (plain http, needs user/pass,
  project whitelist — only ELN03 / A015). Dev MCP: `http://172.211.241.24:8080/mcp`
  (whitelist `*`, no-arg login). Deployed pipeline: `mcp-dev.holosite.dev:8443`.
- Pitfall: [agent-pipeline/pitfalls.md](../agent-pipeline/pitfalls.md) §6.
