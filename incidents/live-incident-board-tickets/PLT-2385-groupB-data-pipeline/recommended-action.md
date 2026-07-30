# PLT-2385 — recommended action (Group B — DRAFT / for dev reference only)

**This is a Group B ticket:** already **Ready For Development** with a diagnosis in
thread. Context is captured for the dev picking it up. **No Jira transition and no
client comment is drafted here** (action-scenario is TBD per current instructions).
Nothing is to be executed.

**Re-check 2026-07-28 (prior check 07-13): no material change on PLT-2385 itself** —
one Freshdesk-sync comment only (Yash Patel, 07-17, "Waiting on customer"), status
still Ready For Development. The forks moved: **PLT-2650 shipped** (Released, verified
Staging 26.2.5, 06-08) and **UX-1109 reached Ready For QA** (07-23). See context.md
§ Delta for detail. **Bottom line unchanged: this ticket should stay closed/superseded
by its forks in intent, but the forks still do not cover DC10's actual trigger** —
see updated gap #1 below.

## Is it genuinely dev-ready?

**Partially — the root cause is clear, but the code work is not scoped in this ticket
and does not live in this repo.**

- ✅ **Root cause is clear:** activity↔element links persist for elements that left the
  PC model but still exist in the co-loaded QA model under the same Revit unique ID;
  nothing (link model, FE, or backend export) distinguishes QA from PC, so the stale
  links are counted into % complete / hours. The only existing prune (dagster on model
  **delete**, regenerating `project-element-list.parquet`) does not fire for this
  shared-ID / re-version case. (Rishi 2026-01-28; David Webb 2026-04-15; verified in
  code — see context.md § Mechanism.)
- ⚠️ **The fix is not in hc-frontend.** It is a **backend / data-pipeline** link-lifecycle
  change (prune stale links when an element leaves a model version, not only on model
  delete) plus a **product/UX** decision. A frontend dev opening this ticket would find
  nothing FE to build — the only FE-side asset is `shared-asset-impact.ts`, the query
  behind the warning modal.
- ⚠️ **The dev work has already been forked out:** **PLT-2650** (feature: handle links on
  model deletion + manual unlink, Rishi) — **now Released/Staging-verified** — and
  **UX-1109** (design, Jason) — **now Ready For QA**. This live-incident ticket is
  effectively a **parent/duplicate** of those; keeping it in Ready-For-Dev alongside them
  risks double-tracking.

## Gaps a dev would hit

1. **Scope mismatch vs the fork — now CONFIRMED, not just suspected.** PLT-2650 shipped
   covering the model-**deletion** and **manual-unlink** triggers only. Its own spec
   explicitly lists **"Upload path (BE-2): deferred pending reliable post-upload event
   delivery from BE"** as out of scope — that upload/re-version path is precisely DC10's
   trigger (elements orphaned by a **new model version**, not a delete). So the shipped
   fork **does not and was never going to** prevent this incident. No BE ticket for the
   upload-path fix exists yet (searched: not linked from PLT-2650 or PLT-2385). This is
   the single biggest open item — PO/Rishi need to file that BE ticket before this
   incident class is actually closed.
2. **Ambiguous product intent (unresolved for ~3 months).** David Webb: silently prune
   links (current V2 on delete). Pietro: give the user a **choice** (warn, name the other
   models, preserve/break). This is a genuine product decision, not a code detail — and
   it was still being negotiated at the last comment (2026-05-06).
3. **Owner vacancy.** Assignee is **Masum Ahmed (support, off dev roster)**; no engineer
   is assigned to the code work on *this* ticket. Real owners live on PLT-2650 (Rishi) /
   UX-1109 (Jason).
4. **Cohort under-quantified.** lon1x2 mentioned as possibly affected (Mostafa) with no
   ticket; DC10 confirmed. No query has enumerated all activities with links to elements
   shared across a QA + PC model — the natural cohort sweep.
5. **Decisive evidence unreadable here.** PowerBI-export screenshot (attachment id 51021)
   confirms the export *counts* the QA-side elements; not machine-readable in triage
   (numbers are transcribed in Rishi's comment, so not blocking).

## Where the fix most likely belongs

**Backend / data-pipeline (primary, still unticketed as of 07-28):** link lifecycle
around `activity_links` / `project-element-list.parquet` regeneration (dagster): prune
stale activity↔element links when an element leaves a model version via a **new upload**
even if the model is not deleted, and/or make the export/count aware of which model
tracks an element's progress. This is the literal "BE-2 upload path" PLT-2650 named and
deferred — needs its own ticket.
**Plus product/UX (secondary, forked and now largely delivered):** the shared-link
impact modal — **PLT-2650 (Released)** + **UX-1109 (Ready For QA)** — covers deletion
and manual-unlink, not upload/re-version. **Not the frontend** beyond the existing
`shared-asset-impact.ts` query.

## Suggested next step for whoever re-triages this (not executed)

Given PLT-2650/UX-1109 have progressed to Released/Ready-For-QA without touching the
upload-path trigger, the clean move once someone with edit rights looks at this is
likely: **file the BE-2 upload-path ticket explicitly** (referencing PLT-2385 as the
originating incident) and then close/resolve PLT-2385 pointing to it — rather than
leaving PLT-2385 open in Ready-For-Development where no FE work will ever land against
it. Not drafted as a postable comment here per Group B scope (TBD workflow) — flagging
for whoever owns the next real triage pass.
