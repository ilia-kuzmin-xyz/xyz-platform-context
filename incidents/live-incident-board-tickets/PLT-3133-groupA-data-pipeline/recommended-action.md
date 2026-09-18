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

## 2026-09-18 — SUPERSEDES the 09-17 draft. The blocker is no longer the backend cadence; it is one value already on the customer's screen.

The 09-17 pass classified this **1** (backend team owes us the parquet regeneration cadence) and
drafted a question to Darminder asking him to chase that number. **That draft should not be sent as
the next move.** It is not wrong — the cadence is still unknown and still worth having — but it is no
longer the cheapest or the most decisive step, because two things changed:

1. The customer supplied a concrete example on 09-17 (comment `112387`, four screenshots) and the
   Freshdesk ticket moved to **Waiting on 3rd line** — the ball is explicitly ours, not theirs.
2. This pass found that the capping timestamp is **rendered in the UI** as the progress panel's
   `Last updated` (`progress-panel.tsx:277-288`, formatter at `:17`). See `context.md` § 2026-09-18.
   That turns an unanswerable "how often does the backend job run" into a yes/no a human can read off
   the screen in ten seconds.

## Classification: **3** — resolvable in-session, but needs a human's visual check in the app first

Everything mechanical is understood and verified in code. What is missing is one observation that
only someone with the app (or the unopenable screenshots) can make: on ATL07, is the progress
panel's `Last updated` older or newer than the moment those elements were marked installed?

- **Older** → the documented cap, working as designed. The ticket becomes a cadence/expectation
  conversation, and the 09-17 draft below becomes the right next message after all.
- **Newer** → the cap is *not* the explanation, this is a real defect, and the next place to look is
  whether the backend's delta endpoint returns those rows for the requested window
  (`element-api-service.ts:77-90`).

Do not skip to either conclusion. The whole value of this pass is that the question is now cheap.

### Draft to Darminder — 94 words, UNPOSTED

> The delay is real and we know why. Element colouring on a fresh dashboard load only merges edits
> made before the last progress recalculation, so anything saved after that stays hidden until the
> next one runs. Intangible percentages have no live update at all — they only move when the backend
> rebuilds the snapshot. The progress panel already shows that cutoff as its "Last updated" time.
> **Can you check on ATL07 whether "Last updated" is older than when the customer marked those
> elements installed?** If it is, this is the cadence, not a stuck dashboard.

**Assumption this rests on, one line:** that the `Last updated` string the customer sees is the same
`calculatedOn` that caps the merge — traced through `use-progress-panel-data.tsx:23,363` to
`dashboard-progress-service.ts:744`/`:674`, which share one source, so this is read from code rather
than inferred.

### Second step, only if the check comes back "older"

The 09-17 draft (ask the backend team for the progress-outputs regeneration cadence) is then the
right follow-up, unchanged and still unposted — reproduced by reference above, not rewritten. Its
customer-facing counterpart ("element status can take up to one recalculation cycle to appear on a
fresh dashboard open; intangible % follows the same cycle; there is no self-service refresh
trigger") still deliberately waits on a real number rather than guessing one.

### Worth saying out loud to whoever owns the reply

Darminder's ask for a **video** (09-16) will not distinguish the two branches above on its own, for
the reason given in the 09-17 entry — a fresh-dashboard gap after an edit looks identical whether the
system is healthy or stuck. A screenshot of the progress panel with `Last updated` legible is worth
more than the video, and the customer may have already sent one (attachment `64826`, unopenable here).

### Also note for the reply, not for the draft

The customer is editing through **Atom** as well as the Web Viewer. Atom edits have no open browser
session to write into, so the "it appears immediately in the editor" reassurance never applied to
them at all — do not repeat that reassurance unqualified. Detail in `context.md` § 2026-09-18.

### What this pass did NOT do

No code changed, no Jira comment, transition or assignment, no attachment content fetched (the 403
is a known session gap, not re-tested). Nothing run or built.
