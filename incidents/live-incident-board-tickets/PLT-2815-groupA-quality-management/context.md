# PLT-2815 — "estimate rework cost error"

## 2026-09-01 — confirmed unchanged, delta-checked against live Jira

Status still **With Customer**. Last comment still 106553 (Yash, 07-06, Freshdesk "Closed" sync —
the Jira status and the Freshdesk sub-status disagree, unchanged since prior runs). No activity
since 07-06. This is the oldest silent thread on the board (nearly two months) — see this run's
notification note.

- **Domain slug:** quality-management
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2815
- **Type:** Live Incident · **Priority:** Major · **Status:** With Customer
- **Assignee:** Yash Patel (also the incident coordinator / client-comms owner — note)
- **Reporter (Jira):** Masum Ahmed (support) · **Original customer:** "Paolo" · **Project:** ML9 (EUR)
- **Linked Freshdesk:** #7126 — **already Closed 2026-07-06** (see discrepancy below)
- Triage date: 2026-07-13

---

## 1. What "error" means here — WRONG VALUE, not a crash

This is a **perceived wrong-value / inverted-ordering** report, **not** a hard error/crash and
**not** a UX-only confusion. Nothing throws; the UI renders a number the customer believes is
wrong.

**Observed (exact surface + values).** In the issue-creation form ("Estimated rework cost" field,
auto-suggested value), for **CSA → Underground Services** on project ML9 the auto-calculated cost is:
- Category 3: **€684.00**
- Category 4: **€843.60**

**Customer's expectation & authority.** Paolo expects **Cat 3 > Cat 4** because "Category 3 issues
have a higher impact compared to Category 4." He filed it high-priority because under-valuing Cat 3
issues at scale materially understates rework cost (description, created 2026-06-17 09:36).

The reference table's own design **agrees with the customer's premise**: within a consistent series
it is monotonic decreasing (generic CSA fallback: Cat1 £16,286.32 → Cat2 £7,871.72 → Cat3 £2,003.33
→ Cat4 £740.00; `rework_reference.json:80-83`). So Cat3 *should* exceed Cat4. The customer is not
wrong about the direction.

## 2. Mechanism — confirmed with exact arithmetic (this is the crux)

Rework cost is computed **entirely in the frontend** from a shipped static reference table, then FX-
converted. No backend aggregation / data-pipeline is involved.

Code: `hc-frontend/.../issue-properties/blocks/hooks/use-rework-cost-calculation.ts`
- `:5` imports `../rework_reference.json` (the lookup table)
- `:18-23` **hard-coded** GBP→currency factors: `EUR: 1.14`
- `:94-121` **Rule 1** — exact match on Category + Discipline + Package
- `:123-144` **Rule 2** — fallback to Category + Discipline (Package = "") = "generic package cost"
- `:146-154` **Rule 3** — none found → `null`; `:64-73` Cat5 → 0
- Displayed via `form-fields/issue-cost-field.tsx:33,55-62` (auto-populate) and `:142-159`
  ("Suggested cost" click-to-apply)

Reference data (`rework_reference.json`, matches the Confluence table exactly):
- `:67` `Category 3 | CSA | Underground Services | 600.00`
- **No `Category 4 | CSA | Underground Services` row exists**
- `:83` `Category 4 | CSA | "" | 740.00` (generic CSA fallback)

Reproduction of the customer's two numbers (base £ → €, ×1.14):
- Cat 3: **£600.00 × 1.14 = €684.00** → matched by **Rule 1** (exact package match). ✓ = customer's Cat 3
- Cat 4: **£740.00 × 1.14 = €843.60** → matched by **Rule 2** (generic CSA fallback, because there is
  no package-specific Cat 4 row). ✓ = customer's Cat 4

**Root cause of the visible inversion (two compounding DATA facts, not a code bug):**
1. The two numbers are **not computed by the same rule** — Cat 3 is a package-specific value; Cat 4 is
   a discipline-level *fallback average*. Apples-to-oranges by construction of the fallback ladder.
