# 2026-10-12 — Team PRs review sweep (scheduled run)

Scope: open non-draft PRs in XYZReality/hc-frontend by Rishi (rishib-xyz) or Darminder
(DarminderA); none by Tom. Four eligible: #2297, #2296, #2292, #2268. Three were already
reviewed by this account on their current heads with zero developer action since, so no
comments were posted on them (per the run's no-repeat rule). One new review done in full
(#2296) and **held for Ilia — nothing posted on it**.

## Cross-cutting

The required `build` check is red on all four heads for one reason only: Trivy HIGH
CVE-2026-107303 in `react-jhipster` 0.22.0 (fixed 1.1.0), master-wide; **#2299** (Ilia, draft)
is the fix. Verified in #2296's job log: the image builds, tests run, Sonar passes — the Trivy
step alone exits 1. Same cause previously confirmed on the other three (see
`incidents/ci-react-jhipster-openfile-cve-2026-10-10.md`).

## Unchanged since last review — skipped, no comments (3)

- **#2297** PLT-3271 (Live Incident, video attachment delete) — approved 10-11 on head 24a2a7d,
  still head. Pending on author: 1 open Copilot thread (failure toasts still say "image" for a
  video) + the shouldDeleteFromStorage guard nit, both non-blocking ride-alongs.
- **#2292** PLT-3203 (asset system memberships) — approved 10-11 on head 6a59ac6 (Darminder
  also approved), still head. Pending non-blocking: systemsInheritedNote i18n copy overclaims
  (inherited systems get no tasks; only direct membership rows reconcile).
- **#2268** PLT-3111 (Blocker, 5 QA issues) — CHANGES_REQUESTED 10-07 stands; 10-11 status
  comment is the latest activity on head b769947. Still owed by author: issue 1 (409 generic
  error) absent from diff with no linked follow-up, QA ack for issue 2's by-design call,
  replies on the 4 open Copilot threads.

## Reviewed this run, held for Ilia — no verdict posted (1)

**#2296** PLT-3246/PLT-3259 (shared `SearchableSelect` for Cx pickers; Rishi; head d8c7eb9,
631+/675-, 23 files). Code-level verdict: clean — would approve on code alone, but held because
the ticket is visual by nature (Figma + Claude-prototype links, flag-on manual steps) and
**Darminder has an open CHANGES_REQUESTED (10-09)**: 'Create new system type' text and chevron
nearly clash in the import remap select (screenshot on the PR), plus an out-of-scope
saving-indicator suggestion. Piling a second verdict on top helps nobody; Ilia should eyeball
the spacing + the Task Library pill→select restyle against the design.

What was verified (so the next run needn't redo it):
- New `common/select/searchable-select.tsx` is sound: search enabled >10 options (ticket AC),
  `onClose` resets the query — Copilot's 10-09 "previously missed: stale search on reopen"
  summary note is **already addressed in code**, no action needed; `reason === 'clear'` while
  searching resets search only, selection untouched (Copilot medium, fixed, thread resolved);
  `getOptionDisabled` wired (second Copilot medium, fixed, resolved). Both Copilot threads
  resolved with real fixes.
- `FormSelect` rewritten as a thin RHF wrapper around it. **`multiple` prop removed — zero
  callers pass it on master** (grepped at 108e66b). `SelectOption` type re-export kept, so the
  external type importers (useTimezoneQuery, Step1Content, OutageMessage.types) survive;
  `optionText`/`SelectPaper` are no longer exported from form-select but their only external
  consumer was form-select's own test (rewritten in the PR); `MultiEmailAutocomplete` imports
  the *other* SelectPaper from `common/select` (untouched). Timezone `filterOptions`
  passthrough preserved.
- Non-Cx blast radius is real but deliberate: every existing FormSelect user (project create
  modal, GeneralTabEdit, outage admin) loses the "N results" header (PR says it isn't in the
  design) and gets the new input-width/6px-shift fix. Worth one visual glance outside Cx too.
- Sonar quality gate passed (8 new minor issues, 54.7% new-code coverage); migrations match the
  ticket's file list exactly; `move-asset-modal.tsx` migrated though nothing imports it (noted
  in PR body).

**Open unresolved review threads across the four: 5** — 4 on #2268 (Copilot 1 medium + 3 low),
1 on #2297 (Copilot low, media label). #2296/#2292: zero unresolved threads, but #2296 carries
Darminder's open CHANGES_REQUESTED review and #2268 carries this account's.
