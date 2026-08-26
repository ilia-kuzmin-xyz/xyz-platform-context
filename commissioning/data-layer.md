# Commissioning — data layer (Supabase bridge)

> **Supersedes** the "persistence is `localStorage` only" statement in earlier
> versions of this domain. That was true at the 2 Jul 2026 review; it is not true now.

Commissioning persists to a **standalone Supabase (Postgres) project**, reached over
**PostgREST with plain `fetch`** — no Supabase JS SDK is bundled. This is an explicit,
temporary bridge until api-v2 grows commissioning endpoints.

## The seam

Everything goes through one narrow interface, so replacing the backing store later is a
single new implementation rather than a sweep through the domain services:

| File (`app/services/commissioningApi/`) | Role |
|---|---|
| `commissioning-data-client.types.ts` | The contract: `select` / `insert` / `upsert` / `update` / `remove`, table-oriented CRUD. Deliberately **not** a query builder. |
| `postgrest-client.ts` | The Supabase implementation. |
| `in-memory-client.ts` | Test double — services take a client param, defaulting to the real one. |
| `commissioning-data-client.ts` | The singleton the app uses. |
| `supabase-config.ts` | Connection details + runtime environment resolution. |

Domain logic (mapping, validation, ordering) lives in the **domain services**
(`assetRegisterService`, `checklistLibraryService`, `readinessTaskService`,
`workflowService`, `tagService`, …), not in the client. Table names are passed in as
strings from those services.

**Why getters, not values:** `commissioningDataClient` is constructed with *functions*
that resolve the URL and key, because the environment is only known once the platform
profile has loaded — after module evaluation. A client built from plain values would
freeze to whatever the default was at import time.

## Environments

The schema is a shared contract owned by the **XYZ_Supabase** repo, which has two
long-lived databases:

| Env | Supabase project | Git branch | Role |
|---|---|---|---|
| `stable` | `gpuerhiwzgnfcvrzvwgw` | `main` | Production |
| `dev` | `ohmzwpcilvxpozljllle` | `develop` | Persistent branch — sandbox for in-progress schema, and where the MVP content lives |

**Which one a running app uses is decided at runtime from the platform's active profile**
(PLT-3035, merged 10 Aug 2026). One container image is built per commit and promoted
across every environment, so there is **no build-time signal** — the profile is the only
difference between a staging and a prod container.

```
prod | preprod | staging  →  stable
dev  | local   (anything else)  →  dev
```

`resolveCommissioningEnv()` classifies; `setCommissioningEnvFromProfiles()` is called from
`applicationProfileActions` **after** the profile dispatch, so a failure in resolution can
never cost the store its profile. `PRODUCTION_PROFILES` is guarded by a spec that parses
`priority_order` out of `docker/entrypoint.sh` — **add a deployment profile there without
classifying it here and that spec fails**, by design.

**Mobile pins `dev`.** The two clients therefore disagree in protected environments. Resolve
that before the flag is enabled anywhere above `dev`.

## Security posture — read this before trusting real data

Every commissioning table has a **permissive anon RLS policy** (`using (true) with check
(true)`). There is **no server-side tenant isolation**: project separation is *client-side
only* — each query filters by `project_id`. Anyone holding the public anon key (it ships in
the browser bundle by design) can read or write **any** project's rows. There is no
Supabase↔platform identity bridge.

Only the **public `sb_publishable_*` (anon)** keys are committed. `service_role` /
`sb_secret` keys and DB passwords must never enter this repo or the app repo.

Tighten the policies, or front the whole thing with api-v2, before real tenant data is
trusted to it.

## Tables — census verified 12 Aug 2026

Probed directly against both databases with the public keys.

| Table | `dev` rows | `stable` rows |
|---|---:|---:|
| `asset` | 10001 | 0 |
| `asset_type` | 333 | 0 |
| `asset_element_link` | 18 | 0 |
| `task_template` | 276 | 0 |
| `task_item` | 9609 | 0 |
| `task_instance` | 482 | 0 |
| `task_instance_item` | 9100 | 0 |
| `task_folder` | 0 | 0 |
| `tag` | 30 | 0 |
| `workflow` | 10 | 0 |
| `workflow_tag` | 30 | 0 |
| `workflow_tag_task` | 0 | 0 |
| `readiness_task_link` | 21 | 0 |
| `element_task_status` | 0 | 0 |

