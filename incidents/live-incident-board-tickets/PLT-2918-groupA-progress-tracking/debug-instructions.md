# PLT-2918 — debug instructions (2026-08-27)

**Category: 🟡 Stale / needs a chase.** The code is fine; one unanswered factual question remains.

**Branch:** `PLT-2918-category-mapping-delete-guard`

## What I found
- **The shipped fix (PR #2078) holds.** Re-verified against current master: the delete branch only
  fires when the user explicitly edited that category type
  (`category-mapping-service.ts`, `editedTypeIds?.has(categoryTypeId)`).
- **Correction to this folder's notes since July:** the cascade does **not** clear unedited descendant
  category types. `_updateActivityItem` merges only the keys present in `data`
  (`schedule-entity.ts:978-1000`), so descendants receive exactly the edited types — which are the
  same types that are delete-eligible. The destructive cross-type delete is now structurally impossible
  on this path.
- **So Paddy's weekly recurrence is almost certainly not this code path.** Remaining candidates are
  both data questions: the historic AUS01 gap never being backfilled, or Mostafa's Power BI theory.

## What's on the branch
- Deletions are now logged at the point of sending, counted by category type and activity. The original
  defect cost weeks precisely because ~2,100 mappings vanished **silently**.

## What I need from you
- [ ] **One question, to Sachin:** did the 07-23 recovery actually run? The plan was (1) BE restore of
      deleted records, (2) script re-apply from Paddy's export, (3) manual. **No comment on the ticket
      records which tier ran or that the historic gap was backfilled.** If it never ran, Paddy has been
      looking at the original hole for six weeks and there is no new bug at all.
- [ ] Only if that comes back "yes, restored": ask Mostafa to test the Power BI export-side theory.
- [ ] No browser check needed from you on this one.
