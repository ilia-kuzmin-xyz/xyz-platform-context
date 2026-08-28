# PLT-3091 — "ATL05 - Cannot update intangible progress in the Web Viewer" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3091
- **Issue type:** Live Incident · Software Area: **Web Viewer**
- **Status:** **Open** (brand new, no analysis posted yet) · **Priority:** Major
- **Project (site):** **SWITCH — ATL05-x**
- **Reporter / coordinator:** Yash Patel · **Assignee:** Ilia Kuzmin
- **End user:** "Kyriakos" (client side) · session id `platform-web-e26d7258-3fd2-417f-b9d6-adfc1eddec75`
- **Created:** 2026-08-26 15:51 · **Freshdesk:** #7773, "Waiting on 3rd line" (i.e. back on us)
- **Comments:** 2 (110463 Yash relay, 110466 Freshdesk status)
- **Attachments:** 2 Jira images (`Screenshot 2026-08-26 161355…` id **63410**, `Screenshot 2026-08-26 201905…` id **63409**) — **not readable here** (Atlassian binary media behind auth). The two further images in the comment are `blob:` URLs, not fetchable at all. See NEEDS HUMAN. Do not guess contents.
- **Confirmed sample activity:** **`LS-24891`** — the one that cannot be updated.
- **Working siblings:** "all the rest activities" — **no specific working ID given.** This is the single most important missing fact (see §Playbook Q3).
- **Domain slug chosen:** `progress-tracking` (justified in §Domain slug)

---

## One-line symptom

On **ATL05-x**, with the **`Editor-Progress`** feature flag enabled for the project, the client can
set *Actual % Complete* on intangible (unlinked) activities in the web viewer for every activity
they have tried **except `LS-24891`**, where the update does not take.

**"Intangible" is the customer's/reporting vocabulary, not a field in our code.** `rg -i intangible`
over `hc-frontend` returns exactly **one** hit and it is a doc, not code:
`docs/dashboard/api/planned-and-actual-activity-schema.md:7` — *"if there are linked elements,
actual progress is calculated from the number of installed elements (i.e. tangible). Otherwise,
reported / planned labour units is used (i.e. intangible)."* So "intangible" **means
`linkedElementCount === 0`**, and that is precisely one of the three conditions the FE uses to decide
whether the progress field is editable. That coincidence is the whole ticket: *an activity the
customer believes is intangible failing the intangible test is the most economical explanation.*

---

## Playbook questions applied

**1. What exactly is observed — can we observe it right now?**
No. We have a second-hand relay of a client sentence plus two screenshots we cannot open. Critically
we do **not** know which of three very different observations "unable to update" denotes, and they
have different causes:
 (a) **no edit affordance** — the field renders read-only, there is nothing to click;
 (b) **edit accepted, red error toast** — *"Could not update Actual % Complete for …"* (`use-actual-progress-mutation.tsx:122-126`), i.e. the POST failed;
 (c) **edit accepted, green success toast, value snaps back / is gone on reload** — the write path succeeded client-side but the value did not survive.
The screenshots almost certainly disambiguate this in one glance (§Mechanism D gives the exact visual
tell). Until then this is a rumor with an activity id attached, not an observation. It *is* a
**currently-broken** instance, which the playbook rates highest — good.

**2. What did we expect — on whose authority?**
The reference is **sibling activities on the same project, same session, same user, same day** —
"i can for all the rest activities". That is a much stronger reference than the usual "it worked last
month" folklore, because it removes user, tenant, role, deploy and browser as variables in one step.
There is **no "it worked before" claim here**: the client says the feature is newly available to them
via the Feature Flags page. So **this is probably not a regression** — see Q5.

**3. Smallest broken-vs-working pair — we are one field away from the diagnosis, and we do not have it.**
The customer has handed us half of the single most powerful artifact in the playbook: a broken
instance (`LS-24891`) with a working cohort. What is missing is **one named working activity id** and
the three FE-decisive field values for both. The FE editability predicate reads exactly three fields
(§Mechanism B); a side-by-side of those three values for `LS-24891` vs one working sibling **is the
diagnosis**, not evidence toward it. This is the whole recommended action.

**4. What decides the behavior? (mechanism)** — see §Mechanism. In short: **one predicate,
`isActivityEditableForProgress`, gates every progress-edit surface in the viewer, and it is false if
the activity is a WBS row, OR has ≥1 linked element, OR does not have `progressValid === true`.** All
three are per-activity and all three are supplied by the backend. The FE contributes no per-activity
state of its own to that decision.

