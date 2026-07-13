# PLT-2890 — Recommended action

## Chosen: (a) Post a linking / clarifying comment — link the 4-ticket cluster correctly and route the one open product question

**Why (a):**
This ticket sits inside a cluster of four "contractor" tickets and its correct disposition depends
entirely on getting the relationships right — which is exactly what a linking/clarifying comment is
for. The single highest-value action is to (1) **link** 2890↔2891 as a related pair, (2) **explicitly
separate** 2890 from the PAPI-3344 / 2759 / 2742 backend work so nobody assumes the in-progress fix
covers it, and (3) **route** the one genuinely open question — *was the QA contractor filter dropped
on purpose or forgotten in the PowerBI→native migration?* — to the product owners, backed by the code
evidence that the filter simply does not exist in the new dashboard.

**Why not the others:**
- **Not (b) plain clarifying question.** A bare question would waste the cross-reference work; the
  clarification is best delivered *inside* the linking comment (option (a) explicitly covers
  "clarifying" content).
- **Not (c) Ready For Development.** 2890 is distinct, but it is **not fully understood as a codeable
  bug**: there is no spec. It hinges on a product decision (should contractor be a QA filter, and what
  is its data source?), the reporter themself asks "removed purposely or forgotten?", and I cannot see
  the screenshots. Sending it to a dev now would stall.
- **Not (d) Blocked.** Nothing technically blocks it; it awaits a product/parity decision and a
  screenshot confirmation — that is a routing/clarify step, not a hard block.

**Owner:** Darminder Atker (assignee of all four) to link the tickets; product question routed to
**Mostafa / Pietro**. One comment, one linked pair, one routed question — playbook style.

---

### Draft comment (for a human to post — do NOT auto-post; no Jira writes were made)

> **Cross-reference of the four open "contractor" tickets (all assigned to @Darminder):**
>
> - **PLT-2890 (this) — contractor filter *missing* on the new (Non-BI) dashboard + web viewer.**
> - **PLT-2891 — contractor filter *present but not working* on the old/current dashboard.**
> - **PLT-2759 / PLT-2742 (Dev In Progress) — contractor *card* not showing on project cards.**
>
> **1. This is NOT the same defect as PLT-2759 / PLT-2742.** Those two are the contractor **company
> card** not displaying for non-admin/personal logins — a backend **tenant/company-association** issue
> being fixed by @Sergey under **PAPI-3344** (per Darminder's own comments on both). This ticket is a
> **frontend filter-UI** matter on the new dashboard. The PAPI-3344 fix will **not** resolve PLT-2890 —
> please don't close 2890 against that work.
>
> **2. This is *related to* PLT-2891 but likely a *different* bug — suggest linking them "relates to",
> not merging.** Same customer, same project (ML9), filed minutes apart, and 2891 is "following my
> previous ticket". But: 2890 = the filter is **absent / not rendered** on the *new* dashboard, whereas
> 2891 = the filter is **present but doesn't filter** on the *old* one. Different symptoms → different
> fixes. (2891 is being looked at separately.)
>
> **3. Technical finding on 2890:** there is currently **no contractor filter anywhere in the new
> dashboard / web-viewer code** — it is not hidden by a toggle, it was never built into the native
> dashboard. The new dashboard replaced the old **PowerBI** reports, and *full PowerBI feature parity
> is still an open migration goal*, so this looks like a **not-yet-ported (or intentionally dropped)
> filter**, not a regression.
>
> **@Mostafa / @Pietro — one product question to unblock this:** *In the PowerBI→native dashboard
> migration, was the QA "contractor" filter intentionally dropped, or is it a parity gap we should
> restore?* If we should restore it, we also need to confirm **where contractor values come from for QA
> issues** (issue tag / activity category / project company) so it can be built as a proper filter
> dimension. Once product confirms, this can move to Ready For Development with a clear spec.
>
> *(Also: could someone confirm from the attached screenshots exactly which panel the customer means —
> the dashboard QA filter, the viewer issues panel, or the portfolio filter — to be 100% sure we're
> restoring the right control?)*

---

### If product says "restore it" (what a dev would then need — not ready yet)

- **Data source decision first** (product/BE): where does a QA issue's contractor come from?
  (issue-level tag, activity `activityCategories`, or project company). This determines whether it can
  ride the existing **dynamic category** mechanism (`dashboard-filter-panel.tsx:353-389`,
  `categoryFilters`) or needs a new first-class field on `DashboardFilters`
  (`dashboard-filter-service.types.ts:13-40`).
- If it maps to a category tag, the cheapest path is surfacing it as a dynamic category (no schema
  change). If it is project-company metadata, it needs a new filter dimension + options source in
  `dashboard-filter-utils.ts` and a predicate in the quality service.
- Add to `FilterTooltips` (a portfolio-level `contractor` tooltip already exists at
  `filter-tooltips.ts:37-39` and can be reused/adapted).

---

## Notes for the coordinator (Yash)

- Keep 2890 **out of the PAPI-3344 / 2759 / 2742 lane** — different defect class (BE tenant vs FE
  filter UI). Watch for accidental "duplicate → close" once PAPI-3344 lands.
- 2890 and 2891 are the same customer's paired complaint (ML9, contractor filter); handle their client
  comms together via one Freshdesk thread even though the two Jiras stay separate.

**Confidence in the cross-reference/diagnosis: 8/10. Confidence in this being the right next step:
~7/10** (it is a product-routing/comms judgment, and depends on the product parity decision).
