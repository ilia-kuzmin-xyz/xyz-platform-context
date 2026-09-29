# PLT-3063 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (b) dev-ready — hand the numbering fix to Darminder with exact pointers, no customer clarification needed

This is not a Group-A "gather context" situation for the numbering half: the mechanism is a
verified, specific frontend bug with an exact fix location (`context.md` §3), not something that
needs the customer or product to weigh in on first. The missing-issues half is already reported
resolved by Yash. Recommend Darminder either take the fix directly (he's already assigned) or hand
it to whoever does FE issue-panel work, rather than looping back to the customer or waiting on the
unopened screenshots.

**Why not (a) resolve via comment to the customer:** nothing here needs the customer — this is our
own bug, in our own numbering logic, on our own dashboard.

**Why not (c) With Technical Support:** there's no missing information from the customer's side; the
question is purely internal (fix it or triage the fix).

### Draft comment (addressed to Darminder Atker) — playbook style, DRAFT ONLY

> Darminder, I traced the numbering half and it's a straightforward frontend bug rather than a sort
> direction issue. The dashboard's Quality issue card renders #index+1 from the item's position in
> the list, in quality-panel issue-item.tsx line 425, instead of the real issue number. The
> dashboard's IssueItem type and its API-to-UI mapper in use-quality-data.ts never carry
> issue.issueNumber through at all, so the real value isn't even available at render time. The
> editor does this correctly already, rendering #issueNumber from the real backend field in its own
> issue-item.tsx line 123. Both surfaces actually sort newest first by the same logic, so I don't
> think there's a separate inverted-sort bug, just this one fabricated number that happens to look
> reversed because the dashboard's #1 lands on the same row where the editor shows its highest real
> number. Fix is to thread issueNumber through the dashboard's issue mapping and swap it in for the
> index-based badge. Want me to raise this as a dev ticket with these file references, or are you
> taking it directly since you're already assigned?

One question, one owner, phrased so it can be answered with a value (raise separately vs. take it
himself). No headings, no bullets, no long dashes in the actual sent message.

### Note for whoever picks this up

The screenshots (Freshdesk + Jira inline, both unopened this run) would only confirm the exact
numbers shown — not required before starting the fix, since the mechanism is already code-confirmed
end-to-end. Worth a quick look before shipping, to sanity-check nothing else is going on.

## 2026-08-20 — unchanged, still unposted (2nd consecutive run)

Nothing on the ticket has moved and nothing in the diagnosis has changed. The dev-ready recommendation and
the draft comment to Darminder above stand **exactly as written** — no edits needed, still not posted.
`issue-item.tsx:425` re-checked on the current checkout this run and still reads `#{index + 1}`, so every
file reference in the draft is safe to send as-is.

The only thing worth noting for the next run: Darminder has now had this ticket for two days without
commenting, while he *did* engage on PLT-3061 in the same window (he posted there on 08-19 evening). So he
is active and this one is simply queued behind the rework-cost ticket, not ignored. If it is still silent
in a few more runs, that changes the recommendation from "hand him the pointers" to "raise the dev ticket
directly and tell him it exists", since the analysis needs nothing from him.

**No Jira action was taken by this run.**