**5. Why now? (trigger)** — **Probably "the flag was just turned on for this project", not a
regression.** `Editor-Progress` ships default `false` (`config/constants.ts:896`) and the client's own
words are that the feature is "available through 'feature flags' page" — i.e. newly enabled. If so
there is no dated regression to hunt: the gate has always behaved this way and the customer is simply
meeting it for the first time. **This must be asked rather than assumed**, because the alternative
(a schedule re-upload on ATL05 that changed `LS-24891`'s linked-element count or its
`validForProgressCalculations`) is equally consistent with the report and points somewhere completely
different. Two closed questions, one owner each — see recommended-action.

**6. Who else? (cohort)** — Unknown and probably non-trivial. If the cause is
`validForProgressCalculations = false`, the cohort is *every activity on ATL05 with that flag false*,
and the customer has only tried a handful. The cohort query is cheap once the mechanism is fixed
(count activities on ATL05-x by `linkedElementCount = 0 AND validForProgressCalculations <> true`);
run it in the same pass rather than waiting for the next ticket. Also worth asking Kyriakos whether
`LS-24891` is genuinely the *only* one — "all the rest" may mean "the four others I tried".

---

## Mechanism (code-verified) — what makes exactly one activity un-editable

All paths relative to `hc-frontend/src/main/webapp/app/`.

### A. What the `Editor-Progress` flag turns on (three surfaces, not one)

Flag declared at `config/constants.ts:875` (union member) and defaulted **`false`** at `:896`. It
gates:
1. `pages/organisation/ViewerPage/components/viewer-x/components/blocks/activity-properties/activity-progress.tsx:118` — early-returns the whole *Activity details* progress block when off.
2. `…/gantt-x/scheduler/scheduler-columns/scheduler-columns.tsx:12` (`showPercentageColumns`) → pushes the **Planned %** and **Actual %** Gantt columns at `:126-164`.
3. `…/gantt-x/edit-schedule/blocks/edit-form/edit-form.tsx:65` — combined with `activeSchedule?.hasAnyActualProgress`.

(Consistent with the three sites already recorded on **PLT-2917** `context.md §0.7.4`; re-verified
this run, line numbers unchanged.)

So there are **two places a user can type a percentage**: the Gantt *Actual % Complete* cell (inline
editor) and the *Activity details* side panel. **Which one Kyriakos used matters** — they do not
apply identical rules (§C).

### B. The single editability predicate — three per-activity conditions, all backend-supplied

`…/ViewerPage/services/progress/use-actual-progress-mutation.tsx:36-41`:

```ts
export const isActivityEditableForProgress = (activity: ScheduleItemDto | null): boolean => {
  if (!activity) return false
  if (activity.type === 'WBS') return false        // :38
  if (activity.elements > 0) return false          // :39
  return activity?.activityItem?.progressValid === true   // :40
}
```

Each of the three is hydrated straight from the schedule API response, in
`…/components/scheduler-service/utils.ts`:
- `type` ← `item.itemType` (`utils.ts:82`), API type `schedule-api-service.types.ts:33`. Value domain is **`Activity` | `WBS`** (not "Task"/"Milestone" — PLT-2917 `context.md §0.5` corrected the doc on this; **milestones arrive as ordinary `Activity` rows**, so `itemType` will not single one out).
- `elements` ← `item.linkedElementCount` (`utils.ts:78`), API type `schedule-api-service.types.ts:36`.
- `activityItem.progressValid` ← `item.validForProgressCalculations` (`utils.ts:62`), API type `schedule-api-service.types.ts:38`.

That predicate is the **only** editability rule, and it is used by both write surfaces:
- Panel: `activity-progress.tsx:36-39` — `canEditProgress = hasScheduleEditAuthority && editableActivities.length > 0`; if false the panel renders a **read-only `StaticTextField`** instead (`:169-176`).
- Gantt inline editor: `…/scheduler-editor/inline-editors/editor-registry.ts:9-12` registers it as `isEditable`, and the cell-click handler bails on it at `…/scheduler/hooks/use-scheduler-inline-editor.tsx:168` (`if (!editorConfig.isEditable(task)) return`). The editor component re-checks at `actual-progress-editor.tsx:54`.

