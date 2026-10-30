# PLT-3406 — recommended action (DRAFT ONLY, nothing posted) — 2026-10-30

**Class 1, unresponded, Ilia owes the reply.** Yash is waiting on 3rd line (us) since 10-29 13:57. Reply on the ticket to Yash; no status move yet (stay In Analysis until we know whether the images load).

Assumption, one line: the "V1 flag" is a rename to include "v1" (inferred from `v1ProductionRules.tsx:2-3`; the ticket does not say how it was set).

Draft to Yash (61 words):

> Yash, Open Editor is hidden on purpose for any project whose name contains "v1", so that is expected after the switch. Renaming it without "v1" brings the editor back. **Do the customer's issue images load now on the old dashboard?** If yes, they are unblocked and we can look at why the images fail on the new dashboard without a rush.

Outcomes: images load, then park With Customer and open a follow-up for api-v2 on the unmigrated project. Images still fail, then ask Yash for one screen and one image URL, and check the signed-link expiry idea in `context.md`.
