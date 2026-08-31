# PLT-3033 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (c) With Technical Support — request the XER file, not the screenshots

**Why not wait on the images:** Darminder already asked for them (08-10 12:44) and got no reply; they
were never real Jira attachments (broken `blob:` placeholders), so a re-ask would just repeat his own
unanswered question. The customer separately offered the actual XER file, unprompted, and that file
settles the leading hypothesis (H1, multi-project export) in one query — it is strictly more valuable
than the screenshots and nobody has taken up the offer yet.

**Why not (b) Ready For Development:** there is no confirmed mechanism yet — three hypotheses, none
above 6/10, and the two most concrete ones (H1 scope, H2 parent-loss) both live in backend/ingest
code this repo cannot see. Sending this to dev now would hand over a guess, not a diagnosis.

**Why not (a) resolve via comment:** nothing is settled enough to tell the customer anything
substantive yet.

### Draft internal comment (author: Darminder or Yash; @ Matthew via Yash) — playbook style, DRAFT ONLY

> Hi Matthew, the three screenshots in the description didn't come through on our end either — could
> you re-attach them directly to this ticket rather than pasting them inline? Separately, you
> mentioned the XER file is too large to attach here — if you're able to share it (even via a
> temporary link or splitting it), that would actually help more than the screenshots: we'd want to
> check whether the "2nd Aug" schedule export includes more than one project, since that's the
> likeliest explanation for both the extra WBS row and the jump in unmapped activities.

## 2026-08-19 — superseded: images arrived, Darminder has a sharper ask now unanswered

The image re-send above **landed** (4 real attachments, 08-17) — do not re-ask for those. Darminder
has since posted his own specific question (08-17 15:08, naming the suspect node
`'WI-1_W_WT_B11_2026-8.2 - LIVE - DRAFT'`) asking for the previous and current B11 schedule/XER, and
it has sat unanswered ~2 days. This is the current live ask, replacing the generic "send the XER"
framing above:

> Hi Yash — following up on Darminder's question from 17 Aug: could you check with Matthew whether
> he's able to share the previous B11 schedule (before 2 Aug) alongside the current 2 Aug one — or the
> underlying XER exports for both? Darminder's working theory is that the extra WBS node is a specific
> schedule object named "WI-1_W_WT_B11_2026-8.2 - LIVE - DRAFT" that may have ended up in the 2 Aug
> export by mistake, and having both versions side by side is the fastest way to confirm or rule that
> out. Thanks for getting the screenshots through, by the way — that part's unblocked now; this
> schedule-file pair is the only open item.

### Internal note (not customer-facing) — for whoever picks this up next

