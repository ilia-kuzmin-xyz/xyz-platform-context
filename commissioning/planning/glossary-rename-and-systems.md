# Cx glossary rename + the Systems layer (in flight)

**Status as of 12 Aug 2026: designed and in review, deployed nowhere.**
**Confidence: 8/10** — the mapping is mechanical and verified; the risk is entirely in
deploy sequencing, which needs a human with environment access.

## What it is

`xyz-supabase` [#11] renames the commissioning tables to match the Cx glossary. On the
frontend, `hc-frontend` [#2124] follows it — service, hook and type names track the tables,
with no behaviour or query-shape change.

| Before | After |
|---|---|
| `tag` | `readiness_step` |
| `workflow_tag` | `workflow_step` |
| `workflow_tag_task` | `workflow_step_task` |
| `readiness_task_link.level_id` | `readiness_step_id` |
| `asset.system` | `system_label` |

On top of that rename sits a **Systems layer** — a new grouping entity above assets, built
as a chain of seven PRs (see the stack below). It introduces `systemService` and
`systemTypeService` against **new tables**: `system`, `system_type`, `system_element_link`.

## Verified deployment state (12 Aug 2026)

Probed both databases directly:

- Old names **still live** on `dev` and `stable`: `tag`, `workflow_tag`, `workflow_tag_task`
  all return 200.
- New names **absent from both**: `readiness_step`, `workflow_step`, `workflow_step_task`
  → 404.
- Systems tables **absent from both**: `system`, `system_type`, `system_element_link`
  → 404.

So the rename migration has not been applied anywhere, and **the Systems stack has no backing
schema in either database yet**. The migrations do exist — they are the mirrored xyz-supabase
stack below, all still open.

## Two mirrored stacks that must land together

`xyz-supabase` and `hc-frontend` each carry a chain, and they pair up:

| xyz-supabase | hc-frontend |
|---|---|
| [#11] → `develop` — `refactor(schema)!: align names with the Cx glossary` | [#2124] — follow the rename |
| [#9] → #11's branch — `feat(systems): add system register, hierarchy and membership` | #2122 → #2126 → #2128 → #2131 → #2132 |
| [#13] → #9's branch — `feat(systems): anchor task instances on systems, guard the hierarchy` | #2133 — link model elements to a system |

Note the `!` in #11's subject — it is marked a breaking change deliberately.

Also open: **[#5] → `main`** — "Sync main with develop — schema promotion (already applied) +
docs", the promotion that keeps `main` level with `develop`.

The practical consequence: this is not one migration to time, it is **two seven-deep chains that
have to be zipped together**. Each frontend PR is only deployable once its paired migration is
applied to that environment's database, and PostgREST gives no compatibility window
(`pitfalls.md` §3).

## The sequencing risk

This is the part to get right. **PostgREST exposes tables as URL paths**, so the rename is a
breaking API change (`pitfalls.md` §3), and each database flips independently:

- Apply the migration before the frontend deploys → the **deployed** frontend 404s on every
  commissioning surface in that environment.
- Merge the frontend before the migration → the new build 404s against the un-migrated
  database.

There is no compatibility window, because the frontend has no fallback that tries the old
path. Both sides must land together, **per environment**, and `dev` and `stable` must be
sequenced separately.

Mitigating factor: `stable` holds **0 rows** and the flag is off everywhere, so the blast
radius today is limited to whoever is testing on `dev`. That is the argument for doing this
now rather than after the flag is enabled — the window is only going to get worse.

## Collision with merged work

PLT-2914 (#2129, merged 12 Aug 2026) reads `task_instance.type` and `task_item.required_item`.
Both columns are **still present and unrenamed** (verified against `dev`), so there is no
conflict today. If a later glossary pass renames them, PLT-2914's surfaces are the callers to
update — worth checking before the next rename lands.

## The Systems PR stack

Chained bases, so a reviewer sees them in dependency order:

```
master
 └─ #2124  PLT-2977  Follow the Supabase Cx glossary rename      ← CONFLICTING with master
     └─ #2122  PLT-2977  Systems register panel in the viewer
         └─ #2126  PLT-2976  Create a system from the Systems panel
             └─ #2128  PLT-2981  Show a system's details in the right panel
                 └─ #2131  PLT-2984  Add child systems to the system detail
                     └─ #2132  PLT-2983  List and manage a system's assets
                         └─ #2133  PLT-2982  Link model elements to a system
```

#2124 sits at the root and currently **conflicts with master** — it has to be rebased before
anything above it can move, since every PR in the chain inherits the conflict.

> The "layer / 1-of-4" indicator on stacked PRs is a **client-side browser extension**
> (Graphite), not something in the PR data. Chaining bases and stating the stack in the body
> is what actually communicates order to everyone else.

## What needs a human

1. Agree the zip order for the two stacks, and execute it per environment (`dev` first, then
   `stable`) — this needs Supabase environment access.
2. Rebase #2124 onto master to unblock the frontend chain.
3. Decide whether #5 (promote `main` to `develop`) goes before or after the rename, since it
   changes what `stable` contains.

[#5]: https://github.com/XYZReality/xyz-supabase/pull/5
[#9]: https://github.com/XYZReality/xyz-supabase/pull/9
[#11]: https://github.com/XYZReality/xyz-supabase/pull/11
[#13]: https://github.com/XYZReality/xyz-supabase/pull/13
[#2124]: https://github.com/XYZReality/hc-frontend/pull/2124
