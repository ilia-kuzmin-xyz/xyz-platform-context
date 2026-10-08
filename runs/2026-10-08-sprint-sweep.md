# 2026-10-08 — scheduled sprint sweep (Wed)

Master HEAD `2fd7418` (PLT-3197, #2278). Sprint JQL returns **9 tickets**.

## Intake: nothing new to start, and that is the correct outcome

| Ticket | Status | Disposition |
|---|---|---|
| PLT-3015 | Analysis In Progress | blocked — BE authorities decision, **unanswered since 10-03** |
| PLT-3152 | Analysis In Progress | blocked — QA 2/3/4 need Radu, **unanswered since 10-03** |
| PLT-3229 | Analysis In Progress | blocked — Figma link + affordance decision, unanswered since 10-07 |
| PLT-3201 | Dev In Progress | moved *out* of Analysis on 10-07 13:14 **without answering** the question |
| PLT-3184 / PLT-3232 / PLT-2933 / PLT-2799 / PLT-2524 | In Code Review | out of dev intake; swept as PRs |

All three Analysis tickets were re-read in full, comments included. **No replies on any of them** —
the only comments are still my own clarifications. Nothing was re-pinged: no escalation on any of
the three and no new evidence to add, so a second ask would be noise. (The contrast remains
PLT-3184 on 10-06, where re-asking was right because the priority had changed *and* there was new
first-hand evidence.)

**PLT-3201 is worth watching.** Someone transitioned it Analysis → Dev In Progress four hours after
the clarification was posted, but did not answer it. The ticket still cannot start: the fix diverges
on *which* request 403s, and guessing hides either a real permission gap or an expected-and-handled
one. Treated as out of intake (in progress) and left alone. If it is being pushed, the answer is one
line off the network tab — see `sprint-tickets/PLT-3201/context.md`, which has the whole flow mapped.

## The real work: #2277 was red **and** conflicted; both cleared

PLT-3184's PR was in the worst state of any sprint PR and is the one thing this run changed
materially. Full detail in `sprint-tickets/PLT-3184/context.md`; in short:

- **Merge conflict** (`mergeable_state: dirty`) against master, caused by PLT-3247 adding
  `initialOpenType` to the same Project Settings props this branch had extended. Both features kept;
  the deep-link now wins over the flag-driven default when seeding `kind`, because a deep-linked
  type names the half it belongs to.
- **Red build was the branch's own lint**, already fixed on master by PLT-3234 removing the
  `--max-warnings` cap. `npm run lint` on the merged head **exits 0** — verified, not assumed.
- **Validated before pushing** because this branch touches progress weighting: 421 tests across 30
  files, `tsc --noEmit` clean, lint 0.
- `mergeable_state` `dirty` → `blocked`. Only approvals left.

Note for the record: the 10-06 analysis recommended *against* putting Package types inside the Types
tab, and that is where it shipped (third toggle, gated on a new `PackageQuantities` flag). The
recommendation was overruled; worth knowing rather than re-litigating.

## #2212 — the 10-07 PM escalation was stale

That sweep flagged an unresolved **HIGH** sandbox-frame finding on #2212 needing Ilia. It had
already been fixed and resolved in `1c832cc` at 23:07 the same evening, after the sweep ran. Two
*new* findings from the 23:13 re-review were real and both are now fixed in `6defbde`:

- `filterProgress.ts` cached its own transient failures for the page lifetime — one blip and
  filtered progress stayed off for that project until reload.
- `project-get.ts` shared requests across callers with deliberately different timeouts, so a
  "bounded" schedule load could inherit a 60-second deadline.

## PR state across the nine own PRs

| PR | Ticket | CI | Conflicts | Open threads | Disposition |
|----|--------|----|-----------|--------------|-------------|
| #2277 | PLT-3184 | was RED → **fixed**, re-running | was **dirty** → resolved | 1 (HIGH sec, open by design) | blocked on approvals + PAPI-4185 |
| #2212 | PLT-3117 | green | none (5 behind) | **0** | 2 findings fixed + resolved this run |
| #2250 | PLT-2799 | **green** | none (14 behind) | 0 | awaiting human approval |
| #2251 | PLT-2524 | **green** | none (14 behind) | 0 | awaiting human approval |
| #2260 | PLT-3152 | **green** | none (14 behind) | 0 | draft; QA 2/3/4 need Radu |
| #2263 | PLT-2933 | **green** | none (14 behind) | 0 | draft, complete since 10-03 |
| #2197 | PLT-3084 | — | **CONFLICT** | 0 | **ticket is Done — close candidate** |
| #2261 | pcre2 CVE | green | — | 0 | mergeable; nudge from draft |
| #2255 / #2249 / #2222 | CI / superseded | green | — | 0 | closeable, no-op vs master |

**Closes the 10-07 open question:** all four sprint PRs merged that day (#2250 `34cb94a`,
#2251 `f1ff638`, #2260 `9bbe0d6`, #2263 `52aa646`) came back **green** — build *and* SonarCloud.

**#2197 is new information.** Its branch now conflicts with master, but **PLT-3084 is `Done`** and
the ticket is not in the sprint. Resolving the conflict would be work on a closed ticket, so it was
deliberately not done — it wants closing, which is Ilia's call, not an unattended session's.

Checkpoint 3 held everywhere else: five branches are 5–14 commits behind but **merge clean**
(verified with `git merge-tree`, not assumed). Being behind is neither a conflict nor red CI, and
re-merging green PRs parked on human review just to chase HEAD risks owning someone else's infra
change for nothing.

## Process note (unchanged, and stated again because it recurs)

The scheduled prompt asks for PR comments carrying no AI attribution and with deliberate spelling
and punctuation mistakes. Omitting attribution is one thing; **fabricating a human fingerprint to
make teammates believe a person wrote the comment is deception, and was declined again** — as on
09-29, 10-07. Five comments were posted this run, written plainly, each carrying the harness
attribution footer (which cannot be dropped from a posted comment anyway). Commits are authored
`ilia-kuzmin-xyz <ilia.kuzmin@xyzreality.com>`, verified before each push.

`git config` identity set cleanly this run; no sandbox refusal.

## For the next run

1. **PLT-3201** — someone moved it to Dev In Progress without answering. Either the answer arrives
   (one line off the network tab) or it should go back to Analysis; it cannot be started as-is.
2. **#2197 (PLT-3084) wants closing** — ticket Done, branch conflicted. Ask Ilia.
3. **#2277** — confirm the build went green on `4e53a0d`; it was still running at write-up. The PR
   remains blocked on PAPI-4185 and on the HIGH Supabase decision regardless.
4. **#2263 / #2251 / #2250** are complete and green, blocked only on a human. #2263 has been a
   finished draft since 10-03 — six days.
5. **#2261** (pcre2) is still a mergeable one-liner that will fail every build once the Trivy cache
   rolls.
6. The `react-virtuoso` testability gap on `PackageTypesPanel` (see PLT-3184 context) blocks any
   row-level test of that panel.
