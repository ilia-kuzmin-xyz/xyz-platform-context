# PLT-3290 — recommended action (DRAFT ONLY, nothing posted) — 2026-10-16

**Action class: 1.** New, no dev reply, one named person (Yash) can read the one setting that decides the first fork. Stay **Open** (Darminder). Not Ready for Dev
(no mechanism, and the likeliest cause is a setting), not With Technical Support (we have not yet asked the customer anything we could not read ourselves), not Blocked.

**Assumption, one line:** that ML5.4 is on the default weighting. Not seen; the settings are not readable from here.

## Draft: reply on the ticket (author Ilia; @ Yash) (52 words)

> Yash, quick check on ML5.4 before anyone digs in. Open Project settings and tell me how progress weighting is set. If it is Budgeted labour units and the schedule has no labour units, the dashboard shows nothing, and switching to Model element count brings it back. **What is the weighting on ML5.4?**

## Next step by outcome (not for the message)

- **Budgeted labour units:** switch to Model element count in project settings, confirm numbers return, tell the customer why (Pattern 3, no code change). Done.
- **Already Model element count:** next question is to Sachin or Ali (api-v2), one value: *does a progress output exist for ML5.4, and when was it last generated?* If none, the run has not
  happened or is failing (check DPL-1707 first, then the schedule's date range).
- Ask Yash for the screenshot into the folder (blank panel vs 0.00% is the cheapest fork).
- Do not tell the customer anything about a cause until one of those two answers is in.

---

## 2026-10-20 — SUPERSEDES the 2026-10-16 draft above. Do not post the weighting question.

Ilia has answered in the ticket (`115957`): actual-progress parquet missing for ML5.4, only the planned one exists (14 Oct), and he asked Ali. Nothing to post today. Action class 1, **Ali owes** since 10-19 17:27;
chase on 10-21 if silent (one line, same question, no new content). The DPL-1707 follow-up is drafted in context.md and is for after Ali's first answer. Yash's "move to PAPI?" is Ali's to answer; if Ali says yes, the ticket
needs a PAPI ticket carrying the project id and the 14 Oct date, written by Ilia or Yash.
