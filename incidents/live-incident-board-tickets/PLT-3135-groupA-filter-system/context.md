# PLT-3135 — Issue while adding Disciplines/Packages in web viewer

**Raised** 2026-09-17 09:45 by Yash Patel (customer: Mostafa Kamel Hussien relaying)
**Status** In Analysis · Medium · assignee Darminder Atker · Live Incident
**First triaged here** 2026-09-17 (this file). Group A, new ticket, no prior folder.

## Description (verbatim)

> While trying to add a discipline to a project, we noticed that after clicking **Save Changes**, the
> discipline was not added when we checked the **Attributes** page.
>
> Could we please look into this issue?

## Comment timeline (who owes what, to whom)

| When (BST) | Who | What |
|---|---|---|
| 09-17 09:47 | Yash Patel | Repro steps: Attributes config → add Discipline → Save Changes → refresh → the new Discipline is absent. Asks whether it *fails to save* or *fails to display*. Attaches the screen recording. @-mentions Darminder + Mostafa. |
| 09-17 12:02 | Rishi Bhugobaun | **The narrowing fact.** It happens when *another* attribute has a first-level category with the same name. Worked example: `Discipline` has `Zone 1`, and the `Zone` attribute also has `Zone 1` → creating Package `Zone 1 > Zone 1.1` fails; creating `Zone 2` first and then `Zone 2 > Zone 2.1` works, because `Zone 2` does not exist in the `Zone` attribute. |
| 09-17 13:02 | Darminder Atker | Diagnosis + 6 screenshots. States the POST payload "appears correct", but on the GET the row's `parentCategoryType` comes back as `Zone` when it should be `Discipline`. Says a backend update is needed, @-mentions Sachin Badoni and Ali Seyedof, and asks them: *"Maybe if we pass parentCategoryType or parentcategory id from frontend payload it would help set this correctly?"* |
| 09-17 13:04 | Darminder Atker | Workaround found by Mostafa: delete the `Zone` top-level attribute first, then add under Discipline/Package, and it stores correctly. |

**Who is waiting on whom:** Darminder asked **Sachin Badoni and Ali Seyedof** a direct question at
13:02 on 09-17 and has had no reply on the ticket. Nobody is waiting on us for the customer; a
workaround is already with them. The ticket is 1 day old at time of writing — this is not yet a
stale-chase situation, but the open question is answerable from code, which is why it is worth
answering rather than waiting (see `recommended-action.md`).

## Media — unopenable from this session, flagged per the standing rule

Metadata only; content fetch is 403 for this session's Atlassian credentials (2026-09-08 standing
rule — not re-proved here).

| Id | Filename | What it would settle |
|---|---|---|
| `64835` | `image-20260917-120100.png` | **The decisive one.** It is Darminder's screenshot of the outgoing POST body. Code reading below says the Attributes save path builds a payload with **no `parentCategoryType` key at all**. This screenshot either confirms that (the field is absent) or falsifies it (it is present, meaning a different save path than the one traced below produced it). Everything else in this file hangs off which it is. |
| `64834` | `image-20260917-120023.png` | The GET response with the wrong `parentCategoryType: "Zone"`, and the `Test`-in-`Zone2` row Darminder says is the correct shape. Would confirm the exact response field names and whether `parentActivityCategoryId` also points at the wrong parent, or only the type string is wrong. |
| `64837` | `image-20260917-120207.png` | Top-level attribute list — confirms both `Discipline/Package` and `Zone` exist as separate category types on this project. |
| `64838` | `image-20260917-120150.png` | `Zone1` inside the `Zone` attribute. |
| `64833` | `image-20260917-120131.png` | `Zone1` inside `Discipline/Package` — i.e. the collision itself. |
| `64836` | `image-20260917-120117.png` | The add of child `Zone1TestAdd` under `Zone 1` in Discipline/Package. Would confirm at which hierarchy level the child was added. |
| `64829`, `64830` | `Screen Recording 2026-09-17 at 09.33.13.mov` (4.96 MB, uploaded twice) | Yash's original repro. Would show whether the save returns an error toast or silently succeeds, and whether the missing item is absent from the page or merely displayed in the wrong group. |

**Neither the project key nor the project id is stated anywhere in the ticket.** Not in the
description, not in any comment, not in the summary. That is a gap a human should fill before any
live check.

## Domain cross-reference

`dashboard/flt-filter-system.md` § "Package identity — id-keyed (PLT-2821)" (`:93-107`) is the
directly relevant piece of architecture, and it frames this ticket exactly:

> "Package display names are NOT unique (same name can exist under several disciplines), so
> `filters.package` holds `activityCategoryId`s, not names."

That was PLT-2821's fix on the **read/filter** side. The ticket in hand is the same collision on the
**write** side, one level up: the Attributes page creates categories keyed by *parent name*, with no
type or id scoping, so a name that repeats across two different category types collides. The same
section's closing line — *"Discipline + dynamic category types are still name-keyed (see roadmap)"* —
is the standing acknowledgement that the id-keying was never finished beyond packages.

