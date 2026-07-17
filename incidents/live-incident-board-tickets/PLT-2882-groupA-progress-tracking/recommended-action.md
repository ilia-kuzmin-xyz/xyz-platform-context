# PLT-2882 — recommended action (DRAFT ONLY — execute nothing)

## 2026-07-17 refresh — current recommended action (supersedes the 2026-07-13 draft below)

**Where it stands:** the one data-diff step the 07-13 draft asked for **has been run and answered** —
root cause confirmed (investigation-log § 2026-07-14). The ticket has then sat **idle for two days**
since Ilia's 07-15 rebuttal to David Webb: no peer reply, no product approval, status still **In
Analysis**. It is **not** blocked by any external dependency — it's stalled on attention. The right
move is a nudge on the stalled human gates plus a clean split, **not** more analysis.

### Chosen action: (a) nudge + split — one reply that (i) forks the uncontested FE-robustness fix into its own dev-ready ticket now, and (ii) re-pings the three stalled owners, each with the single closed question they owe an answer to.

**Confidence: 8/10** (root cause 9/10; the discount is the open peer/product gates + the unanswered BE "why", all human-dependent — not code uncertainty).

**Why this, not the alternatives:**
- **Not (b) move the *whole* ticket to Ready For Development.** The FE-robustness half is dev-ready and
  uncontested — fork it. But the **data** half (delete the 418 dead links + fix the pipeline sync)
  cannot be dev-routed until David Webb aligns on the RCA and Pietro/Mostafa approve the deletion.
  Moving the whole ticket now buries the FE fix behind an unresolved data debate.
- **Not (d) Blocked.** Nothing external blocks us; both moves (re-ping, fork the FE ticket) are ours.
  It's stalled on attention, not a dependency — flag it Blocked only if the gates stay silent.
- **Not (c) With Technical Support / client.** We need nothing from the client.

### The three stalled gates to re-ping (each: one owner, one closed question)
1. **David Webb (BE/data)** — "Does the geometry-side evidence (source file `bb85941b`: 18,908
   elements in geometry, 0 of its 141 linked handles; other activities in the same models select
   fine) reconcile with your metadata check? If so, are we aligned to delete the 418?" *Deletion is
   on hold on this reply.*
2. **Pietro Desiato + Mostafa Kamel Hussien** — "Approve deleting the 418 dead links on
   `FAR01UGD1220`? (list posted 07-14 17:53)." *Product sign-off for a prod data change.*
3. **Ali Seyedof / David Webb (BE pipeline)** — "Why does the current version's `client-element-metas`
   parquet still list 418 elements the same version's geometry dropped — and is the element-meta
   artefact regenerated on re-version?" *This is the "why now" (playbook #5) and the true fix owner.*

### The FE-robustness ticket to fork now (owner: Darminder / FE) — dev-ready, independent of the data debate
Surface **"N of M linked elements aren't in the loaded model(s)"** instead of silently selecting
nothing; reflect it in the linked-element count / menu-enablement so a count the user cannot act on
isn't presented as actionable. This is a real bug regardless of how the data debate resolves (nobody
has contested it) → split it out and move **that** ticket to Ready For Development on its own.

