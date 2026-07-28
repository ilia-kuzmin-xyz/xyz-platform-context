# PLT-2918 — "HITT - AUS01 WBS Location Mapping Removed automatically on web viewer" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2918
- **Issue type:** Live Incident · Software Area: **Web Viewer**
- **Status:** **Dev In Progress** (changed from Open → Dev In Progress on **2026-07-23 10:14 BST**, no comment attached to the transition itself)
- **Priority:** Major
- **Project (site):** **HITT — AUS01**
- **Reporter (Jira):** Yash Patel (support/coordinator) · **Assignee:** Ilia Kuzmin
- **End user:** Paddy Dennison (client-side, doing the AUS01 report)
- **Created:** 2026-07-21 · **Freshdesk:** #7461
- **Issue links / remote links:** none (`issuelinks: []`, remote issue links: `[]`) — **no linked PR/branch on this ticket**, see §Verify-in-code below.
- **Attachments:** 4 image attachments (screenshots) — still **unreadable here** (Atlassian binary media behind auth). No longer decision-critical: the 07-23 comment thread supersedes them with concrete numbers (see below).
- **Domain slug:** `progress-tracking` (unchanged, same justification as 07-22 — activity↔category mapping layer that feeds progress reporting, not the 3D viewer or the P6 WBS parser).

---

## What changed since the last check (2026-07-22)

The 07-22 folder (`PLT-2918-groupA-progress-tracking/`) recorded a **hypothesis**: a destructive per-type diff in `CategoryMappingService.saveDataMapping()` deletes any category type left null in memory across **all** types, amplified by descendant-cascade edits, and speculated this could explain the Precast WBS Location loss — but flagged the trigger and delete-vs-overwrite question as **unconfirmed, needing a data/history check**.

Two new comments landed the same evening and the next morning, run by **Ilia Kuzmin** (the assignee) himself, and they **confirm the hypothesis with real numbers**:

**Comment (Ilia Kuzmin, 2026-07-22 17:33) — data check result:**
- Confirmed from live data: Precast WBS Locations are **genuinely deleted** from the project data, not just hidden/mis-rendered (rules out the §D "hydration keyed on itemId vs activityId" secondary vector as the primary cause).
- Checked all ~10k mappings on AUS01: **7,879 activities still have WBS Location** — not a blanket wipe.
- Damage is **scattered across multiple packages/branches**, not Precast-only as first reported:
  - Precast: 19/21 lost
  - Roof: 37/40 lost
  - Earthworks: 52/196 lost
  - Painting: 34/410 lost
  - some Partitions and Level 1 commissioning also hit
- **Discipline/Package/Phase are intact everywhere** — only the WBS Location category type is affected. This matches §B of the mechanism exactly: a per-type diff that only nukes the type(s) null in memory, not all types indiscriminately.
- **Working theory as stated by Ilia:** the AUS01 schedule re-upload around **Jul 12** (`AUS01-260712-C_updated1`) surfaced ~2,119 unmapped activities. Someone then went into the mapping panel to fix them, and Save's "delete anything blank in memory" behaviour wiped WBS Location across the branches touched in that session (not the whole project) — plus cascaded edits explain "changed into sequences" as steel-frame Sequence values briefly bleeding onto Precast rows during that same session.

**Comment (Ilia Kuzmin, 2026-07-23 09:50) — refined mechanism + remediation plan**, after Yash asked "so it was the reupload — manual correction the only option?":
- **Correction/refinement:** the re-upload itself did **not** delete anything — it only left 2,119 activities unmapped. It was the **subsequent manual mapping-panel session** whose Save deleted category values it shouldn't have. So: re-upload set the stage (created a large pool of null WBS Location values in memory), the Save bug did the actual deleting. This is a more precise statement of the same root cause as 07-22, not a contradiction.
- **Remediation options given, in preference order:**
  1. Backend restore of the deleted records (checking with **Sachin**)
  2. If that fails, re-apply mappings via script from Paddy's export
  3. Manual correction — last resort only
