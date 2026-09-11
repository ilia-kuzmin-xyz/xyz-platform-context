# PLT-2815 — Recommended action

> **Revised 2026-07-30** (was: "(c) keep With Customer — nudge the client"). Escalated from a soft
> nudge to a direct close-out. Rationale for the change is at the bottom (§ Why this changed).

## Chosen: **Close PLT-2815** — post the closing comment below, then transition to **Done**

Not another nudge. This ticket has been static for **24 days** (last update 2026-07-06), the
engineering question is settled at 9/10 confidence, the product decision was taken on 2026-06-23, and
the customer-facing **Freshdesk #7126 is already Closed**. There is nothing left to wait for — the Jira
is orphaned open behind a closed support ticket. Leaving it in `With Customer` misreports the board:
it implies a live client conversation that does not exist.

**Owner:** Yash Patel (assignee + coordinator). One action, executable solo, no client contact needed.

---

### 1. Closing comment to post on PLT-2815

> Closing this out. Summary of the outcome for the record:
>
> **Not a defect — working as specified.** The two figures the customer reported for CSA / Underground
> Services on ML9 reproduce exactly from the shipped Issue Rework Reference Table:
> - **Category 3 = €684.00** — base **£600.00** × EUR factor 1.14, matched by the **package-specific**
>   rule (exact Category + Discipline + Package).
> - **Category 4 = €843.60** — base **£740.00** × 1.14, matched by the **generic CSA fallback** rule,
>   because no `Category 4 | CSA | Underground Services` row exists.
>
> **Root cause of the apparent inversion is reference *data*, not code** — two compounding facts:
> (1) the two values are produced by *different* lookup rules, so a package-specific Cat 3 is being
> compared against a discipline-level fallback Cat 4; and (2) the `Cat3 | CSA | Underground Services =
> £600` figure is anomalously low — below the generic Cat 3 CSA (£2,003.33) *and* below the generic
> Cat 4 CSA (£740.00). The calculation code faithfully implements the documented fallback ladder in the
> [Issue Rework Reference Table](https://xyzreality.atlassian.net/wiki/spaces/UX/pages/1630633988/Issue+Rework+Reference+Table)
> (product/UX-owned, authored by Pietro Desiato). Not a regression — no deploy involved; latent data
> shape.
>
> **Product decision:** Mostafa Kamel Hussien, 2026-06-23 — *"leave it as intended for now; if they have
> any questions regarding the numbers, they can reach out to Josh from customer success."*
>
> **Customer side:** Freshdesk **#7126 is Closed** (2026-07-06). No further response from the customer
> since. Closing the Jira to match.
>
> Any future change to these figures is a **reference-table data update owned by product (Mostafa /
> Pietro)** — see the follow-up note below — not development work on this ticket.

### 2. Transition

- **`With Customer` → `Done`.**
- **Resolution:** the "as designed / not a bug / won't fix" value — pick whichever of those exists in
  the PLT scheme (I have not queried the transition screen; **do not** close with an empty resolution,
  the ticket currently has `resolution = null` and closing without one leaves it ambiguous).
- **Do not** route to Ready For Development — there is no code change. **Do not** route to Blocked —
  nothing is blocking. **Do not** re-contact the client to obtain permission to close; the support
  ticket they own is already closed.

### 3. Optional follow-up (separate from this closure — do not hold the close for it)

Raise a **one-line product/data question to Mostafa / Pietro**, as its own item or a Confluence comment
on the reference table — *not* as a reason to keep PLT-2815 open:

> *"Is `Cat3 | CSA | Underground Services = £600` correct? It is the lowest Cat 3 in the whole table,
> sits below both the generic Cat 3 CSA (£2,003.33) and the generic Cat 4 CSA (£740), and follows a
> steep cliff within the package (Cat1 £54,560 → Cat2 £7,125.71 → Cat3 £600). Should a package-specific
> Cat 4 row also be added so the two categories resolve by the same rule?"*
> (`rework_reference.json:65-67, 83`)

Also noted, unrelated to this closure: **hard-coded FX factors** in
`use-rework-cost-calculation.ts:18-23` (EUR 1.14) are a latent maintenance risk for all EUR/USD
projects — worth a tech-debt entry, not an incident.

---

## Why this changed from "(c) nudge" (07-13) to "close" (07-30)

The 07-13 draft chose a nudge because the ticket had been silent ~3 weeks and a one-line customer
confirmation would have let us close cleanly. That reasoning has expired:

- **The nudge was never sent.** There is no comment on PLT-2815 after 2026-07-06, so no client clock
  was ever restarted. Re-drafting the same nudge on every pass is the failure mode the routine exists
  to avoid.
- **The confirmation isn't needed.** The customer's own ticket (Freshdesk #7126) was closed on
  2026-07-06 — the customer-facing loop is shut. Asking Paolo to re-confirm re-opens a settled
  conversation to collect a signature on a decision that is product's to make, not his.
- **Nothing is under investigation.** Cause, trigger and cohort are all answered (`context.md §8`), so
  the playbook's "close on cause + trigger + cohort, never on 'looks fine now'" bar is *met* — this is
  a real close, not a remission close.
- The 07-13 file already flagged closure as the cleaner path in its coordinator notes; 24 further days
  of silence settle it.

**Confidence in diagnosis: 9/10** (unchanged — code path read end-to-end, both figures reproduced to
the cent). **Confidence that closing is now the right step: 8/10** — up from ~7/10 for the nudge; the
residual 2 points are Yash's call on whether he wants a courtesy line to Paolo via Josh before closing
(reasonable, but should not delay the transition).

---

## 2026-08-14 — close-out re-affirmed, now with the reference table verified at source

The 07-30 recommendation (close, do not nudge) stands unchanged and has now gone unposted across
**ten consecutive runs**. This run added the one piece of verification that was still second-hand:
the Confluence reference table was read directly (page 1630633988, last modified **Oct 23, 2025**,
unchanged since before the ticket existed), and it confirms `CAT3 | CSA | Underground Services =
£600.00`, **no** `CAT4 | CSA | Underground Services` row, and `CAT4 | CSA | (generic) = £740.00`.
See `context.md` 2026-08-14. So the numbers Mostafa decided to "leave as intended" on 23 June are
still exactly the numbers in the table today. There is nothing left to check.

**Action: move to Done.** The long closing comment in §1 above is still fine for the record if
whoever closes it wants the full write-up. If they want one line instead, use this:

> Closing this out. The two figures are correct per the Issue Rework Reference Table: Cat 3 for CSA
> Underground Services has a package specific value of £600, and Cat 4 has no package specific row so
> it falls back to the general CSA figure of £740, which is why Cat 4 reads higher once converted to
> euros. Not a defect. Mostafa's call on 23 June was to leave the numbers as intended, and any
> questions on the values themselves are best pointed at Josh in customer success. Freshdesk #7126 is
> already closed on the customer's side.

Transition and resolution guidance unchanged from §2 above (close with a resolution, not an empty
one). The optional reference-table question to product in §3 also still stands and should not hold
the close.

**No Jira action was taken by this run.**

## 2026-08-20 — close-out unchanged (15th run unposted); §3's follow-up question now has a live thread

**The recommendation is unchanged: post a closing comment and transition `With Customer` → `Done` with a
resolution.** Both versions of the closing comment above (the full §1 write-up and the one-paragraph
2026-08-14 version) are still accurate and still fine to send as written. 45 days stale, 15 consecutive
runs recommending this without it being executed.

**The one substantive change this run** concerns §3, the "optional follow-up" question to Mostafa and
Pietro about the anomalous `Cat3 | CSA | Underground Services = £600` figure. That question has sat
unraised since 07-30 because it had no natural home. It has one now: **PLT-3061 put Mostafa and Pietro on
this exact reference table, and this exact `Underground Services` package, on 08-19** (their input is being
asked for on the missing `CSA-TCB` rows — see that ticket's 2026-08-20 notes). Ask it there, in the same
thread, while they are engaged.

Suggested wording if it is folded into the PLT-3061 conversation, kept to one short paragraph so it does
not hijack that ticket's own decision:

> While the table is open, one older question from PLT-2815 that never got asked. Cat 3 for CSA Underground
> Services is £600, which is the lowest Cat 3 anywhere in the table and sits below both the general Cat 3
> CSA figure of £2,003 and the general Cat 4 CSA figure of £740. That is why a client saw Cat 4 priced above
> Cat 3 back in June. It was left as intended at the time. Now that Underground Services is being looked at
> again, is £600 still right?

**This does not gate the close.** PLT-2815 should be closed regardless of whether or when that question gets
an answer; the question is about the table's content, not about this incident. Do not hold the transition
for it, and do not reopen the ticket if the answer comes back later.

**No Jira action was taken by this run.**

## 2026-08-26 — close-out unchanged (19th run unposted)

Recommendation is unchanged: post the closing comment (§1, or the shorter 2026-08-14 version) and
transition `With Customer` → `Done` with a resolution. 51 days stale, 19 consecutive runs
recommending this without execution. §3's follow-up question still has no answer on PLT-3061's
thread (quiet ~7 days as of 08-26) and still does not gate this close. No Jira action was taken by
this run.

## 2026-08-31 — close-out unchanged (22nd consecutive run unposted)

Unchanged and not re-argued: post the closing comment and transition `With Customer` → `Done` with
a real resolution (never an empty one). **56 days stale.** Use the short 2026-08-14 one-paragraph
version rather than §1's long write-up — it is the SHORT-rule-compliant one and it says everything
the record needs:

> Closing this out. The two figures are correct per the Issue Rework Reference Table: Cat 3 for CSA
> Underground Services has a package specific value of £600, and Cat 4 has no package specific row so
> it falls back to the general CSA figure of £740, which is why Cat 4 reads higher once converted to
> euros. Not a defect. Mostafa's call on 23 June was to leave the numbers as intended, and any
> questions on the values themselves are best pointed at Josh in customer success. Freshdesk #7126 is
> already closed on the customer's side.

§3's follow-up question still does not gate the close. No Jira action was taken by this run.

## 2026-09-01 — close-out unchanged (23rd consecutive run unposted). Flagged for human attention this run.

Same recommendation as every run since 07-30, unchanged: post the short 2026-08-14 closing comment
(reproduced above) and transition `With Customer` → `Done` with a real resolution. **57 days
stale, 23 consecutive runs recommending this, zero executed.** Nothing about the diagnosis or the
product decision has changed or needs re-checking — this is purely an unexecuted housekeeping
action at this point, not an open investigation. Surfaced explicitly in this run's notification
because 23 unposted recommendations is past the point where repeating it in a file nobody
re-reads is doing any good — a decision is needed on whether to post it, or to explain why not
(e.g. if there's a reason it's being deliberately left open that isn't recorded here).

## 2026-09-11 (scheduled) — unchanged, 27th consecutive run. The 09-09 chase-Yash draft stands as written.

**Jira: 67 days stale, nothing new (see `context.md`).** The recommendation is not re-argued and not
re-drafted: the 09-09 chase-to-Yash draft below is still the right instrument, still accurate, and
still unposted. Action class unchanged: **1 — stale, unresponded (on us)**. No new evidence changes
either the diagnosis or the ask; this run adds no new investigation, per the run protocol for an
unchanged ticket. No Jira action was taken by this run.

## 2026-09-09 — ACTION CLASS 1. Stop re-drafting the record comment; chase the named owner instead.

**Jira unchanged, 65 days stale, 25th consecutive run recommending an unposted close-out.** Nothing
about the diagnosis changed and none of it was re-argued. Three things changed around it, all
recorded in `context.md` § 2026-09-09.

### Action class: **1 — stale, unresponded; needs following up by a named person**

Not class 2: there is no dev work whose absence is holding this ticket, and the one piece of code
that exists (the 08-27 audit branch) is not a fix and should not land on the back of a close. Not
class 3: nothing to see in the app, both figures were reproduced from source to the cent and
re-verified against Confluence on 08-14. Not class 4: nobody disagrees about anything.

**Who owes what:** Yash Patel (assignee and coordinator) owes one board action. Nobody is waiting on
engineering, nobody is waiting on the customer, and the customer-facing Freshdesk #7126 has been
Closed since 07-06.

### What changed in the recommendation

The instrument changes, the outcome does not. Every run since 07-30 has recommended *posting the
record comment and transitioning*, and 25 runs of writing that into a file have produced nothing.
The file is not the blocker; the ask has never been put to the person who can act on it. So this run
drafts a **chase to Yash**, not another version of the record comment.

The 2026-08-14 short record comment (reproduced in the 2026-08-31 note above) is still accurate and
still fine to post if whoever closes it wants the outcome on the ticket. It is unchanged and not
re-drafted here.

### Draft — to Yash Patel (chase). **Unposted. A human pastes it, a human makes the transition.** (83 words)

> Hi Yash, PLT-2815 has been static since 6 July and Freshdesk 7126 is already closed on the
> customer's side. The numbers were confirmed correct back in June: Cat 3 for CSA Underground
> Services has its own price of £600, Cat 4 has none so it falls back to the general CSA figure of
> £740, which is why it reads higher in euros. Mostafa's call was to leave them as intended. Nothing
> is outstanding on our side. **Can you close it with a resolution?**

Transition guidance unchanged from §2 of the 07-30 recommendation: `With Customer` → `Done`, and
**never with an empty resolution** (the ticket currently has `resolution = null`).

### §3 of the 07-30 recommendation is SUPERSEDED — do not keep carrying it as "ask it on PLT-3061"

The 08-20 note re-homed §3's £600 question onto PLT-3061's live Mostafa/Pietro thread. **That route is
closed.** Josh replied on PLT-3061 on 09-02 declining a reference-table change and proposing the
customer filter by vendor; that ticket's remaining action is Josh and the ML9 project manager. Product
has now declined to touch this table twice (Mostafa 06-23, Josh 09-02). Stop waiting for a thread to
ride on. The §3 text itself is preserved above, not deleted; only its delivery plan is dead.

### New, separate item — do NOT post it here and do NOT hold the close for it

`context.md` § 2026-09-09 §3 found a **fourth** live case of this ticket's exact symptom that the
08-27 audit excludes by design: **Mechanical / VESDA, Cat 3 £845.71 → Cat 4 £1,840**, both
package-specific rows, no fallback involved (`rework_reference.json:77-78`). It will read as the same
bug to the next customer who files under Mechanical. This belongs on its own product/data item
addressed to Mostafa and Pietro, raised when there is appetite for a table change, which right now
there visibly is not.

**Draft, if and when it is raised as its own item (72 words):**

> One from the rework cost table, separate from any live ticket. Under Mechanical, VESDA is priced at
> £845.71 for Category 3 and £1,840 for Category 4, so a more severe issue costs less than a milder
> one. Under Electrical the same package steps down normally. A client raised this shape in June for a
> different package and it will read as a bug again. **Is the Mechanical VESDA Category 4 figure right?**

Also for that item, not drafted into a message: the near-duplicate package pair `Install Elec Equip`
vs `Install Elec Equipment` (`rework_reference.json:34-38`), whose prices differ 1.7×–2.6× and which
Rule 1 matches by exact `===` — so the spelling a project uses decides the price. Same class as
PLT-3061's `CSA-TCB`.

### Flag: the 08-27 branch is stranded, and it is not a reason to keep this open

`origin/PLT-2815-rework-cost-ladder-audit` (commit `f480450`) is pushed with **no pull request, open
or closed** — verified this run. It is audit + test only, no behaviour change. If anyone picks it up,
its filter needs widening first (see `debug-instructions.md`, 2026-09-09 note). If nobody does, delete
the branch rather than leaving it to look like queued work. Either way it does not gate the close.

**No Jira action was taken by this run.**
