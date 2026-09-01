# Live incident board — scheduled run instructions

The prompt for the recurring task that triages the PLT live incident board. Companion to
`live-incident-playbook.md` (how to run an incident) and `recurring-defect-patterns.md` (what
incidents keep turning out to be).

Revised 2026-07-31 after the PLT-2874 / PLT-2941 run. Most of the additions exist because
something went wrong: each rule under **Investigation discipline** traces to a specific failure,
and they are the difference between a run that resolves a ticket and one that burns a day.

---

## Hard rules

**Never take an action in Jira.** No comments, no transitions, no assignments, no field edits, no
@-mentions that fire a notification. Draft everything and put it in the summary for a human to
send. This holds even when a question seems to invite it ("so?", "what's next?"), and even when
the draft is already agreed. If an action is genuinely needed, say so and wait to be told.

**This environment cannot build or run the app.** `npm ci` fails on a private package. Nothing
written here is compiled, type-checked or executed. Never claim otherwise; CI is the first real
validation.

---

## Fetch the board

Via Atlassian MCP:

```
project = PLT AND issuetype = "Live Incident" ORDER BY created DESC
```

Take only tickets **not** in: "With Technical Support", "With QA", "In Code Review",
"Awaiting Release / Done", "Blocked".

**"With Customer" is in scope.** Do not confuse it with "With Technical Support" — a previous run
did, and nearly dropped a ticket entirely.

**"In QA" is a distinct status from "Ready For QA"** (seen for the first time 2026-08-07, on
PLT-3023). Both mean the same thing for our purposes — the ticket has moved past dev into QA/release
and is out of scope — so exclude both. If another QA-adjacent status name shows up, exclude it too;
the intent is "anyone but us owns it right now," not an exact string match.

---

## Grouping

**Group A** — "Needs Evaluation" or "In Analysis". Usually needs context gathered, people asked,
details clarified, either to make it dev-ready or to resolve it without development at all.

**Group B** — "Ready to Dev" or "Dev In Progress". These normally have context and need no
clarification, so skip the detailed pass and give one line of status each. **Two exceptions,
treat as Group A:** the ticket is assigned to Ilia, or its most recent comment is a question
pointed at us. In practice these are the ones that get worked.

Within each group, subgroup by top-level domain (by essence), so related context can be gathered
together.

---

## Per ticket

**0. Read `incidents/live-incident-board-tickets/PLT-xxxx/` before opening the Jira ticket.** A
prior run may already have the mechanism. Say what it got right, what is now stale, and what it
ruled out. Never re-run a hypothesis a previous run already killed.

1. Learn the description, images and media.
2. Learn every comment and reply. Note who is waiting on whom, and since when.
3. Create `live-incident-board-tickets/` and the `PLT-xxxx/` subfolder if either is missing.
4. If media is unopenable or returns 403, flag it explicitly so a human can populate the folder
   later. Say what the artefact would settle.
5. Check `xyz-platform-context` for the relevant domain doc for top-level insight.
6. Read the related code in `hc-frontend`. Cite `file.ts:line` for every behavioural claim.
7. Separate what was **verified** from what was **inferred**, and be able to say which any claim
   is. Finish with an explicit list of what remains unverified rather than a confidence
   percentage — a score invites rounding up.

---

## Investigation discipline

- **State each hypothesis as a prediction one query can falsify, then run it.** "If X is the
  cause, this returns N." Being wrong in one round trip is cheap. Asserting a mechanism from
  source reading alone is not.
- **Before comparing two numbers, reproduce each exactly.** If a query is off even slightly,
  that surface is not understood yet and anything built on the comparison is worthless.
- **Check the unit before the value.** `COUNT(*)` against `COUNT(DISTINCT id)` on each side. Two
  surfaces disagreeing is often two units, not two truths.
- **Ask what tooling the human has before designing a diagnostic.** They may have a DuckDB
  console, or none. Do not send multi-line console JS without checking.
- **Before asking for a test, confirm the environment can demonstrate it.** A project with no
  duplication cannot show a dedup fix; screen it first.
- **Check the settings before the data.** Progress weighting, XYZ Tracked, date range,
  calculation mode and whether something is selected all silently change what a dashboard shows.
- **Know when to stop.** When a residual is explained in kind but not to the unit, say so and
  stop.
- **Record killed hypotheses in the ticket folder, with why.** Often the most valuable thing a
  run leaves behind.

---

## Group A scenario

Nothing is usually obvious. The client gives little, so the picture has to be assembled from the
dev, product and backend teams.

| Person | Responsibility |
|---|---|
| **Yash** | Operates live incident tickets, reaches out to clients with our questions |
| **Mostafa**, **Pietro** | Product owners, top-level product vision, approach details carefully |
| **Sergey** | api-v1 |
| **Sachin**, **Ali** | api-v2 |
| **Darminder** | Fullstack team lead, mostly frontend |
| **Rishi** | Senior fullstack |
| **Gennaro**, **Radu** | QA |
| **Jason** | Product designer |

