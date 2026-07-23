# PLT-2815 — "estimate rework cost error"

- **Domain slug:** quality-management
- **Jira:** https://xyzreality.atlassian.net/browse/PLT-2815
- **Type:** Live Incident · **Priority:** Major · **Status:** With Customer
- **Assignee:** Yash Patel (also the incident coordinator / client-comms owner — note)
- **Reporter (Jira):** Masum Ahmed (support) · **Original customer:** "Paolo" · **Project:** ML9 (EUR)
- **Linked Freshdesk:** #7126 — **already Closed 2026-07-06** (see discrepancy below)
- Triage date: 2026-07-13

> **Re-checked 2026-07-23 — no new comments since 07-06.** Status unchanged (With Customer), Freshdesk
> side already Closed. Recommendation unchanged: nudge Yash to align the Jira status (With Customer →
> Done) with the already-closed Freshdesk ticket; nothing further to investigate (9/10, data artifact,
> as-intended per Mostafa 06-23).

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
