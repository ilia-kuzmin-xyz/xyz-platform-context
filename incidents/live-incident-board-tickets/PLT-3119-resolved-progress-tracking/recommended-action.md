# PLT-3119 — recommended action (DRAFT ONLY — execute nothing)

## 2026-09-15 (scheduled) — unchanged. The 09-14 draft below still stands, still unsent.

No Jira movement since 09-10 (see `context.md` § 2026-09-15). Confidence, classification and the
Darminder draft below are unchanged; restating only because a day passed with no action taken.

## ⚠️ 2026-09-14 — CURRENT recommendation. The 2026-09-10 draft below is superseded, not deleted.

Both passes independently reached **action class 1** (internal fact-gathering owed by a named
person, not the customer) and the same underlying question. This section's draft supersedes the
09-10 one below because the 09-10 draft bundles two questions into one bolded sentence, which
breaks the one-question rule; this draft asks a single, closed one.

**Not class 2/3** — nothing to build or see in-app; it isn't established there's a bug rather than
a legacy data state. **Not class 4** — the question is narrow and answerable by one person.

**Not customer-facing.** Freshdesk #7907 is already "Waiting on customer" (111943) — the ball is
correctly parked there. Re-opening that conversation now would be premature; this is purely to
confirm the internal explanation is right before anyone relies on it further.

**Assumption this rests on:** nobody has yet checked AEX01's actual weighting value or its
portfolio-join date — comment 111942 states the cause as settled fact from a "group discussion,"
not from a data read.

**Draft — to Darminder, unposted (78 words):**

> Before this settles as the answer for AEX01: do you know if it was added to the Portfolio before
> 14 August? If it was, that lines up cleanly, since the weighting-consistency check only stops new
> conflicts and wouldn't have caught one already there. If it joined after that date, something's
> getting past the check and that's worth a separate look. **Do you know when AEX01 was added to
> the portfolio?**

**Also worth doing, not blocking:** open attachment `64304` first (14KB, likely a tight crop of the
weighting field/badge) — if it already shows AEX01's weighting next to a portfolio-mismatch message,
the question above is answered for free.

**What not to do:**
- Don't re-open the thread with the customer yet — they already have an answer and are mid-action.
- Don't file this as a duplicate of PLT-2917 — the mechanisms differ (see `context.md` §"relation
  to PLT-2917"); cross-reference once confirmed, don't merge.
- Don't promote the "calculation logic conflict" into `recurring-defect-patterns.md` Pattern 3 yet
  — the code-side rule is real but its application to AEX01 specifically is unconfirmed.

**Status/assignee:** no change recommended.

**Confidence this is the right next step: 7/10** (unchanged across both passes) — it closes the one
verification gap that matters, costs one message to one named person, and doesn't touch the healthy
customer-facing side. Not higher because the PowerBI query itself remains unverifiable from this
session regardless of Darminder's answer.

---

## 2026-09-10 — original draft (HISTORICAL — superseded above; do not post as written, two questions in one bolded sentence)

**Classification: class 4** (ambiguous, needs a decision) — leaning class 1 once one fact lands.
*(2026-09-14 note: the second pass converged on class 1 outright rather than "leaning" — the
"which system" half of the question below turned out answerable from code alone: Darminder's own
111940 comment already shows our native page is unaffected, so only the weighting/join-date half
remains genuinely open.)*

**Draft to Darminder — internal, UNPOSTED (96 words):**

> Hi Darminder, one thing doesn't add up before this goes back to the customer: on our own portfolio
> dashboard, Milestone Performance and the Projects widget read the exact same project data, so
> nothing can appear in one but not the other there. That suggests the customer's Project List is the
> separate PowerBI view, not ours. Can you confirm whether Project List and Milestone Performance
> are the same system, and what AEX01's progress calculation setting is versus the rest of APLD's
> projects? That tells us if this is a real gap or just a setting to align.

**Why not a customer-facing message yet (still holds):** Freshdesk #7907 is already "Waiting on
customer" — the ball is parked there, not on us. Sending anything now would either repeat what Yash
may already have relayed, or hand them an unconfirmed mechanism.

**Closing condition (still holds):** cause (portfolio weighting inconsistency) is asserted, not
shown; trigger presumably "AEX01 added/enabled with different weighting than peers," unconfirmed;
cohort entirely open. Do not close or downgrade until at least the join-date question is answered.