**`validForProgressCalculations` is a real, per-activity, nullable backend flag** — the MSW fixture
`app/mocks/msw/fixtures/schedule-revision.json` shows `WBS` rows carrying
`"validForProgressCalculations": null` and `Activity` rows carrying `true`. **What makes the backend
emit `false`/`null` for an ordinary activity is not knowable from this repo** — it is computed
upstream. Given the parquet doc (`docs/dashboard/api/planned-and-actual-activity-schema.md:7`), the
obvious candidate is *an activity with neither linked elements nor planned labour units*: there is no
denominator, so nothing to be a percentage **of**. That is a guess and is flagged as such — it needs
Sergey/Sachin, and it is the highest-value backend question on the ticket.

### C. The Gantt column paints a *stricter* rule than the click gate — a real FE inconsistency

`scheduler-columns.tsx:149-150`:

```ts
const hasLinkedElements = task.elements || task.calculatedElementsSum > 0
const isEditable = task.activityItem?.progressValid === true && !hasLinkedElements
```

This adds **`calculatedElementsSum`** — the recursive roll-up of the activity's own elements *plus all
its descendants'* (`project-x/entities/schedule-entity.ts:769-782`, `:790-805`). The click gate
(§B) does **not**. Consequences, both live:
- A parent activity with **0 own** elements but linked elements **on its children** is painted
  **non-editable** (no bordered box, "driven via linked elements" tooltip) yet `isActivityEditableForProgress`
  would happily open an editor for it. The user reads the cell as locked and stops.
- Conversely nothing in the panel (`activity-progress.tsx`) consults `calculatedElementsSum` at all,
  so the same activity **is** editable in *Activity details*. **Two surfaces, two answers, same
  activity.** If `LS-24891` has children carrying links, this alone produces "I can't update this one"
  in the Gantt while every leaf sibling works.

This is a genuine defect vector independent of whatever fired on ATL05, and worth its own fix
regardless of the outcome here.

### D. What each cause looks like on screen — the tell to read the screenshots for

This is why the two attachments are worth more than any further code reading:

| Cause | Gantt *Actual %* cell | *Activity details* panel |
|---|---|---|
| `elements > 0` (has links) | plain text, class `actual-progress-linked`, hover tooltip **"Values are driven via linked elements."** (`gantt-tooltip.tsx:18`) | read-only, **plus a "Linked elements" button with a count** (`activity-properties.tsx:158-163`) |
| `calculatedElementsSum > 0` only (roll-up) | same as above — painted locked | **editable** (panel ignores roll-up) — surfaces disagree |
| `progressValid !== true` | **plain text with no styling and no tooltip at all** — visually near-identical to an editable cell minus the box; clicking does nothing | read-only `StaticTextField`, tooltip *"Actual progress updates every 15 minutes…"* (`activity-progress.tsx:174`) — **which does not say why it is read-only** |
| `type === 'WBS'` | non-editable, and the row is a summary bar | read-only |
| POST rejected by BE | box present, edit accepted, **red** toast *"Could not update Actual % Complete for …"*, value rolls back (`use-actual-progress-mutation.tsx:111-127`) | same |

An **editable** cell is visually distinctive: `gantt-x.styled.tsx:763-778` gives `.actual-progress-editable`
a 1px grey border, rounded corners, pointer cursor and a hover background. **So the screenshot answers
"affordance vs failure" instantly:** if `LS-24891`'s cell has no box while its neighbours do, this is
the gate (§B), not the write path.

**Note the third row.** `progressValid === false` is the *silent* failure: no tooltip, no badge, no
explanation anywhere in the UI. That is the same shape as `recurring-defect-patterns.md` **Pattern 5**
— *a deliberate, correct, invisible gate mistaken for a defect* — with the aggravating factor that the
one tooltip the panel does show ("updates every 15 minutes") actively suggests the value is coming
from somewhere else soon, which it is not.

### E. The write path, if the click did get through

`use-actual-progress-mutation.tsx:58-64` → `services/activityService/activity-api-service.ts:257-266`:
`POST /projects/{projectId}/activities/progress` with body
`{ calendarDate, activitiesProgress: [{ activityId, progress }] }`, where **`calendarDate` is
`dayjs().format('YYYY-MM-DD')` — always *today*** (`use-actual-progress-mutation.tsx:61`) and
`activityId` is the internal `itemId` UUID, not the user-facing `LS-24891` (`utils.ts:72`, `:50`).
Two things to note:
- If the backend constrains progress rows to an activity's own date window, an activity that finished
  long ago or has not started could be rejected **per-activity** while its siblings are accepted. Purely
  a backend question — the FE always posts today. **Worth asking; not asserted.**
