# Dashboard backlog tickets — PLT-2624 & PLT-2820

Two tickets pulled from the backlog. **Verified against current `master` before starting** — one is already fixed.

---

## PLT-2624 — OPFS cache always invalid (parquets re-download every load)

**Status: ✅ ALREADY FIXED in master — no work needed.**

The described bug (cache metadata stored `artefact.fileSizeBytes`, often 0, causing the integrity check to fail on every load) is already resolved:

- `duckdb-service.ts` (~L425–433) now caches `fileSizeBytes: fileData.byteLength` — the **actual** downloaded bytes — with a comment describing exactly this bug.
- `opfs-cache-manager.ts` `isCacheValid()` checks `artefactHash` first (priority content indicator), then compares the real file size against the now-correct stored size.

No further action. Ticket can be closed as already-done (likely fixed by a later commit after it was filed).

---

## PLT-2820 — Multi-select issue categories (shift/ctrl click) in the Issues tab

**Status: ❌ still single-select — implement.**

### Current behaviour
The quality category filter is single-select. Clicking a category replaces the selection; clicking again clears it.

- `quality-overview.tsx` — `onClick={() => onCategorySelect(isActive ? null : name)}`; `isActive = activeCategory === name` (one active at a time).
- `quality-panel.tsx` — `handleCategorySelect` calls `setQualityCategories(category ? [category] : null)`; subscription reads `filters.qualityCategory?.[0]` only.
- `issue-table.tsx` — client-side filter `levelOfDiscrepancy === activeCategory`.

### Reference pattern (already working for disciplines/packages)
- `discipline-list.tsx` `handleClick` inspects `event.metaKey/ctrlKey/altKey` → `'alt'`, `event.shiftKey` → `'shift'`, else plain click; forwards the event key.
- `progress-panel.tsx` `handleApplyFilter(value, type, eventKey)` — modifier → additive toggle into the array; plain click → single-select replace (deselect if it was the only one).

### Plan (parity with disciplines/packages; **no service change** — `setQualityCategories` already takes `string[]`)
1. **quality-overview.tsx** — prop `activeCategory: string | null` → `activeCategories: string[]`; `onCategorySelect: (name: string, eventKey?: 'shift' | 'alt') => void`. `isActive = activeCategories.includes(name)`. `onClick` inspects modifier keys and forwards `'shift'`/`'alt'`.
2. **quality-panel.tsx** — state `activeCategories: string[]`; `handleCategorySelect(name, eventKey?)` mirrors `handleApplyFilter` (modifier → additive toggle; plain → replace/deselect); subscription sets the full array. Pass `activeCategories` to both `QualityOverview` and `IssueTable`.
3. **issue-table.tsx** — prop → `activeCategories: string[]`; client filter → `activeCategories.length === 0 || activeCategories.includes(levelOfDiscrepancy)` (union).

### Acceptance criteria
- Shift / Ctrl / Cmd click adds/removes categories from the filter (additive).
- All selected categories highlighted; issues filtered by the **union**.
- Plain click = single-select + clears the rest.
- Matches the Progress-panel discipline/package behaviour.

### Out of scope
Contiguous range-select (Shift selecting everything between two clicks) — disciplines use additive-toggle for Shift too, so this matches for consistency.

---

## Delivery
- Base: `master`. One branch + PR per implemented ticket (only PLT-2820 needs one).
- Minimal unit-test effort per request — rely on typecheck + lint + manual verification.
