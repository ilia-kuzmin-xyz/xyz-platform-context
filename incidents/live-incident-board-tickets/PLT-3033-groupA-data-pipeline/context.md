# PLT-3033 — "Extra Parent WBS on Webviewer and inflation of unmapped activity count" — triage context

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3033
- **Issue type:** Live Incident · **Software Area:** Web Viewer (not the Dashboard page)
- **Status:** **Open** · **Priority:** Major
- **Project:** WI1 B11
- **Reporter (Jira):** Yash Patel (support, Freshdesk #7615) · **Assignee:** Darminder Atker · Original
  client reporter: "Matthew" (device: Web Viewer, "Not Usable")
- **Created:** 2026-08-10 11:29
- **Attachments:** **none on Jira** (`attachment: []`) — the three images referenced in the
  description are `blob:` placeholder URLs that never actually uploaded; see §7 NEEDS HUMAN, this is
  a different failure mode from every other ticket's "403/unreadable" attachment gap.
- **Domain slug chosen:** `data-pipeline` — this is a schedule/XER-ingest and category-mapping
  question, not a viewer-rendering or model-geometry one; closest sibling by mechanism is
  PLT-2909/PLT-2884 (metadata artefacts disagreeing after an import), not PLT-3024/PLT-2945
  (viewer-and-model).

---

## 1. What was reported

> The webviewer is showing an extra parent WBS which should not exist and is not visible in the XER
> file for the 2nd Aug schedule for B11. It seems to inflate the unmapped activity count as well,
> which has jumped from less than 1000 to more than 2,500. You can also see that it says the
> activity amount has changed drastically by several thousand, but this was not the case, there
> were only a few hundred changes. I cannot attach the XER files as they are too large...

Two symptoms reported together, both tied to the same 2nd-Aug B11 schedule re-upload:
1. **An extra parent WBS node appears in the Web Viewer's schedule tree that is not present in the
   source XER file.**
2. **The "unmapped activity count" warning jumped from <1000 to >2,500**, while the customer's own
   count of actual schedule changes was "only a few hundred" — i.e. the count inflation looks
   disproportionate to the real edit, which is itself a load-bearing clue (see §4).

**08-10 12:44, Darminder Atker** (the assignee) replied that the description's example images
**are not loading for him either** — he @-mentioned Yash, Pietro and Mostafa asking for them to be
re-sent. **No reply since.** This means the ticket is currently stuck at the pre-triage stage even
internally: the one piece of visual evidence offered has never actually reached anyone, agent or
human.

## 2. Prior-run check (per playbook step 0)

No existing folder — brand new ticket, first run to touch it. No sibling ticket in this board's
history reports a WBS/schedule-tree defect or an unmapped-activity-count spike; this is a new
incident shape for the board. `recurring-defect-patterns.md` has no entry on WBS parsing or
schedule re-import (checked via `grep -ril wbs`/`PLT-3033`, no hits).

## 3. Domain doc check

`xyz-platform-context/dashboard/schedule-tab.md` and `data-pipeline.md` document the **Dashboard
page's** Gantt/schedule pipeline (DuckDB/parquet, `DashboardScheduleService`) — a structurally
similar but **separate implementation** from the Web Viewer's own schedule/Gantt stack that this
ticket's Software Area actually points at. Neither doc describes XER parsing, WBS-tree assembly, or
the "unmapped activities" warning-bar count — this appears to be an undocumented area of the KB.
Worth a `dashboard/pitfalls.md` or new doc entry once the mechanism is confirmed.

## 4. Code findings (hc-frontend) — delegated investigation, condensed

Full pass done by a dedicated agent reading `hc-frontend/src/main/webapp/app`. Two genuinely
separate code paths matter here, and conflating them would mis-diagnose the ticket.

### VERIFIED — two different "WBS" pipelines exist, and only one is untested/risky

**Path 1 — client-side XER parser** (`ViewerPage/components/schedule-upload-service/schedule-parser/schedule-parser.ts`),
used today only to build the **upload preview/diff**, not (as far as this repo shows) to persist
data:
- `getWBS()` (:202-215) maps `PROJWBS` rows with `parent: item.parent_wbs_id ? parseInt(...) : null`.
- `aggregateWBS()` (:246-262): **if a task/WBS row's parent id isn't found among the parsed rows, it
  is silently promoted to root** (`// Parent not found, treat as root`) rather than rejected or
  flagged. `setParentActivityId()` (:308-310) then nulls that node's `parent_activity_id`, and
  nothing downstream can tell it apart from a genuine top-level WBS root.
- **Untested:** `schedule-parser.test.ts` covers `getWBS`/`aggregateWBS` but has no test for a row
  whose parent is missing from the file (the exact branch above).
- **No `proj_id` scoping anywhere in this file** — `parseLines()`/`getActivities()`/`getWBS()` never
  read or filter on `proj_id`. If B11's "2nd Aug" XER is a multi-project P6 export (common when
  cross-project links exist), every `TASK`/`PROJWBS` row in the file — regardless of project — gets
  merged into one tree. This alone would explain **both** symptoms: a foreign project's WBS root
  would look like an "extra parent WBS not in B11's hierarchy," and its activities would inflate any
  count taken over the merged set.
