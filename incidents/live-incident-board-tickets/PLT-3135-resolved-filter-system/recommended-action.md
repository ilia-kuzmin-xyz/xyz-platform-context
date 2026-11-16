# PLT-3135 — recommended action (2026-09-17, first pass)

## Classification: **2 — resolvable in-session, no visual debugging needed**

Darminder asked a specific, closed question at 13:02 on 09-17 and it went to two backend engineers
(Sachin, Ali) with no reply yet:

> *"Maybe if we pass parentCategoryType or parentcategory id from frontend payload it would help set
> this correctly?"*

That question is answerable by reading our own code, and this run answered it — see `context.md`
§ Code trace. The answer has two halves, and the second half is the one nobody on the thread has:

1. **The frontend does not currently send `parentCategoryType` on this screen.** The Attributes save
   payload is `categoryType, categoryName, categoryDescription, parentCategoryName, level` — the
   parent's type is computed and then dropped before the request
   (`useAttributeSliderMethods.ts:829-835`; also `useAttributeState.ts:837-843`). So Darminder's
   proposal is a real gap, not a redundant suggestion.
2. **Sending it alone would change nothing.** The frontend POSTs with `new_format: true`
   (`activity-api-service.ts:109-115`), and that branch of the API re-maps the body to five keys that
   do not include `parentCategoryType` (`activities.categories.controller.ts:45-58`;
   `ingress.ts:129-135`). It would be discarded before the database saw it. The **old** format carries
   the field (`ingress.ts:137-143`), which is probably why it looks like the field already works.

**Not class 1** — one day old, actively worked, nobody is stalling. **Not class 3** — nothing here
needs the app on screen; the two facts are in source. **Not class 4** — it is not ambiguous or global;
it is a concrete contract gap with a named owner already in the thread.

**Worth adding to the reply as a free bonus, but keep it out of the message to stay short** (put it in
the ticket's own thread later, or say it verbally): `validateCategoryTypeHierarchy`
(`activities.categories.helpers.ts:99-124`) is exactly the rule that would reject a Package parented to
a `Zone`, and its only guard is `if (cat.parentCategoryType)` at `:101` — the field that was stripped
two functions earlier. So the hierarchy validation is dead on every new-format request. Restoring the
field switches that check back on for free, which is a second reason to fix it at the contract rather
than inside the stored procedure.

## The one thing that would falsify this before anyone codes it

Attachment `64835` — Darminder's own screenshot of the POST body. If `parentCategoryType` **is** in it,
the trace above is reading the wrong save path and point 1 is wrong (point 2 stands regardless). A
human with Jira access can settle it in ten seconds; this session gets 403 on attachment bytes.

## Proposed next action

**Reply to Darminder on the ticket** with the draft below, answering his question and naming what the
fix touches. Do not move the ticket: In Analysis is correct while the backend question is open. Do not
chase Sachin or Ali yet — the reply reframes what they are being asked, and should land first.

## Draft reply (97 words, 5 sentences) — NOT posted

Darminder, we checked the save path in the web app and it does not actually send the parent's type at
the moment, only the parent's name and level. The backend's new save format also has no field for it,
so it is dropped even when sent. That fits what you saw: with two attributes both called Zone 1, the
parent is matched by name alone and the wrong one wins. So the fix needs both sides, not just the
backend. **Shall we add the parent's type and id to both the payload and the new save format?**

## What this session did NOT do

No Jira action of any kind — no comment, no transition, no assignment, no @-mention. The draft above
is text for a human to send or discard. No code was written in either repository, nothing was built or
run, and no git operation was performed.

---

## 2026-09-22 — unchanged, open question now 5 days unanswered

Live re-fetch confirms zero movement. Draft reply above (97 words) still the right call, still
unposted. **No Jira action was taken by this run.**
