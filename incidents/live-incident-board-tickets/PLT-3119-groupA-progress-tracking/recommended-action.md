# PLT-3119 — recommended action (2026-09-10, first pass)

## Classification: **class 4** (ambiguous, needs a decision) — leaning class 1 once one fact lands

Not class 2/3: nothing to build, nothing needs Ilia's eyes in the app. The internal thread already
produced a one-line conclusion ("can't have both types of calculation logic in the same portfolio")
but never traced it to a mechanism that actually removes a project from a list — this repo's own
guard (`portfolio-weighting-guard.ts`) only warns/blocks Save, it doesn't filter any dashboard's
project array (`context.md` §3). So the real question — is "Project List" weighting-aware at all, and
on which system — is still open, and it's a question for whoever owns that surface (Darminder/Mostafa
already in the thread), not something this session can settle without prod/PowerBI access.

## What is blocking, precisely

Two facts would close this in one message each, and neither has been stated:
1. Whether "Project List" and "Milestone Performance" are the same system (native
   `PortfolioDashboardPage` or the PowerBI-linked legacy report) — `context.md` §3 shows they
   *cannot* both be the native page given how that page is built.
2. AEX01's actual progress-weighting value versus the rest of APLD's portfolio members, side by side
   — asserted as a mismatch, never shown.

## Draft to Darminder — internal, UNPOSTED (96 words)

> Hi Darminder, one thing doesn't add up before this goes back to the customer: on our own portfolio
> dashboard, Milestone Performance and the Projects widget read the exact same project data, so
> nothing can appear in one but not the other there. That suggests the customer's Project List is the
> separate PowerBI view, not ours. **Can you confirm whether Project List and Milestone Performance
> are the same system, and what AEX01's progress calculation setting is versus the rest of APLD's
> projects?** That tells us if this is a real gap or just a setting to align.

**Assumption this rests on, one line:** that Yash's "Milestone Performance" / "Project List" naming
maps onto this repo's native widgets rather than being his own loose description of two PowerBI report
pages — plausible from the exact title match on "Milestone Performance", not confirmed.

## Also worth doing, not blocking — open attachment `64304` first

It's a 14KB screenshot (much smaller than the other three, `context.md` §6) — likely a tight crop of
the "Progress calculation logic" field or its conflict badge. If it already shows AEX01's weighting
next to a portfolio-mismatch message, half the question above is answered for free and the draft can
drop to just the "which system" half.

## Why not a customer-facing message yet

Freshdesk #7907 is already "Waiting on customer" (comment `111943`, 13:48) — the ball is parked there,
not on us, and it moved same-day as the internal explanation. Sending anything to the customer now
would either repeat what Yash may already have relayed, or hand them an unconfirmed mechanism. The
internal question above is what turns "plausible" into "confirmed" before anyone commits to a customer
answer.

## Closing condition

Per the playbook: cause (portfolio weighting inconsistency) is *asserted*, not yet *shown*; trigger is
presumably "AEX01 was added/enabled with a different weighting than its portfolio peers", unconfirmed;
cohort (does this hit every mixed-weighting portfolio on whichever system renders Project List, or is
it AEX01-specific) is entirely open. Do not close or downgrade this to `resolved` until at least the
"which system" question is answered — right now the explanation on the ticket is a plausible verbal
conclusion, not a traced one.
