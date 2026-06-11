# Dashboard — Progress Tab Explained

---

## 0. How the Progress tab works

The 3D colours and the % numbers are computed from different data sources and serve different questions — they can show different things at the same time.

| Screen area | Shows | Source files (parquet unless noted) |
|---|---|---|
| **3D viewer** | Per-element status colour | `svf2-object-id-map`, `element-status` (daily; PLT-2741), `activity-links`, `api_activities` (API v2) |
| **Left panel** | Actual%, Planned%, Variance, SPI, trend, discipline/package list | `planned-and-actual-project` · `planned-and-actual-category-groups` · `activity-progress` (see below), `api_activities` (API v2) |
| **Schedule (Gantt)** | Activity bars, progress overlay, grouping | `api_activities` (API v2), `activity-progress`, `activity-categories` (API v2) |
| **Floor/Room filter** | Narrows 3D viewer + Quality only — **not** the numbers (§6) | `project-rooms`, `project-levels`, `project-element-list`, `element-room-mapping` |

**Left-panel parquet depends on active filters** (default mode is "Mix"):

| Condition | Parquet |
|---|---|
| No filter (default) | `planned-and-actual-project` |
| Discipline or Package filter applied | `planned-and-actual-category-groups` |
| Activity selected in Gantt, or Phase/Area/Zone/… filter applied | `activity-progress` |

If colours and numbers disagree, it's usually a **data** problem (§6), not the screen lying.

---

## 1. The 3D model colours — what they mean

Each element is coloured by a **status code** (0–4). Colours:

| Status | Meaning | Colour | Hex |
|---|---|---|---|
| **Planned** | Scheduled, not started yet | 🟡 Yellow | `#ffde14` |
| **Installed Early** | Marked installed *before* its planned start | 🟢 Dark green | `#00ae49` |
| **Installed** | Marked installed (on/after plan) | 🟢 Bright green | `#00ea6c` |
| **Late Start** | Should have started, not installed | 🟠 Orange | `#e08613` |
| **Late** | Past its end date, not installed | 🔴 Red | `#fd3d39` |
| **Not Planned** | Not linked to any schedule activity | ⚪ Grey / uncoloured | `#808080` |

---

## 2. How an element's colour is decided

For each element, "as of" a reference date (see §3), we ask in order:

1. Is it **marked installed**, and was it installed **before** its planned start? → **Installed Early** (dark green)
2. Is it **marked installed**? → **Installed** (bright green)
3. Not installed, and its **end date has passed**? → **Late** (red)
4. Not installed, and its **start date has passed**? → **Late Start** (orange)
5. Not installed, but it **is linked to the schedule**? → **Planned** (yellow)
6. **Not linked to any schedule activity at all** → **no colour** (grey / stays raw)

So "installed" comes from a **per-element flag** set in the Editor/HoloSite. "Late / Late Start / Planned" come purely from the element's **schedule dates** compared to the reference date.

---

## 3. The "reference date" and the date slider (why colours change as you drag)

