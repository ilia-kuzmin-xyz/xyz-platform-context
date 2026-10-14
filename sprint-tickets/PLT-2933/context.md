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

## 2026-10-14 — Ilia reworked the PR to spec; Copilot found 3, then a 4th in my fix

Ilia took #2263 over directly: `3f491bb6c` moved Leave above Delete per DIGP-1414, took the spec's
copy, added tests — **and added a client-side last-admin guard**, which the original deliberately
did not have (the 10-03 note recorded that IAM has none). Verified his merge and edits left the
authority gate, the mongo id and the `['projects']` invalidation intact.

### What Copilot found, all verified before acting

| Sev | Finding | Outcome |
|---|---|---|
| HIGH | last-admin precheck is TOCTOU and cannot enforce the invariant | **thread left open** — fix is in IAM, not this repo |
| MEDIUM | `isAdmin` read only the flattened `userRoleCode` | fixed `fe863e211` |
| LOW | mobile menu renders orphan dividers | fixed `fe863e211` |
| MEDIUM | *(on my fix)* caller exempted from the active check | fixed `27d77beea` |

**The flattened-role trap, worth keeping:** `IProjectContactInfo.userRoleCode` is only the FIRST
grant and the direct one sorts first. `memberships` carries them all, each with its own
`userRoleCode` and `userStatus`. Any role test that reads only the flattened field misses a grant
held through a portfolio. This applies well beyond this dialog.

**The divider trap:** pruning orphan dividers with a positional `filter` is subtly wrong — it judges
each divider against its *unfiltered* neighbours, so `item/divider/divider` keeps the first and
leaves it trailing. A fold (append a divider only after a real item, drop a trailing one) is correct.
Both versions pass a naive "drops a trailing divider" test, which is why the extra cases matter.

**Why the HIGH stays open:** the precheck reads contacts in one request and detaches in another, so
two admins can both pass it. Only IAM refusing the last active admin in the same transaction holds
it. `ContactService.detachProject` has no such guard today — pre-existing, and the Team tab's remove
path can orphan a project the same way. Wants its own ticket.

### Two mistakes of mine this run, both worth not repeating

1. **I pushed 25 type errors.** All in the new test fixtures (`{key: string}` not satisfying the
   helper's constraint; `userStatus: string` not `'ACTIVE' | 'PENDING'`). I ran `tsc` in the *same
   compound command as the commit and push*, so the count scrolled past unread. **Run the
   type-check as its own command and read it before committing** — CI type-checks since PLT-3233,
   so this would have gone red. Fixed in `6b8e3f2de`.
2. **I invented an asymmetry and documented it, which made it look deliberate.** Exempting the
   caller from the active check conflated "active on the project" with "holds an active admin
   grant". The fix was to delete the special case; the result is simpler than what it replaced,
   which is usually the sign it was never earning anything. A comment justifying a special case is
   not evidence the special case is right.
