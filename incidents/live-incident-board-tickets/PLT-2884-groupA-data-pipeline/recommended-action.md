# PLT-2884 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (c) nudge — status check via Yash, 8 days stale

Root cause is already identified and uncontested (bad source XER; product/Mostafa's call,
`context.md`). Nothing for engineering to do unless the customer disputes it after re-upload. The
one open item is confirming whether the customer re-uploaded — this has had no update since
2026-07-13.

## Why this and not the others

- **Not (b) Ready For Development.** There is no platform bug to fix; the defect is in the
  customer's exported schedule file.
- **Not staying silently With Customer indefinitely.** 8 days without a check-in risks the ticket
  going stale on the incident board for no reason — a one-line nudge either closes it or surfaces
  a real remaining problem.
- **Not (d) Blocked.** Not blocked — just needs a poke.

## Draft — nudge (author: Yash, to the customer; cc Ilia)

> Following up on PLT-2884 / EQX-AT10x — checking in on the corrected XER re-upload we discussed
> on 07-10. Have you had a chance to re-export and re-upload the schedule? Once that's in, we can
> confirm the 27.37% vs 23.85% variance closes — let us know if you hit anything else after the
> re-upload.

## Follow-through the human should own (not executed here)

- If the customer confirms re-upload and the variance is gone → close.
- If re-upload happened but variance persists → re-open the code investigation (check the new XER
  against `dashboard/data-pipeline.md`'s activity_progress pipeline for a genuine platform-side
  gap, since the "source data was bad" explanation would then be ruled out).
- If no response in another cycle → this is a candidate for the same "nudge → accept/close"
  pattern already used on PLT-2815.
