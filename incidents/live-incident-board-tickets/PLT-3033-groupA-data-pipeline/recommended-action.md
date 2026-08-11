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
