# PLT-2858 — "QA Issue location detail"

- **Domain slug:** quality-management
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2858
- **Type:** Live Incident · **Priority:** Critical · **Status:** In Analysis
- **Assignee:** Darminder Atker (fullstack lead) · **Reporter (Jira):** Yash Patel (support / incident coordinator)
- **Original customer contact:** "Mikel" · **Project:** ML9 · **Software Area:** Web Viewer
- **Linked Freshdesk:** #7286 (currently Open, last flipped to "Waiting on 3rd line" 2026-07-07)
- Triage (continuation) date: 2026-07-13

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
- 107208 (07-13, **Mostafa**): *"leave it with me."* ← **latest message; Mostafa (PO) now owns the
  workflow/education follow-through.**

**Net thread state:** Root cause (empty Location = no named zones configured on ML9) is established and
agreed by dev (Darminder) and product (Mostafa). What is unresolved is **non-engineering**: (1) *who* sets
up named zones and *how* (self-serve? BIM team? internal?), because the customer doesn't know how; and
(2) whether to build the "surface Phase on the detail panel" enhancement. As of today the ownership of (1)
sits with **Mostafa** ("leave it with me"); (2) is still an open go/no-go for Darminder.

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

---

## 6. Doc / KB gaps noted (not edited — outside PLT-2858 folder per task scope)

- `dashboard/quality-tab.md` documents the QLT tab (issue list, filters, categories) but says **nothing
  about the issue "Location" (named-zone) field, its auto-derivation, or the free-text "Location Detail"**.
  Neither `dashboard/pitfalls.md` nor `dashboard/viewer-and-model.md` mention named zones / `issueLocationId`.
  Worth a KB entry once the workflow is settled.
- Naming drift (also flagged on PLT-2815): `CLAUDE.md` layout lists `qlt-quality.md`; the actual file is
  `dashboard/quality-tab.md`.

---

## Update — 2026-07-20

Re-pulled the live issue. **No activity after 2026-07-16** — the ticket's `updated` timestamp is
`2026-07-16T14:44:34` (comment 107533), so the thread is exactly as the 07-13 capture left it plus the
four developments below. Still **In Analysis**, **Critical**, assignee Darminder, reporter Yash. Open 19+
days (since 07-01). The ticket is now **doubly stalled**.

### 7a. New thread activity (07-14 → 07-16)

- **107317 (07-14 12:39, Yash relaying customer "Mikel"):** customer confirms *"it is not possible to
  connect the rooms to the different models"* — i.e. they tried the BIM-team route from the 07-01/07-07
  branch and it did not work for them. Proposes **two alternatives**:
  - **(a)** add a **drop-down of all Location options** to select on the QA form; or
  - **(b)** if (a) isn't possible, **remove the Location field entirely** from the QA issue so it doesn't
    *"appear as we have missing details on the Dashboard."*
  - Attached `image-20260714-113920.png` (⚠️ inaccessible — see §5; presumed the dashboard/detail view
    showing the empty Location).
- **107320 (07-14 13:17, Mostafa → Darminder):** *"what is the difference between location and location
  details"* — **unanswered** in-thread. (Answered below in §7b; this is what the recommended-action draft
  now hands back to him.)
- **107532 (07-16 14:42, Ilia):** nudged Mostafa for an update.
- **107533 (07-16 14:44, Mostafa, latest):** *"waiting on this since it was asked of me"* — deflecting;
  neither answers Darminder's 107320 question nor gives a decision on the customer's two options.

**Net:** two independent blockers now sit unresolved — (1) Mostafa's own location-vs-location-details
question (107320), open 6 days; (2) the customer's concrete dropdown-or-remove proposal (107317), no
response for 6 days. The original config/ownership question ("who configures zones, how") is now
effectively **dead-ended on the customer side** — they've told us the BIM route doesn't work for them, so
"go configure zones" is no longer a viable answer; a **product/FE decision** on the two proposals is what
unblocks it.

### 7b. Direct answer to Mostafa's 107320 question (location vs location details) — code-verified 07-20

Re-read all four files; the §2a table is **still accurate** (line refs current). Stated plainly enough to
paste into a reply:

| | **"Location"** | **"Location Detail(s)"** |
|---|---|---|
| What it is | The **named zone** (floor / area / room) the issue's element sits in | A **free-text note** the user types |
| How it's set | **Auto-derived** by the platform from the element's position vs the project's configured named zones — **read-only**, no form control | **User-typed** free text, max 100 chars |
| FE field | `locationId` (`issue-view-model.ts:45`) | `locationDescription` (`issue-view-model.ts:46`) |
| API field | `issueLocationId` (`issue-api-service.types.ts:77`) | `locationDetails` (`:94`) |
| Form control | **None** — not editable in the web viewer | `issue-form.tsx:527-537`, label **"Location Detail"** |
| Panel row | `issue-details.tsx:139`, label **"Location"** | `issue-details.tsx:140`, label **"Location Details"** |
| Why empty on ML9 | `issueLocationId` is null — ML9 has no named zones configured | N/A — works today; anyone can type in it |

One-liner for Mostafa: **"Location" is the auto-assigned zone (from the model's named floors/areas/rooms;
read-only, empty on ML9 because no zones are set up). "Location Detail" is a free-text box the user fills
in themselves — unrelated to zones, and it works today.**

