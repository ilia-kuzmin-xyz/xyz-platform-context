# PLT-2909 — recommended action (DRAFT ONLY — execute nothing)

## Chosen action: (a) — internal reply: state the code-verified mechanism, name the ONE confirming data query, flag the likely PLT-2385 duplicate, and split off the session-id error

Post one internal status comment that (1) gives the code-verified mechanism, (2) names the single closed `activity_links` query that confirms/kills the cause, (3) raises the strong likelihood this is the **PLT-2385** stale/cross-model-link family (route the merge call to Rishi), and (4) explicitly scopes the "generate session id" error as a **separate signal**. Owner: **Ilia Kuzmin** (assignee/mechanism interrogator).

## Why this and not the others

- **Not (b) Ready For Development — yet.** The mechanism is near-certain from code, but the *attribution* for CY-5200 (that its `activity_links` genuinely spans multiple models, and which sub-variant) is unconfirmed (6/10), and the fix most likely **already exists as PLT-2385 / PLT-2650 / UX-1109**. Cutting a fresh dev ticket now risks duplicating in-flight work. Confirm + dedupe first; one query flips this to "link to PLT-2385" or "scope a data cleanup", with precise scope.
- **Not (c) With Technical Support / client ask.** We need **nothing** from the customer to progress: we have the activity ID, schedule, project, and the "good" model name, plus Yash's internal repro. The next step is an internal DuckDB query, not a customer round-trip. (The only customer-facing artefact still missing is the session-id screenshot — and that is a separate signal Yash already holds internally.)
- **Not (d) Blocked.** Nothing external blocks us; the confirming step is in our own hands (dev/DuckDB session on ATL08).

## Draft — internal reply (author: Ilia Kuzmin; @ Yash Patel, cc Rishi Bhugobaun, Darminder)

Playbook style: status = mechanism + evidence quality; hypothesis phrased as a question; one closed next step; side-signal scoped out loud.

> @Yash Patel — update on PLT-2909 (ATL08, activity `CY-5200`, schedule `29475-16-RL3`: several models shown as linked but elements only in `PC-EXCEL_…Bld2-V1`).
>
> **Mechanism (confirmed in code):** the linked-elements panel shows **one model per distinct model that owns the activity's linked elements**, read from `project_element_list`. `modelElementId` is a unique Postgres PK, so each linked element maps to exactly one model — which means the panel can only show several models if the activity's `activity_links` rows actually point at elements in several models. The FE is faithfully rendering the links; the extra models are stale/cross-model links, not a viewer bug. The "empty" extra models are shown as bare nodes because their linked elements aren't in the loaded model.
>
> **Hypothesis (question, not yet confirmed against data):** is this the same as **PLT-2385**? There, activities kept links to both the **PC and a QA model** because the two share Revit unique IDs, and links persist across model re-versioning/deletion (dagster regenerates `project-element-list` but "QA/PC is not considered"). CY-5200's spurious models are plausibly a QA / other PC / superseded-`V1` model of the same family.
>
> **One step to confirm (I'll run it):** for CY-5200 on ATL08, `SELECT DISTINCT modelId FROM project_element_list WHERE modelElementId IN (<CY-5200's activity_links element ids>)` — how many models, and which besides `PC-EXCEL_…Bld2-V1`. If it resolves to >1 model, this is stale cross-model links (a data fix) and I'll link it to PLT-2385 / PLT-2650 rather than open new dev work.
>
> **@Rishi Bhugobaun — one question:** does the PLT-2385 / PLT-2650 fix scope already cover ATL05–08, or is this a fresh cohort of the same defect?
>
> **Separate signal (not this incident):** the "couldn't generate session id" error is the support session-id/sync-log feature, unrelated to linking — tracking it separately; @Yash can you drop the exact error text/screenshot so we can raise it on its own?

## The one evidence step to run (owner: Ilia; ~15 min, needs dev/DuckDB on ATL08)

Smallest broken-vs-working diff (playbook move #3), turning 6/10 attribution into a confirmed cause:

1. Get CY-5200's linked element IDs: `SELECT modelElementId FROM activity_links WHERE activityId = 'CY-5200'`.
2. `SELECT DISTINCT modelId FROM project_element_list WHERE modelElementId IN (<those ids>)` → count distinct models + names.
3. **Expected if hypothesis holds:** >1 model, one of which is `PC-EXCEL_…Bld2-V1` and the rest a QA/other-PC/superseded model (shared Revit unique IDs). Cross-check whether those extra models' elements share `sourceFileElementId`s with the PC-EXCEL elements — that confirms the PLT-2385 shared-ID mechanism specifically.
4. Repeat for a "clean" activity that shows one model, as the working half of the pair.

## Follow-through the human should own (not executed here)

- **After the diff:** if >1 model confirmed → **link PLT-2909 to PLT-2385** (and PLT-2650 / UX-1109); decide whether it's a duplicate or a new-site instance needing a data cleanup (Rishi's PLT-2385 interim remedy: unlink the spurious model's elements). Only cut fresh FE work for the **presentation gap** (badge/hide zero-contribution model nodes — `useLinkedElementsTreeData.ts:105-116` / `appendModelNodes`) if product wants it (Darminder).
- **Answer "why now" + cohort (playbook #5/#6):** was a model re-uploaded/re-versioned/deleted on ATL05–08, and enumerate every activity across ATL05–08 whose links resolve to >1 model — bulk-remediate (owner: David Webb / BE-data; don't let "why now" drop).
- **Split-off session-id error:** raise as its own ticket once Yash provides the error text; do not merge into this incident.
- **Watch the media** (NEEDS HUMAN): the two panel screenshots confirm the extra models render as empty nodes vs populated ones (distinguishes unloaded-model vs unresolved-dbId path).
- **Post-close:** add a pitfalls entry — "the activity-linking panel shows one node per model that owns *any* linked element (from `project_element_list` via `getModelElementMappingsForElements`); stale/cross-model `activity_links` rows therefore surface as spurious 'linked' models — same root cause as PLT-2385."
</content>
