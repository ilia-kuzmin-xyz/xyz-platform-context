# PLT-3015 — Remove usage of Account authorities and default project

Epic: PLT-2813. Continuation of PLT-2899 (commit `ca87f65`, "Remove defaultProject
as an active-project source on FE", #2076) — **read that diff first.**

## 2026-10-03 — blast radius mapped, moved to Analysis, no code written

Moved to Analysis rather than started, because one decision in it is not the
frontend's to make. Comment on the ticket asks it.

### The blocking question

The ticket's premise is that the backend wants to stop putting `authorities` on the
account response. But **~76 route guards across admin / organisation / company have
no project id in scope at all**, and nor do the menus or the page Edit/Delete
buttons. Those grants are tenant-level, not project-derived. If `account.authorities`
empties, every one of them goes dark — `hasAnyAuthority` returns `false` for an
empty array.

> **Does the BE keep account authorities for tenant scope and drop only the
> project-derived ones, or is a tenant-authorities endpoint coming?**

That answer is the difference between a week and a much larger piece.

### What is safely removable (the default-project half)

| Site | Note |
|---|---|
| `store/selectors.ts:134-137` | `activeProjectIdSelector = account?.defaultProject?.id` |
| `components/DownloadsModal/DownloadsModal.tsx:71,82,85,96` | the only real consumer — needs the URL project id instead |
| `store/slices/authentication/authenticationActions.ts:49-53, 119-175` | sign-in landing fallback + the mismatch → `updateWorkingProject` → `window.location.reload()` dance |
| `services/accountService/accountService.ts:65-67` | `PUT ms/iam/api/account/defaultProject/{id}` |
| 4 `updateWorkingProject` call sites | `authenticationActions.ts:121`, `PortfolioPage.tsx:88`, `ProjectCreateModal.tsx:235`, `ProjectInviteCompletePage.tsx:192` |
| Types | `authentication.types.ts:57`, `shared/model/user.model.ts:22-30` |

Unknown to verify before deleting: `ProjectCreateModal`'s comment claims the editor
needed the working project set before navigating. Confirm it no longer does.

Note `ContactService.detachProject` (IAM) also nulls a user's `defaultProject` when
they are removed from that project — BE-side coupling to the same concept.

### The authorities half

Already-correct endpoint, already used: `GET ms/iam/api/account/projects/{id}/authorities`
→ `accountService.ts:119-124`, hook `hooks/useProjectAuthorities.ts`, whose own
header comment already states this ticket's thesis.

**The bridge that has to die first:** `shared/auth/private-route.tsx:20`
```ts
const authorities = account.authorities.length === 0 ? projectAuthorities : account.authorities
```
Account wins whenever non-empty, so swapping call sites changes nothing until this
goes. Then `project-private-route.tsx:44-53` (the Redux sync kept alive only for
the legacy `useAuthority`) and the `projectAuthorities` slice, then `useAuthority`.

**Genuinely project-scoped account reads — straight swaps, all already have a projectId:**
`TeamTab/hooks/useProjectRoles.ts:26`, `GeneralTab/ProjectDelete.tsx:17`,
`organisation/RolePage.tsx:54`, `ProjectInviteEntryForm.tsx:46`, and the consumers of
`progressDashboardOnlyPermittedUserSelector` (`store/selectors.ts:144-153`).

**Deliberately account-scoped, leave alone:** `COMPANY_EDIT` in `TeamContent.tsx:226-229`
and `CompanyDetailsSlider.tsx:65-69`; `PORTFOLIO_DELETE` in `usePortfolioAuthorities.ts:47`
(IAM seeds it tenant-level).

### Traps for whoever picks this up

- **`placeholderData: []`** on `useProjectAuthorities` — while in flight,
  `useHasProjectAuthorities` reports `[false]`, i.e. a flash of no-permission.
  Every swapped call site inherits it unless it checks `isPlaceholderData`, as
  `use-asset-deletion.tsx:49-52` and `use-system-deletion.tsx:151-153` already do.
  (Recorded earlier in `sprint-tickets/PLT-3140/context.md:314-321`.)
- **Mongo id** keys the authorities endpoint, not postgres — `commissioning/README.md:187-189`.
  ProjectSettings tabs mix both id flavours.
- `/authorities` can 403 `scopeNotValid` on a JWT with an empty scope claim
  (`PLT-3096` note). If the JWT scope is derived server-side from the default
  project, removing it may change which project ids the endpoint accepts. **Check
  with BE.**
- `AuthoritiesType` is `keyof typeof AUTHORITIES` but runtime holds the *values*
  (`mocks/msw/fixtures/account.ts:12-15`). Worth fixing while in there.
- Open and unfixed, touching the same lines: `PLT-2879` — `ProjectPrivateRoute`
  gates on `[PROJECT_VIEW, PROJECT_EDIT]` with no `DASHBOARD_VIEW`, so a
  dashboard-only user is routed toward the dashboard then denied by the gate.

## 2026-10-04 — no change; still waiting on the backend answer

Checked, nothing moved. The 10-03 clarification is still the last comment on the ticket — no
reply from BE on whether account authorities survive for tenant scope. Status correctly stays
Analysis In Progress. Nothing re-asked (one working day old) and no code written: the ~76
tenant-level guards make this unsafe to start on a guess, and that reasoning is unchanged.

## 2026-10-05 — no change; still waiting on the backend answer

Weekend, nothing moved. The 10-03 clarification is still the last comment — no reply on whether
account authorities survive for tenant scope. Status correctly stays Analysis In Progress.
Not re-asked (zero working days elapsed) and still no code written: the ~76 tenant-level guards
make starting on a guess unsafe, and that reasoning is unchanged.
