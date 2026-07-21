# PLT-2884 — "EQX-AT10 New dashboard error" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2884
- **Type:** Live Incident · **Priority:** Critical · **Status:** With Customer
- **Software Area:** Dashboard · **Project:** EQX-AT10x (`6808f6afae311c4f8409624f`)
- **Reporter:** Yash Patel · **Assignee:** Ilia Kuzmin · **Linked Freshdesk:** #7384
- **Created:** 2026-07-09 · **Last updated:** 2026-07-20 (Freshdesk bot status-flap only — no
  substantive new content)
- **Domain slug:** `data-pipeline` (schedule/XER import → progress % calculation; see
  `dashboard/data-pipeline.md`)

## One-line symptom

New (non-PowerBI) dashboard shows lower "Actual" progress than the old PowerBI dashboard for
EQX-AT10x: Old 27.37% vs New 23.85% (3.52-point variance). Some activities with progress on the
old dashboard show none on the new one; some activities the customer checked against the web
viewer Editor-Progress **do** match the old dashboard's numbers. Customer separately confirmed
with Hussein (PowerBI) that "some activities were missing from the source data."

## Thread — already resolved on cause, stalled on customer action

1. Yash relays report + attachments (screenshots, an `.xlsx` variance export, and later the
   project's `.xer` schedule file).
2. **Mostafa (PO) identified the cause directly:** *"Please wait for now as Mostafa has identified
   the issue. It was with the XER file. We have recommended user to rectify that and come back to
   us if the issue still persists."* (Yash, 07-10 comment 107073.) — i.e. this is a **source-data
   problem in the customer's exported schedule file**, not a platform bug; the fix is the customer
   re-exporting a corrected XER and re-uploading.
3. Ilia (07-13): *"Do you know if the customer had a chance to re-upload the schedule?"*
4. Yash (07-13): *"have asked customer to reupload after rectify it on their end. still waiting for
   them to get back with outcome."*
5. **No further substantive update since 07-13.** The 07-20 Freshdesk comments (`Closed` →
   `Waiting on customer`) are automated ticket-status bot noise from the Freshdesk↔Jira sync, not
   a real signal that anything happened.

## Assessment

This ticket is **not a code investigation** — root cause (bad source XER) was already identified
by product (Mostafa) and no one has disputed it; the mechanism is consistent with
`dashboard/data-pipeline.md` (schedule import feeds the same progress-calculation pipeline that
produces `activity_progress` / `category_groups`; a schedule with missing/incorrect activities
would directly under-count "Actual" progress). The **only open item is a status check**: has the
customer re-uploaded the corrected schedule, and if so, does the variance disappear? This has been
sitting for **8 days** with no confirmation either way.

## Confidence

- **Root cause: 8/10** — attributed by product (Mostafa) with source evidence (the XER file
  itself, cross-checked against PowerBI by the customer's own BI contact); nobody has contradicted
  it; consistent with how the pipeline consumes schedule data.
- **Ticket status accuracy ("With Customer"): 9/10** — correctly reflects that the ball is with the
  customer; the only risk is the ticket going stale from lack of a follow-up nudge.

## NEEDS HUMAN
- The `.xlsx` variance export and the original `.xer` file were not opened/parsed here (not needed
  for the triage decision — the cause is already stated in text — but would be the artifact to
  check if the customer disputes the diagnosis after re-upload).
