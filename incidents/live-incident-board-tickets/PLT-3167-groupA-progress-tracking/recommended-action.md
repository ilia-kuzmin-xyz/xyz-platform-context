# PLT-3167 — recommended action (2026-09-24, first pass)

## Classification: class 1 leaning class 2 — run the two cheap queries in `context.md` §4 first; if they confirm Pattern 1, this goes straight to the existing remediation runbook, not fresh development

Not class 3 (no visual/console debugging is needed that isn't already the standing recipe) and not
class 4 (nothing here is a product/scope question — Yash has already asked for "a permanent fix,"
which is a fair ask but is a separate, bigger ticket from clearing today's three activities). Not
class 3 With Technical Support either: nothing is needed from the customer beyond the activity IDs
already given, and Yash's request for a project-wide sweep from the customer is already in flight
and does not block the internal check below.

## What to do, in order

1. **Run the two queries in `context.md` §4 against FAR01's dashboard DuckDB** for
   `FAR01UGD14640`, `FAR01ELE3590`, `FAR01UGD4130`. This is a 5-minute check, not a new
   investigation — it is the exact recipe already proven on PLT-2882/2909/2931.
2. **If confirmed** (geometry oracle returns the missing element(s), arithmetic reproduces the
   selection gap): this is remediation, not new code — follow `incidents/data-remediation-runbook.md`
   (the same soft-delete-the-dead-links procedure that moved ELN03's five activities to 100% on
   PLT-2931). Reuse the existing tooling (`scripts/console-geometry-harvest.js` +
   `scripts/orphaned-links-sweep.mjs`) for the project-wide sweep once Yash's customer-side list of
   further affected activities comes back, rather than handling one activity at a time.
3. **If not confirmed:** this is a new mechanism on old-sounding symptoms — do not force-fit
   Pattern 1; re-open triage from `context.md` §1 with the query results in hand.

## Draft — to Yash Patel, on PLT-3167 — DRAFT ONLY, not posted (approx. 95 words)

> Yash — this looks like the same family as PLT-2882, which also hit FAR01 (not PLT-2931/ELN03,
> which is the same *kind* of bug on a different project — worth knowing since it's happened on
> FAR01 before). Short version: some of the activity's linked elements point at data that no longer
> exists in the current model's geometry, so "Select All Linked" silently skips them and the
> activity can never show 100%. I'm running the same two checks that confirmed it on the last three
> projects against `FAR01UGD14640`, `FAR01ELE3590` and `FAR01UGD4130` now. **Once the customer's
> project-wide sweep comes back, can you send the full activity list in one batch** rather than
> piecemeal — it's the same fix for all of them and batching saves a remediation round each time.

## On "can we look to have a permanent fix for this"

Fair question, and distinct from clearing today's three activities. Per the pattern doc, cleanup
(soft-deleting dead links) "treats the symptom. Until the pipeline stops producing the divergence,
it recurs" — and FAR01 recurring after its own PLT-2882 cleanup is itself evidence for that
statement, not a new fact. Whether to open a standing pipeline fix (the re-upload/re-version trigger
named in the pattern doc) is a product/backend scoping question, not something to fold into this
ticket's remediation — flag it, do not silently promise a permanent fix in the reply above.

## Not drafted, deliberately

- **No Jira status/assignee change recommended.** `Open`, assigned to Rishi, is correct while the
  queries are unrun.
- **No remediation batch proposed yet** — needs the query results and the customer's fuller
  activity list first, per §"What to do" above.

**No Jira action was taken by this run.** Confidence: see `context.md` §6 (7/10 overall,
8/10 that this is Pattern 1 pending the two queries).
