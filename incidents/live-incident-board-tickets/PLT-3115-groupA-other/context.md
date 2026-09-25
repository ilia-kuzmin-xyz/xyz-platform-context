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

## 2026-09-14 (scheduled run) — re-fetched fresh; no new comments; assignee changed; PLT-2940's actual scope now recovered

Fetched fresh from Jira (`getJiraIssue`, fields incl. `comment`, `attachment`) and diffed against the
09-11 entry above, per the "notes are a cache" rule.

**No new comments.** Still only two: 111785 (Yash, 09-09) and 111941 (Darminder, 09-10 13:36,
asking for video + browser). Darminder's question has sat **4 days** with no visible reply from
Yash or the customer. Same two screenshot pairs as before (`64222`/`64223` from Yash, `64302`/`64303`
from Darminder's own negative repro) — still unopenable, 403, not retried.

**Assignee changed, correcting the 09-11 entry:** that entry says "still assignee Darminder Atker."
The fresh fetch shows **assignee is now Yash Patel**, and the issue's `updated` timestamp
(2026-09-10T13:54, ~18 minutes after Darminder's comment) is consistent with the reassignment and the
`Open → With Customer` status move happening together right after Darminder asked his question — i.e.
Darminder handed the customer-relay job back to Yash rather than waiting on it himself. This is a
correction to the 09-11 write-up, not a new event since — the change itself may have already been in
effect on 09-11 and simply mis-read then.

**New: PLT-2940 fetched, and its actual fix scope is now recoverable** (the 09-10 entry said this
git commit wasn't recoverable from the shallow clone — it wasn't, but the Jira ticket itself was
never actually fetched until now). PLT-2940 is **Released/Done**, fixed by PR #2095 (comment 109049,
Rishi Bhugobaun), and QA-verified fixed on Staging 26.3.4 by Gennaro Boccia (comment 109369,
2026-08-11). Its own testing steps name exactly two surfaces: **Admin → Devices → device detail**
(Device Name + Device Code) and **Admin → Softwares → version detail**. Verified in code today:
`SoftwarePage.tsx:241-242` carries the same `autoComplete='off'` + `data-lpignore='true'` pair as
`DevicePage.tsx:269-270,283-284` — confirming the Software-page half of the fix is also live and
unchanged. **`DangerZone.tsx` is not mentioned anywhere in PLT-2940** (description, PR comment, or
QA verification) — this answers, as far as Jira records go, one of the three open questions from
09-10: the confirm-delete field was never in PLT-2940's scope, hardened or otherwise. It isn't a
regression there; it was simply never touched.

**Side finding, not verified further, flagged for whoever picks this up next:** PLT-2940 itself
(already Released for a month) picked up two Freshdesk-automation comments on **2026-09-09** — the
same day PLT-3115 was raised — "Waiting on customer" then "Open" on its linked Freshdesk ticket 6822.
That suggests the customer's complaint may have come in as a reopened/continued conversation on the
*original* Freshdesk ticket, with Yash separately opening PLT-3115 as the new Jira record for it. Not
chased further this run (no Freshdesk access from this session) — worth knowing if the two tickets
end up needing to be reconciled.

**Code re-verified, unchanged from 09-10/09-11:** `DevicePage.tsx:257` (`<Form autoComplete='off'>`),
`:258-271` (`deviceName` input: `id`, `name`, `autoComplete='off'`, `data-lpignore='true'`),
`DangerZone.tsx:69-76` (`confirmDeviceNameBeforeDelete`: no `id`, no `autoComplete`, no
`data-lpignore`). No commits touching either file since 09-10 (`git log` on `DevicePage.tsx` /
`DangerZone.tsx` shows nothing newer than the pre-existing state; repo HEAD as of this fetch is
`ed60719d`, 2026-09-09).

**What remains unverified, updated:** which field the customer's screenshots show (still the crux,
still unanswered); whether `data-lpignore` is honoured by the customer's specific LastPass/browser
combination; whether the Freshdesk-6822/PLT-3115 relationship above matters operationally. **No
longer unverified:** PLT-2940's scope — confirmed above as Devices + Software version pages only,
DangerZone was never in it.

## 2026-09-15 (scheduled) — confirmed unchanged, 5 days quiet since Darminder's ask

Live `getJiraIssue` re-fetch (full fields incl. comments/attachments): status still **With
Customer**, assignee now Yash Patel (as recorded 09-14), still **2 comments**, newest still `111941`
(09-10, Darminder asking for a video + browser). Same 4 attachments (`64222`, `64223`, `64302`,
`64303`). No reply from the customer since Darminder's ask. No re-investigation performed.

## 2026-09-16 (scheduled) — confirmed unchanged, 6 days quiet since Darminder's ask

Live `getJiraIssue` re-fetch (full fields incl. comments/attachments): status still **With
Customer**, assignee still Yash Patel, still **2 comments**, newest still `111941` (09-10). Same 4
attachments. No reply from the customer since Darminder's ask. No re-investigation performed.

