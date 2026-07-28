# PLT-2874 — Recommended action (Group B: Dev In Progress)

## Dev-readiness note

Dev-ready, and already being worked (Ilia Kuzmin's 2026-07-13 comment shows the diff-query
investigation from `context.md` §4 is under way). Root mechanism traced end-to-end in code
(§2–§3): the editor "Linked" count (distinct `modelElementId`, one model, active-program links
only) and the dashboard "Elements/Total" count (non-deduplicated Forge `dbId`s, whole federated
model) are different metrics by construction — an exact match was never guaranteed. What's
unresolved is *how much* of the ~11% Far01 gap (and the newly-confirmed LVN1 instance) is
expected dbId-expansion vs a genuine defect (status-history double-counting in `element_base_data`,
or join-direction loss from the "996 un-mapped activities" surfaced on LVN1 — see `context.md` §8).

The decisive next step is unchanged and cheap: run the §4 query diff
(`COUNT(*) / COUNT(DISTINCT objectId) / COUNT(DISTINCT modelElementId)` over `element_base_data`)
against Far01 and/or LVN1. That single query separates "working as designed" from "real bug" and
tells the fix, if any: dedupe the colour-service count, or fix the join direction against
unmapped activities.

## Fix ownership

- **Darminder Atker** (assignee, fullstack lead) / **Ilia Kuzmin** (already investigating per
  2026-07-13 comment) — own the query-diff verification and any resulting fix in
  `dashboard-color-service.ts` / `dashboard-progress-service.ts` (`element_base_data` grain).
- **Yash Patel** — owns the customer-facing side (Freshdesk #7514, LVN1); loop back once
  bug-vs-by-design is settled so he can respond to the client.
- If the diff confirms a real double-counting or join-direction defect (not just dbId expansion),
  this needs a **product call** (Mostafa/Pietro) on whether the fix is a count correction or a
  labelling/definition change to the "Total" tile — flagging, not deciding, here.

**Confidence: 6/10** (mechanism traced; specific cause of the observed gap on Far01/LVN1 still
needs the query-diff to confirm). No customer/team clarifying comment drafted this pass — Group B
scope is context capture only; the diagnostic work is already in motion with the assignee.
