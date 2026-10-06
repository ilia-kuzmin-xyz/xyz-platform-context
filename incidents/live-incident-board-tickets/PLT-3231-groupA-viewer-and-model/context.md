# PLT-3231 — Element status showing incorrectly in web viewer

Open · Medium · assignee Darminder · reporter Yash · FAR02 · created 2026-10-05 16:37. Relates to PLT-3223.

## 2026-10-06 — first pass (scheduled run)

**Ticket.** Elements not installed in the editor and past their planned dates still show *Planned*, not *Late*.
One Yash comment (`113957`, 16:38): same as PLT-3223 but a different project, "Jira for record", tagged Darminder.
No attachments on the Jira issue; the description only links a Freshdesk screenshot (`103353848476`, not fetchable).

**PLT-3223 is the sibling (In Code Review, so out of board scope, no folder).** DUB7x customer: Editor shows yellow
(Planned) where Dashboard correctly shows red (behind schedule); every model affected. Darminder `113934`: fix applied,
ships in a future build, workaround is to click the schedule in the schedule picker and select it again. Customer
confirmed the workaround works (`113946`) and said the ticket can close; Yash asked that the fix ride the normal release.

**Mechanism (verified by reading the merged diff; not run).** PR #2264 (`959f1ad`, master, 2026-10-05 18:00) creates the
`schedule_activity_dates` table at the start of `initializeProjectData` (`project-service.ts:687`, called at `:496`).
Before, it was created with the artefact tables, later. The schedule writes its dates there on load
(`schedule-service.tsx:250` → `duckdb-element-store.ts:355`), and if the table did not exist yet the write returned
silently. The status query then falls back to an empty stand-in (`duckdb-element-store.ts:419-421`), so every linked
element stays Planned. Re-selecting the schedule re-runs the write, which is why the workaround works. Both call sites
are live code.

**Fit with PLT-3231.** Symptom matches (past-date elements stuck on Planned). Not observed on FAR02. A race would also
explain "worked yesterday, not today" style intermittency, but nothing in the ticket says that.

**Release state.** `git tag --contains 959f1ad` is empty; newest tag is v26.3.6. So neither customer has the fix yet.

## Unverified
- That FAR02 is the same race (the workaround test on FAR02 would settle it).
- That #2264 fixes it end to end: this environment cannot build or run the app.
- The FAR02 screenshot contents. Jira has no attachment on this issue.
- Which release will carry #2264.

## Unopenable media
Freshdesk attachment `103353848476` (FAR02 screenshot). Would settle whether all linked elements are yellow or only
those past date. PLT-3223's `65819`, `65820`, `65829`, `65830` are 403 from this routine (confirmed rule 2026-09-08).
