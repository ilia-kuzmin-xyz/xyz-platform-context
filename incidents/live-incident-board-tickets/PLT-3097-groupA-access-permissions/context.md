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

---

# ⛔ 2026-09-01 (later) — THE DIAGNOSIS ABOVE IS WRONG. Do not send its draft to Sergey.

Ilia proposed the correct mechanism and it is confirmed. **Everything above that concludes "IAM has
no domain mapping for customer domains" is false, and it is false because of how I measured it.**

## The measurement error

I probed discovery with **invented** addresses (`test.user@meta.com`, `someone@fb.com`,
`user@hitt-gc.com`). Those are not invited users, so they return an empty list whether or not the
domain is mapped. I then compared them against a **real** address (`ilia.kuzmin@xyzreality.com`) and
read the difference as a per-domain mapping gap. Synthetic input on one side of a comparison, which
is exactly what `live-incident-run-instructions.md` § Investigation discipline warns against
("before comparing two numbers, reproduce each exactly").

## What discovery actually does — per ADDRESS, not per domain

```
ilia.kuzmin@xyzreality.com     -> {"providers":["azure"]}
pietro.desiato@xyzreality.com  -> {"providers":["azure"]}
fakename12345@xyzreality.com   -> {"providers":[]}      <- same domain, empty
xyzreality@meta.com            -> {"providers":["meta"]} <- meta.com IS mapped
zzz.nobody99@meta.com          -> {"providers":[]}      <- same domain, empty
```

IAM checks whether the **address** is an invited user. **meta.com is mapped and healthy. There is
nothing for Sergey to do.**

## The real bug, entirely frontend

`useSSOProvider.ts` cached the answer under `domainOf(email)`, with the comment *"Keyed on the
domain, not the address: one lookup serves everyone at the same tenant."* That assumption is false
for this endpoint. Consequence: the first address typed in a tab decides the button for every other
address at that domain, for as long as the entry is cached.

So a tester or user who first types an address IAM does not recognise (a typo, a colleague, a test
address) poisons the cache for the whole domain and sees no SSO button for real users afterwards.
**That is the "intermittently not appearing" in the ticket** — the outcome depends on which address
happened to be typed first, which is why it looked random.

It also explains Pietro hitting it internally on a mapped domain, which the mapping-gap theory could
not explain at all (and which should have been treated as a falsification of it at the time).

## Fix — branch `PLT-3097`, commit `0259f2708`

Key the query on the trimmed, lowercased **address**; compare whole addresses in the debounce guard.
Caching stays, and is now correct, because the key finally matches what the endpoint varies on. Two
regression tests added in `LoginForm.sso.test.tsx`: a second address at the same domain gets its own
lookup and answer; the same address is not looked up twice.

The earlier commit on this branch (`5c29ed412`, `staleTime: Infinity` → 5 min) is still worth having
but was never the fix; it only shortened how long the poisoning lasted.

## Worth raising separately, carefully — user enumeration

`POST /ms/iam/api/sso/providers:discover` is unauthenticated and its answer differs for a known
versus unknown address at the same domain. That is an address-existence oracle. Pre-existing IAM
behaviour, not introduced by this change, and not this incident — but it should get its own security
ticket rather than being buried here.

## Not verified

- Whether the FE fix removes the customer-visible symptom in a browser. Cannot compile or run tests
  in this container (`npm ci` fails on a private package); CI is first validation.
- Whether the button reappears without a reload for a user already sitting on the page. It will not:
  `staleTime` makes data eligible for refetch but schedules nothing, so a reload or re-typing is
  still needed.

---

## 2026-09-01 — Sergey answered the open IAM question. Two facts corrected.

Teams thread with Sergey Kuderskiy, Pietro Desiato and Mostafa Kamel Hussien.

**Correction 1 — the discovery gate is "email exists as a user record", not "invited to project".**
Earlier notes in this folder (and my Jira draft) said IAM returns a provider only for an *invited*
user. Wrong. Sergey pasted the code:

```java
var user = userRepository.findOneByEmailIgnoreCase(email);
if (user.isEmpty()) {
    log.warn("SSO provider discovery requested for an unknown email");
    return List.of();
}
```

Existence in the system, regardless of invitation. The **invitation** check happens later, at the
actual SSO login attempt. Everything else in this file stands: the answer still varies per address,
so the per-domain cache key was still the bug.

**Correction 2 — the empty list is deliberate, and it does not achieve what it intends.** Sergey:
"from outside IAM this looks as if the tenant has no SSO method configured. No error is thrown.
This is intentional." The intent is to avoid confirming that an address exists. It fails on any
SSO-enabled domain: a caller who knows one working address at that domain learns the domain has a
provider, and can then distinguish existing from non-existing addresses by provider-vs-empty. So
the enumeration oracle noted above is live today, and Pietro's domain-only proposal would
*remove* it rather than create it. Sergey's stated concern about domain-only ("any user could
enter a wrong email to check which SSO we have") is the weaker leak of the two: which provider a
company uses, which Azure exposes publicly anyway via `getuserrealm`.

**Correction 3 — Pietro's "I think that's already in place" is half true.** The backend does produce
an invitation error at the SSO login attempt. The FE throws it away: `LoginForm.tsx:80` replaces
whatever came back with the generic `hc.components.LoginForm.ssoSignInFailed`. So the message
exists and the user never sees it. FE-only to fix.

### Decision taken to close the incident

Ship the FE cache fix (PR #2191) and close PLT-3097 on it. Rationale, which needs no further input
from anyone:

- Every user who can actually complete an SSO login already exists in the system, because a user
  record is created by the invite. So after the cache fix, every user who *can* get in *does* see
  the button.
- The residual gap is only for addresses with no user record, and those cannot log in by SSO or by
  password. Domain-only would change which error they see, not whether they get in. Cosmetic, not
  functional, and therefore not this Major incident.

Domain-only + surfacing the real message is the better end state and should be its own ticket
(FE: stop swallowing the message at `LoginForm.tsx:80`; IAM: drop the existence check). Holding a
long-running customer incident open for a cross-team design change is the wrong trade.
