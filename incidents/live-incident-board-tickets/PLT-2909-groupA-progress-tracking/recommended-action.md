# PLT-2909 — recommended action (DRAFT ONLY — execute nothing)

<<<<<<< HEAD
## ⚠️ 2026-07-24 update — the diagnostic below WAS run (07-23); action now is to wait on Ali Seyedof

Ilia ran exactly the diagnostic this file recommends, on 2026-07-23, and it confirmed the
ghost-model hypothesis on ATL08/`CY-5200` (model `DistributionBoardsPanels_Bld1-V1`, PC-EXCEL
import, source file `dd20b121`) — see `context.md` §Update. He already posted the routed question
to **Ali Seyedof** (client-element-metas ownership for that model) and stated the FE fix will be
tracked under **PLT-2882**, not here.

**Nothing further to draft right now** — the one open item is Ali Seyedof's answer, which is his
to give, not ours to chase yet (posted 07-23, one day old as of this re-check; not yet
stale enough to warrant a nudge — revisit if it sits past ~1 week, per the pattern on PLT-2649/
PLT-2858 in this same run). The merge-or-fork decision below is now **resolved as "merge into
PLT-2882"** for the FE fix; the only remaining fork is the BE root-cause ticket for the Excel
importer, which is Ali's to scope once he answers.

---

## Action as originally drafted (executed 2026-07-23 — kept for the record)

### Chosen action: (a) — reuse PLT-2882's existing diagnostic against `CY-5200` on ATL08, then post one internal status update
=======
## RE-CHECK 2026-07-28 — action superseded, new action drafted below
>>>>>>> origin/main

The 07-22 recommended action was **"run PLT-2882's `__linkDiagnose('CY-5200')` on ATL08."**
That step is **DONE** — Ilia ran it himself and posted results on-ticket 2026-07-23 (see
`context.md` § RE-CHECK). Re-running it or re-drafting that ask would be redundant. The
open item now is different: **the diagnostic's own follow-up question (asked of Ali Seyedof,
07-23) has sat unanswered for 5 days**, and Yash hasn't acknowledged the finding either. The
action below replaces the old one.

---

## Chosen action: (a) — nudge for a response, not new investigation

**Do NOT re-run the diagnostic or re-derive the mechanism** — both are settled (ghost model
`DistributionBoardsPanels_Bld1-V1`: parquet claims 6 elements, geometry/cloud list has 0; Bld2 +
federated model clean; same defect *family* as PLT-2882, but the trigger here looks like
**PC-EXCEL import-time duplication**, not a re-upload/re-version). What's missing is a reply.

### Draft internal comment (author: Ilia; @ Ali Seyedof, cc Yash Patel) — playbook style, DRAFT ONLY

> @Ali Seyedof — following up on my 07-23 question: for ATL08's `DistributionBoardsPanels_Bld1`
> model (`00156181-fca5-4a7c-acdf-a12ce924c252`), why does its `client-element-metas` list the 6
> elements from source file `dd20b121` when neither the geometry nor the model's cloud list
> contain them? My working guess is the PC-EXCEL importer wrote the same source-file rows into
> more than one building's metadata — if you can confirm/deny from the import pipeline side,
> that closes this out. It's the last open question on PLT-2909.
>
> @Yash Patel — status for the client: this is confirmed as the same defect family as PLT-2882
> (metadata says an element belongs to a model; the model's actual geometry doesn't have it), so
> "several models appear" for one activity is real but harmless-to-select-from (selecting from
> the correct model, Bld2, works fine — the extra model in the list is just noise). The FE fix
> (stop listing models that can't back their claimed elements) is already tracked under PLT-2882,
> so no separate FE ticket needed here. Once Ali confirms the import-side cause we can close this
> as duplicate-root-cause / linked to PLT-2882.
>
> Separately, still need the exact error text for the **"session id gave an error"** issue you
> flagged 07-16 — unrelated to this, routing to log-sync owner once I have it.

## Why this and not the others

- **Why (a) and not closing/merging into PLT-2882 outright:** Ilia's own comment already commits
  the FE fix to PLT-2882, but the **BE root cause differs** (import-time duplication vs
  re-versioning) and is still unconfirmed by Ali — merging the tickets fully before Ali replies
  would bury a possibly-distinct data bug (the Excel importer) inside a ticket about a different
  pipeline path (Revit re-versioning). Keep them linked, not merged, until Ali answers.
- **Not (b) Ready For Development.** The *FE* half is arguably dev-ready (and already riding on
  PLT-2882), but PLT-2909 itself still has an open BE question with no answer — moving the whole
  ticket to dev-ready would drop that thread.
- **Not (c) With Technical Support.** Nothing further is needed from the client; the block is
  purely internal (Ali's reply).
- **Not (d) Blocked.** 5 days of silence on an internal Slack/Jira ping isn't yet "blocked" in the
  playbook sense — a nudge is the right-sized action before escalating.

## Follow-through the human should own (not executed here)

- **If Ali confirms the Excel-importer duplication:** this becomes a BE data-pipeline fix
  (de-dupe / scope `client-element-metas` writes per building) — separate from PLT-2882's
  re-versioning fix, even though the FE symptom and FE fix are shared.
- **Cohort sweep for ATL05-08:** once the import bug is confirmed, check whether other
  ATL05-08 projects/buildings show the same cross-building duplication (Kyriakos's "present for
  all ATL05-08 projects" claim) — likely a project-wide re-import or backfill, not per-ticket.
- **Formal Jira link:** add a "relates to" / "is caused by same defect as" link between PLT-2909
  and PLT-2882 once the merge-or-fork call is made, so the FE fix isn't silently orphaned from
  this ticket.
- **Session-log-sync error:** still needs Yash's exact error text; still its own track, still
  unresolved as of 07-28.
- **2 image attachments:** still unopened; now lower-value evidence (diagnostic already answered
  what they'd show) — optional confirmation only, not a blocker.

---

## ORIGINAL 07-22 action (superseded, kept for record)

<details>
<summary>Original chosen action: reuse PLT-2882's `__linkDiagnose` on ATL08 (now completed 07-23)</summary>

**Do NOT re-invent tooling.** PLT-2882 already produced `window.__linkDiagnose(activityId?)` on
branch **`PLT-linked-selection-diagnostics`** (console-only, not for merge), which prints, per
model, both **`modelMembership`** (parquet-claimed models + loaded state) and
**`parquetVsGeometryByMongoModelId`** (`inParquet` vs `inGeometry`). This was the fastest,
single next step to confirm PLT-2909's mechanism on its own data — **now done** (see RE-CHECK
above for the result).

The original run steps (owner: Ilia; ~15 min; dev/editor session on ATL08), for reference:
1. Checkout `PLT-linked-selection-diagnostics`; open the editor on ATL08, schedule
   `29475-16-RL3`; load the models involved.
2. Select activity `CY-5200` → `window.__linkDiagnose('CY-5200')` → capture the JSON.
3. Read `modelMembership` vs `inParquet`/`inGeometry` per model — a model with
   `inParquet > 0, inGeometry = 0` is a ghost.
4. Run the same call for one working activity in the same schedule (broken-vs-working diff).

**Actual result (07-23, Ilia):** `DistributionBoardsPanels_Bld1-V1` — ghost, 6/6 elements
unbacked by geometry. Bld2 + federated model — clean, selection works. Confirms same defect
*family* as PLT-2882; trigger suspected to be PC-EXCEL import duplication, not re-versioning.

</details>
