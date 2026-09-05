# PLT-2952 — Asset List: enter linking mode and format data

**Status:** Analysis In Progress (clarification raised 2026-09-05). **No branch, no PR.**

## 2026-09-05 — scoped; two of four asks have no foundation

### Correction to carry forward — the surface is NOT `AssetListContent`

`AssetListPage/AssetListContent.tsx` is **no longer the viewer's left panel**. It survives in exactly
two places — `AssetListPage.tsx` and `ProjectSettings/TypesTab`. Its `panel-mode` props and its
`enableElementLinking` cell are **dead weight** with no caller.

The real target is **`assets-panel/assets-panel.tsx`** — a `PanelRoot/Header/Content/Footer` card list
on react-virtuoso.

`docs/commissioning/asset-register-and-3d-linking.md` §55-105 is **stale**: it describes an
"Isolate in 3D" toggle and `use-asset-*-isolation.ts` files that **no longer exist**.

### What is already there

- **The unlinked count is already in the panel footer** (`assets-panel.tsx:612-633`,
  `unlinkedCount` at :169-172). Reuse it; no new query.
- The component's own doc-comment (:73-86) literally scopes this ticket: *"The All/Unlinked/Linked
  tabs are a linking-session surface and arrive with that slice, as do match dots and the
  session/multi-select footers."*
- Two **negative tests reserve the ids** this ticket must flip: `assets-panel.test.tsx:298`
  (`assets-panel-link-to-models` must NOT exist) and :283-290 (`assets-tab-all` / `assets-tab-linked`).

### What has no foundation — the reason this is held

1. **Match strength is entirely net-new.** `matchStrength` / `match_strength` / `autoMatch` / `fuzzy`
   → **0 hits repo-wide**. There is no asset↔element matching or scoring anywhere. Both the algorithm
   and its persistence are new work, probably a schema change. (The only `confidence` code is an
   unrelated Gantt ML feature; `getConfidenceColor`'s banding is a visual precedent at best.)
2. **Per-user linking progress cannot be attributed.** `asset_element_link` is
   `id, project_id, asset_id, element_id, created_at` — **no user column**
   (`PLT-2862-supabase-schema.sql:72-83`). Backend change required first.
3. **"Linking mode" contradicts a shipped decision.** PLT-2953 (#2148, merged 09-02) *deliberately
   removed* the mode and made linking selection-first —
   `use-asset-element-linking.ts:71` says outright: *"There is no linking MODE and no staged
   session."* This ticket reintroduces a staged mode with a Done button. That is a reversal, and not
   one to make on an assumption.

The other half — the "Link to models" button and the Linked/Unlinked filter — is straightforward.
**Clarification asked: split the ticket.**

### Notes for whoever builds it

- The Linked/Unlinked filter belongs in `assets-panel.tsx`, **not** `use-asset-filters.ts` — that
  hook's own comment says the tab is a list-level concern owned by the panel.
- Best progress-bar precedent for a match-strength breakdown:
  `dashboard-panels/progress-panel/components/progress-item/progress-item.tsx:206-262` (stacked
  multi-segment). Nothing of the kind exists inside `assets-panel/`.
- **Conflict risk is narrow:** #2186 touches `assets-panel.test.tsx` (which this must edit) but
  **not** `assets-panel.tsx` itself.
- Could not view the ticket's three mock-ups — Jira attachment content 403s outside the MCP tool.