- **Separately:** Ilia will raise an **FE ticket to fix the Save bug itself** so this can't recur. As of this check, that ticket does not yet exist as a linked issue on PLT-2918 (`issuelinks` empty) — likely not yet filed, or filed but not linked back.
- Yash (09:58): will tell the client work is ongoing, **will not mention the bug** to the client.

**Net effect on the 07-22 hypothesis: CONFIRMED, not changed.** All three previously-open unknowns are now resolved:
- Delete vs re-point → **delete**, confirmed against live data (not a rendering/hydration bug).
- Scope → **not Precast-only**; every package/branch touched in the Jul-12 remediation session lost WBS Location, discipline/package/phase untouched. Confirms §B (per-type diff, not global) over §D (ID-keying) as the operative mechanism.
- Trigger → two-step, not one: **re-upload (Jul 12) creates nulls → manual mapping-panel Save (unknown exact date, sometime between Jul 12 and Jul 21) deletes them**. This is a sharper version of the 07-22 trigger candidates (a)+(b) combined, not a new mechanism.

The code-level mechanism sections from the 07-22 write-up (destructive per-type diff at `saveDataMapping()`, descendant-cascade clearing at `computeCategoryMapUpdates()`, propagation via `_updateRecursively`) are **unchanged and still the best available code-level explanation** — nothing in the new comments requires revising the file:line analysis, only raises its confidence. See §Mechanism (carried over, condensed) below for the reference points; full derivation is in the archived 07-22 folder if needed.

---

## Mechanism (code-verified, carried over from 07-22 — still holds)

All paths in `hc-frontend/src/main/webapp/app/`.

