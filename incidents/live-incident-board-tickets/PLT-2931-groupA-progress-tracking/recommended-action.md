# PLT-2931 — recommended action (DRAFT ONLY — execute nothing)

## ⚠️ 2026-07-24 (later) — confirmation DONE same-day; action is now the deletion-approval step

The queries below were executed the same day (see `investigation-log.md`): all five dashboard
percentages equal installed ÷ linked exactly, and the full **193-row dead-link list** was produced
from the dashboard's DuckDB alone (A4). The action is no longer "confirm" — it is:

1. **Export A4 as CSV** and attach to the ticket (audit record, PLT-2882 discipline).
2. **Post the approval comment** (draft below, updated with the confirmed numbers).
3. On approval: **one soft-delete batch** — `POST /api/v2/projects/{pid}/elements/activity-links/delete`
   with the 193 `[{activityId, modelElementId}]` pairs (≤500/batch so one call; needs
   ELEMENT_EDIT+DELETE; soft-delete, editor picks it up on sync).
4. **Verify** after the next Progress Outputs parquet regeneration: all five activities → 100%,
   Containment → 100%.
5. **Cohort:** run the ELN03-wide dashboard-side detector (investigation-log § Method note) and
   attach its output to the same approval thread — one approval loop for the whole project beats
   five.

### Draft — approval comment (author: Ilia; @ Pietro Desiato, @ Mostafa, cc Yash) — UPDATED with confirmed numbers

> Confirmed on ELN03 with data (query outputs attached): the five Containment activities are capped
> below 100% by **193 links pointing at elements that no longer exist in the current model
> geometry** — KUPSB21200: 34 of 122, JUPSA21030: 114 of 225, KUPSD21420: 41 of 152, JUPSC21480: 3
> of 113, JSCOR1060: 1 of 54. In every case installed ÷ linked equals the dashboard % to two
> decimals, and everything that has geometry IS installed — the customer's claiming was correct.
> All five are TK_Complete in the schedule. Same family as PLT-2882's 418 (FAR01) and PLT-2909
> (ATL08); note JUPSC21480 was PLT-2675's exemplar in May, so this is a partial-cleanup recurrence.
>
> **Approval requested:** soft-delete these 193 dead links (same endpoint + audit pattern as
> PLT-2882 — CSV attached, deletion is reversible history, evidence parquets untouched). After the
> next dashboard data refresh all five activities read 100% and Containment clears to 100%.
>
> Scoping: dashboard and editor agree with each other; the pipeline question of *why* re-uploads/
> re-imports leave dead links behind stays with the open PLT-2882/PLT-2909 BE thread — ELN03 is now
> the third confirmed project on it.

## Original plan (executed same-day; kept for the record)

### Chosen action: (a) — run the two confirmation queries + one diagnostic (all in-house), post one internal status update, and fold the BE root-cause thread into the existing PLT-2882/PLT-2909 conversation

No new tooling, no new diagnostics branch: branch **`PLT-linked-selection-diagnostics`** already
exists on origin and `window.__linkDiagnose()` plus two DuckDB Explorer queries (context.md §
Confirmation runs) produce everything needed. The mechanism is already 9/10 from the screenshots'
own arithmetic (88/122 = 72%); the runs convert it into a deletable per-activity dead-link list.

## Why this and not the others

- **Not (c) With Technical Support / back to the client.** Nothing is needed from Thomas — his
  claim ("I claimed them at 100%") is *verified correct* by our own editor screenshot. Bouncing to
  the client would ask him to re-prove something we can already see.
- **Not (b) Ready For Development — yet, and probably not FE dev at all.** The dashboard is a
  faithful renderer of a backend-computed `InstalledElements / LinkedElements`; no FE change fixes
  the percentage. The fix is (i) **data remediation** — delete the dead links (same approval +
  soft-delete endpoint + CSV audit pattern as PLT-2882's 418), and (ii) the **pipeline root cause**
  already open with BE on PLT-2882/PLT-2909 (why metadata retains dead generations after
  re-upload/re-import) — ELN03 should be added to that thread as the third confirmed project, not
  given its own parallel BE investigation.
- **Not (d) Blocked.** Every next step is in our hands today.

## Draft — internal reply (author: Ilia Kuzmin; @ Yash Patel, cc Pietro Desiato / Mostafa)

> @Yash Patel — your investigation was exactly right, and the numbers prove it: for KUPSB21200 the
> schedule shows **122 linked elements** but only **88 resolve to geometry and are installed** —
> and 88/122 = **72.1%**, exactly what the dashboard shows. The dashboard computes an activity's
> Actual % as installed ÷ linked, so links pointing at elements that no longer exist in the current
> model geometry make 100% mathematically unreachable, no matter what the customer claims in the
> editor.
>
> Same defect family as PLT-2882 (FAR01) and PLT-2909 (ATL08) — this is the third project. Note
> JUPSC21480 was the exemplar activity of PLT-2675 back in May, so ELN03's earlier ghost-item
> cleanup was either partial or regressed with a later model update.
>
> Next (all internal, today): I'll pull the exact dead-link counts for all 5 activities from the
> dashboard's DuckDB and run the PLT-2882 diagnostic on ELN03 to produce the deletable link list
> with the same audit trail as before. @Pietro / @Mostafa — once I post that list, I'll need the
> same deletion approval as PLT-2882's 418.
>
> One question for BE (adding to the existing PLT-2882/2909 thread rather than a new one): which
> containment model(s) do these 5 activities link into, and were they re-uploaded or re-imported
> since May's PLT-2675 cleanup?
>
> Scoping: not a dashboard bug and not a claiming bug — the editor and dashboard agree with each
> other; both are correctly reporting data that contains dead links.

## Also worth doing now (cohort — playbook Q6)

Run the ELN03-wide orphaned-links sweep (`console-geometry-harvest.js` +
`orphaned-links-sweep.mjs`, both prod-safe from PLT-2882's log). Three projects are now confirmed
hit by this family; a sweep now prevents ticket #4. Recommend also proposing a standing decision
to product: sweep all active projects once, then make the pipeline fix (BE) close the faucet.

## Follow-through the human should own (not executed here)

- After the runs: post the per-activity dead-link counts + CSV, get Pietro/Mostafa approval, delete
  via the PLT-2882 soft-delete endpoint pattern (≤500/batch, `!isDeleted` gotcha applies to any
  verification GETs).
- Keep the FE robustness fix consolidated under PLT-2882 (surface "N of M linked elements not in
  the loaded model"); PLT-2931 adds the strongest argument yet for also showing it in the
  **dashboard** (a % that can never reach 100 is invisible-ghost UX).
- Once remediated: verify the parquet regenerates and Containment reaches 100% on the next
  dashboard data refresh; then close with cause + trigger + cohort per the playbook, and add the
  promised `pitfalls.md` entry (this is now three tickets' worth of the same pitfall).

**Confidence in diagnosis: 9/10 · in this being the right next step: 9/10.**
