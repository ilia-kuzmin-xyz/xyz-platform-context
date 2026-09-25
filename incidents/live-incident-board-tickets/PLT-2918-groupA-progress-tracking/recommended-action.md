# PLT-2918 — recommended action (DRAFT ONLY — execute nothing)

## 2026-09-25 (scheduled) — unchanged. 09-23 draft to Rishi (~70 words) still unsent.

Live re-fetch confirms zero movement since 09-23 (`context.md` this date). Action class unchanged:
1, interpretive question owed by whoever owns the ticket now (Rishi). **No Jira action was taken
by this run.**

## 2026-09-15 (scheduled) — no change; human silence now 21 days, draft still unsent

Fourth consecutive confirmed-unchanged pass (09-09 → 09-11 → 09-14 → 09-15). Live fetch matches
09-14 field-for-field (see `context.md` § 2026-09-15). Action class unchanged: 1.

## 2026-09-14 — no change; the 09-09 draft (below, "88 words") still stands, still unsent

Third consecutive confirmed-unchanged pass (09-09 → 09-11 → 09-14): live `getJiraIssue` fetch this
run matches the 09-11 record field-for-field (`context.md § 2026-09-14` has the full diff). No new
comment, no new attachment, status still `Open`. Human silence in Jira is now **20 days** (last
human comment `110385`, Mostafa, 08-25), up from 17 on 09-11.

**Action class confirmed: 1 (stale, unresponded, on us).** Same reasoning as 09-09/09-11 — the
code fix was independently re-verified intact on the current checkout this run
(`investigation-log.md § 2026-09-14`), so there is still no code to write; nothing is settled by
looking at the app; there is no disagreement needing a meeting. The single blocking next step is
still the same: get one current, dated activity code from Paddy that lets us tell "old July hole,
never restored" from "new loss" — that is the one thing that unblocks everything else on this
ticket, and it has been sitting unsent since 09-09.

**Word count re-checked against the current draft below: still 88 words**, 3 sentences, one bolded
closed question — within the 100-word / six-sentence limit. No edit needed; not reproduced a
second time in this section to avoid drift between copies — see the 09-09 entry below for the
exact text.

**Nothing here overrides the 09-09/09-11 board-move guidance:** leave it `Open`; do not let an
"Automation for Jira" rule quietly carry it to `Done` again (see `context.md § 2026-09-09`).

## Chosen action: (a) — post the first analysis comment: state the code-verified mechanism, name the ONE data check that pins delete-vs-overwrite, and ask the ONE closed trigger question

This ticket is fresh (Open, no analysis yet). The single highest-value move is to (1) convert the client's report into a mechanism the team can act on, (2) run/assign the one data diff that decides *deleted vs re-pointed*, and (3) get the dated "why now" question to an owner **now**, before the trail goes cold (playbook: an unanswered "why now" is an open incident wearing a closed label). Keep **Ilia Kuzmin** (assignee) as owner of the code + data step; route the trigger question to **Yash Patel** for the client/PM side.

## Why this and not the others

- **Not "Ready For Development" yet.** We have identified a real destructive-save vector in code (`saveDataMapping` deletes null category types across *all* types; edits cascade to descendants and clear descendant types — see `context.md §Mechanism B/C`). But we have **not** confirmed it fired for AUS01/Precast, nor whether the mappings were *deleted* or *re-pointed to Sequence*, nor the trigger. Routing to dev now risks fixing the wrong vector (FE merge-on-save vs re-import re-keying is a data/BE fix). The playbook is explicit: confirm mechanism with a required-vs-actual diff **before** routing. One data check flips this to a precisely scoped dev ticket.
- **Not "With Technical Support."** We do not need anything further from the client to *progress the investigation* — we already have a live-broken sample (`A4300`, AREA G/H → empty) and the mechanism. The next step is an internal data/history query, not a customer ask. The one thing we do want from the client side (was there a re-upload?) is a PM/ops question routed through Yash in the same comment, not a hand-back of the ticket. Handing to TS now would just park it.
- **Not "Blocked."** Nothing external blocks us; the data/history check is in our own hands (Activity API v2 / DB on AUS01). The trigger question runs in parallel — it does not block the data check.

## Owner map (one question, one owner — playbook message-craft)
- **Ilia Kuzmin:** the data/history check (delete vs overwrite; when/by whom).
- **Yash Patel → client/PM:** the single dated trigger question (re-upload?).

---

## Draft — analysis comment (author: Ilia Kuzmin; @ Yash Patel)

Playbook style: state + mechanism + one closed data step + one dated trigger question; explicit scoping; no hedging.

