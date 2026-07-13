# PLT-2891 — Recommended action

## Chosen: (b) Draft a clarifying question — distinct-but-unclear

**Why (b), not the others:**
- **Not (a) link as a duplicate of the in-progress work.** PLT-2891 is a *filter-control* bug and is
  most tightly coupled to **PLT-2890**, not to the Dev-In-Progress company-visibility cluster
  (PLT-2742 / PLT-2759). Those two are already root-caused to a **backend tenant/company-assignment**
  bug (PAPI-3344, Sergey) whose mechanism — "company has no tenant → not returned for non-admins" —
  explains "entity not shown", **not** "filter present but ineffective." Linking 2891 in as a duplicate
  now would risk it being silently closed by a fix that may not cover it. (Evidence: `context.md` §2–3.)
- **Not (c) Ready For Development.** Root cause of 2891 is **not** confirmed (confidence 3/10). Two
  live hypotheses remain — tenant-scoped contractor data missing (shared upstream with PAPI-3344) vs a
  pure FE filter-logic/empty-options bug — and I cannot even confirm *which surface* the customer means
  (the ticket says both "current" and "old" dashboard; screenshots unviewable). Sending to dev now
  would be guesswork.
- **Not (d) Blocked.** Nothing technically blocks progress; we simply need two facts (which surface;
  and whether the PAPI-3344 data fix touches the filter's data source) before we can route it.

Per the playbook: *evidence before theory; don't close on assumption; one closed question, one owner.*
The single most decisive next step is a scoping question to the one person who owns all four tickets
and already knows the PAPI-3344 scope.

**Owner:** **Darminder Atker** (assignee on all 4; diagnosed 2742/2759 with Sergey; knows PAPI-3344
scope). Route to him; do **not** contact anyone else per task constraints.

---

### Draft comment for Darminder (do NOT post — draft only)

> Hi Darminder — triaging PLT-2891 ("contractor filter not working on the old/current Dashboard,
> ML9"). It looks like the **sibling of PLT-2890** (same reporter/project/day: 2890 = contractor
> filter *missing* on the new Non-BI dashboard + web viewer; 2891 = filter *present but not filtering*
> on the old one), and a **different cluster** from PLT-2742 / PLT-2759 (which are the contractor
> **company** not displaying, tenant-scoped, being fixed under PAPI-3344).
>
> Before we route 2891, two scoping questions:
> 1. **Does your/Sergey's PAPI-3344 tenant/company fix touch the contractor *filter's* data source?**
>    The filter options resolve from the same tenant-scoped company/contractor data
>    (`useCompanies` / `GET ms/project/api/contractors`), so if a user's tenant scoping omits
>    contractor values, the filter would look empty / not match. If PAPI-3344 covers that, 2891 (and
>    2890) may be fixed alongside it — otherwise this is a separate FE filter bug.
> 2. **Which surface is the customer on** — the old PowerBI/BI dashboard, or the in-app progress/portfolio
>    contractor filter? The ticket says both "current" and "old" dashboard, and the screenshots aren't
>    legible to me. This decides whether it's `ProgressDashboardPage`/`PortfolioFilterPanel` (FE code
>    exists) or a legacy PowerBI filter.
>
> To reproduce cleanly: does the filter show contractor **options but fail to narrow**, or show **no
> options**, and does it differ by **login type** (admin/tenant vs personal — the 2742/2759 tell)?
> Session id on the ticket: `platform-web-1fa91a4d-cc5e-4f77-83f9-fc3026f9d420`.

*(One owner; closed questions each answerable with a value; states the relationship as a hypothesis,
not a verdict; asks him to confirm scope overlap with PAPI-3344 rather than assuming it.)*

---

### Suggested Jira housekeeping (for the human to action — not executed)

- **Link** PLT-2891 ⇄ PLT-2890 as *"relates to"* (matched pair, contractor filter across two surfaces).
- **Link** PLT-2891 → PLT-2742 / PLT-2759 / PAPI-3344 as *"relates to"* (possible shared upstream data
  dependency) — **not** "duplicates", pending Darminder's answer to question 1.
- Keep status **Open** until the two scoping answers land; then either fold into the PAPI-3344 fix
  (if it covers the filter data) or move to Ready For Development as a discrete FE filter bug.

---

**Confidence:** cross-reference / routing judgment **7/10**; that (b) is the right next step **8/10**
(it is the minimum-assumption move and unblocks routing with two closed questions). Root cause of the
filter failure itself remains **3/10** — needs a repro on a matching account, which the human/Darminder
can do far faster than further static analysis.
