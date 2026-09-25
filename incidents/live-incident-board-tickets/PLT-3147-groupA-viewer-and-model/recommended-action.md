# PLT-3147 — recommended action (2026-09-21, first pass)

## Classification: **1 — stale, unresponded**, with a **class 4 tail** that must be split off

**Why class 1.** The last substantive message on the ticket is the *customer* asking *us* a
question — *"If you could please help us to identify the name of the model which causing this
effect"* (112519, 09-18 13:12). Three days later nothing has touched the issue: `updated` is still
09-18 13:26, status still Open, still 10 comments. On a **Critical** ticket that is the definition
of stale-unresponded, and the aggravating detail is that the Freshdesk ticket was moved to
**Waiting on customer** fourteen minutes *after* the customer replied — so every dashboard anyone
looks at says the ball is in their court when it is in ours.

**Why not class 2.** Nothing here is a code change this session can finish. The one thing the
frontend could plausibly own — the Web Viewer's grey-theming and metadata-gated hiding of
Navisworks geometry (`context.md` §A1/§A2) — is current, deliberate behaviour with live call sites,
and we do not yet know it is what the customer is complaining about. Writing a fix now would repeat
the 2026-09-09 PLT-3099 failure exactly: a correct reading of our code turned into a wrong
conclusion about behaviour, with no one having observed the failure.

**Why not class 3.** A class 3 deliverable is a branch plus a console reading. That is the wrong
instrument: the blocking facts here are two PNGs and a project setting, all readable by a human in
under five minutes with no build. Proposing a branch would be the PLT-2651 mistake (three months
spent on "an instrumented branch, not yet written" for something that turned out to be one cookie
and one paste).

**The class 4 tail, named and split off — do not bundle it into this ticket.** Our platform returns
an upload `errorCode` **only** when ingest hard-fails (`userfiles.controller.ts:47-55`), and the UI
renders a message only when one is present (`UploadErrorMessage.tsx:10-11`). So a conversion that
completes with a coordinate fault tells the user nothing at all — the model just appears, looking
wrong. Whether the converter even *has* a non-fatal severity for the four coordinate codes is
decided in the Dagster ingest pipeline, which is outside both repos this session can read. That is
a product/ownership question for Ali or Sachin plus a product owner, it is global rather than
ADL2-specific, and it should be its own ticket once this one is understood — not a reason to hold
this one open.

---

## The one thing that would falsify everything below before anyone acts on it

**Attachment `64895`** — Darminder's DEV converter failure, 21 KB, almost certainly a cropped error
banner carrying the code string. Our catalogue has two codes a person would paraphrase as "project
base points not being set", and they have **opposite owners**
(`model-upload-error-codes.config.tsx:146-155` vs `:196-205`):

- `NO_PBP_OR_TRUE_NORTH` — *the model* has no base point / true north. The DEV result transfers to
  ADL2, Darminder's 12:56 conclusion stands, and the customer's export settings are the fault.
- `INCONSISTENT_PBP` — *the model's* base point does not match *the project's*. Then the result is a
  property of the DEV project he uploaded into, says nothing about ADL2, and the customer's
  *"We have checked the PBP which are same"* is not a contradiction at all.

This session gets 403 on attachment bytes (re-tested this run on all three; see `context.md`
§ Media). Anyone with Jira access settles it in one glance, and nothing else should be sent to the
customer until it is settled.

**Assumption behind the draft:** that Darminder's 12:56 message is ambiguous between those two
codes rather than already meaning one of them unambiguously to him. If he opens the screenshot and
it plainly says one of them, the draft costs him ten seconds and the ticket moves on.

---

## Proposed next actions, in order

1. **Someone opens `64895`, `64889` and `64888`** and writes one line each into the ticket saying
   what they show. That is the whole blocker. `64889`/`64888` decide *what kind* of wrong
   appearance this is — `context.md` §A–§E gives a distinct verified mechanism for missing
   geometry, flat grey colour, displacement, wrong scale and wrong-viewable, and they route to
   different owners.
2. **Post the draft below to Darminder** (a human posts it; see § What this session did NOT do).
   It is one closed question and it is the cheapest thing that can change the ticket's direction.
3. **Correct the Freshdesk state.** Freshdesk 8021 is *Waiting on customer*; the customer is waiting
   on us. Yash owns that. Worth saying out loud rather than in the ticket — it is the likeliest
   single cause of the three-day silence.
4. **Do not ask the customer to change anything yet.** They have already spent one round checking
   the PBP on the strength of a remembered earlier incident (112502, 10:58), and came back saying it
   matched. `recurring-defect-patterns.md` names this shape explicitly — *"a customer-facing
   instruction shipped on a premise nobody verified"*, PA12/PLT-2649 and Hutto2/PLT-3034 — and it has
   already fired once on this ticket. A second unverified errand on a Critical is how PLT-2649 lost
   five weeks.