- The user override is stored separately and merged into the parquet-derived value at request time,
  flagged `isUserProgress: true` — this is Rishi's mechanism, recorded on **PLT-2917** `context.md §0.6`
  (`xyz."ActivityProgress"` / `vw_CurrentUserDefinedProgress`). So a value that *saves* but *reappears
  wrong after reload* is a merge-side problem, not an FE one. Symptom (c) in Q1 would point here.

### F. Eliminated (so nobody re-walks these)

- **Authority / permissions.** `ScheduleEdit` (`constants.ts:245`) is checked at
  `activity-progress.tsx:33`, `use-scheduler-inline-editor.tsx:171` and `actual-progress-editor.tsx:54`,
  but it is resolved **per project**, not per activity (`hooks/useEditorAuthorities.ts:11-18`, keyed on
  `projectIdForToken`). It cannot make one activity behave differently from its neighbour. Rule out.
- **The feature flag itself.** Global to the session; on for the whole project or off. Rule out.
- **`activityItem.disabled`.** `schedule-entity.ts:946` makes `updateActivityMapping` silently skip
  disabled activities, which would produce a green toast over an unchanged value — a tempting fit for
  symptom (c). But `disabled` is only ever set on **root activities that have children**
  (`schedule-entity.ts:461-471`, with `topLevelActivities` defined as *no parent AND has children* at
  `services/webViewerService/schedule-service.tsx:167-168`) and on **childless WBS rows**
  (`schedule-entity.ts:855`). A leaf task cannot be either. Rule out **unless** `LS-24891` turns out to
  be a parent/summary row — which the ID prefix does not tell us.
- **"It regressed."** No dated before-state exists on this ticket (Q5). Do not spend time on a deploy
  diff until someone confirms the client had this working previously.

---

## Ranked hypotheses, each with a falsifiable prediction

**H1 — `LS-24891` has ≥1 linked element (it is not actually intangible).** `elements > 0` at
`use-actual-progress-mutation.tsx:39` locks it on every surface.
- *Predicts:* the Gantt **Elements** column (`scheduler-columns.tsx:168-196`) shows a non-zero count on
  that row, and the panel shows a **Linked elements** button. Hovering the Actual % cell says *"Values
  are driven via linked elements."*
- *Falsified if:* Elements reads 0 and there is no linked-elements button.
- *Cost:* one look at the existing screenshots, or 10 seconds in the UI.

**H2 — the backend flags it `validForProgressCalculations = false`.** `progressValid !== true` at `:40`.
- *Predicts:* Elements is 0, the cell has **no box and no tooltip**, and the activity API row for
  `LS-24891` on the current ATL05 schedule revision carries `validForProgressCalculations` false/null.
  Most likely secondary marker: **no planned labour units** (the intangible denominator, per the parquet
  doc) — plausibly a milestone or a level-of-effort row.
- *Falsified if:* the API row says `true`.
- *Cost:* one API/DB read. **This is the check that most needs a human.**

**H3 — roll-up lock: 0 own elements but linked elements on descendants** (§C).
- *Predicts:* the Gantt cell is painted locked while the **Activity details panel still lets you edit
  it** — a self-diagnosing asymmetry. `LS-24891` has child activities.
- *Falsified if:* the panel is read-only too, or the activity is a leaf.

**H4 — it is a WBS/summary row, not an activity** (`:38`).
- *Predicts:* `itemType = 'WBS'`; it renders as a summary bar with rolled-up children.
- *Falsified if:* `itemType = 'Activity'`. Cheap; check alongside H2 in the same query.

**H5 — the edit posts and fails/reverts backend-side** (§E) — rejected POST, or the
override→parquet merge dropping it.
- *Predicts:* symptom (b) or (c), i.e. a toast, not a missing box. A 4xx/5xx on
  `POST /projects/{id}/activities/progress` in the session's network log.
- *Falsified if:* the screenshot shows no editable box at all — then nothing was ever posted.
- Note the client gave us a **session id** (`platform-web-e26d7258-…`); if that resolves to an MS Clarity
  recording or a server correlation id, this hypothesis is decidable without touching the client
  (playbook: observability instead of asking for HARs).

H1/H2 dominate on prior odds and both resolve with the same one-row read. H3 is the one that, if true,
is a **frontend bug we own** rather than a data condition we explain.

