# PLT-3156 — recommended action (2026-09-22, first pass)

## Classification: **1 — stale-in-waiting, but correctly parked.** Nothing to draft; the right question is already asked.

**Why this is not class 2/3/4.** Rishi's first reply (`112648`) already gave the customer a correct,
code-verified diagnosis and an actionable fix (re-export without the DRAFT project) within eight
minutes of the report. This session's own code trace (`context.md` § Code trace) independently
confirms his mechanism is right and that there is no cheaper fix available — no partial-branch delete
exists anywhere in either repo, so "re-export without DRAFT" is not a stopgap, it is the only
available fix. There is no code for us to write, no visual debugging outstanding, and no product
ambiguity: this is a customer data-quality issue (their XER export contains an extra project), not a
platform defect.

**Status is correctly `With Customer`.** Unlike PLT-3147 (where the same status masked an unanswered
question owed by us), here the only live thread is genuinely the customer's: whether they re-export
and re-upload without the DRAFT project.

## The one loose thread worth a human's attention — not urgent, not blocking

Rishi asked Pietro and Mostafa (`112648`) whether they know an existing resolution from the "Meta"
precedent Yash mentioned in the original report. **Unanswered as of this session.** Per
`context.md` § Domain cross-reference, this is likely a mix-up: the mechanism here (an orphan WBS
root from a second project in one XER file) most closely matches **PLT-3033** (B11, same "DRAFT"-name
pattern, reached Done 2026-09-21 via the same "re-upload" fix), not any Meta ticket on this board —
the Meta tickets found (e.g. PLT-3109) are a client-side Power BI query issue, unrelated. Worth one
line to Rishi so the "Meta" framing doesn't get repeated as fact:

### Optional note to Rishi — DRAFT ONLY, not posted (52 words)

> Rishi, re your question to Pietro/Mostafa — the closest precedent on this board isn't a Meta ticket,
> it's PLT-3033 (B11, same "DRAFT" naming, same "re-upload the correct schedule" fix, closed
> yesterday). Your diagnosis already matches that shape. Not blocking anything — just flagging so the
> Meta comparison doesn't stick if it's not actually the same mechanism.

## Nothing else to do right now

No chase is warranted — the ticket is one day old, Rishi answered same-day, and Freshdesk is
correctly `Waiting on customer`. Re-open only if the customer reports the re-export didn't fix it,
which would mean either the DRAFT branch isn't the only orphan root or something else is producing
"2 paths."

## What this session did NOT do

No Jira action of any kind — no comment, no transition, no assignment. Read-only calls only
(`getJiraIssue`, `searchJiraIssuesUsingJql`) plus a sub-agent's read-only source-code research in both
local repo checkouts. No code was written, nothing was built or run, no git operation was performed by
the sub-agent.
