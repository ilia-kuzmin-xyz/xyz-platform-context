# PLT-3051 — "LVN BL1-2 Element metadata not showing" — triage context

## 2026-09-01 — confirmed unchanged, delta-checked against live Jira

Status still **With Customer**. Last comment still 110548 (Yash, 08-27, Freshdesk sync to "Waiting
on customer" right after the preceding "Closed" sync). Fix was verified on Staging 26.3.5 by QA
(110086, 08-20) and Freshdesk moved to "Awaiting release" then back to customer-facing sync states.
No customer confirmation on production yet. Nothing new to investigate.

- **Jira:** https://xyzreality.atlassian.net/browse/PLT-3051
- **Type:** Live Incident · **Status:** In Analysis (Group A) · **Priority:** Major
- **Project:** LVN BL1-2 · **Reporter:** Yash Patel · **Assignee:** Darminder Atker
- **Created:** 2026-08-11 · **Last updated:** 2026-08-13 · **Attachments:** 2 PNGs (see §6)
- **Domain slug:** `viewer-and-model` — the panel, the property fetch and the model-type split all
  live in `dashboard/viewer-and-model.md`'s territory (Forge property DB, `skipPropertyDb`,
  Revit-vs-Navisworks mappers). Same family as PLT-2874/2906/2923/2945/3024.
- Triage date: **2026-08-14** (first pass, new folder).

## 2026-08-28 — reappeared on the board, and it is not a new incident: H1 confirmed, fixed, shipped, QA-verified, now waiting on the customer

**Correction to how this ticket reached today's sweep.** It was handed over as "brand new, no
existing folder" — it is neither. This folder has existed since 08-14 (below), and Jira's own
history (re-fetched live, 9 comments, full thread) shows the whole arc happened already:

- **08-14, 17:11** — transitioned In Analysis → In Code Review, no comment (recorded below as the
  08-17 "left scope" entry).
