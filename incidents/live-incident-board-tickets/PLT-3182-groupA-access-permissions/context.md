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

---

## 2026-10-01 — what changed since 09-30 (supersedes "Shape of the failure" above)

Fresh fetch with comments (9 comments, newest `113485`, 09-30 14:10). Four comments landed after the one
the 09-30 run saw (`113427`); the folder had only the first.

- `113433` Rishi (09-30 09:59): **these users are Organisation Admins; the API rejects removal requests from
  Project Admins.** Fix is for an XYZ Organisation Admin to remove them. He will raise a ticket to improve the
  error message.
- `113477` Yash relays the customer: *who has Organisation Admin and can remove them? They have left the
  business.* The customer cleared the same people from every other project, so the block is specific to these 10
  pairs.
- `113480` Rishi: they are **tenant-level** users, he has no access to those projects and cannot remove them;
  tags Pietro, *"do you have the ability to do this?"*
- `113485` Yash to Pietro (13:38, edited 14:10): can he remove them via tenant logins? **No answer yet.**

**Mechanism is now named** (by Rishi, backend, taken on trust, not verified here): the removal is refused
because the target is an organisation/tenant admin and the caller is only a project admin. The 09-30 candidate
list (last admin, stale row, ...) is superseded by this; "contact tied to a role IAM refuses to detach" was the
nearest guess. The 09-30 draft to Sergey is **superseded, do not send it.**

**Ball:** Pietro (asked 09-30 ~13:38, about 20 h with no reply on 10-01). Not the customer, not Rishi.

**Frontend check (this run).** The UI cannot tell an org admin from a project member before the click:
`canRemovePerson` is the only gate (`TeamContent.tsx:218-223`), and the failure branch shows one generic toast
and drops the server message (`TeamContent.tsx:857-861`). So Rishi's planned "improve the error message" ticket
is **two changes, not one**: the IAM response needs a clear message, and the toast must show it. A backend-only
fix would still show "Failed to remove ...". Not verified at runtime.

**Unopenable media.** Attachment `65456` and the inline image in `113427` are now **not needed**: the mechanism
is stated by Rishi. They would only confirm the exact HTTP status.

**Still unverified:** that all 10 pairs are org admins (Rishi says "these users" but only Eoin on PA12 was
actually tried); who can remove them (Pietro); whether the exposure matters (ex-employees keep dashboard access
until someone acts).

## 2026-10-02 (scheduled) — unchanged
Fresh fetch with comments. Newest comment still `113485` (Yash, 09-30 13:38). Pietro has not replied, about 44 h; status Open. The 10-01 draft to Pietro stands, now a day more urgent because the ex-employees still hold access. No Jira action was taken.

## 2026-10-05 (scheduled) — Sergey (api-v1) confirmed the mechanism and removed the roles; ball is now with the customer

Fresh fetch with comments (12 comments, newest `113728`, 10-02 14:22). Status moved **Open → With Customer**.
Three comments after the folder's last read (`113485`):

- `113717` Sergey (10-02 13:56): *all these users are tenant admins; I removed their global roles; try to delete them again.* That is the backend owner confirming Rishi's `113433/113480` mechanism **for all ten pairs** (the 10-01 note flagged "all 10 are org admins" as unverified; it is now verified by the api-v1 owner, not by us). Pietro was never needed; his 09-30 question is moot.
- `113727` Yash: Freshdesk 8130 set to *Waiting on customer*. `113728` Yash to Sergey: customer asked to retry and report.

**Ball:** the customer (Dario) retries; Yash relays. Nothing is owed by us. One working day elapsed (Fri 14:22 to Mon).
**Follow-up that exists:** `PLT-3183` (Bug, Rishi, Open, created 09-30 10:03) "Team tab: show why removing an organisation admin from a project fails". Its title is front-end, so the toast half (`TeamContent.tsx:857-861`, server message dropped) has a home. Not verified that it also covers the IAM response text.
**Class: 1, parked with customer.** Chase only if no outcome by Wed 10-07 (Yash's channel, no draft needed from us).
**Unverified:** that the retry works for all ten (customer has not reported); whether any of the ten has a project-level (not global) role that would also block.
**Process note worth a human decision (not ours to open):** ex-employees kept tenant admin roles after leaving. That is an offboarding gap, separate from this ticket.
No Jira action was taken.
