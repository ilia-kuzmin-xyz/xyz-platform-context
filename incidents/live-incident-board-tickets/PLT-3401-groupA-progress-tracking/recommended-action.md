# PLT-3401 — recommended action (DRAFT ONLY, nothing posted) — 2026-10-29

**Class 1 with a class-3 shape. Owed by Ilia, Blocker priority, 14 hours without a reply.** Stay Open. Not Ready for Dev (no mechanism), not With Technical Support yet (the facts needed are two settings we can read ourselves).

**Assumption, one line:** that the customer ticked Baseline and Active on one revision, as Mostafa's wording suggests; the screenshots were not readable from this run.

## Draft: comment on PLT-3401, author Ilia, tag Mostafa (34 words)

> Mostafa, thanks for the screenshots. **On TXE2, is the Baseline line different from the Planned line, or does it look wrong against the schedule itself?** I will check the project's progress weighting setting meanwhile.

## Five-minute look for Ilia on TXE2 (for you, not for the message)
1. Settings, Progress weighting: method. Model element count or Weighted labour units points at H1 (Baseline is always labour-weighted in the query, Planned follows the setting); switching a copy of the view to Budgeted labour units and seeing the lines meet confirms it.
2. Schedules list: which revision carries Baseline and which carries Active, and when the Baseline flag was last changed against Progress panel "Last updated" (H3).
3. Package filter on vs off: do Baseline and Planned still differ in both modes (H2 vs a display rule).
4. Drop attachments `66919` and `66920` into this folder.

## Outcomes
H1 true: it is a frontend/backend mismatch in how Baseline is weighted, a real defect with a small code fix (class 2 once confirmed, product check with Mostafa on whether Baseline should follow the weighting). H2: move to DPL for Ali/Sachin with the project and revision ids. H3: ask Yash to have the customer wait for the next calculation, no code. H4: reply with how the series are defined.