---

## Bug vs data vs by-design

Three of the five hypotheses (H1, H2, H4) describe the gate **working as specified** — the activity
genuinely is not eligible for manual progress — in which case the customer-facing defect is that the
UI never says so. That is a real product gap (Pattern 5 shape) but not a code bug.

**H3 is a genuine frontend defect regardless of this ticket's outcome:** two surfaces answer the same
question differently because one consults `calculatedElementsSum` and the other does not
(`scheduler-columns.tsx:149` vs `use-actual-progress-mutation.tsx:39`). Worth raising separately even
if ATL05 turns out to be H1 or H2.

**Do not close this on "the activity isn't eligible".** If it is H1/H2, the trigger question still
stands (why does *this* activity lack a denominator / carry a stray link?) and the cohort sweep still
needs running.

---

## Domain slug — why `progress-tracking`, not `viewer-and-model`

The Jira Software Area is Web Viewer, but that names the surface. The failing feature is the
`Editor-Progress` manual actual-progress path — the same feature and the same three gate sites already
documented under `progress-tracking` on **PLT-2917**, and the same tangible/intangible distinction that
drives **PLT-2884**'s Pattern A. Nothing here touches geometry, model load, or the 3D scene, so
`viewer-and-model` would file it away from its own siblings. Keeping the slug consistent with PLT-2917 /
PLT-2884 / PLT-3010.

---

## Confidence (per `xyz-platform-context/CLAUDE.md` scale)

- **That exactly one predicate (`isActivityEditableForProgress`, three backend-supplied per-activity fields) gates every progress-edit surface, and that authority/flag cannot explain a single-activity failure:** **9/10** — read directly, all call sites enumerated, line-cited.
- **That the Gantt column applies a stricter roll-up rule than the click gate and the panel (a real FE inconsistency):** **9/10** — `scheduler-columns.tsx:149-150` vs `use-actual-progress-mutation.tsx:39`, read this run.
- **That the cause on ATL05 is one of H1/H2 (activity ineligible by the gate) rather than a write-path failure:** **5/10** — fits the report shape and the vocabulary coincidence, but rests entirely on an unverified reading of a relayed sentence. Two unopened screenshots would move this several points in either direction.
- **Which specific one of H1–H5 fired:** **3/10** — cannot be decided from this repo. Needs one API/DB row.
- **That `validForProgressCalculations = false` means "no denominator (no links, no planned labour units)":** **4/10** — inferred from `planned-and-actual-activity-schema.md:7`; the rule lives in the backend and is **not** visible in `hc-frontend`. Stated as a question for Sergey/Sachin, not as a finding.

**Overall triage confidence: ~5/10.** The mechanism space is fully mapped and narrow — five candidates,
all decidable by three field values — but nothing has been confirmed against ATL05 data and the only
first-hand evidence on the ticket is unreadable here.

---

## NEEDS HUMAN

- ⚠️ **The two Jira screenshots (ids 63410, 63409)** — Atlassian binary media behind auth; **not viewable
  here, do not guess.** They are the single cheapest discriminator on the ticket: per §Mechanism D, an
  editable cell has a visible bordered box and a locked one does not, and the presence/absence of a
  "Linked elements" button and of the "driven via linked elements" tooltip separates H1 from H2 outright.
  *Whoever can open these should answer one question: does `LS-24891`'s Actual % cell have the box?*
- ⚠️ **The two `blob:` images in comment 110463** — not fetchable by anyone but the original poster's
  browser session. If they carry information the two real attachments do not, Yash needs to re-attach them.
- ⚠️ **One row from the activity API / DB on ATL05-x (current schedule revision) for `LS-24891`, plus one
  working sibling:** `itemType`, `linkedElementCount`, `validForProgressCalculations`, `plannedLaborUnits`,
  `actualProgress`, `isUserProgress`. Those six values decide H1–H4 in one line. **No env/DB access here.**
- ⚠️ **Backend rule (Sergey / Sachin): what sets `validForProgressCalculations` to false?** Not derivable
  from `hc-frontend`. Everything downstream of H2 waits on this.
- ⚠️ **Does the progress POST constrain `calendarDate` (always *today*, `use-actual-progress-mutation.tsx:61`)
  against the activity's own dates?** Backend question; would explain a per-activity rejection.
