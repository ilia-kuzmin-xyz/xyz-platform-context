# PLT-2858 — "QA Issue location detail"

- **Domain slug:** quality-management
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2858
- **Type:** Live Incident · **Priority:** Critical · **Status:** In Analysis
- **Assignee:** Darminder Atker (fullstack lead) · **Reporter (Jira):** Yash Patel (support / incident coordinator)
- **Original customer contact:** "Mikel" · **Project:** ML9 · **Software Area:** Web Viewer
- **Linked Freshdesk:** #7286 (last recorded state: Open / "Waiting on 3rd line", 2026-07-07)
- Created 2026-07-01 · **Last Jira update: 2026-07-16T14:44** (comment 107533)
- Triage dates: 2026-07-13 (initial) · 2026-07-22 (re-check) · **2026-07-29 (re-check — this pass)**

---

## Re-check log

**2026-07-29 (this pass) — status unchanged, but the thread is NOT what the last two passes recorded.**

- **No new activity.** Last comment is still 107533 (Mostafa, 07-16). Status still `In Analysis`,
  priority still `Critical`, assignee still Darminder. **13 days of total thread silence.**
- ⚠️ **Correction to the 07-13 and 07-22 passes:** both runs missed **two comments from 2026-07-14**
  (107317 and 107320) and one attachment (`image-20260714-113920.png`). They materially change the
  ticket — see §1a. The prior framing ("stalled purely on Mostafa's zone-config-ownership decision")
  is **incomplete**: as of 07-14 the customer withdrew the configure-zones path and made a concrete
  two-option product request, and Mostafa asked Darminder a direct engineering question that has
  never been answered.
- **Two open questions, both 15 days unanswered:**
  1. **Customer → us** (107317, 07-14): give us a *Location dropdown*, or *remove Location* from the
     QA so it doesn't read as missing data on the Dashboard. No reply on-ticket. Freshdesk is the
     customer-facing side of this silence.
  2. **Mostafa → Darminder** (107320, 07-14): *"what is the difference between location and location
     details"*. No reply. This is very likely the actual content of Mostafa's *"waiting on this since
     it was asked of me"* (107533, 07-16) — i.e. **the PO is blocked on an unanswered dev question**,
     not sitting on a decision. And we already have the answer in §2a.
- **Elapsed clocks:** 28 days open (Critical) · 22 days since the customer said "we don't know how"
  (106728, 07-07) · 16 days since Mostafa's "leave it with me" (107208, 07-13) · **15 days since both
  07-14 questions** · 13 days since any comment at all.
- **New code findings this pass:** §2e (the *Dashboard* quality panel reads a **different** field —
  `modelRoomId`, not `issueLocationId` — so "Location" means two different things on two surfaces) and
  §2f (a Location **dropdown is mostly already plumbed**; only the UI control is missing — but its
  option list comes from the same missing zone config, so it would render empty on ML9).

**2026-07-22** — no change since 07-16; escalation note added to `recommended-action.md`.

---

## 0. One-line framing

