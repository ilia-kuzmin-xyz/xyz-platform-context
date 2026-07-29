# PLT-2815 — recommended action (DRAFT ONLY — execute nothing)

**Re-check 2026-07-29.** Third pass. The action has not changed since 07-13 — it has become **overdue**,
and the evidence backing it is now stronger. Escalating the *framing* from "nudge to close" to
"**close it, and here is the one product follow-up to raise on the way out**".

---

## Chosen action: (c) — coordinator nudge to **Yash Patel**: close PLT-2815, and split the data question out

One short, direct message that (1) names exactly how long this has been sitting, (2) states there is no
open technical question, (3) asks for the single administrative act that ends it, and (4) hands over the
one genuinely new piece of evidence so the close is complete rather than merely tidy.

## Why (c), and why it is now urgent rather than optional

- **The ticket has no open question.** Status, comment count (13) and `updated` are **all frozen at
  2026-07-06** — 23 days. The last comment is an automated Freshdesk status mirror, not a discussion.
  Nobody is investigating, nobody is blocked, and no question is addressed to anyone.
- **Every prerequisite for a proper close is met** (playbook Phase 6):
  1. **Root cause** — reference-data artifact, code correct; both figures reproduced to the exact cent
     (`context.md` § Mechanism). ✅
  2. **Trigger** — latent data shape, not a dated change; no rework-touching commit, table unmodified
     since Oct 2025. ✅ (This is the leg the playbook warns is usually silently dropped — here it is
     genuinely answered.)
  3. **Cohort** — 🆕 **closed this run.** Paolo's own unanswered question ("I don't know if other
     disciplines or packages may be affected") is now answered with evidence: 18 inverted series.
     On 07-13 this leg was open, which is the one respect in which "just close it" was previously
     slightly premature. It no longer is. ✅
  4. **Product decision** — "leave it as intended for now" (Mostafa, 36 days ago). ✅
- **The customer loop is already shut.** Freshdesk #7126 has been **Closed for 23 days**. The Jira's
  "With Customer" label is now fiction: there is no customer waiting and no answer owed.
- **The cost of leaving it is real, if small.** It holds a Live Incident board slot, inflates the
  Major-priority count, and re-consumes triage attention on every run (three passes now: 07-13, 07-22,
  07-29). Two prior close recommendations at 9/10 confidence went unactioned — that pattern, not the
  rework calculation, is the thing worth naming out loud.

**Why not the others:**
- **Not (a) a fresh reply to the customer.** The answer was delivered; Freshdesk is closed. Re-opening a
  settled conversation 42 days later, to re-explain a number the client has stopped asking about, would
  create work and risk rather than resolve anything. *(This is the one substantive change from the 07-13
  draft, which offered a customer-facing nudge via Josh as its primary text. With Freshdesk closed 23
  days, that message is now the wrong move — it invites a reopened ticket. Superseded deliberately;
  retained below only as a fallback if the client re-raises.)*
- **Not (b) Ready For Development.** No code defect. The calculation faithfully implements the
  product-owned fallback rules; the only possible change is **data** in a Confluence table owned by
  UX/Product. Sending this to a dev is a no-op. Note also that PLT-2561 is already Dev-In-Progress on
  the same hook and is explicitly **not** a fix for this — see the warning below.
- **Not (d) Blocked.** Nothing blocks us. The next action is entirely in Yash's hands and takes a minute.

**Owner:** **Yash Patel** — assignee, coordinator, and the only person with an outstanding action.
One owner, one closed question, per the playbook.

---

## Draft — internal nudge (author: Ilia Kuzmin; @ Yash Patel, cc Mostafa Kamel Hussien)

Playbook style: short, one owner, one closed question answerable with a value; elapsed time stated as a
fact, not a complaint.

