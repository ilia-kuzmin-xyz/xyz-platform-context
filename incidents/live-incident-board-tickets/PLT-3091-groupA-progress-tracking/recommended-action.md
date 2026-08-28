# PLT-3091 — recommended action (DRAFT ONLY — execute nothing)

## Group A verdict: **stay Open.** Post one analysis comment that asks for the working half of the pair, and route one backend question.

Do **not** move this to With Technical Support and do not route it to dev. The ticket is one field
comparison away from a diagnosis, and both halves of that comparison are obtainable without handing
the ticket anywhere: one of them is already sitting in the two attached screenshots, the other is one
API row. Parking it with TS would stop the clock on work we can do ourselves today.

## Chosen action: (a) — one comment, three asks, one owner each

1. **@Yash → Kyriakos:** name **one activity that works**, alongside `LS-24891`. (Playbook move #3: we
   have the broken half and no working half; the diff *is* the diagnosis.)
2. **@Sergey/@Sachin (whoever owns the ATL05 activity API):** six field values for those two activities.
3. **State the mechanism** so nobody re-derives it, and flag that this is probably **not** a regression —
   the flag looks newly enabled for this client.

## Why this and not the others

- **Not "With Technical Support."** The tempting read is "we need something from the customer, so hand it
  back". We do want one activity id from them, but that is a question inside a comment, not a
  hand-off — and the *decisive* evidence (the two screenshots already attached, plus one API row) is on
  our side of the fence. Moving to TS would park a Major ticket while the work that resolves it is
  ours to do. Ask in-thread, keep the ticket.
- **Not "Ready For Development."** Five candidate causes (`context.md §Ranked hypotheses`), and **three of
  them are the gate working as specified** — the activity genuinely is not eligible for manual progress.
  Routing to dev now means guessing which. There is one FE defect worth raising (§Separate item below),
  but it is a *separate* ticket, not this one's fix.
- **Not "Blocked."** Nothing external blocks us.
- **Not a straight answer to the customer yet.** "That activity has linked elements so it's driven
  automatically" is the most likely explanation and would be an embarrassing thing to be wrong about in
  writing. Confirm the row first; it costs one query.

## Owner map (one question, one owner)

| Owner | The one thing |
|---|---|
| **Yash Patel** → Kyriakos | one **working** activity id; and: was `Editor-Progress` only just switched on for ATL05? |
| **Sergey / Sachin** (ATL05 activity API) | the six field values for `LS-24891` + the working sibling; and what sets `validForProgressCalculations` false |
| **Ilia Kuzmin** | open the two screenshots (box-or-no-box), run the cohort count once the mechanism is named |

---

## Draft — analysis comment (author: Ilia Kuzmin; @ Yash Patel, @ Sergey / @ Sachin)

Playbook style: mechanism, then one closed question per owner, explicit scoping, no hedging.

> Looked at PLT-3091 (ATL05, `LS-24891` won't take an Actual % update while its siblings do). Mechanism
> first, then two asks.
>
> **What decides it.** The web viewer lets you type an Actual % on an activity only if all three of these
> hold: it isn't a WBS/summary row, it has **zero linked elements**, and the schedule API returns
> `validForProgressCalculations = true` for it. All three come from the backend, per activity. The user's
> permission and the feature flag are project-wide, so neither can explain one activity behaving
> differently from the one next to it — it has to be one of those three fields.
>
> Worth noting that "intangible" in our reporting means exactly *zero linked elements* — which is one of
> the three conditions. So the most likely answer is that `LS-24891` isn't actually intangible (a stray
> element link would lock it), or that the backend has flagged it as not valid for progress calculations.
> Either way the UI never says which, and that's a real gap on our side.
>
> **@Yash — one for Kyriakos:** can he name **one activity that does work**, so we have something to diff
> `LS-24891` against? Also — was the Editor Progress flag only just switched on for ATL05, or had he been
> updating progress successfully before? If it's newly enabled there's no regression to hunt, and that
> changes where we look.
>
> **@Sergey / @Sachin — one query,** on the current ATL05-x schedule revision, for `LS-24891` and whichever
> working activity Kyriakos names: `itemType`, `linkedElementCount`, `validForProgressCalculations`,
> `plannedLaborUnits`, `actualProgress`, `isUserProgress`. Those six values side by side settle it. And
> separately: **what makes `validForProgressCalculations` false for an ordinary activity?** I can't see that
> rule from the frontend.
>
> **Scoping:** this is the Editor Progress manual-override path, not the 3D viewer and not the progress
> dashboard's calculated numbers. I'll read the two screenshots against the UI myself — an editable cell
> has a visible box around the value and a locked one doesn't, so they should tell us straight away whether
> he had a field to type in at all.

