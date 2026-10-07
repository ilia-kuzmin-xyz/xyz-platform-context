# PLT-3201 — "Forbidden" modal shown when closing Project Settings

Bug, Major. Reported by Jason Fingland, 2026-10-02. Domain: Project Settings
(`pages/PortfolioPage/components/ProjectSettings/`) + the app-wide error modal.

## 2026-10-07 — mechanism found and confirmed; moved to Analysis pending the failing endpoint

### What the bug actually is

The modal is **not** raised by closing the panel. It is the app-wide
`components/ErrorMessage/ErrorMessage.tsx`, triggered by a 403 fired *while
settings is still open*, and invisible until the panel goes away.

The reason it is invisible is a **z-index inversion between two modal
libraries**:

| Layer | Library | z-index |
|---|---|---|
| Project Settings | MUI `Dialog` (`ProjectSettings.styled.tsx` → `common/modal`) | 1300 |
| `ErrorMessage` | reactstrap `Modal` | 1050 |

So the error modal mounts *underneath* the settings dialog, sits there unseen
for the rest of the session, and surfaces the moment settings closes. That
reads to the user as "closing settings caused an error".

**This is already documented in the repo** — and the finding is not new to the
team. `TeamTab/CustomPermissions/request-config.ts` says verbatim:

> Without it a 403 — the common case, since IAM role read/write is itself
> permissioned — reaches the app-wide "You are not authorized to access this
> page" modal, which renders over the whole page from behind the
> project-settings modal the user is actually looking at.

PLT-2901 (`a4f6044`) solved it *locally* for that one feature by setting
`skipGlobalErrorHandler: true` on its own requests. Nothing solved it generally.

### Why the modal text in the ticket matches

The ticket quotes "Forbidden — You are not authorized to access this page",
which is neither i18n string exactly:

- `hc.components.ErrorMessage.forbidden` = "You don't have permission to access this page!"
- `error.http.403` = "You are not authorized to access this page."

`ErrorMessage` renders `generalMessage` **plus** `error.title` **plus**
`state.message`. An RFC-7807 body with `title: "Forbidden"` produces exactly the
reported composite — and RFC 7807 is **hc-iam**'s error format
(`spring.mvc.problemdetails.enabled=true`, per hc-iam CLAUDE.md). So the 403
almost certainly comes from `ms/iam/api/...`.

### The flow, for whoever picks this up

```
axios-interceptor.ts:94    403 → revalidateProjectAccess() + onOtherErrors(...)
index.tsx:22               → actions.catchErrorMessage(...)
globalSlice                → errorStatusCode set (sticky — no auto-dismiss)
app.tsx:150                {!isErrorModalVisible && !!errorStatusCode && <ErrorMessage />}
ErrorMessage.tsx:186       reactstrap <Modal> — renders at 1050, under the MUI dialog
```

`ErrorMessage` clears on unmount and on its own close button, so nothing else
dismisses it. Suppression lists that *do* work are
`errorMessageIgnoreMatchedEndpoints` / `errorMessageIgnoreExactEndpoints`
(`config/constants.ts:833-856`) and per-request `skipGlobalErrorHandler`.

### What was ruled out — do not re-derive these

A plain open → close of the **General** tab (the default) fires only:

| Request | 403 risk |
|---|---|
| `getProjectId(mongoProjectId)` (`hooks/useProjectId.ts:24`) | no |
| `getProjectDetails(projectId)` (`hooks/useProjectQuery.ts:26`) | no |
| `listProjectAuthorities` (`accountService.ts:119-124`) | **already** `skipGlobalErrorHandler: true` |

So the reported "open, close, boom" cannot be reproduced from the default tab
by reading the code alone — something about the reporter's project/account, or
an earlier tab in the same session, supplies the 403.

**The strongest candidate, but it needs Edit mode, not a plain open:**
`usePortfolioWeightings` (`GeneralTab/usePortfolioWeightings.ts`) fans out
`projectQueryOptions(p.postgresProjectId)` across every *other* portfolio
member. Its own docstring says "a portfolio can contain a project this user
can't read (the details endpoint 403s)" and it handles that with
`Promise.allSettled` — **functionally** fine, but the interceptor still fires,
so each unreadable member queues the global modal. It is only wired into
`GeneralTabEdit` (`:129`), reached by clicking Edit, and only eager when the
project is already portfolio-enabled. That matches the symptom in every respect
except the reporter not mentioning Edit.

### Why no fix was pushed

The fix differs by cause and the two are not interchangeable:

- 403 is **expected and already handled** (the portfolio fan-out) → add
  `skipGlobalErrorHandler` at that read, same as PLT-2901 did. The modal then
  never queues and the z-index inversion is moot.
- 403 is a **real permission gap** → the user *should* see it, just not
  ambushed 30 seconds later behind an unrelated action.

Guessing wrong either hides a real error or papers over a permissions bug.

### Asked on the ticket (comment `114150`, 10-07)

For the failing request's path + status. Deliberately pointed at the session
log rather than asking for a fresh repro: `logApiFailure`
(`axios-interceptor.ts:39-52`) already records method, path, status and a
bounded response body on **every** failure, and session logs are uploaded — so
the answer is likely already captured from the reporter's original session.

### Worth fixing regardless of the answer

The z-index inversion is a general defect: *any* 403 raised behind *any* MUI
dialog surfaces later, detached from the action that caused it. Project
Settings is just the dialog people keep open longest. A general fix (align the
two stacking contexts, or drop reactstrap here) is a bigger piece and should be
its own ticket — flagging it, not smuggling it into a bug fix.
