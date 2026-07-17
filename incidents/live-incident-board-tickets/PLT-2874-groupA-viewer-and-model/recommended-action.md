# PLT-2874 — Recommended action

## Chosen: (a) Draft a clarifying question — establish the reference and pin the exact widgets before any dev work

**Why (a), not the others:**
- **Not (b) Ready For Development.** The *mechanism* (why two counters differ) is understood, but
  whether this is a **genuine bug is not established** — the two numbers are different metrics by
  construction (distinct-UUID "Linked" on one model vs non-deduplicated Forge-`dbId` "Total" across
  the federated model; see `context.md §2–§3`), and the ~11% gap in the observed direction is
  *plausibly fully expected*. The repo even warns on this class of Forge-vs-DuckDB count mismatch
  (`ModelDetailsPanel.tsx:190-198`). Sending it to dev now presumes a defect the evidence does not
  yet support — the playbook's Q2 trap ("the reference was never valid").
- **Not (c) With Technical Support.** The reporter is **Mostafa (internal PO)**, not a client, and
  he captured the screenshots himself on **Far01** (an internal-accessible project). Nothing needs a
  *client* to confirm; the open questions are answerable in-house.
- **Not (d) Blocked.** Nothing blocks investigation — we have the project, both numbers, and both
  code paths. The next step is a cheap question + a one-off query, not a wait.

**Owner:** reporter **Mostafa Kamel Hussien** for the observation questions; assignee **Darminder
Atker** for the one-off verification query. One question per owner, phrased to be answered with a
value (playbook message-craft).

---

### Draft clarifying comment (for the assignee/coordinator to post — do NOT auto-post)

> Thanks Mostafa — before we treat this as a defect, two quick checks, because the editor and the
> dashboard count *different things* and may not be meant to match:
>
> 1. **Which dashboard number is the ~695k?** Is it the small **"Elements → Total"** overlay in the
>    bottom-left of the 3D viewer, or a figure in the Progress panel / Gantt? (The overlay counts
>    coloured Forge objects, not "linked elements" — the labels differ.)
> 2. **Which editor number is the ~628k?** Is it the **"Linked"** figure under **"Elements linked to
>    Latest Program"** in the Model Details panel — and was that panel showing the **federated
>    model's** entry, or one sub-model?
> 3. If handy, the **exact** two figures from your screenshots (the description says "around" /
>    "thousand").
>
> Context for why they can differ legitimately: the editor "Linked" counts **distinct source
> elements** linked to the active program on one model; the dashboard "Total" counts **Forge object
> IDs** across the whole federated model, and one source element can map to several Forge objects — so
> the dashboard being ~10% higher is a plausible by-design effect rather than a bug.

*(Closed, routed, answerable with values. Q1/Q2 pin which widgets are actually being compared; Q3
gets exact figures. This directly tests whether "they should match" is even a valid expectation.)*

---

### One-off verification for Darminder (resolves bug vs by-design)

Run the diff from `context.md §4` against **Far01** (DuckDB dev panel, Ctrl+Shift+D):
- `A =` count of **distinct `modelElementId`** among the elements coloured at slider-end, vs
- `B = coloredDbIds.length` (what the "Total" overlay shows).

Outcome map:
- `A ≈ 628k` and `B ≈ 695k` → gap is **dbId expansion of a non-deduplicated count**
  (`dashboard-color-service.ts:643`) → **working as designed**; optional polish is to display
  `COUNT(DISTINCT modelElementId)` in the overlay so it reconciles with the editor. Close as
  not-a-bug / minor-enhancement.
- `A` also ≈ 695k → divergence is upstream (scope: federated-vs-single-model, or a different
  link-set / stale `element_status` parquet per `caching.md`) → **then** promote to Ready For
  Development with that specific root cause.

---

## Notes for the coordinator

- **Trigger ("why now") is unasked (playbook Q5).** This is a Minor, no-comment ticket; there is no
  evidence it is a regression. Worth a one-line check with Mostafa: did these numbers used to match on
  Far01, or is this the first time anyone compared them? "It used to match" would change the analysis.
- **Doc gap to close after resolution:** neither `viewer-and-model.md` nor `pitfalls.md` documents
  that the editor "Linked" and dashboard "Elements/Total" are different counters — add a pitfall entry
  once the query diff confirms the mechanism. (Not editing outside this folder per task constraints —
  noting only.)

**Confidence in diagnosis: 6/10** (both code paths traced; specific cause of the Far01 gap is
environment-dependent). **Confidence in this being the right next step: 8/10** — a clarifying question
+ one query is the low-cost move that decides bug-vs-by-design before any dev effort is committed.

---

## Refresh 2026-07-17 — re-owner the diff query (no other change)

Re-pull (see `context.md §8`) shows **no new activity since 07-13** — still In Analysis, still
assigned to Darminder, no query result posted, hypothesis neither confirmed nor refuted. **One
correction to the plan above:** the sole comment on the ticket is **Ilia Kuzmin (07-13 14:12):
"I'm going to compare the data to see where the 30K-element difference comes from."** So the
`COUNT(*)` vs `COUNT(DISTINCT)` verification query (Deep-dive §"one query that settles bug-vs-by-design")
is **already owned by Ilia, not Darminder** — the action is not "hand it to Darminder" but
**"give Ilia the exact query so his in-flight comparison lands the decision cleanly, and post the
result back on the ticket."**

**Revised drafted action (one line):** *Reply to Ilia's comment with the `COUNT(*)` /
`COUNT(DISTINCT objectId)` / `COUNT(DISTINCT modelElementId)` query (context.md Deep-dive) so his
data comparison directly settles duplicate-status-rows (bug) vs UUID→dbId expansion (by-design); the
widget-clarify question to Mostafa still stands in parallel.*

**Confidence: unchanged at 6/10** — nothing was confirmed or refuted; the deciding query still has
not been run.
