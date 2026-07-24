# PLT-2923 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a′) — one added internal step in parallel with the existing customer wait, not a new client message

Ilia already posted the right closed questions same-day (source IFC file, export origin, Revit
sanity-check — `context.md` §Comment timeline) — **nothing to add to the client-facing thread.**
But this run's code investigation (`context.md` §Mechanism) found a concrete, testable lead that
**does not require the customer at all**: the web viewer selects its viewable by name from a
fallback chain (`Navis` → `XYZ` → `EXPORT TO HOLOSITE` → `{3D}` → first-available), and a bubble
that matches nothing renders **silently** (no toast, no error). If this IFC derivative's manifest
only carries an `EXPORT TO HOLOSITE`-named viewable (what holosite itself likely reads) and no
higher-priority one the web path resolves to, that alone would explain "works on-device, silently
fails in browser" — independent of whether the customer's source file turns out malformed.

**Recommended: whoever has Forge/manifest access checks this model's translated viewable names in
parallel with waiting for the customer's upload** — it's free information that either confirms a
web-viewer-side gap (worth its own ticket, potentially affecting other IFC models) or rules it out
before the file even arrives, narrowing what to look for once it does.

## Why not the others

- **Not (a) another internal comment.** Nothing new to say — the three questions already posted
  are exactly the ones the playbook would prescribe (get the artifact, get the export origin,
  cross-check in the authoring tool). Repeating or expanding them now would be premature.
- **Not (b) Ready For Development.** Far too early — mechanism is completely open (source-file
  defect vs web-viewer translation gap, `context.md` §Bug vs feature-gap), and routing to dev
  before the source file arrives would have nothing concrete to act on.
- **Not (d) Blocked.** "With Customer" already captures the true state precisely — we are waiting
  on an external artifact we cannot substitute for. Marking it Blocked would be a redundant label
  change with no informational gain.

## What to do the moment the source file arrives (owner: Ilia)

1. Confirm reproduction against the actual source file (not just the customer's report) — load it
   in the web viewer ourselves.
2. Check whether it's a translation-status issue (still processing / failed derivative) vs a
   silent load failure — the screenshot (NEEDS HUMAN) would help narrow this without even needing
   the file.
3. If IFC-specific: check whether other IFC-sourced models on WI1 or elsewhere have hit the same
   wall (cohort, playbook Q6) before treating this as a one-off.
4. If confirmed as a web-viewer-side gap (not a source-file defect): scope a Ready-For-Development
   ticket at that point, not before.

## Notes for the coordinator (Yash)

- Nothing further needed from you until the customer replies with the file — the request as posted
  is complete and correctly scoped.
- If the customer takes more than a few days, a single follow-up nudge is reasonable per the
  playbook's coordinator role; not needed yet at 1 day old.

**Confidence in this being the right next step: 8/10** — a 1-day-old ticket already in the correct
client-facing state needs patience there, but the free, customer-independent manifest check is
worth doing now rather than waiting idly.
