# PLT-2879 — SWITCH Client Cannot Access Dashboard

**Domain slug:** access-permissions
**Triage run date:** 2026-07-13
**Source of truth:** Jira (xyzreality.atlassian.net) + hc-frontend `claude/vigilant-franklin-katinq` + live-incident-playbook.md

---

## 1. Ticket snapshot (as of 13 Jul 2026)

| Field | Value |
|---|---|
| Key | PLT-2879 (**re-keyed from PAPI-3620** on 8 Jul — see changelog) |
| Summary | SWITCH Client Cannot Access Dashboard |
| Type | Live Incident |
| Priority | **Blocker** |
| Status | **With Customer** (category: In Progress) — set 2026-07-10 14:34 by Darminder Atker, straight from *Open*, **no comment** |
| Resolution | none (unresolved) |
| Reporter | Yash Patel (coordinator / SWITCH channel) |
| Assignee | Darminder Atker (FE lead) |
| Components / Labels | none |
| Jira issue links | **none** (PAPI-3621/3622 are NOT formally linked; association is textual only) |
| Remote links | **none** returned by API (no Freshdesk remote link attached) |
| Created / Updated | 2026-07-08 17:18 / 2026-07-10 14:34 |
| Affected user | **mbowser@switch.com** — "Switch Director of Construction", most active user, logs in ~2×/week |
| Project | "All SWITCH" |
| Freshdesk | **#7374** (per comment "Ticket ID: 7374"), not #7316 as the playbook states — see discrepancy note |

### Comment thread (short — 4 comments, all 8 Jul; the real investigation lived in a chat thread, not here)
1. 17:23 Yash → Darminder: "Jira for record."
2. 17:48 Sergey: asks for user email + error screenshot.
3. 18:01 Yash: Freshdesk 7374 → Waiting on 3rd line.
4. 18:03 Yash: email = mbowser@switch.com + two inline error images (blob:… — **not retrievable ⚠️**).

There is **no comment after 8 Jul**. The move to "With Customer" (10 Jul) carries no explanation.

---

## 2. What PLT-2879 is currently scoped to

**PLT-2879 = the customer-facing SWITCH dashboard-access incident** (Blocker live incident for mbowser@switch.com, the SWITCH Director of Construction). It is the umbrella customer ticket, born as PAPI-3620 and re-homed into the PLT board.

**It is NOT scoped to the token-refresh race.** The playbook's phrase "token race fixed as PLT-2879 / PR #2030" reflects a **git/commit attribution**, not the ticket's scope: PR #2030 was committed under the active incident number (`e201f2a "PLT-2879: Fix Platform API session-refresh race sending tokenless requests (#2030)"`). The Jira ticket's own content is entirely the access incident. Treat the token race as a *side-finding filed under this number*, not the ticket's subject. (Confidence 8.)

### What it is waiting on the customer for — **UNDOCUMENTED in the ticket** ⚠️
The ticket was flipped to "With Customer" by the FE lead with no note, and no comment states the ask. **Inferred** (from sibling-ticket patterns + playbook): after the role→Viewer flip / Redis cache flush that resolved affected users on 9 Jul, the team is waiting for SWITCH to **confirm mbowser can now open the dashboards** (mirrors PAPI-3613's "Could you please check it with the customer?" → "Waiting on customer", and PAPI-3621's "is the issue still happening?"). **This is inference, not stated fact — confidence 4.** Confirming the exact ask is the single biggest gap in the record (drives the recommended action).

---

## 3. Reconciliation vs the playbook's 5 open follow-ups (as of 10 Jul → now 13 Jul)