- ⚠️ **Trigger:** was `Editor-Progress` newly enabled for ATL05, or was the ATL05 schedule re-uploaded
  recently? Needs Yash/PM. Determines whether there is a "why now" to chase at all.
- ⚠️ **Session id `platform-web-e26d7258-3fd2-417f-b9d6-adfc1eddec75`** — if this resolves to an MS Clarity
  recording or a server-side correlation id, it settles Q1 (affordance vs failed POST) without asking the
  client for anything. Nobody has checked whether it does.

---

## Roster / ownership notes

- **Ilia Kuzmin** (assignee, ilia.kuzmin@xyzreality.com) — playbook *mechanism interrogator*; owns the code
  reading (done, above) and the routed backend question.
- **Yash Patel** (reporter/coordinator) — owns Freshdesk #7773 and the channel to Kyriakos; owns getting the
  **one working activity id** and the trigger answer.
- **Sergey** (api-v1) / **Sachin, Ali** (api-v2) — *evidence engine*; own the `LS-24891` row and the
  `validForProgressCalculations` rule. Route to whichever owns the schedule/activity API on ATL05.
- **Darminder** (fullstack lead) / **Rishi** (senior fullstack) — own the `Editor-Progress` code path and,
  if H3 stands, the Gantt-vs-panel inconsistency fix. Rishi also owns the override→parquet merge
  (PLT-2917 §0.6).
- **Mostafa / Pietro** (product) — the still-unanswered `Editor-Progress` flag decision (PLT-2917 §0.7.4)
  is theirs, and this ticket is a data point for it: the feature is being used by clients while still
  behind a default-off flag.
- **Gennaro / Radu** (QA) — repro on a project with the flag on, once the mechanism is named.

## Doc / knowledge-base refs

- `hc-frontend/docs/dashboard/api/planned-and-actual-activity-schema.md:7` — the only definition of
  tangible vs **intangible** anywhere in the codebase; the basis for reading "intangible" as
  `linkedElementCount = 0`.
- `incidents/live-incident-board-tickets/PLT-2917-groupB-progress-tracking/context.md` §0.5, §0.6, §0.7.4 —
  the three `Editor-Progress` gate sites; milestones are indistinguishable by `itemType`; the
  override→parquet merge (`xyz."ActivityProgress"` / `vw_CurrentUserDefinedProgress`); and the latent UX
  defect of "editable + success toast on an edit that cannot take effect" — a close cousin of this ticket.
- `incidents/live-incident-board-tickets/PLT-2884-relocated-data-pipeline/context.md` — Pattern A, the
  intangible-activity family on EQX-style schedules.
- `incidents/recurring-defect-patterns.md` **Pattern 5** — surface-scoped visibility/eligibility rule
  mistaken for a defect; the fix that prevents recurrence is a UI indicator, not a code change to the gate.
- `incidents/live-incident-playbook.md` — Q3 (smallest broken-vs-working pair) is the whole action here;
  Q5 must be asked even when "not a regression" looks likely.
- **Doc gap (unchanged since PLT-2917 flagged it):** nothing under `dashboard/` documents the
  `Editor-Progress` path, `isUserProgress`, or the per-activity editability rule. Worth a section in
  `dashboard/progress-tab.md` (the file `CLAUDE.md` calls `prg-progress.md`; on disk it is
  `progress-tab.md`) once this ticket resolves. *(Not editing outside this folder per task constraints —
  noting only.)*

## 2026-08-27 — runtime-first: the three gate fields are readable on prod, no backend access needed

Applying the PLT-3084 method: the prior pass mapped the mechanism correctly and then stalled waiting
on a DB row, two unreadable screenshots and a backend answer. None of that is necessary. **All three
fields the gate reads are already in the browser**, hydrated from the schedule API into
`ScheduleItemDto`, and reachable through `window.projectService`.

### Verified on master this run (unchanged from the prior pass)

- `isActivityEditableForProgress` — `services/progress/use-actual-progress-mutation.tsx:36-41`:
  `type !== 'WBS'` && `!(elements > 0)` && `activityItem.progressValid === true`.
- The user-facing id `LS-24891` is `activityItem.activityId`, mapped from `item.userItemId`
  (`components/scheduler-service/utils.ts:50`). The Map is keyed by the internal `itemId` UUID, so
  the lookup has to scan values, not `.get()`.
- `activeSchedule.activities` is a public `Map<string, ScheduleItemDto>`
  (`project-x/entities/schedule-entity.ts:556`); `calculatedElementsSum` is a field on the DTO
  (`:1072`), so H3's roll-up is readable too.
