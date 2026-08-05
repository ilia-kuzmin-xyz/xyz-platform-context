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
- 107208 (07-13, **Mostafa**): *"leave it with me."* — Mostafa (PO) took ownership of the
  workflow/education follow-through.
- 107317 (07-14, **Yash relaying the customer, Mikel**) — ⚠️ **MISSED by the 07-13 and 07-22 runs;
  first recorded 2026-07-30.** The customer has moved off "teach us how" and proposed a **product
  decision with two options**: *"As far as I understood, it is not possible to connect the rooms to
  the different models. If it is possible to have a **drop-down list with all the different Location
  to select** on the QA, that would be great. In case it is not possible, it would be ideal to
  **remove the Location part on the QA**, to not create confusion and not appear as we have missing
  details on the Dashboard."* (screenshot `image-20260714-113920.png` attached — see §5.)
  → This materially reframes the ticket: the customer is **not** going to configure zones, and is
  asking for either (i) a manual Location selector — i.e. exactly the field Darminder said is
  auto-derived-by-design (106248) — or (ii) hiding the field. Both are **FE/product changes**, not
  config/education. The "hand them a how-to" plan in the drafted action is no longer what the
  customer is asking for.
- 107320 (07-14, **Mostafa → Darminder**): *"what is the difference between location and location
  details"* — ⚠️ **also missed by prior runs, and still UNANSWERED by Darminder (16 days).** This is
  a direct, closed question to the assignee that `context.md §2a` already answers in full.
- 107532 (07-16, **Ilia**): follow-up nudge — *"have you got any updates on this?"*
- 107533 (07-16, **Mostafa**): *"waiting on this since it was asked of me."* Read together with
  107320, the most likely reading is **not** "Mostafa is sitting on it": Mostafa asked Darminder a
  blocking clarification on 07-14 and never got an answer, so "waiting on this since it was asked
  of me" plausibly means *he* is waiting. **The stall may be on Darminder, not Mostafa** — the
  07-22 run's "stalled on the SAME owner" framing got this wrong.
- 108643 (07-31, **Yash**): *"any update on this?"* — a fourth nudge, into the same silence. **No
  reply of any kind as of 2026-08-03.** See §7b below.

**Net thread state (revised 2026-07-30):** Root cause (empty Location = no named zones configured on ML9)
is established and agreed by dev (Darminder) and product (Mostafa) — that part is unchanged. What is
unresolved has **shifted** since the customer's 07-14 reply (107317): it is no longer only "who configures
zones and how", because the customer has said they won't/can't and has asked for a **product change
instead** — either a selectable Location drop-down or removal of the Location field from the QA form and
dashboard. Open items now: (1) product decision on the customer's two options (drop-down vs remove) —
**Mostafa/Pietro**; (2) Darminder's unanswered 107320 (location vs location details) — **Darminder**,
16 days open, answerable in one line from §2a; (3) the "surface Phase" go/no-go — still open.

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
- ⚠️ **NEEDS HUMAN:** `image-20260714-113920.png` (Yash, 07-14, attached to comment 107317) — **new,
  first noted 2026-07-30**; attachment content endpoint returns **HTTP 403** to this agent. Per the
  customer's caption it shows the Dashboard surface where the empty Location "appear[s] as we have
  missing details". Moderately load-bearing: it is the customer's own evidence for the "remove the
  Location part" request. Do not guess contents.
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

## 7. Re-verified 2026-07-30 (light pass → escalated to partial re-investigation)

**Live fetch:** `getJiraIssue` PLT-2858, 26 comments, `updated = 2026-07-16T14:44:34+01:00`.
Status **In Analysis**, priority **Critical**, assignee **Darminder Atker** — all unchanged.

**No new activity since 07-16 — confirmed.** But the pass was upgraded from "light re-verify" because
the live fetch surfaced **two 07-14 comments that both prior runs (07-13, 07-22) never recorded**:
`107317` (customer's drop-down-or-remove request) and `107320` (Mostafa's unanswered question to
Darminder). Both are now written into §1. The 07-13 run predates them; the 07-22 run should have
caught them and did not — treat the 07-22 summary line for this ticket as **incomplete, not wrong**.

**Stall durations as of 2026-07-30:**
| Clock | Since | Days |
|---|---|---|
| No comment of any kind on the ticket | 107533, 07-16 | **14** |
| Mostafa's 107320 unanswered by Darminder | 07-14 | **16** |
| Customer's drop-down-or-remove request unanswered | 107317, 07-14 | **16** |
| Mostafa's "leave it with me" un-converted | 107208, 07-13 | **17** |
| Customer's "we don't know how" | 106728, 07-07 | **23** |

Critical-priority ticket, customer-facing Freshdesk #7286 still Open, three separate threads of
silence. The 07-22 run's "consider looping Pietro if no answer soon" threshold is **crossed**.

**Hypothesis changes (root cause itself unchanged — still the zones-never-configured product/process
gap, 8/10, not re-derived):**
1. **Ownership of the stall is re-attributed.** Prior runs read this as "stalled on Mostafa". With
   107320 visible, the more likely reading is a **two-way deadlock**: Mostafa is waiting on Darminder's
   clarification, Darminder is waiting on product direction, and nobody has said so out loud. This is
   the playbook's *"open question without an addressee floats unanswered"* anti-pattern, twice over.
