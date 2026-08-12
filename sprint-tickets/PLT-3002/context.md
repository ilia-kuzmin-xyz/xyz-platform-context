# PLT-3002 — Project Settings · Type Library System Types

**First seen 2026-08-08.** Status was `Open`. **Moved to `Analysis In Progress` + clarification
comment posted** (comment id 109173).

> Read `../_shared-commissioning-domain.md` first.

## The blocker: the data model has no System type
- An asset carries a **flat `system: string`** (`asset-register-service.types.ts`), e.g. `"HVAC"`.
- There is **no `System` entity and no "System type" concept anywhere in the codebase**.
- `AssetListContent` *does* already have a `systems` group view (name + asset count). It has **no
  Tasks column on purpose** — readiness tasks link to *asset types*, not to systems.

The ticket asks for *"System types … showing the Systems and Tasks assigned against them"* — a
**two-level hierarchy** (System type → Systems → Tasks). We have one level, and no task↔system link
of any kind.

## Questions posted
1. Is "System type" a new first-class entity, or a rename of the existing flat `system` grouping?
   (If a rename, "the Systems assigned against them" doesn't parse — a system would *be* the row.)
2. Where do systems / system types come from — asset-register `.xlsx` import, authored in settings,
   or derived from model element metadata?
3. **How does a Task attach to a System type?** New link kind, or roll-up from the asset types under
   it?
4. IA naming — `Types` here vs `Type library` on PLT-3000.

## Confidence
**2/10.** Cannot be implemented without a data model. Also note: whatever is decided, the store
would be another **localStorage, per-browser** one until a commissioning BE exists.

---

## 2026-08-11 — the UI shell now exists; the data model still doesn't

### What resolved
**The IA question (my point 4) is answered.** PLT-3000's PR **#2115** replaced the "Asset Types"
tab with a **Types** tab carrying an *Asset types / System types* segmented control. System types
renders an **empty state on purpose**, so this ticket fills it rather than restructuring the tab a
second time. The tab is `Types`; drill-in replaces the whole tab body including the control.

### ⚠️ Correction
The 08-08 entry said commissioning is localStorage-backed and "we'd be inventing the store as
well". **Wrong.** Commissioning is on real tables via `commissioningApi` — `asset`, `asset_type`,
`task_template`, `task_item`, `task_folder`. A `system` / `system_type` table would follow an
existing pattern rather than being invented. This *helps* the ticket, but doesn't unblock it.

### Unchanged and still fatal
No `System` entity. No "System type" concept. Asset carries a flat `system: string`
(`asset-register-service.types.ts`). Nothing links a task to a system —
`readinessTaskService` links tasks to **asset types** only. Questions 1–3 (first-class entity vs
rename · where systems come from · how a task attaches) all decide the table shape; guessing means
a migration to undo.

Posted as comment **109344**.

## Confidence — unchanged
**2/10.** The UI shell is no longer part of the work, which shrinks the ticket, but the blocker was
never the UI.

---

## 2026-08-12 — ⚠️ CORRECTION: there is no System types empty state

The 08-11 entry above (and Jira comment 109344) said PR #2115 shipped a Types tab whose
**System types toggle renders an empty state on purpose, so this ticket "fills it rather than
restructuring the tab a second time."**

**That is wrong.** Read from the branch today (`origin/PLT-3000-type-library-asset-types`,
`TypesTab.tsx:153-171`):

- `ToggleButtonGroup value='assetTypes'` is **hardcoded, with no `onChange` handler**.
- The System types `ToggleButton` is **`disabled`**, with aria-label `systemTypesSoon`.
- There is no System types panel, no empty state, and no way to select the segment.

The comment in the code says it plainly: *"System types have no data model yet (deferred) —
shown disabled so the destination is discoverable."* It is a **signpost, not a container**.

### What this changes for PLT-3002
The UI shell is **less** built than the 08-11 entry claimed. This ticket must additionally:
- add selection state and an `onChange` to the toggle group, and un-disable the System button;
- build the System types list surface behind it.

It does **not** change the blocker — questions 1–3 (first-class entity vs rename · where systems
come from · how a task attaches to a system type) still decide the table shape, and still need a
human. Confidence stays **2/10**.

### One new datapoint in this ticket's favour (from PLT-2914's branch)
Task types now exist in code, and **IST is deliberately excluded from the selectable set**
(`SELECTABLE_TASK_TYPE_IDS`) with the reason recorded in `task-type.types.ts`: an IST can only be
applied to a **System Type**, and there is no `system_type` table, so creating one *"would produce
a template nothing could ever be attached to."*

So PLT-3002's missing data model is now visibly blocking a second feature, not just this one.
That is worth carrying into any prioritisation conversation.
