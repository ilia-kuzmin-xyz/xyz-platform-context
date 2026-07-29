# PLT-2619 — recommended action (DRAFT ONLY — execute nothing)

**Re-check 2026-07-29.** Action **unchanged in kind**, **escalated in tone**, and **re-sequenced**.
The 07-13 draft (hand off to product + reclassify) was never executed; a coordinator nudge landed on
07-27 that routes the work to FE *before* the blocking product decision is answered. The draft below
replaces the previous reply text: it answers Yash, names the staleness starkly, and — new this run —
supplies a concrete route to the answer instead of re-asking Pietro a question he has ignored for
93 days.

## Chosen action: (c) — hand off to product + reclassify off the live-incident board

Same branch as 07-13: **"recommend hand-off to product / not-an-incident (mis-filed)"**, now with a
**named destination** (PBD, by the PLT-2891 → PBD-2111 precedent) and a **named shortcut** to the open
decision (PBD-1298 / Aliaksei Masanski). Single action: get the target decided and move ownership off
the incident board. It does not stay a live incident.

## Why this and still not the others

- **Not (a) client reply** — status says "With Customer" but **nothing is waiting on the customer**,
  and now demonstrably so: the last thing they were told was "awaiting release" (29 Apr), that release
  has since shipped, and no one has asked them for anything in 91 days. Pinging the client asks the
  wrong party and would reset the clock on the wrong side.
- **Not (b) Ready For Development** — there is still no dev work specified: no repro, no acceptance
  criteria, no defect. And it is now *actively* being pushed toward delivery (Yash → Ilia, 07-27)
  **while the prerequisite is unanswered** — sending it to Dev would formalise exactly the out-of-order
  routing that needs correcting.
- **Not (d) Blocked** — the nominal blocker ("awaiting release") is **cleared**: the native dashboard
  is live and generating its own customer incidents on this very board (PLT-2890 / 2917 / 2909 / 2882).
  Marking Blocked would entrench a 97-day-stale ticket behind a condition that expired in ~May.
- **(c) still fits, and the case is stronger than in July:** the asset's entire ticket history is in
  **PBD** — including a same-type Live Incident, **PBD-1213** ("Sales Demo Dashboard - Issue", same
  asset, same support assignee) — and Jira's own **Software Area = `Other`** on PLT-2619. PLT-2619 is
  the outlier filing. The board has already made this exact correction once (**PLT-2891 → PBD-2111**).

## The staleness line to actually say out loud

Do not soften this in the thread — two triage passes already recommended the same move and neither
was acted on. As of 2026-07-29:

- **97 days** old (created 23 Apr), issue type still **Live Incident**
- **89 consecutive days with zero activity** (29 Apr → 27 Jul)
- **91 days** in status **With Customer** — a status that was never true
- **93 days** with the one blocking question unanswered (Ilia → Pietro, 27 Apr)
- assigned the entire time to a **support agent who is not on the delivery roster**

## Draft — internal reply (author: Ilia Kuzmin; @ Yash Patel, cc Pietro Desiato + Mostafa)

Playbook style: answer the question that was asked, one closed question per owner, explicit scoping,
state the boundary rather than asserting a plan.

