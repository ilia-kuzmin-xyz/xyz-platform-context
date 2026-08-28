# PLT-2967 — Asset details, readiness tag *task* context menu

**Type:** Task · **Domain:** Commissioning / viewer Assets panel
**Jira:** https://xyzreality.atlassian.net/browse/PLT-2967 · **Sibling:** PLT-2968 (same kebab menu)

**Status after 2026-08-24 run: `Analysis In Progress`. Mostly already built. No branch, no PR.**

---

## 2026-08-24 — most of this exists; one design question left

### Where the surface lives

`.../viewer-x/components/blocks/assets-panel/readiness-ladder.tsx` (268 lines) — the Readiness
accordion on the asset detail panel. Step data comes from `use-readiness-steps.ts`.

### Ticket steps vs master

| Ticket step | State |
|---|---|
| context menu on each tag | **Done** — kebab per row, `readiness-step-kebab-<stepId>`, `:178-190` |
| with `View tasks` | **Done** — `StyledMenu` at `:242`, item `readiness-step-view-tasks` at `:243` |
| opens a modal with the tag's task info | **Different shape** — expands an inline accordion (`:190`) |
| users can update values in the modal | **Done, one click deeper** — `TaskInstanceModal` |
| save button | **Done** — that modal owns its Save |

### The open question

`View tasks` today sets `expandedId` and shows the tag's task instances **inline**; clicking one
opens `TaskInstanceModal` (`components/AssetWorkflowStepTasks/TaskInstanceModal`), the same editor
the Task library and tasks panel use. The ticket's screenshots (1537×964, then 1617×1009) read as
`View tasks` opening a **tag-level modal** directly. Accordion-then-modal vs one modal is a real
UX difference and the design (`Commissioning Platform (standalone).html`) is 403 to every tool
available.

### Two loose ends found while reading — useful if the answer is "yes, a modal"

1. **`ReadinessLadder` declares `onViewTasks?` (`:39`) that no caller ever passes.** Grepped the
   whole app: the only non-test hits are the declaration, the destructure and the call. It is a
   hook left for exactly this ticket.
2. **`components/AssetWorkflowStepTasks/AssetWorkflowStepTasks.tsx` (170 lines) is orphaned.**
   Its *siblings* (`task-status`, `task-type`, `TaskInstanceModal`) are imported all over, but the
   default export — a `WorkflowStep` card listing an asset's task instances per step, with
   `completed/total` trailing counts — is imported by **nobody**. It is most of a tag-level task
   modal, already written. Likely the pre-`ReadinessLadder` surface.

So if the answer is "a modal", this becomes wiring, not new UI.

### Cross-ref

PLT-2968 adds `Override readiness level` to the **same** `StyledMenu`. Worth doing them in one
branch if both get answered.

---

## 2026-08-25 — second run: still blocked, no new information

Re-checked at the start of the scheduled run. **Nothing has changed and no answer was posted**, so
the 08-24 analysis above stands in full. Recording this only so a third run doesn't spend the
effort re-deriving it.

- Ticket is still `Analysis In Progress`; the only comment is our own 08-24 clarification.
- **Did not re-comment.** Asking the same five questions again adds noise to the ticket and buries
  the original. The ask is already visible to Darminder; the ball is with design.
- **Attachment route re-tested and it is genuinely closed.** The Jira REST attachment endpoint
  (`/rest/api/3/attachment/content/<id>`) returns **403** without a bearer token, and the MCP
  `fetch` tool only accepts an ARI (`ari:cloud:jira:…:issue/…`), not an arbitrary attachment URL —
  so there is no path from this environment to the four PNGs on the ticket. Same for the
  `claude.ai/design/p/...` link. Do not burn time on this again: the screenshots need to be
  pasted into a comment as text/description, or the answer given in words.
- No branch and no PR for this ticket, deliberately. Confidence on the accordion-vs-modal question
  is unchanged at roughly 50%, well under the bar for starting.

**Unchanged recommendation:** if the inline accordion is acceptable, this ticket is already
delivered and should be closed; if a tag-level modal is wanted, `AssetWorkflowStepTasks.tsx` plus
the dormant `onViewTasks?` prop make it a wiring job.

## 2026-08-26 — IMPLEMENTED (most-confident subset). Draft PR hc-frontend #2187, Jira → In Code Review

Supersedes "no branch and no PR" above. Ilia said "take the most confident way and implement";
re-reading the TICKET TEXT (not the prototype) settled the accordion-vs-modal question: *"On
clicking on this it will open up a modal with task information on the tag… users can update
values… save with the button below."* So:

- New `assets-panel/step-tasks-modal.tsx`: kebab "View tasks" now opens a **modal** listing that
  tag's task instances (name, status chip, failed-item note); clicking one opens the existing
  `TaskInstanceModal` editor (which carries the "update values" + Save); closing lands back on
  the list. Row-click inline accordion unchanged — same list, two doors. The orphaned
  `AssetWorkflowStepTasks.tsx` was the pattern source but lists ALL steps, so a single-step modal
  was written instead of wiring it.
- Branch `PLT-2967` is **stacked on `PLT-2968`** (they share the kebab menu); PR #2187's base is
  the PLT-2968 branch — merge #2186 first, GitHub retargets.
- Deliberately OUT of scope (said so on the Jira ticket): the redesigned task runner from the
  screenshots (Preconditions / Add note / Add media / unit dropdowns / Submit & lock) — that is a
  redesign of the shared editor, its own ticket — and "Mark as done" (needs a force-complete
  decision). The prototype's state-dependent menu (locked → override only; done → no menu) was
  also skipped: it conflicts with Clear-override needing a home on done steps, and the two design
  sources contradict each other on labels.

## 2026-08-28 — scheduled-run checkpoint

Still `In Code Review`; not eligible for kick-off. Checkpoints 1–3 all clean on the PR —
build + Sonar green, branch already contains master head `70451f7`, no conflict
(`mergeable_state: blocked` = awaiting approvals, not a merge problem). Full run log and the
ticket→PR map: `sprint-tickets/README.md` § 2026-08-28 (morning).
