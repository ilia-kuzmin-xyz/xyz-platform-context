# PLT-3133 — recommended action (2026-09-17, first pass)

## Classification: **1** — one specific fact is missing, and it's owed by a named team, not the
## customer. Darminder's video ask can stay open in parallel; it isn't actually required to answer
## the customer's real question ("is this normal, and can I force a refresh").

The mechanism is now understood well enough (`context.md`) to tell the customer plainly that this is
expected-but-unbounded behaviour, not an outage — with one number missing: how often the backend
actually regenerates the progress-outputs parquet. Darminder's existing ask for a video from the
customer is a reasonable belt-and-suspenders check, but per `context.md` it won't distinguish
"working as designed" from "broken," since a fresh-dashboard-open-after-an-edit gap is expected
either way right now. The missing piece is internal, not external.

## Draft to Darminder — 84 words, UNPOSTED

> Found the mechanism. Element status does refresh live, but it's capped at the last progress
> recalculation time, so a same-day edit can be missed until that runs again. Intangible % has no
> live refresh at all — it only updates when the backend regenerates its snapshot file, and I can't
> find that job's schedule anywhere in our code. So the delay is real, not a bug, but we don't know
> the actual cadence. **Can you ask the backend team how often that regeneration job runs?** That
> number is what actually answers the customer.

**Assumption this rests on, one line:** that the regeneration job for the progress-outputs parquet
lives outside `XYZPlatformApi` and `hc-frontend` — confirmed absent from both repos accessible to
this session, not confirmed to exist elsewhere, though it must (the files are clearly regenerated
on *some* cadence).

## Separate, optional: what could go back to the customer once the cadence is known

Not drafted yet — deliberately, since it depends on the answer above. Once we have a real number,
a short reply along the lines of "element status updates can take up to the length of one progress
recalculation cycle to show on a fresh dashboard open; intangible % follows the same cycle; there is
currently no self-service refresh trigger" would close the loop. Holding this until the cadence is
known rather than guessing a number now.

## What this pass did NOT do

No code changed, no Jira comment, transition, or assignment. Did not contact backend team directly
(no channel access from this session) — the ask above is the draft for Darminder to send.