Not a crash and — on the evidence — **not a frontend code bug** in the originally reported symptom. It is a
**data/config gap** (ML9's model has no configured named zones) compounded by a **UX-expectation mismatch**
(the zone-based "Location" is auto-derived and read-only in the web viewer, unlike the old "cloud" product).
Since 07-14 the ticket is no longer about diagnosis at all: the customer has **abandoned the configure-zones
path** and asked for one of two **product decisions** (dropdown vs remove the field), and the ticket is
stalled because **nobody answered either the customer or the PO's own clarifying question**.

---

## 1. What is established in the thread

**Reported symptom (Yash relaying customer, 2026-07-01, comment 106245 + description):**
- In the web-viewer QA issue editor, "when filling in all the options there is no option for the
  'Location', but only the 'Phase'." The customer expected a Location field "like we used to have it in
  cloud."
- When viewing the QA issue, the "Location" field "doesn't have any data."

**Diagnosis given by Darminder (assignee / fullstack lead) — treated as authoritative in-thread:**
- 106248 (07-01 12:25): *"Location is automatically set and not a field the user can enter a value."*
  → By current design Location is **not** a manual entry field. This directly answers the "no option for
  Location" complaint: intentional, not a missing field.
- 106250 (07-01 12:39): *"This is based on the element's location from the project-configured named
  zones (floors, areas and rooms). Without this information setup correctly in the project for the model
  then this field will not populate correctly."* → mechanism: Location is derived from **project-configured
  named zones**.
- 106251 (07-01 12:41): Darminder inspected ML9 and confirmed **"rooms details have not been setup for
  this model"** — that is why the field is empty. (Screenshot `image-20260701-114131.png` — see §5.)

**Chronology from there:**
- Darminder + Yash agreed to ask the customer to have their **BIM team configure rooms/zones** (106252–106253).
- 106713 (07-07): Darminder awaits confirmation from Mostafa on **who** should configure rooms; proposal =
  the BIM team.
- 106714 (07-07): **Mostafa (PO) agreed** the BIM team configures it, and added: *"we might want to surface
  phase on the issues detail panel if we dont already."* → a **separate enhancement idea**.
- 106720 (07-07): Darminder offered to raise a **separate ticket** for the Phase change; awaiting go/no-go.
  **Still unanswered.**
- 106728 (07-07): The customer (Mikel) pushed back: *"I don't know what you mean by 'the room details have
  not been set up'… We have never done this and I don't know what and how we are supposed to do it. Who
  should be able to clarify this? Pietro? Ali?"* → **the customer does not know how to configure zones.**
- 107109 (07-10): Darminder: *"I am unsure from my side for the workflow on this"* → punts workflow/ownership
  to Pietro / Mostafa.
- 107206 (07-13, **Ilia**): asked Pietro/Mostafa whether the customer/BIM team had been reached out to.
- 107208 (07-13, **Mostafa**): *"leave it with me."*
- **107317 (07-14, Yash relaying the customer) — see §1a.**
- **107320 (07-14, Mostafa → Darminder) — see §1a.**
- 107532 (07-16, **Ilia**): nudge — *"have you got any updates on this?"*
- 107533 (07-16, **Mostafa**): *"waiting on this since it was asked of me."* ← **latest comment; 13 days
  stale as of 2026-07-29.** Read against 107320 (below), this most plausibly means *Mostafa is waiting on
  Darminder's answer* — not that he owes the answer.

### 1a. The two 07-14 comments the earlier passes missed (⚠️ decision-changing)

**107317 — Yash relaying the customer (Mikel), 07-14 12:39, with `image-20260714-113920.png`:**

> *"As far as I understood, it is not possible to connect the rooms to the different models. If it is
> possible to have a drop-down list with all the different Location to select on the QA, that would be
> great. In case it is not possible, it would be ideal to remove the Location part on the QA, to not create
> confusion and not appear as we have missing details on the Dashboard."*

Three things change here:
1. **The customer has effectively closed the configure-zones path** — they believe rooms cannot be connected
   to their models. ⚠️ **That belief is unverified by us** (playbook Q2: expectation on whose authority?).
   Darminder should confirm or deny it as a fact before anyone designs around it — if rooms *can* be
   connected on ML9, the whole option set collapses back to "configure the zones + hand over a how-to".
2. **The customer proposed the two options themselves** — (a) a selectable Location **dropdown**, or
   (b) **remove/hide Location** on the QA. That is a much more answerable product question than the
   open-ended "who owns zone config" the last two passes were chasing.
3. **The stated pain has moved to the Dashboard** — *"not appear as we have missing details on the
   Dashboard"*. So the complained-about surface now includes the dashboard quality panel, which reads a
   **different** field (§2e). The 07-14 screenshot (321×761, narrow) is consistent with that panel.

**107320 — Mostafa → Darminder, 07-14 13:17:** *"what is the difference between location and location
details"*. **Never answered.** This is exactly §2a below — a 30-second answer that has been blocking a
Critical ticket for 15 days.

**Net thread state (2026-07-29):** the *reported* symptom is diagnosed and agreed. What is unresolved is
entirely non-engineering-blocked: **an unanswered dev question to Darminder (107320)**, **an unanswered
customer request with two named options (107317)**, and **an unanswered go/no-go on the Phase ticket
(106720)**. The zone-config-ownership question (who + how-to) is still open too, but is arguably now
*downstream* of the customer's "we can't connect rooms to models" claim.

**Ruled out / not in play:** no regression claim, no deploy trigger, no crash, no allegation that the
computation is *wrong* — only that it is empty and not enterable.

---

## 2. Frontend code path (verified in `hc-frontend`)

Re-verified on 2026-07-29 against branch `claude/vigilant-franklin-kdo7w7`; all line refs below re-checked.

### 2a. There are THREE different "location" concepts — do not conflate them
**This table is the answer to Mostafa's 107320.**

| Concept | FE field | Source / API field | User-editable? | Where shown |
|---|---|---|---|---|
| **Location** (zone) | `locationId` | v2 `issueLocationId` — auto-derived from project named zones | **No** (no UI control exists) | Web-viewer issue detail panel, "Location" |
| **Location Detail(s)** (free text) | `locationDescription` | v2 `locationDetails`, max 100 chars | **Yes** — free-text box | Form "Location Detail"; panels "Location Details" |
| **Location** (dashboard) | `modelRoomId` | issue's raw model **room GUID** — a *different field* from `issueLocationId` | **No** | Dashboard quality panel, "Location" (§2e) |

- View-model: `issue-view-model.ts:45-46` (`locationId`, `locationDescription`).
- Mapping: `format-issues.ts:87-88` (`locationId ← v2.issueLocationId`, `locationDescription ← v2.locationDetails`);
  outbound `format-issues.ts:146-147`.
- v2 types: `issue-api-service.types.ts:77` (`issueLocationId`), `:94` (`locationDetails?`), `:17`
  (`modelRoomId?`), and the lookup type `IIssueLocation { issueLocationId, location }` at `:176-179`
  (`location` = the human-readable name), surfaced as `issueLocations` at `:216`.

### 2b. The form has NO zone-"Location" selector — confirms Darminder at the FE layer
`issue-form.tsx` renders no control that writes `locationId`/`issueLocationId`. It exposes only:
- the free-text **"Location Detail"** field bound to `locationDescription` (`issue-form.tsx:526-534`), and
- category-type selectors including **Phase** (rendered via `otherCategoryTypes`, `issue-form.tsx:616-621`),
  plus **Stage** (`stageId`).

So the zone "Location" is genuinely not user-settable in the web viewer — exactly what the customer noticed
("only the 'Phase'"). The free-text "Location Detail" field **does** exist → a partial manual workaround
today, worth telling the customer.

### 2c. Web-viewer detail panel shows the raw zone **ID**, not the zone **name** (latent FE gap)
`issue-details.tsx:139` binds the "Location" row to `compare('locationId')` — i.e. it renders the raw
`issueLocationId` GUID, **not** the human-readable `location` label. The label is available
(`IIssueLocation`, `issue-api-service.types.ts:176-179`; list built in `useIssueParameters.ts:71-77`) but:
- `toIssue()` never resolves `issueLocationId → location` (`format-issues.ts:87`), and
- the V2 view-model has no `locationLabel` field (`issue-view-model.ts:45`). The older V1 `IIssueDetail`
  *did* carry `location`/`locationLabel` (`issue.model.ts:103-104`) — the label concept was dropped in V2.

**Implication:** the symptom is empty *today* because `issueLocationId` is null. The moment zones are
configured, this panel will render a **GUID**. Fixing the data gap would expose this.

### 2d. Phase may already be surfaced on the detail panel — check before ticketing Mostafa's idea
The detail panel loops over all project category types except Discipline/Package and renders each
(`issue-details.tsx:151-158`). Phase is rendered as a category type in the *form* (`:616-621`), so **Phase
may already be shown**, making 106714/106720 wholly or partly redundant. Needs a 2-minute check against
ML9's category config (environment-dependent).

### 2e. NEW — the Dashboard's "Location" is a *different field* (`modelRoomId`), also a raw GUID
`issue-details-panel.tsx:355-367` (dashboard quality panel) labels a row **"Location"** and renders
`{issue.modelRoomId || 'N/A'}` — the raw **room GUID**, sourced via
`use-quality-data.ts:100` → `quality-data-mappers.ts:59` → `quality-sql-queries.ts:204/272`. "Location
details" directly below it renders `locationDetails` (`:371-393`).

Consequences:
- The dashboard "Location" is **not** the same field as the viewer's `issueLocationId`. Two surfaces, same
  label, different sources — a genuine correctness/consistency defect independent of the zone config.
- On a project with no rooms it shows **`N/A`** — precisely the customer's *"appear as we have missing
  details on the Dashboard"* (107317).
- Room **names are already available client-side**: `duckdb-room-store.ts` reads `project-rooms.parquet`
  with `roomName` and exposes `getRoomById` (`:160-166`). So GUID→name on the dashboard is a small,
  local FE fix — no BE work needed.

### 2f. NEW — a Location dropdown is mostly already plumbed; only the control is missing
Everything a dropdown needs exists except the UI:
- option list: `issueParameters.issueLocations` (`useIssueParameters.ts:71-77`, from the `ISSUE_LOCATION`
  project parameter);
- form state: `locationId` in the form type (`use-issue-form.ts:43`, initialised `:135`, carried through
  `issue-edit.tsx:150/173`, `issueFactory.tsx:18`);
- validation: `locationId` required-ness driven by `ISSUE_LOCATION` (`use-issue-form.ts:402-406`, set in
  `getRequiredFieldsFromV2` `:519-521`);
- outbound write: `set('issueLocationId', form.locationId)` (`format-issues.ts:146`).

⚠️ **But the dropdown would be empty on ML9.** `issueLocations` is populated from the project's
`ISSUE_LOCATION` parameter list, which is the same named-zone configuration that is missing — so option (a)
as the customer imagines it (*"a drop-down with all the different Location"*) **does not by itself solve
their problem**; it needs zones to exist. Whether `ISSUE_LOCATION` params can be populated *independently*
of per-model rooms is a BE/config question (Sachin / Ali) — **not verified here** (see §4).

Conversely option (b) — **hide "Location" when the project has no locations** — is cheap and already has
its guards in code: `issueLocations.length > 0` is already the discriminator in
`getRequiredFieldsFromV2` (`use-issue-form.ts:519`), and the dashboard side has
`duckdb-room-store.hasRoomsData()` (`:211-220`). **Option (b) is the one that actually removes the stated
pain** ("not create confusion / not appear as missing details").

---

## 3. Playbook 6-question status

1. **Observed & reproducible?** ✅ Yes. Empty "Location" + no Location selector on ML9; Darminder
   reproduced it by inspecting the project (106251).
2. **Expected, on whose authority?** ⚠️ **Re-opened.** The original expectation ("like we had in cloud")
   was corrected by the design authority (Darminder). But the customer's **new** premise — *"it is not
   possible to connect the rooms to the different models"* (107317) — is **unverified folklore** and is
   now load-bearing for the whole decision. Needs a yes/no from Darminder.
3. **Smallest broken-vs-working pair?** ⚠️ Still not run. Broken = ML9 (no zones → empty). Working = any
   project *with* zones configured. Note §2c/§2e mean the "working" side would itself show GUIDs, so the
   pair is worth running to confirm both behaviours on both surfaces.
4. **Mechanism?** ✅ FE fully mapped (§2), including the previously-unnoticed dashboard path (§2e). BE side
   (how `issueLocationId` and `modelRoomId` get stamped from named zones, and whether `ISSUE_LOCATION`
   params can exist without per-model rooms) is api-v2 — Sachin / Ali; corroborated in-thread, not verified.
5. **Why now (trigger)?** ✅ Not a regression/deploy. ML9 never had zones configured, and the web-viewer
   workflow differs from the old cloud product.
6. **Who else (cohort)?** ⚠️ Open and important: **every project without named zones configured** shows an
   empty Location on every issue, on both surfaces. ML9 is a sample, not the population. No sweep done.

**Process observation (not a playbook question, but the actual blocker):** this ticket has been silent for
13 days on a **Critical** with three unanswered questions outstanding, two of them 15 days old and one of
them from the customer. The rigor-guardian/coordinator gap the playbook warns about is what is costing time
here — not the diagnosis.

---

## 4. Confidence

- **Diagnosis of the originally reported symptom: 8/10.** FE path read end-to-end, matches the assignee's
  authoritative statement; empty Location fully explained by a null `issueLocationId` (no zones). Unseen
  piece = BE zone→`issueLocationId` stamping (api-v2, out of repo), corroborated in-thread only.
- **§1a (the two missed 07-14 comments and what they say): 10/10** — verbatim from the Jira API.
- **"Mostafa is blocked on Darminder's unanswered 107320, not sitting on a decision": 6/10** — a reading of
  *"waiting on this since it was asked of me"* against the 07-14 timeline. Plausible and actionable, but it
  is an inference about intent; the draft message is written so it works either way.
- **§2e (dashboard Location = raw `modelRoomId`, room names locally available): 8/10** — clear from code;
  only the exact rendering on ML9 is unverified (environment-dependent, and the 07-14 screenshot is
  unviewable — §5).
- **§2f (dropdown mostly plumbed): 7/10** for the FE plumbing (verified); **5/10** for the decisive caveat
  that the option list depends on the same missing zone config — that hinges on a BE/config fact I could
  not check.
- **§2c (GUID-not-label): 7/10** — clear from code, impact only manifests once zones exist.
- **§2d (Phase already surfaced): 5/10** — depends on whether ML9 defines "Phase" as a category type.
- **Recommended next step: 8/10** (up from ~7/10) — it is no longer a judgment call about how to nudge a
  stalled owner; there are two concretely identified unanswered questions, one of which we can answer from
  §2a immediately.

Per `xyz-platform-context/CLAUDE.md`, overall **8/10**: mechanism is clear and the next step is concrete,
but the resolution is a product decision and two sub-facts are environment/BE-dependent.

---

## 5. Attachments — NEEDS HUMAN

None viewable (Jira/staging binary media behind auth; the `blob:` refs in description/comments are
placeholders). The core diagnosis does not depend on them — Darminder stated it verbatim in text — but the
07-14 one is now the most useful of the set.

- ⚠️ **NEEDS HUMAN (most useful this pass):** `image-20260714-113920.png` (Yash, 07-14, attached to comment
  107317, 59.9 KB, 321×761 per the comment markup) — the customer's *"you can see what I refer to"* snap of
  the surface showing missing Location. **Its dimensions suggest the narrow dashboard quality
  issue-details panel, which would confirm §2e** (the complained-about "Location" is the `modelRoomId` one,
  not the viewer's `issueLocationId`). Do not treat that as confirmed — it needs a human to look.
- ⚠️ **NEEDS HUMAN:** `image-20260701-092301.png` and `image-20260701-092309.png` (Yash, 07-01) — presumed
  the two original customer screenshots of the QA form / detail. Not verified.
- ⚠️ **NEEDS HUMAN:** `image-20260701-114131.png` (Darminder, 07-01, comment 106251, 156.9 KB) — per its
  caption, evidence that rooms/zones are not set up on ML9. Contents not independently verified.
- ⚠️ **NEEDS HUMAN:** inline `blob:` images in the description and comment 106245 — placeholder refs, not
  fetchable.

---

## 6. Doc / KB gaps noted (not edited — outside PLT-2858 folder per task scope)

- `dashboard/quality-tab.md` documents the QLT tab (issue list, filters, categories) but says **nothing
  about the issue "Location" fields**: neither the auto-derived zone `issueLocationId`, nor the free-text
  `locationDetails`, nor the dashboard panel's separate `modelRoomId`. Worth a KB entry once the decision
  lands — §2a is the table to paste.
- `dashboard/pitfalls.md` candidate (from §2a/§2e): *"three different fields are labelled 'Location' on QA
  issues — `issueLocationId` (viewer, auto from named zones), `locationDetails` (free text), and
  `modelRoomId` (dashboard panel). Two surfaces render raw GUIDs; both show empty/N-A when a project has no
  configured rooms."*
- Naming drift (also flagged on PLT-2815): `CLAUDE.md` layout lists `qlt-quality.md`; the actual file is
  `dashboard/quality-tab.md`.

---

## 7. Cross-ticket relations

- **PLT-2815** (`quality-management`, With Customer) — sibling in the same domain; both are "the number/field
  the customer sees is a *data/reference* artifact, not a code bug". Different mechanism, no shared fix.
- **PLT-2892** (`viewer-and-model`) — its context notes a **`project-rooms` error** dismissed as "unrelated
  noise". §2e/§2f show `project-rooms.parquet` is exactly what is absent on a project with no configured
  rooms (`duckdb-room-store.hasRoomsData()` exists precisely to tolerate that). **Hypothesis only, 4/10:**
  the PLT-2892 project-rooms noise may be the *same* no-rooms-configured condition surfacing elsewhere.
  Worth one check by whoever touches either ticket; do not merge them on this basis.
- **Board theme (with PLT-2874 / PLT-2884 / PLT-2917):** "two surfaces disagree about the same thing while
  the FE faithfully renders whatever it was handed." §2e is a fourth instance — here the two surfaces
  render *different fields under the same label*, which is the FE's own defect rather than a backend
  disagreement. Note the distinction if that pattern gets written up in `pitfalls.md`.
