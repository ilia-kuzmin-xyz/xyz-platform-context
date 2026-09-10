# PLT-3115 — recommended action (2026-09-10, first pass)

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
