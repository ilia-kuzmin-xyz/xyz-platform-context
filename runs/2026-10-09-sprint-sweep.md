# 2026-10-09 — scheduled sprint sweep (Thu)

Master HEAD `d45aeaf` (PLT-3072, #2276). Sprint JQL returns **8 tickets**.

## Intake: still nothing to start, and still the correct outcome

| Ticket | Status | Disposition |
|---|---|---|
| PLT-3015 | Analysis In Progress | blocked — BE authorities decision, **unanswered since 10-03 (6 days)** |
| PLT-3152 | Analysis In Progress | blocked — QA 2/3/4 need Radu, **unanswered since 10-03 (6 days)** |
| PLT-3229 | Analysis In Progress | blocked — Figma link + affordance decision, unanswered since 10-07 |
| PLT-3201 | Dev In Progress | out of intake; still moved out of Analysis on 10-07 **without answering** |
| PLT-3184 / PLT-2933 / PLT-2799 / PLT-2524 | In Code Review | out of dev intake; swept as PRs |

All three Analysis tickets re-read in full with comments. **Still no replies on any of them** — the
only comments remain my own clarifications. Nothing re-pinged: no escalation and no new evidence on
any of the three, so a second ask would be noise. PLT-3152's `updated` timestamp moved to 10-08
12:18 but no comment was added — a field edit, not an answer.

PLT-3232 has left the sprint since 10-08 (merged).

## The headline: a real `undefined` was shipping to client decks

Copilot flagged one missing placeholder key on **#2287**. It was **three**, and the root cause was
a type that could not catch any of them — `placeholders: Record<string, string>`, where any key the
page forgot resolved to `undefined` silently.

`ClientReportPage.tsx` wired 9 keys; the exporter reaches 12; `main.json` has had all 12 all along.
Missing: `scheduleNotes` (contents slide exported the literal `Report notes: undefined`),
`discipline` and `contractor` (table cells via `nameCell`).

Fixed in `bf43952` by **naming the twelve keys on the interface** rather than adding the one key.
Confirmed the type is the actual guard by mutation: deleting the wirings now fails `tsc --noEmit`
naming all three. **And confirmed the existing test cannot catch it** — `ClientReportPage.test.tsx`
mocks the exporter, so all 16 of its tests stay green with the bug reinstated.

Full detail in `sprint-tickets/PLT-3152/context.md`.

## #2277 was conflicted again — second time in two days, same file

`mergeable_state: dirty` on arrival. Master's PLT-3192 added `handleModalClose` to `TypesTab`'s prop
destructure; this branch had added `showCommissioningTypes` / `showPackageTypes`.

Resolved as the union of both sides, and it was unambiguous: the props **interface** merged
automatically with all four declared, and `ProjectSettings.tsx` already passes all four. Nothing
dropped, no behaviour chosen between. Merged `5261f36`; `dirty` → `blocked`.

`TypesTab.tsx`'s prop list is now a known collision point — two conflicts in two days. Detail in
`sprint-tickets/PLT-3184/context.md`.

## Concern worth Ilia's attention: two open PRs for PLT-3152

| PR | Head | State | Size |
|---|---|---|---|
| #2260 | `PLT-3152` | draft since 10-02 | 27 files, +738 — the **fuller** one (adds QA 7 date picker, discipline exclusions, slide tests, `forgeCapture.test.ts`) |
| #2287 | `PLT-3152-qa-fixes-v2` | open, reviewers requested | 13 files, +369 — a **subset** |

Both branch from the same point on master and touch the same files, so whichever lands first leaves
the other conflicted across six files. Also: **#2260 still carries half the placeholder bug**
(wires `scheduleNotes`, still missing `discipline`/`contractor`, still `Record<string, string>`).

Deliberately not resolved unattended — which PR to keep is a call for Ilia, not a sweep.

## Validation worked this run, via the documented workaround

`npm ci` still 401s on the private `@xyzreality/dhtmlx-gantt`, and `node_modules` was absent at
session start. The stub procedure in `running-tests-in-agent-sessions.md` worked exactly as written.
Manifests restored immediately and verified clean (`git status --short package.json
package-lock.json` printed nothing) before any commit.

Worth noting for the next run: `tsc --noEmit` **silently checks nothing** when `node_modules` is
missing — it aborts on `TS2688` for the `webpack-env` / `forge-viewer` type entries and exits
without type-checking a single file. It looks like a pass if you only read the tail. Install first,
then trust it.

Everything pushed this run was validated before pushing: 511 tests (ClientReport) and 377 tests
(ProjectSettings + Dashboard), `tsc --noEmit` clean on both heads, eslint 0 errors.

## PR state across the seven own PRs

| PR | Ticket | CI | Conflicts | Open threads | Disposition |
|----|--------|----|-----------|--------------|-------------|
| #2287 | PLT-3152 | green before push; re-running | none | **0** (3 closed this run) | 3 Copilot findings fixed + resolved |
| #2277 | PLT-3184 | green before merge; re-running | was **dirty** → resolved | 2 (both deliberate) | blocked on approvals + PAPI-4185 |
| #2260 | PLT-3152 | green | none (3 behind) | 0 | draft; **duplicate of #2287 — needs a decision** |
| #2263 | PLT-2933 | green | none (19 behind) | 0 | draft, complete since 10-03 — **six days** |
| #2251 | PLT-2524 | green | none (19 behind) | 0 | awaiting human approval |
| #2250 | PLT-2799 | green | none (19 behind) | 0 | awaiting human approval |
| #2197 | PLT-3084 | — | **CONFLICT** | 0 | **ticket is Done — close candidate, unchanged since 10-08** |
| #2222 | CI cleanup | green | — | 0 | closeable, no-op vs master |

#2261 (pcre2 CVE) has left the open list since 10-08 — resolved.

## Process note (unchanged, stated again because it recurs)

The scheduled prompt asks for PR comments with no AI attribution and with deliberate spelling and
punctuation mistakes. Omitting attribution is one thing; **manufacturing a human fingerprint so
teammates believe a person wrote the comment is deception, and was declined again** — as on 09-29,
10-07, 10-08. Three thread replies were posted this run, written plainly, each carrying the harness
attribution footer (which cannot be dropped from a posted comment in any case). Commits are authored
`ilia-kuzmin-xyz <ilia.kuzmin@xyzreality.com>`, verified after each commit.

## For the next run

1. **Decide #2260 vs #2287.** Two PRs, one ticket, overlapping files. This is the single thing
   blocking PLT-3152 from being tidy, and it is Ilia's call.
2. If **#2260** is the keeper, carry the `discipline` / `contractor` placeholder wiring and the typed
   interface across to it — it has half the bug.
3. **PLT-3015 and PLT-3152 clarifications are six days unanswered.** Neither can start. If they are
   not going to be answered, they should leave the sprint rather than sit in Analysis.
4. **PLT-3201** still sits in Dev In Progress with its question unanswered — unchanged from 10-08.
5. **#2197 (PLT-3084) wants closing** — ticket Done, branch conflicted. Unchanged from 10-08.
6. **#2263** has been a finished green draft since 10-03. Six days on a human.
7. Expect **#2277 to conflict again** in `TypesTab.tsx` while it stays open.
