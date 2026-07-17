# PLT-2858 — "QA Issue location detail"

- **Domain slug:** quality-management
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2858
- **Type:** Live Incident · **Priority:** Critical · **Status:** In Analysis
- **Assignee:** Darminder Atker (fullstack lead) · **Reporter (Jira):** Yash Patel (support / incident coordinator)
- **Original customer contact:** "Mikel" · **Project:** ML9 · **Software Area:** Web Viewer
- **Linked Freshdesk:** #7286 (currently Open, last flipped to "Waiting on 3rd line" 2026-07-07)
- Triage (continuation) date: 2026-07-13 · **refreshed 2026-07-17**

---

## 0. One-line framing

Not a crash and — on the evidence so far — **not a frontend code bug** in the reported symptom. It is a
**data/config gap** (the project's model has no configured named zones) compounded by a **UX-expectation
mismatch** (in the web viewer the zone-based "Location" is auto-derived and read-only, unlike the old
"cloud" product where the customer expected to enter it). The ticket is currently stalled on a
**product/process ownership question** (who configures zones, and how), not on engineering.

---

## 1. What is ALREADY established in the thread (before my analysis)

Read chronologically; the analysis is well advanced. Established facts and decisions:

**Reported symptom (Yash relaying customer, 2026-07-01, comment 106245 + description):**
- In the web-viewer QA issue editor, "when filling in all the options there is no option for the
  'Location', but only the 'Phase'." The customer expected a Location field "like we used to have it in
  cloud."
- When viewing the QA issue, the "Location" field "doesn't have any data."

**Diagnosis given by Darminder (assignee / fullstack lead) — treated as authoritative in-thread:**
- 106248 (07-01 12:25): *"Location is automatically set and not a field the user can enter a value."*
  → By current design Location is **not** a manual entry field. This directly answers the customer's
  "no option for Location" complaint: it is intentional, not a missing field.
- 106250 (07-01 12:39): *"This is based on the element's location from the project-configured named
  zones (floors, areas and rooms). Without this information setup correctly in the project for the model
  then this field will not populate correctly."* → mechanism: Location is derived from **project-configured
  named zones**.
- 106251 (07-01 12:41): Darminder inspected ML9 and confirmed **"rooms details have not been setup for
  this model"** — that is why the field is empty. (Screenshot `image-20260701-114131.png` attached — see §5.)

**Agreed root cause & where it went next:**
- Darminder + Yash agreed to ask the customer to have their **BIM team configure rooms/zones** in the model
  (106252–106253).
- 106713 (07-07): Darminder awaits confirmation from Mostafa on **who** should configure rooms; proposal =
  the BIM team.
- 106714 (07-07): **Mostafa (PO) agreed** the BIM team configures it, and added: *"we might want to surface
  phase on the issues detail panel if we dont already."* → a **separate enhancement idea** (surface Phase).
- 106720 (07-07): Darminder offered to raise a **separate ticket** for the Phase-on-detail-panel change;
  awaiting go/no-go.
- 106728 (07-07): The customer (Mikel) pushed back: *"I don't know what you mean by 'the room details have
  not been set up'… We have never done this and I don't know what and how we are supposed to do it. Who
  should be able to clarify this? Pietro? Ali?"* → **the customer does not know how to configure zones.**
- 107109 (07-10): Darminder: *"I am unsure from my side for the workflow on this"* → punts the workflow/
  ownership question to Pietro / Mostafa.
- 107206 (07-13, **Ilia**): asked Pietro/Mostafa whether the customer/BIM team had been reached out to so
  they could learn to set up the location properly.
- 107208 (07-13, **Mostafa**): *"leave it with me."* ← Mostafa (PO) took the workflow/education follow-through.

**Continuation since 07-13 (refresh 2026-07-17) — the ticket has PIVOTED from "educate the BIM team" to a
concrete product decision, and is now blocked on Darminder answering Mostafa, NOT on Mostafa:**
- 107317 (07-14, **Yash** relaying customer **Mikel**): the customer's ask has crystallised into a
  feature request. Verbatim: *"As far as I understood, it is not possible to connect the rooms to the
  different models. If it is possible to have a **drop-down list with all the different Location to select
  on the QA**, that would be great. In case it is not possible, it would be ideal to **remove the Location
  part on the QA**, to not create confusion and not appear as we have missing details on the Dashboard."*
  (snapshot `image` id `d837c44d-...` attached — see §5). → Two decision options on the table now:
  **(1) make zone-Location a manual drop-down selector** (today there is no such control — `context.md §2b`);
  or **(2) hide/remove the Location field from the QA** so an empty value stops reading as "missing data"
  on the dashboard (this is the flip side of the empty-`issueLocationId` symptom — `§2a/§2c`). Note the
  customer's premise — *"not possible to connect the rooms to the different models"* — is stated as **their
  understanding, unverified**; it is unclear whether room→model linking is genuinely impossible for this
  setup or simply was never done (the BIM-config path from before). ⚠️ open question for a human.
- 107320 (07-14, **Mostafa** → Darminder): *"what is the difference between location and location details"*
  → Mostafa is asking exactly the `§2a` distinction (auto-derived zone **Location** vs free-text
  **Location Detail**). **Our context.md already answers this in full (§2a).** Darminder has **not** replied.
- 107532 (07-16, **Ilia** → Mostafa): *"have you got any updates on this?"* (nudge).
- 107533 (07-16 14:44, **Mostafa** → Ilia + Darminder): *"waiting on this since it was asked of me."*
  ← **latest message; the comment that moved the `updated` timestamp to 07-16 14:44.** Read together with
  107320: Mostafa considers the ball to be with **Darminder** to answer the location-vs-location-details
  question before he can take the product decision forward. **The blocker is now Darminder, not Mostafa.**

**Net thread state (07-17):** Root cause (empty Location = no named zones configured on ML9) is unchanged and
still agreed. The "educate the customer/BIM team to configure zones" path has effectively stalled — the
customer now believes room→model linking is *not possible* and has escalated to a **product feature
decision**: give them a Location **selector**, or **remove** the Location field to stop it reading as
missing data. The thread is blocked on a **trivial, already-answered question** (Mostafa's 107320,
location vs location details = `§2a`) that Darminder has not yet responded to — so the highest-leverage
move has shifted from "decision message → Mostafa" to **unblocking Darminder's reply and teeing up the
two customer options as the decision**. The "surface Phase" enhancement (106714) remains an untouched
open go/no-go.

**Ruled out / not in play:** No claim of a regression, no deploy trigger, no crash. Nobody has alleged the
computation is wrong — only that it is empty and that the entry field is missing.

---

## 2. My added analysis — the frontend code path (NEW)

I read the web-viewer QA issue form, detail panel, view-model and v2 API types end to end. This
**corroborates Darminder's account at the FE layer** and surfaces two things not yet noted in the thread.

### 2a. There are TWO different "location" concepts on a QA issue — do not conflate them
| Concept | FE field | v2 API field | User-editable? | Where shown |
|---|---|---|---|---|
| **Location** (zone) | `locationId` | `issueLocationId` | **No** — auto-derived from named zones | Detail panel "Location" |
| **Location Detail** (free text) | `locationDescription` | `locationDetails` | **Yes** — free-text box, max 100 chars | Form "Location Detail"; panel "Location Details" |

- View-model: `issue-view-model.ts:45-46` (`locationId`, `locationDescription`).
- Mapping: `format-issues.ts:87-88` (`locationId ← v2.issueLocationId`, `locationDescription ← v2.locationDetails`)
  and outbound `format-issues.ts:146-147`.
- v2 types: `issue-api-service.types.ts:77` (`issueLocationId`), `:94` (`locationDetails?`), and a **separate
  lookup type** `IIssueLocation { issueLocationId, location }` at `:176-179` where `location` is the
  human-readable name.

### 2b. The form has NO zone-"Location" selector — confirming Darminder (mechanism, FE layer)
`issue-form.tsx` renders no control that writes `locationId`/`issueLocationId`. It only exposes:
- a free-text **"Location Detail"** field bound to `locationDescription` (`issue-form.tsx:526-537`), and
- category-type selectors including **Phase** (Phase is a project "activity category" rendered via
  `otherCategoryTypes`, `issue-form.tsx:616-621`), plus **Stage** (`stageId`, `:555-566`).

So the zone "Location" is genuinely not user-settable in the web viewer (only auto-derived on the BE from
named zones). This is exactly what the customer noticed ("only the 'Phase'"). The free-text "Location
Detail" field **does** exist, so the customer has a partial manual workaround if all they want is to jot a
location note — worth telling them.

### 2c. Detail panel shows the raw zone **ID**, not the zone **name** — a latent FE gap (NEW, not in thread)
`issue-details.tsx:139` binds the "Location" row to `compare('locationId')` — i.e. it displays the raw
`issueLocationId` (a GUID), **not** the human-readable `location` label. The v2 API exposes the label via
the `IIssueLocation` lookup (`issue-api-service.types.ts:176-179`), but:
- `toIssue()` never resolves `issueLocationId → location` (it only copies the id; `format-issues.ts:87`), and
- the V2 view-model has no `locationLabel` field (`issue-view-model.ts:45`). (The older V1 `IIssueDetail`
  model *did* carry `location`/`locationLabel`, `issue.model.ts:103-104` — the label concept was dropped in
  the V2 path.)

**Implication:** the current symptom is empty because `issueLocationId` is null (no zones). But **the moment
the BIM team configures zones and the BE starts stamping `issueLocationId`, the panel will render a GUID
rather than a friendly name** unless the FE is changed to resolve the id against the `IIssueLocation` list
(available from issue parameters). This is a real, small, code-level follow-up that should be captured now,
because "fixing" the data gap will expose it.

### 2d. Phase may already be surfaced on the detail panel — check before ticketing Mostafa's idea
The detail panel already loops over all project category types except Discipline/Package and renders each
(`issue-details.tsx:151-158`). If "Phase" is a project **category type** (it is rendered as one in the
*form* at `:616-621`), then **Phase is already shown on the detail panel** and Mostafa's suggested
enhancement (106714) may be wholly or partly redundant. This needs a 2-minute check against ML9's actual
category config (environment-dependent) before Darminder spins up the separate ticket he offered (106720).

---

## 3. Playbook 6-question status (what's answered vs open)

1. **Observed & reproducible?** ✅ Yes. Symptom is empty "Location" + no Location selector on ML9;
   Darminder reproduced it (inspected the project, saw zones unconfigured, 106251).
2. **Expected, on whose authority?** ✅ Expectation = "like we had in cloud" (customer folklore); corrected
   by the design authority (Darminder): Location is auto-derived, not manual. Reference resolved.
3. **Smallest broken-vs-working pair?** ⚠️ Partly. Broken = ML9 (no zones → empty). Working = a project
   *with* zones configured. NOT yet diffed on a real project — and note §2c means the "working" side would
   itself show a GUID not a name, so the pair is worth running to confirm both behaviours.
4. **Mechanism?** ✅ FE side fully mapped (§2). BE side (how `issueLocationId` is stamped from named zones)
   is api-v2 and not in this repo — but is corroborated by the assignee in-thread. Sachin/Ali could confirm
   the BE zone→issue stamping if needed.
5. **Why now (trigger)?** ✅ Not a regression/deploy. It surfaces because (a) ML9 never had zones configured
   and (b) the web-viewer workflow differs from the old cloud product the customer remembers.
6. **Who else (cohort)?** ⚠️ Open and important: **every project that has not had named zones configured**
   will show empty Location on all its issues. ML9 is a sample, not the population. No cohort sweep done.

---

## 4. Confidence

- **Diagnosis of the reported symptom: 8/10.** The FE code path is read end-to-end and matches the
  assignee's authoritative statement; the empty-Location symptom is fully explained by a null
  `issueLocationId` (no configured zones). The only unseen piece is the BE zone→`issueLocationId` stamping
  (api-v2, out of this repo), which is corroborated in-thread rather than verified by me.
- **§2c (GUID-not-label) finding: 7/10** — clear from code, but its user impact only manifests once zones
  exist, which I cannot exercise here (environment-dependent).
- **§2d (Phase already surfaced) finding: 5/10** — depends on whether ML9 defines "Phase" as a category
  type; true in code if it does, needs a config check to confirm.
- **Recommended next step: ~7/10** — a coordination/product judgment (see recommended-action.md), not a
  code-testable fact.

Per xyz-platform-context/CLAUDE.md scale, overall this sits at **7/10**: approach and mechanism are clear,
but resolution is product/process-dependent and the two code-level follow-ups are environment-dependent.

---

## 5. Attachments — NEEDS HUMAN

I could not view any of the images (Jira/staging binary media requiring auth; the description/comment
`blob:` refs are placeholders). None are load-bearing for the diagnosis — the substance (zones not
configured) is stated verbatim in text by Darminder — but for completeness:

- ⚠️ **NEEDS HUMAN:** `image-20260701-092301.png` (Yash/reporter, 07-01) — inaccessible. Presumed one of the
  two customer screenshots of the QA form/detail; not verified. Do not guess contents.
- ⚠️ **NEEDS HUMAN:** `image-20260701-092309.png` (Yash/reporter, 07-01) — inaccessible. As above.
- ⚠️ **NEEDS HUMAN:** `image-20260701-114131.png` (Darminder, 07-01, attached to comment 106251) —
  inaccessible. Per its caption it is Darminder's screenshot evidencing that rooms/zones are not set up on
  ML9; contents not independently verified.
- ⚠️ **NEEDS HUMAN:** inline `blob:` images in the description and in comment 106245 — placeholder refs,
  not fetchable.
- ⚠️ **NEEDS HUMAN (NEW, 07-14):** the snapshot in comment 107317 (`blob:` id `d837c44d-95b3-4c68-8f6f-...`)
  — per Mikel's caption it shows where the empty Location "appears as we have missing details on the
  Dashboard." Not independently verified; likely the QA detail panel / dashboard row with a blank Location.

---

## 6. Doc / KB gaps noted (not edited — outside PLT-2858 folder per task scope)

- `dashboard/quality-tab.md` documents the QLT tab (issue list, filters, categories) but says **nothing
  about the issue "Location" (named-zone) field, its auto-derivation, or the free-text "Location Detail"**.
  Neither `dashboard/pitfalls.md` nor `dashboard/viewer-and-model.md` mention named zones / `issueLocationId`.
  Worth a KB entry once the workflow is settled.
- Naming drift (also flagged on PLT-2815): `CLAUDE.md` layout lists `qlt-quality.md`; the actual file is
  `dashboard/quality-tab.md`.
