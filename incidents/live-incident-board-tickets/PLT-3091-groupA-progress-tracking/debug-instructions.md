# PLT-3091 — debug instructions (2026-08-27)

**Category: 🟡 Stale / needs a chase.** One missing fact (a working comparison activity) blocks it.

**Branch:** `PLT-3091-progress-editability-diagnostics`
⚠️ **Duplicate branch exists** — `PLT-3091-explain-uneditable-progress`, pushed by a *parallel Claude
session* at 12:49 today, 2 minutes before mine. Consolidate before either is raised as a PR. Theirs
wires the reason into the UI (tooltip, panel, Gantt column) — that is the better base. Mine adds the
Gantt-vs-panel divergence analysis and its tests. Take theirs + my test file.

## What I found
- One predicate gates every progress-edit surface (`use-actual-progress-mutation.tsx:36-41`):
  `type !== 'WBS'` **and** `elements === 0` **and** `activityItem.progressValid === true`.
- All three are **backend-supplied per activity**. The `Editor-Progress` flag and the user's authority
  are both **project-scoped**, so neither can explain one activity differing from its neighbour —
  it has to be one of those three fields.
- Separate, genuine FE bug found in passing (**raise on its own, not this ticket**): the Gantt column
  locks on `task.elements || task.calculatedElementsSum > 0` (`scheduler-columns.tsx:149-150`) — it
  counts **descendants'** links and has **no WBS check**. A parent with linked children reads locked
  in the Gantt and editable in the panel.

## What's on the branch
- `explainProgressEditability()` returning the first failing condition with an operator-facing message.
- Tests pinning it condition-for-condition against the real gate so they cannot drift.
- Tests asserting the Gantt/panel divergence as current behaviour.

## What I need from you
- [ ] **Open the two screenshots** (attachments 63410, 63409) and answer one question: does
      `LS-24891`'s "Actual % Complete" cell have a **bordered box** like its neighbours?
      - No box → the editability gate. Then look for a "Linked elements" button: present ⇒ it has
        links; absent ⇒ `progressValid` is false (backend question).
      - Box + red toast → the POST was rejected; backend, per-activity.
      - Box + green toast + value gone on reload → the override→parquet merge, not the FE.
- [ ] Ask Yash to get **one activity that DOES work** from Kyriakos — we have the broken half and no
      working half, and the diff is the diagnosis.
- [ ] Ask Yash: was `Editor-Progress` only just switched on for ATL05? If so there is no regression.
