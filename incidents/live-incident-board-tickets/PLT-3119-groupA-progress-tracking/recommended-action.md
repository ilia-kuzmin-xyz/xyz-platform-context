# PLT-3119 — recommended action (DRAFT ONLY — execute nothing)

**Nothing here has been posted. No Jira or Freshdesk write of any kind was made this pass.**

## Action class: 1 (needs standard fact-gathering, owed by a named person — internally, not the customer)

The board status ("With Customer") and Freshdesk status ("Waiting on customer") both correctly
describe where the ticket sits externally — we are not the ones failing to respond, and 4 days of
customer silence is not yet a chase situation. But the explanation that went out rests on an
unverified premise (context.md §5): nobody has actually read AEX01's `progressWeightingMethod`
against its portfolio siblings, or confirmed when AEX01 joined the portfolio relative to the
weighting-guard's 2026-08-14 ship date. That is exactly the standard-fact-gathering shape class 1
describes, just aimed at Darminder rather than the customer. Not class 2/3 — there is no fix to
build or see in-app yet, because it isn't established there's a bug rather than a legacy data
state. Not class 4 — the question is narrow and answerable by one person, not a product decision.

## Recommended action: one internal question to Darminder, before this is treated as closed

**Not customer-facing.** The customer already has an explanation and is acting on it; re-opening
that conversation now would be premature. This is purely to confirm the explanation is right before
anyone relies on it, per the standing rule about causal claims about systems we don't fully own.

Assumption underlying this draft: that nobody has yet checked AEX01's actual weighting value or
its portfolio-join date — stated as fact in comment 111942 but not shown as measured anywhere in
the thread.

> Before this settles as the answer for AEX01: do you know if it was added to the Portfolio before
> 14 August? If it was, that lines up cleanly, since the weighting-consistency check only stops new
> conflicts and wouldn't have caught one already there. If it joined after that date, something's
> getting past the check and that's worth a separate look. **Do you know when AEX01 was added to
> the portfolio?**

(78 words)

## What not to do

- Don't re-open the thread with the customer yet — they already have an answer and are mid-action
  on it (Freshdesk: waiting on customer). Asking Darminder first avoids a second round-trip if the
  premise turns out to need correcting.
- Don't file this as a duplicate of PLT-2917 or fold it into that ticket — the mechanisms are
  different (context.md §3); at most, cross-reference once PLT-3119's cause is confirmed.
- Don't promote the "calculation logic conflict" into `recurring-defect-patterns.md` Pattern 3 yet
  — the code-side rule is real (context.md §4) but its application to AEX01 specifically is
  unconfirmed (context.md §5, §9). Revisit once Darminder answers.

## Status / assignee

No change recommended. Assignee (Yash) and status (With Customer) both fit the ticket's actual
state.

**Confidence this is the right next step: 7/10.** It closes the one verification gap that matters
before the ticket is treated as understood, costs one message to one named person, and does not
touch the customer-facing side that is currently healthy. Not higher because the PowerBI query
itself (context.md §9.3) remains entirely unverifiable from this session regardless of Darminder's
answer — confirming the weighting mismatch narrows the cause but does not close the ticket outright.