> @Yash Patel — no, it hasn't been done, and here's the honest reason: this ticket has been open
> **97 days** and had **no activity at all between 29 Apr and your message on Sunday**. It's still
> typed as a Live Incident and still sits in **With Customer**, which was never accurate — we've
> never been waiting on the client here.
>
> It's blocked on **one decision that's been open since 27 Apr**: *which* dashboard / target project
> "Mission Critical Dashboard" should be relinked to. I asked @Pietro Desiato on 27 Apr and it was
> never answered, so I can't action "update it to the new dashboard" — I don't know what to point it at.
>
> The "waiting for a non-PowerBI dashboard release" reason we gave the client on 29 Apr is **stale** —
> the native dashboard has been live for months (we're taking customer incidents on it). So the release
> isn't the blocker; the target decision is.
>
> **@Pietro — one closed question:** is the target the project referenced in **PBD-1298** ("The Mission
> Critical Dashboard / Mission Critical Datacentre", benchmarked against the CWL12 dashboard), or a
> different/new native project? If yes, I only need the project id.
>
> **Scoping:** this is a sales-demo relink/config request, not a live incident — no defect, no repro, no
> affected customer. Every other ticket for this asset was raised in **PBD** (PBD-1298, PBD-1254,
> PBD-1213, PBD-1890). Proposing we do what we did with PLT-2891 → PBD-2111: take it off the
> live-incident board and give it a product owner. @Yash OK to reclassify and reassign off Masum?

## Faster alternative if Pietro is silent again (recommended — 93 days says he will be)

Re-asking the same person the same question a fourth time is the anti-pattern the playbook calls out
("open questions without an addressee floated unanswered all day"). Two cheaper routes, either of which
resolves the pivot without a product meeting:

1. **Read PBD-1298** — its "Project" field names the asset directly: *"The Mission Critical Dashboard /
   Mission Critical Datacentre"*, with *"functioning like the CWL12 dashboard"* as the benchmark. That
   is very likely the answer already written down.
2. **Ask Aliaksei Masanski** (assignee on PBD-1298 / PBD-1247, PowerBI/PBD side) — *"which project is
   'Mission Critical Dashboard' backed by?"* One-line answer, no decision authority needed.

Only escalate to **Mostafa** (second product owner) if both fail — and then as a routing decision
("who owns sales-demo assets on the native platform?"), not as a repeat of the same question.

## Follow-through the human should own (not executed here)

Carried over from 07-13 — **none of these were done**; re-listing with the current staleness attached:

- **Reclassify** Live Incident → product/support task and move it **off** the PLT live-incident board
  (precedent: PLT-2891 → PBD-2111). 97 days is long past the point where board hygiene is optional.
- **Reassign** from Masum Ahmed (support, off-roster) to a product owner (Pietro or Mostafa).
- **Correct the status** — it is internally parked, not customer-blocked; "With Customer" has been
  wrong for 91 days and is actively misleading the board.
- **Close the loop with the client** via Freshdesk #6492 — the last thing they heard (29 Apr) was
  "awaiting release", which is no longer the situation. Do **not** send a fresh holding line until the
  target is decided; sending another "we're working on it" after 3 months of nothing is worse than a
  concrete date.
- **Process item worth naming beyond this ticket:** the ticket was parked on a blocker
  ("awaiting release") with **no owner and no re-check trigger**, and the blocker cleared silently
  ~3 months ago. That is the reusable defect here — a parked ticket needs a named condition *and* a
  named person who re-tests it. Worth a line in the board README's conventions if this recurs.

## Cross-ticket relations (this run)

- **PLT-2891 → PBD-2111 (Done, 07-13 run)** — the **procedural precedent**: a PowerBI-dashboard
  concern mis-filed on the PLT board, relocated to PBD. Same correction applies here.
- **PBD-1298 / PBD-1254 / PBD-1213 / PBD-1890** — the "Mission Critical Dashboard" demo asset's real
  ticket home. **PBD-1213 is the closest sibling**: same asset, same *Live Incident* type, same support
  assignee — but filed in PBD. Evidence, not just argument, that PLT-2619 is mis-boarded.
- **PLT-2890 / PLT-2917 / PLT-2909 / PLT-2882 (07-22 run)** — customer live incidents **on the native
  non-BI dashboard**, i.e. the proof that the "awaiting release" blocker expired. Cited above rather
  than relied on as hearsay.
- **PLT-2906 pattern (07-22 cross-ticket note)** — "the board reads customer-side but the open action
  is on us". PLT-2619 is the chronic version of that pattern: 89 days rather than 2. Both should be
  surfaced to Yash together, since he is the coordinator in a position to fix the board state.
- **PLT-2815** — the other long-parked Group A ticket recommended for a coordinator close-out nudge
  (9/10, "as intended"). Same *class* of problem (a resolved/non-defect ticket left occupying the
  incident board) though unrelated in content — worth batching into one board-hygiene pass with Yash
  rather than two separate nudges.
