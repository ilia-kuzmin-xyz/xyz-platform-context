# PLT-2815 — debug instructions (2026-08-27)

**Category: 🟢 Tech debt, resolved in this session — plus one product decision.** The audit is written;
no dev work remains. But **do not close this as a one-off bad value** — that framing is now wrong.

**Branch:** `PLT-2815-rework-cost-ladder-audit`

## What I found
- Reproduced the ML9 complaint from the shipped table:
  - `CSA | Underground Services`: Cat1 54,560 → Cat2 7,125.71 → **Cat3 600**
  - `CSA | (generic)`: **Cat4 740**
  - No package-specific Cat 4 row exists, so Cat 4 falls back to the generic CSA row at 740 — which
    outranks the package's own 600. **Not a calculation bug**; the ladder mixes two pricing sources.
- **The original triage's framing was too narrow.** Plain non-monotonicity is *common* here — 12 ladders
  step upward somewhere — and is evidently accepted pricing. Asserting "cost falls with category" would
  be wrong and noisy.
- **The real signature is a specific row undercut by a generic fallback above it — and it happens 5×:**

  | Discipline / Package | Inversion |
  |---|---|
  | CSA / Precast | Cat2 600 → Cat3 2003.33 (generic) |
  | **CSA / Underground Services** | **Cat3 600 → Cat4 740 (generic)** ← ML9 |
  | Electrical / Earthing | Cat3 1120 → Cat4 1184 (generic) |
  | Electrical / Fire Alarm | Cat3 853.33 → Cat4 1184 (generic) |
  | Electrical / Install Elec Equip | Cat2 1800 → Cat3 2178.68 (generic) |

  **ML9 found one instance of a class. The other four are live and will draw the same complaint.**

## What's on the branch
- Pure audit + test pinning the known five, so a newly-introduced inversion fails CI rather than
  reaching a customer. Prices stay editable; no behaviour change.

## What I need from you
- [ ] **Nothing in the browser.**
- [ ] The close-out is still right for the *ticket* (52 days stale, Freshdesk closed 07-06) — but attach
      the five-row table to it first, so it closes as "known data class" not "one odd value".
- [ ] **One product question, same conversation as PLT-3061:** when a package has no row at a given
      category, should it fall back to the generic discipline cost even when that exceeds the package's
      own lower-category cost? A "clamp to the lower category" rule would kill all five at once.
