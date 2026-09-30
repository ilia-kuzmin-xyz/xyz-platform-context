# PLT-3182 — Unable to remove ex-XYZ users from Dashboard projects

**First seen 2026-09-30 run** (created 09-30 08:11, one comment 08:14). Medium · reporter Yash Patel ·
assignee **Rishi Bhugobaun** · status **Open**. Domain: `access-permissions` (project team membership).
No domain doc for this; `PLT-2879-groupA-access-permissions` is the only related folder (role/authority gate,
different mechanism).

## Report
Customer (Dario) reviewed ~50 dashboard projects and removed ex-XYZ employees. He could not remove 10
user-project pairs: **Fabio Bunger** (PMG - DS2, MSD CARLOW MERCK), **Eoin Manning** (EQX - FR16X, EQX - PA13.2X,
EQX-MD4X, DATA CENTER SAMPLE, EQX-ML7.2.3, THE MISSION CRITICAL DASHBOARD, EQX-PA12 PHASE 1&2-XV2),
**Marta Sanchez** (DATA CENTER SAMPLE). Asks us to remove them. Yash (`113427`, to Rishi): he also tried
Eoin on EQX-PA12 PHASE 1&2-XV2 and **got an error, shown in an image** (inline in the comment; attachment
`65456`, "Screenshot 2026-09-29 213203"). The error text is not in any text field.

## Code read (hc-frontend) — how the UI removes a user
- Menu item shown only with project authority `PROJECT_PERSON_REMOVE` (`TeamContent.tsx:218-223, 1248, 1309`).
- Remove → `serviceProvider.Projects.detachContactFromProject(contactId, projectId)`
  (`TeamContent.tsx:808` pending users, `:852` active users after a confirm modal).
- That is `DELETE ms/iam/api/contacts/{contactId}/projects?projectId={projectId}`
  (`services/projectService.ts:142-144`) — the **v1 IAM microservice**, so any rule refusing the removal lives
  there, not in hc-frontend.
- On failure the UI shows only the generic toast `Failed to remove <name> from project`
  (`TeamContent.tsx:814-815, 857-861`); the server message is discarded. So **the customer's real error text
  exists only in that screenshot or in IAM logs.**
- Call sites for the same delete: `TeamContent.tsx:514,581,808,852`, `CompanyDetailsSlider.tsx:202,246,416,478`.
- Side observation, not this ticket: `ProjectInviteCompletePage.tsx:217` calls the same function with arguments
  in the order `(projectId, contactId)` while every other caller uses `(contactId, projectId)` (signature names the
  first param `login`). Looks like a swapped-argument bug on the invite "cancel" path. Unverified at runtime.

## Shape of the failure (inferred, NOT verified)
Only three people fail, one of them on 7 of 10 pairs, out of ~50 projects the customer did clear. So removal
works in general and something specific to these contacts or projects blocks it. Candidates, none tested:
last admin / owner of the project; contact tied to a company or role that IAM refuses to detach; a stale
contact-project row; the authority check for the customer's own role on those projects. Which one is true
is unknowable without the error body.

## Unopenable media (session-wide 403)
Attachment `65456` and the inline image in `113427`. **Would settle:** the HTTP status and message of the
failed removal, which separates "rule blocked it" from "permission denied" from "server error". Please paste
the text into this folder.

## Why it matters beyond the ticket
These are **ex-employees of the customer still holding dashboard access**. Priority is Medium; the exposure is
an access-control one. Worth treating as time-sensitive even if the mechanism is boring.

## Unverified
Everything under "Shape of the failure". Whether the users are still active in IAM. Whether Rishi has started.
