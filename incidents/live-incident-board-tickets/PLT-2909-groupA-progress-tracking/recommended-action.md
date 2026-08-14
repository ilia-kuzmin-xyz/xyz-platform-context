# PLT-2909 — recommended action (DRAFT ONLY — execute nothing)

## 2026-08-14 check — no change, nudge still stands unsent

Re-fetched the ticket: no new comments since Yash's 07-31 "do you want me to move this to DPL?"
Ali still hasn't replied — now **14 days**, not 10. The 08-10 nudge draft below is unsent and still
the right action; nothing to re-diagnose. Re-raising here only because 14 days is materially past
the 08-10 checkpoint and this is now the second run in a row finding the same silence — worth a
human actually sending the nudge rather than a third run reconfirming it.

## ⚠️ 2026-08-10 update — 10 days unanswered, the wait-threshold has now passed; nudge

Nothing new to diagnose. Ali Seyedof still hasn't answered Yash's 07-31 "do you want me to move
this to DPL?" — 10 days now, past the ~1-week revisit point this ticket's own history used on
08-05/06/07 without escalating. Draft nudge (owner: Yash, addressee: Ali, cc Ilia):

> @Ali Seyedof — following up on my 07-31 question: do you want this moved to DPL, or should we keep
> tracking the metadata cross-write here? No pressure on the fix itself, just need to know where it
> lives so we're not duplicating tracking.

Why a nudge and not more: the mechanism is settled (9/10, PC-EXCEL importer cross-writing element
rows into sibling buildings' metadata, confirmed project-wide on ATL08); the FE mitigation already
rides on PLT-2882; the only open item is a routing question, not a diagnosis gap.

---

## ⚠️ 2026-08-03 update — Ali engaged and answered with data, then a routing question stalled 3 days

Since the 07-28 action below was drafted, the ticket moved forward materially (all captured in
`context.md`'s 07-28 "CROSS-WRITE PROVEN" section and `investigation-log.md`):

- Ali asked for the exact Revit file (07-28 14:05); Yash supplied it same day; Ilia verified it was
  the right model (07-28 14:45).
- Ilia caught and fixed his own mistake before it reached Ali — a first-draft element sample didn't
  actually belong to the Bld1 model in question — and posted the corrected CSV of ~650 cross-claimed
  elements (07-28 15:32), scoped to the model Ali is actually examining.
- **07-31 13:51, Yash: "do you want me to move this to DPL?"** — addressed to Ali. **Unanswered as
  of 2026-08-03 (3 days).** This is the only open item on the ticket right now.

**Recommended action now: nothing to draft — this is purely a nudge-timing call, not a re-diagnosis.**
3 days is not yet stale enough to escalate past Ali (contrast PLT-2858's 18+ days). If it passes a
week without a reply, a one-line nudge is the right next move, same pattern as the 07-24 pass on
this same ticket. Yash's question itself ("move to DPL?") is reasonable and doesn't need a redirect
— DPL is plausibly the right home for backend metadata-generation work if Ali confirms the CSV
findings, but that's Ali's call once he's looked, not ours to pre-empt.

**One thing worth flagging to Ilia directly (not a Jira action):** the CSV handed to Ali on 07-28
already proves the cross-write **without needing his local Revit conversion at all** — the
`sourceFileElementId` identity match across mutually-exclusive-system models is conclusive on its
own (`investigation-log.md`, "the alternative hypothesis" section already anticipates this: either
Ali finds a genuine pipeline mismatch, or the .rvt files themselves share element identity
upstream of any importer bug). Worth pre-empting that "conversion is faithful, no mismatch" reply
by re-stating plainly that BOTH outcomes still point at the same fix (the metadata is wrong either
way; only *whose* bug it is changes) — so Ali's answer doesn't accidentally read as "nothing to fix."

---

## RE-CHECK 2026-07-28 — action superseded, new action drafted below

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