---

## The one evidence step, if you only do one thing

Open **attachment 63410 / 63409** and answer: **does `LS-24891`'s "Actual % Complete" cell have a bordered
box like its neighbours?**

- **No box** → the editability gate (`use-actual-progress-mutation.tsx:36-41`). Then check for a
  "Linked elements" button / the *"Values are driven via linked elements"* tooltip: present ⇒ H1 (it has
  links), absent ⇒ H2 (`validForProgressCalculations` false) — and H2 is a backend question.
- **Box present, red toast** → the POST was rejected. Backend, per-activity — ask about the
  `calendarDate` (we always post *today*) and any activity-window constraint.
- **Box present, green toast, value gone on reload** → the override→parquet merge
  (`xyz."ActivityProgress"` / `vw_CurrentUserDefinedProgress`, per Rishi on PLT-2917 §0.6), not the FE.

Full visual key: `context.md §Mechanism D`.

## Separate item — raise it, don't bundle it

`context.md §Mechanism C` found a genuine FE inconsistency, independent of whatever fired on ATL05:
the Gantt column paints a cell locked using `task.elements || task.calculatedElementsSum > 0`
(`scheduler-columns.tsx:149-150`), i.e. it counts elements linked to **descendant** activities, while the
click gate and the Activity-details panel use `activity.elements > 0` only
(`use-actual-progress-mutation.tsx:39`). So a parent activity with no links of its own but linked children
reads as **locked in the Gantt and editable in the panel**. Two surfaces, two answers, same activity.

Own it as its own ticket (Darminder/Rishi). If it turns out `LS-24891` *is* such a parent, this ticket
collapses into that one — but don't assume it does.

## Follow-through the human should own (not executed here)

- **Cohort (playbook Q6).** Once the mechanism is named, count it across ATL05-x rather than waiting for the
  next report — e.g. activities with `linkedElementCount = 0 AND validForProgressCalculations <> true`
  (the set that looks intangible but can't be edited). Kyriakos's "all the rest" may mean "the four others
  I tried".
- **Trigger (playbook Q5).** Don't let the flag-enablement / schedule-re-upload question drop. It is one
  line in the drafted comment; make sure it gets an answer, not a nod.
- **The product gap, whatever the cause.** If the gate is working as specified, the customer-visible defect
  is that nothing on screen says *why* the field is read-only — the panel's only tooltip says "Actual
  progress updates every 15 minutes", which implies the opposite. That is `recurring-defect-patterns.md`
  **Pattern 5** verbatim, and Pattern 5's own note says the preventive fix is a UI indicator, not a change
  to the gate. Worth a low-priority UX ticket with Jason, sized on the back of this incident.
- **Feeds an open product decision.** Clients are actively using `Editor-Progress` while it is still
  default-off (`constants.ts:896`). Pietro's flag question from 07-31 is still unanswered
  (PLT-2917 §0.7.4); this ticket is fresh evidence for it. Mention it to Mostafa when the flag decision
  next comes up — don't attach it to this incident.
- **On close:** add a `dashboard/progress-tab.md` section documenting the three-condition editability rule
  and its three gate sites, and a `dashboard/pitfalls.md` entry — *"Actual % Complete is editable only when
  itemType ≠ WBS, linkedElementCount = 0 and validForProgressCalculations = true; all three are
  backend-supplied per activity, and the UI gives no reason when it refuses. The Gantt column additionally
  counts descendants' links, so it and the Activity-details panel can disagree."* (Not editing outside this
  folder per task constraints — noting only.)

## 2026-08-27 — supersedes the drafts above; cause confirmed, ask is now narrow

The prior drafts ask Yash for a working activity id and Kyriakos for screenshots. **Do not post
them** — the console read on prod supplied both and more. See `context.md` 2026-08-27.

**Category:** not a frontend bug. A correct backend gate with **no UI explanation** (Pattern 5),
plus a backend/planning question about why this activity has no planned labour units.

### Draft comment (NOT posted)

> Found the cause. `LS-24891` is flagged `validForProgressCalculations = false` by the backend, and
> it has no planned labour units, while a working sibling on the same project (`INT-18920`) has
> 154.603 of them. Intangible progress is measured against planned labour units, so with none there
> is nothing to be a percentage of and the field is locked. Nothing was ever sent to the server, so
> this is not a failed save.
>
> The genuine fault on our side is that the viewer never says any of that. The cell simply does not
> respond, and the details panel says progress "updates every 15 minutes", which suggests a value is
> on its way when it is not. I have a branch that replaces that with the actual reason.
>
> Worth flagging: 19 of the 2,595 unlinked activities on ATL05 are in the same state, so this will
> come back unless we look at them together.
>
> One question for the planners: if labour units are added to `LS-24891`, does it become editable?
> If so that is the customer's fix and we should say so.

