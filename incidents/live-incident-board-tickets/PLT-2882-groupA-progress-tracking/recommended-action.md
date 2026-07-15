# PLT-2882 — recommended action (DRAFT ONLY — execute nothing)

> **This file was rewritten 2026-07-15.** The previous recommended action —
> "(a) post an internal status update naming the one closed data step to confirm
> the orphaned-links hypothesis" — is **fully executed and overtaken by events**.
> That step ran (see `investigation-log.md`): the hypothesis is confirmed as root
> cause (9/10), the mechanism is posted on-ticket, and Ilia has already proposed a
> concrete remediation. The prior draft is preserved in git history; it is no
> longer the live action. The live state and the new action are below.

## Where the ticket actually is (2026-07-15)

Root cause is **confirmed and stated on-ticket** (comment 107356): the 418 linked
elements for activity `FAR01UGD1220` no longer exist in the current versions of
models `PC-…UND-AKS_REV1-V23` / `QA-…UND-AKS_Northwest-V35` (both re-uploaded; the
deep-underground electrical scope was removed/redrawn). The **`client-element-metas`
parquet still lists them while the geometry doesn't** — out of sync for the same
model version — so the Gantt shows a count of 418 but select/isolate resolves 0.

Ilia posted a **concrete, approvable fix** — *delete the 418 dead links off this
activity* — with the enumerated list attached (`activity-7c4f2509-orphaned-418.csv`,
comment 107357), addressed to **Pietro Desiato** and **Mostafa Kamel Hussien** as a
yes/no ask. **Neither has replied; it has sat ~1 day.** Status still In Analysis.

So there are now **three distinct open items**, in decreasing leverage:

1. **Systemic / cohort (highest leverage, NOT yet raised on-ticket).** Is the
   parquet↔geometry desync a **pipeline bug that recurs on every re-versioned
   model**, or a one-off for FAR01? If systemic, it will keep generating tickets
   exactly like this one — the single-activity delete is then a mop, not a fix.
2. **Single-activity approval (in-flight, stalled).** The yes/no on deleting the
   418 links — a data cleanup that fixes **only** `FAR01UGD1220`.
3. **FE robustness gap (real, NOT yet ticketed).** Count > 0 while select/isolate
   silently returns 0 with no user feedback — a bug regardless of the data cause.

The July playbook is explicit: **close on cause + trigger + cohort, never on a
single-instance fix.** Cause is known; **trigger and cohort are still open.** So the
recommended action leads with the systemic question, not the approval nudge.

---

## Recommended action: three routed, closed-question nudges (lead with cohort)

Playbook message craft: one question per message, **one owner per question**, phrased
so it can be answered with a value; scope each claim; don't re-explain the root cause
(it's already in 107356 — reference it, don't repeat it).

### (1) LEAD — systemic / trigger + cohort question (route to BE/data + pipeline owner)

The higher-leverage move. Owner should be the element-metadata pipeline owner
(David Webb answered the object-id-map sub-question, so likely him or the data/BE
line — Sergey / Sachin+Ali). Closed, dated, answerable:

> Following the root cause in 107356 (the `client-element-metas` parquet lists 418
> elements the SVF geometry for the *same* model version no longer contains): **is
> this a pipeline bug that recurs on every re-versioned model, or specific to
> FAR01?** Concretely — **when a model is re-uploaded/re-versioned, is the
> `client-element-metas` artefact regenerated from the new geometry, or can it
> retain stale entries from the previous generation?** And is `activity_links`
> cleaned on re-version, or do dead links persist? If it can go stale, **which other
> projects/models have been re-versioned recently** (the cohort) — we should sweep
> for activities that resolve to 0, not wait for the next ticket.

Why this leads: if the answer is "yes, it goes stale on every re-version", the
single-activity delete (item 2) is treating a symptom. The fix then belongs in the
pipeline (regenerate/reconcile the metadata + prune `activity_links` on re-version),
and the cohort sweep prevents a stream of FAR01-shaped tickets. This is the playbook's
"why now" (trigger) + "who else" (cohort) rolled into one routed question — both were
flagged open in `context.md` and neither has an owner yet.

