# PLT-3095 — recommended action (drafted, not sent)

**Proposed action:** comment on the ticket routing a specific, closed technical question to
whoever owns schedule ingestion (Sachin or Ali, api-v2 — `fn_GetScheduleRevision` is called from
`schedules.service.ts`, not attributed to v1 anywhere read this run). Keep status as-is (Open)
until that answer comes back; this isn't ready for "With Technical Support" because the ask is
internal (backend), not something the customer needs to do.

**Assumption this rests on:** the hypothesis in `context.md` (duplicate item ids collapsing one
Map entry) is inferred from code reading only, not confirmed against AUS02's actual data.

---

**Draft (to post as a comment, addressed to Sachin/Ali):**

> Hi — AUS02 is missing some WBS branches in the Web Viewer even though the customer confirms
> they're in the .XER with unique codes. Could one of you check whether AUS02's current schedule
> revision has any duplicate `ItemId` across WBS and activity rows? The frontend keys everything
> by that id in a plain map, so a duplicate would silently drop one row with no error anywhere.
>
> **Can you run that duplicate check on AUS02's latest schedule revision?**

---

## 2026-09-02 — SUPERSEDED by live-prod data. Do not post the draft above.

Live-prod check (`context.md` § 2026-09-01 root-cause) found **0 duplicate `ItemId`s** — this
draft's premise is falsified. Use the draft below instead, which merges that check with the
independent XER-collision finding (`context.md` § 2026-09-02 reconciliation). Both point at the
same importer path from different data, so this is now one merged recommendation, not two.

**Proposed action:** route the (now better-evidenced) importer defect to Sachin, and hand the
customer a workaround they can use today without waiting on a fix. Keep status Open.

### Draft comment (author: Ilia; @ Yash, @ Sachin) — (91 words)

> Found the cause. AUS02's schedule has two pairs of WBS branches whose P6 codes collide once
> combined with their parents — "Milestones" collides with a small Procurement branch, and "Core &
> Shell Construction" collides with another. On import, both sides of each pair go missing, not
> just one. 415+ activities sit in the two lost branches.
>
> @Yash — quick unblock, no release needed: in P6, rename the two Procurement children so their
> codes stop colliding, then re-export and re-upload.
>
> **@Sachin — can the importer key WBS nodes on `wbs_id` instead of the concatenated code?**

### If Sachin confirms the mechanism

Give him the exact node names, task counts and both artefacts (`.xer` file, schedule-revision API
dump) already in this folder — see `context.md` § 2026-09-02 for the one thing still worth him
checking himself (whether the 4 missing live `itemId`s are exactly the 4 collision participants).

**Status suggestion unchanged:** stays with us until Sachin confirms ownership; customer gets the
workaround now via Yash.


---

# 2026-09-03 (later) — the draft to Sachin. The earlier one is WITHDRAWN, its ids are stale.

The 09-03 draft gave `9f13d821` and four ids from it. **That revision was deleted on 09-02 13:04**, so
those ids resolve to nothing — which is exactly the `count(*) = 0` Sachin reported back. Do not send it.

## Draft to Sachin — 79 words, UNPOSTED

> My ids were from revisions you've since deleted — that's why your count came back 0, not because the
> rows are missing. Sorry.
>
> The active revision `d505f075` is broken the same way. Four WBS parents referenced by children but
> never returned:
>
> ```
> 78a3bf1a-3591-4935-b7ee-9b00a58d7098    (2 WBS children)
> 94cce902-c576-4149-a03b-5b0f2fbf8a61    (4 — this is Core & Shell's branch)
> a673c5f2-f51f-4dbd-a7aa-cd5218b12ab5    (10)
> 49d1ce1e-3acc-4124-b1ef-d3778dadcb85    (11)
> ```
>
> Sequence the viewer uses: `GET /schedules` → pick `isCurrent` → `GET
> /schedules/{id}?deviceType=WEB`. That's all, no unfiltered variant.
>
> Your 232 matches what the API returns, so nothing's being filtered. Could you check those four ids
> in `ScheduleWbs` with no filters at all?

Owns the stale-id mistake in the first line, because he spent a query on it and will otherwise assume
the rows are fine. Answers his question exactly. Ends on the one query that separates "never written"
from "written and flagged".

## Optional additions — only if he asks, they are not needed to unblock him

- **`GET /schedules/{id}` does not filter deleted revisions**, while `GET /schedules` does. Proven at
  11:20 today: 1,818 rows returned for `9f13d821`, deleted since 09-02 13:04. Harmless for the viewer
  (it only requests the id the list handed it) but it is what made his count-0 confusing, and it is a
  small real inconsistency worth a ticket of its own.
- **A fresh re-upload reproduced the defect exactly** (new GUIDs, identical child-count fingerprint
  2/4/10/11, identical 638 unreachable). Stronger evidence than the two-revision determinism we had.

## If his query confirms the rows do not exist

Then this is an **importer defect**, not an API one, and the owner changes. The importer wrote child
WBS rows whose parent it never wrote — and it did so again on a brand-new upload yesterday. Two things
worth raising then:

1. **A ticket against schedule ingest**, not api-v2. It will recur on any schedule with whatever shape
   AUS02 has at those four positions (all four are mid-tree WBS nodes, 2-11 WBS children each, none a
   root).
2. **The importer should not publish a revision whose parent references do not resolve.** 35 % of this
   schedule has been invisible since 08-31 and every surface downstream trusted the payload. A
   referential check at ingest would have failed the upload instead of shipping a third of it dark.

**Still unanswered from 09-02:** Yash asked whether he should change boards and flagged it urgent on
the user end.

---

# 2026-09-03 (Teams thread) — next reply. The 12:43 draft was sent and did its job.

Root cause is localised (ingest drops a WBS row present in the XER). Two things need correcting or
answering in the thread, and Yash's board question is now answerable.

## Draft to the thread (Sachin + Ali) — 90 words, UNPOSTED

> Re-uploading won't fix it — `d505f075` is already a fresh upload from yesterday 13:06, and it
> reproduced the same four missing parents with new ids. Same 638 rows unreachable.
>
> Best diff: in `PROJWBS`, compare row `16793` against its siblings in the same file. The siblings
> ingested fine — Parking & Landscape, Mechanical Yards, Electrical Yards, Interior Build-Out are all
> there — so whatever differs is in the field values, not the structure.
>
> Worth pulling the other three parent ids too, four samples beat one.
>
> **Who owns schedule ingest — is Kuba the right person?**

Leads with the re-upload correction because Ali suggested it at 13:06 and it would cost a cycle on a
**customer project** he himself flagged at 13:12 as one not to upload to. Then hands over the tightest
available test, then answers Sachin's 13:57 question by asking it back to the room, since neither of
us owns that call.

**Do not offer the only-WBS-children theory** — tested and falsified, 26 nodes that ingested fine
share the trait (`context.md` § 5).

## ⏳ Yash's board question is now answerable — and it has been open since 09-02 14:10

He asked whether to change boards and flagged it **urgent on the user end**. Two days ago. The answer
was unavailable then and is available now: **the defect is in schedule ingest**, not FE and not
api-v2. So the ticket should move to whichever board owns the data pipeline / ingest, with the owner
named once Sachin's question is resolved.

**That is the oldest unanswered thing on this ticket and it is a coordinator waiting on us, not a
customer.** Worth clearing in the same pass.

## What the customer still has not been told

They reported *Core & Shell*. Three more whole branches are invisible — the **Milestones** group,
**long-lead MEP procurement**, and **structural procurement**. 638 rows, 35 % of the schedule. They
will find this themselves the moment they look, and it is better coming from us. No draft yet — it
needs a line on timing, which depends on the ingest owner.

---

# 2026-09-03 (post-XER) — the reply that closes the diagnosis. All earlier drafts are spent.

## Draft to the thread — 74 words, UNPOSTED

> Found it — it's in the file, and it explains all versions.
>
> 236 WBS rows in the XER, 232 in the DB. The 4 lost are the only ones whose concatenated short-name
> path isn't unique:
>
> ```
> AUS02-60-Schedule-L1-.1.1.1  ->  16793 Milestones  +  17012 CFCI Procurement
> AUS02-60-Schedule-L1-.1.1.2  ->  16811 Core & Shell Construction  +  17015 OFCI / OFE Procurement
> ```
>
> Nothing else in 236 rows collides, and `userItemId` matches that path for all 232 survivors. Both
> members of each pair are dropped, not one.
>
> Quick unblock: rename one short name in P6 and re-upload.
>
> **Should we key on `wbs_id` instead?**

Why this shape:

- **Leads with "it's in the file"** because Sachin's last message was *"parent-child relationship is
  missing for each version"* — the file explains the "each version" part exactly, so it lands as an
  answer to what he just said.
- **Gives the two colliding paths, not a theory.** He can verify both in one query.
- **States "both members are dropped"** because it rules out an overwrite and points at a unique-key
  rejection or dedup step. That is the detail that changes where he looks.
- **Ends on the design question**, not on a fix instruction — the keying decision is api-v2/ingest's
  to make, not ours.
- **Does not mention the deleted-revision confusion** or which file he downloaded. Both are now moot
  and raising them costs goodwill for nothing.

## Then, in order

1. **Offer the customer the workaround today.** Rename any one of the four `wbs_short_name` values in
   P6 — e.g. *Milestones* from `1.1` to `1.0` — and re-upload. Two-minute edit, unblocks them without
   waiting for an ingest fix, and it confirms the mechanism in their own environment. **This is the
   only thing on this ticket that helps the customer this week.**
2. **Answer Yash's board question** (open since 09-02 14:10, flagged urgent). The defect is in
   schedule ingest — the ticket belongs on the board that owns it.
3. **Tell the customer the full scope.** They reported Core & Shell. Also invisible: the entire
   **Milestones** group, **CFCI Procurement**, and **OFCI / OFE Procurement** — 638 rows, 35 % of the
   schedule.