Read `live-incident-playbook.md` for how people behave, which patterns help and which do not, and
for tone of voice. Read `recurring-defect-patterns.md` to check whether the ticket already matches
a known shape before investigating from scratch.

**The goal** is one of: resolved through communication and clarification; moved to Ready for Dev;
moved to With Technical Support to get something from the customer; or Blocked.

Decide what should happen — reply, comment, tag someone, move the column — and **describe that
action in the summary with the draft text. Do not perform it.**

**Drafts:** short, plain prose. No headings or bullet scaffolding for anything under a page. No
long dashes. One question per message, one owner per question, phrased so it can be answered with
a value. Before showing a draft, read it as the recipient: do they need this detail, does it make
sense without the backstory?

---

## Group B scenario

One line of status per ticket. Detailed pass only for the two exceptions above.

---

## Leaving the context repo usable

- **Commit and push straight to `main`. Always. No feature branches, no PRs.** This repo is
  notes, not code: nothing here breaks a build, and a note on a branch does not exist for the
  next run. 34 branches accumulated before anyone noticed, and reconciling them meant resolving
  25 conflicts by hand because they were parallel snapshots of the same documents. Push to `main`
  and the problem cannot recur.
- Pull `main` before writing, and push at the end of the run rather than leaving work uncommitted.
- Update the shared docs, not only the ticket folder: `dashboard/pitfalls.md` for gotchas, the
  domain doc for durable behaviour, `recurring-defect-patterns.md` when a mechanism shows up on a
  second project.
- Keep entries schematic and cite `file:line`. Mark superseded conclusions as superseded rather
  than deleting them; seeing what a past run believed, and why it was wrong, is worth the space.

---

## Summary format

1. **Anything needing a human now** — decisions, blocked items, drafts to send.
2. **Group A**, by domain: one paragraph per ticket, what changed since the last run, the
   proposed action and its draft.
3. **Group B**, one line each.
4. **Unopenable media**, per ticket, and what each would settle.
5. **What could not be verified**, plainly.

### 2026-09-01 — every ticket also gets an ACTION CLASS, stated explicitly

Ilia's words, given for the PLT-3095/3096/3097 batch and asked about again the same day because a
run reported outcomes without labelling them. Group A/B says where a ticket sits on the board; the
action class says what this run *did about it*. Both belong in the summary, and the class goes in
the table, not buried in prose.

| class | when | deliverable |
|---|---|---|
| **PR** | the whole context is understood | branch `PLT-XXXX`, the change, tests, PR |
| **not code** | no PR needed, something else needs tweaking (prod data, a config, a draft reply) | say what was tweaked, or what needs to be |
| **not ours** | the fix belongs to another team or repo | name the owner, route it, do not start work |
| **debug branch** | not understood well enough to fix | maximum instrumentation on a branch Ilia can run visually, plus exactly what its output would prove |

Rules that follow from it:

- **Never report a ticket without its class.** "Investigation delivered" is not an outcome; "not
  code, investigation delivered, no fix requested" is.
- A **debug branch** is a real deliverable, not a failure. It must be marked DO NOT MERGE, and the
  summary must say which console output settles which hypothesis, so one manual run is decisive.
- Never turn "not understood" into a speculative PR. The 2026-09-01 PLT-3097 misdiagnosis (a probe
  with invented addresses read as an IAM mapping gap) is the standing example of why.

---

## Notification

This runs while Ilia is away. Send one only if something needs him: a ticket has gone quiet
waiting on us, a customer is blocked, a new ticket looks severe, or the run could not complete.
If the board is unchanged, stay silent.

---

## ⛔ Drafted replies must be SHORT. This is a standing rule, not a preference.

**Added 2026-08-27 after Ilia had to ask more than once, across sessions.**

A drafted Jira comment is a message a busy person reads on a phone between meetings. It is not a
write-up, not an explanation of our investigation, and not a place to show working.

**Hard limits for anything drafted to be posted on a ticket or sent to a person:**

- **Four short paragraphs maximum.** Usually two or three is right.
- **One closed question**, bolded. If you have three questions, you have three messages — pick the
  one that unblocks the most and drop the rest.
- **No tables, no bullet lists, no headings, no file:line citations, no internal jargon**
  (`yMeters`, artefact ids, endpoint names, hypothesis labels). The recipient cannot act on any of it.
- **No preamble and no summary of what we did.** Lead with what you want them to do or stop doing.

**Where the detail goes instead:** `context.md`. That is what it is for. The draft in
`recommended-action.md` is the message; the reasoning behind it stays in `context.md` and is never
pasted into the message.

**Assumptions:** if a draft rests on something unverified, say so in *one* line in
`recommended-action.md` above the draft — not inside the message, and not as a table. The recipient
does not need our confidence intervals.

**Reviewing your own draft before you hand it over:** if it is longer than the Jira comments the
team actually writes (read a few in any ticket's `context.md` — they are 2–5 sentences), it is too
long. Cut it, do not append a note apologising for the length.
