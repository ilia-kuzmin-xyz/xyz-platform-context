# PLT-3390 — (ML9) Progress model elements not selecting properly (installed/uninstalled looks "cloned")

First folder 2026-10-29. Live Incident, Medium, reporter/assignee Yash. Created 10-28 09:44 UTC, Freshdesk 8472. **Status With Customer** since 10-28 15:56 (Freshdesk Waiting on customer). Fetched live, 5 comments.

## What the ticket says
- Customer, project **ML9**: Progress model `PC-ML09x-M3-S-901-ZZ-MB-B.06-TCB-MainStructure-DH-V4` shows installed/uninstalled status wrong for almost all elements, "as if cloned on top of each other". Video attached (id `66889`, `Recording 2026-10-28 084158.mp4`, 18.8 MB).
- Yash (`116813`) reproduced with element `c3fb0cb5-4bac-4527-bdca-96544742d1e3-000579fd` and asked if it is the model export.
- **Ilia (`116850`, 10-28 11:37, already answered):** tested DH-V4 in the web viewer; **every element exists twice, as a Generic Model and as Structural Framing, at the same spot.** A click picks one copy, the status goes on that one, the other keeps its old colour. Cause is the export, not the viewer. Suggested: re-export without the Generic Model copies and re-upload.
- Yash then moved Freshdesk to Waiting on customer (12:21), reopened (15:55) and set Waiting on customer again (15:56). Whether the suggestion was relayed in those hours is **not visible in Jira**.

## Reading
Ilia's finding is a measured observation (two copies at the same location), not a code inference. It fits the known shape that the viewer is a faithful renderer of what the export contains (`incidents/recurring-defect-patterns.md` Pattern 2). The only code claim worth keeping: status writes go to the element(s) picked by the click, so with duplicate geometry one copy stays unstatused. I did not re-read hc-frontend selection code this run; nothing in the ticket points at a viewer defect.

## Not verified
- That the customer has been sent the re-export advice (Freshdesk side).
- Whether other ML9 Progress models carry the same Generic Model duplication (would show on other tickets; none seen on the board).
- The video content (403, see below).

## Unopenable media
Attachment `66889` (video) and the inline screenshot in `116813`. Would settle: which model view the customer used and whether the duplication is visible on the same element ids Ilia tested. Not needed unless the customer disputes the export explanation.

## Next
Ball with the customer (Yash relays), one day old. Nothing owed by us. See `recommended-action.md`.