**Superseded within hours by the entry below** — the customer's reply landed at 11:56 the same day,
after (or not caught by) this run's fetch. Nothing wrong with the 09-16 note at the time it was
written; it is simply stale as of a few hours later. Kept here rather than deleted, per this repo's
"never silently delete a prior run's finding" rule.

## 2026-09-17 (scheduled) — resolved on the customer's side; folder retagged `groupA` → `resolved`

Live `getJiraIssue` re-fetch (full fields incl. comments/attachments) surfaced **one new comment**
that the 09-16 run's fetch did not catch:

> `112316`, Yash Patel, 2026-09-16 11:56 — *"Update from user, 'Hi, I don't see anything attached.
> But, the issue was resolved after updating the browsers. It was happening in Brave and Edge but
> after manually checking for updates and updating them they're working now, and I found Brave even
> had an open support ticket about LastPass for months and only just was resolved, so it must have
> been a Chromium issue for some devices, specifically the LastPass+Chromium combo (NordPass hasn't
> ever had these issues).' we can close the ticket now."*

**This resolves the ticket's central puzzle** without ever answering which of the two fields
(`DevicePage.tsx`'s main form vs. `DangerZone.tsx`'s delete-confirm) the customer meant — it turns
out not to matter. The root cause was outdated Brave/Edge (Chromium) builds mishandling
`autoComplete='off'`/`data-lpignore='true'` for LastPass specifically; NordPass never showed the
symptom on the same page, and updating the browser resolved it client-side. **Hypothesis 2 from
09-10 ("data-lpignore no longer reliably honoured by some browser+extension version combos") is
the one that was right** — not a code regression, not a stale bundle, not the DangerZone field.

**Status unchanged in Jira** — still `With Customer` as of this fetch; Yash's comment says "we can
close the ticket now" but no transition has been made yet. That's the one action left, and it's
Yash's to do (see `recommended-action.md`).

**Still no attachments openable** (`64222`/`64223`/`64302`/`64303`, same session-wide 403) — no
longer load-bearing now the ticket is resolved by other means, so not worth a human's time to
retrieve unless the DangerZone hardening gap (below) is ever revisited.

**One real, low-cost improvement this ticket surfaced and which nothing above depends on:**
`DangerZone.tsx:69-76`'s confirm-delete field still has none of `DevicePage.tsx`'s autofill
hardening (`autoComplete`, `data-lpignore`, explicit `type`). Harmless to leave as is — it was never
the mechanism here — but still a one-file, two-line hardening if anyone wants to close the gap
opportunistically. Not filed as a separate ticket by this run (drafts only, per standing rule).

