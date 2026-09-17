# PR-review run — 2026-09-17

Scheduled sweep of open **non-draft PRs authored by Rishi / Darminder / Tom** in
`XYZReality/hc-frontend` (different scope from the 09-14 run, which swept ilia-kuzmin-xyz's own
PRs — read that log for those). Jira read first for every PR; reviews submitted on Ilia's account.

## TL;DR

3 PRs matched, all DarminderA's, all green (build + Sonar), all based on master tip `69576da`,
no conflicts. No open non-draft PRs from Rishi (rishib-xyz) or Tom (TomMasdinXYZ) existed.
**Approved #2218, requested changes on #2219, deferred #2220 to Ilia (no comment posted).**
Darminder's draft #2211 (PLT-3112) skipped per draft filter.

## Per-PR outcome

| PR | Ticket (priority) | Decision this run | Open threads after |
|----|-------------------|-------------------|--------------------|
| #2218 | PLT-3039 (Minor) — rename Edit → Project Settings | **APPROVED** | 0 |
| #2219 | PLT-3037 (Critical) — block weak PINs | **REQUEST CHANGES** | 2 Copilot + my review |
| #2220 | PLT-3021 (Medium) — grey out Installed when already installed | **deferred to Ilia**, nothing posted | 2 Copilot |

## #2219 — the blocking finding (verified in code, not just Copilot's word)

The new `isSimplePin` rule lives only in the modal's `usePinForm.ts`
(`app/components/UserSettingsModal/hooks/usePinForm.ts`). The legacy route `/account/settings/*`
(`app/pages/account/routes.tsx:20-27`) still renders `app/pages/UserSettingsPage/components/Pin.tsx:31`,
which validates with plain `YupSchemaGenerator.validate(['pin_r','confirmPin_r'])` — length-4 only
(`app/helpers/YupSchemaGenerator/YupSchemaGenerator.ts:258-262`) — and calls the same
`Accounts.savePin`. So `1234` still goes through the legacy page; on a Critical ticket that's the
goal unmet. Suggested fix in my review: move `isSimplePin` into YupSchemaGenerator's `pin` case so
both forms share one policy. Non-blocking notes: unit tests for the predicate; follow-up ticket for
server-side enforcement.

## #2220 — why deferred rather than decided

Core change is sound (verified): filter uses exactly the two installed states
(`ElementState.Installed`/`InstalledEarly`, matching `INSTALLED_STATUSES` in
`assets-panel.tsx:81`), and `disabled: isSelectionAlreadyInstalled` as a function is a supported
pattern (`nested-menu.tsx:117,138` evaluates function `disabled`). But Copilot's first thread is a
**real service-contract hole**: `setInstallationStatus` treats an empty `explicitElementIds` array
as "omitted" and falls back to writing the whole selection
(`installation-status-service.ts:136-143`). Only reachable in a race (menu item is disabled when
all-installed), so Medium-severity in practice — but the one-line empty guard is exactly the
ticket's goal, and the test steps are visual-in-viewer. Recommendation passed to Ilia: ask for the
guard + quick UI check, then approvable.

## Pitfall for future runs (this container)

`xyz-platform-context` was cloned **shallow**; local `main` (rooted 09-09) appeared to have 50
commits "not on" origin/main (rooted 09-12) and `git merge` refused with "unrelated histories".
Nothing was stranded — `git fetch origin main --unshallow` reconnected the graph and local main
fast-forwarded cleanly. Check `git rev-parse --is-shallow-repository` before concluding work is
stranded. Also: two hc-frontend viewer files (`viewer-bar/utils/toolbar-test-utils.ts`,
`viewer-provider/viewer-provider.types.ts`) sat permanently "modified" from CRLF-vs-LF; fixed by
`git add --renormalize` + commit on the session branch (`ce41247`).
