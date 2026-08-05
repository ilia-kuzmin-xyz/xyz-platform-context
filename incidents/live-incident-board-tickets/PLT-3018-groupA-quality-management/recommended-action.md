# PLT-3018 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — one routed comment to Rishi, no customer message yet

Rishi is already assigned. Nothing here needs to go back to Maritza yet — the code investigation
ruled out the ownership/permissions theory Yash's own comment raised, and narrowed it to a single
checkable fact (Type + Status on one of her issues vs one of the coworker's). Asking Maritza a
follow-up before checking that would waste a customer round trip.

### Draft internal comment (to Rishi Bhugobaun) — playbook style, DRAFT ONLY

> Rishi, I had a read through the frontend for this one. There is no ownership logic anywhere in
> the QA issue form, nothing compares the logged in user against the issue reporter, so this
> cannot be a self versus others rule in the code, which matches Yash's read that it isn't
> permissions. Two things in the form are per issue rather than per user though, and either would
> look like an ownership pattern from a small sample. The Severity dropdown is only rendered at
> all when the issue's Type resolves to exactly "Quality" (issue-form.tsx:423), so on any other
> Type the row just isn't on the form. Separately, every field on the form is greyed out when the
> issue's status is Closed or Void (issue-form.tsx:69), which would grey Name and Assignee too,
> not just Severity. My guess is the first one, and that the row is missing rather than greyed.
> What Type and Status are shown on one of Maritza's issues where Severity can't be set, next to
> one of Lucas's where it can?

Notes on the draft: one question, one owner, answerable with four values — the broken-vs-working
diff the playbook's question 3 asks for. No headings, no bullets, no long dashes.

## Before sending this — check the video first

The attached video (`Issue Severity Category_1.mp4`) very likely shows the Type and Status fields
on both issues already, which would answer the drafted question without needing Rishi to look
anything up. **Whoever can open Jira attachments should watch it before posting the comment above**
— if it already shows Type/Status, skip straight to the mechanism conclusion instead of asking.

## Why this and not the others

- **Not straight to the customer / With Technical Support.** Nothing further is needed from
  Maritza — she's already supplied the decisive video; the missing step is on our side (watch it,
  or check the DB directly).
- **Not Blocked.** This is brand new (created today); no stall to escalate yet.
- **Not Ready for Development.** No confirmed bug exists yet — H1 (leading hypothesis) predicts
  this is not a code defect at all, just two issues with different Types. Moving to dev-ready
  before that's settled would misfile a probable non-bug as a fix-needed ticket.

## Follow-through the human should own (not executed here)

- **If H1 confirms** (Type differs, Status is the same/Open on both): reply to Maritza explaining
  Severity only applies to Quality-type issues, ask her to confirm her own issues' Type — likely
  closes without any code change, same shape as PLT-2858.
- **If H1 is falsified** (both issues are Type = Quality, Status = Open): resets to a genuine
  backend/account-specific question — next step is a HAR of the PATCH request plus the api2
  response for one of her broken issues, comparing to a coworker's working one.
- **Doc gap worth filing separately:** no domain doc describes the QA issue create/edit form's
  field-editability rules (Type-gating, status-gating, per-project severity config). Worth a short
  addition to `dashboard/quality-tab.md` or a new file once this resolves, so the next "field X is
  missing/uneditable" ticket doesn't start from zero.
