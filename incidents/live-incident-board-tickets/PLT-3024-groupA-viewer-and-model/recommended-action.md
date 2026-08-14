# PLT-3024 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — one internal comment to Rishi, code-side answer to his own open question

Rishi already asked the customer the right question (is the model in the Federated model?) and it's
unanswered. There's nothing new to ask the customer yet. The useful move is telling Rishi what the
code actually does, since "ask the user to confirm" was a hunch and it's now a verified mechanism —
plus flagging the one fact (old dashboard = PowerBI, zero frontend code) that could rule out his
theory outright once the customer answers.

### Draft internal comment (to Rishi Bhugobaun) — playbook style, DRAFT ONLY

> Rishi, you're right that this is worth checking, and it's stronger than a hunch — the Dashboard
> only ever loads one model, the first one inside the folder named "federated," and every
> element-level number derives from that one file. Anything outside it is invisible on the
> Dashboard no matter how many elements are linked to it, while the Web Viewer loads whatever's
> activated. One thing worth flagging before we lean too hard on this: the old dashboard is a
> straight PowerBI embed with no frontend logic of its own, so if it's really missing the same
> models, this can't be the whole story for that half.
>
> If it turns out the models ARE inside the federation, my next guess is a schedule thing — the
> Dashboard only reads the current schedule revision, so if that model's activities are linked to
> a revision that's since been superseded, its elements would show no dates and get hidden
> entirely. Worth asking: has ML9 had more than one schedule revision, and was a new one made
> current recently?

Notes on the draft: answers his own question with code evidence rather than re-asking it, flags the
one fact that could kill his theory (so nobody spends a day confirming federation membership only to
find the PowerBI half is unexplained), and offers exactly one next question, addressed to the one
person who'd know. No headings, no bullets, no long dashes.

## Before sending — two things that need no data access

1. **Open the 3 attachments** (all unopened this run) — the Web Viewer screenshot in particular may
   already show the missing model's folder/name, which would answer the federation question without
   waiting on the customer at all.
2. **Ask Yash to chase the still-unanswered federation question** on the ticket — it's been open
   since 08-06 09:16 with no reply; a light nudge costs nothing and would immediately narrow H1 vs
   H2 vs the PC-EXCEL cross-link (see `context.md` §5).

## Why this and not the others

- **Not straight back to the customer.** Rishi's question is already the right one and it's
  unanswered — repeating it or adding more customer-facing questions before that reply lands would
  just be noise on the thread.
- **Not With Technical Support.** Squarely a mechanism question, correctly still with engineering.
- **Not Blocked.** Brand new (created 08-06); no stall yet to escalate.
- **Not Ready for Development.** No confirmed defect exists in a fixable location yet — H1 (no
  fix needed, a naming/setup issue) and H2 (a real, fixable Dashboard bug already logged in
  `dashboard/pitfalls.md`) point at completely different remedies. Moving to dev-ready before the
  federation question is answered risks fixing the wrong thing, or fixing something that isn't
  broken.

## Follow-through the human should own (not executed here)

- **If H1 confirms** (model not in the federated folder): likely a project-setup/naming question for
  BIM/project delivery, not a code fix — route accordingly.
- **If H1 is ruled out** (model is in the federation): pursue H2 with the DuckDB query in
  `context.md` §4; if confirmed, this is a real, currently-unfixed Dashboard bug (already logged in
  `dashboard/pitfalls.md` "'Is linked' must not be inferred from schedule-date presence") — worth
  its own dev ticket once confirmed, since the Viewer-side equivalent was already fixed via #2081 /
  PLT-2743 and the Dashboard was not.
- **The discipline/package side detail** ("a couple of days ago") — ask whether anyone used the
  schedule category-mapping panel on ML9 around 08-04/08-05; PLT-2918's fix (merged 08-05 evening)
  is the best available lead but is unconfirmed against ML9.
- **Doc/product gap, independent of this ticket's resolution:** neither gate (date-slider,
  federation-membership) shows any on-screen indication that something is hidden. Both PLT-2945 and
  PLT-3024 exist because of that silence, not because either gate is wrong. Worth a standing
  low-priority UX ticket — now recorded as the standing observation on `recurring-defect-patterns.md`
  Pattern 5.

**Confidence in diagnosis: 6/10** (mechanisms verified in code; which one explains ML9 specifically
is not yet confirmed — needs the federation-membership fact). **Confidence in this being the right
next step: 8/10** — costs nothing, answers Rishi's own question with evidence, and doesn't foreclose
either branch before the one decisive fact comes back.

---

## 2026-08-14 — shift the addressee: tell Yash what we know, stop waiting on the customer

**Chosen action: (a) still one internal comment, but addressed to Yash rather than Rishi.** No Jira
status change. Not With Technical Support — the useful next move is us giving information out, not
asking for more in.

**Why the change.** The 08-07 draft below is aimed at Rishi and is still accurate, but it was written
when Rishi's federation question was a day old. It is now 8 days old, the customer has said nothing,
and the five Open/Waiting-on-customer flips between 08-06 and 08-10 are Freshdesk sync noise with no
human content (confirmed a third time this run, `context.md` §11). Waiting is no longer producing
anything.

More importantly the premise has changed underneath the draft: when it was written the mechanism was
one hypothesis of four. It is now **Pattern 5, confirmed on three occurrences, and classified as
correct specified behaviour that simply isn't surfaced anywhere in the UI**. We do not need the
customer's confirmation to explain the mechanism — only to confirm that this case is an instance of
it. Yash is reporter *and* assignee, he owns the client channel, and he has never been told any of
this.

### Draft internal comment (to Yash Patel) — DRAFT ONLY, supersedes the Rishi-addressed draft below

> Yash, we can give the customer an answer on this without waiting for their reply. The Dashboard
> only ever loads one model: the first one inside the folder named "federated". Every element-level
> number and everything drawn in 3D comes from that single file, so any model outside it is invisible
> on the Dashboard however many elements are linked to it, while the Web Viewer shows whatever the
> user has activated. That's how it's built rather than something broken, but nothing on screen says
> so, which is why it reads as missing data. We've now had this same thing three times on different
> projects.
>
> So Rishi's question is still the one that settles it, and it's worth asking them again: are the
> missing models inside the federated folder in the Editor's model tree? One thing to hold back
> though: they also said the old PowerBI dashboard is missing the same models, and that's a straight
> embed with no code of ours in it, so if that part is accurate it can't be the same cause and we'd
> be chasing two things.

*(One owner. Explains the mechanism in plain language with no file names, gives him something to say
to the customer today, re-asks the one open question, and flags the fact that would break the story
before he commits to it in front of the client. No headings, no bullets, no long dashes.)*

### Also worth doing, still costs nothing

- **Open the 3 attachments** — still unopened after four passes. The Web Viewer screenshot may name
  the model's folder and settle the federation question with no customer involvement at all.
- If the customer's answer is "yes, they're in the federated folder", the branch is unchanged: pursue
  H2 with the DuckDB query in `context.md` §4, and it becomes a real, currently-unfixed Dashboard bug.

### Standing product item, unchanged

Neither gate (date-slider, federation membership) shows any on-screen indication that something is
hidden. That silence is why both PLT-2945 and PLT-3024 exist. Recorded on
`recurring-defect-patterns.md` Pattern 5 as a standing low-priority UX ticket; not raised here.

**Confidence in the mechanism: high — verified in code on three separate runs and now a
three-occurrence pattern. Confidence that it explains ML9 specifically: unchanged and still
unconfirmed** — it needs the federation-membership fact, and it does not account for the PowerBI half
of the report at all.