Two things this establishes:

1. **Schema parity holds** — all 14 tables exist on both, so `dev` and `main` agree
   structurally (the goal of PLT-3035's first action).
2. **`stable` is completely empty.** Enabling the flag in staging/preprod/prod today shows
   a working but *empty* feature — no assets, no templates, no workflows. The `dev` content
   does not follow the schema across. Any demo or UAT above `dev` needs data seeded or
   created first.

## Flag-off guarantee

With the `Commissioning` flag off (`app/config/constants.ts`, default `false`) the app makes
**zero** Supabase requests. Verified: all consumers are gated, there are no imperative
fetches outside them, nothing is warmed on start, and no persisted cache replays a request.
The flag is read synchronously from a cookie, so there is no window where a request escapes
before the flag resolves.

**Caveat:** it is a per-browser cookie flag, not a server-side kill switch. It stops *this
browser* from calling Supabase; it does not make the database unreachable, and it is not an
access control.

## Related

- `pitfalls.md` — gotchas in this area.
- `planning/glossary-rename-and-systems.md` — the in-flight breaking schema rename.
- App repo: `docs/environments.md`, `docs/commissioning/README.md`.

## 2026-08-17 — env-provided connection override (PLT-3056 / PAPI-3627, PR #2145)

The committed connections above are now the **fallback**, not the only source. PAPI-3627 added
`SUPABASE_URL` / `SUPABASE_ANON_KEY` env keys (DEV + STG set, PRD pending); hc-frontend #2145
consumes them: `docker/entrypoint.sh` copies the pair into the `/management/info` JSON
(`commissioning: { supabaseUrl, supabaseAnonKey }`, complete pair only, half pair → WARN + omit)
and `getProfile` hands the block to `setCommissioningConnectionFromRuntimeConfig`
(`supabase-config.ts`), which adopts it only if the URL is https and the key is
`sb_publishable_*` — a privileged key is rejected client-side. Getters prefer the runtime pair;
everything in "The seam" and "Environments" above still describes the fallback path, which is
byte-identical where the env keys are absent (local, MSW, PRD for now). A spec in
`supabase-config.test.ts` pins the entrypoint↔module field names in lockstep.

## 2026-08-21 — System prerequisites moved onto `workflow_step_task` (no migration)

Supersedes the plan in `docs/commissioning/asset-type-system-requirements-schema.md` (hc-frontend)
that called for two bespoke tables, `asset_type_system_requirement` + `..._task`. Those were never
created — probed both envs, absent on `dev` and on `stable` alike, which is why prerequisite saves
looked successful and persisted nothing. That report ("saving does not seem to apply them", Rishi,
20 Aug) had this as its root cause.

**The table is now shared, discriminated by a `bucket` column:**

| `bucket` | meaning | `system_type_id` |
|---|---|---|
| `asset_readiness` | a type's own gating tasks on its ladder step | null |
| `system_requirement` | an asset type's System prerequisite for that system type | set |

Verified on `dev`: `bucket` and `system_type_id` both exist, `bucket='asset_readiness'` is already
in use, and the upsert's conflict target `(workflow_step_id, task_template_id, system_type_id, bucket)`
has a matching unique constraint — probed with a deliberately invalid FK, which returned **23503 at
execution** rather than 42P10 at planning, so the constraint resolved and nothing was written. That
probe is the cheap way to confirm a conflict target without inserting.

**The pitfall this creates, and it already bit:** `workflowStepTaskService` predates the split and
filtered on `(project_id, workflow_step_id)` only. Two live bugs, both fixed in `655787ac`:

- `setForStep` deletes-then-reinserts with no bucket predicate, so saving *any* step of a system
  type wiped the `system_requirement` rows sharing that step. Fired on the ordinary edit-session Save.
- `listForProject` / `getForStep` didn't filter either, so prerequisites surfaced as the system
  type's own ladder tasks and inflated the Tasks column.

**Rule for anything touching this table: every read, write and delete carries a bucket predicate.**
`clear()` is the deliberate exception (project-wide, no production callers). Deletes on the
prerequisite side additionally scope by `system_type_id`.

**Known limitation, by design for now:** the table has no `asset_type_id`, so a prerequisite saved
against an asset type applies to *every* member asset of the system, not only to assets of that
type. `listForAssetType` ignores its `assetTypeId` argument and returns the project's requirements
grouped by system type. The dimension arrives with Rishi's `system_type_task.asset_type_id`
(PLT-3058 / #2150); at that point only `assetTypeSystemRequirementService` changes.

`create()` now **throws** (not skips) when a staged step tag has no matching step on the system
type's workflow — a silent drop read as a successful save. Hit when a system type carries an asset
ladder (Red/Yellow/Green) or no workflow instead of the Blue/White pair `createSystemTypeWorkflow`
mints. `removeTask()` deliberately does *not* throw in the same situation: create refuses those,
so no row can exist to remove, and failing a save with nothing to do would be wrong.

Landed on hc-frontend `PLT-3003` (PR #2147) — commits `f5f2cafb`, `655787ac`, `f0812cb8`, `460a8e8c`.

## 2026-08-25 — census re-probed: it was stale, and `asset_readiness` already exists

Re-probed both databases directly with the committed public anon keys, prompted by a design
question on PLT-2968 ("where would an override record live?"). **Do not trust the 12 Aug census
above — three of its table names no longer exist.**

### Renames since 12 Aug (old names now 404 on `dev`)

| 12 Aug census | today |
|---|---|
| `tag` | `readiness_step` |
| `workflow_tag` | `workflow_step` |
| `workflow_tag_task` | `workflow_step_task` |

### Tables the 12 Aug census never listed

`system` (22 rows), `system_type` (8 rows), **`asset_readiness` (0 rows)**.

### `asset_readiness` — the override table already exists

Columns confirmed by per-column probe (`?select=<col>&limit=1`; 200 = exists, 400 = no such
column — this works even though the table is empty):

```
id · project_id · asset_id · readiness_step_id
is_achieved · is_overridden · override_reason
created_at · modified_at · modified_by
```

One row per **(asset, readiness level)**. It carries both the achieved flag *and* the override
flag + reason + actor.

**Consequences worth knowing before anyone designs against this:**

1. **Do not invent a new override table.** A `asset_readiness_override` design was drafted in this
   session and abandoned on discovering this — it would have duplicated a solved problem.
2. **Nothing writes it.** 0 rows on `dev`; the frontend never reads or writes it. The only
   occurrence of the string in hc-frontend is `READINESS_BUCKET = 'asset_readiness'` in
   `workflowStepTaskService` — a `bucket` discriminator *value*, unrelated to this table.
   Whether a trigger on `task_instance` is meant to populate `is_achieved` is **unknown and needs
   a backend answer**.
3. **It implies a different model from ours.** hc-frontend *computes* achievement live from
   `task_instance` (`use-asset-current-tag.ts:117`); this table wants it *persisted*. Likely
   written for mobile/offline. Adopting `is_achieved` wholesale would make the feature read blank
   while the table stays empty — the low-risk path is to keep computing achievement and consult
   the row **only** when `is_overridden` is true, falling back to today's behaviour when the row
   is absent.
4. **Keyed on `readiness_step_id`, not `workflow_step_id`** — an override is against the catalogue
   level, so callers must map via `workflow_step.readiness_step_id`.
5. **No history and no acknowledgement.** One mutable row per level: `modified_by` / `modified_at`
   give the *last* change only. There is no `acknowledged` column, so the PLT-2968 prototype's
   two-person acknowledgement flow is unsupported by this schema as it stands.

### Schema parity is BROKEN — supersedes the "parity holds" claim above

The 12 Aug section concluded "all 14 tables exist on both, so `dev` and `main` agree
structurally". **That is no longer true.** `asset_readiness` returns 404 for every column on
`stable` (`gpuerhiwzgnfcvrzvwgw`) while existing on `dev`. Anything built on this table cannot
ship above `dev` until XYZ_Supabase promotes it — name that as a blocker on PLT-2968 rather than
discovering it at deploy time.

### How to re-probe (root introspection no longer works)

`GET /rest/v1/` now answers `401 {"message":"Secret API key required"}` — the OpenAPI dump needs a
secret key. Probe per table and per column instead:

```bash
KEY=<anon key from app/services/commissioningApi/supabase-config.ts>
URL=https://ohmzwpcilvxpozljllle.supabase.co/rest/v1
curl -s -o /dev/null -w '%{http_code}\n' "$URL/<table>?select=*&limit=1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY"          # 200 exists / 404 absent
curl -s -D- -o /dev/null "$URL/<table>?select=*&limit=1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Prefer: count=exact" | grep -i content-range
```

## 2026-08-25 — `asset_readiness` verified against XYZ_Supabase develop (answers to the open questions above)

Ilia checked the XYZ_Supabase repo directly. Supersedes the "unknown, needs a backend answer"
items in the 2026-08-25 census section — these are now repo facts:

1. **Unique constraint exists**: `asset_readiness_key unique (project_id, asset_id, readiness_step_id)`,
   non-deferrable → valid PostgREST `on_conflict` arbiter. Upsert works; no select-then-insert.
   Subsets are not arbiters — `project_id` is part of the key.
2. **DDL**: `is_achieved` and `is_overridden` are `boolean not null default false`.
   `override_reason` is nullable but guarded by `check (not is_overridden or override_reason is not null)`
   — the mandatory reason is DB-enforced (23514 on bypass). Both FKs (`asset`, `readiness_step`)
   are `on delete cascade`: deleting either silently discards override records. `modified_at` has
   NO default and is stamped only by a BEFORE UPDATE trigger → NULL on first insert; display
   "overridden at" as `modified_at ?? created_at`. `project_id` is bare text, no FK.
3. **Nothing writes the table** on develop — zero insert/update/merge statements; the only trigger
   sets `modified_at`. So `is_achieved` has no writer and no rows anywhere. The clobber risk is
   the request shape, not a competing writer.
4. **RLS**: same permissive anon as everything else (one of 22 names in the `90_security.sql` loop).
5. **develop only.** Not on `main`; promotion **PR #5 (develop→main) is open and its body is stale**
   ("merging this is a no-op on the database" — written before this model landed). Until #5 merges
   AND is applied, any code touching `asset_readiness` 404s (PGRST205) on staging/prod.
6. **Intended writer: NOT FOUND** for `asset_readiness` (no commit/PR/doc names one; the contract
   migration's per-client writer list omits it). Sibling `system_readiness`'s writer is "web" only
   per **closed, unmerged PR #13** — a PR-body opinion, not repo fact.

### Write-shape rule for PLT-2968 (the one implementation gotcha)

Send ONLY the columns being changed. The repo's own bulk-POST convention **null-pads missing
keys**, which turns "omitted" into "explicitly NULL" → clears `override_reason` and throws 23502
on `is_overridden`/`is_achieved`. Build the upsert body literally
(`project_id, asset_id, readiness_step_id, is_overridden, override_reason, modified_by`),
never through the null-padding helper, and never send `is_achieved` (leave the default; don't
clobber a future writer). One row per **(asset, readiness level)** — per-level, not per-asset.

### ⚠️ Bigger than PLT-2968: `workflow_step_task` replacement has landed on develop

Per the same check: XYZ_Supabase develop's head is now **past PR #22**, and **the target model
that replaces `workflow_step_task` has landed there** (PR #19 needs revisiting against it).
The dev *database* still serves `workflow_step_task` (probed 200 with rows earlier today), so the
repo may be ahead of the applied schema — but when it is applied, `workflowStepTaskService` and
the prerequisite/ladder-task surfaces (PLT-3003/#2147, PLT-3058/#2150) are affected.
**Shape of the replacement not yet captured here — get table names, compat story, and applied-vs-repo
status before building anything new on `workflow_step_task`.**

## 2026-08-25 — TARGET MODEL: `workflow_step_task` is legacy; FE is writing orphaned tables

Answers verified from XYZ_Supabase develop (via Ilia's session with repo access) + live probes
against dev. **Corrects the same-day section above**: the replacement did NOT come in PR #22
(that's the spreadsheet-import feature); it landed in migration
`20260819120000_target_model_expand.sql`, merged PR #19 then added `asset_type_id` — but to the
legacy table.

### The target model (live and populated on dev; all 404 on stable)

| Table | Status | Rows (25 Aug) |
|---|---|---:|
| `asset_type_task` | NEW — replaces `workflow_step_task` for asset ladders. Keyed `(asset_type_id, workflow_id, readiness_step_id, task_template_id)`, keeps `bucket`, `position` | 249 |
| `system_type_task` | NEW — same for system requirements, keyed on `system_type_id` | 3 |
| `workflow_step_task` | **LEGACY-ORPHAN**: live table, in migration history, but ABSENT from `supabase/schemas/*` (declared state). Never dropped. Data was migrated out on 19 Aug | 9 |
| `system_readiness` | NEW, sibling of `asset_readiness` + extra column `achieved_on`. HAS a live writer already (row with `is_achieved:true`, `modified_by:"Tenant1 Givmail."`) | ≥1 |
| `readiness_step` | CHANGED: gained `workflow_id` + `position`, both NOT NULL; unique `(project_id,name)` DROPPED, replaced by `(project_id,workflow_id,name)`; new `(id,workflow_id)` unique as FK target. Steps are now workflow-owned and positioned | — |

`asset_type_task` fresh `created_at` values (2026-08-24) show an active writer on the new tables —
likely the import feature (PR #22) and/or mobile.

### ⚠️ hc-frontend breakage — confirmed, not speculative

1. **`readinessStepService.create` fails on dev TODAY**: upserts with arbiter `project_id,name`
   (`readiness-step-service.ts:75`) — constraint no longer exists → 42P10; body also omits the
   now-NOT-NULL `workflow_id`/`position` → 23502. So `defaultWorkflowSetup` seeding breaks on any
   project without steps. Projects already seeded still read fine.
2. **`workflowStepTaskService` (PLT-3003/#2147, PLT-3058/#2150 surfaces) reads/writes the 9-row
   orphan** while the real catalogue links (249 rows) live in `asset_type_task`. The FE shows/edits
   a stale subset and its writes are invisible to every consumer of the new model.
3. **`workflow_step` is presumably legacy too** (readiness_step now carries workflow_id+position
   itself; asset_type_task references workflow_id+readiness_step_id directly, not workflow_step).
   NOT yet confirmed against schemas/* — verify before repointing `useAssetWorkflowSteps` /
   `use-asset-current-tag`, which currently derive step order from `workflow_step.position`.

### PLT-2968 impact

The override design SURVIVES unchanged: `asset_readiness` is part of the target model, still keyed
`(project_id, asset_id, readiness_step_id)`; readiness_step ids are what the new model links on.
If anything the model helps — step order can come straight from `readiness_step.position`.
But the FE re-point (below) should land first or together, or the override UI reads legacy order.

### Promotion status

PR #5 (develop→main) head `ac0b85807` == develop head, zero commits missing — merging it carries
the ENTIRE target model to stable in one go. Its body ("no-op on the database") is badly stale and
must be rewritten before merge. Until then: everything above 404s outside dev.

### Action items (frontend)

- [ ] NEW TICKET (urgent): re-point hc-frontend to the target model — readinessStepService
  (arbiter + workflow_id/position), workflowStepTaskService → asset_type_task / system_type_task,
  verify workflow_step's standing, repoint step-order derivations. Bigger than PLT-2968.
- [ ] PLT-2968 builds on `asset_readiness` as designed; sequence after/with the re-point.
- [ ] `system_readiness.achieved_on` exists on the system side only — mirror-check when touching either.
