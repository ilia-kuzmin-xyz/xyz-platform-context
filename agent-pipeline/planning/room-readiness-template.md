# Room Readiness — report template (PLT-TBD)

🔵 **DESIGN — not implemented.** Source of truth for the layout: Mostafa's mockup (`Room Readiness Canvas.dc.html`, Claude-designed, XYZ design system).

First **named template** for the Infinite Canvas: when we're confident the user is asking about room readiness, produce a fixed layout with fixed blocks instead of letting the composer improvise. User can still tweak it afterwards via chat.

---

## 1. Layout (from the mockup)

```
grid: 430px │ 1fr │ 400px   ×   rows 300px │ 1fr

┌───────────────┬──────────────────────┬─────────────┐
│ Overall       │ 3D model viewer      │ Rooms       │
│ readiness     │ (installed / behind) │ requiring   │
│ donut + 4 KPI │                      │ attention   │
├───────────────┼──────────────────────┤ + Upcoming  │
│ Readiness by  │ All rooms by level   │ handovers   │
│ room type     │ (room-card matrix)   │ (spans 2)   │
└───────────────┴──────────────────────┴─────────────┘
```

**Two states in one canvas.** Default = overview. Clicking any room card (`onClick → selectedId`) swaps three widgets to a drill-down:

| Widget | Overview | Room selected |
|---|---|---|
| Top-left | Overall readiness (rooms ready N/M) | **Room summary** — ring, status chip, Planned / GC actual / packages not started / next milestone |
| Centre-top | Whole building | **Isolated room** |
| Right column | Attention list + Upcoming handovers | **Packages** (20 rows, actual vs GC) + **Milestones** (5 gates) + 360 note |

---

## 2. Data coverage per block

Assessed against real sources (API v2, parquet artefacts, MCP tools) — see §3 for the gaps.

| # | Block | Ready | Gap |
|---|---|---|---|
| 1 | Top bar | 95% | Export PDF = new capability, not data |
| 2 | Overall readiness | 85% | "Open blockers" needs a rule; "+2 this week" needs historical recompute |
| 3 | Model viewer | 100% | Already shipped (viewer colouring) |
| 4 | Rooms requiring attention | 70% | Required-by date (define); blocker chips lose checklist half |
| 5 | Upcoming handovers | 75% | Handover-date definition |
| 6 | Readiness by room type | 90% | Room type = name parse; planned-% care |
| 7 | All rooms by level | 95% | Room type only in tooltip — droppable |
| 8 | Room summary (drill) | 80% | GC actual %, next milestone |
| 9 | Packages (drill) | 75% | GC column; needs `activity-categories-flat` wired |
| 10 | Milestones (drill) | 10% | No room link — **drop from MVP** |

**Overview ≈ 87% · drill-down ≈ 55% · whole canvas ≈ 78%.**
MVP = overview + room summary + packages (minus GC column), milestones dropped → ~90% of the mockup.

### The join that unlocks it

Elements **do** link to rooms — via dashboard parquets, not API v2 endpoints (this was initially missed):

```
project-element-list.parquet     modelElementId ↔ sourceFileElementId
  ⨝ element-room-mapping.parquet sourceFileElementId → modelRoomId
  ⨝ project-rooms.parquet        modelRoomId → roomName, ownerModelLevelId
  ⨝ project-levels.parquet       modelLevelId → levelName
```

Same four artefacts the dashboard registers for its Floor+Room filter (`_buildRoomFilteredElementsSql`). Combined with `element-status.parquet` (already downloaded by `viewer_mapper`) → **% installed per room**. Add `activity-categories-flat.parquet` → per-package breakdown.

### Verified field notes (don't re-derive these)

- **Capture dates come from `360captures` (`imageTakenOn`), NOT `room_capture_points`** — the latter has *no date field at all* (`createdFrom, modelLevelId, modelRoomId, projectId, roomCapturePointId, userCapturePointId, x/y/zMeters`).
- **Some captures have no `modelRoomId`** (e.g. manually uploaded screenshots) and are silently dropped by the hydrator's `if not rid: continue`. So "360 coverage N/M" counts only room-tagged captures and can under-report.
- `room_count: 547` observed on the reference project → room tagging works at scale.
- The block needs **two** room sources: full room list (denominator, rooms artefact) + captured rooms (360captures).
- **Room type is NOT a field.** Mostafa confirmed it's "an aggregation based on the room names". Real names: `L1-NORTH SUPPORT BATTERY 1245`, `L2-SOUTH SUPPORT HIGH VALUE STORAGE 288`, `SHELL ELEC. 2237` → pattern `[location prefix] [TYPE] [instance no.]`. Rule: strip trailing number → strip leading location tokens → normalise → group. Per-project by nature; show top N + "Other" so a bad parse degrades visibly.
- **"Readiness by room type" bar segments are a distribution of ROOMS, not element progress**: green `pct==100`, yellow `≥90`, orange `>0`, grey `==0`; white tick = avg *planned* %; chip = avg actual − avg planned. Verified numerically against the mockup. Note the axis mixes units (% of rooms vs % completion) and there is no "Behind" segment — raise with Mostafa.