### (2) The stalled approval — one closed nudge, split owners

Do **not** re-explain the root cause. Reference 107356 + the CSV and ask only for the
decision. Give each named owner the one thing they own:

> @Pietro Desiato / @Mostafa Kamel Hussien — the root cause and the exact list are in
> 107356 + `activity-7c4f2509-orphaned-418.csv`. **Do you approve deleting these 418
> dead links off `FAR01UGD1220`? (yes / no)** If yes, who runs the delete and against
> which store? This unblocks the customer-facing symptom on this one activity; it does
> **not** by itself close the incident (see the pipeline/cohort question above).

Keep it a single closed question so it can be answered in one word. If it's genuinely
one person's call (e.g. Pietro as product lead), address it to one owner and cc the
other, per the playbook's "one owner per question" rule.

### (3) FE robustness — flag as a separate, not-yet-created ticket

Explicitly scoped as **separate** (playbook: label side-findings loudly so they don't
pollute the main track). This is **not yet a ticket** — recommend creating one once
the data cleanup is approved, owner **Darminder / FE**:

> Separate from the data cleanup: the FE shows a linked-element **count from the raw
> `activity_links`/parquet path** but select/isolate resolves against loaded geometry
> and **silently returns 0** with no feedback (`use-linked-element-actions.ts`,
> `setAggregateSelection([])`). We should surface *"N of M linked elements are not in
> the loaded model(s)"* and reflect it in the count/menu-enablement. This is a real
> UX bug independent of whether the FAR01 links are deleted — it should get its own
> ticket (Darminder), not be folded into this incident's data fix.

---

## Why not just approve-and-close

- **Approving item 2 alone = closing on a single-instance fix.** The playbook's
  central discipline (§ "Close on cause + trigger + cohort — never on 'looks fine
  now'"). Deleting 418 links makes *this* activity's symptom disappear; if the
  pipeline keeps emitting stale metadata on re-version, the next re-versioned model
  reopens the same class of incident under a new ticket number. Symptom
  disappearance without trigger + cohort is **remission, not resolution.**
- **The trigger is only half-answered.** We know *what* is stale (parquet vs
  geometry) but not *why the pipeline left it behind* — the open BE question in
  `investigation-log.md` § "Two tracks". "Why now" with no owner = an open incident
  wearing an In-Analysis label.
- **The FE gap must not ride on the data fix.** If it's folded in, deleting the
  links makes the count read 0 and the silent-failure bug becomes invisible again —
  until the next orphaned activity. Split it now (item 3) so it survives the cleanup.

## Follow-through the human should own (not executed here)

- **Get the pipeline/cohort question (item 1) an owner** — it is the one that stops
  recurrence. Do not let it drop the way the July incident's "why wasn't this an
  issue before?" did (playbook anti-pattern #4).
- **Chase the approval (item 2)** — ~1 day stalled; a closed yes/no should not sit.
- **Create the FE robustness ticket (item 3)** once the cleanup is approved; owner
  Darminder. Then this ticket can move toward Ready For Development / closure with
  the FE half scoped separately.
- **Verify the CSV before any bulk delete** (NEEDS HUMAN in `context.md`): confirm
  row count = 418 and that every row belongs to `FAR01UGD1220` — it's a plain CSV, a
  one-click human check, unlike the `.mp4`s.
- **Diagnostic branch** `PLT-linked-selection-diagnostics` is `console.log`-only and
  **not for merge** — it has served its purpose; close/delete it or keep it parked,
  don't let it drift toward a PR.
- **Post-close pitfall entry** (still valid from the prior draft): add to a
  viewer/linking or `dashboard/pitfalls.md` — "activity linked-element count comes
  from the raw `activity_links`/`client-element-metas` path; select/isolate resolves
  against loaded geometry and silently drops orphans — a count > 0 can select 0, and
  parquet-vs-geometry can disagree for the *same* model version after re-upload."
