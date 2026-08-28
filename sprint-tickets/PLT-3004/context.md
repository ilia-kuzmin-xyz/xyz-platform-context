# PLT-3004 — Project Settings → Type Library, add search

**Type:** Task · **Domain:** Commissioning / Project Settings (see `_shared-commissioning-domain.md`)
**Jira:** https://xyzreality.atlassian.net/browse/PLT-3004

**Status after 2026-08-24 run: `Analysis In Progress`. Believed already delivered — awaiting confirmation. No branch, no PR.**

---

## 2026-08-24 — this looks already shipped

### Finding

The search this ticket asks for **is on master**, delivered incidentally by
**PLT-3000 / PLT-3002 (PR #2136, commit `689fc6f`)** — the commit that created the Types tab.
It was never attributed to PLT-3004.

`ProjectSettings/TypesTab/TypesTab.tsx` on master:

| Ticket wording | Where it is |
|---|---|
| a search to filter types | `TypesTab.tsx:186-207` — `TextField`, magnifier `InputAdornment`, shared `groupSearchSx` |
| "in 'System' and 'Asset' **depending on what the user has selected**" | one shared box; placeholder swaps with the toggle at `:193-196` (`searchSystemTypePlaceholder` / `searchAssetTypePlaceholder`); term deliberately survives a switch |
| System types actually filter | `SystemTypesList.tsx:82` — trimmed, lower-cased term inside the `useMemo` |
| Asset types actually filter | passed down as `groupSearch`, filtered at `AssetListContent.tsx:287` |

`SystemTypesList.tsx:133` already distinguishes "empty catalogue" from "search matched nothing".

### What could still be outstanding

The prototype (`Project Settings - Types Prototype.dc.html`) is behind an auth wall — same 403 as
every other design link this run — and the description's inline screenshot doesn't come through
the Jira API either. So only the *text* of the description could be matched, not the design. A
remaining slice would be: searching within readiness levels/tasks rather than names, a debounce,
a clear (×) affordance, or a distinct no-results state on the asset half.

### Careful — do not "re-add" the search

If a future run reads only the ticket and not this note, the obvious move is to build a search box
that is already there. **Check `TypesTab.tsx` first.**

### Cross-ref

PLT-3001 / PLT-3003 (PR #2147) also modify `TypesTab.tsx`. Any real PLT-3004 work should branch
off **`PLT-3003`**, not master, and say so in the PR description.

## 2026-08-28 — scheduled-run checkpoint

Still `In Code Review`; not eligible for kick-off. Checkpoints 1–3 all clean on the PR —
build + Sonar green, branch already contains master head `70451f7`, no conflict
(`mergeable_state: blocked` = awaiting approvals, not a merge problem). Full run log and the
ticket→PR map: `sprint-tickets/README.md` § 2026-08-28 (morning).