5. **Once the symptom is known, the customer's actual question is answerable by us.** If geometry is
   *missing*, §A2 says the Web Viewer hides Navisworks leaves whose elements are absent from the
   model's element metadata — so "which model is causing this" is a lookup against
   `client-element-metas` for that version, not a question for the customer. If the converter emitted
   `NOT_USING_SHARED_COORDS` or `NOT_SAME_TRUE_NORTH`, our own message text already says the fault is
   *one model in the federation* (`model-upload-error-codes.config.tsx:156-175`) — the converter knows
   which one even though the message does not print it.
6. **Ask "why now?" once, with an owner.** Nobody on this ticket has asked what changed on ADL2 in
   the window — a re-upload, a new model version, a base-point edit. The playbook's question 5. An
   unanswered trigger means this recurs on the next export.

Board-wise: **Open → In Analysis** is the honest state once someone picks it up. Not "With
Technical Support" — the next fact needed is ours to fetch, not the customer's.

---

## Draft reply to Darminder (95 words, 4 sentences) — NOT posted

Darminder, the customer answered three days ago and is still waiting, and the ticket is marked as
waiting on them. Our error list has two different messages that both read as a base point problem:
one means the model itself has no base point, the other means the model's base point does not match
the project it was uploaded into. If it was the second, your DEV result describes that DEV project
rather than ADL2, which is why the customer can honestly say their base points match. **Which of
those two messages did DEV show?**

*(Say the word and paste it.)*

---

## Held back from the draft deliberately

All of it belongs in `context.md`, not in a message someone reads on a phone:

- that our Web Viewer paints every Navisworks node flat grey and hides any leaf without element
  metadata, so a `.nwd` can never look the same in our viewer as in Navisworks;
- that the Dashboard loads one federated-folder model and shows only fragments carrying a status,
  so a Dashboard-vs-NWD comparison is narrower again, and differently narrower;
- that no project-level PBP or true-north value we hold is applied to model placement in the
  browser (`viewer-service.ts:974-983` is commented out), so a Project Settings change cannot move
  the model — and that this dead code is the revert of PLT-2112 after it caused PLT-2250, a Blocker
  across six projects in four hours on 2025-12-10;
- that the viewable fallback chain now ends at `viewables?.[0]`, so a `.nwd` with no `Navis`/`XYZ`
  viewable silently renders whichever view came first.

Each is a real candidate mechanism and each would derail a short message. They go to whoever picks
the ticket up, verbally or in the folder.

---

## What this session did NOT do

No Jira action of any kind — no comment, no transition, no assignment, no @-mention, no field edit.
Read-only calls only (`getJiraIssue`, `searchJiraIssuesUsingJql`) plus three direct `curl`s against
the attachment-content endpoint, all of which returned 403. The draft above is text for a human to
send or discard.

No code was written in either repository, nothing was built or run, and no git command was executed
— this run was instructed to leave git to the orchestrator because several agents share this
checkout. (`xyz-platform-context`'s own branch policy — commit straight to `main` — still applies to
whoever commits this folder; it is not being overridden, only deferred.)

---

## 2026-09-22 (scheduled) — status/assignee moved with no comment; the blocker and the draft are both unchanged, but the board now actively misreports who owes what

No new Jira comment since `112522` (09-18). What changed is administrative: status `Open` → `With
Customer`, assignee Darminder → Yash, both on 09-21 with no accompanying comment (`context.md` this
date). **This makes the standing recommendation more urgent, not less:** the board's own status field
now says the ball is with the customer, while the customer's 09-18 question to us is still unanswered
and now 4 days old. The three attachments (`64895`, `64889`, `64888`) are still unopened by anyone
with access, and the draft to Darminder below is still unposted.

**Revised proposed next action, in order:**
1. Whoever reassigned this to Yash should confirm whether Darminder is actually done — the open
   technical question (which of two error codes DEV showed) is his finding to clarify, not Yash's.
2. Correct the Jira status. `With Customer` is now actively wrong in the same direction the 09-21
   entry flagged for Freshdesk: the customer is waiting on us.
3. Everything else in the 09-21 recommendation stands unchanged — open the three attachments, post
   the draft to Darminder, do not send the customer another unverified instruction.

### Draft — to Darminder, on PLT-3147 — DRAFT ONLY, not posted (95 words) — unchanged from 09-21

Darminder, the customer answered three days ago and is still waiting, and the ticket is marked as
waiting on them. Our error list has two different messages that both read as a base point problem:
one means the model itself has no base point, the other means the model's base point does not match
the project it was uploaded into. If it was the second, your DEV result describes that DEV project
rather than ADL2, which is why the customer can honestly say their base points match. **Which of
those two messages did DEV show?**

*(Say the word and paste it.)*

**No Jira action was taken by this run.**

## 2026-09-25 (scheduled) — unchanged; draft to Darminder now 7 days unsent on a Critical ticket

Live re-fetch confirms zero movement since 09-18. The draft above (95 words) is unchanged and
still the right next message. **Action class: 1, stale on Darminder** — the one open technical
question (which of two DEV error codes) is his to answer, and the board's `With Customer` status
still misreports who owes what. **No Jira action was taken by this run.**
