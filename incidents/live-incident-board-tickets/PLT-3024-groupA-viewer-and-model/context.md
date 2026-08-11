# PLT-3024 — "Dashboards not showing models for some disciplines" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3024
- **Issue type:** Live Incident · Software Area: Dashboard
- **Status:** **Open** · **Priority:** Major
- **Project:** ML9
- **Reporter (Jira):** Yash Patel (support) · **Assignee:** Yash Patel (unassigned to an engineer
  yet) · Freshdesk #7608.
- **Created:** 2026-08-06 (brand new this run).
- **Attachments:** 3 screenshots (new dashboard, old dashboard, Web Viewer linked-models list) —
  ⚠️ none opened this run, see §7 NEEDS HUMAN.
- **Domain slug chosen:** `viewer-and-model` — same family as PLT-2945/2906/2923/2874, all of
  which turn on Dashboard-vs-Editor model/element visibility mechanics.

## 1. What was reported

While verifying the new "Non-PowerBI Dashboard" on ML9, the customer found that some models — even
though they have linked elements — aren't showing on that dashboard. **The same absence happens on
the old (PowerBI) dashboard too.** The Web Viewer shows the models' elements correctly linked. One
extra detail dropped in the same comment, not yet followed up: "the old dashboard was not showing
packages and disciplines a couple of days ago" — i.e. there may be an earlier, possibly-related
incident in the same window, not just today's report.

Rishi Bhugobaun (08-06 09:16) replied asking Yash to "ask the user to confirm these models are
present in the Federated model" — his working theory is non-federated models are silently excluded
from Dashboard aggregation. **No comment since has answered that question** — the ticket is
waiting on the customer for that confirmation, so nothing below can be settled further from here;
everything is code-side analysis pending that one fact.

The rest of the comment thread (109054/109059/109060/109061/109062) is Freshdesk auto-sync noise —
four Open↔Waiting-on-customer flips inside 5 minutes with no human content attached to any of
them. Not a signal; see the same pattern independently noted on PLT-3018 this run.

## 2. Prior-run check (per playbook step 0)

No existing folder (brand new ticket). Closest analogues on this board, in order of relevance:

