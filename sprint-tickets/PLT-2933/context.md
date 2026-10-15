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

### Round 3 — the finding with no thread

Copilot's summary carries a **"Previously missed"** `<details>` block for findings in code that has
not changed since the last review. Those are **not posted as inline threads**, so they are easy to
scroll past and there is nowhere to reply. This one was real: the title's close button stayed
enabled during the detach while `Back` was disabled, so a user could dismiss after confirming and
leave the mutation running with no dialog to report a failure into. Fixed `494f4d0d6` —
`ModalTitle` already takes `disabled` and both its close controls honour it.

**Read the summary's collapsed sections, not just the threads.** The findings there get no
notification of their own.

### State at end of this run

| Finding | Where |
|---|---|
| memberships not consulted | fixed `fe863e211` |
| orphan dividers | fixed `fe863e211` |
| caller exempt from active check (mine) | fixed `27d77beea` |
| close button during detach | fixed `494f4d0d6` |
| last-admin TOCTOU | **open** — needs an IAM ticket |

429 tests, `tsc` clean on both files. Build running on `494f4d0d6`; the `fe863e211` red was the
superseded run carrying my type errors.

## 2026-10-15 — round 6: the IAM error body is not prose

Two more Copilot findings, both real, both fixed in `41cafa30d`. Recording the *reason* they were
real, because it is a fact about the platform rather than about this dialog, and the next person
reading an IAM failure will need it.

**`message` is always an i18n key.** `ProblemExceptionTranslator.enrich` (hc-iam,
`config/exceptions/`) stamps `message: "error.http." + status` on every response that does not
already carry a more specific one, and the specific ones are keys too (`error.validation`,
`error.concurrencyFailure`, `error.<errorKey>` from `BaseProblemException`). There is no path on
which `message` is a human sentence. Reading it for display puts `error.http.403` in front of a
user. Confirmed in the IAM source, not inferred from the MSW fixture that first flagged it.

**`detail` is prose, but often machine prose.** `handleAccessDeniedException` does
`ProblemDetail.forStatusAndDetail(FORBIDDEN, ex.getMessage())`, and for a `@PreAuthorize` denial
Spring's message is the literal `"Access Denied"`. An unhandled 500 goes through
`createProblem(body, status)`, whose detail is `body.toString()` — a failure's own string, which
should never reach a user.

The consequence here was worse than the finding claimed: because `detail` is set on the plain 403
and was read first, the dialog's carefully written permission copy was **dead code and had never
rendered**. The raw-key case that was reported is actually the *tenant account admin* refusal —
`ScopeNotValidException` is a `BaseProblemException`, which leaves `detail` null and puts
`error.scopeNotValid` in `message`. That is the one case the function was written for.

Resolution order now: specific key → translate via the existing `getTranslatedTextWithGuard`;
generic `error.http.*` → ignore in favour of this dialog's copy (translating it gives "You are not
authorized to access this page.", which is about pages); `detail` last.

**Generalisable:** when displaying a failure from IAM anywhere in this app, prefer a translated
specific key, then your own copy. Do not print `message`. Treat `detail` as a last resort.

### Second finding: locally handled failures still raised the global modal

Neither the detach nor the members read opted out, so a 403/500 opened the app-wide error modal
*as well as* the dialog's inline alert — and closing the dialog does not clear the global one.
Fixed with the existing `skipGlobalErrorHandler` status-list form (same shape as
`PROJECT_COMPANIES_REQUEST` in `useCompanies.ts`), threaded as an optional third `config` argument
on `detachContactFromProject` / `getProjectContacts` and a `requestConfig` on `useProjectContacts`,
so the nine other detach call sites and the Team tab keep global handling.

`skipGlobalErrorHandler: [400, 403, 404, 409, 500]` — **not** `true`, because `true` also
suppresses the 401 sign-out.

### Test environment note

`translate` from react-jhipster has no `TranslatorContext` under vitest and returns `null` for
every key, so `getTranslatedTextWithGuard` returns `null` too — its signature says `string`. A
test that needs translated copy must stub the helper; registering translations would couple the
test to the react-jhipster version, which differs between this checkout and CI.

### State at end of this run

| Finding | Where |
|---|---|
| raw i18n key / dead permission copy | fixed `41cafa30d` |
| global modal on locally handled failures | fixed `41cafa30d` |
| last-admin TOCTOU | **still open** — needs an IAM ticket, deliberately |

450 tests green across `PortfolioPage/`, `tsc` identical to the branch baseline (11 pre-existing
artefacts from the stale `node_modules`, none in changed files). PR description corrected to match.

## 2026-10-15 (evening) — round 7, and a correction to this morning's test-environment note

### ⚠️ Supersedes the "Test environment note" in the round 6 section above — that note is WRONG

That note said `translate` has no `TranslatorContext` under vitest, returns `null` for every key,
and that a test needing translated copy "must stub the helper". Do not follow it.

`createTestWrapper` (`app/test-utils.tsx`) registers the real translations in a `useEffect`:
`TranslatorContext.registerTranslations('en', languageObj)` + `setDefaultLocale('en')`. So anything
rendered through that wrapper resolves keys for real. The probe that produced the wrong conclusion
called `getTranslatedTextWithGuard` from a bare test with no wrapper, which is the one case where it
does return `null` — a true observation generalised to a false rule.

The cost was a stub that made a passing test prove less than it looked like it proved. Removed; the
`error.scopeNotValid` case now goes through the real lookup, which additionally pins that the key
exists in `i18n/en/main.json` instead of resting on my having grepped it.

**Generalisable:** a probe run outside the harness the real test uses measures the probe, not the
test. Put the probe inside the same wrapper, or do not draw a rule from it.

### Round 7 findings (both fixed in `ce6c3d84e`)

**MEDIUM — the dialog had no accessible description.** Only `aria-labelledby` was set, so entering
the confirmation announced "LEAVE PROJECT?" and nothing about what leaving costs. `Modal`
(`.../common/modal/modal.tsx:28`) has always forwarded `aria-describedby` explicitly — nothing was
passing one. The consequence paragraph now carries a `useId` and the dialog points at it. The
last-admin and error lines are deliberately *not* in the description: they carry `role='alert'`, so
they announce on appearance.

Note the PR description had claimed "Screen readers announce the dialog by its title and read its
messages out", which is how it read as covered. Claims in a PR body get believed.

**LOW — the two gates on Leave were unasserted.** Leave is disabled while the members check runs
and if it fails, because the last-admin warning cannot be trusted otherwise; no test proved either.
The `confirm()` helper waits for the button to enable, which touches the loading gate but asserts
nothing about why it was disabled. Two cases added, mutation-checked *separately* — one assertion
covering both gates would hide a regression in either.

Repo rule that settles the severity question: hc-frontend `CLAUDE.md` says **"Reviewer requests for
a test on real logic are always honoured"**, so a LOW-labelled request for a test on a real gate is
not optional.

### Parallel session also pushed here

`fef02e1e2` (another run, same morning) closed the 5xx-`detail` leak this file's comment had only
described: `detail` is now read from 4xx only, so an unhandled IAM 500's `toString()` can't reach
the user. Good change — it finished something round 6 left half-done.

### State at end of this run

| Finding | Where |
|---|---|
| no accessible description | fixed `ce6c3d84e` |
| members-check gates unasserted | fixed `ce6c3d84e` |
| 5xx detail leak | fixed `fef02e1e2` (parallel run) |
| last-admin TOCTOU | **still open** — Copilot now frames it as needing human sign-off, which is right |

27 tests in the dialog file, 452 across `PortfolioPage/`, `tsc` at the branch baseline.
