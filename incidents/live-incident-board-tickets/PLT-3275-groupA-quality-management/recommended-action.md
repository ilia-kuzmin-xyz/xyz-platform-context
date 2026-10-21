# PLT-3275 — recommended action (DRAFT ONLY, nothing posted) — 2026-10-13

**Class 1** (waiting on a named person, Joshua via Yash, 4 days), with a small class 4 half (should the table ever have a default).
Stay **Open**. Not Ready for Dev (no values to put in), not With Technical Support (Freshdesk is already Pending), not Blocked.

**Assumption, one line:** that SIN02 uses discipline names outside `CSA`, `Electrical`, `Mechanical`. Not seen; the screenshot is not openable here.

## Draft: reply on the ticket (author Ilia; @ Yash) (65 words)

> Yash, small correction for Joshua: the rework figures live in a table inside the web app, not in a backend file, so Darminder updates it and it ships with a release. To avoid fixing one cell at a time, Joshua should price Categories 1 to 4 for every discipline and package SIN02 uses. **Can you send me the exact discipline and package names on SIN02?**

Why this and not a chase: Yash already asked Joshua on 10-09 and Darminder is waiting only on values, so the useful thing left is to
stop the ask being too narrow (PLT-3061's lesson: the customer names one cell, the gap is the whole discipline) and to correct "backend file".

## Not for the message (for whoever owns the table)

- PLT-3061's eight values were never added to `rework_reference.json`. If SIN02 is also a spelling variant, the same table now has two open gaps.
- Optional product question to Mostafa/Pietro, only after Joshua replies: should an unknown discipline fall back to a Category-level default
  instead of blank? That removes the pattern rather than patching rows. Not drafted as a message.

## 2026-10-21 — the 10-13 draft is superseded; one optional combined ask

Do not post the 10-13 draft: Ilia has the discipline names (`115966`) and Yash has asked Joshua (`115971`). The one gap left is that the ask to Joshua is generic, and PLT-3300 needs corrected values from the same person. One short message makes it a single, complete request.
**Class 1**, parked, ball with Joshua. Optional, post only if you agree the ask needs tightening.

### Draft: comment on PLT-3275, author Ilia, @Yash (40 words)

> Yash, the SIN02 file and the two ML9 values on PLT-3300 are the same table. **Can you ask Joshua for one file that covers every SIN02 discipline and package for Categories 1 to 4, plus the corrected ML9 values?** Partial values would leave the field blank elsewhere.

Chase Joshua via Yash if nothing by about 10-27. Optional product question to Mostafa or Pietro (fallback default for unknown disciplines, ends the pattern) is still not asked.
