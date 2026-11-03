# PLT-3291 — recommended action (DRAFT ONLY, nothing posted) — 2026-10-16

**Action class: 1 with a class-3 shape.** New, no dev reply yet, so it needs a named person to answer; the fix is not within reach until one prod
measurement is taken (class 3, needs Ilia or someone with prod read). **Never promote to class 2** on the code reading alone (the PLT-3097 and PLT-3099 lessons).
Stay **Open** (Darminder). Not Ready for Dev (no mechanism proven), not With Technical Support (the customer has told us what they see; the
missing facts are ours to read), not Blocked.

**Assumption, one line:** that DPL-1684 reads Done without a recorded cause (read live, 16 comments, none after 09-04 is a human reply).

## Draft 1: reply on DPL-1684 or ping Ali (author Ilia; @ Ali Seyedof) (44 words)

> Ali, DPL-1684 (ATL08 models listed with none of the activity's elements) is marked Done. The same customer now reports ATL08 activity MV-1350 showing 6,350 linked elements, with models that contain none of them. **Was anything changed in the ATL08 element metadata when DPL-1684 closed?**

Why Ali and why this question: it is the one fact that decides whether this is a new defect or the old one still standing, and he is the owner who said he would investigate.
If the answer is "nothing changed", H1 is very likely and the cross-write is still open.

## Not for the message (for Ilia)

- **The measurement that settles it** (needs prod read, or the editor diagnostic on ATL08): for activity MV-1350 on ATL08, count its links split by `isDeleted`,
  then count how many live links have no geometry. Outcome table:
  live about 6,350 and most have no geometry means H1 (Pattern 1, remediation in `data-remediation-runbook.md`, only after approval);
  live much lower and total near 6,350 means H2 (count includes deleted, a backend fix, route to Sachin/Ali);
  live about 6,350 and all have geometry means H3 or a real link set (then ask what the customer expects).
- Ask Yash to bring the Freshdesk screenshot and the SharePoint video into this folder (media list in `context.md`).
- Draft 1 deliberately does not ask Darminder anything: the ticket is his, but he has not replied and a pointed question to Ali is the faster route.
  If Ilia prefers, post it as a comment here tagging both.
- Do **not** tell the customer anything yet. A cause posted before the measurement is the PLT-3099 / PLT-3101 failure.

## 2026-10-21 — status housekeeping only (no message)
Freshdesk says Waiting on customer but the Jira ticket sits at **Open**. Suggest Yash or Ilia moves it back to With Technical Support (or With Customer) so it stops reading as owed by us. Not urgent. If the customer replies that the 6,350 versus 6,995 gap matters, the one-line answer is that the count includes everything linked, and the customer's figure may have been read earlier or from another surface (unverified).

## 2026-10-23: housekeeping done (status is With Customer). Nothing to post; chase through Yash only if still silent on 10-27.

## 2026-10-26: SUPERSEDES the 10-23 "chase only if silent on 10-27". The customer replied; Ilia owes Yash.
Class 1, owed by Ilia since 10-23. Assumption, one line: that the customer sees the list in the Linked Elements panel for MV-1350 (screenshot unopenable).

### Draft: reply on PLT-3291, author Ilia, @Yash (54 words)

> Yash, thanks, good that the count is confirmed. The model list shows every model that holds a copy of a linked element, whether or not that model is drawn in the viewer, which could explain the extra names. **When the customer saw security and data devices listed, were those models loaded in the viewer?**

Why this question: yes means loaded and empty (ghost models, Pattern 1, then the DPL-1684 question to Ali from 10-16 matters again); no means the display is as designed and the answer is a one-line explanation. Do not tell the customer it is a defect. No Jira action was taken.

## 2026-11-02: CURRENT. Parked with the customer, nothing to send. Class 1, parked (Yash owns the follow-up if the customer is silent).
Supersedes every earlier draft in this file (they predate Ilia's 10-27 answer). If the customer pushes back on "re-export without the conduits", the next question is what those models are for; do not reopen the count.

## 2026-11-03: CURRENT. Rishi owns it; nothing owed by Ilia. Optional hand-off, only if Ilia wants to save Rishi the recount.
Supersedes the 11-02 "parked, nothing to send" (the customer has now replied).
Assumption: the 10-27 membership figures are Ilia's own and were not re-measured.

### Draft to Rishi (60 words)

> Rishi, so you do not redo it: the customer agreed the count is right, so only the model list is open. Containments, Data Devices and Security do hold copies of MV-1350's elements, so the list is right on paper. His new video says nothing shows in those models when he isolates. **Do those copies have any geometry in those models?**
