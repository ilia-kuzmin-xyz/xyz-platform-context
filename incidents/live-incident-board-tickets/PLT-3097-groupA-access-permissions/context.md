# PLT-3097 — SSO button not showing for customers (Critical) — SOLVED 2026-09-01

Symptom: "Sign in with SSO" missing for Meta users (and intermittently for Pietro). Yash's repro:
@xyzreality.com emails get the button, every other domain doesn't. Meta's admin verified their
OIDC config and asked us to check ours — they are right on both counts.

## The mechanism, verified live (all read-only probes)

1. **The button is gated on IAM discovery** since PLT-3057 (#2174), confirmed deployed by
   fingerprinting the prod bundle (`main.cddc3e30…`): `canUseSSO = Boolean(provider) || discoveryFailed`,
   provider from `POST /ms/iam/api/sso/providers:discover` (`useSSOProvider.ts`,
   `authenticationService.ts:47` — note the service base is `ms/iam`, `authenticationService.ts:11`).
2. **Discovery answers deterministically** (12/12 fresh connections each, no pod variance):
   - `…@xyzreality.com` → `{"providers":["azure"]}` → button shows
   - `…@meta.com`, `…@fb.com`, `…@hitt-gc.com` → `{"providers":[]}` → hidden
3. **Meta's IdP registration EXISTS and is healthy in IAM:**
   - `GET /ms/iam/oauth2/authorization/azure` → 302 → `login.microsoftonline.com/organizations/…`
   - `GET /ms/iam/oauth2/authorization/meta` → **302 → `https://fb.okta.com/oauth2/default/v1/authorize?client_id=0oa1zmhfk2fvPGy13358…`**
   - `meta-oidc` → 500 (no such registration; the key is `meta`)

**Root cause: IAM's domain→provider mapping behind `providers:discover` contains only
`xyzreality.com → azure`. Customer domains were never mapped** (or the rows were lost), so the
new discovery-gated button never shows for them, even though their client registrations
(e.g. `meta` → fb.okta.com) are fully configured.

## Why it presented as "intermittent"

The gating deployed recently (PLT-3057 ~mid-Aug, flag removal PLT-3085 after). During rollout,
old and new bundles coexisted; the new hook also caches per-domain with `staleTime: Infinity`,
so within one session a single answer sticks. Now it is deterministic: hidden for every
non-xyzreality domain.

## Why this is NOT a frontend bug, and a FE "fix" would be harmful

The FE renders IAM's answer faithfully. Falling back to the default provider (`azure`) when
discovery is empty would push Meta users into the wrong IdP — their provider is their own Okta
(`meta`), not the Microsoft hub. The only correct fix is the mapping data.

## The fix (backend/IAM, Sergey)

Add discovery mapping rows for every SSO tenant: at minimum **`meta.com` → provider `meta`**, and
audit which other tenants have client registrations but no domain row (that is exactly the set of
customers currently locked out). No FE release needed; the button reappears as soon as discovery
returns their provider (users may need a reload — per-session cache).

## Possible same-day unblock (UNVERIFIED)

`https://cloud.xyzreality.com/ms/iam/oauth2/authorization/meta` redirects straight into Meta's
Okta. Whether the callback completes without the FE having a pending provider in sessionStorage is
NOT verified (`completeSSOLogin` falls back to `provider param || pending || DEFAULT 'azure'` —
`authenticationActions.ts:396`), so do not hand this to a customer untested.

## Small FE follow-ups worth their own ticket (not the incident)

- The hook treats **404** as "no mapping", but IAM answers **200 `[]`** for unknown domains — so
  the `discoveryFailed`→"offer anyway" fallback can effectively never fire for the case it was
  designed for. Contract mismatch between `useSSOProvider.ts:23` and IAM's actual behaviour.
- `staleTime: Infinity` makes one bad answer sticky for the whole session.

## Killed hypotheses (with the probe that killed each)

- ~~FE regression hiding the button~~ — deployed bundle logic == HEAD, shows on any discovery error.
- ~~IAM replica inconsistency~~ — 12/12 consistent per domain, fresh connections.
- ~~405/routing problem~~ — an artifact of probing `/api/...` without the `ms/iam` prefix; the real
  endpoint answers 200. (Do not repeat this mistake: auth lives under `/ms/iam/…`.)
- ~~Meta's OIDC config wrong on our side~~ — their registration 302s into their Okta with a real client id.

---

## 2026-09-01 (later) — Sergey pushed back on the frontend cache. He is right, and it is a second, real defect.

Sergey: *"а мне кажется, или фронт кеширует ответы от IAM по email domain?"* — yes. Ilia also
reports the meta-domain behaviour is **"not 100% consistent"**, which the backend answer alone
cannot produce.

### Re-measured first: the backend has NOT changed

`meta.com` → **20/20 `{"providers":[]}`**, ~0.4s each, fresh connections, 09:3x. `xyzreality.com`
→ 6/6 `["azure"]`. So the mapping still is not there and the root cause stands.

Also newly ruled out: **the lookup is not broken.** It normalises case
(`XYZREALITY.COM`, `XyzReality.com` both → `["azure"]`), and rejects a bare domain with a 400
validation error. So a mapped domain resolves correctly regardless of typing; the customer domains
simply have no row. That closes most of the "broken lookup vs missing data" gap flagged earlier —
**missing data**, with the caveat that IAM's own tables were never read (no readable admin endpoint:
`api/sso/*` 404, `api/tenants` and `api/companies/sso` 403).

