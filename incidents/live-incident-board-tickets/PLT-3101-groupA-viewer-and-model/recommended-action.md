# PLT-3101 — recommended action (2026-09-02, first pass)

## Classification: **2 AND 3, split down the middle** — not a single class

Using Ilia's scheme, this ticket is two things wearing one number:

- **Class 2 — technical debt resolvable in-session, PR-able now.** `selectLinkedElements` and
  `isolateLinkedElements` discard unresolvable linked elements in silence
  (`use-linked-element-actions.ts:42-45`, `:77-80`). The user is told 835 and handed 819 with nothing
  naming the gap. Fixing *that* needs no CH08 data and no visual debugging: surface the count that
  could not be resolved. This is the piece that would have saved the whole ticket.
- **Class 3 — needs Ilia's access before anything can be said about CH08's 16.** Both data routes are
  blocked (prod MCP whitelist refuses CH08; the browser token expired). See `context.md` § Access.

**It is NOT class 1 (stale) — it is 4 hours old.** And it is not class 4: the mechanism is understood,
so no team discussion is needed yet.

## What is blocking, precisely

**One of two things, either is enough:**

1. A fresh `access_token` copied from a logged-in browser session — then the 16 can be named from
   `GET /api/v2/projects/8a00ce8b-4f84-4559-87cc-fb052da09803/...` the same way ATL08 was read on
   PLT-3099, or
2. CH08 (`8a00ce8b-4f84-4559-87cc-fb052da09803`) added to the prod MCP whitelist.

**Plus one 30-second check that needs no access at all:** open CH08 in the viewer, wait for models to
load, and look in the browser console for either
`Skipping model with unsupported file type:` or `Error getting mapping for model` — both from
`model-mapping-service.ts`. A hit there explains all 16 without any data work and changes the answer
entirely (a whole model unmapped, not stale links).

## Draft to Yash — 92 words, UNPOSTED

The hard no-Jira-action rule stands. A human pastes this.

> Hi Yash — your read is right, and the gap isn't cosmetic. The activity count is the link rows; the
> viewer can only select elements it can match to loaded model geometry, and it drops the rest
> silently. So 835 vs 819 is 16 links the viewer can't reach.
>
> They can't be unlinked either — unlinking works off the viewer selection, so an element you can't
> select can't be removed. Nothing the customer can do themselves.
>
> Before we say why: **can someone open CH08 and send the browser console when the model finishes
> loading?**

**What the draft deliberately does NOT say**, and why:

- **It does not call them ghost/stale links.** That is one of three causes and the least verifiable of
  the three from here (`context.md` § Mechanism). Naming it now is exactly the PLT-3099 mistake —
  asserting a cause from an arithmetic coincidence and retracting it a day later in front of the
  customer.
- **It does not promise remediation or timing.** Removing link rows needs a platform-api write, and no
  owner is lined up — same gap as PLT-3099's 1,239.
- **It does not conflate the 16 with the 3.** The customer's blocker is 3 not-installed elements; the
  count gap is 16. Nobody has shown the 3 are among the 16. Ask, don't assume.
- **It does not send them to the linked-elements list yet.** The panel *should* list all 835 including
  the unmapped ones (`useGroupedLinks.ts:52-79` never consults `elementId2DbId`), which would at least
  let them see the 16 — but that is read from code and unverified in a running app, and telling a
  blocked customer to go somewhere that then does not work costs more than waiting one check.

## Then what

Once the cause is known:
- **(b) a skipped/errored model** → project/model configuration fix, no code change, and it likely
  affects every activity on that model, not just CH08-MY-41.
- **(c) a model not loaded** → not a defect at all; the answer is which model to load.
- **(a) genuinely stale link rows** → data remediation via platform-api, plus the question of what
  writes them and why the model update left them behind. That is the one that needs a backend owner.

**Independent of all of the above**, raise the silent-drop fix (class 2 above). It is small, it is
right under any of the three causes, and it is the difference between a customer filing this ticket
and a customer seeing "16 linked elements could not be found in the loaded models".

---

# 2026-09-03 — measured. Two drafts, both UNPOSTED. The blocker on § What is needed is cleared.

The access blocker in the 09-02 section is gone (fresh token) and the 16-vs-3 arithmetic is resolved
in favour of **2**, both named. Reclassify: the CH08 half is no longer class 3 waiting on access — it
is a **data fix needing a write owner**, plus one question for the customer.

## Draft A — to Yash, customer-facing (70 words)

> Hi Yash — found them. Of the 835 linked elements, 833 are installed and 2 have no installation
> record at all, which is why nobody can see them:
>
> `12398bf3-dae3-4c29-8275-a97e1cb64d5c`
> `cad330b0-27b4-4b61-9bfe-1e80271775a5`
>
> They can't be marked installed or removed from the customer's side — with no element record there's
> nothing to select. We'll need to strip the two links our end.
>
> **The customer said 3 — can you check whether there's a third, or was that approximate?**

Does **not** promise timing on the removal: it needs a platform-api write and no owner is lined up.
Does **not** mention the 2,200 deleted mappings — that is our bug to fix, not the customer's problem,
and raising it invites a question we cannot yet answer.

## Draft B — to Sachin / Ali, the API bug (64 words)

> Hi — `GET /api/v2/projects/{projectId}/activities/{activityId}/links` looks like it ignores
> `isDeleted`.
>
> On CH08 activity CH08-MY-41 it returns 3,035 elements. The project feed `/elements/activity-links`
> gives 835 live and 2,200 deleted for the same activity — 835 matches `linkedElementCount` on the
> schedule row. Not pagination: same 3,035 unpaginated.
>
> CH08 has 258 soft-deleted models of 334, so the churn is real.
>
> **Can you confirm the endpoint should be filtering deleted mappings?**

Leads with the falsification (not pagination) because that is the first thing Ali asked on PLT-3095,
and states the corroborating number that makes 835 the trustworthy side.

## Order of operations

1. **Draft B first, or at least alongside A.** Until we know whether that endpoint is meant to filter,
   we do not know whether anything the customer reads is being fed the 3,035. It is also the cheapest
   thing to be wrong about.
2. **Draft A** — answers the customer, and the count question needs asking before we touch data.
3. **Then the write** to remove the 2 stale mappings, once an owner exists.
4. **Independently, the class-2 FE fix**: surface the elements that could not be resolved instead of
   dropping them at three separate points (`use-linked-element-actions.ts:43`,
   `linking-service.ts:688`, `collectSelectableDbIds.ts:20`). Nothing in the app shows the customer
   these elements today, in any surface. That is the defect that generated this ticket.

## Still unmeasured, and say so if asked

**Yash's 819.** 835 − 819 = 16 lives inside the live 835; the 2 account for part of it and the other
14 have not been reproduced from this side. Ask him to re-read the number before anyone tries to
explain it — the mechanism in `context.md` § Mechanism covers it, but the figure itself is one
observation.
