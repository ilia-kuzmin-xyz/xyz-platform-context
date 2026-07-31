# PLT-2874 — Recommended action

> **2026-07-31: superseded. Resolved in diagnosis, fix in review.**
>
> Everything below is the 07-24 position and is kept because its reasoning held up. Its outcome
> map called this correctly: *"A ≈ 628k and B ≈ 695k → gap is dbId expansion of a
> non-deduplicated count → optional polish is to display `COUNT(DISTINCT modelElementId)` in the
> overlay so it reconciles with the editor."* That is exactly what PR #2084 does. The one thing
> it got wrong was the disposition, "working as designed / close as not-a-bug": showing an object
> count under the label "Elements" is a defect, and once corrected the two surfaces agree to 0.5%.
>
> **Current position below.**

## Current: ship PR #2084, close the incident, spin out the rest

https://github.com/XYZReality/hc-frontend/pull/2084 on branch `PLT-2874`. Full mechanism,
figures and verification in `investigation-log.md`.

### Actions, in order

1. **Post the resolution comment.** Draft in `drafts.md`, not posted.
2. **Get #2084 deployed and verified.** Blocked on an image promotion, not on code. Test steps
   are on the PR; step 3, that the total stays element-based after a filter change, matters most
   because that was a real bug in the first cut.
3. **Confirm LVN1** (Freshdesk 7514) with one query. Expect the fix to cover the dashboard number
   there but **not** the schedule root row, which is a third unit again.
4. **Close the incident** once #2084 is on prod.

### Spun out, none blocking

| Item | Why separate |
|---|---|
| Schedule Elements column sums per-activity counts with no dedup (`schedule-entity.ts:786-810`) | Third unit, own defect, is the extra number in the LVN1 report |
| `Selected` in the viewer stats box is still a dbId count (`dashboard-statistics-service.ts:128`) | Product decision, raised by another dev, his call |
| Dashboard picks an arbitrary model from the federated folder | Latent; FAR01's two are 2,540 elements apart so impact is 0.4% here. Draft ticket in `drafts.md` |
| `svf2-object-id-map` vs `project-element-list` disagree by 1,364 for one model version | Backend question for Ali or Dave, one message not an investigation |
| Extra Navisworks dbIds unreachable in the editor for selection and isolation | Consequence of the editor's one-dbId-per-element map, not this ticket |

### Product decision taken

Asked Pietro and Mostafa whether both pages should move to one shared source so the numbers match
exactly. Recommendation given and accepted as the proposal: **not now.** 0.5% will not be noticed
and does not affect progress figures. Log the source alignment as tech debt.

### Doc gap from the 07-24 note, now closed

`dashboard/pitfalls.md` has entries for the object-vs-element count, the silent dashboard logger,
and the arbitrary federated model pick.

---

# Superseded 07-24 position

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
