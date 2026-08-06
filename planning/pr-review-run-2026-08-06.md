# PR review run — 2026-08-06

Scheduled sweep of open `hc-frontend` PRs authored by Rishi / Darminder / Tom, non-draft.
All 12 non-draft PRs in scope were Rishi's; none open from Darminder or Tom.

Ordering note: PRs 2091 → 2092 → 2096 → 2101 are a 4-deep stack and must merge in that order.

---

## Outcomes

| PR | Ticket | Verdict | Why |
|---|---|---|---|
| 2095 | PLT-2940 | approved | prior caveat closed — `data-lpignore` added + author verified Chrome/Edge/Firefox |
| 2066 | PLT-2835 | approved w/ notes | matches ACs exactly; failure-path regression test added |
| 2098 | PLT-2805 | approved w/ notes | works, but name-keyed suggestions (see below) |
| 2100 | PLT-2509 | approved w/ notes | clean moment→dayjs; implicit plugin-registration dependency |
| 2091 | PLT-3016 | approved w/ notes | Jest→Vitest, 204 files; one undocumented skip |
| 2092 | PLT-2727 | approved w/ notes | MSW; prod leakage properly gated, one copy-plugin gap |
| 2096 | PLT-3017 | approved | re-enables 3 of 4 excludes 2092 had to add |
| 2101 | PLT-2508 | approved w/ notes | Enzyme removal; 2 cosmetic Copilot threads still open |
| 2047 | — | approved | dev-only ESLint/tsc perf |
| 2062 | — | skipped | already approved by me at current head, nothing changed since 24 Jul |
| 2081 | PLT-2743 | **held — needs human** | blocker fixed, but needs a browser re-test (below) |
| 2099 | PLT-2507 | **held — needs human** | react-loadable → React.lazy, author's route checklist unticked |

---

## PLT-2743 (PR 2081) — my 03-08 `CHANGES_REQUESTED` is now satisfied

The blocker I raised was: **an element linked to a dateless activity derived Not Planned (grey)
where master gave Planned (yellow)**. `ScheduleService` drops dateless activities from the
projection entirely, and the rule keyed Planned off date presence rather than linkage.

Fixed in `3d068ca`. The viewer now writes its `CASE` inline instead of going through
`buildInstallationStatusCaseSql`, because that builder's column-expression interface hands the
rule four values and no way to express "this element has a link". Planned now derives from
`linked.modelElementId IS NOT NULL`.

Also addressed from that review:

- the parity test that *couldn't* catch it (it built rows with `scheduleId: startDate || endDate ? 'act1' : ''`,
  excluding the one disagreeing input by construction) is replaced with an exhaustive branch table
  asserting literal expected states — no second implementation to share a misreading with
- `MIN(startDate)`/`MAX(endDate)` across multiple links is now documented as matching the dashboard aggregate
- schedule projection write is transactional **and** has a row-count sanity check, so a source shape
  change leaves the projection unchanged rather than emptying it
- `catchError` sits on the inner derive inside `concatMap`, so a derive failure can't kill the stream

**Still needs a human:** I found linking undo/redo dead in the browser on 04-08. `5e8ae24` registers
the callbacks that went missing when the V1 wrapper was deleted in `3dd76091c`. That's a code-level
fix for a defect found by clicking, so it wants confirming by clicking. My `CHANGES_REQUESTED` is
still standing and blocking — it should be cleared once undo/redo is re-tested.

### Deliberate divergence worth knowing about

The viewer no longer judges installs "as of" a reference date; the dashboard still does. Rationale:
the viewer's reference is the **local** date while `installationCheckDate` is **UTC**, so anywhere
behind UTC an element marked installed after ~17:00 Pacific rendered **Late** until local midnight.
The dashboard keeps its "as of" semantics because that's the point of a progress report at a chosen
date. Two surfaces, two rules, both documented — do not "unify" them without reading this.

Second, quieter change: `endDate < DATE ref` is a date-only comparison, where master's TS rule
compared against a `Date` carrying a time. An activity ending *today* was Late at 00:00 on master;
it isn't now. This aligns the viewer with what the dashboard already shipped.

---

## PLT-2805 (PR 2098) — name-keyed suggestions

`use-model-search.ts` builds suggestions with `acc.set(node.data.name, label)` — keyed on the
element **name**, even when the match came from the external id. Two consequences:

- elements sharing a name but with different external ids collapse into a single suggestion (Map
  dedupes on key); only the last one's id survives into the label
- clicking sets search text to the name, and `findNodeIdsByName` then selects **every** node with
  that name, not the id-matched one

Largely invisible on Revit — Forge node names usually carry the instance id in brackets and come
out near-unique. Bites on **NWC/NWD**, where names are commonly just the type and repeat freely.
Ticket is Minor priority and Darminder validated it, so approved with a follow-up suggestion rather
than blocked.

---

## Cross-cutting

- **Red `build` on every PR** is the repo-wide Trivy CVE (brace-expansion), not any branch. PR 2088
  exists to clear it. The other `build` check and Sonar are green everywhere. Don't read the red X
  as a branch failure.
- **No merge conflicts** on any of the 12 branches against master as of this run.
- **Copilot's optional-chaining claims are wrong**, and it made the same wrong claim on three
  separate PRs (2098 twice, 2091 once): it asserts `a?.b().c()` throws when `a` is nullish. Optional
  chaining short-circuits the whole chain. Rishi rebutted each correctly. Worth remembering so the
  next run doesn't relitigate it.
