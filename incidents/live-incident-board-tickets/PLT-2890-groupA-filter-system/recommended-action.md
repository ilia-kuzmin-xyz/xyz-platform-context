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

---

# 2026-08-31 — the draft above is SUPERSEDED. Do not post it.

**Why:** the 07-13 draft asks product whether the QA contractor filter was dropped on purpose or
forgotten. That question was answered by building the filter — Gennaro verified it fixed on Staging
26.3.3 on 2026-07-30. Posting it now would ask for a decision that has already been made and
implemented. It is kept above as the record of how the original defect was routed.

**Where the ticket actually stands:** the original defect is fixed. The customer reopened Freshdesk
#7397 on 08-28 with a *new* question — the dashboard now shows **two** filters called "Contractor",
one driven by quality issues and one (we believe) by their own schedule mapping, and they want to
know whether the two can be merged or must both be filled. Status went back to **In Analysis**, and
the ticket is assigned to Ilia. Reasoning and code trace: `context.md` § 2026-08-31.

**Assumption behind the draft below:** that the second Contractor control is a schedule-derived
dynamic category section. The mechanism is verified in code; that ML9's schedule actually declares
such a type is not. The draft is worded so the reply we get confirms or kills it.

**Do not close 2890 as fixed on the 07-30 QA verification.** The original defect is genuinely done,
but the reopen is a live customer question and closing it would drop it silently. If the merge turns
into work, raise it as its own ticket rather than reopening the shipped one a second time.

---

### Draft comment — for a human to post on PLT-2890, replying to Yash (do NOT auto-post; no Jira writes were made)

> Hi Yash, good to hear the QA contractor filter is working for them now.
>
> The two aren't duplicates. One filters quality issues by the company set on the issue itself. The
> other looks like it comes from their own project schedule, where the activities carry a contractor
> against them, so it filters progress. Different lists from different places, which is why filling
> one doesn't fill the other.
>
> Whether we can merge them comes down to whether the two lists actually name the same companies. If
> they do, combining them is worth looking at. If the spellings differ even slightly, a combined
> filter would quietly return nothing, which is worse than two filters.
>
> **Could you send us the contractor names each of the two filters lists on ML9?**

---

### Owner and next step after the reply

- **Yash** owns getting the two lists (he already has the customer thread open on #7397).
- If the lists match: a product call for **Mostafa / Pietro** on whether one merged Contractor filter
  is wanted, since merging changes what the filter reaches (quality only vs quality + progress).
- If the lists differ: no merge is possible as-is; the honest answer to the customer is "fill both,
  they mean different things", and the follow-up we own is that the panel shows two identically
  titled sections with nothing distinguishing them — a labelling fix, small and separate.
- Either way there is a standing FE gap worth a low-priority ticket independent of ML9: nothing in
  the panel detects a dynamic category type whose name collides with a built-in filter
  (`dashboard-filter-utils.ts:241` treats only discipline and package as core). Same no-editorial-
  layer shape as PLT-3044.

---

# 2026-09-02 — both drafts above are SPENT. The merge branch is dead.

The 08-31 draft asks Yash for the contractor names each filter lists, so we could decide whether a
merge is possible. **That is no longer needed on either side:**

- Ilia answered the customer's merge question directly (`110989`, 09-01) without the lists.
- **Mostafa closed it** (`110990`, `110992`): two different fields, keep them separate — one is the
  issue default, one is a schedule attribute.

So the "if the lists match → product call for Mostafa/Pietro" branch never has to run. Kept above as
the record of how the merge question was worked, not as a thing to post.

**The one open item is different:** the customer's new question, relayed by Yash (`111073`, 09-02
11:01, Freshdesk → Waiting on 3rd line):

> "Do you know if there is any trick/way to automatically populate all the QA issues to match between
> the contractor and the company?"

**Answer, from the code (see `context.md` § 2026-09-02): no, not today.** `company` is writable only
on issue create and on single-issue `PATCH`; the contractor side is a separate per-issue mapping
(`usp_UpsertIssueActivityCategoryMappings`); the only bulk issue write is `bulk-update-types`, which
does types and not `company`. Nothing derives either field from the other — which is the same fact
underneath Mostafa's "two different fields".

**No draft written yet — deliberately.** Two things should be settled before one is:

1. **Is the answer just "no", or "no, and here is the ticket"?** A bulk set-company endpoint is a
   small, well-precedented piece of work (`bulk-update-types` is the shape), but it is a feature, and
   2890 has already been reopened twice on top of a shipped fix. **Do not reopen it a third time —
   raise a separate ticket** if we want the capability.
2. **Who answers.** The mechanical answer is ours (3rd line). Whether we *offer* to build it is
   Mostafa's or Pietro's call, since he has just said the two fields are meant to stay independent —
   auto-populating them partly undoes that, and it is worth asking him whether matching them is even
   desirable before offering it to the customer.

**Also still open and unrelated to any of this:** the FE gap noted at the end of the 08-31 section —
the panel renders two identically titled "Contractor" sections with nothing distinguishing them
(`dashboard-filter-utils.ts:241` treats only discipline and package as core). Now that both filters
are confirmed to be staying, that labelling gap is the actual remaining defect in 2890's own area, and
it is small. Worth its own low-priority ticket.

---

## 2026-09-02 (later) — draft written. Supersedes "No draft written yet — deliberately" above.

Both open items from that section are resolved: **Ilia asked Mostafa, and the answer is that we are
not expecting this feature.** So the reply is a plain no plus a close request — no ticket offered, no
product question left hanging.

**Draft (80 words, unposted — the hard no-Jira-action rule stands; a human pastes it):**

> Hi Yash — no, there's no way to do that today, and we're not planning to add one.
>
> The two are set independently: the company on a QA issue is typed on the issue, and the contractor
> comes from the project's activity categories. Nothing copies one to the other, and there's no bulk
> edit for the company field either. Mostafa has confirmed we want to keep them as two separate
> fields, so both need filling.
>
> **Can we close this one now?**

Deliberately **not** in the draft: the `bulk-update-types` precedent and the shape of a
bulk-set-company endpoint. Mostafa has said we do not want the capability, so naming a possible
implementation would reopen a settled question in front of the customer. The code detail stays in
`context.md` § 2026-09-02 in case the ask returns.

**After this is posted, 2890 should close.** The remaining item in its area — the panel showing two
identically titled "Contractor" sections — is a separate low-priority FE ticket, not a reason to hold
this one open. Do not reopen 2890 a third time for it.
