# PLT-2918 — recommended action (DRAFT ONLY — execute nothing)

## ✅ CURRENT STATE (2026-07-22 evening) — messages finalized, ready to post

Yash replied on the ticket with a partial misread ("so it was the reupload that messed
it up; only solution is manual correction?"). Two corrections baked into the final
reply below: (1) the reupload only set the stage, the save session did the deleting;
(2) manual is the LAST resort behind BE restore and a scripted re-map.

**Ownership split (agreed with Ilia):**
| # | Step | Owner |
|---|---|---|
| 1 | Post the Yash reply below | Ilia |
| 2 | Audit + soft-delete/restore questions | **Sachin (BE)** — message below |
| 3 | Full last-week export from Paddy (all packages) | Yash → client |
| 4 | Recovery: BE restore if possible, else one-off re-map script via existing mapping API (NOT a code change, no deploy — PLT-2882 sweep-script pattern, ~half a day) | Sachin or Ilia |
| 5 | FE fix ticket — the ONLY real development in the plan: merge-not-mirror `saveDataMapping` (`category-mapping-service.ts:265-271`) + cascade guard (`:643-650`). Warranted even if audit shifts attribution — Save deleting untouched types is a standing hazard | **Ilia (FE)**, after recovery starts |

Guard throughout: no Saves in the AUS01 mapping panel until step 4 completes.

### FINAL reply to Yash (v2 — post this)

> @Yash almost. The reupload itself didn't delete anything, it just left ~2119
> activities unmapped. Looks like someone then fixed them in the mapping panel, and
> our Save has a bug: it can delete category values it shouldn't. So the reupload set
> the stage, the save did the deleting. I'm confirming this with the api-v2 team via
> the audit trail.
>
> Manual correction is the last resort, not the only option:
> 1. backend restore of the deleted records (checking with Sachin)
> 2. if that fails, I re-apply them with a script from Paddy's export
> 3. manual only if both fail
>
> Can you ask Paddy for the full export from last week (all packages, not just
> Precast)? Roof, Earthworks and Painting have losses too that he hasn't noticed yet.
>
> Separately I'll raise an FE ticket to fix the Save bug itself, so this can't happen
> again.
>
> ⚠️ And please make sure nobody presses Save in the AUS01 mapping panel until we've
> restored.

### Message to Sachin (ticket comment with @, or Slack)

> Hi @Sachin, need your help on PLT-2918 (AUS01, HITT). Around ~2030 activities lost
> their "WBS Location" category mappings, other category types untouched. The rows
> are gone from the mappings API output, and I suspect our mapping panel's save
> deleted them in one session sometime after Jul 12. Two questions:
>
> 1. **Audit:** do we keep any history on activity category mappings
>    (`activity_category_mapping`)? I need deletion timestamps + user for WBS
>    Location rows on AUS01 since Jul 12. One example to anchor the lookup: activity
>    A4300, itemId `9d0fed9c-c79d-4c53-9446-454516ab3e11`, its WBS Location was
>    "Area G/H" until last week, mapping now gone.
> 2. **Restore:** are deletions soft (flag) or hard? If soft, can you restore the
>    deleted WBS Location rows for AUS01 in bulk? That would close the recovery in
>    one move, otherwise I'll re-apply them by script from the client's export.
>
> The timestamps matter beyond recovery: they tell us whether the deletions match one
> mapping-panel save session (my theory) or came from the schedule upload job, which
> changes what we fix.

---

## ⚠️ SUPERSEDED (2026-07-22, after live-data investigation) — earlier sequencing below

Investigation converged (see investigation-log.md rounds 1–3): root cause = the
mapping panel's destructive Save (single-type, subtree-shaped deletion confirmed
against live data; re-upload carry-over refuted). Sequence:

1. **Post the comment below** (root cause + guard + two routed asks). Ilia posts.
2. Sachin/Ali: audit/soft-delete on `activity_category_mapping` → restore set.
3. Yash → Paddy: full last-week export (all packages) → recovery diff (losses
   extend beyond Precast: Roof, Earthworks, Painting, Partitions, Level 1).
4. Restore data (BE restore or re-map from export) — unblocks the client's report.
5. Only then: FE dev ticket (merge-not-mirror `saveDataMapping`
   `category-mapping-service.ts:265-271` + descendant-cascade guard `:643-650`)
   → Ready For Development.

### FINAL draft comment (informal revision Ilia requested — post THIS one; @ Yash)