2. The **`Cat3 | CSA | Underground Services = £600` value is anomalous**: it is the lowest Cat 3 in the
   whole table, it undercuts the generic Cat 3 CSA (£2,003.33) *and* the generic Cat 4 CSA (£740), and
   it sits on a steep cliff within the package (Cat1 £54,560 → Cat2 £7,125.71 → Cat3 £600;
   `rework_reference.json:65-67`). That £600 < £740 is exactly what makes Cat4 render above Cat3.

The **code is behaving as specified** — it faithfully implements the documented fallback rules. The
fix, if any, is **data** (correct the £600 Underground Services Cat 3 figure and/or add a
package-specific Cat 4 row) — a product/UX decision, not a dev change.

**Smallest broken-vs-working pair.** *Broken:* CSA / Underground Services (Cat3 €684 < Cat4 €843.60 —
package-specific Cat3 vs generic-fallback Cat4). *Working (monotonic):* any series where both categories
resolve by the same rule, e.g. generic CSA Cat3 £2,003.33 > Cat4 £740.00, or CSA / Doors & Ironmongery
Cat3 £1,440 > Cat4 £1,120 (`rework_reference.json:22-23`). The diff *is* the diagnosis: a
package-specific Cat3 undercut by a generic-fallback Cat4.

**Trigger ("why now").** Not a regression — no deploy needed. It surfaces only when a user files a
CSA / Underground Services issue and compares a package-specific Cat3 against a fallback Cat4. The
reference table (Confluence, authored by Pietro Desiato) was last modified **Oct 23, 2025**; the
shipped JSON matches it. No evidence of a recent change causing this — it is latent data shape.

## 3. Expected reference — on whose authority

The numbers come from the **"Issue Rework Reference Table"** Confluence page (UX / Digital Product
Team space, id 1630633988, author **Pietro Desiato**, last modified Oct 23, 2025):
https://xyzreality.atlassian.net/wiki/spaces/UX/pages/1630633988/Issue+Rework+Reference+Table
It documents the exact fallback ladder the code implements (Cat+Disc+Pkg → Cat+Disc → Disc → null;
Cat5 → 0; all-missing → 0). **The reference table is the authority for the expected value — it is a
product/UX-owned dataset, not a formula the customer can dispute on engineering grounds.**

## 4. What the ticket is currently waiting on the customer for

The dev/product path is **closed on the engineering question**:
- **Rishi Bhugobaun, 2026-06-18 09:13** (comment 105268): "This does not appear to be a bug and is
  currently with **Mostafa** to discuss whether the Issue Rework Reference Table needs to be updated."
- **Mostafa Kamel Hussien via Rishi, 2026-06-23 10:56** (comment 105647): "I would leave it as
  intended for now and say if they have any questions regarding the numbers, they can reach out to
  **Josh from customer success**."

So "With Customer" means: **we have delivered the product answer** ("values are as intended; they come
from the reference table; questions → Josh, customer success") and are **waiting for the customer
(Paolo) to either accept it or come back with specific questions.** The ball is legitimately in the
client's court — but it has been there ~3 weeks with no reply.

**Discrepancy to flag:** the linked **Freshdesk #7126 was set to Closed on 2026-07-06** (comment
106553), yet the Jira remains "With Customer." The customer-facing ticket appears effectively closed
while the Jira is orphaned open.

## 5. Doc references & gaps

- `xyz-platform-context/dashboard/quality-tab.md` documents QLT but **says nothing about rework-cost
  calculation** (it covers issue lists, filters, categories only). `dashboard/pitfalls.md` has no
  entry for it either. **Doc gap:** the rework-cost reference-table mechanism + hard-coded FX factors
  are undocumented in the KB. (Not editing outside this folder per task constraints — noting only.)
- Note also: `CLAUDE.md` layout lists `qlt-quality.md`; the actual file is `quality-tab.md`.

## 6. Secondary observations (not root cause)

- **Hard-coded FX** (`use-rework-cost-calculation.ts:18-23`, EUR 1.14) is a latent maintenance risk —
  stale rates will drift all EUR/USD projects — but it is *not* the cause here (it faithfully converts
  the correct base figures; both reported numbers reproduce exactly).

## 7. Hypothesis & confidence

**Hypothesis (high confidence):** Not a bug and not a crash. The customer's observation is real but is
an artifact of (a) the fallback ladder comparing a package-specific Cat3 against a generic-discipline
Cat4, and (b) an anomalously low `£600` value for `Cat3 | CSA | Underground Services` in the
product-owned reference table. Any correction is a **data/product decision** already ruled "leave as
intended for now" by Mostafa.