`recurring-defect-patterns.md` has the nearest shape as a **candidate** pattern, not a promoted one:
*"Name-based fallback join across an id-keyed hierarchy, 2026-08-12"* (PLT-3040, CH08-Minooka) —
a duplicate display name under two parents, joined by bare name because no id match was found. That
entry is about a **read** join (`use-progress-panel-data.tsx:253-259`); this ticket is the write path.
Same root disease (names used as keys in a hierarchy that has ids), different organ. **If this one
confirms, PLT-3040's candidate entry is a step closer to promotion, but it is not the same code and
the diagnostic there does not apply here.**

## Code trace (read this run; file:line on every claim)

Two repositories are involved. Both were read.

### Frontend — `hc-frontend`, the Attributes tab

**The save path the customer used.** Attributes slider → Save. New entries are collected by
`collectAndFormatAddEntries`
(`src/main/webapp/app/pages/PortfolioPage/components/ProjectSettings/AttributeTab/useAttributeSliderMethods.ts:790-854`)
and POSTed at `:1041-1045`. The payload object type is declared at `:792-798` and built at `:829-835`:

```
{ categoryType, categoryName, categoryDescription?, parentCategoryName, level }
```

**There is no `parentCategoryType` field in it, and no parent id either.** The parent is identified
to the backend by `parentCategoryName` (`:817-822`) plus `level` (`:834`) — nothing more.

**The second save path does the same thing.** `useAttributeState.ts` builds a richer internal object
that *does* carry `parentCategoryType` (`useAttributeState.ts:665-666`), but the mapping immediately
before the POST strips it back to the same five fields (`useAttributeState.ts:837-843`, POST at
`:848`). So on both paths the type is computed and then discarded.

**The transport.** `upsertCategories` POSTs to `/projects/{projectId}/activities/categories` with
`new_format: true` (`src/main/webapp/app/services/activityService/activity-api-service.ts:109-115`).
That query flag is what selects the backend branch below, and it matters.

**The type allows the field.** `IActivityCategoryCreate` declares `parentCategoryType?: string | null`
(`activity-api-service.types.ts:47-55`), and other helper methods in the same service *do* populate it
(`createCategoryWithType` at `activity-api-service.ts:279-292`, `createCategoryHierarchy` at
`:296-330`). Those helpers are not what the Attributes tab calls. So the field is a supported part of
the contract that this particular screen does not use.

**Display side — why a wrong `parentCategoryType` on the GET makes the row vanish rather than appear
in the wrong place.** The Attributes page reconstructs the type hierarchy from the *data*, not from
configuration: `useAttributeState.ts:130-145` walks the fetched categories and, for each category type,
takes the **first** row whose `parentCategoryType` differs from its own type name as the definitive
child→parent type relationship (`:141-143`, with `break` at `:144`). Root types are then whatever is
left over (`:147-153`), and groups are assembled from those roots (`:156` onward). A single row
carrying `parentCategoryType: "Zone"` is therefore enough to re-parent an entire type in the page's
model of the hierarchy. This is a plausible mechanism for "the discipline I added is simply not on the
page" — but see § unverified: it is a static read, not a reproduction.

### Backend — `XYZPlatformApi`, the receiving endpoint

**The new-format branch drops the field outright.** `createActivityCategories` routes on the query flag
(`src/api/v2/projects/activities/activities.categories.controller.ts:33-43`). The new-format handler
re-maps each incoming item to exactly five keys —
`categoryName, categoryType, level, parentCategoryName, categoryDescription`
(`:45-58`). `parentCategoryType` is not among them. The DTO it maps into has no such field either
(`src/models/ingress.ts:129-135`). The **old** format's DTO does (`ingress.ts:137-143`), and the old
validator explicitly accepts it (`activities.categories.validators.ts:44-60`), while the new validator
does not mention it at all (`:62-78`).

**So the answer to Darminder's 13:02 question is "yes, but it needs both sides."** Sending
`parentCategoryType` from the frontend alone would change nothing: it would be dropped at
`activities.categories.controller.ts:49-58` before reaching the database.

**A dead validation, worth knowing about.** `validateCategoryTypeHierarchy`
(`activities.categories.helpers.ts:99-124`) is the rule that would catch a Package being parented to a
`Zone` — it is guarded by `if (cat.parentCategoryType)` at `:101`. It is reached on the new-format path
(`controller.ts:65` → `validateCreationPayload` → `helpers.ts:83-95`), but by then the field has already
been stripped, so the guard is always false and **the hierarchy check is a silent no-op on every
new-format request**. That is why a structurally wrong parenting produces no 400.

**Parent matching in the payload validator is name-keyed, unscoped by type.**
`validateCategoryTypesAndParentLevels` (`helpers.ts:20-57`) builds `categoryNameToLevel` keyed on
`categoryName` alone (`:38-41`), records only the *first* level seen for a name (`:39`), and then
resolves each child's parent by that bare name (`:47-48`). Two categories called `Zone 1` under
different types are one entry in that map. This is a payload-level check only — but it is the same
name-as-key assumption, in our code, one layer above the database.