### 7c. Code-feasibility of the customer's two proposals (engineering size only — NOT a product call)

**Proposal (a) — dropdown of Location/zone options on the QA form:**
- **The lookup list is already available client-side.** `useIssueParameters()` returns
  `issueParameters.issueLocations: IIssueLocation[]` = `{ issueLocationId, location }`
  (`issue-api-service.types.ts:176-179`, `:216`; V1 mapping `useIssueParameters.ts:71-77`). The form
  **already fetches it** (`issue-form.tsx:56`) and never uses it.
- **The write path already exists end-to-end.** `toIssuePayload` already emits
  `set('issueLocationId', form.locationId)` (`format-issues.ts:146`), and `IssueFormSubmitPayload` carries
  `locationId`. So a new `<FormSelect name='locationId' … options={issueParameters.issueLocations…}>` —
  a near-copy of the existing Stage/Outcome selects (`issue-form.tsx:556-578`) — is a **small,
  self-contained FE change**.
- **BUT two big caveats** (why "small in code" ≠ "solves this ticket"):
  1. **Empty on ML9.** `issueLocations` is populated from the *same* project-configured named zones that
     are missing on ML9. On ML9 (and every zone-less project) the dropdown renders **empty** — so (a)
     does **not** fix this customer's actual complaint; it only helps projects that *have* configured
     zones. This is the same data gap wearing a new hat.
  2. **Product-model change, needs Darminder/Mostafa + likely BE.** Location is currently *auto-derived
     from geometry* and read-only by design (Darminder, 106248/106250). A manual dropdown lets a user set
     `issueLocationId` **independently of the element's actual position** — a semantic change. Needs
     confirmation that api-v2 **persists** a manually-set `issueLocationId` and doesn't overwrite it on the
     next auto-derivation pass (out-of-repo; Sachin/Ali). So: small FE effort, but gated on a product
     decision and a BE behaviour check, and it still leaves ML9 empty.

**Proposal (b) — hide the Location row when zones aren't configured:**
- **Trivial FE change, no BE work.** The `Detail` component **already supports a `hidden` prop**, used
  right above for Discipline/Package (`issue-details.tsx:131`, `:135` — `hidden={!disciplineCategoryType}`).
  Hiding the Location row is a one-liner: `hidden={!compare('locationId')}` (hide when empty) or, better,
  gate on the project having zones at all — `hidden={!issueParameters?.issueLocations?.length}` (hide the
  row for the whole zone-less cohort, not just per-issue). `issueParameters` is already in scope in the
  detail panel (`issue-details.tsx:35`).
- **Directly resolves the customer's stated concern** (*"not appear as missing details"*) with essentially
  zero risk.
- **⚠️ Two detail surfaces.** This file is the **viewer** issue detail panel. The customer's screenshot
  says *"on the Dashboard"* — the **dashboard** quality panel has its own detail component
  (`components/dashboard-panels/quality-panel/components/issue-details-panel/issue-details-panel.tsx`).
  Whichever surface the customer sees (likely the dashboard) must be the one changed; possibly both. The
  hide mechanism is equally trivial on either, but the exact target surface should be confirmed against the
  attachment (⚠️ NEEDS HUMAN — attachment inaccessible).

**Latent gap still stands (§2c).** Even if zones *do* get configured on a project, the panel binds
`compare('locationId')` and renders the raw **GUID**, never resolving it to `IIssueLocation.location`
(`issue-details.tsx:139`; `toIssue` copies only the id, `format-issues.ts:87`). So "fix the data" alone
surfaces a GUID. A complete answer for zone-configured projects = **resolve id→label** (small; the
`issueLocations` lookup that powers proposal (a)'s dropdown is exactly what's needed here too) **+** hide
when empty (proposal b).

### 7d. Cohort — still open, still important (playbook Q6)

The decision between (a) and (b) hinges on **how many projects have unconfigured named zones**. If most
projects never configure zones (plausible — ML9's customer says they've "never done this"), then a
dropdown (a) is dead weight almost everywhere and **hiding-when-empty (b) is the right default**, with the
dropdown as an *enhancement only for zone-configured projects*. If zone config is common, the balance
shifts. **⚠️ NEEDS HUMAN / DATA:** no query available to me to count zone-less projects — needs a
platform/DB check (how many projects have zero rows in the issue-locations / named-zones parameter). This
is the single fact that would make the (a)-vs-(b) recommendation firm rather than directional.

### 7e. Revised confidence

- **Location-vs-Location-Detail answer (§7b): 9/10** — read end-to-end across all four files; line refs
  current; directly answers 107320.
- **Feasibility read (§7c): 8/10** — the client-side lookup and the write path are both present in code, so
  the FE sizing is solid. The −2 is out-of-repo: whether api-v2 honours a manually-set `issueLocationId`
  (proposal a) is asserted-by-design, not verified by me.
- **Which proposal is right (a vs b): 6/10** — clear engineering direction (b is tiny + no-BE + solves the
  complaint; a is small-FE-but-empty-on-ML9 + product/BE-gated), but the *product* call and the cohort
  count are not mine to settle.
- **Overall: 7/10** (unchanged framing from §4 — the block is product/process, now sharpened to a concrete
  two-option decision rather than an open ownership question).