> Two separate code paths handle WBS/schedule data in the Web Viewer: a client-side XER preview
> parser that has a real "promote orphan to root, no proj_id scoping" bug (`schedule-parser.ts:246-262`),
> and the actual render path, which just faithfully displays whatever the backend sends
> (`scheduler-service/utils.ts:13-96` — Pattern 2, frontend isn't computing anything wrong here). The
> parser bug is a strong analog but is **not proven to be what ran on B11** — grep shows its output
> has no caller into persistence (`updateScheduleInDb` is dead code for the upload flow). The real
> fix, if any, is almost certainly backend-side (XER ingest), so this needs backend/API input
> (Sergey or Sachin/Ali, whoever owns schedule ingest) once we know whether the file is
> multi-project. Full findings: `context.md` §4.

## Follow-through the human should own (not executed here)

- Get the XER file (or at minimum, a `PROJWBS`/`TASK` row dump) and run `SELECT DISTINCT proj_id` —
  settles H1 in one query.
- If H1 confirmed: route to backend (ingest scoping fix) and ask whether other multi-EPS projects on
  the platform show the same symptom (cohort question, not yet askable without confirming the
  mechanism first).
- If H1 ruled out: fall back to asking backend directly for their XER-ingest parent-resolution logic,
  to check against H2 (this repo's own analog is `schedule-parser.ts:246-262`, but it is not the
  proven persistence path).
- Confirm whether `updateScheduleInDb()` (`schedule-upload-service.tsx:302-356`) is genuinely dead
  code or reachable some other way — worth a direct question to Darminder/Rishi regardless of how
  this ticket resolves, since dead code with a known bug sitting unused is still worth flagging for
  cleanup or deletion.

## 2026-08-20 — the 08-19 draft is reconfirmed unchanged, plus one free internal check to run before it

**No new comments since 08-17 15:08.** The 08-19 draft to Yash (relay Darminder's specific
schedule-pair request to Matthew) was never posted and is **still the right customer-facing message,
word for word**. Nothing about it needs updating. It is reproduced by reference, not rewritten.

What this pass adds is a **cheaper step to take first**, because the ticket has now been parked "With
Customer" for three days on an artifact we may not need.

### Step 1 — internal, free, run before chasing the customer

**Owner: Darminder Atker.**

> Darminder, before we chase Matthew for the schedule files, one thing worth ruling out from our side:
> does 'WI-1_W_WT_B11_2026-8.2 - LIVE - DRAFT' show up in the schedule switcher on B11 as its own
> schedule entry, or only inside the activity tree? If B11 has two schedules loaded and one of them is
> that draft, this is a schedule management problem rather than anything to do with how the XER was
> parsed, and we can sort it without waiting on him. If the switcher won't open, the project only has
> the one schedule and we do need the files.

Rationale and code trail in `context.md` § 2026-08-20 (H4): `project-provider.tsx:17-18`,
`schedule-list.tsx:136-139`, and `getScheduleFlagLabel` at `schedule-list.tsx:215-221`, which confirms
the `LIVE`/`DRAFT` suffix is source text and not something our UI adds.

### Step 2 — the 08-19 message to Yash, unchanged

If step 1 comes back negative (no such schedule entry), send the 08-19 draft above to Yash exactly as
written. Do not re-ask for the screenshots; those arrived on 08-17.

### Step 3 — chase discipline, if Yash does not respond

The relay ask has failed silently once already. Per the playbook's *"evidence requests without owners"*
anti-pattern, this needs a named owner and a date, not another open request into the thread. If Yash has
not responded within a working day of step 2, the ask should go to whoever owns the customer channel for
WI1, not be repeated into the same thread.

### Assessment of the current status

**With Customer is the wrong status for this ticket today.** Nothing has been asked of the customer on
the Jira since 08-10, and Darminder's 08-17 request was addressed to Yash internally, not relayed
outward as far as the thread shows. The ticket is not waiting on the customer; it is waiting on somebody
to ask him. Flagging rather than proposing a transition, since this routine takes no live action.

**Group A, unchanged. Confidence 5/10, unchanged.** Not Ready For Development: no mechanism above 6/10
and the two leading candidates live in backend ingest code outside this repo.

## 2026-08-26 — stall clock update only, no new instruction

No comments since 08-17 15:08. The 08-20 step 1 (ask Darminder whether
`'WI-1_W_WT_B11_2026-8.2 - LIVE - DRAFT'` shows as its own schedule-switcher entry) and step 2 (relay
to Yash for Matthew) remain unposted and unchanged — reproduced by reference, not rewritten.
Darminder's question is now **9 days** cold (17→26 Aug) with zero evidence it reached the customer;
**With Customer remains the wrong status** per the 08-20 assessment, since nothing has actually been
asked of Matthew on the Jira thread itself.

Addressing note: Jira's live `assignee` field is currently **Yash Patel**, not Darminder Atker (see
`context.md` 2026-08-26 for the changelog trail). If step 1 is sent as an in-Jira @-mention it should
still go to Darminder by name — he's the one who asked the open question — regardless of what the
assignee field shows.

## 2026-08-31 — stall clock only. Draft unchanged, reproduced verbatim so it can be copied without scrolling.

**No Jira movement since 08-18 (`updated` 2026-08-18T10:08:13, 5 comments, newest 109789 from
08-17 15:08).** Darminder's schedule-pair question is **14 days** cold. Nothing in the 08-20 plan is
superseded; steps 1-3 remain the plan, still unposted for the third consecutive run. Nothing below is
new text — it is the 08-19/08-20 wording reproduced unchanged, because nothing material changed.

**Assumption this rests on (one line, not for the message):** that Darminder's guess is right and the
extra WBS node is the `'... - LIVE - DRAFT'` schedule object — unverified, which is exactly what the
file pair would settle.

### Step 1 — internal, free, send first. Owner: Darminder Atker.

> Darminder, before we chase Matthew for the schedule files, one thing worth ruling out from our side:
> does 'WI-1_W_WT_B11_2026-8.2 - LIVE - DRAFT' show up in the schedule switcher on B11 as its own
> schedule entry, or only inside the activity tree? If B11 has two schedules loaded and one of them is
> that draft, this is a schedule management problem rather than anything to do with how the XER was
> parsed, and we can sort it without waiting on him. If the switcher won't open, the project only has
> the one schedule and we do need the files.

### Step 2 — the customer-facing ask, to Yash. Send if step 1 comes back negative.

> Hi Yash — following up on Darminder's question from 17 Aug: could you check with Matthew whether
> he's able to share the previous B11 schedule (before 2 Aug) alongside the current 2 Aug one — or the
> underlying XER exports for both? Darminder's working theory is that the extra WBS node is a specific
> schedule object named "WI-1_W_WT_B11_2026-8.2 - LIVE - DRAFT" that may have ended up in the 2 Aug
> export by mistake, and having both versions side by side is the fastest way to confirm or rule that
> out. Thanks for getting the screenshots through, by the way — that part's unblocked now; this
> schedule-file pair is the only open item.

Do not re-ask for the screenshots; they arrived 08-17. Address step 1 to Darminder by name even
though the assignee field reads Yash Patel (08-26 correction).

### Escalation note — the relay has now failed silently twice

At 14 days, sending step 2 into the same thread and hoping is no longer a plan. It needs a named
owner and a date, or the ticket should stop being labelled `With Customer` when nothing has been
asked of the customer since 08-10. Worth Ilia's attention on return if it is still cold: this is the
one ticket on the board whose entire blocker is that a correct, ready, three-sentence question has
sat unsent for two weeks.