- The **reference date** = the **earlier of** (the date slider's end) **or** today. It's the "pretend it's this day" point used to judge status.
- An element only **appears** on the model once its **start has been reached** by the slider's end date. Drag the slider end **forward in time** and more elements light up (yellow Planned ones appearing as their start dates arrive).
- Therefore: **if the slider's end is before the project's first activity, the model shows nothing coloured.** This is expected, not a bug — move the slider into the project's date window.

```
 Slider end too early              Slider end inside schedule
 ──────────────────────           ──────────────────────────
 [no elements reached yet]        [elements up to that date are coloured]
 → model looks "raw"              → yellow/green/orange/red as appropriate
```

---

## 4. The % numbers (Overview + charts)

These come from **pre-computed parquet files**, **not** from the element colours.

**Definitions:**

| Term | Plain meaning |
|---|---|
| **Actual %** | How much is really done (weighted) as of the date |
| **Planned %** | How much *should* be done by that date, per the baseline plan |
| **Variance** | `Actual − Planned`. Positive = ahead, negative = behind |
| **SPI** | Schedule Performance Index = `Actual ÷ Planned`. >1 ahead, <1 behind, 0 if no plan |
| **Baseline** | The original planned curve (project-level only) |

**How "overall %" is rolled up** — it's a **weighted average across all activities**, not a simple count:

```
Overall % =  Σ ( weight × activity_progress )
            ───────────────────────────────────
                    Σ ( weight )

  weight   = the activity's size  (Planned Labour Units, or Linked Elements)
  progress = that activity's % complete on the chosen date (0–100%)
```

Big activities move the number more than small ones. At project level this roll-up is pre-computed by the backend; at package/activity level the frontend aggregates using the same formula. **If the weights are missing (all zero), the overall % cannot be computed and shows 0%** even when individual activities have progress (see §6).

---

## 5. Two key terms people confuse

- **Planned Labour Units** = *how big* an activity is (its weight). Constant for the activity.
- **Planned Progress / Actual Progress** = *how far along* it is **on a given date** (0% → 100% over its life).

> A big activity that hasn't started = **high labour units, 0% progress**. That's normal — they measure different things. Progress on an early date being 0 is expected; what matters is the value **as of today**.

**Calculation modes** (how the roll-up is scoped):
- **Project** — whole-project numbers (uses the project-level file).
- **Package** — aggregated per package/discipline.
- **Mix (default)** — no filters → project level; with filters → package level.
- **Activity** — when activities are selected in the Gantt (or a category filter narrows to specific activities).

---

## 6. "Why does it look wrong?" — FAQ for QA

| Symptom | Most likely explanation | Bug or expected? |
|---|---|---|
| **Model all yellow** | Schedule is entirely in the future relative to today → everything is "Planned". | Expected (project not started). |
| **Model not coloured at all** | Slider end is before the project's first activity start, **or** installation-status data hasn't synced. | Expected (slider) / Bug (sync — see PLT-2741). |
| **All green but % complete = 0** | Colours come from per-element install flags; the % comes from the progress files. If the **weight columns (Planned Labour Units / Linked Elements) are 0**, the weighted % can't compute → 0%. | Bug — missing weights in the data. |
| **Room / Floor filter doesn't change the Progress numbers** | Room/Floor currently filter the **3D colouring and Quality issues**, but **not** the Progress %. | Known limitation (separate ticket). |
| **Planned Progress = 0 but Planned Labour Units > 0** | Different columns: size vs time-phased %. On an early date, planned % is legitimately 0. | Expected — check the value as of today. |
| **Progress numbers briefly stale after an install is marked** | Progress parquets refresh on a ~15 min cycle; during recalculation the dashboard may show the previous value. | Known — PLT-2524 (add a cutoff timestamp to freeze fetches until the next parquet lands). |

---

## 7. Data sources & freshness (important for expectations)

| What | Comes from | Refresh cadence |
|---|---|---|
| Progress % (planned/actual) | Pre-computed progress output files | ~15 min (progress recalculation) |
| Element installation status (colours) | Element-status file synced to the dashboard store | Real-time (PLT-2741 fixed — status changes propagate immediately) |
| Schedule / activities | Activity & schedule data | With the model/schedule load |

In short: **colours** are now real-time (PLT-2741 fixed). **Progress numbers** lag up to ~15 min during parquet recalculation — PLT-2524 tracks a fix (cutoff timestamp to avoid showing stale data mid-recalculation).

---

## 8. Current known limitations (track separately)

1. ~~**PLT-2741**~~ — **Fixed.** Installation-status now propagates in real-time between editor and dashboard.
2. **Room/Floor filters don't affect the Progress %** (only colouring + Quality).
3. **Weight columns (Planned Labour Units / Linked Elements) can be empty** in some projects' progress files → overall % shows 0 despite per-activity progress. Upstream/back-end data issue.
4. **Future-dated projects** show a blank/all-yellow model by default if the date slider's end sits before the schedule starts.

---

*Mismatch between this page and what you see? It's usually one of the §6/§8 cases — if not, raise it with project + date range + screenshot.*