> Hi @Yash, I've dug into this today. Here's how I see it.
>
> **Confirmed from live data:** the Precast WBS Locations are genuinely deleted from
> the project data, not just hidden. I checked all ~10k mappings on AUS01. 7,879
> activities still have WBS Location, so it wasn't a blanket wipe. Precast lost 19 of
> 21, and there are similar holes nobody reported yet: Roof 37/40, Earthworks 52/196,
> Painting 34/410, some Partitions and Level 1 commissioning. Discipline/Package/Phase
> are intact everywhere.
>
> **My working theory:** the schedule re-upload around Jul 12 (`AUS01-260712-C_updated1`)
> surfaced ~2119 unmapped activities, someone then worked in the mapping panel to fix
> them. Our mapping Save has a dangerous behaviour: it deletes any category value
> that's blank in the panel's memory, and edits cascade down whole subtrees. That
> produces exactly this pattern (one type wiped across specific branches, everything
> else untouched). It also explains the "changed into sequences" Paddy saw: steel
> frame sequence values briefly bleeding onto Precast during that session.
>
> To be clear, the deletion and its scope are confirmed. Which action deleted them is
> still a theory until we get an audit trail, I'm asking the api-v2 team for deletion
> timestamps on the mapping records.
>
> Meanwhile, two things:
> 1. ⚠️ please make sure nobody presses Save in the AUS01 mapping panel for now,
>    another session could wipe more values
> 2. can you ask Paddy for the full export from last week (all packages, not just
>    Precast)? Diffing it against current state gives us the complete restore list,
>    including losses he hasn't noticed
>
> Good news is the data is recoverable. Worst case we re-map from his export, best
> case backend restores the deleted records directly.

(Separate ping to Sachin/Ali about the `activity_category_mapping` audit trail goes
out after this, or fold in with @-mentions.)

### Earlier formal draft (superseded by the informal one above)

> Update on PLT-2918 — root cause identified, data recovery needed before any code fix.
>
> **What happened (confirmed against live data today):** the WBS Location mappings
> weren't lost by the schedule re-upload — they were **deleted by the mapping panel's
> Save**. The save logic treats the in-memory activity as the full source of truth:
> any category type that's null in memory gets its persisted mapping deleted, and
> edits cascade to every descendant activity, clearing descendant types
> (`category-mapping-service.ts:265-271`, `:643-650`). One editing session after the
> `AUS01-260712-C_updated1` re-upload (likely fixing the "2119 un-mapped activities"
> — the steel-frame sequence work) wiped WBS Location across whole subtrees while
> leaving Discipline/Package/Phase intact.
>
> **Evidence (DuckDB, current revision):** 7,879 WBS Location mappings still exist
> and are keyed to current activities, so this is not a re-upload/carry-over failure.
> The loss is single-type and subtree-shaped with sharp boundaries — Precast 19 of 21
> missing, Roof 37/40, Earthworks 52/196, Painting 34/410, while dozens of packages
> are 100% intact. The deleted values exist neither on current activities nor as
> orphaned rows → deleted outright.
>
> ⚠️ **Until recovery is done, please make sure nobody presses Save in the AUS01
> mapping panel** — each save session can widen the loss.
>
> **@Sachin / @Ali — one question:** is there an audit trail or soft-delete on
> `activity_category_mapping`? Need: deletion timestamps + user for WBS-Location-type
> rows on AUS01 since ~Jul 12. That dates the trigger and gives us the exact restore
> set (ideally a soft-delete restore).
>
> **@Yash — one ask for Paddy:** the full last-week export (all packages — the
> attached one is filtered to Precast). Diffing it against current state gives the
> complete recovery list; the data shows losses beyond Precast (Roof, Earthworks,
> Painting, Partitions, Level 1 commissioning) that likely haven't been noticed yet.
>
> Scoping: the re-upload itself and the "2119 un-mapped" banner are separate,
> expected behaviour (dropped activities orphan their mappings); the defect is the
> destructive save. FE fix (make Save merge instead of mirror + cascade guard) will
> be raised as a separate dev ticket once recovery is underway.

---

## ORIGINAL (superseded) chosen action — kept for the record

## Chosen action: (a) — post the first analysis comment: state the code-verified mechanism, name the ONE data check that pins delete-vs-overwrite, and ask the ONE closed trigger question

This ticket is fresh (Open, no analysis yet). The single highest-value move is to (1) convert the client's report into a mechanism the team can act on, (2) run/assign the one data diff that decides *deleted vs re-pointed*, and (3) get the dated "why now" question to an owner **now**, before the trail goes cold (playbook: an unanswered "why now" is an open incident wearing a closed label). Keep **Ilia Kuzmin** (assignee) as owner of the code + data step; route the trigger question to **Yash Patel** for the client/PM side.

## Why this and not the others

