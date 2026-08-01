# PLT-2447 — Select Activity / Panel details: multiple UX issues

- **Type:** Bug · **Priority:** Medium · **Repro:** 5/5
- **Jira status:** Analysis In Progress
- **Domain:** Viewer / Editor — right-panel context menus + element selection / ghosting (see `dashboard/viewer-and-model.md`)
- **Related:** PLT-1717 (Closed) — back-nav from Activity Details to Element Properties, linked elements selectable

## The three reported issues

1. Opening/closing the 3-dot menu (or clicking outside it) **reverts the model
   to home view**.
2. **"Select Elements"** from the 3-dot menu **drops a prior multi-selection**
   (Shift+click highlight).
3. Both contextual menus can be **open at the same time**.

## Domain findings (from prior analysis)

- Linked-elements highlight uses **ghost + isolate + fitToView**; its cleanup
  runs `showAll()` + un-ghost → likely cause of the "home view" revert (#1).
- The Shift+click highlight (ghost isolation) and the menu's **Select** action
  use **different selection paths**; Select drops parent/directory nodes with
  no `dbId` (#2).
- The two menus are backed by **3 independent state stores**; making them
  mutually exclusive is a small refactor to a shared coordinator (#3).
- Ghosting/selection carries regression risk — touch carefully.

## Current state: AWAITING-CLARIFICATION (since 2026-07-10)

Clarification left on Jira (comment 107120). Open questions — do NOT dev until
answered, do NOT re-ask:

1. Exact expected camera behaviour on menu open/close — should the
   isolated/fitted view be fully preserved?
2. Should "Select Elements" preserve the highlight, and include children of
   selected parent nodes?
3. Confirm mutual-exclusion is the desired fix for the double-menu issue.
4. Split the 3 bugs into separate tickets? (regression risk + distinct
   mechanisms)

## Next run

- If Jira has replies → fold in, decide split vs single, set READY-FOR-DEV,
  branch `PLT-2447` (or per-issue branches) off latest master.
- If still no reply → leave as-is, no action.

---

## Run log — 2026-08-01

**Status has moved on since the AWAITING-CLARIFICATION note above — that section is stale.**
Jira is now **In Code Review**; PR #2054 is open (not draft), reviewers requested.

What actually shipped (2 of the 3 reported issues):
1. **Camera revert on menu dismiss** — fixed by making `useGhostedHighlight` *idempotent*
   (signature of the applied highlight; re-committing the same node set is a no-op), plus folder/model
   rows now highlight their descendants instead of falling through to the `showAll()` reset path.
2. **Both menus open at once** — `useContextMenu` ignores right-clicks whose target is outside the tree
   container (MUI portal events bubble through the React tree, not the DOM). Still `preventDefault()`s.
3. **"Select Elements" drops multi-selection** — **NOT in this PR.** Root-caused as a
   `setAggregateSelection`-in-a-loop bug in `useActivityMenu`; deliberately left out, flagged in the PR
   description as a separate raise. **This is the outstanding half of the ticket.**

Review threads: 2 from Copilot, **both resolved** — (a) `addItemDbIds` could reintroduce whole-model
isolation via a container's own dbId → hardened in `116144b`; (b) an accidental `CANVAS_API` localhost
override swept into the branch → reverted in `ed425d9`. **0 open threads.**

⚠️ **Scope note:** the branch also carries `7b7c4d3` "Hide Portfolio Settings until the portfolio dashboard
flag is on" (Header.tsx, Header.test.tsx, usePortfolioSummary.ts) — unrelated to this ticket. It is an
*increment on top of* master's PLT-2936 (`ec30214`), which already gates the button but still renders the
modal and still fires `listPortfolios` when the flag is off. Merged clean; the branch version supersedes.
Already disclosed in the PR description ("Also in this PR — unrelated, flagging it explicitly"), so no
extra comment was posted. A reviewer may still ask for it to be split.

- CI: red only on the repo-wide Trivy `brace-expansion` CVE. Sonar green.
- Checkpoint 3: merged `origin/master` (`28e03c3`) in — was 1 behind. Clean.

## Next run
- Consider raising the "Select Elements" multi-model bug as its own ticket — it is the unfinished third
  issue and the ticket cannot close without it.
