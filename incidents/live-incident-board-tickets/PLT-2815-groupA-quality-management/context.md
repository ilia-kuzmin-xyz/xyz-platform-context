# PLT-2815 — "estimate rework cost error" — triage context

- **Domain slug:** `quality-management` (unchanged — see § Domain slug)
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2815
- **Issue type:** Live Incident ("To track live incidents on site.") · Software / Web Viewer
- **Status:** **With Customer** (category: In Progress / yellow) — **unchanged since 2026-07-03**
- **Priority:** Major · **Resolution:** none · **Fix versions:** none · **Labels / components:** none
- **Assignee:** Yash Patel (also the incident coordinator / client-comms owner — note)
- **Reporter / creator (Jira):** Masum Ahmed (support) · **Original customer:** "Paolo" · **Project (site):** ML9 (EUR)
- **Created:** 2026-06-17 09:36 · **Last updated:** 2026-07-06 10:18 · **Status-category last changed:** 2026-07-03 11:38
- **Comments:** 13 total (unchanged) · **Watchers:** 3 · **Attachments:** 2 × `.png` (unreadable here — see NEEDS HUMAN)
- **Linked Freshdesk:** #7126 — **Closed 2026-07-06** (see § The process gap)
- **Triage history:** first pass 2026-07-13 · re-check 2026-07-22 (no change) · **re-check 2026-07-29 (this pass)**

---

## ⚠️ Re-check 2026-07-29 — headline: the technical question is closed, the *ticket* is not

**Nothing on the ticket has moved.** Verified against live Jira this run:

