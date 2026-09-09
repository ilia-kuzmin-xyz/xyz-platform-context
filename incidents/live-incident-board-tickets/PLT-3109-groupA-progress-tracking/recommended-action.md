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

## 2026-09-08 (later) — reclassified: **class 1**, report-side, no code. Supersedes the draft above.

Ilia opened the screenshots. The customer's own Power Query for `Combined_Percent Complete (2)` has
`WHERE TotalPlannedLaborUnits IS NOT NULL AND <> 0`, dropping 15,595 of 19,598 activities before any
percentage is computed. Full reading in `context.md` (09-08 later). The Darminder draft above is
**withdrawn** — the question it asked (our project's weighting) no longer decides anything; the
dashboard is correct and the fix is in the client's report.

**Action:** post the Yash draft in `context.md` (asks the client to delete the two WHERE lines and
refresh). Ilia has no Power BI access; the one-refresh confirmation is the client's.
**Also worth doing, not blocking:** find out whether that Power Query is an XYZ-supplied template. If
it is, every element-weighted tenant's export has the same defect and the template needs the fix.

---

## 2026-09-09 — **class 1**, and correctly parked. No message today.

The 09-08 action was carried out: Ilia posted the Yash draft at 14:19 (comment `111645`), Yash moved
Freshdesk #7841 to "Waiting on customer" and the Jira ticket to **With Customer**, and reassigned it
to himself. Full detail in `context.md` (09-09 entry).

**Class 1 — stale/unresponded — but not yet stale.** Nothing to build (no platform code change is
warranted; the fix is two lines in the client's own Power Query), nothing needs Ilia's eyes in the
app, and nothing is ambiguous enough for class 4. The ticket is waiting on one named person's single
action: **Paddy Dennison removes the two `WHERE` lines and refreshes.** At ~21 hours of silence that
is normal turnaround, so the class-1 deliverable here is the *dated* chase below, not a message now.

**Do not post anything today.** Yash said "Thanks For help" 21 hours ago; a follow-up now reads as
chasing him rather than the customer.

### Chase, hold until 2026-09-11 (3 working days). To Yash. UNPOSTED. (81 words)

> Hi Yash, any word from Paddy on the Power BI query? He was going to delete the two labour-unit
> lines and refresh. **Has he run that refresh yet?** If he has and the installed figure still
> doesn't match the dashboard, ask him to send the full query text and we'll pick it up from there.
> If he hasn't had time, no rush. Nothing is blocked on our side, and the dashboard's 45% is the
> correct number to use in the meantime.

### Reserve, only if Paddy asks whether deleting the filter is safe. To Yash, for relay. UNPOSTED. (81 words)

The safety sentence was dropped when the 09-08 draft was posted, so this reassurance is **not** on the
ticket. It is the likeliest reason for the customer to stall.

> Removing those two lines is safe. An activity with no labour units already contributes zero weight
> to a labour-based percentage, so the filter never changed the answer for projects that do have
> labour units. It only ever removed rows for projects like yours that count by elements instead.
> **Does the refreshed report now show around 19,600 activities?** If the count is right but a
> percentage still looks off, send the full query text over and we'll look at the next step.

### The one thing worth doing now, and it is not on this ticket — to Darminder, chat not Jira (78 words)

The cohort question from 09-08 is still unasked, and it is the only part of this incident that could
still be preventing a repeat elsewhere. `TotalPlannedLaborUnits` is **our** column name
(`progress-schemas.md:59`), and our own dashboard runs the same `> 0` guard but switches the column by
weighting method (`progress-queries-v2-api.ts:176-179`) — so the client's SQL looks like our shape
with the switch removed. Keep it off PLT-3109 so the customer thread stays clean.

> Separate from Paddy's ticket: his Power BI query drops every activity with no labour units, which
> is why his installed figure collapsed. The column names in it are ours, so the query may have come
> from a template we hand out rather than something he wrote. **Do we supply that Power BI query to
> customers?** If we do, every project weighted by element count has the same problem waiting, and
> the template needs the same two lines removed.

**Assumption, one line:** that the client's query is a copy or descendant of something we authored —
suggested by the shared column names and the identical query shape, not established.

### Closing condition for this ticket

Per the playbook, close on cause + trigger + cohort, not on "looks fine now": cause is established
(hardcoded labour-units filter in the client's report); trigger is that Meta's schedule never carried
labour units, so this was wrong from the first refresh rather than a regression; **cohort is the open
one** — the Darminder question above. One refreshed report from Paddy resolves the customer half.