**Confidence: 9/10 on the diagnosis** — code path read end-to-end, shipped JSON verified against the
Confluence source, and both customer-reported figures reproduced to the exact cent (600×1.14=684.00,
740×1.14=843.60). **~7/10 on the recommended next step**, which is a coordination/comms judgment (see
recommended-action.md), not a code-testable fact.

**Needs human (does not block diagnosis):**
- ⚠️ 2 Jira attachments (`Screenshot 2026-06-17 135944.png`, `...140026.png`, by Yash) and the 2 inline
  blob images in comment 105170 — **not viewable by me** (binary / staging media). They are the
  dashboard screenshots of the two values; the exact figures are already in the text description and
  independently reproduced, so they are corroborative, not load-bearing. Do not guess their contents.
- ⚠️ The Confluence page has one embedded flow/screenshot image (blob) I could not view; the full
  reference table itself is present as text, so nothing load-bearing is missing.

---

## 8. Re-verified 2026-07-30 (light pass) — still unchanged; now pure housekeeping

**Live fetch confirms zero movement.** Status **With Customer**, priority Major, assignee Yash Patel,
`updated = 2026-07-06T10:18:45+01:00`, `resolution = null`, `resolutiondate = null`. **13 comments,
same 13 as on 07-13** — the newest is still comment **106553** ("Freshdesk #7126 status changed to:
Closed", 2026-07-06). No new comments, no status change, no assignee change since. Third consecutive
run (07-13 → 07-22 → 07-30) with no delta.

**Staleness: 24 days** since the last Jira update (2026-07-06 → 2026-07-30); **~6 weeks (43 days)**
since the ticket was created (2026-06-17); **37 days** since the last substantive engineering/product
comment (Mostafa's "leave it as intended", 2026-06-23). The 07-13 drafted nudge does **not** appear to
have been sent — there is no comment on the ticket after 07-06, so the "wait for the customer" clock
has not actually been restarted by any outreach from us.

**This is no longer an investigation — it is administrative housekeeping.** All six playbook questions
are answered and closed (see §§1–3): observed value reproduced to the cent, expected value's authority
identified (product-owned Confluence table), broken-vs-working pair diffed, mechanism read end-to-end
in code, trigger established as latent-data-shape (no regression, no deploy), cohort bounded (any
package-specific Cat3 undercut by a generic-fallback Cat4 — a data question, not an incident cohort).
The product decision ("leave as intended") was taken on 2026-06-23 and never revisited. The
customer-facing Freshdesk parent **#7126 is Closed** (twice: 07-03 and again 07-06). **Nothing is
technically or commercially outstanding — the Jira is simply orphaned open behind a closed support
ticket.** No further diagnostic work is warranted; re-running deeper analysis on future passes would be
wasted effort. Diagnosis confidence stays **9/10**; nothing new to test.

**Consequence for the recommended action:** after 24 days of silence, another soft nudge is the wrong
instrument — it re-opens a settled conversation with the client to obtain a confirmation we do not
actually need (the support ticket is already closed on the customer's side). `recommended-action.md`
has been revised this run from "(c) nudge" to a direct **close-out** recommendation. See that file.

## Re-verified 2026-08-04 (light pass, this run)

Live JQL fetch of the board: `updated` for this ticket is still `2026-07-06T10:18:45+01:00` — bit-for-bit identical to what the 08-03 run already captured as unchanged. Since a Jira comment or status change always bumps `updated`, this confirms zero new activity in the 24h between runs without needing a full re-read. Carrying forward the 08-03 finding as-is; no new investigation performed.

## Re-verified 2026-08-05 (light pass, this run)

Live JQL fetch: `updated` still `2026-07-06T10:18:45+01:00`, comment count unchanged at 13. **30 days**
stale now. The direct close-out recommended since 07-30 (five consecutive runs) still has not been
posted — this is the same "recommended but not executed" pattern flagged on PLT-2858, now on two of
the seven in-scope tickets.

## Re-verified 2026-08-10 (light pass, this run)

Live fetch: `updated` still `2026-07-06T10:18:45+01:00`, comment count unchanged at 13, status still
`With Customer`, resolution still `null`. **35 days stale.** The close-out recommendation has now
stood unposted across eight consecutive runs (07-30 through today). Nothing left to diagnose — this
is purely a "someone needs to click transition and paste the drafted comment" item. Included in this
run's "needing human now" list alongside PLT-2858, though at lower urgency (Medium-ish administrative
cleanup, not a live customer wait).

## Re-verified 2026-08-11 (light pass, this run)

Live fetch: `updated` still `2026-07-06T10:18:45+01:00`, comment count unchanged at 13. **36 days
stale.** Close-out recommendation unposted across nine consecutive runs. No re-diagnosis performed —
nothing left to diagnose, only to execute.

## 2026-08-14 — Confluence reference table read directly; the "as intended" numbers verified at source

**Jira state (supplied to this run, not re-fetched):** status `With Customer`, priority Major,
assignee Yash, `updated = 2026-07-06` — **39 days stale**, comment count unchanged at 13. Tenth
consecutive run with no delta. Nothing new to diagnose.

**New this run: the Confluence source was actually opened** (prior runs verified the shipped JSON
against it; this run read the page itself via the Atlassian MCP). Page id 1630633988, "Issue Rework
Reference Table", space UX / Digital Product Team, author Pietro Desiato, **last modified Oct 23,
2025 — i.e. unchanged since before the ticket was raised, and unchanged since Mostafa's 23 June
"leave it as intended" decision.** Nobody has quietly edited the table in the meantime.

Verified verbatim from the page body:
- `CAT3 | CSA | Underground Services | £600.00` — present, exactly as `rework_reference.json:67`.
- **No `CAT4 | CSA | Underground Services` row exists** on the page either. Confirmed by reading the
  complete table: CSA/Underground Services appears only at CAT1 (£54,560.00), CAT2 (£7,125.71) and
  CAT3 (£600.00).
- `CAT4 | CSA | (blank package) | £740.00` — the generic CSA fallback the Cat 4 figure resolves to.
- The page's own fallback ladder (Cat+Disc+Pkg → Cat+Disc → Disc → null; Cat5 → 0; all missing → 0)
  matches what `use-rework-cost-calculation.ts:94-154` implements.

So both customer figures re-derive at source: 600 × 1.14 = €684.00 (package-specific rule) and
740 × 1.14 = €843.60 (generic CSA fallback). The £600 anomaly flagged in §2 is confirmed as
product-owned data, still live in the table: it is below the generic Cat 3 CSA (£2,003.33) and below
the generic Cat 4 CSA (£740.00). **The diagnosis needed no correction; it is now verified against the
authority rather than against the shipped copy of it.** Diagnosis confidence 9/10 → **10/10 on the
arithmetic and the data**, unchanged on everything else.

One cosmetic oddity noticed on the page, not load-bearing and not worth a ticket on its own: the four
`Mechanical` generic-fallback rows at the bottom of the table are missing their empty Package cell,
so they render as three columns instead of four. The values (Cat1 £7,920 … Cat4 £1,088) match the
shipped JSON, so it is a table-formatting slip in Confluence, not a data discrepancy.

**Nothing else changed.** The close-out recommended since 07-30 remains the only outstanding action;
see the 2026-08-14 note in `recommended-action.md`.

## 2026-08-19 — re-verified, unchanged; flag re: new related ticket PLT-3061

Live fetch: identical on every field to the record above (13 comments, newest still 106553,
`updated` still 2026-07-06). **44 days stale**, close-out unposted across **14 consecutive runs**.

**New this run:** a fresh ticket, **PLT-3061** ("CAT2 Rework cost not auto populating"), was
triaged today and hits the exact same subsystem — `use-rework-cost-calculation.ts` +
`rework_reference.json`, the same reference-table-driven rework-cost lookup this ticket's diagnosis
covers. PLT-3061's working hypothesis (pending confirmation) is a **missing Discipline row** for the
customer's project, causing a total miss (`null`) rather than this ticket's mismatched-fallback
inversion — same class of defect (product-owned reference-table coverage gap), different shape (total
miss vs. wrong-rule match). See `PLT-3061-groupA-quality-management/context.md`. Promoted to
`recurring-defect-patterns.md` as a new pattern this run (two confirmed occurrences: this ticket +
PLT-3061) — see that file. Does not change this ticket's own recommended action (still: close it out,
already resolved as "as intended" by product on 06-23).

## 2026-08-20 — re-verified, unchanged; PLT-3061's hypothesis has now CONFIRMED, which affects §3 of the action

**Live fetch:** 13 comments, identical to the recorded set — newest still **106553** ("Freshdesk #7126
status changed to: Closed", 07-06). Status `With Customer`, priority Major, assignee Yash Patel,
`resolution = null`, `updated = 2026-07-06T10:18:45+01:00`. **45 days stale**, close-out unposted across
**15 consecutive runs** (07-30 → 08-20). Nothing re-diagnosed; there is nothing left to diagnose.

**What is new is next door.** The 08-19 note above flagged PLT-3061 as a second occurrence of the same
reference-table coverage problem, with its cause still hypothetical. **It confirmed on 08-19 evening.**
Darminder pulled the values off the customer's issue (comment 109980): Category 2, Discipline **`CSA-TCB`**,
Package **`Underground Services`** — and `CSA-TCB` appears nowhere in `rework_reference.json`, which carries
only `CSA`, `Electrical` and `Mechanical`. See `PLT-3061-groupA-quality-management/context.md` (2026-08-20).

Two things about that are directly relevant to this ticket:

1. **Same project, same package, adjacent discipline.** PLT-3061's failing combination is `CSA-TCB` +
   `Underground Services` on ML9. This ticket's is `CSA` + `Underground Services` on ML9 — the very row
   (`rework_reference.json:65-67`) whose Cat 3 value of £600 was flagged as anomalous in §2. So ML9 runs two
   CSA-flavoured discipline names against the same package, one covered and one not.
2. **This ticket's "optional follow-up" question is no longer hypothetical or homeless.** §3 of
   `recommended-action.md` recommended asking Mostafa and Pietro whether `Cat3 | CSA | Underground Services
   = £600` is correct and whether a package-specific Cat 4 row should be added — raised as a separate item
   that, predictably, nobody ever raised. **Mostafa and Pietro are now actively being asked about this exact
   table, about this exact package, on PLT-3061 as of 08-19.** That is the cheapest opening this question
   has had in two months.

**None of this reopens the diagnosis or changes the close-out recommendation.** This ticket's own answer was
settled by product on 06-23 ("leave it as intended"), reproduced to the cent, and verified against the
Confluence source on 08-14. It should still be closed. The only change is that its orphaned follow-up
question now has a live thread to travel on.

## 2026-08-21 — no Jira change; the PLT-3061 thread it was riding on is now itself past 24h silent

Live fetch: status `With Customer`, 13 comments, `updated = 2026-07-06T10:18:45` — identical to the last
run; **46 days** since that update, **17th consecutive run** recommending the close that has not been
posted. The opening this ticket's orphaned £600-anomaly question was riding on (PLT-3061's live Mostafa/
Pietro thread) has itself gone quiet — see `PLT-3061-groupA-quality-management/context.md`, 2026-08-21 —
so there is no fresher opening yet, just a slightly older one. Close-out recommendation is unaffected
either way; it does not depend on that question being asked.

## 2026-08-25 — no change

Live fetch: status `With Customer`, priority Major, assignee Yash Patel, 13 comments, newest still
2026-07-06 (Freshdesk closed) — byte-identical to every run since 08-18. **50 days stale.** The
close-out draft in `recommended-action.md` remains unposted across (by this folder's own running
count) 18 consecutive runs. Its optional follow-up (the €600 Cat3/CSA/Underground-Services row) still
has nowhere fresher to land — PLT-3061's thread, the intended landing spot, has itself gone quiet
since 08-20. Nothing re-derived.

## 2026-08-26 — no change

Live fetch: status `With Customer`, priority Major, assignee Yash Patel, resolution `null`,
`updated = 2026-07-06T10:18:45+01:00`, 13 comments, newest still 106553 (Freshdesk #7126 closed
07-06) — byte-identical to 08-25 and every run since 08-18. **51 days stale.** The close-out draft
in `recommended-action.md` remains unposted across 19 consecutive runs. Its optional follow-up (the
€600 Cat3/CSA/Underground-Services row) still has nowhere fresher to land — PLT-3061's thread
(Darminder's 08-19 tag of Mostafa/Pietro) is now ~7 days unanswered, still quiet. Nothing re-derived.

## 2026-08-27 — no change

Live re-fetch: status `With Customer`, priority Major, `updated` still 2026-07-06T10:18 —
unchanged, **52 days** stale. Close-out recommendation still unposted, now **20 consecutive runs**.
Nothing re-derived.

## 2026-08-28 — no change

Live re-fetch: status `With Customer`, priority Major, `updated` still 2026-07-06T10:18 —
unchanged, confirmed via direct `getJiraIssue` fetch (13 comments, same ids, newest still 106553).
**53 days** stale. Close-out recommendation still unposted, now **21 consecutive runs**. Nothing
re-derived.

## 2026-08-31 — no change

Live re-fetch (`getJiraIssue` with `fields:["comment","status","updated",...]`): status
`With Customer`, priority Major, assignee Yash Patel, resolution `null`, `updated =
2026-07-06T10:18:45+01:00`, 13 comments, newest still 106553 (Freshdesk #7126 closed 07-06) —
byte-identical to 08-28. **56 days stale.** Close-out recommendation now unposted across
**22 consecutive runs**.

Per the run protocol, the technical root cause was settled many runs ago (see §2 and the 08-14
Confluence verification) and was **not** re-investigated this run. Nothing re-derived. The only
thing outstanding is administrative: post the close-out comment and transition with a resolution.

§3's optional reference-table question (the £600 Cat3 / CSA / Underground Services row) still has
nowhere fresher to land — PLT-3061's thread is itself parked on Josh's return (~09-02) — and still
does not gate this close.

## 2026-09-08 — confirmed unchanged, 64 days stale

Live re-fetch: status still `With Customer`, `updated` still 2026-07-06T10:18:45, 13 comments,
newest still the 07-06 "Closed" Freshdesk-automation line. No new Jira activity since 09-07. The
short 2026-08-14 close-out draft in `recommended-action.md` remains unposted — **24th consecutive
run recommending it.** Nothing re-derived; still flagged for human attention (see summary).

## 2026-09-07 — confirmed unchanged, 63 days stale

Live re-fetch: status `With Customer`, priority Major, assignee Yash Patel, resolution `null`,
`updated` still **2026-07-06T10:18:45+0100**, 13 comments, newest still 106553 (Freshdesk #7126
closed 07-06) — byte-identical to every prior snapshot back to 08-28. **63 days** since the last
Jira activity of any kind. Root cause was settled long ago (§2); the only outstanding item is
administrative — post the close-out comment and transition with a resolution. Not re-investigated
this run, per protocol.

## 2026-09-11 (scheduled) — no change, 67 days stale, 27th consecutive run

Live re-fetch (`getJiraIssue`, `fields` incl. `comment`, `attachment`, `status`, `updated`): status
still `With Customer`, priority Major, assignee Yash Patel, `resolution = null`,
`resolutiondate = null`, `updated = 2026-07-06T10:18:45.272+0100`, **13 comments** — read in full,
same 13 ids as every prior run, newest still **106553** (Yash, Freshdesk #7126 → Closed, 07-06).
Same 2 attachments (`59263`, `59262`), unchanged. **67 days** since any Jira activity; **27th
consecutive run** recommending the same close-out that has not been posted. Root cause was settled
long ago (§2, verified at source 08-14) and was not re-investigated this run — nothing has moved
that would warrant it. Not re-flagging the 2 attachments or the inline blobs as new; still the same
confirmed-403, corroborative-only screenshots noted since 2026-06-17/2026-09-09.

## 2026-09-09 — no Jira change (65 days). But two things moved *around* the ticket, and the 08-27 audit has a hole.

**Jira: byte-identical, nothing new.** Live `getJiraIssue`: status `With Customer`, priority Major,
assignee Yash Patel, `resolution = null`, `resolutiondate = null`, `updated =
2026-07-06T10:18:45.272+0100`, **13 comments**, newest still **106553** (Yash, Freshdesk #7126 →
Closed, 07-06). Same 2 attachments (`59263`, `59262`), `issuelinks: []`. **65 days** since any Jira
activity; **25th consecutive run** recommending a close-out that has not been posted. The root cause
was settled long ago (§2, verified at source 08-14) and was **not** re-investigated this run.

Everything below is new, and none of it comes from Jira.

### 1. §3's follow-up question has lost its landing spot — and has arguably been answered by default

The 08-20 note parked this ticket's orphaned "is `Cat3 | CSA | Underground Services = £600` correct?"
question on PLT-3061, on the reasoning that Mostafa and Pietro were freshly engaged on this exact
table. **That opening closed on 09-02.** Josh replied on PLT-3061 and *declined* a reference-table
change, proposing the customer filter by vendor instead; that ticket is now recommended for
`With Technical Support` and its remaining action is Josh talking to the ML9 project manager. See
`PLT-3061-groupA-quality-management/context.md` § 2026-09-02.

Consequence for this ticket: product has now declined to touch this table **twice** — Mostafa
2026-06-23 ("leave it as intended"), Josh 2026-09-02 (declines the `CSA-TCB` rows). §3 should stop
being carried as an open follow-up waiting for a thread to ride on. It is not going to be asked that
way, and it does not gate the close. Marked superseded in `recommended-action.md` this run; the
underlying data question is re-homed as its own item (see §3 below), not deleted.

### 2. The 08-27 audit branch is real, pushed, and has NO pull request

`debug-instructions.md` (08-27) describes a branch. It exists and the description is accurate:

- `origin/PLT-2815-rework-cost-ladder-audit`, one commit **`f480450`** ("PLT-2815: audit the
  rework-cost table for specific-vs-fallback inversions"), 27 Aug 2026, on top of `master` at
  `b9d4893`. Two new files, 235 additions, no behaviour change:
  `.../issue-properties/blocks/rework-cost-ladder-audit.ts` and `...-audit.test.ts`.
- **`list_pull_requests(head=XYZReality:PLT-2815-rework-cost-ladder-audit, state=all)` returns `[]`.
  There is no PR, open or closed.** VERIFIED. The branch has sat pushed and unraised for 13 days.

That matters mainly because `debug-instructions.md` reads as though the work is queued. It is not
queued; it is stranded. Same failure mode already recorded on PLT-3061 (its 08-24 diagnostic branch,
also unmerged and unraised).

### 3. The audit's arithmetic is right, but its filter excludes a fourth live case of Paolo's exact complaint

Re-derived the whole table independently this run (script over `rework_reference.json`, all 90 rows,
37 distinct Discipline+Package ladders, each category resolved through the real ladder — Rule 1 exact
match, else Rule 2 generic, per `use-rework-cost-calculation.ts:94-121` and `:123-144`). **Both of the
08-27 branch's headline counts are exactly correct** — nothing to retract:

- `specific → generic` inversions (a package-specific cost undercut by a generic fallback one
  category up): **5**, and they are precisely the five in `debug-instructions.md`. VERIFIED.
- "12 ladders step upward somewhere": **12** `specific → specific` upward steps. VERIFIED.

**The new finding is about the filter, not the counts.** `rework-cost-ladder-audit.ts`
(`findCrossRuleInversions`) deliberately reports only `lower.source === 'specific' && higher.source
=== 'generic'`; its own comment says *"Deliberately does NOT report inversions between two specific
rows or between two generic rows: those are product's pricing, and there are a dozen of them."*

That justification holds for the ladder as a whole and **fails for the slice this ticket is actually
about.** Paolo's complaint is narrow and specific: *Category 4 renders above Category 3.* Restricted
to Cat3 → Cat4 steps only, there are **four** cases across the 37 ladders, not three:

| Discipline / Package | Cat 3 | Cat 4 | how each resolved | in the audit? |
|---|---|---|---|---|
| CSA / Underground Services | £600.00 | £740.00 (generic) | specific → generic | ✅ (this ticket, ML9) |
| Electrical / Earthing | £1,120.00 | £1,184.00 (generic) | specific → generic | ✅ |
| Electrical / Fire Alarm | £853.33 | £1,184.00 (generic) | specific → generic | ✅ |
| **Mechanical / VESDA** | **£845.71** | **£1,840.00** | **specific → specific** | ❌ **excluded by design** |

`rework_reference.json:77-78`. **Mechanical / VESDA is a live, package-specific Cat 4 priced at 2.2×
its own Cat 3**, needs no fallback to happen, and would produce a complaint textually identical to
this ticket's. Applying the denominator rule: of the 12 `specific → specific` upward steps, **exactly
one is Cat3 → Cat4** — this one. The other 11 all sit at Cat1 → Cat2 or Cat2 → Cat3, where a rising
step is plausibly real pricing for a sparse catastrophic band. So the "there are a dozen of them"
defence discards precisely one row, and it happens to be the one row that reproduces the reported
symptom. VERIFIED by enumeration; the judgement that Cat1→Cat2 rises are acceptable pricing while
Cat3→Cat4 is not remains product's to make, and is INFERRED here.

Clean broken-vs-working pair, same package name under two disciplines: **Electrical / VESDA** is
monotonic (Cat2 £4,120 → Cat3 £2,100 → Cat4 £1,280, `rework_reference.json:74-76`); **Mechanical /
VESDA** inverts. A project that maps VESDA under Mechanical gets the bad ladder; under Electrical,
the good one.

**Effect on the branch, if anyone picks it up:** its test pins the known five, so it will not catch
Mechanical / VESDA, and a future edit that introduces another `specific → specific` Cat3 → Cat4
inversion passes CI. Noted in `debug-instructions.md` this run.

### 4. Second data-hygiene finding, same class as PLT-3061 — near-duplicate *package* spellings

PLT-3061 was a *discipline* naming variant (`CSA-TCB` absent from a table carrying only `CSA`).
The same hazard exists one column over, inside the shipped table itself. 33 distinct package names;
exactly one near-duplicate pair, both under `Electrical`:

- `Install Elec Equip` — Cat1 £8,320.00, Cat2 £1,800.00 (`rework_reference.json:34-35`)
- `Install Elec Equipment` — Cat1 £14,080.00, Cat2 £4,683.33, Cat3 £11,600.00 (`:36-38`)

Prices differ by 1.7×–2.6× for what is almost certainly the same trade, and Rule 1 matches on plain
`===` with no normalisation (`use-rework-cost-calculation.ts:101-104`), so **which spelling a project
happens to use decides the price it is quoted.** VERIFIED (values and the match operator). That the
two are meant to be the same package is INFERRED — nobody has confirmed it, and it needs product, not
a dev.

(Four package names legitimately appear under two disciplines each — `Busduct`, `Containment`,
`Sprinkler`, `VESDA` — with different costs. That is by design, since Discipline is part of every
match, and is *not* a finding.)

### 5. Useful for the close-out: the UI already says which rule produced each number

`getEstimatedReworkCostHelperText` (`use-rework-cost-calculation.ts:171-204`) returns different
helper text depending on which rule matched: `:181-182` *"Generated based on the Category level,
Discipline, and Package."* when Rule 1 hit, `:183-184` *"Generated based on the Category level and
Discipline."* when it fell back to Rule 2. VERIFIED.

So Paolo's two figures were each already labelled with their own provenance on screen, and the labels
differed. That is the plain-English way to explain the inversion to a customer without any jargon —
"one of those two numbers is priced for your package, the other is the discipline average" — and it
is a fact about the shipped UI, not an argument. Worth knowing the affordance exists before anyone
proposes building one.

### What remains unverified after this run

- Whether `Install Elec Equip` and `Install Elec Equipment` are the same trade (product call).
- Whether Mechanical / VESDA's Cat 4 £1,840 is a genuine price or a data-entry error (product call).
- Whether the close-out has gone unposted for 25 runs because nobody read the file, or because someone
  deliberately wants it left open. Still unknown, still the thing blocking this ticket.
- The 2 attachments (`59263` "Screenshot 2026-06-17 135944.png", `59262` "Screenshot 2026-06-17
  140026.png") and the 2 inline blobs in comment 105170 remain unopenable — attachment *content* is
  confirmed 403 for this session. They are corroborative screenshots of two figures already
  reproduced to the cent from source; nothing load-bearing is behind them. Not retried this run.