4. **Get an ingest owner named.** Sachin asked "who can check upload mechanism, Kuba?" and nobody has
   answered.
5. **Raise the ingest ticket** with the three fix directions (key on `wbs_id`; fail the upload loudly;
   add a parent-reference check at ingest). Not ours to implement — the importer is outside this
   session's repo scope.

## One correction to carry into that ticket

The **"concatenated P6 code collision" theory was right**, and this folder recorded it as unsupported
on 09-02. The reasoning then was sound — 0 duplicate `userItemId` among returned rows — but the
theory predicts the duplicates are *removed*, so their absence was never counter-evidence. Say so
plainly if the theory's earlier dismissal comes up.

## Draft to Yash (Jira comment) — 96 words, UNPOSTED

Written for relay: Yash pastes into Freshdesk 7800, so no GUIDs, no `userItemId`, no table names.

> Root cause found, and it's fixable on their side today.
>
> Four WBS branches are dropped on import because two pairs end up with the same generated code:
> **Milestones** and **CFCI Procurement** both become `1.1.1`; **Core & Shell Construction** and
> **OFCI / OFE Procurement** both become `1.1.2`. Our importer can't tell them apart, so it drops all
> four — 638 rows, a third of the schedule.
>
> Ask them to change one WBS code in P6, e.g. Milestones from `1.1` to `1.0`, and re-upload.
>
> **Also happy to move this to the backend board — it's an import issue, not viewer.**

Three deliberate choices:

- **Names the other three branches.** Yash and the customer only know about Core & Shell. They will
  find the rest themselves the moment the tree comes back, and it is better said now.
- **Leads with the workaround, not the diagnosis.** They have been blocked since 08-31 and have
  already tried four things that could not have worked. The one thing that helps them is a two-minute
  edit in P6.
- **Answers his board question in the last line** — open since 09-02 14:10 and flagged urgent. He
  asked; it costs one sentence.

Deliberately absent: `wbs_id`s, `SourceFileWbsId`, `userItemId`, the deleted-revision confusion, and
the "both members are dropped" detail. All correct, none of it useful to a coordinator or a customer —
that material belongs in the ingest ticket.

**Caveat to state if he asks how sure we are:** the workaround is inferred from the mechanism, not yet
observed working. It is high-confidence (renaming provably breaks the collision) but the re-upload is
the confirmation. Worth framing to the customer as "this should fix it, tell us either way" rather
than a guarantee.

---

# 2026-09-03 — THE CONSOLIDATED COMMENT. Every earlier draft in this file is dead.

Ilia: *"that's awful that you overlap self's replies every time, that's why earlier I haven't posted
that draft"*. Fair. Four drafts went out on this ticket in one day and one of them carried a **wrong
fix**. This is the single one, verified before writing.

**The error that must not repeat:** the earlier draft said "rename Milestones `1.1` → `1.0`". Simulated
against the file, that resolves **one of two** collisions and leaves *Core & Shell Construction* — the
branch the customer actually reported — still dropped. Verified fix table:

| rename | outcome |
|---|---|
| Milestones `1.1` → `1.0` | ❌ `1.1.2` still collides |
| Core & Shell `1.2` → `1.7` | ❌ `1.1.1` still collides |
| both of the above | ✅ resolved |
| **Procurement `1` → `3`** (or `9`, `PROC`) | ✅ **both resolved, one edit** |

## The comment to post — 128 words, UNPOSTED

> **What's wrong**
>
> Our importer identifies each WBS row by joining the parent codes with dots. Two pairs in this
> schedule produce the same result:
>
> - Milestones (`1.1`) and CFCI Procurement (`1`+`1`) → both `1.1.1`
> - Core & Shell Construction (`1.2`) and OFCI / OFE Procurement (`1`+`2`) → both `1.1.2`
>
> It can't tell them apart, so it drops all four. Their children lose their parent, which hides 638
> rows — a third of the schedule.
>
> **Fix on the customer side (works today)**
>
> Rename **Procurement** from `1` to an unused code, e.g. `3`, and re-upload. That one change clears
> both clashes. Renaming only Milestones would fix just one, leaving Core & Shell still missing.
>
> **Fix on our side**
>
> Key WBS rows on the file's own id, which we already store, instead of the generated code — and
> reject an upload that would drop rows rather than importing it silently.

**Confidence:** diagnosis ~97 % (236 file rows vs 232 imported; exactly 2 colliding paths covering
exactly the 4 missing rows; 232 of 234 paths match `userItemId` 1:1 with none unaccounted). The
**rename is inferred from that mechanism, not from reading the importer** — which is outside this
session's repos. Simulated against the file, so it is sound arithmetic; the re-upload is the proof.
If asked, frame it as "this should fix it, tell us either way".

**Deliberately absent:** `wbs_id`s, `SourceFileWbsId`, `userItemId`, revision GUIDs, the deleted-revision
episode, and "both members of each pair are dropped". All true; none of it helps a coordinator or a
customer. That material belongs in the ingest ticket.
