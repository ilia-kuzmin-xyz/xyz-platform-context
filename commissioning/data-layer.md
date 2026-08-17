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