- **What "WBS Location" is:** an activity↔category mapping (Activity API v2), same family as Phase/Discipline/Package/Sequence — `pages/organisation/ViewerPage/services/categories/category-mapping-service.ts:22-24`. Not a parsed WBS string (that's a separate, unrelated concept in `schedule-upload-service/schedule-parser/schedule-parser.ts:200-322`, sets `wbsCode: null` at import).
- **Destructive per-type diff (primary vector, now confirmed against data):** `CategoryMappingService.saveDataMapping()` (`category-mapping-service.ts:237-292`) iterates `changedActivityIds` and, for **every** category type, treats a null in-memory value as "delete the persisted mapping" (`:265-271`, `:285-287`). No merge; in-memory state is treated as complete truth.
- **Cascade amplifiers:** `computeCategoryMapUpdates()` (`:618-653`) clears descendant category types when an ancestor changes (`:643-650`); `_updateRecursively` (`components/project-x/entities/schedule-entity.ts:935-972`) propagates an edit to every descendant activity, expanding `_localChangedIds` so the destructive diff fires across a whole subtree from one edit.
- This now maps precisely onto Ilia's data: a mapping-panel session touching Precast/Roof/Earthworks/Painting/Partitions/L1-commissioning branches (plausibly while cleaning up the 2,119 activities the Jul-12 re-upload left unmapped) nulled WBS Location on those branches in memory, and Save deleted the persisted rows for exactly those branches, leaving discipline/package/phase (never touched in that session) untouched.

---

## Verify-in-code / linked PR check (this session, 2026-07-28)

Checked `hc-frontend` for any branch, commit, or PR tied to PLT-2918 or the Save-bug fix Ilia said he'd raise separately:
- `git log --all --oneline | grep -i 2918` → **no results**.
- `git log --all --oneline | grep -iE "category.?mapping|wbs location|saveDataMapping"` → **no results**.
- `git log -- .../category-mapping-service.ts` → last touched by PLT-2861 (Commissioning MVP, flag-gated, out of scope per `hc-frontend/CLAUDE.md` — not inspected further).
- Jira `issuelinks` and remote issue links on PLT-2918 are both empty.

**Conclusion: no fix branch/PR exists yet in this checkout.** The "FE ticket to fix the Save bug" Ilia mentioned raising (09:50 comment) has not been filed as a linked issue, or was filed under a different key not yet linked back to PLT-2918. PLT-2918 itself appears to be tracking the **data-remediation** side (backend restore / script re-apply / manual correction), not the FE code fix — its move to "Dev In Progress" most likely reflects the remediation work starting (with Sachin on the backend-restore option), not a code PR. **Cannot verify the actual dev fix matches the hypothesis because no fix code exists in this repo yet** — this is a "needs human" / "recheck later" item, not a gap in this session's search.

---

## Confidence (per xyz-platform-context CLAUDE.md scale)

- **Destructive per-type diff + cascade is the mechanism, and it fired for AUS01 (delete, not re-point, across multiple packages, discipline/package/phase untouched):** **9/10** — now corroborated by the assignee's own live-data query (7,879/~10k intact, package-level loss counts, phase/discipline/package intact), not just source-read inference.
- **Two-step trigger (Jul-12 re-upload creates nulls → subsequent manual mapping-panel Save deletes them):** **7/10** — stated plainly by the assignee as the working theory from data; the exact date/session of the manual Save that did the deleting is still not pinned down, and no code fix exists yet to cross-check against.
- **Overall triage confidence: 8/10.** Root cause is dev-confirmed via data, not just code-read speculation. What's left is remediation execution (data restore) and the separate FE fix, both outside this ticket's visible artifacts as of this check.

---

## NEEDS HUMAN

- ⚠️ Still cannot read the 4 image attachments (Atlassian auth) — no longer load-bearing given the 07-22/07-23 comments supersede them with hard numbers, but useful for a visual double-check if someone opens Jira directly.
- ⚠️ **Find/confirm the separate FE fix ticket** Ilia said he'd raise for the Save-bug itself — not linked to PLT-2918 as of this check. A human with Jira search access should look for it (likely filed 07-23 or later, unknown key) and link it here.
- ⚠️ **Backend-restore feasibility** — Ilia was "checking with Sachin" as of 07-23 09:50; outcome not recorded in comments yet. Follow up for status.
- ⚠️ **Exact date of the destructive mapping-panel Save session** — narrows down who/when for process fixes (e.g. training, or a Save-time confirmation dialog) independent of the underlying code fix.

---

## Roster / ownership notes

- **Ilia Kuzmin** (assignee) — ran the data check, owns remediation-option triage (backend restore first, script fallback, manual last resort) and said he'd raise the separate FE Save-bug ticket.
- **Sachin** (backend, api-v2) — being consulted on backend-restore feasibility for the deleted mapping rows.
- **Yash Patel** — client comms; explicitly **not** surfacing the internal bug to the client, just "still working on it."
- **Darminder Atker** (fullstack lead) — likely owner if/when the separate FE Save-bug ticket materializes (owns the mapping panel per 07-22 note); not yet confirmed assigned since that ticket isn't visible.

## Doc / knowledge-base refs
- `xyz-platform-context/dashboard/progress-tab.md` — discipline/package breakdown the category mappings feed.
- `xyz-platform-context/dashboard/schedule-tab.md` — dynamic category columns (WBS Location/Sequence) in the Gantt data-mapping panel.
- `xyz-platform-context/dashboard/data-pipeline.md:46` — `activity_categories_flat` feeds PRG filters.
- `incidents/live-incident-board-tickets/PLT-2882-groupA-progress-tracking/context.md` — sibling in the same activity↔category domain.
- `incidents/live-incident-playbook.md` — tone/pattern reference.
- Prior local record (superseded by this file): `PLT-2918-groupA-progress-tracking/` (07-22 hypothesis-stage write-up; folder renamed to `groupB` on 2026-07-28 because ticket status moved Open → Dev In Progress).
