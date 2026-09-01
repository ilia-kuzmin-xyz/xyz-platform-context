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