- **08-14 comment (109705, Darminder)** — the fix, and it is **exactly H1**, confirmed: the hardcoded
  five-category whitelist in `element-properties-service.ts` is gone. Single-element selections now
  fetch every Forge category and build sections dynamically, excluding only Forge's internal
  `__`-prefixed scene-graph categories and `Document` (file-path/workshare metadata, not element
  data). This is precisely the fix this folder's 08-14 `recommended-action.md` described *before
  Darminder posted it* ("stop hardcoding `DEFAULT_SECTION_NAMES`... build the section map from
  whatever `displayCategory` values the model returns, keeping the five as an ordering preference").
- **08-20** — Darminder's dev test (110066, video attached) and **Gennaro's QA verification on
  Staging 26.3.5** (110086): *"Verified fixed... Tested using the Rewind tool."* Freshdesk →
  Awaiting release same day.
- **08-24** — release **26.3.5** shipped (`fixVersions` on the ticket, confirmed live).
- **08-25** — Freshdesk → Waiting on customer.
- **08-27, 12:20-12:21** — Freshdesk cycled **Closed → Waiting on customer** with no comment
  attached either transition. This is what pushed the ticket's Jira status back to **With Customer**
  and pulled it back onto this routine's board query — not a new report, a released-fix ticket
  waiting on the customer's own confirmation, most likely an automated Freshdesk re-open or a
  same-day "actually still checking" from Yash. No text explains which.

**None of H0/H2/H3/H4 were needed** — the fix matches H1 exactly and QA confirmed it before this
routine ever needed to distinguish the alternatives. The two attachments that were 403 in the 08-14
pass were never needed either.

**Recommended action: none.** The defect is fixed, deployed, and QA-verified. Nothing is owed to
Darminder or Gennaro. The only open thread is Freshdesk's own state, which is the support team's
process, not an engineering question — worth a light touch if it's still cycling in a few days, not
a Jira comment from this routine. Confidence 9/10 this ticket needs no further code work; the 1
point held back is not knowing why Freshdesk flipped Closed→Waiting-on-customer same-minute on
08-27 without a visible comment.

---

## 2026-08-17 — left scope (In Code Review)

Transitioned **In Analysis → In Code Review** on 2026-08-14 17:11, no new Jira comment attached.
Same "drafted action landed off-Jira" shape as PLT-3040 (08-12), PLT-3033 (08-11), PLT-2906 (08-05):
reads as Darminder having run the `getBulkProperties2` console check from §5 below, confirmed one of
H0-H4 (most likely H1, the hardcoded five-category whitelist), and written a fix. No re-investigation
done this run; folder tag kept `-groupA-` per the standing precedent (transitioned out mid-flight, not
resolved by this routine). The two attachments that were 403 for this run (§6) are now moot for
triage purposes, whatever they showed fed into the fix directly rather than through here.

## 1. What is reported

> "The element metadata is not visible in the Web Viewer. However, the elements in Revit they do
> have it."

Comments, both 2026-08-13:
1. **Pietro Desiato:** "@Darminder this info should be available via the forge apis?"
2. **Darminder Atker:** "@Pietro it should be linked up with Forge to provide that data. Will check
   if its a bug"

Genuinely open — Darminder is mid-investigation and nothing further has been posted. Nobody is
waiting on us; the ticket is correctly assigned and correctly in In Analysis.

## 2. Prior-run check (playbook step 0)

No existing folder. Related, and used below:
- **PLT-2909** established that Revit models get their id mapping from **Forge's property DB at
  load time** (`revit-model-mapper.ts:22-35`, re-verified this run at
  `services/model-loaders/revit-model-mapper.ts:22`), while `svf2-object-id-map` is emitted for the
  **Navisworks path only** (`navisworks-model-mapper.ts:268-285`). That is about *id mapping*, not
  about *property display*, and the two are separate concerns — but it is why the Revit/Navisworks
  split is the first thing to establish here too.
- `dashboard/viewer-and-model.md` §"Element tooltips (Dashboard)" documents that the **Dashboard**
  viewer loads with `skipPropertyDb: true` and therefore has no Forge properties at all. That
  distinction turns out to be load-bearing — see H0.

## 3. Where the Web Viewer's element metadata actually comes from (VERIFIED in code)

Branch `claude/vigilant-franklin-icxmur`, HEAD `b700eb3`. Paths relative to
`hc-frontend/src/main/webapp/`.

Selecting an element in the Web Viewer renders `SceneProperties`
(`app/pages/organisation/ViewerPage/components/viewer-x/components/blocks/properties/properties.tsx:39`
— `lastSelectedEntity?.type === 'element'`). That panel has **two independent halves**, and which
one is empty is the whole diagnosis:

- **Header metadata** (Name, Element ID, Model) — `element-properties-service.ts:236-262`, built
  from the selection store and the instance tree, **not** from Forge properties.
- **Property sections** (the accordions: Constraints, Identity Data, Phasing, Dimensions, Other) —
  `element-properties-service.ts:189-214`, fetched from Forge via `getBulkProperties2`.

### The property DB *is* loaded in the Web Viewer

`viewer-service.ts:948-953`:

```ts
this._isDashboard
  ? this._aggregatedView.load(bubble, { skipPropertyDb: true })
  : this._aggregatedView.load(bubble)
```

So Pietro's and Darminder's premise is right: on the Web Viewer the Forge property database is
requested in full. The Dashboard's viewer is the opposite — `use-model-loader.tsx:239-244` sets
`skipPropertyDb: true` unconditionally, with the comment "Skip property database for performance in
dashboard".

## 4. Hypotheses, each stated as a prediction one check falsifies

### H0 — the user was on the Dashboard's 3D viewer, not the Editor's Web Viewer. VERIFIED mechanism, unknown applicability.
The Dashboard viewer has no Forge property database at all (`use-model-loader.tsx:244`), so element
properties are structurally unavailable there; the Dashboard substitutes a name-only tooltip read
from `client-element-metas` parquet (`artefact-loader.ts:109`). "Web Viewer" is used loosely across
these tickets for both surfaces. **Falsifiable in one question:** which page — the Editor, or the
Dashboard's 3D view? If it is the Dashboard, this is by design and the ticket is a product question,
not a bug.

### H1 (leading) — a hardcoded five-category whitelist drops every other Revit parameter group. VERIFIED in code; applicability to LVN BL1-2 unverified.

`element-properties-service.ts:7`:

```ts
const DEFAULT_SECTION_NAMES = ['Constraints', 'Identity Data', 'Phasing', 'Dimensions', 'Other']
```

That list is applied **twice**:
- as Forge's own `categoryFilter` on the fetch — `:171-173`,
  `model.getBulkProperties2(chunk, { categoryFilter: sectionNames, ignoreHidden: true }, …)`;
- and again on receipt — `:200`, `if (!sectionsMap.has(displayCategory)) return`, which silently
  discards any property whose `displayCategory` is not one of the five.

Revit exposes far more parameter groups than five (Materials and Finishes, Structural, Mechanical,
Electrical, Plumbing, Construction, Graphics, Text, Data, IFC Parameters, Analytical Model, plus
type parameters and any shared/project parameter group the customer defined). **Every one of those
is fetched-out and then dropped**, with no log and no UI hint.

Worse for the symptom: `_createSectionsArray` (`:216-233`) emits **all five sections
unconditionally**, empty or not. So a model whose metadata lives outside the whitelist renders as
*five accordion headers with nothing inside them* — which is exactly what "metadata not showing,
but Revit has it" looks like.

**Falsifiable in one screenshot:** does the panel show five named-but-empty accordions, or is it
blank? Five empty accordions ⇒ H1 (or H2). Blank ⇒ H4.

### H2 — the model is a Navisworks export, so Revit's parameter-group names no longer exist. SPECULATIVE on the Navisworks half, verified on ours.

The model-type split is real and explicit: `model-mapping-service.ts:313` treats `fileType === 'rvt'`
as Revit, `:321-323` treats `'nwd'`/`'nwc'` as Navisworks. What is **not** verifiable from this repo
is what a Navisworks-exported SVF2 reports as `displayCategory` — but Navisworks is known to
re-tab Revit parameters under its own headings ("Element", "Item", "Revit Type", …), none of which
match the five whitelist names. If LVN BL1-2's federation is NWD-sourced, H1 fires on **every**
element in the project, which matches a report phrased at project scope rather than about specific
elements. **Falsifiable:** the model's `fileType` (Editor model tree / model details), plus the raw
category names — see §5.

### H3 — more than one element was selected, in which case the sections are empty *by design* until expanded. VERIFIED in code.

`scene-properties.tsx:71-73` passes `sections = selectedElements.size > 1 ? [] : undefined`, and
`updatePropertiesData` skips all processing when the filter is present but empty
(`element-properties-service.ts:130-131`, `if (sectionsFilter && sectionsFilter.length === 0)
continue`). Sections are only fetched for a multi-selection once the user **expands** an accordion
(`scene-properties.tsx:84-88`). So a multi-select shows five empty accordions until clicked open.
This is a deliberate performance behaviour, not a defect, and it produces the reported symptom
exactly. **Falsifiable in ten seconds:** select exactly one element and look again.

### H4 — the panel renders nothing at all because the metadata builder threw. VERIFIED as a code path; no evidence it fired.

`element-properties-service.ts:28` calls `model.getInstanceTree().getNodeName(dbId)` with **no null
guard**, inside `_createMetadataArray`, inside `updatePropertiesData`. If the instance tree is
absent the promise rejects, `getProperties` in `scene-properties.tsx:48-51` has no `catch`,
`properties` stays `undefined`, and `scene-properties.tsx:106` returns `null` — **the entire panel
disappears**, header included. This is the discriminator between "sections are empty" and "there is
no panel". It is also the only hypothesis here that would produce a console error.

### Ruled out this run
- **"We skip the property DB in the Web Viewer."** No — `viewer-service.ts:948-953` loads it in full
  outside the Dashboard. This is the obvious first guess and it is wrong for the Editor.
- **Anything to do with `svf2-object-id-map`.** Property display never touches it; the artefact is
  an id map consumed by the Dashboard's colour pipeline only. The PLT-2909 Revit/Navisworks artefact
  finding is relevant here as *context for which mapper runs*, not as a cause.

## 5. The one console check worth giving Darminder

Everything above turns on **what `displayCategory` values the model actually returns**, and the
whitelist means we can never see them in the UI. On the Editor page, with one element selected:

```js
// dbId + model of the current selection, then ask Forge for EVERY category
const sel = NOP_VIEWER.getAggregateSelection()[0]
sel.model.getBulkProperties2(sel.selection.slice(0, 1), { ignoreHidden: false }, r =>
  console.table(r[0].properties.map(p => ({ cat: p.displayCategory, name: p.displayName, val: p.displayValue })))
)
```

No `categoryFilter`, so nothing is filtered out. Three possible outcomes, each decisive:
- **Rows come back with categories outside the five** ⇒ H1/H2 confirmed; the fix is to stop
  hardcoding `DEFAULT_SECTION_NAMES` and group by whatever categories the model returns.
- **Rows come back and their categories *are* among the five** ⇒ H1 is dead; look at H3 then H4.
- **No rows / empty properties** ⇒ the property DB genuinely has nothing for this element, and it
  is a translation/publish question for the model, upstream of this repo. That is the only branch
  where "ask Forge" is the right next move.

⚠️ Uses `NOP_VIEWER`, the Forge global — worth confirming it is exposed on the build Darminder is
testing before sending this; if not, the same call works off the viewer instance the page holds.

## 6. NEEDS HUMAN — attachments could not be opened

Both images are **inaccessible to this run**: `image-20260813-133539.png` (id 62643) and
`image-20260813-133547.png` (id 62642). Fetching
`https://api.atlassian.com/ex/jira/1ebfaaab-…/rest/api/3/attachment/content/62643` returns
**HTTP 403** — the attachment-content endpoint needs an authenticated Atlassian session, and the
read-only Jira MCP tools available here expose issue fields and comments, not attachment binaries.
Do not guess at their contents.

**What they would settle, in priority order:**
1. **Blank panel vs five empty accordions** — this single visual splits H4 from H1/H2/H3 and is
   probably visible in the first screenshot without any further investigation.
2. **How many elements are selected** (the header reads "N selected",
   `element-properties-service.ts:147`) — settles H3 outright.
3. Which surface it is — Editor or Dashboard 3D view (settles H0), and the model's name, which
   usually reveals whether it is an RVT or an NWD federation (bears on H2).

## 7. Verified vs inferred

**Verified by reading code this run:**
- Element property sections come from `getBulkProperties2` with a hardcoded five-name
  `categoryFilter`, and are filtered a second time on receipt against the same five names
  (`element-properties-service.ts:7,171-173,200`).
- All five sections render whether or not they have content (`:216-233`), so "empty accordions" is
  the natural failure appearance.
- The Web Viewer loads the full Forge property DB; the Dashboard viewer does not
  (`viewer-service.ts:948-953`, `use-model-loader.tsx:239-244`).
- A multi-selection yields empty sections until an accordion is expanded
  (`scene-properties.tsx:71-73,84-88`; `element-properties-service.ts:130-131`).
- An unguarded `getInstanceTree()` dereference can blank the whole panel
  (`element-properties-service.ts:28`; `scene-properties.tsx:48-51,106`).
- Revit/Navisworks are dispatched on `fileType` `rvt` vs `nwd`/`nwc`
  (`model-mapping-service.ts:313,321-323`).

**Inferred, not verified:**
- That Navisworks-exported models report parameter categories under different names than Revit's
  (H2's core claim). Plausible and widely true of Navisworks, but nothing in this repo proves it and
  I could not run anything.
- That LVN BL1-2's federation is NWD rather than RVT. Unknown.
- That H1 is the actual cause. It is the best fit for "Revit has it, the viewer doesn't", but every
  one of H0/H1/H2/H3/H4 produces a superficially identical report.

**Cannot be verified from here at all:**
- Which surface, which model, how many elements were selected, and whether the panel is blank or
  empty — all four are in the two screenshots, and the screenshots are 403.
- Whether the property DB itself is populated for these elements. That is the one thing that
  genuinely needs Forge, and it is the last branch of the §5 check, not the first.
- Nothing in this repo was built, type-checked or executed.

---

## 2026-08-31 — confirmed unchanged since 08-28. The customer still has not confirmed.

Live `getJiraIssue` re-fetch (fields `status`, `updated`, `comment`, `assignee`, `fixVersions`),
checked verbatim against the 08-28 record above:

| Field | 08-28 record | 08-31 live | |
|---|---|---|---|
| Status | With Customer | **With Customer** | unchanged |
| `updated` | 2026-08-27T12:21:05+0100 | **2026-08-27T12:21:05+0100** | **byte-identical** |
| Comments | 9 (`total: 9`) | **9** | unchanged, newest still 110548 |
| Newest comment | 110548, Yash, 08-27 12:20:50, "Freshdesk → Waiting on customer" | same | unchanged |
| Assignee / fixVersion | Yash Patel / 26.3.5 (released 08-24) | same | unchanged |

**Nothing has moved in four days.** No customer confirmation, no new comment of any kind, and the
Freshdesk flap that pulled this back onto the board (Closed 12:20:10 → Waiting on customer 12:20:50 on
08-27, 40 seconds apart, no text on either) still has no explanation attached.

**Recommended action: still none, unchanged from 08-28.** The fix shipped in 26.3.5 and Gennaro
QA-verified it on Staging on 08-20. The only open item is whether the customer has confirmed, which is
a support-process question owned by Yash, not an engineering one. The 08-28 entry suggested "a light
touch if it's still cycling in a few days" — it is now a few days and it is *not* cycling, it is simply
silent, which is the ordinary shape of a released fix awaiting a customer reply. **Still not worth a
Jira comment from this routine.** If it is still silent at the next sweep (~09-04, a full week on
Waiting on customer) that would be the point to ask Yash privately whether the customer has been
chased — one line, off Jira, not a ticket comment.

Confidence unchanged at 9/10 that no further code work is needed; the withheld point is still the
unexplained same-minute Freshdesk transition on 08-27.
