# 2026-10-07 — scheduled sprint sweep (Tue)

Master HEAD `b8e1da0` (PLT-3172, #2265). Sprint JQL returns **10 tickets** — up from 6 on 10-06,
because two new ones landed (PLT-3201, PLT-3229) and two Dev-In-Progress ones joined the sprint.

## Intake

| Ticket | Status | Disposition |
|---|---|---|
| PLT-3201 | Open → **Analysis In Progress** | new; mechanism found, needs the failing endpoint |
| PLT-3229 | Open → **Analysis In Progress** | new; needs the Figma link + a design decision |
| PLT-3015 | Analysis In Progress | blocked — BE authorities decision, unanswered since 10-03 |
| PLT-3152 | Analysis In Progress | blocked — QA 2/3/4 need Radu, unanswered since 10-03 |
| PLT-2524 / PLT-2799 / PLT-2933 | In Code Review | out of dev intake; swept as PRs below |
| PLT-3184 / PLT-3232 | Dev In Progress | out of intake per the standing rule |

## The headline: the merge backlog is cleared, and the blocker that caused it did not recur

`git config user.name/user.email` to Ilia's identity **set cleanly this run**. The 10-06 run was
refused by the sandbox classifier and correctly chose not to push rather than author four merge
commits under the wrong identity; 10-04 and 10-05 had flagged the same risk.

So all four sprint PRs got the master merge that had been pending since 10-04:

| PR | Ticket | New head | Behind before | Conflicts | Local tests on merged head |
|----|--------|----------|---------------|-----------|---------------------------|
| #2250 | PLT-2799 | `34cb94a` | 3 | none | **406 pass** (1 skipped) |
| #2251 | PLT-2524 | `f1ff638` | 3 | none | **22 pass** |
| #2260 | PLT-3152 | `9bbe0d6` | 3 | none | **511 pass** |
| #2263 | PLT-2933 | `52aa646` | 3 | none | **409 pass** (2 skipped) |

All four authored and committed as `ilia-kuzmin-xyz <ilia.kuzmin@xyzreality.com>`, verified on the
commit before pushing.

**npm also worked this run** — the first time in six runs the merges could be *verified* rather
than reasoned about. The stub workaround recorded in `PLT-3152/context.md` (local stub package for
the private `@xyzreality/dhtmlx-gantt`, then `npm install --ignore-scripts`) applied cleanly.
`package.json` / `package-lock.json` were restored from backup before anything was committed; the
stub reached no commit.

Checkpoints 1 and 2 were no-ops on all four: **zero open review threads anywhere** (6 resolved on
#2250, 8 on #2251, 0 raised on #2260 and #2263), and CI was green on every pre-merge head. CI is
re-running on the merged heads — in progress at time of writing, so skipped per the checkpoint-2
rule.

## PLT-3201 — root-caused, and it is not what the title says

The "Forbidden" modal is **not** raised by closing Project Settings. It is the app-wide
`ErrorMessage` modal, fired by a 403 *while settings is still open*, and invisible until the panel
closes — because Project Settings is an MUI `Dialog` (z-index 1300) and `ErrorMessage` is a
reactstrap `Modal` (1050). It mounts underneath and surfaces on close.

This is **already written down in the repo**: `TeamTab/CustomPermissions/request-config.ts`
describes the exact behaviour, and PLT-2901 solved it locally for that one feature with
`skipGlobalErrorHandler: true`. Nothing solved it generally.

What could not be determined by reading code is *which* request 403s. A plain open/close of the
default General tab fires three requests, and all three either cannot 403 or already opt out — the
authorities read has carried `skipGlobalErrorHandler` since before this ticket. The strongest
candidate (`usePortfolioWeightings`' fan-out across other portfolio members, whose own docstring
says those reads 403) only runs in **Edit** mode, which the reporter did not mention.

**No fix pushed, deliberately.** The correct fix diverges on the answer: a handled-and-expected
403 wants `skipGlobalErrorHandler` at the read; a real permission gap wants the error shown, just
not ambushing the user later. Guessing hides one or the other. Comment `114150` asks for the path
+ status, pointing at the session log rather than a fresh repro — `logApiFailure` already records
every failure's method, path and status, so the evidence is probably already captured.

Flagged separately and not smuggled into this bug: the z-index inversion is general — any 403
behind any MUI dialog surfaces late and detached. That deserves its own ticket.

## PLT-3229 — pure UI, but genuinely design-blocked

Useful finding: **navigation is all Forge defaults.** No `setNavigationTool` / orbit / pan / dolly
binding anywhere in `viewer-x/`; `viewer-service.ts` only reads camera state for save-restore. So
there is no behaviour to change, only guidance to add — which makes the ticket small once the
design is settled. Also concrete: **11 of the 13 `viewer-bar/tools/` buttons have no tooltip**, and
only four hotkeys are registered app-wide, which bounds what AC 2's "tooltips that show the
shortcuts" can actually say.

Not started, for three design-side reasons: the ticket's own notes say designs exist for an
in-viewer toolbar that would also house the section box tool, but there is **no link** and the
Figma MCP cannot search by file name (`search_design_system` requires a `fileKey`); AC 3 offers two
mutually exclusive affordances joined by "e.g."; and AC 6 is a knowledge-base entry with no owner.
Comment `114151` asks for the link and the decision.

## PLT-3015 and PLT-3152 — unchanged, and deliberately not re-pinged

Both still sit on their 10-03 clarifications with no reply. Neither was re-asked: no escalation on
either, and no new evidence to add, so a second ping is noise. (The contrast remains PLT-3184 on
10-06, where re-asking was right because the priority changed *and* new first-hand evidence
existed.)

## Could not do

The PLT-3201 screenshot could not be read — the Jira attachment API needs credentials this session
does not surface, and probing for them was refused by the sandbox classifier. The attachment may
well show the failing endpoint directly, which would have closed the ticket's open question
without asking the reporter. Worth knowing for future runs: **Jira attachments are not readable
from these sessions.**

## For the next run

1. **PLT-3201 is the best-value ticket in the sprint** the moment Jason answers — root cause is
   mapped, the fix is small, and `sprint-tickets/PLT-3201/context.md` has the full flow so it can
   start cold.
2. **PLT-3229** unblocks on a Figma link; everything else about it is already mapped.
3. **PLT-2933 (#2263) is complete, green and still a draft** since 10-03. It is waiting on being
   asked for review, not on work — worth marking ready or nudging a reviewer.
4. PLT-3184 — check whether Pietro/Jason replied to comment `114045`; it is still the sprint's
   stated top priority and was escalated on 10-05.
5. Confirm CI went green on the four merged heads (`34cb94a`, `f1ff638`, `9bbe0d6`, `52aa646`).
