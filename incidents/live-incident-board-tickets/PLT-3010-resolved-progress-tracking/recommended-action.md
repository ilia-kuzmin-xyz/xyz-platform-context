# PLT-3010 — recommended next step

**Everything below is a DRAFT for a human to review, edit and send. Nothing here has been posted. No write action was taken against Jira in this pass (read-only), and the drafts must not be posted by an agent.**

---

## The one thing to do next

**Ask Rishi for the Baseline % on the AT11x progress tile.**

Rishi is the assignee, he asked for project access at 17:04 on 3 Aug and Yash sent the invite at 17:06, so he is unblocked and has not yet reported an observation. Nobody on our side has opened this dashboard yet.

Why this question and not another. The Planned gap is the larger of the two (1.27 pp against 0.43 pp) and it is the one that flips the SPI from 0.88 to 1.03, which is the part the client will actually escalate on. Our tile's "Planned" is the live programme, and the baseline is a separate series in the same query (`progress-queries-v2-api.ts:129`, `:148`). If Valeria's spreadsheet "Plan" is baseline-derived, our number is *expected* to sit below hers on a job that has slipped, and the larger half of this incident is a label mismatch rather than a defect. One number tells us which world we are in. The same screenshot also shows the weighting method, the filter chips, the XYZ Tracked state and the slider dates, which is the rest of the cheap checks for free.

Answerable with a value, one owner, one question. Per the playbook, that is what gets answered in minutes rather than floating all day.

### Draft message to Rishi (DRAFT — review before sending)

> Hi Rishi, now that you're on AT11x, could you open the Progress panel and tell me what **Baseline %** reads for 3 Aug, with the date range left where it lands by default?
>
> Reason I'm asking: our Planned figure is the live programme, and the baseline is a separate series. If the baseline comes out around 11.4% then Valeria's 11.42% is a baseline number and she's comparing it against our live one, which would explain the bigger half of the gap without anything being broken. If the baseline also reads about 10.15%, the gap is real and I'll take it further.
>
> If you can drop a screenshot of the whole tile in, that covers the rest of what I need in one go: the weighting method, any filter chips, the XYZ Tracked toggle, the slider dates and the "last updated" stamp.

Tone notes for whoever sends it. Keep it as prose, no headings or bullets, that length. State the reason for the question in one sentence, because the playbook's evidence-engine lesson is that answers are only as good as the pointing. Give both outcomes so the answer is useful either way and Rishi does not have to guess what you are hoping for.

---

## Follow-ons — drafted, but hold until the above comes back

Do not send these in the same breath. Two open questions in one thread with no owner each is anti-pattern 7 in the playbook, and the answer above may make some of them redundant.

**1. To Yash, on which XER produced the client's numbers.** Send this one next regardless of Rishi's answer; it is independent and it is the whole of hypothesis H3.

> Yash, quick one on Valeria's 11.42% / 10.05%: was that consolidation built from `EQXAT10-11xRev02-WREphys.xer` or from the `_updated` one?
>
> Asking because if it predates your 2 Aug hours fix, adding the 2,719.75 hours back gives an Actual of about 10.45%, and the dashboard is showing 10.48%. That would mean her Actual and ours already agree and we're comparing two different vintages of the same schedule.

**2. To Yash, on whether Power BI itself shows 11.42 / 10.05**, or whether that pair is only in her spreadsheet. This decides whether the reference is two independent systems or one hand-built Excel file, and the ticket currently assumes the former on the strength of an automated note.

**3. To whoever owns AT11x ingestion, on "why now".** What is the parquet `calculatedOn` for AT11x, and has the project been re-ingested since 2 Aug? Yash states the dashboard refreshed after the fix; that deserves a timestamp rather than an assertion. Give it an owner or it will not get answered, which is how PLT-2884's trigger question died.

**4. Ask Valeria (via Yash) for a package-level split.** Everything on the ticket is a project total. A 1.27 pp rollup gap tells us nothing about its own composition, and the `.xlsx` she has already sent almost certainly contains the breakdown. This is what gives us the broken-vs-working pair the ticket currently lacks.

---

## Needed from a human before this can progress further

- **All five attachments are 403 to this token** (ids 61942-61946, verified this pass). Someone with normal Jira access needs to open them, or re-attach the two PNGs inline. The 37 KB dashboard screenshot is worth more than any further code reading: it settles the weighting method, the filter state, the slider dates and the Baseline % in one look.
- **Nobody has reproduced this in our hands.** That was the single highest-leverage move in the July incident and it is available here for the first time as of yesterday evening.
- **Do not close on "the numbers moved".** Per the playbook, close on cause plus trigger plus cohort. AT10x runs off the same combined schedule and PLT-2884 is the same complaint one building over, so if a grouping or vintage story lands, sweep AT10x rather than waiting for the next ticket.

## One correction worth making in-thread

The escalation note in the 12:25 comment attributes "Weight 45%" and "RW Weight 605,302.46" to our dashboard tile. Those labels do not exist anywhere in the frontend, and Yash's own comment puts total weight on the Power BI card. That note is automated output which its own text records as flagged for rejection at a quality score of 0.45, not colleague analysis. Worth one line in the thread so the next reader does not build on it.