---

## 3. Open gaps (decisions, not code)

| Item | Blocks | Status |
|---|---|---|
| **Milestones** | #10 | No element links → no room path. Mockup fakes them from % thresholds. Drop from MVP |
| **Checklists** | readiness definition, blocker chips | Commissioning/Supabase MVP, out of scope here. MVP relabels footnote to "Readiness = installed elements" |
| **GC actual %** | #8, #9 | Hypothesis: schedule `actual_progress` (contractor-reported) vs XYZ measured install. **Confirm with Ali** |
| **Handover / required-by date** | #4, #5 | Derivable as latest planned finish per room — needs confirmation |
| **"Open blockers" rule** | #2, #4 | Product definition needed |

⚠️ **Risk:** per-room planned % runs through the same activity-level denominator path that caused the live **"% of Planned" inflation incident**. Validate against dashboard numbers for the same room set before trusting vs-plan figures.

---

## 4. How the template fits the pipeline natively

Mirrors the **viewer** pattern exactly (classify → gate → conditional fetch → conditional prompt → graceful downgrade).

```
[0b]   Profiler            + capabilities.rooms (are the 4 room artefacts present?)
[0b½]  Viewer intent       (unchanged)
[0b¾]  TEMPLATE classifier pure keyword → RoomReadiness | None      ← NEW
[0c]   Clarifier           "Room readiness" as a module option; user pick overrides
[0d]   Viewer mapper       (unchanged)
[0d½]  Room readiness data only when template active → per-room rows ← NEW
[1]    Composer            + template prompt block, only when active ← NEW
```

### The safety property (why this can't break existing reports)

The composer system prompt is assembled as **cached blocks**:

```
Block 1  ARTIFACT_SYSTEM_PROMPT   (static, cache_control: ephemeral)
Block 2  DESIGN_SYSTEM_PROMPT     (static, cache_control: ephemeral)
Block 3  user_prompt              (unique per call)
```

**Append the template block AFTER the two cached statics, before the user prompt:**

```
Block 1  ARTIFACT_SYSTEM_PROMPT   ← unchanged
Block 2  DESIGN_SYSTEM_PROMPT     ← unchanged
Block 2b TEMPLATE_PROMPT          ← NEW, only when template active
Block 3  user_prompt
```

Consequences:
- **Non-room requests are byte-identical to today** — same prompt, same behaviour, same cache hits. Zero dilution of the 87KB base prompt, zero added tokens, zero over-trigger risk.
- Template requests still hit the cache for blocks 1–2 (prefix match preserved). Only the new block is uncached.
- Inserting the block *before* the design system would invalidate that cached block for template requests — **don't**.

### Other guardrails

- **Conservative classifier** — ambiguity defaults to `None` (existing generic flow). Never guess into the template.
- **Capability gate** — template only activates when the project actually has the 4 room artefacts; otherwise downgrade + emit an `intent_step` explaining why.
- **Conditional hydration** — the room-readiness join runs only when the template is active (it's expensive: 5 parquet downloads + pandas joins). Cache in T2 like `VIEWER_MAPPING`.
- **Additive only** — no edits to existing archetypes in the base prompt.
- **Regression test** — snapshot the assembled prompt + block list for a non-template request before/after the change; must be identical. This is the concrete proof that nothing else moved.

### Generalisation

Structure it so a template = `{ detector, required_data, prompt_section }`. Room readiness is the first; future templates (progress briefing, QA pack) drop into the same registry without touching the base prompt. Build for one, shape for many — don't build a framework up front.

---

## 5. Build order

1. **Data first** — per-room join (4 parquets + element-status), `capabilities.rooms`, T2 cache. Worthless to write the template before this exists.
2. Validate the room-name → type parse against the real room list; check per-room planned % against the dashboard.
3. Template classifier + clarifier option + conditional prompt block.
4. Composer template section (layout + blocks + the exact status/colour rules from the mockup).

## See also

- [phases.md](../phases.md) — where 0b¾ / 0d½ slot in
- [data-contracts.md](../data-contracts.md) — viewer mapping wire format (same pattern)
- [../../canvas/viewer-colouring.md](../../canvas/viewer-colouring.md) — the viewer pattern this mirrors