### Route the backend question

Sergey (api-v1) or Sachin/Ali (api-v2), one closed question: **what sets
`validForProgressCalculations` to false — is it exactly "no linked elements and no planned labour
units"?** Everything else here is settled; this is the only unknown that changes what we tell the
customer.

### Board

Keep in `Open` until the labour-units question is answered. It is not blocked, and it is not ready
for dev either: the branch is a UX fix for the silence, not a fix for the ticket's symptom.

## 2026-08-27 — CORRECTION: route the backend question to api-v2 (Sachin / Ali), not Sergey

The 2026-08-27 section above says "Sergey (api-v1) or Sachin/Ali (api-v2)" and then defaults to
Sergey in the draft. **That is wrong.** Established from code rather than the roster:

- `ActivityApiService` extends `PlatformApiServiceBase`
  (`services/activityService/activity-api-service.ts:28`).
- `PlatformApiServiceBase` uses the shared axios instance
  (`services/webViewerService/platform-api-service-base.ts:2,10`).
- That instance is `baseURL: SERVER_API_URL + '/api/v2'`
  (`services/webViewerService/api-instance.ts:43`).

So the schedule/activity endpoints, including
`POST /projects/{projectId}/activities/progress`, are **api-v2 — Sachin and Ali**.

The prior pass's roster note listed both owners and said "route to whichever owns the
schedule/activity API on ATL05" without resolving it; this run repeated the ambiguity and then
picked the wrong default. **Tag Sachin or Ali on the `validForProgressCalculations` question.**

Worth keeping as a habit: the owner of an endpoint is decidable from `baseURL` in one grep, so
resolve it rather than carrying "v1 or v2" forward.

---

# ⛔ 2026-08-27 (later) — SUPERSEDED. Do not send the draft above.

The three asks in it are answered. See **[`prod-answer-2026-08-27.md`](prod-answer-2026-08-27.md)**.

`LS-24891` has `linkedElementCount = 0` and `validForProgressCalculations = false`, and its
`activityType` is **`TT_LOE`** — a Primavera Level of Effort activity, whose progress P6 derives
from the activities it spans. On ATL05 and ATL08 together, 10,961 activities, `valid=false` and
`TT_LOE` are the same set with zero exceptions. So the lock is correct and the ticket is not a bug.

All 7 of `LS-24891`'s siblings are editable, so the customer's "all the rest work" is accurate.

**Revised verdict: answer the customer, and raise one small FE ticket.** Not Ready For Dev on this
number, not Blocked, and nothing to ask the backend.

## Draft — reply on the ticket (author: Ilia; @ Yash)

> `LS-24891` is a Level of Effort activity in the P6 schedule, so its progress isn't something you
> can type — P6 works it out from the activities it spans. Our editor blocks manual entry on those
> deliberately, which is why its seven siblings all accept a value and this one doesn't.
>
> On ATL05 that applies to 19 activities out of 3,761, all of them Level of Effort. Nothing is
> broken on this one and there's no data fix needed.
>
> The fair complaint is that the cell just sits there and says nothing. Kyriakos had no way to know
> why, which is why this became an incident. I'm raising that separately as a UI fix — we already
> have the activity type on screen, so it's only a matter of showing the reason.
>
> **Can you let Kyriakos know it's working as intended, and that we're fixing the missing
> explanation?**

## 2026-08-28 — superseded: the substance of the draft above was posted (by Ilia directly), confirmed by Mostafa, and the ticket is now with the customer

Do not post the draft comment above — a same-conclusion comment already went out (110587, 17:16
BST 08-27), Mostafa confirmed it (110588), and Yash is now asking Kyriakos whether working-as-intended
is an acceptable close (110589-110591). **No Jira action needed from this routine.** The two
follow-through items (separate UX ticket for the silent lock; the Gantt/panel roll-up
inconsistency) remain unfiled and are the only genuinely open work — see `context.md` 2026-08-28.

## The separate FE ticket to raise

**"Editor Progress: say why an Actual % cell is locked."** The gate
(`use-actual-progress-mutation.tsx:36-41`) knows all three reasons and surfaces none. `activityType`
is already on the same object (`scheduler-service/utils.ts:56`), so no API or backend change:

- `elements > 0` → driven by linked elements
- `activityType === 'TT_LOE'` → Level of Effort, progress comes from the activities it spans
- `type === 'WBS'` → summary row

Bundle with the Gantt/panel inconsistency already noted in `context.md` (the column's lock predicate
counts descendants' linked elements while the click gate counts only the activity's own).
