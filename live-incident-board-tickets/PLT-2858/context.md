# PLT-2858 — QA Issue location detail

> Prep-only context file for a human (Ilia) to act on. **No Jira action was taken.**
> Read-only investigation. Generated 2026-07-10.

## Ticket metadata

| Field | Value |
|---|---|
| Key | PLT-2858 · https://xyzreality.atlassian.net/browse/PLT-2858 |
| Summary | QA Issue location detail |
| Issue type | **Live Incident** |
| Status | **Open** (To Do) · Resolution: none |
| Priority | **Critical** |
| Project | PLT — XYZ SW Platform : Platform |
| Reporter / Creator | Yash Patel |
| Assignee | Darminder Atker |
| Created | 2026-07-01 10:20 +0100 · Updated 2026-07-10 14:18 +0100 |
| Watchers | 3 · Votes 0 · Links/subtasks: none |
| Origin | Freshdesk #7286 (sync), customer project **ML9**, Software Area: Web Viewer |

Note: "Software Area: Web Viewer", "Is Device Usable: Usable", "Project: ML9" are **free text in the description**, not structured fields.

## Full description (verbatim)

```
Issue Type: Software,
Software Area: Web Viewer,
Software Component:,
Device Serial Number software: ,
Device Serial Number Hardware: ,
Is The Device Still Usable?: Usable,
Project: ML9
Description:Hello,
I noticed that on the QA details, when filling in all the options, there is no
option for the 'Location', but only the 'Phase'. And then, when looking at the
QA issue, the 'Location' doesn't have any data.
![](blob:...id=UNKNOWN_MEDIA_attachment...)![](blob:...id=UNKNOWN_MEDIA_attachment...)
Could you verify it, please?
Thank you.
Regards,
```

## Comments (chronological, 20 total; Freshdesk status-bot lines collapsed)

1. **Yash 07-01 10:28** — restates: user "can't see an option to add location details in issue while editing in web viewer **like we used to have it in cloud**" [i.e. BIM360/ACC]; Location has no data. Attaches imgs 59975 + 59974.
2. Yash 07-01 10:29 — Freshdesk → Waiting on 3rd line.
3. **Darminder 07-01 12:25** — "**Location is automatically set and not a field the user can enter a value**".
4. Yash 07-01 12:28 — asks how/where Location is populated.
5. **Darminder 07-01 12:39** — "based on the element's location from the **project-configured named zones (floors, areas and rooms)**. Without this information setup correctly in the project for the model then this field will not populate".
6. **Darminder 07-01 12:41** — "rooms details have **not been setup for this model**" + screenshot (img 60008).
7-10. Yash relays to customer / Freshdesk status churn.
11. **Darminder 07-07 13:24** — awaiting confirmation from **Mostafa** on who configures rooms; "proposal is the **BIM team** should do the configuration".
12. **Mostafa 07-07 13:26** — "yes correct. but we might want to **surface phase on the issue detail panel if we don't already**".
13. Yash 07-07 13:30 — will ask user's BIM team to configure rooms.
14. **Darminder 07-07 13:33** — offers to raise a **separate ticket** for the surface-phase change if wanted.
15-17. Freshdesk churn.
18. **Yash 07-07 15:35** — customer **Mikel pushes back**: "I don't know what you mean by 'room details have not been set up'… We have never done this and I don't know what and how we are supposed to do it." Asks who can clarify — "Pietro? Ali?"
19. Freshdesk → Waiting on 3rd line.
20. **Darminder 07-10 14:18 (latest)** — "I am unsure from my side for the workflow on this. **@Pietro Desiato @Mostafa Kamel Hussien** would you be able to advise?" ← **ticket is stalled here, awaiting a product decision.**

## Attachments / media inventory

**The real `attachment` field DID resolve — 3 attachments present** (contrary to the UNKNOWN_MEDIA fear, they are NOT missing):

