# PLT-3000 — Project Settings · Type Library Asset Types

**First seen 2026-08-08.** Status was `Open`. **Moved to `Analysis In Progress` + clarification
comment posted** (comment id 109172).

> Read `../_shared-commissioning-domain.md` first.

## ⭐ Headline: this looks ALREADY SHIPPED
The ask — *"list all the Asset types, showing the number of assets assigned and tasks against a
type"* — is what the existing **Asset Types** tab already does:

- `ProjectSettings.tsx` registers the tab (Commissioning-gated) → `AssetsTab/AssetsTab.tsx`
- which renders `AssetListContent` with `initialView='assetTypes'`, `showViewToggle={false}`
- and `AssetListContent.tsx` builds the group table with **name + asset count + Tasks count**
  (`useReadinessTaskCountsByType`; `groupColumns` adds `tasks` only for the `assetTypes` view)
- clicking a type drills into `AssetTypeDetailContent` **inline** in the modal.

**Do not start this ticket by writing a new table.** Someone rebuilding it from the description
would duplicate shipped work — that is the main reason this run did not kick it off.

## What is probably actually wanted
An **IA change**: a parent **"Type library"** tab with *Assets* / *Systems* children, replacing the
flat "Asset Types" tab. Nothing named "Type library" exists in the codebase (grepped, zero hits).

## Questions posted
1. Is the real ask just the IA restructure?
2. Naming is inconsistent across tickets — PLT-3000 says `Type library`, PLT-3002 says `Types`.
3. Does today's "Asset Types" tab get renamed/absorbed? Does the `AssetTypeDetailContent`
   drill-down survive?
4. Any columns/actions in the prototype the current table lacks? (Screenshot is a Jira media blob
   and the `claude.ai/design` prototype is not reachable from the runner — **a standing limitation
   for every ticket in this batch**.)

## Confidence
**5/10** overall — but **8–9/10 if the answer to (1) is "yes, just the IA"**, since the table is
reused as-is. Cheapest ticket in the batch to unblock.

---

## 2026-08-11 — PR #2115 exists (opened by the 08-10 afternoon run, unrecorded until now)

**[#2115](https://github.com/XYZReality/hc-frontend/pull/2115) — draft, green, base `master`.**
Jira moved to `Dev In Progress` by Ilia at 08-10 11:00 UTC, *after* the PR appeared.

- Replaces the flat **Asset Types** tab with a **Types** tab + *Asset types / System types*
  segmented control. System types = empty state, deliberately left as PLT-3002's landing spot.
- Drill-in replaces the whole tab body **including** the segmented control (modal drill-in rule).
- **Real bug fixed:** the list counted types *from assets*, so a catalogue type with nothing
  assigned never appeared. `countByField` now takes catalogue names and lists them at zero —
  264 catalogue rows on dev, so not hypothetical.
- 19 files, +482/−347. `tsc --noEmit` clean, 42 suites / 694 tests pass.

**Checkpoints:** 0 review threads · 3/3 checks green · master `9617872` is an ancestor. Four
reviewers requested (TomMasdinXYZ, DarminderA, rishib-xyz, SergiuszXYZ), **none has responded**.

⚠️ **Scope flag raised in the PR body, still unticketed:** §2's create/rename/delete and all of
§3–§6 (type detail, edit mode, review-and-save sheet, post-save effects) are the bulk of the
feature and no ticket covers them. Raise before Types is assumed nearly done.
