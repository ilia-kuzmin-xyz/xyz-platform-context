# Data Profile Slim-Down — Plan

> **Status: PARTIALLY DONE (T1 implemented), T2–T5 pending.**
> Moved from `XYZ_AgentPipeline/docs/data-profile-slim-down-plan.md`.

## Goal

Reduce `data_profile` payload from **~682 KB** to **~6–8 KB** (≥98% reduction). Keep schema + tiny representative sample. Claude doesn't need the full row set in the profile — it hydrates on demand later.

## Baseline (before fixes)

| Domain | Size | Notes |
|--------|------|-------|
| `media` | **234 KB** | `rooms_geometry` (534 rooms × polygons) = 94% of file |
| `issues` | 2.5 KB | `categories`/`severities` are stringified Python dicts (bug) |
| `progress` | 2 KB | Sample rows are all zeros (pre-project) |
| `schedule` | 1.3 KB | Sample missing `days_overdue`/`days_remaining` |
| `project`, `viewer`, `capabilities` | ~0.6 KB total | Fine |

## Tickets

### ✅ T1 — Slim `media.rooms_geometry` (DONE — critical)
Replace 534-room polygon array with 1 sample row + keep `room_count`. Target: `media` block ≤ 10 KB.

### T2 — Cap `rooms_summary` (3 rows) + collapse `model_artefacts` to unique pairs
`rooms_summary[:3]`; `model_artefacts` → `[{content, format, count}]` grouped by `(content, format)`.

### T3 — Fix `issues.categories` / `issues.severities` shape (critical)
Emit `[{id, name}]` (parsed JSON objects), not stringified Python dicts. Separate arrays for categories vs severities.

### T4 — Make samples representative (critical)
- `progress.sample`: pick first non-zero row
- `issues.sample`: pick row whose `category`/`severity` appears in the emitted enum
- `schedule.sample`: include `days_overdue`/`days_remaining` so it matches the `activity_row` schema

### T5 — Add `purpose` + `use_for` hints; move SAS URLs under `_hydration`
Add one-line `purpose` per domain; `use_for` on each `*_row` schema; move `parquet_url` to `progress._hydration`.

## Acceptance criteria

1. New `data-profile.json` < 15 KB total (down from 682 KB)
2. No enum/category list containing stringified Python dicts
3. Every sample row references values present in the same profile's enums
4. Every `*_row` schema's keys present in its sample
5. Hydrators still work correctly after changes (no regression)