- **Important limiting fact:** `grep -rn "updateScheduleInDb" src/main/webapp` finds **no callers** —
  the method that would apply this parser's diff to the backend appears to be dead code for the
  real upload flow (`use-schedule-form.tsx` calls `uploadFile()`, which posts the **raw XER** to the
  backend and lets it parse independently). **So this exact buggy code is not proven to be on the
  path that produced PLT-3033** — it is architecturally the closest analog found in this repo, not a
  confirmed culprit. The real XER ingest is backend-side and outside `hc-frontend`.

**Path 2 — what the Web Viewer actually renders** (backend-sourced, faithful render, no synthesis):
`scheduler-service/utils.ts` `transformScheduleData()` (:13-96) maps `parent: item.parentItemId`
verbatim with no fallback logic at all — this matches `recurring-defect-patterns.md` **Pattern 2**
("the frontend is a faithful renderer, wrong number is usually upstream"). `webViewerService/schedule-service.tsx`
`validateActivityEligibility()` (:129-185) classifies any activity with `parentActivityId == null`
as `topLevelActivities` — **the same bucket a genuine top-level WBS/EPS root falls into** (:156-167).
A node orphaned by a null parent is therefore structurally indistinguishable from a real root to
every downstream consumer, including `addActivityLevelAttributes()` in `schedule-entity.ts:461-479`.

### VERIFIED — "unmapped activity count" is a category-mapping concept, unrelated to model-element linking

`ViewerPage/components/project-x/entities/schedule-entity.ts`:
- "Mapped" = every required category-type field (Discipline/Package/Phase, per-project) is populated
  on the activity via `getCategoryId()`, checked against `category-mapping-service.ts`'s
  `_mappings: Map<activityId, Set<IActivityCategoryMapping>>` (populated by `loadMappings()`, keyed
  by `activityId`).
- `_getUnmappedActivities()` (:308-348) excludes WBS rows explicitly (`type !== 'WBS'`, :322-324) —
  **so a spurious extra WBS node does not itself add to the unmapped count.**
  `_calculateUnmappedByVisibleFields()` (:355-385) is the dynamic-column variant actually shown.
- Rendered at `gantt-x/warning-bar/warning-bar.tsx:25` ("N un-mapped activities") and gates the
  warning bar's visibility at `gantt-x.tsx:49`; also referenced in `filter-panel/filter-hints.tsx:41-47`.

**What this means for the ticket:** since WBS rows are excluded from the count, the two reported
symptoms are not directly causal on each other through the count formula. **What would inflate the
unmapped count independently of the WBS symptom** is either (a) genuinely new/duplicate non-WBS
activities entering the tree (consistent with multi-project XER merge, H1 above), or (b) existing
mapped activities losing their `activityId` identity match against the persisted mapping map on
re-upload (a parent-reparenting/renumbering side effect), so an unchanged category mapping stops
resolving. Both fit the customer's own framing — "count jumped by thousands, but only a few hundred
real changes" — better than "the customer's changes are simply larger than they think."

### Hypotheses, ranked

**H1 — multi-project XER export not scoped by `proj_id` (both symptoms, one cause).** No proj_id
filtering found anywhere in the client parser; if the real backend ingest has the same gap, every
row from every project in the file merges into one B11 tree. *Falsifiable check, cheapest first:*
`SELECT DISTINCT proj_id FROM PROJWBS` / `TASK` on the actual XER file — more than one value
confirms this immediately. **Confidence this is the shape of the bug: 5/10** — plausible and cheap
to falsify, but unconfirmed without the file.

**H2 — parent-reference loss during re-ingest promotes an orphan WBS row to root, and the same
reparenting churn breaks existing category-mapping identity matches for a branch of activities.**
The client parser demonstrates exactly this shape of bug (`aggregateWBS:256-257`), but is not proven
to be the code that ran on B11's data (dead-code caveat above). **Confidence: 4/10** as the specific
mechanism; higher (7/10) as "the general class of bug this most resembles."

**H3 — id/namespace collision on re-upload** (`activityId2MongoId`/`_createActivityMap` in
`schedule-entity.ts:302`, a plain last-write-wins `Map.set` with no collision detection) causing
some previously-mapped activities to silently lose their mapping association. Not independently
evidenced; flagged because the map construction has no safety net if `activityId`s collide.
**Confidence: 3/10**, speculative.

