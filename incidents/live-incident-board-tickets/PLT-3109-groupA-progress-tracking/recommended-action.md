# PLT-3109 — recommended action (2026-09-08, first pass)

## Classification: **class 4 leaning class 1** — one five-minute check away from either closing itself
or turning into a genuine cross-team (dashboard-setting vs export-feed) question

Not class 2/3: there is nothing to build yet, and nothing needs Ilia's eyes in the app. The whole
ticket plausibly turns on one fact — the project's live Progress Weighting setting — that nobody has
looked up. Get that fact first; only escalate to product (class 4, "is the export feed
weighting-aware at all?") if it comes back the way that does *not* explain the symptom.

## What is blocking, precisely

The customer's own words ("element based percentages ... schedule does not have proper labour units
included") already name the likely mechanism — see `context.md` §4, matching the confirmed PLT-3010
resolution. Nobody has confirmed **which weighting META-LVN-BLD1&2 is actually set to**, which is the
one fact that turns "likely" into "confirmed, no code needed" or "confirmed, this is a real gap."

## Draft to Darminder — 80 words, UNPOSTED (the hard no-Jira-action rule stands; a human pastes it)

> Hi Darminder — this looks like PLT-3010 again: dashboard on element weighting, Power BI's export
> computing on labour hours, and Paddy's own words ("schedule does not have proper labour units")
> point straight at it. That basis mismatch alone would explain both the 46%→0.3% gap and it
> affecting thousands of activities at once.
>
> **Can you confirm what Progress Weighting META-LVN-BLD1&2 is currently set to?** If it's labour
> hours, that's the answer and no code fix is needed — same resolution as PLT-3010.

**Assumption this rests on, one line:** that the customer's Power BI "Combined_Percent Complete"
table is computing on a labour-hours basis at all — unverified (see `context.md` §4), but it is the
only reading consistent with both "46% Planned unaffected" (a planned-vs-actual asymmetry, which a
straight data-corruption theory would not produce) and the 15,000-activity scale.

## Then what

- **If LVN is on element weighting already** (i.e. the dashboard side is correctly configured and the
  gap is still there): the mismatch is entirely inside the customer's Power BI model or whatever feed
  it reads, which is outside this ticket's code — say so plainly, and this becomes class 4 (a product
  conversation about whether our export should carry both bases, not a bug to fix).
- **If LVN is on labour-hours weighting**: this closes the same way PLT-3010 did — a one-comment
  explanation to Yash for the customer, a suggested settings change if they want the dashboard and
  their own report to agree, no code change, no dev queue.

## Also worth 30 seconds, not blocking

Open the 5 real PNG attachments (see `context.md` §6) before sending the draft above — if one of them
already shows the Project Settings → General tab weighting value, the question above can be answered
in the same message instead of asked.
