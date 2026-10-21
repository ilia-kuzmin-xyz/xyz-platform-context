# PLT-3330 — recommended action (DRAFT ONLY, nothing posted) — 2026-10-21

**Class 1 with a class-3 shape.** Yash is waiting on Ilia since 10-20 (one working day), and the cause is not provable from here: it needs one look at the SIN02 dashboard.
Stay **Open** (Ilia). Not Ready for Dev (no mechanism proven), not With Technical Support yet (the screenshots from the customer already say what they see; the missing facts are two values we or Yash can read), not Blocked.

**Assumption, one line:** that "Last updated" on the Progress panel is the relevant freshness stamp (verified in code: it is the `calculatedOn` that caps the status merge), and that SIN02 uses the dynamic dashboard colouring.

## Draft: comment on PLT-3330, author Ilia, @Yash (45 words)

> Yash, thanks for the detail. Orange in the dashboard means it still treats that element as not installed, which can point to timing rather than missing data. **What does "Last updated" say on the SIN02 Progress panel, and when was that facade element marked installed?**

If Last updated is older than the install time, the answer for the customer is "working as designed, it refreshes with the next progress recalculation" (PLT-3133 mechanism), and the ticket can go to With Technical Support for Yash to relay, then close.

## Not for the message (for Ilia, if you would rather look yourself, ~5 minutes on SIN02)

1. Progress panel "Last updated" against the install time of `...000560a0` (H1).
2. Dashboard date range end against the install date (H2); XYZ Tracked, package and status filters (H4).
3. Select the element in the dashboard viewer and open its linked activities: none, or an activity with no dates, means H3 (non-current schedule revision), remember SIN02 re-imported its schedule in September (PLT-3156).
4. Outcome table: Last updated old = H1, working as designed, no code; range end early = H2, tell Yash how to reset the range; no or dateless link = H3, class 4 (known unfixed gap in `dashboard/pitfalls.md`, needs product decision and a fix on the dashboard CASE, plus the customer relinking or us re-linking); none of the three and element still orange = real defect, class 3, needs a repro branch.
5. Drop the four Jira attachments (`66651` to `66654`) into this folder.