> Looked into PLT-2918 (AUS01, Precast WBS Location mappings gone; `A4300` = AREA G/H in the export, empty in the viewer). Mechanism, then two asks.
>
> **What "WBS Location" is:** it's one of the project's activity *category types* (same family as Phase/Discipline/Package/Sequence) — a mapping between an activity and a category, not a value parsed from the schedule's WBS tree. So "removed" means the activity↔category mapping is gone or re-pointed, not that the model changed.
>
> **How it can disappear silently (confirmed in code):** the data-mapping panel's Save is a *destructive diff* — for a changed activity it deletes the stored mapping of **any** category type that is empty in memory, including types the user never touched. Editing one category also **cascades to every child activity** and **clears the child category types**. So a single edit on a Precast parent/WBS node can mark the whole Precast subtree as changed and, on Save, delete WBS Location across the entire package — which matches "the whole package was removed."
>
> **Scoping:** this is the schedule activity-category mapping (Gantt data-mapping panel), not the 3D viewer, and not the P6 WBS hierarchy parsed at upload — different concept with the same letters.
>
> **@Yash — one for the client/PM (dated cause):** was the **AUS01 schedule re-uploaded/re-imported** between the export they're comparing to and now — and was anyone editing the data-mapping panel (e.g. steel-frame "sequences") in that window? A re-import carries no category values, so it's the leading trigger to rule in/out.
>
> I'll run the data check below to confirm deleted-vs-re-pointed before we scope a fix.

---

## The one data/evidence step to run (owner: Ilia; needs Activity API v2 / DB on AUS01)

