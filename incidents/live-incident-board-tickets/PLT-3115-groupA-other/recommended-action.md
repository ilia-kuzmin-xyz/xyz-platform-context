# PLT-3115 — recommended action (2026-09-10, first pass)

## 2026-09-15 (scheduled) — unchanged. Still class 1, 5 days quiet since Darminder's ask.

No Jira movement since 09-10 (see `context.md` § 2026-09-15). Ball is with the customer via
Darminder's ask (video + browser); nothing here needs a fresh draft yet.

## Classification: **1, with a class-2 tail** — needs one clarifying fact before any fix, but a
## safe, no-risk hardening exists regardless of the answer

The customer's literal mechanism doesn't match current code on the field that saves (context.md
§ The puzzle). Before anything is fixed, we need to know **which field** they mean. That's class 1
(ask a named person, here the customer via Yash). Separately, hardening `DangerZone`'s confirm
field costs nothing and closes the one real gap this session found, independent of the answer —
that part is class 2 in shape.

## Draft to Yash, for relay to the customer — 89 words, UNPOSTED

> Thanks for flagging this. The main Device Name field already has autofill blocked in current code,
> so we want to make sure we're looking at the right box before changing anything.
>
> **Can you ask them to screenshot exactly which screen it happens on** — is it the main device edit
> form, or does it happen when deleting a device and typing the name to confirm? And which browser
> and LastPass version are they on?
>
> If it's the main form, this may be their LastPass version overriding our autofill-block rather
> than our fix having failed — worth knowing either way.

**Assumption this rests on, one line:** that PLT-2940's fix (main form) is the one still in code
today and hasn't regressed — verified by reading the current file, not by finding the original
PLT-2940 commit (git history for it isn't recoverable in this session, see context.md).

## The safe hardening, described but not applied

`DangerZone.tsx:69-76`'s confirm-delete input has none of the main form's autofill-blocking
attributes. Adding the same three — `autoComplete='off'`, `data-lpignore='true'`, and an explicit
`type='text'` — would cost nothing, risk nothing (it's a client-side-only confirmation field, never
submitted to the server), and would close the one concrete gap this session found regardless of
which field the customer actually means. **Not applied this run** — per this run's instruction to
describe actions rather than perform them. If it's wanted, it's a two-line diff in one file.

## What this session did NOT do

No code was written or pushed. No branch was created. No Jira comment, transition, or assignment.

---

## 2026-09-11 (scheduled) — second pass. Status now With Customer; Darminder already asked for video + browser; one gap in his ask, drafted below

## Classification: unchanged, **1** — stale-unresponded-to-us doesn't apply (only 1 day since
## Darminder's ask), but the ball is with the customer via Yash, and Darminder's own question
## (comment 111941) doesn't cover which screen. The class-2 hardening tail from 09-10 is unchanged
## and still not applied.

Darminder tried an internal repro himself (Edge + Chrome, Cloud + Dev, logged in via LastPass) and
did not see the autofill on the main form — see context.md. He then asked Yash for a video and the
customer's browser. That covers browser and gives us a video, but not explicitly which of the two
device-name inputs (main form vs. delete-confirmation) the customer is looking at, which is still
the open question from the 09-10 pass. Nothing here needs sending today — Darminder's comment is
one day old and this is not yet a stale-unresponded case — but the addition below closes his one
gap, ready if/when the thread continues.

**Assumption this rests on, one line:** that Darminder's existing ask (111941) will surface the
screen either way if the customer sends a full video; this draft only removes the chance that a
short clip or a text reply leaves it ambiguous.

## Draft addition to Yash's/Darminder's thread — 86 words, UNPOSTED

> One more thing worth asking alongside the video: when it happens, is it the main Device Name
> field on the edit screen, or the box you type the device name into when deleting a device? They
> look similar but only one of them saves anything, and we've hardened that one already. **Can you
> get them to say which screen it is, or point it out in the video?** That's the detail we're
> missing to know whether this is a different field or LastPass overriding our block.

## What this pass did NOT do

No Jira comment, transition, or assignment. No code changed. The `DangerZone.tsx` hardening
described on 09-10 is still not applied, and still costs nothing whenever it's wanted.

---

## 2026-09-14 (scheduled) — third pass. Still class 1; 4 days quiet since Darminder's ask; now assigned to Yash

## Classification: unchanged, **1** — the open question (which field?) is still unanswered and still
## the blocker; nobody here owes new work, but Darminder's ask has now sat 4 days with no visible
## reply, and the ticket is assigned to Yash, so a nudge is due. Class-2 tail (DangerZone hardening)
## unchanged, still not applied.

No new Jira activity since Darminder's 09-10 comment. Assignee is now Yash Patel (was Darminder as of
the 09-11 note here — see context.md for the correction). PLT-2940 was fetched this pass and confirms
its fix never touched the delete-confirmation field, which narrows the puzzle slightly but doesn't
answer it. Given the ticket sits with Yash and the customer for 4 days now, this is worth one short
nudge rather than a fresh draft — Darminder already asked the right question.

**Assumption this rests on, one line:** that no reply exists outside Jira (e.g. a direct Freshdesk
or email thread) — this session can only see the Jira record.

## Draft nudge to Yash — 75 words, UNPOSTED

> No reply from the customer yet on Darminder's ask for a video and browser info, and it's been a
> few days. Before this can move, we still need to know exactly which screen shows the autofill:
> the main Device Name field, or the box you type the name into when deleting a device. Only one of
> those is actually hardened against LastPass today. **Have you had a chance to chase the customer
> for that video?**