| # | Playbook follow-up | Current status | Evidence |
|---|---|---|---|
| 1 | **Trigger unknown** — correlate access-denial error rate with deploy timeline ("why now") | **STILL OPEN** | No comment anywhere answers it. Ticket parked with no root-cause/trigger note. *New datum:* the FE gate (`project-private-route.tsx`) and authority helper (`userAuthorityUtils.ts`) were **last touched by PLT-2753 (#1959)** — well before the incident — so a *FE-gate* deploy is an unlikely trigger; suspicion should point at BE/api2/IAM role-definition or data/cache changes (I can only see the FE repo). Conf 6. |
| 2 | **Cohort sweep** — enumerate all "Dashboard Only" users, bulk-migrate to Viewer | **STILL OPEN / UNKNOWN** | No Jira ticket found for a sweep (searched PLT+PAPI, created ≥1 Jul). No FE artefact. Cannot see IAM/DB, so cannot confirm a DB-side bulk migration didn't happen out-of-band. Conf 4. |
| 3 | **Code fixes** — honor `DashboardView` on FE dashboard gate + api2 read endpoints, OR retire the legacy role | **STILL OPEN (FE verified)** | FE dashboard route gate **still requires `PROJECT_VIEW`/`PROJECT_EDIT`** — `DashboardView` is NOT accepted (see §4). No post-incident change to the gate. api2 side unverifiable (separate repo). Decision (honor vs retire) not recorded anywhere. Conf 7. |
| 4 | **Observability** — session-recording/logging so TS never asks a client for a HAR | **PARTIALLY CLOSED** | PR #2030 shipped PII-safe auth-failure logging in the Platform API client: `safeApiPath()` strips ids/query (`api-instance.ts:13-20`) and `log.info/log.error` now emit status+method+path+correlation-id on every 401/403 (`api-instance.ts:99-111`). This directly logs the exact failure class. No dedicated session-recording ticket found; MS Clarity remains the partial coverage named in the playbook. Conf 6. |
| 5 | **FE token-refresh race — PR #2030** | **CLOSED (merged, present in tree)** | Commit `e201f2a` on this branch; fix live in `api-instance.ts` (see §4). Conf 9. |

Overall reconciliation confidence: **6-7** (FE-code judgments are high; "waiting-on" and cohort/trigger judgments rest partly on absence-of-evidence and are capped because IAM/api2/Freshdesk/the chat thread are out of view).

---

## 4. hc-frontend code check (branch `claude/vigilant-franklin-katinq`; Commissioning OFF — no marker, non-commission branch)

### (a) PR #2030 (token-refresh race) — **PRESENT ✅**
`src/main/webapp/app/services/webViewerService/api-instance.ts`:
- Shared in-flight refresh so concurrent requests await one refresh: `refreshInFlight ??= serviceProvider.Authentication.getSession()…` — **lines 29, 36-46**.
- `lastTokenRefresh` stamped **only on success** (inside `.then`) — **line 39**.
- Response interceptor retries on **401 AND 403** (`isAuthFailure = status === 401 || status === 403`) — **lines 96, 98-117**; rationale comment lines 94-95.
- Request interceptor refreshes when stale (>45s) awaiting the shared promise — **lines 71-77**.
Matches commit `e201f2a` (files changed: `api-instance.ts` +47/-15, `api-instance.test.ts` +122).

### (b) FE dashboard route gate — **`DashboardView` NOT honored ❌ (root-cause FE fix NOT applied)**
- Dashboard route `:project_id/dashboard` is wrapped in `<ProjectPrivateRoute>` — `src/main/webapp/app/pages/project/routes.tsx:47-56`.
- `ProjectPrivateRoute` gates on **`[AUTHORITIES.PROJECT_VIEW, AUTHORITIES.PROJECT_EDIT]`** — `src/main/webapp/app/shared/auth/project-private-route.tsx:41`. `DASHBOARD_VIEW` is **absent** from the accepted set.
- `PrivateRoute.hasAnyAuthority` denies with the 403 UI **"You are not authorized to access this page."** — `src/main/webapp/app/shared/auth/private-route.tsx:52-53`. **This is verbatim the error reported in PAPI-3621**, confirming this gate is the FE surface that produced the incident error.
- A legacy "Dashboard Only" user holding **only** `DashboardView` therefore still fails this gate — exactly the playbook root cause, still live.
- Authority constants: `PROJECT_VIEW: 'ProjectView'` (`constants.ts:180`), `DASHBOARD_VIEW: 'DashboardView'` (`constants.ts:219`).

### (c) The `DashboardView`-aware helper exists but is only wired to *routing*, not the *gate*
`checkIsDashboardOnlyUser()` (`src/main/webapp/app/helpers/userAuthorityUtils.ts:28-57`) treats "only `DASHBOARD_VIEW`" or "`DASHBOARD_VIEW`+`PROJECT_VIEW`" (or role `viewer_role`) as dashboard-only. But it is consumed only by redirect/landing logic — `PortfolioPage.tsx:56`, `authenticationActions.ts:132,161`, `useProjectContext.ts:44`, `ProjectSelect.tsx:107` — **never by `ProjectPrivateRoute`/`PrivateRoute`**. Net effect: a `DashboardView`-only user is *routed toward* the dashboard, then *denied* by the gate. The one-line-ish FE fix (add `AUTHORITIES.DASHBOARD_VIEW` to the gate for the dashboard route) is available but should not be shipped unilaterally — see recommended-action (the honor-vs-retire decision spans api2/IAM). Both files last modified by PLT-2753 (#1959), pre-incident.

---

## 5. Sibling / related tickets (the July access cluster)

| Ticket | Summary | Status (13 Jul) | Relation |
|---|---|---|---|
| PAPI-3621 | "access error" — taha.alorabi@techbau.it, project ML09, "You are not authorized to access this page" | **Dev In Progress** (Sergey) | Same access-denial symptom, different tenant. FD #7333. |
| PAPI-3622 | "Re: Hutto 2 client not able to access platform" — Luke Peters (lpeters@prologis.com), view-only, fixed by remove+reinvite | **Open** (unassigned) | The "Luke" red-herring victim from the playbook (already fixed before forensics). Links PAPI-3621 + PLT-2879. FD #7378. |
| PAPI-3613 | "Client Dashboard Access" — dkeith@switch.com → dkeith@external.switch.com email-change invite fails ("user already in system") | **Code Review** (Sergey) | **Different bug** (IAM/api2 invitation on email change), not the legacy-role gate. Fix = hc-iam PR #409. FD #7340. |
| PLT-2868 | "Unusual Error on Dashboard in View only access" — Matt Torma, view-only, skybox hutto2 | **READY FOR RELEASE** (verified CNR by Gennaro, Staging 26.3.2) | **Different mechanism**: FE undefined-data crash (`ProgressReportWidget.tsx` `.toUpperCase()` on undefined; `api-instance.ts getProjectId` measurementType). Same "view-only + granting editor fixes it" *shape* — a confounder to keep distinct from the authority-gate root cause. |
| PLT-2887 | "Remove tenant-role gating on Portfolio Dashboard toggle" (behind flag) | **Ready For QA** (#2032) | Role-gating adjacent, but on the Portfolio toggle, not the project dashboard gate. |
| PAPI-3602 | Epic: "Portfolio Permissions" | Backlog | Likely the home for a proper permissions/role fix. |

---

## 6. Attachments & links needing a human (⚠️)

- **PLT-2879 attachments** `image-20260708-170239.png` (id 60414) and `image-20260708-170249.png` (id 60413) — the error screenshots mbowser hit. Jira-hosted, auth-gated; **not viewed in this run ⚠️**. Also the Freshdesk-hosted `Screenshot 2026-07-08 171257.png` (support.xyzreality.com/helpdesk/attachments/103330707978).
- **Inline `blob:…media.staging.atl-paas.net` images** in comments (PLT-2879, PAPI-3621/3622/3613) — not retrievable via API ⚠️.
- **Freshdesk number discrepancy** ⚠️: playbook says #7316; the actual tickets are FD **7374** (PLT-2879), 7333 (PAPI-3621), 7378 (PAPI-3622), 7340 (PAPI-3613). None is 7316. Either the playbook number is wrong or #7316 is a parent/consolidated FD ticket. Not verifiable from Jira (Freshdesk is external).
- **PAPI project** was accessible this run (PAPI-3621/3622/3613 fetched fine) — no permission block encountered.
- **api2 / hc-iam repos** not available locally — api2 read-endpoint gate and the IAM role model could not be verified in code (out of scope of this checkout).

---

## 7. Confidence summary (CLAUDE.md 1-10 scale)

| Judgment | Conf |
|---|---|
| PR #2030 present & is the token-race fix | 9 |
| FE dashboard gate still requires ProjectView; DashboardView not honored | 9 |
| PLT-2879 scope = customer access incident (token race only attributed by commit) | 8 |
| Follow-up #5 token race CLOSED | 9 |
| Follow-up #3 FE code fix STILL OPEN (api2 side unverifiable) | 7 |
| Follow-up #4 observability PARTIAL | 6 |
| Follow-up #1 trigger STILL OPEN | 6 |
| Follow-up #2 cohort sweep STILL OPEN/UNKNOWN | 4 |
| **What PLT-2879 is waiting on the customer for** (inferred; undocumented) | **4** |

---

## Update — 2026-07-14

### New Jira comment (the only change to this ticket since the 07-13 pass)

A 5th comment was posted **2026-07-13T18:27:13+0100** (comment id 107264) by
**Darminder Atker** (assignee, FE lead) — this is AFTER the last triage commit
`2057a6d`. Status is **unchanged: "With Customer"**; assignee unchanged. Verbatim:

> "Source of the problem appears to be users have been invited previously with
> old navigation and set with 'dashboard only' role. Users with this role should
> have: \"userRoleCode\" : \"viewer_role\", \"userRoleName\" : \"Viewer\". The
> authroities for this role are preset in the backend and users cannot edit. Now
> that new navigation is being used and V1 is no longer being supported."

This is an **internal diagnostic** posted by the assignee, not new customer
information. The ball is therefore arguably **not** with the customer despite the
label (see revised recommended-action).

### Code re-verification (branch changed; the two gate files did NOT)

- **Branch is now `claude/vigilant-franklin-4qs2ew`** (HEAD `54ed577`, commit date
  2026-07-10). The 07-13 pass was on `claude/vigilant-franklin-katinq`. **The
  branch name differs but the relevant files are byte-identical** — both files
  are still last-touched by **PLT-2753 (#1959)** (`git log` confirms no newer
  commit). No commissioning marker; non-commission branch → Commissioning OFF.
- **`project-private-route.tsx:41`** — gate still `hasAnyAuthorities={[AUTHORITIES.PROJECT_VIEW, AUTHORITIES.PROJECT_EDIT]}`.
  `DASHBOARD_VIEW` still absent. **Prior finding holds unchanged.**
- **`private-route.tsx:50-53`** — denial UI still verbatim "You are not authorized
  to access this page." (`error.http.403`). `hasAnyAuthority` (line 71-79) uses
  `.some(...includes)` over the held authorities. Confirmed.
- **`constants.ts`** — `PROJECT_VIEW: 'ProjectView'` (line 180), `DASHBOARD_VIEW:
  'DashboardView'` (line 219). Confirmed.

### Reconciliation: Darminder's comment vs the FE-gate hypothesis — **corroborates + refines** (no contradiction)

- **`"userRoleCode": "viewer_role"` maps to a precise FE check.**
  `userAuthorityUtils.ts:40` already keys on exactly this string:
  `projectRoleSelector(projectId)(store.getState()) === 'viewer_role'`
  (`projectRoleSelector` defined at `store/selectors.ts:152`). So the FE already
  knows how to recognise Darminder's cohort — but that recognition lives in
  `checkIsDashboardOnlyUser()` (routing/landing), **never in the route gate**.
  This is the same "helper exists, gate doesn't use it" split documented in §4(c),
  now confirmed from the product side by name.
- **"old navigation invite" / "V1 no longer supported" maps to `isV1Project()`**
  (`userAuthorityUtils.ts:34`, `V1Rules/v1ProductionRules`) and the standing TODO
  at `project-private-route.tsx:30` ("once tab view is deprecated"). Darminder is
  describing the **navigation/V1-deprecation migration as the trigger** — a
  legacy `viewer_role` cohort invited under old-nav is now hitting the new-nav
  gate. This is consistent with (not contradicted by) the code fact that the gate
  itself was untouched since PLT-2753: the trigger is the migration around it, not
  a gate deploy.
- **"authorities are preset in the backend and users cannot edit"** — reinforces
  that this cannot be self-served away by the customer; the fix must be code/role
  (honor the role, or retire it), matching the playbook root cause.

Net: Darminder (assignee, product/Jira side, without referencing the FE code)
**independently confirms the exact mechanism** the 07-13 code pass found. Two
independent angles now converge on the same root cause.

### Confidence changes

| Judgment | 07-13 | 07-14 | Why |
|---|---|---|---|
| FE gate requires ProjectView; DashboardView not honored | 9 | 9 | Re-verified, identical |
| **Root-cause diagnosis (legacy `viewer_role`/DashboardView-only locked out by the gate)** | 9 (code only) | **9 (two independent angles)** | Assignee's Jira comment names `viewer_role` → maps to `userAuthorityUtils.ts:40` |
| Follow-up #1 "why now" / trigger | 6 | **7** | Now partially answered: old-nav→new-nav / V1-deprecation migration (per assignee). Still no dated deploy/error-rate correlation, so not fully closed |
| "What we're waiting on the customer for" | 4 | — (moot) | Superseded: the latest comment is an internal diagnostic, so the ball is not with the customer; the question is no longer the gating unknown |
