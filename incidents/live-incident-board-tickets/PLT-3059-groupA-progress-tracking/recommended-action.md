# PLT-3059 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: one internal comment to Darminder, before Thiago gets any workaround advice

**Owner: Ilia Kuzmin. Addressee: Darminder Atker, cc Yash Patel.**

Rationale, per `incidents/live-incident-playbook.md`:
- **Not to the customer.** Nothing here is Thiago-actionable yet — whether these nine activities
  are even the QA-model shape hasn't been independently checked, only inferred from PLT-3034.
- **Not Ready For Development.** No defect is confirmed; the code gap (no model-provenance
  concept) is already documented against PLT-3034 and doesn't need a second write-up here.
- **Not Blocked.** The one check that would settle this needs nobody outside the team.
- **Urgency reason to post this one specifically:** a workaround was already pointed at this
  ticket (109878 → PLT-3034's unlink/mark-installed comment) before the same workaround's premise
  was disputed by the customer on the sibling ticket. If Yash or Darminder relay it to Thiago
  before that's resolved, a second customer may act on advice already in question.

## Draft comment (internal, on PLT-3059)

> Darminder — before this goes back to Thiago: the "unlink or mark installed" advice you pointed
> to from PLT-3034 was written before the fork we found there. A link is stored against an
> element id, not a model, so an element linked in a production model can still show up under a
> QA model's heading if that same element id also exists in the QA model. If that's what's
> happening here, unlinking would break the real link and marking installed would falsify an
> element that genuinely isn't done yet.
>
> Same one-minute check as PLT-3034: for any of these nine activities, does the linked element
> that's short of 100% appear under more than one model heading in the linked-elements panel, or
> only under the QA one? If it's only under QA for all nine, that's a real QA-linking issue and
> the workaround is fine. If it shows up under a production model too, the QA heading is just a
> display artifact and none of these need unlinking.
>
> Also worth a straight yes or no: has Thiago already unlinked or marked anything installed based
> on the note in PLT-3034? If so we may need to look at what that did before anything else.

## Why this and not the others

- **Not folding into PLT-3034's own draft.** That ticket's Fork A/B question is about
  `DH2.29-30.1100` specifically; this one needs its own answer across nine different activities,
  even though the mechanism question is identical.
- **Not asking Thiago anything yet.** He has given a clear, reproducible report (linked-vs-installed
  count mismatch, screenshot). There's nothing to ask him until the fork is resolved on our side.
- **Not treating the Freshdesk auto-flip (08-21, Closed → Waiting on customer) as real
  communication.** Both those comments are status-sync noise with no text content; nobody has
  actually replied to Thiago since 08-17.

## Follow-through a human should own (not executed here)

- Run the Fork A/B check across all nine activities (or write the one query that answers it for
  all of them at once — see `context.md`'s cohort-angle note).
- Confirm whether Thiago has acted on the pointed-at workaround already.
- Once PLT-3034's own Fork A/B question resolves, the same answer almost certainly applies here —
  worth updating both tickets from whichever gets checked first rather than running the check
  twice.

## 2026-08-26 — still unposted, urgency clock extended

No Jira change since the draft above was written (see `context.md` 08-25/08-26 entries). The draft
comment to Darminder is unchanged and still the correct action: it is now **8 days** since the
disputed workaround (109878 → PLT-3034's 109877) was pointed at this ticket without correction, and
**7 days** since the PLT-3034 customer's objection to that workaround's premise (08-19 12:25) went
unrelayed here. Fork A/B still hasn't been run on either ticket. No Jira action was taken by this
run.