## 5. What remains unverified

- **The actual backend XER-ingest code** — not in this repository (hc-frontend's Java layer is a
  6-file BFF shell with no schedule-parsing logic). This is the single biggest gap: nothing above
  can be confirmed as PLT-3033's actual mechanism without it.
- **The real 2nd-Aug B11 XER file** — not available. Cannot confirm multi-project scope, a
  missing-parent WBS row, or an id collision without it.
- Whether `updateScheduleInDb()` (the client parser's would-be persistence path) is genuinely dead
  code in production or reachable via some path not found by static search.
- What `fixParentDependencies=true` (`schedule-service.tsx:91`, used on delete for null-parent
  activities) does server-side — suggestive of bespoke backend reparenting logic, not confirmed.
- Contents of the three description images (see §7 — currently unrecoverable even by Jira's own UI).

## 6. Confidence

- **"Unmapped activity count" is a category-mapping concept, computed and rendered exactly as
  described in §4, unrelated to model-element linking: 9/10** — read directly, multiple call sites
  cross-checked.
- **WBS rows are excluded from the unmapped count itself, so the two symptoms are not directly
  causal through that formula: 8/10** — verified in code (`schedule-entity.ts:322-324`).
- **A single upstream mechanism (multi-project XER merge, or parent-reference loss on re-ingest)
  could still explain both symptoms independently of the count formula: 5-6/10** — plausible,
  internally consistent with the customer's own "thousands vs a few hundred" framing, but resting on
  a client-side code path (`schedule-parser.ts`) that is not proven to run on the actual persistence
  path.
- **Overall triage confidence: 4/10.** The Web Viewer's *rendering* code is cleanly read and behaves
  as a faithful renderer (Pattern 2) — this repo cannot go further without either the XER file itself
  or the backend ingest code, neither of which is available here. This is lower than most tickets on
  this board specifically because the mechanism sits in a service outside this repository's reach,
  not because the investigation was shallow.

## 7. NEEDS HUMAN — attachments are broken for everyone, not just this agent

⚠️ **Different from every other ticket's attachment gap on this board.** The three images in the
description are `blob:` staging-media placeholder URLs (`id=UNKNOWN_MEDIA_attachment`) that appear
to have **never actually finished uploading to Jira** — `attachment: []` is empty via the API, and
**Darminder, the human assignee, already confirmed in-thread (08-10 12:44) that the images do not
load for him either.** This is not a permissions/auth gap on this agent's side; it needs Matthew (or
Yash relaying to him) to re-attach the three screenshots as real Jira attachments, not pasted inline
images. Until that happens, nobody — human or agent — can see them. Flagging per the standing rule,
but note this one needs a **re-send**, not just an open-with-different-credentials.

The customer also said the actual XER file is "too large to attach" but offered to send it on
request — that offer has not been taken up in-thread. **The XER file is the single highest-value
artifact for this ticket** (settles H1 in one query) and getting it is more valuable than the three
screenshots.

## 2026-08-19 — reappeared (flipped back from With Technical Support), one blocker cleared, a new one opened

Ticket went quiet 08-10→08-16 (Darminder's 08-10 12:44 re-send ask unanswered), then moved. Fresh
comments since:

- **2026-08-17 10:10/10:12, Yash Patel** — reposts the description, and this time **4 real PNG
  attachments land** (not the broken `blob:` placeholders). The original image-re-send blocker is
  now **cleared**. The XER file offer is repeated verbatim but still not sent.
- **2026-08-17 15:08, Darminder Atker** — first substantive technical reply, now that he can see the
  images: names a specific suspect node, **`'WI-1_W_WT_B11_2026-8.2 - LIVE - DRAFT'`**, as the likely
  extra parent WBS, and asks for **both the previous schedule and the current one** to compare (a
  sharper, concrete refinement of H1 — an unscoped multi-project/EPS export — rather than a new
  mechanism). Status moved to **With Customer** 08-18, consistent with the ball now sitting on that ask.

Re-grepped `schedule-parser.ts` for `DRAFT`/`LIVE`/`proj_id`/`proj_short_name` — zero matches,
reconfirming (not changing) the 08-11 finding: no project/EPS-scoping or draft/live-status filtering
anywhere in this client-side parser (dead-code caveat for the real upload flow still applies).

**Updated confidence: 5/10** (up from 4/10) — improvement is from a sharper, named hypothesis and a
domain-side reply, not from new evidence resolving the mechanism. Still gated on the same class of
artifact (the schedule files) as before. Group tag `groupA` (current status "With Customer") — folder
was already correctly named `PLT-3033-groupA-data-pipeline` (renamed 08-15, before this reopening;
no rename needed now).
