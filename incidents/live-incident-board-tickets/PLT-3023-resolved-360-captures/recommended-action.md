# PLT-3023 — recommended action (DRAFT ONLY — execute nothing)

## 2026-08-07 — SUPERSEDED: do not send the draft below

Ticket moved to **In QA** on 08-06; Rishi has already identified the fix as **PLT-2794**, pending
release scheduling. Our diagnostic question below is no longer needed — see `context.md`
"2026-08-07" section. **No action recommended this run.** Leaving the original draft in place below
for the record, per the repo's "mark superseded, don't delete" rule.

## Chosen action (superseded, 2026-08-06): (a) — one internal diagnostic comment to Rishi (already assignee), not to the customer yet

No facts are established yet beyond the client's own description — no root cause, so nothing should
go to Lucas. The single highest-leverage move is the DB/API lookup that settles H1 (§5 of
`context.md`), which needs someone with data access, not more customer detail.

### Draft internal comment (to Rishi Bhugobaun) — playbook style, DRAFT ONLY

> Rishi, had a look at the frontend for this one. There's no separate "custom capture point" concept
> anywhere in the code — the new mobile feature writes into the same capture-point model as the old
> room-based flow, and every surface (web viewer, dashboard, editor panel) groups individual photos
> into one point purely by matching `roomCapturePointId`, nothing spatial. So ten photos landing on
> one Building 1 point almost certainly means those ten capture records share one `roomCapturePointId`
> value, or are all missing one. Could someone pull the raw `roomCapturePointId` values for Building
> 1's captures from that session and check for a duplicate or a null? That one lookup tells us whether
> this is a mobile-side ID bug or something else.
>
> Separate smaller thing worth checking at the same time: for the Building 2 points whose position
> differs between web viewer and dashboard, do any of them have two photos with the same or very
> close timestamp but different coordinates? The two surfaces pick "the" position for a point
> slightly differently when photos tie on timestamp, so that would explain the mismatch without a
> bug on either side.

Notes on the draft: two questions, both routed to the one person with data access, both answerable
with a value (an ID, a coordinate pair) — the broken-vs-working diff the playbook's question 3 asks
for. No headings, no bullets, no long dashes.

## Before sending this — two cheap checks that need no data access

1. **Hard-reload the Web Viewer session** on Building 1 where custom points are missing — if they
   appear after reload, that's H3 (incremental-sync edge case) confirmed in seconds, and narrows the
   ask above considerably (drop the ID-duplicate question, focus only on the reload-fixes-it report).
2. **Open the 6 attachments** (all unopened this run) — cheap, and might make the DB lookup
   unnecessary if a screenshot already shows a duplicate/label mismatch directly.

## Why this and not the others

- **Not straight back to the customer.** Lucas has already given a precise, well-structured report
  (which building, how many photos, which surface) — nothing more is needed from him yet; the next
  step is entirely on our side (a data lookup).
- **Not With Technical Support.** No indication this needs a different queue — Rishi is already
  correctly assigned and the question is squarely a mechanism question for someone with DB access.
- **Not Blocked.** Brand new (created today); no stall to escalate yet.
- **Not Ready for Development.** No confirmed defect exists yet in a fixable location — until H1 is
  checked, this could be a mobile-app data bug, a backend indexing lag (H4), or a genuine frontend
  gap once someone confirms *where* the duplicate/mismatch actually lives. Moving to dev-ready before
  that's known risks misrouting the fix.

## Follow-through the human should own (not executed here)

- **If H1 confirms** (duplicate/null `roomCapturePointId` on Building 1's captures): this is very
  likely a mobile-app write-path bug, not an hc-frontend fix — route accordingly once confirmed.
- **If H2 confirms** (tie-break divergence on near-simultaneous timestamps): worth a small FE
  robustness fix — add the same deterministic secondary sort (`fileReferenceId` or similar) to the
  Web Viewer's plain-JS sort in `media-service.ts:783-791` and `build-capture-point-summaries.ts:67-71`
  so it matches the Dashboard SQL's tie-break, even though the root symptom (why timestamps tie at
  all) may still be upstream.
- **If H3 confirms** (hard reload fixes the Viewer-missing-points symptom): the underlying gap is real
  regardless of whether it's "the" bug here — `Dashboard360Service` has no incremental path and
  `LastSyncService`'s persistence methods (`toJSON`/`fromJSON`) are dead code (never called), so the
  sync clock resets on every reload. Worth a small follow-up ticket independent of this incident.
- **H4 (Dashboard-side Building 1 invisibility)** has no frontend mechanism behind it in this repo —
  route to backend/data if H1-H3 don't explain it, rather than continuing to search hc-frontend.
- **Doc gap:** `dashboard/360-tab.md` doesn't mention that capture points can be room-less
  ("custom") or describe the `roomCapturePointId`-based grouping contract at all. Worth a short
  addition once this resolves, given this is likely not the last custom-capture-point ticket.

**Confidence in diagnosis: 6/10** (grouping mechanism fully verified in code; which specific
record-level defect produced this ticket is not yet confirmed). **Confidence in this being the right
next step: 8/10** — the DB lookup is the single cheapest, most decisive move available, and doesn't
require anything further from the customer.