- `Editor-Progress` default is `false` (`config/constants.ts:896`).

### ⚠️ Cookie warning — do not repeat the PLT-3084 snippet verbatim here

`getFeatureFlagValue` reads the whole flag list from the `feature-flags` cookie and only falls back
to `config/constants.ts` defaults **per missing name** (`helpers/getFeatureFlagValue/getFeatureFlagValue.ts:5-15`).
On PLT-3084 the console snippet **replaced** the cookie wholesale. Doing that here would drop
`Editor-Progress` back to its default `false` and switch off the feature under test. The flag must be
**appended** to the existing cookie:

```js
const cur = (document.cookie.match(/(?:^|;\s*)feature-flags=([^;]*)/) || [])[1]
const flags = cur ? JSON.parse(decodeURIComponent(cur)) : []
const next = [...flags.filter(f => f.name !== 'enableGlobalWebViewerAPI'),
              { name: 'enableGlobalWebViewerAPI', value: true }]
document.cookie = 'feature-flags=' + encodeURIComponent(JSON.stringify(next)) + ';path=/'
```

### The one paste that decides H1–H4 and answers the cohort question

```js
(() => {
  const all = [...window.projectService.activeSchedule.activities.values()]
  const pick = a => ({ userId: a.activityItem?.activityId, name: a.activityItem?.activityName,
    type: a.type, elements: a.elements, rollup: a.calculatedElementsSum,
    progressValid: a.activityItem?.progressValid,
    plannedLaborUnits: a.activityItem?.plannedLaborUnits,
    actualProgress: a.activityItem?.actualProgress, isUserProgress: a.activityItem?.isUserProgress })
  const editable = a => !!a && a.type !== 'WBS' && !(a.elements > 0) && a.activityItem?.progressValid === true
  const target = all.find(a => a.activityItem?.activityId === 'LS-24891')
  const sibling = all.find(a => a !== target && a.elements === 0 && editable(a))
  return { target: target ? pick(target) : 'NOT FOUND', targetPassesGate: editable(target),
    workingSibling: sibling ? pick(sibling) : 'none', totalActivities: all.length,
    intangible: all.filter(a => a.type !== 'WBS' && a.elements === 0).length,
    intangibleButBlocked: all.filter(a => a.type !== 'WBS' && a.elements === 0
      && a.activityItem?.progressValid !== true).length }
})()
```

Decision table:

| Reading | Verdict |
|---|---|
| `elements > 0` | **H1** — not intangible; it has links. Working as designed |
| `progressValid !== true` | **H2** — backend says ineligible. Silent gate, Pattern 5 |
| `elements: 0`, `rollup > 0` | **H3** — roll-up lock. **Our bug**: Gantt paints locked, panel still edits |
| `type: 'WBS'` | **H4** — summary row |
| all three pass, `targetPassesGate: true` | gate is fine → write path. **H5**, check the POST |

`intangibleButBlocked` answers playbook Q6 in the same paste — it is the cohort size, i.e. how many
other activities on ATL05 are silently un-editable and have not been reported yet.

**No screenshots, no DB row, no backend answer needed to get this far.** The two unreadable
attachments and the `validForProgressCalculations` rule question stay open, but they stop being
blockers: they are only needed if the result comes back H2, and then the question to Sergey/Sachin
becomes specific ("why is this row false") rather than general.

## 2026-08-27 (RESOLVED to a cause) — H2 confirmed on live data. Not a frontend defect.

Ilia ran the console read on ATL05 prod. Values, verbatim:

| | `LS-24891` (blocked) | `INT-18920` (works) |
|---|---|---|
| name | OLD Alabama Road Closure - Old Alabama | MEP Trimout @ Gallery - BLDG 05 South |
| `type` | Activity | Activity |
| `elements` / `rollup` | 0 / 0 | 0 / 0 |
| **`progressValid`** | **false** | true |
| **`plannedLaborUnits`** | **null** | 154.603 |
| `actualProgress` | "0.0000" | "1.0000" |
| `targetPassesGate` | **false** | — |

Cohort: **totalActivities 3761, intangible 2595, intangibleButBlocked 19.**

### What this settles

- **H2 confirmed.** `progressValid === false` alone blocks it at
  `use-actual-progress-mutation.tsx:40`.
