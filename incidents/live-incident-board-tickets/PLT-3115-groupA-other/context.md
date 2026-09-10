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
