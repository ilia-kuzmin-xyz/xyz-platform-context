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
