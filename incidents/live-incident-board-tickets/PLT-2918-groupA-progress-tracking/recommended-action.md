# PLT-2918 — recommended action (DRAFT ONLY — execute nothing)

> ## Update 2026-07-23 — Yash's follow-up now confirmed the destructive-save mechanism with live data; drafting the reply to his direct question
>
> Since the analysis comment below was posted (07-22 17:33), Ilia ran the data check independently
> and confirmed on the live ticket: WBS Location mappings are **genuinely deleted** (not hidden) for
> **19/21 Precast, 37/40 Roof, 52/196 Earthworks, 34/410 Painting**, plus some Partitions and
> Level-1-commissioning activities on AUS01 — 7,879/~10k activities untouched, and
> Discipline/Package/Phase intact everywhere (only WBS Location hit, consistent with §Mechanism B: the
> destructive per-type diff only nulls types absent from the in-memory `activityItem`). Working theory
> posted: a **July 12 schedule re-upload** surfaced ~2,119 unmapped activities, and someone then
> **worked the mapping panel to fix them** — that Save session is what triggered the destructive
> per-type delete across the touched subtrees.
>
> **Yash replied 07-22 18:08, asking directly: *"so basically it was due to a schedule reupload on Jul
> 12 and somehow it was messed up. Only possible solution from here is to manually correct them? what
> would you suggest as further course of action?"*** — this is now the single open question on this
> ticket. Drafted reply below.
>
> ### Draft reply to Yash (author: Ilia Kuzmin)
>
> > Yes — re-upload surfaced the unmapped activities, then the mapping-panel Save wiped WBS Location
> > across whatever subtrees got touched in that session (it deletes any category type that's empty in
> > memory for a changed activity — confirmed in code, not specific to this one save).
> >
> > Manual re-keying isn't the first move — two better recovery paths, in order:
> > 1. **Ask BE whether `activity_category_mapping` keeps soft-delete/audit rows** for the ~160
> >    affected activities. If yes, this is a one-time bulk restore, not manual re-entry.
> > 2. **If not, re-derive from the export you already have** (it holds e.g. `A4300` = AREA G/H) and
> >    script a bulk re-create from that file rather than hand-typing ~160 rows.
> > Manual re-entry is the fallback only if both of those come back empty.
> >
> > Separately, I'm filing a **prevention fix**: category-mapping Save currently treats "empty in
> > memory" as "user wants this deleted" for *every* category type on a changed activity, not just the
> > one edited — that's what let one WBS-Location cleanup session wipe Discipline-sibling data.  Fix
> > is scoped (touched-type tracking through `mapping-service.ts` into `saveDataMapping`), targeting
> > Darminder's queue.
> >
> > Recovery and prevention are two separate tickets — recovery is urgent/BE, prevention is a
> > dev-scoped FE fix; no need to block one on the other.
>
> ### Prevention fix — precise enough to file as its own dev ticket
>
> **Root gap:** change-tracking is activity-grained only. `_localChangedIds`/`_changedActivityIds`
> (`mapping-service.ts:69-70`, populated `:496-501`) are `Set<activityId>` — which *category types*
> changed within an activity is computed at edit time (`computeCategoryMapUpdates` in
> `category-mapping-service.ts` returns `updates` keyed by `categoryTypeId`, consumed at
> `data-mapping-dropdown.tsx:85-92` → `mapping-service.ts:491-512`) but discarded before Save runs —
> `_updateActivityData` has the touched-type keys in `data` at `:496-501` and records only the
> activity id. (Proof the granular signal is recoverable: undo history already stores per-type
> previous/updates at `:469`.)
>
> **A never-touched type and an explicitly-cleared type are already distinguishable** — clearing a
> dropdown sets `updates[typeId] = null` explicitly (incl. descendant auto-clears,
> `computeCategoryMapUpdates:643-650`); an untouched type never appears in `updates` at all.
>
> **Fix, two call sites:**
> 1. `mapping-service.ts:496-501` — change `_localChangedIds`/`_changedActivityIds` from
>    `Set<activityId>` to `Map<activityId, Set<categoryTypeId>>`, populated from `Object.keys(data)`.
> 2. `category-mapping-service.ts` `saveDataMapping()` (~249-273) — iterate only each activity's
>    **touched** categoryTypeIds instead of all `getCategoryTypes()`; the delete branch (~265-271)
>    then only fires for types the user actually cleared.
>
> **Explicitly out of scope for this fix:** the descendant-cascade clear
> (`computeCategoryMapUpdates` step 3, ~643-650) that nulls descendant category types when a parent
> changes — that may be intended behaviour; note it in the dev ticket but don't fold it into the same
> patch.
>
> **No existing recovery/audit mechanism found on the FE/API surface** —
> `IActivityCategoryMapping` has no `deletedAt`/version field, `deleteMappings` is a hard
> `/mapping/delete` POST, and `activity_categories_flat` / OPFS parquet are rebuilt from the live API
> (no snapshot to roll back to). Whether the **backend DB** keeps soft-deletes is unknown — that's
> the BE question in the draft reply above, and the fastest possible recovery path if it exists.
>
> **Confidence:** mechanism/fix-shape 8/10 (traced end-to-end with file:line); that BE has a
> recoverable audit trail — unknown, needs a BE answer, not guessable from this codebase.

---

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
