# PLT-3091 — SOLVED against live prod, 2026-08-27

Answered without Sachin, without Sergey, and without asking Kyriakos for anything. Prod MCP access
made the six-field diff a query we could run ourselves.

**Verdict: not a bug. `LS-24891` is a Level of Effort activity, and the platform is correctly
excluding it from manual progress entry. The real defect is that the UI never says so.**

---

## The gate, re-read

`use-actual-progress-mutation.tsx:36-41` — an activity accepts a manual Actual % only if all three
hold:

```ts
if (activity.type === 'WBS') return false
if (activity.elements > 0) return false
return activity?.activityItem?.progressValid === true
```

`progressValid` is the API's `validForProgressCalculations` (`scheduler-service/utils.ts:62`).
`elements` starts as the API's `linkedElementCount` (`utils.ts:~78`) and is later overwritten by the
linking service from the links parquet (`schedule-entity.ts:730`).

## `LS-24891` on the current ATL05 revision (`64db53d6…`)

| field | value | gate |
|---|---|---|
| `itemType` | `Activity` | passes |
| `linkedElementCount` | **0** | passes |
| `validForProgressCalculations` | **false** | ❌ **this is the blocker** |
| `activityType` | **`TT_LOE`** | ← the reason |
| `itemName` | `OLD Alabama Road Closure - Old Alabama` | |
| `activityStatus` | `TK_NotStart` | |
| `plannedLaborUnits` | `null` | |
| `actualProgress` | `0.0000` | |
| `isUserProgress` | `false` | |

**The customer's "all the rest work" is exactly right.** All 7 siblings under the same parent
(`LS-24861`, `LS-24881`, `LS-1145`, `LS-24601`, `LS-1115`, `LS-25041`, `LS-24871`) have 0 linked
elements and `validForProgressCalculations = true` — 7/7 editable.

## What makes `validForProgressCalculations` false — the rule, measured on two projects

This is the question the prior run wanted to route to the backend. It is answerable from the data,
and the correlation is perfect in both directions.

**ATL05** — 3,761 activities:

| activityType | valid=true | valid=false |
|---|---|---|
| `TT_Task` | 3,260 | 0 |
| `TT_FinMile` | 72 | 0 |
| `TT_Mile` | 57 | 0 |
| **`TT_LOE`** | **0** | **19** |

**ATL08** — 7,200 activities, independent project:

| activityType | valid=true | valid=false |
|---|---|---|
| `TT_Task` | 5,875 | 0 |
| `TT_Mile` | 172 | 0 |
| `TT_FinMile` | 114 | 0 |
| **`TT_LOE`** | **0** | **46** |

**10,961 activities across two projects, zero exceptions.** Every `TT_LOE` is invalid; every invalid
one is `TT_LOE`.

Ruled out: `plannedLaborUnits IS NULL` does **not** predict it — 626 ATL05 activities have null
labour units and only 19 are invalid.

### Why that is correct behaviour

`TT_LOE` is Primavera P6's **Level of Effort** task type (alongside `TT_Task`, `TT_Mile` start
milestone, `TT_FinMile` finish milestone). An LOE activity's dates and duration are *derived* from
the activities it spans via its predecessor/successor links — P6 computes them, you do not enter
them. So progress on an LOE activity is not an independent quantity, and excluding it from manual
progress entry is right.

`LS-24891` is "OLD Alabama Road Closure" — a closure spanning the duration of the paving work
around it. Textbook LOE.

## Project-wide gate breakdown (ATL05)

| | count |
|---|---|
| all rows | 3,761 |
| WBS rows (never editable) | 353 |
| non-WBS with linked elements (locked, by design) | 813 |
| non-WBS, zero elements, `valid=false` (locked — the 19 LOE) | 19 |
| **editable** | **2,576 (68.5%)** |

So on ATL05 exactly **19 activities out of 3,761** behave the way the customer reported, and all 19
are LOE. This is a small, well-defined cohort, not a widespread failure.

---

## The real defect — and it is FE-only and small

The gate distinguishes three lock reasons internally and surfaces **none** of them. The cell simply
does not accept input, with no tooltip, no disabled-state explanation, no message.

**`activityType` is already on the very object the gate reads.** `scheduler-service/utils.ts:56`
sets `activityItem.activityType = item.activityType`, two lines above `progressValid`. So the fix
needs **no** API change, no backend work, no new field:

- `elements > 0` → "driven by its linked elements"
- `activityType === 'TT_LOE'` → "Level of Effort activity: progress comes from the activities it spans"
- `type === 'WBS'` → "summary row"

That is the ticket worth raising, and it is the whole customer-facing problem: Kyriakos spent time
and raised a Major incident because a cell silently did nothing.

## Adjacent finding — milestones pass this gate (cross-ref PLT-2917)

`TT_Mile` and `TT_FinMile` are `valid=true`, so milestones **are** editable here: 129 on ATL05, 286
on ATL08. That connects to **PLT-2917**, where typing progress on a milestone is accepted but
nothing ever writes Actual Finish Date, which is what the milestone widget and PowerBI read. Same
surface, opposite failure: this ticket is "correctly locked but unexplained", PLT-2917 is
"incorrectly unlocked and silently useless". Worth looking at together when the FE work is scoped.

---

## Supersedes the prior `recommended-action.md`

That draft's three asks are now unnecessary:

- ~~"@Yash → Kyriakos: name one activity that works"~~ — we have all 7 siblings, from the API.
- ~~"@Sergey/@Sachin: six field values for both activities"~~ — pulled ourselves, both projects.
- ~~"what makes `validForProgressCalculations` false?"~~ — answered: `activityType == TT_LOE`.

Its diagnosis was **half right**: it offered "a stray element link would lock it, or the backend has
flagged it as not valid". The second half was correct (`linkedElementCount` is genuinely 0, the flag
is genuinely false). The first half was wrong and would have sent Yash to the customer for nothing.

Its one instinct that holds: *"'that activity has linked elements so it's driven automatically' is
the most likely explanation and would be an embarrassing thing to be wrong about in writing."*
Exactly right — it was wrong, and the query cost nothing.

## What remains unverified

- **That the backend derives the flag from `activityType` rather than something upstream that
  correlates with it.** The correlation is 10,961/10,961, but I read the API output, not the code
  that computes the field. A third mechanism producing the same partition is not excluded.
- **Whether the flag is also false for LOE on projects with a different scheduling source** (both
  samples are P6/XER SWITCH projects).
- **Whether Kyriakos actually had no input box, or had one that rejected his entry.** The two
  attached screenshots (ids 63410, 63409) are still unopenable behind Atlassian auth. This no longer
  blocks the diagnosis — it only changes how the reply is worded.

## How this was run

```
prod MCP -> xyz_get_projects_project_id_schedules            (find isCurrent revision)
         -> xyz_get_projects_project_id_schedules_schedule_revision_id  (~3.4 MB, ~90s per project)
```
Read-only. Nothing was modified. Recipe: `incidents/prod-mcp-access.md`.