- **Not "Ready For Development" yet.** We have identified a real destructive-save vector in code (`saveDataMapping` deletes null category types across *all* types; edits cascade to descendants and clear descendant types — see `context.md §Mechanism B/C`). But we have **not** confirmed it fired for AUS01/Precast, nor whether the mappings were *deleted* or *re-pointed to Sequence*, nor the trigger. Routing to dev now risks fixing the wrong vector (FE merge-on-save vs re-import re-keying is a data/BE fix). The playbook is explicit: confirm mechanism with a required-vs-actual diff **before** routing. One data check flips this to a precisely scoped dev ticket.
- **Not "With Technical Support."** We do not need anything further from the client to *progress the investigation* — we already have a live-broken sample (`A4300`, AREA G/H → empty) and the mechanism. The next step is an internal data/history query, not a customer ask. The one thing we do want from the client side (was there a re-upload?) is a PM/ops question routed through Yash in the same comment, not a hand-back of the ticket. Handing to TS now would just park it.
- **Not "Blocked."** Nothing external blocks us; the data/history check is in our own hands (Activity API v2 / DB on AUS01). The trigger question runs in parallel — it does not block the data check.

## Owner map (one question, one owner — playbook message-craft)
- **Ilia Kuzmin:** the data/history check (delete vs overwrite; when/by whom).
- **Yash Patel → client/PM:** the single dated trigger question (re-upload?).

---

## Draft — analysis comment (author: Ilia Kuzmin; @ Yash Patel)

Playbook style: state + mechanism + one closed data step + one dated trigger question; explicit scoping; no hedging.

> Looked into PLT-2918 (AUS01, Precast WBS Location mappings gone; `A4300` = AREA G/H in the export, empty in the viewer). Mechanism, then two asks.
>
> **What "WBS Location" is:** it's one of the project's activity *category types* (same family as Phase/Discipline/Package/Sequence) — a mapping between an activity and a category, not a value parsed from the schedule's WBS tree. So "removed" means the activity↔category mapping is gone or re-pointed, not that the model changed.
>
> **How it can disappear silently (confirmed in code):** the data-mapping panel's Save is a *destructive diff* — for a changed activity it deletes the stored mapping of **any** category type that is empty in memory, including types the user never touched. Editing one category also **cascades to every child activity** and **clears the child category types**. So a single edit on a Precast parent/WBS node can mark the whole Precast subtree as changed and, on Save, delete WBS Location across the entire package — which matches "the whole package was removed."
>
> **Scoping:** this is the schedule activity-category mapping (Gantt data-mapping panel), not the 3D viewer, and not the P6 WBS hierarchy parsed at upload — different concept with the same letters.
>
> **@Yash — one for the client/PM (dated cause):** was the **AUS01 schedule re-uploaded/re-imported** between the export they're comparing to and now — and was anyone editing the data-mapping panel (e.g. steel-frame "sequences") in that window? A re-import carries no category values, so it's the leading trigger to rule in/out.
>
> I'll run the data check below to confirm deleted-vs-re-pointed before we scope a fix.

---

## The one data/evidence step to run (owner: Ilia; needs Activity API v2 / DB on AUS01)

The smallest broken-vs-working diff (playbook move #3) — turns the hypothesis into a confirmed cause and decides FE-vs-data ownership:

1. For **`A4300`** and 2-3 other Precast activities: do the persisted **WBS Location** category mappings **still exist** (rows present, just not rendering) or were they **deleted**?
   - Still exist → rendering/hydration bug (ID-keying, `context.md §Mechanism D`) — FE, non-destructive.
   - Deleted → the destructive Save/cascade (`§Mechanism B/C`) fired — confirm blast radius.
   - Re-pointed to a **Sequence** category → the descendant-type-clearing/hierarchy path — confirm the Precast type hierarchy vs steel frame's.
2. If there is a **lastModified / audit trail** on the mapping records: when and by whom were the Precast WBS Location rows last changed? Line this up against the trigger window (re-upload / panel edit / deploy).
3. **Broken-vs-working within AUS01:** confirm steel-frame / other-package WBS Locations are intact today. If yes, the cause is scoped to the Precast subtree (supports the cascade hypothesis, rules out a global hydration failure).

## Follow-through the human should own (not executed here)

- **After the data check:** if the destructive Save/cascade is confirmed → scope a **FE fix** (Save should merge, not delete category types the user never edited; and re-evaluate descendant-type clearing so a parent edit can't silently wipe a whole package) → then **Ready For Development**, owner Darminder. If it's a re-import re-keying activities → **data/BE** track and consider re-filing the domain slug to `data-pipeline`.
- **Answer "why now" (playbook Q5):** don't let the re-upload/deploy question drop — assign it an owner and get a dated answer.
- **Cohort sweep (playbook Q6):** once confirmed, enumerate **all** AUS01 activities (Precast first, then any package edited in the same window) whose WBS Location — and possibly phase/discipline/package — was wiped; remediate in bulk, don't wait for the next report.
- **Read the 4 attachments (NEEDS HUMAN):** they disambiguate empty-column vs Sequence-values, which decides the exact fix wording.
- **Post-close:** add a `dashboard/pitfalls.md` entry — "data-mapping Save is a destructive per-type diff: it deletes stored mappings for every category type null on the in-memory activity, and edits cascade to descendants clearing descendant types — a single edit can wipe a whole package's WBS Location." (Not editing outside this folder per task constraints — noting only.)