### Still owned by a human (carried forward)
- **Cohort sweep** (playbook #6): enumerate all FAR01 activities whose links resolve to 0 — the
  tooling exists (investigation-log § 2026-07-14/15); decide harvest-run vs a cleaner BE query.
- **Pipeline ask:** emit object-id-map for Revit too (currently Navis-only) — would also help
  dashboard selective loading.
- **Pitfalls entry** once closed (see the 07-13 draft's last bullet).

---

_The below is the original **2026-07-13 draft**, kept as history. It predates root-cause
confirmation; its "one data-diff step" is now done and its 6/10 is superseded by the 8/10 above._

## Chosen action: (a) — draft the next reply (internal status update, one owner, one closed evidence step)

Post an internal status update that (1) answers Yash's 2026-07-13 "any update?", (2) states the code-verified mechanism and the orphaned-links hypothesis in one place, and (3) names the **single closed data step** that will confirm or kill it. Keep **Ilia Kuzmin** as owner (he claimed the investigation on-ticket today); loop **Darminder** for the FE-robustness half.

## Why this and not the others

- **Not (b) Ready For Development — yet.** We have a real FE robustness bug (Gantt shows a linked count > 0 while select/isolate silently resolves to 0 with no feedback — `context.md` § Mechanism). But the **user's actual goal** (isolate those retired elements) can only be met if the elements still exist; if the cause is orphaned links to a deleted/re-versioned model, the fix is **data**, not FE. Routing to Dev before the count-vs-selectable diff is run risks sending it to the wrong discipline. The July playbook is explicit: confirm mechanism with required-vs-actual evidence *before* routing. One small query flips this to (b) with a precise scope.
- **Not (c) With Technical Support / client question.** We do **not** need anything from the client to progress — we have the activity ID, model, two session IDs, and two recordings. The next step is an internal data query, not a customer ask. Going back to the client now would just re-loop the ticket.
- **Not (d) Blocked.** Nothing external blocks us; the next move is in our own hands (DuckDB console / dev session on FAR01).

## Draft — internal reply (author: Ilia Kuzmin; @ Yash Patel, cc Darminder Atker)

Playbook style: status = state + so-far + evidence quality; one owner; one closed next step; explicit scoping.

> @Yash Patel — update on PLT-2882 (FAR01, can't select/isolate elements for activity `FAR01UGD1220`).
>
> **Mechanism (confirmed in code):** the linked-element **count** on the Gantt comes from the raw `activity_links` bridge, but "Select/Isolate linked elements" resolves those IDs against the loaded model and **silently drops any that no longer exist there** — with no message. So an activity whose linked elements were orphaned (their model deleted or re-versioned) shows a count but selects nothing. That matches your repro: this activity fails, other activities in the same model work.
>
> **Hypothesis (not yet confirmed against data):** the "(Retired)" activities point at elements from a superseded/removed model version, so their links are now orphaned. Note "retired" isn't a status we track — it's just part of the activity name.
>
> **One step to confirm:** on FAR01 I'll compare `FAR01UGD1220` against one working activity — how many `activity_links` rows each has vs how many of those elements still resolve to the loaded model. If broken = "count > 0 but 0 resolvable", the cause is orphaned links (a data fix) plus a UI gap (we should tell the user "N linked elements aren't in the loaded model" instead of doing nothing).
>
> **@Yash — one for the client/PM side:** was a FAR01 model **deleted or re-uploaded/re-versioned** recently (this model is `..._REV1-V23`)? That would explain when the links orphaned.
>
> Scoping: this is the web viewer's activity-linking, not the dashboard filter panel; and it's not a missing "retired filter".

## The one evidence step to run (owner: Ilia; ~15 min, needs dev/DuckDB on FAR01)

The smallest broken-vs-working diff (playbook move #3), turning the hypothesis into a confirmed cause:

1. For `FAR01UGD1220` **and** one working activity in `PC-APLD-FAR01-UND-AKS_REV1-V23`:
   `SELECT COUNT(*) FROM activity_links WHERE activityId = '<id>'` → raw linked count.
2. For those `modelElementId`s, count how many exist in `projectService.elements` (registry) and how many map via `viewerService.elementId2ModelId` / `elementId2DbId` to a **loaded** model.
3. **Expected if hypothesis holds:** broken activity = raw count > 0, resolvable = 0 (or 0 mapped to a loaded model); working activity = raw ≈ resolvable. That confirms orphaned links and pinpoints which layer drops them (`linking-service.ts:757-761` vs the viewer maps in `use-linked-element-actions.ts:40-55`).

## Follow-through the human should own (not executed here)

- **After the diff:** if orphaned-data confirmed → split into two tracks: (i) **data fix** (re-link / clean stale `activity_links`, or restore the model) — hop to BE/data (Sergey / Sachin+Ali); (ii) **FE robustness fix** (surface "N of M linked elements not in the loaded model"; stop showing a count that can't be acted on) — Darminder. Then move the ticket to **Ready For Development** with that scope.
- **Answer "why now"** (playbook #5): correlate the FAR01 model delete/re-version timeline against when links orphaned — assign an owner; don't let it drop.
- **Cohort sweep** (playbook #6): once confirmed, enumerate all FAR01 activities (esp. "(Retired)") whose links resolve to 0 — remediate in bulk, don't wait for the next ticket.
- **Watch the media** (NEEDS HUMAN): the two `.mp4`s tell whether the menu was greyed-out (all orphaned) or clickable-with-no-effect (model not loaded) — that decides the FE message wording.
- **Post-close:** add a `dashboard/pitfalls.md` (or a viewer/linking pitfalls) entry: "activity linked-element count uses the raw `activity_links` bridge; select/isolate resolves against the loaded registry/model and silently drops orphans — a count > 0 can select 0."
