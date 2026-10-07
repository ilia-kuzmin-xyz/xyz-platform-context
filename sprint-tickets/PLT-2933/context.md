# PLT-2933 — Leave project from the Portfolio page

Epic: PLT-2813 (Q3 2026 Bugs and Improvements). Design ref: DIGP-1414.

## 2026-10-03 — implemented, draft PR #2263, one open product question

Branch `PLT-2933` off `master`. Menu item + confirm dialog, no new API.

### The finding that shaped it: who IAM actually lets leave

`DELETE ms/iam/api/contacts/{contactId}/projects?projectId=` is
`ContactResource.java:212-218`, gated
`@PreAuthorize(hasPermission(#projectId,'PROJECT','ProjectPersonRemove'))`.
Cross-referenced against `ROLE_PERMISSIONS` in `config/constants.ts`:

| Role | `ProjectPersonRemove` | Outcome |
|---|---|---|
| Project admin | yes | leaves |
| Editor | yes | leaves |
| **Viewer** | **no** | 403 |
| Tenant account admin | yes | **refused anyway** — `ContactService.detachProject` throws `ScopeNotValidException` for a user holding `TENANT_ACCOUNT_ADMIN_ID` |

So the menu item is gated on `PROJECT_PERSON_REMOVE`: it appears only where the
call can succeed. **Open question on the ticket: should Viewers be able to leave?**
The ticket's wording ("users do not have an option…") suggests yes, which needs an
IAM self-leave allowance. One-line change on the FE once decided.

Also true and **not** new: IAM has **no last-admin guard** — the sole admin of a
project can leave and orphan it. The Team tab already allows this today.
And `detachProject` sends a "removed from project" email, so a self-leave mails you.

### Code map

```
pages/PortfolioPage/
  PortfolioPage.tsx                  showLeaveDialog state, handleLeave, wiring
  components/ProjectCardMenu.tsx     'leave' item + PROJECT_PERSON_REMOVE gate
  components/ProjectLeaveDialog.tsx  new — confirm modal + mutation
```

### Gotchas worth keeping

- **Mongo id, not postgres.** `activeProjectId` (`PortfolioPage.tsx:166`) is the
  mongo id, which is what IAM's contact/project endpoints take. Contrast
  `ProjectDeleteDialog`, which resolves the postgres id via `useProjectId` because
  the *V2* delete needs it. Swapping them fails quietly — there's a test pinning it.
- **`ProjectCardMenu`'s mobile branch ignored `hidden`.** `NestedMenu` honours it;
  the `MobileMenu` map did not, so any gated item leaked on a phone. Fixed here.
  Dangling dividers on mobile remain possible (NestedMenu prunes them, MobileMenu
  doesn't) — pre-existing, left alone.
- Current user's contact id: `currentUserContactIdSelector`
  (`store/selectors.ts:129-132`) → `account.contact.id`.
- Self-removal precedent already existed in the Team tab:
  `TeamTab/TeamContent.tsx:842-886` — invalidates `['projects']` on self-removal.
- Testing `translate()` output: the shared `createTestWrapper` registers
  translations in a `useEffect`, i.e. **after** the first render, so menu titles
  read empty. Register `mlt/en/main.json` in `beforeEach` if asserting on labels.
- `tr/main.json` has no `ProjectCardMenu` block, so only `en` needed the new key.

### Error messages

Server's own `detail`/`message` is surfaced where present, because the tenant-admin
refusal is reachable and not retryable — a flat "please try again" would send
someone round a loop. Same swallowed-message problem recorded in
`incidents/live-incident-board-tickets/PLT-3182-groupA-access-permissions/context.md`,
fixed here for this one path only.

## 2026-10-07 — master merged into the PR and pushed; all checkpoints clear

Checkpoint 1: nothing to action — #2263 has zero review threads (still draft, no reviewer has
looked at it yet).

Checkpoint 2: CI was green on the previous head and is re-running on the merged one.

Checkpoint 3: done. The branch had drifted 3 commits behind master (`b8e1da0` PLT-3172,
`959f1ad` PLT-3223, `95e1003` PLT-2910). Merged and pushed as `52aa646` on `PLT-2933`.

Verified rather than assumed — npm works this run, so **409 tests pass** (2 skipped) on the merged
head across `PortfolioPage/`. `git merge-tree` reported no conflicts beforehand and file overlap
with the three master commits was zero.

Note the PR is still a **draft** and has been since 10-03. It is complete and green; it is waiting
on someone being asked to review it, not on more work.