### Why it looks intermittent — three FE mechanisms, all ours

1. **Session-long cache.** `staleTime: Infinity`, keyed on `domainOf(email)` — first answer per
   domain kept for the life of the tab, never refetched (`refetchOnWindowFocus:false` too). A stale
   "no SSO" survives an IAM fix until a hard reload.
2. **A failed lookup shows the button.** `discoveryFailed = isError` and
   `canUseSSO = Boolean(provider) || discoveryFailed` (`LoginForm.tsx:123`), with `retry: false` —
   so **one transient blip flips the button ON** for a tenant that has no provider, and sticks for
   the session. Clicking it then dead-ends: `startSSOLogin(email, undefined)` re-discovers, gets an
   empty list and returns `'no-provider'` → inline "SSO unavailable"
   (`authenticationActions.ts:380-382`). **This is the most likely explanation of "sometimes it
   appears".** Note it does *not* redirect anywhere wrong — the earlier worry about an `azure`
   fallback was about a change never made.
3. **A legitimate blank window of ~0.8s.** 400ms debounce + ~0.4s lookup, during which
   `provider` is undefined and the button is absent by design; plus the guard at
   `useSSOProvider.ts:54` that withdraws it while a newly typed domain resolves. Someone typing and
   looking immediately sees no button.

### Shipped: `PLT-3097` on hc-frontend, commit `5c29ed412`

`staleTime: Infinity` → **5 minutes** in `useSSOProvider.ts`. One file, two lines plus comments.
Once IAM gets the mapping, affected users pick it up within 5 minutes instead of needing a reload.

**Deliberately not changed:** `retry` stays `false`. Retrying is the right instinct for mechanism 2,
but it changes which answer decides the button and puts the existing 500-path test
(`LoginForm.sso.test.tsx:106`) on a ~700ms budget against RTL's 1000ms default. **This environment
cannot run the suite** (`npm ci` fails on the private `@xyzreality/dhtmlx-gantt`), so an
unverifiable timing change does not belong on a Critical branch. Own ticket, with the test timeout
widened alongside.

### The honest split for the "FE or BE" argument

- **BE explains why it does not work.** No mapping, empty answer, button correctly hidden. Nothing
  the FE can do invents a provider.
- **FE explains why it looks inconsistent and why a fix will seem not to land.** Mechanisms 1-3.

Both are real; they are answers to different questions. The ticket still needs Sergey's mapping row.
