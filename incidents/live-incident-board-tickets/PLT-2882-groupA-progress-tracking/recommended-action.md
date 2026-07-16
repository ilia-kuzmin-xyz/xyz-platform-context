# PLT-2882 — recommended action (DRAFT ONLY — execute nothing)

**Superseded:** the original recommendation below this line (an "internal status
update + one closed evidence step") was executed by Ilia in-thread on 2026-07-13/14
and is now done. This is the **2026-07-16 refresh** reflecting where the ticket
actually stands per `investigation-log.md`.

## Current state (per investigation-log.md, through 2026-07-15)

- **Root cause confirmed (9/10):** the 418 dead links on activity `FAR01UGD1220`
  point at element handles present in the model's `client-element-metas` parquet
  but **absent from the loaded SVF geometry** — a metadata/geometry sync gap left
  behind when the two models (`PC-...REV1-V23`, `QA-...Northwest-V35`) were
  re-versioned and the deep-underground-electrical scope was redrawn.
- **Peer disagreement raised and answered.** David Webb (BE) checked a sample
  element, found it present in the current `client-element-metas`, and argued the
  drag-and-drop auto-unlink step should have caught this — casting doubt on the
  RCA. Ilia's reply (107412, 2026-07-15) reconciled it: David checked the
  **metadata** layer (agrees, 418/418 present); Ilia's diagnostic checked the
  **geometry** layer (0/418 present) — the sync gap between those two layers *is*
  the bug, and is exactly why auto-unlink (which reads the metadata list) missed
  them. **This reply has had no response from David as of 2026-07-15 — still open.**
- **Deletion of the 418 dead links is ON HOLD**, pending David's alignment with the
  corrected RCA (Ilia said as much explicitly: "Deletion of the 418 is ON HOLD
  until he's aligned").
- **FE robustness fix** (surface "N of M linked elements aren't in the loaded
  model" instead of silently selecting nothing) is scoped but **not yet ticketed**.
- **Cohort sweep** (playbook #6 — enumerate every activity project-wide with the
  same 0-resolve pattern) has tooling but no result yet: two automated approaches
  failed (`__linkAudit()` — wrong model-membership assumption; the artefact-based
  sweep script — blind on Revit models, no `svf2-object-id-map`), a third
  (console geometry harvest + sweep script) is prod-safe and ready to run but
  **has not been run project-wide**, only validated on the one activity.
- **Trigger** ("why now" — when/why the two models were re-versioned leaving stale
  metadata) is still not confirmed by BE — the same open BE question from
  07-14/15 (`investigation-log.md` "Data / pipeline" track).

## Chosen action: (a) — two short, closed, routed follow-ups (no new investigation needed)

The investigation itself is done to a high confidence; what's stalled is **two
threads waiting on other people**, both answerable in one line each. Draft:

> @David Webb — following up on the metadata-vs-geometry point: does the
> correction above land? If so, I'll go ahead with deleting the 418 stale
> `activity_links` rows (CSV already exported) unless you see a gap.
>
> @Mostafa @Pietro — parking two things for prioritisation once David confirms:
> (1) a BE question on why `client-element-metas` and SVF geometry went out of
> sync on re-version (this is likely to recur on any re-versioned model, not just
> FAR01 — worth a data-pipeline ticket on its own), and (2) an FE ticket to stop
> the linked-element panel showing a count that can silently resolve to zero
> selectable elements.

## Why this and not the others

- **Not more investigation** — the mechanism is confirmed to 9/10 with two
  independent diagnostic runs (including a cold-cache re-run). Further digging
  has diminishing returns; the blocker is now social (peer alignment + product
  ticketing), not technical.
- **Not (b) Ready For Development yet** — can't schedule the FE robustness fix or
  the BE metadata-sync question without Mostafa/Pietro triaging them as their own
  tickets first (this ticket's scope is the FAR01UGD1220 symptom, not a general
  fix).
- **Not (c) With Technical Support / client question** — nothing here needs the
  client; both open threads are internal (David, then Mostafa/Pietro).
- **Not (d) Blocked** — "on hold" is self-imposed pending a one-message reply, not
  an external blocker; a status a human should chase rather than park.

## Follow-through the human should own (not executed here)

- Get David's explicit sign-off (or continued objection) on the corrected RCA,
  then execute the 418-link deletion (`POST /api/v2/projects/{pid}/elements/activity-links/delete`,
  batched ≤500, per `investigation-log.md`).
- Run the prod-safe geometry-harvest + sweep combo **project-wide** on FAR01 to
  get the actual cohort count (not yet done — only the one activity is verified).
- File the FE robustness ticket and the BE metadata-sync-on-reversion question as
  separate tickets once Mostafa/Pietro triage them — don't let them die inside a
  ticket that's scoped to one activity.
- Add the `dashboard/pitfalls.md` entry once closed: "activity linked-element
  count uses the metadata parquet; select/isolate needs the SVF geometry —
  re-versioning a model can desync the two, and the count doesn't know it."

**Confidence in RCA: 9/10. Confidence this is the right next step: 8/10** — the
two threads (David, Mostafa/Pietro) are the only things between "confirmed" and
"closed."