| id | filename | type | author | belongs to |
|---|---|---|---|---|
| 59975 | image-20260701-092301.png | png 24KB | Yash | description img #1 (by count/origin) |
| 59974 | image-20260701-092309.png | png 27KB | Yash | description img #2 (by count/origin) |
| 60008 | image-20260701-114131.png | png 157KB | Darminder | comment 6 (his diagnostic screenshot) |

**UNKNOWN_MEDIA flag:** The two `<img>` in the description ADF are broken — `id=UNKNOWN_MEDIA_attachment`, `localId=null`, rendering as `[^attachment]` error spans. They do **not** encode a link to 59975/59974. So the images themselves are **recoverable** (attachments exist, same two re-embedded correctly in comment 1), but the **description-body embed is broken**. This is a cosmetic **Freshdesk→Jira sync artifact** (description media dropped/unlinked while attachment upload succeeded) — a minor reporting-tool bug, separate from the QA/Location bug. **Not a blocker; nothing is inaccessible.** (Raw image bytes were not fetched; metadata resolved fully.)

## Relevant domain docs + takeaways

- `dashboard/quality-tab.md` — QLT category filters operate on the issue's own `activityCategories` (Discipline/Package/**Phase**/area/zone), denormalised at creation.
- `dashboard/project-types.md` — full-progress vs quality-only (`progressProject` flag). Not the axis here: Location/zones config is independent of project type.
- Takeaway: "Location" ≠ a category type. It is the structured `locationId` derived from the model's named-zone hierarchy; "Phase" IS a configured `activityCategory` type for ML9, which is why only Phase shows.

## Relevant hc-frontend code + findings (branch claude/vigilant-franklin-op2yys)

Path root: `.../viewer-x/components/blocks/issue-properties/`