- **PLT-2945** ("Elements missing in the Dashboard for DUB7x") — same top-level shape (visible in
  Web Viewer, absent from Dashboard, no numeric discrepancy on what IS shown), but PLT-2945's
  confirmed mechanism was the **date-range slider** hiding not-yet-planned elements. PLT-3024 is at
  **model** granularity, not element granularity, so the date-slider gate can't be the direct cause
  here (it doesn't remove a whole model, just individual elements within one) — different specific
  mechanism, same family. Now formally the same named pattern — see §4.
- **PLT-2909/PLT-2882** ("ghost models") — the *opposite* symptom: models wrongly appearing as
  linked when their geometry doesn't contain the claimed elements, caused by the Editor's model
  list being built from metadata with no geometry check. PLT-3024 is Dashboard-side and
  geometry-driven in the opposite direction (see §4 for why these are not the same defect).
- `recurring-defect-patterns.md` **Pattern 5** ("Surface-scoped visibility rule mistaken for
  missing data") already existed as a two-occurrence candidate before this run (PLT-2945 +
  the project-level FAQ entry in `dashboard-progress-tab-explained.md` §8.4); PLT-3024 is
  promoted as the third occurrence this run.

## 3. Domain doc check

`dashboard/pitfalls.md` already documents, independently of this ticket, both mechanisms this
investigation leans on:
- "The dashboard loads one federated model, chosen arbitrarily" (`dashboard-project-service.ts:164-175`)
- "'Is linked' must not be inferred from schedule-date presence" (confirmed bug, Viewer fixed via
  #2081/PLT-2743, Dashboard not fixed)

Both entries now cross-reference this ticket (dated additions, 2026-08-07). No domain doc describes
a per-model dashboard filter or model-selection UI — because none exists; see §4.

## 4. Code findings (hc-frontend, branch `claude/vigilant-franklin-zy6tzw`, HEAD `92d0403`, 2026-08-06 14:33)

Full investigation delegated to a dedicated pass; findings below are that pass's conclusions,
condensed. Shallow clone (50 commits, oldest 2026-07-17, no tags) — deploy timing on ML9 cannot be
established from this checkout.

### VERIFIED — the structural fact that frames everything else

**The Dashboard renders exactly one model: the single "federated" model.** No per-model list, no
model filter, no model dimension anywhere on the Dashboard.
- `dashboard-project-service.ts:143-205` `_initializeModel()`: first folder whose name contains
  "federated" (case-insensitive) → first model with that parent (no ordering rule, no
  `isFederated` flag) → its current version. `get models()` (`:313-323`) returns a map with **at
  most that one entry**.
- `use-model-loader.tsx:57-67/307-316` and `navisworks-model-entity.ts:20` both collapse to the
  same single file.
- No `modelName`/`modelId` rendering exists on the Dashboard outside two unrelated panel lines; no
  model dimension exists in `dashboard-filter-service.types.ts`.
- The in-app "federated model" picker is `Coming Soon`, gated behind `hideWIPFeatures`
  (`ModelsTabDetails.tsx:72-90`) — today it's pure folder-name convention, and
  `dashboard-no-model.tsx:65`'s "Set a federated model in the Editor" copy is misleading (there is
  no such setting yet).

**Consequence:** on the Dashboard, "a model is not showing" can only mean its geometry/elements are
absent from the one federated file's rendered set. **This does not, on its own, explain the
progress %/discipline breakdown**, which comes from project-level parquets
(`category_groups`, `project_progress`) not scoped to any one model — so a non-federated model's
elements can still contribute to the headline % while being invisible in 3D and absent from every
element-level count. Worth stating explicitly on the ticket: a correct-looking summary number does
not rule this out.

### Hypotheses, ranked, each a falsifiable prediction

**H1 (Rishi's theory, model-level) — the missing models simply aren't inside the "federated"
folder.** Mechanism confidence 9/10 (verified above); confidence this is ML9's actual cause: 5/10.
*Falsifiable check:* for one named missing model, confirm whether it sits under ML9's `federated`
folder in the Editor's model tree — this is exactly the question already asked and unanswered.
*What kills it:* the old (PowerBI) dashboard has **zero frontend logic** — pure `PowerBIEmbed`
wrapper (`ProgressReportPage.tsx`, `ProjectReportList.tsx`) — so no hc-frontend mechanism can be
common to both surfaces. If the same models really are missing there too, at least one half of the
report has a cause upstream of this repo.

**H2 (if H1 is ruled out — element-level, one model's worth) — links to a superseded schedule
revision resolve to NULL dates and get hidden.** This is the **already-documented, still-unfixed**
`dashboard/pitfalls.md` gap: `api_activities` holds only the current schedule revision
(`api-activities-loader.ts:94-104`), `activity_links` is revision-unaware, and
`buildInstallationStatusCaseSql` derives Planned from date presence, not linkage
(`installation-status-sql.ts:63-66`) — a link to a superseded revision resolves to no dates and
that element is hidden (`dashboard-color-service.ts:489`). Plausible per-model because a model
typically maps to one work package linked in one batch against one schedule revision.
*Falsifiable check (DuckDB, on the page):*
```sql
SELECT COUNT(*) FROM activity_links al
LEFT JOIN api_activities a ON al.activityId = a.itemId
WHERE a.itemId IS NULL;
```
A large non-zero confirms H2. One question settles the premise: **has ML9 had more than one
schedule revision, with a new one made current recently?**

**H3 (date-slider, PLT-2945's mechanism) — cheapest to rule out, unlikely to be the *model*-level
cause but worth checking first regardless**: is the missing model's scope entirely future-dated
relative to the slider's default (today)?

**H4 (stale/wrong svf2-object-id-map artefact)** — `artefact-loader.ts:230-241` falls back to
`matchingByModel[0]` with no recency rule when no version match is found; on a Revit-sourced
federation the map may also be partial (Navisworks-only artefact, `navisworks-model-mapper.ts:277`
vs `revit-model-mapper.ts:22`). Lower-confidence (4/10); checkable via the dev panel's
`svf2MapDetail` line (Ctrl+Shift+D) if someone can reproduce live — dashboard logging itself is
hardcoded `SILENT` (`dashboard-logger.ts:35`), so console logs won't show this.

### Side detail — "packages and disciplines missing a couple of days ago"

Two independently-verified silent filters exist on the **new** dashboard's discipline/package list
(zero-weight exclusion, Pattern 3/PLT-2941; and a second, less documented `actual !== 0 || planned
!== 0` filter dropping not-yet-started disciplines, `progress-queries-v2-api.ts:598-603`) — but
neither applies to the **old (PowerBI)** dashboard the customer specifically named for this detail,
since that surface has no frontend logic at all. If accurate, this points at the **source data**
(activity-category mappings), not a rendering filter.

One dated candidate trigger found in git history: **PLT-2918** (merged 2026-08-05 22:30) fixed a
destructive save in `CategoryMappingService.saveDataMapping()` that had been deleting persisted
category mappings for every type left null in memory, cascading to every descendant activity — its
own commit message reports ~2k WBS Location mappings removed on a different project (AUS01).
Category mappings feed discipline/package on both dashboards. Timing fits ("a couple of days"
before the 08-06 report; the fix landed the evening of 08-05, very likely after ML9's data was
already affected if it hit at all). **Not verified against ML9** — flagged as the best available
lead, not a conclusion. No other commit in the available history (shallow, 50 commits from
2026-07-17) plausibly explains a model or discipline disappearing; see the investigation's full
commit table for the ones ruled out (PLT-2736, PLT-2874, PLT-2935 — all wrong shape or wrong
project).

## 5. Relationship to PLT-2909/2882 ("ghost models")

**Same broad family (metadata vs. geometry divergence across two artefacts), but a different
condition on a different artefact — not the same defect, and not simply "the exclusion side of the
same bug."** PLT-2909/2882 live on the Editor side, where the model list is built from metadata
(`client-element-metas`) with no geometry check, so they **over-include**. PLT-3024 is Dashboard
side, where `element_base_data` is driven **from geometry** (`svf2_object_id_map`) and then
narrowed further by status/date — it **under-includes by construction**. The closer sibling is
PLT-2945 (see §2), and PLT-3024 is now filed as Pattern 5's third occurrence, not folded into
Pattern 1.

One real cross-link worth holding: PLT-2909's confirmed PC-EXCEL cross-write means an element can
claim membership of models it doesn't belong to, inflating the **Editor's** model list without
touching the Dashboard. If ML9 is a PC-EXCEL project, that alone could produce "the Editor shows
this model has linked elements, the Dashboard doesn't show it" **with zero Dashboard-side defect**
— worth asking whether ML9 uses PC-EXCEL imports before assuming H1/H2.

## 6. What remains unverified

- Whether the named missing models are actually inside ML9's `federated` folder (H1) — everything
  hinges on this single fact, already asked of the customer, unanswered.
- Whether the **old (PowerBI)** dashboard is genuinely missing the *same* models, or whether that
  was a looser customer statement — this reorders the whole hypothesis list, since a PowerBI-side
  repro rules out every hc-frontend mechanism above for at least that half.
- Whether ML9 has multiple schedule revisions and when the current one last changed (H2).
- Whether ML9's federated model is Navisworks- or Revit-sourced (bears on H4).
- Whether ML9 uses PC-EXCEL imports (bears on the PLT-2909 cross-link in §5).
- Whether ML9 actually lost category mappings around 08-04/08-05, and whether anyone used the
  schedule data-mapping panel on ML9 in that window (side detail, §4).
- ML9's progress-weighting setting (can independently empty the discipline/package panel, Pattern
  3 — two prior occurrences on this board already).
- Contents of the 3 screenshots (§7).

## 7. NEEDS HUMAN — unopened attachments

**All 3 attachments unopened this run** (new-dashboard screenshot, old-dashboard screenshot,
Web-Viewer-linked-models screenshot — none accessible to the investigating agent). Given the
description is already fairly specific, these are likely corroborative rather than decisive, but
worth a look before replying — in particular the Web Viewer screenshot may already show the
model's name/folder, which would answer the H1 federation question without waiting on the
customer.

## 8. Confidence

- **Dashboard renders exactly one federated model, everything element-level derives from it: 9/10**
  — verified across four files, and independently corroborated by pre-existing `pitfalls.md`
  entries written before this ticket existed.
- **H1 (not-in-federation) as ML9's actual cause: 5/10** — fits Rishi's theory and the
  Viewer-vs-Dashboard asymmetry, does not by itself explain the PowerBI half of the report.
- **H2 (superseded schedule revision) as a real, currently-unfixed code defect: 8/10.** As ML9's
  trigger: 4/10.
- **PLT-2918 as the trigger for the discipline/package side detail: 4/10** — right shape, right
  date, right blast radius, zero ML9-specific evidence.
- **Distinct from PLT-2909/2882: 8/10.**
- **Overall triage confidence: 6/10.** The mechanisms are read line-by-line with confidence in what
  the code does; choosing between H1/H2/H4 needs ML9 data unavailable from this repo, and the
  single most load-bearing fact on the ticket (same absence on PowerBI) currently points away from
  every pure-frontend mechanism found.

## 9. Re-verified 2026-08-10 (light pass, this run)

Live fetch: 8 comments (unchanged), `updated = 2026-08-07T13:41:13+01:00`, status still `With
Customer`. Nothing beyond the four Freshdesk auto-sync flips already recorded — no human reply.
Rishi's 08-06 federation question is now **4 days unanswered**. The internal draft in
`recommended-action.md` (code-side answer to Rishi's own question) still hasn't been posted. Also
confirmed this run: **PLT-2918 is merged** (the destructive category-mapping save bug — best
available lead for the "packages/disciplines missing a couple of days ago" side detail) — its own
ticket is now `Ready For QA`, consistent with the fix landing 08-05 as this file already recorded.
Still nothing ML9-specific to confirm it. No re-diagnosis performed; nothing material changed.

## 10. Re-verified 2026-08-11 (light pass, this run)

Live fetch: 10 comments total (2 new since the 08-10 pass), `updated = 2026-08-10T11:34:14+01:00`.
**Both new comments are Freshdesk auto-sync noise** (`109259` Waiting-on-customer, `109260` Open,
both timestamped 2026-08-10T11:34, one second apart) — the same bare-flip pattern this file already
documents four times over on 08-06/08-07, not a human reply. Status in the live board sweep reads
`Open` right now purely because of where that flip-pair landed; not a real reopen. **No human
content since Rishi's 08-06 09:16 federation question — now 5 days unanswered.** No re-diagnosis
performed; nothing material changed. The internal draft answering Rishi's own question
(`recommended-action.md`) still hasn't been posted — now the second-longest-unposted draft on the
board after PLT-2858's escalation.