> @Yash Patel — PLT-2815 (ML9 rework cost, Cat 3 €684 vs Cat 4 €843.60). This has had **no activity
> since 6 July — 23 days** — and I don't think anything is actually pending on it.
>
> Where it stands: the calculation is correct. Both figures reproduce exactly from our Issue Rework
> Reference Table (£600 × 1.14 = €684.00 for the package-specific Cat 3; £740 × 1.14 = €843.60 for the
> Cat 4, which falls back to the generic CSA rate because Underground Services has no Cat 4 row). No
> code defect, no deploy involved. @Mostafa ruled "leave as intended for now" on **23 June — 36 days
> ago**, and Freshdesk #7126 has been **Closed since 6 July**.
>
> **Can this be closed as working-as-intended / not-a-bug?** As far as I can see there's no open
> question and no one waiting on a reply — it's just still on the board.
>
> One thing worth splitting out before it goes: I checked whether other packages are affected, which is
> what Paolo originally asked and we never answered. **They are — 18 of 37 discipline/package series in
> the reference table have a higher category priced below a lower one.** Six are the same
> fallback-rule shape we explained to Paolo, but **12 are not** — both figures are package-specific, so
> "different lookup rules" doesn't explain those. The clearest is **Mechanical / VESDA: Cat 3 £845.71 vs
> Cat 4 £1,840** (on ML9: €964.11 vs €2,097.60) — Paolo's exact complaint, 2.2×, and worse than the one
> he reported.
>
> That's a **product data question, not a dev one**, so I'd raise it as its own ticket for
> @Mostafa / Pietro rather than hold this incident open for it. Happy to write it up with the full list.
>
> Scoping: this is separate from **PLT-2561** (remove rounding from the same hook) — that changes
> decimal precision, not the ordering, and isn't a fix for this. One caution on it below.

*(Closed question: "can this be closed?" — answerable with yes/no. The cohort finding is handed over as
a separate, correctly-routed item so it cannot become a reason to keep this ticket open.)*

---

## The follow-up ticket to raise (draft scope — for product, not dev)

Keep it **off** PLT-2815 so the incident can close. Suggested framing:

> **Title:** Issue Rework Reference Table — 18 discipline/package series price a higher category below a
> lower one
>
> **Owner:** Mostafa Kamel Hussien (decision) / Pietro Desiato (authored the table)
> **Type:** product data correction — **no frontend change required**
>
> **Why:** the table's own generic (`Package = ""`) series are all monotonic decreasing — CSA
> 16,286.32 → 7,871.72 → 2,003.33 → 740.00, and likewise Electrical and Mechanical — so higher category
> = higher cost is the table's design intent. 18 of 37 package series break it.
>
> **Two distinct classes** (the distinction matters for how they're fixed):
> - **12 same-rule inversions** — both figures package-specific, so no fallback explanation applies.
>   These are plain data errors. Worst: `Mechanical / VESDA` Cat3 £845.71 < Cat4 £1,840.00 (2.2×);
>   `Electrical / Install Elec Equipment` Cat2 £4,683.33 < Cat3 £11,600.00 (2.5×); `Mechanical / DWS`
>   Cat2 £640 < Cat3 £1,600; `Mechanical / S&W` Cat2 £640 < Cat3 £1,560.
> - **6 mixed-rule inversions** — a package-specific value undercut by the generic-discipline fallback,
>   including the PLT-2815 case (`CSA / Underground Services`) plus `Electrical / Earthing`,
>   `Electrical / Fire Alarm`, `CSA / Precast`, `Electrical / Install Elec Equip`, `Mechanical / Pipe`.
>
> **Structural contributor:** 18 of 37 package series have **no Category 4 row**, so their Cat 4 always
> falls back to the generic discipline figure. Three of those invert today; `CSA / Piling` (£760 vs £740)
> is £20 from joining them.
>
> **Separate data-hygiene item found alongside:** two near-duplicate Electrical package names —
> `Install Elec Equip` (Cat1 £8,320) and `Install Elec Equipment` (Cat1 £14,080) — differing 1.7× on the
> same category. Rule 1 matches the package name exactly, so only one can ever be reachable; the other
> is dead data. Which is live?
>
> **Two questions for product:** (1) should the table be corrected to be monotonic within every series,
> or is non-monotonicity intentional in some packages? (2) should missing Category 4 rows be filled per
> package, or should the ladder be changed to clamp a fallback so it can never exceed the
> package-specific value one category below?
>
> Evidence: full sweep reproducible from the shipped `rework_reference.json`; script preserved at
> `/tmp/.../scratchpad/sweep.py` (see `context.md` § New evidence).

---

## ⚠️ One caution to pass to Rishi before PLT-2561 merges

**PLT-2561** ("Remove rounding from rework cost calculation") is **Dev In Progress, unassigned, untouched
for 69 days**, and removes the `Math.round(convertedCost * 100) / 100` from *both* matching paths of the
same hook.

That rounding is exactly what makes these figures display cleanly. In IEEE-754,
`740 * 1.14 = 843.5999999999999` and `600 * 1.14 = 683.9999999999999`. **If PLT-2561 ships without
display-side formatting in `issue-cost-field.tsx`, the field described in this very incident would
render `€843.5999999999999`.** PLT-2561's acceptance criteria only say "UI formatting can still control
display precision *if needed*" — that "if needed" is unresolved. Worth one line to Rishi; it costs
nothing now and would be an embarrassing regression on a field a customer has already complained about.

**Scoping (say it loudly, per the playbook):** PLT-2561 is **not** a fix for PLT-2815. It changes
precision, not ordering. Do not let "there's dev work on the rework hook" become a reason to keep this
incident open.

---

## Notes for the coordinator (Yash)

- **The one-line summary:** *nothing technical is pending; the ticket is open because no one has closed
  it.* Two prior triage passes (07-13, 07-22) recommended closing at 9/10 confidence and neither was
  actioned. Flagging the pattern, not the person — a 9/10 "working as intended, please close" that
  survives 16 days is a workflow gap worth a look at how these get retired.
- **Suggested resolution:** *Not a bug / Working as intended* — product-owned reference data; product
  decision recorded 2026-06-23 (#105647).
- **Board hygiene:** consider whether "With Customer" should auto-review when its linked Freshdesk
  closes. This ticket has been labelled "With Customer" for 23 days with no customer on the other end —
  the same shape flagged on PLT-2884 on 07-22, from the opposite direction (there the customer *was*
  waiting and nobody chased).
- **One coordinator-level item, not two:** both `quality-management` tickets on the board (**PLT-2815**
  and **PLT-2858**) are parked behind **Mostafa** — 2815 has his decision but no one closed it, 2858 is
  still waiting for one (flagged at 9 days on 07-22, now ~16). Worth raising together as
  product-decision latency on quality-management.
- **Recurring family:** PLT-2384, PLT-2572, PLT-2648 and PLT-2815 are four live incidents in six months
  traceable to this one product-owned dataset and its fallback ladder. That is the real argument for the
  follow-up ticket above: answering "as intended" per ticket has not stopped them arriving.
- **Post-close doc work** (KB gap confirmed — `grep -i rework` across `dashboard/` and `incidents/`
  returns zero hits outside this folder):
  - `dashboard/quality-tab.md` — add a section on rework-cost suggestion: the three-rule fallback
    ladder, the GBP-based reference table, the hard-coded FX factors.
  - `dashboard/pitfalls.md` — add: *"Suggested rework cost resolves via a 3-rule fallback ladder
    (Cat+Disc+Pkg → Cat+Disc → null). Two adjacent categories can resolve by **different** rules, so the
    displayed series is not guaranteed monotonic — and the reference data itself has 18 non-monotonic
    series. A 'wrong cost' report is almost always reference data, not code."*
  - Also worth logging: **FX factors are hard-coded** (`use-rework-cost-calculation.ts:18-23`; EUR 1.14,
    USD 1.32) with no dated source or refresh path, and unlisted currencies silently fall back to a
    factor of 1 (GBP figures under a foreign currency label). Latent; separate low-priority ticket.

---

## Fallback only — customer-facing text (superseded; use *only* if Paolo re-raises)

Retained from the 07-13 draft. **Do not send proactively** — Freshdesk #7126 has been closed 23 days and
this would reopen a settled thread. If the client does come back, note that the "different lookup rules"
explanation covers their case but **not** the 12 same-rule inversions, so don't offer it as a general
defence of the table.

> Hi Paolo — following up on the estimated rework cost for CSA / Underground Services (ticket #7126 /
> PLT-2815). We checked the calculation: the two figures come from our standard Issue Rework Reference
> Table, and they're produced by different lookup rules — the **Category 3** value (€684.00) is the
> **package-specific** rate for Underground Services, while the **Category 4** value (€843.60) falls back
> to the **general CSA** rate because there is no package-specific Category 4 figure for Underground
> Services. That's why Cat 4 shows higher than Cat 3 in this one package. The reference figures
> themselves are maintained by our product team.
>
> You also asked whether other disciplines or packages might be affected — they are, and we've raised
> that with our product team as a review of the reference table itself. If you have further questions on
> the numbers, Josh in Customer Success can pick those up.

---

**Confidence in diagnosis: 9/10** (unchanged; reproduced to the cent, re-verified this run).
**Confidence in the cohort sweep: 9/10** (deterministic from shipped JSON; reproducible script).
**Confidence in this being the right next step: 8/10** (up from 7/10 — still a comms/coordination
judgment, but the cohort leg that made "just close it" slightly premature on 07-13 is now closed with
evidence, and the Freshdesk-closed-23-days fact removes the customer-nudge option).