- **`blocks/issue-form.tsx:526-537`** — create/edit form renders **only "Location Detail"** = free-text `locationDescription` (maxLength 100). **There is NO `locationId` selector rendered anywhere in the form.**
- **`blocks/issue-form.tsx:614-621`** — `IssueActivityCategories` renders the non-Discipline/Package category types (incl. **Phase**) as dropdowns → matches "only the 'Phase'".
- **`blocks/issue-details.tsx:139`** — detail view shows `<Detail label='Location' value={compare('locationId')} />` → the "Location" row is bound to **`locationId`**, which has no form input path, so it is empty whenever the backend didn't auto-derive it → matches "'Location' doesn't have any data". (Secondary nit: displays the raw id, not a resolved location name.)
- **`blocks/issue-details.tsx:140`** — separate "Location Details" row = `locationDescription` (the free-text the user CAN enter).
- **`blocks/hooks/use-issue-form.ts:519-521`** — `ISSUE_LOCATION` required-field is only registered when `issueParameters.issueLocations.length > 0`, and even then set to `false` (optional). `:402` wires validation, but **no UI control consumes it** → confirms Location is backend-derived, never user-entered.
- **`app/hooks/useIssueParameters.ts:71-77`** — `issueLocations` comes from V2 param `type === 'ISSUE_LOCATION'`; empty when the project/model has no named zones configured (ML9's case).
- `issueFactory.tsx:18` / `issue-edit.tsx:150,173` — `locationId` is only read/passed through, never bound to an input.

**Mechanism verdict:** Not a display regression and not a data-not-rendered bug. **"Location" (locationId) has no create-form input by design — it is auto-populated from the model's configured named zones (floors/areas/rooms).** ML9's model has no rooms/zones set up, so `locationId` is never populated → the detail "Location" row is empty. "Phase" is a configured category type, so it appears. Code exactly matches Darminder's comment-3/5/6 diagnosis. The client's expectation ("like we used to have it in cloud") comes from BIM360/ACC where Location was a **manually selectable** field — a UX/parity gap, not a broken field.

## Playbook-frame analysis (six questions)

1. **Observed** — QA create form shows Phase but no Location option; saved issue's Location row is blank. Reproduced via code path (form has no locationId input; detail binds locationId).
2. **Expected & authority** — customer's reference is **BIM360/ACC "cloud"**, where Location was manually selectable. That reference is folklore vs. the XYZ model where Location is zone-derived. Expectation itself is the disagreement.
3. **Broken-vs-working pair** — "Phase" (configured category → shows) vs "Location" (zones not configured → empty). The diff IS the diagnosis: presence of project config.
4. **Mechanism** — confirmed on FE (see code findings). Needs no BE log; the FE code alone shows Location is display-only + backend-derived.
5. **Why now / trigger** — likely **platform migration** from BIM360-cloud issues (manual Location) to XYZ web viewer (zone-derived Location) + ML9 model shipped without zones configured. Not a dated deploy regression. Unverified — worth one line to product.
6. **Cohort** — **any project whose model lacks configured named zones** will show empty Location. ML9 is a sample, not the population. Not yet enumerated.

**Rigor-guardian note:** "Critical" looks **inflated by Freshdesk intake**. QA logging is NOT blocked — every other field works, no data loss, Location merely auto-derives empty. Severity should probably be downgraded; flag to the human.

## Confidence score + reasoning

**7 / 10.** Diagnosis is code-confirmed and matches the assignee's own comments (would be 8-9 as pure diagnosis). Capped at 7 because there is **no code bug to fix solo** — resolution hinges on a **product decision** (should Location be manually enterable, à la BIM360, or stay zone-derived?) plus **customer-side/BIM model configuration** (environment-dependent, per CLAUDE.md 5-6/7-8 bands). Cannot be closed from code alone.

## Recommended next action (DRAFT ONLY — do not post)

The ticket is stalled on a product decision (comment 20). The move is **one closed, routed product question** — do NOT chase the customer to configure rooms until product confirms that is the intended workflow (customer Mikel already rejected that in comment 18). Route to **Pietro (product)** — named by both the customer and Darminder; Mostafa already co-owns and leaned toward surfacing Phase.

Draft comment (playbook tone — closed, answerable, one owner):

> @Pietro Desiato — product decision needed to unblock this (customer ML9, via #7286). Confirmed in code: the QA issue form has **no manual "Location" input** — `locationId` is auto-derived from the model's configured named zones (floors/areas/rooms) and only shown read-only on the detail panel (`issue-details.tsx:139`); the user-editable field is "Location Detail" free text. ML9's model has no zones configured, so Location is blank. The customer expects to **pick** Location manually "like in cloud" (BIM360/ACC).
>
> One decision, please: **(A)** Location stays zone-derived → this is a customer/BIM-team model-config task (needs a doc on how to set up zones — Mikel says they've never done it), or **(B)** we add a manual Location field for parity with cloud → I raise an FE ticket. Also: is **Critical** the right severity given QA logging isn't actually blocked?
>
> (Darminder's separate "surface Phase on the detail panel" idea from Mostafa — note it already renders at `issue-details.tsx:151-158`, so likely no-op; confirm.)

Routing: **Pietro Desiato** (product owner) as single owner; Mostafa cc for the Phase sub-question. If B is chosen → new FE ticket, Darminder's team.

## Open questions for a human

1. **Product**: Is Location intended to be manually selectable (BIM360 parity) or strictly zone-derived? (Decides A vs B above.) — Pietro/Mostafa.
2. **Config/UX**: If zone-derived stays, who owns the customer-facing "how to configure named zones/rooms" doc? Mikel explicitly said the customer has never done this and doesn't know how.
3. **Severity**: Is "Critical" justified? QA logging is not blocked (assess for downgrade).
4. **Cohort**: How many other live projects ship models without configured zones (same empty-Location symptom)?
5. **Display nit**: `issue-details.tsx:139` shows the raw `locationId` value rather than a resolved location name — worth fixing if Location is ever populated (separate, minor).
6. **Reporting tool**: Freshdesk→Jira sync dropped the two description images (UNKNOWN_MEDIA) while attachments uploaded fine — recurring intake bug worth a separate note (images themselves are recoverable: attachments 59975/59974).