**The actual parent resolution is in SQL we do not have here.** The insert calls
`CALL xyz."usp_InsertActivityCategoryV2"($1, $2)`
(`src/services/activities.categories.service.ts:16`, invoked at `:75-83`). The stored procedure lives
in the separate DB-functions repository, which is not checked out in this environment (searched; no
file by that name anywhere on disk). **The line that decides which `Zone 1` becomes the parent is
inside that procedure and was not read.** Everything above establishes that the procedure is handed
only a name and a level and therefore *cannot* disambiguate — it does not establish what it does with
the ambiguity.

## Verified vs inferred

**Verified (read in code or in Jira this run):**
- The Attributes save payload contains no `parentCategoryType` and no parent id — only
  `parentCategoryName` + `level` (`useAttributeSliderMethods.ts:792-798, 829-835`;
  `useAttributeState.ts:837-843`).
- The frontend POSTs with `new_format: true` (`activity-api-service.ts:109-115`).
- The backend's new-format handler does not carry `parentCategoryType` into its DTO
  (`activities.categories.controller.ts:45-58`; `ingress.ts:129-135`), while the old format does
  (`ingress.ts:137-143`; `validators.ts:44-60`).
- `validateCategoryTypeHierarchy` cannot fire on the new-format path, because its only guard is the
  field that was just stripped (`helpers.ts:99-124`, guard at `:101`).
- The payload validator's parent lookup is keyed on bare `categoryName` (`helpers.ts:38-41, 47-48`).
- The Attributes page derives the type hierarchy from row data and lets one row's
  `parentCategoryType` set a whole type's parent (`useAttributeState.ts:141-144`).
- Jira facts: the four comments, their authors and timestamps, the seven attachments, status
  In Analysis, assignee Darminder, reporter Yash, created 09-17 09:45.

**Inferred (reasoning on top of the above, not observed):**
- That the stored procedure resolves the parent by name (+level) and picks the wrong `Zone 1`. This
  follows from *what it is given*, not from reading it.
- That the wrong `parentCategoryType` on the GET is what removes the row from the Attributes page,
  via the type-relationship walk. Consistent with the report; not reproduced.
- That Darminder's "payload appears correct" refers to the name/type/level fields being right rather
  than to `parentCategoryType` being present. Screenshot `64835` settles this and it is unopenable
  here.
- That both the Discipline row and the Zone row sit at the same level, which is what makes level
  insufficient as a tie-breaker. Rishi's "1st level category with the same name" (12:02) says so in
  words; no data confirms it.

## What remains unverified

- **The contents of `usp_InsertActivityCategoryV2`.** Not in this checkout. It is the only place the
  wrong parent can actually be chosen, and no fix should be specified without reading it.
- **Whether the POST really omits `parentCategoryType`** on the customer's actual request. Attachment
  `64835` shows it; we cannot open it. If it *is* present, the trace above is pointed at the wrong
  save path and needs redoing.
- **Whether `parentActivityCategoryId` is also wrong on the GET**, or only the type string. That
  distinguishes "stored against the wrong parent" from "stored correctly, described wrongly", and
  they need different fixes. Attachment `64834` would show it.
- **Which project this is.** Not stated anywhere in the ticket.
- **Whether the row is actually written at all.** Yash's original question ("failing to save, or
  failing to display?") has not been answered in the thread by anyone. Darminder's GET screenshot
  implies it *is* written (with a wrong parent), which would answer it — but that is read off a
  screenshot description, not the screenshot.
- **Cohort.** Whether any other project has a name colliding across two category types. Nobody has
  asked, and it is a cheap query for whoever has DB access.

## 2026-09-21 — re-check, unchanged

Re-fetched the live issue (`getJiraIssue`, fields incl. `comment`, `attachment`). No change since
09-17:

- **Status:** still In Analysis. **Assignee:** still Darminder Atker. **`updated`:** still
  `2026-09-17T13:04:33` — the timestamp of Darminder's workaround comment (112413), i.e. nothing has
  touched the issue since.
- **Comments:** still exactly 4, same ids (112393, 112407, 112412, 112413). Neither Sachin Badoni
  nor Ali Seyedof has replied to the 13:02 question. **The open question is now 4 days unanswered**
  (09-17 → 09-21).
- **Attachments:** still exactly 8 (64829, 64830, 64833–64838), same filenames/sizes/authors as
  recorded above.
- **Attachments 64835 and 64834 re-tried directly** (`curl` against
  `attachment/content/<id>`, per the 2026-09-08 standing rule): both still `403
  {"errorMessages":["You do not have permission to view attachment with id: <id>"]}`. No change from
  09-18. Per that rule's guidance, not retrying again next run unless something about session
  credentials changes.

No new information this run. `recommended-action.md`'s classification (2) and draft reply stand
unchanged — see that file for whether it is still the right call to send now that the question has
gone unanswered for 4 days.

## 2026-09-22 — re-check, unchanged

Re-fetched the live issue: status still **In Analysis**, assignee still Darminder Atker, still
exactly **4 comments**, same ids. Neither Sachin Badoni nor Ali Seyedof has replied to the 09-17
question — now **5 days** unanswered. Same 8 attachments, no new one. `recommended-action.md`'s
draft reply (97 words, to Darminder) stands unchanged and unposted.