- **H1 falsified** — `elements: 0`, and no linked-elements button applies.
- **H3 falsified** — `rollup: 0`, so the Gantt-vs-panel roll-up inconsistency is not in play here.
  (It remains a real defect; see the prior pass §C. Untouched by this ticket.)
- **H4 falsified** — `type: 'Activity'`, not WBS.
- **H5 falsified** — the gate returns false, so no POST was ever made. Nothing to find in the
  network log, and the two unreadable screenshots are no longer needed.
- **The prior pass's 4/10 guess about the backend rule is now supported by a matched pair**: the
  blocked row has no planned labour units and the working row has 154.603. Per
  `docs/dashboard/api/planned-and-actual-activity-schema.md:7`, intangible progress is derived from
  planned labour units — no denominator, nothing to be a percentage of. **Still one pair, still not
  the backend's stated rule.** Raise to ~7/10, not higher, and ask Sergey/Sachin to confirm.

### The real defect, and it is ours

The gate is correct; **the UI never says why.** The Gantt cell attached a class only for linked or
editable, so an ineligible unlinked activity got **no class, no box, no tooltip** — visually a
working cell that ignores clicks. The details panel was worse than silent: it showed *"Actual
progress updates every 15 minutes. Values may be slightly delayed."*, which tells the user a value
is coming when it never will. That is `recurring-defect-patterns.md` **Pattern 5** with an
aggravating factor, exactly as the prior pass predicted.

**19 activities on ATL05 are in this state.** Kyriakos found one. The rest are waiting.

### Branch

`PLT-3091-explain-uneditable-progress` (hc-frontend, off `origin/master`, commit `da95485`), **not
raised as a PR.** Adds `services/progress/progress-lock-reason.ts` — a pure
`getProgressLockReason` plus a `PROGRESS_LOCK_MESSAGES` record so the Gantt cell and the panel
cannot drift on copy — and wires it into both surfaces. Missing planned labour units is named
specifically (the one cause a planner can act on); every other case stays vague, because the
frontend cannot know why the backend set the flag and must not invent a reason. Ten tests. The
reason logic was exercised in node against the real ATL05 values above; nothing was built or run
(`npm ci` fails on `@xyzreality/dhtmlx-gantt`).

**The branch does not unblock LS-24891 and is not meant to.** It stops the product lying about why.

### Still open

- **Sergey / Sachin:** what sets `validForProgressCalculations` false? The pair says "no planned
  labour units" — confirm or correct.
- **Can a planner fix it?** If adding labour units to `LS-24891` flips the flag, that is the
  customer's self-service answer and it should go in the reply to Kyriakos.
- **The other 18.** Worth listing for ATL05 rather than waiting for them to be reported one by one.
- **H3, unrelated to this ticket:** `scheduler-columns.tsx:149` uses `calculatedElementsSum`, the
  click gate does not. Two surfaces, two answers. Own ticket.

## 2026-08-28 — posted and answered: Mostafa confirmed, ticket now waiting on the customer

Live Jira re-fetch: **the 08-27 draft was posted, in substance, by Ilia directly rather than through
this folder** (comment 110587, 17:16 BST, after this file's own 08-27 analysis had already been
written) — same conclusion (Level of Effort activity, P6-derived progress, editor blocks manual
entry by design), same evidence (19 of 3,761 ATL05 activities in the same state, all LOE, no
exceptions), tagging Mostafa rather than Sergey/Sachin. **Mostafa confirmed within 2 minutes**
(110588, 17:18): *"level of effort activities cannot have progress entered."* Ilia then asked Yash
(110589, 17:20) to check whether the client is happy to treat this as working-as-intended so the
ticket can close; Yash agreed to ask (110590, 17:47); Freshdesk flipped to **Waiting on customer**
(110591, 17:49). **Status moved Open → With Customer** the same evening. No comment since.

**Nothing further needed from this routine on the core question** — it is answered and confirmed by
product (Mostafa). The only open items are the two follow-through pieces already identified and not
yet raised as their own tickets: the missing-explanation UX fix (branch
`PLT-3091-explain-uneditable-progress` exists, not a PR) and the Gantt-vs-panel roll-up inconsistency
(§Mechanism C). Neither is blocking this ticket's closure.

**Recommended action, updated:** no Jira action needed. Wait for Kyriakos's answer via Yash; if
silence exceeds about a week, a light check-in with Yash is enough — there is no open technical
question left to escalate. See `recommended-action.md` for the one-line update.
