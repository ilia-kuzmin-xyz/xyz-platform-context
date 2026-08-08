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
