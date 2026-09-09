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

---

## 2026-09-09 — correction to the above. The five-row table is right; the *filter that produced it* is too narrow.

Everything in the 08-27 note re-verified independently this run and **needed no correction**: the five
`specific → generic` inversions are exactly right, and "12 ladders step upward somewhere" is exactly
right (12 `specific → specific` upward steps across 37 Discipline+Package ladders).

**But `findCrossRuleInversions` excludes a live case of the symptom this ticket is about.** Its comment
says it deliberately skips specific-vs-specific inversions because *"there are a dozen of them"*. True
overall, and misleading for the slice that matters. Restricted to **Cat 3 → Cat 4** (Paolo's literal
complaint: Category 4 rendering above Category 3) there are **four** cases, not three:

| Discipline / Package | Cat 3 | Cat 4 | resolution | caught? |
|---|---|---|---|---|
| CSA / Underground Services | £600.00 | £740.00 | specific → generic | yes |
| Electrical / Earthing | £1,120.00 | £1,184.00 | specific → generic | yes |
| Electrical / Fire Alarm | £853.33 | £1,184.00 | specific → generic | yes |
| **Mechanical / VESDA** | **£845.71** | **£1,840.00** | **specific → specific** | **no** |

Of the 12 `specific → specific` upward steps, **exactly one is Cat3 → Cat4** — that one
(`rework_reference.json:77-78`). The other 11 sit at Cat1 → Cat2 or Cat2 → Cat3. So the exclusion
discards a single row and it is the row that reproduces the reported symptom. Contrast
`Electrical / VESDA`, which steps down cleanly (£4,120 → £2,100 → £1,280, `:74-76`) — same package
name, different discipline, clean ladder.

**If this branch is picked up, do this first:** report Cat3 → Cat4 upward steps regardless of which
rule produced each side, and keep the source labels for triage. As it stands the test pins the known
five and a newly-introduced specific-vs-specific Cat3 → Cat4 inversion still passes CI.

**Branch status, verified 2026-09-09:** `origin/PLT-2815-rework-cost-ladder-audit`, one commit
`f480450`, **no pull request exists (open or closed)**. Pushed 08-27 and unraised for 13 days. The
ticket's own recommendation is still to close (see `recommended-action.md`), so if nobody intends to
raise this, delete the branch rather than leave it looking queued.