The smallest broken-vs-working diff (playbook move #3) — turns the hypothesis into a confirmed cause and decides FE-vs-data ownership:

1. For **`A4300`** and 2-3 other Precast activities: do the persisted **WBS Location** category mappings **still exist** (rows present, just not rendering) or were they **deleted**?
   - Still exist → rendering/hydration bug (ID-keying, `context.md §Mechanism D`) — FE, non-destructive.
   - Deleted → the destructive Save/cascade (`§Mechanism B/C`) fired — confirm blast radius.
   - Re-pointed to a **Sequence** category → the descendant-type-clearing/hierarchy path — confirm the Precast type hierarchy vs steel frame's.
2. If there is a **lastModified / audit trail** on the mapping records: when and by whom were the Precast WBS Location rows last changed? Line this up against the trigger window (re-upload / panel edit / deploy).
3. **Broken-vs-working within AUS01:** confirm steel-frame / other-package WBS Locations are intact today. If yes, the cause is scoped to the Precast subtree (supports the cascade hypothesis, rules out a global hydration failure).

## Follow-through the human should own (not executed here)

- **After the data check:** if the destructive Save/cascade is confirmed → scope a **FE fix** (Save should merge, not delete category types the user never edited; and re-evaluate descendant-type clearing so a parent edit can't silently wipe a whole package) → then **Ready For Development**, owner Darminder. If it's a re-import re-keying activities → **data/BE** track and consider re-filing the domain slug to `data-pipeline`.
- **Answer "why now" (playbook Q5):** don't let the re-upload/deploy question drop — assign it an owner and get a dated answer.
- **Cohort sweep (playbook Q6):** once confirmed, enumerate **all** AUS01 activities (Precast first, then any package edited in the same window) whose WBS Location — and possibly phase/discipline/package — was wiped; remediate in bulk, don't wait for the next report.
- **Read the 4 attachments (NEEDS HUMAN):** they disambiguate empty-column vs Sequence-values, which decides the exact fix wording.
- **Post-close:** add a `dashboard/pitfalls.md` entry — "data-mapping Save is a destructive per-type diff: it deletes stored mappings for every category type null on the in-memory activity, and edits cascade to descendants clearing descendant types — a single edit can wipe a whole package's WBS Location." (Not editing outside this folder per task constraints — noting only.)

## 2026-08-26 — recommended action: separate "old unrecovered gap" vs "new post-fix recurrence" vs "Power BI export issue" before replying to the customer

**Chosen action:** post one comment (owner Ilia, @ Yash and @ Mostafa) that (1) states the fix is
shipped and dates it, so any *new* loss after 2026-08-17 is not the same code path; (2) asks
whether the original ~2k-mapping historic gap (Precast/Roof/Earthworks/Painting) was ever actually
restored — that recovery-plan thread from 07-23 has no confirmed outcome on this ticket; (3) asks
for one fresh, dated live-broken sample activity ID from Paddy (an `A4300`-style example) to tell
old-hole vs new-loss; (4) asks Mostafa to substantiate the Power BI theory with something checkable,
since if true this isn't a viewer/mapping-data ticket at all.

**Why this and not the others:**
- **Not a straight reply to the customer yet.** Answering "yes it's fixed" risks being wrong if
  the historic gap was never backfilled (Paddy would still see old holes and rightly call it
  "still an issue"); answering "we're still investigating" risks being wrong if the real fix
  already shipped and this is a Power BI-side artifact entirely outside our code. The playbook step
  here is the same as 07-22: get one live-broken sample before asserting a mechanism.
- **Not "Ready For Development."** The 08-17 fix already addressed the confirmed code defect.
  There is no second confirmed FE bug yet — routing to dev now would be guessing which of three
  hypotheses is live.
- **Not silently left "With Customer."** The ticket has sat without an internal data recheck since
  08-11; a customer-facing "still weekly" claim without one is exactly the kind of open incident
  wearing a closed label the playbook warns about.

**Draft comment:**

> @Yash Patel — before we reply to Paddy: the Save-bug fix (destructive category-mapping delete)
> shipped in 26.3.4 on 2026-08-17. Any *new* WBS Location loss after that date points to something
> other than the bug we fixed, so I don't want to guess which.
>
> Three things first:
> 1. Was the original ~2k-mapping gap (Precast 19/21, Roof 37/40, Earthworks 52/196, Painting
>    34/410, from my 07-22 numbers) ever actually restored? I don't see a confirmed outcome on this
>    ticket for the BE-restore-via-Sachin / script-re-apply-from-export plan from my 07-23 comment.
>    If it never ran, Paddy may simply still be looking at the original hole, not a new one.
> 2. Can we get one fresh, dated live-broken sample from Paddy — an activity ID, like `A4300` last
>    time — for the current "weekly" recurrence? That's the fastest way to tell old-hole vs new-loss.
> 3. @Mostafa — what specifically points at the Power BI export rather than the underlying mapping
>    data? If the `activity_category_mapping` rows are correct and only the export/report is wrong,
>    this is a different team's ticket, not this one.
>
> I'll re-run the AUS01 WBS Location count query (same as 07-22) to see if the hole has grown,
> shrunk, or stayed flat since the fix deployed.

**Owner map:** Ilia — re-run the data count check, compare pre/post 08-17. Yash — get one dated
fresh sample activity ID from Paddy. Mostafa — substantiate or rule out the Power BI theory.

**Also flag, not actioned:** the `not_testable` label was added 08-11 based on a staging repro
attempt that predates this recurrence report — worth a second look by Radu/Gennaro given the
customer says it's still happening, but that's their call, not this comment's.

---

## 2026-09-09 — ACTION CLASS 1 (stale, unresponded). Chase Yash for one activity code.

**Supersedes the 08-26 three-question draft above as the thing to send — do not post that one.**
It asked three questions of two people and was never sent in 14 days, which is the predictable fate
of a three-question comment. Its content is still correct and is preserved above; the difference is
that this one asks for a single value from a single person. The 08-26 draft's question 1 (was the
gap ever restored?) is not asked here because `investigation-log.md § 2026-09-09` now answers it
from our own records: there is no record it ever ran.

**Class 1 — "stale, unresponded; it needs following up by a named person."** Not class 2: there is
no code to write, the shipped fix was re-verified intact this run. Not class 3: nothing here is
settled by looking at the app — the open question is about data and about what the customer said.
Not class 4: there is no disagreement to convene a meeting over, just a question nobody has asked.

**Who owes what:** Yash owes the ticket a note on what Paddy actually said when Freshdesk #7461
reopened on 09-08 — he handled it in Freshdesk in 41 minutes and wrote nothing in Jira, so the
customer's side of the last two weeks is invisible to us. Mostafa owes his 08-25 Power BI theory
something checkable, or a withdrawal; it has stood unsupported for 15 days and is being used as an
explanation. Ilia owes the data question below.

**Assumption this draft rests on, stated here and not in the message:** that the July restore never
ran, inferred from its absence in the ticket, in this folder and in the whole context repo, plus our
own 07-28 "not started" note. If Ilia in fact ran it, the draft's premise is wrong and the fresh
activity code becomes evidence of a *new* loss instead — the question still works, only the
interpretation changes.

### Draft — Jira comment on PLT-2918, to Yash Patel (author: Ilia) — **88 words**

> Paddy has reopened this twice since the fix shipped and we still can't tell whether he's seeing
> something new or the July losses, which I don't have a record of us ever restoring. One activity
> code from this week's report settles it: if it's one that went missing in July there's nothing new
> to fix and it just needs re-mapping, and if it isn't, we have a live bug to chase. **Can you get me
> one activity code from Paddy that's showing the wrong WBS Location this week?**

(88 words, 3 sentences, one bolded closed question. DRAFT ONLY — nothing was posted.)

### What Ilia can do without waiting for anyone

Re-run the 07-28 mapping census on AUS01 — project `fd0af178-a9a4-413a-ad77-537219715889`,
categoryTypeId `8f6483fc-c737-474e-bdd3-680584e04414`, `GET /api/v2/projects/{id}/activities/mapping`.
If the WBS Location count is still ~7,879 of 10,133, the hole has not moved since July and the
restore certainly never ran; if it has grown, something is still deleting and that is a new
incident. This needs no customer, no Yash and no Mostafa, and it is the single cheapest thing
outstanding on this ticket.

### Board move to propose (do not perform)

Leave it `Open` — it genuinely is on us. **Do not let it go `Done`:** an "Automation for Jira" rule
mirrors Freshdesk state onto this ticket's status and already moved it to `Done` once, on 09-04, for
71 seconds, purely because the customer closed #7461. Details and the changelog ids are in
`context.md § 2026-09-09`. If it needs a status at all, `With Technical Support` is defensible once
the draft above is sent, since the next input genuinely comes from the customer via Yash — but only
after it is sent, not instead of sending it.

### Flag for a human, prominently

This is assigned to Ilia, has had **no human comment for 15 days**, the customer has reopened twice
in that window, and our own records say the data was never repaired. The code fix shipped in 26.3.4
on 08-17 was for the mechanism; nobody put the ~2,254 missing AUS01 WBS Locations back. Until that
is either done or ruled out, every reply to Paddy risks being the fourth one that does not change
what he sees on Monday.

---

## 2026-09-11 (scheduled) — no change, draft still stands as the thing to send

Fresh `getJiraIssue` fetch this run matches the 09-09 record field-for-field (`context.md` §
2026-09-11 has the diff table) — no new comment, no new attachment, status still `Open`. **The
09-09 draft below is not superseded and nothing here needed re-drafting.** It is now 2 days older
and still unsent — human silence in Jira is **17 days** (last human comment 110385, 08-25), up
from 15 on 09-09.

The draft's word count, re-checked against the current rule: **88 words**, 3 sentences, one bolded
closed question — still within the 100-word / six-sentence limit. No edit needed.

**Action class confirmed: 1 (stale, unresponded, on us).** Same reasoning as 09-09; restated in
`context.md` § 2026-09-11 rather than duplicated here.

---

## 2026-09-22 (scheduled) — unchanged, chase draft now 13 days unsent, human silence 28 days

Live re-fetch confirms zero technical movement (two Freshdesk-echo comments only, last on 09-18).
Action class unchanged: 1 — stale, unresponded, on us. The 09-09 chase-Yash draft (88 words) stands
as written. **No Jira action was taken by this run.**

## 2026-09-23 (scheduled) — RETIRE the 09-09 chase draft (superseded by live events); new action is a scoping question to Rishi, not a chase.

**Do not send the 09-09/09-11/09-14 chase-Yash draft.** It asked Yash to fetch one live-broken
activity code from the customer to distinguish old-hole-never-backfilled from a fresh recurrence.
Rishi did the equivalent check himself on 09-22 (`context.md` § 2026-09-23, comment `112743`) —
opened the editor and confirmed the Precast activities are currently unmapped. Resending a request
for something already independently obtained would read as not having read the ticket.

**Action class:** still 1 (stale, unresponded, on us) for the *narrow* open question Rishi himself
asked and nobody answered — but the shape of the ask has changed from "get us data" to "help us
interpret data we already have."

**What's actually still open:** Rishi's own question in comment `112743` — *"did the user report
that the original issue of missing mappings had occurred? Or were they removed?"* — is unanswered
in-thread. That is the one fact that decides old-hole vs. new-loss, and it is a question for
**whoever now owns this** (assignee moved to Rishi 09-22 — see `context.md`) to either answer from
the customer's own words already relayed in comment `112739` (they said "already mapped/linked,"
which reads as *not* reporting fresh removal — the customer believes the mapping is fine and only
the filter is broken) or to ask Yash for the customer's exact words if that inference is too thin.

### Draft — to whoever now owns the ticket (Rishi, current assignee) — DRAFT ONLY, not posted (approx. 70 words)

> Reading back through this: the customer's own words in 112739 say the elements are "already
> mapped/linked in the Web Viewer" — they believe the mapping is fine and only the dashboard filter
> is broken. What you found in the editor (112743) contradicts that belief, not their prior report.
> That reads as the same never-backfilled Precast/AUS01 gap from July (see 107939), not a fresh
> loss — but worth confirming with Paddy directly rather than inferring it from phrasing alone.

**Why this and not a repeat chase:** the data this ticket has been missing for two months — a live,
current confirmation that the mapping gap still exists — arrived organically on 09-22. Re-asking for
it would waste the goodwill of someone (Rishi) who already did the work. The remaining gap is
interpretive, not evidential, and is cheap to close with the message above or an equivalent.

**Board move:** none recommended. `Open` remains correct; the ball is with us to close the
interpretation loop, not with the customer.

**No Jira action was taken by this run.**