| Field | 07-13 (first pass) | 07-29 (now) |
|---|---|---|
| Status | With Customer | **With Customer** (identical) |
| Comment count | 13 | **13** (identical — last is #106553) |
| `updated` | 2026-07-06 10:18 | **2026-07-06 10:18** (identical) |
| Resolution | none | **none** |

So there has been **zero on-ticket activity for 23 days**, and the last comment was not a discussion
at all — it was an automated Freshdesk-status mirror ("Ticket ID: 7126 — Freshdesk ticket status
changed to : Closed").

**Elapsed-time ledger (as of 2026-07-29):**

| Milestone | Date | Days ago |
|---|---|---|
| Customer (Paolo) reported | 2026-06-17 | **42** |
| Dev verdict "does not appear to be a bug" (Rishi, #105268) | 2026-06-18 | 41 |
| Product verdict "leave it as intended for now" (Mostafa via Rishi, #105647) | 2026-06-23 | **36** |
| Freshdesk #7126 Closed (customer-facing ticket ended) | 2026-07-06 | **23** |
| Last on-ticket activity of any kind | 2026-07-06 | **23** |
| **Triage reproduced the numbers to the cent; close recommended at 9/10** | **2026-07-13** | **16** |
| Triage re-check: "unchanged, still parked" — close re-recommended | 2026-07-22 | 7 |

**The finding this run is not technical.** The diagnosis below has been unchanged and unchallenged for
**16 days**, at 9/10 confidence, with both reported figures reproduced to the exact cent. Product ruled
"as intended" **36 days ago**. The customer-facing ticket has been **closed for 23 days**. Two
consecutive triage passes recommended closing PLT-2815, and **neither recommendation was acted on**.

A 9/10-confidence "this is working as intended, please close" that sits unclosed for 16 days while its
own support ticket is already closed is a **process gap, not an engineering one**: the Jira is
orphaned-open behind a closed Freshdesk, it keeps occupying a Live Incident board slot, and it makes
the board's Major-priority count read higher than reality. This is the same anti-pattern the playbook
names from the other direction — there, closure was attempted without understanding; here,
understanding was reached and closure never attempted.

---

## 🆕 New evidence this run — the cohort sweep nobody had run (this changes the close, not the diagnosis)

Paolo's original description ends with a question that **has never been answered on the ticket**:

> "I don't know if other disciplines or packages may be affected."

That is playbook question #6 (*"Who else? The reported sample is not the population"*), and it was the
one leg of a proper close (cause + trigger + **cohort**) still missing. It is answerable entirely from
the shipped reference table with no environment access, so this run ran it: simulate the actual
fallback ladder for **all 37 discipline/package series × Categories 1–4** and find every place where a
higher (worse) category resolves to a **lower** cost than the category below it.

Sweep script (kept for reruns): `/tmp/claude-0/-home-user/74d05320-ab4a-504b-8575-bffb196c5edd/scratchpad/sweep.py`
against `rework_reference.json` (90 rows, 37 package series, 12 generic rows).

**Answer: yes — 18 inverted series, not 1.** And they split into two materially different kinds:

**(A2) Mixed-rule inversions — 6, the exact PLT-2815 shape** (package-specific value undercut by a
generic-discipline fallback, i.e. *explained* by the answer we already gave the customer):

| Discipline / Package | Lower category | Higher category |
|---|---|---|
| **CSA / Underground Services** ← *the reported one* | Cat3 £600.00 (R1) | Cat4 £740.00 (R2) |
| Electrical / Earthing | Cat3 £1,120.00 (R1) | Cat4 £1,184.00 (R2) |
| Electrical / Fire Alarm | Cat3 £853.33 (R1) | Cat4 £1,184.00 (R2) |
| CSA / Precast | Cat2 £600.00 (R1) | Cat3 £2,003.33 (R2) |
| Electrical / Install Elec Equip | Cat2 £1,800.00 (R1) | Cat3 £2,178.68 (R2) |
| Mechanical / Pipe | Cat1 £7,920.00 (R2) | Cat2 £8,423.00 (R1) |

**(A1) Same-rule inversions — 12, which the delivered explanation does NOT cover.** Both values are
package-specific (Rule 1 vs Rule 1), so "they come from different lookup rules" is simply not true of
these. They are plain reference-data errors:

| Discipline / Package | Lower category | Higher category | Ratio |
|---|---|---|---|
| **Mechanical / VESDA** | Cat3 £845.71 | **Cat4 £1,840.00** | 2.2× |
| Electrical / Install Elec Equipment | Cat2 £4,683.33 | Cat3 £11,600.00 | 2.5× |
| Mechanical / DWS | Cat2 £640.00 | Cat3 £1,600.00 | 2.5× |
| Mechanical / S&W | Cat2 £640.00 | Cat3 £1,560.00 | 2.4× |
| Mechanical / Install Mech Equipment | Cat2 £4,220.00 | Cat3 £8,040.00 | 1.9× |
| CSA / Steel | Cat1 £5,840.00 | Cat2 £9,860.00 | 1.7× |
| CSA / Partitions | Cat1 £7,520.00 | Cat2 £9,243.64 | 1.2× |
| CSA / Busduct | Cat1 £6,160.00 | Cat2 £7,360.00 | 1.2× |
| Electrical / Busduct | Cat1 £7,337.78 | Cat2 £8,696.00 | 1.2× |
| Mechanical / CHW | Cat1 £7,520.00 | Cat2 £7,911.67 | 1.05× |
| Electrical / Security | Cat2 £1,460.00 | Cat3 £1,496.43 | 1.02× |
| Electrical / Containment | Cat1 £5,300.00 | Cat2 £5,341.38 | 1.01× |

**Why (A1) matters more than (A2).** `Mechanical / VESDA` is *Paolo's complaint verbatim* — Cat3 below
Cat4 — on a series where **both figures are package-specific**. On ML9 (EUR) it renders as
**Cat3 €964.11 < Cat4 €2,097.60**, a 2.2× inversion, worse than the one he reported. The other
same-shape instances on ML9: `Electrical / Earthing` €1,276.80 < €1,349.76; `Electrical / Fire Alarm`
€972.80 < €1,349.76.

**The design intent is confirmed monotonic.** All three generic (`Package = ""`) series decrease
cleanly with no inversions — CSA 16,286.32 → 7,871.72 → 2,003.33 → 740.00; Electrical 7,735.00 →
5,073.65 → 2,178.68 → 1,184.00; Mechanical 7,920.00 → 5,053.01 → 2,957.31 → 1,088.00. So the table's
own authored baseline agrees with the customer: **higher category = higher cost.** The customer's
premise is not merely reasonable, it matches the reference data's own design wherever that design was
applied consistently. The inversions are exceptions to the table's own rule.

**Structural contributor: 18 of 37 package series have no Cat4 row at all**, so their Cat4 always
falls back to the generic discipline figure. Three of those invert (Underground Services, Earthing,
Fire Alarm); a fourth, `CSA / Piling`, is £760 vs £740 — within £20 of inverting, i.e. one edit away.

**🆕 Data-hygiene defect found incidentally:** the table contains **two near-duplicate Electrical
package names** — `Install Elec Equip` (Cat1 £8,320, Cat2 £1,800; `rework_reference.json:34-35`) and
`Install Elec Equipment` (Cat1 £14,080, Cat2 £4,683.33, Cat3 £11,600; `:36-38`). Since Rule 1 matches
on the **exact** `categoryName` string, only one of these can ever match a real package category; the
other is dead data. Their Cat1 figures differ by £5,760 (1.7×), so whichever one is live materially
changes the suggested cost. Worth a product check regardless of this ticket.

---

## What "error" means here — WRONG VALUE, not a crash

This is a **perceived wrong-value / inverted-ordering** report, **not** a hard error/crash and **not**
UX-only confusion. Nothing throws; the UI renders a number the customer believes is wrong.

**Observed (exact surface + values).** In the issue-creation form ("Estimated rework cost" field,
auto-suggested value), for **CSA → Underground Services** on project ML9 the auto-calculated cost is:
- Category 3: **€684.00**
- Category 4: **€843.60**

**Customer's expectation & authority.** Paolo expects **Cat 3 > Cat 4** because "Category 3 issues have
a higher impact compared to Category 4." He filed it high-priority because under-valuing Cat 3 issues at
scale materially understates rework cost (description, created 2026-06-17 09:36). Confirmed above: the
reference table's own generic series agree with him.

## Mechanism — confirmed with exact arithmetic (this is the crux; re-verified 07-29)

Rework cost is computed **entirely in the frontend** from a shipped static reference table, then
FX-converted. No backend aggregation / data-pipeline is involved.

Code: `hc-frontend/src/main/webapp/app/pages/organisation/ViewerPage/components/viewer-x/components/blocks/issue-properties/blocks/hooks/use-rework-cost-calculation.ts`
- `:5` imports `../rework_reference.json` (the lookup table)
- `:18-23` **hard-coded** GBP→currency factors: `GBP: 1, USD: 1.32, EUR: 1.14`
- `:94-121` **Rule 1** — exact match on Category + Discipline + Package
- `:123-144` **Rule 2** — fallback to Category + Discipline (Package = "") = "generic package cost"
- `:146-154` **Rule 3** — none found → `null`; `:64-73` Cat5 → 0
- Both matching paths end in `Math.round(convertedCost * 100) / 100` (still present as of this run —
  relevant to PLT-2561, see § Cross-ticket)
- Displayed via `form-fields/issue-cost-field.tsx:33,55-62` (auto-populate) and `:142-159`
  ("Suggested cost" click-to-apply)

Reference data (`rework_reference.json`, matches the Confluence table exactly — re-verified 07-29):
- `:67` `Category 3 | CSA | Underground Services | 600.00`
- **No `Category 4 | CSA | Underground Services` row exists**
- `:83` `Category 4 | CSA | "" | 740.00` (generic CSA fallback)
- Package series context: `:65-67` Cat1 £54,560.00 → Cat2 £7,125.71 → Cat3 £600.00

Reproduction of the customer's two numbers (base £ → €, ×1.14):
- Cat 3: **£600.00 × 1.14 = €684.00** → matched by **Rule 1** (exact package match). ✓ = customer's Cat 3
- Cat 4: **£740.00 × 1.14 = €843.60** → matched by **Rule 2** (generic CSA fallback, because there is
  no package-specific Cat 4 row). ✓ = customer's Cat 4

**Root cause of the visible inversion (two compounding DATA facts, not a code bug):**
1. The two numbers are **not computed by the same rule** — Cat 3 is a package-specific value; Cat 4 is
   a discipline-level *fallback* figure. Apples-to-oranges by construction of the fallback ladder.
2. The **`Cat3 | CSA | Underground Services = £600` value is anomalous**: it is the lowest Cat 3 in the
   whole table, it undercuts the generic Cat 3 CSA (£2,003.33) *and* the generic Cat 4 CSA (£740), and
   it sits on a steep cliff within the package (Cat1 £54,560 → Cat2 £7,125.71 → Cat3 £600). That
   £600 < £740 is exactly what makes Cat4 render above Cat3.

The **code is behaving as specified** — it faithfully implements the documented fallback rules. The fix,
if any, is **data** (correct the £600 figure and/or add a package-specific Cat 4 row) — a product/UX
decision, not a dev change. **The 07-29 sweep does not change this verdict; it changes its scope** from
one series to 18, and shows that 12 of the 18 are *not* fallback-ladder artifacts at all.

**Smallest broken-vs-working pair.** *Broken:* CSA / Underground Services (Cat3 €684 < Cat4 €843.60 —
package-specific Cat3 vs generic-fallback Cat4). *Working (monotonic):* any series where both categories
resolve by the same rule and the data is consistent, e.g. generic CSA Cat3 £2,003.33 > Cat4 £740.00, or
CSA / Doors & Ironmongery Cat3 £1,440 > Cat4 £1,120 (`rework_reference.json:22-23`). The diff *is* the
diagnosis. ⚠️ **Caveat added 07-29:** this pair explains only the A2 class. `Mechanical / VESDA`
(Cat3 £845.71 < Cat4 £1,840.00, both Rule 1) is a broken pair the diff does **not** explain — there the
data alone is wrong.

**Trigger ("why now").** Not a regression — no deploy needed. It surfaces only when a user files a
CSA / Underground Services issue and compares Cat3 against a fallback Cat4. The reference table
(Confluence, authored by Pietro Desiato) was last modified **Oct 23, 2025**; the shipped JSON matches
it. No `rework`-touching commit in `hc-frontend` history (`git log -- '*rework*'` returns only an
unrelated PLT-2825 commit). **Playbook #5 is satisfied:** the trigger is *latent data shape*, not a
dated change — an unanswered "why now" is not what's holding this ticket open.

## Expected reference — on whose authority

The numbers come from the **"Issue Rework Reference Table"** Confluence page (UX / Digital Product Team
space, id 1630633988, author **Pietro Desiato**, last modified Oct 23, 2025):
https://xyzreality.atlassian.net/wiki/spaces/UX/pages/1630633988/Issue+Rework+Reference+Table
It documents the exact fallback ladder the code implements (Cat+Disc+Pkg → Cat+Disc → Disc → null;
Cat5 → 0; all-missing → 0). **The reference table is the authority for the expected value — it is a
product/UX-owned dataset, not a formula the customer can dispute on engineering grounds.** Corollary
from the 07-29 sweep: because the table is the authority, the 18 inversions are *the authority
disagreeing with itself*, which is a product-data defect rather than a dispute.

## The process gap — what the ticket is actually waiting on

The dev/product path is **closed on the engineering question**:
- **Rishi Bhugobaun, 2026-06-18 09:13** (#105268): "This does not appear to be a bug and is currently
  with **Mostafa** to discuss whether the Issue Rework Reference Table needs to be updated."
- **Yash Patel, 2026-06-18 09:36** (#105272): "@Mostafa let me know how and when to proceed further."
- **Mostafa Kamel Hussien via Rishi, 2026-06-23 10:56** (#105647): "I would leave it as intended for
  now and say if they have any questions regarding the numbers, they can reach out to **Josh from
  customer success**."
- Freshdesk #7126 then: Waiting-on-customer (06-23) → Closed (07-03) → reopened Waiting-on-customer
  (07-03 11:38) → **Closed (07-06 10:18)**. Nothing since.

"With Customer" therefore means: **we delivered the product answer and the customer never came back.**
But the customer-facing ticket is **closed**, so in practice nobody is waiting on Paolo either — the
loop is already shut on the client side. The Jira is the only thing still open, and it is open because
**no one has performed the close**, not because information is missing. Nothing is blocked, nothing is
being investigated, and no owner has an outstanding task.

## Domain slug — why `quality-management` (unchanged)

The failing surface is the **issue-creation form's "Estimated rework cost" field** in the viewer's
issue-properties block — squarely the Quality/Issues feature area (QLT). No filter dimension, no viewer
geometry, no data-pipeline stage is involved; the whole computation is a local JSON lookup plus an FX
multiply. `quality-management` remains correct and the 07-29 content (a defect in the *issue rework
reference data*) reinforces rather than challenges it. **Keeping the slug.**

## Bug vs feature-gap vs data defect

**Neither a bug nor a feature gap — a product-owned reference-data defect.** The code faithfully
implements a documented spec (verified line by line); the spec's *data* contains 18 series that violate
the table's own monotonic design. That is a product/UX data-correction task, not dev work. It is also
**not** a mis-filed ticket: the customer reported a real, reproducible wrong-looking number.

## Cross-ticket relations (🆕 this run)

- **PLT-2561** — "Remove rounding from rework cost calculation (`useReworkCostCalculation`)", Task,
  **Minor**, **Dev In Progress**, **assignee: none**, reporter Rishi Bhugobaun, created 2026-03-31,
  **untouched since 2026-05-21 (69 days)**. Touches *the exact hook and both matching paths* behind
  PLT-2815. **Two things to flag:**
  1. ⚠️ **Collateral cosmetic risk.** The rounding PLT-2561 removes is precisely what makes these
     figures display cleanly. In IEEE-754, `740 * 1.14 = 843.5999999999999` and
     `600 * 1.14 = 683.9999999999999`. If PLT-2561 lands without display-side formatting, the field in
     *this very ticket* would render `€843.5999999999999` / `€683.9999999999999`. PLT-2561's own
     acceptance criteria say only "UI formatting can still control display precision **if needed**" —
     that "if needed" is unresolved, and `issue-cost-field.tsx` is where it would have to be handled.
     Worth confirming before PLT-2561 merges.
  2. **Scoping (playbook: label side-findings loudly).** PLT-2561 is **not** a fix for PLT-2815 — it
     changes precision, not the ordering. Do not let "there's dev work on the rework hook" become a
     reason to keep PLT-2815 open.
- **Recurring family — the reference table / fallback ladder has now produced ≥4 live incidents:**
  PLT-2384 "problem with issue rework cost" (Done, 2026-01-27→03-19), PLT-2572 "FAR02 — platform
  doesn't provide suggestion for estimated rework costs" (Done, 2026-04-09→04-20 — that is the
  **Rule-3 → `null`** arm of the same ladder), PLT-2648 "[NEW DASHBOARD] PA12 Issue Rework value
  different from PowerBI" (Done, different surface — the dashboard *aggregate*), and PLT-2815 (this
  one). Four incidents from one product-owned dataset in six months is an argument for fixing the
  dataset once rather than answering "as intended" per ticket.
- **PLT-2858** (the board's other `quality-management` ticket) — **same decision bottleneck**: both
  2815 and 2858 are parked awaiting/behind **Mostafa** (2815: "as intended" delivered but never closed;
  2858: stalled on his zone-config-ownership decision, flagged at 9 days on 07-22, now ~16). Worth
  raising as one coordinator-level item about product-decision latency on quality-management, not two.
- **PLT-2893** "Portfolio — Tooltip — Quality & Rework tooltip displays clipped" (Bug, Open,
  Darminder) — cosmetic, different surface. **Unrelated**; noted only so it isn't mistaken for a sibling.

## Doc references & gaps

- `xyz-platform-context/dashboard/quality-tab.md` documents QLT but **says nothing about rework-cost
  calculation** (issue lists, filters, categories only). Re-verified 07-29: `grep -i rework` across
  `dashboard/` and `incidents/` returns **zero hits** outside this folder. **Doc gap persists:** the
  rework-cost reference-table mechanism, the three-rule fallback ladder, and the hard-coded FX factors
  are entirely undocumented in the KB — which is plausibly *why* the same mechanism keeps arriving as a
  fresh incident (see the PLT-2384/2572/2648/2815 family above). Post-close, this deserves a
  `quality-tab.md` section plus a `dashboard/pitfalls.md` entry.
- Note also: `CLAUDE.md` layout lists `qlt-quality.md`; the actual file is `quality-tab.md` (still true).
- `xyz-platform-context/incidents/live-incident-playbook.md` — tone/pattern for the drafted nudge;
  Phase 6 ("close on cause + trigger + cohort") is the frame used above.

## Secondary observations (not root cause)

- **Hard-coded FX** (`use-rework-cost-calculation.ts:18-23`; `EUR: 1.14`, `USD: 1.32`) is a latent
  maintenance risk — stale rates drift every EUR/USD project, and there is no dated source or refresh
  path for them. Not the cause here (it converts the correct base figures; both reported numbers
  reproduce to the cent). Worth its own low-priority ticket, not this one.
- **No FX factor for any other currency**: `getConversionFactor` defaults to `1`, so a project in an
  unlisted currency silently shows GBP figures labelled in that currency. Latent, out of scope here.

## Hypothesis & confidence

**Hypothesis (high confidence, unchanged):** Not a crash and not a code bug. The customer's observation
is real but is an artifact of (a) the fallback ladder comparing a package-specific Cat3 against a
generic-discipline Cat4, and (b) an anomalously low `£600` value for `Cat3 | CSA | Underground Services`
in the product-owned reference table. Any correction is a **data/product decision** already ruled "leave
as intended for now" by Mostafa.

**🆕 Added 07-29:** the *scope* of the data defect is 18 inverted series, of which **12 are not
explained by the fallback ladder** and therefore not covered by the explanation given to the customer.
This does not reopen the engineering question; it means the eventual product fix is a table-wide review,
and it means the "different lookup rules" line should not be repeated as a general defence.

- **Diagnosis of the two reported figures: 9/10** — code path read end-to-end, shipped JSON verified
  against the Confluence source, both figures reproduced to the exact cent (600×1.14=684.00,
  740×1.14=843.60). Re-verified this run.
- **Cohort sweep correctness: 9/10** — computed deterministically from the shipped JSON by simulating
  the same three rules the hook applies; reproducible via the saved script. Residual 1: the sweep keys
  on the JSON's package **name strings**, and a series only reaches a user if that string matches a real
  `activityCategory` name on a project (see the `Install Elec Equip`/`Equipment` duplicate) — so 18 is
  the count of inverted *series in the table*, an upper bound on what any given project can show.
- **This being a process gap rather than an open technical question: 9/10** — evidenced by status,
  comment count and `updated` all frozen since 07-06, no open question addressed to anyone, and
  Freshdesk closed.
- **The recommended next step: 8/10** (up from 7/10 on 07-13) — still a coordination/comms judgment, but
  the cohort leg is now closed with evidence, so "close it" no longer rests on an untested assumption
  about other packages.

**Overall triage confidence: 9/10.** Nothing technical is unresolved. The action is administrative.

## NEEDS HUMAN (media I cannot read / decisions I cannot take)

- ⚠️ **`Screenshot 2026-06-17 135944.png`** (1.59 MB, Yash Patel, 2026-06-17, attachment id 59263) —
  not viewable here (binary behind Atlassian auth). Do not guess contents.
- ⚠️ **`Screenshot 2026-06-17 140026.png`** (1.02 MB, Yash Patel, 2026-06-17, attachment id 59262) —
  same.
- ⚠️ **Two inline blob images in comment #105170** (`media.staging.atl-paas.net`) — the same two
  screenshots embedded in Yash's comment. Not resolvable here.
  - **Assessment: corroborative, not load-bearing.** These are the dashboard screenshots of the two
    values; the exact figures are stated in the description text and were independently reproduced to
    the cent from the shipped JSON. Nothing about the diagnosis or the recommended action depends on
    seeing them.
- ⚠️ **Confluence "Issue Rework Reference Table"** has one embedded flow/screenshot image (blob) I could
  not view; the full reference table itself is present as text, so nothing load-bearing is missing.
- **Human decision required (not a data gap):** performing the Jira transition, and whether the
  18-inversion sweep is raised as a product ticket now or filed as background. Both are Yash/Mostafa
  calls — see `recommended-action.md`.

## Roster / ownership notes

- **Yash Patel** — assignee, coordinator, client-comms owner. **Holds the only outstanding action on
  this ticket: closing it.**
- **Mostafa Kamel Hussien** (product owner) — took the "leave as intended" decision 36 days ago; owns
  the reference-table data question, including whether the 18 inversions get corrected.
- **Pietro Desiato** (product owner) — authored the Confluence reference table (last modified Oct 2025);
  the right person for the actual figures and for the `Install Elec Equip`/`Equipment` duplicate.
- **Rishi Bhugobaun** (senior fullstack) — did the original dev triage; also reporter of PLT-2561 on the
  same hook. Right person for the PLT-2561 rounding/formatting interaction.
- **Masum Ahmed** — reporter/creator (support/Freshdesk agent; off-roster, consistent with 2649/2619/2385).
- **Josh** (customer success, off-roster) — nominated client contact for questions about the numbers.