## What this pass did NOT do

No Jira comment, transition, or assignment. No code changed. The `DangerZone.tsx` hardening is still
available and still not applied.

---

## 2026-09-17 (scheduled) — resolved on the customer's side; no draft needed, one Jira transition left for a human

## Classification: **closed out** — the customer independently resolved it (outdated Brave/Edge build
## mishandling LastPass autofill blocking; fixed by their own browser update) and Yash's comment
## already says "we can close the ticket now." Nothing left for us to investigate or draft.

See `context.md` § 2026-09-17 for the comment and mechanism. The only outstanding action is a Jira
status transition (e.g. to Done/Closed, whatever this board's "closed" state is) — that's Yash's own
statement of intent, not a drafted suggestion from this routine, so there is no message to hand over.
**A human should just perform the transition Yash already called for.** No comment needs drafting;
posting one now would be noise on a ticket the customer and Yash have already settled between them.

The `DangerZone.tsx` hardening described on 2026-09-10 (`autoComplete='off'`, `data-lpignore='true'`,
explicit `type='text'`) is still a safe, zero-risk two-line diff if anyone wants it, but it is no
longer motivated by this ticket — the actual mechanism was the customer's outdated browser, not this
field. Leaving it undone.

## What this pass did NOT do

No Jira comment, transition, or assignment. No code changed.

---

## 2026-09-18 (scheduled) — no Jira change since 09-16. Reclassification recommended, and one short nudge now has a reason to exist.

**Action class: 1 — stale/unresponded, on us.** Not 2, 3 or 4: there is nothing to build, nothing to
reproduce in the app, and nobody disagrees about anything. The mechanism was settled by the customer
themselves on 09-16 (outdated Brave/Edge Chromium mishandling LastPass autofill suppression — see
`context.md` § 2026-09-17). **Who owes what: Yash Patel owes one board action** — the transition he
himself called for. Two days old, so not yet urgent; flagged now because of the precedent next door.

**This partly supersedes the 09-17 note above.** That note concluded "no draft needed, one Jira
transition left for a human," and its *findings* stand in full. What it got wrong is the implicit
assumption that an unexecuted transition will simply happen. On this board it demonstrably does not:
PLT-2815 has sat settled-but-open for **74 days across 32 consecutive runs** recommending exactly such
a transition, with the same assignee. So a short nudge is worth having ready here rather than waiting
for this ticket to become the second 70-day orphan.

**Folder tag:** recommend renaming `PLT-3115-resolved-other/` → `PLT-3115-groupA-other/` until the
Jira status actually leaves `With Customer` (reasoning in `context.md` § 2026-09-18). Not renamed by
this run — renames are executed centrally.

### Draft nudge to Yash Patel — 59 words, UNPOSTED

> Hi Yash, the customer's update on PLT-3115 says the autofill stopped after they updated their
> browsers, and you noted we can close it. The ticket is still sitting in With Customer with no
> resolution set. Nothing is outstanding on our side, and Darminder's question has been answered by
> the customer's own findings. **Can you close it with a resolution?**

If PLT-2815's chase (see that folder) is sent in the same pass, these two can be raised together —
both are assigned to Yash and both need the same one-click close with a resolution set. Do not send a
merged message that buries either ticket key.

## What this pass did NOT do

No Jira comment, transition, or assignment. No code changed. No folder renamed. The `DangerZone.tsx`
hardening remains undone and still unmotivated by this ticket.

---

## 2026-09-21 (scheduled) — unchanged since 09-18. Still class 1; nudge now 5 days overdue, not yet urgent

**Action class: 1 — stale/unresponded, administrative-only.** Same reasoning as 09-18: nothing to
build, nothing to reproduce, nobody disagrees on the mechanism. **Who owes what: Yash Patel owes one
board action** — the transition he called for himself on 09-16 (comment `112316`). Confirmed via live
`getJiraIssue` this run: status still `With Customer`, `resolution = null`, `updated` timestamp
unchanged since 09-16, still 3 comments, same 4 attachments. See `context.md` § 2026-09-21.

**Folder tag: no change.** Still correctly `PLT-3115-groupA-other` per the 09-18 correction — status
has not left `With Customer`, so it stays Group A until it does.

The 09-18 nudge draft is unsent and still accurate; reusing it rather than drafting a new one (per
the "don't re-draft an unchanged ask" spirit — the ask itself hasn't changed, only its age):

### Draft nudge to Yash Patel — 59 words, UNPOSTED (unchanged from 09-18)

> Hi Yash, the customer's update on PLT-3115 says the autofill stopped after they updated their
> browsers, and you noted we can close it. The ticket is still sitting in With Customer with no
> resolution set. Nothing is outstanding on our side, and Darminder's question has been answered by
> the customer's own findings. **Can you close it with a resolution?**

If PLT-2815's chase (see that folder) is sent in the same pass, these two can be raised together —
both are assigned to Yash and both need the same one-click close with a resolution set. Do not send a
merged message that buries either ticket key.

## What this pass did NOT do

No Jira comment, transition, or assignment. No code changed. No folder renamed. The `DangerZone.tsx`
hardening remains undone and still unmotivated by this ticket.

---

## 2026-09-22 (scheduled) — unchanged, 6 days since Yash's own close call. Same draft stands.

Live re-fetch confirms zero movement. Draft nudge above (59 words) unchanged and unsent. Raise
alongside PLT-2815's chase if a human is doing a pass on Yash's outstanding one-click closes — both
tickets are now in the same shape. **No Jira action was taken by this run.**
