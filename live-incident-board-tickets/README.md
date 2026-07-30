# Live Incident Board — ticket context tracking

One folder per PLT-XXXX live-incident ticket that is actively being worked
(Group A / Group B per the triage rule below). Each folder holds
`context.md`: ticket metadata, full description + comments, an
attachment/media inventory (flagging anything auth-gated or unresolved),
relevant `xyz-platform-context` domain docs, relevant `hc-frontend` code
citations, a playbook-frame analysis (see `incidents/live-incident-playbook.md`),
a confidence score, and one recommended next action — **described, not
executed**. Nothing in this folder posts to Jira; a human acts on it.

## Triage rule (applied each run)

Source: `project = PLT AND issuetype = "Live Incident"`, then excluded any
ticket in a status meaning "sitting with someone else, not our move right
now": **With Customer, With Technical Support, Ready For QA, In Code
Review, READY FOR RELEASE, Customer Release Check, Done, Blocked,
ARCHIVED (NOT RELEASED)**. What's left splits into:

- **Group A** — status `Open` or `In Analysis` (needs evaluation/analysis,
  usually needs cross-team clarification before it's actionable).
- **Group B** — status `Dev In Progress` or `Ready For Development`
  (already has context; skipped per current instructions — "to be
  populated later").

Note: `With Customer` was treated as excluded (functionally the same
"waiting on an external party" bucket as `With Technical Support`/`Ready
For QA`, even though it wasn't named verbatim in the exclusion list) —
flag if this reading is wrong so the rule can be corrected next run.

## Run log

### 2026-07-10

**Group A (processed — context gathered, folders below):**

| Ticket | Summary | Status | Priority | Confidence | Diagnosis in one line |
|---|---|---|---|---|---|
| [PLT-2884](PLT-2884/context.md) | EQX-AT10 new-dashboard progress % mismatch vs old dashboard | Open | Critical | 6/10 | Dashboard and editor read progress from two different sources (filtered XER→parquet aggregate vs. live activity progress) — the "missing" activity may correctly be excluded, not a bug. Needs one clarifying question to Mostafa before any dev/customer routing. |
| [PLT-2882](PLT-2882/context.md) | Can't isolate/select linked elements for a Retired Activity, FAR01 | Open | Major | 6/10 | No "retired" concept exists in FE at all — this is a data-level link resolution gap. When `getElementsForActivity()` returns empty, isolate/select silently no-ops (matches symptom exactly). Three candidate causes, needs one live data lookup. |
| [PLT-2874](PLT-2874/context.md) | FAR01 fed-file linked-element count: editor 628k vs dashboard 695k | Open | Minor | 5/10 | Likely a units mismatch: editor counts link *records*, dashboard counts non-deduped Forge dbIds (one element → many dbIds). Needs a clarifying question to Mostafa on what each number actually counts before routing to dev. |
| [PLT-2858](PLT-2858/context.md) | QA issue "Location" field missing on create form / blank on detail | Open | Critical | 7/10 | Not a regression — `locationId` is zone-derived by design, has no create-form input; ML9's model has no zones configured. Customer wants manual entry (BIM360 parity). This is a stalled **product decision** (Darminder already asked Pietro/Mostafa today), not a dev bug. Priority looks Freshdesk-inflated — nothing is actually blocked. |
| [PLT-2649](PLT-2649/context.md) | PA12 new-dashboard 360° pins render too high vs PowerBI | In Analysis | Major | 7/10 (diagnosis) | Data-remediation issue, not an FE bug — reproduces in PowerBI too, and the identical pin-transform pipeline renders Quality-tab pins correctly (exonerates FE code). Root cause: bad/obsolete Revit room elevation data for ~40% of PA12 capture points. **Silently stalled 6 weeks** — last comment (Ilia, 30 Jun) is an unanswered "who can assist" with no owner. |

**Group A — attachments/media flagged for manual pull** (all Jira/Freshdesk
attachment content URLs are auth-gated; WebFetch got HTTP 403 or an OAuth
redirect on every one — a human must open these in an authenticated
browser tab):
- PLT-2884: `2026.07.09_EQX-AT10x_Dashboard-error.xlsx`, the `.xer` schedule file, 3 PNGs.
- PLT-2882: two Jira-attached videos (`2026-07-09 .mp4`, and Yash's own repro recording) — the second likely shows the exact repro steps; also two session-replay IDs to pull from the observability tool.
- PLT-2874: two screenshots (`image-20260707-142150.png`, `image-20260707-142256.png`) — the axis labels on each number are load-bearing for the diagnosis.
- PLT-2858: **not actually inaccessible** — the two `UNKNOWN_MEDIA` placeholders in the description are a Freshdesk→Jira sync artifact; all 3 real attachments resolved fine in the `attachment` field (nothing to chase).
- PLT-2649: two screenshots (`image-20260506...`, `Screenshot 2026-05-11...`) — add magnitude confirmation only, diagnosis already stands without them.

**Group B (skipped per instructions — "to be populated later"):**
PLT-2759 (Dev In Progress), PLT-2742 (Dev In Progress), PLT-2385 (Ready
For Development).

No Jira writes were made this run (no comments, no transitions) — every
"recommended next action" above is a draft in the ticket's `context.md`
for Ilia to review and execute manually.
