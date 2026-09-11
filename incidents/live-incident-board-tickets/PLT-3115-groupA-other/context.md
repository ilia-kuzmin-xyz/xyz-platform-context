# PLT-3115 — Cloud Devices autofill: Device Name auto-populated with the admin's username

**Raised** 2026-09-09 15:06 by Yash Patel. No Freshdesk-automation comment on this ticket (unusual
for this board — every other ticket read this run has "Ticket ID: N - Freshdesk status changed to"
noise; this one has only Yash's own comment), so no Freshdesk ticket number is recoverable from Jira.
**Status** Open · **Major** · assignee Darminder Atker
**Domain tag:** `other` — this is the Cloud Admin device page, not the Dashboard/Web Viewer/Web
Editor surfaces the other domain tags cover. No existing domain doc in `xyz-platform-context`
covers admin device management; closest is `dashboard/project-types.md`, which doesn't touch this
page. Worth a short domain note if this recurs (see "What remains unverified" below).

## Description (verbatim, condensed)

Customer, on `cloud.xyzreality.com/admin/device/<id>`: the **Device Name** field is auto-filled by
**LastPass** with the admin's own login email, and if saved, overwrites the device's real name —
"almost daily," with one incident where a returned device kept a Cloud Admin email as its name.
Customer explicitly names the fix ("the field shouldn't look like a username/email field to a
password manager") and references **PLT-2940**, which they believe already fixed this in
**Platform 26.3.4** — implying either a regression, an incomplete fix, or a different field than the
one PLT-2940 covered.

## Media — unopenable, flagged per standing rule

Two screenshots, confirmed 403 on content fetch (same session-wide limitation as PLT-3116):
- `64222` `image-20260909-141413.png`
- `64223` `image-20260909-141421.png`

**What they would settle:** which exact field/dialog the customer is looking at when the autofill
happens — the main Device Name form, or the delete-confirmation "type the device name to confirm"
dialog (see code trace below — they have very different autofill hardening today). The customer's
own description ("the field") suggests the main form, but the screenshots would confirm it, and
would show whether the value in the box is the email or something else.

## Code trace (verified this run, file:line cited throughout)

Two distinct device-name **text inputs** exist in hc-frontend's admin area:

1. **Main "Device Name" field** — `DevicePage.tsx:258-271`, the one actually persisted on save
   (`onSubmit` → `deviceName: values.deviceName`). Has `id='deviceName'`, `name='deviceName'`,
   **`autoComplete='off'`**, and **`data-lpignore='true'`** (LastPass's own opt-out attribute). The
   wrapping `<Form>` (`:257`) also sets `autoComplete='off'`. Sits in the same form as `deviceCode`,
   `tenant`, `project` — no email/username field nearby. **Autofill suppression is fully present
   here, in current code, today.**
2. **Danger Zone "confirm device name before delete" field** — `DangerZone.tsx:69-76`, a separate
   confirmation input in the delete dialog on the same page. `name='confirmDeviceNameBeforeDelete'`,
   **no `id`, no explicit `type`, no `autoComplete`, no `data-lpignore`** — zero autofill hardening.
   This field is never persisted (it's a type-to-confirm gate, not the saved name), so it does not
   match "saving overwrites the device name" literally — but it is the one LastPass-guess-prone
   field still exposed on this page today.

`DeviceListPage.tsx` / `DeviceCard.tsx` have no editable device-name inputs, only read-only
`<td>`/`<Typography>` display — ruled out as the source.

**PLT-2940's actual commit is not recoverable from this session's git history** (`git log --all
--grep=2940` and `--grep=lastpass|autofill` return nothing; the single commit that adds
`DevicePage.tsx` whole already contains today's `autoComplete='off'` + `data-lpignore='true'`, so the
fix predates what this shallow clone can see). What's confirmed either way: **the primary field's
hardening exists and is intact in current code right now.**

## The puzzle this leaves

The customer's literal complaint ("the field is being autofilled, saving overwrites the name")
does not match the current code on the field that actually gets saved — that field is already
hardened. Three explanations, none yet distinguished:

1. **The customer is looking at `DangerZone`'s confirm field**, which genuinely has no hardening —
   but that field isn't the saved name, so an autofill there would change nothing unless combined
   with a separate, unexplained bug that copies its value into the real save.
2. **`data-lpignore`/`autoComplete='off'` no longer works reliably** — a known, real-world LastPass/
   Chromium behaviour: some browser+extension version combinations increasingly ignore
   `autocomplete="off"` for fields their heuristics classify as login-shaped, regardless of the
   attribute. `data-lpignore` is meant to be the harder override, but this is worth confirming
   against the customer's actual LastPass/browser version rather than assumed.
3. **The customer is on a stale cached bundle** that predates whatever shipped `data-lpignore` —
   possible if their session hasn't force-refreshed since a recent deploy (same class of gap the
   2026-09-04 "deployed bundle is not the repo" rule warns about, applied to a CDN-cached SPA shell
   rather than a viewer extension).

## What remains unverified

- Which of the two fields (or a third, not found by this search) the customer's screenshots show.
- Whether `data-lpignore` is actually honoured by the specific LastPass version/browser combination
  in play — not testable from this session (no browser).
- Whether PLT-2940's original scope covered `DangerZone.tsx` at all, or only the main form — the
  commit itself isn't visible in this session's history.

## 2026-09-11 (scheduled) — status moved to With Customer; Darminder's own repro attempt was negative; core question still unanswered

Fetched fresh from Jira (`getJiraIssue`, fields incl. `comment`, `attachment`). Diffed against the
09-10 entry above.

**Status changed:** `Open` → **`With Customer`** (was `Open` as of the 09-10 write-up; still
assignee Darminder Atker, still Major). This is the first status move since creation.

**One new comment, VERIFIED** — `111941`, Darminder Atker, 2026-09-10 13:36 (edited 13:37), addressed
to Yash:

> "Could we get further details as this should have been fixed under Platform 26.3.4. I have tested
> on Edge and Chrome with Cloud and last pass does not appear (I used lastPass to login) ... Could we
> get a video and browser they are using? Maybe we are missing one of the steps they are doing."

Darminder attached two screenshots of his own test (Edge + the Cloud environment; Chrome + the DEV
environment), both logged in via LastPass, neither showing the autofill. **This is a negative
internal repro on the main form** — the playbook's Phase 4 move (find/build an internal repro),
already attempted by the assignee, and it did not reproduce. No reply from Yash or the customer yet
as of this fetch (2026-09-11) — the ticket is genuinely waiting on the customer relay, one day in.

**Two new attachments, unopenable — same session-wide 403, not re-tested (per the 2026-09-08 rule:
the gap is the session's credentials, not worth a retry):**
- `64302` `image-20260910-123056.png` (Darminder, "Edge with Cloud environment")
- `64303` `image-20260910-123548.png` (Darminder, "Chrome with DEV environment")

**What this changes and what it doesn't:**
- Does **not** answer the open question — which field/screen the customer means. Darminder's ask
  covers browser + video but does not explicitly ask main-form-vs-delete-dialog; if the customer's
  video shows the main form, that still would not explain the symptom given hardening is intact
  there (confirmed unchanged this run, see below), unless it's a LastPass-version override
  (hypothesis 2 from 09-10) or a stale bundle (hypothesis 3).
- **Does** add weight to hypothesis 2/3 over hypothesis 1: an internal LastPass user, logged in via
  LastPass, on the exact main form, on both Edge and Chrome, in both Cloud and Dev, saw no autofill.
  That makes "the customer is looking at the unhardened `DangerZone` field" and "customer's specific
  LastPass version/extension state behaves differently" relatively more likely than before, though
  neither is confirmed — Darminder's LastPass version/vault contents are unknown and could differ
  from the customer's in ways that suppress the effect (e.g. no saved credential matching the
  device's own email-shaped autofill target).

**Code re-verified, unchanged from 09-10:** `DevicePage.tsx:257` (`<Form ... autoComplete='off'>`),
`:259-270` (`id='deviceName'`, `name='deviceName'`, `autoComplete='off'`, `data-lpignore='true'`) —
main field hardening intact. `DangerZone.tsx:71` (`name='confirmDeviceNameBeforeDelete'`) still has
no `autoComplete`/`data-lpignore` nearby — gap still open, still unexploited by any confirmed
mechanism.

**What remains unverified (carried forward, still true):** which field the customer's screenshots
show; whether `data-lpignore` is honoured by the customer's specific LastPass/browser combination;
PLT-2940's original scope. Newly unverified: whether Darminder's non-repro generalises (only two
browser/env combinations tried, not the customer's).