2. **The ask has changed shape.** The drafted action's Q1 ("who owns zone setup + is there a how-to")
   is now **partly moot** — the customer pre-empted it on 07-14 by saying they can't do it and asking
   for a UI change instead. The live decision is now *drop-down vs remove the field*, which is a
   product call with FE work behind either branch.
3. **§2c is now on the critical path, not a side-finding.** If product picks the drop-down branch, the
   GUID-not-label gap (`issue-details.tsx:139`) must be fixed in the same change, and a *writable*
   `issueLocationId` path would be genuinely new FE+BE work (the field is read-only by design today).
   If product picks "remove", §2c dies with it. Worth stating so the decision is costed correctly.
4. Cohort question (§3 Q6) is **unchanged and still open** — every project without configured zones.

---

## 7b. Re-verified 2026-08-03 — fourth nudge, still zero reply; effort estimate for the dropdown corrected

**Live fetch:** `getJiraIssue` PLT-2858, 27 comments, `updated = 2026-07-31T13:27:32+01:00`. Status
**In Analysis**, priority **Critical**, assignee **Darminder Atker** — all unchanged. One new
comment since 07-30: Yash's 108643 (07-31, "any update on this?" — logged in §1 above).

**Stall durations as of 2026-08-03:**
| Clock | Since | Days |
|---|---|---|
| Fourth consecutive nudge with zero substantive reply | 108643, 07-31 | **3** |
| No *substantive* (non-nudge) comment of any kind | 107533, 07-16 | **18** |
| Mostafa's 107320 unanswered by Darminder | 07-14 | **20** |
| Customer's drop-down-or-remove request unanswered | 107317, 07-14 | **20** |
| Mostafa's "leave it with me" un-converted | 107208, 07-13 | **21** |
| Escalate-to-Pietro recommended (07-24 run) but never executed | 07-24 | **10** |
| Escalate-to-Pietro recommended a second time (07-30 run) but never executed | 07-30 | **4** |

This is now the single stalest, most-repeatedly-escalated-on-paper-but-never-in-Jira open loop on
the whole board. Two separate prior runs (07-24, 07-30) drafted "loop Pietro directly" and it has
not happened — the recommendation itself is not the bottleneck, posting it is.

**Correction to the recommended action's cost framing (this run, hc-frontend research):** the
prior `recommended-action.md` costs the customer's "drop-down" option as "real FE+BE work" because
the zone `Location` field is read-only by design. That's true for the *zone* field, but the
customer's actual ask can be served more cheaply than assumed:

- `useIssueParameters.ts` already fetches `issueLocations: {issueLocationId, location}[]`
  (`issue-api-service.types.ts:176-179`) — already the exact `{id, label}` shape a dropdown needs —
  and `issue-form.tsx:56` already has it in scope.
- Form-state plumbing for `locationId` already exists end-to-end: `use-issue-form.ts:43,135`
  (field), `:402-406` (conditional required-rule), `format-issues.ts:146` (submit mapping already
  writes `issueLocationId`). Two near-identical `FormSelect` blocks already exist for Stage/Outcome
  (`issue-form.tsx:556-578`) as a direct template.
- **Estimate: ~10–15 lines, no backend change needed for the control itself.** This is a small FE
  change, not "real FE+BE work" as previously scoped.
- **Caveat that keeps this from being a silver bullet for ML9 specifically:** if `issueLocations`
  is sourced from the same zone hierarchy that's empty for ML9 (unconfirmed — BE, api-v2), the
  dropdown would ship with an empty list for this customer until zones exist, i.e. the FE control is
  cheap but may not unblock *this* customer without the BE prerequisite. **This is now the one
  question that actually needs asking of product/BE** — replacing "should the BIM team configure
  zones" (which the customer already declined) with "is `issueLocations` populated independently of
  the 3D zone hierarchy, or from the same source."
- **Removing the Location field** (the customer's other option) remains trivially small — delete
  one `<Detail>` line in `issue-details.tsx:139`.

**Net effect on the decision Mostafa/Pietro need to make:** both of the customer's options are now
known to be *cheap* on the FE side. The decision is no longer "pick the affordable one" — it's a
straight product call (show a maybe-empty dropdown vs. remove the field vs. hide-when-empty), and
the one remaining unknown (does `issueLocations` need zones too) should be asked alongside it, not
instead of it.

## Re-verified 2026-08-04 (light pass, this run)

Live JQL fetch of the board: `updated` for this ticket is still `2026-07-31T13:27:32+01:00` — bit-for-bit identical to what the 08-03 run already captured as unchanged. Since a Jira comment or status change always bumps `updated`, this confirms zero new activity in the 24h between runs without needing a full re-read. Carrying forward the 08-03 finding as-is; no new investigation performed.

## Re-verified 2026-08-05 (light pass, this run)

Live JQL fetch: `updated` still `2026-07-31T13:27:32+01:00`, comment count unchanged at 27. Mostafa's
07-14 question to Darminder and Yash's fourth nudge (07-31) both remain unanswered — the stall is now
**35 days** from the customer's original "we don't know how" (06-16 equivalent per prior runs' count)
and **5 days** since the last nudge specifically. The escalate-to-Pietro recommendation has stood,
unposted, across four consecutive runs (07-24, 07-30, 08-03, 08-04) on a Critical-priority ticket —
see the "needing human now" note in this run's top-level summary.
