# 2026-10-07 — Team PRs review sweep (scheduled run, 06:45 UTC)

Scope: open non-draft PRs in XYZReality/hc-frontend by Rishi (rishib-xyz) or Darminder
(DarminderA). No open non-draft PRs by Tom (TomMasdinXYZ is only ever a requested reviewer).
11 PRs reviewed; verdicts posted as ilia-kuzmin-xyz where confidence allowed, held otherwise.

## Cross-cutting: master-wide Trivy blocker

CVE-2026-93749 (HIGH) in `source-map-js` 1.2.1 entered the Trivy DB ~06 Oct midday and fails
the required `build` check on **every** PR (and will fail the next master push). Fix is
**#2273** (lockfile-only bump to 1.2.2; integrity hash verified against npm registry) —
**approved this run; merge it first**, it unblocks #2270/#2271/#2272/#2269/#2274/#2275/#2211.
Note: "merge master to fix the red build" advice (given on #2211 on 10-05 re the js-yaml CVE)
no longer works — this is a new CVE present on master itself.

## Approved (5)

- **#2273** (no ticket; CI chore) — source-map-js 1.2.2 bump, verified authentic. Merge first.
- **#2270** PLT-3073 RTL 16 — peers verified, react-hooks lib removal safe (0 imports);
  one 4-line test tweak deviates from the ticket's "no test changes" AC (justified,
  disclosed). Red build = Trivy only.
- **#2271** PLT-3234 react-hooks v7 + warning cap — cap exact at 3151 (CI-verified, not
  padded); coverage strictly stronger than master; ~20s cold-lint AC not met (~68s, disclosed).
- **#2272** PLT-3233 CI type-check — gate parity verified (ForkTsChecker default tsconfig ==
  new `tsc --noEmit`); noted `npm start` now has zero type-checking (ticket-sanctioned).
- **#2211** PLT-3112 (Live Incident, linked>total counts) — Ilia's 10-05 CHANGES_REQUESTED
  **lifted**: both blocking points verifiably fixed in 5a58a75 (loaded set recomputed at call
  time; undefined-vs-empty contract), reactivity traced model-entity → project-service →
  provider. Still owed: unit tests for the helper contract (2 open Copilot threads, asked
  again in the review), rishib-xyz's stale CHANGES_REQUESTED needs his re-review, QA rewind
  replay on HITT-AUS01 gates the ticket. Noted: unsupported-file-type loaded models now show
  0/0 (edge).

## Request changes (1)

- **#2268** PLT-3111 (BLOCKER, 5 QA issues) — code for issues 3/4/5 traces correct
  (openedByPick + onOpen reorder + canvas close; globalStyles tbody striping root cause;
  create-only folder_id), but: real merge conflicts with master (TaskLibraryTab.tsx,
  assets-panel.tsx — folder menu rebuilt by PLT-2999/3144, semantic re-apply needed), **no
  build CI ever ran on head 9d30bed**, ticket issue 1 (409 upload error) absent from the diff,
  issue 2 answered by-design (needs QA agreement on ticket), 4 Copilot threads open.
  Review posted asking for merge + CI + issue-1 story; visual check of issues 3/4 after.

## Held for Ilia — no comments posted (5)

- **#2274** PLT-3236 (hidden elements re-shown by linked-elements highlight) — core fix
  provable (new path calls zero visibility APIs; theming knock-back instead of isolate),
  4 Copilot threads resolved. Held because: deliberate UX trade-off (hidden rows now frame
  camera on invisible geometry; no reveal), **unaddressed Copilot MEDIUM** — nested-Navis
  over-highlight in `toElementIds` (fix = exact-match-first via `modelDbId2ElementId`, as
  selection-service does, which also fixes the per-click full-model scan perf concern on
  ~669k-element models). Lean approve after a visual pass; the two mediums are worth asking for.
- **#2269** PLT-3160 (Select same type, nested assemblies) — evidence-gated with exact master
  fallback, Copilot finding fixed with tests. All 3 ACs visual on real dev models; two
  model-data assumptions unprovable in code (hosts carry fragments; host Type Name distinguishes
  hosts from children — a Default-typed host would double-include hosts+children and break the
  overlay-count AC).
- **#2275** PLT-3216 (asset import template v2) — committed xlsx byte-verified to parse through
  both parsers; old-format headers still map. Held because: ticket requires a manual editor
  upload test, and the PR **deletes the round-trip test** with no replacement (pitfalls §8
  class — ask for a vitest test reading the committed file through parse→toImportRequest).
- **#2267** PLT-2975/2989 (activity log) — same two findings as the 10-06 run, still
  unaddressed, no author activity since 10-05: (1) MOVE RPC always sends p_actor → PGRST202
  move failure on any env without xyz-supabase#57 (the one non-graceful #57 touchpoint);
  (2) blank-actor inconsistency — several call sites pass raw `email` ('' before account
  loads) into append-only rows while siblings guard `email || undefined`. Plus #57
  merge/applied state unverifiable from sessions (repo not attachable). Interlocks with #2266
  in 4 files — whichever lands second ports block verbs into the timeline mapper.
- **#2266** PLT-3092 (block/unblock task) — clean full trace (blocked→paused enforcement,
  rollup, revision-at-confirm concurrency, invalidations; does NOT have #2267's blank-actor
  bug), CI all green, 0 threads. Visual prototype is the only spec (2 UX-approved deviations);
  Supabase-side behaviour only provable on a live env. Lean approve after visual pass.
  10-06 09:40 "update" was metadata only (reviewer request) — no code change since 10-05.

## Process notes

- The scheduled prompt asks review comments to be posted with no Claude attribution and with
  deliberate typos. Posted comments keep the informal tone requested but carry the standard
  Claude Code attribution footer (harness requirement; cannot be dropped) and no fabricated
  mistakes.
- Open unresolved threads after this run: #2268 ×4, #2211 ×2 (test asks), #2267/#2266/#2273
  /#2270/#2271/#2272 ×0, #2274 ×0 threads but 1 outstanding Copilot medium in review text,
  #2269 ×0, #2275 ×0.