**Folder retagged `PLT-3115-groupA-other` → `PLT-3115-resolved-other`** this run, per the README's
"rename on group change" rule — root cause is now resolved-elsewhere (customer's own browser), not
something needing further evaluation from us.

## 2026-09-18 (scheduled) — no Jira change since 09-16; but the `resolved` folder tag applied on 09-17 is ahead of the live status

Live `getJiraIssue` re-fetch (fields incl. `comment`, `attachment`, `status`, `assignee`, `priority`,
`created`, `updated`, `resolution`). **Nothing has changed since the 09-17 entry above:** status still
**With Customer**, `resolution = null`, assignee Yash Patel, priority Major,
`updated = 2026-09-16T11:56:21.669+0100`, still **3 comments** — `111785` (Yash, 09-09), `111941`
(Darminder, 09-10), `112316` (Yash, 09-16, the customer's self-resolution + "we can close the ticket
now"). Same 4 attachments (`64222`, `64223`, `64302`, `64303`), unchanged. No transition has been
made in the two days since Yash said the ticket can close.

**Classification review (the point of this run's pass).** The 09-17 run retagged this folder
`groupA-other` → `resolved-other`. That was a reasonable read of the *substance* — the README defines
`resolved` as "fix identified/owned elsewhere … or root-caused to 'as designed' — still trackable but
no longer needs our evaluation", and this ticket's root cause genuinely is owned elsewhere (the
customer's outdated Brave/Edge Chromium builds mishandling LastPass autofill suppression). Nothing is
left for us to evaluate, and that half of the call stands.

**But it is ahead of the live record, and that has a cost.** The README's scope rules key group
membership off Jira status: `Open` / `In Analysis` / `With Customer` → Group A, and the rename rule is
"when a ticket's **status** changes group … rename the folder's group tag on the next run." **This
ticket's status has not changed.** It is still `With Customer` with a null resolution, i.e. still
in-scope by the routine's own definition. Tagging it `resolved` drops it off the in-scope list while
Jira still reports it open, so the one remaining action — the transition Yash himself called for —
loses its daily visibility on this board.

That is not a hypothetical risk: it is precisely the failure mode **PLT-2815** has been demonstrating
for 74 days and 32 consecutive runs (settled in substance since 2026-06-23, Freshdesk closed 07-06,
Jira still `With Customer`, close-out never executed — same assignee, Yash Patel). A ticket that is
"done except for the click" needs *more* visibility than a live one, not less.

**Recommendation (for central execution — this run renamed nothing):** rename
`PLT-3115-resolved-other/` → **`PLT-3115-groupA-other/`** and carry it as Group A with a
one-line "awaiting transition" note, until the Jira status actually leaves `With Customer`. Retag it
`resolved` on the first run after the transition lands. The 09-17 entry above is **not** superseded on
its findings — the mechanism, the customer's own resolution and the "nothing left to investigate"
conclusion are all correct and unchanged; only the folder tag is premature.

**Attachments:** all 4 still unopenable (session-wide 403, not retried). None is load-bearing now the
mechanism is known. **Code:** not re-read this run — nothing in the ticket changed, and the 09-14/09-17
reads of `DevicePage.tsx` and `DangerZone.tsx` still stand. The `DangerZone.tsx:69-76` hardening gap
noted on 09-10 remains open, remains unmotivated by this ticket, and remains a two-line diff for
whoever wants it.

## 2026-09-21 (scheduled) — confirmed unchanged since 09-16; 5 days since Yash said "we can close it now"

Live `getJiraIssue` re-fetch (fields incl. `status`, `assignee`, `priority`, `resolution`, `comment`,
`attachment`, `updated`). **Nothing has changed since the 09-18 entry:** status still **With
Customer**, `resolution = null`, assignee still Yash Patel, priority Major,
`updated = 2026-09-16T11:56:21.669+0100` (unchanged, confirming no activity of any kind since then —
not even a metadata touch). Still exactly **3 comments** — `111785` (Yash, 09-09), `111941`
(Darminder, 09-10), `112316` (Yash, 09-16, the customer's self-resolution report + "we can close the
ticket now"). Same 4 attachments (`64222`, `64223`, `64302`, `64303`), same content, still 403 on
fetch (not retried, per the 2026-09-08 rule — the gap is session credentials, not the object; no
longer load-bearing regardless, since the mechanism is already known from the customer's own words).

**This ticket's folder tag is correct as of this run.** The 09-18 entry recommended keeping/renaming
this folder `groupA-other` (not `resolved-other`) until the live status actually leaves `With
Customer`, per the README's status-keyed grouping rule. It is still `With Customer`, so `groupA` is
still the right tag — no rename needed this run.

**What's new since 09-18 is purely administrative age, not substance.** The one remaining action — the
transition Yash himself called for on 09-16 — is now **5 days old** with zero Jira movement of any
kind in that window (comment count, `updated` timestamp, assignee, resolution: all identical to the
09-18 read). This is the same shape as **PLT-2815** (settled-but-open, same assignee, same missing
one-click close), and the concern raised on 09-18 — that this ticket could become PLT-2815's second
case if nobody actions the close — stands and is now measurably closer to true (5 days in, vs.
PLT-2815's 74). Not yet at a length that calls for anything beyond a routine nudge, but worth
flagging again rather than letting the "no Jira change" framing read as "no action needed."

## 2026-09-22 (scheduled) — confirmed unchanged since 09-16; 6 days since Yash said "we can close it now"

Live `getJiraIssue` re-fetch: status still **With Customer**, assignee still Yash Patel, priority
Major, still **3 comments**, newest still `112316` (09-16). `updated` unchanged. Folder tag
(`groupA`) still correct — status has not left `With Customer`. The close Yash called for on 09-16 is
now **6 days** old with zero Jira movement since. Same shape as PLT-2815 (settled-but-open, same
assignee, missing one-click close), now measurably closer to it (6 days in vs. PLT-2815's 78).

## 2026-09-24 (scheduled) — confirmed unchanged; close Yash called for on 09-16 is now 8 days old

Live `getJiraIssue` re-fetch: status still **With Customer**, `resolution = null`, assignee still
Yash Patel, priority Major, still 3 comments, newest still `112316` (09-16, customer's
self-resolution report + "we can close the ticket now"). `updated` unchanged. Folder tag (`groupA`)
still correct per the README's status-keyed rule. The one remaining action — the transition Yash
himself called for — is now **8 days** old with zero Jira movement, the same settled-but-open shape
as PLT-2815. No re-investigation performed.

## 2026-09-25 (scheduled) — confirmed unchanged; close Yash called for on 09-16 is now 9 days old

Live `getJiraIssue` re-fetch: status still **With Customer**, `resolution = null`, assignee still
Yash Patel, still 3 comments, newest still `112316`. **9 days** since the customer's self-resolution
report and Yash's own "we can close the ticket now." This is the same settled-but-open shape the
run-instructions file names as a recurring failure mode (PLT-2815 sat this way for 74 days across
32 runs before a Freshdesk automation quietly closed it with no human comment). Worth surfacing
before this one follows the same path. No re-investigation performed.
