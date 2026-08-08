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
